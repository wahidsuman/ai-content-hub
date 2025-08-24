// Telegram Command Handlers for AI Manager
import { AIWebsiteManager } from './ai-manager.js';

export async function handleManagerCommands(env, chatId, text) {
  const manager = new AIWebsiteManager(env);
  
  // Command routing
  if (text === '/news' || text === '📰 Get News') {
    return await fetchAndSummarizeNews(manager, env, chatId);
  } else if (text.startsWith('/approve')) {
    return await approveArticles(manager, env, chatId, text);
  } else if (text === '/performance' || text === '📊 Performance') {
    return await showPerformance(manager, env, chatId);
  } else if (text === '/suggestions' || text === '💡 Suggestions') {
    return await getSuggestions(manager, env, chatId);
  } else if (text === '/budget' || text === '💰 Budget') {
    return await showBudget(manager, env, chatId);
  } else if (text === '/schedule' || text === '📅 Schedule') {
    return await showSchedule(manager, env, chatId);
  }
}

// Fetch news and send summaries with approval buttons
async function fetchAndSummarizeNews(manager, env, chatId) {
  await sendMessage(env, chatId, "🔍 Fetching latest news from all sources...");
  
  const news = await manager.fetchDailyNews();
  const summaries = await manager.summarizeForApproval(news);
  
  // Store news for approval
  await env.NEWS_KV.put('pending_news', JSON.stringify(news));
  
  // Format message
  let message = "📰 *Today's News Summary (15 articles)*\n\n";
  
  news.slice(0, 15).forEach((item, index) => {
    message += `${index + 1}. *${item.category}*: ${item.title}\n`;
    message += `   Source: ${item.source}\n\n`;
  });
  
  message += "\n✅ Select articles to approve:";
  
  // Create inline keyboard with approval buttons
  const keyboard = {
    inline_keyboard: [
      // Row 1: Articles 1-5
      [
        { text: "1", callback_data: "approve_1" },
        { text: "2", callback_data: "approve_2" },
        { text: "3", callback_data: "approve_3" },
        { text: "4", callback_data: "approve_4" },
        { text: "5", callback_data: "approve_5" }
      ],
      // Row 2: Articles 6-10
      [
        { text: "6", callback_data: "approve_6" },
        { text: "7", callback_data: "approve_7" },
        { text: "8", callback_data: "approve_8" },
        { text: "9", callback_data: "approve_9" },
        { text: "10", callback_data: "approve_10" }
      ],
      // Row 3: Articles 11-15
      [
        { text: "11", callback_data: "approve_11" },
        { text: "12", callback_data: "approve_12" },
        { text: "13", callback_data: "approve_13" },
        { text: "14", callback_data: "approve_14" },
        { text: "15", callback_data: "approve_15" }
      ],
      // Row 4: Quick actions
      [
        { text: "✅ Approve All", callback_data: "approve_all" },
        { text: "🔄 Refresh News", callback_data: "refresh_news" }
      ],
      // Row 5: Main menu
      [
        { text: "📊 Performance", callback_data: "show_performance" },
        { text: "💰 Budget", callback_data: "show_budget" },
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Approve and create articles
async function approveArticles(manager, env, chatId, text) {
  const numbers = text.replace('/approve', '').split(',').map(n => parseInt(n.trim()) - 1);
  const pendingNews = JSON.parse(await env.NEWS_KV.get('pending_news') || '[]');
  
  await sendMessage(env, chatId, `📝 Creating ${numbers.length} articles...`);
  
  for (const index of numbers) {
    if (pendingNews[index]) {
      const article = await manager.createArticle(pendingNews[index], true);
      
      // Store article
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      articles.unshift(article);
      await env.NEWS_KV.put('articles', JSON.stringify(articles));
      
      await sendMessage(env, chatId, `✅ Published: ${article.title}`);
    }
  }
  
  // Send success with action buttons
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🌐 View Website", url: "https://agaminews.in" },
        { text: "📰 Get More News", callback_data: "get_news" }
      ],
      [
        { text: "📊 Performance", callback_data: "show_performance" },
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, `🎉 All approved articles published!`, keyboard);
}

// Show performance metrics with buttons
async function showPerformance(manager, env, chatId) {
  const performance = await manager.analyzePerformance();
  
  const message = `
📊 *Website Performance Report*

*Traffic:*
• Total Views: ${performance.totalViews}
• Today's Views: ${performance.todayViews || 0}
• Growth: ${performance.growth || '+0%'}

*Content:*
• Top Category: ${performance.topCategories[0] || 'N/A'}
• Best Time: ${performance.bestPerformingTime}
• SEO Score: ${performance.seoScore}/100

*AI Suggestions:*
${performance.suggestions}

*Revenue Potential:*
• Estimated: $${(performance.totalViews * 0.002).toFixed(2)}/day
• Monthly: $${(performance.totalViews * 0.002 * 30).toFixed(2)}
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "💡 Get Suggestions", callback_data: "get_suggestions" },
        { text: "💰 Check Budget", callback_data: "show_budget" }
      ],
      [
        { text: "📰 Get News", callback_data: "get_news" },
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Get AI suggestions with buttons
async function getSuggestions(manager, env, chatId) {
  await sendMessage(env, chatId, "🤔 Analyzing website for improvements...");
  
  const performance = await manager.analyzePerformance();
  const seoTips = await manager.optimizeSEO({ title: 'test', content: '', seo: { keywords: [], metaDescription: '' }});
  const backlinks = await manager.buildBacklinks({ category: 'Tech' });
  
  const message = `
🧠 *AI Manager Suggestions*

*Content Strategy:*
${performance.suggestions}

*SEO Improvements:*
• Current Score: ${seoTips.score}/100
• Add more internal links
• Optimize meta descriptions
• Increase content length

*Backlink Opportunities:*
${backlinks.map(b => `• ${b.platform}: ${b.method}`).join('\n')}

*Revenue Optimization:*
• Apply for AdSense when reaching 100 daily visitors
• Add affiliate links to tech products
• Create email newsletter for recurring traffic

*Action Items:*
1. Post during peak hours (10 AM)
2. Focus on ${performance.topCategories[0] || 'Crypto'} content
3. Engage on Reddit for backlinks
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📰 Get News Now", callback_data: "get_news" },
        { text: "📊 Performance", callback_data: "show_performance" }
      ],
      [
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Show budget usage with buttons
async function showBudget(manager, env, chatId) {
  const usage = await env.NEWS_KV.get('usage_today') || 0;
  const monthlyUsage = await env.NEWS_KV.get('usage_month') || 0;
  
  const message = `
💰 *Budget Management*

*Daily Budget:* $0.33/day
• Used Today: $${usage.toFixed(3)}
• Remaining: $${(0.33 - usage).toFixed(3)}

*Monthly Budget:* $10/month
• Used This Month: $${monthlyUsage.toFixed(2)}
• Remaining: $${(10 - monthlyUsage).toFixed(2)}

*Cost Breakdown:*
• News Fetching: FREE
• Summaries: ~$0.10/day
• Article Creation: ~$0.20/day
• Image Generation: FREE (using Unsplash/Pexels)

*Optimization:*
✅ Using GPT-3.5 (cheap)
✅ Batch processing
✅ Free image sources
✅ Budget limits enforced
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📰 Get News", callback_data: "get_news" },
        { text: "📊 Performance", callback_data: "show_performance" }
      ],
      [
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Show daily schedule with buttons
async function showSchedule(manager, env, chatId) {
  const routine = await manager.dailyRoutine();
  
  let message = "📅 *Daily AI Manager Schedule*\n\n";
  
  for (const [time, task] of Object.entries(routine)) {
    message += `${time} - ${task}\n`;
  }
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📰 Get News Now", callback_data: "get_news" },
        { text: "📊 Check Performance", callback_data: "show_performance" }
      ],
      [
        { text: "💰 Budget Status", callback_data: "show_budget" },
        { text: "💡 Suggestions", callback_data: "get_suggestions" }
      ],
      [
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Helper function to send message with inline keyboard
async function sendMessageWithKeyboard(env, chatId, text, keyboard) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  });
}

// Helper function (existing)
async function sendMessage(env, chatId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}