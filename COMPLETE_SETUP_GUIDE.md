# 🚀 AgamiNews AI Bot - Complete Setup Guide

## 📋 What We're Building
An AI-powered Telegram bot that manages your website agaminews.in by:
- Fetching crypto, AI, tech, EV, and gadget news
- Presenting summaries for your approval
- Generating SEO-optimized articles
- Managing budget ($10/month limit)
- Providing daily SEO suggestions

---

## 🎯 Step 1: Prerequisites

### What You Need:
1. **Telegram Bot Token** ✅ You have: `8122631689:AAGgmT7PGYcRrs7hzyO4aqGWhujA5oXH2Kk`
2. **OpenAI API Key** ❓ Get from: https://platform.openai.com/api-keys
3. **Your Telegram Chat ID** ❓ We'll find this in Step 3
4. **Cloudflare Account** ✅ You have this

---

## 🔧 Step 2: Get Your Telegram Chat ID

1. Open Telegram
2. Search for your bot: **@Agaminews_bot**
3. Send any message to it (like "Hello")
4. Open this URL in your browser:
```
https://api.telegram.org/bot8122631689:AAGgmT7PGYcRrs7hzyO4aqGWhujA5oXH2Kk/getUpdates
```
5. Look for `"chat":{"id":` followed by a number - that's your Chat ID
6. Save this number

---

## 🌐 Step 3: Set Up Cloudflare Worker

### From Mobile Browser:

1. **Go to Cloudflare Dashboard**
   - Open: https://dash.cloudflare.com
   - Login to your account

2. **Create New Worker** (or edit existing)
   - Click "Workers & Pages"
   - Click "Create application"
   - Select "Create Worker"
   - Name it: `agaminews-bot` (or use existing `ai-website-manager`)

3. **Add the Bot Code**
   - Click "Quick edit"
   - Delete all existing code
   - Copy and paste the code from Step 4 below

4. **Set Environment Variables**
   - Go to Settings → Variables
   - Add these (click "Add variable" for each):
     ```
     TELEGRAM_BOT_TOKEN = 8122631689:AAGgmT7PGYcRrs7hzyO4aqGWhujA5oXH2Kk
     OPENAI_API_KEY = [your-openai-api-key]
     TELEGRAM_CHAT_ID = [your-chat-id-from-step-2]
     ```

5. **Create KV Namespace** (for budget tracking)
   - Go to Workers & Pages → KV
   - Click "Create namespace"
   - Name: `agaminews-budget`
   - Go back to your Worker → Settings → Bindings
   - Add KV Namespace binding:
     - Variable name: `BUDGET`
     - Select: `agaminews-budget`

6. **Save and Deploy**
   - Click "Save and Deploy"

---

## 📝 Step 4: The Complete Bot Code

Copy this ENTIRE code and paste it into your Cloudflare Worker:

```javascript
[See the code in the next section]
```

---

## 🔗 Step 5: Connect Telegram to Worker

After deploying your Worker, you'll get a URL like:
`https://agaminews-bot.your-account.workers.dev`

Now set the webhook by opening this URL in your browser:
```
https://api.telegram.org/bot8122631689:AAGgmT7PGYcRrs7hzyO4aqGWhujA5oXH2Kk/setWebhook?url=https://YOUR-WORKER-URL.workers.dev/webhook
```

Replace `YOUR-WORKER-URL` with your actual Worker URL.

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

---

## ✅ Step 6: Test Your Bot

1. Open Telegram
2. Go to @Agaminews_bot
3. Send `/start`

You should see the welcome message!

### Test Commands:
- `/start` - Welcome message
- `/news` - Fetch latest news
- `/status` - Check status
- `/budget` - View API usage
- `/seo` - Get SEO suggestion
- `/help` - Show all commands

---

## 🎯 Step 7: Daily Workflow

### Morning Routine:
1. Bot sends you `/news` with 10-15 stories
2. You approve/reject with buttons
3. Bot generates full articles for approved stories
4. Articles ready to publish on agaminews.in

### Throughout the Day:
- Bot alerts you to breaking news
- Suggests SEO improvements
- Tracks budget usage
- Monitors website performance

---

## 🔧 Troubleshooting

### Bot Not Responding?

1. **Check Webhook Status:**
   Open in browser:
   ```
   https://api.telegram.org/bot8122631689:AAGgmT7PGYcRrs7hzyO4aqGWhujA5oXH2Kk/getWebhookInfo
   ```
   Should show your Worker URL

2. **Check Worker Logs:**
   - Cloudflare Dashboard → Workers → Your Bot → Logs
   - Look for errors

3. **Verify Environment Variables:**
   - All three must be set correctly
   - No quotes around values
   - No extra spaces

4. **Test Worker Directly:**
   Visit: `https://your-worker.workers.dev/health`
   Should return: `{"status":"healthy","service":"AgamiNews Manager"}`

---

## 📊 Budget Management

The bot automatically tracks OpenAI API usage:
- **Daily limit:** $0.30
- **Monthly limit:** $10.00
- **Cost per summary:** ~$0.001
- **Cost per article:** ~$0.01

When 90% of daily budget is used, bot stops generating full articles.

---

## 🚀 Advanced Features

### Set Up Automatic News Fetching:
1. Go to Worker → Triggers
2. Add Cron Trigger
3. Set schedule: `0 9 * * *` (9 AM daily)
4. Route: `/fetch-news`

### Custom News Sources:
Send to bot: "Add news source: [URL]"
Bot will monitor it daily

### SEO Optimization:
Bot automatically:
- Suggests keywords
- Optimizes titles
- Creates meta descriptions
- Adds schema markup
- Suggests internal links

---

## 📱 Mobile Management Tips

1. **Save these URLs as bookmarks:**
   - Cloudflare Worker Dashboard
   - Webhook status check
   - Worker health check

2. **Create Telegram shortcuts:**
   - Pin the bot chat
   - Set notification preferences
   - Create quick reply templates

3. **Monitor from phone:**
   - Check `/status` daily
   - Review `/budget` weekly
   - Act on `/seo` suggestions

---

## 🎉 Success Checklist

- [ ] Got Telegram Chat ID
- [ ] Set up Cloudflare Worker
- [ ] Added environment variables
- [ ] Created KV namespace
- [ ] Deployed bot code
- [ ] Set webhook URL
- [ ] Tested `/start` command
- [ ] Received first news summary
- [ ] Approved first article

---

## 💡 Pro Tips

1. **Approve articles in batches** to save API costs
2. **Focus on trending topics** for better SEO
3. **Add images manually** for better quality
4. **Review bot suggestions** before publishing
5. **Monitor competitors** through the bot

---

## 🆘 Need Help?

If something isn't working:
1. Double-check all environment variables
2. Ensure webhook points to Worker URL
3. Check Worker logs for errors
4. Verify OpenAI API key is valid
5. Make sure Chat ID is correct

Your bot should now be fully functional!