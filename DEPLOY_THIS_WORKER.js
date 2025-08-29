// CLEAN CONSOLIDATED WORKER - Deploy this file to Cloudflare Workers
// This includes ALL fixes: DALL-E image generation + Authorization fixes
// Content writing style is PRESERVED

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram-webhook') {
      return handleTelegram(request, env);
    }
    
    // Handle API endpoints
    if (url.pathname === '/api/stats') {
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/api/config') {
      const config = await env.NEWS_KV.get('config', 'json') || {};
      return new Response(JSON.stringify(config), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Serve the main website
    return serveWebsite(env, request);
  },
  
  async scheduled(event, env) {
    // Auto-publish articles every 3 hours
    await fetchAndPublishArticles(env);
  }
};

// Main Telegram handler
async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // Store admin chat ID (first user becomes admin)
      let adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
        adminChat = String(chatId);
      }
      
      // Handle commands
      if (text === '/start') {
        await sendMessage(env, chatId, `
🎉 *Welcome to AgamiNews AI Manager!*

I manage your news website with AI-powered content.

🤖 *Features:*
• Auto-fetch news every 3 hours
• Generate images with DALL-E 3
• Write engaging, human-like articles
• Track costs and performance

Commands:
/fetch - Get new article
/delete <num> - Delete article
/admin - Check admin status
/setadmin agami2024 - Become admin
/help - Show all commands`);
        
      } else if (text === '/admin' || text === '/whoami') {
        const isAdmin = String(chatId) === String(adminChat);
        await sendMessage(env, chatId, `
👤 *Your Status*

Chat ID: \`${chatId}\`
Admin Status: ${isAdmin ? '✅ Admin' : '❌ Not Admin'}
Current Admin: \`${adminChat || 'Not set'}\`

${!isAdmin ? 'Use `/setadmin agami2024` to become admin' : 'You have full access!'}`);
        
      } else if (text.startsWith('/setadmin')) {
        const secret = text.split(' ')[1];
        if (secret === 'agami2024') {
          await env.NEWS_KV.put('admin_chat', String(chatId));
          await sendMessage(env, chatId, '✅ You are now the admin!');
        } else {
          await sendMessage(env, chatId, '❌ Invalid secret. Use: `/setadmin agami2024`');
        }
        
      } else if (text.startsWith('/delete')) {
        // FIXED AUTHORIZATION CHECK
        const currentAdmin = await env.NEWS_KV.get('admin_chat');
        
        // If no admin set, make current user admin
        if (!currentAdmin) {
          await env.NEWS_KV.put('admin_chat', String(chatId));
        }
        
        // Check if user is admin (with proper string comparison)
        if (String(chatId) !== String(await env.NEWS_KV.get('admin_chat'))) {
          await sendMessage(env, chatId, `❌ *Unauthorized*

Your ID: ${chatId}
Admin ID: ${await env.NEWS_KV.get('admin_chat')}

Use \`/setadmin agami2024\` to become admin.`);
          return new Response('OK');
        }
        
        // Delete article logic
        const articleNum = text.split(' ')[1];
        if (!articleNum) {
          await sendMessage(env, chatId, '❌ Use: `/delete 0` to delete first article');
          return new Response('OK');
        }
        
        const articles = await env.NEWS_KV.get('articles', 'json') || [];
        if (articles[articleNum]) {
          articles.splice(articleNum, 1);
          await env.NEWS_KV.put('articles', JSON.stringify(articles));
          await sendMessage(env, chatId, `✅ Article #${articleNum} deleted!`);
        } else {
          await sendMessage(env, chatId, '❌ Article not found');
        }
        
      } else if (text === '/fetch') {
        await sendMessage(env, chatId, '🔄 Fetching new article...');
        const result = await fetchAndPublishArticles(env, 1);
        if (result.success) {
          await sendMessage(env, chatId, `✅ Article published!\n\n📰 ${result.title}\n🔗 https://agaminews.in`);
        } else {
          await sendMessage(env, chatId, '❌ Failed to fetch article');
        }
        
      } else if (text === '/help') {
        await sendMessage(env, chatId, `
📚 *Commands*

*Content:*
/fetch - Get new article
/create <topic> - Create custom article
/delete <num> - Delete article

*Admin:*
/admin - Check your status
/setadmin agami2024 - Become admin

*Info:*
/stats - View statistics
/help - This message`);
      }
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram error:', error);
    return new Response('OK');
  }
}

// Send Telegram message
async function sendMessage(env, chatId, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Send message error:', error);
  }
}

// MAIN ARTICLE FETCHING WITH DALL-E (NOT UNSPLASH!)
async function fetchAndPublishArticles(env, count = 2) {
  try {
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    
    // Fetch from RSS feeds
    const feeds = [
      'https://feeds.feedburner.com/ndtvnews-top-stories',
      'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
      'https://feeds.bbci.co.uk/news/world/rss.xml'
    ];
    
    const randomFeed = feeds[Math.floor(Math.random() * feeds.length)];
    const response = await fetch(randomFeed);
    const text = await response.text();
    
    // Parse RSS and get first item
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    if (items.length === 0) return { success: false };
    
    const item = items[0];
    const title = (item.match(/<title>(.*?)<\/title>/) || [])[1] || 'Breaking News';
    const description = (item.match(/<description>(.*?)<\/description>/) || [])[1] || '';
    
    // Generate article content with GPT-4 (PRESERVED STYLE)
    const articleContent = await generateArticleContent(env, title, description);
    
    // Generate image with DALL-E 3 (NOT UNSPLASH!)
    const imageUrl = await generateDALLEImage(env, title);
    
    // Create article object
    const article = {
      id: Date.now(),
      title: title,
      content: articleContent,
      image: {
        url: imageUrl,
        source: 'dalle',
        credit: 'AI Generated'
      },
      timestamp: new Date().toISOString(),
      category: 'News',
      url: `/article/${articles.length}`
    };
    
    // Add to articles
    articles.unshift(article);
    
    // Keep only last 50 articles
    if (articles.length > 50) {
      articles.length = 50;
    }
    
    await env.NEWS_KV.put('articles', JSON.stringify(articles));
    
    // Update stats
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    stats.totalArticles = articles.length;
    stats.lastFetch = new Date().toISOString();
    await env.NEWS_KV.put('stats', JSON.stringify(stats));
    
    return { success: true, title: title };
    
  } catch (error) {
    console.error('Fetch error:', error);
    return { success: false, error: error.message };
  }
}

// GENERATE ARTICLE CONTENT - PRESERVING THE EXCELLENT WRITING STYLE!
async function generateArticleContent(env, title, description) {
  if (!env.OPENAI_API_KEY) {
    return `<h2>${title}</h2><p>${description}</p>`;
  }
  
  try {
    // THIS PROMPT CREATES THE ENGAGING, HUMAN-LIKE CONTENT - DON'T CHANGE!
    const prompt = `You are a professional journalist writing for AgamiNews, a premium news website.

Write a comprehensive, engaging news article about: ${title}

Context: ${description}

Requirements:
1. Write in a professional, engaging, human-like style
2. Create 4-5 detailed paragraphs (1500+ words total)
3. Include multiple perspectives and viewpoints
4. Add relevant context and background information
5. Use varied sentence structures for natural flow
6. Include expert analysis and implications
7. Write as if you're a seasoned journalist, not an AI
8. Make it informative, balanced, and thought-provoking
9. Use active voice and vivid descriptions
10. End with forward-looking insights

Format as HTML with <p> tags. Make it compelling and authoritative.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.8  // Slightly creative for engaging content
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('GPT-4 error:', error);
  }
  
  // Fallback content
  return `<h2>${title}</h2><p>${description}</p>`;
}

// GENERATE DALL-E IMAGE (FIXED - NO MORE UNSPLASH!)
async function generateDALLEImage(env, title) {
  if (!env.OPENAI_API_KEY) {
    return 'https://via.placeholder.com/1024x1024/667eea/ffffff?text=News';
  }
  
  try {
    const prompt = `Professional news article image for: ${title}. 
    Create a photorealistic, high-quality image suitable for a news website. 
    Style: modern, clean, professional journalism photography. 
    No text or watermarks.`;
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',     // Standard size for fast loading
        quality: 'standard',   // Web-optimized (not HD)
        style: 'natural'       // Realistic style
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data[0]) {
        console.log('[DALL-E] Successfully generated image');
        return data.data[0].url;
      }
    }
  } catch (error) {
    console.error('[DALL-E] Error:', error);
  }
  
  // Fallback placeholder
  return 'https://via.placeholder.com/1024x1024/667eea/ffffff?text=News';
}

// Serve the website
async function serveWebsite(env, request) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgamiNews - AI-Powered News</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .tagline { opacity: 0.9; font-size: 1.1rem; }
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .articles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 2rem;
        }
        .article {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
        }
        .article:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .article img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .article-content {
            padding: 1.5rem;
        }
        .article h2 {
            font-size: 1.3rem;
            margin-bottom: 0.5rem;
            line-height: 1.4;
        }
        .article-meta {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }
        .article p {
            color: #555;
            line-height: 1.6;
        }
        .no-articles {
            text-align: center;
            padding: 4rem 2rem;
            color: #666;
        }
        .ai-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }
    </style>
</head>
<body>
    <header>
        <h1>AgamiNews</h1>
        <p class="tagline">AI-Powered News, Human-Quality Content</p>
    </header>
    
    <div class="container">
        ${articles.length > 0 ? `
            <div class="articles">
                ${articles.slice(0, 12).map((article, index) => `
                    <div class="article" onclick="location.href='${article.url || '#'}'">
                        ${article.image ? `
                            <img src="${article.image.url || article.image}" 
                                 alt="${article.title}" 
                                 loading="lazy">
                        ` : ''}
                        <div class="article-content">
                            <div class="article-meta">
                                ${article.category || 'News'}
                                ${article.image?.source === 'dalle' ? '<span class="ai-badge">AI Image</span>' : ''}
                            </div>
                            <h2>${article.title}</h2>
                            <p>${article.preview || article.content?.substring(0, 150) || ''}...</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : `
            <div class="no-articles">
                <h2>No articles yet</h2>
                <p>Articles will appear here once published.</p>
            </div>
        `}
    </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}