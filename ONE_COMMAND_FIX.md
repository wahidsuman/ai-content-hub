# 🚀 ONE COMMAND TO FIX YOUR BOT

Your Cloudflare Worker is **ONLINE** at:
`https://ai-website-manager.telegram-mcq-bot-wahid.workers.dev`

## ✅ Copy & Paste This Command:

Replace `YOUR_BOT_TOKEN` with your actual bot token and run:

```bash
curl -X POST https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url":"https://ai-website-manager.telegram-mcq-bot-wahid.workers.dev/webhook","allowed_updates":["message","callback_query"],"drop_pending_updates":true}'
```

## 📋 Or Use The Auto-Fix Script:

```bash
bash /workspace/auto_fix_bot.sh
```

This script will:
1. Ask for your bot token
2. Automatically fix the webhook
3. Verify everything is working
4. Send you a test message

## 🔍 After Running:

1. Open Telegram
2. Find your bot
3. Send `/start`
4. Bot should respond immediately!

## ⚠️ Make Sure in Cloudflare Dashboard:

Go to: Workers & Pages → ai-website-manager → Settings → Environment Variables

These must be set:
- `TELEGRAM_BOT_TOKEN` = your bot token
- `OPENAI_API_KEY` = your OpenAI API key
- `TELEGRAM_CHAT_ID` = your chat ID (optional)

That's it! One command and your bot will be working!