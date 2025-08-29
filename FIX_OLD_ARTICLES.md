# 🔧 Fix Old Articles with Unsplash Images

## The Problem:
- **NEW articles** will use DALL-E (deployment in progress)
- **OLD articles** still have Unsplash image references stored in KV

## Quick Fix Options:

### Option 1: Delete Old Broken Articles (Fastest)
Use your Telegram bot:
```
/delete
```
Then delete articles that show "Article generation failed" or have Unsplash images.

### Option 2: Clear All and Start Fresh
Send to your bot:
```
/clear
```
This will delete ALL articles. Then generate new ones with:
```
/news
/approve 1,2,3,4,5
```

### Option 3: Manual KV Cleanup
1. Go to Cloudflare Dashboard → Workers & Pages → KV
2. Open your KV namespace (`__agaminews-workers_sites_assets`)
3. Find the `articles` key
4. Edit it to remove broken articles

## Why This Happens:
The articles are stored in KV with their original HTML, including Unsplash image tags. Even though the code is updated, the old articles still exist with old image references.

## After Cleanup:
All NEW articles will:
- ✅ Use DALL-E for images
- ✅ Have clickable headlines
- ✅ Include backlinks
- ✅ Track with Google Analytics

## Verify Deployment:
Wait 2 minutes, then check: https://agaminews.in

If you still see issues after cleanup, the deployment might be cached. Try:
1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Clear browser cache
3. Try incognito/private mode

The new code IS deployed - it just needs the old articles cleaned up!