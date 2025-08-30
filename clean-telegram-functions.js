// ============================================
// CLEANED TELEGRAM FUNCTIONS FOR v1.0
// Replace lines 1814-3773 with this
// ============================================

// Stub functions for backward compatibility
// These redirect to the Control Centre or show appropriate messages

async function sendStats(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  await sendMessage(env, chatId, `📊 *Statistics*\n\n• Total Articles: ${articles.length}\n• Today: ${stats.dailyArticlesPublished || 0}\n• Views: ${articles.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}\n\nUse the Control Centre for more details.`, {
    inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
  });
}

async function handleFetchNews(env, chatId) {
  await sendMessage(env, chatId, `📰 *Fetching News...*\n\nProcessing articles from trending topics...`);
  
  try {
    // Call the actual fetch function
    const result = await fetchLatestNewsAuto(env, 5, 'normal');
    
    if (result && result.articlesPublished > 0) {
      await sendMessage(env, chatId, `✅ *Success!*\n\n• Articles Published: ${result.articlesPublished}\n• View at: https://agaminews.in`, {
        inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
      });
    } else {
      throw new Error('No articles published');
    }
  } catch (error) {
    await sendMessage(env, chatId, `❌ *Error:* ${error.message}`, {
      inline_keyboard: [[{ text: '🔄 Try Again', callback_data: 'fetch' }], [{ text: '🔄 Control Centre', callback_data: 'control' }]]
    });
  }
}

async function handleListArticles(env, chatId, page = 0) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const perPage = 5;
  const start = page * perPage;
  const end = start + perPage;
  const pageArticles = articles.slice(start, end);
  
  if (pageArticles.length === 0) {
    await sendMessage(env, chatId, '📚 No articles found on this page.', {
      inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
    });
    return;
  }
  
  let message = `📚 *Articles (Page ${page + 1})*\n\n`;
  pageArticles.forEach((article, i) => {
    const index = start + i;
    message += `${index + 1}. ${article.title}\n`;
    message += `   📂 ${article.category} | 👁 ${article.views || 0} views\n\n`;
  });
  
  const keyboard = [];
  const navRow = [];
  if (page > 0) navRow.push({ text: '⬅️ Previous', callback_data: `list_page_${page - 1}` });
  if (end < articles.length) navRow.push({ text: '➡️ Next', callback_data: `list_page_${page + 1}` });
  if (navRow.length > 0) keyboard.push(navRow);
  keyboard.push([{ text: '🔄 Control Centre', callback_data: 'control' }]);
  
  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// Stub all other old functions to redirect to Control Centre
async function handleNaturalLanguage(env, chatId, text) {
  await showControlCentre(env, chatId);
}

async function sendMenu(env, chatId) {
  await showControlCentre(env, chatId);
}

async function handleCallback(env, query) {
  // This should never be called as our new handleTelegram uses handleControlAction
  await handleControlAction(env, query);
}

// Empty stubs for functions that might be referenced but aren't needed
async function sendSystemStatus(env, chatId) { await showControlCentre(env, chatId); }
async function sendCostReport(env, chatId) { await showControlCentre(env, chatId); }
async function sendDetailedAnalytics(env, chatId) { await showControlCentre(env, chatId); }
async function sendHelp(env, chatId) { await showControlCentre(env, chatId); }
async function handleDeleteArticle(env, chatId, text) { await showControlCentre(env, chatId); }
async function handleCreateArticle(env, chatId, text) { await showControlCentre(env, chatId); }
async function handleClearArticles(env, chatId) { await showControlCentre(env, chatId); }
async function handleTestGeneration(env, chatId) { await showControlCentre(env, chatId); }
async function handleResetCounter(env, chatId) { await showControlCentre(env, chatId); }

// Keep these helper functions as they're used by other parts
async function deleteArticleByIndex(env, chatId, index) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  if (index < 0 || index >= articles.length) {
    await sendMessage(env, chatId, '❌ Invalid article index');
    return false;
  }
  
  articles.splice(index, 1);
  await env.NEWS_KV.put('articles', JSON.stringify(articles));
  await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
  
  await sendMessage(env, chatId, `✅ Article deleted`, {
    inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
  });
  return true;
}