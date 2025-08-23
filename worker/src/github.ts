import { NewsBrief, GitHubCommit } from './types';

export async function commitArticleToGitHub(
  brief: NewsBrief,
  articleContent: string,
  githubToken: string,
  repoName: string
): Promise<boolean> {
  try {
    const fileName = generateFileName(brief);
    const filePath = `site/src/content/blog/${fileName}`;
    
    const commit: GitHubCommit = {
      message: `Add article: ${brief.suggestedTitle}`,
      content: Buffer.from(articleContent).toString('base64'),
      path: filePath
    };

    const response = await fetch(
      `https://api.github.com/repos/${repoName}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TechNewsBot/1.0'
        },
        body: JSON.stringify({
          message: commit.message,
          content: commit.content,
          branch: 'main'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', error);
      return false;
    }

    console.log(`Successfully committed article: ${fileName}`);
    return true;
  } catch (error) {
    console.error('Error committing to GitHub:', error);
    return false;
  }
}

export async function commitMultipleArticles(
  briefs: NewsBrief[],
  articles: string[],
  githubToken: string,
  repoName: string
): Promise<number> {
  let successCount = 0;

  // Process commits in parallel batches to optimize for 10-15 posts/day
  const batchSize = 3; // Process 3 commits at a time
  for (let i = 0; i < briefs.length; i += batchSize) {
    const batch = briefs.slice(i, i + batchSize);
    const batchArticles = articles.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (brief, index) => {
      try {
        const success = await commitArticleToGitHub(
          brief,
          batchArticles[index],
          githubToken,
          repoName
        );
        return success ? 1 : 0;
      } catch (error) {
        console.error(`Error committing article ${i + index}:`, error);
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    successCount += batchResults.reduce((sum, result) => sum + result, 0);
    
    // Optimized delay between batches
    if (i + batchSize < briefs.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return successCount;
}

function generateFileName(brief: NewsBrief): string {
  const title = brief.suggestedTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  const date = new Date().toISOString().split('T')[0];
  return `${date}-${title}.md`;
}

export async function getGitHubFile(
  path: string,
  githubToken: string,
  repoName: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'TechNewsBot/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error fetching GitHub file:', error);
    return null;
  }
}

export async function updateSiteConfig(
  briefs: NewsBrief[],
  githubToken: string,
  repoName: string
): Promise<boolean> {
  try {
    // Update RSS feed
    await updateRSSFeed(briefs, githubToken, repoName);
    
    // Update sitemap
    await updateSitemap(briefs, githubToken, repoName);
    
    return true;
  } catch (error) {
    console.error('Error updating site config:', error);
    return false;
  }
}

async function updateRSSFeed(
  briefs: NewsBrief[],
  githubToken: string,
  repoName: string
): Promise<void> {
  const rssPath = 'site/public/rss.xml';
  const existingRSS = await getGitHubFile(rssPath, githubToken, repoName);
  
  let rssContent = existingRSS || generateBaseRSS();
  
  // Add new items to RSS
  for (const brief of briefs) {
    const rssItem = generateRSSItem(brief);
    rssContent = insertRSSItem(rssContent, rssItem);
  }
  
  // Keep only latest 50 items
  rssContent = limitRSSItems(rssContent, 50);
  
  // Commit updated RSS
  await commitFileToGitHub(
    rssPath,
    rssContent,
    'Update RSS feed with new articles',
    githubToken,
    repoName
  );
}

function generateBaseRSS(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech News Blog</title>
    <description>Latest tech, EV, crypto, and gadget news</description>
    <link>https://agaminews.in</link>
    <language>en-US</language>
  </channel>
</rss>`;
}

function generateRSSItem(brief: NewsBrief): string {
  const pubDate = new Date().toUTCString();
  const link = `https://agaminews.in/blog/${generateFileName(brief).replace('.md', '')}`;
  
  return `
    <item>
      <title>${escapeXml(brief.suggestedTitle)}</title>
      <description>${escapeXml(brief.summary)}</description>
      <link>${link}</link>
      <pubDate>${pubDate}</pubDate>
      <guid>${link}</guid>
    </item>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function insertRSSItem(rssContent: string, rssItem: string): string {
  const channelEnd = rssContent.indexOf('</channel>');
  if (channelEnd === -1) return rssContent;
  
  return rssContent.slice(0, channelEnd) + rssItem + rssContent.slice(channelEnd);
}

function limitRSSItems(rssContent: string, limit: number): string {
  const items = rssContent.match(/<item>[\s\S]*?<\/item>/g) || [];
  if (items.length <= limit) return rssContent;
  
  const keepItems = items.slice(0, limit);
  const channelStart = rssContent.indexOf('<channel>') + '<channel>'.length;
  const channelEnd = rssContent.indexOf('</channel>');
  
  const channelContent = rssContent.slice(channelStart, channelEnd);
  const nonItemContent = channelContent.replace(/<item>[\s\S]*?<\/item>/g, '').trim();
  
  return rssContent.slice(0, channelStart) + 
         nonItemContent + 
         keepItems.join('') + 
         rssContent.slice(channelEnd);
}

async function updateSitemap(
  briefs: NewsBrief[],
  githubToken: string,
  repoName: string
): Promise<void> {
  const sitemapPath = 'site/public/sitemap.xml';
  const existingSitemap = await getGitHubFile(sitemapPath, githubToken, repoName);
  
  let sitemapContent = existingSitemap || generateBaseSitemap();
  
  // Add new URLs to sitemap
  for (const brief of briefs) {
    const url = `https://agaminews.in/blog/${generateFileName(brief).replace('.md', '')}`;
    const sitemapUrl = generateSitemapUrl(url);
    sitemapContent = insertSitemapUrl(sitemapContent, sitemapUrl);
  }
  
  // Commit updated sitemap
  await commitFileToGitHub(
    sitemapPath,
    sitemapContent,
    'Update sitemap with new articles',
    githubToken,
    repoName
  );
}

function generateBaseSitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://agaminews.in</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
}

function generateSitemapUrl(url: string): string {
  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
}

function insertSitemapUrl(sitemapContent: string, sitemapUrl: string): string {
  const urlsetEnd = sitemapContent.indexOf('</urlset>');
  if (urlsetEnd === -1) return sitemapContent;
  
  return sitemapContent.slice(0, urlsetEnd) + sitemapUrl + sitemapContent.slice(urlsetEnd);
}

async function commitFileToGitHub(
  path: string,
  content: string,
  message: string,
  githubToken: string,
  repoName: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TechNewsBot/1.0'
        },
        body: JSON.stringify({
          message,
          content: Buffer.from(content).toString('base64'),
          branch: 'main'
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error committing file to GitHub:', error);
    return false;
  }
}