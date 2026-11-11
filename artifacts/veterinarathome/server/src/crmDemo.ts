import bcrypt from 'bcryptjs';
import pool from './db';
import { tierFor } from './routes/vetCabinet';
import { PRODUCTS } from './shopCatalog';

// ═══════════════════════════════════════════════════════════════════
//  Данные CRM: компания за год выросла с ~3 до ~11 млн ₽ выручки в месяц.
//  Новые врачи, клиенты с питомцами, заказы, покупки в магазине,
//  расходы компании по статьям, реклама по каналам, счета и операции.
//  Создаётся один раз (app_meta 'crm_demo'); повторный запуск ничего не ломает.
// ═══════════════════════════════════════════════════════════════════

export const ADMIN_PHONE = '+79990000001';
export const ADMIN_PASSWORD = 'vetdomceo2026';

const DAY = 86400_000;
const H = 3600_000;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const R = rng(20261111);
const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
const round = (n: number, step = 100) => Math.round(n / step) * step;

async function meta(key: string) {
  await pool.query('CREATE TABLE IF NOT EXISTS app_meta (key VARCHAR(50) PRIMARY KEY, value TEXT)');
  return (await pool.query('SELECT value FROM app_meta WHERE key = $1', [key])).rows[0]?.value as string | undefined;
}
async function setMeta(key: string, value: string) {
  await pool.query('INSERT INTO app_meta (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
}

// ── Новые врачи: присоединялись в течение года ───────────────────
const NEW_VETS: [string, string, number, string, string][] = [
  ['Дарья Ковальчук', 'Терапевт', 6, 'women/44', 'СВАО, Медведково'],
  ['Михаил Орлов', 'Хирург', 12, 'men/33', 'ЮЗАО, Коньково'],
  ['Алёна Сафина', 'Терапевт, вакцинация', 4, 'women/47', 'САО, Аэропорт'],
  ['Григорий Плотников', 'Ортопед', 9, 'men/71', 'ЗАО, Раменки'],
  ['Виктория Лаптева', 'Дерматолог', 5, 'women/52', 'ЦАО, Таганский'],
  ['Константин Жуков', 'Терапевт, УЗИ', 8, 'men/36', 'ВАО, Измайлово'],
  ['Елизавета Мартынова', 'Кардиолог', 10, 'women/56', 'ЮАО, Нагатино'],
  ['Арсений Гладков', 'Скорая помощь', 7, 'men/45', 'СЗАО, Строгино'],
  ['Полина Демидова', 'Терапевт', 3, 'women/63', 'ЮВАО, Марьино'],
  ['Станислав Носов', 'Анестезиолог, хирург', 13, 'men/77', 'ЦАО, Пресненский'],
  ['Маргарита Белякова', 'Офтальмолог', 9, 'women/68', 'СВАО, Отрадное'],
  ['Денис Кузнецов', 'Терапевт', 5, 'men/22', 'ЮЗАО, Ясенево'],
  ['Ульяна Зиновьева', 'Груминг, дерматология', 4, 'women/71', 'САО, Хорошёво'],
  ['Вадим Ефимов', 'Экзотические животные', 6, 'men/85', 'ЗАО, Солнцево'],
  ['Анжелика Руденко', 'Терапевт, вакцинация', 7, 'women/76', 'ВАО, Перово'],
  ['Лев Голованов', 'Невролог', 11, 'men/90', 'ЦАО, Арбат'],
  ['Карина Мухаметова', 'Терапевт', 3, 'women/81', 'ЮАО, Чертаново'],
  ['Игнат Соболев', 'Хирург', 8, 'men/12', 'СВАО, Бибирево'],
  ['Таисия Воробьёва', 'Эндокринолог', 9, 'women/85', 'ЗАО, Кунцево'],
  ['Ярослав Новиков', 'Скорая помощь', 6, 'men/14', 'ЮВАО, Люблино'],
  ['Милана Аксёнова', 'Терапевт, УЗИ', 5, 'women/88', 'САО, Беговой'],
  ['Борис Кондратьев', 'Онколог', 15, 'men/62', 'ЦАО, Замоскворечье'],
  ['Эльвира Шарипова', 'Стоматолог', 7, 'women/24', 'ВАО, Сокольники'],
  ['Филипп Мельник', 'Терапевт', 4, 'men/28', 'СЗАО, Митино'],
  ['Василиса Тарасова', 'Репродуктолог', 8, 'women/33', 'ЮЗАО, Черёмушки'],
  ['Захар Лебедь', 'Ортопед-травматолог', 10, 'men/48', 'ЗАО, Филёвский парк'],
  ['Яна Дорофеева', 'Терапевт, вакцинация', 2, 'women/38', 'ЮАО, Царицыно'],
  ['Родион Ильясов', 'Скорая помощь, реаниматолог', 9, 'men/55', 'ВАО, Новогиреево'],
  ['Агата Миронова', 'Дерматолог, аллерголог', 6, 'women/42', 'СВАО, Свиблово'],
  ['Всеволод Блинов', 'Хирург', 11, 'men/66', 'ЮЗАО, Тёплый Стан'],
];

const FIRST_F = ['Анна', 'Мария', 'Елена', 'Ольга', 'Наталья', 'Татьяна', 'Ирина', 'Светлана', 'Юлия', 'Екатерина', 'Дарья', 'Алина', 'Ксения', 'Полина',
  'Виктория', 'Анастасия', 'Марина', 'Вера', 'Софья', 'Алёна', 'Кристина', 'Валерия', 'Евгения', 'Людмила', 'Надежда', 'Арина', 'Лилия', 'Милана'];
const FIRST_M = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил', 'Никита', 'Матвей', 'Роман',
  'Егор', 'Арсений', 'Иван', 'Денис', 'Евгений', 'Даниил', 'Тимур', 'Владислав', 'Игорь', 'Павел', 'Руслан', 'Марк', 'Антон', 'Олег', 'Виктор'];
const LAST = [['Иванов', 'Иванова'], ['Смирнов', 'Смирнова'], ['Кузнецов', 'Кузнецова'], ['Попов', 'Попова'], ['Васильев', 'Васильева'],
  ['Петров', 'Петрова'], ['Соколов', 'Соколова'], ['Михайлов', 'Михайлова'], ['Новиков', 'Новикова'], ['Фёдоров', 'Фёдорова'], ['Морозов', 'Морозова'],
  ['Волков', 'Волкова'], ['Алексеев', 'Алексеева'], ['Лебедев', 'Лебедева'], ['Семёнов', 'Семёнова'], ['Егоров', 'Егорова'], ['Павлов', 'Павлова'],
  ['Козлов', 'Козлова'], ['Степанов', 'Степанова'], ['Николаев', 'Николаева'], ['Орлов', 'Орлова'], ['Андреев', 'Андреева'], ['Макаров', 'Макарова'],
  ['Никитин', 'Никитина'], ['Захаров', 'Захарова'], ['Зайцев', 'Зайцева'], ['Соловьёв', 'Соловьёва'], ['Борисов', 'Борисова'], ['Яковлев', 'Яковлева'],
  ['Григорьев', 'Григорьева'], ['Романов', 'Романова'], ['Воробьёв', 'Воробьёва'], ['Сергеев', 'Сергеева'], ['Кузьмин', 'Кузьмина'], ['Фролов', 'Фролова'],
  ['Александров', 'Александрова'], ['Дмитриев', 'Дмитриева'], ['Королёв', 'Королёва'], ['Гусев', 'Гусева'], ['Киселёв', 'Киселёва'], ['Ильин', 'Ильина'],
  ['Максимов', 'Максимова'], ['Поляков', 'Полякова'], ['Сорокин', 'Сорокина'], ['Виноградов', 'Виноградова'], ['Ковалёв', 'Ковалёва'], ['Белов', 'Белова']];

const DOGS = ['Лабрадор', 'Немецкая овчарка', 'Корги', 'Шпиц', 'Джек-рассел-терьер', 'Хаски', 'Йоркширский терьер', 'Чихуахуа', 'Французский бульдог',
  'Мопс', 'Бигль', 'Золотистый ретривер', 'Такса', 'Самоед', 'Той-терьер', 'Мальтипу', 'Акита-ину', 'Доберман', 'Пудель', 'Беспородная'];
const CATS = ['Британская', 'Шотландская вислоухая', 'Мейн-кун', 'Сфинкс', 'Беспородная', 'Бенгальская', 'Абиссинская', 'Рэгдолл', 'Сибирская',
  'Невская маскарадная', 'Русская голубая', 'Ориентальная', 'Персидская', 'Девон-рекс'];
const OTHER: [string, string[]][] = [['Кролик', ['Карликовый баран', 'Декоративный']], ['Птица', ['Волнистый попугай', 'Корелла', 'Жако']],
  ['Морская свинка', ['Абиссинская', 'Гладкошёрстная']], ['Хорёк', ['Домашний']], ['Черепаха', ['Красноухая', 'Среднеазиатская']]];
const DOG_NAMES = ['Бадди', 'Рекс', 'Чарли', 'Арчи', 'Макс', 'Джек', 'Лаки', 'Граф', 'Марс', 'Тайсон', 'Бублик', 'Ричи', 'Оскар', 'Барни', 'Лайма',
  'Белка', 'Джесси', 'Молли', 'Ника', 'Найда', 'Лиза', 'Грета', 'Фрэнки', 'Тоби', 'Персик', 'Бакс', 'Зевс', 'Гера', 'Жужа', 'Каштан'];
const CAT_NAMES = ['Барсик', 'Мурка', 'Симба', 'Луна', 'Соня', 'Пушок', 'Тимоша', 'Кузя', 'Маркиз', 'Василиса', 'Муся', 'Багира', 'Рыжик', 'Снежка',
  'Тиша', 'Феликс', 'Мася', 'Боня', 'Дымка', 'Сёма', 'Ириска', 'Марго', 'Пломбир', 'Ника', 'Лео', 'Оливка', 'Зефир', 'Масяня'];
const OTHER_NAMES = ['Кеша', 'Пушистик', 'Шерлок', 'Гоша', 'Рокки', 'Ушастик', 'Тортилла', 'Шустрик', 'Зефирка', 'Кнопка'];
const STREETS = ['ул. Тверская', 'Ленинский проспект', 'ул. Профсоюзная', 'Мичуринский проспект', 'ул. Покровка', 'Кутузовский проспект',
  'проспект Мира', 'ул. Новый Арбат', 'Варшавское шоссе', 'Ленинградский проспект', 'ул. Вавилова', 'Волгоградский проспект', 'ул. Миклухо-Маклая',
  'Рублёвское шоссе', 'ул. Шаболовка', 'Каширское шоссе', 'ул. Маросейка', 'Дмитровское шоссе', 'ул. Студенческая', 'Хорошёвское шоссе',
  'ул. Бутлерова', 'Пятницкое шоссе', 'Нахимовский проспект', 'ул. Сретенка', 'Севастопольский проспект', 'ул. Лобачевского', 'Щёлковское шоссе'];
const CONCERNS = ['Плановая вакцинация', 'Плохо ест второй день', 'Чешется и выкусывает шерсть', 'Хромает на переднюю лапу', 'Рвота утром',
  'Нужны анализы перед операцией', 'Осмотр после переезда', 'Пожилой питомец, плановый осмотр', 'Обработка от клещей', 'Кашляет по ночам',
  'Слезятся глаза', 'Подстричь когти и почистить уши', 'Снять швы после операции', 'Диарея, вялость', 'Консультация по питанию'];

const SERVICES_W: [string, number][] = [
  ['Первичный осмотр', 24], ['Вакцинация', 16], ['Консультация', 9], ['Забор анализов', 10], ['Обработка от паразитов', 7],
  ['Скорая ветпомощь', 8], ['Капельница на дому', 7], ['Уход и груминг', 5], ['Хирургическая помощь', 4], ['Кастрация', 3],
  ['Стерилизация', 3], ['Передержка', 2], ['Выгул животного', 2],
];
const REVIEWS = ['Очень внимательный врач, всё объяснил.', 'Приехали быстро, питомец не испугался.', 'Спасибо, будем обращаться ещё!',
  'Сделали всё дома без стресса — это бесценно.', 'Профессионально и бережно.', 'Помогли ночью, огромная благодарность.', 'Всё чётко и вовремя.'];

// ── Финансы компании ─────────────────────────────────────────────
const CHANNELS: [string, string, number, number][] = [
  // название, иконка, доля бюджета, «эффективность» (клиентов на рубль относительно среднего)
  ['Яндекс Директ', '🔎', 0.27, 1.05], ['VK Реклама', '💙', 0.15, 0.9], ['Telegram Ads и посевы', '✈️', 0.13, 1.0],
  ['Блогеры о животных', '🎥', 0.14, 0.85], ['SEO и контент', '📝', 0.08, 1.9], ['Яндекс Карты и 2ГИС', '📍', 0.07, 1.6],
  ['Партнёрства с зоомагазинами', '🤝', 0.08, 1.3], ['Наружная реклама', '🪧', 0.05, 0.45], ['Реферальная программа', '🎁', 0.03, 2.6],
];

export async function seedCrm() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS crm_finance (id SERIAL PRIMARY KEY, month DATE NOT NULL, grp VARCHAR(40) NOT NULL, item VARCHAR(80) NOT NULL, amount BIGINT NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS crm_marketing (id SERIAL PRIMARY KEY, month DATE NOT NULL, channel VARCHAR(60) NOT NULL, icon VARCHAR(8),
      spend BIGINT, impressions BIGINT, clicks INT, leads INT, clients INT, revenue BIGINT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS crm_accounts (id SERIAL PRIMARY KEY, name VARCHAR(80), bank VARCHAR(60), kind VARCHAR(30), mask VARCHAR(20), balance BIGINT, color VARCHAR(20), note TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS crm_transactions (id SERIAL PRIMARY KEY, at TIMESTAMP NOT NULL, account_id INT, direction VARCHAR(3), amount BIGINT,
      category VARCHAR(60), counterparty VARCHAR(120), note TEXT)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS orders_client_idx ON orders (client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS orders_vet_idx ON orders (vet_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS shop_orders_user_idx ON shop_orders (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS pets_owner_idx ON pets (owner_id)`);

    // Руководитель компании — вход в CRM
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(`INSERT INTO users (name, phone, password_hash, role) SELECT 'Руководитель ВетДом', $1::varchar, $2::varchar, 'admin'
                      WHERE NOT EXISTS (SELECT 1 FROM users WHERE phone = $1::varchar)`, [ADMIN_PHONE, adminHash]);

    if ((await meta('crm_demo')) === '1') {
      if ((await meta('crm_fin')) !== '2') { await buildFinance(Date.now()); await setMeta('crm_fin', '2'); console.log('✅ Финансы CRM пересчитаны'); }
      return;
    }
    console.log('⏳ Создаю данные CRM (рост компании за год)…');
    // если прошлая попытка оборвалась на середине — убираем её следы
    const OLD = `SELECT id FROM users WHERE phone LIKE '+7999002%' OR phone LIKE '+7999003%'`;
    await pool.query(`DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE client_id IN (${OLD}) OR vet_id IN (SELECT id FROM vets WHERE user_id IN (${OLD})))`);
    await pool.query(`DELETE FROM orders WHERE client_id IN (${OLD}) OR vet_id IN (SELECT id FROM vets WHERE user_id IN (${OLD}))`);
    await pool.query(`DELETE FROM shop_orders WHERE user_id IN (${OLD})`);
    await pool.query(`DELETE FROM pets WHERE owner_id IN (${OLD})`);
    await pool.query(`DELETE FROM vets WHERE user_id IN (${OLD})`);
    await pool.query(`DELETE FROM users WHERE id IN (${OLD})`);
    const now = Date.now();
    const start = new Date('2025-11-15T00:00:00').getTime();

    // 1. Новые врачи
    const vetHash = await bcrypt.hash('vetdemo1234', 10);
    const newVets: { id: number; join: number; rate: number; five: number }[] = [];
    for (let i = 0; i < NEW_VETS.length; i++) {
      const [name, spec, exp, photo, district] = NEW_VETS[i];
      const phone = `+7999003${String(i).padStart(4, "0")}`;
      const joinDaysAgo = Math.round(330 - (i / (NEW_VETS.length - 1)) * 290 + (R() - 0.5) * 16);
      const join = now - joinDaysAgo * DAY;
      const u = await pool.query(`INSERT INTO users (name, phone, password_hash, role, created_at, referral_code) VALUES ($1,$2::varchar,$3,'vet',$4, upper(substr(md5($2::varchar || 'vetdom-crm'), 1, 10))) RETURNING id`,
        [name, phone, vetHash, new Date(join).toISOString()]);
      const v = await pool.query(
        `INSERT INTO vets (user_id, specialization, experience_years, bio, photo_url, is_available, is_verified, lat, lng, created_at, city, district, transport, daily_goal)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,'Москва',$10,$11,5) RETURNING id`,
        [u.rows[0].id, spec, exp, `${spec}. Стаж ${exp} лет. Работаю с ВетДом с ${new Date(join).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}.`,
          `https://randomuser.me/api/portraits/${photo}.jpg`, R() < 0.45, 55.65 + R() * 0.2, 37.45 + R() * 0.3, new Date(join).toISOString(), district,
          pick(['Собственный автомобиль', 'Собственный автомобиль', 'Автомобиль компании', 'Каршеринг'])]);
      newVets.push({ id: v.rows[0].id, join, rate: 2.75 + R() * 0.55, five: 0.86 + R() * 0.1 });
    }

    // 2. Клиенты и питомцы: база растёт вместе с маркетингом
    const clientHash = await bcrypt.hash('clientdemo1234', 10);
    const NC = 4600;
    const cNames: string[] = [], cPhones: string[] = [], cEmails: string[] = [], cCreated: string[] = [], cTg: (string | null)[] = [];
    for (let i = 0; i < NC; i++) {
      const fem = R() < 0.62;
      const first = pick(fem ? FIRST_F : FIRST_M);
      const last = pick(LAST)[fem ? 1 : 0];
      cNames.push(`${first} ${last}`);
      cPhones.push(`+7999002${String(i).padStart(4, '0')}`);
      cEmails.push(R() < 0.7 ? `client${i + 1}@mail.ru` : '');
      cTg.push(R() < 0.35 ? `@${['pet', 'dog', 'cat', 'vet', 'paw'][i % 5]}_${i + 100}` : null);
      // чем ближе к сегодняшнему дню — тем больше новых клиентов
      const t = Math.pow(R(), 0.62);
      cCreated.push(new Date(start + t * (now - start - DAY)).toISOString());
    }
    const cIds = (await pool.query(
      `INSERT INTO users (name, phone, email, telegram_nick, password_hash, role, created_at, referral_code)
       SELECT n, p, NULLIF(e, ''), tg, $6, 'client', c, upper(substr(md5(p || 'vetdom-crm'), 1, 10)) FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::timestamp[]) AS t(n, p, e, tg, c)
       RETURNING id, created_at`, [cNames, cPhones, cEmails, cTg, cCreated, clientHash])).rows as { id: number; created_at: Date }[];

    const pOwner: number[] = [], pName: string[] = [], pSpecies: string[] = [], pBreed: string[] = [], pAge: number[] = [], pWeight: number[] = [],
      pSex: string[] = [], pConcern: string[] = [], pCreated: string[] = [];
    for (const c of cIds) {
      const n = R() < 0.72 ? 1 : R() < 0.85 ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const x = R();
        let species: string, breed: string, name: string, weight: number;
        if (x < 0.48) { species = 'Собака'; breed = pick(DOGS); name = pick(DOG_NAMES); weight = ['Чихуахуа', 'Той-терьер', 'Йоркширский терьер', 'Шпиц', 'Мальтипу'].includes(breed) ? 1.8 + R() * 3 : 8 + R() * 30; }
        else if (x < 0.9) { species = 'Кошка'; breed = pick(CATS); name = pick(CAT_NAMES); weight = breed === 'Мейн-кун' ? 6 + R() * 3 : 3 + R() * 2.8; }
        else { const o = pick(OTHER); species = o[0]; breed = pick(o[1]); name = pick(OTHER_NAMES); weight = species === 'Птица' ? 0.05 + R() * 0.4 : 0.8 + R() * 2; }
        pOwner.push(c.id); pName.push(name); pSpecies.push(species); pBreed.push(breed); pAge.push(Math.floor(R() * 14) + 1);
        pWeight.push(Math.round(weight * 10) / 10); pSex.push(R() < 0.5 ? 'м' : 'ж'); pConcern.push(pick(CONCERNS));
        pCreated.push(new Date(new Date(c.created_at).getTime() + k * 30 * DAY * R()).toISOString());
      }
    }
    const petRows = (await pool.query(
      `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, sex, current_concern, created_at)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::int[], $6::numeric[], $7::text[], $8::text[], $9::timestamp[])
       RETURNING id, owner_id`, [pOwner, pName, pSpecies, pBreed, pAge, pWeight, pSex, pConcern, pCreated])).rows as { id: number; owner_id: number }[];
    const petsOf = new Map<number, number[]>();
    for (const p of petRows) { const a = petsOf.get(p.owner_id) ?? []; a.push(p.id); petsOf.set(p.owner_id, a); }

    // очередь «новых» клиентов по дате регистрации
    const queue = cIds.map((c) => ({ id: c.id, at: new Date(c.created_at).getTime() })).sort((a, b) => a.at - b.at);
    let qi = 0;
    const served: number[] = [];

    // 3. Заказы новых врачей
    const svc = (await pool.query('SELECT id, name, price_from, price_to, duration_minutes FROM services')).rows;
    const svcBy = Object.fromEntries(svc.map((s) => [s.name, s]));
    const totalW = SERVICES_W.reduce((a, [, w]) => a + w, 0);
    const pickSvc = () => { let x = R() * totalW; for (const [n, w] of SERVICES_W) { x -= w; if (x <= 0) return svcBy[n]; } return svcBy['Первичный осмотр']; };

    const o = { client: [] as number[], vet: [] as number[], pet: [] as number[], svc: [] as number[], addr: [] as string[], sched: [] as string[],
      status: [] as string[], price: [] as number[], created: [] as string[], accepted: [] as (string | null)[], completed: [] as (string | null)[],
      percent: [] as (number | null)[], payout: [] as (number | null)[], rating: [] as (number | null)[], review: [] as (string | null)[], notes: [] as string[] };

    // сначала — все визиты всех врачей по времени, потом раздаём клиентов по порядку
    const ev: { v: typeof newVets[0]; at: number; today: boolean }[] = [];
    for (const v of newVets) {
      for (let d = v.join; d < now + DAY; d += DAY) {
        const day = new Date(d);
        const wd = day.getDay();
        const grow = 0.92 + 0.016 * ((d - start) / (30 * DAY));   // загрузка врачей растёт каждый месяц
        const ramp = Math.min(1, (d - v.join) / (55 * DAY) + 0.25);
        const wk = wd === 0 ? 0.45 : wd === 6 ? 0.7 : 1.08;
        const n = Math.max(0, Math.round(v.rate * grow * ramp * wk * (0.75 + R() * 0.5)));
        for (let k = 0; k < n; k++) {
          const at0 = new Date(day); at0.setHours(8 + Math.floor(R() * 13), Math.floor(R() * 60), 0, 0);
          let at = at0.getTime();
          const today = new Date(at).toDateString() === new Date(now).toDateString();
          if (at > now - 20 * 60_000) { if (!today) continue; at = now - (0.3 + R() * 3) * H; }
          ev.push({ v, at, today });
        }
      }
    }
    ev.sort((x, y) => x.at - y.at);
    const cumBy = new Map<number, number>();
    for (const { v, at, today: isToday } of ev) {
      let cid: number;
      if (served.length > 40 && R() < 0.43) cid = pick(served);
      else if (qi < queue.length && queue[qi].at <= at) { cid = queue[qi++].id; served.push(cid); }
      else cid = served.length ? pick(served) : queue[qi++].id;
      const s = pickSvc();
      const price = round(s.price_from + R() * 0.25 * (s.price_to - s.price_from));
      const created = at - (0.4 + R() * 3) * H;
      const cancelled = R() < 0.035;
      let status = cancelled ? 'cancelled' : 'completed';
      if (isToday && !cancelled && at > now - 1.6 * H) status = pick(['confirmed', 'on_the_way', 'arrived', 'in_progress']);
      const cum = cumBy.get(v.id) ?? 0;
      const percent = tierFor(cum, 4.9).percent;
      const done = status === 'completed';
      if (done) cumBy.set(v.id, cum + 1);
      const rated = done && R() < 0.8;
      const rating = rated ? (R() < v.five ? 5 : R() < 0.85 ? 4 : 3) : null;
      o.client.push(cid); o.vet.push(v.id); o.pet.push(pick(petsOf.get(cid) ?? [petRows[0].id])); o.svc.push(s.id);
      o.addr.push(`Москва, ${pick(STREETS)}, ${1 + Math.floor(R() * 120)}, кв. ${1 + Math.floor(R() * 300)}`);
      o.sched.push(new Date(at).toISOString()); o.status.push(status); o.price.push(price); o.created.push(new Date(created).toISOString());
      o.accepted.push(cancelled ? null : new Date(created + (2 + R() * 6) * 60_000).toISOString());
      o.completed.push(done ? new Date(at + s.duration_minutes * 60_000).toISOString() : null);
      o.percent.push(cancelled ? null : percent); o.payout.push(cancelled ? null : Math.round(price * percent / 100));
      o.rating.push(rating); o.review.push(rating && R() < 0.4 ? pick(REVIEWS) : null); o.notes.push(pick(CONCERNS));
    }
    for (let i = 0; i < o.client.length; i += 4000) {
      const sl = <T,>(a: T[]) => a.slice(i, i + 4000);
      await pool.query(
        `INSERT INTO orders (client_id, vet_id, pet_id, service_id, address, scheduled_at, status, total_price, created_at, updated_at,
           accepted_at, completed_at, vet_percent, vet_payout, client_rating, client_review, notes)
         SELECT c, v, p, s, a, sc, st, pr, cr, COALESCE(co, cr), ac, co, pc, po, ra, re, nt
         FROM unnest($1::int[], $2::int[], $3::int[], $4::int[], $5::text[], $6::timestamp[], $7::text[], $8::int[], $9::timestamp[],
                     $10::timestamp[], $11::timestamp[], $12::int[], $13::int[], $14::smallint[], $15::text[], $16::text[])
           AS t(c, v, p, s, a, sc, st, pr, cr, ac, co, pc, po, ra, re, nt)`,
        [sl(o.client), sl(o.vet), sl(o.pet), sl(o.svc), sl(o.addr), sl(o.sched), sl(o.status), sl(o.price), sl(o.created),
          sl(o.accepted), sl(o.completed), sl(o.percent), sl(o.payout), sl(o.rating), sl(o.review), sl(o.notes)]);
    }
    await pool.query(
      `UPDATE vets v SET rating = s.r, reviews_count = s.n FROM (
         SELECT vet_id, ROUND(AVG(client_rating), 2) r, COUNT(client_rating) n FROM orders WHERE client_rating IS NOT NULL GROUP BY vet_id) s
       WHERE s.vet_id = v.id`);

    // 4. Покупки в магазине (~10% выручки)
    const prodW = PRODUCTS.map((p) => ({ id: p.id, price: p.price, w: Math.sqrt(p.sold || 100) }));
    const pw = prodW.reduce((a, p) => a + p.w, 0);
    const pickProd = () => { let x = R() * pw; for (const p of prodW) { x -= p.w; if (x <= 0) return p; } return prodW[0]; };
    const so = { user: [] as number[], prod: [] as number[], qty: [] as number[], total: [] as number[], bonus: [] as number[], at: [] as string[] };
    const shopUsers = served.length ? served : cIds.map((c) => c.id);
    for (let d = start; d < now; d += DAY) {
      const growth = 0.25 + 0.75 * Math.min(1, (d - start) / ((now - start) * 0.92));
      const n = Math.round(24 * growth * (0.8 + R() * 0.4));
      for (let k = 0; k < n; k++) {
        const at = d + (9 + R() * 13) * H; if (at > now) continue;
        const p = pickProd(); const q = R() < 0.7 ? 1 : R() < 0.75 ? 2 : 3;
        const total = p.price * q; const bonus = R() < 0.18 ? Math.min(Math.round(total * 0.3 / 10) * 10, 1500) : 0;
        so.user.push(pick(shopUsers)); so.prod.push(p.id); so.qty.push(q); so.total.push(total - bonus); so.bonus.push(bonus); so.at.push(new Date(at).toISOString());
      }
    }
    await pool.query(`INSERT INTO shop_orders (user_id, product_id, qty, total_rub, bonus_used, created_at)
      SELECT * FROM unnest($1::int[], $2::int[], $3::int[], $4::int[], $5::int[], $6::timestamp[])`, [so.user, so.prod, so.qty, so.total, so.bonus, so.at]);

    // 5. Финансы компании по месяцам
    await buildFinance(now);

    await setMeta('crm_demo', '1');
    await setMeta('crm_fin', '2');
    console.log(`✅ Данные CRM созданы: ${NEW_VETS.length} новых врачей, ${NC} клиентов, ${o.client.length} заказов, ${so.user.length} покупок`);
  } catch (err) {
    console.error('Ошибка данных CRM:', err);
  }
}

async function buildFinance(now: number) {
  await pool.query('DELETE FROM crm_finance'); await pool.query('DELETE FROM crm_marketing');
  await pool.query('DELETE FROM crm_transactions'); await pool.query('DELETE FROM crm_accounts');
  const months = (await pool.query(`
    WITH s AS (SELECT date_trunc('month', scheduled_at)::date m, SUM(total_price + COALESCE(bonus_used,0)) FILTER (WHERE status='completed') rev,
                      SUM(vet_payout) FILTER (WHERE status='completed') pay, COUNT(*) FILTER (WHERE status='completed') n FROM orders GROUP BY 1),
         sh AS (SELECT date_trunc('month', created_at)::date m, SUM(total_rub + bonus_used) rev FROM shop_orders GROUP BY 1),
         nc AS (SELECT date_trunc('month', f)::date m, COUNT(*) n FROM (SELECT MIN(scheduled_at) f FROM orders WHERE status='completed' GROUP BY client_id) x GROUP BY 1)
    SELECT s.m, s.rev::bigint svc, COALESCE(sh.rev,0)::bigint shop, s.pay::bigint pay, s.n::int orders, COALESCE(nc.n,0)::int newc
    FROM s LEFT JOIN sh ON sh.m = s.m LEFT JOIN nc ON nc.m = s.m WHERE s.m >= '2025-11-01' ORDER BY s.m`)).rows;

  const F: [string, string, string, number][] = [];   // month, group, item, amount
  const nowD = new Date(now);
  for (let i = 0; i < months.length; i++) {
    const m = months[i]; const md = new Date(m.m);
    const isCur = md.getFullYear() === nowD.getFullYear() && md.getMonth() === nowD.getMonth();
    const frac = isCur ? nowD.getDate() / new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate() : md.getMonth() === 10 && md.getFullYear() === 2025 ? 0.55 : 1;
    const svc = Number(m.svc), shop = Number(m.shop), rev = svc + shop;
    const k = i / Math.max(1, months.length - 2);   // 0 → 1 за год
    const mk = (g: string, it: string, a: number) => F.push([m.m, g, it, Math.round(a / 100) * 100]);
    mk('Выплаты ветеринарам', 'Доля врачей от визитов (55–70%)', Number(m.pay));
    mk('Себестоимость товаров', 'Закупка и производство «ВетДом Натурал»', shop * 0.47);
    mk('Себестоимость товаров', 'Доставка заказов магазина', shop * 0.06);
    const mkt = rev * (0.17 - 0.1 * Math.min(1, k));
    for (const [ch, , share] of CHANNELS) mk('Маркетинг и реклама', ch, mkt * share * (0.92 + R() * 0.16));
    const staff = (480000 + 340000 * Math.min(1, k)) * frac;
    mk('Зарплаты команды', 'Операторы и диспетчеры (24/7)', staff * 0.34);
    mk('Зарплаты команды', 'IT-разработка и дизайн', staff * 0.27);
    mk('Зарплаты команды', 'Менеджеры по врачам и качеству', staff * 0.14);
    mk('Зарплаты команды', 'Бухгалтерия и юрист', staff * 0.09);
    mk('Зарплаты команды', 'Руководство', staff * 0.16);
    mk('Налоги и взносы', 'Страховые взносы с зарплат', staff * 0.302);
    mk('Налоги и взносы', 'Налог УСН 6%', rev * 0.06);
    mk('Аренда и офис', 'Офис (Москва, м. Белорусская)', 165000 * frac);
    mk('Аренда и офис', 'Склад «ВетДом Натурал»', (45000 + 50000 * Math.min(1, k)) * frac);
    mk('Аренда и офис', 'Коммунальные услуги и связь', 28000 * frac);
    mk('IT и сервисы', 'Серверы и облако', (38000 + 42000 * Math.min(1, k)) * frac);
    mk('IT и сервисы', 'SMS, телефония, push', rev * 0.0055);
    mk('IT и сервисы', 'Карты, маршруты, ИИ-помощник', rev * 0.004);
    mk('Банк и эквайринг', 'Эквайринг 2,1%', rev * 0.021);
    mk('Банк и эквайринг', 'Обслуживание счетов', 9900 * frac);
    mk('Медикаменты и расходники', 'Вакцины и препараты для врачей', svc * 0.013);
    mk('Медикаменты и расходники', 'Расходные материалы', svc * 0.005);
    mk('Прочее', 'Страхование ответственности врачей', 42000 * frac);
    mk('Прочее', 'Обучение и аттестация врачей', (25000 + 35000 * Math.min(1, k)) * frac);

    // маркетинг по каналам: охваты, клики, заявки, новые клиенты
    const newc = Number(m.newc);
    const effSum = CHANNELS.reduce((a, [, , s, e]) => a + s * e, 0);
    const avgFirst = Number(m.orders) ? svc / Number(m.orders) : 2600;
    for (const [ch, icon, share, eff] of CHANNELS) {
      const spend = mkt * share;
      const clients = Math.round(newc * share * eff / effSum);
      const leads = Math.round(clients * (1.5 + R() * 0.5));
      const clicks = Math.round(leads * (9 + R() * 8));
      const impr = Math.round(clicks * (55 + R() * 60));
      await pool.query(`INSERT INTO crm_marketing (month, channel, icon, spend, impressions, clicks, leads, clients, revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.m, ch, icon, Math.round(spend), impr, clicks, leads, clients, Math.round(clients * avgFirst * 2.6)]);
    }
  }
  const fv = [F.map((x) => x[0]), F.map((x) => x[1]), F.map((x) => x[2]), F.map((x) => x[3])];
  await pool.query(`INSERT INTO crm_finance (month, grp, item, amount) SELECT * FROM unnest($1::date[], $2::text[], $3::text[], $4::bigint[])`, fv);

  // Счета компании
  const acc = [
    ['Основной расчётный счёт', 'Т-Банк', 'Расчётный счёт', '•• 4817', 5240000, '#FACC15', 'Сюда приходят оплаты клиентов, отсюда — выплаты врачам'],
    ['Резервный счёт', 'Сбербанк', 'Расчётный счёт', '•• 2093', 2310000, '#21A038', 'Налоги, зарплаты, аренда'],
    ['Депозит «Подушка безопасности»', 'Альфа-Банк', 'Депозит 16%', '•• 7751', 6500000, '#EF3124', 'Неснижаемый остаток — 3 месяца расходов'],
    ['Эквайринг (в пути)', 'Т-Банк Касса', 'Эквайринг', 'online', 386000, '#7DD3FC', 'Оплаты картой, поступят на счёт завтра'],
    ['Касса склада', 'Наличные', 'Касса', '—', 48500, '#B07F48', 'Самовывоз и мелкие расходы'],
  ];
  const accIds: number[] = [];
  for (const a of acc) accIds.push((await pool.query(`INSERT INTO crm_accounts (name, bank, kind, mask, balance, color, note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, a)).rows[0].id);

  // Операции за последние 90 дней
  const daily = (await pool.query(`
    SELECT d::date AS day,
      (SELECT COALESCE(SUM(total_price),0) FROM orders WHERE status='completed' AND scheduled_at::date = d::date)::bigint svc,
      (SELECT COALESCE(SUM(total_rub),0) FROM shop_orders WHERE created_at::date = d::date)::bigint shop,
      (SELECT COALESCE(SUM(vet_payout),0) FROM orders WHERE status='completed' AND scheduled_at::date = d::date)::bigint pay
    FROM generate_series(NOW()::date - 90, NOW()::date, '1 day') d`)).rows;
  const T: [string, number, string, number, string, string, string][] = [];
  const t = (day: Date, h: number, acc: number, dir: string, amount: number, cat: string, who: string, note = '') =>
    T.push([new Date(day.getTime() + h * H).toISOString(), accIds[acc], dir, Math.round(amount), cat, who, note]);
  let weekPay = 0;
  const finByMonth = new Map<string, Record<string, number>>();
  for (const [m, g, it, a] of F) { const k = String(m).slice(0, 7); const r = finByMonth.get(k) ?? {}; r[`${g}|${it}`] = a; finByMonth.set(k, r); }
  for (const d of daily) {
    const day = new Date(d.day); const dom = day.getDate(); const wd = day.getDay();
    const mk = finByMonth.get(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`) ?? {};
    const g = (key: string) => mk[key] ?? 0;
    if (Number(d.svc)) t(day, 23.5, 0, 'in', Number(d.svc) * 0.979, 'Оплаты клиентов за визиты', 'Т-Банк Эквайринг', 'за вычетом комиссии 2,1%');
    if (Number(d.shop)) t(day, 23.6, 0, 'in', Number(d.shop) * 0.979, 'Оплаты в магазине', 'Т-Банк Эквайринг');
    weekPay += Number(d.pay);
    if (wd === 1 && weekPay) { t(day, 11, 0, 'out', weekPay, 'Выплаты ветеринарам', 'Реестр выплат врачам (42 человека)', 'еженедельно, по понедельникам'); weekPay = 0; }
    if (wd === 2) for (const [ch] of CHANNELS.slice(0, 4)) t(day, 12, 0, 'out', g(`Маркетинг и реклама|${ch}`) / 4.3, 'Маркетинг и реклама', ch, 'пополнение рекламного кабинета');
    if (dom === 5 || dom === 20) {
      const staff = ['Операторы и диспетчеры (24/7)', 'IT-разработка и дизайн', 'Менеджеры по врачам и качеству', 'Бухгалтерия и юрист', 'Руководство']
        .reduce((a, k) => a + g(`Зарплаты команды|${k}`), 0);
      t(day, 10, 1, 'out', staff / 2, 'Зарплаты команды', 'Зарплатный проект Сбербанк', dom === 5 ? 'зарплата' : 'аванс');
    }
    if (dom === 1) { t(day, 9, 1, 'out', g('Аренда и офис|Офис (Москва, м. Белорусская)'), 'Аренда и офис', 'ООО «Белая Площадь»', 'аренда офиса');
      t(day, 9.2, 1, 'out', g('Аренда и офис|Склад «ВетДом Натурал»'), 'Аренда и офис', 'ООО «Логистик Парк»', 'аренда склада');
      t(day, 13, 0, 'out', g('Маркетинг и реклама|SEO и контент'), 'Маркетинг и реклама', 'Агентство «Контент-Хаус»', 'SEO и статьи');
      t(day, 13.5, 0, 'out', g('Маркетинг и реклама|Наружная реклама'), 'Маркетинг и реклама', 'Russ Outdoor', 'билборды и лифты'); }
    if (dom === 3) { t(day, 15, 0, 'out', g('IT и сервисы|Серверы и облако'), 'IT и сервисы', 'Yandex Cloud', 'серверы');
      t(day, 15.2, 0, 'out', g('IT и сервисы|SMS, телефония, push'), 'IT и сервисы', 'МТС Exolve', 'SMS и телефония'); }
    if (dom === 10) t(day, 14, 0, 'out', g('Себестоимость товаров|Закупка и производство «ВетДом Натурал»') * 0.6, 'Себестоимость товаров', 'Фабрика кормов «Натура-Про»', 'партия кормов');
    if (dom === 15) t(day, 11, 0, 'out', g('Медикаменты и расходники|Вакцины и препараты для врачей'), 'Медикаменты и расходники', 'ВетФарм Дистрибуция', 'вакцины и препараты');
    if (dom === 28) { t(day, 10, 1, 'out', g('Налоги и взносы|Налог УСН 6%'), 'Налоги и взносы', 'ФНС России', 'аванс УСН');
      t(day, 10.1, 1, 'out', g('Налоги и взносы|Страховые взносы с зарплат'), 'Налоги и взносы', 'ФНС России', 'страховые взносы'); }
    if (dom === 6) t(day, 16, 0, 'out', 1800000, 'Перевод между счетами', 'Резервный счёт Сбербанк', 'на налоги и зарплаты');
    if (dom === 6) t(day, 16, 1, 'in', 1800000, 'Перевод между счетами', 'Основной счёт Т-Банк');
    if (dom === 12 && R() < 0.7) t(day, 12, 2, 'in', 6500000 * 0.16 / 12, 'Проценты по депозиту', 'Альфа-Банк', '16% годовых');
  }
  await pool.query(`INSERT INTO crm_transactions (at, account_id, direction, amount, category, counterparty, note)
    SELECT * FROM unnest($1::timestamp[], $2::int[], $3::text[], $4::bigint[], $5::text[], $6::text[], $7::text[])`,
    [T.map((x) => x[0]), T.map((x) => x[1]), T.map((x) => x[2]), T.map((x) => x[3]), T.map((x) => x[4]), T.map((x) => x[5]), T.map((x) => x[6])]);
}
