import { storage } from "../storage";
import type { Post } from "@shared/schema";

interface SeoAuditResult {
  totalPosts: number;
  averageSeoScore: number;
  postsNeedingImprovement: number;
  topPerformers: Array<{
    id: string;
    title: string;
    seoScore: number;
    views: number;
  }>;
  recommendations: string[];
  categoryBreakdown: { [key: string]: number };
}

interface SeoMetrics {
  totalViews: number;
  totalRevenue: number;
  avgSeoScore: number;
  contentGaps: string[];
  topKeywords: string[];
}

interface OptimizationSuggestion {
  postId: string;
  currentScore: number;
  suggestions: string[];
  potentialScore: number;
}

export class SeoManager {
  private auditInProgress = false;

  constructor() {
    this.startDailySeoAudit();
  }

  private startDailySeoAudit() {
    // Run audit on startup
    setTimeout(() => {
      this.performSeoAudit();
    }, 10000); // Wait 10 seconds after startup

    // Schedule daily audit at 2:00 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    const msUntilAudit = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.performSeoAudit();
      
      // Then repeat every 24 hours
      setInterval(() => {
        this.performSeoAudit();
      }, 24 * 60 * 60 * 1000);
    }, msUntilAudit);
  }

  async performSeoAudit(): Promise<SeoAuditResult> {
    if (this.auditInProgress) {
      console.log('SEO audit already in progress...');
      throw new Error('SEO audit already in progress');
    }

    this.auditInProgress = true;
    
    try {
      console.log('Starting daily SEO audit...');
      
      const posts = await storage.getAllPosts();
      const publishedPosts = posts.filter(post => post.status === 'published');

      if (publishedPosts.length === 0) {
        console.log('✅ Daily SEO audit completed');
        return {
          totalPosts: 0,
          averageSeoScore: 0,
          postsNeedingImprovement: 0,
          topPerformers: [],
          recommendations: ['No published posts to audit'],
          categoryBreakdown: {}
        };
      }

      const totalScore = publishedPosts.reduce((sum, post) => sum + (post.seoScore || 0), 0);
      const averageSeoScore = Math.round(totalScore / publishedPosts.length);
      
      const postsNeedingImprovement = publishedPosts.filter(post => 
        (post.seoScore || 0) < 70
      ).length;

      const topPerformers = publishedPosts
        .filter(post => (post.seoScore || 0) >= 80)
        .sort((a, b) => (b.seoScore || 0) - (a.seoScore || 0))
        .slice(0, 5)
        .map(post => ({
          id: post.id,
          title: post.title,
          seoScore: post.seoScore || 0,
          views: post.views || 0
        }));

      const categoryBreakdown = this.calculateCategoryBreakdown(publishedPosts);
      const recommendations = this.generateRecommendations(publishedPosts);

      const result: SeoAuditResult = {
        totalPosts: publishedPosts.length,
        averageSeoScore,
        postsNeedingImprovement,
        topPerformers,
        recommendations,
        categoryBreakdown
      };

      console.log('✅ Daily SEO audit completed');
      return result;

    } catch (error) {
      console.error('SEO audit failed:', error);
      throw error;
    } finally {
      this.auditInProgress = false;
    }
  }

  private calculateCategoryBreakdown(posts: Post[]): { [key: string]: number } {
    const breakdown: { [key: string]: number } = {};
    
    posts.forEach(post => {
      const category = post.category || 'uncategorized';
      if (!breakdown[category]) {
        breakdown[category] = 0;
      }
      breakdown[category] += post.seoScore || 0;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(category => {
      const categoryPosts = posts.filter(p => p.category === category);
      breakdown[category] = Math.round(breakdown[category] / categoryPosts.length);
    });

    return breakdown;
  }

  private generateRecommendations(posts: Post[]): string[] {
    const recommendations: string[] = [];
    
    const lowScorePosts = posts.filter(post => (post.seoScore || 0) < 60).length;
    const missingMetaDesc = posts.filter(post => !post.metaDescription || post.metaDescription.length < 120).length;
    const shortContent = posts.filter(post => post.content.length < 800).length;
    const noImages = posts.filter(post => !post.imageUrl).length;
    const fewKeywords = posts.filter(post => !post.keywords || post.keywords.length < 3).length;

    if (lowScorePosts > 0) {
      recommendations.push(`${lowScorePosts} posts have SEO scores below 60 - consider optimization`);
    }

    if (missingMetaDesc > 0) {
      recommendations.push(`${missingMetaDesc} posts missing proper meta descriptions (min 120 chars)`);
    }

    if (shortContent > 0) {
      recommendations.push(`${shortContent} posts have content shorter than 800 characters`);
    }

    if (noImages > 0) {
      recommendations.push(`${noImages} posts missing featured images for better engagement`);
    }

    if (fewKeywords > 0) {
      recommendations.push(`${fewKeywords} posts need more keywords (minimum 3 recommended)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('SEO performance looks excellent! Keep up the quality content.');
    }

    return recommendations;
  }

  async optimizePost(postId: string): Promise<OptimizationSuggestion> {
    const post = await storage.getPost(postId);
    if (!post) throw new Error('Post not found');

    const suggestions: string[] = [];
    let currentScore = post.seoScore || 0;
    let potentialScore = currentScore;

    // Analyze and suggest improvements
    if (!post.metaDescription || post.metaDescription.length < 120) {
      suggestions.push('Add meta description (120-160 characters)');
      potentialScore += 15;
    }

    if (!post.keywords || post.keywords.length < 3) {
      suggestions.push('Add more relevant keywords (minimum 3)');
      potentialScore += 10;
    }

    if (post.content.length < 800) {
      suggestions.push('Expand content to at least 800 words');
      potentialScore += 15;
    }

    if (!post.imageUrl) {
      suggestions.push('Add featured image with descriptive alt text');
      potentialScore += 10;
    }

    if (post.title.length < 30 || post.title.length > 60) {
      suggestions.push('Optimize title length (30-60 characters)');
      potentialScore += 5;
    }

    // Cap potential score at 100
    potentialScore = Math.min(potentialScore, 100);

    return {
      postId,
      currentScore,
      suggestions,
      potentialScore
    };
  }

  async bulkOptimizePosts(postIds: string[]): Promise<OptimizationSuggestion[]> {
    const results: OptimizationSuggestion[] = [];
    
    for (const postId of postIds) {
      try {
        const suggestion = await this.optimizePost(postId);
        results.push(suggestion);
      } catch (error) {
        console.error(`Failed to optimize post ${postId}:`, error);
      }
    }

    return results;
  }

  async getSeoMetrics(): Promise<SeoMetrics> {
    const posts = await storage.getAllPosts();
    const publishedPosts = posts.filter(p => p.status === 'published');

    const totalViews = publishedPosts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalRevenue = publishedPosts.reduce((sum, post) => sum + (post.revenue || 0), 0);
    
    const avgSeoScore = publishedPosts.length > 0 
      ? publishedPosts.reduce((sum, post) => sum + (post.seoScore || 0), 0) / publishedPosts.length
      : 0;

    // Identify content gaps
    const categoryCount = publishedPosts.reduce((acc, post) => {
      acc[post.category] = (acc[post.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const contentGaps = Object.entries(categoryCount)
      .filter(([, count]) => count < 5)
      .map(([category]) => category);

    // Extract top keywords
    const keywordFreq: { [key: string]: number } = {};
    publishedPosts.forEach(post => {
      post.keywords?.forEach(keyword => {
        keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
      });
    });

    const topKeywords = Object.entries(keywordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      totalViews,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgSeoScore: Math.round(avgSeoScore),
      contentGaps,
      topKeywords
    };
  }

  async generateSitemap(): Promise<Array<{
    url: string;
    lastModified: string;
    priority: string;
    changeFreq: string;
  }>> {
    const posts = await storage.getPostsByStatus('published');
    
    return posts.map(post => ({
      url: `/article/${post.id}`,
      lastModified: (post.publishedAt || post.createdAt || new Date()).toISOString(),
      priority: post.seoScore && post.seoScore > 80 ? '1.0' : '0.8',
      changeFreq: 'weekly'
    }));
  }

  async trackKeywordRankings(keywords: string[]): Promise<Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    difficulty: number;
  }>> {
    // In production, integrate with Google Search Console API or SEMrush
    return keywords.map(keyword => ({
      keyword,
      position: Math.floor(Math.random() * 100) + 1,
      searchVolume: Math.floor(Math.random() * 10000),
      difficulty: Math.floor(Math.random() * 100)
    }));
  }

  async getCompetitorAnalysis(category: string): Promise<Array<{
    domain: string;
    avgSeoScore: number;
    topKeywords: string[];
    contentGaps: string[];
  }>> {
    // Mock competitor analysis - in production, integrate with SEO tools
    const competitors = {
      crypto: ['coindesk.com', 'cointelegraph.com', 'decrypt.co'],
      gadgets: ['techcrunch.com', 'theverge.com', 'engadget.com'],
      ai: ['venturebeat.com', 'towardsdatascience.com', 'ai-news.com'],
      'electric-bikes': ['electricbike.com', 'ebicycles.com', 'ride1up.com'],
      'electric-cars': ['insideevs.com', 'electrek.co', 'cleantechnica.com']
    };

    const categoryCompetitors = competitors[category as keyof typeof competitors] || [];
    
    return categoryCompetitors.map(domain => ({
      domain,
      avgSeoScore: Math.floor(Math.random() * 40) + 60,
      topKeywords: [`${category} news`, `${category} trends`, `${category} analysis`],
      contentGaps: [`${category} beginners guide`, `${category} advanced tips`]
    }));
  }

  async auditPost(postId: string): Promise<{
    seoScore: number;
    issues: string[];
    recommendations: string[];
  }> {
    // Mock SEO audit - in production, use tools like Screaming Frog or custom analysis
    const issues = [
      'Meta description too short',
      'Missing alt text for images',
      'H1 tag missing'
    ];
    
    const recommendations = [
      'Add more internal links',
      'Improve keyword density',
      'Optimize images for web'
    ];

    return {
      seoScore: Math.floor(Math.random() * 40) + 60,
      issues: issues.slice(0, Math.floor(Math.random() * 3) + 1),
      recommendations: recommendations.slice(0, Math.floor(Math.random() * 3) + 1)
    };
  }

  async trackRankings(keywords: string[]): Promise<Array<{
    keyword: string;
    position: number;
    change: number;
  }>> {
    return keywords.map(keyword => ({
      keyword,
      position: Math.floor(Math.random() * 100) + 1,
      change: Math.floor(Math.random() * 21) - 10 // -10 to +10
    }));
  }

  async generateSitemaps(): Promise<string[]> {
    // Mock sitemap generation - in production, generate actual XML sitemaps
    return [
      '/sitemap.xml',
      '/post-sitemap.xml',
      '/category-sitemap.xml'
    ];
  }
}

export const seoManager = new SeoManager();
