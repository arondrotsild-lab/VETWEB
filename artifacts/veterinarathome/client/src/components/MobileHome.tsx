import { useEffect, useState } from 'react';
import Icon3D from './Icon3D';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPets, getOrders, getLoyalty, login as apiLogin } from '../api';

// Главный экран мобильного приложения: всё на одном экране, каждая плитка ведёт в свой раздел
interface Pet { id: number; name: string; photo_url?: string }
interface Order { id: number; status: string; service_name: string; pet_name?: string }

const ACTIVE = ['pending', 'confirmed', 'on_the_way', 'arrived', 'in_progress'];
const STATUS: Record<string, string> = {
  pending: 'Ищем ветеринара…', confirmed: 'Врач найден', on_the_way: 'Врач едет к вам',
  arrived: 'Врач у двери', in_progress: 'Идёт приём',
};

const TILES = [
  { to: '/services', label: 'Услуги', icon: '🩺', tone: 'green', bg: '', ring: '' },
  { to: '/medcard', label: 'Ветпаспорт', icon: '📘', tone: 'yellow', bg: '', ring: '' },
  { to: '/shop', label: 'Магазин', icon: '🛍', tone: 'amber', bg: '', ring: '' },
  { to: '/chats', label: 'Чат с врачом', icon: '💬', tone: 'sky', bg: '', ring: '', auth: true },
  { to: '/profile', label: 'Бонусы', icon: '🎁', tone: 'purple', bg: '', ring: '', auth: true },
  { to: '/charity', label: 'Помочь', icon: '❤️', tone: 'pink', bg: '', ring: '' },
  { to: '/history', label: 'Мои заказы', icon: '📋', tone: 'cream', bg: '', ring: '', auth: true },
  { to: '/order', label: 'Скорая 24/7', icon: '🚑', tone: 'red', bg: '', ring: '', urgent: true },
];

export default function MobileHome() {
  const short = window.innerHeight < 700;   // невысокий экран — иконки чуть меньше
  const { user, login } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [entering, setEntering] = useState(false);

  // Быстрый вход в аккаунт Александра прямо с главного экрана
  const quickLogin = async () => {
    setEntering(true);
    try {
      const d = await apiLogin({ phone: '+79990000000', password: 'demo1234' });
      login(d.token, d.user);
    } catch { /* ignore */ } finally { setEntering(false); }
  };
  const [active, setActive] = useState<Order | null>(null);
  const [bonus, setBonus] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getPets().then(setPets).catch(() => {});
    getOrders().then((os: Order[]) => setActive(os.find((o) => ACTIVE.includes(o.status)) ?? null)).catch(() => {});
    getLoyalty().then((l) => setBonus(l.balance)).catch(() => {});
  }, [user]);

  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] bg-gradient-to-b from-[#5A2F1E] via-[#3B2117] to-[#24150E] text-white px-4 pt-[calc(4.5rem+env(safe-area-inset-top))] [@media(max-height:700px)]:pt-[calc(4.25rem+env(safe-area-inset-top))] pb-4 flex flex-col gap-3 [@media(max-height:700px)]:gap-2">
      {/* Приветствие */}
      <div>
        <div className="text-[22px] font-black leading-tight">
          {user ? `${hello}, ${user.name.split(' ')[0]} 👋` : 'Ветеринар на дом 🐾'}
        </div>
        <div className="text-xs text-white/60 mt-0.5 [@media(max-height:700px)]:hidden">📍 Москва, Кутузовский проспект, 8</div>
      </div>

      {/* Личный кабинет */}
      {user ? (
        <Link to="/profile" className="flex items-center gap-3 rounded-2xl bg-white/[0.08] border border-white/10 px-3 py-2.5 active:scale-[0.98] transition-transform">
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-green-500" />
            : <span className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center font-black">{user.name[0]}</span>}
          <div className="flex-1 min-w-0">
            <div className="font-bold leading-tight truncate">{user.name}</div>
            <div className="text-[11px] text-white/60">Личный кабинет · 🐾 статус «Друг»</div>
          </div>
          <span className="text-xs font-bold text-green-300">Кабинет ›</span>
        </Link>
      ) : (
        <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-xl">👤</span>
            <div className="flex-1">
              <div className="font-bold leading-tight">Личный кабинет</div>
              <div className="text-[11px] text-white/60">Питомцы, бонусы, заказы и чат с врачом</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={quickLogin} disabled={entering}
              className="rounded-xl bg-[#FACC15] text-[#1E140D] font-black text-sm py-2.5 active:scale-95 transition-transform">
              {entering ? 'Входим…' : 'Быстрый вход'}
            </button>
            <Link to="/register" className="rounded-xl border border-white/25 text-center font-bold text-sm py-2.5 active:scale-95 transition-transform">Регистрация</Link>
          </div>
        </div>
      )}

      {/* Текущий заказ */}
      {active && (
        <Link to={`/order/${active.id}`} className="flex items-center gap-3 rounded-2xl bg-sky-500/15 border border-sky-400/30 px-4 py-2.5 active:scale-[0.98] transition-transform">
          <span className="relative w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-sky-400 animate-ping" /><span className="absolute inset-0 rounded-full bg-sky-400" /></span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">{STATUS[active.status] ?? 'Заказ в работе'}</div>
            <div className="text-[11px] text-white/60 truncate">{active.service_name}{active.pet_name ? ` · ${active.pet_name}` : ''}</div>
          </div>
          <span className="text-sky-300 text-sm font-bold">Карта ›</span>
        </Link>
      )}

      {/* Главное действие */}
      <Link to="/order" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-green-600 to-green-800 p-4 [@media(max-height:700px)]:p-3.5 active:scale-[0.98] transition-transform">
        <div className="absolute -right-6 -bottom-8 text-[110px] leading-none opacity-20 select-none">🐾</div>
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Врач приедет за 15–60 минут</div>
          <div className="text-2xl [@media(max-height:700px)]:text-xl font-black mt-1">Вызвать ветеринара</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white text-green-700 font-black text-sm px-4 py-2">
            🎤 Расскажите, что случилось <span>›</span>
          </div>
        </div>
      </Link>

      {/* Плитки разделов */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
        {TILES.map((t) => (
          <Link key={t.label} to={t.auth && !user ? '/login' : t.to}
            className="flex flex-col items-center gap-2 pt-1">
            <Icon3D emoji={t.icon} tone={t.tone} size={short ? 50 : 58} pulse={t.urgent} dot={t.urgent} />
            <span className="text-[11px] font-semibold text-white/85 text-center leading-tight">{t.label}</span>
          </Link>
        ))}
      </div>

      {/* Питомцы (после входа) */}
      {user && (
      <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">Мои питомцы</span>
          <Link to="/profile" className="text-xs text-green-400 font-semibold">Все ›</Link>
        </div>
          <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {pets.map((p) => (
              <Link key={p.id} to="/profile" className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform">
                {p.photo_url
                  ? <img src={p.photo_url} alt={p.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-green-500/70" />
                  : <span className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">🐾</span>}
                <span className="text-[11px] text-white/80">{p.name}</span>
              </Link>
            ))}
            <Link to="/profile" className="flex flex-col items-center gap-1 flex-shrink-0">
              <span className="w-14 h-14 rounded-full border-2 border-dashed border-white/25 flex items-center justify-center text-2xl text-white/50">+</span>
              <span className="text-[11px] text-white/50">Добавить</span>
            </Link>
          </div>
      </div>
      )}

      {/* Бонусы: баланс после входа, подарок новичку — до входа */}
      <Link to={user ? '/profile' : '/register'} className="flex items-center gap-3 rounded-2xl bg-[#FACC15] text-[#1E140D] px-4 py-3 active:scale-[0.98] transition-transform">
        <span className="text-2xl">🎁</span>
        <div className="flex-1">
          <div className="font-black leading-tight">
            {user ? `${(bonus ?? 0).toLocaleString('ru-RU')} бонусов` : '500 бонусов в подарок'}
          </div>
          <div className="text-[11px] opacity-75">
            {user ? 'Оплачивайте до 30% визита · пригласите друга +500' : 'За регистрацию · 1 бонус = 1 ₽'}
          </div>
        </div>
        <span className="font-black">›</span>
      </Link>

      {/* Почему ВетДом — прижато к низу, без пустого места */}
      <div className="mt-auto grid grid-cols-3 gap-2 pt-1">
        {[['15–60 мин', 'врач у двери'], ['4.9 ★', 'средняя оценка'], ['24/7', 'без выходных']].map(([v, l]) => (
          <div key={v} className="rounded-xl bg-black/20 border border-white/10 py-2 text-center">
            <div className="font-black text-sm">{v}</div>
            <div className="text-[10px] text-white/55">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
