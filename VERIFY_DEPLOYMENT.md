# 🔍 Verify Your Cloudflare Settings

## Check These in Cloudflare Dashboard:

### 1. Worker Name
✅ Confirmed: `agaminews`

### 2. Account ID
Go to Cloudflare Dashboard → Right sidebar
Copy your **Account ID** (looks like: a1b2c3d4e5f6...)

**Is this the SAME as `CLOUDFLARE_ACCOUNT_ID` in GitHub Secrets?**

### 3. API Token Permissions
Your `CLOUDFLARE_API_TOKEN` needs these EXACT permissions:

Go to: My Profile → API Tokens → Create Token

**Required Permissions:**
- Account → Workers Scripts → Edit
- Account → Workers KV Storage → Edit  
- Account → Workers Tail → Read (optional)
- Account → Account Settings → Read

**Account Resources:** 
- Include → Your specific account (telegram-mcq-bot-wahid)

**Zone Resources:**
- Include → All zones (or specifically agaminews.in)

### 4. KV Namespace ID
In wrangler.toml we have:
```
id = "72c0dad910574e7cb4bd8bb5918af847"
```

**Check:** Workers → KV → Is this ID correct for your NEWS_KV namespace?

## 🚨 Common Issues:

### Issue 1: Wrong Account ID
- GitHub secret has different account ID than your actual account

### Issue 2: API Token Invalid
- Token expired
- Token lacks permissions
- Token for wrong account

### Issue 3: KV Namespace Mismatch
- The KV namespace ID in wrangler.toml doesn't exist in your account

## ✅ Quick Test:

Try deploying manually from your local machine:

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Navigate to worker directory
cd worker

# Try to deploy
wrangler deploy

# If it asks for authentication, that confirms API token issue
# If it says "worker not found", that confirms name issue
# If it deploys successfully, that confirms GitHub Actions issue
```

## 📊 GitHub Actions Error:

To see the exact error:
1. Go to your GitHub repo
2. Click "Actions" tab
3. Click on the failed workflow
4. Click "Deploy Worker"
5. Expand "Deploy to Cloudflare Workers"
6. **Copy the exact error message**

The error will tell us exactly what's wrong!