#!/bin/bash

# Direct deployment script for AgamiNews
echo "Direct Deployment to Cloudflare Workers"
echo "========================================"

# Set environment variables
export CLOUDFLARE_ACCOUNT_ID="YOUR_ACCOUNT_ID"
export CLOUDFLARE_API_TOKEN="YOUR_API_TOKEN"

# Check if credentials are set
if [ "$CLOUDFLARE_API_TOKEN" = "YOUR_API_TOKEN" ]; then
    echo "ERROR: Please set your Cloudflare credentials in this script"
    echo "1. Get your Account ID from: https://dash.cloudflare.com"
    echo "2. Create API Token at: https://dash.cloudflare.com/profile/api-tokens"
    echo "   - Use template: Edit Cloudflare Workers"
    echo "3. Edit this script and replace YOUR_ACCOUNT_ID and YOUR_API_TOKEN"
    exit 1
fi

# Deploy using wrangler
echo "Deploying worker..."
npx wrangler deploy worker/index.js \
    --name agaminews \
    --compatibility-date 2024-01-01 \
    --kv-namespace NEWS_KV \
    --env production

echo "Deployment complete!"
echo "Test your bot now - send /start and you should see v1.0"