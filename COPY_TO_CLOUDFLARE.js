// ✅ COPY THIS ENTIRE FILE TO CLOUDFLARE DASHBOARD
// This is a complete, working Telegram bot with admin commands

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram' || url.pathname === '/telegram-webhook' || url.pathname === '/bot') {
      return handleTelegram(request, env);
    }
    
    // Show status page
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const adminChat = await env.NEWS_KV.get('admin_chat');
    
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI News - Admin System Active</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
          }
          .status {
            background: #10b981;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
            margin: 20px 0;
          }
          .info {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .commands {
            background: #fef3c7;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          code {
            background: #374151;
            color: #10b981;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
          }
          .article-count {
            font-size: 1.2em;
            color: #6366f1;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 AI News Bot</h1>
          <div class="status">✅ System Active</div>
          
          <div class="info">
            <h2>📊 Status</h2>
            <p class="article-count">Articles: ${articles.length}</p>
            <p>Admin Set: ${adminChat ? 'Yes ✅' : 'No ❌'}</p>
            <p>Telegram Bot: Connected</p>
          </div>
          
          <div class="commands">
            <h2>📱 Telegram Commands</h2>
            <p>Send these commands to your bot:</p>
            <ul style="margin: 10px 0 0 20px;">
              <li><code>/admin</code> - Check your admin status</li>
              <li><code>/setadmin agami2024</code> - Become admin</li>
              <li><code>/delete 0</code> - Delete first article</li>
              <li><code>/help</code> - Show all commands</li>
            </ul>
          </div>
          
          <div class="info" style="background: #dcfce7;">
            <h2>✅ Admin System Fixed!</h2>
            <p>The delete command now works properly.</p>
            <p>Use <code>/setadmin agami2024</code> in Telegram to become admin.</p>
          </div>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

// Handle Telegram messages
async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from?.first_name || 'User';
      
      // Get or set admin
      let adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat) {
        // First user becomes admin
        await env.NEWS_KV.put('admin_chat', String(chatId));
        adminChat = String(chatId);
        console.log(`First user ${chatId} set as admin`);
      }
      
      // Command handlers
      if (text === '/start') {
        await sendMessage(env, chatId, `
Welcome ${firstName}! 🎉

I'm your AI News Bot with admin controls.

Commands:
/admin - Check your status
/setadmin agami2024 - Become admin
/delete <num> - Delete article
/help - Show all commands

Your Chat ID: ${chatId}
${String(chatId) === String(adminChat) ? '✅ You are the admin!' : '❌ You are not admin (use /setadmin agami2024)'}
        `);
        
      } else if (text === '/admin' || text === '/whoami') {
        const isAdmin = String(chatId) === String(adminChat);
        await sendMessage(env, chatId, `
👤 Your Status

Chat ID: ${chatId}
Admin: ${isAdmin ? '✅ Yes' : '❌ No'}
Current Admin ID: ${adminChat || 'Not set'}

${!isAdmin ? 'To become admin, use: /setadmin agami2024' : 'You have full admin access!'}
        `);
        
      } else if (text.startsWith('/setadmin')) {
        const secret = text.split(' ')[1];
        if (secret === 'agami2024') {
          await env.NEWS_KV.put('admin_chat', String(chatId));
          await sendMessage(env, chatId, `
✅ SUCCESS!

You are now the admin!
Chat ID: ${chatId}

You can now use:
• /delete <num> - Delete articles
• All admin commands

Try: /delete 0 (to delete first article)
          `);
        } else {
          await sendMessage(env, chatId, '❌ Invalid secret\n\nCorrect usage: /setadmin agami2024');
        }
        
      } else if (text.startsWith('/delete')) {
        // Check if user is admin
        const currentAdmin = await env.NEWS_KV.get('admin_chat');
        
        if (String(chatId) !== String(currentAdmin)) {
          await sendMessage(env, chatId, `
❌ Unauthorized

You are not the admin.

Your ID: ${chatId}
Admin ID: ${currentAdmin}

To become admin, use: /setadmin agami2024
          `);
        } else {
          // User is admin, proceed with delete
          const parts = text.split(' ');
          const articleNum = parts[1];
          
          if (!articleNum && articleNum !== '0') {
            await sendMessage(env, chatId, '❌ Usage: /delete 0\n\n(Replace 0 with article number)');
          } else {
            const articles = await env.NEWS_KV.get('articles', 'json') || [];
            const index = parseInt(articleNum);
            
            if (articles[index]) {
              const deleted = articles[index];
              articles.splice(index, 1);
              await env.NEWS_KV.put('articles', JSON.stringify(articles));
              await sendMessage(env, chatId, `
✅ Article Deleted!

Article #${index}: "${deleted.title || 'Untitled'}"

Remaining articles: ${articles.length}
              `);
            } else {
              await sendMessage(env, chatId, `❌ Article #${articleNum} not found\n\nTotal articles: ${articles.length}`);
            }
          }
        }
        
      } else if (text === '/clear') {
        const currentAdmin = await env.NEWS_KV.get('admin_chat');
        if (String(chatId) !== String(currentAdmin)) {
          await sendMessage(env, chatId, '❌ Only admin can clear all articles\n\nUse: /setadmin agami2024');
        } else {
          const articles = await env.NEWS_KV.get('articles', 'json') || [];
          const count = articles.length;
          await env.NEWS_KV.put('articles', JSON.stringify([]));
          await sendMessage(env, chatId, `✅ Cleared ${count} articles from the website`);
        }
        
      } else if (text === '/help') {
        await sendMessage(env, chatId, `
📚 Available Commands

Admin Commands:
/admin - Check your admin status
/setadmin agami2024 - Become admin
/delete <num> - Delete specific article
/clear - Delete all articles

Info Commands:
/start - Welcome message
/help - This help message

Your Status: ${String(chatId) === String(adminChat) ? '✅ Admin' : '❌ Not Admin'}
        `);
        
      } else {
        await sendMessage(env, chatId, 'Unknown command. Use /help to see available commands.');
      }
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram handler error:', error);
    return new Response('OK');
  }
}

// Send message to Telegram
async function sendMessage(env, chatId, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.trim(),
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
    }
  } catch (error) {
    console.error('Send message error:', error);
  }
}