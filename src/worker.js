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

const authorized = (request, env) => {
  const supplied = request.headers.get('x-admin-password') || '';
  return supplied.length > 0 && supplied === env.ADMIN_PASSWORD;
};

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
      await env.DB.prepare('INSERT INTO testimonials (name, service, message) VALUES (?, ?, ?)').bind(name, service, message).run();
      return json({ ok: true }, 201);
    }
    if (url.pathname === '/api/admin/testimonials' && request.method === 'GET') {
      if (!authorized(request, env)) return json({ error: 'Não autorizado' }, 401);
      const { results } = await env.DB.prepare('SELECT id, name, service, message, approved, created_at FROM testimonials ORDER BY id DESC LIMIT 100').all();
      return json(results);
    }
    const match = url.pathname.match(/^\/api\/admin\/testimonials\/(\d+)$/);
    if (match && request.method === 'PATCH') {
      if (!authorized(request, env)) return json({ error: 'Não autorizado' }, 401);
      const body = await request.json().catch(() => null);
      const approved = body?.approved ? 1 : 0;
      await env.DB.prepare('UPDATE testimonials SET approved = ? WHERE id = ?').bind(approved, Number(match[1])).run();
      return json({ ok: true });
    }
    return json({ error: 'Não encontrado' }, 404);
  }
};
