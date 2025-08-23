import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog');
  const sortedPosts = posts
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
    .slice(0, 50); // Limit to 50 latest posts

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tech News Blog</title>
    <description>Latest tech, EV, crypto, and gadget news curated by AI</description>
    <link>${Astro.site}</link>
    <atom:link href="${Astro.url}" rel="self" type="application/rss+xml" />
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${sortedPosts.map(post => `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <description>${escapeXml(post.data.description)}</description>
      <link>${Astro.site}/blog/${post.slug}</link>
      <guid>${Astro.site}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>
      <category>${post.data.tags?.join(', ') || ''}</category>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}