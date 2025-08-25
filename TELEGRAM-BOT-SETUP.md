# 🤖 AI Website Manager - Telegram Bot Setup Guide

## Overview
Your AI Website Manager is a powerful Telegram bot that manages your website through natural language commands. I'm your external engineer who will handle all technical changes through GitHub and Cloudflare while you communicate with your bot through Telegram.

## 🚀 Quick Setup (5 Minutes)

### Option 1: Automated Setup (Recommended)
```bash
# Run the setup script
./setup-telegram-bot.sh
```
This script will guide you through the entire process step by step.

### Option 2: Manual Setup

#### Step 1: Create Your Telegram Bot
1. Open Telegram and search for **@BotFather**
2. Send `/newbot` to create a new bot
3. Choose a name (e.g., "My AI Website Manager")
4. Choose a username (must end with 'bot', e.g., "mywebsite_manager_bot")
5. **Save the bot token** you receive (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Step 2: Get Your Chat ID
1. Open Telegram and search for **@userinfobot**
2. Start the bot and it will show your ID
3. **Save your chat ID** (looks like: `123456789`)

#### Step 3: Get API Keys

**OpenAI API Key** (Required):
- Go to https://platform.openai.com/api-keys
- Create new secret key
- Save the key (starts with `sk-`)

**GitHub Token** (Optional - for content backup):
- Go to GitHub Settings > Developer settings > Personal access tokens
- Generate new token with 'repo' scope
- Save the token (starts with `ghp_`)

#### Step 4: Deploy to Cloudflare
```bash
# Navigate to worker directory
cd worker

# Login to Cloudflare
wrangler login

# Deploy the worker
wrangler deploy

# Set your secrets
wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your bot token when prompted

wrangler secret put TELEGRAM_CHAT_ID
# Paste your chat ID when prompted

wrangler secret put OPENAI_API_KEY
# Paste your OpenAI key when prompted

# Optional: GitHub integration
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
```

#### Step 5: Set Up Webhook
```bash
# Get your worker URL (shown after deploy)
# It looks like: https://ai-website-manager.YOUR-SUBDOMAIN.workers.dev

# Set the webhook (replace with your values)
curl -X POST "https://api.telegram.org/bot YOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://YOUR-WORKER-URL/telegram"}'
```

## 💬 How to Talk to Your Bot

### Command Mode
Send these commands in Telegram:
- `/start` - Show main menu with buttons
- `/help` - Get help and available commands
- `/news` - Fetch latest news from all sources
- `/performance` - View website analytics
- `/suggestions` - Get AI-powered improvements
- `/budget` - Check API usage and costs
- `/schedule` - View content posting schedule

### Natural Language Mode
Just talk to your bot naturally:
- "Show me today's news"
- "How is my website performing?"
- "Create an article about electric vehicles"
- "What content is working well?"
- "Remove underperforming articles"
- "Change the website theme to dark mode"
- "Update the homepage layout"

## 📊 Bot Features

### 1. Content Management
- **Automatic News Fetching**: Pulls from 10+ free sources
- **AI Summarization**: Creates engaging summaries
- **Article Generation**: Full articles with SEO optimization
- **Image Sourcing**: Automatic images from Unsplash/Pexels
- **Approval Workflow**: Review before publishing

### 2. Performance Analytics
- Real-time visitor tracking
- Article engagement metrics
- Category performance analysis
- SEO score monitoring
- Conversion tracking

### 3. AI Suggestions
- Content recommendations based on performance
- Layout optimization suggestions
- SEO improvements
- Monetization opportunities
- User experience enhancements

### 4. Budget Management
- Daily spending limits ($0.33/day default)
- API usage tracking
- Cost breakdowns by feature
- Usage alerts and warnings

## 🛠️ Testing Your Bot

### Method 1: Use the Test Page
1. Open `test-telegram-bot.html` in your browser
2. Enter your bot token and chat ID
3. Click "Test Connection" to verify setup
4. Click "Send Test Message" to test messaging

### Method 2: Direct Testing
1. Open Telegram
2. Find your bot (@your_bot_username)
3. Send `/start`
4. You should see the welcome menu

## 🔧 Troubleshooting

### Bot Not Responding?
1. Check webhook status:
```bash
curl https://api.telegram.org/bot YOUR_BOT_TOKEN/getWebhookInfo
```

2. Check worker logs:
```bash
wrangler tail
```

3. Verify secrets are set:
```bash
wrangler secret list
```

### Common Issues

**"Unauthorized" Error**:
- Your chat ID doesn't match the configured one
- Update TELEGRAM_CHAT_ID secret

**No Response from Bot**:
- Webhook not set correctly
- Re-run the webhook setup command

**API Errors**:
- Check OpenAI API key is valid
- Verify you have credits in your OpenAI account

## 📈 Daily Workflow

### Morning Routine
1. Bot fetches news automatically (every 2 hours)
2. Sends you breaking news alerts
3. You review and approve articles
4. Bot publishes to website

### Throughout the Day
- Ask for performance updates
- Request content suggestions
- Approve or reject changes
- Monitor visitor engagement

### Evening Review
- Check daily performance
- Review budget usage
- Plan tomorrow's content
- Adjust strategies

## 🎯 Advanced Features

### Custom Commands
You can add custom commands by editing `telegram-commands.js`

### Scheduling
Set specific posting times in the bot configuration

### Multi-Language Support
Bot can generate content in multiple languages

### A/B Testing
Test different headlines and content styles

## 💡 Tips for Success

1. **Be Specific**: The more detailed your requests, the better the results
2. **Review Regularly**: Check performance daily for best results
3. **Experiment**: Try different content types and see what works
4. **Set Limits**: Use budget controls to manage costs
5. **Backup Content**: Enable GitHub integration for content backup

## 🆘 Need Help?

### As Your External Engineer, I Can:
- Add new features to your bot
- Fix any issues that arise
- Optimize performance
- Integrate new services
- Update the UI/UX
- Implement custom workflows

### How to Request Changes:
Just tell me what you need, and I'll:
1. Make the changes in the code
2. Deploy to Cloudflare
3. Update your bot automatically

### Examples:
- "Add cryptocurrency price tracking"
- "Create a newsletter feature"
- "Integrate with Twitter"
- "Add multi-user support"
- "Implement content scheduling"

## 📞 Contact & Support

Your bot is now your 24/7 website manager. Talk to it like you would a human assistant - it understands context, remembers preferences, and learns from your feedback.

**Remember**: I'm your external engineer. You talk to your bot through Telegram, and when you need technical changes, just ask me and I'll implement them through GitHub and Cloudflare.

---

**Last Updated**: December 2024
**Version**: 2.0
**Status**: Production Ready