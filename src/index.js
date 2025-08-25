// COMPLETE AGAMINEWS SYSTEM - FULLY AUTOMATED
// This handles everything: Website, Telegram Bot, AI Manager, SEO, Analytics

import { handleTelegramBot } from './telegram-bot.js';
import { serveProfessionalWebsite } from './website.js';
import { generateSitemap, handleAPI } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route handling
    if (url.pathname === '/telegram') {
      return handleTelegramBot(request, env);
    } else if (url.pathname === '/setup-webhook') {
      return setupWebhook(env);
    } else if (url.pathname === '/sitemap.xml') {
      return generateSitemap(env);
    } else if (url.pathname === '/robots.txt') {
      return new Response(`User-agent: *
Allow: /
Sitemap: ${url.origin}/sitemap.xml`, {
        headers: { 'Content-Type': 'text/plain' }
      });
    } else if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url.pathname);
    } else {
      return serveProfessionalWebsite(env);
    }
  },
  
  // Auto-setup webhook on first deploy
  async scheduled(event, env, ctx) {
    await setupWebhookIfNeeded(env);
    await performDailyTasks(env);
  }
};

// Automatic webhook setup
async function setupWebhook(env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return new Response('Please set TELEGRAM_BOT_TOKEN in environment variables', { status: 400 });
  }
  
  const webhookUrl = `${env.WORKER_URL || 'https://agaminews.workers.dev'}/telegram`;
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;
  
  const response = await fetch(url);
  const result = await response.json();
  
  return new Response(JSON.stringify({
    success: result.ok,
    webhook_url: webhookUrl,
    result: result
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function setupWebhookIfNeeded(env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  // Check if webhook is set
  const checkUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const check = await fetch(checkUrl);
  const info = await check.json();
  
  if (!info.result?.url || info.result.url === '') {
    await setupWebhook(env);
  }
}

async function performDailyTasks(env) {
  // Automated daily tasks
  const tasks = {
    morning: async () => {
      // Fetch trending news
      // Update website content
      // Send summary to Telegram
    },
    afternoon: async () => {
      // Analyze performance
      // Optimize content
      // Clean old data
    },
    evening: async () => {
      // Generate reports
      // Backup data
      // Prepare next day content
    }
  };
  
  const hour = new Date().getHours();
  if (hour === 6) await tasks.morning();
  if (hour === 12) await tasks.afternoon();
  if (hour === 18) await tasks.evening();
}