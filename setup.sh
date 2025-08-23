#!/bin/bash

echo "🚀 Setting up Tech News Bot (Enhanced for 10-15 posts/day)..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install worker dependencies
echo "📦 Installing worker dependencies..."
cd worker
npm install
cd ..

# Install site dependencies
echo "📦 Installing site dependencies..."
cd site
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your actual values"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p site/src/content/blog
mkdir -p site/public

# Set up git hooks (optional)
if [ -d .git ]; then
    echo "🔧 Setting up git hooks..."
    echo "#!/bin/sh" > .git/hooks/pre-commit
    echo "npm run type-check" >> .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 System Optimized for:"
echo "   • 10-15 posts per day"
echo "   • Cost-effective AI processing (~$5/month)"
echo "   • Smart batching and parallel processing"
echo "   • Automatic monetization with AdSense"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your API keys and configuration"
echo "2. Update worker/wrangler.toml with your Cloudflare KV namespace ID"
echo "3. Update site/astro.config.mjs with your domain"
echo "4. Update site/src/layouts/Layout.astro with your AdSense publisher ID"
echo "5. Follow the deployment guide in DEPLOYMENT.md"
echo ""
echo "🚀 To start development:"
echo "  npm run dev"
echo ""
echo "💰 Estimated monthly cost: $5-15 (OpenAI + domain)"
echo "📚 For detailed instructions, see DEPLOYMENT.md"