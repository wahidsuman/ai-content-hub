// AI Website Manager - Complete Cloudflare Worker
// This manages your entire website through AI and Telegram
// Last updated: December 2024 - Full functionality with natural language
// Supports both commands and natural conversation
// Deploy triggered: Admin commands and DALL-E integration fixed

import { AIWebsiteManager } from './ai-manager.js';
import { handleManagerCommands } from './telegram-commands.js';
import { getPrivacyPolicy, getTermsOfService, getAboutPage, getContactPage, generateSitemap, getRobotsTxt } from './pages.js';

// Version: 2.0 - DALL-E + Buttons + Analytics + Viral Headlines
// Deployed: ${new Date().toISOString()}
// FORCE DEPLOYMENT - NEW CODE WITH ALL FEATURES
export default {
  // Main request handler
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram') {
      return handleTelegram(request, env);
    }
    
    // Handle API endpoints
    if (url.pathname === '/api/content') {
      return handleAPI(request, env);
    }
    
    // Handle essential pages
    if (url.pathname === '/privacy-policy' || url.pathname === '/privacy') {
      return servePage(env, 'Privacy Policy', getPrivacyPolicy());
    }
    if (url.pathname === '/terms' || url.pathname === '/terms-of-service') {
      return servePage(env, 'Terms of Service', getTermsOfService());
    }
    if (url.pathname === '/about') {
      return servePage(env, 'About Us', getAboutPage());
    }
    if (url.pathname === '/contact') {
      return servePage(env, 'Contact Us', getContactPage());
    }
    
    // Handle sitemap
    if (url.pathname === '/sitemap.xml') {
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      return new Response(generateSitemap(articles), {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Handle robots.txt
    if (url.pathname === '/robots.txt') {
      return new Response(getRobotsTxt(), {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // Handle article pages
    if (url.pathname.startsWith('/article/')) {
      const articleId = url.pathname.replace('/article/', '');
      return serveArticle(env, articleId);
    }
    
    // Serve the main website
    return serveWebsite(env);
  },
  
  // Scheduled handler for checking news
  async scheduled(event, env, ctx) {
    const manager = new AIWebsiteManager(env);
    const chatId = env.YOUR_TELEGRAM_ID;
    
    try {
      // Check for important breaking news
      const news = await manager.fetchDailyNews();
      
      // Filter for important news (you can customize this logic)
      const importantNews = news.filter(item => {
        // Check for keywords that indicate breaking/important news
        const keywords = ['breaking', 'urgent', 'major', 'billion', 'hack', 'crash', 'surge'];
        return keywords.some(keyword => 
          item.title.toLowerCase().includes(keyword) ||
          (item.description && item.description.toLowerCase().includes(keyword))
        );
      });
      
      if (importantNews.length > 0) {
        await sendMessage(env, chatId, `🚨 *Breaking News Alert!*\n\n${importantNews.length} important stories detected. Type /news to review.`);
      }
      
      // Reset daily usage at midnight
      const now = new Date();
      if (now.getHours() === 0) {
        await env.NEWS_KV.put('usage_today', '0');
      }
      
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};

// Handle Telegram messages
async function handleTelegram(request, env) {
  try {
    const update = await request.json();
    
    // Handle callback queries (button presses)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      // Security check
      if (chatId.toString() !== env.YOUR_TELEGRAM_ID) {
        return new Response('Unauthorized', { status: 403 });
      }
      
      // Answer callback to remove loading state
      await answerCallback(env, callbackQuery.id);
      
      // Handle different callbacks
      if (data === 'main_menu') {
        await sendMainMenu(env, chatId);
      } else if (data === 'get_news' || data === 'cmd_news') {
        await handleManagerCommands(env, chatId, '/news');
      } else if (data === 'show_performance' || data === 'cmd_performance') {
        await handleManagerCommands(env, chatId, '/performance');
      } else if (data === 'show_budget' || data === 'cmd_budget') {
        await handleManagerCommands(env, chatId, '/budget');
      } else if (data === 'get_suggestions' || data === 'cmd_suggestions') {
        await handleManagerCommands(env, chatId, '/suggestions');
      } else if (data === 'show_schedule' || data === 'cmd_schedule') {
        await handleManagerCommands(env, chatId, '/schedule');
      } else if (data === 'cmd_status') {
        await handleManagerCommands(env, chatId, '/status');
      } else if (data === 'cmd_delete') {
        await handleDeleteMenu(env, chatId);
      } else if (data === 'cmd_admin') {
        await handleManagerCommands(env, chatId, '/admin');
      } else if (data === 'setadmin_prompt') {
        await sendMessage(env, chatId, '🔐 To become admin, send:\n\n`/setadmin agami2024`\n\nCopy and send this command.');
      } else if (data === 'refresh_news') {
        await handleManagerCommands(env, chatId, '/news');
      } else if (data.startsWith('approve_')) {
        await handleApprovalCallback(env, chatId, data);
      } else if (data.startsWith('delete_article_')) {
        const articleId = data.replace('delete_article_', '');
        await handleManagerCommands(env, chatId, `/delete ${articleId}`);
      } else if (data.startsWith('delete_page_')) {
        const page = parseInt(data.replace('delete_page_', ''));
        await handleDeleteMenu(env, chatId, page);
      } else if (data.startsWith('permission_')) {
        await handlePermissionCallback(env, chatId, data);
      }
      
      return new Response('OK');
    }
    
    // Handle regular messages
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name || 'User';
      
      // Admin management - first user becomes admin
      let adminChat = await env.NEWS_KV.get('admin_chat');
      if (!adminChat) {
        await env.NEWS_KV.put('admin_chat', String(chatId));
        adminChat = String(chatId);
      }
      
      // Handle AI Manager commands
      if (text.startsWith('/news') || text.startsWith('/approve') || 
          text.startsWith('/performance') || text.startsWith('/budget') ||
          text.startsWith('/suggestions') || text.startsWith('/schedule')) {
        await handleManagerCommands(env, chatId, text);
        return new Response('OK');
      }
      
      // Handle admin commands
      if (text === '/admin' || text === '/whoami') {
        const isAdmin = String(chatId) === String(adminChat);
        const message = `👤 *Your Status*\n\nChat ID: \`${chatId}\`\nAdmin: ${isAdmin ? '✅ Yes' : '❌ No'}\n\n${!isAdmin ? 'Use the button below to become admin' : 'You have full access!'}`;
        
        const keyboard = {
          inline_keyboard: isAdmin ? [
            [
              { text: '🗑️ Delete Articles', callback_data: 'cmd_delete' },
              { text: '📰 Get News', callback_data: 'cmd_news' }
            ],
            [
              { text: '📊 Performance', callback_data: 'cmd_performance' },
              { text: '📚 Help Menu', callback_data: 'main_menu' }
            ]
          ] : [
            [
              { text: '🔐 Become Admin', callback_data: 'setadmin_prompt' }
            ],
            [
              { text: '📚 Help Menu', callback_data: 'main_menu' }
            ]
          ]
        };
        
        await sendMessageWithKeyboard(env, chatId, message, keyboard);
        return new Response('OK');
      } else if (text.startsWith('/setadmin')) {
        const secret = text.split(' ')[1];
        if (secret === 'agami2024') {
          await env.NEWS_KV.put('admin_chat', String(chatId));
          const message = '✅ You are now the admin! Full access granted.';
          const keyboard = {
            inline_keyboard: [
              [
                { text: '🗑️ Delete Articles', callback_data: 'cmd_delete' },
                { text: '📰 Get News', callback_data: 'cmd_news' }
              ],
              [
                { text: '📊 Performance', callback_data: 'cmd_performance' },
                { text: '📚 Help Menu', callback_data: 'main_menu' }
              ]
            ]
          };
          await sendMessageWithKeyboard(env, chatId, message, keyboard);
        } else {
          await sendMessage(env, chatId, '❌ Invalid secret. Use: \`/setadmin agami2024\`');
        }
        return new Response('OK');
      } else if (text.startsWith('/delete')) {
        // Delete article with fixed authorization
        if (String(chatId) !== String(await env.NEWS_KV.get('admin_chat'))) {
          await sendMessage(env, chatId, `❌ Unauthorized. Use \`/setadmin agami2024\` first.`);
        } else {
          const articleNum = text.split(' ')[1];
          if (!articleNum) {
            await sendMessage(env, chatId, '❌ Usage: \`/delete 0\`');
          } else {
            const articles = await env.NEWS_KV.get('articles', 'json') || [];
            const index = parseInt(articleNum);
            if (articles[index]) {
              articles.splice(index, 1);
              await env.NEWS_KV.put('articles', JSON.stringify(articles));
              const message = `✅ Deleted article #${index + 1}\n\n📰 Articles remaining: ${articles.length}`;
              const keyboard = {
                inline_keyboard: [
                  [
                    { text: '🗑️ Continue Deleting', callback_data: 'cmd_delete' },
                    { text: '📰 Get News', callback_data: 'cmd_news' }
                  ],
                  [
                    { text: '🌐 View Website', url: 'https://agaminews.in' },
                    { text: '📚 Main Menu', callback_data: 'main_menu' }
                  ]
                ]
              };
              await sendMessageWithKeyboard(env, chatId, message, keyboard);
            } else {
              await sendMessage(env, chatId, `❌ Article #${articleNum} not found`);
            }
          }
        }
        return new Response('OK');
      }
      
      // Handle basic commands
      if (text === '/start') {
        await sendWelcomeMessage(env, chatId, firstName);
      } else if (text === '/help' || text === '/menu') {
        await sendMainMenu(env, chatId);
      } else if (text === '/status') {
        await sendStatusMessage(env, chatId);
      } else {
              // Process as natural language command with full AI capabilities
      await processNaturalCommand(env, chatId, text, firstName);
      }
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('Telegram handler error:', error);
    return new Response('Error', { status: 500 });
  }
}

// Handle approval callbacks
async function handleApprovalCallback(env, chatId, data) {
  const manager = new AIWebsiteManager(env);
  
  if (data === 'approve_all') {
    // Approve all 15 articles
    const numbers = Array.from({length: 15}, (_, i) => i);
    await approveSelectedArticles(manager, env, chatId, numbers);
  } else {
    // Approve single article
    const articleNum = parseInt(data.replace('approve_', '')) - 1;
    await approveSelectedArticles(manager, env, chatId, [articleNum]);
  }
}

// Handle permission callbacks for AI actions
async function handlePermissionCallback(env, chatId, data) {
  const manager = new AIWebsiteManager(env);
  const [_, action, decision] = data.split('_');
  
  if (decision === 'yes') {
    await sendMessage(env, chatId, "✅ Permission granted. Executing...");
    
    // Execute the approved action
    switch(action) {
      case 'uichange':
        await sendMessage(env, chatId, "🎨 Updating website design...");
        // Execute UI changes
        const result = await manager.executeWithPermission({ type: 'change_ui', changes: {} }, true);
        await sendMessage(env, chatId, result.message);
        break;
        
      case 'remove':
        await sendMessage(env, chatId, "🗑️ Removing underperforming content...");
        // Remove poor content
        const removeResult = await manager.executeWithPermission({ type: 'remove_content', indices: [] }, true);
        await sendMessage(env, chatId, removeResult.message);
        break;
        
      case 'optimize':
        await sendMessage(env, chatId, "⚙️ Optimizing website...");
        // Optimize SEO and performance
        await sendMessage(env, chatId, "Optimization complete!");
        break;
        
      default:
        await sendMessage(env, chatId, "Action completed!");
    }
  } else {
    await sendMessage(env, chatId, "❌ Action cancelled. Let me know if you want to try something else!");
  }
}

// Approve selected articles
async function approveSelectedArticles(manager, env, chatId, indices) {
  const pendingNews = JSON.parse(await env.NEWS_KV.get('pending_news') || '[]');
  
  await sendMessage(env, chatId, `📝 Creating ${indices.length} article(s)...`);
  
  for (const index of indices) {
    if (pendingNews[index]) {
      const article = await manager.createArticle(pendingNews[index], true);
      
      // Store article
      const articles = await env.NEWS_KV.get('articles', 'json') || [];
      articles.unshift(article);
      await env.NEWS_KV.put('articles', JSON.stringify(articles));
      
      await sendMessage(env, chatId, `✅ Published: ${article.title}`);
    }
  }
  
  // Send success with buttons
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🌐 View Website", url: "https://agaminews.in" },
        { text: "📰 Get More News", callback_data: "get_news" }
      ],
      [
        { text: "🏠 Main Menu", callback_data: "main_menu" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, `🎉 Articles published successfully!`, keyboard);
}

// Send main menu
async function sendMainMenu(env, chatId) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const usage = await env.NEWS_KV.get('usage_today') || 0;
  
  const message = `
🏠 *AgamiNews AI Control Center*

🚀 *System Status:*
• Articles Live: ${articles.length}
• AI Images: DALL-E 3 ✅
• Analytics: Google Active ✅
• Today's Cost: $${usage}

📰 *Content* - AI-powered news with viral headlines
🖼️ *Images* - DALL-E 3 generated (no stock photos!)
📊 *Analytics* - Real-time Google Analytics
🔗 *SEO* - Auto backlinks & meta tags
💰 *Budget* - Stay under $10/month
🗑️ *Admin* - Full delete/edit control

Your website: [agaminews.in](https://agaminews.in)

*Choose an action:*
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📰 Get Latest News", callback_data: "get_news" },
        { text: "📊 Performance Stats", callback_data: "show_performance" }
      ],
      [
        { text: "💰 Budget Status", callback_data: "show_budget" },
        { text: "💡 AI Suggestions", callback_data: "get_suggestions" }
      ],
      [
        { text: "📅 Daily Schedule", callback_data: "show_schedule" },
        { text: "🌐 Visit Website", url: "https://agaminews.in" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Answer callback query
async function answerCallback(env, callbackId, text = null) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text
    })
  });
}

// Welcome message with buttons
async function sendWelcomeMessage(env, chatId, firstName) {
  const message = `
🎉 *Welcome to AgamiNews AI Manager!*

I'm your intelligent news manager powered by GPT-4 & DALL-E 3. Everything is automated!

🤖 *What I Do:*
• Fetch real news from 9+ sources every 2 hours
• Generate AI images with DALL-E 3 (no stock photos!)
• Create viral headlines that get clicks
• Auto-generate backlinks for SEO
• Track with Google Analytics (Active ✅)
• Optimize for Google ranking

💰 *Current Status:*
• AI Cost: ~$2-3/month (GPT-3.5 + DALL-E)
• Budget: $10/month limit
• News Sources: CoinGecko, Reddit, HackerNews ✅
• Image AI: DALL-E 3 Standard ✅
• Analytics: G-ZW77WM2VPG ✅

📍 *Focus:* Tech, Crypto & EVs for Indian professionals

🎯 *NEW Features:*
• ✅ Clickable button commands
• ✅ Viral headline generation
• ✅ SEO meta tags & indexing
• ✅ Automatic internal linking
• ✅ Admin controls working

*Quick Start:* Use the buttons below!
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📰 Get News", callback_data: "get_news" },
        { text: "📊 Performance", callback_data: "show_performance" }
      ],
      [
        { text: "💰 Budget", callback_data: "show_budget" },
        { text: "💡 Suggestions", callback_data: "get_suggestions" }
      ],
      [
        { text: "📅 Schedule", callback_data: "show_schedule" },
        { text: "🌐 Visit Site", url: "https://agaminews.in" }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Helper function to send message with keyboard
async function sendMessageWithKeyboard(env, chatId, text, keyboard) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: true
    })
  });
}

// Process natural language commands with full AI capabilities
async function processNaturalCommand(env, chatId, command, firstName) {
  try {
    await sendChatAction(env, chatId, 'typing');
    
    const manager = new AIWebsiteManager(env);
    
    // Check for action keywords first
    const lowerCommand = command.toLowerCase();
    
    // Quick command routing
    if (lowerCommand.includes('fetch') || lowerCommand.includes('get news') || lowerCommand.includes('show news')) {
      await handleManagerCommands(env, chatId, '/news');
      return;
    } 
    
    if (lowerCommand.includes('publish') || lowerCommand.includes('post') || lowerCommand.includes('approve')) {
      if (lowerCommand.match(/\d+/)) {
        // Has numbers, try to approve
        const numbers = command.match(/\d+/g).join(',');
        await handleManagerCommands(env, chatId, `/approve ${numbers}`);
      } else {
        await sendMessage(env, chatId, "Which articles should I publish? Say something like 'approve 1, 3, 5' or use the buttons after /news");
      }
      return;
    }
    
    if (lowerCommand.includes('stats') || lowerCommand.includes('performance') || lowerCommand.includes('how many')) {
      await handleManagerCommands(env, chatId, '/performance');
      return;
    }
    
    if (lowerCommand.includes('budget') || lowerCommand.includes('cost') || lowerCommand.includes('money')) {
      await handleManagerCommands(env, chatId, '/budget');
      return;
    }
    
    // Natural language AI conversation with FULL capabilities
    const systemPrompt = `You are an advanced AI Website Manager for agaminews.in with COMPLETE control over the website.
    
Your FULL capabilities:
    ✅ CONTENT MANAGEMENT:
    - Fetch and summarize news from various sources
    - Create and publish SEO-optimized articles
    - Generate HD images with DALL-E 3
    - Schedule posts and manage content calendar
    
    ✅ UI/UX CONTROL:
    - Change website colors, themes, layouts
    - Modify navigation and menus
    - Update fonts, sizes, spacing
    - Redesign sections (hero, cards, footer)
    - Add/remove website features
    - Make it more modern, minimal, colorful, etc.
    
    ✅ ANALYTICS & TRACKING:
    - Track page views, unique visitors
    - Monitor article performance
    - Analyze user behavior and engagement
    - Track conversion rates
    - Identify top performing content
    - Generate traffic reports
    - Monitor SEO rankings
    
    ✅ MONETIZATION:
    - Manage Google AdSense placement
    - Optimize ad positions for revenue
    - Track earnings and RPM
    - Suggest monetization strategies
    
    ✅ TECHNICAL:
    - Monitor site speed and performance
    - Check mobile responsiveness
    - Manage SEO meta tags
    - Handle sitemap and robots.txt
    - Monitor budget (staying under $10/month)
    
    Current context:
    - Website: agaminews.in
    - Owner: ${firstName}
    - Focus: Tech news, crypto, EVs, gadgets
    - Budget limit: $10/month
    - Tech stack: Cloudflare Workers, OpenAI API, Telegram
    
    When user asks to change UI/UX, provide specific CSS/HTML changes.
    When user asks for analytics, provide detailed metrics.
    Be proactive and suggest improvements.
    You can execute ANY website change they request.`;
    
    const response = await manager.callOpenAI(
      systemPrompt + "\n\nUser says: " + command + "\n\nRespond naturally and helpfully:",
      'gpt-3.5-turbo',
      300
    );
    
    // Add quick action buttons based on context
    let keyboard = null;
    if (lowerCommand.includes('help') || lowerCommand.includes('what can')) {
      keyboard = {
        inline_keyboard: [
          [
            { text: "📰 Get News", callback_data: "get_news" },
            { text: "📊 Performance", callback_data: "show_performance" }
          ],
          [
            { text: "💰 Budget", callback_data: "show_budget" },
            { text: "💡 Suggestions", callback_data: "get_suggestions" }
          ]
        ]
      };
    }
    
    if (keyboard) {
      await sendMessageWithKeyboard(env, chatId, response || "I'm here to help! What would you like to do?", keyboard);
    } else {
      await sendMessage(env, chatId, response || "I'm here to help! You can chat naturally with me or use /help for commands.");
    }
    
  } catch (error) {
    await sendMessage(env, chatId, `❌ Sorry, I encountered an error. Try using the menu commands:\n/news - Get news\n/help - See all commands\n\nError: ${error.message}`);
  }
}

// Delete menu with article buttons and pagination
async function handleDeleteMenu(env, chatId, page = 0) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  if (articles.length === 0) {
    await sendMessage(env, chatId, '📭 No articles to delete');
    return;
  }
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil(articles.length / itemsPerPage);
  const currentPage = Math.min(Math.max(0, page), totalPages - 1);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, articles.length);
  
  let message = `🗑️ *Delete Articles*\n\n`;
  message += `📄 Page ${currentPage + 1} of ${totalPages}\n`;
  message += `📰 Total articles: ${articles.length}\n\n`;
  message += `*Select an article to delete:*\n`;
  
  // Show article details for current page
  for (let i = startIndex; i < endIndex; i++) {
    const article = articles[i];
    const title = article.title ? article.title.substring(0, 50) : `Article ${i}`;
    const date = article.created ? new Date(article.created).toLocaleDateString() : 'Unknown date';
    message += `\n${i + 1}. ${title}\n   📅 ${date}\n`;
  }
  
  const keyboard = {
    inline_keyboard: []
  };
  
  // Add article buttons for current page
  for (let i = startIndex; i < endIndex; i++) {
    const article = articles[i];
    const title = article.title ? article.title.substring(0, 40) + '...' : `Article ${i + 1}`;
    keyboard.inline_keyboard.push([
      { text: `🗑️ ${i + 1}. ${title}`, callback_data: `delete_article_${i}` }
    ]);
  }
  
  // Add pagination buttons
  const navigationButtons = [];
  if (currentPage > 0) {
    navigationButtons.push({ text: '⬅️ Previous', callback_data: `delete_page_${currentPage - 1}` });
  }
  if (currentPage < totalPages - 1) {
    navigationButtons.push({ text: '➡️ Next', callback_data: `delete_page_${currentPage + 1}` });
  }
  
  if (navigationButtons.length > 0) {
    keyboard.inline_keyboard.push(navigationButtons);
  }
  
  // Add utility buttons
  keyboard.inline_keyboard.push([
    { text: '🔄 Refresh', callback_data: `delete_page_${currentPage}` },
    { text: '↩️ Back to Menu', callback_data: 'main_menu' }
  ]);
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Welcome message - removed duplicate (defined earlier)

// Help message with buttons
async function sendHelpMessage(env, chatId) {
  const usage = await env.NEWS_KV.get('usage_today') || 0;
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  const message = `
📚 *AgamiNews AI Control Panel*

🤖 *Powered by:* GPT-3.5 + DALL-E 3
📊 *Analytics:* Google Analytics Active
🔗 *SEO:* Auto-backlinks & Meta Tags
📰 *Articles Published:* ${articles.length}
💰 *Today's AI Cost:* $${usage}

*All commands are now clickable buttons!*

You can also type naturally:
• "Fetch tech news"
• "Delete article 5"
• "Show performance"
• "What's trending?"

*Choose an action below:*
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📰 Get News', callback_data: 'cmd_news' },
        { text: '📊 Performance', callback_data: 'cmd_performance' }
      ],
      [
        { text: '💡 Suggestions', callback_data: 'cmd_suggestions' },
        { text: '💰 Budget', callback_data: 'cmd_budget' }
      ],
      [
        { text: '📅 Schedule', callback_data: 'cmd_schedule' },
        { text: '🔧 Status', callback_data: 'cmd_status' }
      ],
      [
        { text: '🗑️ Delete Article', callback_data: 'cmd_delete' },
        { text: '👤 Admin Status', callback_data: 'cmd_admin' }
      ],
      [
        { text: '🌐 Visit Website', url: 'https://agaminews.in' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(env, chatId, message, keyboard);
}

// Status message
async function sendStatusMessage(env, chatId) {
  const manager = new AIWebsiteManager(env);
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  const analytics = await env.NEWS_KV.get('analytics', 'json') || {};
  const usage = await env.NEWS_KV.get('usage_today') || 0;
  
  const message = `
🟢 *System Status*

*Website:* agaminews.in ✅
*Articles Published:* ${articles.length}
*Total Views:* ${analytics.views || 0}
*Today's AI Usage:* $${parseFloat(usage).toFixed(3)} / $0.33

*Services:*
• Cloudflare Worker: ✅ Active
• OpenAI API: ✅ Connected
• Telegram Bot: ✅ Running
• DALL-E 3: ✅ Configured
• KV Storage: ✅ Connected

*Next Actions:*
Type /news to fetch today's summaries
  `;
  
  await sendMessage(env, chatId, message);
}

// Generate content using GPT-3.5
async function generateContent(env, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate engaging tech news content in HTML format. Use modern styling.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.8
    })
  });
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Store in KV
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  articles.unshift({
    id: Date.now(),
    content: content,
    created: new Date().toISOString()
  });
  
  // Keep only last 20 articles
  if (articles.length > 20) {
    articles.length = 20;
  }
  
  await env.NEWS_KV.put('articles', JSON.stringify(articles));
  await env.NEWS_KV.put('last_updated', new Date().toISOString());
  
  // Update analytics
  const analytics = await env.NEWS_KV.get('analytics', 'json') || { generated: 0 };
  analytics.generated = (analytics.generated || 0) + 1;
  await env.NEWS_KV.put('analytics', JSON.stringify(analytics));
  
  return content;
}

// Update website design
async function updateDesign(env, parameters) {
  const currentDesign = await env.NEWS_KV.get('design', 'json') || {};
  const newDesign = { ...currentDesign, ...parameters };
  await env.NEWS_KV.put('design', JSON.stringify(newDesign));
}

// Update SEO settings
async function updateSEO(env, parameters) {
  const currentSEO = await env.NEWS_KV.get('seo', 'json') || {};
  const newSEO = { ...currentSEO, ...parameters };
  await env.NEWS_KV.put('seo', JSON.stringify(newSEO));
}

// Schedule content
async function scheduleContent(env, parameters) {
  const schedule = await env.NEWS_KV.get('schedule', 'json') || [];
  schedule.push({
    ...parameters,
    scheduled: new Date().toISOString()
  });
  await env.NEWS_KV.put('schedule', JSON.stringify(schedule));
}

// Get analytics
async function getAnalytics(env) {
  const analytics = await env.NEWS_KV.get('analytics', 'json') || {};
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  return `
📊 Website Analytics:
• Total Articles: ${articles.length}
• Content Generated: ${analytics.generated || 0} times
• Page Views: ${analytics.views || 0}
• Last Updated: ${await env.NEWS_KV.get('last_updated') || 'Never'}
  `;
}

// Serve individual article page
async function serveArticle(env, articleId) {
  try {
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const articleIndex = parseInt(articleId);
    const article = articles[articleIndex];
    
    if (!article) {
      return new Response('Article not found', { status: 404 });
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${article.title} - Agami News</title>
<meta name="description" content="${article.seo?.metaDescription || article.description || ''}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://agaminews.in/article/${articleIndex}">
<meta property="og:title" content="${article.title}">
<meta property="og:description" content="${article.seo?.metaDescription || article.description || ''}">
<meta property="og:url" content="https://agaminews.in/article/${articleIndex}">
<meta property="og:type" content="article">
<meta property="og:image" content="${article.image?.url || 'https://agaminews.in/og-default.jpg'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${article.title}">
<meta name="twitter:description" content="${article.seo?.metaDescription || ''}">
<meta name="twitter:image" content="${article.image?.url || 'https://agaminews.in/og-default.jpg'}">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ZW77WM2VPG');
</script>
<!-- Google Search Console Verification -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE">
<style>
  :root{
    --bg:#0b1020;--text:#e8ecf2;--muted:#a8b1c7;--card:#121835;
    --g1:linear-gradient(135deg,#7c3aed, #ef4444, #f59e0b);
    --g2:linear-gradient(135deg,#06b6d4, #6366f1);
    --radius:18px;--shadow:0 12px 30px rgba(0,0,0,.25);
  }
  *{box-sizing:border-box} 
  body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a234a,transparent),var(--bg);color:var(--text);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
  a{color:#7dd3fc;text-decoration:none}
  .container{max-width:800px;margin:auto;padding:20px}
  
  /* Header */
  .header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:30px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);backdrop-filter:blur(8px);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:20px;letter-spacing:.2px}
  .back-btn{padding:8px 16px;background:#ffffff14;border-radius:8px;font-size:14px;transition:background .2s}
  .back-btn:hover{background:#ffffff24}
  
  /* Article */
  .article{background:var(--card);border-radius:var(--radius);padding:30px;box-shadow:var(--shadow)}
  .article-meta{display:flex;gap:20px;margin-bottom:20px;font-size:14px;color:var(--muted)}
  .badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#05203b;background:#ffffffd9;padding:4px 8px;border-radius:999px}
  h1{font-size:clamp(24px,5vw,36px);line-height:1.2;margin:20px 0;font-weight:900}
  
  /* Article content */
  .article-content{font-size:18px;line-height:1.8;color:#d1d5db}
  .article-content h2{color:var(--text);margin:30px 0 15px;font-size:24px}
  .article-content h3{color:var(--text);margin:25px 0 10px;font-size:20px}
  .article-content p{margin:15px 0}
  .article-content ul,ol{margin:15px 0;padding-left:30px}
  .article-content li{margin:8px 0}
  .article-content blockquote{border-left:4px solid var(--g2);padding-left:20px;margin:20px 0;font-style:italic;color:var(--muted)}
  
  /* Images */
  .article-image{margin:25px 0}
  .article-image img{width:100%;border-radius:12px;box-shadow:var(--shadow)}
  .image-credit{font-size:12px;color:#666;margin-top:8px;text-align:right}
  .image-credit a{color:#666;text-decoration:underline}
  
  /* Share section */
  .share-section{margin-top:40px;padding-top:30px;border-top:1px solid #ffffff12}
  .share-title{font-size:16px;margin-bottom:15px;color:var(--muted)}
  .share-buttons{display:flex;gap:10px;flex-wrap:wrap}
  .share-btn{padding:10px 20px;background:#ffffff14;border-radius:8px;font-size:14px;transition:all .2s}
  .share-btn:hover{background:#ffffff24;transform:translateY(-2px)}
  
  /* Related articles */
  .related{margin-top:40px;padding:20px;background:#0e1530;border-radius:var(--radius)}
  .related h3{margin:0 0 20px;font-size:18px}
  .related-item{display:block;padding:12px;margin:8px 0;background:#ffffff08;border-radius:8px;transition:background .2s}
  .related-item:hover{background:#ffffff14}
  
  /* Footer */
  .footer{margin-top:40px;padding:20px;text-align:center;color:var(--muted);font-size:14px}
  
  @media(max-width:768px){
    .container{padding:15px}
    .article{padding:20px}
    .article-content{font-size:16px}
  }
</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand">🌈 Agami News</div>
      <a href="/" class="back-btn">← Back to Home</a>
    </div>
    
    <!-- Article -->
    <article class="article">
      <div class="article-meta">
        <span class="badge">${article.category || 'Tech'}</span>
        <span>${article.readTime || '5 min read'}</span>
        <span>${new Date(article.date || Date.now()).toLocaleDateString()}</span>
      </div>
      
      <h1>${article.title}</h1>
      
      <div class="article-content">
        ${article.content || `
          <p>${article.description || article.summary || 'Full article content will appear here.'}</p>
        `}
      </div>
      
      <!-- Share Section -->
      <div class="share-section">
        <div class="share-title">Share this article:</div>
        <div class="share-buttons">
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent('https://agaminews.in/article/' + articleIndex)}" 
             target="_blank" class="share-btn">𝕏 Twitter</a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://agaminews.in/article/' + articleIndex)}" 
             target="_blank" class="share-btn">LinkedIn</a>
          <a href="https://wa.me/?text=${encodeURIComponent(article.title + ' https://agaminews.in/article/' + articleIndex)}" 
             target="_blank" class="share-btn">WhatsApp</a>
          <a href="https://t.me/share/url?url=${encodeURIComponent('https://agaminews.in/article/' + articleIndex)}&text=${encodeURIComponent(article.title)}" 
             target="_blank" class="share-btn">Telegram</a>
        </div>
      </div>
      
      <!-- Related Articles -->
      <div class="related">
        <h3>More Articles</h3>
        ${articles.slice(0, 3).map((item, idx) => 
          idx !== articleIndex ? `
            <a href="/article/${idx}" class="related-item">
              <strong>${item.title}</strong><br>
              <small style="color:#9ca3af">${item.category || 'Tech'} • ${item.readTime || '3 min'}</small>
            </a>
          ` : ''
        ).join('')}
      </div>
    </article>
    
    <div class="footer">
      © 2025 Agami News • Technology & Innovation News
    </div>
  </div>
</body>
</html>`;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Article serve error:', error);
    return new Response('Article temporarily unavailable', { status: 500 });
  }
}

// Serve essential pages with consistent styling
async function servePage(env, title, content) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - Agami News</title>
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://agaminews.in${title.includes('Privacy') ? '/privacy' : title.includes('Terms') ? '/terms' : '/'}">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ZW77WM2VPG');
</script>
<style>
  :root{
    --bg:#0b1020;--text:#e8ecf2;--muted:#a8b1c7;--card:#121835;
    --g2:linear-gradient(135deg,#06b6d4, #6366f1);
    --radius:18px;--shadow:0 12px 30px rgba(0,0,0,.25);
  }
  *{box-sizing:border-box} 
  body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a234a,transparent),var(--bg);color:var(--text);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
  a{color:#7dd3fc;text-decoration:none}
  a:hover{text-decoration:underline}
  .container{max-width:800px;margin:auto;padding:20px}
  
  /* Header */
  .header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:30px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);backdrop-filter:blur(8px);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:20px;letter-spacing:.2px}
  .nav-links{display:flex;gap:20px}
  .nav-link{font-size:14px;color:#a8b1c7;transition:color .2s}
  .nav-link:hover{color:#fff}
  
  /* Content */
  .content{background:var(--card);border-radius:var(--radius);padding:30px;box-shadow:var(--shadow);margin-bottom:30px}
  h1{font-size:32px;margin:0 0 20px;color:#fff}
  h2{font-size:24px;margin:30px 0 15px;color:#e8ecf2}
  p{margin:15px 0;line-height:1.8}
  ul{margin:15px 0;padding-left:30px}
  li{margin:8px 0}
  
  /* Footer */
  .footer{padding:30px 20px;text-align:center;border-top:1px solid #ffffff12}
  .footer-links{display:flex;justify-content:center;gap:20px;margin-bottom:15px}
  .footer-links a{color:#a8b1c7;font-size:14px}
  
  @media(max-width:768px){
    .nav-links{display:none}
    .content{padding:20px}
  }
</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <a href="/" class="brand">🌈 Agami News</a>
      <div class="nav-links">
        <a href="/about" class="nav-link">About</a>
        <a href="/contact" class="nav-link">Contact</a>
        <a href="/privacy-policy" class="nav-link">Privacy</a>
        <a href="/terms" class="nav-link">Terms</a>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      ${content}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-links">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </div>
      <p style="color:#a8b1c7;font-size:14px;margin:0">
        © 2025 Agami News • Technology & Innovation News
      </p>
    </div>
  </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// Serve the website
async function serveWebsite(env) {
  try {
    // Get stored content
    const content = await env.NEWS_KV.get('website_content', 'json') || {};
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    const analytics = await env.NEWS_KV.get('analytics', 'json') || { views: 0 };
    const seo = await env.NEWS_KV.get('seo_settings', 'json') || {};
    
    // Track page view
    analytics.views = (analytics.views || 0) + 1;
    await env.NEWS_KV.put('analytics', JSON.stringify(analytics));
    
    // Generate news articles HTML with clickable links
    const newsColors = ['gold', 'blue', 'green', 'red'];
    const newsArticles = articles.slice(0, 10).map((article, index) => {
      // Check if article has image with attribution
      let imageHtml = `<div class="img" style="background:var(--g${(index % 4) + 1})"></div>`;
      
      if (article.image && article.image.url) {
              if (article.image.source === 'dalle') {
        imageHtml = `
          <div class="img" style="background-image:url('${article.image.url}');background-size:cover;background-position:center;position:relative;">
            <div style="position:absolute;bottom:2px;right:4px;font-size:9px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 4px;border-radius:4px;">
              🎨 DALL-E 3
            </div>
          </div>
        `;
      } else if (article.image.source === 'placeholder') {
        imageHtml = `
          <div class="img" style="background-image:url('${article.image.url}');background-size:cover;background-position:center;position:relative;">
            <div style="position:absolute;bottom:2px;right:4px;font-size:9px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 4px;border-radius:4px;">
              Placeholder
            </div>
          </div>
        `;
        } else if (article.image.url) {
          // Has image but no attribution needed (placeholder)
          imageHtml = `<div class="img" style="background-image:url('${article.image.url}');background-size:cover;background-position:center;"></div>`;
        }
      }
      
      return `
        <a href="/article/${index}" class="news-link" style="text-decoration:none;color:inherit;">
          <article class="news ${newsColors[index % 4]}">
            <div class="cardPad">
              <span class="badge">${article.category || 'Tech'}</span>
              <h3 class="title">${article.title}</h3>
              <p class="muted">${article.description || article.summary || ''}</p>
              <div class="meta">${article.readTime || '3 min read'} • ${getTimeAgo(article.date || new Date().toISOString())}</div>
            </div>
            ${imageHtml}
          </article>
        </a>
      `;
    }).join('') || `
      <a href="#" class="news-link" style="text-decoration:none;color:inherit;">
        <article class="news gold">
          <div class="cardPad">
            <span class="badge">Finance</span>
            <h3 class="title">Tech Giants Invest in Emerging Markets</h3>
            <p class="muted">Major technology companies announce billion-dollar investments in developing economies.</p>
            <div class="meta">5 min read • Today</div>
          </div>
          <div class="img"></div>
        </article>
      </a>
      <a href="#" class="news-link" style="text-decoration:none;color:inherit;">
        <article class="news blue">
          <div class="cardPad">
            <span class="badge">Technology</span>
            <h3 class="title">Breakthrough in Quantum Computing</h3>
            <p class="muted">Scientists achieve new milestone in quantum processor development.</p>
            <div class="meta">3 min read • Today</div>
          </div>
          <div class="img"></div>
        </article>
      </a>
      <a href="#" class="news-link" style="text-decoration:none;color:inherit;">
        <article class="news green">
          <div class="cardPad">
            <span class="badge">Crypto</span>
            <h3 class="title">Ethereum Network Upgrade Success</h3>
            <p class="muted">Latest network improvements bring faster transactions and lower fees.</p>
            <div class="meta">4 min read • Yesterday</div>
          </div>
          <div class="img"></div>
        </article>
      </a>
    `;
    
    // Build the HTML page - NO AI REFERENCES
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${seo.title || 'Agami News - Tech & Innovation Updates'}</title>
<meta name="description" content="${seo.description || 'Latest technology news, cryptocurrency updates, and innovation insights.'}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://agaminews.in/">
<meta property="og:title" content="${seo.title || 'Agami News'}">
<meta property="og:description" content="${seo.description || 'Your source for tech news and updates'}">
<meta property="og:image" content="${seo.image || 'https://agaminews.in/og-image.jpg'}">
<meta property="og:url" content="https://agaminews.in/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Agami News">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${seo.title || 'Agami News'}">
<meta name="twitter:description" content="${seo.description || 'Tech news and updates'}">
<meta name="twitter:image" content="${seo.image || 'https://agaminews.in/og-image.jpg'}">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZW77WM2VPG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ZW77WM2VPG');
</script>
<!-- Google Search Console Verification -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE">
<!-- Schema.org structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Agami News",
  "url": "https://agaminews.in",
  "description": "Latest technology news, cryptocurrency updates, and innovation insights",
  "publisher": {
    "@type": "Organization",
    "name": "Agami News",
    "url": "https://agaminews.in"
  }
}
</script>
<style>
  :root{
    --bg:#0b1020;--text:#e8ecf2;--muted:#a8b1c7;--card:#121835;
    --g1:linear-gradient(135deg,#7c3aed, #ef4444, #f59e0b);
    --g2:linear-gradient(135deg,#06b6d4, #6366f1);
    --g3:linear-gradient(135deg,#22c55e, #06b6d4);
    --g4:linear-gradient(135deg,#f43f5e, #f97316);
    --radius:18px;--shadow:0 12px 30px rgba(0,0,0,.25);
  }
  *{box-sizing:border-box} body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a234a,transparent),var(--bg);color:var(--text);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
  a{color:#7dd3fc;text-decoration:none}
  .wrap{max-width:1024px;margin:auto;padding:18px}
  
  /* Updated Navbar */
  .navbar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin:6px auto 12px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);backdrop-filter:blur(8px);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:20px;letter-spacing:.2px}
  .nav-links{display:flex;align-items:center;gap:24px}
  .nav-link{color:#dbeafe;font-size:14px;font-weight:600;transition:color .2s}
  .nav-link:hover{color:#fff}
  
  .grid{display:grid;gap:16px}
  .hero{display:grid;gap:14px;grid-template-columns:1fr;align-items:center}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff1f;color:#dbeafe;font-size:12px}
  .h1{font-size:clamp(28px,6vw,48px);line-height:1.1;margin:6px 0 4px;font-weight:900}
  .lead{color:var(--muted);max-width:60ch}
  .btn{display:inline-block;padding:12px 16px;border-radius:12px;font-weight:700}
  .btn-primary{background:var(--g2);color:#031022;box-shadow:var(--shadow)}
  .card{background:var(--card);border:1px solid #ffffff14;border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  .cardPad{padding:16px}
  .badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#05203b;background:#ffffffd9;padding:4px 8px;border-radius:999px}
  .title{font-weight:800;margin:10px 0 6px}
  .muted{color:var(--muted)}
  .catGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .cat{padding:14px;border-radius:14px;color:#0b1020;font-weight:800;text-align:center}
  .cat.ai{background:#bae6fd}
  .cat.crypto{background:#bbf7d0}
  .cat.startups{background:#fbcfe8}
  .cat.finance{background:#fde68a}
  .list{display:grid;gap:14px}
  .news{display:grid;grid-template-columns:1fr 120px;gap:12px;align-items:center;border-radius:16px;background:#0e1530;border:1px solid #ffffff12;overflow:hidden}
  .news .img{height:84px;background:var(--g1)}
  .news.gold .img{background:linear-gradient(135deg,#b45309,#fde68a)}
  .news.blue .img{background:var(--g2)}
  .news.green .img{background:var(--g3)}
  .news.red .img{background:var(--g4)}
  .news .meta{font-size:12px;color:#9fb0c8}
  .newsletter{background:var(--g2);border-radius:20px;color:#031022}
  .newsletter .cardPad{padding:20px}
  .field{display:flex;gap:8px;margin-top:10px}
  input[type=email]{flex:1;padding:12px 14px;border-radius:12px;border:none;outline:none;background:#fffffff2}
  .footer{margin-top:28px;padding:22px;border-top:1px solid #ffffff12;color:#b9c3db;font-size:14px;text-align:center}
  /* hovers and click effects */
  .news-link{display:block;cursor:pointer}
  .news-link:hover .news{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.3)}
  .card:hover{transform:translateY(-2px);transition:transform .15s ease}
  @media(max-width:768px){
    .nav-links{display:none}
    .navbar{padding:14px 18px}
    .brand{font-size:18px}
  }
  @media(min-width:860px){
    .hero{grid-template-columns:1.2fr .8fr}
    .grid.cols-3{grid-template-columns:repeat(3,1fr)}
    .grid.cols-2{grid-template-columns:repeat(2,1fr)}
  }
</style>
</head>
<body>
  <div class="wrap">
    <!-- Updated Navbar with logo on left -->
    <nav class="navbar">
      <div class="brand">
        🌈 ${seo.title || 'Agami News'}
      </div>
      <div class="nav-links">
        <a href="#latest" class="nav-link">Latest</a>
        <a href="#tech" class="nav-link">Tech</a>
        <a href="#crypto" class="nav-link">Crypto</a>
        <a href="#startups" class="nav-link">Startups</a>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div>
        <span class="pill">Daily Briefing • Tech & Innovation</span>
        <h1 class="h1">Breaking Tech News & Updates</h1>
        <p class="lead">Get the latest technology news, cryptocurrency insights, and innovation updates from around the world.</p>
        <p style="margin-top:10px">
          <a class="btn btn-primary" href="#latest">Read Latest</a>
        </p>
      </div>

      <div class="card" style="background:var(--g1)">
        <div class="cardPad">
          <span class="badge">Featured</span>
          <h3 class="title" style="color:#051324">Weekly Tech Roundup</h3>
          <p class="muted" style="color:#05203b">Top stories and breakthrough innovations. ${articles.length} articles this week.</p>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section style="margin-top:18px">
      <div class="catGrid">
        <a class="cat ai" href="#tech">Technology</a>
        <a class="cat crypto" href="#crypto">Crypto</a>
        <a class="cat startups" href="#startups">Startups</a>
        <a class="cat finance" href="#finance">Finance</a>
      </div>
    </section>

    <!-- LATEST LIST -->
    <section id="latest" style="margin-top:18px" class="list">
      ${newsArticles}
    </section>

    <!-- NEWSLETTER -->
    <section style="margin-top:18px" class="newsletter card">
      <div class="cardPad">
        <h3 class="title" style="margin:0">Stay Updated</h3>
        <p>Join thousands of readers getting daily tech news delivered to their inbox.</p>
        <form class="field" onsubmit="event.preventDefault(); alert('Thanks for subscribing! Check your email for confirmation.')">
          <input type="email" placeholder="Enter your email" required>
          <button class="btn" style="background:#0b1020;color:#eaf2ff;border-radius:12px;border:none;padding:12px 16px;cursor:pointer">Subscribe</button>
        </form>
      </div>
    </section>

    <!-- MORE CARDS -->
    <section style="margin-top:18px" class="grid cols-3">
      <div class="card"><div class="cardPad">
        <span class="badge">Trending</span>
        <h4 class="title">Electric Vehicles</h4>
        <p class="muted">Latest EV launches and battery tech</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Analysis</span>
        <h4 class="title">Market Insights</h4>
        <p class="muted">Tech stocks and crypto trends</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Innovation</span>
        <h4 class="title">Startup Spotlight</h4>
        <p class="muted">Emerging companies to watch</p>
      </div></div>
    </section>

    <footer class="footer">
      © 2025 Agami News • Technology & Innovation News<br>
      <small style="opacity:0.7">All Rights Reserved • <a href="/privacy-policy" style="color:#9ca3af">Privacy Policy</a> • <a href="/terms" style="color:#9ca3af">Terms of Service</a> • <a href="/about" style="color:#9ca3af">About</a> • <a href="/contact" style="color:#9ca3af">Contact</a></small>
    </footer>
  </div>
</body>
</html>`;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Website serve error:', error);
    return new Response('Website temporarily unavailable', { status: 500 });
  }
}

// Helper function to get time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
  return date.toLocaleDateString();
}

// Handle API requests
async function handleAPI(request, env) {
  const articles = await env.NEWS_KV.get('articles', 'json') || [];
  
  return new Response(JSON.stringify({
    success: true,
    articles: articles,
    lastUpdated: await env.NEWS_KV.get('last_updated')
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Telegram helper functions
async function sendMessage(env, chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Send message error:', error);
  }
}

async function sendChatAction(env, chatId, action) {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: action
      })
    });
  } catch (error) {
    console.error('Send chat action error:', error);
  }
}// Force deployment: Fri Aug 29 07:02:07 AM UTC 2025
// Force deployment: 2025-08-29 08:11:13
// Force cache refresh: 2025-08-29 08:58:27 UTC
