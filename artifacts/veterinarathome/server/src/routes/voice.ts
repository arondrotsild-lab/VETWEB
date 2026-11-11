import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { MEDIA_DIR } from './chat';
import { transcribeFile } from '../transcribe';

// POST /api/voice — сохранить голосовую запись и расшифровать её. Используется при вызове врача.
const AUDIO_EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac' };
const router = Router();
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const m = /^data:(audio\/[a-z0-9.+-]+)(;[^,]*)?;base64,(.+)$/i.exec(String(req.body?.audio || ''));
  if (!m) { res.status(400).json({ error: 'Нет аудио' }); return; }
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length < 500 || buf.length > 6_000_000) { res.status(400).json({ error: 'Слишком короткая или длинная запись' }); return; }
  const dir = path.join(MEDIA_DIR, 'voice');
  fs.mkdirSync(dir, { recursive: true });
  const file = `${crypto.randomUUID()}.${AUDIO_EXT[m[1].toLowerCase()] ?? 'webm'}`;
  const full = path.join(dir, file);
  fs.writeFileSync(full, buf);
  const transcript = await transcribeFile(full);
  res.json({ audio_url: `/api/media/voice/${file}`, transcript });
});
export default router;
