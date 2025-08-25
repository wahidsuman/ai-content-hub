// PROFESSIONAL NEWS WEBSITE
export async function serveProfessionalWebsite(env) {
  const articles = await env.NEWS_KV.get('articles', 'json') || getDefaultArticles();
  const settings = await env.NEWS_KV.get('settings', 'json') || getDefaultSettings();
  const breakingNews = articles.find(a => a.breaking) || articles[0];
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgamiNews - Breaking News & Live Updates</title>
    <meta name="description" content="Get breaking news and live updates from around the world. Latest coverage of technology, business, politics, and more.">
    <meta name="keywords" content="news, breaking news, latest news, technology, business, world news">
    <meta property="og:title" content="AgamiNews - Breaking News & Live Updates">
    <meta property="og:description" content="24/7 news coverage from around the world">
    <meta property="og:url" content="https://agaminews.in">
    <meta property="og:type" content="website">
    <link rel="canonical" href="https://agaminews.in">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: ${settings.primaryColor || '#CC0000'};
            --bg: ${settings.theme === 'dark' ? '#0A0A0A' : '#FFFFFF'};
            --card: ${settings.theme === 'dark' ? '#1A1A1A' : '#F8F8F8'};
            --text: ${settings.theme === 'dark' ? '#FFFFFF' : '#000000'};
            --text-secondary: ${settings.theme === 'dark' ? '#A0A0A0' : '#666666'};
            --border: ${settings.theme === 'dark' ? '#2A2A2A' : '#E0E0E0'};
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }
        
        .header {
            background: var(--card);
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 900;
            background: linear-gradient(135deg, var(--primary), var(--text));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .live-badge {
            background: var(--primary);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .nav {
            background: var(--card);
            border-bottom: 1px solid var(--border);
            overflow-x: auto;
        }
        
        .nav-items {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            gap: 0;
        }
        
        .nav-item {
            padding: 12px 20px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
            border-bottom: 3px solid transparent;
            white-space: nowrap;
        }
        
        .nav-item:hover, .nav-item.active {
            color: var(--text);
            background: rgba(255,255,255,0.05);
            border-bottom-color: var(--primary);
        }
        
        .breaking-news {
            background: linear-gradient(90deg, var(--primary), #FF0000);
            color: white;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            overflow: hidden;
        }
        
        .breaking-label {
            background: white;
            color: var(--primary);
            padding: 3px 10px;
            border-radius: 3px;
            font-weight: 700;
            font-size: 11px;
        }
        
        .breaking-text {
            animation: scroll 20s linear infinite;
            white-space: nowrap;
        }
        
        @keyframes scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .hero-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 40px;
        }
        
        @media (min-width: 768px) {
            .hero-grid { grid-template-columns: 2fr 1fr; }
        }
        
        .hero-main {
            background: var(--card);
            border-radius: 12px;
            overflow: hidden;
            min-height: 400px;
            position: relative;
            background-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        }
        
        .hero-content {
            position: absolute;
            bottom: 0;
            padding: 30px;
            color: white;
        }
        
        .hero-category {
            background: var(--primary);
            display: inline-block;
            padding: 5px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .hero-title {
            font-size: clamp(24px, 4vw, 36px);
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 15px;
        }
        
        .hero-meta {
            display: flex;
            gap: 20px;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .sidebar-item {
            background: var(--card);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border);
            transition: all 0.3s;
        }
        
        .sidebar-item:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
        }
        
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
            margin: 40px 0;
        }
        
        .news-card {
            background: var(--card);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border);
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .news-image {
            height: 180px;
            background: linear-gradient(135deg, var(--border), var(--card));
        }
        
        .news-content {
            padding: 20px;
        }
        
        .news-category {
            color: var(--primary);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        
        .news-title {
            font-size: 18px;
            font-weight: 600;
            line-height: 1.3;
            margin-bottom: 10px;
            color: var(--text);
        }
        
        .news-summary {
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 15px;
        }
        
        .news-footer {
            display: flex;
            justify-content: space-between;
            padding-top: 15px;
            border-top: 1px solid var(--border);
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .cta {
            background: linear-gradient(135deg, var(--primary), #FF0000);
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
            color: white;
        }
        
        .cta-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .cta-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 25px;
        }
        
        .cta-button {
            padding: 12px 30px;
            background: white;
            color: var(--primary);
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
            .header-content { padding: 10px 15px; }
            .logo { font-size: 24px; }
            .container { padding: 15px; }
            .news-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo">AGAMINEWS</div>
            <div class="live-badge">● LIVE</div>
        </div>
    </header>
    
    <nav class="nav">
        <div class="nav-items">
            <a href="#" class="nav-item active">Home</a>
            <a href="#" class="nav-item">World</a>
            <a href="#" class="nav-item">Politics</a>
            <a href="#" class="nav-item">Business</a>
            <a href="#" class="nav-item">Technology</a>
            <a href="#" class="nav-item">Science</a>
            <a href="#" class="nav-item">Health</a>
            <a href="#" class="nav-item">Sports</a>
        </div>
    </nav>
    
    <div class="breaking-news">
        <span class="breaking-label">BREAKING</span>
        <span class="breaking-text">${breakingNews.title} • Live updates...</span>
    </div>
    
    <div class="container">
        <div class="hero-grid">
            <div class="hero-main">
                <div class="hero-content">
                    <span class="hero-category">${breakingNews.category}</span>
                    <h1 class="hero-title">${breakingNews.title}</h1>
                    <p>${breakingNews.summary}</p>
                    <div class="hero-meta">
                        <span>🕒 ${breakingNews.date}</span>
                        <span>👁️ ${breakingNews.views} views</span>
                        <span>📊 Trending #1</span>
                    </div>
                </div>
            </div>
            
            <div class="sidebar">
                ${articles.slice(1, 4).map((story, i) => `
                    <div class="sidebar-item">
                        <div style="color: var(--primary); font-size: 24px; font-weight: 900;">0${i+1}</div>
                        <div style="font-weight: 600; margin: 10px 0;">${story.title}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${story.category} • ${story.date}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <h2 style="font-size: 24px; margin: 40px 0 20px;">Latest News</h2>
        
        <div class="news-grid">
            ${articles.map(article => `
                <article class="news-card">
                    <div class="news-image"></div>
                    <div class="news-content">
                        <div class="news-category">${article.category}</div>
                        <h3 class="news-title">${article.title}</h3>
                        <p class="news-summary">${article.summary.substring(0, 100)}...</p>
                        <div class="news-footer">
                            <span>🕒 ${article.date}</span>
                            <span>👁️ ${article.views || 0}</span>
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>
        
        <div class="cta">
            <h2 class="cta-title">📱 Never Miss Breaking News</h2>
            <p>Get instant updates on Telegram with AI-powered curation</p>
            <div class="cta-buttons">
                <a href="https://t.me/agaminews_manager_bot" class="cta-button">💬 Join Telegram</a>
                <a href="/api/stats" class="cta-button" style="background: transparent; border: 2px solid white; color: white;">📊 View Stats</a>
            </div>
        </div>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

function getDefaultArticles() {
  return [
    {
      title: "AI Revolution: ChatGPT Reaches 200 Million Users Milestone",
      category: "Technology",
      summary: "OpenAI's ChatGPT has reached 200 million weekly active users, doubling its user base in just six months. The rapid growth showcases AI adoption.",
      date: "2 hours ago",
      views: 15420,
      breaking: true
    },
    {
      title: "Federal Reserve Signals Potential Rate Cuts in 2024",
      category: "Business",
      summary: "The Federal Reserve indicated possible interest rate cuts as inflation shows signs of cooling. Markets rallied on the news.",
      date: "3 hours ago",
      views: 12890
    },
    {
      title: "Climate Summit: $100 Billion Pledged for Green Energy",
      category: "Environment",
      summary: "World leaders pledge massive funding for renewable energy projects in developing nations.",
      date: "4 hours ago",
      views: 9756
    },
    {
      title: "SpaceX Launches Revolutionary Satellite Network",
      category: "Science",
      summary: "SpaceX deploys next-generation satellites for global internet coverage.",
      date: "5 hours ago",
      views: 8623
    },
    {
      title: "Breakthrough: New Cancer Treatment Shows 90% Success",
      category: "Health",
      summary: "Scientists announce breakthrough in personalized mRNA cancer vaccines.",
      date: "6 hours ago",
      views: 11234
    }
  ];
}

function getDefaultSettings() {
  return {
    theme: 'dark',
    primaryColor: '#CC0000',
    layout: 'grid',
    font: 'system'
  };
}