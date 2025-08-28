#!/usr/bin/env python3
"""
Cloudflare Worker Telegram Bot Diagnostic Tool
For agaminews.in OpenAI-powered website manager
"""

import requests
import json
import sys
from datetime import datetime
import time

# Color codes
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

class CloudflareWorkerBotDiagnostic:
    def __init__(self):
        self.issues = []
        self.worker_url = None
        self.bot_token = None
        
    def print_header(self):
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}  Cloudflare Worker Telegram Bot Diagnostic{RESET}")
        print(f"{BOLD}  Website: agaminews.in{RESET}")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{BLUE}{'='*70}{RESET}\n")
    
    def get_credentials(self):
        """Get Worker URL and Bot Token from user"""
        print(f"{YELLOW}[Step 1] Cloudflare Worker Information{RESET}")
        print("Please provide your Cloudflare Worker details:\n")
        
        # Get Worker URL
        print("1. Your Cloudflare Worker URL")
        print("   (e.g., https://your-bot.your-subdomain.workers.dev)")
        self.worker_url = input("   Worker URL: ").strip()
        
        if not self.worker_url:
            print(f"{RED}✗ No Worker URL provided{RESET}")
            return False
            
        if not self.worker_url.startswith('http'):
            self.worker_url = 'https://' + self.worker_url
            
        print(f"   {GREEN}✓ Worker URL: {self.worker_url}{RESET}")
        
        # Get Bot Token
        print("\n2. Your Telegram Bot Token (from @BotFather)")
        self.bot_token = input("   Bot Token: ").strip()
        
        if not self.bot_token:
            print(f"{RED}✗ No Bot Token provided{RESET}")
            return False
            
        print(f"   {GREEN}✓ Bot Token: {self.bot_token[:20]}...{RESET}")
        
        return True
    
    def test_worker_endpoint(self):
        """Test if Worker endpoint is accessible"""
        print(f"\n{YELLOW}[Step 2] Testing Cloudflare Worker Endpoint{RESET}")
        
        try:
            # Test GET request to worker
            response = requests.get(self.worker_url, timeout=10)
            
            if response.status_code == 200:
                print(f"  {GREEN}✓ Worker is accessible (HTTP 200){RESET}")
                
                # Check response content
                try:
                    data = response.json()
                    print(f"    Response: {json.dumps(data, indent=2)[:200]}")
                except:
                    print(f"    Response: {response.text[:200]}")
                    
                return True
            elif response.status_code == 404:
                print(f"  {YELLOW}⚠ Worker returned 404 - may need specific path{RESET}")
                self.issues.append("Worker returns 404 on root path")
            elif response.status_code == 403:
                print(f"  {YELLOW}⚠ Worker returned 403 - may have access restrictions{RESET}")
                self.issues.append("Worker has access restrictions")
            else:
                print(f"  {RED}✗ Worker returned HTTP {response.status_code}{RESET}")
                self.issues.append(f"Worker returned HTTP {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"  {RED}✗ Worker request timed out{RESET}")
            self.issues.append("Worker endpoint timeout")
            return False
        except Exception as e:
            print(f"  {RED}✗ Error accessing worker: {str(e)}{RESET}")
            self.issues.append(f"Worker access error: {str(e)}")
            return False
            
        return True
    
    def test_telegram_webhook(self):
        """Check current webhook configuration"""
        print(f"\n{YELLOW}[Step 3] Checking Telegram Webhook Configuration{RESET}")
        
        try:
            # Get current webhook info
            url = f"https://api.telegram.org/bot{self.bot_token}/getWebhookInfo"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    webhook_info = data.get('result', {})
                    current_url = webhook_info.get('url', '')
                    
                    if current_url:
                        print(f"  {GREEN}✓ Webhook is configured{RESET}")
                        print(f"    Current URL: {current_url}")
                        
                        # Check if it matches our worker
                        if self.worker_url in current_url:
                            print(f"    {GREEN}✓ Webhook points to your Worker{RESET}")
                        else:
                            print(f"    {YELLOW}⚠ Webhook points to different URL{RESET}")
                            self.issues.append("Webhook URL doesn't match Worker URL")
                        
                        # Check for errors
                        last_error = webhook_info.get('last_error_message')
                        if last_error:
                            print(f"    {RED}Last error: {last_error}{RESET}")
                            print(f"    Error date: {webhook_info.get('last_error_date', 'Unknown')}")
                            self.issues.append(f"Webhook error: {last_error}")
                        
                        # Check pending updates
                        pending = webhook_info.get('pending_update_count', 0)
                        if pending > 0:
                            print(f"    {YELLOW}Pending updates: {pending}{RESET}")
                            
                    else:
                        print(f"  {RED}✗ No webhook configured{RESET}")
                        self.issues.append("No webhook URL set")
                        return False
                else:
                    print(f"  {RED}✗ Invalid bot token{RESET}")
                    self.issues.append("Bot token is invalid")
                    return False
            else:
                print(f"  {RED}✗ Failed to check webhook (HTTP {response.status_code}){RESET}")
                return False
                
        except Exception as e:
            print(f"  {RED}✗ Error checking webhook: {str(e)}{RESET}")
            self.issues.append(f"Webhook check error: {str(e)}")
            return False
            
        return True
    
    def set_webhook(self):
        """Set or update webhook to Worker URL"""
        print(f"\n{YELLOW}[Step 4] Setting Webhook to Cloudflare Worker{RESET}")
        
        webhook_url = self.worker_url
        if not webhook_url.endswith('/webhook'):
            webhook_url = webhook_url.rstrip('/') + '/webhook'
        
        print(f"  Setting webhook to: {webhook_url}")
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/setWebhook"
            data = {
                'url': webhook_url,
                'allowed_updates': ['message', 'callback_query']
            }
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    print(f"  {GREEN}✓ Webhook set successfully!{RESET}")
                    return True
                else:
                    error = result.get('description', 'Unknown error')
                    print(f"  {RED}✗ Failed to set webhook: {error}{RESET}")
                    self.issues.append(f"Webhook set failed: {error}")
            else:
                print(f"  {RED}✗ HTTP error {response.status_code}{RESET}")
                
        except Exception as e:
            print(f"  {RED}✗ Error setting webhook: {str(e)}{RESET}")
            self.issues.append(f"Webhook set error: {str(e)}")
            
        return False
    
    def test_bot_response(self):
        """Send test message through webhook"""
        print(f"\n{YELLOW}[Step 5] Testing Bot Response{RESET}")
        
        # First, get bot info
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/getMe"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    bot_info = data.get('result', {})
                    bot_username = bot_info.get('username', 'Unknown')
                    print(f"  Bot: @{bot_username}")
                    print(f"  Bot ID: {bot_info.get('id', 'Unknown')}")
                    print(f"\n  {BLUE}Please test your bot:{RESET}")
                    print(f"  1. Open Telegram")
                    print(f"  2. Search for @{bot_username}")
                    print(f"  3. Send /start or any message")
                    print(f"  4. Check if you get a response")
                    return True
            
        except Exception as e:
            print(f"  {RED}✗ Error getting bot info: {str(e)}{RESET}")
            
        return False
    
    def check_worker_logs(self):
        """Instructions for checking Worker logs"""
        print(f"\n{YELLOW}[Step 6] Checking Cloudflare Worker Logs{RESET}")
        print(f"""
  To check your Worker logs:
  
  1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
  2. Select your account and Worker
  3. Click on "Logs" tab
  4. Look for recent errors or issues
  
  Common issues to look for:
  • Environment variable errors (missing API keys)
  • Timeout errors (Worker taking too long)
  • API errors (OpenAI or Telegram API issues)
  • Syntax errors in Worker code
        """)
    
    def generate_worker_code(self):
        """Generate sample Cloudflare Worker code"""
        print(f"\n{YELLOW}[Step 7] Cloudflare Worker Code Template{RESET}")
        
        worker_code = '''// Cloudflare Worker for Telegram Bot with OpenAI
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle webhook from Telegram
  if (request.method === 'POST' && url.pathname === '/webhook') {
    const update = await request.json()
    
    // Process the update
    if (update.message) {
      await processMessage(update.message)
    }
    
    return new Response('OK', { status: 200 })
  }
  
  // Health check endpoint
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response('Bot is running', { status: 200 })
}

async function processMessage(message) {
  const chatId = message.chat.id
  const text = message.text
  
  // Get response from OpenAI
  const aiResponse = await getOpenAIResponse(text)
  
  // Send response back to Telegram
  await sendTelegramMessage(chatId, aiResponse)
}

async function getOpenAIResponse(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a website manager for agaminews.in'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500
    })
  })
  
  const data = await response.json()
  return data.choices[0].message.content
}

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  })
}'''
        
        print("  Sample Worker code structure:")
        print(f"{BLUE}{'='*60}{RESET}")
        print(worker_code[:500] + "...")
        print(f"{BLUE}{'='*60}{RESET}")
        
        # Save full code
        with open('/workspace/cloudflare_worker_bot.js', 'w') as f:
            f.write(worker_code)
        
        print(f"\n  {GREEN}✓ Full Worker code saved to: /workspace/cloudflare_worker_bot.js{RESET}")
    
    def provide_fixes(self):
        """Provide specific fixes based on issues found"""
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}  RECOMMENDED FIXES{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        if "No webhook URL set" in str(self.issues):
            print(f"{YELLOW}1. Set Webhook:{RESET}")
            print(f"   Run this command with your bot token:")
            print(f"   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \\")
            print(f"        -d 'url={self.worker_url}/webhook'\n")
        
        if "Worker returns 404" in str(self.issues):
            print(f"{YELLOW}2. Fix Worker Routes:{RESET}")
            print(f"   Ensure your Worker handles these paths:")
            print(f"   • /webhook - For Telegram updates")
            print(f"   • /health - For health checks")
            print(f"   • / - Root path\n")
        
        if "Webhook error" in str(self.issues):
            print(f"{YELLOW}3. Fix Webhook Errors:{RESET}")
            print(f"   • Check Worker logs in Cloudflare Dashboard")
            print(f"   • Verify environment variables are set")
            print(f"   • Ensure Worker responds within 10 seconds")
            print(f"   • Check API keys are valid\n")
        
        print(f"{YELLOW}4. Verify Environment Variables in Cloudflare:{RESET}")
        print(f"   Go to Workers → Settings → Variables")
        print(f"   Ensure these are set:")
        print(f"   • TELEGRAM_BOT_TOKEN")
        print(f"   • OPENAI_API_KEY")
        print(f"   • TELEGRAM_CHAT_ID (optional)\n")
        
        print(f"{YELLOW}5. Test Your Setup:{RESET}")
        print(f"   a. Check Worker health:")
        print(f"      curl {self.worker_url}/health")
        print(f"   b. Send test to bot in Telegram")
        print(f"   c. Check Worker logs for errors\n")
    
    def run_diagnostic(self):
        """Run complete diagnostic"""
        self.print_header()
        
        # Get credentials
        if not self.get_credentials():
            print(f"\n{RED}Cannot proceed without Worker URL and Bot Token{RESET}")
            return
        
        # Run tests
        worker_ok = self.test_worker_endpoint()
        webhook_ok = self.test_telegram_webhook()
        
        # Offer to set webhook if needed
        if not webhook_ok or "No webhook URL set" in str(self.issues):
            print(f"\n{YELLOW}Would you like to set the webhook now? (y/n):{RESET} ", end='')
            if input().lower() == 'y':
                self.set_webhook()
        
        # Test bot
        self.test_bot_response()
        
        # Show how to check logs
        self.check_worker_logs()
        
        # Generate sample code
        self.generate_worker_code()
        
        # Provide fixes
        self.provide_fixes()
        
        # Summary
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}  DIAGNOSTIC SUMMARY{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        if self.issues:
            print(f"{RED}Issues Found:{RESET}")
            for issue in self.issues:
                print(f"  • {issue}")
        else:
            print(f"{GREEN}✓ No major issues found!{RESET}")
            print(f"  Your bot should be working. Test it in Telegram!")
        
        print(f"\n{BOLD}Next Steps:{RESET}")
        print(f"1. Check Cloudflare Dashboard for Worker logs")
        print(f"2. Verify environment variables are set correctly")
        print(f"3. Test bot in Telegram with /start command")
        print(f"4. Monitor Worker analytics for errors")

if __name__ == "__main__":
    diagnostic = CloudflareWorkerBotDiagnostic()
    diagnostic.run_diagnostic()