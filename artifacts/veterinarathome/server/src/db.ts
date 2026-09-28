import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'client',
      telegram_nick VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_nick VARCHAR(100);

    CREATE TABLE IF NOT EXISTS vets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      specialization VARCHAR(255),
      experience_years INTEGER DEFAULT 0,
      rating DECIMAL(3,2) DEFAULT 5.0,
      reviews_count INTEGER DEFAULT 0,
      bio TEXT,
      photo_url VARCHAR(500),
      is_available BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      lat DECIMAL(10,7),
      lng DECIMAL(10,7),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pets (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      species VARCHAR(50) NOT NULL,
      breed VARCHAR(100),
      age_years INTEGER,
      weight_kg DECIMAL(5,2),
      notes TEXT,
      photo_url TEXT,
      telegram_nick VARCHAR(100),
      diagnoses TEXT,
      previous_treatment TEXT,
      current_concern TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE pets ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE pets ADD COLUMN IF NOT EXISTS telegram_nick VARCHAR(100);
    ALTER TABLE pets ADD COLUMN IF NOT EXISTS diagnoses TEXT;
    ALTER TABLE pets ADD COLUMN IF NOT EXISTS previous_treatment TEXT;
    ALTER TABLE pets ADD COLUMN IF NOT EXISTS current_concern TEXT;

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price_from INTEGER NOT NULL,
      price_to INTEGER,
      duration_minutes INTEGER DEFAULT 60,
      icon VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      vet_id INTEGER REFERENCES vets(id) ON DELETE SET NULL,
      pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      address TEXT NOT NULL,
      address_lat DECIMAL(10,7),
      address_lng DECIMAL(10,7),
      scheduled_at TIMESTAMP,
      status VARCHAR(30) DEFAULT 'pending',
      notes TEXT,
      total_price INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Seed services if empty
    INSERT INTO services (name, description, price_from, price_to, duration_minutes, icon)
    SELECT * FROM (VALUES
      ('Первичный осмотр', 'Полный осмотр питомца у вас дома, постановка диагноза', 1500, 2500, 60, '🩺'),
      ('Вакцинация', 'Профилактические прививки с записью в ветпаспорт', 800, 2000, 30, '💉'),
      ('Скорая ветпомощь', 'Экстренный выезд в любое время суток', 3000, 5000, 60, '🚨'),
      ('Забор анализов', 'Кровь, моча и другие анализы прямо дома', 600, 1500, 30, '🔬'),
      ('Обработка от паразитов', 'Защита от блох, клещей и глистов', 500, 1200, 20, '🛡️'),
      ('Хирургическая помощь', 'Малые хирургические процедуры на дому', 2000, 6000, 90, '⚕️'),
      ('Уход и груминг', 'Стрижка когтей, чистка ушей, обработка ран', 700, 1500, 45, '✂️'),
      ('Консультация', 'Ответы на вопросы и рекомендации по уходу', 500, 1000, 30, '💬')
    ) AS v(name, description, price_from, price_to, duration_minutes, icon)
    WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);

    -- Suggestions table
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      telegram VARCHAR(100),
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Update icons to professional versions
    UPDATE services SET icon = '🚑' WHERE name = 'Скорая ветпомощь';
    UPDATE services SET icon = '💊' WHERE name = 'Капельница на дому';
    UPDATE services SET icon = '💈' WHERE name = 'Уход и груминг';
    UPDATE services SET icon = '📋' WHERE name = 'Консультация';
    UPDATE services SET icon = '🏥' WHERE name = 'Кастрация';
    UPDATE services SET icon = '🩻' WHERE name = 'Стерилизация';

    -- Add new services if missing
    INSERT INTO services (name, description, price_from, price_to, duration_minutes, icon)
    SELECT 'Капельница на дому', 'Внутривенное введение препаратов, регидратация и поддерживающая терапия прямо дома', 1800, 4000, 60, '🩸'
    WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Капельница на дому');

    INSERT INTO services (name, description, price_from, price_to, duration_minutes, icon)
    SELECT 'Передержка', 'Временное содержание питомца под наблюдением ветеринара — пока вы в отъезде или на работе', 900, 2500, 480, '🏠'
    WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Передержка');

    INSERT INTO services (name, description, price_from, price_to, duration_minutes, icon)
    SELECT 'Выгул животного', 'Профессиональный выгул вашей собаки — безопасно, с заботой и отчётом', 600, 1200, 60, '🦮'
    WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Выгул животного');

    INSERT INTO services (name, description, price_from, price_to, duration_minutes, icon)
    SELECT 'Кастрация', 'Кастрация самцов на дому или в выездной операционной — безопасно и без стресса', 3500, 8000, 90, '✂️'
    WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Кастрация');

    INSERT INTO services (name, description, price_from, price_to, duration_minutes, icon)
    SELECT 'Стерилизация', 'Стерилизация самок с полным послеоперационным сопровождением врача', 4500, 10000, 120, '🏥'
    WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Стерилизация');
  `);
  console.log('✅ Database initialized');
}
