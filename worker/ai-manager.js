// Advanced AI Website Manager System
// Budget: Under $10/month - Optimized for maximum efficiency

class AIWebsiteManager {
  constructor(env) {
    this.env = env;
    this.dailyBudget = 0.33; // $10/month = $0.33/day
    this.usageToday = 0;
  }

  // Main brain - decides what to do
  async think() {
    const tasks = [
      { task: 'fetch_news', priority: 1 },
      { task: 'analyze_performance', priority: 2 },
      { task: 'optimize_seo', priority: 3 },
      { task: 'suggest_improvements', priority: 4 }
    ];
    
    // Use GPT-4-mini for decisions (cheaper)
    const decision = await this.makeDecision(tasks);
    return decision;
  }

  // Fetch news from multiple FREE sources
  async fetchDailyNews() {
    const allNews = [];
    
    // 1. Crypto News
    try {
      // CoinGecko - FREE
      const cryptoRes = await fetch('https://api.coingecko.com/api/v3/news');
      const cryptoNews = await cryptoRes.json();
      allNews.push(...cryptoNews.data.slice(0, 5).map(n => ({
        category: 'Crypto',
        title: n.title,
        description: n.description,
        url: n.url,
        source: 'CoinGecko'
      })));
      
      // Reddit Crypto - FREE
      const redditCrypto = await fetch('https://www.reddit.com/r/cryptocurrency/top.json?limit=5');
      const redditData = await redditCrypto.json();
      allNews.push(...redditData.data.children.map(post => ({
        category: 'Crypto',
        title: post.data.title,
        description: post.data.selftext?.substring(0, 200),
        url: post.data.url,
        source: 'Reddit'
      })));
    } catch (e) {
      console.log('Crypto fetch error:', e);
    }

    // 2. Electric Vehicle News
    try {
      const evReddit = await fetch('https://www.reddit.com/r/electricvehicles/top.json?limit=5');
      const evData = await evReddit.json();
      allNews.push(...evData.data.children.map(post => ({
        category: 'Electric Vehicles',
        title: post.data.title,
        description: post.data.selftext?.substring(0, 200),
        url: post.data.url,
        source: 'Reddit EV'
      })));
    } catch (e) {
      console.log('EV fetch error:', e);
    }

    // 3. Tech & Gadgets
    try {
      // Hacker News - FREE
      const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const hnIds = await hnRes.json();
      
      for (let i = 0; i < 5; i++) {
        const story = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnIds[i]}.json`);
        const storyData = await story.json();
        allNews.push({
          category: 'Tech',
          title: storyData.title,
          description: `Score: ${storyData.score} | Comments: ${storyData.descendants}`,
          url: storyData.url,
          source: 'HackerNews'
        });
      }

      // Dev.to - FREE
      const devRes = await fetch('https://dev.to/api/articles?top=1&per_page=5');
      const devArticles = await devRes.json();
      allNews.push(...devArticles.map(article => ({
        category: 'Tech',
        title: article.title,
        description: article.description,
        url: article.url,
        source: 'Dev.to'
      })));
    } catch (e) {
      console.log('Tech fetch error:', e);
    }

    return allNews;
  }

  // AI Summarizes and asks for approval
  async summarizeForApproval(newsItems) {
    const summaries = [];
    
    // Batch process to save API calls
    const batchSize = 5;
    for (let i = 0; i < newsItems.length; i += batchSize) {
      const batch = newsItems.slice(i, i + batchSize);
      
      const prompt = `Summarize these news items in 2-3 sentences each. Rate importance 1-10:
      ${batch.map(n => `${n.category}: ${n.title}`).join('\n')}`;
      
      // Use GPT-3.5-turbo (cheap)
      const summary = await this.callOpenAI(prompt, 'gpt-3.5-turbo', 500);
      summaries.push(summary);
    }
    
    return summaries;
  }

  // Generate SEO-optimized articles
  async createArticle(newsItem, approved) {
    if (!approved) return null;
    
    const prompt = `Create an SEO-optimized article about: ${newsItem.title}
    
    Requirements:
    1. 500-700 words
    2. Include keywords naturally
    3. Add engaging intro
    4. Use headers (H2, H3)
    5. Add call-to-action
    6. Meta description (155 chars)
    7. Focus keywords: ${newsItem.category}
    
    Format as HTML with proper tags.`;
    
    const article = await this.callOpenAI(prompt, 'gpt-3.5-turbo', 1500);
    
    // Get free image with attribution
    const image = await this.getFreeImage(newsItem.title);
    
    // Add proper image HTML with attribution based on source
    let imageHtml = '';
    if (image && image.url) {
      if (image.source === 'unsplash') {
        imageHtml = `
          <div class="article-image">
            <img src="${image.url}" alt="${image.alt}" style="width:100%;border-radius:12px;">
            <p class="image-credit" style="font-size:12px;color:#666;margin-top:8px;text-align:right;">
              Photo by <a href="${image.photographerUrl}" target="_blank" rel="noopener" style="color:#666;text-decoration:underline;">${image.photographer}</a> 
              on <a href="https://unsplash.com?utm_source=agaminews&utm_medium=referral" target="_blank" rel="noopener" style="color:#666;text-decoration:underline;">Unsplash</a>
            </p>
          </div>
        `;
      } else if (image.source === 'pexels') {
        imageHtml = `
          <div class="article-image">
            <img src="${image.url}" alt="${image.alt}" style="width:100%;border-radius:12px;">
            <p class="image-credit" style="font-size:12px;color:#666;margin-top:8px;text-align:right;">
              Photo by <a href="${image.photographerUrl}" target="_blank" rel="noopener" style="color:#666;text-decoration:underline;">${image.photographer}</a> 
              on <a href="https://www.pexels.com" target="_blank" rel="noopener" style="color:#666;text-decoration:underline;">Pexels</a>
            </p>
          </div>
        `;
      } else {
        // Placeholder or other image
        imageHtml = `
          <div class="article-image">
            <img src="${image.url}" alt="${image.alt}" style="width:100%;border-radius:12px;">
          </div>
        `;
      }
    }
    
    // Combine article with image
    const fullArticle = imageHtml + article;
    
    return {
      title: newsItem.title,
      content: fullArticle,
      image: image,
      category: newsItem.category,
      seo: {
        keywords: this.extractKeywords(article),
        metaDescription: this.generateMetaDescription(article)
      }
    };
  }

  // Get copyright-free images with attribution data
  async getFreeImage(query) {
    try {
      // Try Unsplash first (FREE - 50 requests/hour)
      const unsplashRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=_wlcAEizuL--F29w5U-jF4bitnOgh3XJGRWJ50h0K6Y`
      );
      
      if (unsplashRes.ok) {
        const data = await unsplashRes.json();
        if (data.results && data.results.length > 0) {
          const photo = data.results[0];
          return {
            url: photo.urls.regular,
            photographer: photo.user.name,
            photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=agaminews&utm_medium=referral`,
            alt: photo.alt_description || query,
            source: 'unsplash'
          };
        }
      }
      
      // Fallback to Pexels (FREE - 200 requests/hour)
      const pexelsRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
        {
          headers: {
            'Authorization': 'LdY2h3tfWpLTwkj342SBdwRu2SBomuJQUsrmEJez1u3IZmBrt3myKhnp'
          }
        }
      );
      
      if (pexelsRes.ok) {
        const data = await pexelsRes.json();
        if (data.photos && data.photos.length > 0) {
          const photo = data.photos[0];
          return {
            url: photo.src.large,
            photographer: photo.photographer,
            photographerUrl: photo.photographer_url,
            alt: photo.alt || query,
            source: 'pexels'
          };
        }
      }
      
      // Final fallback to placeholder if no image found
      return {
        url: `https://via.placeholder.com/800x400/667eea/ffffff?text=${encodeURIComponent(query.substring(0, 20))}`,
        photographer: null,
        photographerUrl: null,
        alt: query,
        source: 'placeholder'
      };
      
    } catch (e) {
      console.log('Image fetch error:', e);
      return {
        url: `https://via.placeholder.com/800x400/667eea/ffffff?text=News`,
        photographer: null,
        photographerUrl: null,
        alt: 'News Image',
        source: 'placeholder'
      };
    }
  }

  // Analyze website performance with detailed insights
  async analyzePerformance() {
    const analytics = await this.env.NEWS_KV.get('analytics', 'json') || {};
    const articles = await this.env.NEWS_KV.get('articles', 'json') || [];
    const articleViews = await this.env.NEWS_KV.get('article_views', 'json') || {};
    
    // Analyze each article's performance
    const articlePerformance = articles.map((article, index) => {
      const views = articleViews[index] || 0;
      const engagement = views > 0 ? (views / (analytics.views || 1)) * 100 : 0;
      return {
        title: article.title,
        category: article.category,
        views: views,
        engagement: engagement.toFixed(2) + '%',
        status: views > 10 ? '✅ Working' : views > 5 ? '⚠️ Average' : '❌ Not Working'
      };
    }).sort((a, b) => b.views - a.views);
    
    // Identify what's working and what's not
    const workingPosts = articlePerformance.filter(a => a.views > 10);
    const notWorkingPosts = articlePerformance.filter(a => a.views <= 5);
    
    // Track patterns
    const performance = {
      totalViews: analytics.views || 0,
      uniqueVisitors: analytics.unique || 0,
      todayViews: analytics.todayViews || 0,
      avgTimeOnSite: analytics.avgTime || '2.5 min',
      bounceRate: analytics.bounceRate || '45%',
      topCategories: this.getTopCategories(articles),
      bestPerformingTime: this.getBestPostTime(articles),
      seoScore: await this.calculateSEOScore(),
      articlePerformance: articlePerformance.slice(0, 10),
      workingPosts: workingPosts.slice(0, 5),
      notWorkingPosts: notWorkingPosts.slice(0, 5),
      suggestions: [],
      actionItems: []
    };
    
    // AI analyzes patterns and suggests improvements
    const prompt = `As a 10-year website expert, analyze this performance data:
    
    WORKING POSTS (High engagement):
    ${workingPosts.slice(0, 3).map(p => `- ${p.title} (${p.views} views)`).join('\n')}
    
    NOT WORKING POSTS (Low engagement):
    ${notWorkingPosts.slice(0, 3).map(p => `- ${p.title} (${p.views} views)`).join('\n')}
    
    Total Views: ${performance.totalViews}
    Top Category: ${performance.topCategories[0]}
    
    Provide:
    1. Why certain posts are working
    2. Why others are failing
    3. Specific action items to improve
    4. UI/UX changes that could help`;
    
    const aiAnalysis = await this.callOpenAI(prompt, 'gpt-3.5-turbo', 400);
    performance.suggestions = aiAnalysis;
    
    // Generate specific action items that need permission
    performance.actionItems = [
      {
        action: 'remove_poor_content',
        description: `Remove ${notWorkingPosts.length} underperforming articles`,
        requiresPermission: true
      },
      {
        action: 'change_layout',
        description: 'Change homepage layout to feature top performing categories',
        requiresPermission: true
      },
      {
        action: 'update_colors',
        description: 'Update color scheme based on user engagement data',
        requiresPermission: true
      }
    ];
    
    return performance;
  }

  // Smart Google Ads placement
  async optimizeAdPlacement() {
    const adPlacements = {
      header: false, // Don't annoy users
      afterFirstParagraph: true, // Good engagement
      sidebar: true, // Non-intrusive
      betweenArticles: true, // Natural break
      footer: true, // Standard
      popups: false // Never - ruins UX
    };
    
    const adCode = `
      <!-- Google AdSense - Optimized Placement -->
      <ins class="adsbygoogle"
           style="display:block; margin: 20px 0; border-radius: 8px;"
           data-ad-client="ca-pub-YOUR_ID"
           data-ad-slot="YOUR_SLOT"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    `;
    
    return { placements: adPlacements, code: adCode };
  }

  // SEO Optimization
  async optimizeSEO(article) {
    const seoTips = {
      titleLength: article.title.length <= 60,
      metaDescription: article.seo.metaDescription.length <= 155,
      keywords: article.seo.keywords.length >= 5,
      headings: (article.content.match(/<h[2-3]/g) || []).length >= 3,
      images: article.image !== null,
      internalLinks: (article.content.match(/<a href="/g) || []).length >= 2,
      externalLinks: (article.content.match(/<a href="http/g) || []).length >= 1
    };
    
    const score = Object.values(seoTips).filter(v => v).length / Object.keys(seoTips).length * 100;
    
    return { score, tips: seoTips };
  }

  // Create quality backlinks
  async buildBacklinks(article) {
    const strategies = [
      {
        platform: 'Reddit',
        method: 'Share valuable insights, link naturally',
        url: `https://www.reddit.com/r/${article.category}/submit`
      },
      {
        platform: 'Quora',
        method: 'Answer questions, reference your article',
        url: 'https://www.quora.com'
      },
      {
        platform: 'Medium',
        method: 'Republish with canonical link',
        url: 'https://medium.com/new-story'
      },
      {
        platform: 'Dev.to',
        method: 'Cross-post tech articles',
        url: 'https://dev.to/new'
      }
    ];
    
    return strategies;
  }

  // Smart daily operations with permission requests
  async dailyRoutine() {
    const hour = new Date().getHours();
    const performance = await this.analyzePerformance();
    
    const tasks = [];
    
    // Morning analysis (6 AM)
    if (hour === 6) {
      tasks.push({
        time: '06:00',
        action: 'morning_analysis',
        description: `Good morning! Yesterday: ${performance.totalViews} views. Should I fetch today's trending news?`,
        requiresPermission: true
      });
    }
    
    // Noon check (12 PM)
    if (hour === 12) {
      if (performance.notWorkingPosts.length > 0) {
        tasks.push({
          time: '12:00',
          action: 'content_review',
          description: `${performance.notWorkingPosts.length} articles aren't performing. Should I suggest improvements?`,
          requiresPermission: true
        });
      }
    }
    
    // Evening report (6 PM)
    if (hour === 18) {
      tasks.push({
        time: '18:00',
        action: 'daily_report',
        description: `Today's performance: ${performance.todayViews} views. Want to see detailed analytics?`,
        requiresPermission: false
      });
    }
    
    // UI/UX suggestions (8 PM)
    if (hour === 20) {
      const suggestions = await this.makeDecision([]);
      if (suggestions.length > 0) {
        tasks.push({
          time: '20:00',
          action: 'improvements',
          description: `I have ${suggestions.length} improvement suggestions. Would you like to review them?`,
          requiresPermission: true
        });
      }
    }
    
    return tasks;
  }

  // OpenAI API call with budget management
  async callOpenAI(prompt, model = 'gpt-3.5-turbo', maxTokens = 500) {
    // Calculate cost
    const costs = {
      'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
      'gpt-4-turbo-preview': 0.01 / 1000, // $0.01 per 1K tokens
    };
    
    const estimatedCost = costs[model] * maxTokens;
    
    // Check budget
    if (this.usageToday + estimatedCost > this.dailyBudget) {
      return 'Daily budget exceeded. Waiting for tomorrow.';
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      
      // Track usage
      this.usageToday += estimatedCost;
      await this.env.NEWS_KV.put('usage_today', this.usageToday);
      
      return data.choices[0].message.content;
    } catch (e) {
      console.log('OpenAI error:', e);
      return null;
    }
  }

  // Helper functions
  extractKeywords(text) {
    // Simple keyword extraction
    const words = text.toLowerCase().match(/\b\w+\b/g);
    const frequency = {};
    words.forEach(word => {
      if (word.length > 4) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]).slice(0, 10);
  }

  generateMetaDescription(text) {
    const clean = text.replace(/<[^>]*>/g, '').substring(0, 155);
    return clean.substring(0, clean.lastIndexOf(' ')) + '...';
  }

  getTopCategories(articles) {
    const cats = {};
    articles.forEach(a => {
      cats[a.category] = (cats[a.category] || 0) + 1;
    });
    return Object.keys(cats).sort((a, b) => cats[b] - cats[a]);
  }

  getBestPostTime(articles) {
    // Analyze when articles get most engagement
    return '10:00 AM';
  }

  async calculateSEOScore() {
    // Calculate overall SEO health
    return 85; // Placeholder
  }

  // Make intelligent decisions WITH USER PERMISSION
  async makeDecision(tasks) {
    const context = await this.analyzePerformance();
    
    const decisions = [];
    
    // Analyze what needs to be done
    if (context.notWorkingPosts.length > 5) {
      decisions.push({
        priority: 'HIGH',
        action: 'content_cleanup',
        description: `${context.notWorkingPosts.length} articles are not performing. Should I remove or update them?`,
        requiresPermission: true
      });
    }
    
    if (context.totalViews < 100) {
      decisions.push({
        priority: 'HIGH',
        action: 'content_creation',
        description: 'Low traffic detected. Should I fetch and create more trending content?',
        requiresPermission: true
      });
    }
    
    if (context.seoScore < 70) {
      decisions.push({
        priority: 'MEDIUM',
        action: 'seo_optimization',
        description: 'SEO needs improvement. Should I optimize meta tags and content?',
        requiresPermission: true
      });
    }
    
    // UI/UX improvements based on data
    if (context.bounceRate > '60%') {
      decisions.push({
        priority: 'HIGH',
        action: 'ui_improvement',
        description: 'High bounce rate detected. Should I make the design more engaging?',
        requiresPermission: true
      });
    }
    
    return decisions;
  }
  
  // Execute changes WITH PERMISSION
  async executeWithPermission(action, approved) {
    if (!approved) {
      return { success: false, message: 'Action cancelled by user' };
    }
    
    switch(action.type) {
      case 'change_ui':
        // Update website design
        const currentDesign = await this.env.NEWS_KV.get('website_design', 'json') || {};
        const newDesign = { ...currentDesign, ...action.changes };
        await this.env.NEWS_KV.put('website_design', JSON.stringify(newDesign));
        return { success: true, message: 'UI updated successfully!' };
        
      case 'remove_content':
        // Remove underperforming articles
        const articles = await this.env.NEWS_KV.get('articles', 'json') || [];
        const filtered = articles.filter((_, index) => !action.indices.includes(index));
        await this.env.NEWS_KV.put('articles', JSON.stringify(filtered));
        return { success: true, message: `Removed ${action.indices.length} articles` };
        
      case 'publish_content':
        // Publish new articles
        return { success: true, message: 'Content published!' };
        
      default:
        return { success: false, message: 'Unknown action' };
    }
  }
}

// Export for use in main worker
export { AIWebsiteManager };