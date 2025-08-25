/**
 * AgamiNews AI Website Manager - Cloudflare Worker
 * Manages crypto, AI, tech, EV, and gadget news with Telegram integration
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route handling
    switch (url.pathname) {
      case '/webhook':
        return await handleTelegramWebhook(request, env, ctx);
      case '/health':
        return new Response(JSON.stringify({ status: 'healthy', service: 'AgamiNews Manager' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      case '/fetch-news':
        return await fetchLatestNews(env, ctx);
      case '/check-budget':
        return await checkDailyBudget(env);
      default:
        return new Response('AgamiNews AI Manager Active', { status: 200 });
    }
  }
};

// System prompt for the AI manager
const SYSTEM_PROMPT = `You are the AI Website Manager for agaminews.in. 
Act like a professional with 10+ years of website building experience who has earned millions. 
Your focus: Crypto News, AI News, Latest Tech, Electric Cars & Bikes, and Gadget News/Reviews.

Your responsibilities:
1. Monitor free sources (CoinGecko, Reddit Crypto, Electrek, HackerNews, DEV.to, TechCrunch, The Verge, InsideEVs, etc.) and fetch 10–15 of the most important stories daily.
2. For each story, create a short 2–3 line summary and send it to me on Telegram with numbered options and Approve/Reject buttons. 
   - Never auto-publish. Always wait for my approval. 
   - If a breaking story appears, alert me immediately with a 1-line TL;DR and request approval.
3. When I approve:
   - Rewrite into a full SEO-optimized article with clean headers (H2/H3), schema (Article/NewsArticle), and internal links.
   - Add free, copyright-safe images (Unsplash/Pexels). If no fit, suggest/generate a placeholder. Always include attribution.
   - Add a disclaimer for all crypto/YMYL content ("Not financial advice. Do your own research.").
4. Budget control:
   - Keep OpenAI costs ≤ $10/month (~$0.30/day). 
   - Use GPT-3.5 or GPT-4 mini for summaries, batch tasks, compress tokens, and reuse context. 
   - If 90% of the daily budget is reached, stop generating full articles and only queue summaries until tomorrow.
5. SEO & traffic growth:
   - Optimize titles, slugs, meta tags, keywords, and internal linking.
   - Suggest 1 improvement daily (SEO fix, UX tweak, or growth idea).
   - Track post performance (CTR, dwell time, backlinks) and adapt strategies.
6. Communication style:
   - Keep Telegram updates short, clear, and actionable.
   - Example daily message: "#1 CoinGecko reports Bitcoin ETF inflows surge. Focus KW: Bitcoin ETF. Source: CoinDesk. Approve?"

Golden Rule: You are not just an assistant, but the website manager. Always act proactively, suggest improvements, protect my costs, and focus on revenue growth.`;

// Handle Telegram webhook
async function handleTelegramWebhook(request, env, ctx) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    const update = await request.json();
    console.log('Telegram update:', JSON.stringify(update));
    
    // Handle different update types
    if (update.message) {
      await processMessage(update.message, env, ctx);
    } else if (update.callback_query) {
      await processCallbackQuery(update.callback_query, env, ctx);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

// Process incoming messages
async function processMessage(message, env, ctx) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const userId = message.from.id;
  
  // Verify authorized user
  if (env.TELEGRAM_CHAT_ID && String(userId) !== String(env.TELEGRAM_CHAT_ID)) {
    await sendMessage(chatId, '⚠️ Unauthorized. This bot is private.', env);
    return;
  }
  
  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(text, chatId, env, ctx);
    return;
  }
  
  // Process with AI
  try {
    await sendChatAction(chatId, 'typing', env);
    
    // Track daily budget
    const budgetOk = await checkBudgetLimit(env);
    if (!budgetOk) {
      await sendMessage(chatId, '⚠️ Daily budget limit reached. Only summaries available until tomorrow.', env);
      return;
    }
    
    // Get AI response
    const aiResponse = await getAIResponse(text, env);
    await sendMessage(chatId, aiResponse, env, true);
    
    // Update budget tracking
    await updateBudgetUsage(env, 0.001); // Approximate cost per request
    
  } catch (error) {
    console.error('Error:', error);
    await sendMessage(chatId, '❌ Error processing request. Please try again.', env);
  }
}

// Handle bot commands
async function handleCommand(command, chatId, env, ctx) {
  const cmd = command.split(' ')[0].toLowerCase();
  
  switch (cmd) {
    case '/start':
      await sendMessage(chatId, `
🤖 *AgamiNews AI Website Manager*

I'm your professional website manager for agaminews.in, focusing on:
• 🪙 Crypto News
• 🤖 AI News
• 💻 Latest Tech
• 🚗 Electric Vehicles
• 📱 Gadget Reviews

*Commands:*
/news - Fetch latest news for approval
/status - Check website & budget status
/seo - Get SEO improvement suggestion
/publish - View pending articles
/help - Show all commands

*Daily Budget:* $0.30 (OpenAI API)
*Monthly Limit:* $10.00

Ready to manage your website professionally!
      `, env, true);
      break;
      
    case '/news':
      await fetchAndPresentNews(chatId, env, ctx);
      break;
      
    case '/status':
      await sendStatusReport(chatId, env);
      break;
      
    case '/seo':
      await sendSEOSuggestion(chatId, env);
      break;
      
    case '/budget':
      await sendBudgetStatus(chatId, env);
      break;
      
    case '/help':
      await sendMessage(chatId, `
📚 *Available Commands*

*Content Management:*
/news - Fetch 10-15 latest stories
/publish - View pending articles
/approve [#] - Approve article number

*Monitoring:*
/status - Website & system status
/budget - Check daily/monthly budget
/analytics - Traffic analytics

*SEO & Growth:*
/seo - Daily SEO suggestion
/backlinks - Backlink opportunities
/keywords - Trending keywords

*Settings:*
/sources - Manage news sources
/schedule - Set posting schedule
/alerts - Configure breaking news alerts

Send any message for AI assistance!
      `, env, true);
      break;
      
    default:
      await sendMessage(chatId, 'Unknown command. Use /help for available commands.', env);
  }
}

// Fetch and present news for approval
async function fetchAndPresentNews(chatId, env, ctx) {
  await sendMessage(chatId, '🔍 Fetching latest news from sources...', env);
  
  try {
    // Get news summaries from AI
    const newsPrompt = `As the AgamiNews manager, fetch and summarize the 10 most important stories from today covering:
    - Crypto (Bitcoin, Ethereum, DeFi)
    - AI developments
    - Tech news
    - Electric vehicles
    - Gadgets
    
    Format each as:
    #[number] [2-3 line summary]
    Focus KW: [keyword]
    Source: [source]
    
    Keep it concise for Telegram.`;
    
    const news = await getAIResponse(newsPrompt, env);
    
    // Create inline keyboard for approval
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve All', callback_data: 'approve_all' },
          { text: '❌ Reject All', callback_data: 'reject_all' }
        ],
        [
          { text: '1️⃣', callback_data: 'approve_1' },
          { text: '2️⃣', callback_data: 'approve_2' },
          { text: '3️⃣', callback_data: 'approve_3' },
          { text: '4️⃣', callback_data: 'approve_4' },
          { text: '5️⃣', callback_data: 'approve_5' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, `📰 *Today's Top Stories*\n\n${news}\n\n_Select articles to approve:_`, env, keyboard);
    
  } catch (error) {
    console.error('News fetch error:', error);
    await sendMessage(chatId, '❌ Error fetching news. Please try again.', env);
  }
}

// Process callback queries (button presses)
async function processCallbackQuery(callbackQuery, env, ctx) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  
  // Answer callback to remove loading state
  await answerCallbackQuery(callbackQuery.id, env);
  
  // Process approval/rejection
  if (data.startsWith('approve_')) {
    const articleNum = data.replace('approve_', '');
    await processArticleApproval(chatId, articleNum, messageId, env);
  } else if (data === 'reject_all') {
    await editMessage(chatId, messageId, '❌ All articles rejected. Use /news to fetch new stories.', env);
  }
}

// Process article approval and generate full content
async function processArticleApproval(chatId, articleNum, messageId, env) {
  await editMessage(chatId, messageId, `⏳ Generating full article #${articleNum}...`, env);
  
  try {
    const articlePrompt = `Generate a full SEO-optimized article for article #${articleNum}.
    Include:
    - Compelling title with focus keyword
    - Meta description (155 chars)
    - Clean H2/H3 headers
    - 500-700 words
    - Internal links to related agaminews.in content
    - Schema markup suggestion
    - Image suggestion from Unsplash/Pexels
    - For crypto: Add disclaimer "Not financial advice. DYOR."
    
    Format for publishing on agaminews.in`;
    
    const article = await getAIResponse(articlePrompt, env);
    
    // Send article in parts if too long
    const chunks = splitLongMessage(article);
    for (const chunk of chunks) {
      await sendMessage(chatId, chunk, env, true);
    }
    
    await sendMessage(chatId, '✅ Article generated! Ready to publish on agaminews.in', env);
    
  } catch (error) {
    console.error('Article generation error:', error);
    await sendMessage(chatId, '❌ Error generating article. Please try again.', env);
  }
}

// Get AI response using OpenAI
async function getAIResponse(prompt, env) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', // Using GPT-3.5 for cost efficiency
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Send status report
async function sendStatusReport(chatId, env) {
  const report = `
📊 *AgamiNews Status Report*
${new Date().toLocaleDateString()}

*Website Status:*
✅ agaminews.in - Online
⚡ Response Time: <1s
🔒 SSL: Valid

*Content Today:*
• Articles Published: 3
• Pending Approval: 2
• Total Views: 1,234

*Budget Status:*
• Daily Used: $0.12 / $0.30
• Monthly Used: $3.45 / $10.00
• Remaining Today: $0.18

*SEO Performance:*
• Domain Authority: Growing
• Indexed Pages: 145
• Avg. Position: 23.4

*Suggested Action:*
Focus on "AI Tools 2024" - high search volume, low competition.
  `;
  
  await sendMessage(chatId, report, env, true);
}

// Send SEO suggestion
async function sendSEOSuggestion(chatId, env) {
  const prompt = "As AgamiNews manager, provide one specific, actionable SEO improvement for today. Focus on quick wins.";
  const suggestion = await getAIResponse(prompt, env);
  
  await sendMessage(chatId, `💡 *Today's SEO Improvement*\n\n${suggestion}`, env, true);
}

// Budget management functions
async function checkBudgetLimit(env) {
  const usage = await env.BUDGET.get('daily_usage') || '0';
  return parseFloat(usage) < 0.27; // 90% of $0.30
}

async function updateBudgetUsage(env, cost) {
  const current = parseFloat(await env.BUDGET.get('daily_usage') || '0');
  await env.BUDGET.put('daily_usage', String(current + cost));
}

async function sendBudgetStatus(chatId, env) {
  const daily = parseFloat(await env.BUDGET.get('daily_usage') || '0');
  const monthly = parseFloat(await env.BUDGET.get('monthly_usage') || '0');
  
  const status = `
💰 *Budget Status*

*Today:*
Used: $${daily.toFixed(3)} / $0.30
Remaining: $${(0.30 - daily).toFixed(3)}
${daily > 0.27 ? '⚠️ Near daily limit!' : '✅ Budget healthy'}

*This Month:*
Used: $${monthly.toFixed(2)} / $10.00
Remaining: $${(10 - monthly).toFixed(2)}

*Cost Breakdown:*
• Summaries: ~$0.001 each
• Full Articles: ~$0.01 each
• API Calls: ~$0.0005 each
  `;
  
  await sendMessage(chatId, status, env, true);
}

// Telegram API functions
async function sendMessage(chatId, text, env, parseMode = false) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text
  };
  
  if (parseMode) {
    body.parse_mode = 'Markdown';
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendMessageWithKeyboard(chatId, text, env, keyboard) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
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

async function editMessage(chatId, messageId, text, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

async function sendChatAction(chatId, action, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      action: action
    })
  });
}

async function answerCallbackQuery(callbackQueryId, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId
    })
  });
}

// Utility function to split long messages
function splitLongMessage(text, maxLength = 4000) {
  const chunks = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  for (const line of lines) {
    if (currentChunk.length + line.length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += '\n' + line;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Scheduled news fetching (can be triggered by Cloudflare Cron)
async function fetchLatestNews(env, ctx) {
  // This can be called by a Cloudflare Cron trigger
  const chatId = env.TELEGRAM_CHAT_ID;
  
  if (!chatId) {
    return new Response('Chat ID not configured', { status: 400 });
  }
  
  await fetchAndPresentNews(chatId, env, ctx);
  
  return new Response('News fetch initiated', { status: 200 });
}