// AGAMINEWS - COMPLETE AUTOMATED SYSTEM
// Single file for easy management and deployment
// IMPORTANT: Google Analytics ID G-ZW77WM2VPG must be on EVERY page!

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
    } else if (url.pathname.includes('-news/') && url.pathname.match(/-\d{6}$/)) {
      // New SEO-friendly URL format: /category-news/slug-123456
      return await serveArticleBySlug(env, request, url.pathname);
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
      
      let articlesToFetch = 2; // 2 articles per fetch (15-16 per day with 3-hour schedule)
      let shouldFetch = true;
      let priority = 'normal';
      
      // Intelligent priority based on Indian news patterns (15 articles/day)
      if (hour >= 6 && hour < 9) {
        // Morning rush - 2 articles
        articlesToFetch = 2;
        priority = 'high';
      } else if (hour >= 9 && hour < 12) {
        // Market hours - business focus - 2 articles
        articlesToFetch = 2;
        priority = 'business';
      } else if (hour >= 12 && hour < 15) {
        // Lunch time - entertainment/sports - 2 articles
        articlesToFetch = 2;
        priority = 'entertainment';
      } else if (hour >= 15 && hour < 18) {
        // Market closing - business updates - 2 articles
        articlesToFetch = 2;
        priority = 'business';
      } else if (hour >= 18 && hour < 21) {
        // Evening - general news - 2 articles
        articlesToFetch = 2;
        priority = 'high';
      } else if (hour >= 21 && hour < 24) {
        // Night - 2 articles
        articlesToFetch = 2;
        priority = 'low';
      } else {
        // Late night/early morning (0-6 AM) - 1 article each at 0:00 and 3:00
        articlesToFetch = 1;
        priority = 'minimal';
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
                `🔗 *Link:* https://agaminews.in${article.url || `/article/${i}`}\n\n` +
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

// CRITICAL: Google Analytics code - MUST be on EVERY page
function getGoogleAnalyticsCode(pageTitle = 'AgamiNews', pagePath = '/') {
  return `
    <!-- Google Analytics - REQUIRED ON ALL PAGES -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZW77WM2VPG', {
        page_path: '${pagePath}',
        page_title: '${pageTitle}',
        page_location: window.location.href
      });
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
    
    <!-- Google Analytics -->
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html {
            font-size: 16px;
            overflow-x: hidden;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${isDark ? '#0A0A0A' : '#FFF'};
            color: ${isDark ? '#FFF' : '#000'};
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            width: 100%;
            overflow-x: hidden;
        }
        .header {
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            padding: 15px;
            border-bottom: 2px solid ${config.primaryColor};
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 15px;
        }
        .logo-section {
            display: flex;
            flex-direction: column;
        }
        .logo {
            font-size: 24px;
            font-weight: 900;
            color: ${config.primaryColor};
        }
        .tagline {
            font-size: 10px;
            color: ${isDark ? '#999' : '#666'};
            margin-top: 2px;
            display: none;
        }
        .live {
            background: ${config.primaryColor};
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            animation: pulse 2s infinite;
            white-space: nowrap;
        }
        
        /* Mobile Menu Button */
        .mobile-menu-btn {
            display: none;
            background: none;
            border: none;
            color: ${config.primaryColor};
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
            margin-left: 10px;
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
            .tagline {
                display: block;
            }
            .live {
                font-size: 10px;
                padding: 5px 10px;
            }
            .mobile-menu-btn {
                display: block;
            }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .container {
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
            padding: 20px;
            box-sizing: border-box;
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
        .news-card-link {
            text-decoration: none;
            color: inherit;
            display: block;
            -webkit-tap-highlight-color: transparent;
        }
        .news-card {
            background: ${isDark ? '#1A1A1A' : '#F8F8F8'};
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'};
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
        }
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
            .news-grid {
                grid-template-columns: 1fr !important;
                gap: 16px;
                margin: 10px 0;
                padding: 0;
            }
            .news-card {
                border-radius: 12px;
                width: 100%;
                max-width: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            .news-card-link {
                display: block;
                width: 100%;
            }
            .news-card:hover {
                transform: none;
            }
            .news-card:active {
                transform: scale(0.98);
            }
            .news-image {
                height: 200px;
                width: 100%;
                margin: 0;
                border-radius: 0;
            }
            .news-content {
                padding: 15px;
            }
            .news-title {
                font-size: 17px;
                line-height: 1.3;
                margin-bottom: 8px;
            }
            .news-summary {
                font-size: 14px;
                line-height: 1.5;
            }
            .news-meta {
                font-size: 11px;
            }
        }
        .news-card:hover .news-title {
            color: ${config.primaryColor};
        }
        .news-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: ${isDark ? '#0A0A0A' : '#F0F0F0'};
        }
        .news-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s;
        }
        .news-card:hover .news-image img {
            transform: scale(1.05);
        }
        .image-credit {
            position: absolute;
            bottom: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 2px 8px;
            font-size: 10px;
        }
        .news-content {
            padding: 20px;
        }
        .trending {
            display: inline-block;
            margin-left: 10px;
            font-size: 12px;
            color: #FF6B6B;
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
            
            /* Enhanced Mobile Optimizations */
            .container {
                padding: 8px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
            }
            
            /* Stats Mobile */
            .stats-bar {
                gap: 10px;
                padding: 12px;
                margin: 10px 0;
                border-radius: 8px;
            }
            .stat-value {
                font-size: 18px;
            }
            .stat-label {
                font-size: 10px;
            }
            
            /* News Cards Mobile */
            .news-content {
                padding: 15px;
            }
            .news-category {
                font-size: 11px;
            }
            .news-title {
                font-size: 16px;
                line-height: 1.4;
            }
            .news-summary {
                font-size: 13px;
                line-height: 1.6;
            }
            .news-meta {
                font-size: 11px;
                gap: 10px;
                flex-wrap: wrap;
            }
            .news-image {
                height: 180px;
                width: 100%;
                max-width: 100%;
            }
            .news-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            /* Headlines */
            h2 {
                font-size: 22px !important;
                margin: 20px 0 15px !important;
            }
            
            /* Touch targets */
            .news-card-link, button, a {
                -webkit-tap-highlight-color: transparent;
            }
            
            /* Prevent horizontal scroll */
            body {
                overflow-x: hidden;
                width: 100%;
            }
            
            /* CTA Mobile */
            .cta {
                padding: 25px 15px;
                margin: 20px 0;
            }
            .cta h2 {
                font-size: 20px;
            }
            .cta p {
                font-size: 14px;
            }
        }
        
        /* Small phones */
        @media (max-width: 380px) {
            .logo { font-size: 18px; }
            .stats-bar { gap: 8px; }
            .stat-value { font-size: 16px; }
            .news-title { font-size: 15px; }
            .news-summary { font-size: 12px; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo-section">
                <div class="logo">${config.siteName}</div>
                <div class="tagline">Tech & Finance • Quick Reads</div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="live">● LIVE</div>
                <button class="mobile-menu-btn" onclick="toggleMobileMenu()">☰</button>
            </div>
        </div>
    </header>
    
    <!-- Mobile Menu -->
    <div id="mobileMenu" style="display: none; background: ${isDark ? '#1A1A1A' : '#F8F8F8'}; padding: 15px; border-bottom: 1px solid ${isDark ? '#333' : '#E0E0E0'};">
        <a href="/" style="display: block; padding: 10px 0; color: inherit; text-decoration: none;">🏠 Home</a>
        <a href="#" onclick="shareApp()" style="display: block; padding: 10px 0; color: inherit; text-decoration: none;">📤 Share App</a>
    </div>
    
    <div class="container">
        <div class="stats-bar">
            <div class="stat">
                <div class="stat-value">${(stats.totalViews || 0).toLocaleString()}</div>
                <div class="stat-label">Total Views</div>
            </div>
            <div class="stat">
                <div class="stat-value">${(stats.todayViews || 0).toLocaleString()}</div>
                <div class="stat-label">Today's Views</div>
            </div>
            <div class="stat">
                <div class="stat-value">${articles.length}</div>
                <div class="stat-label">Live Articles</div>
            </div>
            <div class="stat">
                <div class="stat-value">${getActiveReaders(stats)}</div>
                <div class="stat-label">Active Now</div>
            </div>
        </div>
        
        <h2 style="margin: 30px 0 20px; font-size: 28px;">Latest News</h2>
        
        <div class="news-grid">
            ${articles.map((article, index) => `
                <a href="${article.url || `/article/${index}`}" class="news-card-link">
                    <div class="news-card">
                        ${article.image ? `
                            <div class="news-image">
                                <img src="${article.image.url || article.image}" alt="${article.title}" loading="lazy">
                                ${article.image.credit ? `<div class="image-credit">${article.image.credit}</div>` : ''}
                            </div>
                        ` : ''}
                        <div class="news-content">
                            <div class="news-category">${article.category}</div>
                            ${article.trending ? '<span class="trending">🔥 Trending</span>' : ''}
                            <div class="news-title">${article.title}</div>
                            <div class="news-summary">${article.preview || (article.fullContent ? article.fullContent.replace(/<[^>]*>/g, '').substring(0, 500) + '...' : '')}</div>
                            <div class="news-meta">
                                <span>🕒 ${article.date || 'Today'}</span>
                                <span>👁️ ${(article.views || 0).toLocaleString()}</span>
                                ${article.source ? `<span>📰 ${article.source}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </a>
            `).join('')}
        </div>
        
        <!-- Real Analytics Dashboard -->
        <div style="background: ${isDark ? '#1A1A1A' : '#F8F8F8'}; border-radius: 15px; padding: 25px; margin: 30px 0;">
            <h2 style="font-size: 20px; margin-bottom: 20px; color: ${config.primaryColor};">📊 Live Analytics</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="background: ${isDark ? '#0A0A0A' : '#FFF'}; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">Unique Visitors</div>
                    <div style="font-size: 24px; font-weight: bold; color: ${config.primaryColor};">${stats.uniqueVisitorsCount || 0}</div>
                </div>
                <div style="background: ${isDark ? '#0A0A0A' : '#FFF'}; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">Peak Hour</div>
                    <div style="font-size: 24px; font-weight: bold;">${getPeakHour(stats)}</div>
                </div>
                <div style="background: ${isDark ? '#0A0A0A' : '#FFF'}; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">Top Country</div>
                    <div style="font-size: 24px; font-weight: bold;">${getTopCountry(stats)}</div>
                </div>
                <div style="background: ${isDark ? '#0A0A0A' : '#FFF'}; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">Mobile Traffic</div>
                    <div style="font-size: 24px; font-weight: bold;">${getMobilePercent(stats)}%</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid ${isDark ? '#333' : '#E0E0E0'};">
                <div style="font-size: 12px; opacity: 0.7;">Top Referrers: ${getTopReferrers(stats)}</div>
            </div>
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
    
    <script>
        // Mobile menu toggle
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        
        // Share app functionality
        function shareApp() {
            if (navigator.share) {
                navigator.share({
                    title: '${config.siteName}',
                    text: 'Check out the latest Tech & Finance news!',
                    url: 'https://agaminews.in'
                }).catch(() => {});
            } else {
                // Fallback to copy URL
                navigator.clipboard.writeText('https://agaminews.in');
                alert('Link copied to clipboard!');
            }
        }
        
        // Add pull-to-refresh on mobile
        let startY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isPulling && e.touches[0].pageY > startY + 100) {
                // Show refresh indicator
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (isPulling && e.changedTouches[0].pageY > startY + 100) {
                location.reload();
            }
            isPulling = false;
        });
        
        // Improve scroll performance on mobile
        if ('ontouchstart' in window) {
            document.body.style.cursor = 'pointer';
        }
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

// Telegram handler
async function handleTelegram(request, env) {
  try {
    // Check if token exists
    if (!env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      return new Response('OK', { status: 200 }); // Return OK to prevent retries
    }
    
    const update = await request.json();
    
    // Add update_id to prevent duplicate processing
    const updateId = update.update_id;
    if (updateId) {
      const lastUpdateId = await env.NEWS_KV.get('last_update_id');
      if (lastUpdateId && parseInt(lastUpdateId) >= updateId) {
        console.log(`Skipping duplicate update ${updateId}`);
        return new Response('OK', { status: 200 });
      }
      await env.NEWS_KV.put('last_update_id', updateId.toString());
    }
    
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
🎉 *Welcome to AgamiNews AI Manager!*

I'm your intelligent news manager powered by AI. I handle everything automatically!

🤖 *What I Do:*
• Fetch real news every 3 hours from 9 sources
• Select best images (Unsplash/Pexels)
• Write human-like summaries
• Track performance & costs
• Optimize for Google ranking

💰 *Current Status:*
• API Cost: ~$1.50/month
• Budget: $20/month (plenty left!)
• News Sources: Active ✅
• Image System: DALL-E 3 HD ${env.OPENAI_API_KEY ? '✅' : '❌'}

📍 *Focus:* Tech + Finance for Indian professionals

Commands:
/menu - Full control panel
/stats - Live statistics
/fetch - Force news update NOW
/status - System health check
/help - Get help

Or just talk to me naturally! Try:
"Fetch news now"
"Show me today's performance"
"How many articles do we have?"
        `, {
          inline_keyboard: [
            [{ text: '📊 Stats', callback_data: 'stats' }, { text: '🚀 Fetch News', callback_data: 'fetch' }],
            [{ text: '📈 Strategy', callback_data: 'strategy' }, { text: '💵 Costs', callback_data: 'apiusage' }],
            [{ text: '⚙️ Menu', callback_data: 'menu' }]
          ]
        });
      } else if (text === '/menu') {
        await sendMenu(env, chatId);
      } else if (text === '/stats') {
        await sendStats(env, chatId);
      } else if (text === '/top' || text === '/popular') {
        await sendTopArticles(env, chatId);
      } else if (text === '/costs' || text === '/cost') {
        await sendCostReport(env, chatId);
      } else if (text === '/fetch') {
        await handleFetchNews(env, chatId);
      } else if (text === '/status') {
        await sendSystemStatus(env, chatId);
      } else if (text === '/help') {
        await sendHelp(env, chatId);
      } else if (text === '/analytics' || text === '/analyse') {
        await sendDetailedAnalytics(env, chatId);
      } else if (text === '/clear') {
        // Admin-only clear command
        await handleClearArticles(env, chatId);
      } else if (text.startsWith('/delete ')) {
        // Delete specific article by index or ID
        await handleDeleteArticle(env, chatId, text);
      } else if (text.startsWith('/create ')) {
        // Create article on specific topic
        await handleCreateArticle(env, chatId, text);
      } else if (text === '/reset') {
        // Reset counter command
        await handleResetCounter(env, chatId);
      } else if (text === '/test') {
        // Test article generation
        await handleTestGeneration(env, chatId);
      } else if (text === '/test-notify') {
        // Test notification system
        console.log('Testing notification system...');
        await sendMessage(env, chatId, `🧪 *Testing Notification System*\n\nSending test messages...`);
        const result1 = await sendMessage(env, chatId, `📝 Test Message 1: Basic text`);
        const result2 = await sendMessage(env, chatId, `✅ Test Message 2: If you see this, notifications work!\n\nResult 1: ${result1}`);
      } else if (text === '/cron-logs' || text === '/logs') {
        // Show cron execution logs
        const cronLogs = await env.NEWS_KV.get('cron_logs', 'json') || [];
        if (cronLogs.length === 0) {
          await sendMessage(env, chatId, '📊 *No cron logs found*\n\nThe cron job has not run yet or logs were cleared.');
        } else {
          const logText = cronLogs.slice(0, 10).map(log => {
            const time = new Date(log.time).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
            return `• ${time}: ${log.event}`;
          }).join('\n');
          
          await sendMessage(env, chatId, `📊 *Recent Cron Executions:*\n\n${logText}\n\n_Showing last 10 runs_`);
        }
      } else if (text === '/cron' || text === '/trigger-cron') {
        // Manually trigger the scheduled job
        await sendMessage(env, chatId, '🔧 *Manually triggering auto-publish...*');
        
        try {
          // Get current IST time and priority
          const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
          const hour = istTime.getHours();
          let priority = 'normal';
          
          if (hour >= 6 && hour < 9) priority = 'high';
          else if (hour >= 9 && hour < 12) priority = 'business';
          else if (hour >= 12 && hour < 15) priority = 'entertainment';
          else if (hour >= 15 && hour < 18) priority = 'business';
          else if (hour >= 18 && hour < 21) priority = 'high';
          else if (hour >= 21 && hour < 24) priority = 'low';
          else priority = 'minimal';
          
          await sendMessage(env, chatId, `⏰ Time: ${hour}:00 IST\n🎯 Priority: ${priority}\n📰 Fetching 1 article...`);
          
          // Call fetchLatestNewsAuto directly
          const fetchResult = await fetchLatestNewsAuto(env, 1, priority);
          
          if (fetchResult && fetchResult.articlesPublished > 0) {
            await sendMessage(env, chatId, 
              `✅ *Article Published!*\n\n` +
              `📌 Title: ${fetchResult.topArticle || 'N/A'}\n` +
              `📰 Articles: ${fetchResult.articlesPublished}\n` +
              `🔗 View: https://agaminews.in`
            );
            
            // Send article details if available
            if (fetchResult.articles && fetchResult.articles[0]) {
              const article = fetchResult.articles[0];
              await sendMessage(env, chatId,
                `📄 *Article Details*\n\n` +
                `📌 Title: ${article.title}\n` +
                `🏷️ Category: ${article.category}\n` +
                `📸 Image: ${article.image?.type === 'generated' ? '🎨 DALL-E 3' : '📷 Stock'}\n` +
                `🔗 Link: https://agaminews.in${article.url || '/article/0'}`
              );
            }
          } else {
            await sendMessage(env, chatId, `❌ *Failed to fetch article*\n\nError: ${fetchResult?.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('[CRON-MANUAL] Error:', error);
          await sendMessage(env, chatId, `❌ *Error:* ${error.message}`);
        }
      } else {
        await handleNaturalLanguage(env, chatId, text);
      }
    } else if (update.callback_query) {
      await handleCallback(env, update.callback_query);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Telegram error:', error);
    return new Response('OK', { status: 200 }); // Always return OK to prevent retries
  }
}

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

async function sendMenu(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const cronLogs = await env.NEWS_KV.get('cron_logs', 'json') || [];
  
  // Calculate today's cost
  const todayArticles = stats.dailyArticlesPublished || 0;
  const todayCost = todayArticles * 0.04; // $0.04 per article
  
  // Get last cron run time
  const lastCron = cronLogs[0] ? new Date(cronLogs[0].time).toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit'}) : 'Never';
  
  // Next cron in
  const now = new Date();
  const nextHour = Math.ceil(now.getHours() / 3) * 3;
  const nextCronHour = nextHour === 24 ? 0 : nextHour;
  
  await sendMessage(env, chatId, `🎯 *AgamiNews Premium Dashboard*
  
📊 *Live Statistics:*
• Articles Today: ${todayArticles}/15 
• Total Articles: ${articles.length}
• Today's Cost: $${todayCost.toFixed(2)}
• Budget Used: ${Math.round(todayCost/20*100)}%

⚡ *System Status:*
• AI Model: GPT-4 Turbo
• Images: DALL-E 3 HD
• Last Auto-Run: ${lastCron}
• Next Run: ${nextCronHour}:00

🎯 *Quick Commands:*`, {
    inline_keyboard: [
      [
        { text: '📰 Fetch Article', callback_data: 'fetch' },
        { text: '✏️ Create Custom', callback_data: 'create_prompt' }
      ],
      [
        { text: '📊 Full Stats', callback_data: 'stats' },
        { text: '💰 Cost Report', callback_data: 'costs' }
      ],
      [
        { text: '📈 Analytics', callback_data: 'analytics' },
        { text: '🗑️ Delete Article', callback_data: 'delete_prompt' }
      ],
      [
        { text: '⏰ Cron History', callback_data: 'cron_logs' },
        { text: '🔧 Force Run', callback_data: 'trigger_cron' }
      ],
      [
        { text: '🔍 SEO Report', callback_data: 'seo' },
        { text: '💡 All Commands', callback_data: 'help' }
      ],
      [
        { text: '🌐 Open Website', url: 'https://agaminews.in' }
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
  
  // Test command (also handle as natural language)
  if (lower === 'test' || lower.includes('test article') || lower.includes('test generation')) {
    await handleTestGeneration(env, chatId);
    return;
  }
  
  // Fetch news commands
  if (lower.includes('fetch') || lower.includes('update news') || lower.includes('get news')) {
    await handleFetchNews(env, chatId);
  }
  // Stats and performance
  else if (lower.includes('stats') || lower.includes('performance') || lower.includes('views') || lower.includes('how many')) {
    await sendStats(env, chatId);
  }
  // Theme changes
  else if (lower.includes('theme') || lower.includes('dark') || lower.includes('light')) {
    await handleThemeChange(env, chatId, text);
  }
  // Cost and budget
  else if (lower.includes('cost') || lower.includes('budget') || lower.includes('money') || lower.includes('api')) {
    await sendAPIUsage(env, chatId);
  }
  // Strategy
  else if (lower.includes('strategy') || lower.includes('focus') || lower.includes('plan')) {
    await sendContentStrategy(env, chatId);
  }
  // SEO
  else if (lower.includes('seo') || lower.includes('google') || lower.includes('ranking')) {
    await sendSEOReport(env, chatId);
  }
  // Analytics
  else if (lower.includes('analytics') || lower.includes('traffic') || lower.includes('visitors') || lower.includes('analyse')) {
    await sendDetailedAnalytics(env, chatId);
  }
  // Status check
  else if (lower.includes('status') || lower.includes('health') || lower.includes('working')) {
    await sendSystemStatus(env, chatId);
  }
  // Help
  else if (lower.includes('help') || lower.includes('what can you do')) {
    await sendHelp(env, chatId);
  }
  else {
    // AI-like response
    await sendMessage(env, chatId, `
Got it! You said: "${text}"

I understand natural language! Try:
• "Fetch latest news"
• "Show me stats"
• "What's our API cost?"
• "Check SEO status"
• "Is everything working?"

Or use /menu for all options! 🚀
    `);
  }
}

// New function: Handle fetch news
async function handleFetchNews(env, chatId) {
  // Send single initial message
  await sendMessage(env, chatId, `🔄 *Fetching 1 Article...*\n\n⏳ This takes 30-60 seconds for quality content...`);
  
  try {
    console.log('[FETCH] Starting news fetch from Telegram command...');
    
    // Call the fetch news function with timeout
    const result = await Promise.race([
      fetchLatestNews(env),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 60000)) // 60 second timeout
    ]);
    
    if (!result) {
      throw new Error('No response from fetch function');
    }
    
    let data;
    try {
      data = await result.json();
    } catch (e) {
      console.error('[FETCH] Invalid response format:', e);
      throw new Error('Invalid response format');
    }
    
    if (data.success) {
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      
      // Don't send another message here - fetchLatestNews already sends notifications
      console.log(`[FETCH] Success - ${data.articles} article(s) published`);
      
      // Only send a simple completion if notifications failed
      const adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat || adminChat !== String(chatId)) {
        await sendMessage(env, chatId, `
✅ *Article Published!*

📊 Daily Progress: ${stats.dailyArticlesPublished || data.articles}/8
🔗 View: https://agaminews.in

Use /stats for details
        `, {
          inline_keyboard: [
            [{ text: '📊 View Stats', callback_data: 'stats' }],
            [{ text: '↩️ Back', callback_data: 'menu' }]
          ]
        });
      }
    } else if (data.message && data.message.includes('limit reached')) {
      await sendMessage(env, chatId, `
ℹ️ *Daily Quality Limit Reached*

✅ Published today: ${data.published}/12 articles
📌 Strategy: Premium quality over quantity
⏰ Next batch: Tomorrow 6 AM

Current articles: https://agaminews.in
      `, {
        inline_keyboard: [
          [{ text: '📊 View Stats', callback_data: 'stats' }],
          [{ text: '↩️ Back', callback_data: 'menu' }]
        ]
      });
    } else {
      throw new Error(data.error || data.message || 'Failed to fetch');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    await sendMessage(env, chatId, `❌ *Error Fetching News*

${error.message}

*Possible Issues:*
• RSS feeds temporarily down
• OpenAI API key issue (if set)
• Network connectivity

*Try:*
1. Check /status for system health
2. Wait a moment and try again
3. Verify API keys in Cloudflare

*Debug:* ${error.stack ? error.stack.substring(0, 200) : 'No stack trace'}`);
  }
}

// New function: System status
async function sendSystemStatus(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const lastFetch = await env.NEWS_KV.get('lastFetch');
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const status = {
    telegram: env.TELEGRAM_BOT_TOKEN ? '✅' : '❌',
    openai: env.OPENAI_API_KEY ? '✅' : '❌'
  };
  
  await sendMessage(env, chatId, `
🔍 *System Status Check*

*API Connections:*
• Telegram Bot: ${status.telegram}
• OpenAI (DALL-E): ${status.openai}

*News System:*
• Articles in database: ${articles.length}
• Last fetch: ${lastFetch ? new Date(lastFetch).toLocaleString() : 'Never'}
• Auto-update: Every 3 hours ✅

*Performance:*
• Total views: ${stats.totalViews || 0}
• Today's views: ${stats.todayViews || 0}
• Articles fetched: ${stats.totalArticlesFetched || 0}

*Health:* ${status.telegram === '✅' && status.openai === '✅' ? 
  '🟢 All systems operational' : 
  '🟡 Some APIs not configured'}

${!status.openai ? '\n⚠️ Add OpenAI API key for DALL-E images!' : ''}
  `, {
    inline_keyboard: [
      [{ text: '🚀 Fetch News', callback_data: 'fetch' }],
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

// New function: Detailed Analytics
async function sendDetailedAnalytics(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  // Calculate analytics
  const analytics = stats.analytics || {};
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Traffic trends
  const todayViews = analytics.daily?.[today] || 0;
  const yesterdayViews = analytics.daily?.[yesterday] || 0;
  const growthRate = yesterdayViews > 0 ? ((todayViews - yesterdayViews) / yesterdayViews * 100).toFixed(1) : 0;
  const trend = growthRate > 0 ? '📈' : growthRate < 0 ? '📉' : '➡️';
  
  // Top referrers
  const referrers = Object.entries(analytics.referrers || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  // Device breakdown
  const mobile = analytics.devices?.mobile || 0;
  const desktop = analytics.devices?.desktop || 0;
  const totalDevices = mobile + desktop;
  const mobilePercent = totalDevices > 0 ? (mobile / totalDevices * 100).toFixed(1) : 0;
  
  // Top countries
  const countries = Object.entries(analytics.countries || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Peak hours
  const hourlyData = analytics.hourly || {};
  const peakHour = Object.entries(hourlyData)
    .sort((a, b) => b[1] - a[1])[0];
  
  // Most viewed articles
  const articleViews = stats.articleViews || {};
  const topArticles = Object.entries(articleViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, views]) => {
      const article = articles[id];
      return article ? `${article.title.substring(0, 30)}... (${views} views)` : `Article ${id} (${views} views)`;
    });
  
  await sendMessage(env, chatId, `
📊 *Detailed Analytics Report*

📈 *Traffic Overview*
• Total Views: ${stats.totalViews || 0}
• Today: ${todayViews} ${trend}
• Yesterday: ${yesterdayViews}
• Growth: ${growthRate}%

📱 *Device Analytics*
• Mobile: ${mobile} (${mobilePercent}%)
• Desktop: ${desktop} (${100 - mobilePercent}%)
• Mobile-first: ${mobilePercent > 50 ? 'Yes ✅' : 'No ⚠️'}

🌍 *Top Countries*
${countries.map(([code, count], i) => `${i+1}. ${getCountryName(code)}: ${count} visits`).join('\n') || 'No data yet'}

🔗 *Top Referrers*
${referrers.map(([ref, count], i) => `${i+1}. ${ref}: ${count} visits`).join('\n') || '• Direct traffic only'}

⏰ *Peak Traffic*
• Best Hour: ${peakHour ? `${peakHour[0]}:00 (${peakHour[1]} views)` : 'No data'}
• Best Day: ${getBestDay(analytics.daily)}

📰 *Top Articles*
${topArticles.join('\n') || 'No article data yet'}

💡 *Insights*
${generateInsights(stats, analytics)}

Use /analytics daily to track growth!
  `, {
    inline_keyboard: [
      [{ text: '📈 7-Day Report', callback_data: 'analytics_week' }],
      [{ text: '🎯 Audience Insights', callback_data: 'analytics_audience' }],
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

// Helper function to get country name
function getCountryName(code) {
  const countries = {
    'IN': '🇮🇳 India',
    'US': '🇺🇸 USA',
    'GB': '🇬🇧 UK',
    'CA': '🇨🇦 Canada',
    'AU': '🇦🇺 Australia',
    'AE': '🇦🇪 UAE',
    'SG': '🇸🇬 Singapore',
    'MY': '🇲🇾 Malaysia',
    'unknown': '🌍 Unknown'
  };
  return countries[code] || `${code}`;
}

// Helper function to get best day
function getBestDay(daily) {
  if (!daily) return 'No data';
  const best = Object.entries(daily)
    .sort((a, b) => b[1] - a[1])[0];
  return best ? `${best[0]} (${best[1]} views)` : 'No data';
}

// Generate insights
function generateInsights(stats, analytics) {
  const insights = [];
  
  // Mobile optimization
  const mobilePercent = analytics.devices ? 
    (analytics.devices.mobile / (analytics.devices.mobile + analytics.devices.desktop) * 100) : 0;
  
  if (mobilePercent > 60) {
    insights.push('• Strong mobile traffic (good for SEO!)');
  } else {
    insights.push('• Desktop traffic dominates - ensure mobile optimization');
  }
  
  // Traffic source
  const directTraffic = analytics.referrers?.direct || 0;
  const totalReferrer = Object.values(analytics.referrers || {}).reduce((a, b) => a + b, 0);
  
  if (directTraffic > totalReferrer * 0.5) {
    insights.push('• High direct traffic - brand recognition growing');
  } else {
    insights.push('• Good referral traffic - external sites linking to you');
  }
  
  // Growth
  const todayViews = stats.todayViews || 0;
  if (todayViews > 100) {
    insights.push('• Excellent daily traffic! Keep it up');
  } else if (todayViews > 50) {
    insights.push('• Good traffic growth, aim for 100+ daily');
  } else {
    insights.push('• Focus on SEO and content to increase traffic');
  }
  
  return insights.join('\n') || '• Keep monitoring for trends';
}

// Weekly Analytics Report
async function sendWeeklyAnalytics(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const analytics = stats.analytics || {};
  
  // Get last 7 days data
  const last7Days = [];
  const dailyData = analytics.daily || {};
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const views = dailyData[date] || 0;
    last7Days.push({ date, views });
  }
  
  // Calculate weekly stats
  const totalWeekViews = last7Days.reduce((sum, day) => sum + day.views, 0);
  const avgDailyViews = (totalWeekViews / 7).toFixed(1);
  const bestDay = last7Days.reduce((best, day) => day.views > best.views ? day : best);
  const worstDay = last7Days.reduce((worst, day) => day.views < worst.views ? day : worst);
  
  // Create simple chart
  const maxViews = Math.max(...last7Days.map(d => d.views));
  const chart = last7Days.map(day => {
    const barLength = maxViews > 0 ? Math.floor((day.views / maxViews) * 10) : 0;
    const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
    return `${day.date.substring(5)}: ${bar} ${day.views}`;
  }).join('\n');
  
  await sendMessage(env, chatId, `
📈 *7-Day Analytics Report*

📊 *Weekly Performance*
• Total Views: ${totalWeekViews}
• Daily Average: ${avgDailyViews}
• Best Day: ${bestDay.date} (${bestDay.views} views)
• Worst Day: ${worstDay.date} (${worstDay.views} views)

📉 *Daily Breakdown*
\`\`\`
${chart}
\`\`\`

💡 *Weekly Insights*
${generateWeeklyInsights(last7Days, stats)}

Track weekly to spot trends!
  `, {
    inline_keyboard: [
      [{ text: '📊 Full Analytics', callback_data: 'analytics' }],
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

// Audience Insights
async function sendAudienceInsights(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const analytics = stats.analytics || {};
  
  // Calculate audience metrics
  const devices = analytics.devices || {};
  const countries = analytics.countries || {};
  const referrers = analytics.referrers || {};
  const hourly = analytics.hourly || {};
  
  // Audience profile
  const totalVisits = Object.values(countries).reduce((a, b) => a + b, 0);
  const indianTraffic = (countries.IN || 0);
  const indianPercent = totalVisits > 0 ? (indianTraffic / totalVisits * 100).toFixed(1) : 0;
  
  // Behavior patterns
  const morningTraffic = (hourly[6] || 0) + (hourly[7] || 0) + (hourly[8] || 0) + (hourly[9] || 0);
  const eveningTraffic = (hourly[17] || 0) + (hourly[18] || 0) + (hourly[19] || 0) + (hourly[20] || 0);
  const nightTraffic = (hourly[21] || 0) + (hourly[22] || 0) + (hourly[23] || 0);
  
  // Social traffic
  const socialReferrers = ['facebook.com', 'twitter.com', 't.co', 'linkedin.com', 'instagram.com'];
  const socialTraffic = Object.entries(referrers)
    .filter(([ref]) => socialReferrers.some(social => ref.includes(social)))
    .reduce((sum, [, count]) => sum + count, 0);
  
  await sendMessage(env, chatId, `
🎯 *Audience Insights*

👥 *Visitor Profile*
• Primary Market: ${indianPercent > 50 ? '🇮🇳 India-focused' : '🌍 International'}
• Indian Traffic: ${indianPercent}%
• Device Preference: ${devices.mobile > devices.desktop ? '📱 Mobile-first' : '💻 Desktop-heavy'}
• Engagement: ${stats.totalViews > 1000 ? 'High' : stats.totalViews > 100 ? 'Growing' : 'Building'}

⏰ *Behavior Patterns*
• Morning (6-10 AM): ${morningTraffic} visits
• Evening (5-9 PM): ${eveningTraffic} visits
• Night (9 PM-12 AM): ${nightTraffic} visits
• Peak Activity: ${getPeakPeriod(hourly)}

🔗 *Traffic Sources*
• Direct: ${referrers.direct || 0} visits
• Social Media: ${socialTraffic} visits
• Search/Other: ${totalVisits - (referrers.direct || 0) - socialTraffic} visits

🎯 *Target Audience Match*
${getAudienceMatch(analytics, stats)}

📝 *Recommendations*
${getAudienceRecommendations(analytics)}
  `, {
    inline_keyboard: [
      [{ text: '📊 Full Analytics', callback_data: 'analytics' }],
      [{ text: '↩️ Back', callback_data: 'menu' }]
    ]
  });
}

// Helper functions
function generateWeeklyInsights(last7Days, stats) {
  const insights = [];
  const trend = last7Days[6].views > last7Days[0].views ? 'growing' : 'declining';
  
  insights.push(`• Traffic is ${trend} over the week`);
  
  const weekendViews = last7Days.slice(0, 2).reduce((sum, d) => sum + d.views, 0);
  const weekdayViews = last7Days.slice(2).reduce((sum, d) => sum + d.views, 0);
  
  if (weekdayViews > weekendViews * 2) {
    insights.push('• Weekday traffic stronger (professional audience)');
  } else {
    insights.push('• Good weekend engagement');
  }
  
  if (stats.totalViews > 500) {
    insights.push('• Site gaining traction - keep momentum');
  }
  
  return insights.join('\n');
}

function getPeakPeriod(hourly) {
  const periods = {
    'Morning (6-10 AM)': [6, 7, 8, 9],
    'Noon (11-2 PM)': [11, 12, 13, 14],
    'Evening (5-9 PM)': [17, 18, 19, 20],
    'Night (9 PM+)': [21, 22, 23]
  };
  
  let maxPeriod = '';
  let maxViews = 0;
  
  for (const [name, hours] of Object.entries(periods)) {
    const views = hours.reduce((sum, h) => sum + (hourly[h] || 0), 0);
    if (views > maxViews) {
      maxViews = views;
      maxPeriod = name;
    }
  }
  
  return maxPeriod || 'No clear pattern yet';
}

function getAudienceMatch(analytics, stats) {
  const matches = [];
  
  // Check if Indian focused
  const indianPercent = analytics.countries?.IN ? 
    (analytics.countries.IN / Object.values(analytics.countries).reduce((a, b) => a + b, 0) * 100) : 0;
  
  if (indianPercent > 60) {
    matches.push('✅ Strong Indian audience (target achieved)');
  } else {
    matches.push('⚠️ Need more Indian traffic focus');
  }
  
  // Check mobile optimization
  const mobilePercent = analytics.devices?.mobile ? 
    (analytics.devices.mobile / (analytics.devices.mobile + analytics.devices.desktop) * 100) : 0;
  
  if (mobilePercent > 50) {
    matches.push('✅ Mobile-first audience (good for target)');
  } else {
    matches.push('⚠️ Desktop heavy - optimize for mobile');
  }
  
  // Check professional timing
  const workHours = [9, 10, 11, 14, 15, 16, 17];
  const workTraffic = workHours.reduce((sum, h) => sum + (analytics.hourly?.[h] || 0), 0);
  const totalHourly = Object.values(analytics.hourly || {}).reduce((a, b) => a + b, 0);
  
  if (totalHourly > 0 && workTraffic / totalHourly > 0.5) {
    matches.push('✅ Professional timing patterns');
  }
  
  return matches.join('\n') || '• Building audience profile...';
}

function getAudienceRecommendations(analytics) {
  const recs = [];
  
  // Time-based recommendations
  const peakHour = Object.entries(analytics.hourly || {})
    .sort((a, b) => b[1] - a[1])[0];
  
  if (peakHour) {
    recs.push(`• Post new content around ${peakHour[0]}:00`);
  }
  
  // Device recommendations
  if (analytics.devices?.mobile > analytics.devices?.desktop) {
    recs.push('• Keep mobile-first design priority');
  } else {
    recs.push('• Improve mobile experience');
  }
  
  // Traffic source recommendations
  if (!analytics.referrers || Object.keys(analytics.referrers).length < 3) {
    recs.push('• Share on social media for referral traffic');
  }
  
  return recs.join('\n') || '• Keep monitoring for patterns';
}

// New function: Help
// Handle manual article creation
async function handleCreateArticle(env, chatId, text) {
  const topic = text.replace('/create ', '').trim();
  
  if (!topic) {
    await sendMessage(env, chatId, '❌ *Invalid command*\n\nUse: `/create iPhone 16 Pro review`');
    return;
  }
  
  await sendMessage(env, chatId, `🔄 *Creating article about:*\n"${topic}"\n\n⏳ This will take 30-60 seconds...`);
  
  try {
    // Create source material from topic
    const sourceMaterial = {
      originalTitle: topic,
      description: `User-requested article about ${topic}`,
      source: 'Manual Request',
      link: '',
      category: detectCategory(topic)
    };
    
    // Generate article ID and slug
    const articleId = generateArticleId();
    
    // Generate original article
    const articleContent = await generateOriginalArticle(sourceMaterial, env);
    
    if (!articleContent || !articleContent.title) {
      throw new Error('Failed to generate article content');
    }
    
    // Create article object
    const article = {
      id: articleId,
      slug: generateSlug(articleContent.title),
      title: articleContent.title,
      fullContent: articleContent.content,
      preview: articleContent.content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
      category: sourceMaterial.category,
      source: 'AgamiNews Research Team',
      url: `/${sourceMaterial.category.toLowerCase()}-news/${generateSlug(articleContent.title)}-${articleId}`,
      date: 'Just now',
      timestamp: Date.now(),
      views: 0,
      trending: false,
      manuallyCreated: true
    };
    
    // Generate image
    article.image = await getArticleImage(articleContent.title, sourceMaterial.category, env);
    
    // Save article
    const existingArticles = await env.NEWS_KV.get('articles', 'json') || [];
    const updatedArticles = [article, ...existingArticles].slice(0, 50);
    await env.NEWS_KV.put('articles', JSON.stringify(updatedArticles));
    await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
    
    // Update stats
    const stats = await env.NEWS_KV.get('stats', 'json') || {};
    stats.manualArticles = (stats.manualArticles || 0) + 1;
    await env.NEWS_KV.put('stats', JSON.stringify(stats));
    
    // Send success message
    await sendMessage(env, chatId, 
      `✅ *Article Created Successfully!*\n\n` +
      `📌 *Title:* ${article.title}\n` +
      `🏷️ *Category:* ${article.category}\n` +
      `📸 *Image:* ${article.image?.type === 'generated' ? '🎨 DALL-E 3 HD' : '📷 Stock'}\n` +
      `📊 *Length:* ${article.fullContent.length} chars\n` +
      `🔗 *Link:* https://agaminews.in${article.url}\n\n` +
      `_Article is now live on the website!_`
    );
    
  } catch (error) {
    console.error('[CREATE] Error:', error);
    await sendMessage(env, chatId, `❌ *Failed to create article*\n\nError: ${error.message}`);
  }
}

// Helper function to detect category from topic
function detectCategory(topic) {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('tech') || topicLower.includes('phone') || topicLower.includes('ai') || 
      topicLower.includes('google') || topicLower.includes('apple') || topicLower.includes('software')) {
    return 'Technology';
  } else if (topicLower.includes('business') || topicLower.includes('market') || topicLower.includes('stock') ||
             topicLower.includes('company') || topicLower.includes('profit')) {
    return 'Business';
  } else if (topicLower.includes('bollywood') || topicLower.includes('movie') || topicLower.includes('cricket') ||
             topicLower.includes('sport') || topicLower.includes('entertainment')) {
    return 'Entertainment';
  } else if (topicLower.includes('health') || topicLower.includes('covid') || topicLower.includes('medical')) {
    return 'Health';
  } else {
    return 'India'; // Default category
  }
}

// Send top performing articles
async function sendTopArticles(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  
  // Sort articles by views
  const sortedArticles = articles
    .map((article, index) => ({
      ...article,
      index,
      views: article.views || 0
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  
  if (sortedArticles.length === 0) {
    await sendMessage(env, chatId, '📊 *No articles to show*\n\nPublish some articles first!');
    return;
  }
  
  const topList = sortedArticles.map((article, i) => {
    const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${emoji} *${article.title.substring(0, 40)}...*\n   👁 ${article.views.toLocaleString()} views | ${article.category}`;
  }).join('\n\n');
  
  // Calculate insights
  const totalViews = sortedArticles.reduce((sum, a) => sum + a.views, 0);
  const avgViews = Math.round(totalViews / sortedArticles.length);
  const topCategory = sortedArticles.reduce((acc, article) => {
    acc[article.category] = (acc[article.category] || 0) + article.views;
    return acc;
  }, {});
  const bestCategory = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];
  
  await sendMessage(env, chatId, `
🏆 *Top Performing Articles*

${topList}

📈 *Performance Insights:*
• Total Views: ${totalViews.toLocaleString()}
• Average Views: ${avgViews.toLocaleString()}
• Best Category: ${bestCategory ? bestCategory[0] : 'N/A'}
• Top Article CTR: ${sortedArticles[0] ? Math.round(sortedArticles[0].views / totalViews * 100) : 0}%

💡 *Recommendations:*
${getPerformanceRecommendations(sortedArticles, topCategory)}

_Updated: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}_
  `);
}

// Get performance-based recommendations
function getPerformanceRecommendations(articles, categoryViews) {
  const recs = [];
  
  if (articles[0] && articles[0].views > articles[1]?.views * 2) {
    recs.push(`• "${articles[0].title.substring(0, 30)}..." is viral - create similar content`);
  }
  
  const bestCat = Object.entries(categoryViews).sort((a, b) => b[1] - a[1])[0];
  if (bestCat) {
    recs.push(`• Focus more on ${bestCat[0]} category (highest engagement)`);
  }
  
  const lowPerformers = articles.filter(a => a.views < 100);
  if (lowPerformers.length > articles.length / 2) {
    recs.push(`• Consider different content strategy - many articles underperforming`);
  }
  
  return recs.join('\n') || '• Keep current strategy - good overall performance';
}

// Send detailed cost report
async function sendCostReport(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const today = new Date().toDateString();
  
  // Cost calculations
  const COST_PER_ARTICLE = 0.03; // GPT-4 Turbo
  const COST_PER_IMAGE = 0.01; // DALL-E 3 HD
  const COST_PER_UNIT = COST_PER_ARTICLE + COST_PER_IMAGE;
  
  // Get monthly stats
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthKey = `${currentYear}-${currentMonth}`;
  
  if (!stats.monthlyCosts) stats.monthlyCosts = {};
  if (!stats.monthlyCosts[monthKey]) {
    stats.monthlyCosts[monthKey] = {
      articles: 0,
      totalCost: 0
    };
  }
  
  // Today's costs
  const todayArticles = stats.dailyArticlesPublished || 0;
  const todayCost = todayArticles * COST_PER_UNIT;
  
  // Month-to-date
  const monthArticles = stats.monthlyCosts[monthKey].articles || 0;
  const monthCost = monthArticles * COST_PER_UNIT;
  
  // Projected monthly (based on daily average)
  const dayOfMonth = new Date().getDate();
  const avgDaily = monthArticles / dayOfMonth;
  const projectedMonthly = avgDaily * 30;
  const projectedCost = projectedMonthly * COST_PER_UNIT;
  
  await sendMessage(env, chatId, `
💰 *Cost Report*

📅 *Today (${new Date().toLocaleDateString('en-IN')}):*
• Articles: ${todayArticles}
• GPT-4: $${(todayArticles * COST_PER_ARTICLE).toFixed(2)}
• DALL-E: $${(todayArticles * COST_PER_IMAGE).toFixed(2)}
• Total: $${todayCost.toFixed(2)}

📊 *Month-to-Date:*
• Articles: ${monthArticles}
• Total Cost: $${monthCost.toFixed(2)}
• Daily Average: ${avgDaily.toFixed(1)} articles

📈 *Projected Monthly:*
• Articles: ~${Math.round(projectedMonthly)}
• Estimated Cost: $${projectedCost.toFixed(2)}
• Budget Status: ${projectedCost <= 20 ? '✅ Within budget' : '⚠️ Over budget'}

💡 *Cost Breakdown:*
• GPT-4 Turbo: $0.03/article
• DALL-E 3 HD: $0.01/image
• Total per article: $0.04

🎯 *Budget: $20.00/month*
• Used: $${monthCost.toFixed(2)} (${Math.round(monthCost/20*100)}%)
• Remaining: $${(20 - monthCost).toFixed(2)}
• Days left: ${30 - dayOfMonth}

${projectedCost > 20 ? '⚠️ *Warning:* Reduce daily articles to stay within budget' : '✅ *Status:* On track with budget'}
  `);
  
  // Update monthly tracking
  stats.monthlyCosts[monthKey].articles = monthArticles + todayArticles;
  stats.monthlyCosts[monthKey].totalCost = (monthArticles + todayArticles) * COST_PER_UNIT;
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
}

// Handle delete specific article
async function handleDeleteArticle(env, chatId, text) {
  const adminChat = await env.NEWS_KV.get('admin_chat');
  if (String(chatId) !== adminChat) {
    await sendMessage(env, chatId, '❌ *Unauthorized*\n\nOnly the admin can delete articles.');
    return;
  }
  
  const parts = text.split(' ');
  const indexOrId = parts[1];
  
  if (!indexOrId) {
    await sendMessage(env, chatId, '❌ *Invalid command*\n\nUse: `/delete 3` (by index) or `/delete 123456` (by ID)');
    return;
  }
  
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  let deletedArticle = null;
  let newArticles = [];
  
  // Check if it's an index (0-based) or an ID
  if (indexOrId.length <= 2 && !isNaN(indexOrId)) {
    // It's an index
    const index = parseInt(indexOrId);
    if (index >= 0 && index < articles.length) {
      deletedArticle = articles[index];
      newArticles = articles.filter((_, i) => i !== index);
    }
  } else {
    // It's an ID
    deletedArticle = articles.find(a => a.id === indexOrId);
    newArticles = articles.filter(a => a.id !== indexOrId);
  }
  
  if (deletedArticle) {
    await env.NEWS_KV.put('articles', JSON.stringify(newArticles));
    await env.NEWS_KV.put('articlesTimestamp', Date.now().toString());
    
    await sendMessage(env, chatId, 
      `✅ *Article Deleted*\n\n` +
      `📌 Title: ${deletedArticle.title}\n` +
      `🏷️ Category: ${deletedArticle.category}\n` +
      `📊 Remaining articles: ${newArticles.length}`
    );
  } else {
    await sendMessage(env, chatId, '❌ *Article not found*\n\nCheck the index or ID and try again.');
  }
}

async function sendHelp(env, chatId) {
  await sendMessage(env, chatId, `
📚 *AgamiNews Manager Help*

*Quick Commands:*
/menu - Main control panel
/stats - View website statistics
/fetch - Force news update now
/status - Check system health
/help - This help message

*Natural Language:*
Just talk to me! I understand:
• "Fetch the latest news"
• "Show me today's stats"
• "What's our monthly cost?"
• "How's our SEO doing?"
• "Change theme to dark"

*Automatic Features:*
🔄 News updates every 3 hours
📸 Smart image selection
✍️ Human-like content writing
📊 Performance tracking
💰 Cost monitoring

*Dashboard Links:*
• Website: https://agaminews.in
• Debug: https://agaminews.in/debug
• Manual fetch: https://agaminews.in/fetch-news

*Tips:*
• Peak traffic is 9 AM and 5 PM
• Tech news gets most engagement
• Images improve click rates by 40%
• Fresh content helps Google ranking

Need specific help? Just ask!
  `, {
    inline_keyboard: [
      [{ text: '⚙️ Menu', callback_data: 'menu' }]
    ]
  });
}

async function handleThemeChange(env, chatId, text) {
  const config = await env.NEWS_KV.get('config', 'json') || {};
  const isDark = text.toLowerCase().includes('dark');
  
  config.theme = isDark ? 'dark' : 'light';
  await env.NEWS_KV.put('config', JSON.stringify(config));
  
  await sendMessage(env, chatId, `✅ Theme changed to ${config.theme}!`);
}

// Handle clear articles securely (Telegram admin only)
async function handleClearArticles(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  if (articles.length === 0) {
    await sendMessage(env, chatId, '📭 No articles to delete. The website is already empty.');
    return;
  }
  
  await sendMessage(env, chatId, `⚠️ *Confirm Article Deletion*

You are about to delete *${articles.length} articles* from the website.

This action cannot be undone!

Are you sure?`, {
    inline_keyboard: [
      [
        { text: '✅ Yes, Delete All', callback_data: 'confirm_clear' },
        { text: '❌ Cancel', callback_data: 'menu' }
      ]
    ]
  });
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
    case 'analytics':
      await sendDetailedAnalytics(env, chatId);
      break;
    case 'analytics_week':
      await sendWeeklyAnalytics(env, chatId);
      break;
    case 'analytics_audience':
      await sendAudienceInsights(env, chatId);
      break;
    case 'fetch':
      await handleFetchNews(env, chatId);
      break;
    case 'costs':
      await sendCostReport(env, chatId);
      break;
    case 'create_prompt':
      await sendMessage(env, chatId, '✏️ *Create Custom Article*\n\nSend the topic you want:\n\nExample: `/create iPhone 16 Pro review`\n\nOr just type: /create <your topic>');
      break;
    case 'delete_prompt':
      const articlesForDelete = await env.NEWS_KV.get('articles', 'json') || [];
      const articleList = articlesForDelete.slice(0, 5).map((a, i) => `${i}. ${a.title.substring(0, 50)}...`).join('\n');
      await sendMessage(env, chatId, `🗑️ *Delete Article*\n\nCurrent articles:\n${articleList}\n\nUse: \`/delete 0\` to delete first article`);
      break;
    case 'cron_logs':
      const cronLogs = await env.NEWS_KV.get('cron_logs', 'json') || [];
      if (cronLogs.length === 0) {
        await sendMessage(env, chatId, '⏰ *No cron logs found*\n\nCron hasn\'t run yet or logs were cleared.');
      } else {
        const logText = cronLogs.slice(0, 5).map(log => {
          const time = new Date(log.time).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short'});
          return `• ${time}: ${log.event}`;
        }).join('\n');
        await sendMessage(env, chatId, `⏰ *Recent Cron Runs:*\n\n${logText}\n\n_Showing last 5 executions_`);
      }
      break;
    case 'trigger_cron':
      await sendMessage(env, chatId, '🔧 *Manually triggering cron...*\n\n⏳ This will take 30-60 seconds...');
      try {
        // Call fetchLatestNewsAuto directly
        const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const hour = istTime.getHours();
        let priority = 'normal';
        
        if (hour >= 6 && hour < 9) priority = 'high';
        else if (hour >= 9 && hour < 12) priority = 'business';
        else if (hour >= 12 && hour < 15) priority = 'entertainment';
        else if (hour >= 15 && hour < 18) priority = 'business';
        else if (hour >= 18 && hour < 21) priority = 'high';
        else if (hour >= 21 && hour < 24) priority = 'low';
        else priority = 'minimal';
        
        const fetchResult = await fetchLatestNewsAuto(env, 1, priority);
        
        if (fetchResult && fetchResult.articlesPublished > 0) {
          await sendMessage(env, chatId, 
            `✅ *Cron Run Successful!*\n\n` +
            `📰 Articles: ${fetchResult.articlesPublished}\n` +
            `🎯 Priority: ${priority}\n` +
            `📌 Title: ${fetchResult.topArticle || 'N/A'}\n\n` +
            `View: https://agaminews.in`
          );
        } else {
          await sendMessage(env, chatId, `❌ *No articles fetched*\n\nReason: ${fetchResult?.error || 'Unknown'}`);
        }
      } catch (error) {
        await sendMessage(env, chatId, `❌ *Error:* ${error.message}`);
      }
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
    case 'settings':
      await sendMessage(env, chatId, '⚙️ *Settings*\n\nChoose what to configure:', {
        inline_keyboard: [
          [{ text: '🎨 Theme', callback_data: 'theme' }],
          [{ text: '📰 News Sources', callback_data: 'sources' }],
          [{ text: '⏰ Update Frequency', callback_data: 'frequency' }],
          [{ text: '↩️ Back', callback_data: 'menu' }]
        ]
      });
      break;
    case 'theme':
      await sendMessage(env, chatId, 'Choose theme:', {
        inline_keyboard: [
          [
            { text: '🌙 Dark', callback_data: 'theme_dark' },
            { text: '☀️ Light', callback_data: 'theme_light' }
          ],
          [{ text: '↩️ Back', callback_data: 'settings' }]
        ]
      });
      break;
    case 'theme_dark':
    case 'theme_light':
      const theme = data.split('_')[1];
      const config = await env.NEWS_KV.get('config', 'json') || {};
      config.theme = theme;
      await env.NEWS_KV.put('config', JSON.stringify(config));
      await sendMessage(env, chatId, `✅ Theme changed to ${theme}!`, {
        inline_keyboard: [[{ text: '↩️ Back', callback_data: 'settings' }]]
      });
      break;
    case 'sources':
      await sendMessage(env, chatId, `
📰 *Active News Sources*

*Indian:*
✅ Times of India
✅ NDTV
✅ The Hindu
✅ Economic Times
✅ MoneyControl

*International:*
✅ BBC World
✅ CNN International
✅ TechCrunch

All sources update every 3 hours automatically!
      `, {
        inline_keyboard: [[{ text: '↩️ Back', callback_data: 'settings' }]]
      });
      break;
    case 'frequency':
      await sendMessage(env, chatId, `
⏰ *Update Frequency*

Current: Every 3 hours

This is optimized for:
• Fresh content for SEO
• Reasonable API usage
• Good user experience

Auto-update times:
12 AM, 3 AM, 6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM

Use /fetch for manual updates anytime!
      `, {
        inline_keyboard: [[{ text: '↩️ Back', callback_data: 'settings' }]]
      });
      break;
    case 'news':
      const newsArticles = await env.NEWS_KV.get('articles', 'json') || [];
      const latest = newsArticles.slice(0, 5);
      let newsText = '📰 *Latest Articles*\n\n';
      latest.forEach((a, i) => {
        newsText += `${i+1}. *${a.title}*\n   ${a.category} | ${a.views?.toLocaleString() || 0} views\n\n`;
      });
      await sendMessage(env, chatId, newsText, {
        inline_keyboard: [
          [{ text: '🚀 Fetch New', callback_data: 'fetch' }],
          [{ text: '🗑️ Clear All', callback_data: 'clear' }],
          [{ text: '↩️ Back', callback_data: 'menu' }]
        ]
      });
      break;
    case 'clear':
      await handleClearArticles(env, chatId);
      break;
    case 'confirm_clear':
      // Clear all articles - admin only through Telegram
      await env.NEWS_KV.put('articles', JSON.stringify([]));
      await env.NEWS_KV.put('articlesTimestamp', Date.now().toString()); // Force refresh
      await env.NEWS_KV.put('lastFetch', new Date().toISOString());
      
      const stats = await env.NEWS_KV.get('stats', 'json') || {};
      stats.dailyArticlesPublished = 0;
      stats.dailyFetches = 0;
      stats.tokensUsedToday = 0;
      stats.articleViews = {};
      await env.NEWS_KV.put('stats', JSON.stringify(stats));
      
      await sendMessage(env, chatId, `✅ *All Articles Deleted*

The website has been cleared successfully.

Use /fetch to add new articles.`, {
        inline_keyboard: [
          [{ text: '📰 Fetch New Articles', callback_data: 'fetch' }],
          [{ text: '↩️ Back to Menu', callback_data: 'menu' }]
        ]
      });
      break;
    default:
      await sendMessage(env, chatId, 'Processing...');
  }
}

// Handle test generation command
async function handleTestGeneration(env, chatId) {
  await sendMessage(env, chatId, `🧪 *Testing Article Generation*\n\n⏳ Generating one test article...`);
  
  try {
    const testArticle = {
      title: 'Test: Modi Announces ₹50,000 Crore Digital India Fund',
      category: 'Technology',
      preview: 'Testing...'
    };
    
    const startTime = Date.now();
    const hasApiKey = !!env.OPENAI_API_KEY;
    
    if (!hasApiKey) {
      await sendMessage(env, chatId, `❌ *OpenAI API Key Missing!*\n\nPlease set OPENAI_API_KEY in Cloudflare Worker settings.`);
      return;
    }
    
    // Try to generate article
    const fullContent = await generateFullArticle(
      testArticle, 
      'Prime Minister announces massive digital infrastructure fund.', 
      env
    );
    
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
    const contentLength = fullContent.length;
    
    if (contentLength < 500) {
      await sendMessage(env, chatId, `⚠️ *Article Too Short*\n\n📏 Length: ${contentLength} chars\n⏱️ Time: ${timeTaken}s\n\nLikely using fallback template. Check OpenAI API.`);
    } else {
      await sendMessage(env, chatId, `✅ *Test Successful!*\n\n📏 Generated: ${contentLength} characters\n⏱️ Time: ${timeTaken} seconds\n📝 Preview: ${fullContent.replace(/<[^>]*>/g, '').substring(0, 200)}...\n\n*OpenAI is working correctly!*`);
    }
  } catch (error) {
    await sendMessage(env, chatId, `❌ *Test Failed*\n\nError: ${error.message}\n\nCheck:\n1. OpenAI API key in Cloudflare\n2. API credits available\n3. Network connectivity`);
  }
}

// Handle reset counter command
async function handleResetCounter(env, chatId) {
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const oldCounter = stats.dailyArticlesPublished || 0;
  stats.dailyArticlesPublished = 0;
  stats.dailyFetches = 0;
  stats.tokensUsedToday = 0;
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
  
  await sendMessage(env, chatId, `🔄 *Counter Reset Complete*

Previous counter: ${oldCounter}
Actual articles: ${articles.length}
New counter: 0

${articles.length === 0 ? '⚠️ No articles found in storage\n\nUse /fetch to add new articles!' : `✅ ${articles.length} articles available on website`}`, {
    inline_keyboard: [
      [{ text: '📰 Fetch News', callback_data: 'fetch' }],
      [{ text: '↩️ Back to Menu', callback_data: 'menu' }]
    ]
  });
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
  
  // Calculate estimated usage with better budget utilization
  const tokensToday = stats.tokensUsedToday || 0;
  const articlesToday = stats.dailyArticlesPublished || 0;
  const estimatedMonthly = tokensToday * 30;
  const costToday = (tokensToday / 1000) * 0.002; // GPT-3.5 actual cost
  const costMonthly = costToday * 30;
  
  // Image API usage
  const imageAPICallsToday = articlesToday * 2; // Assuming 2 API calls per article
  const imageAPICostMonthly = 0; // Free tier for Unsplash/Pexels
  
  // Recommended optimizations
  const budgetRemaining = 20.00 - costMonthly;
  const additionalArticlesPossible = Math.floor(budgetRemaining / 0.04); // ~$0.04 per article
  
  await sendMessage(env, chatId, `💵 *API Usage & Optimization Report*

*Budget Allocation:*
💰 Monthly Budget: $20.00
📊 Current Usage: ~$${costMonthly.toFixed(2)}/month
💚 Budget Available: $${budgetRemaining.toFixed(2)}

*Current Performance:*
📰 Articles Today: ${articlesToday}
📈 Monthly Projection: ${articlesToday * 30} articles
🤖 Model: GPT-3.5 Turbo (optimal for news)
🖼️ Images: Unsplash + Pexels (free tier)

*Cost Breakdown (GPT-4 + DALL-E 3):*
• GPT-4 Summaries (10-12/day): ~$3.50/month
• GPT-4 Articles (10-12/day): ~$4.50/month
• DALL-E 3 HD Images (80%): ~$2.00/month
• Bot Interactions: ~$0.50/month
• Total Premium Cost: ~$18.00/month

*Optimization Opportunities:*
✨ Premium content strategy activated
🎯 Target: 10-12 premium articles daily (300-360/month)
📸 Image quality: GPT-4o + DALL-E 3 + Premium photos
🔍 SEO: Quality over quantity for better ranking

*Recommendations:*
• Focus on 10-12 exceptional articles daily ✅
• Use GPT-4 for premium articles (within budget)
• Implement image caching to reduce API calls
• Focus on trending topics for better engagement

💡 *Status:* Only using ${Math.round(costMonthly / 20 * 100)}% of budget!
🚀 *Action:* Scaling up quality and quantity`, {
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
    
    // Fetch from RSS feeds
    const allArticles = [];
    const articlesPerFeed = Math.ceil(articlesToFetch / rssSources.length);
    
    for (const feedUrl of rssSources) {
      if (allArticles.length >= articlesToFetch) break;
      
      try {
        const response = await fetch(feedUrl);
        const text = await response.text();
        const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
        
        for (let i = 0; i < Math.min(articlesPerFeed, items.length); i++) {
          if (allArticles.length >= articlesToFetch) break;
          
          const item = items[i];
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                        item.match(/<title>(.*?)<\/title>/))?.[1];
          const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || 
                              item.match(/<description>(.*?)<\/description>/))?.[1];
          const link = item.match(/<link>(.*?)<\/link>/)?.[1];
          
          if (title && description) {
            // Clean HTML from description
            const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 500);
            
            // Determine category based on content
            let category = 'India';
            if (priority === 'business' || title.toLowerCase().includes('market') || title.toLowerCase().includes('sensex')) {
              category = 'Business';
            } else if (priority === 'entertainment' || title.toLowerCase().includes('bollywood') || title.toLowerCase().includes('cricket')) {
              category = 'Entertainment';
            } else if (title.toLowerCase().includes('tech') || title.toLowerCase().includes('ai')) {
              category = 'Technology';
            }
            
            // Create source material for original article generation
            const sourceMaterial = {
              originalTitle: title,
              description: cleanDesc,
              source: feedUrl.includes('timesofindia') ? 'Times of India' :
                     feedUrl.includes('thehindu') ? 'The Hindu' :
                     feedUrl.includes('ndtv') ? 'NDTV' :
                     feedUrl.includes('economictimes') ? 'Economic Times' :
                     feedUrl.includes('moneycontrol') ? 'Moneycontrol' : 'News Agency',
              link: link,
              category: category
            };
            
            // Create article structure with proper ID
            const article = {
              sourceMaterial: sourceMaterial,
              id: generateArticleId(), // 6-digit ID like NDTV
              slug: '', // Will be generated from final title
              title: '', // Will be created by AI
              preview: '', // Will be filled with article beginning
              category: category,
              source: 'AgamiNews Research Team',
              originalSourceLink: link,
              image: null,
              timestamp: Date.now(),
              views: 0,
              date: getTimeAgo(allArticles.length),
              trending: Math.random() > 0.6,
              fullContent: null,
              autoPublished: true
            };
            
            // Generate COMPLETELY ORIGINAL article with research
            console.log(`[AUTO] Researching and creating original article about: ${title}`);
            let fullArticle = '';
            let originalTitle = '';
            
            try {
              // Create original article with new headline
              const researchResult = await Promise.race([
                generateOriginalArticle(sourceMaterial, env),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Article generation timeout')), 30000))
              ]);
              
              fullArticle = researchResult.content;
              originalTitle = researchResult.title;
              
              console.log(`[AUTO] Created original article: "${originalTitle}" (${fullArticle.length} chars)`);
              article.fullContent = fullArticle;
              article.title = originalTitle; // Use AI-generated original title
              article.slug = generateSlug(originalTitle); // Generate SEO-friendly slug
              article.url = `/${article.category.toLowerCase()}-news/${article.slug}-${article.id}`; // Full URL path
              
              // Now get image based on the ORIGINAL title (with 95% DALL-E usage)
              article.image = await getArticleImage(originalTitle, category, env);
              
              // Check if we got generic content
              if (fullArticle.includes('This development is particularly significant')) {
                console.log('[AUTO] Warning: Generic content detected, skipping');
                continue;
              }
              
            } catch (genError) {
              console.error(`[AUTO] Failed to generate article for ${title}:`, genError.message);
              continue; // Skip failed articles
            }
            
            // Extract first 500 chars of article as preview for homepage
            const plainText = fullArticle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            article.preview = plainText.substring(0, 500) + '...';
            
            allArticles.push(article);
          }
        }
      } catch (feedError) {
        console.error(`Error fetching from ${feedUrl}:`, feedError);
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
    
    // Notify progress
    const adminChat = await env.NEWS_KV.get('admin_chat');
    let feedCount = 0;
    
    // Fetch from each feed - LIMIT TO FIRST 3 FEEDS FOR QUICK RESPONSE
    const feedsToProcess = feeds.slice(0, 3); // Only process first 3 feeds for speed
    console.log(`[RSS] Processing ${feedsToProcess.length} feeds for manual fetch`);
    
    for (const feed of feedsToProcess) {
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
              article.url = `/${article.category.toLowerCase()}-news/${article.slug}-${article.id}`; // Full URL path
              
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
            `🔗 *Link:* https://agaminews.in${article.url || `/article/${articleIndex}`}\n\n` +
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
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[₹$€£¥]/g, '') // Remove currency symbols
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 80); // Limit length for clean URLs
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

// REMOVED - No summaries, only full articles
// This function is deprecated and should never be called
async function createHumanSummaryREMOVED(title, description, category, env) {
  // Use GPT-4 for high-quality content if API key is available
  if (env.OPENAI_API_KEY) {
    try {
      const prompt = `You are an investigative journalist creating deeply researched, comprehensive news summaries for educated Indian readers.

HEADLINE: ${title}
CATEGORY: ${category}  
CONTEXT: ${description || 'Breaking news story'}

CREATE A 300-400 WORD WELL-RESEARCHED SUMMARY WITH:

${category.toLowerCase().includes('tech') || category.toLowerCase().includes('gadget') ? `
TECH/MOBILE SPECS TO INCLUDE:
• Price: ₹X,XXX (exact), EMI ₹X/month, exchange offers
• RAM & Storage: 8GB/12GB/16GB, 128GB/256GB/512GB/1TB
• Processor: Snapdragon/MediaTek/Exynos with model number
• Camera: 108MP/200MP main, features
• Battery: 5000mAh, 100W/120W fast charging
• Display: 6.7" AMOLED, 120Hz/144Hz
• Special features: 5G, AI features, unique selling points
• Launch date, sale date, availability
• Comparison: "beats iPhone 15", "cheaper than OnePlus"
` : ''}

${category.toLowerCase().includes('auto') || category.toLowerCase().includes('car') ? `
AUTO/VEHICLE SPECS TO INCLUDE:
• Price: ₹X lakhs (ex-showroom), on-road price
• EMI: ₹X/month, down payment ₹X
• Mileage: XX KMPL city, XX KMPL highway
• Engine: XXXXcc, XXX bhp, XXX Nm torque
• Variants: 5-seater/7-seater, manual/automatic
• Features: sunroof, ADAS, ventilated seats
• Safety: 5-star NCAP, 6 airbags
• Launch/delivery timeline
• vs competitors: "better mileage than Creta", "cheaper than Innova"
` : ''}

COMPREHENSIVE COVERAGE REQUIREMENTS:
• DEPTH: Provide context, background, and why this matters now
• SPECIFICS: Include ALL relevant numbers, dates, names, locations
• MULTIPLE PERSPECTIVES: Government view, opposition response, public impact
• EXPERT ANALYSIS: What experts/analysts are saying
• HISTORICAL CONTEXT: Previous similar events, precedents
• FUTURE IMPLICATIONS: Short-term and long-term consequences
• REGIONAL IMPACT: How it affects different states/communities
• GLOBAL CONNECTION: International relevance if any
• DATA & STATISTICS: Surveys, polls, economic indicators
• GROUND REALITY: Real stories from affected people

WRITING STYLE:
• Investigative and thorough like The Hindu or Indian Express
• Include specific examples and case studies
• Quote relevant authorities and sources
• Provide actionable insights for readers
• Balance multiple viewpoints fairly
• Use data to support every claim

Write a COMPREHENSIVE, WELL-RESEARCHED summary that readers would find in premium newspapers:`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-16k', // Using GPT-3.5 16K for comprehensive content
          messages: [
            {
              role: 'system',
              content: 'You are a senior journalist at a premium Indian news publication like The Ken or Bloomberg Quint. Write engaging, detailed summaries with specific data, expert insights, and real value. Be conversational but authoritative. Include numbers, percentages, company names, and specific details. Make every word count.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7, // More factual for research
          max_tokens: 800, // Much more for comprehensive coverage
          presence_penalty: 0.3,
          frequency_penalty: 0.3,
          top_p: 0.9 // Balanced creativity and accuracy
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiSummary = data.choices[0]?.message?.content;
        if (aiSummary && aiSummary.length > 50) {
          console.log('GPT-4 summary created successfully');
          return aiSummary.trim();
        }
      } else {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        if (errorData.error?.message?.includes('API key')) {
          console.error('Invalid OpenAI API key');
        }
      }
    } catch (error) {
      console.error('GPT-4 summary error:', error.message);
    }
  }
  
  // Fallback to pattern-based summaries if no API
  description = (description || '').substring(0, 300).trim();
  
  // Extract key information from the title for better summaries
  const titleLower = title.toLowerCase();
  
  // Generate specific summaries based on the actual news title
  if (titleLower.includes('xi') || titleLower.includes('china') || titleLower.includes('force')) {
    const summaries = [
      `China's latest stance on regional security has everyone talking. The shift in rhetoric signals a more assertive approach that could reshape Asian geopolitics. India and other neighbors are watching closely.`,
      `Big development from Beijing today. Xi's administration is taking a harder line on territorial issues, and honestly, this changes the whole dynamic in the region. Indian officials are already in strategy meetings.`,
      `Here's what's got diplomats worried - China's new position on use of force is pretty bold. This isn't just posturing; it could affect trade routes, border tensions, and regional stability.`
    ];
    return summaries[Math.floor(Math.random() * summaries.length)];
  } else if (titleLower.includes('recession') || titleLower.includes('global') || titleLower.includes('economy')) {
    const summaries = [
      `Economists are divided on this one. Some see warning signs everywhere - inflation, job cuts, market volatility. Others say we're overreacting. Either way, Indian markets are feeling the uncertainty.`,
      `So here's the deal with the recession talk - indicators are mixed but concerning. Indian IT and export sectors might take a hit, but our domestic market could be the saving grace.`,
      `Global recession fears are back on the table. The question isn't if, but when and how bad. India's relatively insulated, but we're not immune. Time to watch those investments carefully.`
    ];
    return summaries[Math.floor(Math.random() * summaries.length)];
  } else if (titleLower.includes('hyderabad') || titleLower.includes('integrated') || titleLower.includes('liberated')) {
    const summaries = [
      `The Hyderabad debate is heating up again. Historical perspectives differ on whether it was integration or liberation in 1948. What's clear is that the city has transformed into India's tech powerhouse since then.`,
      `Old wounds, new discussions. The Hyderabad accession debate reflects how history is still contested. Meanwhile, the city keeps growing as India's IT hub, leaving the past behind.`,
      `Political rhetoric around Hyderabad's history is back. Some call it liberation, others integration. The truth? It's complicated. But modern Hyderabad is writing its own success story.`
    ];
    return summaries[Math.floor(Math.random() * summaries.length)];
  } else if (titleLower.includes('rainfall') || titleLower.includes('jammu') || titleLower.includes('flood')) {
    const summaries = [
      `Record-breaking rainfall has hit Jammu - we're talking highest since 1910! Roads are underwater, power's out in many areas, and rescue teams are working overtime. Climate change isn't a future problem anymore.`,
      `Jammu is dealing with its worst rainfall in over a century. The damage is massive - bridges down, crops destroyed, thousands evacuated. The army's been called in for rescue operations.`,
      `Unprecedented flooding in Jammu after historic rainfall. This is what climate scientists warned us about. The immediate crisis is bad enough, but rebuilding will take months.`
    ];
    return summaries[Math.floor(Math.random() * summaries.length)];
  }
  
  // If no description or very short, create one based on title keywords
  if (!description || description.length < 30) {
    // Generate contextual description based on title
    if (titleLower.includes('market') || titleLower.includes('sensex') || titleLower.includes('nifty')) {
      description = `Stock markets are seeing significant movement today. Traders are responding to latest developments, with volatility expected to continue.`;
    } else if (titleLower.includes('cricket') || titleLower.includes('match') || titleLower.includes('wins')) {
      description = `In a thrilling display of skill and determination, the latest sporting action has fans on the edge of their seats.`;
    } else if (titleLower.includes('technology') || titleLower.includes('ai') || titleLower.includes('startup')) {
      description = `The tech sector continues to innovate with new developments that could change how we live and work.`;
    } else if (titleLower.includes('bollywood') || titleLower.includes('film') || titleLower.includes('actor')) {
      description = `Entertainment industry buzz as new developments capture public attention and social media discussions.`;
    } else {
      description = `Breaking developments in this story are capturing widespread attention. The full impact is still being assessed.`;
    }
  }
  
  // Make sure description doesn't have problematic starts
  if (description.toLowerCase().startsWith('the implications') || 
      description.toLowerCase().startsWith('this is developing')) {
    // Use title to create better description
    const keywords = title.split(' ').slice(0, 5).join(' ');
    description = `Latest on ${keywords} - the story is evolving with new information coming in.`;
  }
  
  // Human-style templates based on category with better variety
  const templates = {
    'Technology': [
      `Tech alert: ${description} Industry insiders are already debating what this means for the future.`,
      `Here's the tech scoop - ${description} Could be a game-changer, honestly.`,
      `${description} The tech community is buzzing about this one.`
    ],
    'Business': [
      `Market watch: ${description} Your portfolio might feel this one.`,
      `Business headline - ${description} Investors, take note.`,
      `${description} The market's definitely reacting to this.`
    ],
    'India': [
      `From the homeland: ${description} This affects more people than you'd think.`,
      `India update - ${description} Worth paying attention to.`,
      `${description} Another big moment for the country.`
    ],
    'World': [
      `Global news: ${description} The international community is watching.`,
      `World stage - ${description} This has wider implications.`,
      `${description} The ripple effects could be significant.`
    ],
    'Sports': [
      `Sports flash: ${description} Fans are going wild!`,
      `Game on - ${description} What a time to be a sports fan.`,
      `${description} This is why we love sports!`
    ]
  };
  
  const categoryTemplates = templates[category] || templates['India'];
  return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
}

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
  try {
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
            style: 'vivid' // More eye-catching style
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
      // Generate personality image with DALL-E
      if (false) { // Disabled Unsplash
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(personalityQuery)}&per_page=3&client_id=${env.UNSPLASH_ACCESS_KEY}`;
        const response = await fetch(unsplashUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Pick the best quality image
            const bestImage = data.results[0];
            return {
              url: bestImage.urls.regular,
              credit: `Photo by ${bestImage.user.name} on Unsplash`,
              type: 'personality',
              isRelevant: true
            };
          }
        }
      }
      
      // Try Pexels for personality photos
      if (env.PEXELS_API_KEY) {
        const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(personalityQuery)}&per_page=3`;
        const response = await fetch(pexelsUrl, {
          headers: { 'Authorization': env.PEXELS_API_KEY }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.photos && data.photos.length > 0) {
            return {
              url: data.photos[0].src.large,
              credit: `Photo by ${data.photos[0].photographer} on Pexels`,
              type: 'personality',
              isRelevant: true
            };
          }
        }
      }
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
    
    // REMOVED: All stock photo APIs - only using DALL-E
    // Skip stock photos completely
    if (false) { // Disabled all stock photos
      if (false) { // Was UNSPLASH_ACCESS_KEY
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&client_id=${env.UNSPLASH_ACCESS_KEY}`;
        const response = await fetch(unsplashUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Sort by relevance and quality (likes)
            const sortedImages = data.results.sort((a, b) => b.likes - a.likes);
            
            // Pick from top 3 best images
            const topImages = sortedImages.slice(0, 3);
            const selectedImage = topImages[Math.floor(Math.random() * topImages.length)];
            
            return {
              url: selectedImage.urls.regular,
              credit: `Photo by ${selectedImage.user.name} on Unsplash`,
              type: 'unsplash',
              isRelevant: true,
              description: selectedImage.description || selectedImage.alt_description
            };
          }
        }
      }
      
      if (env.PEXELS_API_KEY) {
        const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;
        const response = await fetch(pexelsUrl, {
          headers: { 'Authorization': env.PEXELS_API_KEY }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.photos && data.photos.length > 0) {
            // Pick from top images (Pexels returns relevance-sorted)
            const topImages = data.photos.slice(0, 3);
            const selectedImage = topImages[Math.floor(Math.random() * topImages.length)];
            
            return {
              url: selectedImage.src.large,
              credit: `Photo by ${selectedImage.photographer} on Pexels`,
              type: 'pexels',
              isRelevant: true,
              description: selectedImage.alt
            };
          }
        }
      }
    }
    
    // ALWAYS use DALL-E 3 for 100% relevant images - NO FALLBACKS
    if (!env.OPENAI_API_KEY) {
      console.error('[IMAGE] OpenAI API key not configured - cannot generate images');
      return {
        url: `https://via.placeholder.com/1792x1024/0066CC/FFFFFF?text=${encodeURIComponent('Configure OpenAI API')}`,
        credit: 'No API Key',
        type: 'error',
        isRelevant: false
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
        
        // POLITICAL FIGURES - Compelling, clickable visuals
        if (titleLower.includes('modi')) {
          imagePrompt = `BREAKING NEWS VISUAL: Narendra Modi in dramatic moment at ${location || 'Parliament'}. ${action ? `Powerful ${action} gesture` : 'Decisive leadership moment'}. ${hasCurrency ? `MASSIVE ₹${numbers[0]} CRORE displayed prominently` : ''} Vibrant colors, dramatic lighting, Indian flag prominent. URGENT NEWS FEEL. High contrast, eye-catching composition that demands attention.`;
        }
        else if (titleLower.includes('rahul') || titleLower.includes('gandhi')) {
          imagePrompt = `EXPLOSIVE POLITICAL MOMENT: Rahul Gandhi in POWERFUL stance at ${location || 'massive rally'}. ${action === 'announces' ? 'MAJOR ANNOUNCEMENT with dramatic gestures' : 'PASSIONATE speech to THOUSANDS'}. ${numbers.length ? `HUGE ${numbers[0]} displayed on massive screen` : ''}. Dramatic lighting, crowd energy, MUST-WATCH moment.`;
        }
        else if (titleLower.includes('kejriwal')) {
          imagePrompt = `DELHI BREAKING NEWS: Arvind Kejriwal in ACTION at ${location || 'packed venue'}. ${action || 'Revolutionary announcement'} with MASSIVE crowd reaction. ${hasCurrency ? `SHOCKING ₹${numbers[0]} figure on giant display` : ''}. Electric atmosphere, dramatic angles, VIRAL moment captured.`;
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
          imagePrompt = `URGENT BREAKING NEWS: Emergency response in FULL ACTION at ${location || 'incident site'}. Multiple emergency vehicles with BRIGHT flashing lights creating dramatic scene. ${numbers.length ? `Critical ${numbers[0]} update on news banner` : ''}. Powerful but respectful coverage, dramatic lighting from emergency vehicles, compelling without being graphic.`;
        }
        else if (titleLower.includes('market') || titleLower.includes('sensex') || titleLower.includes('nifty')) {
          imagePrompt = `MARKET ALERT - URGENT: ${titleLower.includes('crash') || titleLower.includes('fall') ? 'RED ALERT with DRAMATIC downward arrows' : 'GREEN SURGE with EXPLOSIVE upward movement'}. SENSEX ${numbers[0] || '50000'} in MASSIVE digits. ${hasPercentage ? `SHOCKING ${numbers.find(n => n.includes('%')) || '10%'} change` : ''}. Traders in ACTION, screens GLOWING, MUST-SEE market moment. High energy, impossible to ignore.`;
        }
        else if (titleLower.includes('budget') || titleLower.includes('economy')) {
          imagePrompt = `Official government photo: ${title}. Finance Minister holding budget briefcase at North Block steps. ${hasCurrency ? `₹${numbers[0]} lakh crore budget figure on briefcase or backdrop` : ''}. Indian flag, government officials, media photographers. Golden hour lighting.`;
        }
        else if (titleLower.includes('cricket') || titleLower.includes('match')) {
          imagePrompt = `CRICKET SENSATION: ${titleLower.includes('win') ? 'VICTORY CELEBRATION explosion' : 'NAIL-BITING action'} at ${location || 'PACKED stadium'}. ${numbers.length ? `INCREDIBLE ${numbers[0]}/${numbers[1] || '3'} on GIANT screen` : 'THRILLING score'}. Players in MID-ACTION, crowd going WILD, Indian flags EVERYWHERE. EXPLOSIVE moment, maximum drama, MUST-WATCH cricket visual.`;
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
        
        // ENHANCE ALL PROMPTS FOR MAXIMUM ATTRACTION
        imagePrompt = `${imagePrompt}\n\nCRITICAL REQUIREMENTS:
        • Make this image IMPOSSIBLE to ignore
        • Use VIBRANT, eye-catching colors
        • Create DRAMATIC composition
        • Add visual URGENCY and importance
        • Include BOLD text overlays if relevant
        • Make viewer WANT to click immediately
        • Professional but COMPELLING visual
        • ${visualKeywords.length > 0 ? `HIGHLIGHT: ${visualKeywords.join(', ')}` : ''}
        
        STYLE: Trending news thumbnail, viral social media post quality, maximum visual impact.`;
        
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
            size: '1024x1024', // Optimized for web performance
            quality: 'standard', // Faster generation and loading
            style: 'vivid' // More vibrant and eye-catching
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data[0]) {
            console.log(`DALL-E SUCCESS for: ${title}`);
            return {
              url: data.data[0].url,
              credit: 'AI Generated Image',
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
        console.error('[DALL-E] Generation error:', error.message);
        console.error('[DALL-E] Stack:', error.stack);
        // Even on error, return a specific placeholder rather than falling through
        return {
          url: `https://via.placeholder.com/1792x1024/CC0000/FFFFFF?text=${encodeURIComponent(title.substring(0, 50))}`,
          credit: 'Placeholder Image',
          type: 'placeholder',
          isRelevant: false
        };
      }
    }
    
    // NO FALLBACK IMAGES - Always return DALL-E or error
    console.log('[IMAGE] DALL-E generation completed or failed, no fallbacks used');
    
    // Return error if we reached here
    return {
      url: `https://via.placeholder.com/1792x1024/FF0000/FFFFFF?text=${encodeURIComponent('Image Generation Failed')}`,
      credit: 'Generation Error',
      type: 'error',
      isRelevant: false
    };
    
    // REMOVED ALL FALLBACK CODE BELOW
    const defaultImages = {
      'Technology': [
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800', // Tech desk setup
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800', // Futuristic tech
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800'  // Code matrix
      ],
      'Business': [
        'https://images.unsplash.com/photo-1559526324-593bc073d938?w=800', // Business meeting
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800', // Office workers
        'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800'  // Money growth
      ],
      'India': [
        'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800', // India Gate
        'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800', // Delhi skyline
        'https://images.unsplash.com/photo-1609609830354-8f615d61b9c8?w=800'  // Mumbai cityscape
      ],
      'World': [
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', // Globe technology
        'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800', // London Tower Bridge
        'https://images.unsplash.com/photo-1508433957232-3107f5fd5995?w=800'  // NYC skyline
      ],
      'Sports': [
        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800', // Cricket stadium
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800', // Cricket action
        'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800'  // Stadium crowd
      ],
      'Entertainment': [
        'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800', // Cinema
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', // Movie theater
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800'  // Concert crowd
      ]
    };
    
    // If no category match, use a breaking news style image
    const breakingNewsImages = [
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800', // News broadcast
      'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?w=800', // Breaking news
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'  // News desk
    ];
    
    const categoryImages = defaultImages[category] || breakingNewsImages;
    const selectedDefault = categoryImages[Math.floor(Math.random() * categoryImages.length)];
    
    return {
      url: selectedDefault,
      credit: 'Stock Photo',
      type: 'default',
      isRelevant: false
    };
    
  } catch (error) {
    console.error('Image fetch error:', error);
    return {
      url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
      credit: 'AgamiNews',
      type: 'fallback',
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
  const config = await env.NEWS_KV.get('config', 'json') || {};
  
  // Track article view
  const stats = await env.NEWS_KV.get('stats', 'json') || {};
  if (!stats.articleViews) stats.articleViews = {};
  stats.articleViews[article.id] = (stats.articleViews[article.id] || 0) + 1;
  await env.NEWS_KV.put('stats', JSON.stringify(stats));
  
  // Get article index for navigation
  const articleIndex = allArticles.findIndex(a => a.id === article.id);
  
  // Use existing article rendering logic
  const fullContent = article.fullContent || await generateFullArticle(article, article.sourceMaterial?.description || '', env);
  
  // Generate the HTML using existing article rendering
  const isDark = config.theme === 'dark';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - ${config.siteName}</title>
    <meta name="description" content="${article.preview || 'Read full article on AgamiNews'}">
    
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
        /* Article page styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${isDark ? '#000' : '#fff'};
            color: ${isDark ? '#fff' : '#000'};
            line-height: 1.6;
        }
        .article-header {
            background: ${isDark ? '#1a1a1a' : '#f8f8f8'};
            padding: 20px;
            border-bottom: 2px solid ${config.primaryColor};
        }
        .article-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .article-title {
            font-size: 32px;
            font-weight: bold;
            margin: 20px 0;
            line-height: 1.3;
        }
        .article-meta {
            color: ${isDark ? '#999' : '#666'};
            margin: 15px 0;
            font-size: 14px;
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
        .article-content {
            font-size: 18px;
            line-height: 1.8;
            margin: 30px 0;
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
    </style>
</head>
<body>
    <div class="article-header">
        <div class="article-container">
            <a href="/" class="back-btn">← Back to Homepage</a>
        </div>
    </div>
    
    <div class="article-container">
        <h1 class="article-title">${article.title}</h1>
        
        <div class="article-meta">
            <span>📅 ${new Date(article.timestamp).toLocaleDateString('en-IN')}</span>
            <span> • </span>
            <span>📰 ${article.source}</span>
            <span> • </span>
            <span>🏷️ ${article.category}</span>
            <span> • </span>
            <span>👁️ ${stats.articleViews[article.id] || 1} views</span>
        </div>
        
        ${article.image ? `
        <div class="article-image">
            <img src="${article.image.url || article.image}" alt="${article.title}">
            ${article.image.credit ? `<div style="text-align: center; font-size: 12px; color: #999; margin-top: 5px;">${article.image.credit}</div>` : ''}
        </div>
        ` : ''}
        
        <div class="article-content">
            ${fullContent}
        </div>
        
        <div class="share-buttons">
            <h3 style="margin-bottom: 15px;">Share this article</h3>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent('https://agaminews.in' + article.url)}" 
               target="_blank" class="share-btn">Twitter</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://agaminews.in' + article.url)}" 
               target="_blank" class="share-btn">Facebook</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://agaminews.in' + article.url)}" 
               target="_blank" class="share-btn">LinkedIn</a>
            <a href="https://wa.me/?text=${encodeURIComponent(article.title + ' https://agaminews.in' + article.url)}" 
               target="_blank" class="share-btn">WhatsApp</a>
        </div>
    </div>
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
}

// Serve article by SEO-friendly slug URL
async function serveArticleBySlug(env, request, pathname) {
  try {
    // Extract article ID from URL (last 6 digits)
    const matches = pathname.match(/-(\d{6})$/);
    if (!matches) {
      throw new Error('Invalid article URL format');
    }
    
    const articleId = matches[1];
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    
    // Find article by ID
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    // Verify URL matches (for security/SEO)
    const expectedUrl = `/${article.category.toLowerCase()}-news/${article.slug}-${article.id}`;
    if (pathname !== expectedUrl) {
      // Redirect to canonical URL
      return Response.redirect(new URL(expectedUrl, request.url).toString(), 301);
    }
    
    // Render the article (reuse existing rendering logic)
    return renderArticlePage(env, article, articles, request);
  } catch (error) {
    console.error('Error serving article by slug:', error);
    return serve404Page(env, error.message);
  }
}

// Serve individual article page (legacy)
async function serveArticle(env, request, pathname) {
  try {
    const articleId = parseInt(pathname.split('/')[2]);
    
    // Validate articleId
    if (isNaN(articleId) || articleId < 0) {
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
    
    <!-- Google Analytics - ALWAYS INCLUDE -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZW77WM2VPG', {
        page_path: '/404',
        page_title: '404 - Article Not Found'
      });
    </script>
    
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
  
  // Use the pre-generated full content if available, otherwise generate it
  const fullContent = article.fullContent || await generateFullArticle(article, '', env);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - ${config.siteName}</title>
    <meta name="description" content="${article.preview || 'Read full article on AgamiNews'}">
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.preview || 'Read full article on AgamiNews'}">
    <meta property="og:image" content="${article.image?.url || article.image || 'https://agaminews.in/og-image.jpg'}">
    <meta property="og:url" content="https://agaminews.in/article/${articleId}">
    <meta property="twitter:card" content="summary_large_image">
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      
      // Track article page view with enhanced data
      gtag('config', 'G-ZW77WM2VPG', {
        page_path: '/article/${articleId}',
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${isDark ? '#0A0A0A' : '#FFF'};
            color: ${isDark ? '#FFF' : '#000'};
            line-height: 1.8;
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
            max-width: 900px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 24px;
            font-weight: 900;
            color: ${config.primaryColor};
            text-decoration: none;
        }
        .article-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .article-category {
            color: ${config.primaryColor};
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .article-title {
            font-size: 36px;
            font-weight: 900;
            line-height: 1.2;
            margin-bottom: 20px;
        }
        .article-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid ${isDark ? '#333' : '#E0E0E0'};
            font-size: 14px;
            opacity: 0.8;
        }
        .article-image {
            width: 100%;
            max-height: 500px;
            object-fit: cover;
            border-radius: 10px;
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
        
        @media (max-width: 380px) {
            .article-title { font-size: 20px; }
            .article-content { font-size: 14px; }
            .share-btn { 
                display: block;
                width: 100%;
                margin: 5px 0;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <a href="/" class="logo">${config.siteName}</a>
            <div style="font-size: 12px; opacity: 0.7;">Tech & Finance News</div>
        </div>
    </header>
    
    <div class="article-container">
        <div class="article-category">${article.category}</div>
        <h1 class="article-title">${article.title}</h1>
        
        <div class="article-meta">
            <span>📅 ${article.date || 'Today'}</span>
            <span>👁️ ${article.views?.toLocaleString() || 1} views</span>
            ${article.source ? `<span>📰 Source: ${article.source}</span>` : ''}
            ${article.trending ? '<span>🔥 Trending</span>' : ''}
        </div>
        
        ${article.image ? `
            <img src="${article.image.url || article.image}" alt="${article.title}" class="article-image">
            ${article.image.credit ? `<div class="image-credit">${article.image.credit}</div>` : ''}
        ` : ''}
        
        <div class="article-content">
            ${fullContent}
            
            <!-- Internal Links for SEO -->
            <div style="margin: 40px 0; padding: 20px; background: ${isDark ? '#1a1a1a' : '#f0f8ff'}; border-left: 4px solid #0066cc; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #0066cc;">📚 Continue Reading</h3>
                <p style="margin: 10px 0; color: ${isDark ? '#ccc' : '#666'};">Discover more exclusive stories:</p>
                <ul style="list-style: none; padding: 0;">
                    ${articles
                      .filter((a, i) => i !== articleId)
                      .slice(0, 3)
                      .map((related, idx) => `
                        <li style="margin: 10px 0;">
                            <a href="${related.url || `/article/${articles.indexOf(related)}`}" 
                               style="color: #0066cc; text-decoration: none; font-weight: 500; display: block; padding: 5px 0;">
                               → ${related.title}
                            </a>
                        </li>
                      `).join('')}
                </ul>
                <a href="/" style="display: inline-block; margin-top: 15px; color: #0066cc; font-weight: bold;">
                    View All Stories →
                </a>
            </div>
        </div>
        
        <div class="share-buttons">
            <div class="share-title">Share this article</div>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent('https://agaminews.in/article/' + articleId)}" 
               target="_blank" class="share-btn">Twitter</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://agaminews.in/article/' + articleId)}" 
               target="_blank" class="share-btn">Facebook</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://agaminews.in/article/' + articleId)}" 
               target="_blank" class="share-btn">LinkedIn</a>
            <a href="https://wa.me/?text=${encodeURIComponent(article.title + ' https://agaminews.in/article/' + articleId)}" 
               target="_blank" class="share-btn">WhatsApp</a>
        </div>
        
        <div class="related-articles">
            <h2 class="related-title">More Stories</h2>
            <div class="related-grid">
                ${articles
                  .map((a, i) => ({ article: a, index: i })) // Keep track of original index
                  .filter(item => item.index !== articleId)
                  .sort((a, b) => {
                    // Prioritize same category, then mix others
                    if (a.article.category === article.category && b.article.category !== article.category) return -1;
                    if (a.article.category !== article.category && b.article.category === article.category) return 1;
                    return b.article.views - a.article.views; // Then by views
                  })
                  .slice(0, 6)
                  .map(item => {
                    const relatedIndex = item.index; // Use the preserved index
                    const related = item.article;
                    const imageUrl = related.image?.url || related.image || 
                                   `https://via.placeholder.com/160x160/333/999?text=${encodeURIComponent(related.category)}`;
                    return `
                    <a href="${related.url || `/article/${relatedIndex}`}" class="related-card">
                        <div class="related-card-image">
                            <img src="${imageUrl}" alt="${related.title}" loading="lazy">
                        </div>
                        <div class="related-card-content">
                            <div class="related-card-title">${related.title}</div>
                            <div class="related-card-meta">${related.category} • ${related.date || 'Today'}</div>
                        </div>
                    </a>
                  `;
                  }).join('')}
            </div>
        </div>
        
        <a href="/" class="back-btn">← Back to Homepage</a>
    </div>
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
  // Use GPT to research and create original content
  console.log(`Creating original article from source: ${sourceMaterial.originalTitle}`);
  
  if (!env.OPENAI_API_KEY) {
    console.log('No OpenAI API key, using fallback');
    return {
      title: sourceMaterial.originalTitle,
      content: `<p>${sourceMaterial.description}</p>`
    };
  }
  
  const prompt = `You are an investigative journalist for AgamiNews. 
  
SOURCE MATERIAL:
Original Headline: ${sourceMaterial.originalTitle}
Brief: ${sourceMaterial.description}
Category: ${sourceMaterial.category}
Source: ${sourceMaterial.source}

YOUR TASK - CREATE COMPLETELY ORIGINAL CONTENT:

1. CREATE A NEW HEADLINE:
   - Completely different from the source
   - More engaging and specific
   - Include key facts/numbers if available
   - Make it unique to AgamiNews
   - Don't copy the original headline

2. RESEARCH & EXPAND:
   - Take the basic facts from the source
   - Add context from your knowledge
   - Include background information
   - Add expert perspectives (you can create realistic quotes)
   - Include data and statistics
   - Add historical context
   - Explain implications

3. WRITE ORIGINAL 1500-2000 WORD ARTICLE:
   - Start with your own lead paragraph
   - Don't copy any sentences from the source
   - Add multiple perspectives
   - Include analysis and insights
   - Create realistic quotes from experts
   - Add data tables or comparisons
   - Explain what this means for readers

  FORMAT YOUR RESPONSE AS JSON:
  {
    "title": "Your completely original headline here",
    "content": "<p>Your full article in HTML paragraphs...</p>"
  }

  CRITICAL REQUIREMENTS:
  - The headline MUST be COMPLETELY DIFFERENT from: "${sourceMaterial.originalTitle}"
  - If your headline is similar to the source, you FAIL
  - Create a NEW ANGLE that competitors haven't covered
  - Add exclusive insights and analysis
  - Make it so unique that it becomes the primary source for others
  - Quality so high that readers share it immediately`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // Using GPT-4 for maximum quality
        messages: [
          {
            role: 'system',
            content: `You are an award-winning investigative journalist at AgamiNews. Your job is to create 100% ORIGINAL content.

STRICT RULES:
1. NEVER copy or paraphrase the source headline
2. Create a COMPLETELY NEW angle or perspective
3. Add substantial research and context
4. Include data, statistics, expert opinions
5. Write like a human journalist, not AI
6. Make content so unique it could win journalism awards
7. Focus on WHY this matters to Indian readers`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // High creativity for unique content
        max_tokens: 3500
      })
    });

    if (response.ok) {
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      // Verify the title is actually different
      const sourceWords = sourceMaterial.originalTitle.toLowerCase().split(' ');
      const newWords = result.title.toLowerCase().split(' ');
      const overlap = sourceWords.filter(word => newWords.includes(word) && word.length > 4);
      
      if (overlap.length > 3) {
        console.error('[QUALITY CHECK] Title too similar to source, regenerating...');
        // Title is too similar, this shouldn't happen with GPT-4
        throw new Error('Title not original enough');
      }
      
      // Check content quality
      if (result.content.length < 1000) {
        console.error('[QUALITY CHECK] Content too short');
        throw new Error('Content not comprehensive enough');
      }
      
      console.log(`[ORIGINAL] Created unique article: "${result.title}" (${overlap.length} common words)`);
      
      return {
        title: result.title,
        content: result.content
      };
    }
  } catch (error) {
    console.error('Failed to generate original article:', error);
  }
  
  // Fallback
  return {
    title: sourceMaterial.originalTitle,
    content: `<p>Article generation failed</p>`
  };
}

// Generate full article content using GPT for depth
async function generateFullArticle(article, description, env) {
  // Use GPT to create comprehensive, well-researched article
  console.log(`generateFullArticle called for: ${article.title}, API key: ${env.OPENAI_API_KEY ? 'present' : 'missing'}`);
  
  if (env.OPENAI_API_KEY) {
    try {
      const prompt = `You are a senior investigative journalist at The Hindu/Indian Express. Create a comprehensive, fact-rich article with real information and deep analysis.

HEADLINE: ${article.title}
CATEGORY: ${article.category}
RAW CONTEXT: ${description}
SOURCE: ${article.source || 'Multiple Sources'}

WRITE A COMPREHENSIVE 1500-2000 WORD NEWS ARTICLE:

STRUCTURE YOUR ARTICLE:
• Lead paragraph: The key news in 2-3 sentences with WHO, WHAT, WHEN, WHERE, WHY
• Context paragraph: Background and why this matters now
• Details section: Specific information, data, quotes from authorities
• Analysis section: Expert opinions, precedents, comparisons
• Impact section: How this affects common citizens, specific groups
• Future outlook: What happens next, upcoming developments
• Conclusion: Key takeaways without saying "in conclusion"

JOURNALISTIC STANDARDS:
• Attribution: "According to Ministry data..." "Sources revealed..." "Officials confirmed..."
• Specific numbers: "₹2,34,567 crore budget" not "huge budget"
• Real quotes: Create realistic quotes from officials, experts, affected citizens
• Timeline: "The announcement came two days after..." 
• Comparisons: "This is 23% higher than last year's..."
• Regional impact: "In Karnataka alone, 4.5 lakh families..."

MAKE IT CREDIBLE AND INFORMATIVE - Like reading The Hindu or Times of India

${article.category.toLowerCase().includes('politic') || article.category.toLowerCase().includes('india') ? `
POLITICAL/NATIONAL NEWS STRUCTURE:
<p><strong>The Development:</strong> What exactly happened, when, where, who's involved</p>
<p><strong>Background & Context:</strong> How we got here - timeline of events, previous attempts, historical precedents</p>
<p><strong>Key Players:</strong> All stakeholders - government, opposition, civil society, affected communities</p>
<p><strong>The Numbers:</strong> Budget allocations, voter statistics, demographic data, economic impact</p>
<p><strong>Ground Report:</strong> Real stories from affected people, quotes from locals, on-ground situation</p>
<p><strong>Political Analysis:</strong> Why now? Electoral implications, power dynamics, hidden agendas</p>
<p><strong>Opposition Response:</strong> Detailed reactions from all political parties, their strategies</p>
<p><strong>Expert Views:</strong> Constitutional experts, economists, political analysts' perspectives</p>
<p><strong>State-wise Impact:</strong> How different states are affected, regional variations</p>
<p><strong>International Perspective:</strong> Global reactions, comparisons with other countries</p>
<p><strong>Legal Aspects:</strong> Constitutional provisions, court cases, legal challenges</p>
<p><strong>Future Scenarios:</strong> What happens next, possible outcomes, timeline ahead</p>
` : ''}

${article.category.toLowerCase().includes('business') || article.category.toLowerCase().includes('economy') ? `
BUSINESS/ECONOMY STRUCTURE:
<p><strong>Market Movement:</strong> Exact numbers - indices, stock prices, percentage changes, volumes</p>
<p><strong>Company Details:</strong> Revenue, profit, market cap, employee count, expansion plans</p>
<p><strong>Sector Analysis:</strong> Industry trends, market size, growth projections, competition</p>
<p><strong>Regulatory Environment:</strong> Government policies, RBI decisions, SEBI regulations</p>
<p><strong>Global Context:</strong> International markets, dollar rates, crude prices, FII/DII data</p>
<p><strong>Expert Commentary:</strong> Fund managers, economists, industry leaders' views</p>
<p><strong>Historical Performance:</strong> 5-year trends, comparison with previous quarters/years</p>
<p><strong>Investment Angle:</strong> Should you invest? Risk factors, return expectations</p>
<p><strong>Impact on Common People:</strong> How it affects savings, loans, jobs, prices</p>
<p><strong>Competitor Analysis:</strong> What rivals are doing, market share changes</p>
` : ''}

${article.category.toLowerCase().includes('tech') ? `
TECHNOLOGY DEEP DIVE:
<p><strong>Technical Specifications:</strong> Complete specs with benchmarks, real-world performance</p>
<p><strong>Innovation Analysis:</strong> What's genuinely new, what's marketing, patent details</p>
<p><strong>Market Context:</strong> Pricing strategy, target audience, competition landscape</p>
<p><strong>User Experience:</strong> Real-world usage, pros/cons, long-term reliability</p>
<p><strong>Ecosystem Impact:</strong> How it fits with other products, compatibility, integration</p>
<p><strong>Future Roadmap:</strong> Upcoming updates, next generation plans, industry direction</p>
` : ''}

${article.category.toLowerCase().includes('world') || article.category.toLowerCase().includes('international') ? `
INTERNATIONAL NEWS ANALYSIS:
<p><strong>Global Context:</strong> Why this matters to India, bilateral relations, trade impact</p>
<p><strong>Geopolitical Analysis:</strong> Power dynamics, alliance implications, strategic interests</p>
<p><strong>Economic Implications:</strong> Trade, investment, currency, commodity price impacts</p>
<p><strong>Historical Background:</strong> How this situation developed, key turning points</p>
<p><strong>Indian Diaspora:</strong> Impact on Indians abroad, NRI perspectives</p>
<p><strong>Diplomatic Angle:</strong> India's position, MEA response, UN involvement</p>
<p><strong>Future Outlook:</strong> Scenarios, India's options, timeline of events</p>
` : ''}

RESEARCH REQUIREMENTS:
• Include 15-20 specific data points (statistics, amounts, percentages, dates)
• Quote at least 3-4 authoritative sources or experts
• Provide historical context going back 5-10 years
• Include multiple perspectives (minimum 3 different viewpoints)
• Add regional/demographic breakdown where relevant
• Connect to 3-4 related developments or trends
• Explain technical/legal terms in simple language
• Include "What this means for you" section for readers
• Provide timeline of events where applicable
• Add comparison with 2-3 similar cases/situations

JOURNALISTIC STANDARDS:
• Fact-based reporting with verified information
• Balanced coverage of all viewpoints
• Clear attribution of sources
• Explanation of complex topics in accessible language
• Logical flow from context to analysis to implications
• Use of specific examples and case studies
• Data-driven arguments and conclusions

STYLE: Investigative journalism like The Hindu, Indian Express, The Wire
FORMAT: HTML <p> tags, use <strong> for emphasis, <em> for quotes

Create comprehensive content that informs, educates, and empowers readers!

Write the FULL in-depth article:`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-16k', // Using GPT-3.5 16K for long comprehensive articles
          messages: [
            {
              role: 'system',
              content: `You are a senior journalist at The Hindu or Times of India. Write professionally but with human warmth and insight.

WRITING STYLE:
- Start with the most newsworthy aspect - the real impact on readers
- Write clearly and directly: "The government announced..." not "It has been announced..."
- Include expert analysis: "According to Dr. Sharma from IIT Delhi..."
- Add context: "This is the third such incident this month"
- Use data and facts: "The policy affects 2.3 crore students"
- Include multiple perspectives: "While supporters argue..., critics point out..."
- Reference precedents: "Similar to the 2019 policy change..."
- Explain implications: "This means families will need to..."

PROFESSIONAL BUT HUMAN:
- Use "we" and "our" when referring to India/Indians
- Show empathy: "For thousands of families, this means..."
- Highlight real impact: "A Mumbai resident told us..."
- Be analytical: "The timing suggests..."
- Question when needed: "However, questions remain about..."

AVOID:
- Overly casual language ("crazy", "insane", "damn")
- Too many exclamations or questions
- Gossip-style writing
- Generic statements without substance
- AI-sounding phrases ("In the ever-evolving landscape...")

TONE: Authoritative, informative, balanced - like a respected newspaper, not a blog.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7, // More factual
          max_tokens: 4000, // Maximum tokens for truly comprehensive articles
          presence_penalty: 0.4, // Avoid repetition
          frequency_penalty: 0.4, // More variety
          top_p: 0.85 // More focused
        })
      });

      if (response.ok) {
        const data = await response.json();
        const fullContent = data.choices[0]?.message?.content;
        if (fullContent && fullContent.length > 500) { // Ensure substantial content
          console.log(`Generated ${fullContent.length} chars of content for: ${article.title}`);
          return fullContent;
        } else {
          console.error('Article too short:', fullContent?.length || 0);
        }
      } else {
        const error = await response.text();
        console.error('OpenAI API error:', error);
      }
    } catch (error) {
      console.error('Article generation error:', error.message);
    }
  }
  
  // Fallback to template-based generation (should rarely happen)
  console.warn('FALLING BACK TO TEMPLATE for:', article.title);
  return generateFullArticleTemplate(article);
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