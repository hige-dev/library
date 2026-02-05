#!/bin/bash
set -e

cd "$(dirname "$0")"

# 固定のデプロイID（初回デプロイ後に設定）
DEPLOY_ID_FILE=".deploy-id"

# Push code
clasp push

# デプロイIDが保存されているか確認
if [ -f "$DEPLOY_ID_FILE" ]; then
  DEPLOY_ID=$(cat "$DEPLOY_ID_FILE")
  echo "Updating existing deployment: $DEPLOY_ID"
  clasp deploy --deploymentId "$DEPLOY_ID"
else
  echo "Creating new deployment..."
  DEPLOY_OUTPUT=$(clasp create-deployment 2>&1)
  echo "$DEPLOY_OUTPUT"

  # Extract deployment ID
  DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE 'AKfycb[a-zA-Z0-9_-]+')

  if [ -z "$DEPLOY_ID" ]; then
    echo "Error: Could not extract deployment ID"
    exit 1
  fi

  # Save deployment ID for future use
  echo "$DEPLOY_ID" > "$DEPLOY_ID_FILE"
  echo "Saved deployment ID to $DEPLOY_ID_FILE"

  # Update .env.development with new URL
  GAS_URL="https://script.google.com/macros/s/${DEPLOY_ID}/exec"
  ENV_FILE="../frontend/.env.development"
  if [ -f "$ENV_FILE" ]; then
    sed -i "s|^VITE_GAS_API_URL=.*|VITE_GAS_API_URL=${GAS_URL}|" "$ENV_FILE"
    echo "Updated $ENV_FILE"
  fi
fi

GAS_URL="https://script.google.com/macros/s/${DEPLOY_ID}/exec"
echo ""
echo "GAS URL: $GAS_URL"
