#!/bin/bash

echo "🚀 Deploying Natural Language Bot Fix"
echo "====================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}This script will deploy the fixed bot with improved natural language processing${NC}"
echo ""

# Navigate to worker directory
cd worker

echo -e "${YELLOW}Step 1: Deploying updated worker...${NC}"
wrangler deploy

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}What's been fixed:${NC}"
echo "• Fixed TELEGRAM_CHAT_ID authentication issue"
echo "• Enhanced natural language understanding"
echo "• Added more conversational patterns"
echo "• Improved error handling and fallbacks"
echo "• Added interactive buttons to responses"
echo ""
echo -e "${BLUE}Test your bot now:${NC}"
echo "1. Open Telegram and message your bot"
echo "2. Try these natural messages:"
echo "   • 'Hello'"
echo "   • 'Show me the news'"
echo "   • 'How is my website doing?'"
echo "   • 'What's my budget?'"
echo "   • 'Give me some suggestions'"
echo ""
echo -e "${YELLOW}If the bot still doesn't respond:${NC}"
echo "1. Check your secrets are set correctly:"
echo "   wrangler secret list"
echo ""
echo "2. View live logs:"
echo "   wrangler tail"
echo ""
echo "3. Make sure webhook is set:"
echo "   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
echo ""