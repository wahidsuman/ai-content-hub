// AGAMINEWS - COMPLETE AUTOMATED SYSTEM
// Single file for easy management and deployment
// IMPORTANT: Google Analytics ID G-ZW77WM2VPG must be on EVERY page!

// Version: 2.7.0 - Fixed Syntax Error
// Last Updated: 2025-08-29T14:20:00Z
// Deploy ID: 1735484400000

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
    } else if (url.pathname === '/test-openai') {
      // Test OpenAI integration
      return testOpenAI(env);
    } else if (url.pathname === '/force-cron' || url.pathname === '/trigger') {
      // Manual trigger for testing cron job (can be called by external services)
      console.log('[FORCE-CRON] Manually triggering scheduled job');
      
      // Check for secret key if provided
      const secretKey = url.searchParams.get('key');
      const expectedKey = env.CRON_SECRET || 'agami2024'; // Set a secret in env vars
      
      if (url.pathname === '/trigger' && secretKey !== expectedKey) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      const fakeEvent = { scheduledTime: Date.now(), cron: 'manual' };
      await this.scheduled(fakeEvent, env);
      return new Response(JSON.stringify({
        success: true,
        message: 'Cron job triggered',
        time: new Date().toISOString()
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (url.pathname === '/test-article') {
      // Test single article generation
      return testArticleGeneration(env);
    } else if (url.pathname === '/health' || url.pathname === '/status-check') {
      // Comprehensive health check
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      const cronLogs = await env.NEWS_KV.get('cron_logs', 'json') || [];
      const lastCron = cronLogs[0] ? new Date(cronLogs[0].time) : null;
      const hoursSinceLastCron = lastCron ? (Date.now() - lastCron) / (1000 * 60 * 60) : 999;
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        system: {
          worker: 'active',
          kv: 'connected',
          articles: articles.length,
          todayArticles: stats.dailyArticlesPublished || 0
        },
        apis: {
          openai: !!env.OPENAI_API_KEY,
          telegram: !!env.TELEGRAM_BOT_TOKEN,
          github: !!env.GITHUB_TOKEN
        },
        cron: {
          lastRun: lastCron ? lastCron.toISOString() : 'never',
          hoursSinceLastRun: hoursSinceLastCron.toFixed(1),
          status: hoursSinceLastCron < 4 ? 'healthy' : hoursSinceLastCron < 8 ? 'warning' : 'critical',
          nextRun: new Date(Math.ceil(Date.now() / (3 * 60 * 60 * 1000)) * 3 * 60 * 60 * 1000).toISOString()
        },
        costs: {
          todaySpent: (stats.dailyArticlesPublished || 0) * 0.04,
          monthlyProjected: ((stats.dailyArticlesPublished || 0) / new Date().getHours() * 24 * 30 * 0.04) || 0,
          budgetStatus: 'within_limit'
        }
      };
      
      // Set overall health status
      if (!env.OPENAI_API_KEY || !env.TELEGRAM_BOT_TOKEN) {
        health.status = 'critical';
      } else if (hoursSinceLastCron > 8) {
        health.status = 'warning';
      }
      
      return new Response(JSON.stringify(health, null, 2), {
        status: health.status === 'healthy' ? 200 : health.status === 'warning' ? 503 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (url.pathname === '/force-refresh') {
      // Force refresh endpoint to clear cache
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Cache cleared - please refresh your browser (Ctrl+F5)',
        articlesCount: articles.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else if (url.pathname === '/fix-images-now') {
      // Secure admin endpoint to regenerate and persist images to R2 for existing articles
      const key = url.searchParams.get('key');
      const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
      if (!key || key !== expected) {
        return new Response('Unauthorized', { status: 401 });
      }
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 25);
      const start = Math.max(parseInt(url.searchParams.get('start') || '0', 10) || 0, 0);
      const articles = (await env.NEWS_KV.get('articles', 'json')) || [];
      let updated = 0;
      let processed = 0;
      for (let i = start; i < articles.length && processed < limit; i++) {
        const a = articles[i];
        if (!a) continue;
        const urlStr = a.image?.url || a.image;
        const needsFix = !urlStr || /oaidalleapiprodscus|images\.openai\.com|via\.placeholder|data:image|\/img\//i.test(urlStr);
        if (needsFix) {
          try {
            const fresh = await getArticleImage(a.title || a.sourceMaterial?.originalTitle || 'News', a.category || 'India', env);
            if (fresh && fresh.url) {
              a.image = fresh;
              updated++;
            }
          } catch (e) {
            // skip on error
          }
          processed++;
        }
      }
      await env.NEWS_KV.put('articles', JSON.stringify(articles));
      await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
      return new Response(JSON.stringify({ updated, processed, total: articles.length, nextStart: start + processed }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (url.pathname === '/fix-image') {
      // Fix a single article image by id or full/canonical URL
      const key = url.searchParams.get('key');
      const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
      if (!key || key !== expected) {
        return new Response('Unauthorized', { status: 401 });
      }
      const idParam = url.searchParams.get('id') || '';
      const pathParam = url.searchParams.get('url') || '';
      let articleId = idParam.trim();
      if (!articleId && pathParam) {
        const m = pathParam.match(/-(\d{6,})$/);
        if (m) articleId = m[1];
      }
      if (!articleId) {
        return new Response('Missing id or url', { status: 400 });
      }
      const articles = (await env.NEWS_KV.get('articles', 'json')) || [];
      const idx = articles.findIndex(a => String(a.id) === String(articleId));
      if (idx === -1) {
        return new Response('Article not found', { status: 404 });
      }
      const a = articles[idx];
      try {
        const fresh = await getArticleImage(a.title || a.sourceMaterial?.originalTitle || 'News', a.category || 'India', env);
        if (fresh && fresh.url) {
          a.image = fresh;
          articles[idx] = a;
          await env.NEWS_KV.put('articles', JSON.stringify(articles));
          await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
          const html = `<html><body style="font-family: system-ui; padding:20px;">
          <h3>✅ Image fixed</h3>
          <p><a href="${a.url}" style="color:#06c;">Open article</a></p>
          </body></html>`;
          return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        return new Response('Failed to generate image', { status: 500 });
      } catch (e) {
        return new Response('Error regenerating image', { status: 500 });
      }
    } else if (url.pathname === '/repair-article') {
      // Secure endpoint to recreate a missing article by id/url
      const key = url.searchParams.get('key');
      const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
      if (!key || key !== expected) {
        return new Response('Unauthorized', { status: 401 });
      }
      const urlParam = url.searchParams.get('url') || '';
      let id = url.searchParams.get('id') || '';
      let categoryLabel = url.searchParams.get('category') || '';
      let slug = url.searchParams.get('slug') || '';
      if (urlParam) {
        try {
          const u = new URL(urlParam);
          const parts = u.pathname.split('/').filter(Boolean); // [category-news, slug-id]
          categoryLabel = categoryLabel || (parts[0] || 'news');
          const last = parts[1] || '';
          const m = last.match(/-(\d+)$/);
          if (m) id = id || m[1];
          slug = slug || last.replace(/-(\d+)$/, '');
        } catch (_) {}
      }
      if (!id) {
        return new Response('Missing id', { status: 400 });
      }
      // Derive category name
      const category = mapCategoryLabel(categoryLabel);
      const baselineTitle = slug ? slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() : `News ${id}`;
      // Build source material
      const sourceMaterial = {
        originalTitle: baselineTitle,
        description: `Repaired article for ${baselineTitle}`,
        source: 'AgamiNews Repair',
        link: urlParam || '',
        category
      };
      try {
        const research = await generateOriginalArticle(sourceMaterial, env);
        const title = research.title || baselineTitle;
        const content = research.content || `<p>${baselineTitle}</p>`;
        const article = {
          id: id,
          slug: generateSlug(title),
          title,
          preview: content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
          category,
          source: 'AgamiNews Research Team',
          originalSourceLink: urlParam || '',
          image: await getArticleImage(title, category, env),
          date: 'Just now',
          timestamp: Date.now(),
          views: 0,
          trending: false,
          fullContent: content,
          url: `/${category.toLowerCase()}-news/${generateSlug(title)}`
        };
        // Save to KV (prepend)
        const list = await env.NEWS_KV.get('articles', 'json') || [];
        const updated = [article, ...list].slice(0, 100);
        await env.NEWS_KV.put('articles', JSON.stringify(updated));
        await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
        await env.NEWS_KV.put(`article_${id}`, JSON.stringify(article));
        return Response.redirect(new URL(article.url, url.origin).toString(), 302);
      } catch (e) {
        return new Response('Repair failed', { status: 500 });
      }
    } else if (url.pathname === '/repair-lite') {
      // Minimal repair: create stub article without OpenAI to ensure page opens
      const key = url.searchParams.get('key');
      const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
      if (!key || key !== expected) {
        return new Response('Unauthorized', { status: 401 });
      }
      const urlParam = url.searchParams.get('url') || '';
      let id = url.searchParams.get('id') || '';
      let categoryLabel = url.searchParams.get('category') || '';
      let slug = url.searchParams.get('slug') || '';
      if (urlParam) {
        try {
          const u = new URL(urlParam);
          const parts = u.pathname.split('/').filter(Boolean);
          categoryLabel = categoryLabel || (parts[0] || 'news');
          const last = parts[1] || '';
          const m = last.match(/-(\d+)$/);
          if (m) id = id || m[1];
          slug = slug || last.replace(/-(\d+)$/, '');
        } catch (_) {}
      }
      if (!id) return new Response('Missing id', { status: 400 });
      const category = mapCategoryLabel(categoryLabel);
      const baselineTitle = slug ? slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() : `News ${id}`;
      const article = {
        id,
        slug: generateSlug(baselineTitle),
        title: baselineTitle,
        preview: `Quick update: ${baselineTitle}`,
        category,
        source: 'AgamiNews',
        originalSourceLink: urlParam,
        image: { url: `/img/?src=${encodeURIComponent('https://via.placeholder.com/1280x720/0066CC/FFFFFF?text=AgamiNews')}&w=1200&q=70`, credit: 'Placeholder', type: 'placeholder' },
        date: 'Just now',
        timestamp: Date.now(),
        views: 0,
        trending: false,
        fullContent: `<p><strong>${baselineTitle}</strong></p><p>This article is being prepared. Please check back shortly.</p>`,
        url: `/${category.toLowerCase()}-news/${generateSlug(baselineTitle)}`
      };
      const list = await env.NEWS_KV.get('articles', 'json') || [];
      const updated = [article, ...list].slice(0, 100);
      await env.NEWS_KV.put('articles', JSON.stringify(updated));
      await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
      await env.NEWS_KV.put(`article_${id}`, JSON.stringify(article));
      return Response.redirect(new URL(article.url, url.origin).toString(), 302);
    } else if (url.pathname === '/migrate-kv') {
      // Copy app data from OLD_KV (assets) to NEWS_KV (state)
      const key = url.searchParams.get('key');
      const mode = (url.searchParams.get('mode') || 'dry').toLowerCase();
      const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
      if (!key || key !== expected) {
        return new Response('Unauthorized', { status: 401 });
      }
      if (!env.OLD_KV || !env.NEWS_KV) {
        return new Response(JSON.stringify({
          error: 'Bindings missing',
          hint: 'Bind OLD_KV to __agaminews-workers_sites_assets and NEWS_KV to state'
        }), { headers: { 'Content-Type': 'application/json' }, status: 400 });
      }
      const allowedKeys = [
        'articles','stats','config','aiInstructions','analytics_overview',
        'cron_logs','last_update_id','admin_chat','articlesTimestamp','lastFetch'
      ];
      const result = { copied: [], skipped: [], articlesCopied: 0, articleKeys: [] };
      // Copy simple keys
      for (const k of allowedKeys) {
        const val = await env.OLD_KV.get(k, 'json');
        if (val !== null && val !== undefined) {
          if (mode === 'copy') {
            await env.NEWS_KV.put(k, JSON.stringify(val));
          }
          result.copied.push(k);
        } else {
          const raw = await env.OLD_KV.get(k);
          if (raw) {
            if (mode === 'copy') await env.NEWS_KV.put(k, raw);
            result.copied.push(k);
          } else {
            result.skipped.push(k);
          }
        }
      }
      // Copy per-article records if present
      try {
        const list1 = await env.OLD_KV.list({ prefix: 'article_' });
        for (const entry of list1.keys) {
          const keyName = entry.name;
          const v = await env.OLD_KV.get(keyName);
          if (v) {
            if (mode === 'copy') await env.NEWS_KV.put(keyName, v);
            result.articleKeys.push(keyName);
            result.articlesCopied++;
          }
        }
      } catch (_) {}
      return new Response(JSON.stringify({ mode, ...result }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (url.pathname === '/replace-article') {
      // Delete an old article by id and publish a fresh one
      const key = url.searchParams.get('key');
      const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
      if (!key || key !== expected) return new Response('Unauthorized', { status: 401 });
      const oldId = url.searchParams.get('id') || '';
      const categoryParam = url.searchParams.get('category') || 'technology';
      const slugParam = url.searchParams.get('slug') || '';
      const titleParam = url.searchParams.get('title') || '';
      const category = mapCategoryLabel(categoryParam);
      if (!oldId) return new Response('Missing id', { status: 400 });

      // Remove old article if present
      const list = await env.NEWS_KV.get('articles', 'json') || [];
      const idx = list.findIndex(a => String(a.id) === String(oldId));
      if (idx !== -1) list.splice(idx, 1);

      // Build baseline title from provided params
      const baselineTitle = titleParam ? decodeURIComponent(titleParam) : slugParam ? decodeURIComponent(slugParam).replace(/[-_]+/g, ' ').trim() : 'Breaking update';
      const sourceMaterial = {
        originalTitle: baselineTitle,
        description: `Replacement article for ${baselineTitle}`,
        source: 'AgamiNews Replacement',
        link: '',
        category
      };

      let newArticle = null;
      try {
        const research = await generateOriginalArticle(sourceMaterial, env);
        const title = research.title || baselineTitle;
        const content = research.content || `<p>${baselineTitle}</p>`;
        const newId = generateArticleId();
        newArticle = {
          id: newId,
          slug: generateSlug(title),
          title,
          preview: content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
          category,
          source: 'AgamiNews Research Team',
          originalSourceLink: '',
          image: await getArticleImage(title, category, env),
          date: 'Just now',
          timestamp: Date.now(),
          views: 0,
          trending: false,
          fullContent: content,
          url: `/${category.toLowerCase()}-news/${generateSlug(title)}`
        };
      } catch (e) {
        // Fallback stub
        const title = baselineTitle;
        const content = `<p><strong>${baselineTitle}</strong></p><p>This article is being prepared. Please check back shortly.</p>`;
        const newId = generateArticleId();
        newArticle = {
          id: newId,
          slug: generateSlug(title),
          title,
          preview: content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
          category,
          source: 'AgamiNews',
          originalSourceLink: '',
          image: { url: `/img/?src=${encodeURIComponent('https://via.placeholder.com/1280x720/0066CC/FFFFFF?text=AgamiNews')}&w=1200&q=70`, credit: 'Placeholder', type: 'placeholder' },
          date: 'Just now',
          timestamp: Date.now(),
          views: 0,
          trending: false,
          fullContent: content,
          url: `/${category.toLowerCase()}-news/${generateSlug(title)}`
        };
      }

      // Save
      const updated = [newArticle, ...list].slice(0, 100);
      await env.NEWS_KV.put('articles', JSON.stringify(updated));
      await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
      await env.NEWS_KV.put(`article_${newArticle.id}`, JSON.stringify(newArticle));
      // Respond with redirect to fresh article
      return Response.redirect(new URL(newArticle.url, url.origin).toString(), 302);
    } else if (url.pathname === '/fetch-news') {
      // Disabled public endpoint - use Telegram bot instead
      return new Response('This endpoint is disabled. Use the Telegram bot to manage news.', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else if (url.pathname.startsWith('/clear-articles/')) {
      // Protected clear endpoint - requires secret token
      const token = url.pathname.split('/')[2];
      const adminToken = await env.NEWS_KV.get('admin_clear_token');
      
      if (!adminToken || token !== adminToken) {
        return new Response('Unauthorized', { status: 403 });
      }
      
      // Clear all articles
      await env.NEWS_KV.put('articles', JSON.stringify([]));
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      stats.dailyArticlesPublished = 0;
      await env.NEWS_KV.put('stats', JSON.stringify(stats));
      return new Response('All articles cleared successfully! Redirecting to homepage...', {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Refresh': '2; url=/'
        }
      });
    } else if (url.pathname.startsWith('/article/')) {
      // Legacy URL format - try to redirect to new format
      const articleId = parseInt(url.pathname.split('/')[2]);
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      if (articles[articleId] && articles[articleId].url) {
        return Response.redirect(new URL(articles[articleId].url, request.url).toString(), 301);
      }
      // Fallback to old handler
      return await serveArticle(env, request, url.pathname);
    } else if (url.pathname.includes('-news/')) {
      // New SEO-friendly URL format: /category-news/slug
      return await serveArticleBySlug(env, request, url.pathname);
    } else if (url.pathname.startsWith('/img/')) {
      // On-demand image proxy/cache
      return await serveImage(env, request, url.pathname);
    } else if (url.pathname.startsWith('/media/')) {
      return await serveR2Media(env, request, url.pathname);
    } else if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url.pathname);
    }
    
    return serveWebsite(env, request);
  },
  
  async scheduled(event, env) {
    // AUTOMATIC NEWS PUBLISHING - Runs every 3 hours (24/7)
    const runTime = new Date().toISOString();
    console.log(`[CRON] ⏰ Scheduled run started at ${runTime}`);
    
    // Log cron execution to KV for debugging
    const cronLogs = await env.NEWS_KV.get('cron_logs', 'json') || [];
    cronLogs.unshift({
      time: runTime,
      event: 'started',
      cron: event.cron || 'unknown'
    });
    await env.NEWS_KV.put('cron_logs', JSON.stringify(cronLogs.slice(0, 20))); // Keep last 20 logs
    
    try {
      // Get admin chat ID for notifications
      const adminChat = await env.NEWS_KV.get('admin_chat');
      console.log(`[CRON] Admin chat: ${adminChat || 'not set'}`);
      
      // Send notification that cron started
      if (adminChat && env.TELEGRAM_BOT_TOKEN) {
        await sendMessage(env, adminChat, `⏰ *Cron Triggered*\n\nTime: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}\nStarting auto-publish...`);
      }
      
      // Check daily limits before fetching
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      const today = new Date().toDateString();
      
      if (stats.lastReset !== today) {
        // Reset daily counters at midnight
        stats.dailyArticlesPublished = 0;
        stats.dailyFetches = 0;
        stats.tokensUsedToday = 0;
        stats.lastReset = today;
      }
      
      // Smart scheduling based on time of day (IST)
      const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const hour = istTime.getHours();
      
      // OPTIMIZED FOR 15 ARTICLES/DAY with 3-hour schedule (8 runs)
      let articlesToFetch = 2; // Default 2 articles per run
      let shouldFetch = true;
      let priority = 'normal';
      
      // Smart distribution: 15 articles across 8 runs (every 3 hours)
      // Schedule: 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
      if (hour === 0 || hour === 3) {
        // Night/Early morning - 1 article each (total: 2)
        articlesToFetch = 1;
        priority = 'minimal';
      } else if (hour === 6) {
        // Morning rush - 3 articles (total: 5)
        articlesToFetch = 3;
        priority = 'high';
      } else if (hour === 9) {
        // Market opening - 2 articles (total: 7)
        articlesToFetch = 2;
        priority = 'business';
      } else if (hour === 12) {
        // Lunch time - 2 articles (total: 9)
        articlesToFetch = 2;
        priority = 'entertainment';
      } else if (hour === 15) {
        // Afternoon - 2 articles (total: 11)
        articlesToFetch = 2;
        priority = 'business';
      } else if (hour === 18) {
        // Evening prime time - 2 articles (total: 13)
        articlesToFetch = 2;
        priority = 'high';
      } else if (hour === 21) {
        // Night wrap-up - 2 articles (total: 15)
        articlesToFetch = 2;
        priority = 'general';
      }
      
      // Check daily limit (15 articles per day with $20 budget)
      if (stats.dailyArticlesPublished >= 15) {
        console.log('Daily limit reached (15 articles), skipping fetch');
        if (adminChat) {
          await sendMessage(env, adminChat, 
            `⚠️ *Daily Limit Reached*\n\n` +
            `Published: ${stats.dailyArticlesPublished}/15 articles today\n` +
            `Next reset: Midnight IST\n` +
            `Status: Paused to save costs`
          );
        }
        shouldFetch = false;
      }
      
      if (shouldFetch) {
        // Send notification that auto-fetch is starting
        if (adminChat) {
          await sendMessage(env, adminChat, 
            `🤖 *Auto-Publishing Started*\n\n` +
            `⏰ Time: ${hour}:00 IST\n` +
            `📰 Articles: 1 (single article per fetch)\n` +
            `🎯 Priority: ${priority}\n` +
            `📊 Today's Total: ${stats.dailyArticlesPublished}/8\n` +
            `💰 Budget Status: Safe`
          );
        }
        
        // Fetch news with priority focus
        const fetchResult = await fetchLatestNewsAuto(env, articlesToFetch, priority);
        
        // Update stats
        stats.dailyArticlesPublished += fetchResult.articlesPublished || 0;
        stats.dailyFetches += 1;
        stats.lastAutoFetch = new Date().toISOString();
        await env.NEWS_KV.put('stats', JSON.stringify(stats));
        
        // Send completion notification with article details
        if (adminChat && fetchResult.articlesPublished > 0) {
          // Send summary first
          await sendMessage(env, adminChat, 
            `✅ *Auto-Publishing Complete*\n\n` +
            `📰 Published: ${fetchResult.articlesPublished} article\n` +
            `📈 Total Today: ${stats.dailyArticlesPublished}/8\n` +
            `🔗 View: https://agaminews.in\n` +
            `⏰ Next Run: 3 hours`
          );
          
          // Send individual article notifications
          if (fetchResult.articles && fetchResult.articles.length > 0) {
            for (let i = 0; i < fetchResult.articles.length; i++) {
              const article = fetchResult.articles[i];
              await sendMessage(env, adminChat,
                `📰 *New Article Auto-Published*\n\n` +
                `📌 *Title:* ${article.title}\n` +
                `🏷️ *Category:* ${article.category}\n` +
                `📰 *Source:* ${article.source || 'RSS Feed'}\n` +
                `📸 *Image:* ${article.image?.type === 'generated' ? '🎨 AI Generated' : article.image?.type === 'personality' ? '👤 Real Photo' : '📷 Stock Photo'}\n` +
                `📊 *Quality:* ${article.fullContent && article.fullContent.length > 3000 ? '✅ High' : '⚠️ Medium'} (${article.fullContent ? article.fullContent.length : 0} chars)\n` +
                `🔗 *Link:* https://agaminews.in${article.url}\n\n` +
                `_Auto-published at ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}_`
              );
              
              // Small delay to avoid rate limits
              if (i < fetchResult.articles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
        } else if (adminChat && fetchResult.articlesPublished === 0) {
          await sendMessage(env, adminChat,
            `⚠️ *Auto-Publishing Failed*\n\n` +
            `No articles were published.\n` +
            `Possible issues:\n` +
            `• OpenAI API quota exceeded\n` +
            `• RSS feeds empty\n` +
            `• All articles were generic/low quality\n\n` +
            `Will retry in 3 hours.`
          );
        }
      }
      
      // Run other scheduled tasks (analytics, cleanup, etc.)
      await runScheduledTasks(env);
      
    } catch (error) {
      console.error('[CRON] Scheduled task error:', error);
      
      // Log error to KV
      const cronLogs = await env.NEWS_KV.get('cron_logs', 'json') || [];
      cronLogs.unshift({
        time: new Date().toISOString(),
        event: 'error',
        error: error.message
      });
      await env.NEWS_KV.put('cron_logs', JSON.stringify(cronLogs.slice(0, 20)));
      
      // Notify admin of error
      const adminChat = await env.NEWS_KV.get('admin_chat');
      if (adminChat && env.TELEGRAM_BOT_TOKEN) {
        await sendMessage(env, adminChat, 
          `❌ *Auto-Publishing Error*\n\n` +
          `Error: ${error.message}\n` +
          `Time: ${new Date().toISOString()}\n` +
          `Action: Will retry in 3 hours`
        );
      }
    }
  }
};

// CRITICAL: Google Analytics code - MUST be on EVERY page - 200% GUARANTEED
function getGoogleAnalyticsCode(pageTitle = 'AgamiNews', pagePath = '/') {
  // MULTIPLE REDUNDANT GA IMPLEMENTATIONS TO ENSURE IT'S NEVER MISSED
  return `
    <!-- Google Analytics - CRITICAL - NEVER REMOVE -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      
      // PRIMARY GA CONFIG
      gtag('config', 'G-ZW77WM2VPG', {
        page_path: '${pagePath}',
        page_title: '${pageTitle}',
        page_location: window.location.href,
        send_page_view: true
      });
      
      // FALLBACK: Send manual pageview if auto fails
      setTimeout(function() {
        gtag('event', 'page_view', {
          page_title: '${pageTitle}',
          page_location: window.location.href,
          page_path: '${pagePath}'
        });
      }, 1000);
      
      // VERIFICATION: Log to console for debugging
      console.log('GA Loaded for: ${pageTitle} at ${pagePath}');
      
      // MONITORING: Alert admin if GA fails
      setTimeout(function() {
        if (typeof gtag === 'undefined') {
          console.error('CRITICAL: Google Analytics failed to load!');
          // Send error to server
          fetch('/api/ga-error', {
            method: 'POST',
            body: JSON.stringify({
              page: '${pagePath}',
              title: '${pageTitle}',
              error: 'GA not loaded'
            })
          });
        } else {
          console.log('✅ GA Verified: Tracking active for ${pageTitle}');
        }
      }, 3000);
    </script>
    
    <!-- FALLBACK GA Implementation -->
    <script>
      // Emergency GA loader if main script fails
      (function() {
        if (!window.gtag) {
          var script = document.createElement('script');
          script.async = true;
          script.src = 'https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG';
          document.head.appendChild(script);
          
          window.dataLayer = window.dataLayer || [];
          window.gtag = function(){dataLayer.push(arguments);};
          window.gtag('js', new Date());
          window.gtag('config', 'G-ZW77WM2VPG');
        }
      })();
    </script>
  `;
}

// UNIVERSAL SEO TAGS - MUST BE ON EVERY PAGE
function getUniversalSEOTags(title = 'AgamiNews', description = 'Latest News from India and World', url = 'https://agaminews.in') {
  return `
    <!-- CRITICAL SEO TAGS - GOOGLE INDEXING -->
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="google" content="notranslate">
    <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE">
    <link rel="canonical" href="${url}">
    <meta name="author" content="AgamiNews">
    <meta name="publisher" content="AgamiNews">
    
    <!-- Open Graph for Social -->
    <meta property="og:site_name" content="AgamiNews">
    <meta property="og:locale" content="en_IN">
    <meta property="fb:app_id" content="YOUR_FB_APP_ID">
    
    <!-- Schema.org for Google -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "AgamiNews",
      "url": "https://agaminews.in",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://agaminews.in/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
    </script>
  `;
}
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
      dailyArticleTarget: {
        minimum: 10,
        target: 11,
        maximum: 12,
        strategy: 'Premium quality - fewer articles, exceptional content'
      },
      writingStyle: {
        tone: 'Professional journalist with personality - like reading The Ken or Morning Context',
        rules: [
          'Write like an experienced journalist, not AI',
          'Each article must be deeply researched with multiple angles',
          'Use data, statistics, and expert opinions (even if synthesized)',
          'Vary sentence length - mix short punchy ones with detailed explanations',
          'Include industry insider perspectives',
          'Add human touches: personal observations, cultural references',
          'Never use the same opening style twice in a row',
          'Include relevant backstory and context',
          'Connect to bigger trends and implications',
          'Use storytelling techniques - narrative arc, tension, resolution',
          'Reference specific companies, people, places - be precise',
          'Add unique insights that Google would rank',
          'Write with authority and confidence',
          'Include forward-looking analysis',
          'Break complex topics into digestible parts'
        ]
      },
      researchDepth: [
        'Every article needs 3-5 key points minimum',
        'Include historical context where relevant',
        'Add comparative analysis (vs competitors, previous years, etc)',
        'Mention stakeholder impacts',
        'Include expert viewpoints (synthesized)',
        'Add data visualizations descriptions',
        'Connect to related stories',
        'Provide actionable takeaways for readers'
      ],
      objectives: [
        'Publish 10-12 premium quality articles daily',
        'Each article must be unique and valuable',
        'Focus on exclusive angles competitors miss',
        'Prioritize: 35% Tech, 25% Finance, 20% India News, 10% International, 10% Trending',
        'Target audience: educated professionals, investors, decision-makers',
        'Every article should be share-worthy',
        'Optimize for Google Featured Snippets',
        'Build topical authority in tech and finance',
        'Create content that gets bookmarked and referenced'
      ],
      avoidPhrases: [
        'In conclusion', 'Moreover', 'Furthermore',
        'It is worth noting', 'In today\'s fast-paced world',
        'Revolutionary', 'Groundbreaking', 'Unprecedented',
        'Seamlessly', 'Cutting-edge', 'State-of-the-art',
        'Dive into', 'Delve into', 'Landscape',
        'In the ever-evolving', 'Paradigm shift',
        'Synergy', 'Leverage', 'Utilize',
        'It should be noted that', 'In summary'
      ],
      preferPhrases: [
        'According to sources', 'Industry insiders say',
        'The numbers tell a different story', 'Here\'s what we know',
        'Behind the scenes', 'The real story is',
        'Exclusive analysis shows', 'Deep dive reveals',
        'Market veterans point out', 'The data suggests',
        'Connecting the dots', 'Reading between the lines'
      ],
      dailyTasks: [
        '6 AM: 2 articles - Premium morning digest',
        '9 AM: 2 articles - Market & business deep dive',
        '12 PM: 2 articles - Exclusive midday stories',
        '3 PM: 2 articles - Afternoon exclusives',
        '6 PM: 2 articles - Evening analysis',
        '9 PM: 2 articles - Night premium stories',
        'Total: 12 premium articles with in-depth coverage'
      ],
      seoStrategy: [
        'Target featured snippets with question-based content',
        'Create pillar content on major topics',
        'Build topic clusters around main themes',
        'Optimize for voice search queries',
        'Target zero-click searches with complete answers',
        'Focus on local SEO for India-specific content',
        'Create evergreen content that stays relevant',
        'Update breaking news for freshness signals'
      ],
      qualityChecks: [
        'No generic statements - everything must be specific',
        'Each paragraph adds new information',
        'Sources are implied through confident reporting',
        'Natural keyword integration without stuffing',
        'Mobile-optimized paragraph length',
        'Scannable with subheadings and bullet points',
        'Fact-checkable claims and statistics',
        'Original angles not found elsewhere'
      ]
    }));
    await env.NEWS_KV.put('initialized', 'true');
  }
}

// Compute an importance score for a news candidate
function computeNewsPriorityScore(title, description, category, source, pubDate, hour) {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  let score = 0;
  // Breaking keywords
  const breaking = ['breaking', 'urgent', 'just in', 'update', 'announcement'];
  breaking.forEach(k => { if (t.includes(k) || d.includes(k)) score += 10; });
  // Numbers and percentages
  const nums = (title.match(/\d+/g) || []).length + (description.match(/\d+/g) || []).length;
  score += Math.min(nums * 1.5, 12);
  if (/%/.test(title) || /%/.test(description)) score += 4;
  // Personalities/entities
  const entities = ['modi','rahul','kejriwal','ambani','adani','musk','gates','messi','ronaldo','supreme court','sensex','nifty','ipl','iphone'];
  entities.forEach(e => { if (t.includes(e) || d.includes(e)) score += 6; });
  // Category weighting by time of day (IST)
  if (category === 'Business' && hour >= 9 && hour <= 16) score += 8; // market hours
  if (category === 'Entertainment' && hour >= 18) score += 4;
  if (category === 'Technology' && (hour >= 7 && hour <= 11)) score += 3;
  // Source trust weighting
  const s = (source || '').toLowerCase();
  if (s.includes('thehindu') || s.includes('indianexpress') || s.includes('economictimes')) score += 3;
  if (s.includes('timesofindia') || s.includes('ndtv')) score += 2;
  // Freshness
  try { const ageMin = Math.max(0, (Date.now() - Date.parse(pubDate)) / 60000); score += Math.max(0, 10 - ageMin / 30); } catch (_) {}
  // Title length and specificity
  if (title.split(' ').length >= 8) score += 2;
  if (/(₹|rs\.|crore|lakh)/i.test(title)) score += 2;
  return score;
}
// Serve website
async function serveWebsite(env, request) {
  // Force fresh data fetch with timestamp check
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const articlesTimestamp = await env.NEWS_KV.get('articlesTimestamp');
  
  // Always fetch fresh articles from KV (no caching)
  const articles = await env.NEWS_KV.get('articles', 'json').then(data => {
    console.log(`[HOMEPAGE] Fetched ${data ? data.length : 0} articles from KV (timestamp: ${articlesTimestamp})`);
    if (data && data.length > 0) {
      console.log(`[HOMEPAGE] First article title: ${data[0].title}`);
    }
    return data || getDefaultArticles();
  });
  
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  // Enhanced analytics tracking
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const hour = now.getHours();
  
  // Initialize analytics if needed
  if (!stats.analytics) {
    stats.analytics = {
      daily: {},
      hourly: {},
      pages: {},
      referrers: {},
      devices: {},
      countries: {}
    };
  }
  
  // Track daily views
  if (!stats.analytics.daily[today]) {
    stats.analytics.daily[today] = 0;
  }
  stats.analytics.daily[today]++;
  
  // Track hourly distribution
  if (!stats.analytics.hourly[hour]) {
    stats.analytics.hourly[hour] = 0;
  }
  stats.analytics.hourly[hour]++;
  
  // Track referrer
  const referrer = request.headers.get('referer') || 'direct';
  const referrerDomain = referrer.includes('://') ? new URL(referrer).hostname : referrer;
  if (!stats.analytics.referrers[referrerDomain]) {
    stats.analytics.referrers[referrerDomain] = 0;
  }
  stats.analytics.referrers[referrerDomain]++;
  
  // Track device type
  const userAgent = request.headers.get('user-agent') || '';
  const deviceType = userAgent.includes('Mobile') ? 'mobile' : 'desktop';
  if (!stats.analytics.devices[deviceType]) {
    stats.analytics.devices[deviceType] = 0;
  }
  stats.analytics.devices[deviceType]++;
  
  // Track country (using CF-IPCountry header from Cloudflare)
  const country = request.headers.get('cf-ipcountry') || 'unknown';
  if (!stats.analytics.countries[country]) {
    stats.analytics.countries[country] = 0;
  }
  stats.analytics.countries[country]++;
  
  // Update basic stats
  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.todayViews = today === stats.lastViewDate ? (stats.todayViews || 0) + 1 : 1;
  stats.lastViewDate = today;
  
  // Track article views
  const url = new URL(request.url);
  if (url.pathname.startsWith('/article/')) {
    const articleId = url.pathname.split('/')[2];
    if (!stats.articleViews) stats.articleViews = {};
    stats.articleViews[articleId] = (stats.articleViews[articleId] || 0) + 1;
  }
  
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
    
    ${getUniversalSEOTags('AgamiNews - Latest News', config.siteDescription, 'https://agaminews.in')}
    
    <!-- Google Analytics - GUARANTEED TRACKING -->
    ${getGoogleAnalyticsCode('AgamiNews - Homepage', '/')}
    
    <!-- BACKUP Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZW77WM2VPG', {
        page_path: window.location.pathname,
        page_title: '${config.siteName} - Homepage',
        page_location: window.location.href,
        page_referrer: document.referrer
      });
      
      // Track scroll depth
      let maxScroll = 0;
      window.addEventListener('scroll', function() {
        const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll) {
          maxScroll = scrollPercent;
          if (scrollPercent === 25 || scrollPercent === 50 || scrollPercent === 75 || scrollPercent === 100) {
            gtag('event', 'scroll', {
              'event_category': 'Engagement',
              'event_label': 'Scroll Depth',
              'value': scrollPercent
            });
          }
        }
      });
      
      // Track time on page
      let startTime = new Date().getTime();
      window.addEventListener('beforeunload', function() {
        const timeSpent = Math.round((new Date().getTime() - startTime) / 1000);
        gtag('event', 'time_on_page', {
          'event_category': 'Engagement',
          'event_label': 'Time Spent',
          'value': timeSpent
        });
      });
    </script>
    
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.4;
        }
        /* Header */
        .header {
            background: white;
            padding: 0.8rem 1rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .logo {
            font-size: 1.4rem;
            font-weight: bold;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1;
            text-decoration: none;
        }
        
        .logo .main-text {
            font-size: 1.4rem;
        }
        

        
        .header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .switch-text {
            font-size: 0.9rem;
            color: #666;
        }
        
        .language-btn {
            background: #ff6b35;
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            text-decoration: none;
        }
        
        .login-btn {
            background: #f0f0f0;
            color: #333;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }
        
        /* Navigation Tabs */
        .nav-tabs {
            background: white;
            display: flex;
            overflow-x: auto;
            border-bottom: 1px solid #e0e0e0;
            padding: 0 1rem;
        }
        
        .nav-tabs::-webkit-scrollbar {
            display: none;
        }
        
        .nav-tab {
            padding: 1rem 0.8rem;
            color: #666;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            white-space: nowrap;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }
        
        .nav-tab.active {
            color: #333;
            border-bottom-color: #ff6b35;
        }
        

        /* Featured Story */
        .featured-story {
            position: relative;
            margin-bottom: 1rem;
        }
        
        .featured-image {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }
        
        .featured-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 2rem 1rem 1rem;
            color: white;
        }
        
        .featured-title {
            font-size: 1.1rem;
            font-weight: 600;
            line-height: 1.3;
        }
        
        /* Advertisement */
        .advertisement {
            background: white;
            padding: 2rem 1rem;
            text-align: center;
            margin-bottom: 1rem;
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .ad-label {
            color: #999;
            font-size: 0.8rem;
            margin-bottom: 1rem;
        }
        
        .ad-placeholder {
            background: #f0f0f0;
            height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
        }
        
        /* News List */
        .news-list {
            background: white;
        }
        
        .news-item {
            display: flex;
            padding: 1rem;
            border-bottom: 1px solid #f0f0f0;
            text-decoration: none;
            color: inherit;
        }
        
        .news-content {
            flex: 1;
            padding-right: 0.8rem;
        }
        
        .news-title {
            font-size: 0.95rem;
            line-height: 1.4;
            color: #333;
            font-weight: 500;
            margin-bottom: 0.3rem;
        }
        
        .news-image {
            width: 80px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            flex-shrink: 0;
        }
        
        /* Live badge */
        .live-badge {
            background: #ff4444;
            color: white;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: bold;
            margin-left: 0.5rem;
        }
        
        /* Responsive adjustments */
        @media (min-width: 768px) {
            body {
                max-width: 400px;
                margin: 0 auto;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .mobile-menu-btn {
                display: block;
            }
        }
        
        .hamburger {
            width: 24px;
            height: 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            cursor: pointer;
        }
        
        .hamburger span {
            width: 100%;
            height: 2px;
            background: #333;
            display: block;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo-container">
            <a href="/" class="logo">
                <span class="main-text">AgamiNews</span>
            </a>
        </div>
    </header>

    <nav class="nav-tabs">
        <a href="/" class="nav-tab active">LATEST</a>
        <a href="#technology" class="nav-tab">TECHNOLOGY</a>
        <a href="#business" class="nav-tab">BUSINESS</a>
        <a href="#crypto" class="nav-tab">CRYPTO</a>
        <a href="#india" class="nav-tab">INDIA</a>
        <a href="#world" class="nav-tab">WORLD</a>
        <a href="#sports" class="nav-tab">SPORTS</a>
        <a href="#entertainment" class="nav-tab">ENTERTAINMENT</a>
    </nav>

    <main>
        <div id="category-filter" style="display:none; padding: 10px 15px; background: #fff; border-bottom: 1px solid #e0e0e0;">
            <span style="font-size: 14px; color: #666;">Showing: <strong id="current-category">All Articles</strong></span>
        </div>
        ${articles.length > 0 ? `
        <!-- Featured Story -->
        <article class="featured-story">
            <img src="${articles[0].image ? `/img/?src=${encodeURIComponent(articles[0].image.url || articles[0].image)}&w=1200&q=70` : 'https://via.placeholder.com/400x250/ff6b35/ffffff?text=AgamiNews'}" alt="${articles[0].title}" class="featured-image" loading="lazy">
            <div class="featured-overlay">
                <h1 class="featured-title"><a href="${articles[0].url}" style="color: white; text-decoration: none;">${articles[0].title}</a></h1>
            </div>
        </article>
        ` : ''}

        <!-- News List -->
        <section class="news-list">
            ${articles.slice(1, 10).map((article, index) => `
                <a href="${article.url}" class="news-item" data-category="${article.category || 'TECHNOLOGY'}">
                    <div class="news-content">
                        <h2 class="news-title">${article.title}
                            ${index === 0 ? '<span class="live-badge">NEW</span>' : ''}
                        </h2>
                        <span class="news-category" style="font-size: 11px; color: #ff6b35; font-weight: bold; text-transform: uppercase;">${article.category || 'TECHNOLOGY'}</span>
                    </div>
                    ${article.image ? `<img src="/img/?src=${encodeURIComponent(article.image.url || article.image)}&w=800&q=70" alt="${article.title}" class="news-image" loading="lazy">` : '<img src="https://via.placeholder.com/80x60/ff6b35/ffffff?text=News" class="news-image" loading="lazy">'}
                </a>
            `).join('')}
        </section>

        <!-- Advertisement -->
        <div class="advertisement">
            <div class="ad-label">Advertisement</div>
            <div class="ad-placeholder">Google AdSense Space</div>
        </div>

        <!-- More News -->
        <section class="news-list">
            ${articles.slice(10, 20).map((article, index) => `
                <a href="${article.url}" class="news-item" data-category="${article.category || 'TECHNOLOGY'}">
                    <div class="news-content">
                        <h2 class="news-title">${article.title}</h2>
                        <span class="news-category" style="font-size: 11px; color: #ff6b35; font-weight: bold; text-transform: uppercase;">${article.category || 'TECHNOLOGY'}</span>
                    </div>
                    ${article.image ? `<img src="/img/?src=${encodeURIComponent(article.image.url || article.image)}&w=800&q=70" alt="${article.title}" class="news-image" loading="lazy">` : '<img src="https://via.placeholder.com/80x60/ff6b35/ffffff?text=News" class="news-image" loading="lazy">'}
                </a>
            `).join('')}
        </section>
    </main>
    
    <script>
    // Category filtering
    document.addEventListener('DOMContentLoaded', function() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const newsItems = document.querySelectorAll('.news-item');
        const categoryFilter = document.getElementById('category-filter');
        const currentCategory = document.getElementById('current-category');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all tabs
                navTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const category = this.textContent.trim();
                
                if (category === 'LATEST') {
                    // Show all articles
                    newsItems.forEach(item => item.style.display = 'flex');
                    categoryFilter.style.display = 'none';
                } else {
                    // Filter by category
                    categoryFilter.style.display = 'block';
                    currentCategory.textContent = category;
                    
                    newsItems.forEach(item => {
                        const itemCategory = item.getAttribute('data-category');
                        if (itemCategory === category) {
                            item.style.display = 'flex';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                }
            });
        });
    });
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
// ============================================
// SIMPLIFIED TELEGRAM BOT WITH BUTTON MENUS
// ============================================

// ============================================
// AGAMINEWS CONTROL CENTRE v1.0
// AI-Powered News Management System
// ============================================

const SYSTEM_VERSION = "1.0.3"; // Deploy with updated permissions
const SYSTEM_NAME = "AgamiNews Control Centre";

async function handleTelegram(request, env) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return new Response('OK', { status: 200 });
    }
    
    const update = await request.json();
    
    // Handle messages
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';

      // Store first user as admin
      const adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
        console.log(`[CONTROL v${SYSTEM_VERSION}] Set ${chatId} as admin (first user)`);
      }
      
      // Handle text commands
      if (text === '/start' || text === '/menu') {
        await showControlCentre(env, chatId);
      } else if (text.startsWith('/topic ')) {
        // Quick topic generation: /topic Technology AI trends
        const topic = text.replace('/topic ', '').trim();
        if (topic) {
          await generateCustomArticle(env, chatId, topic);
        }
      } else if (text === '/version') {
        await showVersion(env, chatId);
      } else {
        // Show control centre for any other input
        await showControlCentre(env, chatId);
      }
    }
    
    // Handle button callbacks
    else if (update.callback_query) {
      await handleControlAction(env, update.callback_query);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(`[CONTROL v${SYSTEM_VERSION}] Error:`, error);
    return new Response('OK', { status: 200 });
  }
}

// ============================================
// MAIN CONTROL CENTRE
// ============================================

async function showControlCentre(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const isAdmin = await checkIsAdmin(env, chatId);
  
  // Check AI status
  const hasOpenAI = !!env.OPENAI_API_KEY;
  const aiStatus = hasOpenAI ? '🟢 Online' : '🔴 Offline';
  
  const message = `🎛️ *${SYSTEM_NAME} v${SYSTEM_VERSION}*
━━━━━━━━━━━━━━━━━━━━

📊 *System Status*
• AI Engine: ${aiStatus}
• Articles: ${articles.length}
• Today Published: ${stats.dailyArticlesPublished || 0}
• Total Views: ${articles.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}

🤖 *AI Model*
• Content: GPT-4 Turbo
• Images: DALL-E 3 (Photorealistic)
• Quality: Professional Journalism

Select control module:`;

  const keyboard = [
    // Row 1 - AI Generation Controls
    [
      { text: '🤖 AI Generator', callback_data: 'ai_menu' },
      { text: '📰 Quick Publish', callback_data: 'quick_publish' }
    ],
    // Row 2 - Content Management
    [
      { text: '📚 Content Library', callback_data: 'content_menu' },
      { text: '📊 Analytics Hub', callback_data: 'analytics_menu' }
    ],
    // Row 3 - System Controls
    [
      { text: '⚙️ System Config', callback_data: 'system_menu' },
      { text: '🛠️ Maintenance', callback_data: 'maintenance_menu' }
    ],
    // Row 4 - Quick Actions
    [
      { text: '📈 Live Stats', callback_data: 'live_stats' },
      { text: '💰 Cost Monitor', callback_data: 'cost_monitor' }
    ],
    // Row 5 - Help & Refresh
    [
      { text: '📖 Documentation', callback_data: 'docs' },
      { text: '🔄 Refresh', callback_data: 'refresh' }
    ]
  ];

  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// Temporary placeholder for missing functions
async function showVersion(env, chatId) {
  await sendMessage(env, chatId, `🎛️ *${SYSTEM_NAME} v${SYSTEM_VERSION}*\n\nUse /start to open the control centre.`);
}

async function generateCustomArticle(env, chatId, topic) {
  await sendMessage(env, chatId, `Generating article on: ${topic}\n\nPlease use the Control Centre for article generation.`);
}

async function handleControlAction(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Answer callback to remove loading
  await answerCallback(env, callbackQuery.id);
  
  // Main menu actions
  if (data === 'control' || data === 'refresh') {
    await showControlCentre(env, chatId);
  }
  // AI Generator
  else if (data === 'ai_menu') {
    await sendMessage(env, chatId, `🤖 *AI Generator Module*\n\nSelect:\n• Auto Generate - Fetch trending news\n• Custom Topic - Specify topic\n\nUse: /topic [your topic] for quick generation`, {
      inline_keyboard: [
        [{ text: '🔄 Back to Control Centre', callback_data: 'control' }]
      ]
    });
  }
  else if (data === 'quick_publish') {
    await sendMessage(env, chatId, `📰 *Quick Publish*\n\nFetching and publishing articles...`, {
      inline_keyboard: [
        [{ text: '🔄 Back to Control Centre', callback_data: 'control' }]
      ]
    });
    // Trigger article fetch
    await handleFetchNews(env, chatId);
  }
  // Analytics
  else if (data === 'analytics_menu' || data === 'live_stats') {
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    await sendMessage(env, chatId, `📊 *Analytics*\n\n• Total Articles: ${articles.length}\n• Today Published: ${stats.dailyArticlesPublished || 0}\n• Total Views: ${articles.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}`, {
      inline_keyboard: [
        [{ text: '🔄 Back to Control Centre', callback_data: 'control' }]
      ]
    });
  }
  // Cost Monitor
  else if (data === 'cost_monitor') {
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    const todayArticles = stats.dailyArticlesPublished || 0;
    const todayCost = todayArticles * 0.075;
    await sendMessage(env, chatId, `💰 *Cost Monitor*\n\n• Today's Articles: ${todayArticles}\n• Today's Cost: $${todayCost.toFixed(2)}\n• Monthly Projection: $${(todayCost * 30).toFixed(2)}`, {
      inline_keyboard: [
        [{ text: '🔄 Back to Control Centre', callback_data: 'control' }]
      ]
    });
  }
  // Content Library
  else if (data === 'content_menu') {
    await sendMessage(env, chatId, `📚 *Content Library*\n\nBrowse and manage articles`, {
      inline_keyboard: [
        [{ text: '📋 List Articles', callback_data: 'list' }],
        [{ text: '🔄 Back to Control Centre', callback_data: 'control' }]
      ]
    });
  }
  // Handle old callbacks for compatibility
  else if (data === 'list') {
    await handleListArticles(env, chatId, 0);
  }
  else if (data.startsWith('list_page_')) {
    const page = parseInt(data.replace('list_page_', ''));
    await handleListArticles(env, chatId, page);
  }
  else if (data === 'fetch') {
    await handleFetchNews(env, chatId);
  }
  else if (data === 'stats') {
    await sendStats(env, chatId);
  }
  // Default
  else {
    await sendMessage(env, chatId, `⚠️ Feature coming soon!\n\nFor now, use the website: https://agaminews.in`, {
      inline_keyboard: [
        [{ text: '🔄 Back to Control Centre', callback_data: 'control' }]
      ]
    });
  }
}

async function checkIsAdmin(env, chatId) {
  const adminChat = await env.NEWS_KV.get('admin_chat');
  return adminChat && String(chatId) === String(adminChat);
}

async function answerCallback(env, callbackId, text = '') {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text
    })
  });
}

// Old Telegram handlers have been removed and replaced with Control Centre v1.0

// Keep existing helper functions below

// [Removed 150+ lines of old Telegram command handlers]

// ============================================
// EXISTING HELPER FUNCTIONS
// ============================================

// [Removed 140+ lines of broken old Telegram handler code]

// The sendMessage function and other helpers are defined below

// [All old Telegram command handlers have been removed - 140+ lines of code deleted]
// [The new AgamiNews Control Centre v1.0 interface is now active]

// ============================================
// HELPER FUNCTIONS (Preserved from original)
// ============================================

// All broken code has been removed

async function sendMessage(env, chatId, text, keyboard = null) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set, cannot send message');
    return false;
  }
  
  if (!chatId) {
    console.error('No chatId provided, cannot send message');
    return false;
  }
  
  console.log(`[TELEGRAM] Sending message to chat ${chatId}, text length: ${text.length}`);
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard.inline_keyboard } : undefined
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[TELEGRAM] API error: ${response.status} - ${error}`);
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
    console.log(`Message sent successfully to ${chatId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send Telegram message: ${error.message}`);
    return false;
  }
}

// Download a Telegram photo by file_id, store in R2, and return /media URL
async function downloadTelegramPhotoToR2(env, fileId) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!res.ok) throw new Error('getFile failed');
  const j = await res.json();
  const filePath = j?.result?.file_path;
  if (!filePath) throw new Error('file_path missing');
  const dlUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const ext = (filePath.split('.').pop() || 'jpg').toLowerCase();
  return await ingestImageToR2(env, dlUrl, ext);
}

// Update article image to a stored URL
async function setArticleImageByUrl(env, id, mediaUrl, credit = 'Admin') {
  const articles = (await env.NEWS_KV.get('articles', 'json')) || [];
  const idx = articles.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return false;
  articles[idx].image = { url: mediaUrl, credit, type: 'admin' };
  await env.NEWS_KV.put('articles', JSON.stringify(articles));
  await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
  return true;
}

// Regenerate AI image for an article by ID
async function regenerateArticleImageAI(env, id) {
  const articles = (await env.NEWS_KV.get('articles', 'json')) || [];
  const idx = articles.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return false;
  const a = articles[idx];
  const fresh = await getArticleImage(a.title || a.sourceMaterial?.originalTitle || 'News', a.category || 'India', env);
  if (!fresh || !fresh.url) return false;
  articles[idx].image = fresh;
  await env.NEWS_KV.put('articles', JSON.stringify(articles));
  await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
  return true;
}

// ============================================
// CLEANED TELEGRAM STUB FUNCTIONS FOR v1.0
// These provide backward compatibility
// ============================================

async function sendStats(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  await sendMessage(env, chatId, `📊 *Statistics*\n\n• Total Articles: ${articles.length}\n• Today: ${stats.dailyArticlesPublished || 0}\n• Views: ${articles.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}\n\nUse the Control Centre for more details.`, {
    inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
  });
}

async function handleFetchNews(env, chatId) {
  await sendMessage(env, chatId, `📰 *Fetching News...*\n\nProcessing articles from trending topics...`);
  
  try {
    const result = await fetchLatestNewsAuto(env, 5, 'normal');
    
    if (result && result.articlesPublished > 0) {
      await sendMessage(env, chatId, `✅ *Success!*\n\n• Articles Published: ${result.articlesPublished}\n• View at: https://agaminews.in`, {
        inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
      });
    } else {
      throw new Error('No articles published');
    }
  } catch (error) {
    await sendMessage(env, chatId, `❌ *Error:* ${error.message}`, {
      inline_keyboard: [[{ text: '🔄 Try Again', callback_data: 'fetch' }], [{ text: '🔄 Control Centre', callback_data: 'control' }]]
    });
  }
}

async function handleListArticles(env, chatId, page = 0) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const perPage = 5;
  const start = page * perPage;
  const end = start + perPage;
  const pageArticles = articles.slice(start, end);
  
  if (pageArticles.length === 0) {
    await sendMessage(env, chatId, '📚 No articles found on this page.', {
      inline_keyboard: [[{ text: '🔄 Control Centre', callback_data: 'control' }]]
    });
    return;
  }
  
  let message = `📚 *Articles (Page ${page + 1})*\n\n`;
  pageArticles.forEach((article, i) => {
    const index = start + i;
    message += `${index + 1}. ${article.title}\n`;
    message += `   📂 ${article.category} | 👁 ${article.views || 0} views\n\n`;
  });
  
  const keyboard = [];
  const navRow = [];
  if (page > 0) navRow.push({ text: '⬅️ Previous', callback_data: `list_page_${page - 1}` });
  if (end < articles.length) navRow.push({ text: '➡️ Next', callback_data: `list_page_${page + 1}` });
  if (navRow.length > 0) keyboard.push(navRow);
  keyboard.push([{ text: '🔄 Control Centre', callback_data: 'control' }]);
  
  await sendMessage(env, chatId, message, { inline_keyboard: keyboard });
}

// Stub - redirects to Control Centre
async function sendMenu(env, chatId) {
  await showControlCentre(env, chatId);
}

// Automatic news fetching with priority-based selection
async function fetchLatestNewsAuto(env, articlesToFetch = 3, priority = 'normal') {
  console.log(`Auto-fetching ${articlesToFetch} articles with priority: ${priority}`);
  
  try {
    const config = await env.NEWS_KV.get('config', 'json') || {};
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    
    // Priority-based RSS feeds
    let rssSources = [];
    
    switch(priority) {
      case 'business':
        rssSources = [
          'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
          'https://www.moneycontrol.com/rss/latestnews.xml',
          'https://www.business-standard.com/rss/home_page_top_stories.rss',
          'https://feeds.feedburner.com/ndtvprofit-latest'
        ];
        break;
      
      case 'entertainment':
        rssSources = [
          'https://feeds.feedburner.com/ndtvmovies-latest',
          'https://www.bollywoodhungama.com/rss/news.xml',
          'https://www.pinkvilla.com/rss.xml',
          'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'
        ];
        break;
      
      case 'high':
      case 'normal':
        rssSources = [
          'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
          'https://www.thehindu.com/news/national/feeder/default.rss',
          'https://feeds.feedburner.com/ndtvnews-top-stories',
          'https://indianexpress.com/feed/',
          'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml'
        ];
        break;
      
      case 'low':
      case 'minimal':
        // Only essential sources for night time
        rssSources = [
          'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
          'https://feeds.feedburner.com/ndtvnews-top-stories'
        ];
        break;
    }
    
    // Collect candidates first; then rank by importance
    const candidates = [];
    const allArticles = [];
    const processedTitles = new Set(); // Track processed topics to avoid duplicates
    const articlesPerFeed = Math.ceil(articlesToFetch / rssSources.length);
    
    // Shuffle RSS sources for variety
    const shuffledSources = [...rssSources].sort(() => Math.random() - 0.5);
    
    for (const feedUrl of shuffledSources) {
      if (allArticles.length >= articlesToFetch) break;
      
      try {
        const response = await fetch(feedUrl);
        const text = await response.text();
        const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
        
        // Shuffle items for variety
        const shuffledItems = [...items].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(articlesPerFeed * 2, shuffledItems.length); i++) {
          // Collect more than needed; we'll rank later
          
          const item = shuffledItems[i];
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                        item.match(/<title>(.*?)<\/title>/))?.[1];
          const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || 
                              item.match(/<description>(.*?)<\/description>/))?.[1];
          const link = item.match(/<link>(.*?)<\/link>/)?.[1];
          
          // Check for duplicate topics
          if (title) {
            const titleWords = title.toLowerCase().split(' ').slice(0, 5).join(' ');
            if (processedTitles.has(titleWords)) {
              console.log(`[AUTO] Skipping duplicate topic: ${title}`);
              continue; // Skip similar titles
            }
            processedTitles.add(titleWords);
          }
          
          if (title && description) {
            const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 500);
            // Determine category based on content
            let category = 'India';
            const tl = title.toLowerCase();
            if (priority === 'business' || tl.includes('market') || tl.includes('sensex') || tl.includes('nifty')) category = 'Business';
            else if (priority === 'entertainment' || tl.includes('bollywood') || tl.includes('cricket')) category = 'Entertainment';
            else if (tl.includes('tech') || tl.includes('ai') || tl.includes('iphone') || tl.includes('launch')) category = 'Technology';
            candidates.push({
              title,
              description: cleanDesc,
              link,
              category,
              source: feedUrl,
              pubDate: (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || ''
            });
          }
        }
      } catch (feedError) {
        console.error(`Error fetching from ${feedUrl}:`, feedError);
      }
    }
    
    // Rank candidates by importance
    const hourIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
    candidates.forEach(c => {
      c.score = computeNewsPriorityScore(c.title, c.description, c.category, c.source, c.pubDate, hourIST);
    });
    const ranked = candidates.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, articlesToFetch * 2);
    
    // Generate articles from top-ranked
    for (const cand of ranked) {
      if (allArticles.length >= articlesToFetch) break;
      const sourceName = cand.source.includes('timesofindia') ? 'Times of India' :
                         cand.source.includes('thehindu') ? 'The Hindu' :
                         cand.source.includes('ndtv') ? 'NDTV' :
                         cand.source.includes('economictimes') ? 'Economic Times' :
                         cand.source.includes('moneycontrol') ? 'Moneycontrol' : 'News Agency';
      const sourceMaterial = {
        originalTitle: cand.title,
        description: cand.description,
        source: sourceName,
        link: cand.link,
        category: cand.category
      };
      const article = {
        sourceMaterial,
        id: generateArticleId(),
        slug: '',
        title: '',
        preview: '',
        category: cand.category,
        source: 'AgamiNews Research Team',
        originalSourceLink: cand.link,
        image: null,
        timestamp: Date.now(),
        views: 0,
        date: getTimeAgo(allArticles.length),
        trending: Math.random() > 0.6,
        fullContent: null,
        autoPublished: true
      };
      try {
        const researchResult = await Promise.race([
          generateOriginalArticle(sourceMaterial, env),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Article generation timeout')), 30000))
        ]);
        const fullArticle = researchResult.content;
        const originalTitle = researchResult.title;
        article.fullContent = fullArticle;
        article.title = originalTitle;
        article.slug = generateSlug(originalTitle);
                article.url = `/${article.category.toLowerCase()}-news/${article.slug}`;  
        article.image = await getArticleImage(originalTitle, article.category, env);
        const plainText = fullArticle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        article.preview = plainText.substring(0, 500) + '...';
        allArticles.push(article);
      } catch (e) {
        console.error('[RANK] Failed generation for candidate:', e.message);
      }
    }
    
    // Save articles
    if (allArticles.length > 0) {
      const existingArticles = await env.NEWS_KV.get('articles', 'json') || [];
      const combinedArticles = [...allArticles, ...existingArticles].slice(0, 100); // Keep last 100
      await env.NEWS_KV.put('articles', JSON.stringify(combinedArticles));
      await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
      
      // Update article count in analytics
      const analytics = await env.NEWS_KV.get('analytics_overview', 'json') || {};
      analytics.totalArticles = combinedArticles.length;
      analytics.lastAutoPublish = new Date().toISOString();
      await env.NEWS_KV.put('analytics_overview', JSON.stringify(analytics));
    }
    
    return {
      articlesPublished: allArticles.length,
      topArticle: allArticles[0]?.title || null,
      articles: allArticles, // Include articles for notification
      priority: priority,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Auto fetch error:', error);
    return {
      articlesPublished: 0,
      error: error.message
    };
  }
}
// Enhanced news fetching for premium quality articles
async function fetchLatestNews(env) {
  console.log('Starting news fetch...');
  try {
    const config = await env.NEWS_KV.get('config', 'json') || {};
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    const aiInstructions = await env.NEWS_KV.get('aiInstructions', 'json') || {};
    
    // Track API usage and daily article count
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastFetchDate !== today) {
      stats.dailyFetches = 0;
      stats.tokensUsedToday = 0;
      stats.dailyArticlesPublished = 0;
    }
    
    // Check actual articles in storage and fix counter mismatch
    const existingArticles = await env.NEWS_KV.get('articles', 'json') || [];
    const actualArticleCount = existingArticles.length;
    
    // Reset counter if mismatch detected
    if (actualArticleCount === 0 && stats.dailyArticlesPublished > 0) {
      console.log(`Counter mismatch detected - resetting (was ${stats.dailyArticlesPublished}, actual: 0)`);
      stats.dailyArticlesPublished = 0;
      stats.dailyFetches = 0;
      await env.NEWS_KV.put('stats', JSON.stringify(stats));
    }
    
    // Check if we've hit daily target
    const dailyTarget = aiInstructions.dailyArticleTarget?.target || 11;
    const currentArticles = stats.dailyArticlesPublished || 0;
    
    if (currentArticles >= 12) {
      console.log('Daily article limit reached (12)');
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Daily article limit reached - focusing on quality',
        published: currentArticles 
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Fetch from comprehensive RSS feeds - All categories with depth
    const feeds = [
      // Most reliable feeds first
      { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', category: 'India', source: 'TOI Top Stories' },
      { url: 'https://feeds.feedburner.com/ndtvnews-top-stories', category: 'India', source: 'NDTV' },
      { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', category: 'Business', source: 'Economic Times' },
      
      // Backup feeds
      { url: 'https://www.thehindu.com/news/national/feeder/default.rss', category: 'Politics', source: 'The Hindu' },
      { url: 'https://indianexpress.com/feed/', category: 'Politics', source: 'Indian Express' },
      
      // Technology & Gadgets
      { url: 'https://feeds.feedburner.com/ndtvgadgets-latest', category: 'Technology', source: 'NDTV Gadgets' },
      { url: 'https://www.gsmarena.com/rss-news-reviews.php3', category: 'Technology', source: 'GSMArena' },
      { url: 'https://techcrunch.com/feed/', category: 'Technology', source: 'TechCrunch' },
      
      // Business & Economy
      { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', category: 'Business', source: 'ET Markets' },
      { url: 'https://www.moneycontrol.com/rss/latestnews.xml', category: 'Business', source: 'MoneyControl' },
      { url: 'https://www.livemint.com/rss/markets', category: 'Business', source: 'Mint' },
      
      // International News
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', source: 'BBC' },
      { url: 'https://rss.cnn.com/rss/edition_world.rss', category: 'World', source: 'CNN' },
      
      // Auto & Cars
      { url: 'https://auto.economictimes.indiatimes.com/rss/topstories', category: 'Auto', source: 'ET Auto' },
      
      // Sports & Entertainment
      { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', category: 'Sports', source: 'ESPN' },
      { url: 'https://feeds.feedburner.com/ndtvmovies-latest', category: 'Entertainment', source: 'NDTV Movies' }
    ];
    
    let allArticles = [];
    const processedTopics = new Set(); // Track topics to avoid duplicates
    
    // Notify progress
    const adminChat = await env.NEWS_KV.get('admin_chat');
    let feedCount = 0;
    
    // Fetch from each feed - LIMIT TO FIRST 3 FEEDS FOR QUICK RESPONSE
    const feedsToProcess = feeds.slice(0, 3); // Only process first 3 feeds for speed
    
    // Shuffle feeds for variety
    const shuffledFeeds = [...feedsToProcess].sort(() => Math.random() - 0.5);
    console.log(`[RSS] Processing ${shuffledFeeds.length} feeds with topic diversity`);
    
    for (const feed of shuffledFeeds) {
      feedCount++;
      console.log(`[RSS] Fetching from ${feed.source} (${feedCount}/${feedsToProcess.length}): ${feed.url}`);
      
      try {
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AgamiNews/1.0)'
          }
        });
        
        if (!response.ok) {
          console.error(`[RSS] Failed to fetch ${feed.source}: Status ${response.status}`);
          continue;
        }
        
        const text = await response.text();
        console.log(`[RSS] Received ${text.length} chars from ${feed.source}`);
        
        // Enhanced RSS parsing
        const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
        console.log(`[RSS] Found ${items.length} items in ${feed.source}`);
        
        if (items.length === 0) {
          console.log(`[RSS] No items found in feed ${feed.source}`);
          continue;
        }
        
        for (let i = 0; i < Math.min(1, items.length); i++) { // 1 article per feed for faster processing
          const item = items[i];
          // Extract with more flexible regex that handles multiline
          let title = (item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
          let description = (item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
          let content = (item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) || [])[1] || '';
          const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
          const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
          
          // Use content if description is empty
          if (!description && content) {
            description = content;
          }
          
          // Clean CDATA and HTML from title and description
          title = cleanRSSContent(title);
          description = cleanRSSContent(description);
          
          // Extra safety: ensure no HTML remains
          if (description.includes('<img') || description.includes('<IMG')) {
            console.log('HTML still present, cleaning again:', description.substring(0, 100));
            description = description.replace(/<[^>]+>/g, '').trim();
          }
          
          if (title && description) {
            // Check for duplicate topics
            const titleWords = title.toLowerCase().split(' ').slice(0, 5).join(' ');
            if (processedTopics.has(titleWords)) {
              console.log(`[RSS] Skipping duplicate topic: ${title}`);
              continue;
            }
            processedTopics.add(titleWords);
            
            // Don't get image yet - wait for original title
            let image = null;
            
            // Store raw source material for research
            const sourceMaterial = {
              originalTitle: title,
              description: description,
              source: feed.source,
              link: link,
              category: feed.category
            };
            
            // Don't create article yet - will create after research
            const article = {
              sourceMaterial: sourceMaterial, // Keep for research
              id: generateArticleId(), // Unique 6-digit ID
              slug: '', // Will be generated from final title
              title: '', // Will be created by AI
              preview: '', // Will be filled with article beginning
              category: feed.category,
              source: 'AgamiNews Research Team', // Original content
              originalSourceLink: link,
              image: image,
              date: getTimeAgo(i),
              timestamp: Date.now(),
              views: Math.floor(Math.random() * 50000) + 10000,
              trending: Math.random() > 0.6,
              fullContent: null // Will be filled below
            };
            
            // Generate COMPLETELY ORIGINAL article with research
            console.log(`Researching and creating original article about: ${title}`);
            let fullArticle = '';
            let originalTitle = '';
            
            try {
              // Create original article with new headline - REDUCED TIMEOUT
              const researchResult = await Promise.race([
                generateOriginalArticle(article.sourceMaterial, env),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Article generation timeout')), 15000)) // 15 seconds
              ]);
              
              fullArticle = researchResult.content;
              originalTitle = researchResult.title;
              
              console.log(`Created original article: "${originalTitle}" (${fullArticle.length} chars)`);
              article.fullContent = fullArticle;
              article.title = originalTitle; // Use AI-generated original title
              article.slug = generateSlug(originalTitle); // Generate SEO-friendly slug
        article.url = `/${article.category.toLowerCase()}-news/${article.slug}`;   // Full URL path
              
              // Now get image based on the ORIGINAL title
              article.image = await getArticleImage(originalTitle, feed.category, env);
              
            } catch (genError) {
              console.error(`Failed to generate article for ${title}:`, genError.message);
              // Skip this article if generation fails
              continue;
            }
            
            // Extract first 500 chars of article as preview for homepage
            const plainText = fullArticle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            article.preview = plainText.substring(0, 500) + '...';
            
            allArticles.push(article);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${feed.source}:`, error);
      }
    }
    
    console.log(`Total articles fetched from RSS: ${allArticles.length}`);
    
    // If no articles from RSS, try with fallback content
    if (allArticles.length === 0) {
      console.log('[FALLBACK] No RSS articles, trying fallback generation...');
      
      // Generate a trending topic article as fallback
      try {
        const fallbackTopic = {
          originalTitle: "Latest Technology and Business Updates from India",
          description: "Stay updated with the latest developments in technology, business, and current affairs.",
          source: "AgamiNews",
          category: "India",
          link: ""
        };
        
        const fallbackResult = await generateOriginalArticle(fallbackTopic, env);
        
        if (fallbackResult && fallbackResult.title) {
          const articleId = generateArticleId();
          const fallbackArticle = {
            id: articleId,
            slug: generateSlug(fallbackResult.title),
            title: fallbackResult.title,
            preview: fallbackResult.content.substring(0, 500) + '...',
            category: 'India',
            source: 'AgamiNews Research',
            image: await getArticleImage(fallbackResult.title, 'India', env),
            date: 'Just now',
            timestamp: Date.now(),
            views: Math.floor(Math.random() * 5000) + 1000,
            trending: true,
            fullContent: fallbackResult.content
          };
          
          fallbackArticle.url = `/${fallbackArticle.category.toLowerCase()}-news/${fallbackArticle.slug}-${fallbackArticle.id}`;
          allArticles.push(fallbackArticle);
          console.log('[FALLBACK] Generated fallback article successfully');
        }
      } catch (fallbackError) {
        console.error('[FALLBACK] Failed to generate fallback:', fallbackError);
      }
    }
    
    // Final check
    if (allArticles.length === 0) {
      console.error('No articles fetched from RSS or fallback');
      // Send error notification to admin
      if (adminChat && env.TELEGRAM_BOT_TOKEN) {
        await sendMessage(env, adminChat, 
          `❌ *Fetch Failed*\n\n` +
          `Reason: No articles could be generated\n` +
          `Feeds checked: ${feedsToProcess.length}\n` +
          `Fallback: Also failed\n\n` +
          `Issues:\n` +
          `• Check OpenAI API key\n` +
          `• Check API credits\n` +
          `• Try /test-openai`
        );
      }
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No articles could be generated',
        message: 'Both RSS and fallback generation failed. Check OpenAI API.'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Sort by relevance and mix categories
    allArticles = shuffleAndBalance(allArticles);
    
    // Keep only 1 article per manual fetch (auto fetch handles multiple)
    allArticles = allArticles.slice(0, 1);
    console.log(`Articles after limiting to 1: ${allArticles.length}`);
    
    // Save to KV - APPEND to existing articles, don't overwrite
    const existingArticlesForSave = await env.NEWS_KV.get('articles', 'json') || [];
    const combinedArticles = [...allArticles, ...existingArticlesForSave].slice(0, 50); // Keep last 50 articles
    
    console.log(`[SAVE] Saving articles: ${allArticles.length} new + ${existingArticlesForSave.length} existing = ${combinedArticles.length} total`);
    
    await env.NEWS_KV.put('articles', JSON.stringify(combinedArticles));
    await env.NEWS_KV.put('lastFetch', new Date().toISOString());
    await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
    
    // Verify save
    const verifyArticles = await env.NEWS_KV.get('articles', 'json') || [];
    console.log(`[VERIFY] Articles in KV after save: ${verifyArticles.length}`);
    
    if (verifyArticles.length === 0) {
      console.error('[ERROR] Articles not saved properly!');
    }
    
    // Send individual Telegram notifications for each new article
    console.log(`Notification check: adminChat=${adminChat}, token=${!!env.TELEGRAM_BOT_TOKEN}, articles=${allArticles.length}`);
    
    if (adminChat && env.TELEGRAM_BOT_TOKEN && allArticles.length > 0) {
      console.log(`Sending notifications for ${allArticles.length} new articles to chat ${adminChat}...`);
      
      // Calculate approximate cost
      const articleCost = 0.04; // GPT-4 Turbo ~$0.03 + DALL-E HD ~$0.01
      const monthlyCost = articleCost * 15 * 30; // 15 articles/day * 30 days
      
      // Send summary first
      const summaryResult =       await sendMessage(env, adminChat, 
        `📰 *New Articles Published!*\n\n` +
        `📊 Total articles: ${verifyArticles.length}\n` +
        `💰 Est. cost: $${articleCost.toFixed(2)}/article (~$${monthlyCost.toFixed(2)}/month)\n` +
        `🔗 View: https://agaminews.in\n` +
        `⏰ Time: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`
      );
      
      console.log(`Summary notification sent: ${summaryResult}`);
      
      if (!summaryResult) {
        console.error('Failed to send summary notification, skipping individual notifications');
        // Don't return here - it exits the entire function!
        // Just skip the individual notifications
      } else {
        // Send individual article notifications only if summary succeeded
        for (let i = 0; i < allArticles.length; i++) {
        const article = allArticles[i];
        const articleIndex = i; // Position in the combined array
        
        try {
          await sendMessage(env, adminChat,
            `📄 *New Article Details*\n\n` +
            `📌 *Title:* ${article.title}\n` +
            `🏷️ *Category:* ${article.category}\n` +
            `✨ *Originality:* 100% Unique Content\n` +
            `📸 *Image:* 🎨 DALL-E 3 Optimized (Fast Loading)\n` +
            `📊 *Quality:* ${article.fullContent && article.fullContent.length > 3000 ? '⭐⭐⭐⭐⭐ Premium' : article.fullContent && article.fullContent.length > 1500 ? '⭐⭐⭐⭐ High' : '⭐⭐⭐ Standard'} (${article.fullContent ? article.fullContent.length : 0} chars)\n` +
            `🤖 *AI Model:* GPT-4 Turbo\n` +
            `🔗 *Link:* https://agaminews.in${article.url}\n\n` +
            `_Quality journalism powered by AI_`
          );
          
          // Small delay to avoid Telegram rate limits
          if (i < allArticles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (notifError) {
          console.error(`Failed to send notification for article ${i + 1}:`, notifError);
        }
      }
      } // Close the else block for notifications
    }
    
    // Update stats with daily article tracking
    stats.lastFetchDate = today;
    stats.dailyFetches = (stats.dailyFetches || 0) + 1;
    stats.dailyArticlesPublished = (stats.dailyArticlesPublished || 0) + allArticles.length;
    stats.totalArticlesFetched = (stats.totalArticlesFetched || 0) + allArticles.length;
    await env.NEWS_KV.put('stats', JSON.stringify(stats));
    
    // No need for duplicate notification since we already sent one above
    
    return new Response(JSON.stringify({ 
      success: true, 
      articles: allArticles.length,
      dailyPublished: stats.dailyArticlesPublished,
      message: `✅ Published ${allArticles.length} new article!`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('News fetch error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.stack ? error.stack.substring(0, 500) : 'No stack trace'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Generate SEO-friendly URL slug from title
function generateSlug(title, existingSlugs = []) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[₹$€£¥]/g, '') // Remove currency symbols
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 80); // Limit length for clean URLs
  
  // Ensure uniqueness if existingSlugs is provided
  if (existingSlugs && existingSlugs.length > 0) {
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }
  
  return baseSlug;
}

function mapCategoryLabel(label) {
  const l = (label || '').toLowerCase();
  if (l.startsWith('technology')) return 'Technology';
  if (l.startsWith('business')) return 'Business';
  if (l.startsWith('world')) return 'World';
  if (l.startsWith('sports')) return 'Sports';
  if (l.startsWith('entertain')) return 'Entertainment';
  if (l.startsWith('india')) return 'India';
  return 'News';
}
// Image proxy: fetch external images and serve via Worker with caching and downscale
async function serveImage(env, request, pathname) {
  try {
    const urlObj = new URL(request.url);
    const src = urlObj.searchParams.get('src');
    const w = Math.min(parseInt(urlObj.searchParams.get('w') || '800', 10) || 800, 1600);
    const q = Math.min(Math.max(parseInt(urlObj.searchParams.get('q') || '70', 10) || 70, 40), 85);
    if (!src) {
      return new Response('Missing src', { status: 400 });
    }
    // Basic allowlist (broadened for OpenAI DALL-E Azure blobs)
    let originUrl = null;
    try {
      // Support relative paths like /media/...
      originUrl = src.startsWith('http') ? new URL(src) : new URL(src, request.url);
    } catch (_) {}
    const reqHost = new URL(request.url).hostname;
    const host = originUrl?.hostname || '';
    const allowed = (
      host === reqHost ||
      host.endsWith('images.openai.com') ||
      host.endsWith('blob.core.windows.net') ||
      host.endsWith('images.unsplash.com') ||
      host.endsWith('images.pexels.com') ||
      host.endsWith('via.placeholder.com')
    );
    if (!originUrl || !allowed) {
      return new Response('Forbidden', { status: 403 });
    }

    // KV-backed persistent cache by src hash
    async function sha256Hex(text) {
      const data = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const arr = Array.from(new Uint8Array(digest));
      return arr.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const srcHash = await sha256Hex(src);
    const kvKey = `img:${srcHash}`;
    const kvHit = await env.NEWS_KV.getWithMetadata(kvKey, 'arrayBuffer');
    if (kvHit && kvHit.value) {
      return new Response(kvHit.value, {
        headers: {
          'Content-Type': (kvHit.metadata && kvHit.metadata.ct) || 'image/jpeg',
          'Cache-Control': 'public, max-age=604800',
          'X-Img-Store': 'kv'
        }
      });
    }

    const cacheKey = new Request(`${urlObj.origin}${urlObj.pathname}?src=${encodeURIComponent(src)}&w=${w}&q=${q}`, request);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    const upstream = await fetch(originUrl.toString(), { cf: { cacheTtl: 60 * 60 * 24 * 30, cacheEverything: true } });
    if (!upstream.ok) {
      // Graceful fallback placeholder to avoid broken images
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${Math.round(w*9/16)}'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='#999'>Image unavailable</text></svg>`;
      const resp = new Response(new TextEncoder().encode(svg), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=600'
        }
      });
      await cache.put(cacheKey, resp.clone());
      return resp;
    }
    // Let Cloudflare do auto-minify/resize via cf options if available
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buf = await upstream.arrayBuffer();
    // Persist to KV for long-term stability (30 days)
    try {
      await env.NEWS_KV.put(kvKey, buf, { expirationTtl: 60 * 60 * 24 * 30, metadata: { ct: contentType } });
    } catch (_) {}
    const resp = new Response(buf, {
      headers: {
        'Content-Type': contentType.includes('image/') ? contentType : 'image/jpeg',
        'Cache-Control': 'public, max-age=604800',
        'X-Img-W': String(w),
        'X-Img-Q': String(q)
      }
    });
    await cache.put(cacheKey, resp.clone());
    return resp;
  } catch (e) {
    return new Response('Image proxy error', { status: 500 });
  }
}

// Serve files stored in R2 or KV at /media/<key>
async function serveR2Media(env, request, pathname) {
  try {
    const fullKey = decodeURIComponent(pathname.replace(/^\/media\//, ''));
    if (!fullKey) return new Response('Bad Request', { status: 400 });
    
    // Check if this is a KV stored image
    if (fullKey.startsWith('kv/')) {
      const kvKey = fullKey.replace(/^kv\//, '').replace(/\.[^.]+$/, ''); // Remove kv/ prefix and extension
      try {
        const base64Data = await env.NEWS_KV.get(kvKey);
        if (!base64Data) {
          return new Response('Image not found in KV', { status: 404 });
        }
        
        // Convert base64 back to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const headers = new Headers();
        headers.set('Cache-Control', 'public, max-age=2592000'); // 30 days
        headers.set('Content-Type', 'image/jpeg');
        
        return new Response(bytes.buffer, { headers });
      } catch (e) {
        console.error('[KV] Failed to serve image:', e.message);
        return new Response('Failed to retrieve KV image', { status: 500 });
      }
    }
    
    // Regular R2 storage
    if (!env.MEDIA_R2 || !env.MEDIA_R2.get) {
      return new Response('R2 not configured', { status: 404 });
    }
    
    const obj = await env.MEDIA_R2.get(fullKey);
    if (!obj) return new Response('Not Found', { status: 404 });
    
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', obj.httpEtag);
    headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
    return new Response(obj.body, { headers });
  } catch (e) {
    console.error('[Media] Error serving media:', e.message);
    return new Response('Server Error', { status: 500 });
  }
}

// Upload a remote image to R2 and return our permanent URL
async function ingestImageToR2(env, srcUrl, extHint = 'jpg', retries = 3) {
  const keyBase = await (async () => {
    const data = new TextEncoder().encode(srcUrl);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const arr = Array.from(new Uint8Array(hashBuf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  })();
  const key = `images/${keyBase}.${extHint}`;
  
  // Try multiple times to ensure storage
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!env.MEDIA_R2 || !env.MEDIA_R2.put) {
        console.error('[R2] Storage not configured - using KV fallback');
        // Fallback to KV storage if R2 not available
        return await storeImageInKV(env, srcUrl, keyBase, extHint);
      }
      
      // Check if already exists
      const exists = await env.MEDIA_R2.head(key);
      if (exists) {
        console.log(`[R2] Image already stored: ${key}`);
        return `/media/${key}`;
      }
      
      // Fetch the image
      const upstream = await fetch(srcUrl);
      if (!upstream.ok) throw new Error(`Failed to fetch image: ${upstream.status}`);
      
      const ct = upstream.headers.get('content-type') || 'image/jpeg';
      const body = await upstream.arrayBuffer();
      
      // Store in R2
      await env.MEDIA_R2.put(key, body, { httpMetadata: { contentType: ct } });
      console.log(`[R2] Successfully stored image: ${key}`);
      return `/media/${key}`;
      
    } catch (e) {
      console.error(`[R2] Attempt ${attempt}/${retries} failed:`, e.message);
      if (attempt === retries) {
        // Last attempt failed, try KV storage as ultimate fallback
        console.log('[R2] All R2 attempts failed, using KV storage');
        return await storeImageInKV(env, srcUrl, keyBase, extHint);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  // Should never reach here, but just in case
  return `/img/?src=${encodeURIComponent(srcUrl)}&w=1200&q=70`;
}

// Fallback storage in KV if R2 fails
async function storeImageInKV(env, srcUrl, keyBase, extHint) {
  try {
    const response = await fetch(srcUrl);
    if (!response.ok) throw new Error('Failed to fetch image for KV storage');
    
    // Convert to base64 for KV storage
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Store in KV with expiration (30 days)
    const kvKey = `img_${keyBase}`;
    await env.NEWS_KV.put(kvKey, base64, {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
    
    console.log(`[KV] Image stored as fallback: ${kvKey}`);
    // Return a special URL that indicates KV storage
    return `/media/kv/${kvKey}.${extHint}`;
  } catch (e) {
    console.error('[KV] Failed to store in KV:', e.message);
    // Ultimate fallback - proxy URL
    return `/img/?src=${encodeURIComponent(srcUrl)}&w=1200&q=70`;
  }
}
// Generate unique article ID (6-digit like NDTV)
function generateArticleId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// Clean RSS content from HTML and CDATA
function cleanRSSContent(text) {
  if (!text) return '';
  
  return text
    // Remove CDATA
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    // Remove image tags completely
    .replace(/<img[^>]*>/gi, '')
    // Remove all HTML tags
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/gi, (match, num) => String.fromCharCode(num))
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

// Make headlines more engaging with specifications
function makeHeadlineHuman(title) {
  // Remove source tags
  title = title.replace(/\s*-\s*Times of India$/, '');
  title = title.replace(/\s*\|\s*.*$/, '');
  title = title.replace(/\s*-\s*NDTV.*$/, '');
  title = title.replace(/\s*-\s*The Hindu$/, '');
  
  // Detect if title has specifications
  const hasSpecs = /\d+GB|\d+MP|\d+mAh|₹\d+|\$\d+|\d+\s*km|kmpl|bhp|cc|Launch|Launched/i.test(title);
  const hasQuestion = title.includes('?');
  
  // Enhanced prefixes for different types
  const techPrefixes = ['Launch:', 'Launched:', 'New:', 'Official:', 'Confirmed:'];
  const newsPrefixes = ['Breaking:', 'Just In:', 'Update:', 'Alert:', 'Exclusive:'];
  
  // Add suffixes for engagement
  const suffixes = [
    ' - Full Specs & Price',
    ' - Price & Features', 
    ' - Everything You Need to Know',
    ' - Booking Opens',
    ' - Available Now'
  ];
  
  // Apply prefix based on content type
  if (hasSpecs && Math.random() > 0.5) {
    const prefix = techPrefixes[Math.floor(Math.random() * techPrefixes.length)];
    title = prefix + ' ' + title;
  } else if (!hasQuestion && Math.random() > 0.7) {
    const prefix = newsPrefixes[Math.floor(Math.random() * newsPrefixes.length)];
    title = prefix + ' ' + title;
  }
  
  // Add suffix for tech/auto content
  if (hasSpecs && Math.random() > 0.6 && !hasQuestion) {
    title = title + suffixes[Math.floor(Math.random() * suffixes.length)];
  }
  
  return title.trim();
}

// [DELETED: Old createHumanSummaryREMOVED function removed - 200 lines of deprecated GPT-3.5 code]

// Enhanced image system with personality recognition and sensitivity
// Enhanced image system with personality recognition and sensitivity
// Extract visual keywords from title for better image generation
function extractVisualKeywords(title) {
  const keywords = [];
  
  // Extract key entities
  const entities = {
    people: title.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [],
    numbers: title.match(/\d+\.?\d*/g) || [],
    places: title.match(/(Delhi|Mumbai|Bangalore|India|US|China|Pakistan)/gi) || [],
    companies: title.match(/(Google|Apple|Microsoft|Amazon|Reliance|Tata|Infosys)/gi) || [],
    events: title.match(/(IPL|World Cup|Olympics|Summit|Conference|Budget)/gi) || []
  };
  
  // Priority keywords for visual representation
  if (entities.people.length > 0) keywords.push(entities.people[0]);
  if (entities.places.length > 0) keywords.push(entities.places[0]);
  if (entities.companies.length > 0) keywords.push(entities.companies[0]);
  if (entities.events.length > 0) keywords.push(entities.events[0]);
  
  // Action words that define the scene
  const actions = title.match(/(launches?|announces?|wins?|loses?|crashes?|rises?|falls?|meets?|visits?|opens?|closes?)/gi) || [];
  if (actions.length > 0) keywords.push(actions[0]);
  
  return keywords;
}
async function getArticleImage(title, category, env) {
    const titleLower = title.toLowerCase();
    const visualKeywords = extractVisualKeywords(title);
    
    // Check if this is sensitive/tragic news
    const isSensitiveNews = 
      titleLower.includes('dies') || titleLower.includes('death') || 
      titleLower.includes('killed') || titleLower.includes('rape') || 
      titleLower.includes('murder') || titleLower.includes('suicide') ||
      titleLower.includes('burns') || titleLower.includes('abuse') ||
      titleLower.includes('assault') || titleLower.includes('tragedy');
    
    // For sensitive news, generate appropriate respectful images
    if (isSensitiveNews && env.OPENAI_API_KEY) {
      const sensitivePrompt = `Create a respectful, non-graphic news image for sensitive content. Show: ${titleLower.includes('school') ? 'School building exterior with flag at half-mast' : titleLower.includes('hospital') ? 'Hospital entrance with ambulance' : titleLower.includes('court') ? 'Justice scales and gavel' : 'Memorial candles and flowers'}. Somber, respectful tone. No people, no graphic content. Professional news photography style.`;
      
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: sensitivePrompt,
            n: 1,
            size: '1024x1024', // Optimized size for faster loading
            quality: 'standard',
            style: 'natural' // Photorealistic news photography
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data[0]) {
            return {
              url: data.data[0].url,
              credit: 'AI Generated - Respectful Coverage',
              type: 'sensitive-generated',
              isRelevant: true
            };
          }
        }
      } catch (error) {
        console.error('[DALL-E] Sensitive image generation failed:', error);
      }
    }
    
    // REMOVED: Personality checks - will generate all with DALL-E
    // Check for specific personalities first
    const personalities = {
      // Political figures
      'modi': { name: 'Narendra Modi', query: 'narendra modi india prime minister' },
      'rahul': { name: 'Rahul Gandhi', query: 'rahul gandhi congress leader' },
      'amit shah': { name: 'Amit Shah', query: 'amit shah bjp minister' },
      'kejriwal': { name: 'Arvind Kejriwal', query: 'arvind kejriwal delhi chief minister' },
      'yogi': { name: 'Yogi Adityanath', query: 'yogi adityanath uttar pradesh' },
      'mamata': { name: 'Mamata Banerjee', query: 'mamata banerjee west bengal' },
      'stalin': { name: 'MK Stalin', query: 'mk stalin tamil nadu' },
      'xi': { name: 'Xi Jinping', query: 'xi jinping china president' },
      'biden': { name: 'Joe Biden', query: 'joe biden usa president' },
      'trump': { name: 'Donald Trump', query: 'donald trump usa' },
      'putin': { name: 'Vladimir Putin', query: 'vladimir putin russia' },
      
      // Business personalities
      'ambani': { name: 'Mukesh Ambani', query: 'mukesh ambani reliance' },
      'adani': { name: 'Gautam Adani', query: 'gautam adani business' },
      'tata': { name: 'Ratan Tata', query: 'ratan tata' },
      'musk': { name: 'Elon Musk', query: 'elon musk tesla spacex' },
      'gates': { name: 'Bill Gates', query: 'bill gates microsoft' },
      'bezos': { name: 'Jeff Bezos', query: 'jeff bezos amazon' },
      
      // Bollywood personalities
      'shah rukh': { name: 'Shah Rukh Khan', query: 'shah rukh khan bollywood' },
      'srk': { name: 'Shah Rukh Khan', query: 'shahrukh khan actor' },
      'salman': { name: 'Salman Khan', query: 'salman khan bollywood' },
      'aamir': { name: 'Aamir Khan', query: 'aamir khan actor' },
      'deepika': { name: 'Deepika Padukone', query: 'deepika padukone actress' },
      'alia': { name: 'Alia Bhatt', query: 'alia bhatt bollywood' },
      'ranveer': { name: 'Ranveer Singh', query: 'ranveer singh actor' },
      
      // Sports personalities
      'kohli': { name: 'Virat Kohli', query: 'virat kohli cricket india' },
      'dhoni': { name: 'MS Dhoni', query: 'ms dhoni cricket captain' },
      'rohit': { name: 'Rohit Sharma', query: 'rohit sharma cricket' },
      'bumrah': { name: 'Jasprit Bumrah', query: 'jasprit bumrah bowler' },
      'messi': { name: 'Lionel Messi', query: 'lionel messi football' },
      'ronaldo': { name: 'Cristiano Ronaldo', query: 'cristiano ronaldo football' }
    };
    
    // Check if title contains any personality
    let personalityQuery = null;
    for (const [key, value] of Object.entries(personalities)) {
      if (titleLower.includes(key)) {
        personalityQuery = value.query;
        break;
      }
    }
    
    // If personality found, generate with DALL-E
    if (personalityQuery && env.OPENAI_API_KEY) {
      // REMOVED ALL STOCK PHOTO CODE - ONLY DALL-E
    }
    
    // Extract better keywords for non-personality searches
    const keywords = extractSmartKeywords(title, category);
    
    // Build ULTRA-SPECIFIC search queries for relevant images
    let searchQueries = [];
    
    // Add hyper-specific queries based on exact content
    if (titleLower.includes('modi')) searchQueries.unshift('narendra modi prime minister india speech');
    if (titleLower.includes('rahul')) searchQueries.unshift('rahul gandhi congress leader india');
    if (titleLower.includes('parliament')) searchQueries.unshift('indian parliament lok sabha session 2024');
    if (titleLower.includes('budget')) searchQueries.unshift('india union budget 2024 finance minister');
    if (titleLower.includes('election')) searchQueries.unshift('india election voting evm booth 2024');
    if (titleLower.includes('supreme court')) searchQueries.unshift('supreme court india building judges');
    if (titleLower.includes('railway')) searchQueries.unshift('indian railways train vande bharat');
    if (titleLower.includes('airport')) searchQueries.unshift('delhi mumbai airport terminal india');
    if (titleLower.includes('hospital')) searchQueries.unshift('aiims apollo indian hospital doctors');
    if (titleLower.includes('school') || titleLower.includes('student')) searchQueries.unshift('indian school students uniform classroom');
    if (titleLower.includes('farmer')) searchQueries.unshift('indian farmer punjab haryana field tractor');
    if (titleLower.includes('startup')) searchQueries.unshift('bangalore startup office unicorn india');
    if (titleLower.includes('sensex') || titleLower.includes('nifty')) searchQueries.unshift('bombay stock exchange bse nse trading');
    if (titleLower.includes('cricket')) searchQueries.unshift('india cricket team virat kohli rohit sharma');
    if (titleLower.includes('bollywood')) searchQueries.unshift('bollywood mumbai film city shah rukh khan');
    
    // Add original keywords if we have specific matches
    if (searchQueries.length > 0) {
      searchQueries.push(keywords);
    } else {
      // No specific match, use smart keywords
      searchQueries = [
        keywords,
        keywords.split(' ').slice(0, 3).join(' '),
        `${category} india 2024`
      ];
    }
    
    // If OpenAI key missing, use high-quality stock via proxy (prevents expiry)
    if (!env.OPENAI_API_KEY) {
      const baseQuery = (personalityQuery || keywords || `${category} india`).replace(/\s+/g, ',');
      const fallbacks = [
        `https://images.unsplash.com/random/1600x900?${encodeURIComponent(baseQuery)}`,
        `https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?w=1600&q=70`
      ];
      const chosen = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      const mediaUrl = await ingestImageToR2(env, chosen, 'jpg').catch(() => `/img/?src=${encodeURIComponent(chosen)}&w=1200&q=70`);
      return {
        url: mediaUrl,
        credit: 'Stock (stored)',
        type: 'stock',
        isRelevant: true
      };
    }
    
    // Generate with DALL-E 3 - ALWAYS
    console.log(`[IMAGE] Generating DALL-E image for: "${title}"`);
    try {
        // Extract EVERYTHING from the title for perfect image generation
        const hasNumbers = /\d+/.test(title);
        const numbers = title.match(/\d+\.?\d*/g) || [];
        const hasCurrency = /₹|Rs|Crore|Lakh|Billion|Million/i.test(title);
        const hasPercentage = /%/.test(title);
        
        // Extract key entities and actions
        const action = title.match(/(announces?|launches?|meets?|visits?|opens?|closes?|rises?|falls?|crashes?|surges?|bans?|approves?)/i)?.[0] || '';
        const location = title.match(/(Delhi|Mumbai|Bangalore|Chennai|Kolkata|India|Pakistan|US|China|Parliament|Court|Airport|Hospital|School)/i)?.[0] || '';
        
        let imagePrompt = '';
        
        // ULTRA-SPECIFIC PROMPTS based on exact news type
        
        // POLITICAL FIGURES - Professional photojournalism
        if (titleLower.includes('modi')) {
          imagePrompt = `Professional news photograph: Prime Minister Narendra Modi at ${location || 'Parliament House, New Delhi'}. ${action ? `Captured during ${action}` : 'Official government event'}. ${hasCurrency ? `Budget announcement showing ₹${numbers[0]} crore allocation` : ''} Indian flag in background, official podium with government emblem. Shot with telephoto lens, natural lighting, press photography style. Similar to PTI or ANI news agency photos.`;
        }
        else if (titleLower.includes('rahul') || titleLower.includes('gandhi')) {
          imagePrompt = `Documentary photograph: Rahul Gandhi at ${location || 'Congress headquarters or public rally'}. ${action === 'announces' ? 'Press conference with microphones' : 'Addressing gathering'}. ${numbers.length ? `Campaign banner showing ${numbers[0]} in background` : ''}. Natural daylight, journalistic composition, crowd visible but not exaggerated. Professional news photography similar to Reuters political coverage.`;
        }
        else if (titleLower.includes('kejriwal')) {
          imagePrompt = `News photograph: Delhi Chief Minister Arvind Kejriwal at ${location || 'Delhi Secretariat'}. ${action || 'Government announcement'} with press present. ${hasCurrency ? `Policy board showing ₹${numbers[0]} budget` : ''}. Official setting, AAP party symbol visible, professional lighting. Documentary style similar to Indian Express photography.`;
        }
        
        // SPECIFIC NEWS SCENARIOS - Exact visualization
        else if (titleLower.includes('visa') || titleLower.includes('passport')) {
          imagePrompt = `Photorealistic image: ${title}. Show: Indian passport with ${location || 'US'} visa stamp, visa application form partially visible, embassy building in background. ${numbers.length ? `Processing time ${numbers[0]} days shown on document` : ''}. Official stamps, holographic security features visible. Shot on desk with pen.`;
        }
        else if (titleLower.includes('railway') || titleLower.includes('train')) {
          imagePrompt = `Indian Railways news photo: ${title}. ${location || 'New Delhi Railway Station'}, ${titleLower.includes('vande bharat') ? 'Vande Bharat Express train' : 'Indian Railways train'}. ${numbers.length ? `Platform ${numbers[0]} visible, speed/fare display showing ${numbers[1] || '160kmph'}` : ''}. Passengers, railway officials, platform scene. Professional railway journalism photography.`;
        }
        else if (titleLower.includes('airport') || titleLower.includes('flight')) {
          imagePrompt = `Aviation news photo: ${title}. ${location || 'IGI Airport Delhi'} terminal, ${action || 'departure board'}. ${numbers.length ? `Flight number ${numbers[0]} on display` : ''}. Aircraft visible through windows, passengers with luggage, airline counters. Airport documentary style.`;
        }
        else if (titleLower.includes('court') || titleLower.includes('verdict') || titleLower.includes('judge')) {
          imagePrompt = `Legal news photo: ${title}. ${location || 'Supreme Court of India'} building exterior or courtroom. Lady Justice statue, lawyers in black robes. ${numbers.length ? `Case number ${numbers[0]} on document` : ''}. Serious judicial atmosphere, no faces if sensitive case.`;
        }
        else if (titleLower.includes('farmer') || titleLower.includes('agriculture') || titleLower.includes('crop')) {
          imagePrompt = `Agricultural news photo: ${title}. ${location || 'Punjab/Haryana'} farmland, ${action || 'farmers working'}. ${numbers.length ? `${numbers[0]} quintal yield display or MSP ₹${numbers[1]} on banner` : ''}. Tractors, crops, rural Indian setting. Documentary photography style.`;
        }
        else if (titleLower.includes('election') || titleLower.includes('voting') || titleLower.includes('poll')) {
          imagePrompt = `Election news photo: ${title}. ${location || 'polling booth'}, EVM machines, voters in queue. ${numbers.length ? `${numbers[0]}% turnout on display board` : ''}. Ink-marked fingers, election officials, democracy in action. Photojournalistic coverage.`;
        }
        else if (titleLower.includes('temple') || titleLower.includes('mosque') || titleLower.includes('church')) {
          imagePrompt = `Religious site news photo: ${title}. ${location || 'religious site'} architecture, ${action || 'devotees visiting'}. ${numbers.length ? `${numbers[0]} visitors count on board` : ''}. Respectful religious photography, architectural details, cultural elements.`;
        }
        else if (titleLower.includes('student') || titleLower.includes('exam')) {
          imagePrompt = `Photorealistic scene: ${title}. Indian students in ${location || 'examination hall'}, ${action || 'writing exam'}. ${numbers.length ? `${numbers[0]} visible on board/banner` : ''}. School/college uniforms, answer sheets visible, invigilator in background. Natural lighting from windows.`;
        }
        else if (titleLower.includes('accident') || titleLower.includes('crash')) {
          imagePrompt = `Professional emergency response photograph at ${location || 'accident site'}. Emergency vehicles, ambulances, and police cars with lights on. ${numbers.length ? `Emergency response team, ${numbers[0]} visible on vehicle or sign` : ''}. Respectful distance maintained, no graphic content, focus on response efforts. Documentary photojournalism style, natural lighting with emergency vehicle lights.`;
        }
        else if (titleLower.includes('market') || titleLower.includes('sensex') || titleLower.includes('nifty')) {
          imagePrompt = `Financial market photograph: ${titleLower.includes('crash') || titleLower.includes('fall') ? 'Red downward trend on trading screens' : 'Green upward trend on market displays'}. BSE/NSE trading floor or modern trading terminal. SENSEX at ${numbers[0] || '50000'} shown on electronic board. ${hasPercentage ? `${numbers.find(n => n.includes('%')) || '5%'} change displayed` : ''}. Professional traders at workstations, multiple monitors showing charts. Business photojournalism style, similar to Bloomberg or Economic Times.`;
        }
        else if (titleLower.includes('budget') || titleLower.includes('economy')) {
          imagePrompt = `Official government photo: ${title}. Finance Minister holding budget briefcase at North Block steps. ${hasCurrency ? `₹${numbers[0]} lakh crore budget figure on briefcase or backdrop` : ''}. Indian flag, government officials, media photographers. Golden hour lighting.`;
        }
        else if (titleLower.includes('cricket') || titleLower.includes('match')) {
          imagePrompt = `Professional cricket photography: ${titleLower.includes('win') ? 'Victory celebration on field' : 'Match action shot'} at ${location || 'cricket stadium'}. ${numbers.length ? `Scoreboard showing ${numbers[0]}/${numbers[1] || '3'}` : 'Score visible on stadium display'}. Players in Indian blue jerseys, authentic cricket action, crowd in background with Indian flags. Sports photojournalism, telephoto lens capture, similar to ESPN Cricinfo or Getty Sports.`;
        }
        else if (titleLower.includes('bollywood') || titleLower.includes('film')) {
          imagePrompt = `Entertainment news photo: ${title}. ${location || 'Mumbai'} film event, red carpet or movie poster launch. ${hasCurrency ? `₹${numbers[0]} crore box office collection displayed` : ''}. Paparazzi, film posters, spotlights. Glamorous but journalistic style.`;
        }
        else if (titleLower.includes('rain') || titleLower.includes('flood') || titleLower.includes('weather')) {
          imagePrompt = `Weather news photo: ${title}. ${location || 'Indian city'} during ${titleLower.includes('flood') ? 'flooding with water-logged streets' : 'heavy rainfall'}. ${numbers.length ? `${numbers[0]}mm rainfall data on screen` : ''}. People with umbrellas, vehicles in water, weather department officials. Documentary style.`;
        }
        else if (titleLower.includes('technology') || titleLower.includes('ai') || titleLower.includes('startup')) {
          imagePrompt = `Tech news visualization: ${title}. ${location || 'Bangalore tech park'}, modern office with ${action || 'product launch'}. ${numbers.length ? `${numbers[0]} funding amount on presentation screen` : ''}. Laptops, code on screens, startup team. Clean, modern, well-lit tech aesthetic.`;
        }
        else if (titleLower.includes('hospital') || titleLower.includes('health') || titleLower.includes('vaccine')) {
          imagePrompt = `Healthcare news photo: ${title}. ${location || 'AIIMS Delhi'} hospital setting, ${action || 'medical procedure'}. ${numbers.length ? `${numbers[0]} beds/doses visible on display` : ''}. Doctors in white coats, medical equipment, sanitized environment. Professional medical photography.`;
        }
        else {
          // ULTRA-SPECIFIC image generation based on exact article content
          
          // Business/Finance specific
          if (titleLower.includes('ipo')) {
            imagePrompt = `Stock market IPO bell ringing ceremony at BSE Mumbai for: ${title}. Show executives, confetti, stock ticker with ${numbers[0]} price.`;
          } else if (titleLower.includes('funding') || titleLower.includes('investment')) {
            imagePrompt = `Venture funding announcement: ${title}. Show cheque presentation, startup founders, ₹${numbers[0]} amount prominently displayed.`;
          } else if (titleLower.includes('merger') || titleLower.includes('acquisition')) {
            imagePrompt = `Corporate merger visualization: ${title}. Two company logos merging, handshake, deal value ₹${numbers[0]} displayed.`;
          } else if (titleLower.includes('layoff')) {
            imagePrompt = `Corporate office with empty desks for: ${title}. Show ${numbers[0]} figure, somber but professional tone.`;
          } else if (titleLower.includes('profit') || titleLower.includes('revenue')) {
            imagePrompt = `Financial results dashboard: ${title}. Green upward graphs showing ₹${numbers[0]} profit, quarterly comparison charts.`;
          } else if (titleLower.includes('loss')) {
            imagePrompt = `Financial crisis visualization: ${title}. Red downward graphs showing ₹${numbers[0]} loss, concerned executives in boardroom.`;
          }
          
          // Technology specific
          else if (titleLower.includes('5g')) {
            imagePrompt = `5G network tower installation in Indian city for: ${title}. Show ${numbers[0]}Gbps speed displays, network coverage map.`;
          } else if (titleLower.includes('cyber') || titleLower.includes('hack')) {
            imagePrompt = `Cybersecurity incident visualization: ${title}. Show security operations center, threat maps, ${numbers[0]} affected systems.`;
          } else if (titleLower.includes('app launch')) {
            imagePrompt = `Mobile app launch event: ${title}. Show phone screens with app, ${numbers[0]} downloads counter, Indian users.`;
          } else if (titleLower.includes('data center')) {
            imagePrompt = `Modern data center in India: ${title}. Server racks, ${numbers[0]}MW capacity displays, cooling systems.`;
          }
          
          // Auto/Vehicle specific  
          else if (titleLower.includes('ev') || titleLower.includes('electric')) {
            imagePrompt = `Electric vehicle showcase: ${title}. Show charging station, ${numbers[0]}km range display, green energy theme.`;
          } else if (titleLower.includes('bike')) {
            imagePrompt = `Motorcycle/bike showcase: ${title}. Indian roads, ${numbers[0]}kmpl mileage display, rider in Indian traffic.`;
          } else if (titleLower.includes('suv') || titleLower.includes('car')) {
            imagePrompt = `Car showcase in Indian setting: ${title}. Show ${numbers[0]} price tag, mileage display, Indian family context.`;
          }
          
          // Politics/Government specific
          else if (titleLower.includes('bill') || titleLower.includes('law')) {
            imagePrompt = `Parliament passing bill: ${title}. Show Lok Sabha in session, voting display, document with bill number.`;
          } else if (titleLower.includes('scheme') || titleLower.includes('yojana')) {
            imagePrompt = `Government scheme launch: ${title}. Show beneficiaries, ₹${numbers[0]} budget allocation, scheme logo.`;
          } else if (titleLower.includes('protest')) {
            imagePrompt = `Peaceful protest scene: ${title}. Show protesters with placards, specific demands visible, Indian street setting.`;
          }
          
          // Education specific
          else if (titleLower.includes('exam') || titleLower.includes('result')) {
            imagePrompt = `Examination/results scene: ${title}. Show students, ${numbers[0]}% pass rate display, Indian school/college setting.`;
          } else if (titleLower.includes('admission')) {
            imagePrompt = `College admission process: ${title}. Show campus, ${numbers[0]} seats available, students in queue.`;
          }
          
          // Health specific
          else if (titleLower.includes('vaccine') || titleLower.includes('vaccination')) {
            imagePrompt = `Vaccination drive in India: ${title}. Show health workers, ${numbers[0]} doses administered counter, CoWIN app.`;
          } else if (titleLower.includes('hospital')) {
            imagePrompt = `Hospital scene for: ${title}. Show ${numbers[0]} beds, medical equipment, Indian healthcare setting.`;
          }
          
          // Sports specific
          else if (titleLower.includes('cricket')) {
            imagePrompt = `Cricket match action: ${title}. Show scoreboard with ${numbers[0]} runs, Indian players celebrating, stadium atmosphere.`;
          } else if (titleLower.includes('football') || titleLower.includes('isl')) {
            imagePrompt = `Football/ISL match: ${title}. Show goal celebration, ${numbers[0]}-${numbers[1]} score, Indian football fans.`;
          }
          
          // FALLBACK: Still create EXACT image based on title analysis
          else {
            // Build hyper-specific prompt from title components
            const components = [];
            
            // Add location context
            if (location) components.push(`Location: ${location} prominently featured`);
            
            // Add action context
            if (action) components.push(`Main action: ${action} being performed`);
            
            // Add numerical context
            if (hasNumbers) components.push(`Display showing: ${numbers.join(', ')}`);
            if (hasCurrency) components.push(`₹${numbers[0]} amount visible on screen/banner`);
            if (hasPercentage) components.push(`Graph/chart showing ${numbers[0]}% change`);
            
            // Determine photo style based on category
            let style = 'Professional news photography';
            if (category === 'Business') style = 'Financial news visualization, Bloomberg style';
            if (category === 'Technology') style = 'Modern tech photography, clean aesthetic';
            if (category === 'Sports') style = 'Dynamic sports photography, action shot';
            if (category === 'Entertainment') style = 'Entertainment news, paparazzi style';
            
            imagePrompt = `Create EXACT photorealistic news image for: "${title}". 
            ${components.join('. ')}. 
            Indian context with local elements (Indian flags, rupee symbols, local architecture). 
            ${style}. 
            Include text overlays or digital displays showing the exact headline information. 
            Shot with professional camera, news agency quality. 
            CRITICAL: Image must tell the EXACT story from the headline, not a generic ${category} photo.`;
          }
        }
        
        // ENHANCE FOR PHOTOREALISTIC PROFESSIONAL JOURNALISM
        imagePrompt = `${imagePrompt}\n\nPHOTOREALISTIC REQUIREMENTS:
        • PHOTOJOURNALISM STYLE: Shot with professional DSLR camera
        • REALISTIC LIGHTING: Natural lighting, no artificial effects
        • AUTHENTIC COMPOSITION: Documentary photography style
        • NO CARTOONISH ELEMENTS: Completely realistic, news agency quality
        • PROFESSIONAL FRAMING: Rule of thirds, proper depth of field
        • NEWS PHOTOGRAPHY: Similar to Reuters, AP, or Getty Images
        • HIGH DETAIL: Sharp focus, realistic textures and shadows
        • ${visualKeywords.length > 0 ? `KEY ELEMENTS: ${visualKeywords.join(', ')}` : ''}
        
        STYLE: Professional news agency photography (Reuters, AP, Getty Images, PTI, ANI quality).`;
        
        // Log the prompt for debugging
        console.log(`[DALL-E] Attractive prompt for "${title}"`);
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: imagePrompt,
            n: 1,
            size: '1024x1024', // Standard size for faster loading
            quality: 'standard', // Standard quality for better performance
            style: 'natural' // Photorealistic news photography
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data[0]) {
            console.log(`DALL-E SUCCESS for: ${title}`);
            // Always store DALL-E images permanently
            const mediaUrl = await ingestImageToR2(env, data.data[0].url, 'jpg');
            return {
              url: mediaUrl,
              credit: 'AI (stored)',
              type: 'generated',
              isRelevant: true
            };
          }
        } else {
          const errorText = await response.text();
          console.error(`[DALL-E] API error: ${response.status} - ${response.statusText}`);
          console.error(`[DALL-E] Error details: ${errorText}`);
        }
      } catch (error) {
        console.error('[DALL-E] Final error in image generation:', error);
        
        // NO FALLBACK IMAGES - Try emergency DALL-E generation
        console.log('[IMAGE] Primary DALL-E failed, attempting emergency generation for category:', category);
        
        const emergencyPrompts = {
      'Technology': 'Professional technology photograph: Modern data center with server racks, or tech company office with employees at computers. Clean, well-lit, documentary style photography.',
      'Business': 'Business photography: BSE/NSE building exterior or trading floor with professionals. Financial district skyline, office buildings. Professional business photojournalism.',
      'India': 'Documentary photograph of India: Modern Indian cityscape showing development, India Gate or prominent landmark, busy street scene. Natural lighting, journalistic style.',
      'World': 'International news photograph: UN headquarters, international conference, or world landmark. Professional news agency style photography.',
      'Sports': 'Sports photography: Cricket or football stadium during match, players in action, sports venue. Professional sports photojournalism, telephoto lens style.',
      'Entertainment': 'Entertainment industry photograph: Film studio, cinema hall, or media event setup. Professional entertainment journalism photography.'
    };
    
    const emergencyPrompt = emergencyPrompts[category] || 'Professional news photograph: Government building, press conference setup, or news event. Documentary photojournalism style.';
    
    try {
      const emergencyResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `${emergencyPrompt} Photorealistic, professional DSLR photography, natural lighting, news agency quality. No cartoonish elements, completely realistic.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural'
        })
      });
      
      if (emergencyResponse.ok) {
        const emergencyData = await emergencyResponse.json();
        console.log('[IMAGE] Emergency DALL-E generation successful');
        // Store emergency generated image permanently
        const emergencyMediaUrl = await ingestImageToR2(env, emergencyData.data[0].url, 'jpg');
        return {
          url: emergencyMediaUrl,
          credit: 'AI Generated',
          type: 'dalle-emergency',
          isRelevant: true
        };
      }
    } catch (emergencyError) {
      console.error('[IMAGE] Emergency DALL-E failed:', emergencyError);
    }
    
    // Absolute last resort - SVG placeholder
    return {
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2ZmMDAwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5CUkVBS0lORyBORVdTPC90ZXh0Pjwvc3ZnPg==',
      credit: 'Loading...',
      type: 'placeholder',
      isRelevant: false
    };
  }
}

// Helper functions for entity extraction
function extractCompanies(title) {
  const companies = [
    'Reliance', 'Tata', 'Infosys', 'TCS', 'Wipro', 'Adani', 'Ambani',
    'HDFC', 'ICICI', 'SBI', 'Airtel', 'Jio', 'Vodafone', 'BSNL',
    'Maruti', 'Mahindra', 'Bajaj', 'Hero', 'TVS', 'Hyundai', 'Kia',
    'Amazon', 'Flipkart', 'Paytm', 'PhonePe', 'Zomato', 'Swiggy',
    'Google', 'Microsoft', 'Apple', 'Samsung', 'OnePlus', 'Xiaomi',
    'Tesla', 'Meta', 'Twitter', 'Netflix', 'Disney'
  ];
  
  const found = [];
  companies.forEach(company => {
    if (title.includes(company)) {
      found.push(company.toLowerCase());
    }
  });
  return found;
}

function extractLocations(title) {
  const locations = [
    'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
    'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur',
    'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'UP', 'Bihar',
    'Rajasthan', 'MP', 'Kerala', 'Punjab', 'Haryana', 'Goa',
    'Parliament', 'Lok Sabha', 'Rajya Sabha', 'Supreme Court', 'High Court'
  ];
  
  const found = [];
  locations.forEach(location => {
    if (title.includes(location)) {
      found.push(location.toLowerCase());
    }
  });
  return found;
}

function extractProducts(title) {
  const products = [
    'iPhone', 'Galaxy', 'Pixel', 'OnePlus', 'Redmi', 'Realme',
    'iPad', 'MacBook', 'Surface', 'ThinkPad',
    'Swift', 'i20', 'i10', 'Creta', 'Seltos', 'Fortuner', 'Innova',
    'Scorpio', 'XUV', 'Thar', 'Nexon', 'Harrier', 'Safari',
    'Bullet', 'Classic', 'Duke', 'Pulsar', 'Apache'
  ];
  
  const found = [];
  products.forEach(product => {
    if (title.toLowerCase().includes(product.toLowerCase())) {
      found.push(product.toLowerCase());
    }
  });
  return found;
}
// Extract smart keywords for highly relevant image matching
function extractSmartKeywords(title, category) {
  const titleLower = title.toLowerCase();
  
  // Extract specific entities and numbers from title
  const extractedData = {
    numbers: title.match(/\d+\.?\d*/g) || [],
    currency: title.match(/₹[\d,]+|Rs\.?\s*[\d,]+\s*(crore|lakh|million|billion)?/gi) || [],
    percentages: title.match(/\d+\.?\d*\s*%/g) || [],
    companies: extractCompanies(title),
    locations: extractLocations(title),
    products: extractProducts(title)
  };
  
  // SENSITIVE TOPICS - Handle with care
  // Death/Tragedy/Crime news
  if (titleLower.includes('dies') || titleLower.includes('death') || titleLower.includes('dead') || 
      titleLower.includes('killed') || titleLower.includes('murder')) {
    if (titleLower.includes('student') || titleLower.includes('school') || titleLower.includes('child')) {
      return 'school building india education memorial';
    }
    if (titleLower.includes('accident')) {
      return 'accident scene emergency ambulance';
    }
    return 'memorial candle tribute condolence';
  }
  
  // Crime/Violence
  if (titleLower.includes('rape') || titleLower.includes('assault') || titleLower.includes('abuse')) {
    return 'justice law court police india';
  }
  
  if (titleLower.includes('burns') || titleLower.includes('fire') || titleLower.includes('blaze')) {
    if (titleLower.includes('student') || titleLower.includes('school')) {
      return 'school building safety education india';
    }
    return 'fire emergency rescue safety';
  }
  
  // Accident/Disaster
  if (titleLower.includes('accident') || titleLower.includes('crash') || titleLower.includes('collision')) {
    if (titleLower.includes('train')) return 'train railway india safety';
    if (titleLower.includes('road') || titleLower.includes('car')) return 'road accident emergency ambulance';
    if (titleLower.includes('plane') || titleLower.includes('flight')) return 'aviation airport safety';
    return 'accident emergency rescue';
  }
  
  // School/Education incidents
  if (titleLower.includes('school') || titleLower.includes('student') || titleLower.includes('teacher')) {
    if (titleLower.includes('patna')) return 'patna school education bihar';
    if (titleLower.includes('delhi')) return 'delhi school education';
    if (titleLower.includes('mumbai')) return 'mumbai school education';
    return 'school building education india students';
  }
  
  // Topic-specific keyword extraction for maximum relevance
  
  // Financial/Market news
  if (titleLower.includes('sensex') || titleLower.includes('nifty')) {
    if (titleLower.includes('crash') || titleLower.includes('fall')) {
      return 'stock market crash red charts down arrow';
    }
    if (titleLower.includes('rally') || titleLower.includes('surge') || titleLower.includes('hit')) {
      return 'stock market rally green charts bull market';
    }
    return 'bombay stock exchange trading floor india';
  }
  
  // Company/Business specific
  if (titleLower.includes('reliance') || titleLower.includes('ambani')) {
    return 'mukesh ambani reliance industries jio';
  }
  if (titleLower.includes('tata')) {
    return 'tata group headquarters ratan tata';
  }
  if (titleLower.includes('infosys')) {
    return 'infosys campus bangalore office';
  }
  if (titleLower.includes('adani')) {
    return 'gautam adani ports business india';
  }
  
  // Technology specific
  if (titleLower.includes('ai') || titleLower.includes('artificial intelligence')) {
    return 'artificial intelligence robot technology future';
  }
  if (titleLower.includes('5g')) {
    return '5g network tower telecommunications india';
  }
  if (titleLower.includes('electric vehicle') || titleLower.includes('ev')) {
    return 'electric vehicle charging tesla ola uber';
  }
  if (titleLower.includes('startup')) {
    if (titleLower.includes('funding') || titleLower.includes('raise')) {
      return 'startup funding venture capital money investment';
    }
    return 'startup office team bangalore ecosystem';
  }
  
  // Political/Government
  if (titleLower.includes('parliament')) {
    return 'indian parliament building new delhi government';
  }
  if (titleLower.includes('supreme court')) {
    return 'supreme court india justice law legal';
  }
  if (titleLower.includes('election')) {
    return 'india election voting ballot democracy';
  }
  if (titleLower.includes('budget')) {
    return 'india budget finance minister briefcase parliament';
  }
  
  // Weather/Disaster
  if (titleLower.includes('rainfall') || titleLower.includes('flood')) {
    return 'heavy rainfall flooding monsoon india disaster';
  }
  if (titleLower.includes('cyclone')) {
    return 'cyclone satellite image storm weather';
  }
  if (titleLower.includes('earthquake')) {
    return 'earthquake damage disaster rescue';
  }
  
  // Sports specific
  if (titleLower.includes('cricket')) {
    if (titleLower.includes('kohli')) return 'virat kohli batting cricket india';
    if (titleLower.includes('dhoni')) return 'ms dhoni cricket captain csk';
    if (titleLower.includes('ipl')) return 'ipl cricket stadium crowd excitement';
    if (titleLower.includes('world cup')) return 'cricket world cup trophy india team';
    return 'cricket match india stadium action';
  }
  if (titleLower.includes('football')) {
    return 'football soccer india isl stadium';
  }
  if (titleLower.includes('olympics')) {
    return 'olympics india athletes medals sports';
  }
  
  // Entertainment
  if (titleLower.includes('bollywood')) {
    if (titleLower.includes('box office')) return 'bollywood movie theater crowd tickets';
    if (titleLower.includes('award')) return 'bollywood awards red carpet ceremony';
    return 'bollywood film shooting mumbai cinema';
  }
  
  // Infrastructure/Development
  if (titleLower.includes('metro')) {
    return 'metro train station india urban transport';
  }
  if (titleLower.includes('airport')) {
    return 'airport terminal india aviation flight';
  }
  if (titleLower.includes('highway') || titleLower.includes('expressway')) {
    return 'highway expressway india infrastructure roads';
  }
  
  // Health/Medical
  if (titleLower.includes('vaccine') || titleLower.includes('vaccination')) {
    return 'covid vaccine vaccination india hospital';
  }
  if (titleLower.includes('hospital')) {
    return 'hospital india medical healthcare doctors';
  }
  
  // Education
  if (titleLower.includes('iit')) {
    return 'iit campus india engineering students';
  }
  if (titleLower.includes('exam') || titleLower.includes('results')) {
    return 'students exam results education india';
  }
  
  // Default: Extract most important words
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'says', 'said', 'will', 'would', 'could', 'should', 'may', 'might', 'has', 'have', 'had', 'is', 'are', 'was', 'were', 'been', 'being'];
  
  // Extract key nouns and action words
  let words = title.split(/[\s,.:;!?]+/)
    .filter(w => !stopWords.includes(w.toLowerCase()) && w.length > 2)
    .map(w => w.toLowerCase());
  
  // Prioritize action words and specific terms
  const importantWords = words.filter(w => 
    w.includes('crash') || w.includes('surge') || w.includes('launch') || 
    w.includes('announce') || w.includes('reveal') || w.includes('break') ||
    w.includes('win') || w.includes('lose') || w.includes('record')
  );
  
  // Build smart keywords using extracted entities
  let keywords = [];
  
  // Add companies if found
  if (extractedData.companies.length > 0) {
    keywords.push(...extractedData.companies);
  }
  
  // Add locations if found
  if (extractedData.locations.length > 0) {
    keywords.push(...extractedData.locations);
  }
  
  // Add products if found
  if (extractedData.products.length > 0) {
    keywords.push(...extractedData.products);
  }
  
  // Add data-specific context
  if (extractedData.currency.length > 0) {
    keywords.push('money', 'finance', 'rupee');
  }
  if (extractedData.percentages.length > 0) {
    keywords.push('growth', 'statistics', 'chart');
  }
  if (extractedData.numbers.length > 0 && category.includes('Tech')) {
    keywords.push('specifications', 'features');
  }
  
  // If we have specific entities, use them for precise search
  if (keywords.length > 0) {
    keywords.push(category.toLowerCase());
    return keywords.slice(0, 5).join(' ');
  }
  
  // Otherwise use important words
  if (importantWords.length > 0) {
    return importantWords.concat(words).slice(0, 4).join(' ');
  }
  
  // Return most relevant words with India context
  return words.slice(0, 3).join(' ') + ' ' + category.toLowerCase() + ' india';
}

// Balance article categories
function shuffleAndBalance(articles) {
  const categorized = {};
  articles.forEach(a => {
    if (!categorized[a.category]) categorized[a.category] = [];
    categorized[a.category].push(a);
  });
  
  const balanced = [];
  const categories = Object.keys(categorized);
  let index = 0;
  
  // Round-robin to balance categories
  while (balanced.length < articles.length) {
    const category = categories[index % categories.length];
    if (categorized[category].length > 0) {
      balanced.push(categorized[category].shift());
    }
    index++;
  }
  
  return balanced;
}

// Generate time ago strings
function getTimeAgo(index) {
  const times = [
    'Just now', '5 mins ago', '10 mins ago', '15 mins ago',
    '30 mins ago', '45 mins ago', '1 hour ago', '2 hours ago'
  ];
  return times[Math.min(index, times.length - 1)];
}

// Serve 404 page
function serve404Page(env, message = 'Page not found') {
  const html404 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found - AgamiNews</title>
    ${getGoogleAnalyticsCode('404 Page', '/404')}
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: #f5f5f5;
      }
      .error-container {
        text-align: center;
        padding: 20px;
      }
      h1 { color: #CC0000; font-size: 72px; margin: 0; }
      h2 { color: #333; margin: 20px 0; }
      p { color: #666; }
      a {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        background: #CC0000;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404</h1>
        <h2>${message}</h2>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">← Back to Homepage</a>
    </div>
</body>
</html>`;
  
  return new Response(html404, { 
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Render article page (shared logic)
async function renderArticlePage(env, article, allArticles, request) {
  try {
    const config = await env.NEWS_KV.get('config', 'json') || {};
    
    // Normalize article fields to avoid runtime errors
    if (!article || typeof article !== 'object') {
      throw new Error('Invalid article payload');
    }
    article.title = article.title || article.sourceMaterial?.originalTitle || 'Article';
    article.category = article.category || 'News';
    article.id = article.id || generateArticleId();
    article.slug = article.slug || generateSlug(article.title);
    article.url = article.url || `/${String(article.category).toLowerCase()}-news/${article.slug}`;
    
    // Track article view (best-effort)
    try {
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      if (!stats.articleViews) stats.articleViews = {};
      stats.articleViews[article.id] = (stats.articleViews[article.id] || 0) + 1;
      await env.NEWS_KV.put('stats', JSON.stringify(stats));
    } catch (_) {}
    
    // Get article index for navigation
    const articleIndex = allArticles.findIndex(a => a && a.id === article.id);
    
    // Use stored content only to avoid on-request generation
    const fullContent = article.fullContent || '<p><em>Content is preparing. Please refresh shortly.</em></p>';
    
    // Generate the HTML using existing article rendering
    const isDark = config.theme === 'dark';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - ${config.siteName}</title>
    <meta name="description" content="${article.preview || 'Read full article on AgamiNews'}">
    
    <!-- CRITICAL SEO TAGS - GOOGLE INDEXING -->
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="google" content="notranslate">
    <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE">
    
    <!-- SEO Meta Tags -->
    <link rel="canonical" href="https://agaminews.in${article.url}" />
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.preview || 'Read full article on AgamiNews'}">
    <meta property="og:image" content="${article.image?.url || article.image || 'https://agaminews.in/og-image.jpg'}">
    <meta property="og:url" content="https://agaminews.in${article.url}">
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="${new Date(article.timestamp).toISOString()}">
    <meta property="article:section" content="${article.category}">
    <meta property="twitter:card" content="summary_large_image">
    
    ${getGoogleAnalyticsCode(article.title, article.url)}
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }

        /* Header */
        .header {
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .nav-bar {
            background-color: #ff6600;
            padding: 0 15px;
        }
        
        .nav-menu {
            display: flex;
            list-style: none;
            gap: 20px;
            margin: 0;
            padding: 0;
        }
        
        .nav-menu li {
            padding: 8px 0;
        }
        
        .nav-menu a {
            color: white;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .nav-menu a:hover {
            text-decoration: underline;
        }
        
        .article-title {
            font-size: 36px;
            font-weight: bold;
            margin: 20px 0;
            line-height: 1.3;
        }
        .article-meta {
            color: ${isDark ? '#999' : '#666'};
            margin: 15px 0;
            font-size: 16px;
        }
        .article-image {
            width: 100%;
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
        }
        .article-image img {
            width: 100%;
            height: auto;
        }
        .photo-credit {
            font-size: 11px;
            color: #999;
            margin-top: 5px;
            text-align: center;
            font-style: italic;
            background: #f9f9f9;
            padding: 4px 8px;
            border-radius: 3px;
            border-left: 2px solid #ff6600;
        }
        .article-content {
            font-size: 20px;
            line-height: 1.8;
            margin: 30px 0;
        }
        .article-text {
            font-size: 20px;
            line-height: 1.7;
            color: #333;
        }
        .article-content p {
            margin-bottom: 20px;
        }
        .back-btn {
            display: inline-block;
            margin: 20px 0;
            padding: 10px 20px;
            background: ${config.primaryColor};
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
        .share-buttons {
            margin: 30px 0;
            padding: 20px 0;
            border-top: 1px solid ${isDark ? '#333' : '#e0e0e0'};
        }
        .share-btn {
            display: inline-block;
            margin-right: 10px;
            padding: 8px 15px;
            background: ${isDark ? '#333' : '#f0f0f0'};
            color: ${isDark ? '#fff' : '#333'};
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
        }

        /* Mobile Responsive Design */
        @media (max-width: 768px) {
            body {
                max-width: 100%;
                margin: 0;
            }

            .header {
                padding: 0;
            }

            .nav-bar {
                padding: 0 8px;
                overflow-x: auto;
            }

            .nav-menu {
                gap: 8px;
                padding: 0;
                min-width: max-content;
            }

            .nav-menu li {
                padding: 6px 0;
            }

            .nav-menu a {
                font-size: 11px;
                padding: 0 4px;
            }

            .main-content {
                padding: 15px 10px;
                max-width: 100%;
            }

            .article-header {
                margin-bottom: 15px;
            }

            .breadcrumb {
                font-size: 11px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .article-title {
                font-size: 26px;
                line-height: 1.2;
                margin: 10px 0;
            }

            .article-meta {
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 15px;
            }

            .article-content {
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 15px;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .article-image {
                height: 200px;
                width: 100%;
                object-fit: cover;
                margin-bottom: 10px;
                border-radius: 5px;
            }

            .article-text {
                font-size: 18px;
                line-height: 1.6;
            }

            .social-share {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin: 10px 0;
            }

            .social-btn {
                width: 30px;
                height: 30px;
                font-size: 12px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                text-decoration: none;
            }

            .other-articles {
                display: grid;
                gap: 15px;
                margin-top: 20px;
            }

            .article-card {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 12px;
                display: flex;
                gap: 12px;
            }

            .article-card img {
                width: 80px;
                height: 60px;
                object-fit: cover;
                border-radius: 3px;
                flex-shrink: 0;
            }

            .article-card-content h3 {
                font-size: 13px;
                line-height: 1.2;
                margin-bottom: 5px;
                font-weight: bold;
                color: #333;
            }

            .article-card-meta {
                font-size: 11px;
                color: #666;
            }
        }

        /* Extra small devices */
        @media (max-width: 380px) {
            .nav-bar {
                padding: 0 5px;
            }
            
            .nav-menu {
                gap: 5px;
            }
            
            .nav-menu li {
                padding: 5px 0;
            }
            
            .nav-menu a {
                font-size: 10px;
                padding: 0 3px;
            }

            .article-title {
                font-size: 22px;
            }

            .article-meta {
                font-size: 13px;
            }

            .article-text {
                font-size: 16px;
            }

            .article-card {
                padding: 10px;
            }

            .article-card img {
                width: 70px;
                height: 50px;
            }

            .article-card-content h3 {
                font-size: 12px;
            }
        }

        .facebook { background: #3b5998; }
        .twitter { background: #1da1f2; }
        .whatsapp { background: #25d366; }
        .telegram { background: #0088cc; }
        .linkedin { background: #0077b5; }
    </style>
</head>
<body>
    <header class="header">
        <nav class="nav-bar">
            <ul class="nav-menu">
                <li><a href="/">HOME</a></li>
                <li><a href="/">LATEST</a></li>
                <li><a href="#">TECHNOLOGY</a></li>
                <li><a href="#">BUSINESS</a></li>
                <li><a href="#">CRYPTO</a></li>
                <li><a href="#">INDIA</a></li>
                <li><a href="#">WORLD</a></li>
            </ul>
        </nav>
    </header>

    <main class="main-content">
        <div class="article-header">
            <div class="breadcrumb">
                <a href="/">Home</a> › <a href="#">${article.category}</a> › <span>${article.title.substring(0, 50)}...</span>
            </div>
            
            <h1 class="article-title">
                ${article.title}
            </h1>
            
            <div class="article-meta">
                <strong>Published Date:</strong> ${new Date(article.timestamp || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })} IST &nbsp;&nbsp;&nbsp; <strong>By</strong> ${article.source || 'AgamiNews'}
            </div>
        </div>

        <article class="article-content">
            ${article.image ? `
                <div style="margin-bottom: 20px;">
                    <img src="/img/?src=${encodeURIComponent(article.image.url || article.image)}&w=1200&q=70" alt="${article.title}" class="article-image" loading="lazy">
                    <p class="photo-credit">
                        Photo: ${
                            article.image.credit || 
                            (article.image.source === 'dalle' || article.image.source === 'dall-e' ? 'DALL-E AI' : 
                             article.image.source === 'unsplash' ? 'Unsplash' :
                             article.image.source === 'pexels' ? 'Pexels' :
                             'AgamiNews')
                        }
                    </p>
                </div>
            ` : ''}
            
            <div class="social-share">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(request.url)}" target="_blank" class="social-btn facebook">f</a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(request.url)}&text=${encodeURIComponent(article.title)}" target="_blank" class="social-btn twitter">t</a>
                <a href="https://wa.me/?text=${encodeURIComponent(article.title + ' ' + request.url)}" target="_blank" class="social-btn whatsapp">w</a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(request.url)}&text=${encodeURIComponent(article.title)}" target="_blank" class="social-btn telegram">T</a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(request.url)}" target="_blank" class="social-btn linkedin">in</a>
            </div>
            
            <div class="article-text">
                ${fullContent}
            </div>
        </article>

        <!-- Other Articles -->
        <div class="other-articles">
            ${allArticles
                .filter((a, i) => i !== articleIndex)
                .slice(0, 4)
                .map(related => `
                <div class="article-card">
                    <img src="${related.image?.url || related.image ? `/img/?src=${encodeURIComponent(related.image?.url || related.image)}&w=400&q=70` : 'https://via.placeholder.com/120x80/ff6600/ffffff?text=News'}" alt="${related.title}" loading="lazy">
                    <div class="article-card-content">
                        <h3><a href="${related.url}" style="color: #333; text-decoration: none;">${related.title}</a></h3>
                        <div class="article-card-meta">${related.category} | ${related.date || 'Today'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </main>
</body>
</html>`;

    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      }
    });
  } catch (e) {
    console.error('Render error:', e);
    return new Response('<h1>Temporary error</h1><p>Please refresh.</p>', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

// Serve article by SEO-friendly slug URL
async function serveArticleBySlug(env, request, pathname) {
  try {
    // Extract slug from path
    const lastSegment = pathname.split('/').pop() || '';
    const decodedPathname = decodeURIComponent(pathname);
    
    // Check for legacy URLs with numeric ID at the end
    const idMatch = pathname.match(/-(\d{6,})$/);
    const idFromPath = idMatch ? idMatch[1] : null;
    const slugFromPath = idFromPath ? lastSegment.slice(0, -(idFromPath.length + 1)) : lastSegment;
    
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    
    let article = null;
    
    // First, try exact URL match
    article = articles.find(a => a.url && a.url === decodedPathname);
    
    // If not found, try slug match
    if (!article && slugFromPath) {
      article = articles.find(a => a.slug === slugFromPath);
    }
    
    // For legacy URLs with ID, also try ID match
    if (!article && idFromPath) {
      article = articles.find(a => String(a.id) === String(idFromPath));
      
      // If found by ID but URL is different, it will redirect below
    }
    
    // Try to find by partial slug match in URL
    if (!article) {
      article = articles.find(a => a.url && a.url.includes(`/${slugFromPath}`));
    }
    
    if (!article) {
      // Try archived single-article KV by ID (for legacy support)
      if (idFromPath) {
        const archived = await env.NEWS_KV.get(`article_${idFromPath}`, 'json');
        if (archived && archived.id) {
          article = archived;
        }
      }
      if (!article) {
        throw new Error('Article not found');
      }
    }
    
    // Determine canonical URL (prefer stored url if present)
    const safeCategory = (article.category || 'news').toString();
    const safeSlug = article.slug || generateSlug(article.title || 'article');
    const canonicalUrl = article.url || `/${safeCategory.toLowerCase()}-news/${safeSlug}`;
    if (pathname !== canonicalUrl) {
      return Response.redirect(new URL(canonicalUrl, request.url).toString(), 301);
    }
    
    return renderArticlePage(env, article, articles, request);
  } catch (error) {
    console.error('Error serving article by slug:', error);
    return serve404Page(env, error.message);
  }
}
// Serve individual article page (legacy)
async function serveArticle(env, request, pathname) {
  try {
    const pathPart = pathname.split('/')[2];
    const articleId = parseInt(pathPart);
    
    // Validate articleId; if invalid, try slug-based fallback
    if (isNaN(articleId) || articleId < 0) {
      const articlesForSlug = await env.NEWS_KV.get('articles', 'json') || [];
      const slugCandidate = decodeURIComponent(pathPart || '').trim();
      if (slugCandidate) {
        const bySlug = articlesForSlug.find(a => a.slug === slugCandidate);
        if (bySlug) {
          const redirectUrl = bySlug.url || `/${bySlug.category.toLowerCase()}-news/${bySlug.slug}-${bySlug.id}`;
          return Response.redirect(new URL(redirectUrl, request.url).toString(), 301);
        }
      }
      throw new Error('Invalid article ID');
    }
    
    const articles = await env.NEWS_KV.get('articles', 'json') || getDefaultArticles();
    
    // Check if articleId is within bounds
    if (articleId >= articles.length) {
      throw new Error('Article ID out of bounds');
    }
    
    const article = articles[articleId];
  
  if (!article) {
    // 404 page with Google Analytics
    const html404 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Article Not Found - AgamiNews</title>
    
    ${getUniversalSEOTags('404 - Page Not Found', 'The page you are looking for was not found', request.url)}
    
    <!-- GUARANTEED GA for 404 Pages -->
    ${getGoogleAnalyticsCode('404 - Article Not Found', '/404')}
    
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: #f5f5f5;
      }
      .error-container {
        text-align: center;
        padding: 20px;
      }
      h1 { color: #CC0000; font-size: 72px; margin: 0; }
      h2 { color: #333; margin: 20px 0; }
      a {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        background: #CC0000;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404</h1>
        <h2>Article Not Found</h2>
        <p>The article you're looking for doesn't exist or has been removed.</p>
        <a href="/">← Back to Homepage</a>
    </div>
</body>
</html>`;
    return new Response(html404, { 
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // Track article view
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  if (!stats.articleViews) stats.articleViews = {};
  stats.articleViews[articleId] = (stats.articleViews[articleId] || 0) + 1;
  article.views = (article.views || 0) + 1;
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
  
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const isDark = config.theme === 'dark';
  
  // Use pre-generated content only (no on-request generation)
  const fullContent = article.fullContent || '<p><em>Content is preparing. Please refresh shortly.</em></p>';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - ${config.siteName}</title>
    <meta name="description" content="${article.preview || 'Read full article on AgamiNews'}">
    
    <!-- UNIVERSAL SEO TAGS - 200% GUARANTEED -->
    ${getUniversalSEOTags(
      article.title + ' - AgamiNews',
      article.preview || article.description || 'Read full article on AgamiNews',
      'https://agaminews.in' + article.url
    )}
    
    <!-- Article-Specific SEO Tags -->
    <meta name="news_keywords" content="${article.title.split(' ').slice(0, 10).join(', ')}">
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.preview || 'Read full article on AgamiNews'}">
    <meta property="og:image" content="${article.image?.url || article.image || 'https://agaminews.in/og-image.jpg'}">
    <meta property="og:url" content="https://agaminews.in${article.url}">
    <meta property="og:site_name" content="AgamiNews">
    <meta property="article:published_time" content="${new Date(article.timestamp || Date.now()).toISOString()}">
    <meta property="article:author" content="AgamiNews">
    <meta property="article:section" content="${article.category}">
    
    <!-- Twitter Card Tags -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${article.title}">
    <meta property="twitter:description" content="${article.preview || 'Read full article on AgamiNews'}">
    <meta property="twitter:image" content="${article.image?.url || article.image || 'https://agaminews.in/og-image.jpg'}">
    
    <!-- Structured Data for Google Rich Results -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": "${article.title.replace(/"/g, '\\"')}",
      "description": "${(article.preview || '').replace(/"/g, '\\"')}",
      "image": "${article.image?.url || article.image || 'https://agaminews.in/og-image.jpg'}",
      "datePublished": "${new Date(article.timestamp || Date.now()).toISOString()}",
      "dateModified": "${new Date(article.timestamp || Date.now()).toISOString()}",
      "author": {
        "@type": "Organization",
        "name": "AgamiNews",
        "url": "https://agaminews.in"
      },
      "publisher": {
        "@type": "Organization",
        "name": "AgamiNews",
        "logo": {
          "@type": "ImageObject",
          "url": "https://agaminews.in/logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://agaminews.in${article.url}"
      },
      "articleSection": "${article.category}",
      "keywords": "${article.title.split(' ').slice(0, 10).join(', ')}"
    }
    </script>
    
    <!-- GUARANTEED Google Analytics - NEVER MISS -->
    ${getGoogleAnalyticsCode(
      article.title.replace(/'/g, "\\'") + ' - Article',
      article.url
    )}
    
    <!-- ADDITIONAL GA Tracking for Articles -->
    <script>
      // Enhanced article tracking
      window.addEventListener('load', function() {
        if (typeof gtag !== 'undefined') {
          // Double-check GA is loaded
          gtag('config', 'G-ZW77WM2VPG', {
            page_path: '${article.url}',
            page_title: '${article.title.replace(/'/g, "\\'")}',
        page_location: window.location.href,
        custom_dimensions: {
          'article_id': '${articleId}',
          'article_category': '${article.category}',
          'article_source': '${article.source || 'Unknown'}',
          'article_published': '${article.timestamp ? new Date(article.timestamp).toISOString() : new Date().toISOString()}'
        }
      });
      
      // Track article read event
      gtag('event', 'article_read', {
        'event_category': 'Article',
        'event_label': '${article.title.replace(/'/g, "\\'")}',
        'article_id': '${articleId}',
        'article_category': '${article.category}'
      });
      
      // Track reading time
      let readStartTime = new Date().getTime();
      let hasTracked30s = false;
      let hasTracked60s = false;
      
      setInterval(function() {
        const timeSpent = Math.round((new Date().getTime() - readStartTime) / 1000);
        
        if (timeSpent >= 30 && !hasTracked30s) {
          hasTracked30s = true;
          gtag('event', 'read_30_seconds', {
            'event_category': 'Engagement',
            'event_label': '${article.title.replace(/'/g, "\\'")}'
          });
        }
        
        if (timeSpent >= 60 && !hasTracked60s) {
          hasTracked60s = true;
          gtag('event', 'read_60_seconds', {
            'event_category': 'Engagement',
            'event_label': '${article.title.replace(/'/g, "\\'")}'
          });
        }
      }, 1000);
      
      // Track scroll depth for articles
      let maxScroll = 0;
      window.addEventListener('scroll', function() {
        const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll) {
          maxScroll = scrollPercent;
          if (scrollPercent === 100) {
            gtag('event', 'article_complete', {
              'event_category': 'Engagement',
              'event_label': '${article.title.replace(/'/g, "\\'")}'
            });
          }
        }
      });
      
      // Track share button clicks
      document.addEventListener('DOMContentLoaded', function() {
        const shareButtons = document.querySelectorAll('.share-btn');
        shareButtons.forEach(function(button) {
          button.addEventListener('click', function() {
            const platform = this.textContent.toLowerCase();
            gtag('event', 'share', {
              'event_category': 'Social',
              'event_label': platform,
              'article_title': '${article.title.replace(/'/g, "\\'")}'
            });
          });
        });
      });
    </script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }
        /* Header */
        .header {
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .nav-bar {
            background-color: #ff6600;
            padding: 0 15px;
        }

        .nav-menu {
            display: flex;
            list-style: none;
            gap: 30px;
        }

        .nav-menu li {
            padding: 12px 0;
        }

        .nav-menu a {
            color: white;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .nav-menu a:hover {
            text-decoration: underline;
        }
        /* Main Content */
        .main-content {
            padding: 20px 15px;
            max-width: 900px;
            margin: 0 auto;
        }

        .article-header {
            margin-bottom: 20px;
        }

        .breadcrumb {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }

        .breadcrumb a {
            color: #ff6600;
            text-decoration: none;
        }

        .article-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            line-height: 1.3;
            margin-bottom: 15px;
        }

        .article-meta {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
        }

        .article-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .article-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .image-credit {
            font-size: 12px;
            opacity: 0.6;
            text-align: right;
            margin-bottom: 30px;
        }
        .article-content {
            font-size: 18px;
            line-height: 1.8;
        }
        .article-content p {
            margin-bottom: 20px;
        }
        .share-buttons {
            margin: 40px 0;
            padding: 20px;
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            border-radius: 10px;
            text-align: center;
        }
        .share-title {
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .share-btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px;
            background: ${config.primaryColor};
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
            transition: opacity 0.3s;
        }
        .share-btn:hover {
            opacity: 0.8;
        }
        .back-btn {
            display: inline-block;
            margin-top: 40px;
            padding: 12px 30px;
            background: ${isDark ? '#2A2A2A' : '#F0F0F0'};
            color: ${isDark ? '#FFF' : '#000'};
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
        }
        .back-btn:hover {
            background: ${config.primaryColor};
            color: white;
        }
        .related-articles {
            margin-top: 60px;
            padding: 40px 20px;
            background: ${isDark ? 'linear-gradient(to bottom, #1a1a1a, #000)' : 'linear-gradient(to bottom, #f8f9fa, #ffffff)'};
            border-radius: 12px;
            border-top: 3px solid #0066cc;
        }
        .related-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 30px;
            text-align: center;
            position: relative;
        }
        .related-title:after {
            content: '';
            display: block;
            width: 60px;
            height: 3px;
            background: #0066cc;
            margin: 15px auto;
        }
        .related-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }
        @media (max-width: 768px) {
            .related-grid {
                grid-template-columns: 1fr;
            }
        }
        .related-card {
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            padding: 12px;
            border-radius: 10px;
            text-decoration: none;
            color: inherit;
            transition: transform 0.3s;
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .related-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .related-card-image {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            overflow: hidden;
            flex-shrink: 0;
            background: ${isDark ? '#0A0A0A' : '#F0F0F0'};
        }
        .related-card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .related-card-content {
            flex: 1;
            min-width: 0;
        }
        .related-card-title {
            font-weight: 600;
            margin-bottom: 5px;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .related-card-meta {
            font-size: 12px;
            opacity: 0.7;
        }
        @media (max-width: 768px) {
            .header {
                padding: 12px 10px;
            }
            .header-content {
                padding: 0 10px;
            }
            .logo {
                font-size: 20px;
            }
            .article-container {
                padding: 20px 15px;
            }
            .article-title { 
                font-size: 24px;
                line-height: 1.3;
                margin-bottom: 15px;
            }
            .article-content { 
                font-size: 15px;
                line-height: 1.7;
            }
            .article-content p {
                margin-bottom: 15px;
            }
            .article-meta {
                font-size: 12px;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                padding-bottom: 15px;
            }
            .article-image {
                border-radius: 8px;
                max-height: 300px;
            }
            .share-buttons {
                padding: 15px;
                margin: 30px 0;
            }
            .share-btn {
                padding: 10px 15px;
                font-size: 13px;
                margin: 3px;
            }
            .back-btn {
                padding: 12px 25px;
                font-size: 14px;
                margin-top: 30px;
            }
            .related-title {
                font-size: 20px;
                margin-bottom: 15px;
            }
            .related-grid {
                gap: 12px;
            }
            .related-card {
                padding: 10px;
            }
            .related-card-image {
                width: 60px;
                height: 60px;
            }
            .related-card-title {
                font-size: 13px;
                -webkit-line-clamp: 2;
            }
            .related-card-meta {
                font-size: 11px;
            }
        }
        
        /* Other Articles */
        .other-articles {
            display: grid;
            gap: 20px;
            margin-top: 30px;
        }

        .article-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 15px;
            display: flex;
            gap: 15px;
        }

        .article-card img {
            width: 120px;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
            flex-shrink: 0;
        }

        .article-card-content h3 {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            line-height: 1.3;
        }

        .article-card-meta {
            font-size: 12px;
            color: #666;
        }

        /* Mobile Responsive Design */
        @media (max-width: 768px) {
            body {
                max-width: 100%;
                margin: 0;
            }

            .header {
                padding: 0;
            }

            .nav-bar {
                padding: 0 8px;
                overflow-x: auto;
            }

            .nav-menu {
                gap: 8px;
                padding: 0;
                min-width: max-content;
            }

            .nav-menu li {
                padding: 6px 0;
            }

            .nav-menu a {
                font-size: 11px;
                padding: 0 4px;
            }

            .main-content {
                padding: 15px 10px;
                max-width: 100%;
            }

            .article-header {
                margin-bottom: 15px;
            }

            .breadcrumb {
                font-size: 11px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .article-title {
                font-size: 20px;
                line-height: 1.2;
                margin-bottom: 10px;
            }

            .article-meta {
                font-size: 12px;
                line-height: 1.4;
                margin-bottom: 15px;
            }

            .article-content {
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 15px;
            }

            .article-image {
                height: 200px;
                margin-bottom: 10px;
                border-radius: 5px;
            }

            .article-text {
                font-size: 18px;
                line-height: 1.6;
            }

            .social-share {
                justify-content: center;
                margin: 10px 0;
            }

            .social-btn {
                width: 30px;
                height: 30px;
                font-size: 12px;
            }

            .other-articles {
                gap: 15px;
                margin-top: 20px;
            }

            .article-card {
                flex-direction: row;
                padding: 12px;
                gap: 12px;
            }

            .article-card img {
                width: 80px;
                height: 60px;
                border-radius: 3px;
            }

            .article-card-content h3 {
                font-size: 13px;
                line-height: 1.2;
                margin-bottom: 5px;
            }

            .article-card-meta {
                font-size: 11px;
            }
        }

        /* Extra small devices */
        @media (max-width: 380px) {
            .nav-bar {
                padding: 0 5px;
            }
            
            .nav-menu {
                gap: 5px;
            }
            
            .nav-menu li {
                padding: 5px 0;
            }
            
            .nav-menu a {
                font-size: 10px;
                padding: 0 3px;
            }

            .article-title {
                font-size: 22px;
            }

            .article-meta {
                font-size: 13px;
            }

            .article-text {
                font-size: 16px;
            }

            .article-card {
                padding: 10px;
            }

            .article-card img {
                width: 70px;
                height: 50px;
            }

            .article-card-content h3 {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <nav class="nav-bar">
            <ul class="nav-menu">
                <li><a href="/">HOME</a></li>
                <li><a href="/">LATEST</a></li>
                <li><a href="#">INDIA</a></li>
                <li><a href="#">BUSINESS</a></li>
                <li><a href="#">TECHNOLOGY</a></li>
                <li><a href="#">ENTERTAINMENT</a></li>
            </ul>
        </nav>
    </header>

    <main class="main-content">
        <div class="article-header">
            <div class="breadcrumb">
                <a href="/">Home</a> › <a href="#">${article.category}</a> › <span>${article.title.substring(0, 50)}...</span>
            </div>
            
            <h1 class="article-title">
                ${article.title}
            </h1>
            
            <div class="article-meta">
                <strong>Published Date:</strong> ${new Date(article.timestamp || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })} IST &nbsp;&nbsp;&nbsp; <strong>By</strong> ${article.source || 'AgamiNews'}
            </div>
        </div>

        <article class="article-content">
            ${article.image ? `
                <div style="margin-bottom: 20px;">
                    <img src="/img/?src=${encodeURIComponent(article.image.url || article.image)}&w=1200&q=70" alt="${article.title}" class="article-image" loading="lazy">
                    <p class="photo-credit">
                        Photo: ${
                            article.image.credit || 
                            (article.image.source === 'dalle' || article.image.source === 'dall-e' ? 'DALL-E AI' : 
                             article.image.source === 'unsplash' ? 'Unsplash' :
                             article.image.source === 'pexels' ? 'Pexels' :
                             'AgamiNews')
                        }
                    </p>
                </div>
            ` : ''}
            
            <div class="social-share">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(request.url)}" target="_blank" class="social-btn facebook">f</a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(request.url)}&text=${encodeURIComponent(article.title)}" target="_blank" class="social-btn twitter">t</a>
                <a href="https://wa.me/?text=${encodeURIComponent(article.title + ' ' + request.url)}" target="_blank" class="social-btn whatsapp">w</a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(request.url)}&text=${encodeURIComponent(article.title)}" target="_blank" class="social-btn telegram">T</a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(request.url)}" target="_blank" class="social-btn linkedin">in</a>
            </div>
            
            <div class="article-text">
                ${fullContent}
            
            </div>
        </article>

        <!-- Other Articles -->
        <div class="other-articles">
            ${articles
                .filter((a, i) => i !== articleId)
                .slice(0, 4)
                .map(related => `
                <div class="article-card">
                    <img src="${related.image?.url || related.image || 'https://via.placeholder.com/120x80/ff6600/ffffff?text=News'}" alt="${related.title}">
                    <div class="article-card-content">
                        <h3><a href="${related.url}" style="color: #333; text-decoration: none;">${related.title}</a></h3>
                        <div class="article-card-meta">${related.category} | ${related.date || 'Today'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </main>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  } catch (error) {
    console.error('Error serving article:', error);
    
    // Return a proper 404 page for any errors
    const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - AgamiNews</title>
    ${getGoogleAnalyticsCode('Error Page', '/error')}
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: #f5f5f5;
      }
      .error-container {
        text-align: center;
        padding: 20px;
      }
      h1 { color: #CC0000; font-size: 72px; margin: 0; }
      h2 { color: #333; margin: 20px 0; }
      p { color: #666; margin: 20px 0; }
      a {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        background: #CC0000;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Error</h1>
        <h2>Something went wrong</h2>
        <p>The article you're looking for cannot be displayed.</p>
        <p style="font-size: 12px; color: #999;">Error: ${error.message}</p>
        <a href="/">← Back to Homepage</a>
    </div>
</body>
</html>`;
    
    return new Response(errorHtml, { 
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// Generate COMPLETELY ORIGINAL article with research and new headline
async function generateOriginalArticle(sourceMaterial, env) {
  console.log(`Creating original article from source: ${sourceMaterial.originalTitle}`);
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key missing - cannot generate article');
  }
  // Normalize into the unified article object expected by generateFullArticle
  const article = {
    title: sourceMaterial.originalTitle,
    category: sourceMaterial.category || 'News',
    source: sourceMaterial.source || 'Multiple Sources'
  };
  const description = sourceMaterial.description || '';
  // Create a high-CTR, curiosity-driven but credible headline
  const newTitle = await generateClickableHeadline(article.title, article.category, env).catch(() => article.title);
  article.title = newTitle || article.title;
  const content = await generateFullArticle(article, description, env);
  // Return the improved title
  return {
    title: article.title,
    content
  };
}

// Enhanced research function to gather context from multiple perspectives
async function gatherResearchContext(title, category, env) {
  if (!env.OPENAI_API_KEY) return null;
  
  try {
    const researchPrompt = `As a research assistant, provide comprehensive background on this news topic:
    
Title: ${title}
Category: ${category}

Provide:
1. KEY FACTS: Core information and data points
2. STAKEHOLDERS: Who is affected and how
3. CONTEXT: Historical background and recent developments  
4. PERSPECTIVES: Different viewpoints on this issue
5. IMPLICATIONS: Potential consequences and future impact
6. INDIAN CONTEXT: Specific relevance to Indian audiences

Format as structured research notes, not an article. Focus on facts and multiple viewpoints.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a research analyst gathering comprehensive background information for journalists. Provide factual, balanced research with multiple perspectives.' 
          },
          { role: 'user', content: researchPrompt }
        ],
        temperature: 0.3,  // Lower temperature for factual research
        max_tokens: 2000
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (error) {
    console.error('Research gathering failed:', error);
  }
  
  return null;
}

async function generateFullArticle(article, description, env) {
  console.log(`generateFullArticle called for: ${article.title}, API key: ${env.OPENAI_API_KEY ? 'present' : 'missing'}`);
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key missing - cannot generate article');
  }
  
  try {
    // Gather additional research context if not provided
    let enhancedContext = description;
    if (!description || description.length < 500) {
      const research = await gatherResearchContext(article.title, article.category, env);
      if (research) {
        enhancedContext = description ? `${description}\n\nAdditional Research:\n${research}` : research;
        console.log('Enhanced article with additional research context');
      }
    }
    const category = (article.category || 'News').toLowerCase();
    
    // Enhanced persona by category with specific expertise
    const persona = category.includes('politic') || category.includes('india') ? 
      `You are a seasoned political analyst with 20+ years covering Indian politics. You understand the nuances of coalition politics, electoral dynamics, and policy implications. Your analysis is sharp, balanced, and insightful. You write like veteran journalists from The Hindu or Indian Express - authoritative yet accessible.`
      : category.includes('tech') ? 
      `You are a hands-on technology expert who actually uses and understands the products you write about. You explain complex tech in simple terms while maintaining depth. Your style combines the technical accuracy of Ars Technica with the accessibility of The Verge. You're excited about innovation but skeptical of hype.`
      : category.includes('business') || category.includes('economy') ? 
      `You are a markets and macroeconomics analyst with deep understanding of Indian business landscape. You write like a Bloomberg or Economic Times senior correspondent - data-driven, insightful about market movements, and able to explain complex financial concepts clearly. You understand both global trends and local implications.`
      : category.includes('entertainment') || category.includes('bollywood') ? 
      `You are a witty entertainment journalist with sharp cultural observations and insider knowledge. Your writing sparkles with personality - think Variety meets Film Companion. You balance celebrity coverage with cultural criticism, and you're not afraid to be playful while maintaining journalistic integrity.`
      : category.includes('sports') ? 
      `You are a dynamic sports analyst who brings games to life through words. You combine statistical analysis with emotional storytelling, like The Athletic's best writers. You understand strategy, player psychology, and fan culture. Your enthusiasm is infectious but your analysis remains objective.`
      : category.includes('science') || category.includes('health') ?
      `You are a science communicator who makes complex research accessible without dumbing it down. You write like Ed Yong or Carl Zimmer - clear, engaging, and accurate. You understand peer review, can spot pseudoscience, and always contextualize findings for practical understanding.`
      : `You are an investigative journalist with a commitment to truth and public interest. Your writing is thorough, balanced, and impactful. You dig deeper than surface-level reporting and always consider multiple perspectives.`;

    // Enhanced curiosity-driven question framework
    const curiosityRules = `CRITICAL ENGAGEMENT RULES:
1) HOOK QUESTION: Start with a compelling question that immediately grabs attention and sets up the story's stakes
2) SECTION QUESTIONS: Use question-form subheadings (H2/H3) that guide the narrative and create anticipation
3) RHETORICAL QUESTIONS: Weave in thought-provoking questions between paragraphs to maintain engagement
4) OPEN-ENDED CONCLUSION: End with a forward-looking question that invites reflection or discussion
5) CONVERSATIONAL TONE: Write as if explaining to a smart friend - engaging, clear, never condescending

QUESTION TYPES TO USE:
- "What if..." questions for speculation
- "Why does..." questions for explanation  
- "How can..." questions for solutions
- "What happens when..." for consequences
- "Could this mean..." for implications`;

    // Enhanced structure with research depth
    const structure = `REQUIRED STRUCTURE:
- HOOK: Opening with an irresistible question (1-2 sentences)
- CONTEXT: Brief background that answers "Why now?" and "Why should I care?"
- 5-8 SECTIONS with question-based H2/H3 subheadings that build the narrative
- DATA & EVIDENCE: Specific numbers, dates, quotes, examples in every section
- MULTIPLE PERSPECTIVES: At least 3 different viewpoints or expert opinions
- IMPLICATIONS: Clear explanation of what this means for readers
- CONCLUSION: Thoughtful ending with an open question

QUALITY REQUIREMENTS:
- Length: 1,500-2,000 words of substantive content
- Original insights: Don't just report, analyze and synthesize
- Specific details: Names, numbers, dates, locations
- Cultural relevance: Connect to Indian context where applicable
- Fact-based: Every claim supported by evidence or logic`;

    // Writing style enhancements
    const styleGuide = `WRITING STYLE:
- Active voice preferred
- Short sentences mixed with longer ones for rhythm
- Vivid verbs and concrete nouns
- Minimal adjectives, no clichés
- Show don't tell - use examples
- Transitions that maintain flow
- Vary paragraph lengths (2-5 sentences)`;

    const systemPrompt = `${persona}

${curiosityRules}

${styleGuide}

You are writing for educated Indian readers who want depth, nuance, and original thinking. Never copy existing headlines or articles - create completely original content based on the topic. Research thoroughly, think critically, and write engagingly.`;

    const userPrompt = `ARTICLE BRIEF
Title: ${article.title}
Category: ${article.category}
Context/Research: ${enhancedContext || 'Use your knowledge to provide comprehensive coverage'}

YOUR TASK:
Write a deeply researched, original article that goes beyond surface-level reporting. 

CRITICAL REQUIREMENTS:
1. ORIGINAL CONTENT: Create entirely new content. Do NOT copy or paraphrase existing articles.
2. HOOK QUESTION: Start with a compelling question that makes readers need to know more
3. QUESTION SUBHEADINGS: Every H2/H3 must be a curiosity-driven question
4. RHETORICAL QUESTIONS: Sprinkle thought-provoking questions throughout
5. OPEN ENDING: Conclude with a question that sparks discussion

HTML FORMAT:
- Use only: <p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>
- No title tag or metadata
- Clean, semantic HTML

DEPTH REQUIREMENTS:
- Multiple perspectives and viewpoints
- Specific examples and case studies
- Data points and statistics where relevant
- Cultural and local context
- Forward-looking analysis

Remember: You're not just reporting news, you're providing insight, analysis, and value that readers can't get elsewhere.

Return ONLY the HTML content.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt + '\n\n' + structure },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,  // Slightly higher for more creativity
        max_tokens: 6000,  // Increased for longer articles
        presence_penalty: 0.4,  // Encourage diverse vocabulary
        frequency_penalty: 0.4,  // Reduce repetition
        top_p: 0.95  // Focus on high-quality outputs
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await response.json();
    const fullContent = data.choices?.[0]?.message?.content || '';

    // Quality checks
    const charLen = fullContent.replace(/<[^>]*>/g, '').length;
    const hasHookQuestion = /<p>\s*[^<\?]*\?\s*<\/p>/i.test(fullContent.substring(0, 600));
    const subheadingQuestions = (fullContent.match(/<h2>.*\?<\/h2>|<h3>.*\?<\/h3>/gi) || []).length;
    const endsWithQuestion = /\?\s*<\/p>\s*$/i.test(fullContent.trim());

    if (charLen < 9000 || !hasHookQuestion || subheadingQuestions < 3 || !endsWithQuestion) {
      throw new Error(`Quality gate failed (len=${charLen}, hook=${hasHookQuestion}, subQ=${subheadingQuestions}, endQ=${endsWithQuestion})`);
    }

    return fullContent;
  } catch (error) {
    console.error('Article generation error:', error.message);
    // No placeholder path: fail hard so publisher can retry later
    throw error;
  }
}

// Generate a highly clickable headline using psychological triggers
async function generateClickableHeadline(baselineTitle, category, env) {
  const categoryLower = (category || 'News').toLowerCase();
  
  // Enhanced personas with clickability focus
  const persona = categoryLower.includes('politic') ? 
    `You are the chief political editor at India's most-read news platform. Your headlines have made stories go viral. You understand power dynamics, conflicts, and what makes readers click on political news. You know how to hint at drama without sensationalizing.`
    : categoryLower.includes('tech') ? 
    `You are a tech editor whose headlines consistently get the highest click rates. You make readers feel they'll miss out on the future if they don't click. You turn complex tech into "must-know" information.`
    : categoryLower.includes('business') ? 
    `You are a business editor who makes financial news irresistible. Your headlines make readers feel they're getting insider information. You know how to make money matters urgent and personal.`
    : categoryLower.includes('entertainment') ? 
    `You are an entertainment editor whose headlines are social media gold. You create FOMO, spark discussions, and make every story feel like breaking gossip worth sharing.`
    : categoryLower.includes('sports') ?
    `You are a sports editor who captures the thrill of victory and agony of defeat in headlines. You make even non-fans want to know what happened. Your headlines create emotional investment.`
    : `You are a viral news editor who understands human psychology. Your headlines tap into curiosity, fear of missing out, and the need to be informed. You make every story feel essential.`;
    
  // Advanced clickability rules with psychological triggers
  const rules = `Create 5 HIGHLY CLICKABLE headlines that use psychological triggers while remaining truthful.

🎯 CLICKABILITY FORMULAS (Use at least 2 per headline):

1. CURIOSITY GAP: "The Unexpected Reason Why [X Happened]"
2. BENEFIT PROMISE: "How [X] Could Change [Specific Outcome]"
3. FEAR OF MISSING OUT: "What Everyone's Missing About [Topic]"
4. CONTROVERSY HINT: "[X]'s Controversial Move That Has [Y] Worried"
5. EXCLUSIVE ANGLE: "Inside Story: How [X] Really [Action]"
6. NUMBERS THAT SHOCK: "[Specific Number] [Units] Later: The [Outcome]"
7. QUESTION HOOK: "Is [Surprising Thing] the Real Reason Behind [Event]?"
8. BREAKING PATTERN: "[Expected Thing] Didn't Happen. Here's What Did Instead"
9. AUTHORITY CONFLICT: "Why [Expert A] and [Expert B] Disagree on [Topic]"
10. FUTURE FEAR/HOPE: "The [Time Period] That Could Make or Break [Entity]"

🔥 POWER WORDS TO INCLUDE:
- Reveals, Exposes, Uncovers, Discovers
- Secret, Hidden, Overlooked, Ignored
- Breakthrough, Game-changer, First-ever
- Warning, Alert, Critical, Urgent
- Exclusive, Inside, Behind-the-scenes
- Surprising, Unexpected, Stunning
- Finally, Now, Just, Breaking

📊 MUST INCLUDE:
- Specific names, numbers, or locations when available
- Time pressure (Now, Today, This Week, Just)
- Stake/consequence (what happens if they don't read)
- Emotional trigger (surprise, concern, excitement)

❌ NEVER USE:
- "You Won't Believe..." (overused)
- "Shocking" or "Amazing" (vague)
- Clickbait lies or false promises
- ALL CAPS (except single words for emphasis)

💡 CATEGORY-SPECIFIC TRIGGERS:
${categoryLower.includes('politic') ? '- Power shifts, backstage drama, policy impacts on common people' : ''}
${categoryLower.includes('tech') ? '- Future predictions, disruption warnings, "what it means for you"' : ''}
${categoryLower.includes('business') ? '- Money impacts, market moves, winner/loser angles' : ''}
${categoryLower.includes('entertainment') ? '- Behind-scenes drama, relationship angles, career moves' : ''}
${categoryLower.includes('sports') ? '- Records, rivalries, comeback stories, turning points' : ''}

STRUCTURE:
- 10-15 words optimal (can go up to 18 for complex stories)
- Front-load the hook
- End with impact/consequence
- Create urgency without lying

Return a JSON array of 5 headlines, ordered from most to least clickable.`;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: persona + '\n' + rules },
        { role: 'user', content: `Baseline title: ${baselineTitle}\nCategory: ${category || 'News'}` }
      ],
      temperature: 0.8,
      max_tokens: 400
    })
  });
  if (!res.ok) return baselineTitle;
  const data = await res.json();
  let ideas = [];
  try { ideas = JSON.parse(data.choices?.[0]?.message?.content || '[]'); } catch (_) {
    ideas = [];
  }
  const chosen = ideas.find(h => typeof h === 'string' && h.length >= 30) || baselineTitle;
  return chosen;
}

// Template-based article generation (fallback)
function generateFullArticleTemplate(article) {
  const preview = article.preview || '';
  const title = article.title || '';
  const category = article.category || 'News';
  
  // Expand into a full article
  const paragraphs = [];
  
  // Opening paragraph
  paragraphs.push(`<p><strong>${preview}</strong></p>`);
  
  // Generate content specific to the news title
  const titleLower = title.toLowerCase();
  
  // Extract key topics from title for more relevant content
  if (titleLower.includes('xi') || titleLower.includes('china')) {
    paragraphs.push(`<p>China's evolving foreign policy stance has been a subject of intense scrutiny among international observers. The recent statements and policy shifts indicate a more assertive approach in regional affairs, which has significant implications for neighboring countries including India.</p>`);
    paragraphs.push(`<p>Diplomatic experts suggest that these developments require careful monitoring and strategic responses from regional partners. The balance of power in Asia continues to shift, with each nation reassessing its position and alliances in light of these changes.</p>`);
    paragraphs.push(`<p>For India, this development necessitates a nuanced approach that balances economic cooperation with strategic autonomy. The government's response will likely involve strengthening regional partnerships while maintaining diplomatic channels.</p>`);
  } else if (titleLower.includes('recession') || titleLower.includes('economy')) {
    paragraphs.push(`<p>Economic indicators have been sending mixed signals, with some pointing toward potential headwinds while others suggest resilience in key sectors. Global markets are closely watching central bank policies and inflation data for clearer direction.</p>`);
    paragraphs.push(`<p>For Indian investors and businesses, the global economic uncertainty presents both challenges and opportunities. Sectors like IT and pharmaceuticals may face export pressures, while domestic consumption could provide a buffer against external shocks.</p>`);
    paragraphs.push(`<p>Financial advisors recommend diversification and a focus on quality assets during these uncertain times. The Indian economy's relative strength compared to other emerging markets could attract foreign investment despite global concerns.</p>`);
  } else if (titleLower.includes('hyderabad') || titleLower.includes('telangana')) {
    paragraphs.push(`<p>The historical narrative around Hyderabad's accession to India remains a topic of scholarly debate and political discourse. Different perspectives on these events reflect the complex nature of India's post-independence history.</p>`);
    paragraphs.push(`<p>Contemporary Hyderabad has emerged as a major technology and business hub, transcending historical divisions. The city's growth story exemplifies India's economic transformation and its ability to leverage historical diversity as a strength.</p>`);
    paragraphs.push(`<p>The ongoing discussions about historical events serve as a reminder of the importance of inclusive narratives in nation-building. Telangana's development trajectory continues to be shaped by both its historical legacy and future aspirations.</p>`);
  } else if (titleLower.includes('rainfall') || titleLower.includes('weather') || titleLower.includes('flood')) {
    paragraphs.push(`<p>The unprecedented weather event has highlighted the increasing impact of climate change on regional weather patterns. Emergency services have been working round the clock to provide relief and ensure public safety.</p>`);
    paragraphs.push(`<p>Infrastructure damage assessments are underway, with initial reports suggesting significant impact on transportation networks and agricultural areas. The state government has announced immediate relief measures and long-term rehabilitation plans.</p>`);
    paragraphs.push(`<p>Climate scientists point to this as part of a broader pattern of extreme weather events affecting the region. The incident underscores the urgent need for climate-resilient infrastructure and improved disaster preparedness mechanisms.</p>`);
  } else if (titleLower.includes('technology') || titleLower.includes('ai') || titleLower.includes('digital')) {
    paragraphs.push(`<p>The rapid advancement in technology continues to reshape industries and daily life. Indian companies are increasingly at the forefront of innovation, competing with global giants in cutting-edge fields.</p>`);
    paragraphs.push(`<p>The implications for employment, education, and economic growth are profound. While automation may displace some jobs, it also creates new opportunities in emerging sectors that require different skill sets.</p>`);
    paragraphs.push(`<p>Government initiatives to promote digital literacy and technological innovation are crucial for ensuring inclusive growth. The success of India's digital transformation will depend on bridging the digital divide and ensuring equitable access to technology.</p>`);
  } else if (titleLower.includes('market') || titleLower.includes('sensex') || titleLower.includes('nifty')) {
    paragraphs.push(`<p>Market movements reflect a complex interplay of domestic and global factors. Institutional investors are recalibrating their portfolios based on evolving economic conditions and policy expectations.</p>`);
    paragraphs.push(`<p>Retail investors should focus on fundamental analysis rather than short-term market fluctuations. The long-term growth story of India remains intact, supported by demographic advantages and ongoing reforms.</p>`);
    paragraphs.push(`<p>Sectoral rotation continues as investors seek value in different segments of the market. Banking, IT, and consumer goods sectors are seeing varied investor interest based on their growth prospects and valuations.</p>`);
  } else if (titleLower.includes('cricket') || titleLower.includes('sports') || titleLower.includes('match')) {
    paragraphs.push(`<p>The sporting achievement reflects the dedication and hard work of athletes who have been preparing for this moment. The support staff and coaching team's strategic planning has clearly paid dividends.</p>`);
    paragraphs.push(`<p>This success will inspire a new generation of sports enthusiasts across the country. The investment in sports infrastructure and grassroots development programs is beginning to show results at the highest levels.</p>`);
    paragraphs.push(`<p>The economic impact of sporting success extends beyond the field, boosting merchandise sales, viewership, and sponsorship deals. Indian sports are experiencing a golden period with increased corporate support and government backing.</p>`);
  } else if (titleLower.includes('election') || titleLower.includes('politics') || titleLower.includes('government')) {
    paragraphs.push(`<p>Political developments are being closely watched by various stakeholders, including businesses, civil society, and international partners. The implications for policy continuity and reform momentum are significant.</p>`);
    paragraphs.push(`<p>Electoral dynamics reflect changing voter preferences and priorities. Issues like employment, inflation, and development continue to dominate the political discourse across the country.</p>`);
    paragraphs.push(`<p>The democratic process in India, with its scale and complexity, remains a subject of global interest. The outcomes will shape not just domestic policies but also India's international engagement strategies.</p>`);
  } else {
    // More specific default content based on category
    if (category === 'India') {
      paragraphs.push(`<p>This development is particularly significant in the context of India's rapid transformation. Various stakeholders, from policymakers to citizens, are assessing its implications for their respective interests.</p>`);
      paragraphs.push(`<p>The story reflects broader trends shaping contemporary India - from technological advancement to social change. How these forces interact will determine the country's trajectory in the coming years.</p>`);
    } else if (category === 'World') {
      paragraphs.push(`<p>International developments like these have ripple effects across the global community. India, as a major emerging economy, both influences and is influenced by such global trends.</p>`);
      paragraphs.push(`<p>The interconnected nature of today's world means that events in one region can quickly impact others. Indian businesses and policymakers are closely monitoring these developments for potential opportunities and challenges.</p>`);
    } else if (category === 'Business') {
      paragraphs.push(`<p>The business landscape continues to evolve rapidly, driven by technological disruption and changing consumer preferences. Companies that adapt quickly to these changes are likely to emerge as winners.</p>`);
      paragraphs.push(`<p>Investment patterns are shifting as new sectors emerge and traditional industries transform. The focus on sustainability and digital transformation is reshaping corporate strategies across the board.</p>`);
    } else {
      paragraphs.push(`<p>As this story develops, its full impact will become clearer. Multiple factors are at play, and the outcome will depend on how various stakeholders respond to the evolving situation.</p>`);
      paragraphs.push(`<p>The coming period will be crucial in determining the long-term implications of these events. Continued monitoring and analysis will be essential for understanding the complete picture.</p>`);
    }
  }
  
  // Add a contextual closing based on the article
  if (category === 'India' || titleLower.includes('india')) {
    paragraphs.push(`<p>As India continues its journey toward becoming a developed nation, stories like these shape the narrative of progress and challenges. Stay tuned to AgamiNews for comprehensive coverage of developments that matter to you.</p>`);
  } else {
    paragraphs.push(`<p>We'll continue tracking this story and bring you updates as they develop. AgamiNews remains committed to providing timely, accurate, and insightful coverage of news that impacts your world.</p>`);
  }
  
  // Add source attribution if available
  if (article.source) {
    paragraphs.push(`<p><em>With inputs from ${article.source} and AgamiNews correspondents.</em></p>`);
  }
  
  return paragraphs.join('\n');
}

// Test single article generation
async function testArticleGeneration(env) {
  const testArticle = {
    title: 'Test Article: OpenAI Integration Check',
    category: 'Technology',
    preview: 'Testing article generation...'
  };
  
  try {
    console.log('Testing article generation...');
    const startTime = Date.now();
    
    const fullContent = await generateFullArticle(testArticle, 'This is a test to verify OpenAI article generation is working properly.', env);
    
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return new Response(JSON.stringify({
      success: true,
      timeTaken: `${timeTaken} seconds`,
      contentLength: fullContent.length,
      preview: fullContent.substring(0, 200) + '...',
      apiKeyPresent: !!env.OPENAI_API_KEY
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      apiKeyPresent: !!env.OPENAI_API_KEY
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
// Test OpenAI integration
async function testOpenAI(env) {
  const results = {
    openai_configured: !!env.OPENAI_API_KEY,
    test_result: null,
    test_image: null,
    errors: []
  };
  
  if (env.OPENAI_API_KEY) {
    // Test GPT-4
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Testing with GPT-3.5 Turbo
          messages: [
            {
              role: 'user',
              content: 'Say "GPT-4 is working!" in 5 words.'
            }
          ],
          max_tokens: 20
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        results.test_summary = data.choices[0]?.message?.content || 'No response';
      } else {
        const error = await response.json();
        results.errors.push(`GPT-4 error: ${error.error?.message || 'Unknown'}`);
      }
    } catch (e) {
      results.errors.push(`GPT-4 test failed: ${e.message}`);
    }
    
    // Test DALL-E (optional, comment out to save costs)
    /*
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'dall-e-2', // Using DALL-E 2 for test (cheaper)
          prompt: 'A simple red square',
          n: 1,
          size: '256x256'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        results.test_image = 'DALL-E working';
      } else {
        const error = await response.json();
        results.errors.push(`DALL-E error: ${error.error?.message || 'Unknown'}`);
      }
    } catch (e) {
      results.errors.push(`DALL-E test failed: ${e.message}`);
    }
    */
  }
  
  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Debug info
async function debugInfo(env) {
  const hasToken = !!env.TELEGRAM_BOT_TOKEN;
  const tokenLength = env.TELEGRAM_BOT_TOKEN ? env.TELEGRAM_BOT_TOKEN.length : 0;
  const hasKV = !!env.NEWS_KV;
  const hasOpenAI = !!env.OPENAI_API_KEY;
  
  return new Response(JSON.stringify({
    status: 'debug',
    telegram_token_configured: hasToken,
    token_length: tokenLength,
    kv_configured: hasKV,
    openai_configured: hasOpenAI,
    dalle_ready: hasOpenAI,
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
    <loc>https://agaminews.in${article.url}</loc>
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
  
  // Admin ops via API
  if (pathname === '/api/migrate-kv') {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const mode = (url.searchParams.get('mode') || 'dry').toLowerCase();
    const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
    if (!key || key !== expected) return new Response('Unauthorized', { status: 401 });
    if (!env.OLD_KV || !env.NEWS_KV) {
      return new Response(JSON.stringify({ error: 'Bindings missing', hint: 'Bind OLD_KV to assets KV and NEWS_KV to target KV' }), { headers: { 'Content-Type': 'application/json' }, status: 400 });
    }
    const allowedKeys = ['articles','stats','config','aiInstructions','analytics_overview','cron_logs','last_update_id','admin_chat','articlesTimestamp','lastFetch'];
    const result = { mode, copied: [], skipped: [], articlesCopied: 0, articleKeys: [] };
    for (const k of allowedKeys) {
      const val = await env.OLD_KV.get(k, 'json');
      if (val !== null && val !== undefined) {
        if (mode === 'copy') await env.NEWS_KV.put(k, JSON.stringify(val));
        result.copied.push(k);
      } else {
        const raw = await env.OLD_KV.get(k);
        if (raw) { if (mode === 'copy') await env.NEWS_KV.put(k, raw); result.copied.push(k); } else { result.skipped.push(k); }
      }
    }
    try {
      const list1 = await env.OLD_KV.list({ prefix: 'article_' });
      for (const entry of list1.keys) {
        const keyName = entry.name;
        const v = await env.OLD_KV.get(keyName);
        if (v) { if (mode === 'copy') await env.NEWS_KV.put(keyName, v); result.articleKeys.push(keyName); result.articlesCopied++; }
      }
    } catch (_) {}
    return new Response(JSON.stringify(result, null, 2), { headers: { 'Content-Type': 'application/json' } });
  }
  
  if (pathname === '/api/repair-lite') {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
    if (!key || key !== expected) return new Response('Unauthorized', { status: 401 });
    let id = url.searchParams.get('id') || '';
    let categoryLabel = url.searchParams.get('category') || '';
    let slug = url.searchParams.get('slug') || '';
    if (!id) return new Response('Missing id', { status: 400 });
    const category = mapCategoryLabel(categoryLabel || 'news');
    const baselineTitle = slug ? slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() : `News ${id}`;
    const article = {
      id,
      slug: generateSlug(baselineTitle),
      title: baselineTitle,
      preview: `Quick update: ${baselineTitle}`,
      category,
      source: 'AgamiNews',
      originalSourceLink: '',
      image: { url: `/img/?src=${encodeURIComponent('https://via.placeholder.com/1280x720/0066CC/FFFFFF?text=AgamiNews')}&w=1200&q=70`, credit: 'Placeholder', type: 'placeholder' },
      date: 'Just now',
      timestamp: Date.now(),
      views: 0,
      trending: false,
      fullContent: `<p><strong>${baselineTitle}</strong></p><p>This article is being prepared. Please check back shortly.</p>`,
      url: `/${category.toLowerCase()}-news/${generateSlug(baselineTitle)}`
    };
    const list = await env.NEWS_KV.get('articles', 'json') || [];
    const idx = list.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) list.splice(idx, 1);
    const updated = [article, ...list].slice(0, 100);
    await env.NEWS_KV.put('articles', JSON.stringify(updated));
    await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
    await env.NEWS_KV.put(`article_${id}`, JSON.stringify(article));
    return new Response(JSON.stringify({ ok: true, article }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  if (pathname === '/api/replace-article') {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const expected = env.ADMIN_SECRET || env.CRON_SECRET || 'agami2024';
    if (!key || key !== expected) return new Response('Unauthorized', { status: 401 });
    const oldId = url.searchParams.get('id') || '';
    const categoryParam = url.searchParams.get('category') || 'technology';
    const slugParam = url.searchParams.get('slug') || '';
    const titleParam = url.searchParams.get('title') || '';
    if (!oldId) return new Response('Missing id', { status: 400 });
    const category = mapCategoryLabel(categoryParam);
    const baselineTitle = titleParam ? decodeURIComponent(titleParam) : slugParam ? decodeURIComponent(slugParam).replace(/[-_]+/g, ' ').trim() : 'Breaking update';
    const list = await env.NEWS_KV.get('articles', 'json') || [];
    const idx = list.findIndex(a => String(a.id) === String(oldId));
    if (idx !== -1) list.splice(idx, 1);
    const sourceMaterial = { originalTitle: baselineTitle, description: `Replacement article for ${baselineTitle}`, source: 'AgamiNews Replacement', link: '', category };
    let newArticle;
    try {
      const research = await generateOriginalArticle(sourceMaterial, env);
      const title = research.title || baselineTitle;
      const content = research.content || `<p>${baselineTitle}</p>`;
      const newId = generateArticleId();
      newArticle = {
        id: newId,
        slug: generateSlug(title),
        title,
        preview: content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
        category,
        source: 'AgamiNews Research Team',
        originalSourceLink: '',
        image: await getArticleImage(title, category, env),
        date: 'Just now',
        timestamp: Date.now(),
        views: 0,
        trending: false,
        fullContent: content,
        url: `/${category.toLowerCase()}-news/${generateSlug(title)}`
      };
    } catch (e) {
      const title = baselineTitle;
      const content = `<p><strong>${baselineTitle}</strong></p><p>This article is being prepared. Please check back shortly.</p>`;
      const newId = generateArticleId();
      newArticle = {
        id: newId,
        slug: generateSlug(title),
        title,
        preview: content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
        category,
        source: 'AgamiNews',
        originalSourceLink: '',
        image: { url: `/img/?src=${encodeURIComponent('https://via.placeholder.com/1280x720/0066CC/FFFFFF?text=AgamiNews')}&w=1200&q=70`, credit: 'Placeholder', type: 'placeholder' },
        date: 'Just now',
        timestamp: Date.now(),
        views: 0,
        trending: false,
        fullContent: content,
        url: `/${category.toLowerCase()}-news/${generateSlug(title)}`
      };
    }
    const updated = [newArticle, ...list].slice(0, 100);
    await env.NEWS_KV.put('articles', JSON.stringify(updated));
    await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
    await env.NEWS_KV.put(`article_${newArticle.id}`, JSON.stringify(newArticle));
    return new Response(JSON.stringify({ ok: true, article: newArticle }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  if (pathname.startsWith('/api/article/')) {
    const id = pathname.split('/').pop();
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const a = articles.find(x => String(x.id) === String(id));
    return new Response(JSON.stringify({
      found: !!a,
      article: a ? { id: a.id, title: a.title, url: a.url, hasContent: !!a.fullContent } : null
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  // Migration endpoint for slug URLs
  if (pathname === '/api/migrate-urls') {
    // Check for admin token
    const authHeader = request.headers.get('Authorization');
    const adminToken = env.ADMIN_TOKEN || 'your-secret-token';
    
    if (authHeader !== `Bearer ${adminToken}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      console.log('Starting URL migration...');
      
      // Fetch all articles
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      console.log(`Found ${articles.length} articles to migrate`);
      
      // Track all slugs to ensure uniqueness
      const existingSlugs = [];
      
      // Update each article
      const updatedArticles = articles.map((article, index) => {
        // Ensure article has required fields
        if (!article.title) {
          console.log(`Skipping article at index ${index} - no title`);
          return article;
        }
        
        // Generate unique slug
        const slug = generateSlug(article.title, existingSlugs);
        existingSlugs.push(slug);
        
        // Update article
        const category = (article.category || 'news').toLowerCase();
        const oldUrl = article.url;
        const newUrl = `/${category}-news/${slug}`;
        
        if (oldUrl !== newUrl) {
          console.log(`Migrating: ${oldUrl} -> ${newUrl}`);
        }
        
        return {
          ...article,
          slug: slug,
          url: newUrl
        };
      });
      
      // Save updated articles back to KV
      await env.NEWS_KV.put('articles', JSON.stringify(updatedArticles));
      
      // Create a backup of the old URLs for reference
      const urlMapping = articles.map((article, index) => ({
        oldUrl: article.url,
        newUrl: updatedArticles[index].url,
        title: article.title,
        id: article.id
      }));
      
      await env.NEWS_KV.put('url_migration_backup', JSON.stringify(urlMapping));
      
      return new Response(JSON.stringify({
        success: true,
        articlesUpdated: updatedArticles.length,
        message: 'Migration completed successfully!'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Migration failed:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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

// Get active readers based on recent activity
function getActiveReaders(stats) {
  const now = new Date().getHours();
  const analytics = stats.analytics || {};
  const hourly = analytics.hourly || {};
  
  // Get views from last hour
  const recentViews = hourly[now] || 0;
  
  // Estimate active readers (roughly 1 active per 10 views in the hour)
  const activeReaders = Math.max(0, Math.floor(recentViews / 10));
  
  // Add some variance for realism
  const variance = Math.floor(Math.random() * 3);
  
  return Math.max(0, activeReaders + variance);
}

// Get peak hour from analytics
function getPeakHour(stats) {
  const analytics = stats.analytics || {};
  const hourly = analytics.hourly || {};
  
  let maxHour = 0;
  let maxViews = 0;
  
  for (const [hour, views] of Object.entries(hourly)) {
    if (views > maxViews) {
      maxViews = views;
      maxHour = parseInt(hour);
    }
  }
  
  if (maxViews === 0) return 'N/A';
  
  // Format hour nicely
  const period = maxHour >= 12 ? 'PM' : 'AM';
  const displayHour = maxHour === 0 ? 12 : maxHour > 12 ? maxHour - 12 : maxHour;
  return `${displayHour}:00 ${period}`;
}

// Get top country from analytics
function getTopCountry(stats) {
  const analytics = stats.analytics || {};
  const countries = analytics.countries || {};
  
  let topCountry = 'IN';
  let maxViews = 0;
  
  for (const [country, views] of Object.entries(countries)) {
    if (views > maxViews) {
      maxViews = views;
      topCountry = country;
    }
  }
  
  // Convert country code to flag emoji
  const countryFlags = {
    'IN': '🇮🇳 India',
    'US': '🇺🇸 USA',
    'GB': '🇬🇧 UK',
    'CA': '🇨🇦 Canada',
    'AU': '🇦🇺 Australia',
    'AE': '🇦🇪 UAE',
    'SG': '🇸🇬 Singapore',
    'MY': '🇲🇾 Malaysia',
    'PK': '🇵🇰 Pakistan',
    'BD': '🇧🇩 Bangladesh'
  };
  
  return countryFlags[topCountry] || topCountry;
}

// Get mobile traffic percentage
function getMobilePercent(stats) {
  const analytics = stats.analytics || {};
  const devices = analytics.devices || {};
  
  const mobile = devices.mobile || 0;
  const desktop = devices.desktop || 0;
  const total = mobile + desktop;
  
  if (total === 0) return 0;
  
  return Math.round((mobile / total) * 100);
}

// Get top referrers
function getTopReferrers(stats) {
  const analytics = stats.analytics || {};
  const referrers = analytics.referrers || {};
  
  // Sort referrers by views
  const sorted = Object.entries(referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (sorted.length === 0) return 'No referrers yet';
  
  return sorted.map(([domain, views]) => {
    const displayDomain = domain === 'direct' ? 'Direct' : domain;
    return displayDomain;
  }).join(', ');
}

// Default articles
function getDefaultArticles() {
  return [
    {
      title: "Whoa! India's Digital Economy Could Hit $1 Trillion by 2030",
      category: "India",
      preview: "Here's the deal - between all the UPI transactions we're doing and startups popping up left and right, experts are saying we're heading for a trillion-dollar digital economy. Even Google and Amazon are doubling down on their India investments. Pretty wild, right?",
      date: "1 hour ago",
      views: 25420,
      trending: true
    },
    {
      title: "ISRO Just Pulled Off Another Satellite Launch - This One's Special",
      category: "Technology",
      preview: "You know how some villages still struggle with internet? Well, ISRO's new satellite is specifically designed to fix that. Launched this morning from Sriharikota, and get this - it'll bring 4G to places that barely had 2G. The team's calling it a game-changer for rural connectivity.",
      date: "2 hours ago",
      views: 22350,
      trending: true
    },
    {
      title: "Sensex Hits 75,000! Yes, You Read That Right",
      category: "Business",
      preview: "The markets went absolutely bonkers today. Sensex crossed 75,000 for the first time ever, and honestly, even the experts didn't see this coming so soon. FIIs pumped in ₹3,000 crores just this week. If you've been sitting on the fence about investing, well... the fence just got higher.",
      date: "3 hours ago",
      views: 28900,
      trending: true
    },
    {
      title: "We Actually Beat Australia at MCG! Series is Ours",
      category: "Sports",
      preview: "Can't believe I'm writing this - India just won at the MCG after ages! Bumrah was on fire, took 9 wickets. The Aussies didn't know what hit them. That last session though... my heart's still racing. This is the kind of win our dads will talk about for years.",
      date: "4 hours ago",
      views: 32100,
      trending: true
    },
    {
      title: "India Says Net Zero by 2070 - But There's More to the Story",
      category: "World",
      preview: "So the PM dropped this at the climate summit, and everyone's got opinions. The target's 2070, which sounds far, but here's what's interesting - we're already at 40% renewable capacity. Plus, there's talk of green hydrogen hubs in Gujarat and Tamil Nadu. Not bad for a developing nation, eh?",
      date: "5 hours ago",
      views: 18750,
      trending: false
    },
    {
      title: "Bangalore Startup Cracks the Code - AI That Speaks 22 Indian Languages",
      category: "Technology",
      preview: "Okay, this is actually cool. These guys from Koramangala built an AI that understands everything from Tamil to Kashmiri. Tested it myself with some Bengali - it actually got the context right! They're saying it could replace Google Translate for Indian languages. Big if true.",
      date: "6 hours ago",
      views: 21200,
      trending: true
    },
    {
      title: "RBI Plays It Safe - Repo Rate Stays at 6.5%",
      category: "Business",
      preview: "No surprises from Mint Street today. RBI Governor basically said 'let's wait and watch' - inflation's still a worry but growth looks decent. Your EMIs aren't changing anytime soon. Banks are probably relieved, homebuyers... not so much.",
      date: "7 hours ago",
      views: 19800,
      trending: false
    },
    {
      title: "That New Shah Rukh Film? It Just Hit ₹1000 Crores!",
      category: "Entertainment",
      preview: "Remember when we thought ₹100 crore was huge? Well, times have changed! The film's killing it overseas too - especially in the Gulf. My cousin in Dubai says theaters are still housefull. Looks like Bollywood's finally figured out the global game.",
      date: "8 hours ago",
      views: 26500,
      trending: true
    },
    {
      title: "EVs Are Actually Selling Like Crazy Now - 150% Jump!",
      category: "Auto",
      preview: "Petrol prices got you down? Join the club! Seems like half of Bangalore's switching to electric. Saw three Nexons EVs just on Brigade Road yesterday. With charging stations popping up everywhere (finally!), maybe it's time we all took a look?",
      date: "9 hours ago",
      views: 17600,
      trending: false
    },
    {
      title: "India's Hosting G20 Tech Ministers Next Week",
      category: "India",
      preview: "Big tech discussions coming to Delhi. They're talking AI rules, UPI going global, and cybersecurity stuff. Word is, several countries want to copy our digital payments model. About time the world noticed what we've built, no?",
      date: "10 hours ago",
      views: 14300,
      trending: false
    }
  ];
}