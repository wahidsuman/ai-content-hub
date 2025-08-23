#!/bin/bash

echo "🔧 Setting up Cloudflare for agaminews.in"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_status "Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Check if logged into Cloudflare
print_status "Checking Cloudflare login..."
if ! wrangler whoami &> /dev/null; then
    print_warning "Not logged into Cloudflare. Please login:"
    wrangler login
fi

print_success "Cloudflare login verified"

# Create KV namespace
print_status "Creating KV namespace for agaminews-bot..."
wrangler kv:namespace create "NEWS_KV"

# Create preview KV namespace
print_status "Creating preview KV namespace..."
wrangler kv:namespace create "NEWS_KV" --preview

print_success "KV namespaces created successfully"

# Get KV namespace IDs
print_status "Getting KV namespace IDs..."
KV_ID=$(wrangler kv:namespace list | grep "NEWS_KV" | head -1 | awk '{print $1}')
KV_PREVIEW_ID=$(wrangler kv:namespace list | grep "NEWS_KV" | tail -1 | awk '{print $1}')

print_success "KV Namespace ID: $KV_ID"
print_success "KV Preview Namespace ID: $KV_PREVIEW_ID"

# Update wrangler.toml with the new IDs
print_status "Updating wrangler.toml with KV namespace IDs..."
sed -i.bak "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" worker/wrangler.toml
sed -i.bak "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$KV_PREVIEW_ID\"/" worker/wrangler.toml

print_success "wrangler.toml updated with KV namespace IDs"

# Deploy the worker
print_status "Deploying agaminews-bot worker..."
cd worker
wrangler deploy

if [ $? -eq 0 ]; then
    print_success "Worker deployed successfully!"
    
    # Get worker URL
    WORKER_URL=$(wrangler whoami | grep "Account" | awk '{print $2}' | sed 's/.*@//')
    FULL_WORKER_URL="https://agaminews-bot.$WORKER_URL.workers.dev"
    
    print_success "Worker URL: $FULL_WORKER_URL"
    echo ""
    echo "🎉 Cloudflare setup complete!"
    echo "============================="
    echo "Worker deployed to: $FULL_WORKER_URL"
    echo ""
    echo "Next steps:"
    echo "1. Set up API keys in Cloudflare dashboard"
    echo "2. Configure Telegram webhook"
    echo "3. Deploy the website"
    echo ""
    echo "📋 KV Namespace IDs for reference:"
    echo "Production: $KV_ID"
    echo "Preview: $KV_PREVIEW_ID"
    
else
    print_warning "Worker deployment failed. Please check the logs above."
fi

cd ..