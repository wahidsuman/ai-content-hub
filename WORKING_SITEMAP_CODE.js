addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  if (path === '/robots.txt') {
    return new Response('User-agent: *\nAllow: /\nSitemap: https://agaminews.in/sitemap.xml', {
      headers: { 'content-type': 'text/plain' }
    })
  }
  
  if (path === '/sitemap.xml') {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://agaminews.in/</loc><priority>1.0</priority></url>\n<url><loc>https://agaminews.in/about</loc><priority>0.8</priority></url>\n<url><loc>https://agaminews.in/contact</loc><priority>0.8</priority></url>\n<url><loc>https://agaminews.in/privacy-policy</loc><priority>0.5</priority></url>\n<url><loc>https://agaminews.in/terms</loc><priority>0.5</priority></url>\n</urlset>'
    return new Response(xml, {
      headers: { 'content-type': 'application/xml' }
    })
  }
  
  return new Response('<html><body><h1>Agami News</h1><p>Working! Test: <a href="/robots.txt">Robots.txt</a> | <a href="/sitemap.xml">Sitemap.xml</a></p></body></html>', {
    headers: { 'content-type': 'text/html' }
  })
}