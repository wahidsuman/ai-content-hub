addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env))
})

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Handle robots.txt
  if (path === '/robots.txt') {
    return new Response('User-agent: *\nAllow: /\nSitemap: https://agaminews.in/sitemap.xml', {
      headers: { 'content-type': 'text/plain' }
    })
  }
  
  // Handle sitemap.xml
  if (path === '/sitemap.xml') {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://agaminews.in/</loc></url><url><loc>https://agaminews.in/about</loc></url><url><loc>https://agaminews.in/contact</loc></url><url><loc>https://agaminews.in/privacy-policy</loc></url><url><loc>https://agaminews.in/terms</loc></url></urlset>'
    return new Response(xml, {
      headers: { 'content-type': 'application/xml' }
    })
  }
  
  // Handle article pages
  if (path.startsWith('/article/')) {
    const articleId = path.replace('/article/', '')
    return serveArticle(env, articleId)
  }
  
  // Handle essential pages
  if (path === '/about') return servePage('About Us', getAboutContent())
  if (path === '/contact') return servePage('Contact Us', getContactContent())
  if (path === '/privacy-policy') return servePage('Privacy Policy', getPrivacyContent())
  if (path === '/terms') return servePage('Terms of Service', getTermsContent())
  
  // Serve homepage
  return serveHomepage(env)
}

async function serveHomepage(env) {
  // Get articles from KV if available
  let articles = []
  try {
    if (env && env.NEWS_KV) {
      articles = await env.NEWS_KV.get('articles', 'json') || []
    }
  } catch (e) {
    console.log('KV not available')
  }
  
  // Generate news HTML
  let newsHTML = ''
  if (articles.length > 0) {
    articles.slice(0, 10).forEach((article, index) => {
      const colors = ['gold', 'blue', 'green', 'red']
      newsHTML += `
        <a href="/article/${index}" style="text-decoration:none;color:inherit;">
          <article class="news ${colors[index % 4]}">
            <div class="cardPad">
              <span class="badge">${article.category || 'Tech'}</span>
              <h3 class="title">${article.title || 'Latest Update'}</h3>
              <p class="muted">${article.description || ''}</p>
              <div class="meta">3 min read • Today</div>
            </div>
            <div class="img"></div>
          </article>
        </a>
      `
    })
  } else {
    // Default articles when no content
    newsHTML = `
      <article class="news gold">
        <div class="cardPad">
          <span class="badge">Finance</span>
          <h3 class="title">Tech Giants Invest in Emerging Markets</h3>
          <p class="muted">Major technology companies announce billion-dollar investments.</p>
          <div class="meta">5 min read • Today</div>
        </div>
        <div class="img"></div>
      </article>
      <article class="news blue">
        <div class="cardPad">
          <span class="badge">Technology</span>
          <h3 class="title">Breakthrough in Quantum Computing</h3>
          <p class="muted">Scientists achieve new milestone in quantum processor development.</p>
          <div class="meta">3 min read • Today</div>
        </div>
        <div class="img"></div>
      </article>
      <article class="news green">
        <div class="cardPad">
          <span class="badge">Crypto</span>
          <h3 class="title">Ethereum Network Upgrade Success</h3>
          <p class="muted">Latest improvements bring faster transactions and lower fees.</p>
          <div class="meta">4 min read • Yesterday</div>
        </div>
        <div class="img"></div>
      </article>
    `
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agami News - Tech & Innovation Updates</title>
<meta name="description" content="Latest technology news, cryptocurrency updates, and innovation insights.">
<style>
  :root{
    --bg:#0b1020;--text:#e8ecf2;--muted:#a8b1c7;--card:#121835;
    --g1:linear-gradient(135deg,#7c3aed, #ef4444, #f59e0b);
    --g2:linear-gradient(135deg,#06b6d4, #6366f1);
    --g3:linear-gradient(135deg,#22c55e, #06b6d4);
    --g4:linear-gradient(135deg,#f43f5e, #f97316);
    --radius:18px;--shadow:0 12px 30px rgba(0,0,0,.25);
  }
  *{box-sizing:border-box} 
  body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a234a,transparent),var(--bg);color:var(--text);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial}
  a{color:#7dd3fc;text-decoration:none}
  .wrap{max-width:1024px;margin:auto;padding:18px}
  .navbar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin:6px auto 12px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);backdrop-filter:blur(8px);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:20px;letter-spacing:.2px}
  .nav-links{display:flex;align-items:center;gap:24px}
  .nav-link{color:#dbeafe;font-size:14px;font-weight:600;transition:color .2s}
  .nav-link:hover{color:#fff}
  .grid{display:grid;gap:16px}
  .hero{display:grid;gap:14px;grid-template-columns:1fr;align-items:center}
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
  .news{display:grid;grid-template-columns:1fr 120px;gap:12px;align-items:center;border-radius:16px;background:#0e1530;border:1px solid #ffffff12;overflow:hidden;cursor:pointer;transition:all .2s}
  .news:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(0,0,0,.3)}
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
  @media(max-width:768px){
    .nav-links{display:none}
    .navbar{padding:14px 18px}
    .brand{font-size:18px}
  }
  @media(min-width:860px){
    .hero{grid-template-columns:1.2fr .8fr}
    .grid.cols-3{grid-template-columns:repeat(3,1fr)}
    .catGrid{grid-template-columns:repeat(4,1fr)}
  }
</style>
</head>
<body>
  <div class="wrap">
    <nav class="navbar">
      <div class="brand">🌈 Agami News</div>
      <div class="nav-links">
        <a href="#latest" class="nav-link">Latest</a>
        <a href="#tech" class="nav-link">Tech</a>
        <a href="#crypto" class="nav-link">Crypto</a>
        <a href="#startups" class="nav-link">Startups</a>
      </div>
    </nav>

    <section class="hero">
      <div>
        <span class="pill">Daily Briefing • Tech & Innovation</span>
        <h1 class="h1">Breaking Tech News & Updates</h1>
        <p class="lead">Get the latest technology news, cryptocurrency insights, and innovation updates from around the world.</p>
        <p style="margin-top:10px">
          <a class="btn btn-primary" href="#latest">Read Latest</a>
        </p>
      </div>

      <div class="card" style="background:var(--g1)">
        <div class="cardPad">
          <span class="badge">Featured</span>
          <h3 class="title" style="color:#051324">Weekly Tech Roundup</h3>
          <p class="muted" style="color:#05203b">Top stories and breakthrough innovations.</p>
        </div>
      </div>
    </section>

    <section style="margin-top:18px">
      <div class="catGrid">
        <a class="cat ai" href="#tech">Technology</a>
        <a class="cat crypto" href="#crypto">Crypto</a>
        <a class="cat startups" href="#startups">Startups</a>
        <a class="cat finance" href="#finance">Finance</a>
      </div>
    </section>

    <section id="latest" style="margin-top:18px" class="list">
      ${newsHTML}
    </section>

    <section style="margin-top:18px" class="newsletter card">
      <div class="cardPad">
        <h3 class="title" style="margin:0">Stay Updated</h3>
        <p>Join thousands of readers getting daily tech news delivered to their inbox.</p>
        <form class="field" onsubmit="event.preventDefault(); alert('Thanks for subscribing!')">
          <input type="email" placeholder="Enter your email" required>
          <button class="btn" style="background:#0b1020;color:#eaf2ff;border-radius:12px;border:none;padding:12px 16px;cursor:pointer">Subscribe</button>
        </form>
      </div>
    </section>

    <section style="margin-top:18px" class="grid cols-3">
      <div class="card"><div class="cardPad">
        <span class="badge">Trending</span>
        <h4 class="title">Electric Vehicles</h4>
        <p class="muted">Latest EV launches and battery tech</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Analysis</span>
        <h4 class="title">Market Insights</h4>
        <p class="muted">Tech stocks and crypto trends</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Innovation</span>
        <h4 class="title">Startup Spotlight</h4>
        <p class="muted">Emerging companies to watch</p>
      </div></div>
    </section>

    <footer class="footer">
      © 2025 Agami News • Technology & Innovation News<br>
      <small style="opacity:0.7">
        <a href="/privacy-policy" style="color:#9ca3af">Privacy Policy</a> • 
        <a href="/terms" style="color:#9ca3af">Terms of Service</a> • 
        <a href="/about" style="color:#9ca3af">About</a> • 
        <a href="/contact" style="color:#9ca3af">Contact</a>
      </small>
    </footer>
  </div>
</body>
</html>`
  
  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' }
  })
}

async function serveArticle(env, articleId) {
  let article = null
  try {
    if (env && env.NEWS_KV) {
      const articles = await env.NEWS_KV.get('articles', 'json') || []
      article = articles[parseInt(articleId)]
    }
  } catch (e) {
    console.log('Cannot fetch article')
  }
  
  if (!article) {
    article = {
      title: 'Article Not Found',
      content: '<p>This article is not available.</p>',
      category: 'Tech'
    }
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${article.title} - Agami News</title>
<style>
  body{margin:0;background:#0b1020;color:#e8ecf2;font:16px/1.6 system-ui,-apple-system,Arial}
  .container{max-width:800px;margin:auto;padding:20px}
  .header{display:flex;justify-content:space-between;padding:14px 20px;margin-bottom:30px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:20px}
  .back-btn{padding:8px 16px;background:#ffffff14;border-radius:8px;color:#dbeafe;text-decoration:none}
  .article{background:#121835;border-radius:18px;padding:30px;box-shadow:0 12px 30px rgba(0,0,0,.25)}
  h1{font-size:32px;margin:20px 0}
  .meta{color:#a8b1c7;margin-bottom:20px}
  .content{font-size:18px;line-height:1.8;color:#d1d5db}
  a{color:#7dd3fc}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">🌈 Agami News</div>
      <a href="/" class="back-btn">← Back</a>
    </div>
    <article class="article">
      <div class="meta">${article.category || 'Tech'} • 5 min read</div>
      <h1>${article.title}</h1>
      <div class="content">${article.content || '<p>Article content will appear here.</p>'}</div>
    </article>
  </div>
</body>
</html>`
  
  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' }
  })
}

function servePage(title, content) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - Agami News</title>
<style>
  body{margin:0;background:#0b1020;color:#e8ecf2;font:16px/1.6 system-ui,-apple-system,Arial}
  .container{max-width:800px;margin:auto;padding:20px}
  .header{display:flex;justify-content:space-between;padding:14px 20px;margin-bottom:30px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:20px}
  .nav-links{display:flex;gap:20px}
  .nav-link{color:#a8b1c7;text-decoration:none;font-size:14px}
  .content{background:#121835;border-radius:18px;padding:30px;box-shadow:0 12px 30px rgba(0,0,0,.25)}
  h1{font-size:32px;margin:0 0 20px}
  h2{font-size:24px;margin:30px 0 15px}
  p{margin:15px 0;line-height:1.8}
  ul{margin:15px 0;padding-left:30px}
  li{margin:8px 0}
  a{color:#7dd3fc}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="/" class="brand">🌈 Agami News</a>
      <div class="nav-links">
        <a href="/about" class="nav-link">About</a>
        <a href="/contact" class="nav-link">Contact</a>
        <a href="/privacy-policy" class="nav-link">Privacy</a>
        <a href="/terms" class="nav-link">Terms</a>
      </div>
    </div>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>`
  
  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' }
  })
}

function getAboutContent() {
  return `
    <h1>About Agami News</h1>
    <p>Agami News is dedicated to bringing you the latest technology, cryptocurrency, and innovation news from around the world.</p>
    <h2>What We Cover</h2>
    <ul>
      <li>Technology: Latest gadgets, software, AI, and breakthrough innovations</li>
      <li>Cryptocurrency: Market updates, blockchain technology, DeFi trends</li>
      <li>Electric Vehicles: EV launches, battery technology, sustainable transport</li>
      <li>Startups: Emerging companies, funding rounds, success stories</li>
    </ul>
    <h2>Our Mission</h2>
    <p>We curate and create content that matters to tech enthusiasts, investors, and innovators.</p>
  `
}

function getContactContent() {
  return `
    <h1>Contact Us</h1>
    <p>We'd love to hear from you!</p>
    <h2>Email</h2>
    <p>General: contact@agaminews.in<br>
    News Tips: tips@agaminews.in<br>
    Partnerships: partners@agaminews.in</p>
    <h2>Social Media</h2>
    <p>Twitter: @agaminews<br>
    LinkedIn: Agami News<br>
    Telegram: @agaminews_channel</p>
  `
}

function getPrivacyContent() {
  return `
    <h1>Privacy Policy</h1>
    <p>Last updated: ${new Date().toLocaleDateString()}</p>
    <h2>Information We Collect</h2>
    <p>We collect usage data, device information, and email addresses (for newsletter subscribers only).</p>
    <h2>How We Use Information</h2>
    <p>We use collected information to improve our content, send newsletters, and analyze traffic.</p>
    <h2>Third-Party Services</h2>
    <p>We use Google Analytics, Google AdSense, Cloudflare, and Unsplash/Pexels.</p>
    <h2>Contact</h2>
    <p>For privacy concerns: privacy@agaminews.in</p>
  `
}

function getTermsContent() {
  return `
    <h1>Terms of Service</h1>
    <p>Last updated: ${new Date().toLocaleDateString()}</p>
    <h2>Acceptance of Terms</h2>
    <p>By accessing Agami News, you agree to these Terms of Service.</p>
    <h2>Use License</h2>
    <p>You may view and share our content for personal use with attribution.</p>
    <h2>Content Disclaimer</h2>
    <p>Information is provided "as is" without warranties.</p>
    <h2>Contact</h2>
    <p>For questions: legal@agaminews.in</p>
  `
}