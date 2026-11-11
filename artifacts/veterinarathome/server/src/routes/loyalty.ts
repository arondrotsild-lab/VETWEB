import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

// Программа лояльности + одноуровневая реферальная программа.
// 1 бонус = 1 ₽. Бонусами можно оплатить до 30% стоимости визита.
export const WELCOME_BONUS = 500;
export const FRIEND_SIGNUP_BONUS = 500;   // за каждого приглашённого друга
export const FRIEND_ORDER_PERCENT = 5;    // % с каждого выполненного визита друга (только 1 уровень)
export const MAX_BONUS_SHARE = 0.3;

export const TIERS = [
  { name: 'Друг', icon: '🐾', from: 0, rate: 10 },
  { name: 'Лучший друг', icon: '⭐', from: 15000, rate: 12 },
  { name: 'Член семьи', icon: '👑', from: 40000, rate: 15 },
];

export async function computeLoyalty(userId: number) {
  const me = await pool.query('SELECT referral_code FROM users WHERE id = $1', [userId]);
  const own = await pool.query(
    `SELECT o.id, o.total_price, o.bonus_used, o.scheduled_at, s.name AS service_name
     FROM orders o LEFT JOIN services s ON s.id = o.service_id
     WHERE o.client_id = $1 AND o.status = 'completed' ORDER BY o.scheduled_at DESC`,
    [userId]
  );
  const full = (r: { total_price: number | null; bonus_used: number | null }) => (r.total_price || 0) + (r.bonus_used || 0);
  const spent = own.rows.reduce((s, r) => s + full(r), 0);
  const tier = [...TIERS].reverse().find((t) => spent >= t.from) ?? TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1] ?? null;

  const accruals: { label: string; amount: number; date: string; kind: string }[] = own.rows.map((r) => ({
    label: r.service_name || 'Визит', amount: Math.round(full(r) * tier.rate / 100), date: r.scheduled_at, kind: 'visit',
  }));

  // Кешбэк 5% за покупки в магазине, оплаченные рублями
  const shop = await pool.query(
    'SELECT total_rub, created_at FROM shop_orders WHERE user_id = $1 AND total_rub > 0 ORDER BY created_at DESC', [userId]
  );
  shop.rows.forEach((r) => accruals.push({ label: 'Покупка в магазине · 5%', amount: Math.round(r.total_rub * 0.05), date: r.created_at, kind: 'shop' }));

  // Друзья, пришедшие по вашему коду (только первый уровень)
  const friends = await pool.query(
    `SELECT u.id, u.name, u.created_at,
       COALESCE(SUM(CASE WHEN o.status = 'completed' THEN COALESCE(o.total_price,0) + COALESCE(o.bonus_used,0) END), 0)::int AS friend_spent,
       COUNT(o.id) FILTER (WHERE o.status = 'completed')::int AS friend_visits
     FROM users u LEFT JOIN orders o ON o.client_id = u.id
     WHERE u.referred_by = $1 GROUP BY u.id ORDER BY u.created_at DESC`,
    [userId]
  );
  const friendList = friends.rows.map((f) => {
    const fromVisits = Math.round(f.friend_spent * FRIEND_ORDER_PERCENT / 100);
    const earned = FRIEND_SIGNUP_BONUS + fromVisits;
    accruals.push({ label: `Друг ${f.name.split(' ')[0]} присоединился`, amount: FRIEND_SIGNUP_BONUS, date: f.created_at, kind: 'friend' });
    if (fromVisits) accruals.push({ label: `${FRIEND_ORDER_PERCENT}% с визитов друга ${f.name.split(' ')[0]}`, amount: fromVisits, date: f.created_at, kind: 'friend' });
    return { name: f.name, joined: f.created_at, visits: f.friend_visits, earned };
  });

  const usedRes = await pool.query(
    `SELECT (COALESCE((SELECT SUM(bonus_used) FROM orders WHERE client_id = $1 AND status <> 'cancelled'),0)
           + COALESCE((SELECT SUM(bonus_used) FROM shop_orders WHERE user_id = $1),0))::int AS used`, [userId]
  );
  const used = usedRes.rows[0].used as number;
  const earnedTotal = WELCOME_BONUS + accruals.reduce((s, a) => s + a.amount, 0);
  accruals.push({ label: 'Приветственный бонус', amount: WELCOME_BONUS, date: '', kind: 'welcome' });

  return {
    balance: Math.max(0, earnedTotal - used),
    earnedTotal, used, spent, tier, nextTier, tiers: TIERS,
    accruals, friends: friendList,
    referralCode: me.rows[0]?.referral_code,
    rules: { welcome: WELCOME_BONUS, friendSignup: FRIEND_SIGNUP_BONUS, friendPercent: FRIEND_ORDER_PERCENT, maxShare: MAX_BONUS_SHARE },
  };
}

const router = Router();
router.use(authMiddleware);

// GET /api/loyalty — баланс, статус, друзья, реферальный код
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    res.json(await computeLoyalty(req.user!.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
