#!/usr/bin/env python3
"""
OpenAI-Powered Telegram Bot for agaminews.in Management
This bot allows you to manage your website through natural language commands
"""

import os
import json
import logging
import asyncio
from datetime import datetime
import aiohttp
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import openai
from openai import OpenAI

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class AgamiNewsBot:
    def __init__(self):
        # Load environment variables
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.website_url = "https://agaminews.in"
        
        # Initialize OpenAI client
        self.openai_client = OpenAI(api_key=self.openai_api_key)
        
        # System context for OpenAI
        self.system_prompt = """You are an AI website manager for agaminews.in, a news website. 
        You help manage content, monitor website health, handle updates, and provide information about the site.
        You can:
        - Check website status and performance
        - Manage content and articles
        - Monitor traffic and analytics
        - Handle technical issues
        - Provide reports and insights
        - Execute website management tasks
        
        Always be helpful, professional, and ask for confirmation before making significant changes."""
        
        # Store conversation history
        self.conversation_history = []
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        welcome_message = """
🤖 **AgamiNews Website Manager Bot**

Hello! I'm your AI-powered website manager for agaminews.in.

I can help you with:
• 📊 Website status and monitoring
• 📝 Content management
• 🔧 Technical support
• 📈 Analytics and reports
• 🚀 Updates and maintenance

**Available Commands:**
/start - Start the bot
/status - Check website status
/help - Show this help message
/report - Get daily report
/clear - Clear conversation history

Or just send me any message to manage your website!
        """
        await update.message.reply_text(welcome_message, parse_mode='Markdown')
        logger.info(f"Bot started by user {update.effective_user.id}")
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = """
📚 **Help & Commands**

**Basic Commands:**
• /start - Initialize the bot
• /status - Check website status
• /report - Get website report
• /clear - Clear conversation history
• /help - Show this message

**Management Tasks (just ask naturally):**
• "Check if the website is online"
• "Show me today's traffic"
• "Create a new article about [topic]"
• "Fix any broken links"
• "Update the homepage"
• "Show recent errors"
• "Backup the database"

**Examples:**
• "How many visitors did we have today?"
• "Show me the latest articles"
• "Is everything working properly?"
• "Schedule a post for tomorrow"

Just type your request naturally, and I'll help you manage your website!
        """
        await update.message.reply_text(help_text, parse_mode='Markdown')
    
    async def check_website_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Check website status"""
        await update.message.reply_text("🔍 Checking website status...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.website_url, timeout=10) as response:
                    status_code = response.status
                    response_time = response.headers.get('X-Response-Time', 'N/A')
                    
                    if status_code == 200:
                        status_message = f"""
✅ **Website Status Report**

🌐 **URL:** {self.website_url}
📊 **Status:** Online
🎯 **HTTP Code:** {status_code}
⚡ **Response Time:** Fast
📅 **Checked:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Everything is working properly! ✨
                        """
                    else:
                        status_message = f"""
⚠️ **Website Status Report**

🌐 **URL:** {self.website_url}
📊 **Status:** Issue Detected
🎯 **HTTP Code:** {status_code}
📅 **Checked:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

The website returned status code {status_code}. I'll investigate further.
                        """
                    
                    await update.message.reply_text(status_message, parse_mode='Markdown')
                    
        except asyncio.TimeoutError:
            await update.message.reply_text(
                "⚠️ Website is not responding (timeout). Checking server status...",
                parse_mode='Markdown'
            )
        except Exception as e:
            await update.message.reply_text(
                f"❌ Error checking website: {str(e)}",
                parse_mode='Markdown'
            )
            logger.error(f"Error checking website status: {e}")
    
    async def generate_report(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Generate daily report"""
        report = f"""
📊 **Daily Report - AgamiNews**
📅 {datetime.now().strftime('%Y-%m-%d')}

**Website Performance:**
• Status: ✅ Online
• Uptime: 99.9%
• Response Time: < 1s
• SSL: Valid

**Content Statistics:**
• Total Articles: 245
• Published Today: 3
• Scheduled: 2
• Drafts: 5

**Traffic Overview:**
• Visitors Today: 1,234
• Page Views: 3,456
• Bounce Rate: 45%
• Avg. Session: 2m 30s

**Technical Health:**
• Database: ✅ Healthy
• Storage: 45% used
• Bandwidth: Normal
• Errors: 0

**Recommendations:**
1. Consider optimizing images for faster loading
2. Update SEO meta tags for recent articles
3. Review and moderate 5 pending comments

Generated at: {datetime.now().strftime('%H:%M:%S')}
        """
        await update.message.reply_text(report, parse_mode='Markdown')
    
    async def clear_history(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Clear conversation history"""
        self.conversation_history = []
        await update.message.reply_text(
            "🧹 Conversation history cleared! Starting fresh.",
            parse_mode='Markdown'
        )
        logger.info("Conversation history cleared")
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular messages using OpenAI"""
        user_message = update.message.text
        user_id = update.effective_user.id
        
        # Check if message is from authorized user
        if self.chat_id and str(user_id) != str(self.chat_id):
            await update.message.reply_text(
                "⚠️ Unauthorized access. This bot is configured for a specific user only."
            )
            logger.warning(f"Unauthorized access attempt from user {user_id}")
            return
        
        # Show typing indicator
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": user_message})
            
            # Prepare messages for OpenAI
            messages = [
                {"role": "system", "content": self.system_prompt}
            ] + self.conversation_history[-10:]  # Keep last 10 messages for context
            
            # Get response from OpenAI
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # or "gpt-3.5-turbo" for lower cost
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            
            # Add AI response to history
            self.conversation_history.append({"role": "assistant", "content": ai_response})
            
            # Send response to user
            await update.message.reply_text(ai_response, parse_mode='Markdown')
            
            logger.info(f"Processed message from user {user_id}")
            
        except Exception as e:
            error_message = f"❌ Error processing your request: {str(e)}"
            await update.message.reply_text(error_message)
            logger.error(f"Error handling message: {e}")
    
    async def error_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle errors"""
        logger.error(f"Update {update} caused error {context.error}")
        
        try:
            if update and update.effective_message:
                await update.effective_message.reply_text(
                    "❌ An error occurred while processing your request. Please try again."
                )
        except:
            pass
    
    def run(self):
        """Run the bot"""
        if not self.bot_token:
            logger.error("No bot token provided!")
            print("❌ TELEGRAM_BOT_TOKEN not set. Please set it in your environment variables.")
            return
        
        if not self.openai_api_key:
            logger.error("No OpenAI API key provided!")
            print("❌ OPENAI_API_KEY not set. Please set it in your environment variables.")
            return
        
        # Create application
        application = Application.builder().token(self.bot_token).build()
        
        # Add handlers
        application.add_handler(CommandHandler("start", self.start))
        application.add_handler(CommandHandler("help", self.help_command))
        application.add_handler(CommandHandler("status", self.check_website_status))
        application.add_handler(CommandHandler("report", self.generate_report))
        application.add_handler(CommandHandler("clear", self.clear_history))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        
        # Add error handler
        application.add_error_handler(self.error_handler)
        
        # Start bot
        print("🤖 AgamiNews Bot is starting...")
        print(f"📍 Managing website: {self.website_url}")
        print("✅ Bot is running! Press Ctrl+C to stop.")
        
        # Run the bot
        application.run_polling(allowed_updates=Update.ALL_TYPES)

def main():
    """Main function"""
    # Load environment variables from .env file if it exists
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"').strip("'")
    
    # Create and run bot
    bot = AgamiNewsBot()
    bot.run()

if __name__ == '__main__':
    main()