import React, { useEffect, useMemo, useState } from 'react';
import { LOC } from '../utils/domTranslate';
import { createPortal } from 'react-dom';
import { Tile3D } from '../components/MobileHub';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPetByPassport } from '../api';

/* ───────────────────────── Данные питомца-примера ───────────────────────── */

const PET = {
  passportId: 'VD-21-004217',
  name: 'Марс',
  nameLatin: 'MARS',
  species: 'Собака',
  breed: 'Австралийская овчарка',
  breedLatin: 'AUSTRALIAN SHEPHERD',
  sex: 'Самец',
  birth: '2021-03-12',
  color: 'Красный мерль',
  weight: 24.6,
  chip: '643 098 100 457 712',
  owner: 'Александр Морозов',
  issued: '12.05.2021, Санкт-Петербург',
  photo: '/passport/mars.jpg',
};

const TRIPS = [
  { flag: '🇷🇺', country: 'Россия', city: 'Санкт-Петербург', period: 'март 2021', note: 'Родился. Чипирован, первые прививки и паспорт.' },
  { flag: '🇬🇪', country: 'Грузия', city: 'Тбилиси', period: 'июль 2023', note: 'Сняли клеща. Анализ на пироплазмоз — отрицательный.' },
  { flag: '🇹🇷', country: 'Турция', city: 'Анталья', period: 'апр — июн 2024', note: 'Солнечный дерматит носа. Вылечен за 10 дней.' },
  { flag: '🇦🇪', country: 'ОАЭ', city: 'Дубай', period: 'ноя 2024 — мар 2025', note: 'Тест на антитела к бешенству для въезда: 2.8 МЕ/мл.' },
  { flag: '🇷🇸', country: 'Сербия', city: 'Белград', period: 'июль 2025', note: 'Порез подушечки лапы, 3 шва. Зажило без следа.' },
  { flag: '🇷🇺', country: 'Россия', city: 'Москва', period: 'с 2025 — сейчас', note: 'Дом. Наблюдается в ВетДом, врачи приезжают на дом.' },
];

const MEDS = [
  { name: 'Бравекто 1000 мг', dose: '1 таблетка раз в 12 недель', why: 'Защита от клещей и блох' },
  { name: 'Омега-3 для собак', dose: '1 капсула в день с едой', why: 'Суставы, кожа и шерсть' },
  { name: 'Гипоаллергенный корм', dose: 'Постоянно, без курицы', why: 'Контроль пищевой аллергии' },
];

const UPCOMING = [
  { date: '2026-12-15', title: 'Дегельминтизация', sub: 'Мильбемакс, 2 таблетки' },
  { date: '2026-12-25', title: 'Обработка от клещей', sub: 'Бравекто 1000 мг' },
  { date: '2027-03-14', title: 'Ежегодная вакцинация', sub: 'Врач приедет на дом' },
];

const VACCINES = [
  { name: 'Бешенство', drug: 'Нобивак Rabies', date: '2026-03-14', until: '2027-03-14' },
  { name: 'Чума, парвовирус, гепатит, лептоспироз', drug: 'Нобивак DHPPi + L4', date: '2026-03-14', until: '2027-03-14' },
  { name: 'Титр антител к бешенству', drug: '2.8 МЕ/мл (норма ≥ 0.5)', date: '2024-09-20', until: null },
  { name: 'Клещи и блохи', drug: 'Бравекто 1000 мг', date: '2026-10-02', until: '2026-12-25' },
  { name: 'Гельминты', drug: 'Мильбемакс', date: '2026-09-15', until: '2026-12-15' },
];

const WEIGHT = [
  { d: 'сен 2021', v: 15.2 }, { d: 'мар 2022', v: 21.8 }, { d: 'мар 2023', v: 23.4 },
  { d: 'мар 2024', v: 24.9 }, { d: 'мар 2025', v: 26.1 }, { d: 'мар 2026', v: 25.0 }, { d: 'окт 2026', v: 24.6 },
];

const VISITS = [
  { date: '2026-10-08', flag: '🇷🇺', place: 'Москва · на дому', vet: 'Анна Соколова', home: true,
    title: 'Плановый осмотр', diagnosis: 'Клинически здоров. Вес 24.6 кг — в норме.', treatment: 'Обработка Бравекто, рекомендации по нагрузке.' },
  { date: '2026-03-14', flag: '🇷🇺', place: 'Москва · на дому', vet: 'Анна Соколова', home: true,
    title: 'Вакцинация + аллерготест', diagnosis: 'Пищевая аллергия на белок курицы.', treatment: 'Нобивак Rabies, DHPPi + L4. Перевод на гипоаллергенный корм.' },
  { date: '2025-07-22', flag: '🇷🇸', place: 'Белград, Сербия', vet: 'Dr. Milan Petrović',
    title: 'Травма лапы', diagnosis: 'Резаная рана подушечки передней лапы.', treatment: '3 шва, Синулокс 7 дней, защитный ботинок.' },
  { date: '2025-01-18', flag: '🇦🇪', place: 'Дубай, ОАЭ', vet: 'Dr. Sarah Khan',
    title: 'Осмотр в жарком климате', diagnosis: 'Здоров. Признаков перегрева нет.', treatment: 'Прогулки до 9:00 и после 18:00, охлаждающая подстилка.' },
  { date: '2024-09-20', flag: '🇷🇺', place: 'Москва', vet: 'Илья Петров',
    title: 'Подготовка к перелёту', diagnosis: 'Титр антител к бешенству 2.8 МЕ/мл.', treatment: 'Справка формы №1, международный сертификат.' },
  { date: '2024-05-05', flag: '🇹🇷', place: 'Анталья, Турция', vet: 'Dr. Elif Yılmaz',
    title: 'Покраснение носа', diagnosis: 'Солнечный дерматит.', treatment: 'Заживляющая мазь, солнцезащитный бальзам для собак.' },
  { date: '2023-07-14', flag: '🇬🇪', place: 'Тбилиси, Грузия', vet: 'Dr. Nino Beridze',
    title: 'Укус клеща', diagnosis: 'Клещ удалён. Пироплазмоз — отрицательно.', treatment: 'Наблюдение 10 дней, без осложнений.' },
  { date: '2021-05-12', flag: '🇷🇺', place: 'Санкт-Петербург', vet: 'Марина Яковлева',
    title: 'Первый осмотр щенка', diagnosis: 'Здоров, развитие по возрасту.', treatment: 'Чипирование, первая вакцинация, выдача ветеринарного паспорта.' },
];

/* ───────────────────────── Вспомогательные функции ───────────────────────── */

const fmt = (iso: string) => new Date(iso).toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' });
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

function ageText(birth: string) {
  const b = new Date(birth), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) m -= 1;
  const y = Math.floor(m / 12), mm = m % 12;
  const yw = y % 10 === 1 && y % 100 !== 11 ? 'год' : [2, 3, 4].includes(y % 10) && ![12, 13, 14].includes(y % 100) ? 'года' : 'лет';
  return { short: `${y} ${yw}`, full: mm ? `${y} ${yw} ${mm} мес.` : `${y} ${yw}` };
}

function mrz() {
  const l1 = `PET<RUS<${PET.nameLatin}<<${PET.breedLatin.replace(/ /g, '<')}`.padEnd(44, '<');
  const l2 = `${PET.passportId.replace(/-/g, '')}<RUS${PET.birth.slice(2).replace(/-/g, '')}M${PET.chip.replace(/ /g, '')}`.padEnd(44, '<');
  return [l1.slice(0, 44), l2.slice(0, 44)];
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-3">
    <div className="w-6 h-px bg-amber-400" />
    <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">{children}</span>
  </div>
);

function vaccineStatus(until: string | null) {
  if (!until) return { label: 'Действителен', cls: 'bg-green-500/15 text-green-300 border-green-400/30', icon: '✓' };
  const d = daysUntil(until);
  if (d < 0) return { label: 'Просрочено', cls: 'bg-red-500/15 text-red-300 border-red-400/30', icon: '!' };
  if (d <= 45) return { label: `Через ${d} дн.`, cls: 'bg-amber-400/15 text-amber-200 border-amber-400/30', icon: '◷' };
  return { label: 'Действует', cls: 'bg-green-500/15 text-green-300 border-green-400/30', icon: '✓' };
}

/* ───────────────────────── Поиск по ID ───────────────────────── */

interface FoundPet { passport_id: string; name: string; species: string; breed?: string; owner_name: string; photo_url?: string; age_years?: number; visits: unknown[] }

function PassportSearch() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<FoundPet | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setRes(null);
    if (!user) { setErr('Войдите в аккаунт, чтобы искать питомцев по ID'); return; }
    setLoading(true);
    try { setRes(await getPetByPassport(q.trim())); }
    catch { setErr('Питомец с таким ID не найден'); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full md:w-auto">
      <form onSubmit={search} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID питомца, напр. VD-21-004217"
          className="input py-2.5 text-sm font-mono md:w-72" />
        <button className="btn-gold py-2.5 px-5 text-sm whitespace-nowrap" disabled={!q.trim() || loading}>
          {loading ? '…' : 'Найти'}
        </button>
      </form>
      {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
      {res && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 border border-green-400/30 p-3">
          {res.photo_url && <img src={res.photo_url} alt="" className="w-11 h-11 rounded-lg object-cover" />}
          <div className="text-sm">
            <div className="font-bold text-white">{res.name} <span className="font-mono text-xs text-green-400">{res.passport_id}</span></div>
            <div className="text-white/50 text-xs">{res.species}{res.breed ? `, ${res.breed}` : ''} · владелец: {res.owner_name} · визитов: {res.visits.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── График веса ───────────────────────── */

function WeightChart() {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, pl = 36, pr = 16, pt = 16, pb = 30;
  const min = 12, max = 28;
  const x = (i: number) => pl + (i * (W - pl - pr)) / (WEIGHT.length - 1);
  const y = (v: number) => pt + ((max - v) * (H - pt - pb)) / (max - min);
  const path = WEIGHT.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  const area = `${path} L${x(WEIGHT.length - 1)},${H - pb} L${x(0)},${H - pb} Z`;
  const last = WEIGHT[WEIGHT.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Вес Марса: от ${WEIGHT[0].v} кг (${WEIGHT[0].d}) до ${last.v} кг (${last.d}). Норма породы 22–26 кг.`}>
        <defs>
          <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7CB842" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7CB842" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* норма породы */}
        <rect x={pl} y={y(26)} width={W - pl - pr} height={y(22) - y(26)} fill="rgba(255,255,255,0.04)" />
        <text x={W - pr - 4} y={y(26) + 13} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">норма породы 22–26 кг</text>
        {[15, 20, 25].map((g) => (
          <g key={g}>
            <line x1={pl} x2={W - pr} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.06)" />
            <text x={pl - 8} y={y(g) + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">{g}</text>
          </g>
        ))}
        <path d={area} fill="url(#wfill)" />
        <path d={path} fill="none" stroke="#7CB842" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} stroke="rgba(255,255,255,0.2)" />}
        {WEIGHT.map((p, i) => (
          <g key={p.d}>
            <circle cx={x(i)} cy={y(p.v)} r={hover === i ? 6 : 4} fill="#7CB842" stroke="#241911" strokeWidth="2" />
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)">{p.d}</text>
            <rect x={x(i) - 40} y={pt} width={80} height={H - pt - pb} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          </g>
        ))}
        <text x={x(WEIGHT.length - 1) - 8} y={y(last.v) - 12} textAnchor="end" fontSize="12" fontWeight="700" fill="#fff">{last.v} кг</text>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-[#2A1D14] border border-white/10 px-3 py-1.5 text-xs shadow-xl"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(WEIGHT[hover].v) / H) * 100}%`, marginTop: -10 }}>
          <div className="text-white/50">{WEIGHT[hover].d}</div>
          <div className="font-bold text-white">{WEIGHT[hover].v} кг</div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Страница ───────────────────────── */

/* ───────────────────────── Мобильная версия: экран приложения ───────────────────────── */

type Sec = 'data' | 'vaccines' | 'parasites' | 'meds' | 'visits' | 'weight' | 'trips' | 'search';

const TILES: { k: Sec; label: string; icon: string; bg: string; ring: string }[] = [
  { k: 'data', label: 'Паспорт питомца', icon: '🪪', bg: 'bg-amber-400/15', ring: 'ring-amber-300/30' },
  { k: 'vaccines', label: 'Прививки', icon: '💉', bg: 'bg-green-500/15', ring: 'ring-green-400/30' },
  { k: 'parasites', label: 'Паразиты', icon: '🛡️', bg: 'bg-sky-400/15', ring: 'ring-sky-300/30' },
  { k: 'meds', label: 'Лекарства', icon: '💊', bg: 'bg-red-400/15', ring: 'ring-red-300/30' },
  { k: 'visits', label: 'Визиты', icon: '🩺', bg: 'bg-white/10', ring: 'ring-white/15' },
  { k: 'weight', label: 'Вес', icon: '⚖️', bg: 'bg-purple-400/15', ring: 'ring-purple-300/30' },
  { k: 'trips', label: 'Поездки', icon: '✈️', bg: 'bg-[#FACC15]/15', ring: 'ring-[#FACC15]/30' },
  { k: 'search', label: 'Найти', icon: '🔎', bg: 'bg-white/10', ring: 'ring-white/15' },
];

function Sheet({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet relative w-full max-h-[88vh] overflow-y-auto overscroll-contain rounded-t-3xl bg-[#2A1D14] border-t border-white/10 shadow-2xl screen-in"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="sticky top-0 z-10 bg-[#2A1D14]/95 backdrop-blur px-5 pt-3 pb-3 border-b border-white/[0.06]">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-lg font-black flex-1">{title}</h2>
            <button onClick={onClose} aria-label="Закрыть" className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/70 active:scale-95">✕</button>
          </div>
        </div>
        <div className="px-5 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function MobileMedCard() {
  const age = useMemo(() => ageText(PET.birth), []);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<Sec | null>(null);
  const countries = new Set(TRIPS.map((t) => t.country)).size;
  const next = UPCOMING[0];
  const copyId = () => {
    navigator.clipboard?.writeText(PET.passportId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };
  const tile = TILES.find((t) => t.k === open);
  const TONE: Record<Sec, string> = { data: 'amber', vaccines: 'green', parasites: 'sky', meds: 'red', visits: 'white', weight: 'purple', trips: 'yellow', search: 'white' };
  const SUB: Record<Sec, string> = {
    data: `${PET.breed.split(' ')[0]}, ${age.short}`, vaccines: 'все в порядке', parasites: `через ${daysUntil(next.date)} дн.`,
    meds: `${MEDS.length} назначения`, visits: `${VISITS.length} приёмов`, weight: `${PET.weight} кг`, trips: `${countries} стран`, search: 'по ID',
  };
  const parasites = VACCINES.filter((v) => /Клещ|Гельминт/.test(v.name));
  const vaccines = VACCINES.filter((v) => !/Клещ|Гельминт/.test(v.name));

  const VaccineRow = ({ v }: { v: typeof VACCINES[number] }) => {
    const st = vaccineStatus(v.until);
    return (
      <div className="py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-snug">{v.name}</div>
          <div className="text-xs text-white/50 leading-snug mt-0.5">{v.drug} · {new Date(v.date).toLocaleDateString(LOC)}{v.until ? ` → до ${new Date(v.until).toLocaleDateString(LOC)}` : ''}</div>
        </div>
        <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${st.cls}`}>{st.icon} {st.label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] bg-gradient-to-b from-[#3B2A1E] via-[#2A1D14] to-[#1F150E] text-white px-4 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-4 flex flex-col gap-3">
      {/* Карточка питомца */}
      <div className="rounded-3xl bg-cream text-coffee-900 p-3.5 flex gap-3.5 shadow-xl shadow-black/30">
        <div className="relative flex-shrink-0">
          <img src={PET.photo} alt={PET.name} className="w-[84px] h-[100px] rounded-2xl object-cover border-[3px] border-white shadow" />
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold shadow whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Здоров
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-[0.2em] text-coffee-400">Ветпаспорт · Pet passport</div>
          <div className="text-[26px] font-black leading-none mt-1">{PET.name}</div>
          <div className="text-green-700 font-semibold text-[13px] mt-1 leading-snug">{PET.breed}</div>
          <button onClick={copyId} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-green-500/50 bg-white/70 px-2 py-1 active:scale-95">
            <span className="font-mono font-black text-[13px] tracking-wider">{PET.passportId}</span>
            <span className="text-[10px] text-green-700 font-bold">{copied ? '✓' : '⧉'}</span>
          </button>
        </div>
      </div>

      {/* Коротко */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { v: age.short, l: 'возраст' },
          { v: `${PET.weight}\u00A0кг`, l: 'вес в норме' },
          { v: '5 / 5', l: 'прививок' },
        ].map((x) => (
          <div key={x.l} className="glass3d rounded-2xl bg-white/[0.07] border border-white/15 py-2.5">
            <div className="text-[17px] font-black whitespace-nowrap">{x.v}</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wide">{x.l}</div>
          </div>
        ))}
      </div>

      {/* Ближайшее напоминание */}
      <button onClick={() => setOpen('parasites')} className="[@media(max-height:700px)]:hidden flex items-center gap-3 rounded-2xl bg-[#FACC15]/12 border border-[#FACC15]/35 px-3.5 py-2.5 text-left active:scale-[0.98] transition-transform">
        <span className="w-11 flex-shrink-0 rounded-xl bg-[#FACC15] text-[#1E140D] text-center py-1">
          <span className="block text-base font-black leading-none">{new Date(next.date).getDate()}</span>
          <span className="block text-[9px] font-bold uppercase">{new Date(next.date).toLocaleDateString(LOC, { month: 'short' })}</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold leading-snug">{next.title}</span>
          <span className="block text-[11px] text-white/60 leading-snug">{next.sub} · через {daysUntil(next.date)} дн.</span>
        </span>
        <span className="text-[#FACC15] font-bold">›</span>
      </button>

      {/* Разделы */}
      <div className="grid grid-cols-3 gap-2.5 mt-1">
        {TILES.map((t, i) => (
          <Tile3D key={t.k} wide={i === 0} icon={t.icon} label={t.label} sub={SUB[t.k]} tone={TONE[t.k]} onClick={() => setOpen(t.k)} />
        ))}
      </div>

      <Link to="/register" className="mt-auto rounded-2xl bg-green-500 active:bg-green-600 text-center font-bold text-sm py-3 [@media(max-height:700px)]:hidden">
        Завести такой паспорт своему питомцу →
      </Link>

      {/* ── Окна разделов ── */}
      {open && tile && (
        <Sheet title={tile.k === 'trips' ? `Путешествия · ${countries} стран` : tile.label} icon={tile.icon} onClose={() => setOpen(null)}>
          {open === 'data' && (
            <div className="rounded-2xl bg-cream text-coffee-900 p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  ['Вид', PET.species], ['Пол', PET.sex], ['Дата рождения', fmt(PET.birth)], ['Возраст', age.full],
                  ['Окрас', PET.color], ['Вес', `${PET.weight} кг`], ['Микрочип', PET.chip], ['Владелец', PET.owner],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-coffee-400">{l}</div>
                    <div className="text-sm font-semibold leading-snug break-words">{v}</div>
                  </div>
                ))}
                <div className="col-span-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-coffee-400">Паспорт выдан</div>
                  <div className="text-sm font-semibold">{PET.issued}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-coffee-200 text-xs text-coffee-600 leading-relaxed">
                Хронических заболеваний нет. Пищевая аллергия на курицу — под контролем диетой.
              </div>
            </div>
          )}
          {open === 'vaccines' && (
            <>
              <p className="text-sm text-white/60 mb-1">Все прививки актуальны — можно путешествовать.</p>
              <div className="divide-y divide-white/10">{vaccines.map((v) => <VaccineRow key={v.name} v={v} />)}</div>
            </>
          )}
          {open === 'parasites' && (
            <>
              <div className="divide-y divide-white/10">{parasites.map((v) => <VaccineRow key={v.name} v={v} />)}</div>
              <div className="text-xs uppercase tracking-wider text-white/40 mt-5 mb-2">Ближайшие события</div>
              <div className="space-y-2">
                {UPCOMING.map((u) => (
                  <div key={u.title} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
                    <div className="w-12 flex-shrink-0 rounded-lg bg-white/5 border border-white/10 text-center py-1">
                      <div className="text-base font-black leading-none">{new Date(u.date).getDate()}</div>
                      <div className="text-[10px] text-white/50">{new Date(u.date).toLocaleDateString(LOC, { month: 'short' })}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-snug">{u.title}</div>
                      <div className="text-xs text-white/50 leading-snug">{u.sub} · через {daysUntil(u.date)} дн.</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {open === 'meds' && (
            <div className="space-y-2.5">
              {MEDS.map((m) => (
                <div key={m.name} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                  <div className="font-bold">{m.name}</div>
                  <div className="text-sm text-white/65 mt-0.5">{m.dose}</div>
                  <div className="text-xs text-amber-200/70 mt-1">{m.why}</div>
                </div>
              ))}
            </div>
          )}
          {open === 'visits' && (
            <div className="space-y-2.5">
              {VISITS.map((v) => (
                <div key={v.date} className={`rounded-2xl p-3.5 border ${v.home ? 'bg-green-500/[0.07] border-green-400/25' : 'bg-white/[0.03] border-white/10'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{v.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold leading-snug">{v.title}</div>
                      <div className="text-xs text-white/50 leading-snug">{fmt(v.date)} · {v.place}</div>
                      <div className="text-xs text-white/40">{v.vet}</div>
                    </div>
                  </div>
                  <div className="text-sm text-white/85 mt-2 leading-snug"><span className="text-white/40 text-xs">Диагноз: </span>{v.diagnosis}</div>
                  <div className="text-sm text-white/70 mt-1 leading-snug"><span className="text-white/40 text-xs">Лечение: </span>{v.treatment}</div>
                </div>
              ))}
            </div>
          )}
          {open === 'weight' && (
            <>
              <div className="flex items-end gap-3 mb-2">
                <div className="text-4xl font-black">{PET.weight}<span className="text-lg text-white/50"> кг</span></div>
                <span className="mb-1.5 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-400/30">в норме 22–26 кг</span>
              </div>
              <p className="text-sm text-white/55 mb-3">В 2025 году вес вышел за норму — врач скорректировал питание, и за год Марс вернулся в форму.</p>
              <WeightChart />
            </>
          )}
          {open === 'trips' && (
            <div className="space-y-2.5">
              {TRIPS.map((t) => (
                <div key={t.city} className="flex gap-3 rounded-2xl bg-cream text-coffee-900 p-3.5">
                  <span className="text-3xl leading-none">{t.flag}</span>
                  <div className="min-w-0">
                    <div className="font-black leading-tight">{t.country} · {t.city}</div>
                    <div className="text-xs text-green-700 font-semibold">{t.period}</div>
                    <div className="text-xs text-coffee-600 mt-1 leading-snug">{t.note}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {open === 'search' && (
            <>
              <p className="text-sm text-white/60 mb-3">Врач в любой стране находит паспорт по ID и видит прививки, аллергии и прошлое лечение.</p>
              <PassportSearch />
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

export default function MedCardPage() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const f = () => setMobile(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return mobile ? <MobileMedCard /> : <DesktopMedCard />;
}

function DesktopMedCard() {
  useReveal();
  const age = useMemo(() => ageText(PET.birth), []);
  const [copied, setCopied] = useState(false);
  const [l1, l2] = mrz();
  const countries = new Set(TRIPS.map((t) => t.country)).size;

  const copyId = () => {
    navigator.clipboard?.writeText(PET.passportId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };


  return (
    <div className="min-h-screen bg-[#1F150E] text-white pt-24 md:pt-[156px] pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* ── Верх: назад + поиск по ID ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-6">← На главную</Link>
            <Eyebrow>Цифровой ветеринарный паспорт</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Вся жизнь питомца — <span className="text-green-400">на одной странице</span></h1>
          </div>
          <PassportSearch />
        </div>

        {/* ── Паспорт: обложка + страница данных ── */}
        <div className="reveal grid lg:grid-cols-[300px_1fr] rounded-3xl overflow-hidden shadow-2xl shadow-black/40 mb-6 border border-white/10">
          {/* обложка */}
          <div className="relative p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#4A3426] via-[#33241A] to-[#1E140D] min-h-[260px]">
            <div className="absolute inset-3 rounded-2xl border border-amber-400/25 pointer-events-none" />
            <div className="text-amber-300/80 text-[10px] font-bold tracking-[0.35em] mb-6">ВЕТДОМ · VETDOM</div>
            <img src="/logo.jpeg" alt="" className="w-20 h-20 rounded-full object-cover border-2 border-amber-400/40 mb-6" />
            <div className="text-amber-200 font-black text-xl tracking-[0.12em] leading-tight">ВЕТЕРИНАРНЫЙ<br />ПАСПОРТ</div>
            <div className="text-amber-300/60 text-[11px] tracking-[0.4em] mt-2">PET PASSPORT</div>
          </div>

          {/* страница данных */}
          <div className="bg-cream text-coffee-900 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative flex-shrink-0 self-start">
                <img src={PET.photo} alt={`${PET.name} — ${PET.breed}`} className="w-40 h-48 md:w-44 md:h-52 rounded-2xl object-cover border-4 border-white shadow-lg" />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-[11px] font-bold shadow whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Здоров
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-coffee-400">Кличка / Name</div>
                    <div className="text-4xl font-black leading-none mt-1">{PET.name}</div>
                    <div className="text-green-700 font-semibold text-sm mt-1.5">{PET.breed} · {age.short}</div>
                  </div>
                  <button onClick={copyId} title="Скопировать ID"
                    className="group text-left rounded-xl border-2 border-dashed border-green-500/50 bg-white/70 hover:bg-white px-4 py-2.5 transition-colors">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-coffee-400">ID питомца</div>
                    <div className="font-mono font-black text-lg text-coffee-900 tracking-wider">{PET.passportId}</div>
                    <div className="text-[10px] text-green-700 font-semibold">{copied ? '✓ Скопировано' : 'Нажмите, чтобы скопировать'}</div>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3.5">
                  {[
                    ['Вид', PET.species], ['Пол', PET.sex], ['Дата рождения', `${fmt(PET.birth)}`],
                    ['Окрас', PET.color], ['Вес', `${PET.weight} кг`], ['Микрочип', PET.chip],
                    ['Владелец', PET.owner], ['Паспорт выдан', PET.issued], ['Возраст', age.full],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-coffee-400">{l}</div>
                      <div className="text-sm font-semibold text-coffee-900 break-words">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* машиночитаемая строка */}
            <div className="mt-7 rounded-xl bg-coffee-100/70 px-4 py-3 font-mono text-[11px] sm:text-xs text-coffee-600 tracking-[0.18em] overflow-hidden">
              <div className="truncate">{l1}</div>
              <div className="truncate">{l2}</div>
            </div>
          </div>
        </div>

        {/* ── Сводка ── */}
        <div className="reveal grid grid-cols-2 md:grid-cols-5 gap-px rounded-2xl overflow-hidden bg-white/10 mb-16" style={{ '--d': '100ms' } as React.CSSProperties}>
          {[
            { v: age.short, l: 'возраст' },
            { v: `${PET.weight} кг`, l: 'вес · в норме' },
            { v: String(countries), l: 'стран посетил' },
            { v: String(VISITS.length), l: 'визитов к врачу' },
            { v: '5 / 5', l: 'прививок актуальны' },
          ].map((s) => (
            <div key={s.l} className="bg-[#271A11] px-5 py-5">
              <div className="text-2xl font-black text-white">{s.v}</div>
              <div className="text-xs text-white/45 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── Сейчас ── */}
        <section className="mb-16">
          <Eyebrow>Сейчас</Eyebrow>
          <h2 className="reveal text-3xl font-black mb-6">Состояние на сегодня</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="reveal rounded-2xl p-6 bg-gradient-to-br from-green-600/25 to-green-900/10 border border-green-400/25">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center text-white text-xl soft-pulse">✓</span>
                <div>
                  <div className="text-xs text-white/50">Здоровье</div>
                  <div className="text-2xl font-black">Здоров</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-white/75">
                <li>• Хронических заболеваний нет</li>
                <li>• Пищевая аллергия на курицу — под контролем диетой</li>
                <li>• Последний осмотр {fmt(VISITS[0].date)} — без замечаний</li>
              </ul>
            </div>

            <div className="reveal rounded-2xl p-6 bg-white/[0.04] border border-white/10" style={{ '--d': '120ms' } as React.CSSProperties}>
              <div className="text-xs text-white/50 mb-1">Принимает сейчас</div>
              <div className="text-2xl font-black mb-4">{MEDS.length} назначения</div>
              <ul className="space-y-3">
                {MEDS.map((m) => (
                  <li key={m.name} className="flex gap-3">
                    <span className="mt-1 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold">{m.name}</div>
                      <div className="text-xs text-white/50">{m.dose} · {m.why}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="reveal rounded-2xl p-6 bg-white/[0.04] border border-white/10" style={{ '--d': '240ms' } as React.CSSProperties}>
              <div className="text-xs text-white/50 mb-1">Ближайшие события</div>
              <div className="text-2xl font-black mb-4">Напомним заранее</div>
              <ul className="space-y-3">
                {UPCOMING.map((u) => (
                  <li key={u.title} className="flex items-center gap-3">
                    <div className="w-14 flex-shrink-0 rounded-lg bg-white/5 border border-white/10 text-center py-1">
                      <div className="text-lg font-black leading-none">{new Date(u.date).getDate()}</div>
                      <div className="text-[10px] text-white/50">{new Date(u.date).toLocaleDateString(LOC, { month: 'short' })}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{u.title}</div>
                      <div className="text-xs text-white/50">{u.sub} · через {daysUntil(u.date)} дн.</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Путешествия ── */}
        <section className="mb-16">
          <Eyebrow>Путешествия</Eyebrow>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-8">
            <h2 className="reveal text-3xl font-black">{countries} стран — одна история болезни</h2>
            <p className="text-white/45 text-sm max-w-md">Врач в любой стране открывает паспорт по ID и видит всё: прививки, аллергии и прошлое лечение.</p>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-amber-400/20" />
            <div className="relative grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {TRIPS.map((t, i) => (
                <div key={t.city} className="reveal" style={{ '--d': `${i * 110}ms` } as React.CSSProperties}>
                  <div className="h-full rounded-2xl bg-cream text-coffee-900 p-4 border-2 border-dashed border-coffee-300 shadow-lg shadow-black/20 hover:rotate-0 transition-transform duration-300"
                    style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl leading-none">{t.flag}</span>
                      <span className="text-[10px] font-bold text-coffee-400">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="font-black text-lg leading-tight">{t.country}</div>
                    <div className="text-xs text-green-700 font-semibold mb-2">{t.city} · {t.period}</div>
                    <p className="text-xs text-coffee-600 leading-snug">{t.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Прививки + вес ── */}
        <section className="grid lg:grid-cols-[1.15fr_1fr] gap-6 mb-16">
          <div className="reveal rounded-2xl bg-white/[0.04] border border-white/10 p-6">
            <Eyebrow>Прививки и обработки</Eyebrow>
            <h2 className="text-2xl font-black mb-5">Можно лететь хоть завтра</h2>
            <div className="divide-y divide-white/10">
              {VACCINES.map((v) => {
                const st = vaccineStatus(v.until);
                return (
                  <div key={v.name} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">{v.name}</div>
                      <div className="text-xs text-white/45">{v.drug} · {new Date(v.date).toLocaleDateString(LOC)}{v.until ? ` → до ${new Date(v.until).toLocaleDateString(LOC)}` : ''}</div>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.icon} {st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reveal rounded-2xl bg-white/[0.04] border border-white/10 p-6" style={{ '--d': '120ms' } as React.CSSProperties}>
            <Eyebrow>Вес</Eyebrow>
            <h2 className="text-2xl font-black mb-1">От щенка до формы чемпиона</h2>
            <p className="text-sm text-white/45 mb-4">В 2025 году вес вышел за норму — врач скорректировал питание, и за год Марс вернулся в форму.</p>
            <WeightChart />
          </div>
        </section>

        {/* ── История визитов ── */}
        <section className="mb-16">
          <Eyebrow>История визитов</Eyebrow>
          <h2 className="reveal text-3xl font-black mb-8">Каждый приём — в одной ленте</h2>
          <div className="relative pl-8 md:pl-10">
            <div className="absolute left-3 md:left-4 top-2 bottom-2 w-px bg-gradient-to-b from-green-400/60 via-white/15 to-transparent" />
            <div className="space-y-4">
              {VISITS.map((v, i) => (
                <div key={v.date} className="reveal relative" style={{ '--d': `${Math.min(i, 4) * 80}ms` } as React.CSSProperties}>
                  <span className={`absolute -left-[26px] md:-left-[30px] top-5 w-3.5 h-3.5 rounded-full border-2 border-[#1F150E] ${v.home ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <div className={`rounded-2xl p-5 border ${v.home ? 'bg-green-500/[0.07] border-green-400/25' : 'bg-white/[0.03] border-white/10'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{v.flag}</span>
                        <div>
                          <div className="font-bold">{v.title}</div>
                          <div className="text-xs text-white/45">{fmt(v.date)} · {v.place} · {v.vet}</div>
                        </div>
                      </div>
                      {v.home && <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-500 text-white">ВетДом · на дому</span>}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-white/40 text-xs uppercase tracking-wider">Диагноз: </span><span className="text-white/85">{v.diagnosis}</span></div>
                      <div><span className="text-white/40 text-xs uppercase tracking-wider">Лечение: </span><span className="text-white/70">{v.treatment}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="reveal rounded-3xl p-8 md:p-12 bg-gradient-to-br from-green-500 via-green-600 to-green-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black mb-2">Заведите такой паспорт своему питомцу</h2>
            <p className="text-white/85">Бесплатно. Уникальный ID, вся история и напоминания — с первого визита.</p>
          </div>
          <Link to="/register" className="flex-shrink-0 inline-flex items-center justify-center bg-coffee-900 hover:bg-coffee-800 text-white font-bold py-4 px-9 rounded-xl transition-colors">
            Создать ветеринарный паспорт →
          </Link>
        </div>
      </div>
    </div>
  );
}
