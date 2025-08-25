#!/bin/bash

echo "🔍 Testing Bot Connection and Debugging"
echo "======================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get bot token
echo -e "${BLUE}Enter your Bot Token:${NC}"
read -s BOT_TOKEN
echo ""

# Get chat ID
echo -e "${BLUE}Enter your Chat ID:${NC}"
read CHAT_ID
echo ""

echo -e "${YELLOW}Running diagnostics...${NC}"
echo ""

# 1. Check bot info
echo "1. Checking bot info..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$BOT_INFO" | grep -oP '"first_name":"\K[^"]+')
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -oP '"username":"\K[^"]+')
    echo -e "${GREEN}✅ Bot connected: $BOT_NAME (@$BOT_USERNAME)${NC}"
else
    echo -e "${RED}❌ Bot connection failed${NC}"
    echo "$BOT_INFO"
    exit 1
fi
echo ""

# 2. Check webhook
echo "2. Checking webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | grep -oP '"url":"\K[^"]+')
PENDING=$(echo "$WEBHOOK_INFO" | grep -oP '"pending_update_count":\K\d+')
LAST_ERROR=$(echo "$WEBHOOK_INFO" | grep -oP '"last_error_message":"\K[^"]+' || echo "None")

echo -e "${GREEN}✅ Webhook URL: $WEBHOOK_URL${NC}"
echo "   Pending updates: $PENDING"
echo "   Last error: $LAST_ERROR"
echo ""

# 3. Send test message
echo "3. Sending test message..."
TEST_MESSAGE="Test from diagnostic script: $(date '+%Y-%m-%d %H:%M:%S')"
SEND_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"$CHAT_ID\", \"text\": \"🔧 $TEST_MESSAGE\"}")

if echo "$SEND_RESULT" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Test message sent successfully${NC}"
else
    echo -e "${RED}❌ Failed to send test message${NC}"
    echo "$SEND_RESULT"
fi
echo ""

# 4. Get recent updates
echo "4. Checking recent updates (last 5 messages)..."
UPDATES=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getUpdates?limit=5")
UPDATE_COUNT=$(echo "$UPDATES" | grep -o '"update_id"' | wc -l)

if [ "$UPDATE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $UPDATE_COUNT recent updates${NC}"
    echo "$UPDATES" | grep -oP '"text":"\K[^"]+' | head -5 | while read -r msg; do
        echo "   • $msg"
    done
else
    echo -e "${YELLOW}⚠️ No recent updates found${NC}"
    echo "   This could mean:"
    echo "   - Webhook is consuming updates (normal)"
    echo "   - No recent messages sent"
fi
echo ""

# 5. Test webhook endpoint
echo "5. Testing webhook endpoint directly..."
WEBHOOK_TEST=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "update_id": 999999999,
        "message": {
            "message_id": 1,
            "from": {
                "id": '"$CHAT_ID"',
                "first_name": "Test",
                "username": "test"
            },
            "chat": {
                "id": '"$CHAT_ID"',
                "type": "private"
            },
            "date": 1234567890,
            "text": "Test webhook"
        }
    }')

if [ -z "$WEBHOOK_TEST" ] || echo "$WEBHOOK_TEST" | grep -q "OK"; then
    echo -e "${GREEN}✅ Webhook endpoint responded${NC}"
else
    echo -e "${YELLOW}⚠️ Webhook response: $WEBHOOK_TEST${NC}"
fi
echo ""

# 6. Deployment check
echo "6. Checking Cloudflare deployment..."
cd worker 2>/dev/null
if command -v wrangler &> /dev/null; then
    echo "Running: wrangler deployments list"
    wrangler deployments list 2>/dev/null | head -10 || echo "Could not get deployment info"
else
    echo -e "${YELLOW}⚠️ Wrangler not installed or not in worker directory${NC}"
fi
cd - > /dev/null 2>&1
echo ""

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Diagnostic Summary:${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo "Bot Token: ****${BOT_TOKEN: -4}"
echo "Chat ID: $CHAT_ID"
echo "Webhook: $WEBHOOK_URL"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. If webhook is not set to your worker URL, update it:"
echo "   curl -X POST \"https://api.telegram.org/bot\$TOKEN/setWebhook\" \\"
echo "        -d \"url=https://your-worker.workers.dev/telegram\""
echo ""
echo "2. Check worker logs for errors:"
echo "   cd worker && wrangler tail"
echo ""
echo "3. Make sure secrets are set:"
echo "   cd worker && wrangler secret list"
echo ""
echo "4. Deploy the latest code:"
echo "   cd worker && wrangler deploy"
echo ""