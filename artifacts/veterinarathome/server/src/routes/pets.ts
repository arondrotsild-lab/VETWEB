import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/pets
router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC',
    [req.user!.id]
  );
  res.json(result.rows);
});

// POST /api/pets
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, species, breed, age_years, weight_kg, notes, photo_url, telegram_nick, diagnoses, previous_treatment, current_concern } = req.body;
  if (!name || !species) {
    res.status(400).json({ error: 'Кличка и вид питомца обязательны' });
    return;
  }
  const result = await pool.query(
    `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, notes, photo_url, telegram_nick, diagnoses, previous_treatment, current_concern)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [req.user!.id, name, species, breed || null, age_years || null, weight_kg || null, notes || null,
     photo_url || null, telegram_nick || null, diagnoses || null, previous_treatment || null, current_concern || null]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/pets/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, species, breed, age_years, weight_kg, notes, photo_url, telegram_nick, diagnoses, previous_treatment, current_concern } = req.body;
  const result = await pool.query(
    `UPDATE pets SET name=$1, species=$2, breed=$3, age_years=$4, weight_kg=$5, notes=$6,
     photo_url=$7, telegram_nick=$8, diagnoses=$9, previous_treatment=$10, current_concern=$11
     WHERE id=$12 AND owner_id=$13 RETURNING *`,
    [name, species, breed || null, age_years || null, weight_kg || null, notes || null,
     photo_url || null, telegram_nick || null, diagnoses || null, previous_treatment || null, current_concern || null,
     req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Питомец не найден' });
    return;
  }
  res.json(result.rows[0]);
});

// DELETE /api/pets/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'DELETE FROM pets WHERE id=$1 AND owner_id=$2 RETURNING id',
    [req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Питомец не найден' });
    return;
  }
  res.json({ success: true });
});

export default router;
