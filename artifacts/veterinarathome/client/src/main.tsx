import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { setupKeyboard } from './utils/keyboard';
import { startTranslator } from './utils/domTranslate';

setupKeyboard();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Новые экраны приложения — на выбранном языке (русский / English / Türkçe / العربية)
startTranslator();

// Регистрация service worker — чтобы платформу можно было установить как приложение
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
