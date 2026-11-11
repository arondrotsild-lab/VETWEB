import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getServices } from '../api';
import ServiceIcon from '../components/ServiceIcon';
import { Tile3D } from '../components/MobileHub';
import i18n from '../i18n';
import { getSvcName, getSvcDesc } from '../utils/serviceNames';

const EMOJI: Record<string, string> = {
  'Первичный осмотр': '🩺', 'Вакцинация': '💉', 'Скорая ветпомощь': '🚑', 'Забор анализов': '🧪', 'Обработка от паразитов': '🛡️',
  'Хирургическая помощь': '🏥', 'Уход и груминг': '✂️', 'Консультация': '💬', 'Капельница на дому': '💧', 'Передержка': '🏡',
  'Выгул животного': '🦮', 'Кастрация': '⚕️', 'Стерилизация': '🩹',
};
const TONES = ['green', 'sky', 'red', 'purple', 'amber', 'yellow', 'white'];

interface Service { id: number; name: string; description: string; price_from: number; duration_minutes: number }

// Экран «Услуги» мобильного приложения: список, нажатие открывает карточку услуги
export default function ServicesPage() {
  const [list, setList] = useState<Service[]>([]);
  const lang = i18n.language || 'ru';
  useEffect(() => { getServices().then(setList).catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-[#1F150E] text-white pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-[156px] pb-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="hidden md:block text-4xl font-black mb-6">Услуги</h1>
        <p className="text-sm text-white/55 mb-3">Выберите услугу — врач приедет к вам домой</p>

        <Link to="/order" className="flex items-center gap-3 rounded-2xl bg-red-500/15 border border-red-400/30 px-4 py-3 mb-3 active:scale-[0.98] transition-transform">
          <span className="text-2xl">🚑</span>
          <div className="flex-1"><div className="font-bold">Срочно нужна помощь?</div><div className="text-xs text-white/60">Скорая ветпомощь 24/7 — выезд немедленно</div></div>
          <span className="text-red-300 font-black">›</span>
        </Link>

        {/* Телефон: услуги сеткой иконок, как в приложении */}
        <div className="md:hidden grid grid-cols-3 gap-2.5">
          {list.map((s, i) => (
            <Tile3D key={s.id} to={`/service/${s.id}`} wide={i === 0} icon={EMOJI[s.name] ?? '🐾'} label={getSvcName(s.name, lang)}
              sub={`от ${s.price_from.toLocaleString('ru-RU')}\u00A0₽`} tone={TONES[i % TONES.length]} />
          ))}
        </div>

        <div className="hidden md:block rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/10 overflow-hidden">
          {list.map((s) => (
            <Link key={s.id} to={`/service/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/5 hover:bg-white/[0.03] transition-colors">
              <span className="w-11 h-11 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center flex-shrink-0"><ServiceIcon name={s.name} size={22} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-snug">{getSvcName(s.name, lang)}</div>
                <div className="text-xs text-white/50 leading-snug mt-0.5">{getSvcDesc(s.description, s.name, lang)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-green-400">от {s.price_from.toLocaleString('ru-RU')} ₽</div>
                <div className="text-[10px] text-white/40">{s.duration_minutes} мин</div>
              </div>
              <span className="text-white/30 text-lg">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
