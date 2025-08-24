// Fixed Worker with Working Sitemap and Robots.txt

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle robots.txt FIRST
    if (url.pathname === '/robots.txt') {
      const robotsTxt = `# Robots.txt for Agami News
User-agent: *
Allow: /

# Sitemaps
Sitemap: https://agaminews.in/sitemap.xml

# Allow all search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Block bad bots
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Disallow: /`;
      
      return new Response(robotsTxt, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // Handle sitemap.xml SECOND
    if (url.pathname === '/sitemap.xml') {
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      const today = new Date().toISOString().split('T')[0];
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://agaminews.in/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://agaminews.in/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://agaminews.in/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://agaminews.in/privacy-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://agaminews.in/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
      
      // Add article URLs
      if (articles && articles.length > 0) {
        articles.forEach((article, index) => {
          sitemap += `
  <url>
    <loc>https://agaminews.in/article/${index}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.7</priority>
  </url>`;
        });
      }
      
      sitemap += `
</urlset>`;
      
      return new Response(sitemap, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Handle other pages (copy rest of your existing code here)
    // For now, return homepage for everything else
    return serveHomepage(env);
  }
};

async function serveHomepage(env) {
  // Your existing homepage code
  return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Agami News</title>
</head>
<body>
  <h1>Agami News</h1>
  <p>Homepage - Sitemap and Robots.txt are now working!</p>
  <ul>
    <li><a href="/robots.txt">Test Robots.txt</a></li>
    <li><a href="/sitemap.xml">Test Sitemap</a></li>
  </ul>
</body>
</html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}