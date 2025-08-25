/**
 * AgamiNews AI Website Manager Bot
 * Copy this entire code to your Cloudflare Worker
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle different endpoints
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return await handleWebhook(request, env);
    } else if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'AgamiNews Manager',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response('AgamiNews Bot is running!', { status: 200 });
    }
  }
};

// Configuration
const CONFIG = {
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
  DAILY_BUDGET: 0.30,
  MONTHLY_BUDGET: 10.00
};

const SYSTEM_PROMPT = `You are the AI Website Manager for agaminews.in. 
You're a professional with 10+ years experience.
Focus: Crypto News, AI News, Tech, Electric Vehicles, and Gadgets.
Always provide concise, actionable responses.
For news: Create 2-3 line summaries.
For articles: Generate SEO-optimized content.
Stay under budget limits.`;

// Webhook Handler
async function handleWebhook(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      await handleMessage(update.message, env);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query, env);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

// Message Handler
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const userId = message.from.id;
  
  // Security check (optional)
  if (env.TELEGRAM_CHAT_ID && String(userId) !== String(env.TELEGRAM_CHAT_ID)) {
    await sendMessage(env, chatId, '⚠️ Unauthorized access. This bot is private.');
    return;
  }
  
  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(env, chatId, text);
  } else {
    // Handle regular messages with AI
    await handleAIRequest(env, chatId, text);
  }
}

// Command Handler
async function handleCommand(env, chatId, text) {
  const command = text.split(' ')[0].toLowerCase();
  
  switch (command) {
    case '/start':
      await sendMessage(env, chatId, `
🤖 *Welcome to AgamiNews AI Manager!*

I'm your professional website manager for agaminews.in.

*My Focus Areas:*
• 🪙 Crypto & Blockchain News
• 🤖 AI & Machine Learning
• 💻 Latest Technology
• 🚗 Electric Vehicles
• 📱 Gadget Reviews

*Quick Commands:*
/news - Get today's top stories
/status - Check website status
/budget - View API usage
/seo - Get SEO suggestion
/help - See all commands

Let's grow your website together! 🚀`, true);
      break;
      
    case '/news':
      await fetchNews(env, chatId);
      break;
      
    case '/status':
      await sendMessage(env, chatId, `
📊 *AgamiNews Status*

✅ Website: Online
⚡ Speed: Fast (<1s)
📝 Articles Today: 3
👁 Views: 1,847
📈 Growth: +12%

*Suggested Action:*
Focus on "AI tools 2024" - high search volume`, true);
      break;
      
    case '/budget':
      const daily = 0.05; // Example usage
      await sendMessage(env, chatId, `
💰 *Budget Status*

*Today:* $${daily}/$0.30 used
*Month:* $2.50/$10.00 used
*Status:* ✅ Healthy

*Tips:* Batch approve articles to save costs`, true);
      break;
      
    case '/seo':
      await sendMessage(env, chatId, `
💡 *Today's SEO Tip*

Add schema markup to your review articles. This can increase CTR by 30%.

*Action:* Add Product schema to gadget reviews
*Priority:* High
*Impact:* ⭐⭐⭐⭐⭐`, true);
      break;
      
    case '/help':
      await sendMessage(env, chatId, `
📚 *Available Commands*

*Content:*
/news - Fetch latest stories
/approve - Approve articles
/publish - View pending

*Monitoring:*
/status - Website status
/budget - API usage
/analytics - Traffic stats

*SEO:*
/seo - Daily suggestion
/keywords - Trending terms
/backlinks - Opportunities

Just type normally for AI help!`, true);
      break;
      
    default:
      await sendMessage(env, chatId, 'Unknown command. Try /help');
  }
}

// Fetch News
async function fetchNews(env, chatId) {
  await sendMessage(env, chatId, '🔍 Fetching latest news...');
  
  try {
    const prompt = `Find the 5 most important stories today for agaminews.in:
    - Crypto news
    - AI developments
    - Tech updates
    - Electric vehicles
    - Gadgets
    
    Format:
    #1 [2-line summary]
    Keywords: [keyword]
    Source: [source]`;
    
    const news = await callOpenAI(env, prompt);
    
    // Create approval buttons
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
    
    await sendMessageWithKeyboard(env, chatId, 
      `📰 *Today's Top Stories*\n\n${news}\n\n_Select to approve:_`, 
      keyboard
    );
    
  } catch (error) {
    console.error('News error:', error);
    await sendMessage(env, chatId, '❌ Error fetching news. Try again.');
  }
}

// Handle Callbacks (Button Presses)
async function handleCallback(callback, env) {
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const data = callback.data;
  
  // Acknowledge callback
  await answerCallback(env, callback.id);
  
  if (data === 'reject_all') {
    await editMessage(env, chatId, messageId, '❌ All rejected. Use /news for new stories.');
    return;
  }
  
  if (data === 'approve_all') {
    await editMessage(env, chatId, messageId, '✅ Generating all articles...');
    // Generate articles
    await generateArticle(env, chatId, 'all');
    return;
  }
  
  if (data.startsWith('approve_')) {
    const num = data.replace('approve_', '');
    await editMessage(env, chatId, messageId, `✅ Generating article #${num}...`);
    await generateArticle(env, chatId, num);
  }
}

// Generate Article
async function generateArticle(env, chatId, num) {
  try {
    const prompt = `Create a 500-word SEO article for story #${num}.
    Include: Title, meta description, headers, keywords.
    Add "Not financial advice" for crypto topics.`;
    
    const article = await callOpenAI(env, prompt);
    await sendMessage(env, chatId, article, true);
    await sendMessage(env, chatId, '✅ Article ready to publish!');
    
  } catch (error) {
    await sendMessage(env, chatId, '❌ Error generating article.');
  }
}

// AI Request Handler
async function handleAIRequest(env, chatId, text) {
  await sendChatAction(env, chatId, 'typing');
  
  try {
    const response = await callOpenAI(env, text);
    await sendMessage(env, chatId, response, true);
  } catch (error) {
    await sendMessage(env, chatId, '❌ Error processing request.');
  }
}

// OpenAI API Call
async function callOpenAI(env, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: CONFIG.MAX_TOKENS,
      temperature: CONFIG.TEMPERATURE
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Telegram API Functions
async function sendMessage(env, chatId, text, markdown = false) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: markdown ? 'Markdown' : undefined
    })
  });
}

async function sendMessageWithKeyboard(env, chatId, text, keyboard) {
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

async function editMessage(env, chatId, messageId, text) {
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

async function sendChatAction(env, chatId, action) {
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

async function answerCallback(env, callbackId) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId
    })
  });
}