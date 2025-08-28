#!/usr/bin/env node

/**
 * AI Content Hub Agent Data Fetcher
 * This script fetches all available data from the AI Content Hub agent
 */

// Configuration
const AGENT_URL = 'https://agaminews.in'; // Update this with your actual agent URL
const API_KEY = process.env.API_KEY || 'agami2024'; // Security key if needed

// Available data endpoints and storage keys based on the agent code
const DATA_ENDPOINTS = {
  // Public API endpoints
  stats: '/api/stats',
  config: '/api/config',
  
  // Health and status endpoints
  health: '/health',
  status: '/status-check',
  
  // Content endpoints
  sitemap: '/sitemap.xml',
  robots: '/robots.txt',
  
  // Debug endpoints
  debug: '/debug',
  
  // Protected endpoints (may require authentication)
  trigger: `/trigger?key=${API_KEY}`,
  forceRefresh: '/force-refresh',
  testOpenAI: '/test-openai',
  testArticle: '/test-article'
};

// KV Storage Keys (from the agent code)
const KV_STORAGE_KEYS = [
  'articles',           // All published articles
  'stats',             // Statistics and analytics
  'config',            // System configuration
  'cron_logs',         // Cron job execution logs
  'admin_chat',        // Admin chat ID for Telegram
  'articlesTimestamp', // Last update timestamp
  'initialized',       // System initialization flag
  'admin_clear_token', // Admin token for clearing articles
  'daily_costs',       // Daily cost tracking
  'article_analytics', // Article performance analytics
  'seo_data',         // SEO metadata
  'categories',        // Article categories
  'rss_sources'        // RSS feed sources
];

// Helper function to fetch data from an endpoint
async function fetchEndpointData(endpoint, name) {
  try {
    console.log(`\nFetching ${name} from ${endpoint}...`);
    const response = await fetch(`${AGENT_URL}${endpoint}`);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch ${name}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType && contentType.includes('application/xml')) {
      data = await response.text();
    } else {
      data = await response.text();
    }
    
    console.log(`✅ Successfully fetched ${name}`);
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${name}:`, error.message);
    return null;
  }
}

// Main function to fetch all data
async function fetchAllAgentData() {
  console.log('='.repeat(60));
  console.log('AI CONTENT HUB AGENT DATA FETCHER');
  console.log('='.repeat(60));
  console.log(`\nTarget Agent: ${AGENT_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  const allData = {
    metadata: {
      agent_url: AGENT_URL,
      fetched_at: new Date().toISOString(),
      version: '1.0.0'
    },
    endpoints: {},
    kv_storage: {},
    summary: {}
  };
  
  // Fetch data from all endpoints
  console.log('\n' + '='.repeat(60));
  console.log('FETCHING ENDPOINT DATA');
  console.log('='.repeat(60));
  
  for (const [key, endpoint] of Object.entries(DATA_ENDPOINTS)) {
    const data = await fetchEndpointData(endpoint, key);
    if (data !== null) {
      allData.endpoints[key] = data;
    }
  }
  
  // Process and summarize the fetched data
  console.log('\n' + '='.repeat(60));
  console.log('DATA SUMMARY');
  console.log('='.repeat(60));
  
  // Stats summary
  if (allData.endpoints.stats) {
    console.log('\n📊 Statistics:');
    const stats = allData.endpoints.stats;
    console.log(`  • Total Articles: ${stats.totalArticles || 0}`);
    console.log(`  • Today's Articles: ${stats.dailyArticlesPublished || 0}`);
    console.log(`  • Today's Views: ${stats.todayViews || 0}`);
    console.log(`  • Total Views: ${stats.totalViews || 0}`);
    console.log(`  • Daily Cost: $${stats.dailyCost || 0}`);
    console.log(`  • Total Cost: $${stats.totalCost || 0}`);
    allData.summary.stats = stats;
  }
  
  // Config summary
  if (allData.endpoints.config) {
    console.log('\n⚙️  Configuration:');
    const config = allData.endpoints.config;
    console.log(`  • Site Name: ${config.siteName || 'Not set'}`);
    console.log(`  • Domain: ${config.domain || 'Not set'}`);
    console.log(`  • Daily Article Limit: ${config.dailyArticleLimit || 'Not set'}`);
    console.log(`  • Daily Cost Limit: $${config.dailyCostLimit || 'Not set'}`);
    console.log(`  • Telegram Bot: ${config.telegramBot || 'Not configured'}`);
    allData.summary.config = config;
  }
  
  // Health status
  if (allData.endpoints.health) {
    console.log('\n💚 Health Status:');
    const health = allData.endpoints.health;
    console.log(`  • Status: ${health.status || 'Unknown'}`);
    console.log(`  • Articles Count: ${health.articlesCount || 0}`);
    console.log(`  • Last Cron: ${health.lastCron || 'Never'}`);
    console.log(`  • Hours Since Last Cron: ${health.hoursSinceLastCron || 'N/A'}`);
    allData.summary.health = health;
  }
  
  // Save all data to a JSON file
  const fs = require('fs').promises;
  const outputFile = `agent_data_${Date.now()}.json`;
  
  try {
    await fs.writeFile(outputFile, JSON.stringify(allData, null, 2));
    console.log(`\n✅ All data saved to: ${outputFile}`);
  } catch (error) {
    console.error(`\n❌ Failed to save data to file:`, error.message);
  }
  
  // Display KV storage keys information
  console.log('\n' + '='.repeat(60));
  console.log('KV STORAGE STRUCTURE');
  console.log('='.repeat(60));
  console.log('\nThe following data is stored in Cloudflare KV:');
  
  KV_STORAGE_KEYS.forEach(key => {
    console.log(`  • ${key}`);
  });
  
  console.log('\nNote: Direct KV access requires Cloudflare Worker context.');
  console.log('Use the Telegram bot commands or API endpoints to access this data.');
  
  // Display available Telegram commands
  console.log('\n' + '='.repeat(60));
  console.log('TELEGRAM BOT COMMANDS');
  console.log('='.repeat(60));
  console.log('\nContent Commands:');
  console.log('  /fetch - Fetch 1 article from RSS');
  console.log('  /create <topic> - Create custom article');
  console.log('  /delete <id> - Delete specific article');
  console.log('  /clear - Delete all articles (admin only)');
  
  console.log('\nAnalytics Commands:');
  console.log('  /stats - View statistics');
  console.log('  /costs - Detailed cost report');
  console.log('  /top - Top performing articles');
  console.log('  /analytics - Website analytics');
  console.log('  /seo - SEO report');
  
  console.log('\nSystem Commands:');
  console.log('  /menu - Main dashboard');
  console.log('  /cron - Manual trigger');
  console.log('  /cron-logs - View cron history');
  console.log('  /test - Test article generation');
  console.log('  /help - All commands');
  
  console.log('\n' + '='.repeat(60));
  console.log('FETCH COMPLETE');
  console.log('='.repeat(60));
  
  return allData;
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ or the node-fetch package.');
  console.log('Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the fetcher
fetchAllAgentData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});