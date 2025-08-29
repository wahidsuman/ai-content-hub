// DIRECT DEPLOYMENT SCRIPT FOR CLOUDFLARE
// Copy this ENTIRE content to Cloudflare Dashboard

// Version: 2.7.0 - FIXED MENU
// Deploy Time: ${new Date().toISOString()}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram') {
      return handleTelegram(request, env);
    }
    
    // Setup webhook
    if (url.pathname === '/setup') {
      const webhookUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${url.origin}/telegram`;
      const response = await fetch(webhookUrl);
      const result = await response.json();
      return new Response(`Webhook setup: ${JSON.stringify(result)}`);
    }
    
    // Default response
    return new Response('AgamiNews Bot v2.7 - Menu Fixed', { status: 200 });
  }
};

async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // FIXED: /start now shows new menu
      if (text === '/start' || text === '/menu') {
        await sendMenu(env, chatId);
      } else if (text === '/fetch') {
        await sendMessage(env, chatId, '🚀 Fetching news... (This is the NEW version!)');
      } else {
        await sendMenu(env, chatId);
      }
    } else if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      
      // Answer callback
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id })
      });
      
      // Handle callbacks
      if (data === 'fetch') {
        await sendMessage(env, chatId, '🚀 Fetching article... (NEW VERSION WORKING!)');
      } else if (data === 'menu') {
        await sendMenu(env, chatId);
      } else {
        await sendMessage(env, chatId, `Button clicked: ${data}`);
      }
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return new Response('OK', { status: 200 });
  }
}

// FIXED MENU FUNCTION - Only 7 buttons
async function sendMenu(env, chatId) {
  await sendMessage(env, chatId, `🎯 *AgamiNews Control Panel v2.7*

📊 Today: *15* articles | *$0.83*
📚 Total: *39* articles
⏰ Next: 18:00

Select action:`, {
    inline_keyboard: [
      [
        { text: '🚀 Fetch News', callback_data: 'fetch' },
        { text: '📊 Statistics', callback_data: 'stats' }
      ],
      [
        { text: '📚 List Articles', callback_data: 'list' },
        { text: '🗑 Delete', callback_data: 'delete' }
      ],
      [
        { text: '💰 Costs', callback_data: 'costs' },
        { text: '🔍 SEO', callback_data: 'seo' }
      ],
      [
        { text: '🌐 Open Website', url: 'https://agaminews.in' }
      ]
    ]
  });
}

async function sendMessage(env, chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    ...options
  };
  
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}