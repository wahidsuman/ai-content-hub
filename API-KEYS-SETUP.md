# 🔑 API Keys Setup Guide

## Required API Keys (Get these NOW):

### 1. OpenAI API Key
**Where to get it:**
- Go to: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy the key (starts with `sk-`)

**Cost:** $5-15/month depending on usage

### 2. Telegram Bot Token
**Where to get it:**
1. Open Telegram
2. Message @BotFather
3. Send: `/newbot`
4. Follow instructions to create bot
5. Copy the token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

**Cost:** FREE

### 3. Telegram Chat ID
**Where to get it:**
1. Open Telegram
2. Message @userinfobot
3. Send any message
4. Copy your chat ID (a number like: `123456789`)

**Cost:** FREE

### 4. GitHub Token
**Where to get it:**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "Tech News Bot"
4. Select scopes: `repo` (full control of private repositories)
5. Copy the token

**Cost:** FREE

### 5. GitHub Repository
**Format:** `username/repository-name`
**Example:** `johndoe/tech-news-content`

**Cost:** FREE

## 🚨 IMPORTANT: Never commit these keys to GitHub!
- They will be stored as Cloudflare secrets
- Never put them in .env files that get committed
- Use .env.example for documentation only

## 📝 Where to put the keys:
After deploying your worker, add them as secrets in:
1. Cloudflare Dashboard > Workers & Pages > Your Worker > Settings > Variables
2. Add each key as a secret variable

