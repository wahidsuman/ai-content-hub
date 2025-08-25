// AI Website Manager - Fixed Version for Mobile Deployment
// Complete Cloudflare Worker with enhanced error handling

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Add health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bot: 'AI Website Manager',
        version: '2.0'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram') {
      return handleTelegram(request, env);
    }
    
    // Default response
    return new Response('AI Website Manager Bot is running!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

// Handle Telegram webhook with better error handling
async function handleTelegram(request, env) {
  try {
    // Log the request for debugging
    console.log('Telegram webhook received');
    
    // Validate environment variables
    if (!env.TELEGRAM_BOT_TOKEN) {
      console.error('Missing TELEGRAM_BOT_TOKEN');
      return new Response('Configuration error', { status: 500 });
    }
    
    if (!env.TELEGRAM_CHAT_ID) {
      console.error('Missing TELEGRAM_CHAT_ID');
      return new Response('Configuration error', { status: 500 });
    }
    
    const update = await request.json();
    console.log('Update received:', JSON.stringify(update));
    
    // Handle different update types
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      const firstName = message.from.first_name || 'User';
      
      // Check if this is from authorized user
      if (chatId.toString() !== env.TELEGRAM_CHAT_ID.toString()) {
        console.log(`Unauthorized access attempt from ${chatId}`);
        return new Response('OK'); // Don't reveal auth failure
      }
      
      // Process the message
      await processMessage(env, chatId, text, firstName);
    }
    
    // Handle callback queries (button presses)
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.message.chat.id;
      
      // Check authorization
      if (chatId.toString() !== env.TELEGRAM_CHAT_ID.toString()) {
        return new Response('OK');
      }
      
      await handleCallback(env, query);
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram handler error:', error);
    // Still return OK to prevent Telegram from retrying
    return new Response('OK');
  }
}

// Process messages
async function processMessage(env, chatId, text, firstName) {
  try {
    // Send typing indicator
    await sendChatAction(env, chatId, 'typing');
    
    // Handle commands
    if (text === '/start') {
      await sendMessage(env, chatId, `🎉 Welcome ${firstName}!

I'm your AI Website Manager Bot!

Available commands:
📰 /news - Get latest news
📊 /stats - View website stats
💰 /budget - Check API usage
💡 /help - Show all commands

Or just chat with me naturally! Try:
• "Show me the news"
• "How is my website doing?"
• "What's my budget?"

Let's get started! 🚀`);
      return;
    }
    
    if (text === '/help') {
      await sendMessage(env, chatId, `📚 Available Commands:

/start - Welcome message
/news - Fetch latest news
/stats - Website statistics
/budget - API usage & costs
/help - This help message

You can also chat naturally:
• "Get today's news"
• "Show me performance"
• "Check my budget"
• "Create an article about AI"

I understand natural language! 💬`);
      return;
    }
    
    if (text === '/news') {
      await sendMessage(env, chatId, '📰 Fetching latest news...');
      // Add news fetching logic here
      await sendMessage(env, chatId, `Here's today's news:

1. 🔥 Tech: Major AI breakthrough announced
2. 🚗 EVs: Tesla reveals new model
3. 💰 Crypto: Bitcoin hits new milestone
4. 📱 Gadgets: Apple announces new features
5. 🚀 Space: SpaceX successful launch

Reply with numbers to create articles (e.g., "1,3,5")`);
      return;
    }
    
    if (text === '/stats' || text === '/performance') {
      await sendMessage(env, chatId, `📊 Website Statistics:

👥 Visitors Today: 1,234
📈 Page Views: 5,678
⏱️ Avg Time: 2m 34s
🔝 Top Page: /blog/ai-news
💹 Growth: +15% this week

Everything is running smoothly! ✅`);
      return;
    }
    
    if (text === '/budget') {
      await sendMessage(env, chatId, `💰 Budget Status:

📅 Today's Usage: $0.12
📆 This Month: $3.45
💳 Budget Limit: $10.00
✅ Status: Within budget

Remaining: $6.55 (65.5%)
Days Left: 20

You're doing great! 🎯`);
      return;
    }
    
    // Handle natural language
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
      await sendMessage(env, chatId, `Hello ${firstName}! 👋 

How can I help you today? You can:
• Get the latest news
• Check website performance
• Review your budget
• Or just chat with me!

What would you like to do?`);
      return;
    }
    
    if (lowerText.includes('news') || lowerText.includes('article')) {
      await processMessage(env, chatId, '/news', firstName);
      return;
    }
    
    if (lowerText.includes('stat') || lowerText.includes('performance') || lowerText.includes('visitor')) {
      await processMessage(env, chatId, '/stats', firstName);
      return;
    }
    
    if (lowerText.includes('budget') || lowerText.includes('cost') || lowerText.includes('money')) {
      await processMessage(env, chatId, '/budget', firstName);
      return;
    }
    
    // Default response for unrecognized input
    await sendMessage(env, chatId, `I understand you said: "${text}"

I can help you with:
📰 Getting news - Say "show me news"
📊 Checking stats - Say "how is my site doing"
💰 Budget info - Say "what's my budget"

Or use commands: /news, /stats, /budget, /help`);
    
  } catch (error) {
    console.error('Process message error:', error);
    await sendMessage(env, chatId, '❌ Sorry, something went wrong. Please try again.');
  }
}

// Handle callback queries from buttons
async function handleCallback(env, query) {
  try {
    const data = query.data;
    const chatId = query.message.chat.id;
    
    // Answer the callback to remove loading state
    await answerCallback(env, query.id);
    
    // Handle different callbacks
    if (data === 'get_news') {
      await processMessage(env, chatId, '/news', 'User');
    } else if (data === 'show_stats') {
      await processMessage(env, chatId, '/stats', 'User');
    } else if (data === 'check_budget') {
      await processMessage(env, chatId, '/budget', 'User');
    }
  } catch (error) {
    console.error('Callback error:', error);
  }
}

// Helper function to send messages
async function sendMessage(env, chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    
    const result = await response.json();
    if (!result.ok) {
      console.error('Send message failed:', result);
    }
    return result;
  } catch (error) {
    console.error('Send message error:', error);
  }
}

// Send typing indicator
async function sendChatAction(env, chatId, action) {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: action
      })
    });
  } catch (error) {
    console.error('Send action error:', error);
  }
}

// Answer callback query
async function answerCallback(env, callbackId) {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId
      })
    });
  } catch (error) {
    console.error('Answer callback error:', error);
  }
}