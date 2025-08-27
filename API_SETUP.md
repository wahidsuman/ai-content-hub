# 🔑 API Keys Setup for AgamiNews

## Required Environment Variables

Add these to your Cloudflare Worker settings:

### 1. **TELEGRAM_BOT_TOKEN** (Already Set ✅)
- Your existing token

### 2. **UNSPLASH_ACCESS_KEY** (For Free Images)
- Go to: https://unsplash.com/developers
- Click "New Application"
- Accept terms
- Get your **Access Key**
- Add to Cloudflare: `UNSPLASH_ACCESS_KEY = "your-key-here"`

### 3. **PEXELS_API_KEY** (For Free Images)
- Go to: https://www.pexels.com/api/
- Click "Get Started"
- Sign up (free)
- Get your API key
- Add to Cloudflare: `PEXELS_API_KEY = "your-key-here"`

### 4. **OPENAI_API_KEY** (Optional - For AI Summaries)
- Only if you want AI-enhanced summaries
- Go to: https://platform.openai.com/api-keys
- Create new key
- Add to Cloudflare: `OPENAI_API_KEY = "sk-..."`

## How to Add Variables in Cloudflare

1. Go to Cloudflare Dashboard
2. Select your Worker (agaminews)
3. Go to **Settings** → **Variables**
4. Click **Add Variable**
5. Add each key with its value
6. Click **Save and Deploy**

## Monthly Cost Breakdown

With all features enabled:
- **RSS Feeds**: FREE
- **Unsplash Images**: FREE
- **Pexels Images**: FREE
- **OpenAI (optional)**: ~$1.50/month
- **Total**: Under $2/month

## Test Your Setup

After adding keys, visit:
- `https://agaminews.in/debug` - Check configuration
- `https://agaminews.in/fetch-news` - Manually trigger news fetch

## Automatic Updates

News will automatically update every 3 hours!