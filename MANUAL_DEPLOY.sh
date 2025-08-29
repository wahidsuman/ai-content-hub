#!/bin/bash

# Manual deployment script for ai-website-manager

echo "🚀 Manual Deployment Script for AgamiNews"
echo "========================================="
echo ""
echo "This will deploy the new code with:"
echo "✅ DALL-E images (no Unsplash)"
echo "✅ Clickable buttons"
echo "✅ Viral headlines"
echo "✅ Google Analytics"
echo ""

# Check if in worker directory
if [ ! -f "wrangler.toml" ]; then
    cd worker 2>/dev/null || { echo "❌ Please run from /workspace or /workspace/worker"; exit 1; }
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔐 You need to set your Cloudflare credentials:"
echo "Run these commands (replace with your values):"
echo ""
echo "export CLOUDFLARE_API_TOKEN='your-api-token'"
echo "export CLOUDFLARE_ACCOUNT_ID='your-account-id'"
echo ""
echo "Then run:"
echo "npx wrangler deploy --name ai-website-manager"
echo ""
echo "Or use wrangler login:"
echo "npx wrangler login"
echo "npx wrangler deploy --name ai-website-manager"