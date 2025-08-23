#!/bin/bash

echo "🚀 Tech News Bot - Quick Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check Git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

print_success "Git is installed"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "worker" ] || [ ! -d "site" ]; then
    print_error "Please run this script from the project root directory."
    exit 1
fi

print_success "Project structure looks good"

# Install dependencies
print_status "Installing dependencies..."
npm install
cd worker && npm install && cd ..
cd site && npm install && cd ..

print_success "Dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env
    print_warning "Please update .env file with your configuration before continuing."
    echo ""
    echo "Required environment variables:"
    echo "- TELEGRAM_BOT_TOKEN"
    echo "- TELEGRAM_CHAT_ID"
    echo "- OPENAI_API_KEY"
    echo "- GITHUB_TOKEN"
    echo "- GITHUB_REPO"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_status "Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Check if user is logged into Cloudflare
print_status "Checking Cloudflare login..."
if ! wrangler whoami &> /dev/null; then
    print_warning "Not logged into Cloudflare. Please login:"
    wrangler login
fi

print_success "Cloudflare login verified"

# Create KV namespace if it doesn't exist
print_status "Setting up Cloudflare KV namespace..."
if ! wrangler kv:namespace list | grep -q "NEWS_KV"; then
    print_status "Creating KV namespace..."
    wrangler kv:namespace create "NEWS_KV"
    wrangler kv:namespace create "NEWS_KV" --preview
    print_success "KV namespace created"
else
    print_success "KV namespace already exists"
fi

# Get KV namespace IDs
print_status "Getting KV namespace IDs..."
KV_ID=$(wrangler kv:namespace list | grep "NEWS_KV" | head -1 | awk '{print $1}')
KV_PREVIEW_ID=$(wrangler kv:namespace list | grep "NEWS_KV" | tail -1 | awk '{print $1}')

if [ -z "$KV_ID" ] || [ -z "$KV_PREVIEW_ID" ]; then
    print_error "Could not get KV namespace IDs. Please check your Cloudflare setup."
    exit 1
fi

print_success "KV Namespace ID: $KV_ID"
print_success "KV Preview Namespace ID: $KV_PREVIEW_ID"

# Update wrangler.toml
print_status "Updating wrangler.toml with KV namespace IDs..."
sed -i.bak "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" worker/wrangler.toml
sed -i.bak "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$KV_PREVIEW_ID\"/" worker/wrangler.toml

print_success "wrangler.toml updated"

# Deploy worker
print_status "Deploying Cloudflare Worker..."
cd worker
wrangler deploy

if [ $? -eq 0 ]; then
    print_success "Worker deployed successfully"
else
    print_error "Worker deployment failed"
    exit 1
fi

cd ..

# Get worker URL
WORKER_URL=$(wrangler whoami | grep "Account" | awk '{print $2}' | sed 's/.*@//')
WORKER_NAME=$(grep "name = " worker/wrangler.toml | cut -d'"' -f2)
FULL_WORKER_URL="https://$WORKER_NAME.$WORKER_URL.workers.dev"

print_success "Worker URL: $FULL_WORKER_URL"

# Ask for Telegram bot token
echo ""
print_status "Telegram Bot Setup"
echo "===================="
read -p "Enter your Telegram bot token: " TELEGRAM_BOT_TOKEN
read -p "Enter your Telegram chat ID: " TELEGRAM_CHAT_ID

# Set Telegram secrets
print_status "Setting Telegram secrets..."
echo "$TELEGRAM_BOT_TOKEN" | wrangler secret put TELEGRAM_BOT_TOKEN
echo "$TELEGRAM_CHAT_ID" | wrangler secret put TELEGRAM_CHAT_ID

# Ask for OpenAI API key
echo ""
print_status "OpenAI Setup"
echo "=============="
read -p "Enter your OpenAI API key: " OPENAI_API_KEY

# Set OpenAI secret
print_status "Setting OpenAI secret..."
echo "$OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY

# Ask for GitHub details
echo ""
print_status "GitHub Setup"
echo "=============="
read -p "Enter your GitHub token: " GITHUB_TOKEN
read -p "Enter your GitHub repository (format: username/repo): " GITHUB_REPO

# Set GitHub secrets
print_status "Setting GitHub secrets..."
echo "$GITHUB_TOKEN" | wrangler secret put GITHUB_TOKEN
echo "$GITHUB_REPO" | wrangler secret put GITHUB_REPO

# Set up Telegram webhook
print_status "Setting up Telegram webhook..."
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$FULL_WORKER_URL/webhook\"}"

if [ $? -eq 0 ]; then
    print_success "Telegram webhook set up successfully"
else
    print_error "Failed to set up Telegram webhook"
fi

# Build and deploy site
print_status "Building site..."
cd site
npm run build

if [ $? -eq 0 ]; then
    print_success "Site built successfully"
else
    print_error "Site build failed"
    exit 1
fi

cd ..

# Final instructions
echo ""
echo "🎉 Deployment Complete!"
echo "======================"
print_success "Worker deployed to: $FULL_WORKER_URL"
print_success "Site built in: site/dist/"
echo ""
echo "Next steps:"
echo "1. Deploy the site to Cloudflare Pages or GitHub Pages"
echo "2. Test your Telegram bot by sending /start"
echo "3. Wait for the first cron run (every 2 hours)"
echo "4. Monitor costs and performance"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT-CHECKLIST.md"
echo "💰 Expected monthly cost: $5-15"
echo "📈 Expected output: 10-15 posts per day"