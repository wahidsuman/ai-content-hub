#!/bin/bash

echo "🔧 Setting Your Unique Worker Name"
echo "=================================="

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

# Get worker name from user
echo ""
print_status "Please enter your unique Worker name:"
print_warning "Worker names must be:"
echo "  - 3-63 characters long"
echo "  - Only lowercase letters, numbers, and hyphens"
echo "  - Must start with a letter"
echo "  - Must be unique across all Cloudflare Workers"
echo ""
read -p "Enter your Worker name: " WORKER_NAME

# Validate worker name
if [[ ! $WORKER_NAME =~ ^[a-z][a-z0-9-]{2,62}$ ]]; then
    print_error "Invalid Worker name format. Please use only lowercase letters, numbers, and hyphens, starting with a letter."
    exit 1
fi

print_status "Updating Worker name to: $WORKER_NAME"

# Update wrangler.toml
sed -i.bak "s/name = \"your-unique-worker-name\"/name = \"$WORKER_NAME\"/" worker/wrangler.toml

# Update setup-cloudflare.sh
sed -i.bak "s/your-unique-worker-name/$WORKER_NAME/g" setup-cloudflare.sh

print_success "Worker name updated successfully!"
echo ""
print_status "Next steps:"
echo "1. Run: ./setup-cloudflare.sh"
echo "2. This will create KV namespaces and deploy your worker"
echo "3. Your worker will be available at: https://$WORKER_NAME.[your-subdomain].workers.dev"
echo ""
print_warning "Make sure you have:"
echo "- Cloudflare account"
echo "- Wrangler CLI installed and logged in"
echo "- Environment variables configured in .env file"