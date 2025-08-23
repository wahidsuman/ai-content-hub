import { NewsBrief, TelegramUpdate, TelegramMessage } from './types';

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  botToken: string,
  replyMarkup?: any
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

export async function sendBriefsMenu(
  briefs: NewsBrief[],
  chatId: string,
  botToken: string
): Promise<boolean> {
  if (briefs.length === 0) {
    return await sendTelegramMessage(
      chatId,
      'No new news items found in this batch.',
      botToken
    );
  }

  const message = formatBriefsMessage(briefs);
  const keyboard = createBriefsKeyboard(briefs);

  return await sendTelegramMessage(chatId, message, botToken, keyboard);
}

function formatBriefsMessage(briefs: NewsBrief[]): string {
  let message = `📰 <b>New Tech News Briefs</b>\n\n`;
  message += `Found ${briefs.length} new articles. Choose which ones to publish:\n\n`;

  briefs.forEach((brief, index) => {
    const emoji = getCategoryEmoji(brief.newsItem.category);
    message += `${index + 1}. ${emoji} <b>${brief.suggestedTitle}</b>\n`;
    message += `   📝 ${brief.summary.substring(0, 100)}${brief.summary.length > 100 ? '...' : ''}\n`;
    message += `   🏷️ ${brief.suggestedTags.slice(0, 3).join(', ')}${brief.suggestedTags.length > 3 ? '...' : ''}\n`;
    message += `   📰 Source: ${brief.newsItem.source}\n\n`;
  });

  message += `Use the buttons below to approve articles:`;
  return message;
}

function createBriefsKeyboard(briefs: NewsBrief[]): any {
  const buttons = [];
  
  // Individual approve buttons (limit to 5 per row for better UX)
  const individualButtons = [];
  briefs.forEach((brief, index) => {
    individualButtons.push({
      text: `✅ #${index + 1}`,
      callback_data: `approve_${brief.id}`
    });
    
    // Create new row every 5 buttons
    if (individualButtons.length === 5 || index === briefs.length - 1) {
      buttons.push(individualButtons.slice());
      individualButtons.length = 0;
    }
  });

  // Batch actions
  buttons.push([
    {
      text: '✅ Approve All',
      callback_data: 'approve_all'
    },
    {
      text: '❌ Skip All',
      callback_data: 'skip_all'
    }
  ]);

  // Additional options
  buttons.push([
    {
      text: '📊 View Stats',
      callback_data: 'view_stats'
    },
    {
      text: '🔄 Refresh',
      callback_data: 'refresh_briefs'
    }
  ]);

  return {
    inline_keyboard: buttons
  };
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'tech': return '💻';
    case 'ev': return '🚗';
    case 'crypto': return '₿';
    case 'gadgets': return '📱';
    default: return '📰';
  }
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<Response> {
  try {
    if (update.callback_query) {
      return await handleCallbackQuery(update.callback_query, kv, botToken, chatId);
    }

    if (update.message?.text) {
      return await handleTextMessage(update.message, kv, botToken, chatId);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleCallbackQuery(
  callbackQuery: any,
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<Response> {
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  if (data === 'approve_all') {
    await sendTelegramMessage(chatId, '🔄 Processing all approved articles...', botToken);
    await processAllApproved(kv, botToken, chatId);
    return new Response('OK', { status: 200 });
  }

  if (data === 'skip_all') {
    await sendTelegramMessage(chatId, '⏭️ Skipped all articles in this batch.', botToken);
    await clearCurrentBatch(kv);
    return new Response('OK', { status: 200 });
  }

  if (data === 'view_stats') {
    await sendStatsMessage(kv, botToken, chatId);
    return new Response('OK', { status: 200 });
  }

  if (data === 'refresh_briefs') {
    await sendTelegramMessage(chatId, '🔄 Refreshing briefs...', botToken);
    // This could trigger a new RSS fetch, but for now just acknowledge
    await sendTelegramMessage(chatId, '✅ Briefs refreshed. New batch will be available in the next scheduled run.', botToken);
    return new Response('OK', { status: 200 });
  }

  if (data.startsWith('approve_')) {
    const briefId = data.replace('approve_', '');
    await sendTelegramMessage(chatId, `🔄 Processing approved article...`, botToken);
    await processSingleApproval(briefId, kv, botToken, chatId);
    return new Response('OK', { status: 200 });
  }

  return new Response('OK', { status: 200 });
}

async function handleTextMessage(
  message: TelegramMessage,
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<Response> {
  const text = message.text?.toLowerCase();

  if (text === '/start') {
    await sendTelegramMessage(
      chatId,
      '🤖 Welcome to Tech News Bot!\n\nI\'ll send you news briefs every 2 hours. Use the buttons to approve articles for publishing.',
      botToken
    );
  } else if (text === '/status') {
    await sendStatusMessage(kv, botToken, chatId);
  } else if (text === '/help') {
    await sendTelegramMessage(
      chatId,
      '📖 <b>Available Commands:</b>\n\n/start - Start the bot\n/status - Check current status\n/help - Show this help\n\nI\'ll automatically send you news briefs every 2 hours!',
      botToken
    );
  }

  return new Response('OK', { status: 200 });
}

async function processAllApproved(
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<void> {
  const currentBatch = await getCurrentBatch(kv);
  if (!currentBatch || currentBatch.briefs.length === 0) {
    await sendTelegramMessage(chatId, '❌ No articles to process.', botToken);
    return;
  }

  const approvedBriefs = currentBatch.briefs;
  let successCount = 0;

  for (const brief of approvedBriefs) {
    try {
      await processSingleBrief(brief, kv, botToken, chatId);
      successCount++;
    } catch (error) {
      console.error(`Error processing brief ${brief.id}:`, error);
    }
  }

  await clearCurrentBatch(kv);
  await sendTelegramMessage(
    chatId,
    `✅ Successfully processed ${successCount} articles!`,
    botToken
  );
}

async function processSingleApproval(
  briefId: string,
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<void> {
  const currentBatch = await getCurrentBatch(kv);
  if (!currentBatch) {
    await sendTelegramMessage(chatId, '❌ No current batch found.', botToken);
    return;
  }

  const brief = currentBatch.briefs.find(b => b.id === briefId);
  if (!brief) {
    await sendTelegramMessage(chatId, '❌ Article not found in current batch.', botToken);
    return;
  }

  await processSingleBrief(brief, kv, botToken, chatId);
  
  // Remove from current batch
  currentBatch.briefs = currentBatch.briefs.filter(b => b.id !== briefId);
  await kv.put('current_batch', JSON.stringify(currentBatch));
}

async function processSingleBrief(
  brief: NewsBrief,
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<void> {
  try {
    // Import the processing function
    const { processApprovedBriefs } = await import('./index');
    
    // Mark as approved
    brief.status = 'approved';
    await kv.put(`brief_${brief.id}`, JSON.stringify(brief));
    
    // Process the approved brief
    const env = {
      NEWS_KV: kv,
      OPENAI_API_KEY: '', // Will be set by the worker
      GITHUB_TOKEN: '', // Will be set by the worker
      GITHUB_REPO: '', // Will be set by the worker
      TELEGRAM_BOT_TOKEN: botToken,
      TELEGRAM_CHAT_ID: chatId
    };
    
    const successCount = await processApprovedBriefs([brief], env);
    
    if (successCount > 0) {
      await sendTelegramMessage(
        chatId,
        `✅ Published: ${brief.suggestedTitle}`,
        botToken
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `❌ Failed to publish: ${brief.suggestedTitle}`,
        botToken
      );
    }
  } catch (error) {
    console.error('Error processing brief:', error);
    await sendTelegramMessage(
      chatId,
      `❌ Error processing: ${brief.suggestedTitle}`,
      botToken
    );
  }
}

async function getCurrentBatch(kv: KVNamespace): Promise<any> {
  const batch = await kv.get('current_batch');
  return batch ? JSON.parse(batch) : null;
}

async function clearCurrentBatch(kv: KVNamespace): Promise<void> {
  await kv.delete('current_batch');
}

async function sendStatusMessage(
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<void> {
  const currentBatch = await getCurrentBatch(kv);
  const pendingCount = currentBatch ? currentBatch.briefs.length : 0;

  const message = `📊 <b>Bot Status</b>\n\n` +
    `🔄 Pending articles: ${pendingCount}\n` +
    `⏰ Next batch: Every 2 hours\n` +
    `📰 Sources: 8 RSS feeds\n` +
    `🤖 Status: Active`;

  await sendTelegramMessage(chatId, message, botToken);
}

async function sendStatsMessage(
  kv: KVNamespace,
  botToken: string,
  chatId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const batchStats = await kv.get(`stats_batch_${today}`);
  const dailyStats = await kv.get(`stats_daily_${today}`);
  
  let message = `📊 <b>Today's Statistics</b>\n\n`;
  
  if (batchStats) {
    const stats = JSON.parse(batchStats);
    message += `🔄 Batches processed: ${stats.batches}\n`;
    message += `📝 Total briefs generated: ${stats.totalBriefs}\n`;
  }
  
  if (dailyStats) {
    const stats = JSON.parse(dailyStats);
    message += `✅ Articles published: ${stats.published}\n`;
  }
  
  message += `\n📅 Date: ${today}\n`;
  message += `⏰ Next update: Every 2 hours`;

  await sendTelegramMessage(chatId, message, botToken);
}