// ============================================
// SIMPLIFIED TELEGRAM BOT WITH BUTTON MENUS
// ============================================

async function handleTelegram(request, env) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return new Response('OK', { status: 200 });
    }
    
    const update = await request.json();
    
    // Handle messages
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // Store admin on first use
      if (!await env.NEWS_KV.get('admin_chat')) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
      }
      
      // Only respond to /start command, everything else through buttons
      if (text === '/start') {
        await showMainMenu(env, chatId);
      } else {
        // For any other text, show the main menu
        await showMainMenu(env, chatId);
      }
    }
    
    // Handle button callbacks
    else if (update.callback_query) {
      await handleButtonPress(env, update.callback_query);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Telegram error:', error);
    return new Response('OK', { status: 200 });
  }
}

// ============================================
// MAIN MENU
// ============================================

async function showMainMenu(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  
  const message = `🏠 *AgamiNews Control Panel*

Welcome to your news management system!
Choose an action from the menu below:`;

  const keyboard = [
    // Row 1 - Main Actions
    [
      { text: '📰 Publish News', callback_data: 'publish' },
      { text: '📊 Statistics', callback_data: 'stats' }
    ],
    // Row 2 - View Content
    [
      { text: '📋 View Articles', callback_data: 'articles' },
      { text: '🔥 Trending', callback_data: 'trending' }
    ],
    // Row 3 - Admin Only (shown to everyone but will check permissions)
    [
      { text: '🗑️ Manage', callback_data: 'manage' },
      { text: '⚙️ Settings', callback_data: 'settings' }
    ],
    // Row 4 - Info
    [
      { text: '💡 Help', callback_data: 'help' },
      { text: '🔄 Refresh', callback_data: 'refresh' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// BUTTON PRESS HANDLER
// ============================================

async function handleButtonPress(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  
  // Answer callback to remove loading state
  await answerCallback(env, callbackQuery.id);
  
  // Route to appropriate handler
  switch(data) {
    case 'main':
    case 'refresh':
      await showMainMenu(env, chatId);
      break;
      
    case 'publish':
      await showPublishMenu(env, chatId);
      break;
      
    case 'stats':
      await showStatistics(env, chatId);
      break;
      
    case 'articles':
      await showArticlesList(env, chatId, 0);
      break;
      
    case 'trending':
      await showTrendingArticles(env, chatId);
      break;
      
    case 'manage':
      await showManageMenu(env, chatId);
      break;
      
    case 'settings':
      await showSettings(env, chatId);
      break;
      
    case 'help':
      await showHelp(env, chatId);
      break;
      
    // Publish actions
    case 'publish_auto':
      await publishAutomatic(env, chatId);
      break;
      
    case 'publish_custom':
      await showCustomPublishMenu(env, chatId);
      break;
      
    // Manage actions
    case 'delete_last':
      await deleteLastArticle(env, chatId);
      break;
      
    case 'clear_all':
      await showClearConfirmation(env, chatId);
      break;
      
    case 'confirm_clear':
      await clearAllArticles(env, chatId);
      break;
      
    // Navigation
    default:
      if (data.startsWith('page_')) {
        const page = parseInt(data.split('_')[1]);
        await showArticlesList(env, chatId, page);
      } else if (data.startsWith('view_')) {
        const id = data.split('_')[1];
        await showArticleDetails(env, chatId, id);
      } else if (data.startsWith('delete_')) {
        const id = data.split('_')[1];
        await deleteArticle(env, chatId, id);
      }
      break;
  }
}

// ============================================
// PUBLISH MENU
// ============================================

async function showPublishMenu(env, chatId) {
  const message = `📰 *Publish News*

Choose how you want to publish articles:`;

  const keyboard = [
    [
      { text: '🤖 Auto Publish (AI)', callback_data: 'publish_auto' }
    ],
    [
      { text: '✍️ Custom Topic', callback_data: 'publish_custom' }
    ],
    [
      { text: '🏠 Back to Menu', callback_data: 'main' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// STATISTICS
// ============================================

async function showStatistics(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const avgViews = articles.length > 0 ? Math.round(totalViews / articles.length) : 0;
  
  // Category breakdown
  const categories = {};
  articles.forEach(a => {
    categories[a.category] = (categories[a.category] || 0) + 1;
  });
  
  const categoryText = Object.entries(categories)
    .map(([cat, count]) => `  ${cat}: ${count}`)
    .join('\n');

  const message = `📊 *Statistics Dashboard*

📰 *Content*
• Total Articles: ${articles.length}
• Today Published: ${stats.dailyArticlesPublished || 0}

👁 *Engagement*
• Total Views: ${totalViews.toLocaleString()}
• Average Views: ${avgViews.toLocaleString()}

📂 *Categories*
${categoryText || '  No articles yet'}

⏰ *Last Update*
${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  const keyboard = [
    [
      { text: '💰 Cost Report', callback_data: 'costs' },
      { text: '📈 Analytics', callback_data: 'analytics' }
    ],
    [
      { text: '🏠 Back to Menu', callback_data: 'main' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// ARTICLES LIST
// ============================================

async function showArticlesList(env, chatId, page = 0) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const perPage = 5;
  const totalPages = Math.ceil(articles.length / perPage);
  const start = page * perPage;
  const end = start + perPage;
  
  const pageArticles = articles.slice(start, end);
  
  if (pageArticles.length === 0) {
    await sendMessage(env, chatId, '📭 No articles found.', {
      inline_keyboard: [[{ text: '🏠 Back to Menu', callback_data: 'main' }]]
    });
    return;
  }
  
  let message = `📋 *Articles (Page ${page + 1}/${totalPages})*\n\n`;
  
  pageArticles.forEach((article, idx) => {
    const globalIdx = start + idx;
    const emoji = article.trending ? '🔥' : '📄';
    message += `${globalIdx + 1}. ${emoji} *${article.title}*\n`;
    message += `   📂 ${article.category} | 👁 ${article.views || 0} views\n\n`;
  });
  
  // Build keyboard
  const keyboard = [];
  
  // Article action buttons
  pageArticles.forEach((article, idx) => {
    const globalIdx = start + idx;
    keyboard.push([
      { text: `${globalIdx + 1}. View`, callback_data: `view_${article.id}` },
      { text: '🗑️ Delete', callback_data: `delete_${article.id}` }
    ]);
  });
  
  // Navigation row
  const navRow = [];
  if (page > 0) {
    navRow.push({ text: '⬅️ Previous', callback_data: `page_${page - 1}` });
  }
  navRow.push({ text: '🏠 Menu', callback_data: 'main' });
  if (end < articles.length) {
    navRow.push({ text: 'Next ➡️', callback_data: `page_${page + 1}` });
  }
  keyboard.push(navRow);
  
  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// MANAGE MENU
// ============================================

async function showManageMenu(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  
  if (!isAdmin) {
    await sendMessage(env, chatId, '❌ Admin access required.', {
      inline_keyboard: [[{ text: '🏠 Back to Menu', callback_data: 'main' }]]
    });
    return;
  }
  
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const message = `🗑️ *Manage Content*

Current articles: ${articles.length}

Choose an action:`;

  const keyboard = [
    [
      { text: '🗑️ Delete Last Article', callback_data: 'delete_last' }
    ],
    [
      { text: '🧹 Clear All Articles', callback_data: 'clear_all' }
    ],
    [
      { text: '🏠 Back to Menu', callback_data: 'main' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// SETTINGS
// ============================================

async function showSettings(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  const adminChat = await env.NEWS_KV.get('admin_chat');
  
  const message = `⚙️ *Settings*

👤 *Your Info*
• Chat ID: \`${chatId}\`
• Status: ${isAdmin ? '✅ Admin' : '👤 User'}

🔧 *System*
• Admin ID: \`${adminChat || 'Not set'}\`
• Auto-publish: Every 3 hours
• Image Quality: Standard
• Article Style: Professional

${!isAdmin ? '\n💡 Contact admin for access.' : ''}`;

  const keyboard = [
    [
      { text: '🏠 Back to Menu', callback_data: 'main' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// HELP
// ============================================

async function showHelp(env, chatId) {
  const message = `💡 *Help & Guide*

*How to use the bot:*

📰 *Publish News*
• Auto: Fetches and publishes trending news
• Custom: Create article on specific topic

📊 *Statistics*
• View site analytics and performance
• Check publishing costs

📋 *View Articles*
• Browse all published articles
• View individual article details

🗑️ *Manage* (Admin only)
• Delete specific articles
• Clear all content

*Tips:*
• Articles auto-publish every 3 hours
• All images are AI-generated
• Articles use SEO-friendly URLs

Need more help? Contact support.`;

  const keyboard = [
    [
      { text: '🏠 Back to Menu', callback_data: 'main' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// ============================================
// ACTION HANDLERS
// ============================================

async function publishAutomatic(env, chatId) {
  await sendMessage(env, chatId, '🔄 *Publishing articles...*\n\nThis may take a minute.');
  
  try {
    // Call your existing fetch and publish logic
    const result = await fetchAndPublishNews(env);
    
    if (result.success) {
      await sendMessage(env, chatId, 
        `✅ *Published Successfully!*\n\n` +
        `📰 Articles: ${result.count}\n` +
        `🔗 Visit: https://agaminews.in`, {
        inline_keyboard: [[
          { text: '📊 View Stats', callback_data: 'stats' },
          { text: '🏠 Menu', callback_data: 'main' }
        ]]
      });
    } else {
      throw new Error(result.error || 'Publishing failed');
    }
  } catch (error) {
    await sendMessage(env, chatId, 
      `❌ *Publishing Failed*\n\n${error.message}`, {
      inline_keyboard: [[{ text: '🏠 Back to Menu', callback_data: 'main' }]]
    });
  }
}

async function deleteArticle(env, chatId, articleId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  if (!isAdmin) {
    await sendMessage(env, chatId, '❌ Admin access required.');
    return;
  }
  
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const index = articles.findIndex(a => String(a.id) === String(articleId));
  
  if (index !== -1) {
    const deleted = articles[index];
    articles.splice(index, 1);
    await env.NEWS_KV.put('articles', JSON.stringify(articles));
    
    await sendMessage(env, chatId, 
      `✅ *Deleted Successfully*\n\n"${deleted.title}"`, {
      inline_keyboard: [[
        { text: '📋 View Articles', callback_data: 'articles' },
        { text: '🏠 Menu', callback_data: 'main' }
      ]]
    });
  } else {
    await sendMessage(env, chatId, '❌ Article not found.');
  }
}

async function clearAllArticles(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  if (!isAdmin) {
    await sendMessage(env, chatId, '❌ Admin access required.');
    return;
  }
  
  await env.NEWS_KV.put('articles', JSON.stringify([]));
  await sendMessage(env, chatId, 
    `✅ *All Articles Cleared*\n\nThe website is now empty.`, {
    inline_keyboard: [[
      { text: '📰 Publish News', callback_data: 'publish' },
      { text: '🏠 Menu', callback_data: 'main' }
    ]]
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function checkIsAdmin(env, chatId) {
  const adminChat = await env.NEWS_KV.get('admin_chat');
  return adminChat && String(chatId) === String(adminChat);
}

async function sendMessage(env, chatId, text, keyboard = null) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send message:', error);
    return false;
  }
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

// Export for use in worker
module.exports = { handleTelegram };