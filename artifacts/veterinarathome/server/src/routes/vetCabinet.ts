import { Router, Response, NextFunction } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createIncomingOrder } from '../vetDemo';

// ═══════════════════════════════════════════════════════════════════
//  Кабинет ветеринара (исполнителя): онлайн-статус, заказы, доход,
//  расходы, уровни KPI, лига врачей, новости.
// ═══════════════════════════════════════════════════════════════════

// Уровни врача: чем больше выполненных визитов и выше рейтинг — тем больше доля от заказа
export const VET_TIERS = [
  { key: 'bronze',   name: 'Бронза',  icon: '🥉', percent: 55, minOrders: 0,   minRating: 0,   color: '#D08A4E' },
  { key: 'silver',   name: 'Серебро', icon: '🥈', percent: 60, minOrders: 30,  minRating: 4.7, color: '#C9CFD6' },
  { key: 'gold',     name: 'Золото',  icon: '🥇', percent: 65, minOrders: 80,  minRating: 4.8, color: '#F2C14E' },
  { key: 'platinum', name: 'Платина', icon: '💎', percent: 70, minOrders: 150, minRating: 4.9, color: '#9FE3E0' },
];

export function tierFor(completed: number, rating: number) {
  let t = VET_TIERS[0];
  for (const x of VET_TIERS) if (completed >= x.minOrders && rating >= x.minRating) t = x;
  return t;
}

export const EXPENSE_CATEGORIES: Record<string, string> = {
  fuel: 'Топливо и такси',
  materials: 'Расходные материалы',
  drugs: 'Препараты',
  education: 'Обучение',
  phone: 'Связь',
  other: 'Прочее',
};

const ACTIVE = ['confirmed', 'on_the_way', 'arrived', 'in_progress'];
const NEXT: Record<string, string> = { confirmed: 'on_the_way', on_the_way: 'arrived', arrived: 'in_progress', in_progress: 'completed' };
const STATUS_COMMENT: Record<string, string> = {
  confirmed: 'Ветеринар принял заказ',
  on_the_way: 'Ветеринар выехал к вам',
  arrived: 'Ветеринар прибыл',
  in_progress: 'Идёт приём',
  completed: 'Приём завершён',
};

export async function initVetCabinet() {
  await pool.query(`
    ALTER TABLE vets ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    ALTER TABLE vets ADD COLUMN IF NOT EXISTS district VARCHAR(255);
    ALTER TABLE vets ADD COLUMN IF NOT EXISTS education TEXT;
    ALTER TABLE vets ADD COLUMN IF NOT EXISTS transport VARCHAR(100);
    ALTER TABLE vets ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 5;
    ALTER TABLE vets ADD COLUMN IF NOT EXISTS online_since TIMESTAMP;

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS vet_percent INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS vet_payout INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS vet_conclusion TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_rating SMALLINT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_review TEXT;

    CREATE TABLE IF NOT EXISTS vet_order_declines (
      vet_id INTEGER REFERENCES vets(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (vet_id, order_id)
    );
    CREATE TABLE IF NOT EXISTS vet_expenses (
      id SERIAL PRIMARY KEY,
      vet_id INTEGER REFERENCES vets(id) ON DELETE CASCADE,
      category VARCHAR(30) NOT NULL,
      amount INTEGER NOT NULL,
      note TEXT,
      spent_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vet_shifts (
      id SERIAL PRIMARY KEY,
      vet_id INTEGER REFERENCES vets(id) ON DELETE CASCADE,
      started_at TIMESTAMP NOT NULL,
      ended_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vet_payouts (
      id SERIAL PRIMARY KEY,
      vet_id INTEGER REFERENCES vets(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vet_news (
      id SERIAL PRIMARY KEY,
      category VARCHAR(30) NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      image_url TEXT,
      source VARCHAR(120),
      published_at TIMESTAMP DEFAULT NOW(),
      pinned BOOLEAN DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_orders_vet ON orders(vet_id, status);
  `);
}

// ─── helpers ──────────────────────────────────────────────────────
interface VetReq extends AuthRequest { vet?: { id: number; user_id: number } }

async function loadVet(req: VetReq, res: Response, next: NextFunction) {
  const r = await pool.query('SELECT id, user_id FROM vets WHERE user_id = $1', [req.user!.id]);
  if (!r.rows[0]) { res.status(403).json({ error: 'Кабинет доступен только ветеринарам' }); return; }
  req.vet = r.rows[0];
  next();
}

const wrap = (fn: (req: VetReq, res: Response) => Promise<unknown>) =>
  (req: VetReq, res: Response) => { fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }); };

async function vetMetrics(vetId: number) {
  const r = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_total,
       COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '30 days')::int AS completed_30d,
       COUNT(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE)::int AS completed_today,
       COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= date_trunc('week', NOW()))::int AS completed_week,
       COALESCE(SUM(vet_payout) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE), 0)::int AS earned_today,
       COALESCE(SUM(vet_payout) FILTER (WHERE status = 'completed' AND completed_at >= date_trunc('week', NOW())), 0)::int AS earned_week,
       COALESCE(SUM(vet_payout) FILTER (WHERE status = 'completed' AND completed_at >= date_trunc('month', NOW())), 0)::int AS earned_month,
       COALESCE(SUM(vet_payout) FILTER (WHERE status = 'completed'), 0)::int AS earned_total,
       ROUND(AVG(client_rating) FILTER (WHERE client_rating IS NOT NULL), 2)::float AS rating,
       COUNT(client_rating)::int AS reviews,
       ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) FILTER (WHERE accepted_at IS NOT NULL AND accepted_at > created_at), 1)::float AS avg_accept_min
     FROM orders WHERE vet_id = $1`, [vetId]);
  const ret = await pool.query(
    `SELECT COUNT(*)::int AS clients, COUNT(*) FILTER (WHERE n > 1)::int AS returning
     FROM (SELECT client_id, COUNT(*) n FROM orders WHERE vet_id = $1 AND status = 'completed' GROUP BY client_id) t`, [vetId]);
  const dec = await pool.query(
    `SELECT (SELECT COUNT(*) FROM vet_order_declines WHERE vet_id = $1 AND created_at >= NOW() - INTERVAL '30 days')::int AS declined,
            (SELECT COUNT(*) FROM orders WHERE vet_id = $1 AND accepted_at >= NOW() - INTERVAL '30 days')::int AS accepted`, [vetId]);
  const hours = await pool.query(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - GREATEST(started_at, $2::timestamp))) / 3600)
              FILTER (WHERE COALESCE(ended_at, NOW()) > $2::timestamp), 0)::float AS h
     FROM vet_shifts WHERE vet_id = $1`, [vetId, new Date(Date.now() - 30 * 86400_000).toISOString()]);
  const hoursToday = await pool.query(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - GREATEST(started_at, CURRENT_DATE::timestamp))) / 3600)
              FILTER (WHERE COALESCE(ended_at, NOW()) > CURRENT_DATE::timestamp), 0)::float AS h
     FROM vet_shifts WHERE vet_id = $1`, [vetId]);
  const m = r.rows[0];
  const { clients, returning } = ret.rows[0];
  const { declined, accepted } = dec.rows[0];
  return {
    ...m,
    rating: m.rating ?? 5,
    clients,
    return_rate: clients ? Math.round((returning / clients) * 100) : 0,
    acceptance_rate: accepted + declined ? Math.round((accepted / (accepted + declined)) * 100) : 100,
    hours_30d: Math.round(hours.rows[0].h),
    hours_today: Math.round(hoursToday.rows[0].h * 10) / 10,
  };
}

function tierInfo(completed: number, rating: number) {
  const tier = tierFor(completed, rating);
  const idx = VET_TIERS.indexOf(tier);
  const next = VET_TIERS[idx + 1] ?? null;
  return {
    current: tier,
    next,
    orders_to_next: next ? Math.max(0, next.minOrders - completed) : 0,
    rating_ok_for_next: next ? rating >= next.minRating : true,
    progress: next ? Math.min(100, Math.round(((completed - tier.minOrders) / (next.minOrders - tier.minOrders)) * 100)) : 100,
  };
}

async function balanceOf(vetId: number) {
  const r = await pool.query(
    `SELECT (SELECT COALESCE(SUM(vet_payout), 0) FROM orders WHERE vet_id = $1 AND status = 'completed')::int
          - (SELECT COALESCE(SUM(amount), 0) FROM vet_payouts WHERE vet_id = $1)::int AS balance`, [vetId]);
  return r.rows[0].balance as number;
}

const ORDER_FIELDS = `o.id, o.status, o.address, o.address_lat, o.address_lng, o.scheduled_at, o.created_at, o.notes,
  o.total_price, o.bonus_used, o.ai_triage, o.voice_url, o.accepted_at, o.completed_at, o.vet_percent, o.vet_payout,
  o.vet_conclusion, o.client_rating, o.client_review, o.vet_id,
  u.name AS client_name, u.phone AS client_phone, u.avatar_url AS client_avatar,
  p.id AS pet_id, p.name AS pet_name, p.species AS pet_species, p.breed AS pet_breed, p.age_years AS pet_age,
  p.weight_kg AS pet_weight, p.photo_url AS pet_photo,
  s.name AS service_name, s.icon AS service_icon, s.duration_minutes`;
const ORDER_JOINS = `FROM orders o JOIN users u ON u.id = o.client_id
  LEFT JOIN pets p ON p.id = o.pet_id LEFT JOIN services s ON s.id = o.service_id`;

// ─── router ───────────────────────────────────────────────────────
const router = Router();
router.use(authMiddleware);
router.use((req, res, next) => { loadVet(req as VetReq, res, next).catch(next); });

// GET /api/vet/me — профиль, статус, ключевые цифры, уровень
router.get('/me', wrap(async (req, res) => {
  const v = await pool.query(
    `SELECT v.*, u.name, u.phone, u.email, u.avatar_url, u.created_at AS joined_at
     FROM vets v JOIN users u ON u.id = v.user_id WHERE v.id = $1`, [req.vet!.id]);
  const metrics = await vetMetrics(req.vet!.id);
  res.json({
    profile: v.rows[0],
    metrics,
    tier: tierInfo(metrics.completed_total, metrics.rating),
    tiers: VET_TIERS,
    balance: await balanceOf(req.vet!.id),
  });
}));

// PATCH /api/vet/profile
router.patch('/profile', wrap(async (req, res) => {
  const b = req.body || {};
  const str = (x: unknown, n: number) => (typeof x === 'string' ? x.trim().slice(0, n) : null);
  await pool.query(
    `UPDATE vets SET specialization = COALESCE($1, specialization), experience_years = COALESCE($2, experience_years),
       bio = COALESCE($3, bio), city = COALESCE($4, city), district = COALESCE($5, district),
       education = COALESCE($6, education), transport = COALESCE($7, transport), daily_goal = COALESCE($8, daily_goal)
     WHERE id = $9`,
    [str(b.specialization, 255), Number.isFinite(+b.experience_years) && b.experience_years !== '' && b.experience_years != null ? Math.max(0, Math.min(60, +b.experience_years)) : null,
     str(b.bio, 2000), str(b.city, 100), str(b.district, 255), str(b.education, 500), str(b.transport, 100),
     Number.isFinite(+b.daily_goal) && b.daily_goal != null ? Math.max(1, Math.min(20, +b.daily_goal)) : null, req.vet!.id]);
  if (str(b.name, 255) || b.email !== undefined) {
    await pool.query('UPDATE users SET name = COALESCE(NULLIF($1, \'\'), name), email = COALESCE($2, email) WHERE id = $3',
      [str(b.name, 255), str(b.email, 255), req.user!.id]);
  }
  res.json({ ok: true });
}));

// PATCH /api/vet/status — { online: boolean } готов / не готов принимать заказы
router.patch('/status', wrap(async (req, res) => {
  const online = !!req.body?.online;
  const vetId = req.vet!.id;
  if (online) {
    await pool.query('UPDATE vets SET is_available = true, online_since = COALESCE(online_since, NOW()) WHERE id = $1', [vetId]);
    const open = await pool.query('SELECT 1 FROM vet_shifts WHERE vet_id = $1 AND ended_at IS NULL', [vetId]);
    if (!open.rows[0]) await pool.query('INSERT INTO vet_shifts (vet_id, started_at) VALUES ($1, NOW())', [vetId]);
  } else {
    await pool.query('UPDATE vets SET is_available = false, online_since = NULL WHERE id = $1', [vetId]);
    await pool.query('UPDATE vet_shifts SET ended_at = NOW() WHERE vet_id = $1 AND ended_at IS NULL', [vetId]);
  }
  res.json({ online });
}));

// GET /api/vet/feed — новые заказы рядом + мои активные
router.get('/feed', wrap(async (req, res) => {
  const vetId = req.vet!.id;
  const me = await pool.query('SELECT is_available FROM vets WHERE id = $1', [vetId]);
  const online = !!me.rows[0]?.is_available;
  const metrics = await vetMetrics(vetId);
  const percent = tierFor(metrics.completed_total, metrics.rating).percent;
  const incoming = online ? (await pool.query(
    `SELECT ${ORDER_FIELDS} ${ORDER_JOINS}
     WHERE o.status = 'pending' AND o.vet_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM vet_order_declines d WHERE d.vet_id = $1 AND d.order_id = o.id)
       AND o.created_at >= NOW() - INTERVAL '2 days'
     ORDER BY o.created_at DESC LIMIT 20`, [vetId])).rows : [];
  const active = (await pool.query(
    `SELECT ${ORDER_FIELDS} ${ORDER_JOINS} WHERE o.vet_id = $1 AND o.status = ANY($2) ORDER BY o.scheduled_at`,
    [vetId, ACTIVE])).rows;
  res.json({
    online,
    percent,
    incoming: incoming.map((o) => ({ ...o, payout_estimate: Math.round(((o.total_price || 0) + (o.bonus_used || 0)) * percent / 100) })),
    active,
  });
}));

// GET /api/vet/orders?tab=active|history
router.get('/orders', wrap(async (req, res) => {
  const tab = req.query.tab === 'active' ? 'active' : 'history';
  const where = tab === 'active' ? `o.status = ANY($2)` : `o.status IN ('completed', 'cancelled') AND $2::text[] IS NOT NULL`;
  const r = await pool.query(
    `SELECT ${ORDER_FIELDS} ${ORDER_JOINS} WHERE o.vet_id = $1 AND ${where}
     ORDER BY COALESCE(o.completed_at, o.scheduled_at) DESC LIMIT 300`, [req.vet!.id, ACTIVE]);
  res.json(r.rows);
}));

async function orderForVet(orderId: number, vetId: number) {
  const r = await pool.query(
    `SELECT ${ORDER_FIELDS}, p.passport_id, p.diagnoses AS pet_diagnoses, p.previous_treatment AS pet_previous_treatment,
       p.current_concern AS pet_current_concern, p.notes AS pet_notes, p.sex AS pet_sex, p.birth_date AS pet_birth_date,
       p.microchip AS pet_microchip, p.color AS pet_color
     ${ORDER_JOINS} WHERE o.id = $1`, [orderId]);
  const o = r.rows[0];
  if (!o) return null;
  const isMine = o.vet_id === vetId;
  const isOpen = o.status === 'pending' && o.vet_id == null;
  if (!isMine && !isOpen) return null;
  return { ...o, is_mine: isMine };
}

// GET /api/vet/orders/:id — вся информация по заказу и медкарта питомца
router.get('/orders/:id', wrap(async (req, res) => {
  const o = await orderForVet(Number(req.params.id), req.vet!.id);
  if (!o) { res.status(404).json({ error: 'Заказ не найден или уже принят другим врачом' }); return; }
  // Пока заказ не принят — скрываем телефон клиента
  if (!o.is_mine) { o.client_phone = null; }
  const history = await pool.query('SELECT status, comment, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at, id', [o.id]);
  const visits = o.pet_id ? (await pool.query(
    `SELECT o.id, o.scheduled_at, o.vet_conclusion, s.name AS service_name, vu.name AS vet_name
     FROM orders o LEFT JOIN services s ON s.id = o.service_id LEFT JOIN vets v ON v.id = o.vet_id LEFT JOIN users vu ON vu.id = v.user_id
     WHERE o.pet_id = $1 AND o.id <> $2 AND o.status = 'completed' ORDER BY o.scheduled_at DESC LIMIT 10`, [o.pet_id, o.id])).rows : [];
  const metrics = await vetMetrics(req.vet!.id);
  const percent = o.vet_percent ?? tierFor(metrics.completed_total, metrics.rating).percent;
  res.json({ ...o, history: history.rows, visits, percent,
    payout_estimate: o.vet_payout ?? Math.round(((o.total_price || 0) + (o.bonus_used || 0)) * percent / 100) });
}));

// POST /api/vet/orders/:id/accept
router.post('/orders/:id/accept', wrap(async (req, res) => {
  const r = await pool.query(
    `UPDATE orders SET vet_id = $1, status = 'confirmed', accepted_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND status = 'pending' AND vet_id IS NULL RETURNING id`, [req.vet!.id, req.params.id]);
  if (!r.rows[0]) { res.status(409).json({ error: 'Этот заказ уже принял другой врач' }); return; }
  await pool.query('INSERT INTO order_status_history (order_id, status, comment) VALUES ($1, $2, $3)',
    [req.params.id, 'confirmed', STATUS_COMMENT.confirmed]);
  res.json({ ok: true });
}));

// POST /api/vet/orders/:id/decline — скрыть заказ из моей ленты
router.post('/orders/:id/decline', wrap(async (req, res) => {
  await pool.query('INSERT INTO vet_order_declines (vet_id, order_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.vet!.id, req.params.id]);
  res.json({ ok: true });
}));

// POST /api/vet/orders/:id/release — отказаться от принятого заказа (до выезда), вернуть в общую ленту
router.post('/orders/:id/release', wrap(async (req, res) => {
  const r = await pool.query(
    `UPDATE orders SET vet_id = NULL, status = 'pending', accepted_at = NULL, updated_at = NOW()
     WHERE id = $1 AND vet_id = $2 AND status = 'confirmed' RETURNING id`, [req.params.id, req.vet!.id]);
  if (!r.rows[0]) { res.status(400).json({ error: 'Отказаться можно только до выезда к клиенту' }); return; }
  await pool.query('INSERT INTO vet_order_declines (vet_id, order_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.vet!.id, req.params.id]);
  await pool.query('INSERT INTO order_status_history (order_id, status, comment) VALUES ($1, $2, $3)',
    [req.params.id, 'pending', 'Врач не сможет приехать — ищем другого ветеринара']);
  res.json({ ok: true });
}));

// POST /api/vet/orders/:id/next — следующий шаг: выехал → прибыл → начал приём → завершил
router.post('/orders/:id/next', wrap(async (req, res) => {
  const vetId = req.vet!.id;
  const cur = await pool.query('SELECT status, total_price, bonus_used FROM orders WHERE id = $1 AND vet_id = $2', [req.params.id, vetId]);
  const o = cur.rows[0];
  if (!o || !NEXT[o.status]) { res.status(400).json({ error: 'Заказ нельзя перевести на следующий шаг' }); return; }
  const status = NEXT[o.status];
  if (status === 'completed') {
    const conclusion = String(req.body?.conclusion || '').trim().slice(0, 4000) || null;
    const finalPrice = Number.isFinite(+req.body?.final_price) && +req.body.final_price > 0 ? Math.round(+req.body.final_price) : null;
    const m = await vetMetrics(vetId);
    const percent = tierFor(m.completed_total, m.rating).percent;
    const base = (finalPrice ?? ((o.total_price || 0) + (o.bonus_used || 0)));
    await pool.query(
      `UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW(), vet_conclusion = $1,
         total_price = COALESCE($2 - COALESCE(bonus_used, 0), total_price), vet_percent = $3, vet_payout = $4 WHERE id = $5`,
      [conclusion, finalPrice, percent, Math.round(base * percent / 100), req.params.id]);
  } else {
    await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
  }
  await pool.query('INSERT INTO order_status_history (order_id, status, comment) VALUES ($1, $2, $3)',
    [req.params.id, status, STATUS_COMMENT[status]]);
  res.json({ status });
}));

// GET /api/vet/finance?period=week|month|year
router.get('/finance', wrap(async (req, res) => {
  const vetId = req.vet!.id;
  const period = ['week', 'month', 'year'].includes(String(req.query.period)) ? String(req.query.period) : 'month';
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const since = new Date(Date.now() - days * 86400_000);
  since.setHours(0, 0, 0, 0);
  const s = since.toISOString();
  const sum = await pool.query(
    `SELECT COUNT(*)::int AS orders,
       COALESCE(SUM(total_price + COALESCE(bonus_used, 0)), 0)::int AS gross,
       COALESCE(SUM(vet_payout), 0)::int AS earned,
       ROUND(AVG(vet_percent))::int AS avg_percent
     FROM orders WHERE vet_id = $1 AND status = 'completed' AND completed_at >= $2`, [vetId, s]);
  const exp = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0)::int AS amount FROM vet_expenses
     WHERE vet_id = $1 AND spent_at >= $2 GROUP BY category ORDER BY 2 DESC`, [vetId, s]);
  const bucket = period === 'year' ? 'month' : 'day';
  const series = await pool.query(
    `WITH d AS (SELECT generate_series(date_trunc('${bucket}', $2::timestamp), date_trunc('${bucket}', NOW()), INTERVAL '1 ${bucket}') AS t)
     SELECT d.t AS date,
       COALESCE((SELECT SUM(vet_payout) FROM orders WHERE vet_id = $1 AND status = 'completed' AND date_trunc('${bucket}', completed_at) = d.t), 0)::int AS earned,
       COALESCE((SELECT SUM(amount) FROM vet_expenses WHERE vet_id = $1 AND date_trunc('${bucket}', spent_at) = d.t), 0)::int AS expenses
     FROM d ORDER BY d.t`, [vetId, s]);
  const tx = await pool.query(
    `(SELECT 'income' AS kind, o.id, o.vet_payout AS amount, o.completed_at AS at, s.name AS title, p.name AS subtitle, o.vet_percent AS percent, NULL::text AS category
      FROM orders o LEFT JOIN services s ON s.id = o.service_id LEFT JOIN pets p ON p.id = o.pet_id
      WHERE o.vet_id = $1 AND o.status = 'completed' AND o.completed_at >= $2)
     UNION ALL
     (SELECT 'expense', e.id, e.amount, e.spent_at, COALESCE(e.note, ''), NULL, NULL, e.category FROM vet_expenses e WHERE e.vet_id = $1 AND e.spent_at >= $2)
     UNION ALL
     (SELECT 'payout', w.id, w.amount, w.created_at, 'Вывод на карту', w.status, NULL, NULL FROM vet_payouts w WHERE w.vet_id = $1 AND w.created_at >= $2)
     ORDER BY at DESC LIMIT 80`, [vetId, s]);
  const summary = sum.rows[0];
  const expenses = exp.rows.reduce((a, r) => a + r.amount, 0);
  res.json({
    period,
    summary: { ...summary, platform_fee: summary.gross - summary.earned, expenses, net: summary.earned - expenses,
      avg_check: summary.orders ? Math.round(summary.gross / summary.orders) : 0 },
    expense_by_category: exp.rows.map((r) => ({ ...r, label: EXPENSE_CATEGORIES[r.category] ?? r.category })),
    series: series.rows,
    transactions: tx.rows.map((t) => ({ ...t, category_label: t.category ? EXPENSE_CATEGORIES[t.category] ?? t.category : null })),
    balance: await balanceOf(vetId),
    categories: EXPENSE_CATEGORIES,
  });
}));

// POST /api/vet/expenses — { category, amount, note }
router.post('/expenses', wrap(async (req, res) => {
  const category = String(req.body?.category || 'other');
  const amount = Math.round(Number(req.body?.amount));
  if (!EXPENSE_CATEGORIES[category] || !(amount > 0) || amount > 1_000_000) { res.status(400).json({ error: 'Укажите категорию и сумму' }); return; }
  const r = await pool.query('INSERT INTO vet_expenses (vet_id, category, amount, note) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.vet!.id, category, amount, String(req.body?.note || '').trim().slice(0, 200) || null]);
  res.status(201).json(r.rows[0]);
}));

router.delete('/expenses/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM vet_expenses WHERE id = $1 AND vet_id = $2', [req.params.id, req.vet!.id]);
  res.json({ ok: true });
}));

// POST /api/vet/payouts — { amount } вывод на карту
router.post('/payouts', wrap(async (req, res) => {
  const balance = await balanceOf(req.vet!.id);
  const amount = Math.round(Number(req.body?.amount) || balance);
  if (!(amount >= 500) || amount > balance) { res.status(400).json({ error: 'Минимальная сумма вывода — 500 ₽, и не больше баланса' }); return; }
  await pool.query(`INSERT INTO vet_payouts (vet_id, amount, status) VALUES ($1, $2, 'processing')`, [req.vet!.id, amount]);
  res.status(201).json({ ok: true, balance: balance - amount });
}));

// GET /api/vet/kpi — уровень, показатели, достижения, цели
router.get('/kpi', wrap(async (req, res) => {
  const vetId = req.vet!.id;
  const m = await vetMetrics(vetId);
  const goal = (await pool.query('SELECT daily_goal FROM vets WHERE id = $1', [vetId])).rows[0]?.daily_goal ?? 5;
  const fiveStars = (await pool.query(`SELECT COUNT(*)::int n FROM orders WHERE vet_id = $1 AND client_rating = 5`, [vetId])).rows[0].n;
  const night = (await pool.query(`SELECT COUNT(*)::int n FROM orders WHERE vet_id = $1 AND status = 'completed' AND (EXTRACT(HOUR FROM scheduled_at) >= 22 OR EXTRACT(HOUR FROM scheduled_at) < 6)`, [vetId])).rows[0].n;
  const species = (await pool.query(`SELECT COUNT(DISTINCT p.species)::int n FROM orders o JOIN pets p ON p.id = o.pet_id WHERE o.vet_id = $1 AND o.status = 'completed'`, [vetId])).rows[0].n;
  const achievements = [
    { icon: '🩺', title: 'Первый визит', desc: 'Выполнен первый заказ', progress: Math.min(m.completed_total, 1), target: 1 },
    { icon: '🔥', title: 'Полтинник', desc: '50 выполненных визитов', progress: Math.min(m.completed_total, 50), target: 50 },
    { icon: '🏅', title: 'Сотня', desc: '100 выполненных визитов', progress: Math.min(m.completed_total, 100), target: 100 },
    { icon: '⭐', title: 'Любимец клиентов', desc: '50 оценок «5 звёзд»', progress: Math.min(fiveStars, 50), target: 50 },
    { icon: '⚡', title: 'Молния', desc: 'Принимать заказ в среднем быстрее 4 минут', progress: m.avg_accept_min && m.avg_accept_min <= 4 ? 1 : 0, target: 1 },
    { icon: '🔁', title: 'Семейный доктор', desc: '40% клиентов возвращаются к вам', progress: Math.min(m.return_rate, 40), target: 40 },
    { icon: '🌙', title: 'Ночной дозор', desc: '10 ночных вызовов (22:00–6:00)', progress: Math.min(night, 10), target: 10 },
    { icon: '🦜', title: 'Универсал', desc: 'Пациенты 4 разных видов', progress: Math.min(species, 4), target: 4 },
  ];
  res.json({
    metrics: m,
    tier: tierInfo(m.completed_total, m.rating),
    tiers: VET_TIERS,
    goals: {
      today: { done: m.completed_today, target: goal, bonus: 500 },
      week: { done: m.completed_week, target: goal * 5, bonus: 3000 },
    },
    achievements,
  });
}));

// GET /api/vet/league?metric=score|rating|orders|return|speed — рейтинг врачей за последние 30 дней
router.get('/league', wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT v.id, u.name, v.photo_url, v.specialization, v.is_available,
       COUNT(o.id) FILTER (WHERE o.status = 'completed')::int AS completed_total,
       COUNT(o.id) FILTER (WHERE o.status = 'completed' AND o.completed_at >= NOW() - INTERVAL '30 days')::int AS orders_30d,
       ROUND(AVG(o.client_rating) FILTER (WHERE o.client_rating IS NOT NULL), 2)::float AS rating,
       ROUND(AVG(EXTRACT(EPOCH FROM (o.accepted_at - o.created_at)) / 60) FILTER (WHERE o.accepted_at > o.created_at AND o.created_at >= NOW() - INTERVAL '90 days'), 1)::float AS speed_min,
       (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE n > 1) / COUNT(*)) END
          FROM (SELECT COUNT(*) n FROM orders x WHERE x.vet_id = v.id AND x.status = 'completed' GROUP BY x.client_id) t)::int AS return_rate
     FROM vets v JOIN users u ON u.id = v.user_id LEFT JOIN orders o ON o.vet_id = v.id
     WHERE v.is_verified = true OR v.id = $1
     GROUP BY v.id, u.name`, [req.vet!.id]);
  const rows = r.rows.map((x) => ({ ...x, rating: x.rating ?? 5, speed_min: x.speed_min ?? 10 }));
  const maxOrders = Math.max(1, ...rows.map((x) => x.orders_30d));
  for (const x of rows) {
    const score = 0.35 * (x.orders_30d / maxOrders) + 0.3 * Math.max(0, (x.rating - 4) / 1) +
      0.2 * Math.min(1, x.return_rate / 60) + 0.15 * Math.max(0, 1 - (x.speed_min - 1) / 10);
    x.score = Math.round(score * 1000);
    x.tier = tierFor(x.completed_total, x.rating);
    x.is_me = x.id === req.vet!.id;
  }
  const metric = String(req.query.metric || 'score');
  const key: Record<string, (a: typeof rows[0]) => number> = {
    score: (a) => a.score, rating: (a) => a.rating, orders: (a) => a.orders_30d,
    return: (a) => a.return_rate, speed: (a) => -a.speed_min,
  };
  const f = key[metric] ?? key.score;
  rows.sort((a, b) => f(b) - f(a) || b.score - a.score);
  rows.forEach((x, i) => { x.rank = i + 1; });
  const now = new Date();
  const seasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  res.json({
    metric,
    season: now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    days_left: Math.ceil((seasonEnd.getTime() - now.getTime()) / 86400_000),
    prizes: [
      { place: 1, prize: 'Бонус 15 000 ₽ + статус «Врач месяца»' },
      { place: 2, prize: 'Бонус 10 000 ₽' },
      { place: 3, prize: 'Бонус 5 000 ₽' },
    ],
    rows: rows.map(({ completed_total, ...x }) => ({ ...x, completed_total })),
  });
}));

// GET /api/vet/reviews — отзывы клиентов
router.get('/reviews', wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT o.id, o.client_rating AS rating, o.client_review AS text, o.completed_at, u.name AS client_name, p.name AS pet_name, p.species AS pet_species, s.name AS service_name
     FROM orders o JOIN users u ON u.id = o.client_id LEFT JOIN pets p ON p.id = o.pet_id LEFT JOIN services s ON s.id = o.service_id
     WHERE o.vet_id = $1 AND o.client_rating IS NOT NULL ORDER BY o.completed_at DESC LIMIT 60`, [req.vet!.id]);
  const dist = await pool.query(
    `SELECT client_rating AS stars, COUNT(*)::int AS n FROM orders WHERE vet_id = $1 AND client_rating IS NOT NULL GROUP BY 1`, [req.vet!.id]);
  res.json({ reviews: r.rows, distribution: dist.rows });
}));

// GET /api/vet/news — новости ветеринарии и платформы
router.get('/news', wrap(async (_req, res) => {
  const r = await pool.query('SELECT * FROM vet_news ORDER BY pinned DESC, published_at DESC LIMIT 50');
  res.json(r.rows);
}));

// POST /api/vet/demo/incoming — для показа: прилетает новый заказ от клиента
router.post('/demo/incoming', wrap(async (_req, res) => {
  const id = await createIncomingOrder();
  res.status(201).json({ id });
}));

export default router;
