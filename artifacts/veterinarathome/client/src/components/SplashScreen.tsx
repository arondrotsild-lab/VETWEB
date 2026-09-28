import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1800);
    const doneTimer = setTimeout(() => onDone(), 2400);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060d06]"
      style={{ transition: 'opacity 0.6s ease', opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'all' }}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <svg className="absolute" width="140" height="140" viewBox="0 0 140 140"
          style={{ animation: 'spin-logo 1.4s linear infinite' }}>
          <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(74,222,128,0.15)" strokeWidth="2" />
          <circle cx="70" cy="70" r="62" fill="none" stroke="url(#grad)" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="80 310" />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner ring — reverse */}
        <svg className="absolute" width="116" height="116" viewBox="0 0 116 116"
          style={{ animation: 'spin-logo-reverse 2s linear infinite' }}>
          <circle cx="58" cy="58" r="50" fill="none" stroke="rgba(251,191,36,0.12)" strokeWidth="1.5" />
          <circle cx="58" cy="58" r="50" fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth="1.5"
            strokeLinecap="round" strokeDasharray="30 285" />
        </svg>

        {/* Logo */}
        <div className="w-20 h-20 rounded-full overflow-hidden"
          style={{ boxShadow: '0 0 32px rgba(74,222,128,0.25), 0 0 64px rgba(74,222,128,0.1)' }}>
          <img src="/logo.jpeg" alt={t('nav.brand')} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Brand text */}
      <div className="absolute mt-48 text-center">
        <div className="text-white text-sm font-bold tracking-[0.2em] uppercase opacity-60">
          {t('nav.brand')} — {t('nav.brandSub')}
        </div>
        <div className="flex justify-center gap-1 mt-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-green-400"
              style={{ animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin-logo { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-logo-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
