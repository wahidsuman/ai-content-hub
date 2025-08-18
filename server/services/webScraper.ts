interface TrendingTopics {
  crypto: string[];
  gadgets: string[];
  ai: string[];
  electricBikes: string[];
  electricCars: string[];
}

interface NewsItem {
  title: string;
  url: string;
  keywords: string[];
  category: string;
  publishedAt?: Date;
  source?: string;
  summary?: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercentage: number;
  volume: number;
  marketCap?: number;
  lastUpdated: Date;
}

interface ScrapingSource {
  name: string;
  url: string;
  category: string[];
  active: boolean;
}

export class WebScraperService {
  private lastScrapeTime = 0;
  private cacheTimeout = 60 * 60 * 1000; // 1 hour cache
  private cachedTopics: TrendingTopics | null = null;
  private scrapingSources: ScrapingSource[] = [];
  private marketDataCache = new Map<string, MarketData>();
  private newsCache = new Map<string, NewsItem[]>();

  constructor() {
    this.initializeScrapingSources();
    this.refreshTrendingTopics();
    
    // Refresh trending topics every 2 hours
    setInterval(() => {
      this.refreshTrendingTopics();
    }, 2 * 60 * 60 * 1000);
    
    // Clean caches every 6 hours
    setInterval(() => {
      this.cleanCaches();
    }, 6 * 60 * 60 * 1000);
  }

  private async refreshTrendingTopics(): Promise<void> {
    try {
      console.log('Refreshing trending topics...');
      
      // Simulate web scraping for trending topics
      // In a real implementation, you would scrape from actual news sites
      const trends = await this.scrapeTrendingTopics();
      
      this.cachedTopics = trends;
      this.lastScrapeTime = Date.now();
      
      console.log('✅ Trending topics updated');
    } catch (error) {
      console.error('Failed to refresh trending topics:', error);
      
      // Fallback to default topics if scraping fails
      this.cachedTopics = this.getDefaultTopics();
    }
  }

  private async scrapeTrendingTopics(): Promise<TrendingTopics> {
    // Generate trending topics for all categories
    const cryptoTrends = this.generateCryptoTrends();
    const gadgetTrends = this.generateGadgetTrends();
    const aiTrends = this.generateAITrends();
    const electricBikeTrends = this.generateElectricBikeTrends();
    const electricCarTrends = this.generateElectricCarTrends();

    return {
      crypto: cryptoTrends,
      gadgets: gadgetTrends,
      ai: aiTrends,
      electricBikes: electricBikeTrends,
      electricCars: electricCarTrends
    };
  }

  private generateCryptoTrends(): string[] {
    const trends = [
      'bitcoin etf approval',
      'ethereum 2.0 staking',
      'defi yield farming',
      'nft marketplace growth',
      'crypto regulation updates',
      'blockchain scalability',
      'altcoin season',
      'institutional crypto adoption',
      'crypto tax implications',
      'layer 2 solutions'
    ];

    // Return random 3-5 trending topics
    const count = Math.floor(Math.random() * 3) + 3;
    return this.shuffleArray(trends).slice(0, count);
  }

  private generateGadgetTrends(): string[] {
    const trends = [
      'apple vision pro',
      'nvidia rtx 4090', 
      'smart watch features',
      'laptop',
      'gaming',
      'productivity',
      'iphone 15 pro review',
      'samsung galaxy s24',
      'gaming laptop 2024',
      'wireless earbuds comparison',
      'foldable phone technology',
      'tablet vs laptop comparison',
      'smart home automation',
      'vr headset comparison',
      'mechanical keyboard guide',
      'monitor buying guide',
      '5g smartphone features',
      'drone technology 2024'
    ];

    const count = Math.floor(Math.random() * 3) + 3;
    return this.shuffleArray(trends).slice(0, count);
  }

  private generateAITrends(): string[] {
    const trends = [
      'ai in healthcare',
      'ai job displacement', 
      'google gemini ai',
      'chatgpt',
      'llm',
      'generative ai',
      'chatgpt 4 turbo',
      'ai image generation',
      'machine learning breakthrough',
      'ai coding assistant',
      'autonomous vehicle ai',
      'ai ethics debate',
      'generative ai tools',
      'artificial intelligence future',
      'neural networks',
      'deep learning applications',
      'ai automation business',
      'computer vision advances',
      'natural language processing',
      'ai safety research'
    ];

    const count = Math.floor(Math.random() * 3) + 3;
    return this.shuffleArray(trends).slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateElectricBikeTrends(): string[] {
    const trends = [
      'battery technology',
      'urban mobility',
      'eco commuting',
      'e-bike reviews',
      'electric bicycle',
      'sustainable transport',
      'e-bike battery life',
      'electric bike conversion',
      'commuter e-bike guide',
      'mountain e-bike reviews',
      'e-bike maintenance tips',
      'electric scooter vs bike',
      'bike sharing programs',
      'long range e-bikes',
      'folding electric bikes',
      'cargo e-bike reviews',
      'e-bike motor comparison',
      'electric bike laws'
    ];

    const count = Math.floor(Math.random() * 3) + 3;
    return this.shuffleArray(trends).slice(0, count);
  }

  private generateElectricCarTrends(): string[] {
    const trends = [
      'Tesla updates',
      'EV charging network', 
      'battery innovation',
      'altcoin',
      'trading',
      'market analysis',
      'electric vehicle range',
      'EV market growth',
      'charging infrastructure',
      'electric car tax incentives',
      'EV vs gas comparison',
      'autonomous driving',
      'green transportation',
      'tesla model 3 review',
      'rivian truck updates',
      'lucid air performance',
      'nio battery swap',
      'ford lightning review',
      'ev charging speed',
      'solid state batteries'
    ];

    const count = Math.floor(Math.random() * 3) + 3;
    return this.shuffleArray(trends).slice(0, count);
  }

  private initializeScrapingSources(): void {
    this.scrapingSources = [
      {
        name: 'CoinDesk',
        url: 'https://www.coindesk.com',
        category: ['crypto'],
        active: true
      },
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com',
        category: ['gadgets', 'ai'],
        active: true
      },
      {
        name: 'The Verge',
        url: 'https://www.theverge.com',
        category: ['gadgets', 'ai', 'electricCars'],
        active: true
      },
      {
        name: 'VentureBeat',
        url: 'https://venturebeat.com',
        category: ['ai'],
        active: true
      },
      {
        name: 'ElectricBike.com',
        url: 'https://electricbike.com',
        category: ['electricBikes'],
        active: true
      },
      {
        name: 'InsideEVs',
        url: 'https://insideevs.com',
        category: ['electricCars'],
        active: true
      }
    ];
  }

  private cleanCaches(): void {
    console.log('Cleaning old cache data...');
    this.newsCache.clear();
    this.marketDataCache.clear();
  }

  private getDefaultTopics(): TrendingTopics {
    return {
      crypto: ['bitcoin', 'ethereum', 'defi'],
      gadgets: ['laptop', 'gaming', 'productivity'],
      ai: ['chatgpt', 'llm', 'generative ai'],
      electricBikes: ['e-bike reviews', 'electric bicycle', 'sustainable transport'],
      electricCars: ['Tesla updates', 'EV charging network', 'battery innovation']
    };
  }

  public async getTrendingTopics(): Promise<TrendingTopics> {
    // Return cached topics if available and not expired
    if (this.cachedTopics && (Date.now() - this.lastScrapeTime) < this.cacheTimeout) {
      return this.cachedTopics;
    }

    // Refresh if cache is expired
    await this.refreshTrendingTopics();
    return this.cachedTopics || this.getDefaultTopics();
  }

  public async searchNews(query: string, category: string): Promise<NewsItem[]> {
    try {
      const cacheKey = `${category}-${query}`;
      
      // Check cache first
      if (this.newsCache.has(cacheKey)) {
        return this.newsCache.get(cacheKey)!;
      }

      // In production, integrate with real news APIs:
      // - NewsAPI.org
      // - Google News API
      // - Bing News Search API
      
      const mockNews: NewsItem[] = [
        {
          title: `Breaking: ${query} market analysis reveals new trends`,
          url: `https://news.example.com/${category}/${query.replace(/\s+/g, '-')}-analysis`,
          keywords: [...query.split(' '), 'analysis', 'trends', 'market'],
          category,
          publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          source: 'TechNews Daily',
          summary: `Comprehensive analysis of ${query} showing significant developments in the ${category} sector.`
        },
        {
          title: `${query}: What experts are saying about recent developments`,
          url: `https://expert.news.com/${category}/${query.replace(/\s+/g, '-')}-expert-opinion`,
          keywords: [...query.split(' '), 'expert', 'opinion', 'developments'],
          category,
          publishedAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
          source: 'Industry Insider',
          summary: `Industry experts weigh in on the latest ${query} developments and their implications.`
        },
        {
          title: `${query} innovation spotlight: Top 5 breakthrough technologies`,
          url: `https://innovation.tech.com/${category}/${query.replace(/\s+/g, '-')}-innovations`,
          keywords: [...query.split(' '), 'innovation', 'technology', 'breakthrough'],
          category,
          publishedAt: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
          source: 'Innovation Weekly',
          summary: `Exploring the top 5 breakthrough technologies in ${query} that are shaping the future.`
        },
        {
          title: `Market update: ${query} sees significant growth this quarter`,
          url: `https://market.reports.com/${category}/${query.replace(/\s+/g, '-')}-growth`,
          keywords: [...query.split(' '), 'market', 'growth', 'quarterly'],
          category,
          publishedAt: new Date(Date.now() - Math.random() * 3 * 60 * 60 * 1000),
          source: 'Market Reports Pro',
          summary: `Quarterly analysis shows significant growth patterns in ${query} sector.`
        }
      ];

      // Cache the results
      this.newsCache.set(cacheKey, mockNews);
      
      // Auto-expire cache after 2 hours
      setTimeout(() => {
        this.newsCache.delete(cacheKey);
      }, 2 * 60 * 60 * 1000);

      return mockNews;
    } catch (error) {
      console.error('News search failed:', error);
      return [];
    }
  }

  public async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      // Check cache first
      if (this.marketDataCache.has(symbol)) {
        const cached = this.marketDataCache.get(symbol)!;
        // Return cached data if less than 5 minutes old
        if (Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) {
          return cached;
        }
      }

      // In production, integrate with real market data APIs:
      // - CoinGecko API (for crypto)
      // - Alpha Vantage (for stocks)
      // - Yahoo Finance API
      // - IEX Cloud API
      
      const basePrice = this.getBasePrice(symbol);
      const change = (Math.random() - 0.5) * basePrice * 0.1;
      const changePercentage = (change / basePrice) * 100;
      
      const marketData: MarketData = {
        symbol: symbol.toUpperCase(),
        price: basePrice + change,
        change24h: change,
        changePercentage: changePercentage,
        volume: Math.random() * 10000000,
        marketCap: symbol.startsWith('BTC') || symbol.startsWith('ETH') ? 
                   Math.random() * 500000000000 : 
                   Math.random() * 100000000000,
        lastUpdated: new Date()
      };

      // Cache the data
      this.marketDataCache.set(symbol, marketData);

      return marketData;
    } catch (error) {
      console.error('Market data fetch failed:', error);
      return null;
    }
  }

  private getBasePrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'BTC': 45000,
      'ETH': 2500,
      'ADA': 0.45,
      'SOL': 85,
      'DOT': 6.5,
      'LINK': 14,
      'AAPL': 180,
      'GOOGL': 140,
      'TSLA': 220,
      'NVDA': 480,
      'MSFT': 375
    };
    
    return basePrices[symbol.toUpperCase()] || Math.random() * 100;
  }

  public async getContentSuggestions(category: string): Promise<string[]> {
    try {
      const trendingTopics = await this.getTrendingTopics();
      const categoryTopics = (trendingTopics as any)[category] || [];
      
      // Generate additional content suggestions based on category
      const suggestions = [...categoryTopics];
      
      switch (category) {
        case 'crypto':
          suggestions.push(
            'cryptocurrency regulations 2024',
            'bitcoin halving impact',
            'defi protocols comparison',
            'nft market trends'
          );
          break;
        case 'gadgets':
          suggestions.push(
            'smartphone photography tips',
            'laptop buying guide 2024',
            'gaming setup essentials',
            'smart home security'
          );
          break;
        case 'ai':
          suggestions.push(
            'ai productivity tools',
            'machine learning careers',
            'ai ethics guidelines',
            'chatbot development'
          );
          break;
        case 'electricBikes':
          suggestions.push(
            'e-bike commuting benefits',
            'electric bike safety tips',
            'e-bike battery care',
            'urban mobility solutions'
          );
          break;
        case 'electricCars':
          suggestions.push(
            'EV road trip planning',
            'electric vehicle incentives',
            'home charging setup',
            'EV maintenance guide'
          );
          break;
      }
      
      return this.shuffleArray(suggestions).slice(0, 8);
    } catch (error) {
      console.error('Failed to get content suggestions:', error);
      return [];
    }
  }

  public getScrapingSources(): ScrapingSource[] {
    return this.scrapingSources.filter(source => source.active);
  }

  public updateSourceStatus(sourceName: string, active: boolean): void {
    const source = this.scrapingSources.find(s => s.name === sourceName);
    if (source) {
      source.active = active;
    }
  }
}

export const webScraperService = new WebScraperService();
