import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Нижнее меню как в мобильном приложении — только на телефоне
const Icon = ({ d }: { d: string }) => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export default function MobileTabBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  if (pathname.startsWith('/chat/')) return null;   // в переписке меню скрыто, как в мессенджерах

  const tabs = [
    { to: '/', label: 'Главная', d: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
    { to: '/shop', label: 'Магазин', d: 'M6 7h12l-1 13H7L6 7zM9 7a3 3 0 016 0' },
    { to: '/order', label: 'Вызвать', d: '', center: true },
    { to: user ? '/chats' : '/login', label: 'Чаты', d: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.7A8 8 0 1121 12z' },
    { to: user ? '/profile' : '/login', label: user ? 'Профиль' : 'Войти', d: 'M20 21a8 8 0 00-16 0M12 12a4 4 0 100-8 4 4 0 000 8z' },
  ];
  const active = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#24150E]/95 backdrop-blur-xl border-t border-[#C2410C]/20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-5 h-16">
        {tabs.map((t) => t.center ? (
          <Link key={t.label} to={t.to} className="flex flex-col items-center justify-start -mt-5">
            <span className="w-14 h-14 rounded-full bg-green-500 active:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-900/50 border-4 border-[#24150E]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <span className="text-[10px] font-bold text-green-400 mt-0.5">{t.label}</span>
          </Link>
        ) : (
          <Link key={t.label} to={t.to}
            className={`flex flex-col items-center justify-center gap-0.5 ${active(t.to) ? 'text-green-400' : 'text-white/55 active:text-white'}`}>
            <Icon d={t.d} />
            <span className="text-[10px] font-semibold">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
