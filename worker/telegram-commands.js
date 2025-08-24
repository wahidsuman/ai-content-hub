// Telegram Command Handlers for AI Manager
import { AIWebsiteManager } from './ai-manager.js';

export async function handleManagerCommands(env, chatId, text) {
  const manager = new AIWebsiteManager(env);
  
  // Command routing
  if (text === '/news') {
    return await fetchAndSummarizeNews(manager, env, chatId);
  } else if (text.startsWith('/approve')) {
    return await approveArticles(manager, env, chatId, text);
  } else if (text === '/performance') {
    return await showPerformance(manager, env, chatId);
  } else if (text === '/suggestions') {
    return await getSuggestions(manager, env, chatId);
  } else if (text === '/budget') {
    return await showBudget(manager, env, chatId);
  } else if (text === '/schedule') {
    return await showSchedule(manager, env, chatId);
  }
}

// Fetch news and send summaries
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
  
  message += "\n✅ Reply with article numbers to approve (e.g., /approve 1,3,5,7)";
  
  await sendMessage(env, chatId, message);
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
  
  await sendMessage(env, chatId, `🎉 All approved articles published!`);
}

// Show performance metrics
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
  
  await sendMessage(env, chatId, message);
}

// Get AI suggestions
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
  
  await sendMessage(env, chatId, message);
}

// Show budget usage
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
  
  await sendMessage(env, chatId, message);
}

// Show daily schedule
async function showSchedule(manager, env, chatId) {
  const routine = await manager.dailyRoutine();
  
  let message = "📅 *Daily AI Manager Schedule*\n\n";
  
  for (const [time, task] of Object.entries(routine)) {
    message += `${time} - ${task}\n`;
  }
  
  message += `\n*Commands:*
/news - Fetch latest news
/approve - Approve articles
/performance - View stats
/suggestions - Get AI advice
/budget - Check usage
/schedule - This schedule`;
  
  await sendMessage(env, chatId, message);
}

// Helper function
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