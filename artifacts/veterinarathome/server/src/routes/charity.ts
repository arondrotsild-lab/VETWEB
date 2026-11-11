import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';

// Благотворительность: подопечные животные, пожертвования и «карма» дарителя.
// Деньги не списываются — это демонстрация сценария; пожертвования сохраняются в базе.

export async function initCharity() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS charity_cases (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(40) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      species VARCHAR(50), age VARCHAR(40), city VARCHAR(100),
      photo_url TEXT, problem TEXT, story TEXT, needs TEXT,
      goal INTEGER NOT NULL, base_raised INTEGER DEFAULT 0, urgent BOOLEAN DEFAULT false,
      sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES charity_cases(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  const cases = [
    ['tisha', 'Тиша', 'Кошка', '≈ 2 года', 'Москва', '/charity/tisha.jpg', 'Перелом задней лапы',
      'Тишу нашли зимой у подъезда — она не могла наступать на лапу и пряталась под машинами. Сейчас она на передержке, ест с рук и мурчит, но без операции лапа срастётся неправильно.',
      'Операция с установкой пластины, рентген, 3 недели реабилитации', 38000, 21400, true, 1],
    ['graf', 'Граф', 'Собака, самоед', '6 лет', 'Подмосковье', '/charity/graf.jpg', 'Дисплазия тазобедренных суставов',
      'Графа отказались держать после переезда хозяев. Он очень добрый и терпеливый, но каждый шаг даётся ему с болью. После операции он сможет снова бегать.',
      'Операция на суставе, обезболивание, курс физиотерапии', 85000, 52300, true, 2],
    ['laska', 'Ласка', 'Собака, джек-рассел', '3 года', 'Санкт-Петербург', '/charity/laska.jpg', 'Последствия ДТП',
      'Ласку сбила машина на трассе. Волонтёры успели вовремя: ей сделали первую операцию, но впереди восстановление и повторный осмотр у невролога.',
      'Реабилитация, консультация невролога, лекарства на 2 месяца', 24000, 9800, false, 3],
    ['bublik', 'Бублик', 'Котёнок', '2 месяца', 'Казань', '/charity/bublik.jpg', 'Тяжёлая инфекция глаз',
      'Бублика нашли в коробке у рынка вместе с братьями. Он самый маленький и слабый — глазки воспалены, без лечения может ослепнуть.',
      'Капли и антибиотики, 2 осмотра офтальмолога, первые прививки', 6500, 4100, false, 4],
    ['ryzhik', 'Рыжик', 'Собака, бигль', '4 года', 'Екатеринбург', '/charity/ryzhik.jpg', 'Кожное заболевание, истощение',
      'Рыжика забрали у недобросовестного заводчика: он жил в тесном вольере и почти не видел людей. Сейчас он учится доверять и ищет семью.',
      'Лечение дерматита, анализы, стерилизация и вакцинация перед пристройством', 18000, 6200, false, 5],
    ['snezhok', 'Снежок', 'Кошка', '12 лет', 'Москва', '/charity/snezhok.jpg', 'Хроническая болезнь почек',
      'Снежок прожила всю жизнь с пожилой хозяйкой и осталась одна. Она глухая и очень нежная. Ей нужна постоянная поддержка, чтобы спокойно прожить старость.',
      'Лечебный корм и капельницы на 3 месяца, анализы крови', 12000, 3500, false, 6],
  ];
  for (const c of cases) {
    await pool.query(
      `INSERT INTO charity_cases (slug, name, species, age, city, photo_url, problem, story, needs, goal, base_raised, urgent, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (slug) DO NOTHING`, c);
  }
}

const THANKS = [
  'Спасибо за ваше доброе сердце! Пусть добро, которое вы отдали, вернётся к вам вдвойне.',
  'Вы только что стали чьим-то героем. Пусть в вашем доме всегда царят тепло, радость и уют!',
  'Благодарим за поддержку! Пусть все ваши близкие — и люди, и хвостатые — будут здоровы.',
  'Каждый рубль — это шаг к выздоровлению. Спасибо, что вы рядом! Пусть удача сопровождает вас во всём.',
  'Мур-спасибо от всех подопечных! Пусть ваши питомцы никогда не болеют и живут долго и счастливо.',
  'Вы сделали этот день лучше для того, кто не может сказать «спасибо» словами. Мы скажем за него: спасибо!',
  'Ваша доброта лечит. Пусть жизнь отвечает вам тем же — здоровьем, радостью и светлыми днями.',
  'Гав-благодарность! Пусть каждое утро начинается с улыбки, а вечер — с тёплых объятий близких.',
  'Спасибо, что не прошли мимо. Пусть в вашей жизни будет как можно меньше тревог и как можно больше счастья.',
  'Вы — причина, по которой кто-то снова будет бегать и играть. Желаем вам крепкого здоровья и гармонии!',
  'Благодарим от всего сердца! Пусть всё, что вы задумали, сбудется легко и вовремя.',
  'Где-то сейчас стало на одну больную лапку меньше. Спасибо! Пусть добро всегда находит дорогу к вашему дому.',
  'Ваш вклад — это забота, которую почувствуют. Пусть никто из ваших родных никогда не болеет!',
  'Спасибо, что дарите надежду! Пусть ваш дом будет полон смеха, любви и мурлыканья.',
  'Мир становится добрее благодаря таким людям, как вы. Пусть радость и здоровье будут вашими постоянными спутниками!',
];

function optionalUserId(req: Request): number | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) return null;
  try { return (jwt.verify(h.slice(7), secret) as { id: number }).id; } catch { return null; }
}

const router = Router();

// GET /api/charity — подопечные и собранные суммы
router.get('/', async (req: Request, res: Response) => {
  const uid = optionalUserId(req);
  const rows = await pool.query(`
    SELECT c.*, c.base_raised + COALESCE(SUM(d.amount),0)::int AS raised,
      (12 + COUNT(d.id))::int AS donors
    FROM charity_cases c LEFT JOIN donations d ON d.case_id = c.id
    GROUP BY c.id ORDER BY c.sort`);
  const karma = uid
    ? (await pool.query('SELECT COALESCE(SUM(amount),0)::int AS s FROM donations WHERE user_id = $1', [uid])).rows[0].s / 10
    : null;
  res.json({ cases: rows.rows, myKarma: karma });
});

// POST /api/charity/:id/donate — { amount }
router.post('/:id/donate', async (req: Request, res: Response) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!Number.isFinite(amount) || amount < 50 || amount > 1_000_000) {
    res.status(400).json({ error: 'Сумма от 50 до 1 000 000 ₽' });
    return;
  }
  const c = await pool.query('SELECT id, name FROM charity_cases WHERE id = $1', [req.params.id]);
  if (!c.rows[0]) { res.status(404).json({ error: 'Подопечный не найден' }); return; }
  const uid = optionalUserId(req);
  await pool.query('INSERT INTO donations (case_id, user_id, amount) VALUES ($1,$2,$3)', [c.rows[0].id, uid, amount]);
  const karmaTotal = uid
    ? (await pool.query('SELECT COALESCE(SUM(amount),0)::int AS s FROM donations WHERE user_id = $1', [uid])).rows[0].s / 10
    : null;
  res.json({
    thanks: THANKS[Math.floor(Math.random() * THANKS.length)],
    karma: Math.max(1, Math.round(amount / 10)),
    karmaTotal,
    name: c.rows[0].name,
  });
});

export default router;
