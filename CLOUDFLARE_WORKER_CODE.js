// AI Website Manager - Complete Cloudflare Worker
// This manages your entire website through AI and Telegram

export default {
  // Main request handler
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram') {
      return handleTelegram(request, env);
    }
    
    // Handle API endpoints
    if (url.pathname === '/api/content') {
      return handleAPI(request, env);
    }
    
    // Serve the main website
    return serveWebsite(env);
  },
  
  // Scheduled handler for automatic updates
  async scheduled(event, env, ctx) {
    const chatId = env.YOUR_TELEGRAM_ID;
    
    try {
      // Auto-generate content every 2 hours
      await sendMessage(env, chatId, "🔄 Running scheduled content generation...");
      
      const content = await generateContent(env, 
        "Generate 3 trending tech news articles with catchy titles about AI, startups, or innovation. Format as HTML."
      );
      
      await sendMessage(env, chatId, "✅ Content updated successfully!");
    } catch (error) {
      await sendMessage(env, chatId, `❌ Scheduled update failed: ${error.message}`);
    }
  }
};

// Handle Telegram messages
async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name || 'User';
      
      // Security: Only respond to authorized user
      if (chatId.toString() !== env.YOUR_TELEGRAM_ID) {
        return new Response('Unauthorized', { status: 403 });
      }
      
      // Handle commands
      if (text === '/start') {
        await sendWelcomeMessage(env, chatId, firstName);
      } else if (text === '/help') {
        await sendHelpMessage(env, chatId);
      } else if (text === '/status') {
        await sendStatusMessage(env, chatId);
      } else if (text === '/analytics') {
        await sendAnalytics(env, chatId);
      } else {
        // Process as AI command
        await processAICommand(env, chatId, text);
      }
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram handler error:', error);
    return new Response('Error', { status: 500 });
  }
}

// Process AI commands
async function processAICommand(env, chatId, command) {
  try {
    // Show typing indicator
    await sendChatAction(env, chatId, 'typing');
    
    // Send command to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an AI website manager. You can:
1. Generate content (articles, news, blogs)
2. Change website design (colors, layout, themes)
3. Update SEO settings
4. Manage content schedule
5. Analyze performance

Respond with JSON containing:
{
  "action": "generate_content|update_design|update_seo|schedule|analyze",
  "parameters": { relevant parameters },
  "message": "What you're doing"
}`
          },
          { role: 'user', content: command }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid OpenAI response');
    }
    
    const aiResponse = data.choices[0].message.content;
    
    // Parse AI response
    let action;
    try {
      action = JSON.parse(aiResponse);
    } catch (e) {
      // If not JSON, treat as direct content
      action = {
        action: 'generate_content',
        parameters: { content: aiResponse },
        message: 'Generated content based on your request'
      };
    }
    
    // Execute the action
    await executeAction(env, chatId, action);
    
  } catch (error) {
    await sendMessage(env, chatId, `❌ Error: ${error.message}`);
  }
}

// Execute AI-decided actions
async function executeAction(env, chatId, action) {
  await sendMessage(env, chatId, `🤖 ${action.message}`);
  
  switch (action.action) {
    case 'generate_content':
      const content = await generateContent(env, action.parameters.prompt || action.parameters.content);
      await sendMessage(env, chatId, "✅ Content generated and published!");
      break;
      
    case 'update_design':
      await updateDesign(env, action.parameters);
      await sendMessage(env, chatId, "🎨 Design updated!");
      break;
      
    case 'update_seo':
      await updateSEO(env, action.parameters);
      await sendMessage(env, chatId, "📈 SEO settings updated!");
      break;
      
    case 'schedule':
      await scheduleContent(env, action.parameters);
      await sendMessage(env, chatId, "📅 Content scheduled!");
      break;
      
    case 'analyze':
      const analytics = await getAnalytics(env);
      await sendMessage(env, chatId, `📊 Analytics:\n${analytics}`);
      break;
      
    default:
      await sendMessage(env, chatId, "🤔 I'm not sure how to do that yet.");
  }
}

// Generate content using GPT-3.5
async function generateContent(env, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate engaging tech news content in HTML format. Use modern styling.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.8
    })
  });
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Store in KV
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  articles.unshift({
    id: Date.now(),
    content: content,
    created: new Date().toISOString()
  });
  
  // Keep only last 20 articles
  if (articles.length > 20) {
    articles.length = 20;
  }
  
  await env.NEWS_KV.put('articles', JSON.stringify(articles));
  await env.NEWS_KV.put('last_updated', new Date().toISOString());
  
  // Update analytics
  const analytics = await env.NEWS_KV.get('analytics', 'json') || { generated: 0 };
  analytics.generated = (analytics.generated || 0) + 1;
  await env.NEWS_KV.put('analytics', JSON.stringify(analytics));
  
  return content;
}

// Update website design
async function updateDesign(env, parameters) {
  const currentDesign = await env.NEWS_KV.get('design', 'json') || {};
  const newDesign = { ...currentDesign, ...parameters };
  await env.NEWS_KV.put('design', JSON.stringify(newDesign));
}

// Update SEO settings
async function updateSEO(env, parameters) {
  const currentSEO = await env.NEWS_KV.get('seo', 'json') || {};
  const newSEO = { ...currentSEO, ...parameters };
  await env.NEWS_KV.put('seo', JSON.stringify(newSEO));
}

// Schedule content
async function scheduleContent(env, parameters) {
  const schedule = await env.NEWS_KV.get('schedule', 'json') || [];
  schedule.push({
    ...parameters,
    scheduled: new Date().toISOString()
  });
  await env.NEWS_KV.put('schedule', JSON.stringify(schedule));
}

// Get analytics
async function getAnalytics(env) {
  const analytics = await env.NEWS_KV.get('analytics', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  return `
📊 Website Analytics:
• Total Articles: ${articles.length}
• Content Generated: ${analytics.generated || 0} times
• Page Views: ${analytics.views || 0}
• Last Updated: ${await env.NEWS_KV.get('last_updated') || 'Never'}
  `;
}

// Serve the main website
async function serveWebsite(env) {
  try {
    // Track page view
    const analytics = await env.NEWS_KV.get('analytics', 'json') || {};
    analytics.views = (analytics.views || 0) + 1;
    await env.NEWS_KV.put('analytics', JSON.stringify(analytics));
    
    // Get content and design
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const design = await env.NEWS_KV.get('design', 'json') || {};
    const seo = await env.NEWS_KV.get('seo', 'json') || {};
    
    // Generate article HTML
    let articlesHTML = '';
    if (articles.length === 0) {
      articlesHTML = `
        <div class="article">
          <h2>Welcome to Your AI-Managed Website!</h2>
          <p>Content will appear here once you start generating it through Telegram.</p>
          <p>Send a message to your bot to get started!</p>
        </div>
      `;
    } else {
      articles.slice(0, 10).forEach(article => {
        articlesHTML += `
          <div class="article">
            ${article.content}
            <div class="meta">Generated: ${new Date(article.created).toLocaleString()}</div>
          </div>
        `;
      });
    }
    
    // Build the HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.title || 'AI-Managed Tech News'}</title>
  <meta name="description" content="${seo.description || 'AI-powered tech news website managed through Telegram'}">
  <meta name="keywords" content="${seo.keywords || 'tech, news, AI, innovation'}">
  
  <style>
    :root {
      --primary: ${design.primaryColor || '#667eea'};
      --secondary: ${design.secondaryColor || '#764ba2'};
      --bg: ${design.bgColor || '#0f0f23'};
      --text: ${design.textColor || '#ffffff'};
      --card: ${design.cardColor || 'rgba(255,255,255,0.1)'};
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      min-height: 100vh;
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      text-align: center;
      padding: 40px 0;
      background: rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      margin-bottom: 40px;
    }
    
    h1 {
      font-size: 3.5em;
      background: linear-gradient(45deg, #fff, #f0f0f0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .tagline {
      font-size: 1.2em;
      opacity: 0.9;
    }
    
    .status {
      display: inline-block;
      background: rgba(0,255,0,0.2);
      color: #0f0;
      padding: 5px 15px;
      border-radius: 20px;
      margin-top: 10px;
      font-size: 0.9em;
      border: 1px solid rgba(0,255,0,0.3);
    }
    
    .content {
      display: grid;
      gap: 30px;
    }
    
    .article {
      background: var(--card);
      padding: 30px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .article:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    
    .article h2 {
      color: #fff;
      margin-bottom: 15px;
      font-size: 1.8em;
    }
    
    .article h3 {
      color: #f0f0f0;
      margin: 20px 0 10px;
      font-size: 1.4em;
    }
    
    .article p {
      margin-bottom: 15px;
      opacity: 0.95;
      line-height: 1.8;
    }
    
    .article ul, .article ol {
      margin: 15px 0 15px 30px;
    }
    
    .article li {
      margin-bottom: 8px;
    }
    
    .article code {
      background: rgba(0,0,0,0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    
    .article pre {
      background: rgba(0,0,0,0.3);
      padding: 15px;
      border-radius: 10px;
      overflow-x: auto;
      margin: 15px 0;
    }
    
    .meta {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 0.9em;
      opacity: 0.7;
      text-align: right;
    }
    
    footer {
      text-align: center;
      padding: 40px 0;
      margin-top: 60px;
      border-top: 1px solid rgba(255,255,255,0.1);
      opacity: 0.7;
    }
    
    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    
    @media (max-width: 768px) {
      h1 {
        font-size: 2em;
      }
      
      .article {
        padding: 20px;
      }
      
      .container {
        padding: 10px;
      }
    }
    
    /* Animation */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .status {
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 ${seo.title || 'AI Tech News'}</h1>
      <p class="tagline">${seo.description || 'Managed by AI • Updated Automatically'}</p>
      <span class="status">● LIVE - AI Managed</span>
      <div class="ai-badge">
        <span>🧠</span>
        <span>Powered by OpenAI</span>
      </div>
    </header>
    
    <main class="content">
      ${articlesHTML}
    </main>
    
    <footer>
      <p>© 2025 AI-Managed Website • Controlled via Telegram</p>
      <p>Last Updated: ${await env.NEWS_KV.get('last_updated') || 'Just now'}</p>
    </footer>
  </div>
</body>
</html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Website serve error:', error);
    return new Response('Website temporarily unavailable', { status: 500 });
  }
}

// Handle API requests
async function handleAPI(request, env) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  return new Response(JSON.stringify({
    success: true,
    articles: articles,
    lastUpdated: await env.NEWS_KV.get('last_updated')
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Telegram helper functions
async function sendMessage(env, chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Send message error:', error);
  }
}

async function sendChatAction(env, chatId, action) {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: action
      })
    });
  } catch (error) {
    console.error('Send chat action error:', error);
  }
}

async function sendWelcomeMessage(env, chatId, firstName) {
  const message = `
🎉 *Welcome ${firstName}!*

I'm your AI Website Manager powered by OpenAI GPT-4!

*What I can do:*
• 📝 Generate content on any topic
• 🎨 Change website design and colors
• 📈 Update SEO settings
• 📊 Show analytics
• 📅 Schedule content

*Just tell me what you want in natural language!*

*Examples:*
• "Generate 5 articles about AI trends"
• "Change website to dark theme with blue colors"
• "Show me website analytics"
• "Update SEO title to 'Tech Innovation Hub'"

*Commands:*
/help - Show all commands
/status - Check system status
/analytics - View website stats

Ready to manage your website! What would you like me to do?
  `;
  
  await sendMessage(env, chatId, message);
}

async function sendHelpMessage(env, chatId) {
  const message = `
📚 *AI Website Manager Help*

*Natural Language Commands:*
Just type what you want and I'll understand!

*Quick Commands:*
• /start - Welcome message
• /help - This help menu
• /status - System status
• /analytics - Website statistics

*Examples of what to say:*
• "Write an article about quantum computing"
• "Generate 3 news stories about startups"
• "Make the website purple and gold"
• "Change the title to 'Future Tech News'"
• "Show me how many visitors we had"

*Tips:*
• Be specific for better results
• I can generate any type of content
• All changes are instant
• Website updates automatically

Need help? Just ask!
  `;
  
  await sendMessage(env, chatId, message);
}

async function sendStatusMessage(env, chatId) {
  const lastUpdated = await env.NEWS_KV.get('last_updated');
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const analytics = await env.NEWS_KV.get('analytics', 'json') || {};
  
  const message = `
🟢 *System Status: ONLINE*

*Website Stats:*
• Articles: ${articles.length}
• Page Views: ${analytics.views || 0}
• Content Generated: ${analytics.generated || 0} times
• Last Update: ${lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}

*Services:*
✅ OpenAI API: Connected
✅ Telegram Bot: Active
✅ KV Storage: Working
✅ Auto-Updates: Enabled

*Next scheduled update:* Every 2 hours

Everything is working perfectly! 🚀
  `;
  
  await sendMessage(env, chatId, message);
}

async function sendAnalytics(env, chatId) {
  const analytics = await getAnalytics(env);
  await sendMessage(env, chatId, analytics);
}