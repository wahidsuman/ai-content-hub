interface TelegramConfig {
  botToken?: string;
  chatId?: string;
  enabled: boolean;
}

interface NotificationMessage {
  type: 'approval_needed' | 'daily_report' | 'system_alert' | 'content_published';
  title: string;
  message: string;
  data?: any;
  urgent?: boolean;
}

interface ApprovalRequest {
  postId: string;
  title: string;
  category: string;
  excerpt: string;
  seoScore: number;
  keywords: string[];
  timestamp: Date;
}

interface DailyReport {
  date: string;
  postsGenerated: number;
  pendingApproval: number;
  published: number;
  totalRevenue: number;
  averageSeoScore: number;
  topCategories: { category: string; count: number }[];
}

export class TelegramService {
  private config: TelegramConfig;
  private messageQueue: NotificationMessage[] = [];
  private processing = false;

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    };

    if (!this.config.enabled) {
      console.warn('⚠️ Telegram integration disabled. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable notifications.');
    } else {
      console.log('✅ Telegram bot initialized');
      this.startMessageProcessor();
      this.scheduleDailyReports();
    }
  }

  private startMessageProcessor() {
    setInterval(() => {
      this.processMessageQueue();
    }, 5000); // Process queue every 5 seconds
  }

  private async processMessageQueue() {
    if (this.processing || this.messageQueue.length === 0 || !this.config.enabled) {
      return;
    }

    this.processing = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.sendMessage(message);
        
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing Telegram message queue:', error);
    } finally {
      this.processing = false;
    }
  }

  private async sendMessage(notification: NotificationMessage): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[TELEGRAM MOCK] ${notification.type}: ${notification.title}`);
      return;
    }

    try {
      const message = this.formatMessage(notification);
      
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      console.log(`✅ Telegram notification sent: ${notification.type}`);
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      // Re-queue the message for retry (with limit)
      if (!notification.data?.retryCount || notification.data.retryCount < 3) {
        notification.data = { ...notification.data, retryCount: (notification.data?.retryCount || 0) + 1 };
        this.messageQueue.push(notification);
      }
    }
  }

  private formatMessage(notification: NotificationMessage): string {
    const timestamp = new Date().toLocaleString();
    const urgentPrefix = notification.urgent ? '🚨 *URGENT* 🚨\n' : '';
    
    switch (notification.type) {
      case 'approval_needed':
        return `${urgentPrefix}📝 *New Content Awaiting Approval*

*Title:* ${notification.title}
*Category:* ${notification.data?.category || 'Unknown'}
*SEO Score:* ${notification.data?.seoScore || 'N/A'}/100
*Keywords:* ${notification.data?.keywords?.join(', ') || 'None'}

*Excerpt:*
${notification.message}

*Time:* ${timestamp}

👍 Approve | ❌ Reject | ✏️ Edit`;

      case 'daily_report':
        return `📊 *Daily Content Report - ${notification.data?.date}*

*Content Generation:*
• Posts Generated: ${notification.data?.postsGenerated || 0}
• Pending Approval: ${notification.data?.pendingApproval || 0}
• Published Today: ${notification.data?.published || 0}

*Performance:*
• Total Revenue: $${notification.data?.totalRevenue || 0}
• Average SEO Score: ${notification.data?.averageSeoScore || 0}/100

*Top Categories:*
${notification.data?.topCategories?.map((cat: any) => `• ${cat.category}: ${cat.count} posts`).join('\n') || 'No data'}

*Time:* ${timestamp}`;

      case 'system_alert':
        return `${urgentPrefix}⚠️ *System Alert*

*Alert:* ${notification.title}
*Details:* ${notification.message}
*Time:* ${timestamp}

Please check the admin dashboard for more details.`;

      case 'content_published':
        return `✅ *Content Published Successfully*

*Title:* ${notification.title}
*Category:* ${notification.data?.category || 'Unknown'}
*SEO Score:* ${notification.data?.seoScore || 'N/A'}/100

${notification.message}

*Time:* ${timestamp}`;

      default:
        return `${urgentPrefix}*${notification.title}*

${notification.message}

*Time:* ${timestamp}`;
    }
  }

  async sendApprovalRequest(approval: ApprovalRequest): Promise<void> {
    const notification: NotificationMessage = {
      type: 'approval_needed',
      title: approval.title,
      message: approval.excerpt,
      data: {
        postId: approval.postId,
        category: approval.category,
        seoScore: approval.seoScore,
        keywords: approval.keywords
      }
    };

    this.messageQueue.push(notification);
  }

  async sendDailyReport(report: DailyReport): Promise<void> {
    const notification: NotificationMessage = {
      type: 'daily_report',
      title: `Daily Report - ${report.date}`,
      message: `Generated ${report.postsGenerated} posts with ${report.pendingApproval} pending approval`,
      data: report
    };

    this.messageQueue.push(notification);
  }

  async sendSystemAlert(title: string, message: string, urgent: boolean = false): Promise<void> {
    const notification: NotificationMessage = {
      type: 'system_alert',
      title,
      message,
      urgent
    };

    this.messageQueue.push(notification);
  }

  async sendPublishedNotification(postId: string, title: string, category: string, seoScore: number): Promise<void> {
    const notification: NotificationMessage = {
      type: 'content_published',
      title,
      message: `New ${category} article published with SEO score ${seoScore}/100`,
      data: {
        postId,
        category,
        seoScore
      }
    };

    this.messageQueue.push(notification);
  }

  private scheduleDailyReports() {
    if (!this.config.enabled) return;

    // Send daily report at 6:00 PM
    const now = new Date();
    const reportTime = new Date(now);
    reportTime.setHours(18, 0, 0, 0);
    
    // If it's already past 6 PM today, schedule for tomorrow
    if (now > reportTime) {
      reportTime.setDate(reportTime.getDate() + 1);
    }
    
    const msUntilReport = reportTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateAndSendDailyReport();
      
      // Then repeat every 24 hours
      setInterval(() => {
        this.generateAndSendDailyReport();
      }, 24 * 60 * 60 * 1000);
    }, msUntilReport);
  }

  private async generateAndSendDailyReport(): Promise<void> {
    try {
      // Import storage here to avoid circular dependencies
      const { storage } = await import('../storage');
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      today.setHours(0, 0, 0, 0);
      
      const posts = await storage.getAllPosts();
      const todayPosts = posts.filter(post => 
        post.createdAt && new Date(post.createdAt) >= today
      );
      
      const publishedToday = posts.filter(post => 
        post.publishedAt && new Date(post.publishedAt) >= today
      );
      
      const pendingApproval = posts.filter(post => post.status === 'pending').length;
      
      const totalRevenue = publishedToday.reduce((sum, post) => sum + (post.revenue || 0), 0);
      
      const avgSeoScore = todayPosts.length > 0 
        ? Math.round(todayPosts.reduce((sum, post) => sum + (post.seoScore || 0), 0) / todayPosts.length)
        : 0;
      
      // Calculate top categories
      const categoryCount: { [key: string]: number } = {};
      todayPosts.forEach(post => {
        categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;
      });
      
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      const report: DailyReport = {
        date: todayStr,
        postsGenerated: todayPosts.length,
        pendingApproval,
        published: publishedToday.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageSeoScore: avgSeoScore,
        topCategories
      };
      
      await this.sendDailyReport(report);
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      await this.sendSystemAlert(
        'Daily Report Failed',
        'Failed to generate daily report. Please check system logs.',
        false
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('Telegram integration disabled - test skipped');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getMe`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Telegram bot connected: ${data.result.username}`);
        
        // Send test message
        await this.sendSystemAlert(
          'Bot Connected',
          'AI Content Hub Telegram bot is now active and ready to send notifications.',
          false
        );
        
        return true;
      } else {
        throw new Error(`API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  clearQueue(): void {
    this.messageQueue = [];
    console.log('Telegram message queue cleared');
  }

  updateConfig(botToken?: string, chatId?: string): void {
    if (botToken) this.config.botToken = botToken;
    if (chatId) this.config.chatId = chatId;
    
    this.config.enabled = !!(this.config.botToken && this.config.chatId);
    
    if (this.config.enabled) {
      console.log('✅ Telegram configuration updated');
      this.testConnection();
    } else {
      console.log('⚠️ Telegram integration disabled');
    }
  }
}

export const telegramService = new TelegramService();
