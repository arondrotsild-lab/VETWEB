import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';
import { PRODUCTS } from '../shopCatalog';
import { tierFor, VET_TIERS } from './vetCabinet';

// ═══════════════════════════════════════════════════════════════════
//  CRM ВетДом — всё о компании для руководителя и инвестора.
//  Доступ только у роли admin.
// ═══════════════════════════════════════════════════════════════════

const router = Router();
router.use(authMiddleware, requireRole('admin'));

const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;
const n = (x: unknown) => Number(x ?? 0);
const PROD = new Map(PRODUCTS.map((p) => [p.id, p]));
const wrap = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => async (req: AuthRequest, res: Response) => {
  try { res.json(await fn(req, res)); } catch (e) { console.error('CRM:', e); res.status(500).json({ error: 'Ошибка CRM' }); }
};

// Выручка услуг считаем по выполненным визитам (цена + оплачено бонусами)
const REV = `(total_price + COALESCE(bonus_used, 0))`;


// ── Живой поток: врачи постоянно в работе, выполненные визиты закрываются и попадают в выручку ──
let lastTick = 0;
async function liveTick() {
  if (Date.now() - lastTick < 45_000) return;
  lastTick = Date.now();
  // визиты, которые идут дольше 100 минут, — завершены
  await pool.query(`UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
      client_rating = CASE WHEN random() < 0.8 THEN (CASE WHEN random() < 0.9 THEN 5 ELSE 4 END) END
    WHERE status IN ('confirmed','on_the_way','arrived','in_progress') AND vet_id IN (SELECT v.id FROM vets v JOIN users u ON u.id = v.user_id WHERE u.phone LIKE '+7999003%')
      AND scheduled_at < NOW() - INTERVAL '100 minutes'`);
  // остальные — двигаем по этапам
  await pool.query(`UPDATE orders SET status = CASE status WHEN 'confirmed' THEN 'on_the_way' WHEN 'on_the_way' THEN 'arrived' WHEN 'arrived' THEN 'in_progress' ELSE status END, updated_at = NOW()
    WHERE status IN ('confirmed','on_the_way','arrived') AND random() < 0.35 AND vet_id IN (SELECT v.id FROM vets v JOIN users u ON u.id = v.user_id WHERE u.phone LIKE '+7999003%')`);
  const h = new Date().getHours();
  const target = h >= 8 && h < 22 ? 10 + Math.floor(Math.random() * 7) : 3 + Math.floor(Math.random() * 3);
  const [{ n }] = await q(`SELECT COUNT(*)::int n FROM orders WHERE status IN ('confirmed','on_the_way','arrived','in_progress') AND vet_id IS NOT NULL`);
  if (n >= target) return;
  const vets = await q(`SELECT v.id FROM vets v JOIN users u ON u.id = v.user_id WHERE u.phone LIKE '+7999003%' AND v.id NOT IN
      (SELECT vet_id FROM orders WHERE status IN ('confirmed','on_the_way','arrived','in_progress') AND vet_id IS NOT NULL) ORDER BY random() LIMIT $1`, [target - n]);
  for (const v of vets) {
    const [c] = await q(`SELECT o.client_id, o.pet_id, o.address FROM orders o JOIN users u ON u.id = o.client_id WHERE u.phone LIKE '+7999002%' AND o.status = 'completed' ORDER BY random() LIMIT 1`);
    const [s] = await q(`SELECT id, price_from, price_to FROM services WHERE name <> 'Выгул животного' ORDER BY random() LIMIT 1`);
    if (!c || !s) continue;
    const price = Math.round((s.price_from + Math.random() * 0.25 * (s.price_to - s.price_from)) / 100) * 100;
    const mins = Math.floor(Math.random() * 80);
    const st = mins > 55 ? 'in_progress' : mins > 35 ? 'arrived' : mins > 15 ? 'on_the_way' : 'confirmed';
    await pool.query(`INSERT INTO orders (client_id, vet_id, pet_id, service_id, address, scheduled_at, status, total_price, created_at, updated_at, accepted_at, vet_percent, vet_payout)
      VALUES ($1,$2,$3,$4,$5, NOW() - make_interval(mins => $6::int), $7, $8, NOW() - make_interval(mins => $6::int + 20), NOW(), NOW() - make_interval(mins => $6::int + 16), 60, $9)`,
      [c.client_id, v.id, c.pet_id, s.id, c.address, mins, st, price, Math.round(price * 0.6)]);
  }
}

// ── Сводка ───────────────────────────────────────────────────────
router.get('/summary', wrap(async () => {
  await liveTick().catch((e) => console.error('CRM live:', e));
  const [k] = await q(`
    WITH b AS (SELECT date_trunc('month', NOW()) m0, date_trunc('month', NOW()) - INTERVAL '1 month' m1,
                      NOW() - INTERVAL '1 month' same_prev)
    SELECT
      (SELECT COALESCE(SUM(${REV}),0) FROM orders, b WHERE status='completed' AND scheduled_at >= m0) svc_mtd,
      (SELECT COALESCE(SUM(total_rub+bonus_used),0) FROM shop_orders, b WHERE created_at >= m0) shop_mtd,
      (SELECT COALESCE(SUM(${REV}),0) FROM orders, b WHERE status='completed' AND scheduled_at >= m1 AND scheduled_at < m0) svc_prev,
      (SELECT COALESCE(SUM(total_rub+bonus_used),0) FROM shop_orders, b WHERE created_at >= m1 AND created_at < m0) shop_prev,
      (SELECT COALESCE(SUM(${REV}),0) FROM orders, b WHERE status='completed' AND scheduled_at >= m1 AND scheduled_at < same_prev) svc_prev_same,
      (SELECT COALESCE(SUM(total_rub+bonus_used),0) FROM shop_orders, b WHERE created_at >= m1 AND created_at < same_prev) shop_prev_same,
      (SELECT COUNT(*) FROM orders, b WHERE status='completed' AND scheduled_at >= m0) orders_mtd,
      (SELECT COUNT(*) FROM orders, b WHERE status='completed' AND scheduled_at >= m1 AND scheduled_at < same_prev) orders_prev_same,
      (SELECT COUNT(*) FROM orders, b WHERE status='completed' AND scheduled_at >= m1 AND scheduled_at < m0) orders_prev,
      (SELECT COUNT(*) FROM users WHERE role='client') clients_total,
      (SELECT COUNT(*) FROM pets) pets_total,
      (SELECT COUNT(*) FROM (SELECT client_id FROM orders WHERE status='completed' GROUP BY client_id HAVING MIN(scheduled_at) >= date_trunc('month', NOW())) x) new_clients_mtd,
      (SELECT COUNT(*) FROM (SELECT client_id FROM orders WHERE status='completed' GROUP BY client_id
          HAVING MIN(scheduled_at) >= date_trunc('month', NOW()) - INTERVAL '1 month' AND MIN(scheduled_at) < date_trunc('month', NOW())) x) new_clients_prev,
      (SELECT COUNT(DISTINCT client_id) FROM orders WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '90 days') active_clients,
      (SELECT COUNT(*) FROM vets) vets_total,
      (SELECT COUNT(DISTINCT vet_id) FROM orders WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '30 days') vets_active,
      (SELECT COUNT(*) FROM vets WHERE is_available) vets_online,
      (SELECT ROUND(AVG(client_rating)::numeric, 2) FROM orders WHERE client_rating IS NOT NULL AND scheduled_at >= NOW() - INTERVAL '30 days') rating30,
      (SELECT COUNT(*) FROM orders WHERE status IN ('confirmed','on_the_way','arrived','in_progress') AND vet_id IS NOT NULL AND scheduled_at >= NOW() - INTERVAL '1 day') active_now,
      (SELECT COUNT(*) FROM orders WHERE scheduled_at::date = NOW()::date) orders_today,
      (SELECT COALESCE(SUM(${REV}),0) FROM orders WHERE status='completed' AND scheduled_at::date = NOW()::date) revenue_today,
      (SELECT COALESCE(SUM(amount),0) FROM donations) + (SELECT COALESCE(SUM(base_raised),0) FROM charity_cases) charity,
      (SELECT COALESCE(SUM(balance),0) FROM crm_accounts) cash`);
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const frac = (now.getDate() - 1 + now.getHours() / 24) / dim;
  const mtd = n(k.svc_mtd) + n(k.shop_mtd);
  const prev = n(k.svc_prev) + n(k.shop_prev);
  const prevSame = n(k.svc_prev_same) + n(k.shop_prev_same);

  const months = await monthSeries();
  const lastFull = months[months.length - 2];
  const daily = await q(`
    SELECT d::date AS day,
      (SELECT COALESCE(SUM(${REV}),0) FROM orders WHERE status='completed' AND scheduled_at::date = d::date)::bigint svc,
      (SELECT COALESCE(SUM(total_rub+bonus_used),0) FROM shop_orders WHERE created_at::date = d::date)::bigint shop,
      (SELECT COUNT(*) FROM orders WHERE status='completed' AND scheduled_at::date = d::date)::int orders
    FROM generate_series(NOW()::date - 29, NOW()::date, '1 day') d`);
  const services = await q(`
    SELECT s.name, s.icon, COUNT(*)::int n, SUM(${REV})::bigint revenue FROM orders o JOIN services s ON s.id = o.service_id
    WHERE o.status='completed' AND o.scheduled_at >= NOW() - INTERVAL '30 days' GROUP BY s.id ORDER BY revenue DESC`);
  const topVets = await q(`
    SELECT v.id, u.name, v.photo_url, v.specialization, COUNT(*)::int n, SUM(${REV})::bigint revenue, ROUND(AVG(o.client_rating)::numeric,2) rating
    FROM orders o JOIN vets v ON v.id = o.vet_id JOIN users u ON u.id = v.user_id
    WHERE o.status='completed' AND o.scheduled_at >= NOW() - INTERVAL '30 days' GROUP BY v.id, u.name ORDER BY revenue DESC LIMIT 6`);
  const live = await q(`
    SELECT o.id, o.status, o.scheduled_at, o.total_price, s.name service, s.icon, u.name client, p.name pet, p.species, vu.name vet
    FROM orders o JOIN services s ON s.id = o.service_id JOIN users u ON u.id = o.client_id LEFT JOIN pets p ON p.id = o.pet_id
    LEFT JOIN vets v ON v.id = o.vet_id LEFT JOIN users vu ON vu.id = v.user_id
    WHERE o.status IN ('confirmed','on_the_way','arrived','in_progress') AND o.vet_id IS NOT NULL AND o.scheduled_at >= NOW() - INTERVAL '1 day'
    ORDER BY o.scheduled_at DESC LIMIT 8`);
  const species = await q(`SELECT species, COUNT(*)::int n FROM pets GROUP BY species ORDER BY n DESC`);
  const heat = await q(`
    SELECT EXTRACT(ISODOW FROM scheduled_at)::int dow, EXTRACT(HOUR FROM scheduled_at)::int h, COUNT(*)::int n FROM orders
    WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '90 days' GROUP BY 1, 2`);
  return {
    kpi: {
      revenue_mtd: mtd, revenue_forecast: Math.round(mtd + (daily.slice(-15, -1).reduce((x, d) => x + n(d.svc) + n(d.shop), 0) / 14) * (dim - now.getDate() + 1 - now.getHours() / 24)), revenue_prev: prev, revenue_prev_same: prevSame,
      services_mtd: n(k.svc_mtd), shop_mtd: n(k.shop_mtd),
      orders_mtd: n(k.orders_mtd), orders_prev_same: n(k.orders_prev_same), orders_prev: n(k.orders_prev),
      avg_check: n(k.orders_mtd) ? Math.round(n(k.svc_mtd) / n(k.orders_mtd)) : 0,
      avg_check_prev: n(k.orders_prev) ? Math.round(n(k.svc_prev) / n(k.orders_prev)) : 0,
      clients_total: n(k.clients_total), pets_total: n(k.pets_total), new_clients_mtd: n(k.new_clients_mtd), new_clients_prev: n(k.new_clients_prev),
      active_clients: n(k.active_clients), vets_total: n(k.vets_total), vets_active: n(k.vets_active), vets_online: n(k.vets_online),
      rating30: n(k.rating30), active_now: n(k.active_now), orders_today: n(k.orders_today), revenue_today: n(k.revenue_today),
      charity: n(k.charity), cash: n(k.cash), month_progress: frac,
      profit_last: lastFull?.profit ?? 0, revenue_last: lastFull?.revenue ?? 0, margin_last: lastFull?.revenue ? lastFull.profit / lastFull.revenue : 0,
      last_month: lastFull?.m,
    },
    months, daily: daily.map((d) => ({ day: d.day, svc: n(d.svc), shop: n(d.shop), orders: n(d.orders) })),
    services: services.map((s) => ({ ...s, revenue: n(s.revenue) })),
    topVets: topVets.map((v) => ({ ...v, revenue: n(v.revenue), rating: n(v.rating) })),
    live, species, heat,
  };
}));

// Помесячно: выручка (услуги + магазин), заказы, расходы, прибыль
async function monthSeries() {
  const rows = await q(`
    WITH s AS (SELECT date_trunc('month', scheduled_at)::date m, SUM(${REV}) FILTER (WHERE status='completed') svc, COUNT(*) FILTER (WHERE status='completed') orders
               FROM orders WHERE scheduled_at >= '2025-11-01' GROUP BY 1),
         sh AS (SELECT date_trunc('month', created_at)::date m, SUM(total_rub+bonus_used) shop, COUNT(*) shop_n FROM shop_orders GROUP BY 1),
         f AS (SELECT month m, SUM(amount) exp FROM crm_finance GROUP BY 1),
         mk AS (SELECT month m, SUM(spend) spend, SUM(clients) newc FROM crm_marketing GROUP BY 1)
    SELECT to_char(s.m, 'YYYY-MM') m, s.svc::bigint svc, COALESCE(sh.shop,0)::bigint shop, s.orders::int orders, COALESCE(sh.shop_n,0)::int shop_n,
           COALESCE(f.exp,0)::bigint exp, COALESCE(mk.spend,0)::bigint mkt, COALESCE(mk.newc,0)::int newc
    FROM s LEFT JOIN sh ON sh.m = s.m LEFT JOIN f ON f.m = s.m LEFT JOIN mk ON mk.m = s.m ORDER BY s.m`);
  return rows.map((r) => {
    const revenue = n(r.svc) + n(r.shop);
    return { m: r.m as string, svc: n(r.svc), shop: n(r.shop), revenue, orders: n(r.orders), shop_n: n(r.shop_n), expenses: n(r.exp),
      profit: revenue - n(r.exp), marketing: n(r.mkt), new_clients: n(r.newc) };
  });
}

// ── Финансы ──────────────────────────────────────────────────────
router.get('/finance', wrap(async (req) => {
  const months = await monthSeries();
  const sel = (req.query.month as string) || months[months.length - 2]?.m;
  const groups = await q(`SELECT grp, item, SUM(amount)::bigint amount FROM crm_finance WHERE to_char(month,'YYYY-MM') = $1 GROUP BY grp, item ORDER BY grp, amount DESC`, [sel]);
  const byMonthGroup = await q(`SELECT to_char(month,'YYYY-MM') m, grp, SUM(amount)::bigint amount FROM crm_finance GROUP BY 1, 2 ORDER BY 1`);
  const accounts = await q(`SELECT * FROM crm_accounts ORDER BY id`);
  const tx = await q(`SELECT t.*, a.name account, a.color FROM crm_transactions t LEFT JOIN crm_accounts a ON a.id = t.account_id ORDER BY t.at DESC LIMIT 150`);
  const cur = months.find((m) => m.m === sel);
  return {
    months, month: sel, cur,
    groups: groups.map((g) => ({ ...g, amount: n(g.amount) })),
    byMonthGroup: byMonthGroup.map((g) => ({ ...g, amount: n(g.amount) })),
    accounts: accounts.map((a) => ({ ...a, balance: n(a.balance) })),
    tx: tx.map((t) => ({ ...t, amount: n(t.amount) })),
  };
}));

// ── Маркетинг ────────────────────────────────────────────────────
router.get('/marketing', wrap(async (req) => {
  const months = await monthSeries();
  const sel = (req.query.month as string) || months[months.length - 2]?.m;
  const ch = await q(`SELECT channel, icon, spend, impressions, clicks, leads, clients, revenue FROM crm_marketing WHERE to_char(month,'YYYY-MM') = $1 ORDER BY spend DESC`, [sel]);
  const byMonth = await q(`SELECT to_char(month,'YYYY-MM') m, SUM(spend)::bigint spend, SUM(clients)::int clients, SUM(leads)::int leads, SUM(clicks)::bigint clicks,
    SUM(impressions)::bigint impressions, SUM(revenue)::bigint revenue FROM crm_marketing GROUP BY 1 ORDER BY 1`);
  const byChannel = await q(`SELECT channel, icon, SUM(spend)::bigint spend, SUM(clients)::int clients, SUM(revenue)::bigint revenue FROM crm_marketing GROUP BY 1, 2 ORDER BY spend DESC`);
  const fix = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ['channel', 'icon', 'm'].includes(k) ? v : n(v)]));
  return { months: months.map((m) => m.m), month: sel, channels: ch.map(fix), byMonth: byMonth.map(fix), byChannel: byChannel.map(fix) };
}));

// ── Заказы ───────────────────────────────────────────────────────
router.get('/orders', wrap(async (req) => {
  const { status, service, vet, q: s, period } = req.query as Record<string, string>;
  const page = Math.max(1, Number(req.query.page) || 1);
  const where: string[] = []; const p: unknown[] = [];
  const add = (sql: string, v: unknown) => { p.push(v); where.push(sql.replace('?', `$${p.length}`)); };
  if (status && status !== 'all') {
    if (status === 'active') where.push(`o.status IN ('pending','confirmed','on_the_way','arrived','in_progress')`);
    else add('o.status = ?', status);
  }
  if (service) add('o.service_id = ?', Number(service));
  if (vet) add('o.vet_id = ?', Number(vet));
  if (period === 'today') where.push(`o.scheduled_at::date = NOW()::date`);
  else if (period === '7d') where.push(`o.scheduled_at >= NOW() - INTERVAL '7 days'`);
  else if (period === '30d') where.push(`o.scheduled_at >= NOW() - INTERVAL '30 days'`);
  if (s) { if (/^\d+$/.test(s)) add('o.id = ?', Number(s)); else add(`(u.name ILIKE ? OR p.name ILIKE $${p.length + 1} OR vu.name ILIKE $${p.length + 1} OR o.address ILIKE $${p.length + 1})`, `%${s}%`); }
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const base = `FROM orders o JOIN users u ON u.id = o.client_id LEFT JOIN pets p ON p.id = o.pet_id JOIN services s ON s.id = o.service_id
                LEFT JOIN vets v ON v.id = o.vet_id LEFT JOIN users vu ON vu.id = v.user_id ${W}`;
  const [tot] = await q(`SELECT COUNT(*)::int n, COALESCE(SUM(${REV.replace(/total_price|bonus_used/g, (m) => `o.${m}`)}) FILTER (WHERE o.status='completed'),0)::bigint revenue ${base}`, p);
  const rows = await q(`SELECT o.id, o.status, o.scheduled_at, o.total_price, o.bonus_used, o.vet_payout, o.client_rating, o.address,
      s.name service, s.icon, u.id client_id, u.name client, p.name pet, p.species, vu.name vet, v.photo_url vet_photo
    ${base} ORDER BY o.scheduled_at DESC LIMIT 40 OFFSET ${(page - 1) * 40}`, p);
  const counts = await q(`SELECT status, COUNT(*)::int n FROM orders GROUP BY status`);
  const filters = {
    services: await q(`SELECT id, name, icon FROM services ORDER BY id`),
    vets: await q(`SELECT v.id, u.name FROM vets v JOIN users u ON u.id = v.user_id ORDER BY u.name`),
  };
  return { total: tot.n, revenue: n(tot.revenue), page, pages: Math.ceil(tot.n / 40), rows, counts, filters };
}));

router.get('/orders/:id', wrap(async (req, res) => {
  const [o] = await q(`SELECT o.*, s.name service, s.icon, s.duration_minutes, u.name client, u.phone client_phone, u.email client_email, u.created_at client_since,
      p.name pet, p.species, p.breed, p.age_years, p.weight_kg, p.passport_id, vu.name vet, vu.phone vet_phone, v.photo_url vet_photo, v.specialization
    FROM orders o JOIN services s ON s.id = o.service_id JOIN users u ON u.id = o.client_id LEFT JOIN pets p ON p.id = o.pet_id
    LEFT JOIN vets v ON v.id = o.vet_id LEFT JOIN users vu ON vu.id = v.user_id WHERE o.id = $1`, [Number(req.params.id)]);
  if (!o) { res.status(404); return { error: 'Заказ не найден' }; }
  const history = await q(`SELECT status, comment, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at`, [o.id]);
  const margin = o.status === 'completed' ? n(o.total_price) + n(o.bonus_used) - n(o.vet_payout) : 0;
  return { ...o, history, margin };
}));

// ── Клиенты ──────────────────────────────────────────────────────
const CLIENT_STATS = `
  SELECT u.id, u.name, u.phone, u.email, u.telegram_nick, u.avatar_url, u.created_at,
    COALESCE(o.n,0)::int orders, COALESCE(o.rev,0)::bigint services, COALESCE(sh.rev,0)::bigint shop,
    (COALESCE(o.rev,0) + COALESCE(sh.rev,0))::bigint ltv, o.last, o.first,
    (SELECT COUNT(*) FROM pets WHERE owner_id = u.id)::int pets_n,
    (SELECT string_agg(name || ':' || species, ',') FROM (SELECT name, species FROM pets WHERE owner_id = u.id ORDER BY id LIMIT 4) pp) pets
  FROM users u
  LEFT JOIN (SELECT client_id, COUNT(*) n, SUM(${REV}) rev, MAX(scheduled_at) last, MIN(scheduled_at) first FROM orders WHERE status='completed' GROUP BY client_id) o ON o.client_id = u.id
  LEFT JOIN (SELECT user_id, SUM(total_rub+bonus_used) rev FROM shop_orders GROUP BY user_id) sh ON sh.user_id = u.id
  WHERE u.role = 'client'`;

router.get('/clients', wrap(async (req) => {
  const { q: s, segment, sort } = req.query as Record<string, string>;
  const page = Math.max(1, Number(req.query.page) || 1);
  const where: string[] = []; const p: unknown[] = [];
  if (s) { p.push(`%${s}%`); where.push(`(name ILIKE $1 OR phone ILIKE $1 OR COALESCE(email,'') ILIKE $1 OR COALESCE(pets,'') ILIKE $1)`); }
  const SEG: Record<string, string> = {
    new: `created_at >= NOW() - INTERVAL '30 days'`, regular: `orders >= 3`, vip: `ltv >= 30000`,
    sleeping: `orders > 0 AND last < NOW() - INTERVAL '90 days'`, noorders: `orders = 0`,
  };
  if (segment && SEG[segment]) where.push(SEG[segment]);
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const ORDER: Record<string, string> = { ltv: 'ltv DESC', orders: 'orders DESC', new: 'created_at DESC', last: 'last DESC NULLS LAST', name: 'name' };
  const [tot] = await q(`SELECT COUNT(*)::int n FROM (${CLIENT_STATS}) c ${W}`, p);
  const rows = await q(`SELECT * FROM (${CLIENT_STATS}) c ${W} ORDER BY ${ORDER[sort] ?? 'ltv DESC'} LIMIT 40 OFFSET ${(page - 1) * 40}`, p);
  const [seg] = await q(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE ${SEG.new})::int new, COUNT(*) FILTER (WHERE ${SEG.regular})::int regular, COUNT(*) FILTER (WHERE ${SEG.vip})::int vip,
      COUNT(*) FILTER (WHERE ${SEG.sleeping})::int sleeping, COUNT(*) FILTER (WHERE ${SEG.noorders})::int noorders,
      ROUND(AVG(ltv) FILTER (WHERE orders > 0))::int avg_ltv, ROUND(AVG(orders) FILTER (WHERE orders > 0)::numeric, 1) avg_orders
    FROM (${CLIENT_STATS}) c`);
  const growth = await q(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') m, COUNT(*)::int n FROM users WHERE role='client' AND created_at >= '2025-11-01' GROUP BY 1 ORDER BY 1`);
  return { total: tot.n, page, pages: Math.ceil(tot.n / 40), rows: rows.map((r) => ({ ...r, ltv: n(r.ltv), services: n(r.services), shop: n(r.shop) })), seg, growth };
}));

router.get('/clients/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await q(`SELECT * FROM (${CLIENT_STATS}) c WHERE id = $1`, [id]);
  if (!c) { res.status(404); return { error: 'Клиент не найден' }; }
  const pets = await q(`SELECT p.*, (SELECT COUNT(*) FROM orders WHERE pet_id = p.id AND status='completed')::int visits,
      (SELECT MAX(scheduled_at) FROM orders WHERE pet_id = p.id AND status='completed') last_visit FROM pets p WHERE owner_id = $1 ORDER BY id`, [id]);
  const orders = await q(`SELECT o.id, o.status, o.scheduled_at, o.total_price, o.bonus_used, o.client_rating, o.client_review, s.name service, s.icon,
      p.name pet, vu.name vet FROM orders o JOIN services s ON s.id = o.service_id LEFT JOIN pets p ON p.id = o.pet_id
      LEFT JOIN vets v ON v.id = o.vet_id LEFT JOIN users vu ON vu.id = v.user_id WHERE o.client_id = $1 ORDER BY o.scheduled_at DESC LIMIT 100`, [id]);
  const shop = (await q(`SELECT id, product_id, qty, total_rub, bonus_used, created_at FROM shop_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]))
    .map((s) => ({ ...s, title: PROD.get(s.product_id)?.title ?? `Товар №${s.product_id}`, category: PROD.get(s.product_id)?.category }));
  const donations = await q(`SELECT d.amount, d.created_at, cc.name FROM donations d JOIN charity_cases cc ON cc.id = d.case_id WHERE d.user_id = $1 ORDER BY d.created_at DESC`, [id]);
  const ref = await q(`SELECT id, name, created_at FROM users WHERE referred_by = $1`, [id]);
  const ratings = orders.filter((o) => o.client_rating);
  return { client: { ...c, ltv: n(c.ltv), services: n(c.services), shop: n(c.shop),
      avg_rating: ratings.length ? ratings.reduce((a, o) => a + n(o.client_rating), 0) / ratings.length : null,
      bonus: Math.round(n(c.services) * 0.1) },
    pets, orders, shop, donations, referrals: ref };
}));

// ── Питомцы ──────────────────────────────────────────────────────
router.get('/pets', wrap(async (req) => {
  const { q: s, species } = req.query as Record<string, string>;
  const page = Math.max(1, Number(req.query.page) || 1);
  const where: string[] = []; const p: unknown[] = [];
  if (s) { p.push(`%${s}%`); where.push(`(p.name ILIKE $${p.length} OR p.breed ILIKE $${p.length} OR u.name ILIKE $${p.length} OR COALESCE(p.passport_id,'') ILIKE $${p.length})`); }
  if (species) { p.push(species); where.push(`p.species = $${p.length}`); }
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [tot] = await q(`SELECT COUNT(*)::int n FROM pets p JOIN users u ON u.id = p.owner_id ${W}`, p);
  const rows = await q(`SELECT p.id, p.name, p.species, p.breed, p.age_years, p.weight_kg, p.sex, p.photo_url, p.passport_id, p.current_concern,
      u.id owner_id, u.name owner, COALESCE(ov.visits, 0)::int visits, ov.last_visit
    FROM pets p JOIN users u ON u.id = p.owner_id
    LEFT JOIN (SELECT pet_id, COUNT(*) visits, MAX(scheduled_at) last_visit FROM orders WHERE status='completed' GROUP BY pet_id) ov ON ov.pet_id = p.id
    ${W} ORDER BY visits DESC, p.id DESC LIMIT 40 OFFSET ${(page - 1) * 40}`, p);
  const bySpecies = await q(`SELECT species, COUNT(*)::int n, ROUND(AVG(age_years)::numeric,1) age FROM pets GROUP BY 1 ORDER BY n DESC`);
  const breeds = await q(`SELECT species, breed, COUNT(*)::int n FROM pets WHERE breed IS NOT NULL GROUP BY 1, 2 ORDER BY n DESC LIMIT 14`);
  const reasons = await q(`SELECT s.name, s.icon, p.species, COUNT(*)::int n FROM orders o JOIN services s ON s.id = o.service_id JOIN pets p ON p.id = o.pet_id
    WHERE o.status='completed' AND o.scheduled_at >= NOW() - INTERVAL '90 days' GROUP BY 1, 2, 3 ORDER BY n DESC LIMIT 12`);
  return { total: tot.n, page, pages: Math.ceil(tot.n / 40), rows, bySpecies, breeds, reasons };
}));

// ── Ветеринары ───────────────────────────────────────────────────
router.get('/vets', wrap(async () => {
  const rows = await q(`
    SELECT v.id, u.name, u.phone, v.photo_url, v.specialization, v.experience_years, v.district, v.is_available, v.created_at, v.transport,
      COALESCE(a.total,0)::int total, COALESCE(a.n30,0)::int n30, COALESCE(a.rev30,0)::bigint rev30, COALESCE(a.pay30,0)::bigint pay30,
      COALESCE(a.rev_all,0)::bigint rev_all, a.rating, COALESCE(a.reviews,0)::int reviews, COALESCE(a.cancel30,0)::int cancel30,
      COALESCE(a.clients,0)::int clients, a.accept_min
    FROM vets v JOIN users u ON u.id = v.user_id
    LEFT JOIN (SELECT vet_id, COUNT(*) FILTER (WHERE status='completed') total,
        COUNT(*) FILTER (WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '30 days') n30,
        SUM(${REV}) FILTER (WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '30 days') rev30,
        SUM(vet_payout) FILTER (WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '30 days') pay30,
        SUM(${REV}) FILTER (WHERE status='completed') rev_all,
        ROUND(AVG(client_rating)::numeric, 2) rating, COUNT(client_rating) reviews,
        COUNT(*) FILTER (WHERE status='cancelled' AND scheduled_at >= NOW() - INTERVAL '30 days') cancel30,
        COUNT(DISTINCT client_id) clients,
        ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) FILTER (WHERE accepted_at IS NOT NULL AND scheduled_at >= NOW() - INTERVAL '30 days')::numeric, 1) accept_min
      FROM orders GROUP BY vet_id) a ON a.vet_id = v.id
    ORDER BY rev30 DESC NULLS LAST`);
  const out = rows.map((r) => {
    const t = tierFor(n(r.total), n(r.rating));
    return { ...r, rev30: n(r.rev30), pay30: n(r.pay30), rev_all: n(r.rev_all), rating: n(r.rating), accept_min: n(r.accept_min),
      tier: { name: t.name, icon: t.icon, percent: t.percent, color: t.color }, margin30: n(r.rev30) - n(r.pay30) };
  });
  const tiers = VET_TIERS.map((t) => ({ name: t.name, icon: t.icon, color: t.color, percent: t.percent, n: out.filter((v) => v.tier.name === t.name).length }));
  const growth = await q(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') m, COUNT(*)::int n FROM vets GROUP BY 1 ORDER BY 1`);
  return { rows: out, tiers, growth };
}));

router.get('/vets/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [v] = await q(`SELECT v.*, u.name, u.phone, u.email FROM vets v JOIN users u ON u.id = v.user_id WHERE v.id = $1`, [id]);
  if (!v) { res.status(404); return { error: 'Врач не найден' }; }
  const months = await q(`SELECT to_char(date_trunc('month', scheduled_at),'YYYY-MM') m, COUNT(*)::int n, SUM(${REV})::bigint revenue, SUM(vet_payout)::bigint payout
    FROM orders WHERE vet_id = $1 AND status='completed' AND scheduled_at >= '2025-11-01' GROUP BY 1 ORDER BY 1`, [id]);
  const services = await q(`SELECT s.name, s.icon, COUNT(*)::int n, SUM(${REV})::bigint revenue FROM orders o JOIN services s ON s.id = o.service_id
    WHERE o.vet_id = $1 AND o.status='completed' GROUP BY 1, 2 ORDER BY n DESC`, [id]);
  const orders = await q(`SELECT o.id, o.status, o.scheduled_at, o.total_price, o.vet_payout, o.client_rating, s.name service, s.icon, u.name client, p.name pet, p.species
    FROM orders o JOIN services s ON s.id = o.service_id JOIN users u ON u.id = o.client_id LEFT JOIN pets p ON p.id = o.pet_id
    WHERE o.vet_id = $1 ORDER BY o.scheduled_at DESC LIMIT 25`, [id]);
  const reviews = await q(`SELECT o.client_rating rating, o.client_review text, o.scheduled_at, u.name client FROM orders o JOIN users u ON u.id = o.client_id
    WHERE o.vet_id = $1 AND o.client_review IS NOT NULL ORDER BY o.scheduled_at DESC LIMIT 12`, [id]);
  const [s] = await q(`SELECT COUNT(*) FILTER (WHERE status='completed')::int total, ROUND(AVG(client_rating)::numeric,2) rating, COUNT(client_rating)::int reviews,
      COUNT(DISTINCT client_id)::int clients, SUM(${REV}) FILTER (WHERE status='completed')::bigint revenue, SUM(vet_payout) FILTER (WHERE status='completed')::bigint payout,
      COUNT(*) FILTER (WHERE status='completed' AND scheduled_at >= NOW() - INTERVAL '30 days')::int n30
    FROM orders WHERE vet_id = $1`, [id]);
  const t = tierFor(n(s.total), n(s.rating));
  return { vet: v, stats: { ...s, revenue: n(s.revenue), payout: n(s.payout), rating: n(s.rating), tier: { name: t.name, icon: t.icon, percent: t.percent, color: t.color } },
    months: months.map((m) => ({ ...m, revenue: n(m.revenue), payout: n(m.payout) })), services: services.map((x) => ({ ...x, revenue: n(x.revenue) })), orders, reviews };
}));

// ── Услуги ───────────────────────────────────────────────────────
router.get('/services', wrap(async () => {
  const rows = await q(`SELECT s.id, s.name, s.icon, s.price_from, s.price_to, s.duration_minutes,
      COUNT(o.id) FILTER (WHERE o.scheduled_at >= NOW() - INTERVAL '30 days')::int n30,
      COALESCE(SUM(${REV.replace(/total_price|bonus_used/g, (m) => `o.${m}`)}) FILTER (WHERE o.scheduled_at >= NOW() - INTERVAL '30 days'),0)::bigint rev30,
      COALESCE(SUM(o.vet_payout) FILTER (WHERE o.scheduled_at >= NOW() - INTERVAL '30 days'),0)::bigint pay30,
      COUNT(o.id)::int total, COALESCE(SUM(${REV.replace(/total_price|bonus_used/g, (m) => `o.${m}`)}),0)::bigint rev_all,
      ROUND(AVG(o.client_rating)::numeric, 2) rating
    FROM services s LEFT JOIN orders o ON o.service_id = s.id AND o.status = 'completed' GROUP BY s.id ORDER BY rev30 DESC`);
  const months = await q(`SELECT to_char(date_trunc('month', o.scheduled_at),'YYYY-MM') m, s.name, COUNT(*)::int n FROM orders o JOIN services s ON s.id = o.service_id
    WHERE o.status='completed' AND o.scheduled_at >= '2025-11-01' GROUP BY 1, 2 ORDER BY 1`);
  return { rows: rows.map((r) => ({ ...r, rev30: n(r.rev30), pay30: n(r.pay30), rev_all: n(r.rev_all), rating: n(r.rating) })), months };
}));

// ── Магазин ──────────────────────────────────────────────────────
router.get('/shop', wrap(async () => {
  const all = await q(`SELECT product_id, SUM(qty)::int qty, SUM(total_rub + bonus_used)::bigint revenue, COUNT(*)::int n, SUM(bonus_used)::bigint bonus
    FROM shop_orders WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY product_id`);
  const products = all.map((r) => { const p = PROD.get(r.product_id); return { id: r.product_id, title: p?.title ?? `Товар №${r.product_id}`, brand: p?.brand,
    category: p?.category ?? 'Другое', image: p?.images?.find((i) => i.startsWith('/')) ?? null, price: p?.price ?? 0, qty: n(r.qty), n: n(r.n), revenue: n(r.revenue), bonus: n(r.bonus) }; })
    .sort((a, b) => b.revenue - a.revenue);
  const cats = new Map<string, { category: string; revenue: number; qty: number }>();
  for (const p of products) { const c = cats.get(p.category) ?? { category: p.category, revenue: 0, qty: 0 }; c.revenue += p.revenue; c.qty += p.qty; cats.set(p.category, c); }
  const months = await q(`SELECT to_char(date_trunc('month', created_at),'YYYY-MM') m, SUM(total_rub+bonus_used)::bigint revenue, COUNT(*)::int n, SUM(bonus_used)::bigint bonus
    FROM shop_orders WHERE created_at >= '2025-11-01' GROUP BY 1 ORDER BY 1`);
  const recent = (await q(`SELECT so.id, so.product_id, so.qty, so.total_rub, so.bonus_used, so.created_at, u.id user_id, u.name FROM shop_orders so JOIN users u ON u.id = so.user_id
    ORDER BY so.created_at DESC LIMIT 30`)).map((r) => ({ ...r, title: PROD.get(r.product_id)?.title ?? `Товар №${r.product_id}` }));
  const [k] = await q(`SELECT COALESCE(SUM(total_rub+bonus_used),0)::bigint revenue, COUNT(*)::int n, COUNT(DISTINCT user_id)::int buyers, COALESCE(SUM(bonus_used),0)::bigint bonus
    FROM shop_orders WHERE created_at >= NOW() - INTERVAL '30 days'`);
  return { kpi: { revenue: n(k.revenue), orders: n(k.n), buyers: n(k.buyers), bonus: n(k.bonus), avg: n(k.n) ? Math.round(n(k.revenue) / n(k.n)) : 0, sku: PRODUCTS.length },
    products, categories: [...cats.values()].sort((a, b) => b.revenue - a.revenue),
    months: months.map((m) => ({ ...m, revenue: n(m.revenue), bonus: n(m.bonus) })), recent };
}));

// ── Юнит-экономика и показатели для инвестора ────────────────────
router.get('/unit', wrap(async () => {
  const months = await monthSeries();
  const last = months[months.length - 2];
  const fin = await q(`SELECT grp, SUM(amount)::bigint a FROM crm_finance WHERE to_char(month,'YYYY-MM') = $1 GROUP BY grp`, [last.m]);
  const g = (name: string) => n(fin.find((f) => f.grp === name)?.a);
  const visits = last.orders;
  const avg = visits ? last.svc / visits : 0;
  const perVisit = {
    check: avg, vet: g('Выплаты ветеринарам') / visits, meds: g('Медикаменты и расходники') / visits,
    acquiring: (last.svc * 0.021) / visits, tax: (last.svc * 0.06) / visits,
  };
  const contribution = perVisit.check - perVisit.vet - perVisit.meds - perVisit.acquiring - perVisit.tax;
  const [c] = await q(`SELECT COUNT(*)::int clients, COUNT(*) FILTER (WHERE n >= 2)::int repeat, AVG(n)::float avg_orders, AVG(rev)::float avg_rev,
      AVG(EXTRACT(EPOCH FROM (last - first)) / 86400)::float avg_life FROM (
      SELECT client_id, COUNT(*) n, SUM(${REV}) rev, MIN(scheduled_at) first, MAX(scheduled_at) last FROM orders WHERE status='completed' GROUP BY client_id) x`);
  const cac = last.new_clients ? last.marketing / last.new_clients : 0;
  // LTV за 12 месяцев: визитов на клиента в год × маржа с визита + магазин
  const [yr] = await q(`SELECT COUNT(*)::float / NULLIF(COUNT(DISTINCT client_id),0) per_client FROM orders WHERE status='completed'
      AND client_id IN (SELECT client_id FROM orders WHERE status='completed' GROUP BY client_id HAVING MIN(scheduled_at) < NOW() - INTERVAL '180 days')
      AND scheduled_at >= NOW() - INTERVAL '365 days'`);
  const visitsYear = Math.max(n(yr.per_client), 2.5);
  const [shopPer] = await q(`SELECT COALESCE(SUM(total_rub+bonus_used),0)::float / NULLIF((SELECT COUNT(*) FROM users WHERE role='client'),0) v FROM shop_orders WHERE created_at >= NOW() - INTERVAL '365 days'`);
  const ltv = visitsYear * contribution + n(shopPer.v) * 0.47;
  const cohorts = await q(`
    WITH f AS (SELECT client_id, date_trunc('month', MIN(scheduled_at)) c FROM orders WHERE status='completed' GROUP BY client_id),
         a AS (SELECT DISTINCT o.client_id, date_trunc('month', o.scheduled_at) m FROM orders o WHERE o.status='completed')
    SELECT to_char(f.c,'YYYY-MM') cohort, ((EXTRACT(YEAR FROM a.m) - EXTRACT(YEAR FROM f.c)) * 12 + EXTRACT(MONTH FROM a.m) - EXTRACT(MONTH FROM f.c))::int k, COUNT(*)::int n
    FROM f JOIN a ON a.client_id = f.client_id WHERE f.c >= '2025-11-01' GROUP BY 1, 2 ORDER BY 1, 2`);
  const growth = months.slice(1, -1).map((m, i) => (months[i].revenue ? m.revenue / months[i].revenue - 1 : 0));
  const avgGrowth = growth.slice(-6).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(6, growth.length));
  const [team] = await q(`SELECT (SELECT COUNT(*) FROM vets)::int vets`);
  return {
    month: last.m, perVisit, contribution, contribution_pct: avg ? contribution / avg : 0,
    cac, ltv, ltv_cac: cac ? ltv / cac : 0, payback_months: contribution && visitsYear ? cac / (contribution * visitsYear / 12) : 0,
    repeat_rate: c.clients ? c.repeat / c.clients : 0, avg_orders: n(c.avg_orders), avg_rev: n(c.avg_rev), visits_year: visitsYear,
    run_rate: last.revenue * 12, mom_growth: avgGrowth, months, cohorts,
    team: { vets: team.vets, office: 24 },
    profit_margin: last.revenue ? last.profit / last.revenue : 0,
  };
}));

export default router;
