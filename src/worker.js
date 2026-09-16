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
  await db.prepare(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
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
    if (url.pathname === '/api/bookings' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const name = String(body?.name || '').trim();
      const phone = String(body?.phone || '').trim();
      const service = String(body?.service || '').trim();
      const date = String(body?.date || '').trim();
      const time = String(body?.time || '').trim();
      const notes = String(body?.notes || '').trim();
      if (!name || !phone || !service || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || name.length > 60 || phone.length > 20 || service.length > 80 || notes.length > 500) return json({ error: 'Dados inválidos' }, 400);
      const today = new Date().toISOString().slice(0, 10);
      if (date < today) return json({ error: 'Escolha uma data futura' }, 400);
      await env.DB.prepare('INSERT INTO bookings (name, phone, service, booking_date, booking_time, notes) VALUES (?, ?, ?, ?, ?, ?)').bind(name, phone, service, date, time, notes).run();
      return json({ ok: true }, 201);
    }
    return json({ error: 'Não encontrado' }, 404);
  }
};
