#!/bin/bash

echo "🚀 Complete Tech News Bot Deployment"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Build the site
print_status "Step 1: Building the Astro site..."
cd site
npm run build

if [ $? -eq 0 ]; then
    print_success "Site built successfully!"
else
    print_error "Site build failed!"
    exit 1
fi

cd ..

# Step 2: Create deployment package
print_status "Step 2: Creating deployment package..."
mkdir -p deployment
cp -r site/dist/* deployment/
cp -r worker/* deployment/worker/

# Step 3: Create deployment instructions
cat > deployment/DEPLOYMENT-INSTRUCTIONS.md << 'EOF'
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

EOF

print_success "✅ Deployment package created!"
print_success "📁 Check the deployment/ folder for everything you need"

# Step 4: Create API key setup guide
cat > API-KEYS-SETUP.md << 'EOF'
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

EOF

print_success "✅ API key setup guide created!"

# Step 5: Create quick start script
cat > quick-deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Quick Deploy Script"
echo "====================="

echo "1. Your site is built and ready in: site/dist/"
echo "2. Your worker code is ready in: worker/"
echo ""
echo "Next steps:"
echo "1. Deploy site to Cloudflare Pages/Netlify/Vercel"
echo "2. Get your API keys (see API-KEYS-SETUP.md)"
echo "3. Deploy worker and add secrets"
echo ""
echo "📚 See DEPLOYMENT-INSTRUCTIONS.md for detailed steps"
echo "🔑 See API-KEYS-SETUP.md for API key setup"
EOF

chmod +x quick-deploy.sh

print_success "✅ Quick deploy script created!"

# Final summary
echo ""
echo "🎉 DEPLOYMENT READY!"
echo "==================="
print_success "✅ Site built successfully"
print_success "✅ Worker code prepared"
print_success "✅ Deployment instructions created"
print_success "✅ API key setup guide created"
echo ""
echo "📁 Files created:"
echo "   - deployment/ (your built site + worker)"
echo "   - DEPLOYMENT-INSTRUCTIONS.md (step-by-step guide)"
echo "   - API-KEYS-SETUP.md (API key instructions)"
echo "   - quick-deploy.sh (quick reference)"
echo ""
echo "🚀 Next steps:"
echo "   1. Get your API keys (see API-KEYS-SETUP.md)"
echo "   2. Deploy your site (see DEPLOYMENT-INSTRUCTIONS.md)"
echo "   3. Deploy your worker and add secrets"
echo ""
echo "💰 Total cost will be: $10-20/month"
echo "📈 Expected output: 10-15 news articles per day"