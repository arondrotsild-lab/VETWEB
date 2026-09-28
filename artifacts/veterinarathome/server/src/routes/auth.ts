import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { name, phone, email, password, telegram_nick, role = 'client' } = req.body;
  if (!name || !phone || !password) {
    res.status(400).json({ error: 'Имя, телефон и пароль обязательны' });
    return;
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Телефон уже зарегистрирован' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password_hash, role, telegram_nick) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, phone, email, role, telegram_nick',
      [name, phone, email || null, hash, role === 'vet' ? 'vet' : 'client', telegram_nick || null]
    );
    const user = result.rows[0];
    if (user.role === 'vet') {
      await pool.query('INSERT INTO vets (user_id) VALUES ($1)', [user.id]);
    }
    const token = generateToken({ id: user.id, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    res.status(400).json({ error: 'Телефон и пароль обязательны' });
    return;
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Неверный телефон или пароль' });
      return;
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Неверный телефон или пароль' });
      return;
    }
    const token = generateToken({ id: user.id, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, role, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
