#!/bin/bash
# Auto-generated fix script for OpenAI-Telegram Bot
# Generated: 2025-08-25 10:30:38

echo "Starting bot fix process..."

# Set environment variables
export TELEGRAM_BOT_TOKEN="your_telegram_bot_token_here"
export OPENAI_API_KEY="your_openai_api_key_here"
export TELEGRAM_CHAT_ID="your_telegram_chat_id_here"
export WEBHOOK_URL="None"

# Kill existing bot process
echo "Stopping existing bot process..."
pkill -f "bot.py" 2>/dev/null
pkill -f "telegram_bot.py" 2>/dev/null

# Clear Telegram webhook
echo "Clearing webhook..."
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"

# Set new webhook
echo "Setting webhook..."
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -d "url=$WEBHOOK_URL"

# Start bot
echo "Starting bot..."
nohup python3 bot.py > bot.log 2>&1 &

echo "Bot fix process completed!"
echo "Check bot.log for details"
