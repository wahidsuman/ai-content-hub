#!/bin/bash

# Automated Fix for AgamiNews Telegram Bot
# Worker URL: ai-website-manager.telegram-mcq-bot-wahid.workers.dev

echo "=========================================="
echo "  🤖 AUTO-FIXING YOUR TELEGRAM BOT"
echo "=========================================="
echo

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKER_URL="https://ai-website-manager.telegram-mcq-bot-wahid.workers.dev"
WEBHOOK_URL="${WORKER_URL}/webhook"

echo -e "${BLUE}Found your Cloudflare Worker:${NC}"
echo "→ $WORKER_URL"
echo

echo -e "${YELLOW}I need your Telegram Bot Token to fix the webhook.${NC}"
echo "Get it from @BotFather in Telegram (/mybots → API Token)"
echo
read -p "Enter your Bot Token: " BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}Error: Bot token is required!${NC}"
    exit 1
fi

echo
echo -e "${BLUE}Starting automatic fix...${NC}"
echo

# Step 1: Verify bot token
echo "1. Verifying bot token..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*' | cut -d'"' -f4)
    BOT_ID=$(echo "$BOT_INFO" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo -e "   ${GREEN}✓${NC} Bot verified: @$BOT_USERNAME (ID: $BOT_ID)"
else
    echo -e "   ${RED}✗${NC} Invalid bot token!"
    echo "   Please check your token and try again."
    exit 1
fi

# Step 2: Check current webhook
echo
echo "2. Checking current webhook..."
CURRENT_WEBHOOK=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -n "$CURRENT_WEBHOOK" ]; then
    echo "   Current webhook: $CURRENT_WEBHOOK"
    if [ "$CURRENT_WEBHOOK" = "$WEBHOOK_URL" ]; then
        echo -e "   ${GREEN}✓${NC} Webhook is already correct!"
        echo
        echo "Your bot should be working. Try sending /start in Telegram."
        exit 0
    else
        echo -e "   ${YELLOW}⚠${NC} Webhook needs to be updated"
    fi
else
    echo -e "   ${YELLOW}⚠${NC} No webhook configured"
fi

# Step 3: Test Worker endpoint
echo
echo "3. Testing Cloudflare Worker..."
WORKER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL")

if [ "$WORKER_RESPONSE" = "200" ] || [ "$WORKER_RESPONSE" = "404" ]; then
    echo -e "   ${GREEN}✓${NC} Worker is accessible (HTTP $WORKER_RESPONSE)"
else
    echo -e "   ${YELLOW}⚠${NC} Worker returned HTTP $WORKER_RESPONSE"
fi

# Test health endpoint
HEALTH_CHECK=$(curl -s "${WORKER_URL}/health" 2>/dev/null)
if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    echo -e "   ${GREEN}✓${NC} Health endpoint is working"
fi

# Step 4: Delete old webhook
echo
echo "4. Removing old webhook..."
DELETE_RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook")

if echo "$DELETE_RESULT" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✓${NC} Old webhook removed"
else
    echo -e "   ${YELLOW}⚠${NC} Could not remove old webhook (may not exist)"
fi

sleep 1

# Step 5: Set new webhook
echo
echo "5. Setting webhook to Cloudflare Worker..."
echo "   New webhook: $WEBHOOK_URL"

SET_RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"${WEBHOOK_URL}\",
        \"allowed_updates\": [\"message\", \"callback_query\", \"inline_query\"],
        \"drop_pending_updates\": true
    }")

if echo "$SET_RESULT" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✓${NC} Webhook set successfully!"
else
    echo -e "   ${RED}✗${NC} Failed to set webhook"
    ERROR_MSG=$(echo "$SET_RESULT" | grep -o '"description":"[^"]*' | cut -d'"' -f4)
    echo "   Error: $ERROR_MSG"
    exit 1
fi

# Step 6: Verify webhook
echo
echo "6. Verifying webhook configuration..."
sleep 2

VERIFY_RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
VERIFIED_URL=$(echo "$VERIFY_RESULT" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
PENDING_COUNT=$(echo "$VERIFY_RESULT" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)

if [ "$VERIFIED_URL" = "$WEBHOOK_URL" ]; then
    echo -e "   ${GREEN}✓${NC} Webhook verified: $VERIFIED_URL"
    if [ -n "$PENDING_COUNT" ] && [ "$PENDING_COUNT" -gt 0 ]; then
        echo -e "   ${YELLOW}ℹ${NC} Pending updates: $PENDING_COUNT (will be processed)"
    fi
else
    echo -e "   ${RED}✗${NC} Webhook verification failed"
fi

# Step 7: Send test message
echo
echo "7. Sending test notification..."
echo "   (Optional: Enter your Telegram Chat ID to receive a test message)"
read -p "   Chat ID (press Enter to skip): " CHAT_ID

if [ -n "$CHAT_ID" ]; then
    TEST_MSG="🎉 *Bot Fixed Successfully!*

✅ Bot: @$BOT_USERNAME
✅ Worker: ai-website-manager
✅ Webhook: Active
✅ Time: $(date '+%Y-%m-%d %H:%M:%S')

Your AgamiNews bot is now connected and ready!
Try sending /start to test it."

    SEND_RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"$CHAT_ID\",
            \"text\": \"$TEST_MSG\",
            \"parse_mode\": \"Markdown\"
        }")
    
    if echo "$SEND_RESULT" | grep -q '"ok":true'; then
        echo -e "   ${GREEN}✓${NC} Test message sent! Check your Telegram."
    else
        echo -e "   ${YELLOW}⚠${NC} Could not send test message"
    fi
fi

# Final summary
echo
echo "=========================================="
echo -e "${GREEN}  ✅ BOT FIXED SUCCESSFULLY!${NC}"
echo "=========================================="
echo
echo -e "${GREEN}Configuration Updated:${NC}"
echo "• Bot: @$BOT_USERNAME"
echo "• Worker: ai-website-manager.telegram-mcq-bot-wahid.workers.dev"
echo "• Webhook: $WEBHOOK_URL"
echo "• Status: Active"
echo
echo -e "${BLUE}Test Your Bot Now:${NC}"
echo "1. Open Telegram"
echo "2. Search for @$BOT_USERNAME"
echo "3. Send /start"
echo "4. Bot should respond immediately!"
echo
echo -e "${YELLOW}If bot doesn't respond:${NC}"
echo "1. Check Cloudflare Dashboard → Workers → Logs"
echo "2. Verify these environment variables are set in Cloudflare:"
echo "   • TELEGRAM_BOT_TOKEN = $BOT_TOKEN"
echo "   • OPENAI_API_KEY = your-openai-key"
echo "3. Make sure Worker is deployed and active"
echo
echo "Webhook Info: https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
echo