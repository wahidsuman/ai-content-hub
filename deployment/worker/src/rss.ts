import { RSSFeed, RSSItem, NewsItem } from './types';

const RSS_FEEDS = [
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'tech' as const
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'tech' as const
  },
  {
    name: 'Electrek',
    url: 'https://electrek.co/feed/',
    category: 'ev' as const
  },
  {
    name: 'Teslarati',
    url: 'https://www.teslarati.com/feed/',
    category: 'ev' as const
  },
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'crypto' as const
  },
  {
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
    category: 'crypto' as const
  },
  {
    name: 'Engadget',
    url: 'https://www.engadget.com/rss.xml',
    category: 'gadgets' as const
  },
  {
    name: 'Gizmodo',
    url: 'https://gizmodo.com/rss',
    category: 'gadgets' as const
  }
];

export async function fetchRSSFeed(url: string): Promise<RSSFeed | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TechNewsBot/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS feed: ${url}`);
      return null;
    }

    const text = await response.text();
    return parseRSSXML(text);
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    return null;
  }
}

function parseRSSXML(xml: string): RSSFeed | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const channel = doc.querySelector('channel');
    if (!channel) return null;

    const title = channel.querySelector('title')?.textContent || '';
    const description = channel.querySelector('description')?.textContent || '';
    const link = channel.querySelector('link')?.textContent || '';

    const items: RSSItem[] = [];
    const itemElements = doc.querySelectorAll('item');

    itemElements.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const guid = item.querySelector('guid')?.textContent || '';

      if (title && link) {
        items.push({
          title,
          description,
          link,
          pubDate,
          guid
        });
      }
    });

    return {
      title,
      description,
      link,
      items
    };
  } catch (error) {
    console.error('Error parsing RSS XML:', error);
    return null;
  }
}

export async function fetchAllFeeds(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];
  const promises = RSS_FEEDS.map(async (feed) => {
    const rssFeed = await fetchRSSFeed(feed.url);
    if (!rssFeed) return [];

    return rssFeed.items.map((item) => ({
      id: generateNewsId(item.link),
      title: item.title,
      description: item.description,
      link: item.link,
      publishedAt: item.pubDate,
      source: feed.name,
      category: feed.category
    }));
  });

  const results = await Promise.all(promises);
  results.forEach(news => allNews.push(...news));

  return allNews;
}

function generateNewsId(url: string): string {
  // Create a hash from the URL to use as ID
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function getNewNewsItems(kv: KVNamespace): Promise<NewsItem[]> {
  const allNews = await fetchAllFeeds();
  const processedIds = await getProcessedNewsIds(kv);
  
  // Filter out processed items and apply additional filtering
  const newNews = allNews.filter(news => !processedIds.has(news.id));
  
  // Apply content filtering for better quality
  const filteredNews = newNews.filter(news => {
    // Filter out very short titles or descriptions
    if (news.title.length < 10 || news.description.length < 50) {
      return false;
    }
    
    // Filter out common spam patterns
    const spamPatterns = ['click here', 'read more', 'learn more', 'find out'];
    const titleLower = news.title.toLowerCase();
    const descLower = news.description.toLowerCase();
    
    if (spamPatterns.some(pattern => titleLower.includes(pattern) || descLower.includes(pattern))) {
      return false;
    }
    
    return true;
  });
  
  // Sort by recency and limit to prevent overwhelming
  const sortedNews = filteredNews.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });
  
  // Limit to 15 items max per batch for 10-15 posts/day target
  return sortedNews.slice(0, 15);
}

async function getProcessedNewsIds(kv: KVNamespace): Promise<Set<string>> {
  const processed = await kv.get('processed_news_ids');
  if (!processed) return new Set();
  
  try {
    const ids = JSON.parse(processed);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export async function markNewsAsProcessed(kv: KVNamespace, newsIds: string[]): Promise<void> {
  const existing = await getProcessedNewsIds(kv);
  const updated = new Set([...existing, ...newsIds]);
  
  // Keep only last 1000 IDs to prevent KV from growing too large
  const idsArray = Array.from(updated).slice(-1000);
  await kv.put('processed_news_ids', JSON.stringify(idsArray));
}