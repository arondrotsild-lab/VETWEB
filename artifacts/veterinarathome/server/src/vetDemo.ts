import bcrypt from 'bcryptjs';
import pool from './db';
import { tierFor } from './routes/vetCabinet';

// ═══════════════════════════════════════════════════════════════════
//  Демо-данные для кабинета ветеринара: команда врачей, история
//  визитов за полгода, расходы, смены, выплаты, новости.
//  Всё создаётся один раз; повторный запуск сервера ничего не ломает.
// ═══════════════════════════════════════════════════════════════════

export const DEMO_VET_PHONE = '+79990000101';
export const DEMO_VET_PASSWORD = 'vetdemo1234';

// Профили «поведения» врачей: сколько визитов, как часто клиенты возвращаются, как быстро принимают заказ
const TEAM = [
  { phone: '+79990000101', total: 128,  ret: 0.45, speed: 3.2, five: 0.93 },  // Анна Соколова — демо-врач
  { phone: '+79990000102', total: 196, ret: 0.33, speed: 5.0, five: 0.92 },
  { phone: '+79990000103', total: 72,  ret: 0.52, speed: 4.1, five: 0.88 },
  { phone: '+79990000104', total: 188, ret: 0.30, speed: 2.1, five: 0.96 },
  { phone: '+79990000105', total: 150, ret: 0.55, speed: 6.0, five: 0.92, name: 'Елена Воронцова', spec: 'Кардиолог, терапевт', exp: 11, photo: 'https://randomuser.me/api/portraits/women/65.jpg', bio: 'Кардиология мелких домашних животных, ЭКГ и наблюдение возрастных пациентов на дому.' },
  { phone: '+79990000106', total: 40,  ret: 0.25, speed: 4.6, five: 0.85, name: 'Артём Лебедев', spec: 'Экзотические животные', exp: 5, photo: 'https://randomuser.me/api/portraits/men/41.jpg', bio: 'Птицы, рептилии, грызуны и кролики. Знаю, как не напугать маленьких пациентов.' },
  { phone: '+79990000107', total: 92,  ret: 0.40, speed: 7.1, five: 0.90, name: 'Ольга Николаева', spec: 'Офтальмолог', exp: 8, photo: 'https://randomuser.me/api/portraits/women/12.jpg', bio: 'Диагностика и лечение болезней глаз, осмотр с портативной щелевой лампой.' },
  { phone: '+79990000108', total: 170, ret: 0.38, speed: 5.4, five: 0.90, name: 'Сергей Миронов', spec: 'Ортопед-травматолог', exp: 14, photo: 'https://randomuser.me/api/portraits/men/52.jpg', bio: 'Травмы, хромота, реабилитация после операций. Работаю с крупными собаками.' },
  { phone: '+79990000109', total: 118,  ret: 0.48, speed: 3.0, five: 0.94, name: 'Наталья Фёдорова', spec: 'Терапевт, УЗИ-диагностика', exp: 7, photo: 'https://randomuser.me/api/portraits/women/29.jpg', bio: 'Выездное УЗИ и терапия. Помогаю поставить диагноз без поездки в клинику.' },
  { phone: '+79990000110', total: 26,  ret: 0.20, speed: 8.2, five: 0.82, name: 'Павел Зайцев', spec: 'Хирург', exp: 4, photo: 'https://randomuser.me/api/portraits/men/18.jpg', bio: 'Малые хирургические вмешательства, обработка ран, снятие швов.' },
  { phone: '+79990000111', total: 58,  ret: 0.60, speed: 3.1, five: 0.95, name: 'Ксения Романова', spec: 'Дерматолог, груминг', exp: 3, photo: 'https://randomuser.me/api/portraits/women/90.jpg', bio: 'Кожа, шерсть, аллергии. Бережный уход для пугливых питомцев.' },
  { phone: '+79990000112', total: 132, ret: 0.28, speed: 2.6, five: 0.89, name: 'Тимур Хабибуллин', spec: 'Скорая помощь, реаниматолог', exp: 10, photo: 'https://randomuser.me/api/portraits/men/60.jpg', bio: 'Экстренные выезды круглосуточно: отравления, травмы, тепловой удар.' },
];

const CLIENT_NAMES = [
  'Екатерина Белова', 'Игорь Котов', 'Светлана Павлова', 'Алексей Громов', 'Юлия Ершова', 'Максим Соловьёв',
  'Ирина Ковалёва', 'Роман Тихонов', 'Анастасия Мельникова', 'Денис Абрамов', 'Виктория Зуева', 'Кирилл Фомин',
  'Полина Голубева', 'Олег Кудрявцев', 'Марина Сергеева', 'Андрей Ильин', 'Дарья Комарова', 'Никита Борисов',
  'Елизавета Гусева', 'Владимир Чернов', 'Алина Кузьмина', 'Георгий Титов', 'Татьяна Осипова', 'Михаил Широков',
  'Вероника Шестакова', 'Илья Медведев', 'Людмила Карпова', 'Евгений Насонов', 'София Логинова', 'Артур Галиев',
  'Ксения Миронова', 'Станислав Рябов', 'Валерия Кравец', 'Глеб Савельев', 'Надежда Фролова', 'Руслан Ахметов',
  'Кристина Панова', 'Фёдор Лукин', 'Оксана Дьякова', 'Тимофей Егоров',
];
const PET_POOL: [string, string, string, number, number][] = [
  ['Рыжик', 'Кошка', 'Мейн-кун', 3, 6.8], ['Бадди', 'Собака', 'Лабрадор', 5, 31], ['Соня', 'Кошка', 'Шотландская вислоухая', 2, 3.9],
  ['Граф', 'Собака', 'Немецкая овчарка', 7, 36], ['Луна', 'Кошка', 'Сфинкс', 4, 3.4], ['Чарли', 'Собака', 'Бигль', 3, 12.5],
  ['Кеша', 'Птица', 'Волнистый попугай', 2, 0.04], ['Тоша', 'Собака', 'Той-терьер', 6, 2.1], ['Пушок', 'Кролик', 'Карликовый баран', 1, 1.8],
  ['Марта', 'Собака', 'Корги', 4, 11.2], ['Боня', 'Кошка', 'Беспородная', 9, 5.1], ['Арчи', 'Собака', 'Джек-рассел-терьер', 2, 7.4],
  ['Симба', 'Кошка', 'Абиссинская', 5, 4.2], ['Лайма', 'Собака', 'Хаски', 3, 22], ['Гоша', 'Черепаха', 'Красноухая', 8, 0.9],
  ['Ричи', 'Собака', 'Шпиц', 4, 3.2], ['Мурка', 'Кошка', 'Британская', 11, 5.6], ['Зевс', 'Собака', 'Доберман', 6, 34],
  ['Шерлок', 'Морская свинка', 'Абиссинская', 2, 1.1], ['Ника', 'Кошка', 'Невская маскарадная', 3, 4.7],
];
const ADDRESSES = [
  'Москва, ул. Тверская, 18, кв. 42', 'Москва, Ленинский проспект, 64, кв. 117', 'Москва, ул. Профсоюзная, 23, кв. 8',
  'Москва, Мичуринский проспект, 31, кв. 210', 'Москва, ул. Покровка, 11, кв. 5', 'Москва, Кутузовский проспект, 41, кв. 76',
  'Москва, ул. Большая Дорогомиловская, 9, кв. 30', 'Москва, Пресненская наб., 8, кв. 1503', 'Москва, ул. Арбат, 35, кв. 19',
  'Москва, ул. Новый Арбат, 26, кв. 88', 'Москва, Фрунзенская наб., 46, кв. 14', 'Москва, ул. Мосфильмовская, 70, кв. 233',
  'Москва, проспект Мира, 102, кв. 61', 'Москва, ул. Сретенка, 24, кв. 7', 'Москва, ул. Остоженка, 12, кв. 3',
];
const SERVICES_WEIGHTED: [string, number][] = [
  ['Первичный осмотр', 26], ['Вакцинация', 18], ['Консультация', 10], ['Забор анализов', 10], ['Обработка от паразитов', 8],
  ['Скорая ветпомощь', 7], ['Капельница на дому', 7], ['Уход и груминг', 5], ['Хирургическая помощь', 4], ['Кастрация', 3], ['Стерилизация', 2],
];
const REVIEWS_5 = [
  'Очень внимательный врач, всё объяснил и успокоил нас. Спасибо!', 'Приехали быстро, кот даже не испугался. Рекомендую!',
  'Профессионал своего дела. Будем обращаться только к вам.', 'Сделали прививку дома без стресса — это бесценно.',
  'Подробно рассказали про питание и уход, оставили рекомендации в медкарте.', 'Спасли нашего пса ночью. Огромная благодарность!',
  'Очень бережно обращались с нашей пожилой кошкой.', 'Всё чётко, вовремя, с заботой. Пять звёзд!',
];
const REVIEWS_4 = [
  'Хороший врач, но немного опоздал из-за пробок.', 'Всё хорошо, хотелось бы чуть подробнее про лечение.', 'Нормально, помогли, спасибо.',
];
const CONCLUSIONS = [
  'Общее состояние удовлетворительное. Рекомендовано: контроль аппетита, повторный осмотр через 14 дней.',
  'Вакцинация проведена, реакции нет. Следующая ревакцинация через 12 месяцев.',
  'Взяты анализы крови (ОАК, биохимия). Результаты — через 2 дня в медкарте.',
  'Обработка от эктопаразитов выполнена. Повторить через 30 дней.',
  'Назначена диета и курс пробиотиков на 10 дней. Связь в чате.',
  'Проведена инфузионная терапия, состояние стабилизировано. Наблюдение 24 часа.',
];
const CONCERNS = [
  'Кот третий день плохо ест и много спит', 'Плановая вакцинация, нужна запись в ветпаспорт', 'Собака хромает на заднюю лапу после прогулки',
  'Рвота два раза за утро, пьёт воду', 'Чешется и расчёсывает уши', 'Нужно взять анализы перед операцией',
  'Порезал лапу на прогулке, кровит', 'Пожилая кошка, нужен осмотр и консультация по питанию',
];

// Детерминированный генератор случайных чисел — одинаковые демо-данные при каждом пересоздании
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export async function seedVetCabinet() {
  try {
    await seedNews();
    const done = await pool.query(`SELECT 1 FROM users WHERE phone = '+79990001001'`);
    if (done.rows[0]) { await ensureIncoming(3); return; }

    const R = rng(20261111);
    const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
    const hash = await bcrypt.hash(DEMO_VET_PASSWORD, 10);

    // 1. Команда врачей
    const vetIds: number[] = [];
    for (const t of TEAM) {
      let u = await pool.query('SELECT id FROM users WHERE phone = $1', [t.phone]);
      if (!u.rows[0] && t.name) {
        u = await pool.query(`INSERT INTO users (name, phone, password_hash, role) VALUES ($1,$2,$3,'vet') RETURNING id`, [t.name, t.phone, hash]);
      }
      if (!u.rows[0]) { vetIds.push(0); continue; }
      let v = await pool.query('SELECT id FROM vets WHERE user_id = $1', [u.rows[0].id]);
      if (!v.rows[0]) {
        v = await pool.query(
          `INSERT INTO vets (user_id, specialization, experience_years, bio, photo_url, is_available, is_verified, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,true,55.75,37.62) RETURNING id`,
          [u.rows[0].id, t.spec, t.exp, t.bio, t.photo, R() > 0.4]);
      }
      vetIds.push(v.rows[0].id);
    }
    await pool.query(`UPDATE vets SET city = 'Москва' WHERE city IS NULL`);
    await pool.query(
      `UPDATE vets SET district = 'ЗАО, ЦАО, Хамовники', education = 'МГАВМиБ им. К. И. Скрябина, 2016 · Курсы по кардиологии и УЗИ',
         transport = 'Собственный автомобиль', daily_goal = 5, photo_url = '/demo-vet-anna.jpg', is_available = false
       WHERE user_id = (SELECT id FROM users WHERE phone = $1)`, [DEMO_VET_PHONE]);

    // 2. Клиенты и питомцы
    const clientHash = await bcrypt.hash('clientdemo1234', 10);
    const clients: { id: number; pet: number }[] = [];
    for (let i = 0; i < CLIENT_NAMES.length; i++) {
      const phone = `+7999000${String(1001 + i)}`;
      const u = await pool.query(
        `INSERT INTO users (name, phone, password_hash, role, created_at) VALUES ($1,$2,$3,'client', NOW() - INTERVAL '200 days') RETURNING id`,
        [CLIENT_NAMES[i], phone, clientHash]);
      const p = PET_POOL[i % PET_POOL.length];
      const pet = await pool.query(
        `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, current_concern) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [u.rows[0].id, p[0], p[1], p[2], p[3], p[4], pick(CONCERNS)]);
      clients.push({ id: u.rows[0].id, pet: pet.rows[0].id });
    }

    const svcRows = (await pool.query('SELECT id, name, price_from, price_to, duration_minutes FROM services')).rows;
    const svcByName = Object.fromEntries(svcRows.map((s) => [s.name, s]));
    const totalW = SERVICES_WEIGHTED.reduce((a, [, w]) => a + w, 0);
    const pickService = () => {
      let x = R() * totalW;
      for (const [n, w] of SERVICES_WEIGHTED) { x -= w; if (x <= 0) return svcByName[n]; }
      return svcByName['Первичный осмотр'];
    };

    // 3. История визитов
    const now = Date.now();
    const H = 3600_000;
    for (let vi = 0; vi < TEAM.length; vi++) {
      const t = TEAM[vi];
      const vetId = vetIds[vi];
      if (!vetId) continue;
      const served: number[] = [];
      const items: { at: number; c: { id: number; pet: number }; s: typeof svcRows[0] }[] = [];
      for (let k = 0; k < t.total; k++) {
        // Ближе к сегодняшнему дню визитов больше — врач набирает обороты
        let at = now - Math.floor(180 * Math.pow(R(), 1.8)) * 86400_000;
        const d = new Date(at); d.setHours(8 + Math.floor(R() * 14), Math.floor(R() * 60), 0, 0); at = d.getTime();
        if (vi === 0 && k < 2) at = now - (k === 0 ? 1.6 : 4.2) * H;          // у Анны два визита уже сегодня
        if (at > now - H) at = now - (1 + R() * 3) * 86400_000;
        const useRegular = served.length > 0 && R() < t.ret;
        const regularId = useRegular ? pick(served) : -1;
        const c = useRegular ? clients.find((x) => x.id === regularId)! : pick(clients);
        if (!served.includes(c.id)) served.push(c.id);
        items.push({ at, c, s: pickService() });
      }
      items.sort((a, b) => a.at - b.at);

      const values: unknown[] = [];
      const rowsSql: string[] = [];
      const shifts = new Map<string, [number, number]>();
      let cum = 0;
      for (const it of items) {
        const price = it.s.price_from + Math.round((R() * (it.s.price_to - it.s.price_from)) / 100) * 100;
        const created = it.at - (0.5 + R() * 3) * H;
        const accepted = created + Math.max(0.6, t.speed * (0.4 + R() * 1.2)) * 60_000;
        const completed = it.at + it.s.duration_minutes * 60_000;
        const rated = R() < 0.85;
        const r5 = R() < t.five;
        const rating = rated ? (r5 ? 5 : R() < 0.8 ? 4 : 3) : null;
        const review = rated && R() < 0.45 ? (rating === 5 ? pick(REVIEWS_5) : pick(REVIEWS_4)) : null;
        const percent = tierFor(cum, 4.95).percent;
        cum++;
        const n = values.length;
        rowsSql.push(`($${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},$${n + 6},'completed',$${n + 7},$${n + 8},$${n + 9},$${n + 10},$${n + 11},$${n + 12},$${n + 13},$${n + 14},$${n + 15})`);
        values.push(it.c.id, vetId, it.c.pet, it.s.id, pick(ADDRESSES), new Date(it.at).toISOString(), price,
          new Date(created).toISOString(), new Date(completed).toISOString(), new Date(accepted).toISOString(),
          new Date(completed).toISOString(), percent, Math.round(price * percent / 100), rating, review);
        // conclusion добавим отдельно — чтобы не раздувать VALUES
        const day = new Date(it.at).toDateString();
        const sh = shifts.get(day);
        shifts.set(day, sh ? [Math.min(sh[0], it.at - H), Math.max(sh[1], completed + 0.5 * H)] : [it.at - H, completed + 0.5 * H]);
      }
      for (let i = 0; i < rowsSql.length; i += 150) {
        const chunk = rowsSql.slice(i, i + 150);
        const offset = i * 15;
        const vals = values.slice(offset, offset + chunk.length * 15);
        const renum = chunk.map((row, j) => row.replace(/\$(\d+)/g, (_m, d) => `$${Number(d) - offset}`));
        await pool.query(
          `INSERT INTO orders (client_id, vet_id, pet_id, service_id, address, scheduled_at, status, total_price, created_at, updated_at,
             accepted_at, completed_at, vet_percent, vet_payout, client_rating, client_review) VALUES ${renum.join(',')}`, vals);
      }
      await pool.query(
        `UPDATE orders SET vet_conclusion = (ARRAY[${CONCLUSIONS.map((_, i) => `$${i + 2}`).join(',')}])[1 + (id % ${CONCLUSIONS.length})]
         WHERE vet_id = $1 AND vet_conclusion IS NULL AND status = 'completed'`, [vetId, ...CONCLUSIONS]);

      // Смены (часы на линии)
      for (const [, [a, b]] of shifts) {
        await pool.query('INSERT INTO vet_shifts (vet_id, started_at, ended_at) VALUES ($1,$2,$3)',
          [vetId, new Date(a).toISOString(), new Date(Math.min(b, now - 10 * 60_000)).toISOString()]);
      }

      // Выплаты: каждую неделю выводим заработанное, последние 8 дней — на балансе
      const weekly = new Map<number, number>();
      for (let i = 0; i < items.length; i++) {
        if (items[i].at > now - 8 * 86400_000) continue;
        const wk = Math.floor(items[i].at / (7 * 86400_000));
        weekly.set(wk, (weekly.get(wk) ?? 0) + (values[i * 15 + 12] as number));
      }
      for (const [wk, amount] of weekly) {
        const at = Math.min((wk + 1) * 7 * 86400_000 + 10 * H, now - 8 * 86400_000);
        await pool.query(`INSERT INTO vet_payouts (vet_id, amount, status, created_at) VALUES ($1,$2,'paid',$3)`, [vetId, amount, new Date(at).toISOString()]);
      }

      // Расходы: бензин каждую неделю, материалы и препараты, обучение, связь
      for (let w = 0; w < 26; w++) {
        const base = now - w * 7 * 86400_000 - Math.floor(R() * 6) * 86400_000;
        if (base > now) continue;
        const ins = (cat: string, amt: number, note: string, at: number) =>
          pool.query('INSERT INTO vet_expenses (vet_id, category, amount, note, spent_at) VALUES ($1,$2,$3,$4,$5)',
            [vetId, cat, Math.round(amt / 10) * 10, note, new Date(Math.min(at, now - H)).toISOString()]);
        await ins('fuel', 700 + R() * 700, pick(['АЗС Лукойл', 'АЗС Газпромнефть', 'Яндекс Такси', 'АЗС Роснефть']), base);
        if (R() < 0.45) await ins('materials', 400 + R() * 800, pick(['Шприцы, бинты, перчатки', 'Катетеры и системы', 'Антисептики']), base - 2 * H);
        if (R() < 0.25) await ins('drugs', 800 + R() * 1200, pick(['Вакцины (Нобивак)', 'Антибиотики', 'Противопаразитарные']), base - 5 * H);
        if (w % 4 === 0) await ins('phone', 650, 'Мобильная связь и интернет', base - 24 * H);
        if (w % 9 === 3) await ins('education', 2500 + R() * 2500, pick(['Вебинар по кардиологии', 'Курс «УЗИ в практике»', 'Конференция ветврачей']), base - 30 * H);
      }
    }

    // 4. Синхронизируем рейтинг на сайте для клиентов с реальными оценками
    await pool.query(
      `UPDATE vets v SET rating = s.r, reviews_count = s.n FROM (
         SELECT vet_id, ROUND(AVG(client_rating), 2) r, COUNT(client_rating) n FROM orders WHERE client_rating IS NOT NULL GROUP BY vet_id) s
       WHERE s.vet_id = v.id`);
    // Старые завершённые визиты демо-клиента — тоже с выплатой врачу
    await pool.query(
      `UPDATE orders SET vet_percent = 55, vet_payout = ROUND((total_price + COALESCE(bonus_used, 0)) * 0.55),
         accepted_at = created_at + INTERVAL '4 minutes', completed_at = scheduled_at + INTERVAL '1 hour'
       WHERE status = 'completed' AND vet_id IS NOT NULL AND vet_payout IS NULL`);

    await ensureIncoming(3);
    console.log('✅ Демо-данные кабинета ветеринара созданы');
  } catch (err) {
    console.error('Ошибка демо-данных кабинета ветеринара:', err);
  }
}

// Держим в ленте хотя бы N свежих заказов, чтобы врачу было что принять на показе
export async function ensureIncoming(min: number) {
  const r = await pool.query(`SELECT COUNT(*)::int n FROM orders WHERE status = 'pending' AND vet_id IS NULL AND created_at >= NOW() - INTERVAL '2 days'`);
  for (let i = r.rows[0].n; i < min; i++) await createIncomingOrder(i * 7 + 3);
}

let counter = 0;
export async function createIncomingOrder(minutesAgo = 0) {
  counter++;
  const c = await pool.query(
    `SELECT u.id, p.id AS pet FROM users u JOIN pets p ON p.owner_id = u.id
     WHERE u.phone LIKE '+79990001%' ORDER BY random() LIMIT 1`);
  if (!c.rows[0]) throw new Error('Нет демо-клиентов');
  const svcName = ['Первичный осмотр', 'Вакцинация', 'Скорая ветпомощь', 'Капельница на дому', 'Забор анализов', 'Консультация'][counter % 6];
  const s = (await pool.query('SELECT id, price_from, price_to FROM services WHERE name = $1', [svcName])).rows[0];
  const price = s.price_from + Math.round((Math.random() * (s.price_to - s.price_from)) / 100) * 100;
  const concern = CONCERNS[Math.floor(Math.random() * CONCERNS.length)];
  const urgent = svcName === 'Скорая ветпомощь';
  const r = await pool.query(
    `INSERT INTO orders (client_id, pet_id, service_id, address, address_lat, address_lng, scheduled_at, status, notes, total_price, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, NOW() + ($7 || ' minutes')::interval, 'pending', $8, $9, NOW() - ($10 || ' minutes')::interval, NOW()) RETURNING id`,
    [c.rows[0].id, c.rows[0].pet, s.id, ADDRESSES[Math.floor(Math.random() * ADDRESSES.length)],
     55.70 + Math.random() * 0.1, 37.53 + Math.random() * 0.15, urgent ? 30 : 60 + Math.floor(Math.random() * 120), concern, price, minutesAgo]);
  await pool.query(`INSERT INTO order_status_history (order_id, status, comment) VALUES ($1, 'pending', 'Заказ создан, ищем ветеринара')`, [r.rows[0].id]);
  return r.rows[0].id as number;
}

// Новости для врачей: мир ветеринарии, наука, платформа, обучение
async function seedNews() {
  const has = await pool.query('SELECT 1 FROM vet_news LIMIT 1');
  if (has.rows[0]) return;
  const D = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();
  const news: [string, string, string, string, string | null, number, boolean][] = [
    ['platform', 'Новые уровни для врачей: до 70% от каждого визита',
      'Мы обновили систему уровней. Теперь врачи уровня «Платина» получают 70% стоимости визита.',
      'Уровень зависит от числа выполненных визитов и средней оценки клиентов. Бронза — 55%, Серебро — 60%, Золото — 65%, Платина — 70%. Уровень пересчитывается автоматически после каждого визита, а новый процент начинает действовать со следующего заказа.',
      null, 0, true],
    ['platform', 'Лига ветеринаров: сезон ноября стартовал',
      'Тройка лидеров месяца получит денежные бонусы, а лучший врач — статус «Врач месяца» на сайте для клиентов.',
      'Место в лиге считается по четырём показателям: число визитов за 30 дней, средняя оценка, доля клиентов, которые возвращаются, и скорость принятия заказа. Таблица обновляется в реальном времени.',
      null, 1, false],
    ['science', 'Выездная ветеринария растёт быстрее клиник',
      'Владельцы животных всё чаще выбирают помощь на дому: меньше стресса для питомца и экономия времени.',
      'По наблюдениям участников рынка, спрос на выездные услуги стабильно растёт, особенно среди владельцев пожилых животных, кошек и экзотических питомцев. Главные запросы — вакцинация, осмотр и забор анализов дома.',
      null, 2, false],
    ['science', 'Стресс от поездки в клинику искажает результаты анализов у кошек',
      'Повышение глюкозы и лейкоцитов из-за стресса — частая причина повторных исследований.',
      'Стрессовая гипергликемия у кошек хорошо описана в ветеринарной литературе. Забор крови в привычной обстановке дома помогает получить более точную картину и избежать лишних назначений.',
      null, 3, false],
    ['education', 'Бесплатный вебинар: неотложная помощь при тепловом ударе',
      'Разберём алгоритм действий на выезде, препараты и типичные ошибки. Для всех врачей платформы.',
      'Вебинар проведёт Игорь Белов, реаниматолог платформы. После эфира — запись и чек-лист в разделе «Обучение». Участие засчитывается в достижения.',
      null, 4, false],
    ['world', 'Антибиотикорезистентность: врачам рекомендуют назначать антибиотики точнее',
      'Профессиональные сообщества ветеринаров по всему миру призывают назначать антибиотики только по показаниям.',
      'Подход «Единое здоровье» (One Health) связывает здоровье людей, животных и окружающей среды. Ветеринарам рекомендуют по возможности опираться на посев и чувствительность, а также подробно объяснять владельцам схему приёма.',
      null, 6, false],
    ['platform', 'В карточке заказа теперь видна ИИ-оценка симптомов',
      'Если клиент описал проблему голосом, вы увидите расшифровку и предварительную оценку срочности ещё до выезда.',
      'Это помогает взять с собой нужные препараты и инструменты. Оценка не заменяет осмотр: окончательное решение всегда за врачом.',
      null, 7, false],
    ['world', 'Портативное УЗИ становится стандартом выездной практики',
      'Компактные УЗИ-сканеры, которые подключаются к планшету, всё чаще используют на выездах.',
      'Портативная диагностика позволяет быстро исключить свободную жидкость, оценить мочевой пузырь и беременность прямо у клиента дома. Платформа рассматривает программу аренды оборудования для врачей уровня «Золото» и выше.',
      null, 9, false],
    ['education', 'Чек-лист выездной сумки ветеринара',
      'Что обязательно взять с собой на вызов: от стетоскопа до противошоковой аптечки.',
      'Обновлённый чек-лист составлен врачами платформы с самыми высокими оценками. Его можно распечатать или сохранить в телефоне.',
      null, 12, false],
  ];
  for (const [category, title, summary, body, image, days, pinned] of news) {
    await pool.query('INSERT INTO vet_news (category, title, summary, body, image_url, source, published_at, pinned) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [category, title, summary, body, image, category === 'platform' ? 'ВетДом' : category === 'education' ? 'Академия ВетДом' : 'Обзор отрасли', D(days), pinned]);
  }
}
