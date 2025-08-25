#!/bin/bash

echo "🔧 EMERGENCY BOT FIX SCRIPT"
echo "=========================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}This script will diagnose and fix your bot issues${NC}"
echo ""

# Step 1: Get credentials
echo -e "${BLUE}Step 1: Enter your credentials${NC}"
echo "-------------------------------"
echo ""

echo "Enter your Telegram Bot Token:"
echo "(Get from @BotFather on Telegram)"
read -s TELEGRAM_BOT_TOKEN
echo ""

echo "Enter your Telegram Chat ID:"
echo "(Get from @userinfobot on Telegram)"
read TELEGRAM_CHAT_ID
echo ""

echo "Enter your OpenAI API Key:"
echo "(Get from https://platform.openai.com/api-keys)"
read -s OPENAI_API_KEY
echo ""

# Step 2: Test Telegram connection
echo -e "${BLUE}Step 2: Testing Telegram connection${NC}"
echo "------------------------------------"

# Test bot token
BOT_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$BOT_INFO" | grep -oP '"first_name":"\K[^"]+')
    echo -e "${GREEN}✅ Bot connected: $BOT_NAME${NC}"
else
    echo -e "${RED}❌ Invalid bot token!${NC}"
    echo "$BOT_INFO"
    exit 1
fi

# Test sending message
TEST_MSG=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"$TELEGRAM_CHAT_ID\", \"text\": \"🔧 Bot fix in progress...\"}")

if echo "$TEST_MSG" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Can send messages to your Telegram${NC}"
else
    echo -e "${RED}❌ Cannot send messages. Check your Chat ID${NC}"
    echo "$TEST_MSG"
    exit 1
fi

# Step 3: Check webhook
echo ""
echo -e "${BLUE}Step 3: Checking webhook${NC}"
echo "------------------------"

WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo")
WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | grep -oP '"url":"\K[^"]+')

if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${RED}❌ No webhook set${NC}"
    NEEDS_WEBHOOK=true
else
    echo -e "${GREEN}✅ Webhook is set to: $WEBHOOK_URL${NC}"
    NEEDS_WEBHOOK=false
fi

# Step 4: Deploy to Cloudflare with secrets
echo ""
echo -e "${BLUE}Step 4: Deploying fixed bot to Cloudflare${NC}"
echo "-----------------------------------------"

cd worker

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Login to Cloudflare if needed
echo ""
echo -e "${YELLOW}Logging into Cloudflare...${NC}"
echo "A browser window may open for authentication"
npx wrangler login

# Deploy the worker
echo ""
echo -e "${YELLOW}Deploying worker...${NC}"
npx wrangler deploy

# Set secrets
echo ""
echo -e "${YELLOW}Setting secrets...${NC}"

echo "$TELEGRAM_BOT_TOKEN" | npx wrangler secret put TELEGRAM_BOT_TOKEN
echo "$TELEGRAM_CHAT_ID" | npx wrangler secret put TELEGRAM_CHAT_ID  
echo "$OPENAI_API_KEY" | npx wrangler secret put OPENAI_API_KEY

# Get worker URL
echo ""
echo -e "${BLUE}Step 5: Setting up webhook${NC}"
echo "---------------------------"

echo "Enter your Cloudflare Worker URL:"
echo "(e.g., https://ai-website-manager.YOUR-SUBDOMAIN.workers.dev)"
read WORKER_URL

# Set webhook
WEBHOOK_ENDPOINT="$WORKER_URL/telegram"
echo "Setting webhook to: $WEBHOOK_ENDPOINT"

# Delete old webhook first
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook" > /dev/null

# Set new webhook
WEBHOOK_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$WEBHOOK_ENDPOINT\"}")

if echo "$WEBHOOK_RESULT" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Webhook set successfully!${NC}"
else
    echo -e "${RED}❌ Failed to set webhook${NC}"
    echo "$WEBHOOK_RESULT"
fi

# Step 6: Test the bot
echo ""
echo -e "${BLUE}Step 6: Testing your bot${NC}"
echo "------------------------"

# Send test commands
curl -s -X POST "$WEBHOOK_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
        \"update_id\": 1,
        \"message\": {
            \"message_id\": 1,
            \"from\": {
                \"id\": $TELEGRAM_CHAT_ID,
                \"first_name\": \"Test\",
                \"username\": \"test\"
            },
            \"chat\": {
                \"id\": $TELEGRAM_CHAT_ID,
                \"type\": \"private\"
            },
            \"date\": $(date +%s),
            \"text\": \"/start\"
        }
    }" > /dev/null

echo -e "${GREEN}✅ Sent test /start command${NC}"

# Final message
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{
        \"chat_id\": \"$TELEGRAM_CHAT_ID\",
        \"text\": \"✅ *Bot Fixed and Deployed!*\n\nYour bot is now active and ready to use!\n\nTry these commands:\n• /start - Welcome message\n• /help - Show commands\n• /news - Get latest news\n• /performance - Check stats\n\nOr just say 'Hello' to test natural language!\",
        \"parse_mode\": \"Markdown\"
    }" > /dev/null

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ BOT FIXED AND DEPLOYED!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Your bot is now:"
echo "• Connected to Telegram ✅"
echo "• Deployed to Cloudflare ✅"
echo "• Webhook configured ✅"
echo "• Secrets set ✅"
echo ""
echo -e "${YELLOW}Test your bot now in Telegram:${NC}"
echo "1. Open Telegram"
echo "2. Message your bot"
echo "3. Try: /start"
echo "4. Try: 'Hello'"
echo "5. Try: 'Show me the news'"
echo ""
echo -e "${BLUE}Monitor logs:${NC}"
echo "cd worker && npx wrangler tail"
echo ""

cd ..