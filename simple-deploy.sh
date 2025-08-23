#!/bin/bash

echo "🚀 Simple Site Deployment"
echo "========================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Build the site
print_status "Building the site..."
cd site
npm run build

if [ $? -eq 0 ]; then
    print_success "Site built successfully!"
else
    echo "❌ Build failed"
    exit 1
fi

cd ..

print_success "✅ Your site is ready for deployment!"
echo ""
echo "📁 Built files are in: site/dist/"
echo ""
echo "🌐 To deploy your site, you have several options:"
echo ""
echo "1. Cloudflare Pages (Recommended):"
echo "   - Go to https://dash.cloudflare.com"
echo "   - Create a new Pages project"
echo "   - Connect your GitHub repository"
echo "   - Set build command: npm run build"
echo "   - Set build output: site/dist"
echo ""
echo "2. Netlify:"
echo "   - Go to https://netlify.com"
echo "   - Drag and drop the site/dist folder"
echo "   - Or connect your GitHub repository"
echo ""
echo "3. Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Import your GitHub repository"
echo "   - Set root directory to 'site'"
echo ""
echo "🔧 For the worker (news generation), you'll need to:"
echo "   - Set up Cloudflare Workers separately"
echo "   - Configure API keys as secrets"
echo "   - See DEPLOYMENT-GUIDE.md for details"
echo ""
echo "💡 Your site is a beautiful tech news aggregator with:"
echo "   - Modern responsive design"
echo "   - Blog functionality"
echo "   - Category filtering"
echo "   - SEO optimization"