# Pythonの公式イメージをベースにする
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# 依存ライブラリをrequirements.txtからインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# FastAPIサーバーを起動するコマンド
# Cloud RunがPORT環境変数を設定するので、それに従う
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]