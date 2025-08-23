# Deployment Guide - Tech News Bot

## 🚨 Important: API Key Security

**NEVER commit API keys to GitHub!** This is why GitHub blocked your commit - it's protecting your security.

## Correct Way to Handle API Keys

### 1. For the Astro Site (Frontend)
- The frontend doesn't need API keys directly
- Use `.env.example` for documentation only
- Create `.env` locally for development (add to .gitignore)

### 2. For the Cloudflare Worker (Backend)
- API keys are stored as Cloudflare secrets
- Use `wrangler secret put` command
- Never put them in files that get committed

## Step-by-Step Deployment

### Step 1: Set up Cloudflare Authentication
```bash
# Login to Cloudflare
wrangler login
```

### Step 2: Deploy the Worker with Secrets
```bash
# Navigate to worker directory
cd worker

# Deploy the worker
wrangler deploy

# Set up secrets (you'll be prompted for each)
wrangler secret put OPENAI_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
```

### Step 3: Deploy the Astro Site
```bash
# Navigate to site directory
cd site

# Build the site
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

## Required API Keys

1. **OpenAI API Key**
   - Get from: https://platform.openai.com/api-keys
   - Used for: Generating news content

2. **Telegram Bot Token**
   - Get from: @BotFather on Telegram
   - Used for: Sending news updates

3. **Telegram Chat ID**
   - Get from: @userinfobot on Telegram
   - Used for: Target chat for news

4. **GitHub Token**
   - Get from: GitHub Settings > Developer settings > Personal access tokens
   - Used for: Storing generated content

5. **GitHub Repository**
   - Format: `username/repository-name`
   - Used for: Content storage location

## Expected Costs
- **OpenAI API**: $5-15/month (depending on usage)
- **Cloudflare Workers**: Free tier (100,000 requests/day)
- **Cloudflare Pages**: Free tier

## Expected Output
- 10-15 news articles per day
- Automated posting to Telegram
- Content stored in GitHub repository

## Troubleshooting

### If GitHub blocks commits:
- Check `.gitignore` includes `.env` files
- Never commit files with actual API keys
- Use `.env.example` for documentation only

### If Wrangler login fails:
- Try running `wrangler login` in a terminal with browser access
- Or use API tokens: https://dash.cloudflare.com/profile/api-tokens

### If deployment fails:
- Check all secrets are set: `wrangler secret list`
- Verify Cloudflare account has proper permissions
- Check worker logs: `wrangler tail`