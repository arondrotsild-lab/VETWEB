import React, { useState, useEffect } from 'react';
import ServiceIcon from './components/ServiceIcon';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './components/SplashScreen';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrderPage from './pages/OrderPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import MedCardPage from './pages/MedCardPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import { getSvcName, ALL_SERVICE_NAMES_RU } from './utils/serviceNames';

function AppShell() {
  const [splashDone, setSplashDone] = useState(false);
  const { t } = useTranslation();

  // RTL support for Arabic
  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  // Re-run when language changes
  useEffect(() => {
    const onLangChange = () => {
      const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', i18n.language);
    };
    i18n.on('languageChanged', onLangChange);
    return () => i18n.off('languageChanged', onLangChange);
  }, []);

  const lang = i18n.language || 'ru';

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#060d06]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/order" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
              <Route path="/order/:id" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/medcard" element={<MedCardPage />} />
              <Route path="/service/:id" element={<ServiceDetailPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="bg-[#040a04] border-t border-white/5 pt-16 pb-10">
            <div className="max-w-7xl mx-auto px-6">

              {/* Top row: brand + account */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-12">
                <div className="max-w-xs">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-400/20 rounded-full blur-lg" />
                      <img src="/logo.jpeg" alt={t('nav.brand')} className="relative w-11 h-11 rounded-full object-cover border border-white/10" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-wide">{t('nav.brand')}</div>
                      <div className="text-[10px] font-semibold text-green-400 uppercase tracking-[0.2em]">{t('nav.brandSub')}</div>
                    </div>
                  </div>
                  <p className="text-white/25 text-xs leading-relaxed mb-4">{t('footer.desc')}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400/70 text-xs font-semibold">{t('footer.live')}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <span className="text-white/20 text-[10px] uppercase tracking-[0.2em] mb-1">{t('footer.account')}</span>
                  {[
                    { key: 'footer.login', to: '/login' },
                    { key: 'footer.register', to: '/register' },
                    { key: 'footer.orders', to: '/history' },
                    { key: 'footer.profile', to: '/profile' },
                  ].map(({ key, to }) => (
                    <a key={key} href={to} className="text-white/40 hover:text-white/80 transition-colors text-sm">{t(key)}</a>
                  ))}
                </div>
              </div>

              {/* Services grid — always show Russian service names for ServiceIcon lookup */}
              <div className="rounded-2xl p-6 mb-10" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-5 h-px bg-amber-400" />
                  <span className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">{t('footer.allServices')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {ALL_SERVICE_NAMES_RU.map((ruName) => (
                    <a key={ruName} href="/order"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-green-400/50 group-hover:text-green-400/80 transition-colors flex-shrink-0">
                        <ServiceIcon name={ruName} size={16} />
                      </span>
                      <span className="text-white/45 group-hover:text-white/80 transition-colors text-xs leading-tight">
                        {getSvcName(ruName, lang)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
                <p className="text-white/15 text-xs">{t('footer.copyright')}</p>
                <p className="text-white/15 text-xs">{t('footer.license')}</p>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
