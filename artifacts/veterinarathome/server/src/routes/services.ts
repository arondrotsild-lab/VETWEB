import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /api/services
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM services ORDER BY id');
  res.json(result.rows);
});

export default router;
