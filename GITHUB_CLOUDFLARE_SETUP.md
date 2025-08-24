# 🚀 GitHub + Cloudflare Auto-Deploy Setup

## ✅ MUCH BETTER WORKFLOW!

Now you can update your website through GitHub! I make changes → Push to GitHub → Auto-deploys to Cloudflare!

---

## 📱 One-Time Setup (5 minutes)

### Step 1: Get Your Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"**
4. Configure:
   - **Account Resources**: Include → Your Account
   - **Zone Resources**: Include → All zones
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **COPY THE TOKEN** (you'll see it only once!)

### Step 2: Get Your Account ID

1. Go to: https://dash.cloudflare.com
2. Right sidebar shows **"Account ID"**
3. Copy it

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repo: https://github.com/wahidsuman/ai-content-hub
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Add these secrets:

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: (paste your API token from Step 1)
   
   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: (paste your account ID from Step 2)

### Step 4: Get Your KV Namespace ID

Since you already have KV set up:
1. Go to Cloudflare Dashboard
2. Click **"Workers & Pages"**
3. Click **"KV"**
4. Find **NEWS_KV**
5. Copy its ID

### Step 5: Update wrangler.toml

Edit `/workspace/worker/wrangler.toml` and uncomment the KV section:
```toml
[[kv_namespaces]]
binding = "NEWS_KV"
id = "YOUR_ACTUAL_KV_ID_HERE"
```

---

## 🎯 How It Works Now:

### When You Want to Change Something:

1. **Tell me:** "Change the header to purple"
2. **I update the code** in `/workspace/worker/index.js`
3. **I push to GitHub**
4. **GitHub automatically deploys to Cloudflare**
5. **Your website updates in ~30 seconds!**

### No More:
- ❌ Copy-pasting code
- ❌ Manual Cloudflare dashboard edits
- ❌ Waiting for builds

### Instead:
- ✅ Just tell me what you want
- ✅ I handle everything
- ✅ Auto-deploys
- ✅ Version history in GitHub

---

## 📝 Examples:

Just tell me:
- "Make the header bigger"
- "Add social media icons"
- "Change to the colorful design I showed you"
- "Add a newsletter signup"
- "Make it 3 columns"

I'll update the code and push to GitHub → Auto-deploys!

---

## 🔧 Manual Deploy (if needed):

If auto-deploy doesn't trigger:
1. Go to: https://github.com/wahidsuman/ai-content-hub/actions
2. Click **"Deploy to Cloudflare Workers"**
3. Click **"Run workflow"**
4. Click **"Run workflow"** (green button)

---

## ✅ Benefits:

1. **Version Control**: Every change is tracked
2. **Rollback**: Can revert to previous versions
3. **Collaboration**: Others can contribute
4. **Automation**: No manual work
5. **Free**: Using GitHub Actions free tier

---

Your workflow is now:
**You → Me → GitHub → Cloudflare → Live Website**

All automated! 🚀