// SIMPLE FIX - Add this ONE command to your Telegram bot handler
// Find where other commands like /fetch, /stats are handled
// Add this code there:

else if (text === '/makeadmin') {
  // Force set yourself as admin - no questions asked
  await env.NEWS_KV.put('admin_chat', String(chatId));
  await sendMessage(env, chatId, `✅ Done! You are now the admin.

Your Chat ID: ${chatId}

You can now use:
• /delete <number> - Delete articles
• /clear - Clear all articles

Try: /delete 0`);
}

// That's it! Deploy this and send /makeadmin in Telegram