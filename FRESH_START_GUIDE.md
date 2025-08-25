# 🚀 AgamiNews Bot - Complete Fresh Start Guide

## Step 1: Create Your Telegram Bot (5 minutes)

### On Telegram App:
1. **Open Telegram** and search for **@BotFather**
2. Start a chat and send: `/newbot`
3. **Choose a name** for your bot (e.g., "AgamiNews Manager")
4. **Choose a username** ending in 'bot' (e.g., "agaminews_manager_bot")
5. **Save the token** BotFather gives you (looks like: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)

### Configure Your Bot:
Send these commands to @BotFather:
- `/setdescription` - Set: "AI-powered website manager for agaminews.in"
- `/setabouttext` - Set: "I manage news content, SEO, and articles for agaminews.in"
- `/setcommands` - Set these commands:
```
start - Welcome message
news - Fetch latest news
status - Check website status
budget - View API usage
seo - Get SEO suggestion
help - Show all commands
```

---

## Step 2: Get Your OpenAI API Key (2 minutes)

1. **Go to:** https://platform.openai.com/api-keys
2. **Login** or create account
3. **Click** "Create new secret key"
4. **Name it:** "AgamiNews Bot"
5. **Copy the key** (starts with sk-...)
6. **Save it safely** (you can't see it again!)

---

## Step 3: Create Cloudflare Worker (10 minutes)

### A. Login to Cloudflare:
1. **Go to:** https://dash.cloudflare.com
2. **Login** to your account

### B. Create New Worker:
1. **Click** "Workers & Pages" in sidebar
2. **Click** "Create application"
3. **Choose** "Create Worker"
4. **Name it:** `agaminews-bot` (or any name you like)
5. **Click** "Deploy"

### C. Add the Bot Code:
1. **Click** "Edit code" (or "Quick edit")
2. **Delete** all the default code
3. **Copy** the entire code below
4. **Paste** it in the editor
5. **Click** "Save and deploy"

---

## Step 4: Set Environment Variables (3 minutes)

### In Cloudflare Worker:
1. **Go to:** Settings → Variables
2. **Click** "Add variable" for each:

| Variable Name | Value |
|--------------|-------|
| TELEGRAM_BOT_TOKEN | Your bot token from Step 1 |
| OPENAI_API_KEY | Your OpenAI key from Step 2 |
| TELEGRAM_CHAT_ID | We'll get this in Step 6 |

3. **Click** "Save and deploy"

---

## Step 5: Connect Telegram to Worker (2 minutes)

### Get Your Worker URL:
1. In your Worker overview, find the URL (like: `agaminews-bot.your-account.workers.dev`)
2. Copy this URL

### Set the Webhook:
Open this URL in your browser (replace the placeholders):
```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR-WORKER-URL.workers.dev/webhook
```

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

---

## Step 6: Get Your Chat ID (1 minute)

1. **Open Telegram** and search for your new bot
2. **Send** any message to it (like "Hello")
3. **Open this URL** in browser (replace YOUR_BOT_TOKEN):
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```
4. **Look for** `"chat":{"id":` followed by numbers
5. **Copy that number** (your Chat ID)
6. **Go back** to Cloudflare Worker Settings → Variables
7. **Update** TELEGRAM_CHAT_ID with this number
8. **Save and deploy**

---

## Step 7: Optional - Create KV Storage (2 minutes)

For budget tracking:
1. In Cloudflare Dashboard → Workers & Pages → KV
2. Click "Create namespace"
3. Name: `agaminews-budget`
4. Go to your Worker → Settings → Bindings
5. Add KV Namespace binding:
   - Variable name: `BUDGET`
   - KV namespace: Select `agaminews-budget`
6. Save

---

## ✅ Test Your Bot!

1. **Open Telegram**
2. **Find your bot**
3. **Send:** `/start`

You should see:
```
🤖 Welcome to AgamiNews AI Manager!

I'm your professional website manager for agaminews.in.

My Focus Areas:
• 🪙 Crypto & Blockchain News
• 🤖 AI & Machine Learning
• 💻 Latest Technology
• 🚗 Electric Vehicles
• 📱 Gadget Reviews
```

---

## 🎯 Quick Checklist

- [ ] Created Telegram bot via @BotFather
- [ ] Saved bot token
- [ ] Got OpenAI API key
- [ ] Created Cloudflare Worker
- [ ] Added bot code to Worker
- [ ] Set environment variables
- [ ] Connected webhook
- [ ] Got and set Chat ID
- [ ] Tested with /start

---

## 📱 Daily Usage

### Morning Routine:
1. Bot sends you `/news` with 10-15 stories
2. You tap buttons to approve/reject
3. Bot generates full articles
4. Publish on agaminews.in

### Commands:
- `/news` - Get today's top stories
- `/status` - Check website health
- `/budget` - Monitor API costs
- `/seo` - Get improvement tips
- `/help` - See all features

### Natural Language:
Just type normally:
- "Show me crypto news"
- "Write article about Bitcoin"
- "Check website speed"
- "Find trending topics"

---

## 🔧 Troubleshooting

### Bot not responding?

1. **Check webhook:**
```
https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo
```
Should show your Worker URL

2. **Check Worker logs:**
Cloudflare Dashboard → Worker → Logs

3. **Verify variables:**
All 3 must be set correctly

4. **Test Worker:**
Visit: `https://your-worker.workers.dev/health`
Should return: `{"status":"healthy"}`

---

## 💰 Budget Info

- **Daily limit:** $0.30
- **Monthly limit:** $10.00
- **Cost per summary:** ~$0.001
- **Cost per article:** ~$0.01

Bot automatically stops at 90% daily budget.

---

## 🎉 Success!

Your bot is now:
- Managing agaminews.in content
- Monitoring news sources
- Generating SEO articles
- Tracking costs
- Growing your website!

Need help? Check Worker logs or test each step again.