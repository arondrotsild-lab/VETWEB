import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon3D, { tiltHandlers } from './Icon3D';

// ═══════════════════════════════════════════════════════════════════
//  Каркас экрана мобильного приложения: шапка, сетка иконок-разделов,
//  окно раздела, которое выезжает снизу. На компьютере не используется.
// ═══════════════════════════════════════════════════════════════════

export function useIsMobile() {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return m;
}

// Каждый раздел — свой «сочный» градиент, как баннеры на главной
const TONES: Record<string, { bg: string; dark?: boolean }> = {
  green:  { bg: 'linear-gradient(145deg, #8BD14E 0%, #5E9E2C 45%, #2F5119 100%)' },
  yellow: { bg: 'linear-gradient(145deg, #FFE36E 0%, #FACC15 45%, #C98A06 100%)', dark: true },
  amber:  { bg: 'linear-gradient(145deg, #E7B985 0%, #B07F48 50%, #5C3F28 100%)' },
  sky:    { bg: 'linear-gradient(145deg, #7DD3FC 0%, #2B8FD6 50%, #1A4E7E 100%)' },
  red:    { bg: 'linear-gradient(145deg, #FF9A8A 0%, #E2533E 50%, #8E2416 100%)' },
  purple: { bg: 'linear-gradient(145deg, #C4B5FD 0%, #8B5CF6 50%, #4C2A85 100%)' },
  white:  { bg: 'linear-gradient(145deg, #8A6A50 0%, #5A4331 50%, #2A1D14 100%)' },
};

// Объёмная плитка-раздел: глянцевый блик, мягкая тень, «парящая» иконка, нажатие как у настоящей кнопки
export function Tile3D({ icon, label, sub, tone = 'white', badge, wide, onClick, to }: {
  icon: string; label: string; sub?: string; tone?: string; badge?: number | string; wide?: boolean; onClick?: () => void; to?: string;
}) {
  const t = TONES[tone] ?? TONES.white;
  const body = (
    <>
      <span className="tile3d-gloss" />
      <span className="tile-sweep" />
      <Icon3D emoji={icon} tone="cream" size={wide ? 56 : 46} className={`!absolute z-[2] ${wide ? 'right-3 top-1/2' : 'right-2.5 top-2.5'}`} style={wide ? { marginTop: -28 } : undefined} />
      {badge !== undefined && badge !== 0 && badge !== '' && (
        <span className="absolute top-2 left-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-white text-[#1E140D] text-[11px] font-black flex items-center justify-center shadow-md">{badge}</span>
      )}
      <span className={`relative z-[3] mt-auto block text-left ${wide ? 'pr-20' : ''}`}>
        <span className={`block font-black leading-tight ${wide ? 'text-[17px]' : 'text-[13px]'} ${t.dark ? 'text-[#1E140D]' : 'text-white'}`} style={{ textShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.35)' }}>{label}</span>
        {sub && <span className={`block text-[11px] font-semibold leading-tight mt-0.5 ${t.dark ? 'text-[#1E140D]/70' : 'text-white/80'}`}>{sub}</span>}
      </span>
    </>
  );
  const cls = `tile3d tilt3d relative overflow-hidden rounded-[22px] flex flex-col p-3 ${wide ? 'col-span-2 h-[104px] [@media(max-height:700px)]:h-[92px]' : 'h-[104px] [@media(max-height:700px)]:h-[92px]'}`;
  return to
    ? <Link to={to} className={cls} style={{ background: t.bg }} {...tiltHandlers}>{body}</Link>
    : <button type="button" onClick={onClick} className={cls} style={{ background: t.bg }} {...tiltHandlers}>{body}</button>;
}

export interface HubTile {
  k: string;
  label: string;
  icon: string;
  tone?: string;
  sub?: string;                 // короткая живая подпись: «4 питомца», «460 бонусов»
  badge?: number | string;
  to?: string;                  // ссылка на другой экран
  title?: string;               // заголовок окна (если отличается от подписи)
  content?: ReactNode;          // содержимое окна
  light?: boolean;              // светлое окно (для страниц в светлых тонах)
}

export function AppSheet({ title, icon, onClose, children, light }: { title: string; icon?: string; onClose: () => void; children: ReactNode; light?: boolean }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, [onClose]);
  return createPortal(
    <div className="sheet-wrap fixed inset-0 z-[80] flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className={`sheet relative w-full max-h-[88vh] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl shadow-2xl screen-in ${light ? 'bg-[#F5EEE3] text-coffee-900' : 'bg-[#2A1D14] text-white border-t border-white/10'}`}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className={`sticky top-0 z-10 backdrop-blur px-5 pt-3 pb-3 border-b ${light ? 'bg-[#F5EEE3]/95 border-coffee-200' : 'bg-[#2A1D14]/95 border-white/[0.06]'}`}>
          <div className={`w-10 h-1 rounded-full mx-auto mb-3 ${light ? 'bg-coffee-300' : 'bg-white/20'}`} />
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h2 className="text-lg font-black flex-1 leading-tight">{title}</h2>
            <button onClick={onClose} aria-label="Закрыть"
              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 ${light ? 'bg-coffee-900/10 text-coffee-700' : 'bg-white/[0.08] text-white/70'}`}>✕</button>
          </div>
        </div>
        <div className="px-4 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export default function MobileHub({ header, tiles, footer, light = false, cols = 4 }: {
  header: ReactNode; tiles: HubTile[]; footer?: ReactNode; light?: boolean; cols?: 3 | 4;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const tile = tiles.find((t) => t.k === open);
  return (
    <div className={`min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] px-4 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-4 flex flex-col gap-3 ${
      light ? 'bg-gradient-to-b from-[#EFE5D6] to-[#E6D9C6] text-coffee-900' : 'bg-gradient-to-b from-[#3B2A1E] via-[#2A1D14] to-[#1F150E] text-white'}`}>
      {header}
      <div className="grid grid-cols-3 gap-2.5 mt-1">
        {tiles.map((t, i) => (
          <Tile3D key={t.k} icon={t.icon} label={t.label} sub={t.sub} tone={t.tone} badge={t.badge} wide={i === 0 && cols !== 4 ? true : i === 0}
            to={t.to} onClick={t.to ? undefined : () => setOpen(t.k)} />
        ))}
      </div>
      {footer}
      {tile && tile.content !== undefined && (
        <AppSheet title={tile.title ?? tile.label} icon={tile.icon} onClose={() => setOpen(null)} light={tile.light ?? light}>
          {tile.content}
        </AppSheet>
      )}
    </div>
  );
}

// Маленькая строка-статистика под шапкой
export function HubStats({ items, light }: { items: { v: React.ReactNode; l: string }[]; light?: boolean }) {
  return (
    <div className={`grid gap-2 text-center`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((x) => (
        <div key={x.l} className={`glass3d rounded-2xl py-2.5 border ${light ? 'bg-white/70 border-white' : 'bg-white/[0.07] border-white/15'}`}>
          <div className="text-[17px] font-black whitespace-nowrap">{x.v}</div>
          <div className={`text-[10px] uppercase tracking-wide ${light ? 'text-coffee-500' : 'text-white/50'}`}>{x.l}</div>
        </div>
      ))}
    </div>
  );
}
