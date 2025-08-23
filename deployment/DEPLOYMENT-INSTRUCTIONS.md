# 🚀 Deployment Instructions

## Your site is ready for deployment!

### 📁 What's in this folder:
- `site/dist/` - Your built Astro website
- `worker/` - Your Cloudflare Worker for news generation

## 🌐 Deploy Your Site (Choose ONE option):

### Option 1: Cloudflare Pages (Recommended)
1. Go to: https://dash.cloudflare.com
2. Click "Pages" in sidebar
3. Click "Create a project"
4. Choose "Connect to Git"
5. Select your repository
6. Set build settings:
   - Framework: Astro
   - Build command: `npm run build`
   - Build output: `site/dist`
   - Root directory: `site`
7. Click "Save and Deploy"

### Option 2: Netlify (Easiest)
1. Go to: https://netlify.com
2. Drag and drop the `site/dist` folder
3. Your site will be live in 2 minutes!

### Option 3: Vercel
1. Go to: https://vercel.com
2. Import your GitHub repository
3. Set root directory to `site`
4. Deploy

## 🤖 Deploy Your Worker (After site is live):

### Step 1: Get API Keys Ready
You'll need these API keys (get them now):

1. **OpenAI API Key**
   - Go to: https://platform.openai.com/api-keys
   - Create a new API key
   - Cost: $5-15/month

2. **Telegram Bot Token**
   - Message @BotFather on Telegram
   - Create a new bot
   - Get the token

3. **Telegram Chat ID**
   - Message @userinfobot on Telegram
   - Get your chat ID

4. **GitHub Token**
   - Go to: GitHub Settings > Developer settings > Personal access tokens
   - Create token with repo access

5. **GitHub Repository**
   - Format: `username/repository-name`
   - This is where news content will be stored

### Step 2: Deploy Worker
1. Go to: https://dash.cloudflare.com
2. Click "Workers & Pages"
3. Click "Create application"
4. Choose "Create Worker"
5. Name it: `agaminews-bot`
6. Deploy the worker code

### Step 3: Set Secrets
In your Cloudflare Worker dashboard:
1. Go to Settings > Variables
2. Add these secrets:
   - `OPENAI_API_KEY` = your OpenAI key
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `TELEGRAM_CHAT_ID` = your chat ID
   - `GITHUB_TOKEN` = your GitHub token
   - `GITHUB_REPO` = your repository name

## 💰 Expected Costs:
- **Site Hosting**: FREE (Cloudflare Pages/Netlify/Vercel)
- **Worker Hosting**: $5/month (your Cloudflare subscription)
- **OpenAI API**: $5-15/month (for content generation)
- **Total**: $10-20/month

## 📈 Expected Output:
- 10-15 news articles per day
- Automated posting to Telegram
- Beautiful website with latest tech news
- SEO optimized content

## 🆘 Need Help?
- Check the logs in your Cloudflare Worker dashboard
- Monitor OpenAI API usage at: https://platform.openai.com/usage
- Test your Telegram bot by sending /start

