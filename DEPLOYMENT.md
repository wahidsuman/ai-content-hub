# Tech News Bot - Deployment Guide

This guide will help you deploy the enhanced tech news bot system that supports 10-15 posts per day with optimized batching and cost management.

## Prerequisites

1. **Cloudflare Account** - For Workers and KV storage
2. **GitHub Account** - For repository hosting
3. **Telegram Bot Token** - Create via @BotFather
4. **OpenAI API Key** - For content generation
5. **Domain Name** (optional) - For the static site

## Step 1: Setup Cloudflare

### Create KV Namespace
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "NEWS_KV"
wrangler kv:namespace create "NEWS_KV" --preview
```

### Update wrangler.toml
Replace the KV namespace IDs in `worker/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "NEWS_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

## Step 2: Setup Telegram Bot

1. Message @BotFather on Telegram
2. Create a new bot: `/newbot`
3. Get your bot token
4. Start a chat with your bot
5. Get your chat ID by messaging @userinfobot

## Step 3: Setup OpenAI

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Note: The system uses gpt-4o-mini for cost optimization (~$5/month for 10-15 posts/day)

## Step 4: Setup GitHub Repository

1. Create a new GitHub repository
2. Enable GitHub Pages or connect to Cloudflare Pages
3. Get a GitHub Personal Access Token with repo permissions

## Step 5: Configure Environment Variables

Set the following secrets in Cloudflare:

```bash
# Telegram Configuration
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID

# OpenAI Configuration
wrangler secret put OPENAI_API_KEY

# GitHub Configuration
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
```

## Step 6: Deploy the Worker

```bash
# Deploy the worker
cd worker
wrangler deploy

# Set up the webhook for Telegram
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-worker.your-subdomain.workers.dev/webhook"}'
```

## Step 7: Deploy the Astro Site

### Option A: Cloudflare Pages (Recommended)
1. Connect your GitHub repository to Cloudflare Pages
2. Set build settings:
   - Build command: `npm run build:site`
   - Build output directory: `site/dist`
   - Root directory: `site`

### Option B: GitHub Pages
1. Enable GitHub Pages in your repository settings
2. Set source to GitHub Actions
3. The site will build automatically on pushes

## Step 8: Configure AdSense

1. Sign up for Google AdSense
2. Replace `YOUR_PUBLISHER_ID` in `site/src/layouts/Layout.astro`
3. Wait for AdSense approval (can take 1-2 weeks)

## Step 9: Test the System

1. **Test Telegram Bot**:
   - Send `/start` to your bot
   - Send `/status` to check bot status
   - Send `/help` for available commands

2. **Test RSS Processing**:
   - Wait for the next cron run (every 2 hours)
   - Check Telegram for news briefs
   - Approve some articles to test the full pipeline

3. **Test Site Generation**:
   - Check your GitHub repository for new commits
   - Verify the Astro site updates with new content
   - Test RSS feed at `/rss.xml`

## Monitoring and Maintenance

### Check Worker Logs
```bash
wrangler tail
```

### Monitor Costs
- OpenAI: ~$5/month for 10-15 posts/day
- Cloudflare Workers: Free tier (100,000 requests/day)
- Cloudflare KV: Free tier (100,000 reads/day, 1,000 writes/day)

### Performance Optimization

The system is optimized for 10-15 posts per day:

- **Batching**: Processes 5-10 items per cron run
- **Parallel Processing**: Generates articles in batches of 3
- **Rate Limiting**: Optimized delays between API calls
- **Cost Management**: Uses gpt-4o-mini with fallback to gpt-3.5-turbo

### Scaling Considerations

For higher volume (20+ posts/day):

1. Increase cron frequency to hourly
2. Increase batch sizes in the code
3. Consider upgrading to paid Cloudflare plans
4. Monitor OpenAI usage and adjust models

## Troubleshooting

### Common Issues

1. **Worker not responding**:
   - Check wrangler logs
   - Verify environment variables
   - Check KV namespace configuration

2. **Telegram webhook failing**:
   - Verify webhook URL is correct
   - Check bot token permissions
   - Ensure HTTPS is enabled

3. **OpenAI API errors**:
   - Check API key validity
   - Monitor rate limits
   - Verify billing status

4. **GitHub commits failing**:
   - Check repository permissions
   - Verify GitHub token scope
   - Check repository path configuration

### Debug Commands

```bash
# Check worker status
wrangler status

# View recent logs
wrangler tail --format pretty

# Test worker locally
wrangler dev

# Check KV data
wrangler kv:key get --binding=NEWS_KV "current_batch"
```

## Security Considerations

1. **API Keys**: Never commit secrets to version control
2. **Webhook Security**: Consider adding webhook verification
3. **Rate Limiting**: Monitor API usage to prevent abuse
4. **Content Filtering**: The system includes basic spam filtering

## Cost Breakdown

- **OpenAI API**: ~$5/month (10-15 posts/day)
- **Cloudflare Workers**: Free tier
- **Cloudflare KV**: Free tier
- **Domain**: ~$10-15/year
- **Total**: ~$5-15/month

## Support

For issues or questions:
1. Check the logs using `wrangler tail`
2. Review the troubleshooting section
3. Check Cloudflare and OpenAI documentation
4. Monitor the Telegram bot for error messages

The system is designed to be self-maintaining and cost-effective for producing 10-15 high-quality tech news articles per day.