// Standalone Cloudflare Worker - No imports needed
// Copy this entire file to Cloudflare Dashboard

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram' || url.pathname === '/telegram-webhook') {
      return handleTelegram(request, env);
    }
    
    // Serve simple website
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI News</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
          h1 { color: #333; }
          .article { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>AI News Website</h1>
          <p>Telegram bot is active. Use /admin to check status.</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // Admin management
      let adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
        adminChat = String(chatId);
      }
      
      // Commands
      if (text === '/start') {
        await sendMessage(env, chatId, 'Welcome! Commands:\n/admin - Check status\n/setadmin agami2024 - Become admin\n/delete <num> - Delete article');
      
      } else if (text === '/admin' || text === '/whoami') {
        const isAdmin = String(chatId) === String(adminChat);
        await sendMessage(env, chatId, `Chat ID: ${chatId}\nAdmin: ${isAdmin ? 'Yes ✅' : 'No ❌'}\n\n${!isAdmin ? 'Use /setadmin agami2024' : 'You are admin!'}`);
      
      } else if (text.startsWith('/setadmin')) {
        const secret = text.split(' ')[1];
        if (secret === 'agami2024') {
          await env.NEWS_KV.put('admin_chat', String(chatId));
          await sendMessage(env, chatId, '✅ You are now admin!');
        } else {
          await sendMessage(env, chatId, 'Use: /setadmin agami2024');
        }
      
      } else if (text.startsWith('/delete')) {
        // Check admin
        const currentAdmin = await env.NEWS_KV.get('admin_chat');
        if (String(chatId) !== String(currentAdmin)) {
          await sendMessage(env, chatId, `❌ Not authorized\nYour ID: ${chatId}\nAdmin ID: ${currentAdmin}\n\nUse: /setadmin agami2024`);
        } else {
          const num = text.split(' ')[1];
          if (!num) {
            await sendMessage(env, chatId, 'Use: /delete 0');
          } else {
            const articles = await env.NEWS_KV.get('articles', 'json') || [];
            if (articles[num]) {
              articles.splice(num, 1);
              await env.NEWS_KV.put('articles', JSON.stringify(articles));
              await sendMessage(env, chatId, `✅ Deleted article #${num}`);
            } else {
              await sendMessage(env, chatId, 'Article not found');
            }
          }
        }
      
      } else if (text === '/fetch') {
        await sendMessage(env, chatId, 'Fetching news...');
        // Add your fetch logic here
        await sendMessage(env, chatId, '✅ Done! (Add fetch logic)');
      
      } else if (text === '/help') {
        await sendMessage(env, chatId, 'Commands:\n/admin - Status\n/setadmin agami2024 - Become admin\n/delete <num> - Delete article\n/fetch - Get news');
      }
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram error:', error);
    return new Response('OK');
  }
}

async function sendMessage(env, chatId, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Send message error:', error);
  }
}