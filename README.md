# Tech News Bot

A production-ready system that curates tech/EV/crypto/gadgets news via Telegram and generates a static Astro site. **Optimized for 10-15 posts per day with cost-effective AI processing.**

## Features

- 🤖 **Telegram Bot** - Interactive news curation with batch approval
- 📰 **RSS Ingestion** - 8 feeds with smart deduplication and filtering
- ✍️ **AI-Powered Content** - GPT-4o-mini optimized for cost efficiency
- 🚀 **Static Site Generation** - Astro with SEO and schema markup
- 💰 **Automatic Monetization** - AdSense integration for all posts
- ⚡ **Cloudflare Infrastructure** - Workers + KV for scalability
- 🔄 **Smart Batching** - 5-10 items per run, every 2 hours
- 📊 **Statistics Tracking** - Monitor performance and costs
- 🛡️ **Content Filtering** - Spam detection and quality control

## Architecture

```
Telegram Bot ←→ Cloudflare Worker ←→ OpenAI API
                    ↓
              Cloudflare KV (state)
                    ↓
              GitHub Repo (content)
                    ↓
              Astro Site → Cloudflare Pages
```

## Quick Start

1. **Setup Environment**
   ```bash
   npm run setup
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Fill in your API keys and settings
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

## Environment Variables

Create a `.env` file with:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# OpenAI
OPENAI_API_KEY=your_openai_key

# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_REPO=username/repo-name

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_KV_NAMESPACE_ID=your_kv_namespace_id
```

## Cost Optimization

- **AI Model**: gpt-4o-mini with gpt-3.5-turbo fallback
- **Batching**: 5-10 items per cron run, every 2 hours
- **Parallel Processing**: 3 articles at a time for efficiency
- **Estimated Cost**: ~$5/month for 10-15 posts/day
- **Infrastructure**: Cloudflare free tier (100k requests/day)

## Performance Features

- **Smart Deduplication**: Prevents duplicate content
- **Content Filtering**: Removes spam and low-quality content
- **Rate Limiting**: Optimized API calls to prevent throttling
- **Statistics Tracking**: Monitor batches, briefs, and published articles
- **Error Handling**: Graceful fallbacks and retry mechanisms

## Development

```bash
# Run both worker and site in development
npm run dev

# Deploy to production
npm run deploy
```

## License

MIT