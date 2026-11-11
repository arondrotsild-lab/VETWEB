import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// Плавный «выезд» нового экрана на телефоне, как в мобильном приложении
function ScreenTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="screen-in">{children}</div>;
}

// При переходе на другую страницу — всегда показываем её с самого верха
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import MobileTabBar from './components/MobileTabBar';
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
import CharityPage from './pages/CharityPage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import ChatPage from './pages/ChatPage';
import ChatsPage from './pages/ChatsPage';
import ServicesPage from './pages/ServicesPage';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';

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

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#1F150E]">
          <ScrollToTop />
          <Navbar />
          <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
            <ScreenTransition>
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
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/charity" element={<CharityPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:id" element={<ProductPage />} />
              <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
              <Route path="/chat/:orderId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            </Routes>
            </ScreenTransition>
          </main>

          {/* Footer — манифест бренда */}
          <footer className="hidden md:block relative overflow-hidden bg-[#170F0A] border-t border-white/5 pt-20 pb-10">
            <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-green-500/10 blur-[120px]" />
            <div className="relative max-w-7xl mx-auto px-6">

              <div className="grid lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-20 items-start mb-16">
                <div>
                  <div className="flex items-center gap-3 mb-7">
                    <img src="/logo.jpeg" alt={t('nav.brand')} className="w-11 h-11 rounded-full object-cover border border-white/10" />
                    <div>
                      <div className="text-sm font-bold text-white tracking-wide">{t('nav.brand')}</div>
                      <div className="text-[10px] font-semibold text-green-400 uppercase tracking-[0.2em]">{t('nav.brandSub')}</div>
                    </div>
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-[3.4rem] font-black leading-[1.05] tracking-tight text-white">
                    {t('footer.m.title1', 'Мы приезжаем раньше,')}{' '}
                    <span className="text-green-400">{t('footer.m.title2', 'чем становится поздно.')}</span>
                  </h2>
                </div>

                <div className="lg:pt-[4.5rem]">
                  <p className="text-white/60 leading-relaxed mb-5">
                    {t('footer.m.p1', 'Когда питомцу плохо, счёт идёт на минуты. Пока вы ищете клинику, ловите испуганного кота и стоите в пробке — драгоценное время уходит.')}
                  </p>
                  <p className="text-white/85 leading-relaxed mb-6">
                    {t('footer.m.p2', 'Поэтому врач едет к вам сам. Ближайший свободный ветеринар получает вызов за секунды и приезжает с лекарствами, инструментами и всей историей болезни питомца. Вы видите на карте, где он, — и знаете: помощь уже рядом.')}
                  </p>
                  <p className="text-lg font-bold text-amber-300">
                    {t('footer.m.punch', 'Ваш питомец — дома. Врач — уже в пути.')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden bg-white/5 mb-12">
                {[
                  { v: t('footer.m.f1v', '1 касание'), l: t('footer.m.f1l', 'чтобы вызвать врача') },
                  { v: t('footer.m.f2v', '15–60 мин'), l: t('footer.m.f2l', 'и ветеринар у вашей двери') },
                  { v: t('footer.m.f3v', '24/7'), l: t('footer.m.f3l', 'даже ночью и в праздники') },
                ].map((f) => (
                  <div key={f.l} className="bg-[#1B120C] px-4 py-6 md:px-8 text-center md:text-left">
                    <div className="text-2xl md:text-3xl font-black text-white">{f.v}</div>
                    <div className="text-white/40 text-xs md:text-sm mt-1">{f.l}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
                <p className="text-white/30 text-xs">{t('footer.copyright')}</p>
                <p className="text-white/30 text-xs">{t('footer.license')}</p>
              </div>
            </div>
          </footer>
          <MobileTabBar />
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
