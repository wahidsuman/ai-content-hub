#!/bin/bash

echo "🔐 GitHub Secrets Setup for Hands-Free Deployment"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}This script will help you set up GitHub secrets for automatic deployment${NC}"
echo ""
echo "You'll need:"
echo "1. GitHub Personal Access Token"
echo "2. Cloudflare API Token"
echo "3. Cloudflare Account ID"
echo "4. Telegram Bot Token"
echo "5. Telegram Chat ID"
echo "6. OpenAI API Key"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI (gh) is not installed. Installing...${NC}"
    
    # Detect OS and install gh
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install gh
    else
        echo -e "${RED}Please install GitHub CLI manually: https://cli.github.com/${NC}"
        exit 1
    fi
fi

# Authenticate with GitHub
echo -e "${BLUE}Step 1: Authenticate with GitHub${NC}"
gh auth login

# Get repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${GREEN}Setting secrets for repository: $REPO${NC}"
echo ""

# Function to set secret
set_secret() {
    local name=$1
    local value=$2
    echo -e "${YELLOW}Setting $name...${NC}"
    echo "$value" | gh secret set "$name" --repo="$REPO"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $name set successfully${NC}"
    else
        echo -e "${RED}❌ Failed to set $name${NC}"
    fi
}

echo -e "${BLUE}Step 2: Cloudflare Configuration${NC}"
echo ""

# Cloudflare API Token
echo "Create a Cloudflare API Token:"
echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
echo "2. Click 'Create Token'"
echo "3. Use 'Custom token' template with these permissions:"
echo "   - Account: Cloudflare Workers Scripts:Edit"
echo "   - Account: Cloudflare Pages:Edit"
echo "   - Zone: Page Rules:Edit"
echo ""
read -p "Enter Cloudflare API Token: " CF_API_TOKEN
set_secret "CLOUDFLARE_API_TOKEN" "$CF_API_TOKEN"

# Cloudflare Account ID
echo ""
echo "Get your Cloudflare Account ID:"
echo "1. Go to https://dash.cloudflare.com/"
echo "2. Select your domain"
echo "3. On the right sidebar, copy the Account ID"
echo ""
read -p "Enter Cloudflare Account ID: " CF_ACCOUNT_ID
set_secret "CLOUDFLARE_ACCOUNT_ID" "$CF_ACCOUNT_ID"

# Worker URL
echo ""
echo "Your worker URL (e.g., https://ai-website-manager.YOUR-SUBDOMAIN.workers.dev)"
read -p "Enter Worker URL: " WORKER_URL
set_secret "WORKER_URL" "$WORKER_URL"

echo ""
echo -e "${BLUE}Step 3: Telegram Configuration${NC}"
echo ""

# Telegram Bot Token
echo "Get your Telegram Bot Token from @BotFather"
read -p "Enter Telegram Bot Token: " TG_BOT_TOKEN
set_secret "TELEGRAM_BOT_TOKEN" "$TG_BOT_TOKEN"

# Telegram Chat ID
echo ""
echo "Get your Telegram Chat ID from @userinfobot"
read -p "Enter Telegram Chat ID: " TG_CHAT_ID
set_secret "TELEGRAM_CHAT_ID" "$TG_CHAT_ID"

echo ""
echo -e "${BLUE}Step 4: OpenAI Configuration${NC}"
echo ""

# OpenAI API Key
echo "Get your OpenAI API key from https://platform.openai.com/api-keys"
read -p "Enter OpenAI API Key: " OPENAI_KEY
set_secret "OPENAI_API_KEY" "$OPENAI_KEY"

echo ""
echo -e "${BLUE}Step 5: GitHub Token (Optional)${NC}"
echo ""

# GitHub Token for content storage
echo "Create a GitHub Personal Access Token (for content backup):"
echo "1. Go to https://github.com/settings/tokens/new"
echo "2. Give it 'repo' scope"
echo "3. Set expiration as needed"
echo ""
read -p "Enter GitHub Token (or press Enter to skip): " GH_TOKEN
if [ ! -z "$GH_TOKEN" ]; then
    set_secret "GH_TOKEN" "$GH_TOKEN"
fi

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Your secrets have been configured:${NC}"
gh secret list --repo="$REPO"

echo ""
echo -e "${YELLOW}🚀 How to Deploy:${NC}"
echo ""
echo "1. Automatic deployment on push:"
echo "   git add ."
echo "   git commit -m 'Your changes'"
echo "   git push"
echo ""
echo "2. Manual deployment from GitHub:"
echo "   - Go to https://github.com/$REPO/actions"
echo "   - Click 'Deploy Everything Automatically'"
echo "   - Click 'Run workflow'"
echo ""
echo "3. Deploy via comment:"
echo "   - Comment '/deploy all' on any issue"
echo "   - Comment '/deploy bot' for bot only"
echo "   - Comment '/deploy site' for site only"
echo ""
echo -e "${GREEN}You're all set for hands-free deployment!${NC}"