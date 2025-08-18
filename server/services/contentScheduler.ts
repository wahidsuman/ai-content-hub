import { storage } from "../storage";
import { generateContent } from "./openai";
import { webScraperService } from "./webScraper";

interface ContentSchedule {
  crypto: number;    // 30% - 3 posts
  gadgets: number;   // 20% - 2 posts  
  ai: number;        // 20% - 2 posts
  electricBikes: number; // 20% - 2 posts
  electricCars: number;  // 10% - 1 post
}

interface GenerationStats {
  todayGenerated: number;
  pendingApproval: number;
  scheduled: number;
  totalRevenue: number;
  averageSeoScore: number;
}

export class ContentScheduler {
  private isGenerating = false;
  private readonly dailySchedule: ContentSchedule = {
    crypto: 3,
    gadgets: 2,
    ai: 2,
    electricBikes: 2,
    electricCars: 1
  };

  constructor() {
    this.startDailyGeneration();
  }

  private startDailyGeneration() {
    // Generate content immediately on startup
    setTimeout(() => {
      this.generateDailyContent();
    }, 5000); // Wait 5 seconds after startup

    // Schedule daily generation at 12:00 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateDailyContent();
      
      // Then repeat every 24 hours
      setInterval(() => {
        this.generateDailyContent();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  async generateDailyContent(): Promise<void> {
    if (this.isGenerating) {
      console.log('Content generation already in progress...');
      return;
    }

    this.isGenerating = true;
    
    try {
      console.log('Generating 10 posts...');
      
      const trendingTopics = await webScraperService.getTrendingTopics();
      const results = {
        generated: 0,
        pendingApproval: 0,
        totalRevenue: 0
      };

      // Generate crypto posts (3 posts)
      for (let i = 0; i < this.dailySchedule.crypto; i++) {
        await this.generatePost('crypto', trendingTopics.crypto);
        results.generated++;
      }

      // Generate gadget posts (2 posts)
      for (let i = 0; i < this.dailySchedule.gadgets; i++) {
        await this.generatePost('gadgets', trendingTopics.gadgets);
        results.generated++;
      }

      // Generate AI posts (2 posts)
      for (let i = 0; i < this.dailySchedule.ai; i++) {
        await this.generatePost('ai', trendingTopics.ai);
        results.generated++;
      }

      // Generate electric bike posts (2 posts)
      for (let i = 0; i < this.dailySchedule.electricBikes; i++) {
        await this.generatePost('electric-bikes', trendingTopics.electricBikes);
        results.generated++;
      }

      // Generate electric car posts (1 post)
      for (let i = 0; i < this.dailySchedule.electricCars; i++) {
        await this.generatePost('electric-cars', trendingTopics.electricCars);
        results.generated++;
      }

      // Count pending approval posts
      const pendingPosts = await storage.getPostsByStatus('pending');
      results.pendingApproval = pendingPosts.length;

      console.log('Daily content generation completed:', results);
      
    } catch (error) {
      console.error('Error in daily content generation:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  private async generatePost(category: string, keywords: string[]): Promise<void> {
    try {
      console.log(`Generating ${category} content with keywords:`, keywords);
      
      const content = await generateContent({
        contentType: category,
        keywords: keywords,
        wordCount: '800',
        plagiarismCheck: true,
        seoOptimization: true
      });

      const post = await storage.createPost({
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        category: category,
        status: 'pending',
        seoScore: content.seoScore,
        keywords: content.keywords,
        metaDescription: content.metaDescription,
        views: 0,
        revenue: 0,
        imageUrl: null,
        imageAlt: null
      });

      console.log(`✅ Generated post: ${post.title}`);

    } catch (error) {
      console.error(`Failed to generate ${category} post:`, error);
    }
  }

  async schedulePost(postId: string, publishDate: Date): Promise<void> {
    await storage.updatePost(postId, {
      publishedAt: publishDate,
      status: 'scheduled'
    });
    
    console.log(`Post ${postId} scheduled for ${publishDate.toISOString()}`);
  }

  async bulkSchedulePosts(postIds: string[], startDate: Date, intervalHours: number = 2): Promise<void> {
    for (let i = 0; i < postIds.length; i++) {
      const publishDate = new Date(startDate.getTime() + (i * intervalHours * 60 * 60 * 1000));
      await this.schedulePost(postIds[i], publishDate);
    }
  }

  async getGenerationStats(): Promise<GenerationStats> {
    const posts = await storage.getAllPosts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayGenerated = posts.filter(post => 
      post.createdAt && new Date(post.createdAt) >= today
    ).length;

    const pendingApproval = posts.filter(post => 
      post.status === 'pending'
    ).length;

    const scheduled = posts.filter(post => 
      post.status === 'scheduled'
    ).length;

    const publishedPosts = posts.filter(post => post.status === 'published');
    const totalRevenue = publishedPosts.reduce((sum, post) => sum + (post.revenue || 0), 0);
    
    const avgSeoScore = publishedPosts.length > 0 
      ? publishedPosts.reduce((sum, post) => sum + (post.seoScore || 0), 0) / publishedPosts.length
      : 0;

    return {
      todayGenerated,
      pendingApproval,
      scheduled,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageSeoScore: Math.round(avgSeoScore)
    };
  }

  async getContentCalendar(days: number = 30): Promise<Array<{
    date: string;
    posts: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
    }>;
  }>> {
    const posts = await storage.getAllPosts();
    const calendar: { [key: string]: any[] } = {};
    
    const startDate = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      calendar[dateStr] = [];
    }

    posts.forEach(post => {
      if (post.publishedAt) {
        const dateStr = new Date(post.publishedAt).toISOString().split('T')[0];
        if (calendar[dateStr]) {
          calendar[dateStr].push({
            id: post.id,
            title: post.title,
            category: post.category,
            status: post.status
          });
        }
      }
    });

    return Object.entries(calendar).map(([date, posts]) => ({
      date,
      posts
    }));
  }

  async pauseGeneration(): Promise<void> {
    this.isGenerating = true; // Prevents new generation
    console.log('Content generation paused');
  }

  async resumeGeneration(): Promise<void> {
    this.isGenerating = false;
    console.log('Content generation resumed');
  }

  isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }

  getDailySchedule(): ContentSchedule {
    return { ...this.dailySchedule };
  }
}

export const contentScheduler = new ContentScheduler();
