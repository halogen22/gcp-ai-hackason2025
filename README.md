# Nizukuri AI (荷造りAI) 👜✈️
AIがあなたの旅行の荷造りを全自動でサポート！ 面倒な準備をスマートで楽しい体験に変えるWebアプリケーションです。
このプロジェクトは[Google Cloud Japan AI Hackathon Vol.2](https://zenn.dev/hackathons/google-cloud-japan-ai-hackathon-vol2)の成果物です。

# 概要 (Overview)
「旅行の計画は楽しいのに、荷造りは面倒…」
多くの人が抱えるこの悩みを解決するため、GCPのAI技術を駆使して「Nizukuri AI」を開発しました。

ユーザーは行き先と日数を入力するだけ。AIエージェントがWeb上の情報を解析し、その旅行に最適化された持ち物リストを自動で生成します。生成されたリストはインタラクティブなチェックリストとして利用でき、アイテムごとの画像もAIが自動生成。準備の進捗を可視化し、忘れ物の不安を解消します。

システムの詳細は[Zenn](https://zenn.dev/osakanafuta/articles/8dbb2f4e020080)からも確認できます。
## デモ (Demo)
[【デモ動画】Nizukuri AI(荷造りAI)](https://youtu.be/4juTtKTTOvw)

## ✨ 主な機能 (Features)
- AIによる持ち物リスト自動生成
    - 行き先と人数に基づき、Vertex AI (Gemini) がWeb上の最新情報を取得し、持ち物リストと概要文を提案します。

- インタラクティブなチェックリスト
    - 生成されたリストはチェックリストとして機能。準備ができたアイテムはチェックして非表示にでき、不要なアイテムは削除可能です。

- AIによるアイテム画像の自動生成
    - リストの各アイテムに対して、Vertex AI (Imagen) が参考画像を自動で生成。視覚的に分かりやすく、準備をサポートします。

- 準備の進捗を可視化
    - 準備の進捗度がゲージで表示されます。ゲーミフィケーション要素で楽しく荷造りができます。

## 🛠️ アーキテクチャ (Architecture)
本プロジェクトは、GCPの各サービスを疎結合に連携させたサーバーレスアーキテクチャを採用しています。

### 処理フロー
1. [Firebase Hosting] ユーザーがフロントエンドから行き先・日数を入力。

2. [Cloud Run] APIリクエストを受け、Custom Search APIで関連Webページを検索。

3. [Cloud Storage] 取得したページのHTMLを保存。

4. [Vertex AI - Gemini] HTMLの情報を基に、持ち物リストと概要文を生成。

5. [Firestore] 生成されたリストをDBに保存し、ユーザーに結果を返す。

6. [Cloud Functions] Firestoreへの書き込みをトリガーに起動。

7. [Vertex AI - Imagen] リストの各アイテム名から画像を生成し、Firestoreのデータを更新。

# 🚀 技術スタック (Tech Stack)
## フロントエンド
- React (Firebase Hosting)
## バックエンド
- Python（Cloud Run）
- Javascript（Firebase cloud functions）
## DB
- **ユーザ情報保存**: Firestore Database
- **画像保存**: FireStorage
- **HTML保存**: Cloud Storage
## AIモデル
- **ドキュメント検索**: gemini-1.5-flash-001
- **荷物抽出**: gemini-2.0-flash-001
- **画像生成**: imagen-4.0-fast-generate-preview-06-06

## その他
- Custom Search API

# 🔧 セットアップとデプロイ (Setup & Deployment)
## 前提条件
- Google Cloud SDK (gcloud) がインストール・設定済みであること。
- Firebase CLI がインストール・設定済みであること。
- Node.js と npm (または yarn) がインストール済みであること。
- Python 3.x がインストール済みであること。
- GCPプロジェクトで以下のAPIが有効になっていること:
    - Cloud Run API

    - Cloud Build API

    - Vertex AI API

    - Cloud Functions API

    - Cloud Storage API

    - Firestore API

    - Custom Search API

デプロイ手順
1. Cloud Run へのデプロイ (バックエンドAPI)
バックエンドのPythonアプリケーションをCloud Runにデプロイします。

```bash
# 環境変数を設定 (例)
export PROJECT_ID="your-gcp-project-id"
export REGION="asia-northeast1"
export SERVICE_NAME="nizukuri-ai-backend"
export BUCKET_NAME="your-gcs-bucket-name"
export SEARCH_API_KEY="your-search-api-key"
export SEARCH_CX="your-search-cx-id"

# デプロイコマンド
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT=${PROJECT_ID}" \
  --set-env-vars "GCS_BUCKET_NAME=${BUCKET_NAME}" \
  --set-env-vars "CUSTOM_SEARCH_API_KEY=${SEARCH_API_KEY}" \
  --set-env-vars "CUSTOM_SEARCH_CX=${SEARCH_CX}"
```

2. Cloud Functions へのデプロイ (画像生成)
Firestoreトリガーで動作するFunctionをデプロイします。

```bash
# functionsディレクトリに移動
cd functions # or your functions directory name

# 依存関係をインストール
npm install

# デプロイ
firebase deploy --only functions
```

3. Firebase Hosting へのデプロイ (フロントエンド)
Reactで構築されたフロントエンドをデプロイします。
```bash
# frontendディレクトリに移動
cd frontend # or your frontend directory name

# 依存関係をインストール
npm install

# アプリケーションをビルド
npm run build

# Firebase Hostingにデプロイ
firebase deploy --only hosting
```