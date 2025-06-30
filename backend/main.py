import base64
import os
import json
import logging
from typing import List, Dict, Any

import requests
import vertexai
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from google.api_core import exceptions
from google.api_core.client_options import ClientOptions
from google.cloud import storage
from google.cloud import discoveryengine_v1 as discoveryengine
from googleapiclient.discovery import build
from pydantic import BaseModel, Field
from vertexai.generative_models import GenerativeModel
import vertexai.generative_models as generative_models
from vertexai.preview.vision_models import ImageGenerationModel

# --- ロギング設定 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 環境変数からの設定読み込み ---
GCP_PROJECT = os.getenv("GCP_PROJECT")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
CUSTOM_SEARCH_API_KEY = os.getenv("CUSTOM_SEARCH_API_KEY")
CUSTOM_SEARCH_CX = os.getenv("CUSTOM_SEARCH_CX")
# Vertex AI Search (Discovery Engine) の設定を追加
DISCOVERY_ENGINE_ID = os.getenv("DISCOVERY_ENGINE_ID")
DISCOVERY_ENGINE_LOCATION = os.getenv("DISCOVERY_ENGINE_LOCATION", "global") # "us" or "eu"

# --- FastAPIアプリケーションの初期化 ---
app = FastAPI(
    title="Advanced Travel Packing List Generator",
    description="Vertex AI SearchとGeminiを使って、旅行の荷物リストを日数に合わせて生成するAPI",
    version="2.1.0",
)

origins = [
    os.getenv("PROD_URL")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GCPクライアントの初期化 ---
try:
    vertexai.init(project=GCP_PROJECT, location=GCP_REGION)
    storage_client = storage.Client()
    gcs_bucket = storage_client.bucket(GCS_BUCKET_NAME)
    gemini_model = GenerativeModel("gemini-2.0-flash-001")

    # ### 変更点: Conversational Search Client を使用 ###
    client_options = (
        ClientOptions(api_endpoint=f"{DISCOVERY_ENGINE_LOCATION}-discoveryengine.googleapis.com")
        if DISCOVERY_ENGINE_LOCATION != "global"
        else None
    )
    # ConversationalSearchServiceClient を初期化
    conversational_search_client = discoveryengine.ConversationalSearchServiceClient(
        client_options=client_options
    )

except Exception as e:
    logger.critical(f"GCPクライアントの初期化に失敗しました: {e}")
    raise RuntimeError("Failed to initialize GCP clients. Check environment variables and authentication.")

# --- レスポンスモデルの定義 ---
class PackingListItem(BaseModel):
    item: str = Field(..., description="荷物の品目")
    quantity: int = Field(..., description="個数（日数を考慮）")

class PackingListResponse(BaseModel):
    destination: str
    number_of_people: int
    summary: str = Field(..., description="Vertex AI Searchが生成した旅行準備のサマリー")
    packing_list: List[PackingListItem] = Field(..., description="生成された荷物リスト")

class ImageResponse(BaseModel):
    image_base64: str = Field(..., description="生成された画像のBase64エンコード文字列")

# --- ヘルパー関数 ---
def check_gcs_directory_exists(destination: str) -> bool:
    """Cloud Storageに指定された旅行先のディレクトリ（キャッシュ）が存在するか確認する"""
    prefix = f"html/{destination.replace(' ', '_')}/"
    blobs = storage_client.list_blobs(GCS_BUCKET_NAME, prefix=prefix, max_results=1)
    return len(list(blobs)) > 0

def search_and_upload_web_content(destination: str, num_results: int = 5):
    """Webを検索し、結果のHTMLをGCSにアップロードする"""
    logger.info(f"GCSに '{destination}' のキャッシュが見つからないため、Web検索を実行します。")
    try:
        search_query = f"{destination} 旅行 持ち物 リスト"
        service = build("customsearch", "v1", developerKey=CUSTOM_SEARCH_API_KEY)
        result = service.cse().list(q=search_query, cx=CUSTOM_SEARCH_CX, num=num_results).execute()
        urls = [item['link'] for item in result.get('items', [])]
        if not urls:
            raise HTTPException(status_code=404, detail="Web search did not return any results.")
    except Exception as e:
        logger.error(f"Custom Search APIの実行中にエラーが発生しました: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform web search.")

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
    for i, url in enumerate(urls):
        try:
            response = requests.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            html_content = response.text
            blob_name = f"html/{destination.replace(' ', '_')}/source_{i + 1}.html"
            blob = gcs_bucket.blob(blob_name)
            blob.upload_from_string(html_content, content_type='text/html; charset=utf-8')
            logger.info(f"Saved {url} to gs://{GCS_BUCKET_NAME}/{blob_name}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"URLの取得に失敗しました: {url}, エラー: {e}")
        except Exception as e:
            logger.error(f"HTMLの取得・アップロード中に予期せぬエラー: {e}")

def query_vertex_ai_search(destination: str) -> discoveryengine.AnswerQueryResponse:
    """Vertex AI Search (対話型) に問い合わせて、要約（回答）を取得する"""
    client_options = (
        ClientOptions(api_endpoint=f"{DISCOVERY_ENGINE_LOCATION}-discoveryengine.googleapis.com")
    )

    client = discoveryengine.ConversationalSearchServiceClient(
        client_options=client_options
    )

    serving_config = f"projects/{GCP_PROJECT}/locations/{DISCOVERY_ENGINE_LOCATION}/collections/default_collection/engines/{DISCOVERY_ENGINE_ID}/servingConfigs/default_serving_config"
    
    query_understanding_spec = discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec(
        query_rephraser_spec=discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryRephraserSpec(
            disable=False,  # Optional: Disable query rephraser
            max_rephrase_steps=1,  # Optional: Number of rephrase steps
        ),
        # Optional: Classify query types
        query_classification_spec=discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryClassificationSpec(
            types=[
                discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryClassificationSpec.Type.ADVERSARIAL_QUERY,
                discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryClassificationSpec.Type.NON_ANSWER_SEEKING_QUERY,
            ]  # Options: ADVERSARIAL_QUERY, NON_ANSWER_SEEKING_QUERY or both
        ),
    )
    # 回答生成のオプション
    answer_generation_spec = discoveryengine.AnswerQueryRequest.AnswerGenerationSpec(
        model_spec=discoveryengine.AnswerQueryRequest.AnswerGenerationSpec.ModelSpec(
            model_version="gemini-1.5-flash-001/answer_gen/v2",
        ),
        prompt_spec=discoveryengine.AnswerQueryRequest.AnswerGenerationSpec.PromptSpec(
            preamble="あなたは親切な旅行アドバイザーです。旅行の準備について、詳細で分かりやすい回答を生成してください。",
        ),
        include_citations=True,
        answer_language_code="ja", # 回答の言語を日本語に指定
    )

    search_query = f"「{destination}」への旅行に必要な持ち物や準備について、詳しく教えてください"
    request = discoveryengine.AnswerQueryRequest(
        serving_config=serving_config,
        query=discoveryengine.Query(text=search_query),
        session=None,
        answer_generation_spec=answer_generation_spec,
        query_understanding_spec=query_understanding_spec,
    )

    try:
        response = client.answer_query(request)
        logger.info(f"Vertex AI Search (対話型) から回答を取得しました。")
        return response
    except Exception as e:
        logger.error(f"Vertex AI Search (対話型) への問い合わせ中にエラー: {e}")
        raise HTTPException(status_code=500, detail="Failed to query Vertex AI Conversational Search.")


def create_final_json_with_gemini(
    answer_response: discoveryengine.AnswerQueryResponse,
    destination: str,
    num_day: int
) -> Dict[str, Any]:
    """Vertex AI Searchの回答と日数を基に、Geminiが最終的なJSONを生成する"""

    summary_text = answer_response.answer.answer_text
    prompt = f"""
あなたは非常に優秀な旅行プランナーです。
以下の「旅行の準備に関する回答」と「回答の根拠となった情報源」を注意深く読み、旅行の荷物リストをJSON形式で生成してください。

### 入力情報
- **旅行先**: {destination}
- **日数**: {num_day}日

### 旅行の準備に関する回答
{summary_text}

### 指示
1. 上記の情報を基に、具体的な荷物リストを作成してください。
2. **日数 ({num_day}日) を考慮して、各荷物の「個数」を決定してください。**
   - 歯ブラシや下着のように「一人一つ」必要なものは、日数を掛け合わせてください。
   - 傘や日焼け止めのように共有できるものは「1」としてください。
   - 日数で単純に増えないもの（例：パスポート）は、適切に判断してください。
3. 提供情報に含まれてなくとも、一般的に旅行に必要な物も含めてください
   - 下着, Tシャツ、ズボン, 靴下など
4. 出力は、以下のキーを持つJSONオブジェクトのみにしてください。説明文や```jsonマークは不要です。
   - `packing_list`: 荷物オブジェクトのリスト。各オブジェクトは `item` (品名) と `quantity` (個数:Int型) のキーを持つ。
   
### 出力例
{{
  "packing_list": [
    {{ "item": "Tシャツ", "quantity": "{num_day}" }},
    {{ "item": "パスポート", "quantity": "1" }},
    {{ "item": "日焼け止め", "quantity": "1" }}
  ]
}}
"""

    try:
        response = gemini_model.generate_content(prompt)
        response_text = response.text
        if not response_text:
            ValueError("Response text not found")
        # 文字列の最初に出てくる '{' と、最後に出てくる '}' を探す
        json_start_index = response_text.find('{')
        json_end_index = response_text.rfind('}')

        json_string = response_text[json_start_index : json_end_index + 1]
        parsed_json = json.loads(json_string)
        parsed_json["summary"] = summary_text # サマリー情報を最終結果に追加
        return parsed_json
    except json.JSONDecodeError as e:
        logger.error(f"GeminiからのレスポンスのJSONパースに失敗: {e}\nレスポンス内容: {response.text}")
        raise HTTPException(status_code=500, detail="AI response (Gemini) was not valid JSON.")
    except Exception as e:
        logger.error(f"Geminiでの最終整形中にエラー: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate final JSON with Gemini.")


# --- APIエンドポイント ---
@app.get("/generate-packing-list", response_model=PackingListResponse)
async def get_packing_list(
    destination: str = Query(..., min_length=2, max_length=50, description="旅行先の地名（例: ハワイ）"),
    num_day: int = Query(..., gt=0, description="旅行の日数")
):
    logger.info(f"リクエスト受信: destination='{destination}', num_day={num_day}")

    if not check_gcs_directory_exists(destination):
        search_and_upload_web_content(destination)
        logger.info("初回検索のため、データストアのインデックス作成に少し時間が必要な場合があります。")

    answer_response = query_vertex_ai_search(destination)
    if not answer_response.answer.answer_text:
        raise HTTPException(status_code=404, detail="Vertex AI Search could not generate an answer.")
    
    # Geminiで最終的なJSONを生成
    final_response_data = create_final_json_with_gemini(answer_response, destination, num_day)

    return PackingListResponse(
        destination=destination,
        number_of_people=num_day,
        summary=final_response_data["summary"],
        packing_list=final_response_data["packing_list"],
    )

@app.get("/generate-image", response_model=ImageResponse)
async def generate_image(
    prompt: str = Query(..., description="画像生成のためのプロンプト")
):
    """Imagenを使用して画像を生成し、Base64で返すエンドポイント"""
    logger.info(f"画像生成リクエスト受信: prompt='{prompt}'")

    generation_model = ImageGenerationModel.from_pretrained("imagegeneration@002")
    response = generation_model.generate_images(
        prompt = prompt,
        number_of_images = 1,
        language="ja"
    )
    if not response.images:
        logger.warning(f"画像が生成されませんでした。プロンプトがセーフティフィルタに抵触した可能性があります。 prompt='{prompt}'")
        raise HTTPException(
            status_code=400,  # 400 Bad Request はクライアントのリクエストに問題があることを示す
            detail="画像を生成できませんでした。プロンプトが不適切と判断されたか、他の理由でブロックされた可能性があります。別のプロンプトで試してください。"
        )
    generated_image = response.images[0]
    image_binary = generated_image._image_bytes
    image_base64 = base64.b64encode(image_binary).decode('utf-8')

    return ImageResponse(image_base64=image_base64)
