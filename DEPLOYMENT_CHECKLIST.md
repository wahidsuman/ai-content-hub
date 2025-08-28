# 🚀 AgamiNews Deployment Checklist

## ✅ Pre-Deployment Checks

### 1. Environment Variables (Cloudflare Worker Settings)
- [ ] `TELEGRAM_BOT_TOKEN` - From @BotFather
- [ ] `OPENAI_API_KEY` - From OpenAI Platform
- [ ] `GITHUB_TOKEN` - Optional (for GitHub integration)
- [ ] `UNSPLASH_ACCESS_KEY` - Optional (for free images)
- [ ] `PEXELS_API_KEY` - Optional (for free images)

### 2. KV Namespace
- [ ] `NEWS_KV` binding exists in wrangler.toml
- [ ] KV namespace ID is correct
- [ ] Preview ID matches production ID

### 3. Cron Triggers
- [ ] Cron schedule in wrangler.toml: `crons = ["0 */3 * * *"]`
- [ ] GitHub Actions backup cron configured

---

## 📋 Feature Checklist

### Core Features
- [x] 100% Original Content (GPT-4 Turbo)
- [x] 100% Relevant Images (DALL-E 3 HD)
- [x] SEO-Friendly URLs (like NDTV)
- [x] Single Article Fetch (1 per command)
- [x] 3-Hour Auto-Publishing

### Management Features
- [x] `/create <topic>` - Manual article creation
- [x] `/delete <id>` - Delete specific articles
- [x] `/costs` - Detailed cost tracking
- [x] `/top` - Performance tracking
- [x] `/cron-logs` - Cron history

### System Features
- [x] Keyword extraction for images
- [x] Performance recommendations
- [x] Health check endpoint
- [x] Manual cron triggers
- [x] Cost projections

---

## 🧪 Post-Deployment Tests

### 1. Telegram Bot
```
/menu - Check if dashboard loads with live data
/fetch - Test single article fetch
/create test article - Test manual creation
/delete 0 - Test deletion
/costs - Check cost report
/top - View top articles
/cron-logs - Check cron history
```

### 2. Web Endpoints
```
https://agaminews.in/ - Homepage loads
https://agaminews.in/health - Health check
https://agaminews.in/trigger?key=agami2024 - Manual trigger
https://agaminews.in/force-cron - Force cron
```

### 3. Cron Verification
- Check `/cron-logs` after deployment
- Wait for next 3-hour mark
- Verify article published automatically

---

## 🔍 Monitoring

### Daily Checks
1. Send `/costs` - Monitor budget
2. Send `/cron-logs` - Verify auto-publishing
3. Check website for new articles

### Weekly Checks
1. Send `/top` - Review performance
2. Send `/analytics` - Check traffic
3. Review Google Analytics

---

## 🚨 Troubleshooting

### If Cron Not Working:
1. Check `/cron-logs` for errors
2. Use `/cron` to manually trigger
3. Check health endpoint: `/health`
4. Verify GitHub Actions is running

### If Images Generic:
1. Check OPENAI_API_KEY is set
2. Check Cloudflare logs for DALL-E errors
3. Verify API key has credits

### If No Notifications:
1. Check TELEGRAM_BOT_TOKEN
2. Verify admin_chat is set
3. Test with `/test-notify`

---

## 📊 Success Metrics

- ✅ 8 articles published daily
- ✅ Cost under $10/month
- ✅ 100% original content
- ✅ Relevant images for each article
- ✅ SEO-friendly URLs
- ✅ Automatic publishing every 3 hours

---

## 🔗 Important URLs

- Website: https://agaminews.in
- GitHub: https://github.com/wahidsuman/ai-content-hub
- Cloudflare Dashboard: https://dash.cloudflare.com
- OpenAI Usage: https://platform.openai.com/usage
- Google Analytics: https://analytics.google.com

---

## 💡 Final Notes

1. **Budget**: $0.04 per article (GPT-4 + DALL-E)
2. **Daily Limit**: 8 articles (3-hourly schedule)
3. **Monthly Cost**: ~$9.60 (240 articles)
4. **Cron Schedule**: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 IST

**System is production-ready when all checks pass!** ✅