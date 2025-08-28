#!/bin/bash

# Fix Webhook for AgamiNews Telegram Bot
# This will redirect webhook from website to Cloudflare Worker

echo "==========================================="
echo "  🔧 FIXING YOUR TELEGRAM BOT WEBHOOK"
echo "==========================================="
echo

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}Current Problem:${NC}"
echo "✗ Webhook is pointing to: https://agaminews.in/telegram"
echo "✓ It should point to your Cloudflare Worker"
echo

echo -e "${BLUE}To fix this, I need:${NC}"
echo "1. Your Telegram Bot Token"
echo "2. Your Cloudflare Worker URL"
echo

read -p "Enter your Bot Token: " BOT_TOKEN
read -p "Enter your Cloudflare Worker URL (e.g., bot-name.account.workers.dev): " WORKER_URL

# Ensure WORKER_URL has https://
if [[ ! "$WORKER_URL" =~ ^https?:// ]]; then
    WORKER_URL="https://$WORKER_URL"
fi

# Construct webhook URL
WEBHOOK_URL="${WORKER_URL}/webhook"

echo
echo -e "${YELLOW}Updating webhook configuration...${NC}"
echo "New webhook URL: $WEBHOOK_URL"
echo

# Delete old webhook first
echo "1. Removing old webhook..."
DELETE_RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook")
if echo "$DELETE_RESULT" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✓${NC} Old webhook removed"
else
    echo -e "   ${RED}✗${NC} Failed to remove old webhook"
fi

sleep 1

# Set new webhook
echo "2. Setting new webhook to Cloudflare Worker..."
SET_RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${WEBHOOK_URL}\",\"allowed_updates\":[\"message\",\"callback_query\"]}")

if echo "$SET_RESULT" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✓${NC} Webhook updated successfully!"
else
    echo -e "   ${RED}✗${NC} Failed to set webhook"
    echo "   Error: $(echo "$SET_RESULT" | grep -o '"description":"[^"]*' | cut -d'"' -f4)"
    exit 1
fi

# Verify new webhook
echo "3. Verifying new configuration..."
sleep 1
VERIFY_RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
NEW_URL=$(echo "$VERIFY_RESULT" | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ "$NEW_URL" = "$WEBHOOK_URL" ]; then
    echo -e "   ${GREEN}✓${NC} Webhook correctly set to: $NEW_URL"
else
    echo -e "   ${RED}✗${NC} Webhook verification failed"
fi

# Test Worker endpoint
echo "4. Testing Cloudflare Worker..."
WORKER_TEST=$(curl -s -o /dev/null -w "%{http_code}" "${WORKER_URL}/health")
if [ "$WORKER_TEST" = "200" ]; then
    echo -e "   ${GREEN}✓${NC} Worker is responding"
else
    echo -e "   ${YELLOW}⚠${NC} Worker returned HTTP $WORKER_TEST"
    echo "   Make sure your Worker is deployed and handles /health endpoint"
fi

echo
echo "==========================================="
echo -e "${GREEN}  ✅ WEBHOOK FIXED!${NC}"
echo "==========================================="
echo
echo "Your bot webhook is now pointing to:"
echo "→ $WEBHOOK_URL"
echo
echo "📱 Test your bot now:"
echo "1. Open Telegram"
echo "2. Send /start to your bot"
echo "3. You should get a response!"
echo
echo "🔍 If bot doesn't respond, check:"
echo "• Cloudflare Dashboard → Workers → Logs"
echo "• Environment variables are set (TELEGRAM_BOT_TOKEN, OPENAI_API_KEY)"
echo "• Worker code handles /webhook path correctly"
echo