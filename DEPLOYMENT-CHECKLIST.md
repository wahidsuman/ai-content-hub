# 🚀 Deployment Checklist - Tech News Bot

## Prerequisites Checklist

### ✅ Required Accounts
- [ ] **Cloudflare Account** (Free tier)
- [ ] **GitHub Account** (Free)
- [ ] **OpenAI Account** (Paid - requires API key)
- [ ] **Telegram Account** (Free)

### ✅ Required Tools
- [ ] **Node.js 18+** installed
- [ ] **Git** installed
- [ ] **Wrangler CLI** (will install during setup)

## Step-by-Step Deployment Guide

### 1. 🏗️ Project Setup

```bash
# Clone or download the project
git clone <your-repo-url>
cd tech-news-bot

# Run the setup script
chmod +x setup.sh
./setup.sh

# Install dependencies
npm install
cd worker && npm install
cd ../site && npm install
cd ..
```

### 2. 🔧 Cloudflare Setup

#### Create KV Namespace
```bash
# Login to Cloudflare
wrangler login

# Create KV namespace for production
wrangler kv:namespace create "NEWS_KV"

# Create KV namespace for preview/development
wrangler kv:namespace create "NEWS_KV" --preview
```

#### Update Configuration
Edit `worker/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "NEWS_KV"
id = "your-actual-kv-namespace-id"        # Replace with actual ID
preview_id = "your-actual-preview-kv-id"  # Replace with actual preview ID
```

### 3. 🤖 Telegram Bot Setup

#### Create Bot
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose a name (e.g., "Tech News Bot")
4. Choose a username (e.g., "your_tech_news_bot")
5. **Save the bot token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Get Chat ID
1. Start a conversation with your bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your `chat_id` in the response (it's a number like `123456789`)

### 4. 🔑 OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to "API Keys" section
4. Create a new API key
5. **Save the API key** (format: `sk-...`)
6. Add billing information (required for API usage)

### 5. 📦 GitHub Repository Setup

#### Create Repository
1. Go to GitHub and create a new repository
2. Name it something like `tech-news-bot`
3. Make it public (for free Cloudflare Pages)
4. Clone it to your local machine

#### Get GitHub Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`
4. **Save the token** (format: `ghp_...`)

### 6. 🌐 Domain Setup (Optional but Recommended)

#### Option A: Custom Domain
1. Purchase a domain (e.g., from Namecheap, GoDaddy, etc.)
2. Point it to Cloudflare (free DNS)
3. Update `site/astro.config.mjs`:
```javascript
export default defineConfig({
  site: 'https://yourdomain.com', // Replace with your domain
  // ... rest of config
});
```

#### Option B: Cloudflare Pages Domain
- Use the free `.pages.dev` domain provided by Cloudflare

### 7. 🔐 Environment Configuration

#### Set Cloudflare Secrets
```bash
# Telegram Configuration
wrangler secret put TELEGRAM_BOT_TOKEN
# Enter: your_bot_token_here

wrangler secret put TELEGRAM_CHAT_ID
# Enter: your_chat_id_here

# OpenAI Configuration
wrangler secret put OPENAI_API_KEY
# Enter: your_openai_api_key_here

# GitHub Configuration
wrangler secret put GITHUB_TOKEN
# Enter: your_github_token_here

wrangler secret put GITHUB_REPO
# Enter: username/repository-name
```

#### Update Site Configuration
Edit `site/astro.config.mjs`:
```javascript
export default defineConfig({
  site: 'https://yourdomain.com', // Replace with your domain
  // ... rest of config
});
```

### 8. 🚀 Deploy Worker

```bash
# Deploy the Cloudflare Worker
cd worker
wrangler deploy

# Set up Telegram webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tech-news-bot.<YOUR_SUBDOMAIN>.workers.dev/webhook"}'
```

### 9. 🌍 Deploy Website

#### Option A: Cloudflare Pages (Recommended)
1. Go to Cloudflare Dashboard → Pages
2. Create new project
3. Connect your GitHub repository
4. Configure build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build:site`
   - **Build output directory**: `site/dist`
   - **Root directory**: `site`
5. Deploy

#### Option B: GitHub Pages
1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: `/ (root)`
5. Save

### 10. 💰 AdSense Setup (Optional)

1. Go to [Google AdSense](https://www.google.com/adsense/)
2. Sign up and wait for approval (1-2 weeks)
3. Get your publisher ID
4. Edit `site/src/layouts/Layout.astro`:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID" crossorigin="anonymous"></script>
```

### 11. 🧪 Test the System

#### Test Telegram Bot
```bash
# Send these commands to your bot:
/start
/status
/help
```

#### Test RSS Processing
1. Wait for the next cron run (every 2 hours)
2. Check Telegram for news briefs
3. Approve some articles to test the full pipeline

#### Test Website
1. Visit your deployed website
2. Check that articles are being published
3. Test RSS feed at `/rss.xml`
4. Test sitemap at `/sitemap.xml`

## 🔍 Troubleshooting

### Common Issues

#### Worker Not Responding
```bash
# Check worker logs
wrangler tail

# Check worker status
wrangler status
```

#### Telegram Webhook Issues
```bash
# Check webhook status
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Reset webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

#### OpenAI API Errors
- Check API key validity
- Verify billing status
- Monitor rate limits

#### GitHub Commits Failing
- Check repository permissions
- Verify GitHub token scope
- Check repository path configuration

## 📊 Monitoring

### Check Costs
- **OpenAI**: Monitor usage at [OpenAI Platform](https://platform.openai.com/usage)
- **Cloudflare**: Check usage in Cloudflare Dashboard
- **Expected**: ~$5/month for 10-15 posts/day

### Performance Monitoring
```bash
# Check worker performance
wrangler tail --format pretty

# Monitor KV usage
wrangler kv:key get --binding=NEWS_KV "current_batch"
```

## 🎯 Success Criteria

Your system is successfully deployed when:

- [ ] Telegram bot responds to commands
- [ ] RSS feeds are being processed every 2 hours
- [ ] Articles are being generated and committed to GitHub
- [ ] Website is live and displaying articles
- [ ] RSS feed and sitemap are working
- [ ] AdSense is approved and displaying ads (optional)

## 📞 Support

If you encounter issues:

1. Check the logs using `wrangler tail`
2. Review the troubleshooting section
3. Check Cloudflare and OpenAI documentation
4. Monitor the Telegram bot for error messages

## 💡 Optimization Tips

- **Cost Optimization**: Monitor OpenAI usage and adjust batch sizes
- **Performance**: Check worker execution times and optimize if needed
- **Content Quality**: Review generated articles and adjust prompts if necessary
- **SEO**: Monitor website performance and search rankings

---

**Estimated Deployment Time**: 30-60 minutes
**Estimated Monthly Cost**: $5-15
**Expected Output**: 10-15 high-quality articles per day