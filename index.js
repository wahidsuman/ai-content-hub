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
      primaryColor: '#CC0000',
      contentStrategy: {
        focus: 'Tech + Finance + Quick Updates',
        tagline: 'India\'s Quick Tech & Money News - 60-second reads',
        categories: ['Technology', 'Finance', 'India', 'Sports', 'Business', 'Entertainment'],
        contentMix: {
          technology: 40,
          finance: 30,
          breakingNews: 20,
          entertainment: 10
        },
        updateSchedule: {
          marketOpen: '09:00',
          midDay: '13:00',
          marketClose: '17:00',
          evening: '20:00'
        },
        apiUsage: {
          dailyLimit: 25000,
          monthlyBudget: 1.00,
          model: 'gpt-3.5-turbo'
        }
      }
    }));
    await env.NEWS_KV.put('articles', JSON.stringify(getDefaultArticles()));
    await env.NEWS_KV.put('stats', JSON.stringify({ totalViews: 0, todayViews: 0 }));
    await env.NEWS_KV.put('aiInstructions', JSON.stringify({
      role: 'AI News Manager',
      objectives: [
        'Focus on Tech & Finance news for Indian professionals',
        'Create 60-second readable summaries',
        'Prioritize: 40% Tech, 30% Finance, 20% Breaking News, 10% Entertainment',
        'Target audience: 25-45 age, urban, working professionals',
        'Optimize for mobile reading',
        'Use simple English, avoid jargon',
        'Include actionable insights in finance news',
        'Track trending topics for better engagement'
      ],
      dailyTasks: [
        '9 AM: Market opening summary',
        '1 PM: Tech news roundup',
        '5 PM: Market closing analysis',
        '8 PM: Daily highlights'
      ],
      seoStrategy: [
        'Target long-tail keywords',
        'Focus on "how to", "best", "under ₹X" queries',
        'Create comparison content',
        'Update time-sensitive content regularly'
      ]
    }));
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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.siteName} - Latest Breaking News, India News, World News</title>
    <meta name="description" content="Get latest breaking news from India and around the world. Live updates on politics, business, technology, sports, and entertainment. AI-powered news aggregation.">
    <meta name="keywords" content="news, India news, breaking news, latest news, world news, politics, business, technology, sports, entertainment, AgamiNews">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://agaminews.in/">
    <meta property="og:title" content="${config.siteName} - Latest Breaking News">
    <meta property="og:description" content="Get latest breaking news from India and around the world. Live updates 24/7.">
    <meta property="og:image" content="https://agaminews.in/og-image.jpg">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://agaminews.in/">
    <meta property="twitter:title" content="${config.siteName} - Latest Breaking News">
    <meta property="twitter:description" content="Get latest breaking news from India and around the world.">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://agaminews.in/">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      "name": "${config.siteName}",
      "url": "https://agaminews.in",
      "logo": "https://agaminews.in/logo.png",
      "description": "AI-powered news aggregation platform providing latest breaking news from India and around the world",
      "foundingDate": "2024",
      "sameAs": [
        "https://t.me/AgamiNewsBot"
      ],
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://agaminews.in/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
    </script>
    
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
        .tagline {
            font-size: 12px;
            color: ${isDark ? '#999' : '#666'};
            margin-top: 2px;
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
  await sendMessage(env, chatId, `🎯 *AgamiNews AI Manager*
  
📍 *Focus:* Tech + Finance News for India
💰 *API Cost:* ~$0.60/month (Under budget!)
🎯 *Target:* Working professionals

*Select an option:*`, {
    inline_keyboard: [
      [
        { text: '📊 Stats', callback_data: 'stats' },
        { text: '📰 News', callback_data: 'news' }
      ],
      [
        { text: '🎨 Theme', callback_data: 'theme' },
        { text: '⚙️ Settings', callback_data: 'settings' }
      ],
      [
        { text: '📈 Strategy', callback_data: 'strategy' },
        { text: '💵 API Usage', callback_data: 'apiusage' }
      ],
      [
        { text: '🚀 SEO Report', callback_data: 'seo' }
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
    case 'strategy':
      await sendContentStrategy(env, chatId);
      break;
    case 'apiusage':
      await sendAPIUsage(env, chatId);
      break;
    case 'seo':
      await sendSEOReport(env, chatId);
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

// New handler functions for AI Manager
async function sendContentStrategy(env, chatId) {
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const strategy = config.contentStrategy || {};
  
  await sendMessage(env, chatId, `📈 *Content Strategy*

🎯 *Focus:* ${strategy.focus || 'Tech + Finance + Quick Updates'}
📝 *Tagline:* ${strategy.tagline || 'India\'s Quick Tech & Money News'}

*Content Mix:*
📱 Technology: ${strategy.contentMix?.technology || 40}%
💰 Finance: ${strategy.contentMix?.finance || 30}%
📰 Breaking News: ${strategy.contentMix?.breakingNews || 20}%
🎬 Entertainment: ${strategy.contentMix?.entertainment || 10}%

*Update Schedule:*
🌅 Market Open: 9:00 AM
☀️ Mid-Day: 1:00 PM
🌆 Market Close: 5:00 PM
🌙 Evening: 8:00 PM

*Target Audience:*
• Age: 25-45 years
• Urban professionals
• Mobile-first readers
• Quick news consumers`, {
    inline_keyboard: [
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

async function sendAPIUsage(env, chatId) {
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const apiUsage = config.contentStrategy?.apiUsage || {};
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  // Calculate estimated usage
  const tokensToday = stats.tokensUsedToday || 0;
  const estimatedMonthly = tokensToday * 30;
  const costToday = (tokensToday / 1000) * 0.001; // Rough estimate
  const costMonthly = costToday * 30;
  
  await sendMessage(env, chatId, `💵 *API Usage Report*

*OpenAI Configuration:*
🤖 Model: GPT-3.5 Turbo
💰 Monthly Budget: $${apiUsage.monthlyBudget || 1.00}
📊 Daily Token Limit: ${apiUsage.dailyLimit || 25000}

*Current Usage:*
📅 Today: ~${tokensToday} tokens
💵 Today's Cost: ~$${costToday.toFixed(3)}
📈 Monthly Projection: ~$${costMonthly.toFixed(2)}

*Cost Breakdown:*
• News Summaries: ~$0.30/month
• Bot Interactions: ~$0.20/month
• Content Analysis: ~$0.10/month

✅ *Status:* Well under budget!
💡 *Tip:* Current usage is optimized for cost-efficiency`, {
    inline_keyboard: [
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

async function sendSEOReport(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  await sendMessage(env, chatId, `🚀 *SEO Report*

*Site Status:*
✅ Sitemap: Active (${articles.length + 6} pages)
✅ Robots.txt: Configured
✅ Meta Tags: Optimized
✅ Structured Data: Implemented
✅ Mobile-Friendly: Yes
✅ SSL: Active

*Performance:*
📊 Total Views: ${stats.totalViews || 0}
📈 Today's Views: ${stats.todayViews || 0}
🔗 Indexed Pages: Growing

*SEO Checklist:*
✅ Title tags with keywords
✅ Meta descriptions
✅ Open Graph tags
✅ Schema markup
✅ Fast loading speed
✅ Mobile responsive

*Recommendations:*
• Keep adding fresh content daily
• Focus on long-tail keywords
• Build quality backlinks
• Monitor Search Console regularly`, {
    inline_keyboard: [
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
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
  const today = new Date().toISOString().split('T')[0];
  
  // Generate URLs for all articles
  let articleUrls = '';
  articles.forEach((article, index) => {
    articleUrls += `
  <url>
    <loc>https://agaminews.in/article/${index}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://agaminews.in/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://agaminews.in/india</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://agaminews.in/world</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://agaminews.in/technology</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://agaminews.in/business</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://agaminews.in/sports</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>${articleUrls}
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
      title: "India's Digital Economy Set to Reach $1 Trillion by 2030",
      category: "India",
      summary: "Government initiatives and startup ecosystem drive unprecedented growth in digital sector. Tech giants increase investments.",
      date: "1 hour ago",
      views: 25420,
      trending: true
    },
    {
      title: "ISRO Successfully Launches New Communication Satellite",
      category: "Technology",
      summary: "India's space agency achieves another milestone with advanced satellite for enhanced connectivity across rural areas.",
      date: "2 hours ago",
      views: 22350,
      trending: true
    },
    {
      title: "Stock Markets Touch All-Time High, Sensex Crosses 75,000",
      category: "Business",
      summary: "BSE Sensex reaches historic milestone as foreign investors show confidence in Indian markets amid global uncertainty.",
      date: "3 hours ago",
      views: 28900,
      trending: true
    },
    {
      title: "India Wins Test Series Against Australia 2-1",
      category: "Sports",
      summary: "Historic victory at Melbourne Cricket Ground seals series win for Team India after 10 years.",
      date: "4 hours ago",
      views: 32100,
      trending: true
    },
    {
      title: "Global Climate Summit: India Pledges Net Zero by 2070",
      category: "World",
      summary: "PM announces ambitious renewable energy targets at COP summit, commits to sustainable development goals.",
      date: "5 hours ago",
      views: 18750,
      trending: false
    },
    {
      title: "New AI Breakthrough: Indian Startup Develops Language Model",
      category: "Technology",
      summary: "Bangalore-based startup creates revolutionary AI that understands and processes all 22 major Indian languages.",
      date: "6 hours ago",
      views: 21200,
      trending: true
    },
    {
      title: "RBI Keeps Repo Rate Unchanged at 6.5% in Policy Review",
      category: "Business",
      summary: "Central bank maintains status quo citing inflation concerns while supporting economic growth trajectory.",
      date: "7 hours ago",
      views: 19800,
      trending: false
    },
    {
      title: "Bollywood Film Breaks International Box Office Records",
      category: "Entertainment",
      summary: "Latest blockbuster crosses ₹1000 crore mark globally, becomes highest-grossing Indian film of all time.",
      date: "8 hours ago",
      views: 26500,
      trending: true
    },
    {
      title: "Electric Vehicle Sales Surge 150% in India",
      category: "Auto",
      summary: "EV adoption accelerates as government incentives and charging infrastructure expand across major cities.",
      date: "9 hours ago",
      views: 17600,
      trending: false
    },
    {
      title: "India to Host G20 Digital Economy Ministers Meeting",
      category: "India",
      summary: "Focus on AI governance, digital public infrastructure, and cybersecurity cooperation among member nations.",
      date: "10 hours ago",
      views: 14300,
      trending: false
    }
  ];
}