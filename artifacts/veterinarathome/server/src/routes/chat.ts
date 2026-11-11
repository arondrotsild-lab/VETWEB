import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { transcribeFile } from '../transcribe';

// Чат клиента с ветеринаром, который приезжал на визит.
// Приложения для врачей пока нет, поэтому для демонстрации врач отвечает автоматически
// через несколько секунд — по ключевым словам вопроса.

export async function initChat() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      sender VARCHAR(10) NOT NULL,           -- 'client' | 'vet'
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      read_by_client BOOLEAN DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_chat_order ON chat_messages(order_id, created_at);
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS kind VARCHAR(10) DEFAULT 'text';
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS duration INTEGER;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS waveform JSONB;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS transcript TEXT;
  `);
  fs.mkdirSync(VOICE_DIR, { recursive: true });
}

// Голосовые сообщения хранятся на диске сервера и отдаются по /api/media/voice/<файл>
export const MEDIA_DIR = path.resolve(__dirname, '../../uploads');
const VOICE_DIR = path.join(MEDIA_DIR, 'voice');
const AUDIO_EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac' };

function saveAudio(dataUrl: string): { file: string; full: string } | { error: string } {
  const m = /^data:(audio\/[a-z0-9.+-]+)(;[^,]*)?;base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!m) return { error: 'Нет аудио' };
  const ext = AUDIO_EXT[m[1].toLowerCase()] ?? 'webm';
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length < 500 || buf.length > 6_000_000) return { error: 'Слишком короткая или длинная запись' };
  const file = `${crypto.randomUUID()}.${ext}`;
  const full = path.join(VOICE_DIR, file);
  fs.writeFileSync(full, buf);
  return { file, full };
}

const REPLIES: { re: RegExp; text: (pet: string, f: boolean) => string }[] = [
  { re: /лекарств|таблетк|дать|давать|доз|капл|мазь|укол/i, text: (p, f) => `Лекарства давайте строго по схеме из медкарты — я ${f ? 'записала' : 'записал'} её после визита. Таблетку удобно спрятать в кусочек влажного корма. Если ${p} отказывается или после приёма появится рвота — сразу напишите мне, подберём другую форму.` },
  { re: /рвот|тошн|понос|стул|живот|не ест|аппетит/i, text: (p, f) => `Понимаю ваше беспокойство. Уберите еду на 8–12 часов, воду давайте понемногу. Если рвота повторится больше 2 раз или ${p} станет вялым — оформите вызов, я посмотрю повторно сегодня же.` },
  { re: /куп|мыть|ванн|гулять|прогул|бег|играть/i, text: (p, f) => `Купать пока не нужно — подождите 7–10 дней после процедуры. Прогулки можно, но спокойные, без активных игр первые 3 дня. ${p} сам покажет, когда будет готов к нагрузке 🙂` },
  { re: /прививк|вакцин|ревакц/i, text: (_p, f) => `Следующую прививку я ${f ? 'запланировала' : 'запланировал'} в медкарте — за неделю придёт напоминание. За 10 дней до вакцинации нужно дать таблетку от гельминтов.` },
  { re: /корм|кормить|еда|питани|диет/i, text: (p, f) => `Для ${p} я бы ${f ? 'рекомендовала' : 'рекомендовал'} корм «ВетДом Натурал» с учётом его медкарты — порцию делите на 2 приёма. Его можно заказать в нашем магазине, в том числе за бонусы.` },
  { re: /анализ|результат|кровь|моч/i, text: (_p, f) => 'Результаты анализов будут готовы в течение 2–3 рабочих дней, я сразу загружу их в медкарту и напишу вам расшифровку здесь.' },
  { re: /спасиб|благодар/i, text: (p, f) => `Пожалуйста! Было очень приятно познакомиться с ${p}. Если появятся вопросы — пишите в любое время, я на связи 🐾` },
  { re: /шов|швы|ран|отек|отёк|красн/i, text: (_p, f) => 'Пришлите, пожалуйста, фото шва при хорошем освещении. Небольшое покраснение в первые 2–3 дня — норма. Если появился отёк, выделения или питомец постоянно его вылизывает — нужно посмотреть очно.' },
];
const GENERIC = (p: string, f: boolean) => `Спасибо, что написали! Я ${f ? 'посмотрела' : 'посмотрел'} медкарту ${p}. Расскажите, пожалуйста, подробнее: когда это началось и как ${p} ест и пьёт? Если ситуация срочная — оформите вызов, я приеду.`;

async function getOrderForUser(orderId: number, user: { id: number; role: string }) {
  const r = await pool.query(
    `SELECT o.id, o.client_id, o.status, o.scheduled_at, s.name AS service_name, p.name AS pet_name, p.species AS pet_species,
       vu.name AS vet_name, v.photo_url AS vet_photo_url, v.specialization AS vet_specialization, v.user_id AS vet_user_id
     FROM orders o LEFT JOIN services s ON s.id = o.service_id LEFT JOIN pets p ON p.id = o.pet_id
     LEFT JOIN vets v ON v.id = o.vet_id LEFT JOIN users vu ON vu.id = v.user_id WHERE o.id = $1`, [orderId]);
  const o = r.rows[0];
  if (!o || !o.vet_name) return null;
  if (o.client_id !== user.id && o.vet_user_id !== user.id && user.role !== 'admin') return null;
  return o;
}

const router = Router();
router.use(authMiddleware);

// GET /api/chat — список диалогов клиента
router.get('/', async (req: AuthRequest, res: Response) => {
  const r = await pool.query(
    `SELECT o.id AS order_id, s.name AS service_name, p.name AS pet_name, o.scheduled_at,
       vu.name AS vet_name, v.photo_url AS vet_photo_url, v.specialization AS vet_specialization,
       lm.text AS last_text, lm.sender AS last_sender, lm.created_at AS last_at,
       (SELECT COUNT(*) FROM chat_messages c WHERE c.order_id = o.id AND c.sender = 'vet' AND NOT c.read_by_client)::int AS unread
     FROM orders o
     JOIN vets v ON v.id = o.vet_id JOIN users vu ON vu.id = v.user_id
     LEFT JOIN services s ON s.id = o.service_id LEFT JOIN pets p ON p.id = o.pet_id
     LEFT JOIN LATERAL (SELECT text, sender, created_at FROM chat_messages c WHERE c.order_id = o.id ORDER BY created_at DESC LIMIT 1) lm ON true
     WHERE o.client_id = $1 AND o.status IN ('completed','arrived','in_progress')
     ORDER BY COALESCE(lm.created_at, o.scheduled_at) DESC`, [req.user!.id]);
  res.json(r.rows);
});

// GET /api/chat/:orderId — сообщения
router.get('/:orderId', async (req: AuthRequest, res: Response) => {
  const o = await getOrderForUser(Number(req.params.orderId), req.user!);
  if (!o) { res.status(404).json({ error: 'Диалог не найден' }); return; }
  const m = await pool.query('SELECT id, sender, text, created_at, kind, audio_url, duration, waveform, transcript FROM chat_messages WHERE order_id = $1 ORDER BY created_at, id', [o.id]);
  if (o.client_id === req.user!.id) await pool.query(`UPDATE chat_messages SET read_by_client = true WHERE order_id = $1 AND sender = 'vet'`, [o.id]);
  res.json({ order: o, messages: m.rows });
});

// POST /api/chat/:orderId — { text }
router.post('/:orderId', async (req: AuthRequest, res: Response) => {
  const o = await getOrderForUser(Number(req.params.orderId), req.user!);
  if (!o) { res.status(404).json({ error: 'Диалог не найден' }); return; }
  const text = String(req.body?.text || '').trim().slice(0, 2000);
  if (!text) { res.status(400).json({ error: 'Пустое сообщение' }); return; }
  const isVet = o.vet_user_id === req.user!.id;
  const r = await pool.query('INSERT INTO chat_messages (order_id, sender, text) VALUES ($1,$2,$3) RETURNING id, sender, text, created_at',
    [o.id, isVet ? 'vet' : 'client', text]);
  if (!isVet) scheduleVetReply(o, text, false);
  res.status(201).json(r.rows[0]);
});

// POST /api/chat/:orderId/voice — { audio: dataURL(base64), duration, waveform[], transcript }
router.post('/:orderId/voice', async (req: AuthRequest, res: Response) => {
  const o = await getOrderForUser(Number(req.params.orderId), req.user!);
  if (!o) { res.status(404).json({ error: 'Диалог не найден' }); return; }
  const saved = saveAudio(req.body?.audio);
  if ('error' in saved) { res.status(400).json({ error: saved.error }); return; }
  const file = saved.file;
  const duration = Math.max(1, Math.min(600, Math.round(Number(req.body?.duration) || 1)));
  const waveform = Array.isArray(req.body?.waveform) ? req.body.waveform.slice(0, 64).map((v: unknown) => Math.max(0, Math.min(1, Number(v) || 0))) : null;
  // Расшифровка: из браузера, а если он не умеет (Opera, Firefox) — нейросетью Whisper на сервере
  const transcript = String(req.body?.transcript || '').trim().slice(0, 4000) || (await transcribeFile(saved.full)) || null;
  const isVet = o.vet_user_id === req.user!.id;
  const r = await pool.query(
    `INSERT INTO chat_messages (order_id, sender, text, kind, audio_url, duration, waveform, transcript)
     VALUES ($1,$2,$3,'voice',$4,$5,$6,$7) RETURNING id, sender, text, created_at, kind, audio_url, duration, waveform, transcript`,
    [o.id, isVet ? 'vet' : 'client', '🎤 Голосовое сообщение', `/api/media/voice/${file}`, duration, waveform ? JSON.stringify(waveform) : null, transcript]);
  if (!isVet) scheduleVetReply(o, transcript || '', true);
  res.status(201).json(r.rows[0]);
});

// Демонстрационный ответ врача через 3–5 секунд (пока нет приложения для врачей)
function scheduleVetReply(o: { id: number; pet_name?: string; vet_name: string }, text: string, voice: boolean) {
  const pet = o.pet_name || 'питомца';
  const female = /[ая]$/i.test(String(o.vet_name).split(' ')[0]);   // Анна, Мария → женский род
  const match = REPLIES.find((x) => x.re.test(text));
  let reply = (match?.text ?? GENERIC)(pet, female);
  if (voice) reply = `${female ? 'Прослушала' : 'Прослушал'} ваше голосовое. ${reply}`;
  setTimeout(() => {
    pool.query('INSERT INTO chat_messages (order_id, sender, text) VALUES ($1,$2,$3)', [o.id, 'vet', reply]).catch(() => {});
  }, 3000 + Math.random() * 2000);
}

export default router;
