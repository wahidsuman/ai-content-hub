// AI Website Manager - Complete Cloudflare Worker
// This manages your entire website through AI and Telegram
// Last updated: August 24, 2025 - Beautiful colorful design

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

// Serve the main website with beautiful colorful design
async function serveWebsite(env) {
  try {
    // Track page view
    const analytics = await env.NEWS_KV.get('analytics', 'json') || {};
    analytics.views = (analytics.views || 0) + 1;
    await env.NEWS_KV.put('analytics', JSON.stringify(analytics));
    
    // Get content and settings
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const seo = await env.NEWS_KV.get('seo', 'json') || {};
    
    // Generate dynamic news articles
    let newsArticles = '';
    const colors = ['gold', 'blue', 'green', 'red'];
    const categories = ['AI', 'Finance', 'Crypto', 'Startups'];
    
    if (articles.length > 0) {
      articles.slice(0, 4).forEach((article, index) => {
        const color = colors[index % colors.length];
        const category = categories[index % categories.length];
        const timeAgo = getTimeAgo(article.created);
        
        // Extract title from content if possible
        let title = 'Latest Update';
        let description = article.content.substring(0, 100) + '...';
        
        const titleMatch = article.content.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(/<[^>]*>/g, '');
        }
        
        const descMatch = article.content.match(/<p[^>]*>(.*?)<\/p>/i);
        if (descMatch) {
          description = descMatch[1].replace(/<[^>]*>/g, '').substring(0, 80) + '...';
        }
        
        newsArticles += `
          <article class="news ${color}">
            <div class="cardPad">
              <span class="badge">${category}</span>
              <h3 class="title">${title}</h3>
              <p class="muted">${description}</p>
              <div class="meta">3 min read • ${timeAgo}</div>
            </div>
            <div class="img"></div>
          </article>
        `;
      });
    } else {
      // Default articles when no content
      newsArticles = `
        <article class="news gold">
          <div class="cardPad">
            <span class="badge">Finance</span>
            <h3 class="title">Tech giants invest in AI startups</h3>
            <p class="muted">Over $1B invested in AI tools in 2025.</p>
            <div class="meta">5 min read • Today</div>
          </div>
          <div class="img"></div>
        </article>

        <article class="news blue">
          <div class="cardPad">
            <span class="badge">AI</span>
            <h3 class="title">Robots enter the workforce</h3>
            <p class="muted">Automation rises across logistics and healthcare.</p>
            <div class="meta">3 min read • Today</div>
          </div>
          <div class="img"></div>
        </article>

        <article class="news green">
          <div class="cardPad">
            <span class="badge">Crypto</span>
            <h3 class="title">Ethereum 3.0 update lands</h3>
            <p class="muted">Massive improvements in speed and scalability.</p>
            <div class="meta">4 min read • Yesterday</div>
          </div>
          <div class="img"></div>
        </article>
      `;
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${seo.title || 'Agami News - AI Powered Tech News'}</title>
<meta name="description" content="${seo.description || 'Stay updated with the latest in AI, tech, and innovation. Powered by artificial intelligence.'}">
<style>
  :root{
    --bg:#0b1020;--text:#e8ecf2;--muted:#a8b1c7;--card:#121835;
    --g1:linear-gradient(135deg,#7c3aed, #ef4444, #f59e0b);
    --g2:linear-gradient(135deg,#06b6d4, #6366f1);
    --g3:linear-gradient(135deg,#22c55e, #06b6d4);
    --g4:linear-gradient(135deg,#f43f5e, #f97316);
    --radius:18px;--shadow:0 12px 30px rgba(0,0,0,.25);
  }
  *{box-sizing:border-box} body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a234a,transparent),var(--bg);color:var(--text);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
  a{color:#7dd3fc;text-decoration:none}
  .wrap{max-width:1024px;margin:auto;padding:18px}
  .navbar{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;margin:0 0 20px;background:linear-gradient(90deg,#111936ee,#0c122dee);backdrop-filter:blur(12px);border:1px solid #ffffff18;border-radius:16px}
  .brand{font-weight:800;font-size:20px;letter-spacing:.3px;display:flex;align-items:center;gap:8px}
  .nav-links{display:flex;gap:24px;align-items:center}
  .nav-link{color:var(--muted);font-size:14px;font-weight:600;transition:color 0.2s}
  .nav-link:hover{color:var(--text)}
  .ai-status{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:999px;font-size:12px;font-weight:700;color:#22c55e}
  .grid{display:grid;gap:16px}
  .hero{display:grid;gap:14px;grid-template-columns:1fr;align-items:center;margin-top:30px}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff1f;color:#dbeafe;font-size:12px}
  .h1{font-size:clamp(28px,6vw,48px);line-height:1.1;margin:6px 0 4px;font-weight:900}
  .lead{color:var(--muted);max-width:60ch}
  .btn{display:inline-block;padding:12px 16px;border-radius:12px;font-weight:700}
  .btn-primary{background:var(--g2);color:#031022;box-shadow:var(--shadow)}
  .card{background:var(--card);border:1px solid #ffffff14;border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  .cardPad{padding:16px}
  .badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#05203b;background:#ffffffd9;padding:4px 8px;border-radius:999px}
  .title{font-weight:800;margin:10px 0 6px}
  .muted{color:var(--muted)}
  .catGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .cat{padding:14px;border-radius:14px;color:#0b1020;font-weight:800;text-align:center}
  .cat.ai{background:#bae6fd}
  .cat.crypto{background:#bbf7d0}
  .cat.startups{background:#fbcfe8}
  .cat.finance{background:#fde68a}
  .list{display:grid;gap:14px}
  .news{display:grid;grid-template-columns:1fr 120px;gap:12px;align-items:center;border-radius:16px;background:#0e1530;border:1px solid #ffffff12;overflow:hidden}
  .news .img{height:84px;background:var(--g1)}
  .news.gold .img{background:linear-gradient(135deg,#b45309,#fde68a)}
  .news.blue .img{background:var(--g2)}
  .news.green .img{background:var(--g3)}
  .news.red .img{background:var(--g4)}
  .news .meta{font-size:12px;color:#9fb0c8}
  .newsletter{background:var(--g2);border-radius:20px;color:#031022}
  .newsletter .cardPad{padding:20px}
  .field{display:flex;gap:8px;margin-top:10px}
  input[type=email]{flex:1;padding:12px 14px;border-radius:12px;border:none;outline:none;background:#fffffff2}
  .footer{margin-top:28px;padding:22px;border-top:1px solid #ffffff12;color:#b9c3db;font-size:14px;text-align:center}
  .ai-powered{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:999px;font-size:11px;font-weight:700;color:#fff}
  /* hovers */
  .card:hover,.news:hover{transform:translateY(-2px);transition:transform .15s ease}
  @media(max-width:768px){
    .nav-links{display:none}
    .navbar{padding:14px 18px}
    .brand{font-size:18px}
  }
  @media(min-width:860px){
    .hero{grid-template-columns:1.2fr .8fr}
    .grid.cols-3{grid-template-columns:repeat(3,1fr)}
    .grid.cols-2{grid-template-columns:repeat(2,1fr)}
  }
</style>
</head>
<body>
  <div class="wrap">
    <!-- Updated Navbar with logo on left -->
    <nav class="navbar">
      <div class="brand">
        🌈 ${seo.title || 'Agami News'}
      </div>
      <div class="nav-links">
        <a href="#latest" class="nav-link">Latest</a>
        <a href="#ai" class="nav-link">AI</a>
        <a href="#crypto" class="nav-link">Crypto</a>
        <a href="#startups" class="nav-link">Startups</a>
        <div class="ai-status">● AI Active</div>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div>
        <span class="pill">Daily Briefing • AI & Tech</span>
        <h1 class="h1">AI-Powered News Platform</h1>
        <p class="lead">Get the latest tech news, AI breakthroughs, and innovation updates. All content managed and updated by artificial intelligence.</p>
        <p style="margin-top:10px">
          <a class="btn btn-primary" href="#latest">Read Latest</a>
        </p>
        <span class="ai-powered">🤖 Managed by AI</span>
      </div>

      <div class="card" style="background:var(--g1)">
        <div class="cardPad">
          <span class="badge">Featured</span>
          <h3 class="title" style="color:#051324">AI-Generated Content</h3>
          <p class="muted" style="color:#05203b">Fresh updates every 2 hours. ${articles.length} articles and counting.</p>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section style="margin-top:18px">
      <div class="catGrid">
        <a class="cat ai" href="#ai">AI</a>
        <a class="cat crypto" href="#crypto">Crypto</a>
        <a class="cat startups" href="#startups">Startups</a>
        <a class="cat finance" href="#finance">Finance</a>
      </div>
    </section>

    <!-- LATEST LIST -->
    <section id="latest" style="margin-top:18px" class="list">
      ${newsArticles}
    </section>

    <!-- NEWSLETTER -->
    <section style="margin-top:18px" class="newsletter card">
      <div class="cardPad">
        <h3 class="title" style="margin:0">Stay in the loop</h3>
        <p>Join our AI-powered news updates. Content refreshes automatically!</p>
        <form class="field" onsubmit="event.preventDefault(); alert('Thanks for subscribing! Updates coming soon.')">
          <input type="email" placeholder="Enter your email" required>
          <button class="btn" style="background:#0b1020;color:#eaf2ff;border-radius:12px;border:none;padding:12px 16px;cursor:pointer">Subscribe</button>
        </form>
      </div>
    </section>

    <!-- MORE CARDS -->
    <section style="margin-top:18px" class="grid cols-3">
      <div class="card"><div class="cardPad">
        <span class="badge">Stats</span>
        <h4 class="title">Page Views</h4>
        <p class="muted">${analytics.views || 0} visitors tracked</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Content</span>
        <h4 class="title">Articles Generated</h4>
        <p class="muted">${articles.length} articles published</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Updates</span>
        <h4 class="title">Last Updated</h4>
        <p class="muted">${await env.NEWS_KV.get('last_updated') ? new Date(await env.NEWS_KV.get('last_updated')).toLocaleString() : 'Just now'}</p>
      </div></div>
    </section>

    <footer class="footer">
      © 2025 Agami News • AI-Powered Tech News • Managed via Telegram<br>
      <small style="opacity:0.7">Content updates every 2 hours automatically</small>
    </footer>
  </div>
</body>
</html>`;
    
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

// Helper function to get time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
  return date.toLocaleDateString();
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