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
      
      // Get RECENT news (last 24 hours) - Adjusted for 15/day
      const recentIndiaNews = indiaData.data.children
        .slice(0, 5)  // 5 recent India news
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

    // Ensure exactly 15 articles per day
    console.log(`[FETCH] Total articles fetched: ${allNews.length}`);
    
    // Shuffle for variety and return exactly 15
    const shuffled = allNews.sort(() => Math.random() - 0.5);
    const finalArticles = shuffled.slice(0, 15);
    
    console.log(`[FETCH] Returning ${finalArticles.length} articles for daily quota`);
    return finalArticles;
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
    const headlinePrompt = `You are a MASTER of viral headlines that get MILLIONS of clicks.

ORIGINAL NEWS: "${newsItem.title}"
CATEGORY: ${newsItem.category}
KEY RESEARCH INSIGHTS: ${research.substring(0, 400)}

🔥 CREATE THE MOST IRRESISTIBLE HEADLINES using these PROVEN VIRAL FORMULAS:

1. SHOCKING REVELATION: "[Celebrity/Leader] EXPOSED: The Secret [Action/Plan] That..."
   Make it: SHOCKING + EXCLUSIVE + URGENT

2. BREAKING NEWS HOOK: "BREAKING: [Celebrity/Company] Just [Dramatic Action] - Internet Goes CRAZY"
   Make it: IMMEDIATE + DRAMATIC + SOCIAL PROOF

3. WARNING/ALERT: "⚠️ WARNING: [Topic] Could [Consequence] - Experts Say 'Act NOW'"
   Make it: URGENT + AUTHORITATIVE + ACTIONABLE

4. UNBELIEVABLE TWIST: "Plot Twist: [Common Belief] Was WRONG - [Shocking Truth] Revealed"
   Make it: CONTRADICTORY + SURPRISING + DEFINITIVE

5. EXCLUSIVE INSIDE INFO: "LEAKED: Inside [Celebrity/Company]'s [Secret Plan] - 'This Changes EVERYTHING'"
   Make it: EXCLUSIVE + INSIDER + GAME-CHANGING

🔥 CLICKBAIT POWER WORDS (USE 3-4 PER HEADLINE):
⚡ URGENT: BREAKING, JUST NOW, HAPPENING, ALERT, EMERGENCY
😱 SHOCKING: EXPOSED, BUSTED, CAUGHT, LEAKED, REVEALED
💥 DRAMATIC: EXPLOSIVE, BOMBSHELL, INSANE, DESTROYS, SLAMS
🎯 EXCLUSIVE: SECRET, HIDDEN, INSIDER, BEHIND-THE-SCENES
💰 VALUE: MILLIONS, BILLIONS, MASSIVE, HUGE, RECORD-BREAKING

CATEGORY-SPECIFIC VIRAL ANGLES for ${newsItem.category}:
${headlineStyle.guidelines}

MAXIMUM CLICKABILITY FORMULA:
✅ [POWER WORD] + [CELEBRITY/COMPANY] + [DRAMATIC ACTION] + [CONSEQUENCE]
✅ Example: "BREAKING: Modi's SHOCKING Decision Leaves Opposition STUNNED"
✅ Example: "LEAKED: Ambani's SECRET Plan That Could Change India FOREVER"
✅ Example: "Kohli DESTROYS Critics With INSANE Performance - Fans Go WILD"

PSYCHOLOGICAL TRIGGERS TO ACTIVATE:
- FOMO: "Everyone's Talking About..." / "You're Missing Out On..."
- CURIOSITY GAP: "The REAL Reason..." / "What They're NOT Telling You..."
- SOCIAL PROOF: "Millions Are..." / "Internet Can't Stop..."
- AUTHORITY: "Experts SHOCKED..." / "Officials CONFIRM..."
- CONTROVERSY: "Sparks OUTRAGE..." / "Divides Nation..."

Create 5 ULTRA-VIRAL headlines, then pick the ABSOLUTE MOST CLICKABLE one.
- Accuracy (1-10)

Return ONLY the best headline.`;

    const clickableTitle = await this.callOpenAI(headlinePrompt, 'gpt-4-turbo-preview', 200);
    console.log('[HEADLINE TEST] Generated headline:', clickableTitle);
    const finalTitle = clickableTitle.trim().replace(/^["']|["']$/g, '').replace(/^\d+\.\s*/, '') || newsItem.title;
    console.log('[HEADLINE VERIFY] Final headline:', finalTitle);
    
    // Get category-specific writing style
    const writingStyle = this.getWritingStyle(newsItem.category);
    
    // PHASE 3: OPTIMIZED ARTICLE WRITING (Evergreen vs Fresh)
    const articleType = isEvergreen ? 'comprehensive evergreen guide' : 'breaking news story';
    const prompt = `You are ${writingStyle.role} writing ${articleType} for AgamiNews.

COMPREHENSIVE RESEARCH DATA:
${research}

HEADLINE (MUST USE EXACTLY): "${finalTitle}"

🔥 CRITICAL: CURIOSITY-DRIVEN QUESTIONS THROUGHOUT:
1. **START with a HOOK QUESTION** - Open the article with an intriguing question that makes readers want to know more
2. **USE QUESTION SUB-HEADINGS** - Format sections as questions (e.g., "Why Is This Happening Now?", "What Does This Mean for You?")
3. **SPRINKLE RHETORICAL QUESTIONS** - Add 3-4 rhetorical questions between paragraphs to maintain engagement
4. **INCLUDE THOUGHT-PROVOKING QUESTIONS** - Use "Have you ever wondered...", "What if...", "Could this mean..." to spark curiosity
5. **END with an OPEN QUESTION** - Close with a question that encourages readers to think deeper or share their opinion
6. **CONVERSATIONAL TONE** - Write as if you're having an engaging conversation with the reader

YOUR WRITING PERSONA for ${newsItem.category}:
- Role: ${writingStyle.role}
- Personality: ${writingStyle.personality}
- Expertise Areas: ${writingStyle.expertise}
- Vocabulary Style: ${writingStyle.vocabulary}

ARTICLE STRUCTURE WITH QUESTIONS:

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

      // For famous personalities - Create edited/composite images with DALL-E
      // We'll include them in the scene rather than using stock photos
      const celebrities = {
        // Indian Politicians
        'modi': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Official_Photograph_of_Prime_Minister_Narendra_Modi_Portrait.png',
        'narendra modi': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Official_Photograph_of_Prime_Minister_Narendra_Modi_Portrait.png',
        'pm modi': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Official_Photograph_of_Prime_Minister_Narendra_Modi_Portrait.png',
        'rahul gandhi': 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Rahul_Gandhi_2024.jpg',
        'amit shah': 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Amit_Shah_2019.jpg',
        'yogi adityanath': 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Yogi_Adityanath_2023.jpg',
        'arvind kejriwal': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Arvind_Kejriwal_2023.jpg',
        'mamata banerjee': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Mamata_Banerjee_2023.jpg',
        
        // Indian Business
        'mukesh ambani': 'https://upload.wikimedia.org/wikipedia/commons/6/69/Mukesh_Ambani.jpg',
        'gautam adani': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Gautam_Adani.jpg',
        'ratan tata': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Ratan_Tata_2023.jpg',
        
        // Indian Cricketers
        'virat kohli': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Virat_Kohli_2023.jpg',
        'ms dhoni': 'https://upload.wikimedia.org/wikipedia/commons/7/70/MS_Dhoni_2023.jpg',
        'rohit sharma': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Rohit_Sharma_2023.jpg',
        'sachin tendulkar': 'https://upload.wikimedia.org/wikipedia/commons/2/25/Sachin_Tendulkar_2023.jpg',
        
        // Bollywood
        'shah rukh khan': 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Shah_Rukh_Khan_2023.jpg',
        'salman khan': 'https://upload.wikimedia.org/wikipedia/commons/8/86/Salman_Khan_2023.jpg',
        'amitabh bachchan': 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Amitabh_Bachchan_2023.jpg',
        'deepika padukone': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Deepika_Padukone_2023.jpg',
        'alia bhatt': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Alia_Bhatt_2023.jpg',
        'priyanka chopra': 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Priyanka_Chopra_2023.jpg',
        
        // International Tech
        'elon musk': 'https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_2023.jpg',
        'sundar pichai': 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Sundar_Pichai_2023.png',
        'satya nadella': 'https://upload.wikimedia.org/wikipedia/commons/7/78/MS-Exec-Nadella-Satya.jpg',
        
        // International Politics
        'joe biden': 'https://upload.wikimedia.org/wikipedia/commons/6/68/Joe_Biden_presidential_portrait.jpg',
        'donald trump': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
        'vladimir putin': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Vladimir_Putin_2023.jpg',
        'xi jinping': 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Xi_Jinping_2023.jpg',
        
        // More Indian Politicians
        'nitin gadkari': 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Nitin_Gadkari_2023.jpg',
        'rajnath singh': 'https://upload.wikimedia.org/wikipedia/commons/7/78/Rajnath_Singh_2023.jpg',
        'nirmala sitharaman': 'https://upload.wikimedia.org/wikipedia/commons/7/78/Nirmala_Sitharaman_2023.jpg',
        'shashi tharoor': 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Shashi_Tharoor_2023.jpg',
        'smriti irani': 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Smriti_Irani_2023.jpg',
        'piyush goyal': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Piyush_Goyal_2023.jpg',
        'jaishankar': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/S_Jaishankar_2023.jpg',
        's jaishankar': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/S_Jaishankar_2023.jpg',
        'uddhav thackeray': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Uddhav_Thackeray_2023.jpg',
        'sharad pawar': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Sharad_Pawar_2023.jpg',
        'akhilesh yadav': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Akhilesh_Yadav_2023.jpg',
        'mayawati': 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Mayawati_2023.jpg',
        'tejashwi yadav': 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Tejashwi_Yadav_2023.jpg',
        'nitish kumar': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Nitish_Kumar_2023.jpg',
        'himanta biswa sarma': 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Himanta_Biswa_Sarma_2023.jpg',
        'mk stalin': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/MK_Stalin_2023.jpg',
        'pinarayi vijayan': 'https://upload.wikimedia.org/wikipedia/commons/8/85/Pinarayi_Vijayan_2023.jpg',
        'naveen patnaik': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Naveen_Patnaik_2023.jpg',
        'ashok gehlot': 'https://upload.wikimedia.org/wikipedia/commons/9/97/Ashok_Gehlot_2023.jpg',
        
        // More Indian Business Leaders
        'nita ambani': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Nita_Ambani_2023.jpg',
        'azim premji': 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Azim_Premji_2023.jpg',
        'shiv nadar': 'https://upload.wikimedia.org/wikipedia/commons/4/48/Shiv_Nadar_2023.jpg',
        'cyrus mistry': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Cyrus_Mistry_2023.jpg',
        'kumar mangalam birla': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Kumar_Mangalam_Birla_2023.jpg',
        'anand mahindra': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Anand_Mahindra_2023.jpg',
        'uday kotak': 'https://upload.wikimedia.org/wikipedia/commons/3/31/Uday_Kotak_2023.jpg',
        'radhakishan damani': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Radhakishan_Damani_2023.jpg',
        'dilip shanghvi': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Dilip_Shanghvi_2023.jpg',
        
        // More Bollywood Celebrities
        'ranveer singh': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Ranveer_Singh_2023.jpg',
        'ranbir kapoor': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Ranbir_Kapoor_2023.jpg',
        'katrina kaif': 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Katrina_Kaif_2023.jpg',
        'kareena kapoor': 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Kareena_Kapoor_2023.jpg',
        'akshay kumar': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Akshay_Kumar_2023.jpg',
        'ajay devgn': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Ajay_Devgn_2023.jpg',
        'hrithik roshan': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Hrithik_Roshan_2023.jpg',
        'anushka sharma': 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Anushka_Sharma_2023.jpg',
        'varun dhawan': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Varun_Dhawan_2023.jpg',
        'tiger shroff': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Tiger_Shroff_2023.jpg',
        'shraddha kapoor': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Shraddha_Kapoor_2023.jpg',
        'vidya balan': 'https://upload.wikimedia.org/wikipedia/commons/6/66/Vidya_Balan_2023.jpg',
        'taapsee pannu': 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Taapsee_Pannu_2023.jpg',
        'ayushmann khurrana': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Ayushmann_Khurrana_2023.jpg',
        'kartik aaryan': 'https://upload.wikimedia.org/wikipedia/commons/5/58/Kartik_Aaryan_2023.jpg',
        
        // More Sports Personalities
        'hardik pandya': 'https://upload.wikimedia.org/wikipedia/commons/4/49/Hardik_Pandya_2023.jpg',
        'jasprit bumrah': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Jasprit_Bumrah_2023.jpg',
        'kl rahul': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/KL_Rahul_2023.jpg',
        'rishabh pant': 'https://upload.wikimedia.org/wikipedia/commons/4/49/Rishabh_Pant_2023.jpg',
        'ravindra jadeja': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Ravindra_Jadeja_2023.jpg',
        'shikhar dhawan': 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Shikhar_Dhawan_2023.jpg',
        'pv sindhu': 'https://upload.wikimedia.org/wikipedia/commons/5/5b/PV_Sindhu_2023.jpg',
        'mary kom': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Mary_Kom_2023.jpg',
        'neeraj chopra': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Neeraj_Chopra_2023.jpg',
        'sunil chhetri': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Sunil_Chhetri_2023.jpg',
        'saina nehwal': 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Saina_Nehwal_2023.jpg',
        'kidambi srikanth': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Kidambi_Srikanth_2023.jpg',
        
        // South Indian Film Stars
        'rajinikanth': 'https://upload.wikimedia.org/wikipedia/commons/9/95/Rajinikanth_2023.jpg',
        'kamal haasan': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Kamal_Haasan_2023.jpg',
        'vijay': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Vijay_2023.jpg',
        'ajith kumar': 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Ajith_Kumar_2023.jpg',
        'mahesh babu': 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Mahesh_Babu_2023.jpg',
        'allu arjun': 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Allu_Arjun_2023.jpg',
        'ram charan': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Ram_Charan_2023.jpg',
        'prabhas': 'https://upload.wikimedia.org/wikipedia/commons/5/53/Prabhas_2023.jpg',
        'jr ntr': 'https://upload.wikimedia.org/wikipedia/commons/8/84/Jr_NTR_2023.jpg',
        'suriya': 'https://upload.wikimedia.org/wikipedia/commons/1/17/Suriya_2023.jpg',
        'dhanush': 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Dhanush_2023.jpg',
        'yash': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Yash_2023.jpg'
      };
      
      // Check if any celebrity is mentioned - Generate edited scene with them
      const queryLower = query.toLowerCase();
      let celebrityFound = null;
      
      // Check for celebrity names
      const celebrityNames = [
        'modi', 'narendra modi', 'rahul gandhi', 'amit shah', 'kejriwal',
        'virat kohli', 'ms dhoni', 'rohit sharma', 'hardik pandya', 'bumrah',
        'shah rukh khan', 'salman khan', 'amitabh bachchan', 'deepika', 'alia bhatt',
        'mukesh ambani', 'gautam adani', 'ratan tata', 'elon musk', 'sundar pichai',
        'rajinikanth', 'vijay', 'mahesh babu', 'allu arjun', 'prabhas'
      ];
      
      for (const celeb of celebrityNames) {
        if (queryLower.includes(celeb)) {
          celebrityFound = celeb;
          break;
        }
      }
      
      // Generate PHOTOREALISTIC images - Include celebrities if mentioned
      let imagePrompt = '';
      
      if (celebrityFound) {
        // Include the celebrity in a realistic edited scene
        const celebrityTitle = celebrityFound.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        if (category === 'INDIA' || celebrityFound.includes('modi') || celebrityFound.includes('gandhi')) {
          imagePrompt = `ULTRA-PHOTOREALISTIC edited news photograph showing ${celebrityTitle} in action: ${query}. Professional composite image, person integrated into relevant scene, authentic Indian political context, press conference or parliament setting, natural lighting, HIGH QUALITY PHOTO EDITING, person's face clearly visible and recognizable, NO cartoon, NO illustration. News agency quality, Reuters/AP style.`;
        } else if (category === 'SPORTS' || ['kohli', 'dhoni', 'rohit', 'hardik', 'bumrah'].some(n => celebrityFound.includes(n))) {
          imagePrompt = `ULTRA-PHOTOREALISTIC edited sports photograph showing ${celebrityTitle} in cricket action: ${query}. Professional composite image, cricketer in stadium setting, batting/bowling/fielding pose, crowd in background, dynamic action shot, person clearly visible, NO cartoon, NO illustration. ESPN/Sports Illustrated quality.`;
        } else if (category === 'ENTERTAINMENT' || ['shah rukh', 'salman', 'amitabh', 'deepika', 'alia'].some(n => celebrityFound.includes(n))) {
          imagePrompt = `ULTRA-PHOTOREALISTIC edited entertainment photograph showing ${celebrityTitle} at premiere/event: ${query}. Professional composite image, celebrity at red carpet or film event, glamorous setting, paparazzi style, person clearly recognizable, NO cartoon, NO illustration. Vogue/Filmfare quality.`;
        } else if (category === 'BUSINESS' || ['ambani', 'adani', 'tata'].some(n => celebrityFound.includes(n))) {
          imagePrompt = `ULTRA-PHOTOREALISTIC edited business photograph showing ${celebrityTitle} in corporate setting: ${query}. Professional composite image, business leader in boardroom or conference, formal attire, corporate environment, person clearly visible, NO cartoon, NO illustration. Forbes/Fortune magazine quality.`;
        } else {
          imagePrompt = `ULTRA-PHOTOREALISTIC edited photograph showing ${celebrityTitle}: ${query}. Professional composite image with person integrated into relevant scene, natural lighting, person's features clearly visible and recognizable, NO cartoon, NO illustration, NO artistic effects. High-end magazine quality photo editing.`;
        }
      } else {
        // No celebrity - standard photorealistic prompts
        if (category === 'INDIA') {
          imagePrompt = `PHOTOREALISTIC news photograph: ${query}. Professional photojournalism, real-world scene, authentic Indian context, natural lighting, documentary style, NO cartoon, NO illustration, NO artistic rendering. Shot with DSLR camera, Reuters quality.`;
        } else if (category === 'TECHNOLOGY') {
          imagePrompt = `PHOTOREALISTIC technology photograph: ${query}. Real-world tech environment, actual devices and equipment, professional photography, clean modern setting, natural lighting, NO cartoon, NO illustration. Wired magazine quality.`;
        } else if (category === 'BUSINESS') {
          imagePrompt = `PHOTOREALISTIC business photograph: ${query}. Professional corporate environment, real office or market setting, authentic business context, natural lighting, NO cartoon, NO illustration. Bloomberg quality.`;
        } else if (category === 'SPORTS') {
          imagePrompt = `PHOTOREALISTIC sports photograph: ${query}. Actual sports action, real stadium or field, authentic athletic moment, dynamic composition, NO cartoon, NO illustration. Sports Illustrated quality.`;
        } else if (category === 'ENTERTAINMENT') {
          imagePrompt = `PHOTOREALISTIC entertainment photograph: ${query}. Real entertainment venue, authentic scene, professional event photography, natural lighting, NO cartoon, NO illustration. Hollywood Reporter quality.`;
        } else {
          imagePrompt = `PHOTOREALISTIC news photograph: ${query}. Professional photojournalism, real-world scene, authentic context, natural lighting, documentary style, NO cartoon, NO illustration, NO artistic effects. Associated Press quality.`;
        }
      }

      console.log(`[DALL-E] Generating photorealistic image for ${category}:`, query.substring(0, 40));
      console.log('[IMAGE VERIFY] Using prompt:', imagePrompt.substring(0, 200));
      
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
          quality: 'standard',  // Standard quality (NOT HD) for fast page load
          style: 'natural'      // Natural style ensures photorealistic output
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
export { AIWebsiteManager as AIManager }; // Alias for compatibility