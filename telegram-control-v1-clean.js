// ============================================
// AGAMINEWS CONTROL CENTRE v1.0 - CLEAN VERSION
// To replace lines 1487-1790 in worker/index.js
// ============================================

const SYSTEM_VERSION = "1.0";
const SYSTEM_NAME = "AgamiNews Control Centre";

async function handleTelegram(request, env) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return new Response('OK', { status: 200 });
    }
    
    const update = await request.json();
    
    // Handle messages
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';
      
      // Store first user as admin
      const adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
        console.log(`[CONTROL v${SYSTEM_VERSION}] Set ${chatId} as admin (first user)`);
      }
      
      // Handle text commands
      if (text === '/start' || text === '/menu') {
        await showControlCentre(env, chatId);
      } else if (text.startsWith('/topic ')) {
        // Quick topic generation: /topic Technology AI trends
        const topic = text.replace('/topic ', '').trim();
        if (topic) {
          await generateCustomArticle(env, chatId, topic);
        }
      } else if (text === '/version') {
        await showVersion(env, chatId);
      } else {
        // Show control centre for any other input
        await showControlCentre(env, chatId);
      }
    }
    
    // Handle button callbacks
    else if (update.callback_query) {
      await handleControlAction(env, update.callback_query);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(`[CONTROL v${SYSTEM_VERSION}] Error:`, error);
    return new Response('OK', { status: 200 });
  }
}

// ============================================
// MAIN CONTROL CENTRE
// ============================================

async function showControlCentre(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const isAdmin = await checkIsAdmin(env, chatId);
  
  // Check AI status
  const hasOpenAI = !!env.OPENAI_API_KEY;
  const aiStatus = hasOpenAI ? '🟢 Online' : '🔴 Offline';
  
  const message = `🎛️ *${SYSTEM_NAME} v${SYSTEM_VERSION}*
━━━━━━━━━━━━━━━━━━━━

📊 *System Status*
• AI Engine: ${aiStatus}
• Articles: ${articles.length}
• Today Published: ${stats.dailyArticlesPublished || 0}
• Total Views: ${articles.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}

🤖 *AI Model*
• Content: GPT-4 Turbo
• Images: DALL-E 3 (Photorealistic)
• Quality: Professional Journalism

Select control module:`;

  const keyboard = [
    // Row 1 - AI Generation Controls
    [
      { text: '🤖 AI Generator', callback_data: 'ai_menu' },
      { text: '📰 Quick Publish', callback_data: 'quick_publish' }
    ],
    // Row 2 - Content Management
    [
      { text: '📚 Content Library', callback_data: 'content_menu' },
      { text: '📊 Analytics Hub', callback_data: 'analytics_menu' }
    ],
    // Row 3 - System Controls
    [
      { text: '⚙️ System Config', callback_data: 'system_menu' },
      { text: '🛠️ Maintenance', callback_data: 'maintenance_menu' }
    ],
    // Row 4 - Quick Actions
    [
      { text: '📈 Live Stats', callback_data: 'live_stats' },
      { text: '💰 Cost Monitor', callback_data: 'cost_monitor' }
    ],
    // Row 5 - Help & Refresh
    [
      { text: '📖 Documentation', callback_data: 'docs' },
      { text: '🔄 Refresh', callback_data: 'refresh' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// Placeholder functions for v1.0
async function showVersion(env, chatId) {
  await sendMessage(env, chatId, `🎛️ *${SYSTEM_NAME} v${SYSTEM_VERSION}*\n\nUse /start to open the control centre.`);
}

async function generateCustomArticle(env, chatId, topic) {
  await sendMessage(env, chatId, `📝 Generating article on: ${topic}\n\nPlease use the Control Centre for article generation.`);
}

async function handleControlAction(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Answer callback to remove loading
  await answerCallback(env, callbackQuery.id);
  
  // Main menu actions
  if (data === 'control' || data === 'refresh') {
    await showControlCentre(env, chatId);
  } else {
    // For now, show a message for unimplemented features
    await sendMessage(env, chatId, `⚠️ This feature is coming soon in v1.1\n\nFor now, use the website: https://agaminews.in`);
  }
}

async function checkIsAdmin(env, chatId) {
  const adminChat = await env.NEWS_KV.get('admin_chat');
  return adminChat && String(chatId) === String(adminChat);
}

async function answerCallback(env, callbackId, text = '') {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text
    })
  });
}

// Note: The existing sendMessage and other helper functions should remain as they are