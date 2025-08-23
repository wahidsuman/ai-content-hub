#!/bin/bash

echo "🧪 Testing Tech News Bot System (Enhanced for 10-15 posts/day)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to check if file exists
check_file() {
    local file_path="$1"
    local description="$2"
    
    echo -n "Checking $description... "
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ MISSING${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to check if directory exists
check_directory() {
    local dir_path="$1"
    local description="$2"
    
    echo -n "Checking $description... "
    
    if [ -d "$dir_path" ]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ MISSING${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "📁 Checking project structure..."

# Check project structure
check_directory "worker" "Worker directory"
check_directory "site" "Site directory"
check_directory "worker/src" "Worker source directory"
check_directory "site/src" "Site source directory"
check_directory "site/src/content/blog" "Blog content directory"

echo ""
echo "📄 Checking configuration files..."

# Check configuration files
check_file "package.json" "Root package.json"
check_file "worker/package.json" "Worker package.json"
check_file "site/package.json" "Site package.json"
check_file "worker/wrangler.toml" "Wrangler configuration"
check_file "worker/tsconfig.json" "Worker TypeScript config"
check_file "site/astro.config.mjs" "Astro configuration"
check_file "site/tailwind.config.mjs" "Tailwind configuration"
check_file ".env.example" "Environment template"

echo ""
echo "🔧 Checking source files..."

# Check worker source files
check_file "worker/src/index.ts" "Worker main file"
check_file "worker/src/rss.ts" "RSS processing"
check_file "worker/src/openai.ts" "OpenAI integration"
check_file "worker/src/telegram.ts" "Telegram integration"
check_file "worker/src/github.ts" "GitHub integration"
check_file "worker/src/types.ts" "TypeScript types"

# Check site source files
check_file "site/src/pages/index.astro" "Homepage"
check_file "site/src/pages/rss.xml.js" "RSS feed"
check_file "site/src/pages/sitemap.xml.js" "Sitemap"
check_file "site/src/layouts/Layout.astro" "Site layout"

echo ""
echo "📚 Checking documentation..."

# Check documentation
check_file "README.md" "README file"
check_file "DEPLOYMENT.md" "Deployment guide"
check_file "setup.sh" "Setup script"

echo ""
echo "🧪 Running dependency checks..."

# Check if dependencies are installed
run_test "Root dependencies" "npm list --depth=0"
run_test "Worker dependencies" "cd worker && npm list --depth=0"
run_test "Site dependencies" "cd site && npm list --depth=0"

echo ""
echo "🔍 Checking for required tools..."

# Check for required tools
run_test "Node.js" "node --version"
run_test "npm" "npm --version"
run_test "Wrangler CLI" "wrangler --version"

echo ""
echo "📦 Testing build processes..."

# Test build processes
run_test "Worker TypeScript compilation" "cd worker && npx tsc --noEmit"
run_test "Site build process" "cd site && npm run build"

echo ""
echo "🔗 Checking environment configuration..."

# Check if .env file exists and has required variables
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    ((TESTS_PASSED++))
    
    # Check for required environment variables
    required_vars=("TELEGRAM_BOT_TOKEN" "TELEGRAM_CHAT_ID" "OPENAI_API_KEY" "GITHUB_TOKEN" "GITHUB_REPO")
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env; then
            echo -e "  ${GREEN}✅ $var configured${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "  ${YELLOW}⚠️  $var not configured${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  .env file not found (create from .env.example)${NC}"
fi

echo ""
echo "🎯 Checking optimization features..."

# Check for optimization features in code
echo -n "Checking batch processing optimization... "
if grep -q "batchSize = 5" worker/src/openai.ts; then
    echo -e "${GREEN}✅ CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ((TESTS_FAILED++))
fi

echo -n "Checking cost optimization (gpt-4o-mini)... "
if grep -q "gpt-4o-mini" worker/src/openai.ts; then
    echo -e "${GREEN}✅ CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ((TESTS_FAILED++))
fi

echo -n "Checking AdSense integration... "
if grep -q "AdSense" site/src/layouts/Layout.astro; then
    echo -e "${GREEN}✅ CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ((TESTS_FAILED++))
fi

echo -n "Checking RSS feed limit (50 posts)... "
if grep -q "slice(0, 50)" site/src/pages/rss.xml.js; then
    echo -e "${GREEN}✅ CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "📊 Test Results Summary"
echo "========================"
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your system is ready for deployment.${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Configure your environment variables in .env"
    echo "2. Follow the deployment guide in DEPLOYMENT.md"
    echo "3. Deploy to Cloudflare Workers and Pages"
    echo ""
    echo "💰 Expected monthly cost: $5-15"
    echo "📈 Expected output: 10-15 posts per day"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the issues above.${NC}"
    echo ""
    echo "🔧 Common fixes:"
    echo "1. Run 'npm install' in root, worker, and site directories"
    echo "2. Create .env file from .env.example"
    echo "3. Install Wrangler CLI: npm install -g wrangler"
    echo "4. Check file permissions and paths"
fi

echo ""
echo "📚 For detailed deployment instructions, see DEPLOYMENT.md"