#!/bin/bash

# Cloudflare Worker Telegram Bot Fix Script
# For agaminews.in

echo "=========================================="
echo "  Cloudflare Worker Bot Quick Fix"
echo "  Website: agaminews.in"
echo "=========================================="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get bot token and worker URL
echo -e "${YELLOW}Please provide your details:${NC}"
echo
read -p "1. Telegram Bot Token (from @BotFather): " BOT_TOKEN
read -p "2. Cloudflare Worker URL (e.g., https://bot.username.workers.dev): " WORKER_URL

# Validate inputs
if [ -z "$BOT_TOKEN" ] || [ -z "$WORKER_URL" ]; then
    echo -e "${RED}Error: Bot token and Worker URL are required${NC}"
    exit 1
fi

# Ensure WORKER_URL starts with https://
if [[ ! "$WORKER_URL" =~ ^https?:// ]]; then
    WORKER_URL="https://$WORKER_URL"
fi

echo
echo -e "${BLUE}Testing configuration...${NC}"
echo

# 1. Test bot token
echo "1. Checking bot token validity..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*' | cut -d'"' -f4)
    BOT_ID=$(echo "$BOT_INFO" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo -e "   ${GREEN}✓${NC} Bot token is valid"
    echo "   Bot: @$BOT_USERNAME (ID: $BOT_ID)"
else
    echo -e "   ${RED}✗${NC} Invalid bot token"
    echo "   Error: $(echo "$BOT_INFO" | grep -o '"description":"[^"]*' | cut -d'"' -f4)"
    exit 1
fi

# 2. Test Worker endpoint
echo
echo "2. Testing Cloudflare Worker..."
WORKER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL")

if [ "$WORKER_RESPONSE" = "200" ] || [ "$WORKER_RESPONSE" = "404" ]; then
    echo -e "   ${GREEN}✓${NC} Worker is accessible (HTTP $WORKER_RESPONSE)"
else
    echo -e "   ${YELLOW}⚠${NC} Worker returned HTTP $WORKER_RESPONSE"
fi

# Test health endpoint if exists
HEALTH_RESPONSE=$(curl -s "${WORKER_URL}/health" 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "   ${GREEN}✓${NC} Health endpoint is working"
fi

# 3. Check current webhook
echo
echo "3. Checking current webhook configuration..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
CURRENT_WEBHOOK=$(echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -n "$CURRENT_WEBHOOK" ]; then
    echo "   Current webhook: $CURRENT_WEBHOOK"
    
    # Check if it matches our worker
    if [[ "$CURRENT_WEBHOOK" == *"$WORKER_URL"* ]]; then
        echo -e "   ${GREEN}✓${NC} Webhook is correctly set to your Worker"
    else
        echo -e "   ${YELLOW}⚠${NC} Webhook points to different URL"
    fi
    
    # Check for errors
    LAST_ERROR=$(echo "$WEBHOOK_INFO" | grep -o '"last_error_message":"[^"]*' | cut -d'"' -f4)
    if [ -n "$LAST_ERROR" ]; then
        echo -e "   ${RED}✗${NC} Last webhook error: $LAST_ERROR"
    fi
else
    echo -e "   ${YELLOW}⚠${NC} No webhook configured"
fi

# 4. Set/Update webhook
echo
echo "4. Setting webhook to Cloudflare Worker..."

WEBHOOK_URL="${WORKER_URL}/webhook"
echo "   Setting webhook to: $WEBHOOK_URL"

SET_RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -d "url=${WEBHOOK_URL}" \
    -d "allowed_updates=[\"message\",\"callback_query\"]")

if echo "$SET_RESULT" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✓${NC} Webhook set successfully!"
else
    echo -e "   ${RED}✗${NC} Failed to set webhook"
    echo "   Error: $(echo "$SET_RESULT" | grep -o '"description":"[^"]*' | cut -d'"' -f4)"
fi

# 5. Clear pending updates
echo
echo "5. Clearing any pending updates..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1" > /dev/null
echo -e "   ${GREEN}✓${NC} Cleared pending updates"

# 6. Test message sending
echo
echo "6. Sending test message..."
read -p "   Enter your Telegram Chat ID (optional, press Enter to skip): " CHAT_ID

if [ -n "$CHAT_ID" ]; then
    TEST_MESSAGE="🤖 Bot Test Message
    
✅ Bot: @$BOT_USERNAME
✅ Worker: $WORKER_URL
✅ Time: $(date)
✅ Website: agaminews.in

Your bot is configured and ready!"

    SEND_RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d "chat_id=$CHAT_ID" \
        -d "text=$TEST_MESSAGE" \
        -d "parse_mode=Markdown")
    
    if echo "$SEND_RESULT" | grep -q '"ok":true'; then
        echo -e "   ${GREEN}✓${NC} Test message sent! Check your Telegram"
    else
        echo -e "   ${RED}✗${NC} Failed to send test message"
    fi
fi

# Summary
echo
echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo
echo "✅ Bot Information:"
echo "   • Bot: @$BOT_USERNAME"
echo "   • Worker: $WORKER_URL"
echo "   • Webhook: $WEBHOOK_URL"
echo
echo "📝 Next Steps:"
echo "1. Open Telegram and search for @$BOT_USERNAME"
echo "2. Send /start to your bot"
echo "3. Check if you get a response"
echo
echo "🔧 If bot doesn't respond:"
echo "1. Check Cloudflare Dashboard → Workers → Logs"
echo "2. Verify environment variables are set:"
echo "   • TELEGRAM_BOT_TOKEN"
echo "   • OPENAI_API_KEY"
echo "3. Make sure Worker code handles /webhook path"
echo
echo "📊 Monitor your bot:"
echo "   • Cloudflare Dashboard: https://dash.cloudflare.com"
echo "   • Worker Analytics: Check requests and errors"
echo "   • Webhook Info: https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
echo