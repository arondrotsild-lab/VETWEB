import { Router, Request, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PRODUCTS } from '../shopCatalog';
import { computeLoyalty } from './loyalty';

export async function initShop() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      total_rub INTEGER NOT NULL DEFAULT 0,
      bonus_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

const router = Router();

router.get('/', (_req: Request, res: Response) => { res.json(PRODUCTS); });
router.get('/:id', (req: Request, res: Response) => {
  const p = PRODUCTS.find((x) => x.id === Number(req.params.id));
  if (!p) { res.status(404).json({ error: 'Товар не найден' }); return; }
  res.json(p);
});

// POST /api/shop/:id/buy — { qty, pay: 'rub' | 'bonus' }
router.post('/:id/buy', authMiddleware, async (req: AuthRequest, res: Response) => {
  const p = PRODUCTS.find((x) => x.id === Number(req.params.id));
  if (!p) { res.status(404).json({ error: 'Товар не найден' }); return; }
  const qty = Math.min(20, Math.max(1, Math.round(Number(req.body?.qty) || 1)));
  const pay = req.body?.pay === 'bonus' ? 'bonus' : 'rub';
  // Фасовка (вес) — для кормов
  const vi = Math.max(0, Math.min((p.variants?.length ?? 1) - 1, Math.round(Number(req.body?.variant) || 0)));
  const unit = p.variants ? p.variants[vi] : { price: p.price, bonusPrice: p.bonusPrice };
  let totalRub = unit.price * qty, bonusUsed = 0;
  if (pay === 'bonus') {
    const need = unit.bonusPrice * qty;
    const { balance } = await computeLoyalty(req.user!.id);
    if (balance < need) {
      res.status(400).json({ error: `Не хватает бонусов: нужно ${need}, на счёте ${balance}` });
      return;
    }
    totalRub = 0; bonusUsed = need;
  }
  const r = await pool.query(
    'INSERT INTO shop_orders (user_id, product_id, qty, total_rub, bonus_used) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.user!.id, p.id, qty, totalRub, bonusUsed]
  );
  const { balance } = await computeLoyalty(req.user!.id);
  res.json({ orderId: r.rows[0].id, totalRub, bonusUsed, balance, title: p.title });
});

export default router;
