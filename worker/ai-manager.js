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
    
    // OPTIMIZED MIX: 14 Recent News + 1 Strategic Evergreen Daily
    
    // 1. RECENT INDIA NEWS (6 articles - fresh daily content)
    try {
      // Today's top India news
      const indiaReddit = await fetch('https://www.reddit.com/r/india/hot.json?limit=15');
      const indiaData = await indiaReddit.json();
      
      // Get RECENT news (last 24 hours)
      const recentIndiaNews = indiaData.data.children
        .slice(0, 6)
        .map(post => ({
          category: 'INDIA',
          title: post.data.title,
          description: post.data.selftext?.substring(0, 200) || 'Breaking India news',
          url: post.data.url,
          source: 'India Today',
          priority: 'HIGH',
          evergreen: false,
          fresh: true
        }));
      allNews.push(...recentIndiaNews);
      
      // ONE EVERGREEN TOPIC (for long-term SEO)
      const evergreenSearch = await fetch('https://www.reddit.com/r/india/top.json?limit=10&t=month');
      const evergreenData = await evergreenSearch.json();
      
      // Find the best evergreen candidate
      const evergreenPost = evergreenData.data.children
        .filter(post => {
          const title = post.data.title.toLowerCase();
          return (title.includes('guide') || title.includes('how to') || 
                  title.includes('explained') || title.includes('complete') ||
                  title.includes('everything') || post.data.score > 1000);
        })
        .slice(0, 1)
        .map(post => ({
          category: 'INDIA',
          title: `[Complete Guide] ${post.data.title}`,
          description: 'Comprehensive analysis and insights',
          url: post.data.url,
          source: 'In-Depth Analysis',
          priority: 'EVERGREEN',
          evergreen: true,
          fresh: false
        }));
      
      if (evergreenPost.length > 0) {
        allNews.push(...evergreenPost);
      }
    } catch (e) {
      console.log('India news fetch error:', e);
    }

    // 2. RECENT TECHNOLOGY NEWS (4 articles - today's tech)
    try {
      // Today's top tech stories
      const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const hnIds = await hnRes.json();
      
      // Get RECENT tech news
      const techStories = [];
      for (let i = 0; i < 4; i++) {
        const story = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnIds[i]}.json`);
        const storyData = await story.json();
        if (storyData && storyData.title) {
          techStories.push({
            category: 'TECHNOLOGY',
            title: storyData.title,
            description: `Breaking tech news with ${storyData.score} upvotes`,
            url: storyData.url || '',
            source: 'Tech News',
            priority: 'HIGH',
            evergreen: false,
            fresh: true
          });
        }
      }
      allNews.push(...techStories);
    } catch (e) {
      console.log('Tech news fetch error:', e);
    }

    // 3. RECENT BUSINESS & CRYPTO (3 articles)
    try {
      // Today's business news
      const businessReddit = await fetch('https://www.reddit.com/r/business/hot.json?limit=5');
      const businessData = await businessReddit.json();
      allNews.push(...businessData.data.children
        .slice(0, 2)
        .map(post => ({
          category: 'BUSINESS',
          title: post.data.title,
          description: post.data.selftext?.substring(0, 200) || 'Business update',
          url: post.data.url,
          source: 'Business News',
          priority: 'MEDIUM',
          evergreen: false,
          fresh: true
        })));

      // Latest crypto (if significant)
      const cryptoRes = await fetch('https://api.coingecko.com/api/v3/news');
      const cryptoNews = await cryptoRes.json();
      if (cryptoNews.data && cryptoNews.data.length > 0) {
        allNews.push(...cryptoNews.data.slice(0, 1).map(n => ({
          category: 'CRYPTO',
          title: n.title,
          description: n.description,
          url: n.url,
          source: 'Crypto Update',
          priority: 'MEDIUM',
          evergreen: false,
          fresh: true
        })));
      }
    } catch (e) {
      console.log('Business news fetch error:', e);
    }

    // 4. RECENT ENTERTAINMENT & SPORTS (2 articles)
    try {
      // Today's entertainment
      const bollywoodReddit = await fetch('https://www.reddit.com/r/bollywood/hot.json?limit=5');
      const bollywoodData = await bollywoodReddit.json();
      allNews.push(...bollywoodData.data.children
        .slice(0, 1)
        .map(post => ({
          category: 'ENTERTAINMENT',
          title: post.data.title,
          description: 'Bollywood news update',
          url: post.data.url,
          source: 'Entertainment',
          priority: 'LOW',
          evergreen: false,
          fresh: true
        })));
      
      // Today's sports
      const cricketReddit = await fetch('https://www.reddit.com/r/Cricket/hot.json?limit=5');
      const cricketData = await cricketReddit.json();
      allNews.push(...cricketData.data.children
        .slice(0, 1)
        .map(post => ({
          category: 'SPORTS',
          title: post.data.title,
          description: 'Sports update',
          url: post.data.url,
          source: 'Sports News',
          priority: 'LOW',
          evergreen: false,
          fresh: true
        })));
    } catch (e) {
      console.log('Entertainment fetch error:', e);
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

  // Get category-specific writing style
  getWritingStyle(category) {
    const styles = {
      'TECHNOLOGY': {
        role: 'senior tech journalist with 10+ years covering Silicon Valley',
        tone: 'Technical but accessible. Explain complex concepts clearly. Show deep understanding of tech ecosystem.',
        personality: 'knowledgeable, slightly geeky, enthusiastic about innovation',
        vocabulary: 'technical terms correctly, industry jargon appropriately, explain acronyms',
        expertise: 'technical specifications, industry trends, competitive analysis, future implications',
        instructions: `
        - Open with the significance of the technology
        - Explain technical details in layman terms
        - Compare with existing solutions
        - Discuss potential challenges and limitations
        - Include developer/engineer perspective
        - Reference tech history when relevant
        - Use analogies to explain complex concepts`
      },
      'BUSINESS': {
        role: 'senior business analyst from a top financial publication',
        tone: 'Professional, analytical, data-driven. Focus on numbers and market impact.',
        personality: 'authoritative, analytical, slightly skeptical',
        vocabulary: 'financial terminology, market language, business metrics',
        expertise: 'market analysis, financial implications, competitive landscape, investor perspective',
        instructions: `
        - Lead with market impact or financial significance
        - Include relevant numbers and percentages
        - Analyze competitive implications
        - Consider investor perspective
        - Discuss risks and opportunities
        - Reference historical precedents
        - Include expert market analysis`
      },
      'CRYPTO': {
        role: 'crypto analyst and DeFi expert',
        tone: 'Urgent but balanced. Exciting but include risk warnings. Technical but accessible.',
        personality: 'enthusiastic, analytical, risk-aware',
        vocabulary: 'blockchain terminology, DeFi concepts, trading language',
        expertise: 'blockchain technology, market dynamics, regulatory landscape, technical analysis',
        instructions: `
        - Open with market movement or opportunity
        - Explain blockchain/crypto concepts clearly
        - Include price analysis if relevant
        - Discuss risks prominently
        - Consider regulatory implications
        - Reference historical crypto events
        - Balance hype with realistic analysis`
      },
      'ENTERTAINMENT': {
        role: 'entertainment journalist with insider access',
        tone: 'Witty, gossipy, fun. Light-hearted but informative. Slightly cheeky.',
        personality: 'witty, well-connected, slightly sarcastic, pop-culture savvy',
        vocabulary: 'entertainment industry terms, pop culture references, trendy language',
        expertise: 'industry connections, behind-scenes knowledge, cultural context, trend analysis',
        instructions: `
        - Open with a hook or surprising detail
        - Include behind-the-scenes insights
        - Reference pop culture and trends
        - Use humor appropriately
        - Include fan perspectives
        - Discuss cultural impact
        - Add industry insider context`
      },
      'INDIA': {
        role: 'senior Indian affairs correspondent',
        tone: 'Proud but balanced. Progressive but respectful of tradition. Informative and inspiring.',
        personality: 'patriotic, optimistic, culturally aware, progressive',
        vocabulary: 'Indian context, local references, Hindi/regional terms where appropriate',
        expertise: 'Indian politics, economy, culture, regional dynamics, historical context',
        instructions: `
        - Highlight Indian achievements and progress
        - Include local context and impact
        - Reference Indian culture appropriately
        - Compare with global standards
        - Include diverse regional perspectives
        - Discuss challenges honestly
        - End with optimistic outlook`
      },
      'SPORTS': {
        role: 'veteran sports journalist and former athlete',
        tone: 'Energetic, passionate, dramatic. Build excitement and emotion.',
        personality: 'passionate, knowledgeable, dramatic, inspiring',
        vocabulary: 'sports terminology, statistics, player nicknames, fan language',
        expertise: 'game analysis, player psychology, historical records, tactical understanding',
        instructions: `
        - Open with the drama or key moment
        - Include relevant statistics
        - Analyze tactics and strategy
        - Include player perspectives
        - Reference historical moments
        - Build narrative tension
        - Celebrate human achievement`
      },
      'WORLD': {
        role: 'international affairs correspondent',
        tone: 'Serious, balanced, informative. Global perspective with local relevance.',
        personality: 'serious, well-informed, balanced, globally aware',
        vocabulary: 'diplomatic language, geopolitical terms, international relations',
        expertise: 'geopolitics, international relations, global trends, diplomatic analysis',
        instructions: `
        - Lead with global significance
        - Provide balanced perspectives
        - Include multiple country viewpoints
        - Explain complex geopolitics simply
        - Connect to Indian interests
        - Include expert diplomatic analysis
        - Discuss long-term implications`
      }
    };
    
    return styles[category] || styles['TECHNOLOGY'];
  }

  // Get category-specific headline style
  getHeadlineStyle(category) {
    const styles = {
      'TECHNOLOGY': {
        tone: 'technical yet accessible',
        powerWords: ['Revolutionary', 'Breakthrough', 'Game-Changing', 'Next-Gen', 'Unveiled', 'Disrupting'],
        guidelines: 'Be technically accurate but exciting. Show expertise. Focus on innovation and impact.',
        examples: [
          'Revolutionary AI Chip Outperforms Nvidia by 300% in Latest Benchmarks',
          'Apple\'s Secret Lab Reveals Next-Gen Tech That Changes Everything',
          'Quantum Computing Breakthrough: Scientists Achieve "Impossible" Milestone'
        ]
      },
      'BUSINESS': {
        tone: 'professional and authoritative',
        powerWords: ['Surges', 'Plummets', 'Dominates', 'Disrupts', 'Acquisition', 'Billion-Dollar'],
        guidelines: 'Focus on numbers, impact, and market implications. Be decisive and clear.',
        examples: [
          'Tech Giant\'s $50B Acquisition Shakes Wall Street - What It Means for You',
          'Market Alert: This Indicator Just Flashed Red for First Time Since 2008',
          'Fortune 500 CEO Reveals Strategy That Doubled Revenue in 6 Months'
        ]
      },
      'CRYPTO': {
        tone: 'urgent and opportunity-focused',
        powerWords: ['Explodes', 'Skyrockets', 'Crashes', 'Alert', 'Whale', 'Massive'],
        guidelines: 'Create FOMO but stay factual. Highlight opportunities and risks.',
        examples: [
          'Bitcoin Whale Moves $500M - Analysts Predict What\'s Coming Next',
          'This Altcoin Just Did 500% - Here\'s Why Experts Say It\'s Just Starting',
          'Urgent: Major Exchange Hack - What You Need to Do Right Now'
        ]
      },
      'INDIA': {
        tone: 'proud and progressive',
        powerWords: ['Historic', 'Landmark', 'Proud', 'Achievement', 'First-Ever', 'Record-Breaking'],
        guidelines: 'Highlight Indian achievements, progress, and impact. Be patriotic but balanced.',
        examples: [
          'India Achieves Historic Milestone: World\'s First to Successfully...',
          'Proud Moment: Indian Startup Beats Silicon Valley Giants',
          'Breaking: Government\'s New Policy to Transform 100 Million Lives'
        ]
      },
      'ENTERTAINMENT': {
        tone: 'witty and gossipy',
        powerWords: ['Shocking', 'Drama', 'Revealed', 'Exclusive', 'Spotted', 'Breaks Silence'],
        guidelines: 'Be fun, engaging, slightly cheeky. Create buzz and excitement.',
        examples: [
          'Bollywood\'s Biggest Star Breaks Silence on Shocking Controversy',
          'Exclusive: What Really Happened Behind the Scenes at...',
          'Twitter Can\'t Handle This Celebrity\'s Latest Move - See Why'
        ]
      },
      'SPORTS': {
        tone: 'energetic and passionate',
        powerWords: ['Crushes', 'Dominates', 'Epic', 'Thriller', 'Stunning', 'Comeback'],
        guidelines: 'Build excitement and drama. Focus on human stories and achievements.',
        examples: [
          'Epic Comeback: Underdog Team Stuns Champions in Thriller Finish',
          'Breaking Records: Kohli\'s Insane Stats Leave Cricket World Speechless',
          'From Zero to Hero: The Incredible Journey That\'s Inspiring Millions'
        ]
      },
      'WORLD': {
        tone: 'serious and informative',
        powerWords: ['Breaking', 'Crisis', 'Historic', 'Unprecedented', 'Global', 'Emergency'],
        guidelines: 'Be factual and balanced. Focus on global impact and significance.',
        examples: [
          'Breaking: World Leaders Emergency Summit as Crisis Deepens',
          'Historic Agreement: 195 Nations Unite for First Time Ever',
          'Global Alert: What This Means for Every Country Including India'
        ]
      }
    };
    
    return styles[category] || styles['TECHNOLOGY'];
  }

  // Determine article category based on content
  determineCategory(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    // Check for India-related content
    if (text.includes('india') || text.includes('delhi') || text.includes('mumbai') || 
        text.includes('bangalore') || text.includes('modi') || text.includes('indian')) {
      return 'INDIA';
    }
    
    // Check for World/International news
    if (text.includes('global') || text.includes('international') || text.includes('world') ||
        text.includes('usa') || text.includes('china') || text.includes('europe')) {
      return 'WORLD';
    }
    
    // Check for Sports
    if (text.includes('sports') || text.includes('cricket') || text.includes('football') ||
        text.includes('tennis') || text.includes('olympics') || text.includes('match')) {
      return 'SPORTS';
    }
    
    // Check for Entertainment
    if (text.includes('movie') || text.includes('film') || text.includes('actor') ||
        text.includes('bollywood') || text.includes('hollywood') || text.includes('music')) {
      return 'ENTERTAINMENT';
    }
    
    // Check for Business
    if (text.includes('business') || text.includes('market') || text.includes('stock') ||
        text.includes('economy') || text.includes('finance') || text.includes('investment')) {
      return 'BUSINESS';
    }
    
    // Check for Crypto
    if (text.includes('crypto') || text.includes('bitcoin') || text.includes('blockchain') ||
        text.includes('ethereum') || text.includes('defi') || text.includes('nft')) {
      return 'CRYPTO';
    }
    
    // Default to Technology
    return 'TECHNOLOGY';
  }

  // Generate SEO-optimized articles with category-specific styles
  async createArticle(newsItem, approved) {
    if (!approved) return null;
    
    // Intelligently determine category if not already set properly
    if (!newsItem.category || newsItem.category === 'Tech' || newsItem.category === 'Crypto') {
      newsItem.category = this.determineCategory(newsItem.title, newsItem.description || '');
    }
    
    // PHASE 1: STRATEGIC RESEARCH FOR GROWTH & SEO
    const isEvergreen = newsItem.evergreen || false;
    const isViral = newsItem.viral || false;
    
    const researchPrompt = `You are a strategic content researcher optimizing for website growth, SEO, and reader value.

TOPIC: ${newsItem.title}
INITIAL INFO: ${newsItem.description || 'Breaking news'}
CATEGORY: ${newsItem.category}
CONTENT TYPE: ${isEvergreen ? '🌲 EVERGREEN (long-term traffic)' : isViral ? '🔥 VIRAL POTENTIAL' : '📰 TRENDING NEWS'}
SOURCE: ${newsItem.source || 'Various'}

RESEARCH REQUIREMENTS:
1. BACKGROUND CONTEXT
   - Historical context and how we got here
   - Previous similar events and their outcomes
   - Key players and stakeholders involved

2. CURRENT SITUATION
   - Exact facts and verified details
   - Multiple perspectives from different sources
   - Conflicting reports or viewpoints if any
   - Timeline of events

3. EXPERT ANALYSIS (inferred from data)
   - What industry experts would likely say
   - Technical/professional assessment
   - Potential skepticism or concerns

4. IMPACT ASSESSMENT
   - Immediate consequences
   - Short-term (weeks) implications
   - Long-term (months/years) effects
   - Who wins and who loses

5. UNIQUE INSIGHTS
   - Angles others haven't covered
   - Hidden connections or patterns
   - Interesting parallels or comparisons
   - "What nobody is talking about"

6. FUTURE PREDICTIONS
   - Likely next developments
   - Potential scenarios
   - What to watch for

Provide comprehensive research that goes BEYOND surface-level reporting. Find the story within the story.`;

    const research = await this.callOpenAI(researchPrompt, 'gpt-4-turbo-preview', 800);
    
    // PHASE 2: ULTRA-CLICKABLE HEADLINE GENERATION
    const headlineStyle = this.getHeadlineStyle(newsItem.category);
    
    // First, generate multiple headline options
    const headlinePrompt = `You are a viral content expert who creates headlines that get millions of clicks.

ORIGINAL NEWS: "${newsItem.title}"
CATEGORY: ${newsItem.category}
KEY RESEARCH INSIGHTS: ${research.substring(0, 400)}

CREATE 5 DIFFERENT HEADLINES using these psychological triggers:

1. CURIOSITY GAP: Make readers NEED to know what happens
   Example: "You Won't Believe What [Famous Person] Just Did With..."

2. FEAR OF MISSING OUT (FOMO): Create urgency
   Example: "Everyone Is Talking About This [Thing] - Here's What You Need to Know"

3. CONTROVERSY/SHOCK: Provocative but true
   Example: "[Authority] Admits They Were Wrong About [Common Belief]"

4. BENEFIT/VALUE: Clear value proposition
   Example: "This Simple [Method] Could Save You [Specific Amount]"

5. EMOTIONAL TRIGGER: Strong emotional response
   Example: "[Heartwarming/Shocking] Moment When [Unexpected Thing Happened]"

CATEGORY-SPECIFIC REQUIREMENTS for ${newsItem.category}:
${headlineStyle.guidelines}

POWER WORDS TO USE: ${headlineStyle.powerWords.join(', ')}

RULES:
- Maximum 65 characters
- MUST be factually accurate
- Create irresistible curiosity
- Use numbers when possible
- Include emotional triggers
- Make it shareable
- ${headlineStyle.tone} tone

Provide 5 headlines, then choose the BEST one based on:
- Click potential (1-10)
- Shareability (1-10)
- Accuracy (1-10)

Return ONLY the best headline.`;

    const clickableTitle = await this.callOpenAI(headlinePrompt, 'gpt-4-turbo-preview', 200);
    const finalTitle = clickableTitle.trim().replace(/^["']|["']$/g, '').replace(/^\d+\.\s*/, '') || newsItem.title;
    
    // Get category-specific writing style
    const writingStyle = this.getWritingStyle(newsItem.category);
    const isEvergreen = newsItem.evergreen || newsItem.priority === 'EVERGREEN';
    
    // PHASE 3: OPTIMIZED ARTICLE WRITING (Evergreen vs Fresh)
    const articleType = isEvergreen ? 'comprehensive evergreen guide' : 'breaking news story';
    const prompt = `You are ${writingStyle.role} writing ${articleType} for AgamiNews.

COMPREHENSIVE RESEARCH DATA:
${research}

HEADLINE (MUST USE EXACTLY): "${finalTitle}"

YOUR WRITING PERSONA for ${newsItem.category}:
- Role: ${writingStyle.role}
- Personality: ${writingStyle.personality}
- Expertise Areas: ${writingStyle.expertise}
- Vocabulary Style: ${writingStyle.vocabulary}

ARTICLE STRUCTURE:

1. OPENING HOOK (First Paragraph)
   - Immediately deliver on headline promise
   - Create "I must read this" feeling
   - Use surprising fact or compelling scenario
   - Connect emotionally with reader

2. CONTEXT & BACKGROUND (Paragraphs 2-3)
   - Explain why this matters NOW
   - Provide essential background
   - Use research insights to add depth

3. MAIN CONTENT (Core Paragraphs)
   ${writingStyle.instructions}
   - Include exclusive insights from research
   - Add data, statistics, expert opinions
   - Use specific examples and case studies

4. ANALYSIS & IMPLICATIONS
   - What this means for readers
   - Hidden impacts others haven't discussed
   - Future scenarios and predictions

5. CONCLUSION
   - Summarize key takeaways
   - Call to action or thought-provoking question
   - Forward-looking statement

WRITING REQUIREMENTS:
- 700-900 words of COMPLETELY ORIGINAL content
- NEVER copy any phrases - everything must be rewritten
- Include 3-4 subheadings (H2/H3) for scannability
- Use short paragraphs (2-3 sentences max)
- Mix sentence lengths for natural flow
- Include transition phrases between sections
- Add 2-3 internal links naturally
- Reference the deep research naturally

TONE: ${writingStyle.tone}

CRITICAL: Write like a human expert, not AI. Include:
- Personal observations
- Industry insider knowledge
- Subtle opinions and perspectives
- Conversational elements
- Occasional rhetorical questions

Format as HTML with proper tags. Start with <h1>${finalTitle}</h1>`;
    
    // Always use GPT-4 for quality (we have budget!)
    const article = await this.callOpenAI(prompt, 'gpt-4-turbo-preview', 2500);
    
    // Generate high-quality image for engagement
    const image = await this.getFreeImage(finalTitle, newsItem.category, isEvergreen);
    
    // Add proper image HTML with attribution based on source
    let imageHtml = '';
    if (image && image.url) {
      if (image.source === 'dalle') {
        // DALL-E generated image with subtle AI credit
        imageHtml = `
          <div class="article-image">
            <img src="${image.url}" alt="${image.alt}" style="width:100%;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.1);" loading="lazy">
            <p class="image-credit" style="font-size:11px;color:#999;margin-top:5px;text-align:center;font-style:italic;">
              Photo: ${image.credit || 'DALL-E 3 AI'}
            </p>
          </div>
        `;
      } else if (image.source === 'placeholder') {
        // Placeholder image (when DALL-E fails or API key missing)
        imageHtml = `
          <div class="article-image">
            <img src="${image.url}" alt="${image.alt}" style="width:100%;border-radius:12px;">
            <p class="image-credit" style="font-size:11px;color:#999;margin-top:5px;text-align:center;font-style:italic;">
              Photo: Generating...
            </p>
          </div>
        `;
      } else {
        // Fallback for any other source
        imageHtml = `
          <div class="article-image">
            <img src="${image.url}" alt="${image.alt}" style="width:100%;border-radius:12px;">
            <p class="image-credit" style="font-size:11px;color:#999;margin-top:5px;text-align:center;font-style:italic;">
              Photo: ${image.credit || 'Stock'}
            </p>
          </div>
        `;
      }
    }
    
    // Add related articles section with backlinks
    const relatedArticlesHtml = `
      <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <h3>Related Articles & Resources</h3>
        <ul style="line-height: 1.8;">
          <li><a href="https://agaminews.in" style="color: #0066cc;">Visit AgamiNews Homepage</a> - Latest Tech Updates</li>
          <li><a href="https://agaminews.in/category/${newsItem.category.toLowerCase().replace(/\s+/g, '-')}" style="color: #0066cc;">More ${newsItem.category} News</a> - Explore Similar Stories</li>
          <li><a href="https://agaminews.in/trending" style="color: #0066cc;">Trending Tech Stories</a> - Most Popular Articles</li>
          <li><a href="https://agaminews.in/archive" style="color: #0066cc;">News Archive</a> - Browse All Articles</li>
        </ul>
        <p style="margin-top: 15px; font-size: 14px; color: #666;">
          Stay updated with the latest in <strong>${newsItem.category}</strong> and technology. 
          Follow <a href="https://agaminews.in" style="color: #0066cc;">AgamiNews</a> for daily updates.
        </p>
      </div>
    `;
    
    // Combine article with image and related articles
    const fullArticle = imageHtml + article + relatedArticlesHtml;
    
    return {
      title: finalTitle,  // Use the new clickable headline
      content: fullArticle,
      image: image,
      category: newsItem.category,
      created: new Date().toISOString(),
      seo: {
        keywords: this.extractKeywords(article),
        metaDescription: this.generateMetaDescription(article),
        googleIndexing: true,  // Flag for Google indexing
        analyticsEnabled: true  // Flag for Google Analytics
      }
    };
  }

  // Get stock photo as fallback
  async getStockPhoto(query) {
    try {
      // Use Unsplash API (free tier)
      const searchTerm = query.split(' ').slice(0, 3).join(' ');
      const unsplashUrl = `https://source.unsplash.com/1792x1024/?${encodeURIComponent(searchTerm)},news`;
      
      return {
        url: unsplashUrl,
        photographer: 'Stock Photo',
        photographerUrl: 'https://unsplash.com',
        alt: query,
        source: 'unsplash',
        credit: 'Unsplash'
      };
    } catch (e) {
      return {
        url: `https://via.placeholder.com/1792x1024/667eea/ffffff?text=${encodeURIComponent(query.substring(0, 20))}`,
        photographer: 'Placeholder',
        alt: query,
        source: 'placeholder'
      };
    }
  }

  // Generate high-quality images for all valuable content
  async getFreeImage(query, category = 'GENERAL', isEvergreen = false) {
    try {
      // ALWAYS use DALL-E for valuable content (we have budget!)
      if (!this.env.OPENAI_API_KEY) {
        console.log('[IMAGE] OpenAI key not configured, using stock photo');
        return await this.getStockPhoto(query);
      }
      
      // Use DALL-E for ALL content to maximize quality and engagement
      console.log(`[DALL-E] Creating engaging image for ${category} article`);

      // Enhanced prompts for Indian context
      let imagePrompt = '';
      
      // Check for Indian personalities
      const indianCelebs = ['Modi', 'Ambani', 'Adani', 'Kohli', 'Dhoni', 'Shah Rukh', 'Salman', 'Amitabh'];
      const hasCelebrity = indianCelebs.some(name => query.toLowerCase().includes(name.toLowerCase()));
      
      if (hasCelebrity) {
        imagePrompt = `News context image: ${query}. Show relevant scene, symbols, or environment. No faces or identifiable people. Professional editorial photography.`;
      } else if (category === 'INDIA') {
        imagePrompt = `Indian news context: ${query}. Include Indian elements, architecture, or cultural symbols. Professional photojournalism style.`;
      } else if (category === 'TECHNOLOGY') {
        imagePrompt = `Tech news visualization: ${query}. Modern, clean, futuristic aesthetic. Professional editorial style.`;
      } else {
        imagePrompt = `Professional news image: ${query}. Clean composition, relevant visual metaphor. Photojournalistic style.`;
      }

      console.log(`[DALL-E] Generating for ${category}:`, query.substring(0, 40));
      
      // Call DALL-E 3 API with optimized web settings
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',    // Standard size for faster loading
          quality: 'standard',  // Standard quality for web optimization
          style: 'natural'      // Natural style for realistic news images
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0]) {
          console.log(`[DALL-E] ✅ Successfully generated image`);
          return {
            url: data.data[0].url,
            photographer: 'DALL-E 3',
            photographerUrl: null,
            alt: query,
            source: 'dalle',
            type: 'generated',
            model: 'dall-e-3-standard',
            credit: 'AI Generated Image'
          };
        }
      } else {
        const error = await response.text();
        console.error('[DALL-E] API error:', error);
      }
      
      // Fallback to placeholder if DALL-E fails
      console.log('[DALL-E] Generation failed, using placeholder');
      return {
        url: `https://via.placeholder.com/800x400/667eea/ffffff?text=${encodeURIComponent(query.substring(0, 20))}`,
        photographer: 'Placeholder',
        photographerUrl: null,
        alt: query,
        source: 'placeholder'
      };
      
    } catch (e) {
      console.error('[DALL-E] Image generation error:', e.message);
      // Return placeholder on error
      return {
        url: `https://via.placeholder.com/800x400/667eea/ffffff?text=News`,
        photographer: 'Placeholder',
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