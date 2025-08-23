export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  publishedAt: string;
  source: string;
  category: 'tech' | 'ev' | 'crypto' | 'gadgets';
}

export interface NewsBrief {
  id: string;
  newsItem: NewsItem;
  summary: string;
  suggestedTitle: string;
  suggestedTags: string[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  callback_query?: {
    id: string;
    data: string;
    message: {
      message_id: number;
      chat: {
        id: number;
      };
    };
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramMessage['callback_query'];
}

export interface GitHubFile {
  path: string;
  mode: string;
  type: string;
  content: string;
}

export interface GitHubCommit {
  message: string;
  content: string;
  path: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
}

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid?: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface BatchBriefs {
  briefs: NewsBrief[];
  batchId: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed';
}