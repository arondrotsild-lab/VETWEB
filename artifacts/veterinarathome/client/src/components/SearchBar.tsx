import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices } from '../api/index';
import { useTranslation } from 'react-i18next';
import { getSvcName, getSvcDesc } from '../utils/serviceNames';
import i18n from '../i18n';
import ServiceIcon from './ServiceIcon';

interface Service { id: number; name: string; description: string; price_from: number; }

interface Props { open: boolean; onClose: () => void; }

const QUICK_LINKS = [
  { icon: '🚑', labelKey: 'search.quick.callVet',  to: '/order' },
  { icon: '📋', labelKey: 'search.quick.history',   to: '/history' },
  { icon: '👤', labelKey: 'search.quick.profile',   to: '/profile' },
];

export default function SearchBar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'ru';

  const [query, setQuery]         = useState('');
  const [services, setServices]   = useState<Service[]>([]);
  const [results, setResults]     = useState<Service[]>([]);
  const [cursor, setCursor]       = useState(-1);
  const [loaded, setLoaded]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // Fetch services once
  useEffect(() => {
    if (open && !loaded) {
      getServices().then((svcs: Service[]) => { setServices(svcs); setLoaded(true); }).catch(() => {});
    }
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setCursor(-1); }
  }, [open]);

  // Filter
  useEffect(() => {
    if (!query.trim()) { setResults(services.slice(0, 6)); setCursor(-1); return; }
    const q = query.toLowerCase();
    const filtered = services.filter(s => {
      const name = getSvcName(s.name, lang).toLowerCase();
      const ruName = s.name.toLowerCase();
      const desc = getSvcDesc(s.description, s.name, lang).toLowerCase();
      return name.includes(q) || ruName.includes(q) || desc.includes(q);
    });
    setResults(filtered.slice(0, 8));
    setCursor(-1);
  }, [query, services, lang]);

  const go = useCallback((to: string) => {
    onClose();
    navigate(to);
  }, [navigate, onClose]);

  const handleKey = (e: React.KeyboardEvent) => {
    const total = results.length + QUICK_LINKS.length;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, total - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
    if (e.key === 'Escape')     { onClose(); }
    if (e.key === 'Enter') {
      if (cursor >= 0 && cursor < results.length) go(`/service/${results[cursor].id}`);
      else if (cursor >= results.length) go(QUICK_LINKS[cursor - results.length].to);
      else if (results.length === 1) go(`/service/${results[0].id}`);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (cursor < 0 || !listRef.current) return;
    const el = listRef.current.querySelectorAll('[data-item]')[cursor] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const highlight = (text: string) => {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-400/25 text-amber-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-[200] transition-all duration-200"
        style={{ background: 'rgba(2,6,2,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      {/* panel */}
      <div
        className="fixed left-1/2 z-[210] w-full max-w-2xl px-4"
        style={{ top: '10vh', transform: 'translateX(-50%)' }}
      >
        <div className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'rgba(6,13,6,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,222,128,0.08)' }}>

          {/* search input row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/6">
            <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="9" cy="9" r="6"/><path d="M14 14l3 3"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('search.placeholder')}
              className="flex-1 bg-transparent text-white placeholder-white/25 text-sm outline-none"
              style={{ fontSize: '15px' }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/20 hover:text-white/50 transition-colors text-xs p-1">
                <svg width="12" height="12" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8"/>
                </svg>
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-mono text-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ESC
            </kbd>
          </div>

          {/* results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto">

            {/* service results */}
            {results.length > 0 && (
              <div className="pt-2 pb-1">
                {!query && (
                  <p className="px-5 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    {t('search.allServices')}
                  </p>
                )}
                {results.map((svc, i) => {
                  const isActive = cursor === i;
                  const name = getSvcName(svc.name, lang);
                  const desc = getSvcDesc(svc.description, svc.name, lang);
                  return (
                    <button
                      key={svc.id}
                      data-item
                      onClick={() => go(`/service/${svc.id}`)}
                      className="w-full flex items-center gap-4 px-5 py-3 text-left transition-all duration-100 group"
                      style={{ background: isActive ? 'rgba(74,222,128,0.07)' : 'transparent' }}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: isActive ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isActive ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
                          color: isActive ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.35)',
                        }}>
                        <ServiceIcon name={svc.name} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate transition-colors"
                          style={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)' }}>
                          {highlight(name)}
                        </p>
                        <p className="text-xs truncate mt-0.5"
                          style={{ color: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)' }}>
                          {desc.slice(0, 60)}{desc.length > 60 ? '…' : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: isActive ? 'rgba(74,222,128,0.8)' : 'rgba(74,222,128,0.4)' }}>
                          {t('search.from')}{svc.price_from.toLocaleString()} ₽
                        </span>
                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'rgba(74,222,128,0.6)' }}
                          fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M2 5h6M5 2l3 3-3 3"/>
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* no results */}
            {query && results.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-white/40 text-sm font-semibold">{t('search.noResults')}</p>
                <p className="text-white/20 text-xs mt-1">{t('search.noResultsSub')}</p>
              </div>
            )}

            {/* divider */}
            <div className="mx-5 border-t border-white/5 my-1" />

            {/* quick links */}
            <div className="pb-3 pt-1">
              <p className="px-5 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {t('search.quickLinks')}
              </p>
              {QUICK_LINKS.map((link, i) => {
                const idx = results.length + i;
                const isActive = cursor === idx;
                return (
                  <button
                    key={link.to}
                    data-item
                    onClick={() => go(link.to)}
                    onMouseEnter={() => setCursor(idx)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all duration-100"
                    style={{ background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                  >
                    <span className="text-base w-6 text-center">{link.icon}</span>
                    <span className="text-xs font-semibold transition-colors"
                      style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>
                      {t(link.labelKey)}
                    </span>
                    {isActive && (
                      <svg className="w-3 h-3 ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}
                        fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M2 5h6M5 2l3 3-3 3"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* footer hint */}
            <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-4 text-[10px] text-white/15">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>↑↓</kbd>
                {t('search.hint.nav')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>↵</kbd>
                {t('search.hint.open')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>Esc</kbd>
                {t('search.hint.close')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
