import { Router, Request, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/vets — public list of available vets
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT v.*, u.name, u.phone
     FROM vets v JOIN users u ON v.user_id = u.id
     WHERE v.is_verified = true
     ORDER BY v.rating DESC`
  );
  res.json(result.rows);
});

// GET /api/vets/profile — get own vet profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT v.*, u.name, u.phone, u.email
     FROM vets v JOIN users u ON v.user_id = u.id
     WHERE v.user_id = $1`,
    [req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Профиль ветеринара не найден' });
    return;
  }
  res.json(result.rows[0]);
});

// PATCH /api/vets/profile
router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { specialization, experience_years, bio, is_available } = req.body;
  const result = await pool.query(
    `UPDATE vets SET
       specialization = COALESCE($1, specialization),
       experience_years = COALESCE($2, experience_years),
       bio = COALESCE($3, bio),
       is_available = COALESCE($4, is_available)
     WHERE user_id = $5 RETURNING *`,
    [specialization, experience_years, bio, is_available, req.user!.id]
  );
  res.json(result.rows[0]);
});

export default router;
