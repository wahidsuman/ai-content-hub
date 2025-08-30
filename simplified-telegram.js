// ============================================
// COMPLETE SIMPLIFIED TELEGRAM REPLACEMENT
// ============================================
// Copy this entire code to replace the existing Telegram implementation
// This goes from handleTelegram function to just before handleAPI function

// Main Telegram handler
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
        console.log(`Set ${chatId} as admin (first user)`);
      }
      
      // Only respond to /start, show menu for everything else
      if (text.startsWith('/')) {
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

// Main Menu
async function showMainMenu(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const isAdmin = await checkIsAdmin(env, chatId);
  
  const message = `🏠 *AgamiNews Control Center*

📰 Articles: ${articles.length}
👁 Total Views: ${articles.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}
📈 Today: ${stats.dailyArticlesPublished || 0} published

Select an action:`;

  const keyboard = [
    [
      { text: '🚀 Publish News', callback_data: 'publish' },
      { text: '📊 Statistics', callback_data: 'stats' }
    ],
    [
      { text: '📋 View Articles', callback_data: 'list_0' },
      { text: '💰 Costs', callback_data: 'costs' }
    ]
  ];
  
  // Add admin row if user is admin
  if (isAdmin) {
    keyboard.push([
      { text: '🗑️ Delete Last', callback_data: 'delete_last' },
      { text: '🧹 Clear All', callback_data: 'clear_confirm' }
    ]);
  }
  
  keyboard.push([
    { text: '❓ Help', callback_data: 'help' },
    { text: '🔄 Refresh', callback_data: 'menu' }
  ]);

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// Button Press Handler
async function handleButtonPress(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Answer callback to remove loading
  await answerCallback(env, callbackQuery.id);
  
  // Route actions
  if (data === 'menu') {
    await showMainMenu(env, chatId);
  }
  else if (data === 'publish') {
    await publishNews(env, chatId);
  }
  else if (data === 'stats') {
    await showStats(env, chatId);
  }
  else if (data.startsWith('list_')) {
    const page = parseInt(data.split('_')[1]);
    await showArticlesList(env, chatId, page);
  }
  else if (data === 'costs') {
    await showCosts(env, chatId);
  }
  else if (data === 'delete_last') {
    await deleteLastArticle(env, chatId);
  }
  else if (data === 'clear_confirm') {
    await confirmClearAll(env, chatId);
  }
  else if (data === 'clear_yes') {
    await clearAllArticles(env, chatId);
  }
  else if (data === 'help') {
    await showHelp(env, chatId);
  }
  else if (data.startsWith('delete_id_')) {
    const id = data.replace('delete_id_', '');
    await deleteArticleById(env, chatId, id);
  }
}

// Publish News
async function publishNews(env, chatId) {
  await sendMessage(env, chatId, '🔄 *Publishing articles...*\n\nFetching trending news from multiple sources.\nThis may take 30-60 seconds.');
  
  try {
    // Use existing fetchAndPublishNews function
    const response = await fetch(`${new URL(env.WORKER_URL || 'https://agaminews.in')}/api/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      const message = `✅ *Published Successfully!*

📰 Articles: ${result.articles || 0}
📈 Today Total: ${result.dailyPublished || 0}

View at: https://agaminews.in`;

      await sendMessage(env, chatId, message, {
        inline_keyboard: [
          [
            { text: '📊 View Stats', callback_data: 'stats' },
            { text: '📋 View Articles', callback_data: 'list_0' }
          ],
          [{ text: '🏠 Back to Menu', callback_data: 'menu' }]
        ]
      });
    } else {
      throw new Error(result.message || 'Publishing failed');
    }
  } catch (error) {
    await sendMessage(env, chatId, `❌ *Publishing Failed*\n\n${error.message}`, {
      inline_keyboard: [[{ text: '🏠 Back to Menu', callback_data: 'menu' }]]
    });
  }
}

// Show Statistics
async function showStats(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const categories = {};
  articles.forEach(a => {
    categories[a.category] = (categories[a.category] || 0) + 1;
  });
  
  const topArticle = articles.sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  
  const message = `📊 *Statistics Dashboard*

📰 *Content Stats*
• Total Articles: ${articles.length}
• Published Today: ${stats.dailyArticlesPublished || 0}
• Total Fetched: ${stats.totalArticlesFetched || 0}

👁 *Engagement*
• Total Views: ${totalViews.toLocaleString()}
• Avg Views: ${articles.length ? Math.round(totalViews / articles.length) : 0}

🏆 *Top Article*
${topArticle ? `"${topArticle.title}"\n${topArticle.views || 0} views` : 'No articles yet'}

📂 *Categories*
${Object.entries(categories).map(([cat, count]) => `• ${cat}: ${count}`).join('\n') || 'No articles'}`;

  await sendMessage(env, chatId, message, {
    inline_keyboard: [
      [
        { text: '💰 Cost Report', callback_data: 'costs' },
        { text: '📋 Articles', callback_data: 'list_0' }
      ],
      [{ text: '🏠 Back to Menu', callback_data: 'menu' }]
    ]
  });
}

// Show Articles List
async function showArticlesList(env, chatId, page = 0) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const perPage = 5;
  const totalPages = Math.ceil(articles.length / perPage);
  const start = page * perPage;
  const pageArticles = articles.slice(start, start + perPage);
  
  if (articles.length === 0) {
    await sendMessage(env, chatId, '📭 No articles yet.\n\nPublish some news first!', {
      inline_keyboard: [
        [{ text: '🚀 Publish News', callback_data: 'publish' }],
        [{ text: '🏠 Menu', callback_data: 'menu' }]
      ]
    });
    return;
  }
  
  let message = `📋 *Articles (Page ${page + 1}/${totalPages})*\n\n`;
  
  pageArticles.forEach((article, idx) => {
    const num = start + idx + 1;
    message += `${num}. *${article.title}*\n`;
    message += `   📂 ${article.category} | 👁 ${article.views || 0} views\n`;
    message += `   🔗 [View](https://agaminews.in${article.url})\n\n`;
  });
  
  const keyboard = [];
  
  // Add delete buttons for admin
  const isAdmin = await checkIsAdmin(env, chatId);
  if (isAdmin) {
    pageArticles.forEach((article, idx) => {
      keyboard.push([
        { text: `🗑️ Delete #${start + idx + 1}`, callback_data: `delete_id_${article.id}` }
      ]);
    });
  }
  
  // Navigation
  const navRow = [];
  if (page > 0) {
    navRow.push({ text: '⬅️ Prev', callback_data: `list_${page - 1}` });
  }
  navRow.push({ text: '🏠 Menu', callback_data: 'menu' });
  if (start + perPage < articles.length) {
    navRow.push({ text: 'Next ➡️', callback_data: `list_${page + 1}` });
  }
  keyboard.push(navRow);
  
  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// Show Costs
async function showCosts(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const articlesToday = stats.dailyArticlesPublished || 0;
  const costPerArticle = 0.045; // GPT-4 + DALL-E
  const dailyCost = articlesToday * costPerArticle;
  const monthlyCost = dailyCost * 30;
  
  const message = `💰 *Cost Report*

📊 *Today*
• Articles: ${articlesToday}
• Cost: $${dailyCost.toFixed(2)}

📈 *Monthly Projection*
• Articles: ${articlesToday * 30}
• Cost: $${monthlyCost.toFixed(2)}

💡 *Breakdown per Article*
• GPT-4 Article: ~$0.035
• DALL-E Image: ~$0.040
• Total: ~$0.045

🎯 *Budget Status*
${monthlyCost < 20 ? '✅ Within $20 budget' : '⚠️ May exceed $20 budget'}`;

  await sendMessage(env, chatId, message, {
    inline_keyboard: [[{ text: '🏠 Back to Menu', callback_data: 'menu' }]]
  });
}

// Delete Last Article
async function deleteLastArticle(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  if (!isAdmin) {
    await sendMessage(env, chatId, '❌ Admin access required', {
      inline_keyboard: [[{ text: '🏠 Menu', callback_data: 'menu' }]]
    });
    return;
  }
  
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  if (articles.length === 0) {
    await sendMessage(env, chatId, '📭 No articles to delete', {
      inline_keyboard: [[{ text: '🏠 Menu', callback_data: 'menu' }]]
    });
    return;
  }
  
  const deleted = articles.shift();
  await env.NEWS_KV.put('articles', JSON.stringify(articles));
  
  await sendMessage(env, chatId, `✅ *Deleted Successfully*\n\n"${deleted.title}"`, {
    inline_keyboard: [
      [{ text: '📋 View Articles', callback_data: 'list_0' }],
      [{ text: '🏠 Menu', callback_data: 'menu' }]
    ]
  });
}

// Delete Article by ID
async function deleteArticleById(env, chatId, articleId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  if (!isAdmin) {
    await sendMessage(env, chatId, '❌ Admin access required');
    return;
  }
  
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const index = articles.findIndex(a => String(a.id) === String(articleId));
  
  if (index !== -1) {
    const deleted = articles[index];
    articles.splice(index, 1);
    await env.NEWS_KV.put('articles', JSON.stringify(articles));
    
    await sendMessage(env, chatId, `✅ Deleted: "${deleted.title}"`, {
      inline_keyboard: [
        [{ text: '📋 Back to List', callback_data: 'list_0' }],
        [{ text: '🏠 Menu', callback_data: 'menu' }]
      ]
    });
  } else {
    await sendMessage(env, chatId, '❌ Article not found');
  }
}

// Confirm Clear All
async function confirmClearAll(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  if (!isAdmin) {
    await sendMessage(env, chatId, '❌ Admin access required');
    return;
  }
  
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const message = `⚠️ *Confirm Delete All*

This will delete ALL ${articles.length} articles from the website.

This action cannot be undone!

Are you sure?`;

  await sendMessage(env, chatId, message, {
    inline_keyboard: [
      [
        { text: '✅ Yes, Delete All', callback_data: 'clear_yes' },
        { text: '❌ Cancel', callback_data: 'menu' }
      ]
    ]
  });
}

// Clear All Articles
async function clearAllArticles(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  if (!isAdmin) return;
  
  await env.NEWS_KV.put('articles', JSON.stringify([]));
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  stats.dailyArticlesPublished = 0;
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
  
  await sendMessage(env, chatId, `✅ *All Articles Cleared*\n\nThe website is now empty.`, {
    inline_keyboard: [
      [{ text: '🚀 Publish News', callback_data: 'publish' }],
      [{ text: '🏠 Menu', callback_data: 'menu' }]
    ]
  });
}

// Show Help
async function showHelp(env, chatId) {
  const isAdmin = await checkIsAdmin(env, chatId);
  
  const message = `❓ *Help & Guide*

*Your Status:* ${isAdmin ? '👑 Admin' : '👤 User'}

*Available Actions:*
🚀 *Publish* - Fetch and publish trending news
📊 *Statistics* - View site analytics
📋 *Articles* - Browse published content
💰 *Costs* - Check API usage costs
${isAdmin ? '\n*Admin Actions:*\n🗑️ Delete articles\n🧹 Clear all content' : ''}

*Auto Publishing:*
• Articles auto-publish every 3 hours
• All images are AI-generated
• Content is SEO optimized

*Tips:*
• Each article costs ~$0.045
• Budget limit: $20/month
• Optimal: 10-15 articles/day

Need help? Contact support.`;

  await sendMessage(env, chatId, message, {
    inline_keyboard: [[{ text: '🏠 Back to Menu', callback_data: 'menu' }]]
  });
}

// Utility: Check Admin
async function checkIsAdmin(env, chatId) {
  const adminChat = await env.NEWS_KV.get('admin_chat');
  return adminChat && String(chatId) === String(adminChat);
}

// Utility: Send Message
async function sendMessage(env, chatId, text, keyboard = null) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: keyboard
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
    }
    return response.ok;
  } catch (error) {
    console.error('Failed to send message:', error);
    return false;
  }
}

// Utility: Answer Callback
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

// Note: After this, continue with your existing non-Telegram functions like handleAPI, etc.