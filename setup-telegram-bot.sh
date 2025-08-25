#!/bin/bash

echo "🤖 Setting up AI Website Manager Telegram Bot"
echo "============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for input
prompt_for_value() {
    local var_name=$1
    local description=$2
    local example=$3
    
    echo -e "${BLUE}$description${NC}"
    if [ ! -z "$example" ]; then
        echo -e "${YELLOW}Example: $example${NC}"
    fi
    read -p "Enter $var_name: " value
    echo "$value"
}

echo -e "${GREEN}Step 1: Gather Required Information${NC}"
echo "--------------------------------------"
echo ""

# Get Telegram Bot Token
echo -e "${BLUE}1. TELEGRAM BOT TOKEN${NC}"
echo "   Get this from @BotFather on Telegram:"
echo "   - Open Telegram and search for @BotFather"
echo "   - Send /newbot or use existing bot"
echo "   - Follow instructions to create bot"
echo "   - Copy the token provided"
echo ""
TELEGRAM_BOT_TOKEN=$(prompt_for_value "TELEGRAM_BOT_TOKEN" "Paste your bot token" "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")

# Get Telegram Chat ID
echo ""
echo -e "${BLUE}2. TELEGRAM CHAT ID${NC}"
echo "   Get your chat ID:"
echo "   - Open Telegram and search for @userinfobot"
echo "   - Start the bot and it will show your ID"
echo "   - OR send a message to your bot and visit:"
echo "     https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
echo ""
TELEGRAM_CHAT_ID=$(prompt_for_value "TELEGRAM_CHAT_ID" "Enter your Telegram chat ID" "123456789")

# Get OpenAI API Key
echo ""
echo -e "${BLUE}3. OPENAI API KEY${NC}"
echo "   Get this from https://platform.openai.com/api-keys"
echo "   - Sign in to OpenAI"
echo "   - Go to API keys section"
echo "   - Create new secret key"
echo ""
OPENAI_API_KEY=$(prompt_for_value "OPENAI_API_KEY" "Paste your OpenAI API key" "sk-...")

# Get GitHub Token (optional)
echo ""
echo -e "${BLUE}4. GITHUB TOKEN (Optional)${NC}"
echo "   For content backup to GitHub:"
echo "   - Go to GitHub Settings > Developer settings > Personal access tokens"
echo "   - Generate new token with 'repo' scope"
echo "   - Leave empty to skip GitHub integration"
echo ""
GITHUB_TOKEN=$(prompt_for_value "GITHUB_TOKEN" "Paste GitHub token or press Enter to skip" "ghp_...")

# Get GitHub Repo (if token provided)
if [ ! -z "$GITHUB_TOKEN" ]; then
    echo ""
    GITHUB_REPO=$(prompt_for_value "GITHUB_REPO" "Enter GitHub repo" "username/repository-name")
else
    GITHUB_REPO=""
fi

echo ""
echo -e "${GREEN}Step 2: Configure Cloudflare Worker${NC}"
echo "------------------------------------"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Login to Cloudflare
echo "Logging into Cloudflare..."
echo "A browser window will open for authentication"
wrangler login

# Navigate to worker directory
cd worker

# Deploy the worker
echo ""
echo -e "${GREEN}Step 3: Deploy Worker to Cloudflare${NC}"
echo "------------------------------------"
echo ""
echo "Deploying worker..."
wrangler deploy

# Set secrets
echo ""
echo -e "${GREEN}Step 4: Configure Secrets${NC}"
echo "--------------------------"
echo ""

echo "Setting TELEGRAM_BOT_TOKEN..."
echo "$TELEGRAM_BOT_TOKEN" | wrangler secret put TELEGRAM_BOT_TOKEN

echo "Setting TELEGRAM_CHAT_ID..."
echo "$TELEGRAM_CHAT_ID" | wrangler secret put TELEGRAM_CHAT_ID

echo "Setting OPENAI_API_KEY..."
echo "$OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY

if [ ! -z "$GITHUB_TOKEN" ]; then
    echo "Setting GITHUB_TOKEN..."
    echo "$GITHUB_TOKEN" | wrangler secret put GITHUB_TOKEN
    
    echo "Setting GITHUB_REPO..."
    echo "$GITHUB_REPO" | wrangler secret put GITHUB_REPO
fi

# Get worker URL
echo ""
echo -e "${GREEN}Step 5: Set up Telegram Webhook${NC}"
echo "--------------------------------"
echo ""

# Get the worker URL from wrangler
WORKER_URL=$(wrangler deployments list | grep -oP 'https://[^\s]+' | head -1)

if [ -z "$WORKER_URL" ]; then
    echo -e "${YELLOW}Please enter your Cloudflare Worker URL:${NC}"
    echo "You can find this in your Cloudflare dashboard"
    read -p "Worker URL: " WORKER_URL
fi

# Set webhook
WEBHOOK_URL="$WORKER_URL/telegram"
echo "Setting webhook to: $WEBHOOK_URL"

curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"$WEBHOOK_URL\"}"

echo ""
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=================="
echo ""
echo -e "${BLUE}Your AI Website Manager is now active!${NC}"
echo ""
echo "📱 Open Telegram and message your bot to start:"
echo "   - Send /start to see the menu"
echo "   - Send /help for available commands"
echo "   - Send /news to fetch latest news"
echo "   - Send /performance to check website stats"
echo ""
echo "🤖 Available Commands:"
echo "   /start - Show main menu"
echo "   /help - Show help message"
echo "   /news - Fetch and approve news articles"
echo "   /performance - View website analytics"
echo "   /suggestions - Get AI suggestions"
echo "   /budget - Check API usage and costs"
echo "   /schedule - View posting schedule"
echo ""
echo "💡 You can also talk naturally to your bot!"
echo "   Examples:"
echo "   - 'Show me today's news'"
echo "   - 'How is my website performing?'"
echo "   - 'Create an article about AI'"
echo "   - 'What needs improvement?'"
echo ""
echo -e "${YELLOW}Important URLs:${NC}"
echo "   Worker URL: $WORKER_URL"
echo "   Webhook URL: $WEBHOOK_URL"
echo ""
echo -e "${GREEN}Need help? Check the logs:${NC}"
echo "   wrangler tail"
echo ""