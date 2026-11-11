import bcrypt from 'bcryptjs';
import pool from './db';

// Демо-аккаунт для показа платформы (кнопка «Войти в демо» на странице входа)
export const DEMO_PHONE = '+79990000000';
export const DEMO_PASSWORD = 'demo1234';

const VETS = [
  { name: 'Анна Соколова', phone: '+79990000101', spec: 'Терапевт, вакцинация', exp: 9, rating: 4.95, reviews: 312,
    bio: 'Ветеринарный терапевт с 9-летним опытом. Специализация — кошки и собаки, профилактика и вакцинация.',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Дмитрий Орлов', phone: '+79990000102', spec: 'Хирург', exp: 12, rating: 4.9, reviews: 241,
    bio: 'Хирург высшей категории. Кастрация, стерилизация и малые операции на дому.',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Мария Ким', phone: '+79990000103', spec: 'Дерматолог, груминг', exp: 6, rating: 4.88, reviews: 158,
    bio: 'Лечение кожных заболеваний и аллергий, уход за шерстью и когтями.',
    photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { name: 'Игорь Белов', phone: '+79990000104', spec: 'Скорая помощь, реаниматолог', exp: 15, rating: 4.97, reviews: 427,
    bio: 'Экстренные выезды 24/7. Реанимация, капельницы, неотложная помощь.',
    photo: 'https://randomuser.me/api/portraits/men/75.jpg' },
];

const PETS = [
  { name: 'Барон', species: 'Собака', breed: 'Золотистый ретривер', age: 4, weight: 32.5,
    notes: 'Очень дружелюбный, любит апорт',
    diagnoses: 'Аллергия на курицу', previous_treatment: 'Гипоаллергенный корм с 2024 года',
    current_concern: 'Плановая ежегодная вакцинация',
    photo: '/pets/baron.jpg' },
  { name: 'Муся', species: 'Кошка', breed: 'Британская короткошёрстная, золотая шиншилла', age: 2, weight: 4.2,
    notes: 'Боится громких звуков',
    diagnoses: 'Здорова', previous_treatment: 'Стерилизация в 2025 году',
    current_concern: 'Контроль веса',
    photo: '/pets/musya.jpg' },
  { name: 'Персик', species: 'Кошка', breed: 'Европейская короткошёрстная, рыжий', age: 7, weight: 7.8,
    notes: 'Спокойный, ласковый',
    diagnoses: 'Хронический гастрит', previous_treatment: 'Диета, курс пробиотиков',
    current_concern: 'Снижение аппетита последние 3 дня',
    photo: '/pets/persik.jpg' },
];

export async function seedDemo() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ветеринары
    const vetHash = await bcrypt.hash('vetdemo1234', 10);
    const vetIds: number[] = [];
    for (const v of VETS) {
      let u = await client.query('SELECT id FROM users WHERE phone = $1', [v.phone]);
      if (u.rows.length === 0) {
        u = await client.query(
          `INSERT INTO users (name, phone, password_hash, role) VALUES ($1,$2,$3,'vet') RETURNING id`,
          [v.name, v.phone, vetHash]
        );
      }
      const userId = u.rows[0].id;
      let vet = await client.query('SELECT id FROM vets WHERE user_id = $1', [userId]);
      if (vet.rows.length === 0) {
        vet = await client.query(
          `INSERT INTO vets (user_id, specialization, experience_years, rating, reviews_count, bio, photo_url,
             is_available, is_verified, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,55.75,37.62) RETURNING id`,
          [userId, v.spec, v.exp, v.rating, v.reviews, v.bio, v.photo]
        );
      }
      vetIds.push(vet.rows[0].id);
    }

    // Демо-клиент: если уже есть — ничего не трогаем, чтобы не сбивать данные во время показа
    const existing = await client.query('SELECT id FROM users WHERE phone = $1', [DEMO_PHONE]);
    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return;
    }

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userRes = await client.query(
      `INSERT INTO users (name, phone, email, password_hash, role, telegram_nick)
       VALUES ('Александр Морозов', $1, 'a.morozov@vetdom.ru', $2, 'client', '@alex_morozov') RETURNING id`,
      [DEMO_PHONE, hash]
    );
    const userId = userRes.rows[0].id;

    const petIds: number[] = [];
    for (const p of PETS) {
      const r = await client.query(
        `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, notes, photo_url,
           diagnoses, previous_treatment, current_concern)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [userId, p.name, p.species, p.breed, p.age, p.weight, p.notes, p.photo,
         p.diagnoses, p.previous_treatment, p.current_concern]
      );
      petIds.push(r.rows[0].id);
    }

    const svc = async (name: string) =>
      (await client.query('SELECT id, price_from FROM services WHERE name = $1', [name])).rows[0];

    const address = 'Москва, Кутузовский проспект, 32, кв. 15';
    const orders = [
      { pet: 0, service: 'Вакцинация', vet: 0, daysAgo: 60, status: 'completed', notes: 'Комплексная вакцина + бешенство' },
      { pet: 1, service: 'Первичный осмотр', vet: 0, daysAgo: 35, status: 'completed', notes: 'Плановый осмотр' },
      { pet: 2, service: 'Забор анализов', vet: 2, daysAgo: 14, status: 'completed', notes: 'Общий и биохимический анализ крови' },
      { pet: 0, service: 'Обработка от паразитов', vet: 2, daysAgo: 6, status: 'cancelled', notes: 'Перенесли на другую дату' },
      { pet: 2, service: 'Консультация', vet: 3, daysAgo: 0, status: 'on_the_way', notes: 'Снижение аппетита, вялость' },
    ];

    const historyFor: Record<string, [string, string][]> = {
      completed: [['pending', 'Заказ создан, ищем ветеринара'], ['confirmed', 'Ветеринар принял заказ'],
        ['on_the_way', 'Ветеринар выехал'], ['arrived', 'Ветеринар прибыл'], ['in_progress', 'Идёт приём'],
        ['completed', 'Приём завершён']],
      cancelled: [['pending', 'Заказ создан, ищем ветеринара'], ['cancelled', 'Отменён клиентом']],
      on_the_way: [['pending', 'Заказ создан, ищем ветеринара'], ['confirmed', 'Ветеринар принял заказ'],
        ['on_the_way', 'Ветеринар выехал к вам']],
    };

    for (const o of orders) {
      const s = await svc(o.service);
      if (!s) continue;
      const when = new Date(Date.now() - o.daysAgo * 86400000);
      if (o.daysAgo === 0) when.setTime(Date.now() + 40 * 60000);
      const created = new Date(when.getTime() - 3 * 3600000);
      const r = await client.query(
        `INSERT INTO orders (client_id, vet_id, pet_id, service_id, address, address_lat, address_lng,
           scheduled_at, status, notes, total_price, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,55.7414,37.5355,$6,$7,$8,$9,$10,$10) RETURNING id`,
        [userId, vetIds[o.vet], petIds[o.pet], s.id, address, when.toISOString(), o.status, o.notes,
         s.price_from, created.toISOString()]
      );
      const steps = historyFor[o.status];
      for (let i = 0; i < steps.length; i++) {
        await client.query(
          'INSERT INTO order_status_history (order_id, status, comment, created_at) VALUES ($1,$2,$3,$4)',
          [r.rows[0].id, steps[i][0], steps[i][1], new Date(created.getTime() + i * 15 * 60000).toISOString()]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Демо-аккаунт создан');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка создания демо-данных:', err);
  } finally {
    client.release();
  }
}

// Питомец-пример для ветпаспорта (страница /medcard): овчарка Марс
export const PASSPORT_DEMO_ID = 'VD-21-004217';

export async function seedPassportPet() {
  try {
    const owner = await pool.query('SELECT id FROM users WHERE phone = $1', [DEMO_PHONE]);
    if (owner.rows.length === 0) return;
    await pool.query(`UPDATE users SET avatar_url = '/avatars/alexander.jpg' WHERE id = $1 AND avatar_url IS NULL`, [owner.rows[0].id]);
    const exists = await pool.query('SELECT id FROM pets WHERE passport_id = $1', [PASSPORT_DEMO_ID]);
    if (exists.rows.length > 0) return;
    await pool.query(
      `INSERT INTO pets (owner_id, passport_id, name, species, breed, age_years, weight_kg, birth_date, sex, color,
         microchip, notes, photo_url, diagnoses, previous_treatment, current_concern)
       VALUES ($1,$2,'Марс','Собака','Австралийская овчарка',5,24.6,'2021-03-12','Самец','Красный мерль',
         '643 098 100 457 712','Путешественник: 5 стран. Обожает море.','/passport/mars.jpg',
         'Здоров. Пищевая аллергия на курицу (под контролем).',
         'Порез подушечки лапы (2025, Сербия) — полностью зажил.',
         'Плановая обработка от клещей в декабре')`,
      [owner.rows[0].id, PASSPORT_DEMO_ID]
    );
    console.log('✅ Питомец-пример для ветпаспорта создан');
  } catch (err) {
    console.error('Ошибка создания питомца для ветпаспорта:', err);
  }
}

// Друзья, приглашённые демо-клиентом по реферальной ссылке (для показа реферальной программы)
export async function seedReferralFriends() {
  try {
    const owner = await pool.query('SELECT id FROM users WHERE phone = $1', [DEMO_PHONE]);
    if (owner.rows.length === 0) return;
    const ownerId = owner.rows[0].id;
    const has = await pool.query('SELECT 1 FROM users WHERE referred_by = $1 LIMIT 1', [ownerId]);
    if (has.rows.length > 0) return;
    const hash = await bcrypt.hash('frienddemo1234', 10);
    const friends = [
      { name: 'Ольга Смирнова', phone: '+79990000201', daysAgo: 40, orders: [['Первичный осмотр', 30], ['Вакцинация', 12]] },
      { name: 'Дмитрий Волков', phone: '+79990000202', daysAgo: 18, orders: [['Кастрация', 9]] },
    ];
    for (const f of friends) {
      const u = await pool.query(
        `INSERT INTO users (name, phone, password_hash, role, referred_by, created_at)
         VALUES ($1,$2,$3,'client',$4, NOW() - ($5 || ' days')::interval) RETURNING id`,
        [f.name, f.phone, hash, ownerId, f.daysAgo]
      );
      for (const [svcName, ago] of f.orders) {
        const s = await pool.query('SELECT id, price_from FROM services WHERE name = $1', [svcName]);
        if (!s.rows[0]) continue;
        await pool.query(
          `INSERT INTO orders (client_id, service_id, address, scheduled_at, status, total_price, created_at)
           VALUES ($1,$2,'Москва',NOW() - ($3 || ' days')::interval,'completed',$4,NOW() - ($3 || ' days')::interval)`,
          [u.rows[0].id, s.rows[0].id, ago, s.rows[0].price_from]
        );
      }
    }
    console.log('✅ Демо-друзья по реферальной программе созданы');
  } catch (err) {
    console.error('Ошибка создания демо-друзей:', err);
  }
}

// Стартовые сообщения от врачей после прошлых визитов демо-клиента
export async function seedChats() {
  try {
    const owner = await pool.query('SELECT id FROM users WHERE phone = $1', [DEMO_PHONE]);
    if (!owner.rows[0]) return;
    const orders = await pool.query(
      `SELECT o.id, o.scheduled_at, p.name AS pet, s.name AS service FROM orders o
       LEFT JOIN pets p ON p.id = o.pet_id LEFT JOIN services s ON s.id = o.service_id
       WHERE o.client_id = $1 AND o.status = 'completed' AND o.vet_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM chat_messages c WHERE c.order_id = o.id)`, [owner.rows[0].id]);
    for (const o of orders.rows) {
      const t0 = new Date(o.scheduled_at).getTime() + 3 * 3600_000;
      const msgs: [string, string, number][] = [
        ['vet', `Здравствуйте! Это ваш ветеринар после визита (${(o.service || '').toLowerCase()}). Как ${o.pet} себя чувствует? Все рекомендации я записала в медкарту.`, 0],
        ['client', `Добрый вечер! ${o.pet} уже бодрый, поел с аппетитом. Спасибо вам огромное!`, 40 * 60_000],
        ['vet', `Отлично, рада слышать! Если появятся вопросы по лечению или уходу — пишите сюда в любое время 🐾`, 55 * 60_000],
      ];
      for (const [sender, text, dt] of msgs) {
        await pool.query('INSERT INTO chat_messages (order_id, sender, text, created_at, read_by_client) VALUES ($1,$2,$3,$4,true)',
          [o.id, sender, text, new Date(t0 + dt).toISOString()]);
      }
    }
  } catch (err) {
    console.error('Ошибка создания демо-чатов:', err);
  }
}
