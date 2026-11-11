import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServices, createSuggestion } from '../api';
import ServiceIcon from '../components/ServiceIcon';
import AnimatedNumber from '../components/AnimatedNumber';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getSvcName } from '../utils/serviceNames';
import MobileHome from '../components/MobileHome';

interface Service {
  id: number; name: string; description: string;
  price_from: number; price_to: number; duration_minutes: number; icon: string;
}

export default function LandingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const lang = i18n.language || 'ru';
  const tName = (name: string) => getSvcName(name, lang);
  const [services, setServices] = useState<Service[]>([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const [sugg, setSugg] = useState({ name: '', telegram: '', comment: '' });
  const [suggSent, setSuggSent] = useState(false);
  const [suggLoading, setSuggLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobileVideo, setIsMobileVideo] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => { getServices().then(setServices).catch(() => {}); }, []);

  // Плавное появление блоков при прокрутке
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-visible)');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [services.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateVideoSource = () => setIsMobileVideo(mediaQuery.matches);
    updateVideoSource();
    mediaQuery.addEventListener('change', updateVideoSource);
    return () => mediaQuery.removeEventListener('change', updateVideoSource);
  }, []);

  const handleSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugg.comment) return;
    setSuggLoading(true);
    try { await createSuggestion(sugg); setSuggSent(true); }
    catch { /* silent */ }
    finally { setSuggLoading(false); }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextSoundOn = !soundOn;
    video.muted = !nextSoundOn;
    if (nextSoundOn) video.play().catch(() => {});
    setSoundOn(nextSoundOn);
  };

  const steps = [
    { num: '01', img: '/landing/step1.jpg', title: t('landing.steps.s1title'), desc: t('landing.steps.s1desc') },
    { num: '02', img: '/landing/step2.jpg', title: t('landing.steps.s2title'), desc: t('landing.steps.s2desc') },
    { num: '03', img: '/landing/step3.jpg', title: t('landing.steps.s3title'), desc: t('landing.steps.s3desc') },
    { num: '04', img: '/landing/step4.jpg', title: t('landing.steps.s4title'), desc: t('landing.steps.s4short', 'Диагноз, лечение и назначения после каждого визита — в одном месте.'), link: '/medcard' },
  ];

  const orderLink = user ? '/order' : '/register';

  // На телефоне — экран приложения вместо лендинга
  if (isMobileVideo) return <MobileHome />;

  return (
    <div className="bg-[#1F150E] text-white">

      {/* ═══ ЭКРАН 1: HERO ═══ */}
      <section className="hero-stage relative min-h-screen flex flex-col justify-center overflow-hidden">
        <video
          key={isMobileVideo ? 'mobile-hero' : 'desktop-hero'}
          ref={videoRef}
          src={isMobileVideo ? '/hero-video-mobile.mp4' : '/hero-video-desktop.mp4'}
          poster={isMobileVideo ? '/hero-poster-mobile.jpg' : '/hero-poster-desktop.jpg'}
          autoPlay
          muted={!soundOn}
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="hero-video absolute inset-0 h-full w-full"
        />
        <div className="hero-video-scrim absolute inset-0 pointer-events-none" />

        <button onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? t('landing.soundOn') : t('landing.soundOff')}
          className="absolute top-20 md:top-[152px] right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/70 hover:text-white transition-all"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {soundOn ? `🔊 ${t('landing.soundOn')}` : `🔇 ${t('landing.soundOff')}`}
        </button>

        <div className="hero-content relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 py-28">
          <div className="inline-flex items-center gap-3 mb-7">
            <div className="w-8 h-px bg-amber-300" />
            <span className="text-amber-200 text-[11px] font-bold uppercase tracking-[0.3em]">{t('landing.hero1')}</span>
            <div className="w-8 h-px bg-amber-300" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-6" style={{ textShadow: '0 4px 32px rgba(0,0,0,0.8)' }}>
            <span className="block text-white">{t('landing.hero2')}</span>
            <span className="block text-green-400">{t('landing.hero3')}</span>
          </h1>

          <p className="text-base md:text-lg text-white/80 font-light max-w-md leading-relaxed mb-9" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
            {t('landing.heroDesc')}
          </p>

          {/* Главная кнопка — по центру */}
          <Link to={orderLink} className="btn-gold text-lg py-5 px-14 font-bold tracking-wide shadow-2xl shadow-green-900/50 mb-4">
            {t('landing.callVet')}
          </Link>

          {/* Ветпаспорт — ниже, жёлтая */}
          <Link to="/medcard" className="btn-yellow text-sm py-3 px-6 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/></svg>{t('landing.passportBtn', 'Ветеринарный паспорт')}
          </Link>

          {/* Как это работает — неприметная ссылка */}
          <a href="#how" className="text-xs text-white/45 hover:text-white/80 transition-colors mb-8 inline-flex items-center gap-1">
            {t('landing.howBtn', 'Как это работает')} <span aria-hidden="true">↓</span>
          </a>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-10 text-[13px] text-white/80" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
            {[t('landing.badge1', 'Оплата после визита'), t('landing.badge2', 'Лицензированные врачи'), t('landing.badge3', 'Медкарта онлайн')].map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4.5" stroke="#9BCD67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {b}
              </span>
            ))}
          </div>

          <div className="inline-flex flex-wrap justify-center rounded-2xl overflow-hidden"
            style={{ background: 'rgba(31,21,14,0.55)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {[
              { val: '50+',  label: t('landing.stats.vets') },
              { val: '870',  label: t('landing.stats.trips') },
              { val: '4.9★', label: t('landing.stats.rating') },
              { val: '24/7', label: t('landing.stats.always') },
            ].map((s, i, arr) => (
              <div key={s.label} className="px-7 py-4 text-center" style={i < arr.length - 1 ? { borderRight: '1px solid rgba(255,255,255,0.08)' } : {}}>
                <AnimatedNumber value={s.val} className="text-xl font-black text-white leading-none" />
                <div className="text-white/45 text-[9px] uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ЭКРАН 2: КАК ЭТО РАБОТАЕТ + УСЛУГИ ═══ */}
      <section id="how" className="relative bg-milk text-coffee-900 px-6 py-16 lg:py-20 scroll-mt-16 overflow-hidden">
        <div className="relative max-w-7xl mx-auto">

          {/* Шаги — с полупрозрачными фото и плавной анимацией */}
          <h2 className="reveal text-3xl md:text-4xl font-black tracking-tight mb-6">
            {t('landing.steps.subNew', 'Четыре шага')} <span className="text-coffee-400">{t('landing.steps.sub2')}</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {steps.map((s, i) => {
              const body = (
                <>
                  <img src={s.img} alt="" aria-hidden="true" loading="lazy"
                    className="kenburns absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-700"
                    style={{ animationDelay: `${-i * 4}s` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/85 to-cream/10" />
                  <div className="relative flex flex-col h-full p-5">
                    <div className="flex items-center gap-2 mb-auto">
                      <span className={`w-9 h-9 rounded-full bg-green-500 text-white text-sm font-black flex items-center justify-center ${i === 1 ? 'soft-pulse' : ''}`}>{s.num}</span>
                    </div>
                    <h3 className="font-bold text-coffee-900 mt-16 mb-1.5">{s.title}</h3>
                    <p className="text-coffee-600 text-sm leading-snug line-clamp-3">{s.desc}</p>
                  </div>
                </>
              );
              const cls = 'reveal group relative block overflow-hidden rounded-2xl border border-coffee-200/70 bg-cream h-full min-h-[230px] hover:-translate-y-1 hover:shadow-xl hover:shadow-coffee-900/10 transition-[transform,box-shadow] duration-500';
              const style = { '--d': `${i * 130}ms` } as React.CSSProperties;
              return s.link
                ? <Link key={s.num} to={s.link} className={cls} style={style}>{body}</Link>
                : <div key={s.num} className={cls} style={style}>{body}</div>;
            })}
          </div>

          {/* Услуги */}
          {services.length > 0 && (
            <div className="relative">
              <img src="/landing/services-bg.jpg" alt="" aria-hidden="true"
                className="kenburns pointer-events-none absolute -inset-x-10 -inset-y-6 w-[calc(100%+5rem)] h-[calc(100%+3rem)] object-cover opacity-[0.10] rounded-3xl"
                style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />
              <h2 className="reveal relative text-3xl md:text-4xl font-black tracking-tight mb-6">
                {t('landing.services.sub')} <span className="text-coffee-400">{t('landing.services.sub2')}</span>
              </h2>
              <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {services.map((svc, i) => (
                  <Link key={svc.id} to={`/service/${svc.id}`}
                    className="reveal shine group flex items-center gap-3 rounded-2xl px-4 py-3.5 border border-coffee-200/70 bg-cream/80 backdrop-blur-sm hover:bg-cream hover:border-green-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-900/10 transition-[transform,box-shadow,background-color,border-color] duration-300"
                    style={{ '--d': `${(i % 5) * 70 + Math.floor(i / 5) * 90}ms` } as React.CSSProperties}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                      <span className="icon-bob inline-flex"><ServiceIcon name={svc.name} size={22} /></span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-coffee-900 leading-tight truncate group-hover:text-green-700 transition-colors">{tName(svc.name)}</div>
                      <div className="text-xs text-coffee-500 mt-0.5">{t('landing.services.from')}{svc.price_from.toLocaleString()} ₽</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Магазин — компактный блок */}
          <Link to="/shop"
            className="reveal group mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-3xl bg-gradient-to-r from-[#3A651C] to-[#1E140D] text-white px-5 py-4 md:px-7 hover:shadow-xl transition-all">
            <div className="flex -space-x-2 flex-shrink-0">
              {['/shop/kibble.jpg', '/shop/treats.jpg', '/shop/bone.jpg', '/shop/bowtie.jpg'].map((src) => (
                <img key={src} src={src} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white/80 group-hover:-translate-y-0.5 transition-transform" />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#DBB685]">🛍 Магазин ВетДом</div>
              <div className="font-black text-lg leading-tight">Корма «ВетДом Натурал», препараты и игрушки</div>
              <div className="text-sm text-white/70">Покупайте за бонусы — на 10% выгоднее. Врач привезёт заказ при визите.</div>
            </div>
            <span className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FACC15] text-[#1E140D] font-black px-6 py-3">
              В магазин <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>

          {/* Благотворительность — аккуратный блок */}
          <Link to="/charity"
            className="reveal group mt-3 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-3xl bg-cream border border-coffee-200/70 px-5 py-4 md:px-7 hover:border-red-300 hover:shadow-lg hover:shadow-red-900/5 transition-all">
            <div className="flex -space-x-3 flex-shrink-0">
              {['tisha', 'graf', 'bublik', 'laska'].map((n) => (
                <img key={n} src={`/charity/${n}.jpg`} alt="" className="w-12 h-12 rounded-full object-cover border-[3px] border-cream group-hover:scale-105 transition-transform" />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-600">❤️ Благотворительность</div>
              <div className="font-black text-lg text-coffee-900 leading-tight">Помогите хвостикам, у которых нет хозяина</div>
              <div className="text-sm text-coffee-500">Тише нужна операция на лапе, Графу — на суставах. Наши врачи лечат без наценки.</div>
            </div>
            <span className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 group-hover:bg-red-600 text-white font-bold px-6 py-3 transition-colors">
              Помочь <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>

          {/* Нижняя полоса: призыв + предложить услугу */}
          <div className="mt-10 rounded-3xl bg-coffee-900 text-white px-6 py-6 md:px-8 flex flex-col md:flex-row md:items-center gap-5 justify-between">
            <div>
              <div className="text-xl md:text-2xl font-black">{t('landing.cta.title1')} {t('landing.cta.title2')} {t('landing.cta.title3')}</div>
              {!suggSent ? (
                !suggOpen ? (
                  <button onClick={() => setSuggOpen(true)} className="mt-1 text-sm text-amber-300 hover:text-amber-200 underline underline-offset-4">
                    {t('landing.suggest.question')} {t('landing.suggest.cta')} →
                  </button>
                ) : (
                  <form onSubmit={handleSuggestion} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input className="input text-sm py-2" placeholder={t('landing.suggest.comment')}
                      value={sugg.comment} onChange={(e) => setSugg({ ...sugg, comment: e.target.value })} required />
                    <input className="input text-sm py-2 sm:max-w-[160px]" placeholder={t('landing.suggest.telegram')}
                      value={sugg.telegram} onChange={(e) => setSugg({ ...sugg, telegram: e.target.value })} />
                    <button type="submit" disabled={suggLoading || !sugg.comment} className="btn-gold text-sm py-2 px-5 whitespace-nowrap">
                      {suggLoading ? t('landing.suggest.sending') : t('landing.suggest.send')}
                    </button>
                  </form>
                )
              ) : (
                <p className="mt-1 text-sm text-green-400">✓ {t('landing.suggest.thanks')} {t('landing.suggest.thanksDesc')}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 flex-shrink-0">
              <Link to={orderLink} className="btn-gold text-base py-3.5 px-8">
                {t('landing.callVet')}
              </Link>
              {!user && (
                <Link to="/login" className="inline-flex items-center py-3.5 px-6 rounded-xl border border-white/25 text-white/90 hover:bg-white/10 font-semibold transition-all">
                  {t('landing.cta.login', 'Войти')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
