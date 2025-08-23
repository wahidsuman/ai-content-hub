# Tech News Bot

A production-ready system that curates tech/EV/crypto/gadgets news via Telegram and generates a static Astro site.

## Features

- 🤖 Telegram bot for news curation
- 📰 RSS ingestion and deduplication
- ✍️ AI-powered article generation
- 🚀 Static site generation with Astro
- 💰 Automatic AdSense monetization
- ⚡ Cloudflare Workers + KV for scalability
- 🔄 Cron-based batching (10-15 posts/day)

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

- Uses gpt-4o-mini for cost efficiency
- Batches 3-5 briefs per cron run
- Estimated cost: ~$5/month for 10-15 posts/day

## Development

```bash
# Run both worker and site in development
npm run dev

# Deploy to production
npm run deploy
```

## License

MIT