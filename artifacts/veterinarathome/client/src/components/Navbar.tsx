import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPets } from '../api';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import SearchBar from './SearchBar';

interface Pet { id: number; name: string; species: string; photo_url?: string; }

const LANGS = [
  { code: 'ru', label: 'РУ', full: 'Русский' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'tr', label: 'TR', full: 'Türkçe' },
  { code: 'ar', label: 'عر', full: 'العربية' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [pets, setPets]             = useState<Pet[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const currentLang = LANGS.find(l => l.code === i18n.language) ?? LANGS[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cmd+K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (user) getPets().then(setPets).catch(() => {});
    else setPets([]);
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;
  const changeLang = (code: string) => { i18n.changeLanguage(code); setLangOpen(false); };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-[#060d06]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/20 rounded-full blur-lg group-hover:bg-green-400/30 transition-all duration-300" />
              <img src="/logo.jpeg" alt={t('nav.brand')} className="relative h-10 w-10 rounded-full object-cover border border-white/20" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-white tracking-wide">{t('nav.brand')}</div>
              <div className="text-[10px] font-semibold text-green-400 uppercase tracking-[0.2em]">{t('nav.brandSub')}</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { to: '/', label: t('nav.home') },
              ...(user ? [{ to: '/history', label: t('nav.orders') }] : []),
            ].map(({ to, label }) => (
              <Link key={to} to={to}
                className={`text-sm font-medium tracking-wide transition-all duration-300 relative group px-4 py-1.5 rounded-full ${
                  isActive(to) ? 'text-green-400' : 'text-white/60 hover:text-white'
                }`}
                style={isActive(to) ? {
                  background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                } : { border: '1px solid transparent' }}
              >
                {label}
                {!isActive(to) && (
                  <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }} />
                )}
              </Link>
            ))}
          </div>

          {/* Search button (desktop) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 group hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, rgba(74,222,128,0.14) 0%, rgba(74,222,128,0.06) 100%)',
              border: '1px solid rgba(74,222,128,0.35)',
              color: 'rgba(74,222,128,0.9)',
              boxShadow: '0 0 12px rgba(74,222,128,0.12)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="7" cy="7" r="5"/><path d="M12 12l2.5 2.5"/>
            </svg>
            <span className="text-xs tracking-wide">{t('nav.search')}</span>
            <kbd className="flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgba(74,222,128,0.55)' }}>
              ⌘K
            </kbd>
          </button>

          {/* Right: Lang switcher + Auth */}
          <div className="hidden md:flex items-center gap-3">

            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white/50 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span>{currentLang.label}</span>
                <svg className={`w-2.5 h-2.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 10">
                  <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-36 rounded-xl py-1.5 z-50 overflow-hidden"
                    style={{ background: 'rgba(6,13,6,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(32px)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                    {LANGS.map(l => (
                      <button key={l.code} onClick={() => changeLang(l.code)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors ${
                          l.code === i18n.language ? 'text-green-400 bg-green-400/8' : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}>
                        <span className="font-bold w-5 text-center">{l.label}</span>
                        <span className="font-normal opacity-70">{l.full}</span>
                        {l.code === i18n.language && (
                          <svg className="w-3 h-3 ml-auto text-green-400" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Auth area */}
            {user ? (
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all duration-200 hover:bg-white/5"
                  style={{
                    background: profileOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  }}>
                  <div className="w-7 h-7 rounded-full bg-green-400/20 border border-green-400/30 flex items-center justify-center text-xs font-black text-green-400">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white leading-none">{user.name.split(' ')[0]}</div>
                    {pets.length > 0 && (
                      <div className="text-[10px] text-white/35 mt-0.5 leading-none">
                        {pets.slice(0, 2).map(p => p.name).join(', ')}{pets.length > 2 ? ` +${pets.length - 2}` : ''}
                      </div>
                    )}
                  </div>
                  <svg className={`w-3 h-3 text-white/30 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 12 12">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl py-3 z-50"
                    style={{ background: 'rgba(6,13,6,0.95)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                    <div className="px-4 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-400/15 border border-green-400/25 flex items-center justify-center text-sm font-black text-green-400">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{user.name}</div>
                          <div className="text-[10px] text-white/30 uppercase tracking-wider">{t('nav.owner')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pt-3 pb-2">
                      <div className="text-[10px] text-white/25 uppercase tracking-widest mb-2">{t('nav.pets')}</div>
                      {pets.length === 0 ? (
                        <p className="text-white/25 text-xs">{t('nav.noPets')}</p>
                      ) : (
                        <div className="space-y-2">
                          {pets.map((p) => (
                            <div key={p.id} className="flex items-center gap-2.5">
                              {p.photo_url ? (
                                <img src={p.photo_url} alt={p.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm flex-shrink-0">🐾</div>
                              )}
                              <div>
                                <div className="text-xs font-medium text-white/80">{p.name}</div>
                                <div className="text-[10px] text-white/25">{p.species}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Link to="/profile" onClick={() => setProfileOpen(false)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-green-400 transition-all hover:bg-green-400/10"
                        style={{ border: '1px solid rgba(74,222,128,0.2)' }}>
                        {t('nav.addPet')}
                      </Link>
                    </div>
                    <div className="px-4 pt-2 border-t border-white/5">
                      <Link to="/profile" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all w-full">
                        👤 {t('nav.profile')}
                      </Link>
                      <button onClick={() => { handleLogout(); setProfileOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all w-full">
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
                {profileOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />}
              </div>
            ) : (
              <Link to="/login"
                className="text-sm font-semibold text-white tracking-wide px-5 py-2 rounded-full transition-all duration-200 hover:text-green-400"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                {t('nav.login')}
              </Link>
            )}
          </div>

            {/* Mobile search icon */}
          <button className="md:hidden p-2 text-white/50 hover:text-white transition-colors" onClick={() => setSearchOpen(true)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="9" cy="9" r="6"/><path d="M14 14l3 3"/>
            </svg>
          </button>

          {/* Mobile burger */}
          <button className="md:hidden p-2 text-white/60 hover:text-white transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-6 flex flex-col gap-1.5">
              <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-6 border-t border-white/5 pt-4 flex flex-col gap-4 bg-[#060d06]/95 backdrop-blur-xl">
            <Link to="/" className="text-sm font-medium text-white/70 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
            {user ? (
              <>
                <Link to="/order" className="text-sm font-medium text-white/70 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>{t('nav.callVet')}</Link>
                <Link to="/history" className="text-sm font-medium text-white/70 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>{t('nav.orders')}</Link>
                <Link to="/profile" className="text-sm font-medium text-white/70 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>{t('nav.profile')}</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-sm text-red-400/70 hover:text-red-400 text-left font-medium transition-colors">{t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-white/70" onClick={() => setMenuOpen(false)}>{t('nav.login')}</Link>
                <Link to="/register" className="btn-gold text-sm py-2 px-4 text-center" onClick={() => setMenuOpen(false)}>{t('nav.startFree')}</Link>
              </>
            )}
            {/* Language switcher mobile */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${l.code === i18n.language ? 'text-green-400 bg-green-400/10' : 'text-white/30 hover:text-white/70'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global search overlay */}
      <SearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
