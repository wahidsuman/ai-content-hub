// Simplified AI Website Manager - Works without KV setup
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Simple static HTML that works immediately
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agami News - AI Powered Tech News</title>
<style>
  :root{
    --bg:#0b1020;--text:#e8ecf2;--muted:#a8b1c7;--card:#121835;
    --g1:linear-gradient(135deg,#7c3aed, #ef4444, #f59e0b);
    --g2:linear-gradient(135deg,#06b6d4, #6366f1);
    --g3:linear-gradient(135deg,#22c55e, #06b6d4);
    --g4:linear-gradient(135deg,#f43f5e, #f97316);
    --radius:18px;--shadow:0 12px 30px rgba(0,0,0,.25);
  }
  *{box-sizing:border-box} body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,#1a234a,transparent),var(--bg);color:var(--text);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
  a{color:#7dd3fc;text-decoration:none}
  .wrap{max-width:1024px;margin:auto;padding:18px}
  .header{display:flex;align-items:center;justify-content:center;padding:14px 16px;margin:6px auto 12px;border-radius:999px;background:linear-gradient(90deg,#111936aa,#0c122d88);backdrop-filter:blur(8px);border:1px solid #ffffff18}
  .brand{font-weight:800;font-size:18px;letter-spacing:.2px}
  .grid{display:grid;gap:16px}
  .hero{display:grid;gap:14px;grid-template-columns:1fr;align-items:center}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff1f;color:#dbeafe;font-size:12px}
  .h1{font-size:clamp(28px,6vw,48px);line-height:1.1;margin:6px 0 4px;font-weight:900}
  .lead{color:var(--muted);max-width:60ch}
  .btn{display:inline-block;padding:12px 16px;border-radius:12px;font-weight:700}
  .btn-primary{background:var(--g2);color:#031022;box-shadow:var(--shadow)}
  .card{background:var(--card);border:1px solid #ffffff14;border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  .cardPad{padding:16px}
  .badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#05203b;background:#ffffffd9;padding:4px 8px;border-radius:999px}
  .title{font-weight:800;margin:10px 0 6px}
  .muted{color:var(--muted)}
  .catGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .cat{padding:14px;border-radius:14px;color:#0b1020;font-weight:800;text-align:center}
  .cat.ai{background:#bae6fd}
  .cat.crypto{background:#bbf7d0}
  .cat.startups{background:#fbcfe8}
  .cat.finance{background:#fde68a}
  .list{display:grid;gap:14px}
  .news{display:grid;grid-template-columns:1fr 120px;gap:12px;align-items:center;border-radius:16px;background:#0e1530;border:1px solid #ffffff12;overflow:hidden}
  .news .img{height:84px;background:var(--g1)}
  .news.gold .img{background:linear-gradient(135deg,#b45309,#fde68a)}
  .news.blue .img{background:var(--g2)}
  .news.green .img{background:var(--g3)}
  .news.red .img{background:var(--g4)}
  .news .meta{font-size:12px;color:#9fb0c8}
  .newsletter{background:var(--g2);border-radius:20px;color:#031022}
  .newsletter .cardPad{padding:20px}
  .field{display:flex;gap:8px;margin-top:10px}
  input[type=email]{flex:1;padding:12px 14px;border-radius:12px;border:none;outline:none;background:#fffffff2}
  .footer{margin-top:28px;padding:22px;border-top:1px solid #ffffff12;color:#b9c3db;font-size:14px;text-align:center}
  .ai-powered{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:999px;font-size:11px;font-weight:700;color:#fff}
  .card:hover,.news:hover{transform:translateY(-2px);transition:transform .15s ease}
  @media(min-width:860px){
    .hero{grid-template-columns:1.2fr .8fr}
    .grid.cols-3{grid-template-columns:repeat(3,1fr)}
    .grid.cols-2{grid-template-columns:repeat(2,1fr)}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header"><div class="brand">🌈 Agami News</div></div>

    <!-- HERO -->
    <section class="hero">
      <div>
        <span class="pill">Daily Briefing • AI & Tech</span>
        <h1 class="h1">AI-Powered News Platform</h1>
        <p class="lead">Get the latest tech news, AI breakthroughs, and innovation updates. All content managed and updated by artificial intelligence.</p>
        <p style="margin-top:10px">
          <a class="btn btn-primary" href="#latest">Read Latest</a>
        </p>
        <span class="ai-powered">🤖 Managed by AI</span>
      </div>

      <div class="card" style="background:var(--g1)">
        <div class="cardPad">
          <span class="badge">Featured</span>
          <h3 class="title" style="color:#051324">AI-Generated Content</h3>
          <p class="muted" style="color:#05203b">Fresh updates every 2 hours. Content managed via Telegram bot.</p>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section style="margin-top:18px">
      <div class="catGrid">
        <a class="cat ai" href="#ai">AI</a>
        <a class="cat crypto" href="#crypto">Crypto</a>
        <a class="cat startups" href="#startups">Startups</a>
        <a class="cat finance" href="#finance">Finance</a>
      </div>
    </section>

    <!-- LATEST LIST -->
    <section id="latest" style="margin-top:18px" class="list">
      <article class="news gold">
        <div class="cardPad">
          <span class="badge">Finance</span>
          <h3 class="title">Tech giants invest in AI startups</h3>
          <p class="muted">Over $1B invested in AI tools in 2025.</p>
          <div class="meta">5 min read • Today</div>
        </div>
        <div class="img"></div>
      </article>

      <article class="news blue">
        <div class="cardPad">
          <span class="badge">AI</span>
          <h3 class="title">Robots enter the workforce</h3>
          <p class="muted">Automation rises across logistics and healthcare.</p>
          <div class="meta">3 min read • Today</div>
        </div>
        <div class="img"></div>
      </article>

      <article class="news green">
        <div class="cardPad">
          <span class="badge">Crypto</span>
          <h3 class="title">Ethereum 3.0 update lands</h3>
          <p class="muted">Massive improvements in speed and scalability.</p>
          <div class="meta">4 min read • Yesterday</div>
        </div>
        <div class="img"></div>
      </article>

      <article class="news red">
        <div class="cardPad">
          <span class="badge">Startups</span>
          <h3 class="title">New unicorn emerges in EdTech</h3>
          <p class="muted">AI-powered learning platform raises $500M.</p>
          <div class="meta">6 min read • Today</div>
        </div>
        <div class="img"></div>
      </article>
    </section>

    <!-- NEWSLETTER -->
    <section style="margin-top:18px" class="newsletter card">
      <div class="cardPad">
        <h3 class="title" style="margin:0">Stay in the loop</h3>
        <p>Join our AI-powered news updates. Content refreshes automatically!</p>
        <form class="field" onsubmit="event.preventDefault(); alert('Thanks for subscribing! Updates coming soon.')">
          <input type="email" placeholder="Enter your email" required>
          <button class="btn" style="background:#0b1020;color:#eaf2ff;border-radius:12px;border:none;padding:12px 16px;cursor:pointer">Subscribe</button>
        </form>
      </div>
    </section>

    <!-- MORE CARDS -->
    <section style="margin-top:18px" class="grid cols-3">
      <div class="card"><div class="cardPad">
        <span class="badge">Breaking</span>
        <h4 class="title">GPT-5 rumors intensify</h4>
        <p class="muted">OpenAI hints at major announcement next month.</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Tools</span>
        <h4 class="title">New vector DB ships</h4>
        <p class="muted">Hybrid search with low-latency pipelines.</p>
      </div></div>
      <div class="card"><div class="cardPad">
        <span class="badge">Policy</span>
        <h4 class="title">EU drafts AI rules</h4>
        <p class="muted">Transparency & safety testing proposed.</p>
      </div></div>
    </section>

    <footer class="footer">
      © 2025 Agami News • AI-Powered Tech News • Managed via Telegram<br>
      <small style="opacity:0.7">Setting up AI content generation...</small>
    </footer>
  </div>
</body>
</html>`;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      }
    });
  }
};