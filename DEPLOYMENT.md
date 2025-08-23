# Deployment Guide

This guide will walk you through deploying the Tech News Bot system end-to-end.

## Prerequisites

- Cloudflare account
- GitHub account
- OpenAI API key
- Telegram Bot Token
- Domain name (optional but recommended)

## Step 1: Setup Cloudflare

### 1.1 Create KV Namespace
1. Go to Cloudflare Dashboard → Workers & Pages
2. Navigate to KV tab
3. Create a new namespace called `NEWS_KV`
4. Note the namespace ID for later

### 1.2 Create Worker
1. In Workers & Pages, create a new Worker
2. Name it `tech-news-bot`
3. Update the `wrangler.toml` with your namespace ID

## Step 2: Setup GitHub Repository

### 2.1 Create Repository
1. Create a new GitHub repository
2. Clone it to your local machine
3. Copy all project files to the repository
4. Push to GitHub

### 2.2 Create Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` permissions
3. Save the token securely

## Step 3: Setup Telegram Bot

### 3.1 Create Bot
1. Message @BotFather on Telegram
2. Send `/newbot` and follow instructions
3. Save the bot token

### 3.2 Get Chat ID
1. Start a conversation with your bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your chat ID in the response

## Step 4: Configure Environment Variables

### 4.1 Set Wrangler Secrets
```bash
cd worker
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put OPENAI_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
```

### 4.2 Update Configuration Files
1. Update `worker/wrangler.toml` with your KV namespace ID
2. Update `site/astro.config.mjs` with your domain
3. Update `site/src/layouts/Layout.astro` with your AdSense publisher ID

## Step 5: Deploy Worker

```bash
cd worker
npm install
wrangler deploy
```

## Step 6: Setup Webhook

After deployment, set up the Telegram webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tech-news-bot.<YOUR_SUBDOMAIN>.workers.dev/webhook"}'
```

## Step 7: Deploy Astro Site

### 7.1 Deploy to Cloudflare Pages
1. Go to Cloudflare Dashboard → Workers & Pages
2. Create a new Pages project
3. Connect your GitHub repository
4. Set build settings:
   - Build command: `cd site && npm run build`
   - Build output directory: `site/dist`
   - Root directory: `site`

### 7.2 Configure Environment Variables
In Pages settings, add:
- `NODE_VERSION`: `18`

## Step 8: Test the System

### 8.1 Test Cron Job
1. Wait for the next cron trigger (every 2 hours)
2. Check Telegram for news briefs
3. Approve some articles to test the full pipeline

### 8.2 Test Manual Trigger
You can manually trigger the cron job for testing:
```bash
curl -X POST "https://tech-news-bot.<YOUR_SUBDOMAIN>.workers.dev/cron"
```

## Step 9: Setup AdSense (Optional)

1. Apply for Google AdSense
2. Replace `YOUR_PUBLISHER_ID` in `Layout.astro`
3. Wait for approval and ads to appear

## Step 10: Monitor and Optimize

### 10.1 Monitor Logs
- Check Cloudflare Worker logs in the dashboard
- Monitor OpenAI API usage and costs
- Track site analytics

### 10.2 Optimize Performance
- Monitor RSS feed response times
- Optimize OpenAI prompts for cost efficiency
- Adjust batch sizes based on usage

## Troubleshooting

### Common Issues

1. **Worker deployment fails**
   - Check all secrets are set correctly
   - Verify KV namespace ID is correct

2. **Telegram webhook not working**
   - Ensure webhook URL is accessible
   - Check bot token is correct

3. **GitHub commits failing**
   - Verify GitHub token has repo permissions
   - Check repository name format

4. **Site not building**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility

### Support

For issues specific to this project, check the logs and ensure all environment variables are correctly configured.