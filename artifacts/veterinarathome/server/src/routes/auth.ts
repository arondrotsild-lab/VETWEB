import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MEDIA_DIR } from './chat';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { name, phone, email, password, telegram_nick, role = 'client', ref } = req.body;
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
    // Реферальный код пригласившего (только один уровень)
    let referredBy: number | null = null;
    if (ref) {
      const r = await pool.query('SELECT id FROM users WHERE referral_code = $1', [String(ref).trim().toUpperCase()]);
      referredBy = r.rows[0]?.id ?? null;
    }
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password_hash, role, telegram_nick, referred_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, phone, email, role, telegram_nick',
      [name, phone, email || null, hash, role === 'vet' ? 'vet' : 'client', telegram_nick || null, referredBy]
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
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, role, avatar_url, telegram_nick, created_at FROM users WHERE id = $1',
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

// ── Настройки клиента: имя, email, Telegram, фото, пароль ──

// PATCH /api/auth/me — { name?, email?, telegram_nick? }
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const b = req.body || {};
  const str = (x: unknown, n: number) => (typeof x === 'string' ? x.trim().slice(0, n) : undefined);
  const name = str(b.name, 255), email = str(b.email, 255), tg = str(b.telegram_nick, 100);
  if (name !== undefined && name.length < 2) { res.status(400).json({ error: 'Укажите имя' }); return; }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { res.status(400).json({ error: 'Проверьте email' }); return; }
  try {
    const r = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), email = CASE WHEN $2::text IS NULL THEN email ELSE NULLIF($2, '') END,
         telegram_nick = CASE WHEN $3::text IS NULL THEN telegram_nick ELSE NULLIF($3, '') END
       WHERE id = $4 RETURNING id, name, phone, email, role, avatar_url, telegram_nick`,
      [name ?? null, email ?? null, tg === undefined ? null : (tg && !tg.startsWith('@') ? '@' + tg : tg), req.user!.id]);
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/avatar — { image: dataURL }
router.post('/avatar', authMiddleware, async (req: AuthRequest, res: Response) => {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i.exec(String(req.body?.image || ''));
  if (!m) { res.status(400).json({ error: 'Выберите фото в формате JPG, PNG или WEBP' }); return; }
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length < 1000 || buf.length > 5_000_000) { res.status(400).json({ error: 'Фото должно быть до 5 МБ' }); return; }
  const dir = path.join(MEDIA_DIR, 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
  const file = `user-${req.user!.id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  const url = `/api/media/avatars/${file}`;
  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [url, req.user!.id]);
  res.json({ avatar_url: url });
});

// POST /api/auth/password — { old_password, new_password }
router.post('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { old_password, new_password } = req.body || {};
  if (typeof new_password !== 'string' || new_password.length < 6) { res.status(400).json({ error: 'Новый пароль — минимум 6 символов' }); return; }
  const u = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
  if (!u.rows[0] || !(await bcrypt.compare(String(old_password || ''), u.rows[0].password_hash))) { res.status(400).json({ error: 'Текущий пароль указан неверно' }); return; }
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(new_password, 10), req.user!.id]);
  res.json({ ok: true });
});

export default router;
