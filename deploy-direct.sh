#!/bin/bash

echo "======================================"
echo "Direct Cloudflare Workers Deployment"
echo "======================================"
echo ""
echo "This will deploy your worker directly to Cloudflare"
echo ""

# Prompt for credentials
read -p "Enter your CLOUDFLARE_ACCOUNT_ID: " ACCOUNT_ID
read -s -p "Enter your CLOUDFLARE_API_TOKEN: " API_TOKEN
echo ""
echo ""

# Export for wrangler
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
export CLOUDFLARE_API_TOKEN="$API_TOKEN"

echo "Deploying AgamiNews Worker..."
echo "------------------------------"

cd worker

# Try deployment
npx wrangler deploy --config wrangler.toml

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Your new Telegram menu should now be live!"
    echo "Send /start to your bot to see the new v1.0.3 interface"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Possible issues:"
    echo "1. Wrong Account ID or API Token"
    echo "2. KV namespace doesn't exist"
    echo "3. API token lacks permissions"
    echo ""
    echo "To fix KV namespace issue, try:"
    echo "npx wrangler kv:namespace create NEWS_KV"
fi