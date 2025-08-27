// AGAMINEWS - COMPLETE AUTOMATED SYSTEM
// Single file for easy management and deployment

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Initialize on first run
    await initializeSystem(env);
    
    // Route handling
    if (url.pathname === '/telegram') {
      return handleTelegram(request, env);
    } else if (url.pathname === '/setup') {
      return setupWebhook(env, url.origin);
    } else if (url.pathname === '/sitemap.xml') {
      return generateSitemap(env);
    } else if (url.pathname === '/robots.txt') {
      return new Response(`User-agent: *\nAllow: /\nSitemap: https://agaminews.in/sitemap.xml`, {
        headers: { 'Content-Type': 'text/plain' }
      });
    } else if (url.pathname === '/debug') {
      return debugInfo(env);
    } else if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url.pathname);
    }
    
    return serveWebsite(env);
  },
  
  async scheduled(event, env) {
    await runScheduledTasks(env);
  }
};

// Initialize system
async function initializeSystem(env) {
  const initialized = await env.NEWS_KV.get('initialized');
  if (!initialized) {
    await env.NEWS_KV.put('config', JSON.stringify({
      siteName: 'AgamiNews',
      theme: 'dark',
      primaryColor: '#CC0000'
    }));
    await env.NEWS_KV.put('articles', JSON.stringify(getDefaultArticles()));
    await env.NEWS_KV.put('stats', JSON.stringify({ totalViews: 0, todayViews: 0 }));
    await env.NEWS_KV.put('initialized', 'true');
  }
}

// Serve website
async function serveWebsite(env) {
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || getDefaultArticles();
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  // Update stats
  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.todayViews = (stats.todayViews || 0) + 1;
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
  
  const isDark = config.theme === 'dark';
  
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.siteName} - AI-Powered News</title>
    <meta name="description" content="Latest news and updates powered by AI">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${isDark ? '#0A0A0A' : '#FFF'};
            color: ${isDark ? '#FFF' : '#000'};
            line-height: 1.6;
        }
        .header {
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            padding: 20px;
            border-bottom: 2px solid ${config.primaryColor};
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 900;
            color: ${config.primaryColor};
        }
        .live {
            background: ${config.primaryColor};
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .stats-bar {
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: ${config.primaryColor};
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.7;
            text-transform: uppercase;
        }
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .news-card {
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            border-radius: 10px;
            padding: 20px;
            border: 1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'};
            transition: transform 0.3s;
        }
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .news-category {
            color: ${config.primaryColor};
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .news-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            line-height: 1.3;
        }
        .news-summary {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 15px;
        }
        .news-meta {
            font-size: 12px;
            opacity: 0.6;
            display: flex;
            justify-content: space-between;
        }
        .cta {
            background: linear-gradient(135deg, ${config.primaryColor}, #FF0000);
            color: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            margin: 40px 0;
        }
        .cta h2 {
            font-size: 32px;
            margin-bottom: 15px;
        }
        .cta-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 25px;
        }
        .btn {
            padding: 12px 30px;
            background: white;
            color: ${config.primaryColor};
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.3s;
        }
        .btn:hover {
            transform: scale(1.05);
        }
        @media (max-width: 768px) {
            .news-grid { grid-template-columns: 1fr; }
            .stats-bar { grid-template-columns: repeat(2, 1fr); }
            .cta-buttons { flex-direction: column; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo">${config.siteName}</div>
            <div class="live">● LIVE</div>
        </div>
    </header>
    
    <div class="container">
        <div class="stats-bar">
            <div class="stat">
                <div class="stat-value">${articles.length}</div>
                <div class="stat-label">Articles</div>
            </div>
            <div class="stat">
                <div class="stat-value">${stats.totalViews}</div>
                <div class="stat-label">Total Views</div>
            </div>
            <div class="stat">
                <div class="stat-value">${stats.todayViews}</div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat">
                <div class="stat-value">${articles.filter(a => a.trending).length}</div>
                <div class="stat-label">Trending</div>
            </div>
        </div>
        
        <h2 style="margin: 30px 0 20px; font-size: 28px;">Latest News</h2>
        
        <div class="news-grid">
            ${articles.map(article => `
                <div class="news-card">
                    <div class="news-category">${article.category}</div>
                    <div class="news-title">${article.title}</div>
                    <div class="news-summary">${article.summary.substring(0, 120)}...</div>
                    <div class="news-meta">
                        <span>🕒 ${article.date || 'Today'}</span>
                        <span>👁️ ${article.views || 0}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="cta">
            <h2>📱 Never Miss Breaking News</h2>
            <p>Get instant updates on Telegram with AI-powered curation</p>
            <div class="cta-buttons">
                <a href="${config.telegramBot || '#'}" class="btn">💬 Join Telegram</a>
                <a href="/api/stats" class="btn" style="background: transparent; border: 2px solid white; color: white;">📊 View Stats</a>
            </div>
        </div>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

// Telegram handler
async function handleTelegram(request, env) {
  try {
    // Check if token exists
    if (!env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      return new Response('Token not configured', { status: 500 });
    }
    
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // Save admin chat ID
      if (!await env.NEWS_KV.get('admin_chat')) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
      }
      
      // Handle commands
      if (text === '/start') {
        await sendMessage(env, chatId, `
🎉 *Welcome to AgamiNews Manager!*

I'm your AI website manager with:
📊 Performance tracking
🎨 Design control  
📰 Content management
🤖 AI features

Commands:
/menu - Main menu
/stats - View statistics
/help - Get help

Or just talk naturally!
        `, {
          inline_keyboard: [
            [{ text: '📊 Stats', callback_data: 'stats' }],
            [{ text: '⚙️ Settings', callback_data: 'settings' }]
          ]
        });
      } else if (text === '/menu') {
        await sendMenu(env, chatId);
      } else if (text === '/stats') {
        await sendStats(env, chatId);
      } else {
        await handleNaturalLanguage(env, chatId, text);
      }
    } else if (update.callback_query) {
      await handleCallback(env, update.callback_query);
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram error:', error);
    return new Response('OK');
  }
}

async function sendMessage(env, chatId, text, keyboard = null) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard.inline_keyboard } : undefined
  };
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendMenu(env, chatId) {
  await sendMessage(env, chatId, '🎯 *Main Menu*', {
    inline_keyboard: [
      [
        { text: '📊 Stats', callback_data: 'stats' },
        { text: '📰 News', callback_data: 'news' }
      ],
      [
        { text: '🎨 Theme', callback_data: 'theme' },
        { text: '⚙️ Settings', callback_data: 'settings' }
      ]
    ]
  });
}

async function sendStats(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  await sendMessage(env, chatId, `
📊 *Performance Report*

Views: ${stats.totalViews || 0}
Today: ${stats.todayViews || 0}
Articles: ${articles.length}
Trending: ${articles.filter(a => a.trending).length}
  `, {
    inline_keyboard: [
      [{ text: '🔄 Refresh', callback_data: 'stats' }],
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

async function handleNaturalLanguage(env, chatId, text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('stats') || lower.includes('performance')) {
    await sendStats(env, chatId);
  } else if (lower.includes('theme') || lower.includes('dark') || lower.includes('light')) {
    await handleThemeChange(env, chatId, text);
  } else {
    await sendMessage(env, chatId, `I understand: "${text}"\n\nTry /menu for options!`);
  }
}

async function handleThemeChange(env, chatId, text) {
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const isDark = text.toLowerCase().includes('dark');
  
  config.theme = isDark ? 'dark' : 'light';
  await env.NEWS_KV.put('config', JSON.stringify(config));
  
  await sendMessage(env, chatId, `✅ Theme changed to ${config.theme}!`);
}

async function handleCallback(env, query) {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  // Answer callback
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id })
  });
  
  switch(data) {
    case 'menu':
      await sendMenu(env, chatId);
      break;
    case 'stats':
      await sendStats(env, chatId);
      break;
    case 'theme':
      await sendMessage(env, chatId, 'Choose theme:', {
        inline_keyboard: [
          [
            { text: '🌙 Dark', callback_data: 'theme_dark' },
            { text: '☀️ Light', callback_data: 'theme_light' }
          ],
          [{ text: '↩️ Back', callback_data: 'menu' }]
        ]
      });
      break;
    case 'theme_dark':
    case 'theme_light':
      const theme = data.split('_')[1];
      const config = await env.NEWS_KV.get('config', 'json') || {};
      config.theme = theme;
      await env.NEWS_KV.put('config', JSON.stringify(config));
      await sendMessage(env, chatId, `✅ Theme changed to ${theme}!`);
      break;
    default:
      await sendMessage(env, chatId, 'Processing...');
  }
}

// Debug info
async function debugInfo(env) {
  const hasToken = !!env.TELEGRAM_BOT_TOKEN;
  const tokenLength = env.TELEGRAM_BOT_TOKEN ? env.TELEGRAM_BOT_TOKEN.length : 0;
  const hasKV = !!env.NEWS_KV;
  
  return new Response(JSON.stringify({
    status: 'debug',
    telegram_token_configured: hasToken,
    token_length: tokenLength,
    kv_configured: hasKV,
    environment: {
      worker_url: env.WORKER_URL || 'not set'
    }
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Setup webhook
async function setupWebhook(env, origin) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return new Response('Set TELEGRAM_BOT_TOKEN first', { status: 400 });
  }
  
  const webhookUrl = `${origin}/telegram`;
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;
  
  const response = await fetch(url);
  const result = await response.json();
  
  return new Response(JSON.stringify({
    success: result.ok,
    webhook: webhookUrl,
    result
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Generate sitemap
async function generateSitemap(env) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://agaminews.in/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' }
  });
}

// API handler
async function handleAPI(request, env, pathname) {
  if (pathname === '/api/stats') {
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (pathname === '/api/config') {
    const config = await env.NEWS_KV.get('config', 'json') || {};
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not found', { status: 404 });
}

// Scheduled tasks
async function runScheduledTasks(env) {
  // Daily tasks
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  stats.todayViews = 0; // Reset daily views
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
}

// Default articles
function getDefaultArticles() {
  return [
    {
      title: "AI Revolution: ChatGPT Reaches 200 Million Users",
      category: "Technology",
      summary: "OpenAI's ChatGPT has reached 200 million weekly active users, doubling its user base in just six months.",
      date: "2 hours ago",
      views: 15420,
      trending: true
    },
    {
      title: "Federal Reserve Signals Rate Cuts in 2024",
      category: "Business",
      summary: "The Federal Reserve indicated possible rate cuts as inflation shows signs of cooling.",
      date: "3 hours ago",
      views: 12890,
      trending: true
    },
    {
      title: "Climate Summit: $100B for Green Energy",
      category: "Environment",
      summary: "World leaders pledge massive funding for renewable energy projects.",
      date: "4 hours ago",
      views: 9756,
      trending: false
    }
  ];
}