#!/bin/bash

echo "========================================="
echo "Deploying AgamiNews Control Centre v1.0"
echo "========================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Deploy the worker
echo "Deploying worker to Cloudflare..."
wrangler deploy worker/index.js --name agaminews-worker --compatibility-date 2024-01-01

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "To test the new Telegram interface:"
echo "1. Open Telegram"
echo "2. Send /start to your bot"
echo "3. You should see: AgamiNews Control Centre v1.0"
echo ""
echo "If you still see the old v2.6 menu:"
echo "- Clear Telegram cache"
echo "- Send /start again"
echo "- Or wait a few minutes for Cloudflare to update"
echo ""