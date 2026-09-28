import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(form);
      login(data.token, data.user);
      navigate('/order');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060d06] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-800/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/20 rounded-full blur-2xl" />
              <img src="/logo.jpeg" alt={t('nav.brand')}
                className="relative w-20 h-20 rounded-full object-cover border border-white/10" />
            </div>
            <div className="text-sm font-bold text-white tracking-[0.15em] uppercase">{t('nav.brand')} — {t('nav.brandSub')}</div>
          </Link>
          <h1 className="text-3xl font-black text-white mt-8 mb-2">{t('login.title')}</h1>
          <p className="text-white/30 text-sm">{t('login.sub')}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">{t('login.phone')}</label>
              <input className="input" type="tel" placeholder={t('login.phonePh')}
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('login.password')}</label>
              <input className="input" type="password" placeholder={t('login.passwordPh')}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn-gold w-full text-base py-3.5 font-bold tracking-wide" disabled={loading}>
              {loading ? t('login.loading') : t('login.submit')}
            </button>
          </form>
          <div className="divider my-6" />
          <p className="text-center text-sm text-white/30">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
              {t('login.register')}
            </Link>
          </p>
        </div>

        <p className="text-center text-white/15 text-xs mt-6">
          <Link to="/" className="hover:text-white/30 transition-colors">{t('login.back')}</Link>
        </p>
      </div>
    </div>
  );
}
