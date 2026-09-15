const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function prepare(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    await prepare(env.DB);

    if (url.pathname === '/api/testimonials' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, name, service, message FROM testimonials WHERE approved = 1 ORDER BY id DESC LIMIT 20').all();
      return json(results);
    }
    if (url.pathname === '/api/testimonials' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const name = String(body?.name || '').trim();
      const service = String(body?.service || '').trim();
      const message = String(body?.message || '').trim();
      if (!name || !service || message.length < 5 || name.length > 60 || service.length > 80 || message.length > 500) return json({ error: 'Dados inválidos' }, 400);
      await env.DB.prepare('INSERT INTO testimonials (name, service, message, approved) VALUES (?, ?, ?, 1)').bind(name, service, message).run();
      return json({ ok: true }, 201);
    }
    return json({ error: 'Não encontrado' }, 404);
  }
};
