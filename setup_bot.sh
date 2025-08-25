#!/bin/bash

# AgamiNews Bot Setup Script
# This script will help you set up and fix your OpenAI-Telegram bot

echo "======================================"
echo "  AgamiNews Bot Setup & Repair Tool"
echo "======================================"
echo

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check Python
echo "1. Checking Python installation..."
if command_exists python3; then
    python_version=$(python3 --version 2>&1)
    echo -e "  ${GREEN}✓${NC} Python installed: $python_version"
else
    echo -e "  ${RED}✗${NC} Python3 not found. Please install Python 3.8+"
    exit 1
fi

# Step 2: Install dependencies
echo
echo "2. Installing required packages..."
pip3 install --quiet --upgrade pip

# Create requirements file
cat > requirements.txt << EOF
python-telegram-bot>=20.0
openai>=1.0.0
aiohttp>=3.8.0
python-dotenv>=0.19.0
requests>=2.28.0
EOF

pip3 install --quiet -r requirements.txt
echo -e "  ${GREEN}✓${NC} Dependencies installed"

# Step 3: Check for .env file
echo
echo "3. Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "  ${YELLOW}!${NC} No .env file found. Creating from template..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "  ${GREEN}✓${NC} Created .env file from template"
        echo
        echo "  Please edit .env file and add your credentials:"
        echo "    1. TELEGRAM_BOT_TOKEN - Get from @BotFather"
        echo "    2. OPENAI_API_KEY - Get from OpenAI dashboard"
        echo "    3. TELEGRAM_CHAT_ID - Your Telegram user ID"
    else
        # Create basic .env file
        cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# OpenAI Configuration
OPENAI_API_KEY=

# Website Configuration
WEBSITE_URL=https://agaminews.in
EOF
        echo -e "  ${GREEN}✓${NC} Created blank .env file"
        echo
        echo -e "  ${YELLOW}IMPORTANT:${NC} Edit .env file and add:"
        echo "    • TELEGRAM_BOT_TOKEN"
        echo "    • OPENAI_API_KEY"
        echo "    • TELEGRAM_CHAT_ID"
    fi
else
    echo -e "  ${GREEN}✓${NC} .env file exists"
    
    # Check if credentials are set
    source .env
    missing_vars=()
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        missing_vars+=("TELEGRAM_BOT_TOKEN")
    fi
    if [ -z "$OPENAI_API_KEY" ]; then
        missing_vars+=("OPENAI_API_KEY")
    fi
    if [ -z "$TELEGRAM_CHAT_ID" ]; then
        missing_vars+=("TELEGRAM_CHAT_ID")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo -e "  ${YELLOW}!${NC} Missing environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "    • $var"
        done
        echo
        echo "  Please edit .env file and add the missing values"
    else
        echo -e "  ${GREEN}✓${NC} All required environment variables are set"
    fi
fi

# Step 4: Kill existing bot processes
echo
echo "4. Checking for existing bot processes..."
if pgrep -f "telegram_bot.py" > /dev/null; then
    echo "  Found existing bot process. Stopping..."
    pkill -f "telegram_bot.py"
    sleep 2
    echo -e "  ${GREEN}✓${NC} Stopped existing bot"
else
    echo "  No existing bot process found"
fi

# Step 5: Run diagnostic
echo
echo "5. Running diagnostic check..."
if [ -f fix_openai_telegram_bot.py ]; then
    python3 fix_openai_telegram_bot.py
else
    echo -e "  ${YELLOW}!${NC} Diagnostic script not found"
fi

# Step 6: Start bot
echo
echo "======================================"
echo "  Setup Complete!"
echo "======================================"
echo
echo "To start your bot, run one of these commands:"
echo
echo "  1. Foreground mode (see logs):"
echo -e "     ${GREEN}python3 telegram_bot.py${NC}"
echo
echo "  2. Background mode (runs in background):"
echo -e "     ${GREEN}nohup python3 telegram_bot.py > bot.log 2>&1 &${NC}"
echo
echo "  3. With auto-restart (recommended):"
echo -e "     ${GREEN}while true; do python3 telegram_bot.py; sleep 5; done &${NC}"
echo
echo "To check bot logs:"
echo -e "  ${GREEN}tail -f bot.log${NC}"
echo
echo "To stop the bot:"
echo -e "  ${GREEN}pkill -f telegram_bot.py${NC}"
echo