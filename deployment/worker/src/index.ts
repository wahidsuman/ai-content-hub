import { getNewNewsItems, markNewsAsProcessed } from './rss';
import { generateBatchBriefs, generateFullArticle } from './openai';
import { sendBriefsMenu, handleTelegramUpdate } from './telegram';
import { commitMultipleArticles, updateSiteConfig } from './github';
import { NewsBrief, TelegramUpdate } from './types';

export interface Env {
  NEWS_KV: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  OPENAI_API_KEY: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return await handleTelegramWebhook(request, env);
    }
    
    // Handle health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Starting scheduled news processing...');
    
    try {
      // Step 1: Fetch new news items
      const newNews = await getNewNewsItems(env.NEWS_KV);
      console.log(`Found ${newNews.length} new news items`);
      
      if (newNews.length === 0) {
        console.log('No new news items found');
        return;
      }
      
      // Step 2: Generate briefs for new items (limit to 5-10 items for batching)
      const itemsToProcess = newNews.slice(0, 10);
      const briefs = await generateBatchBriefs(itemsToProcess, env.OPENAI_API_KEY);
      console.log(`Generated ${briefs.length} briefs`);
      
      // Step 3: Store batch in KV with enhanced metadata
      const batchId = `batch_${Date.now()}`;
      const batch = {
        batchId,
        briefs,
        createdAt: new Date().toISOString(),
        status: 'pending',
        totalItems: newNews.length,
        processedItems: itemsToProcess.length
      };
      await env.NEWS_KV.put('current_batch', JSON.stringify(batch));
      
      // Step 4: Send enhanced briefs menu to Telegram
      const sent = await sendBriefsMenu(briefs, env.TELEGRAM_CHAT_ID, env.TELEGRAM_BOT_TOKEN);
      
      if (sent) {
        console.log('Successfully sent briefs to Telegram');
        // Mark news items as processed
        await markNewsAsProcessed(env.NEWS_KV, itemsToProcess.map(item => item.id));
        
        // Store batch statistics
        await updateBatchStatistics(env.NEWS_KV, briefs.length);
      } else {
        console.error('Failed to send briefs to Telegram');
      }
      
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  }
};

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const update: TelegramUpdate = await request.json();
    return await handleTelegramUpdate(update, env.NEWS_KV, env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID);
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

// Enhanced processing functions for approved briefs
export async function processApprovedBriefs(
  briefs: NewsBrief[],
  env: Env
): Promise<number> {
  console.log(`Processing ${briefs.length} approved briefs...`);
  
  const articles: string[] = [];
  
  // Generate full articles for all approved briefs in parallel batches
  const batchSize = 3; // Process 3 articles at a time to optimize OpenAI usage
  for (let i = 0; i < briefs.length; i += batchSize) {
    const batch = briefs.slice(i, i + batchSize);
    const batchPromises = batch.map(async (brief) => {
      try {
        const article = await generateFullArticle(brief, env.OPENAI_API_KEY);
        console.log(`Generated article for: ${brief.suggestedTitle}`);
        return article;
      } catch (error) {
        console.error(`Error generating article for ${brief.suggestedTitle}:`, error);
        return '';
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    articles.push(...batchResults);
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < briefs.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Filter out failed articles
  const validBriefs = briefs.filter((_, index) => articles[index] !== '');
  const validArticles = articles.filter(article => article !== '');
  
  if (validBriefs.length === 0) {
    console.log('No valid articles to commit');
    return 0;
  }
  
  // Commit articles to GitHub in parallel
  const successCount = await commitMultipleArticles(
    validBriefs,
    validArticles,
    env.GITHUB_TOKEN,
    env.GITHUB_REPO
  );
  
  // Update site configuration (RSS, sitemap)
  if (successCount > 0) {
    await updateSiteConfig(validBriefs, env.GITHUB_TOKEN, env.GITHUB_REPO);
    
    // Update daily statistics
    await updateDailyStatistics(env.NEWS_KV, successCount);
  }
  
  console.log(`Successfully processed ${successCount} articles`);
  return successCount;
}

// Helper functions for statistics
async function updateBatchStatistics(kv: KVNamespace, briefCount: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `stats_batch_${today}`;
  
  const existing = await kv.get(key);
  const stats = existing ? JSON.parse(existing) : { date: today, batches: 0, totalBriefs: 0 };
  
  stats.batches += 1;
  stats.totalBriefs += briefCount;
  
  await kv.put(key, JSON.stringify(stats), { expirationTtl: 86400 * 7 }); // 7 days
}

async function updateDailyStatistics(kv: KVNamespace, publishedCount: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `stats_daily_${today}`;
  
  const existing = await kv.get(key);
  const stats = existing ? JSON.parse(existing) : { date: today, published: 0, totalBriefs: 0 };
  
  stats.published += publishedCount;
  
  await kv.put(key, JSON.stringify(stats), { expirationTtl: 86400 * 30 }); // 30 days
}

