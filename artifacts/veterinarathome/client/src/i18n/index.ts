import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ru from './locales/ru';
import en from './locales/en';
import tr from './locales/tr';
import ar from './locales/ar';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru }, en: { translation: en }, tr: { translation: tr }, ar: { translation: ar } },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'en', 'tr', 'ar'],
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  });

export default i18n;
