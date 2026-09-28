import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/orders — клиент видит свои, ветеринар видит назначенные, админ видит все
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    let query: string;
    let params: unknown[];

    if (req.user!.role === 'admin') {
      query = `SELECT o.*, u.name as client_name, u.phone as client_phone,
               p.name as pet_name, p.species as pet_species,
               s.name as service_name, s.icon as service_icon,
               vu.name as vet_name, v.photo_url as vet_photo_url,
               v.specialization as vet_specialization, v.experience_years as vet_experience_years,
               v.rating as vet_rating, v.reviews_count as vet_reviews_count
               FROM orders o
               JOIN users u ON o.client_id = u.id
               LEFT JOIN pets p ON o.pet_id = p.id
               LEFT JOIN services s ON o.service_id = s.id
               LEFT JOIN vets v ON o.vet_id = v.id
               LEFT JOIN users vu ON v.user_id = vu.id
               ORDER BY o.created_at DESC`;
      params = [];
    } else if (req.user!.role === 'vet') {
      const vetRes = await pool.query('SELECT id FROM vets WHERE user_id = $1', [req.user!.id]);
      if (vetRes.rows.length === 0) {
        res.json([]);
        return;
      }
      query = `SELECT o.*, u.name as client_name, u.phone as client_phone,
               p.name as pet_name, p.species as pet_species,
               s.name as service_name, s.icon as service_icon
               FROM orders o
               JOIN users u ON o.client_id = u.id
               LEFT JOIN pets p ON o.pet_id = p.id
               LEFT JOIN services s ON o.service_id = s.id
               WHERE o.vet_id = $1 OR (o.status = 'pending' AND o.vet_id IS NULL)
               ORDER BY o.created_at DESC`;
      params = [vetRes.rows[0].id];
    } else {
      query = `SELECT o.*, p.name as pet_name, p.species as pet_species,
               s.name as service_name, s.icon as service_icon,
               vu.name as vet_name, v.photo_url as vet_photo_url,
               v.specialization as vet_specialization, v.experience_years as vet_experience_years,
               v.rating as vet_rating, v.reviews_count as vet_reviews_count
               FROM orders o
               LEFT JOIN pets p ON o.pet_id = p.id
               LEFT JOIN services s ON o.service_id = s.id
               LEFT JOIN vets v ON o.vet_id = v.id
               LEFT JOIN users vu ON v.user_id = vu.id
               WHERE o.client_id = $1
               ORDER BY o.created_at DESC`;
      params = [req.user!.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as client_name, u.phone as client_phone,
       p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
       s.name as service_name, s.icon as service_icon, s.price_from, s.price_to,
        vu.name as vet_name, v.photo_url as vet_photo_url,
        v.specialization as vet_specialization, v.experience_years as vet_experience_years,
        v.rating as vet_rating, v.reviews_count as vet_reviews_count
       FROM orders o
       JOIN users u ON o.client_id = u.id
       LEFT JOIN pets p ON o.pet_id = p.id
       LEFT JOIN services s ON o.service_id = s.id
       LEFT JOIN vets v ON o.vet_id = v.id
       LEFT JOIN users vu ON v.user_id = vu.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }
    const order = result.rows[0];
    // check access
    if (req.user!.role === 'client' && order.client_id !== req.user!.id) {
      res.status(403).json({ error: 'Нет доступа' });
      return;
    }
    const history = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ ...order, history: history.rows });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/orders
router.post('/', async (req: AuthRequest, res: Response) => {
  const { pet_id, service_id, address, scheduled_at, notes } = req.body;
  if (!service_id || !pet_id || !address || !scheduled_at) {
    res.status(400).json({ error: 'Услуга, питомец, адрес и время обязательны' });
    return;
  }
  try {
    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      res.status(400).json({ error: 'Указаны некорректные дата и время' });
      return;
    }
    const petRes = await pool.query(
      'SELECT id FROM pets WHERE id = $1 AND owner_id = $2',
      [pet_id, req.user!.id]
    );
    if (petRes.rows.length === 0) {
      res.status(400).json({ error: 'Выберите питомца из вашего профиля' });
      return;
    }
    const svcRes = await pool.query('SELECT price_from FROM services WHERE id = $1', [service_id]);
    const price = svcRes.rows[0]?.price_from || 0;

    const result = await pool.query(
      `INSERT INTO orders (client_id, pet_id, service_id, address, scheduled_at, notes, total_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.id, pet_id, service_id, address, scheduledDate.toISOString(), notes || null, price]
    );
    const order = result.rows[0];
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, comment) VALUES ($1, $2, $3)',
      [order.id, 'pending', 'Заказ создан, ищем ветеринара']
    );
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status, comment } = req.body;
  const validStatuses = ['pending', 'confirmed', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Неверный статус' });
    return;
  }
  try {
    const result = await pool.query(
      'UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Заказ не найден' });
      return;
    }
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, comment) VALUES ($1,$2,$3)',
      [req.params.id, status, comment || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
