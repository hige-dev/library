#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_NAME="sam-app"

# dev環境の設定（環境変数で上書き可能）
DEV_SPREADSHEET_ID="${DEV_SPREADSHEET_ID:?DEV_SPREADSHEET_ID を設定してください}"
DEV_ALLOWED_ORIGIN="${DEV_ALLOWED_ORIGIN:-http://localhost:5173}"

echo "=== Lambda バックエンドのデプロイ ==="

cd "$PROJECT_ROOT/lambda"

echo "ビルド中..."
npm run build

echo "デプロイ中..."
sam deploy

# 関数名を取得
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' \
  --output text)

echo "=== prd デプロイ完了 ==="
echo "関数名: $FUNCTION_NAME"

# --- dev 環境セットアップ ---
echo ""
echo "=== dev 環境セットアップ ==="

# 現在の環境変数を取得し、dev 用に差し替え
CURRENT_ENV=$(aws lambda get-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --query 'Environment.Variables' \
  --output json)

UPDATED_ENV=$(echo "$CURRENT_ENV" | jq \
  --arg origin "$DEV_ALLOWED_ORIGIN" \
  --arg sheet "$DEV_SPREADSHEET_ID" \
  '.ALLOWED_ORIGIN = $origin | .SPREADSHEET_ID = $sheet')

echo "\$LATEST の環境変数を dev 用に更新中..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "{\"Variables\": $UPDATED_ENV}" \
  --no-cli-pager > /dev/null

# dev 用 Function URL の作成（初回のみ）
if aws lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --qualifier '$LATEST' > /dev/null 2>&1; then
  echo "dev 用 Function URL は既に存在します"
else
  echo "dev 用 Function URL を作成中..."
  aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --qualifier '$LATEST' \
    --auth-type NONE \
    --cors "{
      \"AllowOrigins\": [\"$DEV_ALLOWED_ORIGIN\"],
      \"AllowMethods\": [\"POST\", \"OPTIONS\"],
      \"AllowHeaders\": [\"Content-Type\", \"X-Auth-Token\", \"x-amz-content-sha256\"]
    }" \
    --no-cli-pager > /dev/null

  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --qualifier '$LATEST' \
    --statement-id dev-function-url-public \
    --action lambda:InvokeFunctionUrl \
    --principal '*' \
    --function-url-auth-type NONE \
    --no-cli-pager > /dev/null

  echo "dev 用 Function URL を作成しました"
fi

DEV_URL=$(aws lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --qualifier '$LATEST' \
  --query 'FunctionUrl' \
  --output text)

echo ""
echo "=== セットアップ完了 ==="
echo "dev Function URL: $DEV_URL"
echo ""
echo "frontend/.env.development に以下を設定してください:"
echo "  VITE_API_URL=${DEV_URL}"
