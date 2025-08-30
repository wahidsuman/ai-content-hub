#!/usr/bin/env node

/**
 * Migration script to update all existing articles to use slug-only URLs
 * This script will:
 * 1. Fetch all articles from KV storage
 * 2. Update their URLs to remove numeric IDs
 * 3. Ensure unique slugs
 * 4. Save the updated articles back to KV
 */

// Helper function to generate SEO-friendly slug
function generateSlug(title, existingSlugs = []) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[₹$€£¥]/g, '') // Remove currency symbols
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 80); // Limit length for clean URLs
  
  // Ensure uniqueness if existingSlugs is provided
  if (existingSlugs && existingSlugs.length > 0) {
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }
  
  return baseSlug;
}

async function migrateArticles(env) {
  try {
    console.log('Starting article URL migration...');
    
    // Fetch all articles
    const articles = await env.NEWS_KV.get('articles', 'json') || [];
    console.log(`Found ${articles.length} articles to migrate`);
    
    // Track all slugs to ensure uniqueness
    const existingSlugs = [];
    
    // Update each article
    const updatedArticles = articles.map((article, index) => {
      // Ensure article has required fields
      if (!article.title) {
        console.log(`Skipping article at index ${index} - no title`);
        return article;
      }
      
      // Generate unique slug
      const slug = generateSlug(article.title, existingSlugs);
      existingSlugs.push(slug);
      
      // Update article
      const category = (article.category || 'news').toLowerCase();
      const oldUrl = article.url;
      const newUrl = `/${category}-news/${slug}`;
      
      if (oldUrl !== newUrl) {
        console.log(`Migrating: ${oldUrl} -> ${newUrl}`);
      }
      
      return {
        ...article,
        slug: slug,
        url: newUrl
      };
    });
    
    // Save updated articles back to KV
    await env.NEWS_KV.put('articles', JSON.stringify(updatedArticles));
    
    console.log('Migration completed successfully!');
    console.log(`Updated ${updatedArticles.length} articles`);
    
    // Create a backup of the old URLs for reference
    const urlMapping = articles.map((article, index) => ({
      oldUrl: article.url,
      newUrl: updatedArticles[index].url,
      title: article.title,
      id: article.id
    }));
    
    await env.NEWS_KV.put('url_migration_backup', JSON.stringify(urlMapping));
    console.log('Backup of URL mappings saved to url_migration_backup');
    
    return {
      success: true,
      articlesUpdated: updatedArticles.length,
      urlMapping: urlMapping
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in Worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migrateArticles, generateSlug };
}