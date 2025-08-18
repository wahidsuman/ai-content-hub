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
}

export class WebScraperService {
  private lastScrapeTime = 0;
  private cacheTimeout = 60 * 60 * 1000; // 1 hour cache
  private cachedTopics: TrendingTopics | null = null;

  constructor() {
    this.refreshTrendingTopics();
    
    // Refresh every 2 hours
    setInterval(() => {
      this.refreshTrendingTopics();
    }, 2 * 60 * 60 * 1000);
  }

  private async refreshTrendingTopics(): Promise<void> {
    try {
      console.log('Refreshing trending topics...');
      
      const trends = await this.scrapeTrendingTopics();
      
      this.cachedTopics = trends;
      this.lastScrapeTime = Date.now();
      
      console.log('✅ Trending topics updated');
    } catch (error) {
      console.error('Failed to refresh trending topics:', error);
      this.cachedTopics = this.getDefaultTopics();
    }
  }

  private async scrapeTrendingTopics(): Promise<TrendingTopics> {
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
    
    return this.shuffleArray(trends).slice(0, 3);
  }

  private generateGadgetTrends(): string[] {
    const trends = [
      'apple vision pro',
      'nvidia rtx 4090',
      'smart watch features',
      'laptop gaming performance',
      'productivity tools 2024',
      'wireless earbuds review',
      'smartphone camera tech',
      'tablet vs laptop',
      'smart home automation',
      'vr headset comparison'
    ];
    
    return this.shuffleArray(trends).slice(0, 3);
  }

  private generateAITrends(): string[] {
    const trends = [
      'ai in healthcare',
      'ai job displacement',
      'google gemini ai',
      'chatgpt updates',
      'llm developments',
      'generative ai tools',
      'ai ethics discussion',
      'machine learning trends',
      'ai automation business',
      'artificial intelligence future'
    ];
    
    return this.shuffleArray(trends).slice(0, 3);
  }

  private generateElectricBikeTrends(): string[] {
    const trends = [
      'battery technology',
      'urban mobility',
      'eco commuting',
      'e-bike reviews 2024',
      'electric bicycle comparison',
      'sustainable transport',
      'bike sharing programs',
      'electric scooter vs bike',
      'commuter e-bike guide',
      'long range e-bikes'
    ];
    
    return this.shuffleArray(trends).slice(0, 3);
  }

  private generateElectricCarTrends(): string[] {
    const trends = [
      'Tesla updates',
      'EV charging network',
      'battery innovation',
      'electric vehicle range',
      'EV market growth',
      'charging infrastructure',
      'electric car tax incentives',
      'EV vs gas comparison',
      'autonomous driving',
      'green transportation'
    ];
    
    return this.shuffleArray(trends).slice(0, 3);
  }

  private shuffleArray<T>(array: T[]): T[] {
