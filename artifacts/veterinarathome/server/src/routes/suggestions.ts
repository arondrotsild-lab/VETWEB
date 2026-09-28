import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// POST /api/suggestions
router.post('/', async (req: Request, res: Response) => {
  const { name, telegram, comment } = req.body;
  if (!comment) { res.status(400).json({ error: 'Комментарий обязателен' }); return; }
  try {
    await pool.query(
      `INSERT INTO suggestions (name, telegram, comment) VALUES ($1, $2, $3)`,
      [name || null, telegram || null, comment]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
