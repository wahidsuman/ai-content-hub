# Image Storage Improvements

## Overview
Enhanced image storage system to ensure all images are permanently stored and never expire, using multiple fallback mechanisms.

## Storage Hierarchy

### 1. Primary: Cloudflare R2 Storage
- **Permanent storage** for all images
- **No expiration** - images stored indefinitely
- **Fast CDN delivery** through Cloudflare network
- **URL format**: `/media/images/{hash}.jpg`

### 2. Fallback: KV Storage
- **Automatic fallback** if R2 is unavailable or fails
- **30-day retention** with automatic renewal on access
- **Base64 encoded** storage in Cloudflare KV
- **URL format**: `/media/kv/img_{hash}.jpg`

### 3. Ultimate Fallback: Proxy URL
- **Only used if both R2 and KV fail**
- **Not recommended** as URLs may expire
- **URL format**: `/img/?src={encoded_url}`

## Key Improvements

### 1. Retry Mechanism
```javascript
// Attempts storage 3 times before falling back
for (let attempt = 1; attempt <= retries; attempt++) {
  try {
    // Store in R2
    await env.MEDIA_R2.put(key, body, { httpMetadata: { contentType: ct } });
    return `/media/${key}`;
  } catch (e) {
    // Retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
```

### 2. KV Storage Fallback
- Automatically stores images in KV if R2 fails
- Converts images to base64 for KV compatibility
- 30-day expiration (much longer than DALL-E URLs)
- Seamlessly served through same `/media/` endpoint

### 3. Unified Media Serving
The `/media/` endpoint now handles both:
- **R2 stored images**: Direct binary serving
- **KV stored images**: Base64 decoding and serving
- Proper cache headers for browser caching
- Content-Type detection and setting

## Benefits

1. **No More Expired Images**
   - DALL-E URLs expire after ~1 hour
   - Our stored images are permanent

2. **Better Performance**
   - Images served from Cloudflare's edge network
   - Aggressive browser caching (1 year for R2, 30 days for KV)
   - Reduced API calls to external services

3. **Reliability**
   - Multiple fallback mechanisms
   - Retry logic for transient failures
   - Graceful degradation

4. **Cost Efficiency**
   - R2 storage is very cost-effective
   - KV storage as backup (minimal cost)
   - Reduces bandwidth to external image sources

## Configuration Required

### R2 Bucket Setup
1. Create R2 bucket in Cloudflare dashboard
2. Bind to Worker as `MEDIA_R2`
3. No public access needed (served through Worker)

### KV Namespace Setup
1. Already using `NEWS_KV` for articles
2. Images stored with `img_` prefix
3. Automatic cleanup after 30 days

## URL Structure

### Successful Storage
```
Input: https://oaidalleapiprodscus.blob.core.windows.net/...
Output: /media/images/a3f2d8b9c1e5...jpg
```

### KV Fallback
```
Input: https://oaidalleapiprodscus.blob.core.windows.net/...
Output: /media/kv/img_a3f2d8b9c1e5.jpg
```

## Error Handling

1. **R2 Not Configured**: Falls back to KV storage
2. **R2 Upload Fails**: Retries 3 times, then KV storage
3. **KV Storage Fails**: Uses proxy URL as last resort
4. **Image Fetch Fails**: Returns error, no broken images

## Monitoring

Check logs for:
- `[R2] Successfully stored image` - Successful R2 storage
- `[R2] Image already stored` - Deduplication working
- `[KV] Image stored as fallback` - KV fallback activated
- `[R2] Storage not configured` - R2 needs setup

## Cost Implications

- **R2 Storage**: ~$0.015 per GB per month
- **KV Storage**: ~$0.50 per million reads
- **Bandwidth**: Free within Cloudflare network
- **Much cheaper than repeated DALL-E generations**

## Deployment

These improvements are integrated into the worker and will be active once deployed. Ensure R2 bucket is properly bound to the Worker.