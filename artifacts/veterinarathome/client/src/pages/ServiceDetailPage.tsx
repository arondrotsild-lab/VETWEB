import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getServices } from '../api';
import ServiceIcon from '../components/ServiceIcon';
import AnimatedNumber from '../components/AnimatedNumber';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Maps animal emoji → clean business SVG icon */
const ANIMAL_ICON: Record<string, React.ReactNode> = {
  '🐱': ( // кошка
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M5 9 7 4l3 3.5"/>
      <path d="M14 7.5l3-3.5 2 5"/>
      <ellipse cx="12" cy="14.5" rx="7" ry="6.5"/>
      <circle cx="9.5" cy="13.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="13.5" r=".6" fill="currentColor" stroke="none"/>
      <path d="M10.5 16.5q1.5 1 3 0"/>
      <path d="M5 14h3M16 14h3"/>
    </svg>
  ),
  '🐶': ( // собака
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M5.5 8 3 5c-.5 2.5.5 5 2.5 6"/>
      <circle cx="12" cy="13" r="7"/>
      <circle cx="10" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <path d="M9.5 15.5q2.5 2 5 0"/>
      <ellipse cx="12" cy="17" rx="2" ry="1.2"/>
    </svg>
  ),
  '🐕': ( // собака средняя
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M5.5 8 3 5c-.5 2.5.5 5 2.5 6"/>
      <circle cx="12" cy="13" r="7"/>
      <circle cx="10" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <path d="M9.5 15.5q2.5 2 5 0"/>
      <ellipse cx="12" cy="17" rx="2" ry="1.2"/>
    </svg>
  ),
  '🦮': ( // крупная порода
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M4 8 2 5c0 3 1 5.5 3.5 6.5"/>
      <circle cx="12.5" cy="13" r="7.5"/>
      <circle cx="10.5" cy="12" r=".7" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="12" r=".7" fill="currentColor" stroke="none"/>
      <path d="M9 16q3.5 2.5 7 0"/>
      <ellipse cx="12.5" cy="17.5" rx="2.5" ry="1.3"/>
    </svg>
  ),
  '🐇': ( // кролик
    <svg viewBox="0 0 24 24" {...P}>
      <ellipse cx="9" cy="7" rx="2" ry="5"/>
      <ellipse cx="15" cy="6" rx="2" ry="5"/>
      <circle cx="12" cy="16" r="6"/>
      <circle cx="10.5" cy="15" r=".5" fill="currentColor" stroke="none"/>
      <circle cx="13.5" cy="15" r=".5" fill="currentColor" stroke="none"/>
      <path d="M11 17.5q1 .8 2 0"/>
    </svg>
  ),
  '🦜': ( // птица
    <svg viewBox="0 0 24 24" {...P}>
      <ellipse cx="12" cy="13" rx="5" ry="6"/>
      <path d="M12 7a5 5 0 0 0-5-5"/>
      <path d="M17 9a5 5 0 0 0-5-5"/>
      <path d="M9 11l-2 2 2.5 1"/>
      <circle cx="13.5" cy="11" r=".6" fill="currentColor" stroke="none"/>
      <path d="M14 13.5l2.5.5-1 2"/>
    </svg>
  ),
  '🐄': ( // корова / фермерские
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M7 5 5 2M17 5l2-3"/>
      <path d="M6 5q-2 2-2 5a8 8 0 0 0 16 0q0-3-2-5"/>
      <path d="M6 5h12"/>
      <circle cx="10" cy="11" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="11" r=".6" fill="currentColor" stroke="none"/>
      <path d="M10 14q2 1.5 4 0"/>
      <path d="M10 16v2M14 16v2"/>
    </svg>
  ),
  '🐐': ( // козы / фермерские
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M8 5 6 2M16 5l2-3"/>
      <path d="M7 5q-3 2-3 6a8 8 0 0 0 16 0q0-4-3-6"/>
      <path d="M7 5h10"/>
      <circle cx="10" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <path d="M11 15q1 1 2 0"/>
      <path d="M12 17v3"/>
    </svg>
  ),
  '🐾': ( // другие (лапа)
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="7" cy="10" r="2"/>
      <circle cx="12" cy="8" r="2"/>
      <circle cx="17" cy="10" r="2"/>
      <circle cx="9.5" cy="6.5" r="1.2"/>
      <circle cx="14.5" cy="6.5" r="1.2"/>
      <path d="M12 22c-3.5 0-6-2.5-5-5.5l2-3a3 3 0 0 1 6 0l2 3c1 3-1.5 5.5-5 5.5z"/>
    </svg>
  ),
};

interface Service {
  id: number; name: string; description: string;
  price_from: number; price_to: number; duration_minutes: number; icon: string;
}

// Social proof data (service-specific content, keyed by Russian service name fragment).
// Stats values are language-neutral numbers; labels are in Russian because the
// service data itself comes from the Russian database.
const PROOF: Record<string, {
  stats: { val: string; label: string }[];
  animals: { emoji: string; kind: string; count: string }[];
  bullets: string[];
  faq: { q: string; a: string }[];
}> = {
  'Капельница': {
    stats: [
      { val: '847', label: 'питомцев прошли капельницу' },
      { val: '98%', label: 'положительный результат' },
      { val: '45 мин', label: 'среднее время процедуры' },
      { val: '24/7', label: 'доступно в любое время' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '412' },
      { emoji: '🐶', kind: 'Собак', count: '284' },
      { emoji: '🐇', kind: 'Кроликов', count: '97' },
      { emoji: '🐄', kind: 'Фермерских', count: '54' },
    ],
    bullets: [
      'Регидратация при обезвоживании и рвоте',
      'Поддерживающая терапия при хронических болезнях',
      'Введение антибиотиков и витаминных комплексов',
      'Детоксикация при отравлениях',
      'Послеоперационное восстановление',
    ],
    faq: [
      { q: 'Больно ли животному?', a: 'Катетер устанавливается за несколько секунд. Большинство животных спокойно переносят процедуру дома, в привычной обстановке — это намного лучше, чем клиника.' },
      { q: 'Сколько времени занимает?', a: 'От 30 до 90 минут в зависимости от объёма и препаратов. Врач будет рядом всё время.' },
      { q: 'Нужно ли готовить животное?', a: 'Нет специальной подготовки. Просто держите питомца в спокойной обстановке.' },
    ],
  },
  'Передержка': {
    stats: [
      { val: '630', label: 'животных на передержке' },
      { val: '4.9 / 5', label: 'средняя оценка владельцев' },
      { val: '8–72 ч', label: 'длительность по запросу' },
      { val: '100%', label: 'под наблюдением ветеринара' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '241' },
      { emoji: '🐶', kind: 'Собак', count: '198' },
      { emoji: '🐇', kind: 'Кроликов', count: '112' },
      { emoji: '🦜', kind: 'Птиц', count: '79' },
    ],
    bullets: [
      'Питомец под наблюдением лицензированного ветеринара',
      'Ежечасные фотоотчёты владельцу в Telegram',
      'Кормление по вашему расписанию',
      'Экстренная помощь включена в стоимость',
      'Подходит для постоперационного периода',
    ],
    faq: [
      { q: 'Что нужно взять с собой?', a: 'Корм, миску, любимую игрушку или лежанку. Запах родного дома успокаивает животное.' },
      { q: 'Можно ли получать фото?', a: 'Да, мы отправляем фотоотчёты в удобный мессенджер так часто, как вы хотите.' },
      { q: 'Что если питомцу станет плохо?', a: 'Ветеринар рядом 24/7. Любая ситуация будет купирована немедленно с уведомлением вас.' },
    ],
  },
  'Выгул': {
    stats: [
      { val: '890', label: 'успешных прогулок' },
      { val: '60 мин', label: 'стандартная прогулка' },
      { val: '0', label: 'потерянных животных' },
      { val: '5 км', label: 'средний маршрут' },
    ],
    animals: [
      { emoji: '🐶', kind: 'Собак малых пород', count: '340' },
      { emoji: '🐕', kind: 'Собак средних пород', count: '385' },
      { emoji: '🦮', kind: 'Крупных пород', count: '165' },
      { emoji: '🐐', kind: 'Фермерских', count: '0' },
    ],
    bullets: [
      'GPS-трекинг маршрута в реальном времени',
      'Выгульщик — ветеринар или сертифицированный кинолог',
      'Отчёт о прогулке и самочувствии после',
      'Регулярный выгул по расписанию',
      'Социализация с другими собаками по желанию',
    ],
    faq: [
      { q: 'Как я узнаю, где моя собака?', a: 'После начала прогулки вы получаете ссылку на GPS-трек. Вся прогулка сохраняется в вашем профиле.' },
      { q: 'Мой пёс агрессивен к другим собакам?', a: 'Укажите это при заказе — мы подберём маршрут без контакта с другими животными.' },
      { q: 'В дождь тоже гуляете?', a: 'Да, при любой погоде. У выгульщика есть дождевик и антискользящий поводок.' },
    ],
  },
  'Осмотр': {
    stats: [
      { val: '740', label: 'осмотров проведено' },
      { val: '97%', label: 'точный диагноз с первого раза' },
      { val: '40 мин', label: 'средний осмотр' },
      { val: '< 60 мин', label: 'ветеринар у вас дома' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '287' },
      { emoji: '🐶', kind: 'Собак', count: '261' },
      { emoji: '🐇', kind: 'Кроликов', count: '118' },
      { emoji: '🐄', kind: 'Фермерских', count: '74' },
    ],
    bullets: [
      'Полный клинический осмотр всех систем',
      'Измерение температуры, пульса, давления',
      'Постановка предварительного диагноза',
      'Назначение анализов при необходимости',
      'Рекомендации по питанию и уходу',
    ],
    faq: [
      { q: 'Чем домашний осмотр лучше клиники?', a: 'Питомец в привычной обстановке — нет стресса от дороги и ожидания. Ветеринар видит реальные условия жизни животного.' },
      { q: 'Возьмут ли анализы?', a: 'Да, при необходимости врач возьмёт кровь, мочу или мазок прямо у вас дома.' },
    ],
  },
  'Вакцинация': {
    stats: [
      { val: '860', label: 'вакцинаций проведено' },
      { val: '100%', label: 'лицензированные вакцины' },
      { val: '20 мин', label: 'быстро и безболезненно' },
      { val: '0', label: 'серьёзных реакций' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '318' },
      { emoji: '🐶', kind: 'Собак', count: '274' },
      { emoji: '🐇', kind: 'Кроликов', count: '143' },
      { emoji: '🐄', kind: 'Фермерских', count: '125' },
    ],
    bullets: [
      'Вакцины из сертифицированных хранилищ (холодовая цепь)',
      'Запись в ветеринарный паспорт',
      'Напоминание о следующей прививке',
      'Осмотр перед вакцинацией включён',
      'Все виды: комплексные, бешенство, лишай',
    ],
    faq: [
      { q: 'Нужна ли подготовка?', a: 'Животное должно быть клинически здоровым. За 10–14 дней до — обработка от глистов.' },
      { q: 'Какие вакцины используете?', a: 'Нобивак, Мультикан, Квадрикат, Фелиген — только зарегистрированные в РФ препараты.' },
    ],
  },
  'Кастрация': {
    stats: [
      { val: '620', label: 'кастраций проведено' },
      { val: '99.8%', label: 'без осложнений' },
      { val: '90 мин', label: 'длительность операции' },
      { val: '3–5 дней', label: 'восстановление' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Котов', count: '298' },
      { emoji: '🐶', kind: 'Собак', count: '217' },
      { emoji: '🐇', kind: 'Кроликов', count: '68' },
      { emoji: '🐐', kind: 'Фермерских', count: '37' },
    ],
    bullets: [
      'Выездная операционная — стерильные условия',
      'Общий наркоз с контролем анестезиолога',
      'Послеоперационный осмотр на следующий день',
      'Обезболивающие препараты включены',
      'Швы снимаются через 7–10 дней на дому',
    ],
    faq: [
      { q: 'Больно ли это для животного?', a: 'Операция проводится под общим наркозом. Животное ничего не чувствует. После — назначаем обезболивающие.' },
      { q: 'Нужна ли подготовка?', a: 'Голодная диета 8–12 часов до операции. Мы уточним все детали при записи.' },
      { q: 'Когда можно кормить после операции?', a: 'Через 4–6 часов после выхода из наркоза. Лёгкая пища первые 2 дня.' },
    ],
  },
  'Стерилизация': {
    stats: [
      { val: '510', label: 'стерилизаций проведено' },
      { val: '99.6%', label: 'без осложнений' },
      { val: '2 часа', label: 'длительность операции' },
      { val: '7–10 дней', label: 'восстановление' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '241' },
      { emoji: '🐶', kind: 'Собак', count: '178' },
      { emoji: '🐇', kind: 'Крольчих', count: '56' },
      { emoji: '🐐', kind: 'Фермерских', count: '35' },
    ],
    bullets: [
      'Полостная операция в стерильных выездных условиях',
      'Опытный хирург и анестезиолог',
      'Контроль жизненных показателей во время операции',
      'Защитный воротник и попона включены',
      'Два послеоперационных осмотра на дому',
    ],
    faq: [
      { q: 'В каком возрасте лучше стерилизовать?', a: 'Оптимально — с 8 до 12 месяцев, до первой течки. Снижает риск онкологии молочных желёз на 90%.' },
      { q: 'Можно ли делать дома?', a: 'Да. Наша выездная операционная полностью оснащена. Питомец остаётся в привычной обстановке и быстрее восстанавливается.' },
      { q: 'Что включено в стоимость?', a: 'Предоперационный осмотр, наркоз, операция, шовный материал, два осмотра после, обезболивание на 3 дня.' },
    ],
  },
  'Скорая': {
    stats: [
      { val: '780', label: 'экстренных вызовов' },
      { val: '< 45 мин', label: 'среднее время прибытия' },
      { val: '24/7', label: 'без выходных и праздников' },
      { val: '94%', label: 'питомцев спасены' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '312' },
      { emoji: '🐶', kind: 'Собак', count: '289' },
      { emoji: '🐇', kind: 'Кроликов', count: '97' },
      { emoji: '🐄', kind: 'Фермерских', count: '82' },
    ],
    bullets: [
      'Экстренный выезд в любое время суток',
      'Купирование болевого синдрома',
      'Первичная стабилизация состояния',
      'Транспортировка при необходимости',
      'Связь с врачом до его приезда',
    ],
    faq: [
      { q: 'За сколько приедет ветеринар?', a: 'Среднее время — 45 минут. Ночью и в выходные — не дольше 60 минут.' },
      { q: 'Что делать пока ждём?', a: 'Врач даст инструкции по телефону сразу после приёма вызова.' },
    ],
  },
};

function getProof(name: string) {
  for (const key of Object.keys(PROOF)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return PROOF[key];
  }
  return {
    stats: [
      { val: '900+', label: 'выполнено процедур' },
      { val: '4.9 / 5', label: 'оценка владельцев' },
      { val: '24/7', label: 'доступно всегда' },
      { val: '< 60 мин', label: 'ветеринар у вас' },
    ],
    animals: [
      { emoji: '🐱', kind: 'Кошек', count: '780' },
      { emoji: '🐶', kind: 'Собак', count: '690' },
      { emoji: '🐾', kind: 'Других', count: '600' },
    ],
    bullets: ['Лицензированные специалисты', 'Результаты в личном кабинете', 'Гарантия качества'],
    faq: [{ q: 'Как вызвать?', a: 'Нажмите «Вызвать ветеринара», выберите услугу и укажите адрес. Займёт меньше 2 минут.' }],
  };
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [service, setService] = useState<Service | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    getServices().then((list: Service[]) => {
      setAllServices(list);
      const found = list.find((s) => s.id === Number(id));
      setService(found || null);
    });
  }, [id]);

  if (!service) return (
    <div className="min-h-screen bg-[#060d06] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
    </div>
  );

  const proof = getProof(service.name);

  return (
    <div className="min-h-screen bg-[#060d06] text-white pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors mb-10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('service.allServices')}
        </Link>

        {/* Hero */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <div className="mb-6 w-16 h-16 rounded-2xl flex items-center justify-center text-green-400" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <ServiceIcon name={service.name} size={36} />
            </div>
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-6 h-px bg-amber-400" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">{t('service.label')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">{service.name}</h1>
            <p className="text-white/50 text-lg leading-relaxed mb-8">{service.description}</p>
            <div className="flex items-center gap-6 mb-8">
              <div>
                <div className="text-2xl font-black text-green-400">{t('service.from')}{service.price_from.toLocaleString()} ₽</div>
                <div className="text-white/25 text-xs mt-0.5">{t('service.upTo')}{service.price_to.toLocaleString()} ₽</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-2xl font-black text-white">{service.duration_minutes} {t('service.min')}</div>
                <div className="text-white/25 text-xs mt-0.5">{t('service.duration')}</div>
              </div>
            </div>
            <Link to={user ? '/order' : '/register'} className="btn-gold inline-flex items-center gap-3 text-base py-4 px-8 font-bold">
              {t('service.callVet')}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {proof.stats.map((s, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <AnimatedNumber value={s.val} className="text-2xl font-black text-green-400 mb-1" />
                <div className="text-xs text-white/35 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* By animal type */}
        <div className="mb-20">
          <h2 className="text-2xl font-black mb-6">{t('service.helped')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {proof.animals.map((a, i) => (
              <div key={i} className="rounded-2xl p-5 text-center" style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}>
                <div className="w-12 h-12 mx-auto mb-3 text-green-400/70">
                  {ANIMAL_ICON[a.emoji] ?? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
                      <circle cx="12" cy="12" r="8"/>
                      <path d="M12 8v4M12 16h.01"/>
                    </svg>
                  )}
                </div>
                <AnimatedNumber value={a.count} className="text-xl font-black text-white" />
                <div className="text-xs text-white/35 mt-1">{a.kind}</div>
              </div>
            ))}
          </div>
        </div>

        {/* What's included */}
        <div className="grid md:grid-cols-2 gap-10 mb-20">
          <div>
            <h2 className="text-2xl font-black mb-6">{t('service.included')}</h2>
            <ul className="space-y-3">
              {proof.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="rgba(74,222,128,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className="text-white/70 text-sm leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Urgency banner */}
          <div className="rounded-2xl p-6 flex flex-col justify-between" style={{ background: 'linear-gradient(135deg,rgba(74,222,128,0.07),rgba(251,191,36,0.05))', border: '1px solid rgba(74,222,128,0.15)' }}>
            <div>
              <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">{t('service.urgencyTitle')}</div>
              <p className="text-white/70 text-sm leading-relaxed mb-4">{t('service.urgencyDesc')}</p>
              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {t('service.onlineNow')}
              </div>
            </div>
            <Link to={user ? '/order' : '/register'} className="btn-gold mt-5 text-sm py-3 px-6 font-bold text-center">
              {t('service.callNow')}
            </Link>
          </div>
        </div>

        {/* FAQ */}
        {proof.faq.length > 0 && (
          <div className="mb-20">
            <h2 className="text-2xl font-black mb-6">{t('service.faqTitle')}</h2>
            <div className="space-y-3">
              {proof.faq.map((item, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                    style={{ background: openFaq === i ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.03)' }}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-white/90 text-sm pr-4">{item.q}</span>
                    <svg className={`flex-shrink-0 w-4 h-4 text-white/30 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other services */}
        <div>
          <h2 className="text-2xl font-black mb-6">{t('service.others')}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allServices.filter(s => s.id !== service.id).slice(0, 6).map((s) => (
              <Link key={s.id} to={`/service/${s.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="flex-shrink-0 text-green-400/60"><ServiceIcon name={s.name} size={20} /></span>
                <div>
                  <div className="text-sm font-semibold text-white/80">{s.name}</div>
                  <div className="text-xs text-green-400 mt-0.5">{t('service.from')}{s.price_from.toLocaleString()} ₽</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
