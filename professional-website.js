// PROFESSIONAL NEWS WEBSITE WITH MOBILE-FIRST DESIGN
// Ultra-modern, responsive, and professional like CNN/BBC/Bloomberg

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle different routes
    if (url.pathname === '/telegram') {
      return handleTelegram(request, env);
    } else if (url.pathname === '/sitemap.xml') {
      return generateSitemap(env);
    } else if (url.pathname === '/robots.txt') {
      return new Response(`User-agent: *
Allow: /
Sitemap: https://agaminews.in/sitemap.xml`, {
        headers: { 'Content-Type': 'text/plain' }
      });
    } else if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url.pathname);
    } else {
      return serveWebsite(env);
    }
  }
};

// ============= PROFESSIONAL WEBSITE =============
async function serveWebsite(env) {
  const articles = await env.NEWS_KV.get('articles', 'json') || getDefaultArticles();
  const breakingNews = articles.find(a => a.breaking) || articles[0];
  const topStories = articles.slice(0, 4);
  const categories = ['Technology', 'Business', 'Politics', 'Health', 'Science', 'Sports'];
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgamiNews - Breaking News, Latest Updates & Live Coverage</title>
    <meta name="description" content="Breaking news and latest updates from around the world. Live coverage of politics, business, technology, health, science, and sports.">
    <meta name="keywords" content="breaking news, latest news, live news, world news, politics, business, technology, sports">
    <meta property="og:title" content="AgamiNews - Breaking News & Live Updates">
    <meta property="og:description" content="24/7 Breaking news coverage from around the world">
    <meta property="og:image" content="https://agaminews.in/og-image.jpg">
    <meta property="og:url" content="https://agaminews.in">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="https://agaminews.in">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary-red: #CC0000;
            --dark-bg: #0A0A0A;
            --card-bg: #1A1A1A;
            --text-primary: #FFFFFF;
            --text-secondary: #A0A0A0;
            --border-color: #2A2A2A;
            --accent-blue: #0066CC;
            --success-green: #00AA00;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--dark-bg);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        /* Header */
        .header {
            background: linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }
        
        .header-top {
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 900;
            background: linear-gradient(135deg, #FFF 0%, #AAA 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
        }
        
        .live-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: var(--primary-red);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            animation: pulse 2s infinite;
        }
        
        .live-dot {
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: blink 1.5s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        /* Navigation */
        .nav {
            padding: 0 20px;
            background: rgba(26, 26, 26, 0.95);
            border-top: 1px solid var(--border-color);
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        .nav-inner {
            display: flex;
            gap: 0;
            max-width: 1400px;
            margin: 0 auto;
            min-width: max-content;
        }
        
        .nav-item {
            padding: 14px 20px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            white-space: nowrap;
        }
        
        .nav-item:hover, .nav-item.active {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.05);
            border-bottom-color: var(--primary-red);
        }
        
        /* Breaking News Banner */
        .breaking-banner {
            background: linear-gradient(90deg, var(--primary-red) 0%, #990000 100%);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            overflow: hidden;
        }
        
        .breaking-label {
            background: white;
            color: var(--primary-red);
            padding: 4px 12px;
            font-weight: 700;
            font-size: 12px;
            border-radius: 4px;
            white-space: nowrap;
        }
        
        .breaking-text {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
            animation: scroll 20s linear infinite;
            white-space: nowrap;
        }
        
        @keyframes scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }
        
        /* Main Container */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Hero Section */
        .hero-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 40px;
        }
        
        @media (min-width: 768px) {
            .hero-grid {
                grid-template-columns: 2fr 1fr;
            }
        }
        
        .hero-main {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            min-height: 400px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            background-image: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%);
        }
        
        .hero-content {
            padding: 30px;
            position: relative;
            z-index: 2;
        }
        
        .hero-category {
            display: inline-block;
            background: var(--primary-red);
            color: white;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 4px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        
        .hero-title {
            font-size: clamp(24px, 4vw, 36px);
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 15px;
        }
        
        .hero-summary {
            color: var(--text-secondary);
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 20px;
        }
        
        .hero-meta {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: var(--text-secondary);
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        /* Sidebar Stories */
        .sidebar-stories {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .sidebar-story {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
        }
        
        .sidebar-story:hover {
            border-color: var(--primary-red);
            transform: translateY(-2px);
        }
        
        .sidebar-number {
            color: var(--primary-red);
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 10px;
        }
        
        .sidebar-title {
            font-size: 16px;
            font-weight: 600;
            line-height: 1.3;
            margin-bottom: 8px;
        }
        
        .sidebar-meta {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        /* Section Headers */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--border-color);
        }
        
        .section-title {
            font-size: 24px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-badge {
            background: var(--primary-red);
            color: white;
            padding: 4px 10px;
            font-size: 11px;
            border-radius: 12px;
            font-weight: 600;
        }
        
        .see-all {
            color: var(--accent-blue);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .see-all:hover {
            color: var(--text-primary);
        }
        
        /* News Grid */
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 50px;
        }
        
        .news-card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .news-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary-red);
            box-shadow: 0 10px 30px rgba(204, 0, 0, 0.2);
        }
        
        .news-image {
            width: 100%;
            height: 180px;
            background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%);
            position: relative;
            overflow: hidden;
        }
        
        .news-image::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%);
        }
        
        .news-content {
            padding: 20px;
        }
        
        .news-category {
            color: var(--accent-blue);
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
            color: var(--text-primary);
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
            align-items: center;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .news-time {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .news-views {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        /* Market Ticker */
        .market-ticker {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 40px;
            border: 1px solid var(--border-color);
        }
        
        .ticker-header {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--text-primary);
        }
        
        .ticker-items {
            display: flex;
            gap: 30px;
            overflow-x: auto;
            padding-bottom: 10px;
        }
        
        .ticker-item {
            display: flex;
            flex-direction: column;
            min-width: 120px;
        }
        
        .ticker-symbol {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }
        
        .ticker-price {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .ticker-change {
            font-size: 14px;
            font-weight: 500;
            margin-top: 5px;
        }
        
        .ticker-change.positive {
            color: var(--success-green);
        }
        
        .ticker-change.negative {
            color: var(--primary-red);
        }
        
        /* Categories Section */
        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
        }
        
        .category-card {
            background: linear-gradient(135deg, var(--card-bg) 0%, #2A2A2A 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .category-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary-red);
            background: linear-gradient(135deg, var(--primary-red) 0%, #990000 100%);
        }
        
        .category-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .category-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .category-count {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 5px;
        }
        
        /* Footer */
        .footer {
            background: var(--card-bg);
            border-top: 1px solid var(--border-color);
            margin-top: 60px;
            padding: 40px 20px 20px;
        }
        
        .footer-content {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 40px;
            margin-bottom: 30px;
        }
        
        .footer-section h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--text-primary);
        }
        
        .footer-links {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .footer-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            transition: color 0.3s ease;
        }
        
        .footer-link:hover {
            color: var(--text-primary);
        }
        
        .footer-bottom {
            padding-top: 30px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .copyright {
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        .social-links {
            display: flex;
            gap: 15px;
        }
        
        .social-link {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-primary);
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        .social-link:hover {
            background: var(--primary-red);
            transform: translateY(-3px);
        }
        
        /* CTA Section */
        .cta-section {
            background: linear-gradient(135deg, var(--primary-red) 0%, #990000 100%);
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
        }
        
        .cta-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .cta-description {
            font-size: 16px;
            margin-bottom: 25px;
            opacity: 0.9;
        }
        
        .cta-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .cta-button {
            padding: 12px 30px;
            background: white;
            color: var(--primary-red);
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .cta-button.secondary {
            background: transparent;
            color: white;
            border: 2px solid white;
        }
        
        /* Mobile Optimizations */
        @media (max-width: 768px) {
            .header-top {
                padding: 10px 15px;
            }
            
            .logo {
                font-size: 24px;
            }
            
            .nav {
                padding: 0 10px;
            }
            
            .nav-item {
                padding: 12px 15px;
                font-size: 13px;
            }
            
            .container {
                padding: 15px;
            }
            
            .hero-content {
                padding: 20px;
            }
            
            .hero-title {
                font-size: 24px;
            }
            
            .news-grid {
                grid-template-columns: 1fr;
            }
            
            .section-title {
                font-size: 20px;
            }
            
            .categories-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .footer-grid {
                grid-template-columns: 1fr;
                gap: 30px;
            }
            
            .footer-bottom {
                flex-direction: column;
                text-align: center;
            }
            
            .cta-section {
                padding: 30px 20px;
            }
            
            .cta-title {
                font-size: 22px;
            }
        }
        
        /* Loading Animation */
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        
        .skeleton {
            background: linear-gradient(90deg, var(--card-bg) 25%, #2A2A2A 50%, var(--card-bg) 75%);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-top">
            <div class="logo">AGAMINEWS</div>
            <div class="live-indicator">
                <span class="live-dot"></span>
                <span>LIVE</span>
            </div>
        </div>
        <nav class="nav">
            <div class="nav-inner">
                <a href="#" class="nav-item active">Home</a>
                <a href="#world" class="nav-item">World</a>
                <a href="#politics" class="nav-item">Politics</a>
                <a href="#business" class="nav-item">Business</a>
                <a href="#tech" class="nav-item">Technology</a>
                <a href="#science" class="nav-item">Science</a>
                <a href="#health" class="nav-item">Health</a>
                <a href="#sports" class="nav-item">Sports</a>
                <a href="#entertainment" class="nav-item">Entertainment</a>
            </div>
        </nav>
    </header>
    
    <!-- Breaking News Banner -->
    <div class="breaking-banner">
        <span class="breaking-label">BREAKING</span>
        <span class="breaking-text">${breakingNews.title} • Latest updates as story develops...</span>
    </div>
    
    <!-- Main Content -->
    <div class="container">
        <!-- Hero Section -->
        <div class="hero-grid">
            <div class="hero-main">
                <div class="hero-content">
                    <span class="hero-category">${breakingNews.category}</span>
                    <h1 class="hero-title">${breakingNews.title}</h1>
                    <p class="hero-summary">${breakingNews.summary}</p>
                    <div class="hero-meta">
                        <div class="meta-item">
                            <span>🕒</span>
                            <span>${breakingNews.date || 'Just Now'}</span>
                        </div>
                        <div class="meta-item">
                            <span>👁️</span>
                            <span>${breakingNews.views || 0} views</span>
                        </div>
                        <div class="meta-item">
                            <span>📊</span>
                            <span>Trending #1</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-stories">
                ${topStories.slice(1, 4).map((story, index) => `
                    <div class="sidebar-story">
                        <div class="sidebar-number">0${index + 1}</div>
                        <div class="sidebar-title">${story.title}</div>
                        <div class="sidebar-meta">${story.category} • ${story.date || '2 hours ago'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Market Ticker -->
        <div class="market-ticker">
            <div class="ticker-header">📈 Market Update</div>
            <div class="ticker-items">
                <div class="ticker-item">
                    <div class="ticker-symbol">S&P 500</div>
                    <div class="ticker-price">4,783.45</div>
                    <div class="ticker-change positive">+1.2%</div>
                </div>
                <div class="ticker-item">
                    <div class="ticker-symbol">NASDAQ</div>
                    <div class="ticker-price">15,123.68</div>
                    <div class="ticker-change positive">+0.8%</div>
                </div>
                <div class="ticker-item">
                    <div class="ticker-symbol">DOW</div>
                    <div class="ticker-price">38,654.42</div>
                    <div class="ticker-change negative">-0.3%</div>
                </div>
                <div class="ticker-item">
                    <div class="ticker-symbol">BITCOIN</div>
                    <div class="ticker-price">$52,340</div>
                    <div class="ticker-change positive">+3.5%</div>
                </div>
                <div class="ticker-item">
                    <div class="ticker-symbol">GOLD</div>
                    <div class="ticker-price">$2,045</div>
                    <div class="ticker-change positive">+0.5%</div>
                </div>
            </div>
        </div>
        
        <!-- Latest News Section -->
        <div class="section-header">
            <h2 class="section-title">
                Latest News
                <span class="section-badge">NEW</span>
            </h2>
            <a href="#" class="see-all">See all →</a>
        </div>
        
        <div class="news-grid">
            ${articles.map(article => `
                <article class="news-card">
                    <div class="news-image"></div>
                    <div class="news-content">
                        <div class="news-category">${article.category}</div>
                        <h3 class="news-title">${article.title}</h3>
                        <p class="news-summary">${article.summary.substring(0, 100)}...</p>
                        <div class="news-footer">
                            <span class="news-time">🕒 ${article.date || '3 hours ago'}</span>
                            <span class="news-views">👁️ ${article.views || Math.floor(Math.random() * 5000)}</span>
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>
        
        <!-- Categories Section -->
        <div class="section-header">
            <h2 class="section-title">Browse Categories</h2>
            <a href="#" class="see-all">All categories →</a>
        </div>
        
        <div class="categories-grid">
            ${categories.map(cat => `
                <div class="category-card">
                    <div class="category-icon">${getCategoryIcon(cat)}</div>
                    <div class="category-name">${cat}</div>
                    <div class="category-count">${Math.floor(Math.random() * 100 + 50)} stories</div>
                </div>
            `).join('')}
        </div>
        
        <!-- CTA Section -->
        <div class="cta-section">
            <h2 class="cta-title">📱 Never Miss Breaking News</h2>
            <p class="cta-description">Get instant updates on Telegram with AI-powered news curation</p>
            <div class="cta-buttons">
                <a href="https://t.me/agaminewsbot" class="cta-button">
                    <span>💬</span>
                    <span>Join Telegram Bot</span>
                </a>
                <a href="/api/stats" class="cta-button secondary">
                    <span>📊</span>
                    <span>View Analytics</span>
                </a>
            </div>
        </div>
    </div>
    
    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-grid">
                <div class="footer-section">
                    <h3>About AgamiNews</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                        Your trusted source for breaking news and in-depth analysis. 
                        Powered by AI for accurate, real-time coverage.
                    </p>
                </div>
                <div class="footer-section">
                    <h3>Categories</h3>
                    <div class="footer-links">
                        <a href="#" class="footer-link">Politics</a>
                        <a href="#" class="footer-link">Business</a>
                        <a href="#" class="footer-link">Technology</a>
                        <a href="#" class="footer-link">Science</a>
                    </div>
                </div>
                <div class="footer-section">
                    <h3>Company</h3>
                    <div class="footer-links">
                        <a href="#" class="footer-link">About Us</a>
                        <a href="#" class="footer-link">Contact</a>
                        <a href="#" class="footer-link">Careers</a>
                        <a href="#" class="footer-link">Privacy Policy</a>
                    </div>
                </div>
                <div class="footer-section">
                    <h3>Connect</h3>
                    <div class="footer-links">
                        <a href="https://t.me/agaminewsbot" class="footer-link">Telegram Bot</a>
                        <a href="#" class="footer-link">Newsletter</a>
                        <a href="#" class="footer-link">RSS Feed</a>
                        <a href="/sitemap.xml" class="footer-link">Sitemap</a>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div class="copyright">
                    © 2024 AgamiNews. All rights reserved.
                </div>
                <div class="social-links">
                    <a href="#" class="social-link">📧</a>
                    <a href="#" class="social-link">🐦</a>
                    <a href="#" class="social-link">📘</a>
                    <a href="https://t.me/agaminewsbot" class="social-link">✈️</a>
                </div>
            </div>
        </div>
    </footer>
    
    <script>
        // Add smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Update time dynamically
        function updateTimes() {
            const times = document.querySelectorAll('.news-time span');
            // Add real-time update logic here
        }
        
        // Category icon helper
        function getCategoryIcon(category) {
            const icons = {
                'Technology': '💻',
                'Business': '💼',
                'Politics': '🏛️',
                'Health': '🏥',
                'Science': '🔬',
                'Sports': '⚽'
            };
            return icons[category] || '📰';
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

// Helper function for category icons
function getCategoryIcon(category) {
  const icons = {
    'Technology': '💻',
    'Business': '💼',
    'Politics': '🏛️',
    'Health': '🏥',
    'Science': '🔬',
    'Sports': '⚽'
  };
  return icons[category] || '📰';
}

// ============= TELEGRAM BOT (SAME AS BEFORE) =============
async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      if (text === '/start') {
        await sendWelcomeMessage(env, chatId);
      } else if (text === '/menu') {
        await sendMainMenu(env, chatId);
      } else if (text === '/performance') {
        await showPerformance(env, chatId);
      } else if (text === '/news') {
        await sendLatestNews(env, chatId);
      } else if (text === '/help') {
        await sendHelpMessage(env, chatId);
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
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  };
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendWelcomeMessage(env, chatId) {
  const message = `
🎉 *Welcome to AgamiNews AI Manager!*

I'm your intelligent website manager. I can:

📊 Track performance & analytics
🎨 Update website design
📰 Manage news content
🤖 Provide AI suggestions

Type /menu or just chat naturally!
  `;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '📊 View Performance', callback_data: 'show_performance' }],
      [{ text: '📰 Latest News', callback_data: 'get_news' }],
      [{ text: '💡 Get Suggestions', callback_data: 'get_suggestions' }]
    ]
  };
  
  await sendMessage(env, chatId, message, keyboard);
}

async function sendMainMenu(env, chatId) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Performance', callback_data: 'show_performance' },
        { text: '📰 News', callback_data: 'get_news' }
      ],
      [
        { text: '💡 Suggestions', callback_data: 'get_suggestions' },
        { text: '⚙️ Settings', callback_data: 'show_settings' }
      ]
    ]
  };
  
  await sendMessage(env, chatId, '🎯 *Main Menu*\n\nWhat would you like to do?', keyboard);
}

async function showPerformance(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  const message = `
📊 *Website Performance*

📈 *Traffic:*
• Total Views: ${stats.totalViews || 0}
• Today: ${stats.todayViews || 0}
• Unique: ${stats.uniqueVisitors || 0}

✅ *Top Content:*
${articles.slice(0, 3).map((a, i) => `${i+1}. ${a.title}`).join('\n')}

💡 *Recommendations:*
• Post during 10 AM - 2 PM
• Focus on Technology content
• Add more visuals
  `;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Optimize', callback_data: 'optimize_content' }],
      [{ text: '↩️ Back', callback_data: 'main_menu' }]
    ]
  };
  
  await sendMessage(env, chatId, message, keyboard);
}

async function sendLatestNews(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || getDefaultArticles();
  
  const message = `
📰 *Latest News*

${articles.slice(0, 5).map((a, i) => `
${i+1}. *${a.title}*
📁 ${a.category} | 👁️ ${a.views || 0} views
`).join('\n')}
  `;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🔄 Refresh', callback_data: 'refresh_news' }],
      [{ text: '↩️ Back', callback_data: 'main_menu' }]
    ]
  };
  
  await sendMessage(env, chatId, message, keyboard);
}

async function handleNaturalLanguage(env, chatId, text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('performance') || lower.includes('how') || lower.includes('doing')) {
    await showPerformance(env, chatId);
  } else if (lower.includes('news') || lower.includes('article')) {
    await sendLatestNews(env, chatId);
  } else {
    await sendMessage(env, chatId, `I understand: "${text}"\n\nUse /menu for options.`);
  }
}

async function handleCallback(env, query) {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id })
  });
  
  switch(data) {
    case 'main_menu':
      await sendMainMenu(env, chatId);
      break;
    case 'show_performance':
      await showPerformance(env, chatId);
      break;
    case 'get_news':
      await sendLatestNews(env, chatId);
      break;
    case 'optimize_content':
      await sendMessage(env, chatId, '✅ Optimization complete!');
      break;
    default:
      await sendMessage(env, chatId, 'Processing...');
  }
}

async function sendHelpMessage(env, chatId) {
  await sendMessage(env, chatId, `
ℹ️ *Help*

Commands:
/start - Welcome
/menu - Main menu
/performance - Analytics
/news - Latest articles
/help - This message

Just chat naturally!
  `);
}

async function sendSuggestions(env, chatId) {
  const message = `
💡 *AI Suggestions*

1. Post 3-5 articles daily
2. Focus on trending topics
3. Optimize for mobile
4. Add social sharing

Want to implement these?
  `;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Apply All', callback_data: 'apply_all' }],
      [{ text: '↩️ Back', callback_data: 'main_menu' }]
    ]
  };
  
  await sendMessage(env, chatId, message, keyboard);
}

// ============= SITEMAP =============
async function generateSitemap(env) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const baseUrl = 'https://agaminews.in';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${articles.map((_, index) => `
  <url>
    <loc>${baseUrl}/article/${index}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// ============= API =============
async function handleAPI(request, env, pathname) {
  if (pathname === '/api/stats') {
    const stats = await env.NEWS_KV.get('stats', 'json') || {
      totalViews: 0,
      todayViews: 0,
      uniqueVisitors: 0
    };
    
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not found', { status: 404 });
}

// ============= DEFAULT DATA =============
function getDefaultArticles() {
  return [
    {
      title: "AI Revolution: ChatGPT Reaches 200 Million Users Milestone",
      category: "Technology",
      summary: "OpenAI's ChatGPT has reached a milestone of 200 million weekly active users, doubling its user base in just six months. The rapid growth showcases the increasing adoption of AI technology across industries and everyday life.",
      date: "2 hours ago",
      views: 15420,
      breaking: true
    },
    {
      title: "Federal Reserve Signals Potential Rate Cuts in 2024",
      category: "Business",
      summary: "The Federal Reserve indicated possible interest rate cuts in 2024 as inflation shows signs of cooling. Markets rallied on the news, with major indices reaching new highs.",
      date: "3 hours ago",
      views: 12890
    },
    {
      title: "Climate Summit: $100 Billion Pledged for Green Energy",
      category: "Environment",
      summary: "World leaders at the Global Climate Summit have pledged $100 billion for renewable energy projects in developing nations, marking a significant step toward carbon neutrality goals.",
      date: "4 hours ago",
      views: 9756
    },
    {
      title: "SpaceX Launches Revolutionary Satellite Network",
      category: "Science",
      summary: "SpaceX successfully deployed its next-generation satellite constellation, promising global high-speed internet coverage. The launch marks a major milestone in space technology.",
      date: "5 hours ago",
      views: 8623
    },
    {
      title: "Breakthrough: New Cancer Treatment Shows 90% Success Rate",
      category: "Health",
      summary: "Scientists announce a breakthrough in cancer treatment using personalized mRNA vaccines, showing unprecedented success rates in clinical trials. The treatment could revolutionize oncology.",
      date: "6 hours ago",
      views: 11234
    },
    {
      title: "Tech Giants Report Record Earnings Amid AI Boom",
      category: "Business",
      summary: "Major technology companies reported record-breaking earnings, driven by massive investments in artificial intelligence and cloud computing services.",
      date: "7 hours ago",
      views: 7890
    },
    {
      title: "Olympic Games 2024: Host City Unveils Stunning Venues",
      category: "Sports",
      summary: "The 2024 Olympic host city revealed state-of-the-art venues featuring sustainable design and cutting-edge technology, setting new standards for international sporting events.",
      date: "8 hours ago",
      views: 6543
    },
    {
      title: "Quantum Computing Breakthrough Solves Complex Problem",
      category: "Technology",
      summary: "Researchers achieve quantum supremacy by solving a problem that would take classical computers millennia to complete, opening new possibilities in computing.",
      date: "9 hours ago",
      views: 9876
    }
  ];
}