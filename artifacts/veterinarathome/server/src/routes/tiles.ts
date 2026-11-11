import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Прокси для квадратов карты: браузер грузит карту с нашего сервера (не блокируется
// блокировщиками рекламы), а скачанные квадраты кэшируются на диске для быстрого показа.
const CACHE_DIR = path.resolve(__dirname, '../../tile-cache');
const router = Router();

router.get('/:z/:x/:y.png', async (req: Request, res: Response) => {
  const z = Number(req.params.z), x = Number(req.params.x), y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 19 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    res.status(400).end();
    return;
  }
  const file = path.join(CACHE_DIR, String(z), String(x), `${y}.png`);
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.type('png');
  if (fs.existsSync(file)) {
    res.sendFile(file);
    return;
  }
  try {
    // OpenStreetMap: подробная карта с русскими названиями улиц и метро
    const r = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: { 'User-Agent': 'VetDom-demo/1.0 (local demo map)' },
    });
    if (!r.ok) { res.status(502).end(); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    res.send(buf);
  } catch {
    res.status(502).end();
  }
});

export default router;
