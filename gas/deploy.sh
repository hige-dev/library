#!/bin/bash
set -e

cd "$(dirname "$0")"

# Push and deploy
clasp push
DEPLOY_OUTPUT=$(clasp create-deployment 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract deployment ID (format: "Deployed AKfycb... @N")
DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE 'AKfycb[a-zA-Z0-9_-]+')

if [ -z "$DEPLOY_ID" ]; then
  echo "Error: Could not extract deployment ID"
  exit 1
fi

# Build GAS URL
GAS_URL="https://script.google.com/macros/s/${DEPLOY_ID}/exec"

echo ""
echo "New GAS URL: $GAS_URL"

# Update .env.development
ENV_FILE="../frontend/.env.development"
if [ -f "$ENV_FILE" ]; then
  sed -i "s|^VITE_GAS_API_URL=.*|VITE_GAS_API_URL=${GAS_URL}|" "$ENV_FILE"
  echo "Updated $ENV_FILE"
else
  echo "Warning: $ENV_FILE not found"
fi
