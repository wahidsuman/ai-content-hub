#!/usr/bin/env python3
"""
OpenAI-Telegram Bot Diagnostic & Repair Tool
For agaminews.in website management system
"""

import os
import json
import requests
import subprocess
import sys
from datetime import datetime
import time

# Color codes for terminal output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

class OpenAITelegramBotFixer:
    def __init__(self):
        self.issues_found = []
        self.fixes_applied = []
        
    def print_header(self):
        """Print diagnostic header"""
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}  OpenAI-Telegram Bot Diagnostic Tool{RESET}")
        print(f"{BOLD}  Website: agaminews.in{RESET}")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{BLUE}{'='*70}{RESET}\n")
    
    def check_env_file(self):
        """Check if environment variables are properly set"""
        print(f"{YELLOW}[1/7] Checking Environment Variables...{RESET}")
        
        env_vars = {
            'TELEGRAM_BOT_TOKEN': None,
            'OPENAI_API_KEY': None,
            'TELEGRAM_CHAT_ID': None,
            'WEBHOOK_URL': None
        }
        
        # Check .env file
        if os.path.exists('.env'):
            with open('.env', 'r') as f:
                for line in f:
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        if key in env_vars:
                            env_vars[key] = value.strip('"').strip("'")
        
        # Check environment
        for key in env_vars:
            if not env_vars[key]:
                env_vars[key] = os.environ.get(key)
        
        # Validate
        missing = []
        for key, value in env_vars.items():
            if not value:
                missing.append(key)
                print(f"  {RED}✗ {key} is missing{RESET}")
            else:
                masked_value = value[:8] + '...' if len(value) > 8 else value
                print(f"  {GREEN}✓ {key} is set ({masked_value}){RESET}")
        
        if missing:
            self.issues_found.append("Missing environment variables: " + ", ".join(missing))
            return False, env_vars
        
        return True, env_vars
    
    def test_telegram_bot(self, token):
        """Test Telegram bot token validity"""
        print(f"\n{YELLOW}[2/7] Testing Telegram Bot Token...{RESET}")
        
        if not token:
            print(f"  {RED}✗ No bot token provided{RESET}")
            self.issues_found.append("Telegram bot token is missing")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{token}/getMe"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    bot_info = data.get('result', {})
                    print(f"  {GREEN}✓ Bot token is valid{RESET}")
                    print(f"    Bot name: @{bot_info.get('username', 'Unknown')}")
                    print(f"    Bot ID: {bot_info.get('id', 'Unknown')}")
                    return True
                else:
                    print(f"  {RED}✗ Bot token is invalid: {data.get('description', 'Unknown error')}{RESET}")
                    self.issues_found.append(f"Invalid bot token: {data.get('description', 'Unknown error')}")
            else:
                print(f"  {RED}✗ Failed to validate bot token (HTTP {response.status_code}){RESET}")
                self.issues_found.append(f"Bot token validation failed with HTTP {response.status_code}")
        except Exception as e:
            print(f"  {RED}✗ Error testing bot token: {str(e)}{RESET}")
            self.issues_found.append(f"Bot token test error: {str(e)}")
        
        return False
    
    def test_openai_api(self, api_key):
        """Test OpenAI API key validity"""
        print(f"\n{YELLOW}[3/7] Testing OpenAI API Key...{RESET}")
        
        if not api_key:
            print(f"  {RED}✗ No OpenAI API key provided{RESET}")
            self.issues_found.append("OpenAI API key is missing")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Test with a simple completion request
            url = "https://api.openai.com/v1/models"
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                print(f"  {GREEN}✓ OpenAI API key is valid{RESET}")
                models = response.json().get('data', [])
                if models:
                    print(f"    Available models: {len(models)}")
                return True
            elif response.status_code == 401:
                print(f"  {RED}✗ OpenAI API key is invalid or expired{RESET}")
                self.issues_found.append("OpenAI API key is invalid or expired")
            else:
                print(f"  {RED}✗ OpenAI API test failed (HTTP {response.status_code}){RESET}")
                self.issues_found.append(f"OpenAI API test failed with HTTP {response.status_code}")
        except Exception as e:
            print(f"  {RED}✗ Error testing OpenAI API: {str(e)}{RESET}")
            self.issues_found.append(f"OpenAI API test error: {str(e)}")
        
        return False
    
    def check_webhook(self, token, webhook_url):
        """Check webhook configuration"""
        print(f"\n{YELLOW}[4/7] Checking Webhook Configuration...{RESET}")
        
        if not token:
            print(f"  {RED}✗ Cannot check webhook without bot token{RESET}")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{token}/getWebhookInfo"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    webhook_info = data.get('result', {})
                    current_webhook = webhook_info.get('url', '')
                    
                    if current_webhook:
                        print(f"  {GREEN}✓ Webhook is configured{RESET}")
                        print(f"    URL: {current_webhook}")
                        
                        # Check for errors
                        last_error = webhook_info.get('last_error_message')
                        if last_error:
                            print(f"    {RED}Last error: {last_error}{RESET}")
                            self.issues_found.append(f"Webhook error: {last_error}")
                        
                        pending_count = webhook_info.get('pending_update_count', 0)
                        if pending_count > 0:
                            print(f"    {YELLOW}Pending updates: {pending_count}{RESET}")
                        
                        return not bool(last_error)
                    else:
                        print(f"  {YELLOW}⚠ No webhook configured{RESET}")
                        if webhook_url:
                            print(f"    Expected: {webhook_url}")
                        self.issues_found.append("No webhook URL configured")
                        return False
        except Exception as e:
            print(f"  {RED}✗ Error checking webhook: {str(e)}{RESET}")
            self.issues_found.append(f"Webhook check error: {str(e)}")
        
        return False
    
    def test_message_sending(self, token, chat_id):
        """Test sending a message to Telegram"""
        print(f"\n{YELLOW}[5/7] Testing Message Sending...{RESET}")
        
        if not token or not chat_id:
            print(f"  {RED}✗ Missing token or chat ID{RESET}")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            data = {
                'chat_id': chat_id,
                'text': f'🔧 Test message from diagnostic tool\n'
                        f'Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n'
                        f'Website: agaminews.in\n'
                        f'Status: Testing bot connectivity'
            }
            
            response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    print(f"  {GREEN}✓ Test message sent successfully{RESET}")
                    print(f"    Check your Telegram for the test message")
                    return True
                else:
                    error = result.get('description', 'Unknown error')
                    print(f"  {RED}✗ Failed to send message: {error}{RESET}")
                    self.issues_found.append(f"Message sending failed: {error}")
            else:
                print(f"  {RED}✗ HTTP error {response.status_code}{RESET}")
                self.issues_found.append(f"Message sending HTTP error {response.status_code}")
        except Exception as e:
            print(f"  {RED}✗ Error sending message: {str(e)}{RESET}")
            self.issues_found.append(f"Message sending error: {str(e)}")
        
        return False
    
    def check_bot_process(self):
        """Check if bot process is running"""
        print(f"\n{YELLOW}[6/7] Checking Bot Process...{RESET}")
        
        # Check for common process names
        process_names = ['bot.py', 'telegram_bot.py', 'main.py', 'app.py']
        
        for name in process_names:
            try:
                result = subprocess.run(
                    ['pgrep', '-f', name],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    print(f"  {GREEN}✓ Bot process found: {name}{RESET}")
                    print(f"    PID: {result.stdout.strip()}")
                    return True
            except:
                pass
        
        # Check for Python processes
        try:
            result = subprocess.run(
                ['ps', 'aux'],
                capture_output=True,
                text=True
            )
            if 'python' in result.stdout and ('bot' in result.stdout.lower() or 'telegram' in result.stdout.lower()):
                print(f"  {GREEN}✓ Python bot process appears to be running{RESET}")
                return True
        except:
            pass
        
        print(f"  {YELLOW}⚠ No bot process detected{RESET}")
        self.issues_found.append("Bot process not running")
        return False
    
    def apply_fixes(self, env_vars):
        """Apply automatic fixes"""
        print(f"\n{YELLOW}[7/7] Applying Fixes...{RESET}")
        
        if not self.issues_found:
            print(f"  {GREEN}✓ No issues found - bot should be working{RESET}")
            return
        
        print(f"  Found {len(self.issues_found)} issue(s) to fix:")
        
        # Fix 1: Set webhook if missing
        if "No webhook URL configured" in str(self.issues_found):
            if env_vars.get('TELEGRAM_BOT_TOKEN') and env_vars.get('WEBHOOK_URL'):
                print(f"\n  {BLUE}Attempting to set webhook...{RESET}")
                url = f"https://api.telegram.org/bot{env_vars['TELEGRAM_BOT_TOKEN']}/setWebhook"
                data = {'url': env_vars['WEBHOOK_URL']}
                
                try:
                    response = requests.post(url, json=data, timeout=5)
                    if response.status_code == 200 and response.json().get('ok'):
                        print(f"    {GREEN}✓ Webhook set successfully{RESET}")
                        self.fixes_applied.append("Set webhook URL")
                    else:
                        print(f"    {RED}✗ Failed to set webhook{RESET}")
                except Exception as e:
                    print(f"    {RED}✗ Error: {str(e)}{RESET}")
        
        # Fix 2: Clear pending updates
        if "Pending updates" in str(self.issues_found):
            if env_vars.get('TELEGRAM_BOT_TOKEN'):
                print(f"\n  {BLUE}Clearing pending updates...{RESET}")
                url = f"https://api.telegram.org/bot{env_vars['TELEGRAM_BOT_TOKEN']}/getUpdates"
                data = {'offset': -1}
                
                try:
                    response = requests.post(url, json=data, timeout=5)
                    if response.status_code == 200:
                        print(f"    {GREEN}✓ Cleared pending updates{RESET}")
                        self.fixes_applied.append("Cleared pending updates")
                except Exception as e:
                    print(f"    {RED}✗ Error: {str(e)}{RESET}")
        
        # Fix 3: Restart bot process
        if "Bot process not running" in str(self.issues_found):
            print(f"\n  {BLUE}Bot process needs to be started{RESET}")
            print(f"    Run one of these commands:")
            print(f"    {BOLD}python3 bot.py{RESET}")
            print(f"    {BOLD}python3 telegram_bot.py{RESET}")
            print(f"    {BOLD}nohup python3 bot.py > bot.log 2>&1 &{RESET}")
    
    def generate_fix_script(self, env_vars):
        """Generate a fix script based on findings"""
        script_content = f"""#!/bin/bash
# Auto-generated fix script for OpenAI-Telegram Bot
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

echo "Starting bot fix process..."

# Set environment variables
export TELEGRAM_BOT_TOKEN="{env_vars.get('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN')}"
export OPENAI_API_KEY="{env_vars.get('OPENAI_API_KEY', 'YOUR_OPENAI_KEY')}"
export TELEGRAM_CHAT_ID="{env_vars.get('TELEGRAM_CHAT_ID', 'YOUR_CHAT_ID')}"
export WEBHOOK_URL="{env_vars.get('WEBHOOK_URL', 'https://agaminews.in/webhook')}"

# Kill existing bot process
echo "Stopping existing bot process..."
pkill -f "bot.py" 2>/dev/null
pkill -f "telegram_bot.py" 2>/dev/null

# Clear Telegram webhook
echo "Clearing webhook..."
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"

# Set new webhook
echo "Setting webhook..."
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \\
    -d "url=$WEBHOOK_URL"

# Start bot
echo "Starting bot..."
nohup python3 bot.py > bot.log 2>&1 &

echo "Bot fix process completed!"
echo "Check bot.log for details"
"""
        
        with open('/workspace/fix_bot.sh', 'w') as f:
            f.write(script_content)
        
        os.chmod('/workspace/fix_bot.sh', 0o755)
        print(f"\n  {GREEN}✓ Generated fix script: /workspace/fix_bot.sh{RESET}")
    
    def run_diagnostic(self):
        """Run complete diagnostic"""
        self.print_header()
        
        # Run all checks
        env_ok, env_vars = self.check_env_file()
        
        telegram_ok = False
        openai_ok = False
        webhook_ok = False
        message_ok = False
        process_ok = False
        
        if env_vars.get('TELEGRAM_BOT_TOKEN'):
            telegram_ok = self.test_telegram_bot(env_vars['TELEGRAM_BOT_TOKEN'])
            
            if telegram_ok and env_vars.get('WEBHOOK_URL'):
                webhook_ok = self.check_webhook(env_vars['TELEGRAM_BOT_TOKEN'], env_vars['WEBHOOK_URL'])
            
            if telegram_ok and env_vars.get('TELEGRAM_CHAT_ID'):
                message_ok = self.test_message_sending(env_vars['TELEGRAM_BOT_TOKEN'], env_vars['TELEGRAM_CHAT_ID'])
        
        if env_vars.get('OPENAI_API_KEY'):
            openai_ok = self.test_openai_api(env_vars['OPENAI_API_KEY'])
        
        process_ok = self.check_bot_process()
        
        # Apply fixes
        self.apply_fixes(env_vars)
        
        # Generate fix script
        self.generate_fix_script(env_vars)
        
        # Summary
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}  DIAGNOSTIC SUMMARY{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        status_items = [
            ("Environment Variables", env_ok),
            ("Telegram Bot Token", telegram_ok),
            ("OpenAI API Key", openai_ok),
            ("Webhook Configuration", webhook_ok),
            ("Message Sending", message_ok),
            ("Bot Process", process_ok)
        ]
        
        for item, status in status_items:
            status_icon = f"{GREEN}✓{RESET}" if status else f"{RED}✗{RESET}"
            print(f"  {status_icon} {item}")
        
        if self.issues_found:
            print(f"\n{YELLOW}Issues Found:{RESET}")
            for issue in self.issues_found:
                print(f"  • {issue}")
        
        if self.fixes_applied:
            print(f"\n{GREEN}Fixes Applied:{RESET}")
            for fix in self.fixes_applied:
                print(f"  • {fix}")
        
        # Recommendations
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}  RECOMMENDED ACTIONS{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        if not env_ok:
            print(f"1. Create a .env file with required variables:")
            print(f"   TELEGRAM_BOT_TOKEN=your_bot_token")
            print(f"   OPENAI_API_KEY=your_openai_key")
            print(f"   TELEGRAM_CHAT_ID=your_chat_id")
            print(f"   WEBHOOK_URL=https://agaminews.in/webhook\n")
        
        if not process_ok:
            print(f"2. Start the bot process:")
            print(f"   {BOLD}python3 bot.py{RESET}")
            print(f"   or")
            print(f"   {BOLD}bash /workspace/fix_bot.sh{RESET}\n")
        
        if not message_ok and telegram_ok:
            print(f"3. Check your Telegram app:")
            print(f"   • Open Telegram and search for your bot")
            print(f"   • Send /start to the bot")
            print(f"   • Check if you received the test message\n")
        
        print(f"{GREEN}Run the generated fix script to automatically resolve issues:{RESET}")
        print(f"  {BOLD}bash /workspace/fix_bot.sh{RESET}\n")

if __name__ == "__main__":
    fixer = OpenAITelegramBotFixer()
    fixer.run_diagnostic()