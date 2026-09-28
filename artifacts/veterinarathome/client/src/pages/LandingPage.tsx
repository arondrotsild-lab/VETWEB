import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServices, createSuggestion } from '../api';
import ServiceIcon from '../components/ServiceIcon';
import AnimatedNumber from '../components/AnimatedNumber';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getSvcName, getSvcDesc } from '../utils/serviceNames';

interface Service {
  id: number; name: string; description: string;
  price_from: number; price_to: number; duration_minutes: number; icon: string;
}

export default function LandingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const lang = i18n.language || 'ru';
  const tName = (name: string) => getSvcName(name, lang);
  const tDesc = (desc: string, name: string) => getSvcDesc(desc, name, lang);
  const [services, setServices] = useState<Service[]>([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const [sugg, setSugg] = useState({ name: '', telegram: '', comment: '' });
  const [suggSent, setSuggSent] = useState(false);
  const [suggLoading, setSuggLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { getServices().then(setServices).catch(() => {}); }, []);

  const handleSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugg.comment) return;
    setSuggLoading(true);
    try { await createSuggestion(sugg); setSuggSent(true); }
    catch { /* silent */ }
    finally { setSuggLoading(false); }
  };

  const toggleSound = () => {
    if (!audioRef.current) return;
    if (soundOn) { audioRef.current.pause(); } else { audioRef.current.volume = 0.35; audioRef.current.play().catch(() => {}); }
    setSoundOn(!soundOn);
  };

  const steps = [
    { num: '01', title: t('landing.steps.s1title'), desc: t('landing.steps.s1desc'), note: null, cta: true, ctaLink: null },
    { num: '02', title: t('landing.steps.s2title'), desc: t('landing.steps.s2desc'), note: t('landing.steps.s2note'), cta: false, ctaLink: null },
    { num: '03', title: t('landing.steps.s3title'), desc: t('landing.steps.s3desc'), note: null, cta: false, ctaLink: null },
    { num: '04', title: t('landing.steps.s4title'), desc: t('landing.steps.s4desc'), note: null, cta: false, ctaLink: '/medcard' },
  ];

  const trustCards: { icon: React.ReactNode; bg: React.ReactNode; title: string; desc: string }[] = [
    {
      title: t('landing.trust.t1'), desc: t('landing.trust.t1d'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="11"/>
          <path d="M14 8v6l4 2"/>
        </svg>
      ),
      bg: (
        <svg width="90" height="90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="11"/><path d="M14 8v6l4 2"/>
        </svg>
      ),
    },
    {
      title: t('landing.trust.t2'), desc: t('landing.trust.t2d'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3L5 7v7c0 5 4 9 9 10 5-1 9-5 9-10V7z"/>
          <path d="M10 14l3 3 5-5"/>
        </svg>
      ),
      bg: (
        <svg width="90" height="90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3L5 7v7c0 5 4 9 9 10 5-1 9-5 9-10V7z"/><path d="M10 14l3 3 5-5"/>
        </svg>
      ),
    },
    {
      title: t('landing.trust.t3'), desc: t('landing.trust.t3d'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 24S5 18 5 11a5 5 0 0110 0 5 5 0 0110 0c0 7-9 13-11 13z"/>
        </svg>
      ),
      bg: (
        <svg width="90" height="90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 24S5 18 5 11a5 5 0 0110 0 5 5 0 0110 0c0 7-9 13-11 13z"/>
        </svg>
      ),
    },
    {
      title: t('landing.trust.t4'), desc: t('landing.trust.t4d'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="22" height="15" rx="2"/>
          <path d="M3 12h22"/>
          <path d="M8 17h4"/>
        </svg>
      ),
      bg: (
        <svg width="90" height="90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="22" height="15" rx="2"/><path d="M3 12h22"/><path d="M8 17h4"/>
        </svg>
      ),
    },
    {
      title: t('landing.trust.t5'), desc: t('landing.trust.t5d'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h10l2 3H7z"/>
          <rect x="5" y="6" width="18" height="19" rx="2"/>
          <path d="M14 12v6M11 15h6"/>
        </svg>
      ),
      bg: (
        <svg width="90" height="90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h10l2 3H7z"/><rect x="5" y="6" width="18" height="19" rx="2"/><path d="M14 12v6M11 15h6"/>
        </svg>
      ),
    },
    {
      title: t('landing.trust.t6'), desc: t('landing.trust.t6d'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="11"/>
          <path d="M9 14l4 4 6-7"/>
        </svg>
      ),
      bg: (
        <svg width="90" height="90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="11"/><path d="M9 14l4 4 6-7"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-[#060d06] text-white">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <audio ref={audioRef} src="/birds-ambient.mp3" loop preload="auto" />
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 20%' }}>
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Sound pill */}
        <button onClick={toggleSound}
          className="absolute top-24 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/70 hover:text-white transition-all"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {soundOn ? `🔊 ${t('landing.soundOn')}` : `🔇 ${t('landing.soundOff')}`}
        </button>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 py-32">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-amber-400" />
            <span className="text-amber-400 text-[11px] font-bold uppercase tracking-[0.3em]">{t('landing.hero1')}</span>
            <div className="w-8 h-px bg-amber-400" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-6" style={{ textShadow: '0 4px 32px rgba(0,0,0,0.8)' }}>
            <span className="block text-white">{t('landing.hero2')}</span>
            <span className="block text-green-400" style={{ textShadow: '0 4px 32px rgba(0,0,0,0.8), 0 0 60px rgba(74,222,128,0.3)' }}>
              {t('landing.hero3')}
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/75 font-light max-w-md leading-relaxed mb-10" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
            {t('landing.heroDesc')}
          </p>

          <Link to={user ? '/order' : '/register'}
            className="text-base py-4 px-10 font-bold tracking-wide mb-14 rounded-xl transition-all duration-300"
            style={{ background: 'rgba(251,191,36,0.25)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(251,191,36,0.45)', color: 'rgba(251,191,36,0.95)' }}>
            {user ? t('landing.callVet') : t('landing.registerPet')}
          </Link>

          <div className="inline-flex flex-wrap justify-center gap-0 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { val: '50+',    label: t('landing.stats.vets') },
              { val: '870', label: t('landing.stats.trips') },
              { val: '4.9★',  label: t('landing.stats.rating') },
              { val: '24/7',  label: t('landing.stats.always') },
            ].map((s, i, arr) => (
              <div key={s.label} className="px-7 py-4 text-center" style={i < arr.length - 1 ? { borderRight: '1px solid rgba(255,255,255,0.08)' } : {}}>
                <AnimatedNumber value={s.val} className="text-xl font-black text-white leading-none" />
                <div className="text-white/40 text-[9px] uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <div className="overflow-hidden py-0" style={{ borderTop: '1px solid rgba(74,222,128,0.12)', borderBottom: '1px solid rgba(74,222,128,0.12)', background: 'linear-gradient(90deg, rgba(6,13,6,1) 0%, rgba(10,22,10,1) 50%, rgba(6,13,6,1) 100%)' }}>
        <div className="py-3.5 flex gap-10 whitespace-nowrap animate-marquee" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-10 flex-shrink-0">
              {[
                { label: t('landing.stats.vets'), hot: false },
                { label: t('landing.hero1'), hot: false },
                { label: t('landing.steps.s1title'), hot: true },
                { label: t('landing.steps.s2title'), hot: false },
                { label: t('landing.steps.s3title'), hot: true },
                { label: t('landing.steps.s4title'), hot: false },
                { label: t('landing.trust.t1'), hot: false },
                { label: t('landing.trust.t2'), hot: false },
                { label: t('landing.trust.t3'), hot: true },
                { label: t('landing.trust.t4'), hot: false },
                { label: t('landing.trust.t5'), hot: false },
                { label: t('landing.trust.t6'), hot: false },
                { label: t('landing.callVet'), hot: true },
              ].map(({ label, hot }) => (
                <span key={label} className="flex items-center gap-3 flex-shrink-0">
                  <span style={{ color: 'rgba(74,222,128,0.5)' }}>◆</span>
                  <span className="text-xs font-bold uppercase tracking-[0.22em]"
                    style={{ color: hot ? 'rgba(251,191,36,0.85)' : 'rgba(255,255,255,0.35)' }}>
                    {label}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="py-3.5 flex gap-10 whitespace-nowrap animate-marquee-reverse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-10 flex-shrink-0">
              {[
                { label: t('landing.trust.t1'), accent: false },
                { label: t('landing.trust.t2'), accent: false },
                { label: t('landing.steps.s1title'), accent: true },
                { label: t('landing.steps.s2title'), accent: true },
                { label: t('landing.trust.t3'), accent: false },
                { label: t('landing.trust.t4'), accent: false },
                { label: t('landing.steps.s3title'), accent: true },
                { label: t('landing.steps.s4title'), accent: true },
                { label: t('landing.trust.t5'), accent: false },
                { label: t('landing.trust.t6'), accent: false },
                { label: t('landing.hero1'), accent: false },
                { label: t('landing.stats.vets'), accent: false },
                { label: t('landing.callVet'), accent: true },
              ].map(({ label, accent }) => (
                <span key={label} className="flex items-center gap-3 flex-shrink-0">
                  <span style={{ color: 'rgba(255,255,255,0.1)' }}>◇</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em]"
                    style={{ color: accent ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.18)' }}>
                    {label}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-32 px-6 bg-[#060d06]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-8 h-px bg-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">{t('landing.steps.title')}</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black leading-tight mb-6">
                {t('landing.steps.sub')}<br />
                <span className="text-white/20">{t('landing.steps.sub2')}</span>
              </h2>
              <p className="text-white/40 leading-relaxed max-w-sm mb-5">{t('landing.steps.desc').split('.')[0]}.</p>
              <div className="rounded-2xl px-5 py-5 max-w-sm" style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
                <p className="text-sm font-semibold text-white/80 leading-relaxed">{t('landing.steps.desc')}</p>
              </div>
            </div>

            <div className="space-y-8">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-8 items-start group">
                  <div className="text-6xl font-black text-white/5 group-hover:text-green-400/20 transition-colors duration-300 leading-none select-none flex-shrink-0 w-20 text-right">
                    {s.num}
                  </div>
                  <div className="border-t border-white/10 pt-6 flex-1 group-hover:border-green-400/30 transition-colors duration-300">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2 text-white">{s.title}</h3>
                        <p className="text-white/40 leading-relaxed text-sm">
                          {s.desc}
                          {s.note && (
                            <span className="block mt-2 text-xs italic" style={{ color: 'rgba(74,222,128,0.55)', borderLeft: '2px solid rgba(74,222,128,0.25)', paddingLeft: '10px' }}>
                              ({s.note})
                            </span>
                          )}
                        </p>
                      </div>
                      {s.cta && (
                        <Link to={user ? '/order' : '/register'}
                          className="flex-shrink-0 relative flex items-center justify-center w-14 h-14 rounded-full transition-transform duration-300 hover:scale-110 active:scale-95"
                          style={{ background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.35)' }}>
                          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(74,222,128,0.08)', animationDuration: '1.8s' }} />
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 4v12M4 10l6 6 6-6" stroke="rgba(74,222,128,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      )}
                      {s.ctaLink && (
                        <Link to={s.ctaLink}
                          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-105 whitespace-nowrap"
                          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'rgba(251,191,36,0.9)' }}>
                          {t('landing.steps.s4link')}
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="divider mx-6" />

      {/* ═══ SERVICES ═══ */}
      {services.length > 0 && (
        <section className="py-32 px-6 bg-[#060d06]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="w-8 h-px bg-amber-400" />
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">{t('landing.services.title')}</span>
                </div>
                <h2 className="text-5xl font-black leading-tight">
                  {t('landing.services.sub')}<br /><span className="text-white/20">{t('landing.services.sub2')}</span>
                </h2>
              </div>
              <Link to={user ? '/order' : '/register'}
                className="inline-flex items-center gap-3 text-sm text-white/40 hover:text-white transition-colors group">
                <span>{t('landing.services.all')}</span>
                <span className="w-8 h-px bg-white/20 group-hover:bg-white group-hover:w-12 transition-all duration-300" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
              {/* Suggestion card — fills remaining columns in last row */}
              <div className="md:col-span-2 lg:col-span-3 bg-[#060d06] relative overflow-hidden flex flex-col" style={{ order: 999 }}>
                {/* ambient glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 85% 50%, rgba(251,191,36,0.04) 0%, transparent 70%)' }} />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                {!suggSent ? (
                  !suggOpen ? (
                    /* ── CLOSED: big inviting banner ── */
                    <button onClick={() => setSuggOpen(true)} className="flex-1 flex items-center gap-8 px-8 py-10 text-left group w-full">
                      {/* decorative icon */}
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 100%)', border: '1px solid rgba(251,191,36,0.25)' }}>
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(251,191,36,0.75)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="14" cy="14" r="11"/>
                            <path d="M11 10.5c0-1.657 1.343-3 3-3s3 1.343 3 3c0 1.5-1.5 2.25-2.5 3.5M14 20.5h.01"/>
                          </svg>
                        </div>
                        {/* pulse ring */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ boxShadow: '0 0 0 6px rgba(251,191,36,0.08)' }} />
                      </div>

                      {/* text block */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(251,191,36,0.45)' }}>
                          {t('landing.suggest.badge') || 'Ваше предложение'}
                        </p>
                        <h4 className="text-white font-bold text-lg leading-snug mb-2 group-hover:text-amber-300 transition-colors duration-300">
                          {t('landing.suggest.question')}
                        </h4>
                        <p className="text-white/35 text-sm leading-relaxed max-w-xs">
                          {t('landing.suggest.desc')}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className="hidden sm:block text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300 group-hover:text-amber-300"
                          style={{ color: 'rgba(251,191,36,0.55)' }}>
                          {t('landing.suggest.cta')}
                        </span>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: lang === 'ar' ? 'scaleX(-1)' : undefined }}>
                            <path d="M2 7h10M7 2l5 5-5 5"/>
                          </svg>
                        </div>
                      </div>
                    </button>
                  ) : (
                    /* ── OPEN: inline form ── */
                    <div className="flex-1 px-8 py-8">
                      <p className="text-white/80 text-sm font-bold mb-5">{t('landing.suggest.formTitle')}</p>
                      <form onSubmit={handleSuggestion}>
                        <div className="grid sm:grid-cols-3 gap-3 mb-3">
                          <input className="input text-sm py-2.5" placeholder={t('landing.suggest.name')}
                            value={sugg.name} onChange={(e) => setSugg({ ...sugg, name: e.target.value })} />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
                            <input className="input text-sm py-2.5 w-full" style={{ paddingLeft: '1.75rem' }}
                              placeholder={t('landing.suggest.telegram')}
                              value={sugg.telegram} onChange={(e) => setSugg({ ...sugg, telegram: e.target.value })} />
                          </div>
                          <input className="input text-sm py-2.5" placeholder={t('landing.suggest.comment')}
                            value={sugg.comment} onChange={(e) => setSugg({ ...sugg, comment: e.target.value })} required />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={suggLoading || !sugg.comment} className="btn-gold text-xs py-2.5 px-6 font-bold">
                            {suggLoading ? t('landing.suggest.sending') : t('landing.suggest.send')}
                          </button>
                          <button type="button" onClick={() => setSuggOpen(false)}
                            className="px-4 py-2.5 rounded-xl text-xs text-white/30 hover:text-white/60 transition-colors"
                            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                            {t('landing.suggest.close')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )
                ) : (
                  /* ── SENT ── */
                  <div className="flex-1 flex items-center gap-5 px-8 py-10">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="rgba(74,222,128,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 11l5 5 9-9"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white/85 font-bold mb-1">{t('landing.suggest.thanks')}</p>
                      <p className="text-white/30 text-sm">{t('landing.suggest.thanksDesc')}</p>
                    </div>
                  </div>
                )}
              </div>

              {services.map((svc) => (
                <Link key={svc.id} to={`/service/${svc.id}`}
                  className="bg-[#060d06] p-8 hover:bg-[#0a1a0a] transition-all duration-300 group cursor-pointer relative overflow-hidden block">
                  <div className="absolute top-0 left-0 w-0 h-px bg-green-400 group-hover:w-full transition-all duration-500" />
                  <div className="mb-6 text-green-400/70"><ServiceIcon name={svc.name} size={32} /></div>
                  <h3 className="font-bold text-white mb-3 group-hover:text-green-400 transition-colors">{tName(svc.name)}</h3>
                  <p className="text-white/30 text-sm leading-relaxed mb-6 line-clamp-2">{tDesc(svc.description, svc.name)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-sm">{t('landing.services.from')}{svc.price_from.toLocaleString()} ₽</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 group-hover:scale-105"
                      style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.5)' }}>
                      {t('landing.services.details')}
                      <svg className="w-2.5 h-2.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 10 10"
                        style={{ transform: lang === 'ar' ? 'scaleX(-1)' : undefined }}>
                        <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ WHY US ═══ */}
      <section className="py-32 px-6 bg-[#040a04]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-px bg-amber-400" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">—</span>
              <div className="w-8 h-px bg-amber-400" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black">{t('landing.trust.title')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/5">
            {trustCards.map((f, i) => (
              <div key={i} className="bg-[#040a04] p-8 group hover:bg-[#060d06] transition-all duration-300 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 opacity-[0.03] pointer-events-none select-none text-green-400">{f.bg}</div>
                <div className="mb-5 text-green-400">{f.icon}</div>
                <h3 className="font-bold text-white mb-3 text-lg">{f.title}</h3>
                <p className="text-white/30 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-32 px-6 bg-[#060d06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-transparent to-amber-900/10" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-8 h-px bg-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">—</span>
              </div>
              <h2 className="text-6xl md:text-7xl font-black leading-tight mb-8">
                {t('landing.cta.title1')}<br />
                <span className="text-green-400">{t('landing.cta.title2')}</span><br />
                {t('landing.cta.title3')}
              </h2>
              <p className="text-white/40 text-lg leading-relaxed mb-10">{t('landing.cta.desc')}</p>
              <div className="flex flex-wrap gap-4">
                <Link to={user ? '/order' : '/register'} className="btn-gold text-base py-4 px-8 font-bold tracking-wide">
                  {user ? t('landing.callVet') : t('landing.cta.btn')}
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/15 rounded-full blur-3xl scale-150" />
                <div className="p-1 rounded-full bg-gradient-to-br from-amber-400/30 via-transparent to-green-400/20">
                  <img src="/logo.jpeg" alt={t('nav.brand')} className="w-56 h-56 md:w-72 md:h-72 rounded-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
