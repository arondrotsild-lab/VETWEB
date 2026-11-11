import { useEffect, useRef, useState } from 'react';
import Flag from './Flag';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';

// Настройки клиента: фото, имя, email, Telegram, пароль, язык, выход
const LANGS = [['ru', 'Русский'], ['en', 'English'], ['tr', 'Türkçe'], ['ar', 'العربية']];

// Сжимаем фото до 800 px, чтобы загрузка с телефона была быстрой
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.88));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('bad'));
    img.src = URL.createObjectURL(file);
  });
}

const errText = (e: unknown, f: string) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error || f;

export default function ClientSettings({ onAvatar }: { onAvatar?: (url: string) => void }) {
  const { user, login, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', telegram_nick: '' });
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar_url);
  const [pw, setPw] = useState({ old: '', next: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ k: string; ok: boolean; t: string } | null>(null);
  const [lang, setLang] = useState(i18n.language || 'ru');

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      setForm({ name: r.data.name ?? '', email: r.data.email ?? '', telegram_nick: r.data.telegram_nick ?? '' });
      setAvatar(r.data.avatar_url);
    }).catch(() => {});
  }, []);

  // обновляем имя и фото в шапке сайта без перезахода
  const refreshUser = (patch: Record<string, unknown>) => {
    const token = localStorage.getItem('token');
    if (token && user) login(token, { ...user, ...patch } as typeof user);
  };

  const say = (k: string, ok: boolean, t: string) => { setMsg({ k, ok, t }); setTimeout(() => setMsg((m) => (m?.k === k ? null : m)), 3000); };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    setBusy('photo');
    try {
      const r = await api.post('/auth/avatar', { image: await resizeImage(f) });
      setAvatar(r.data.avatar_url); onAvatar?.(r.data.avatar_url); refreshUser({ avatar_url: r.data.avatar_url });
      say('photo', true, 'Фото обновлено');
    } catch (e) { say('photo', false, errText(e, 'Не удалось загрузить фото')); }
    finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const saveProfile = async () => {
    setBusy('profile');
    try {
      const r = await api.patch('/auth/me', form);
      setForm({ name: r.data.name ?? '', email: r.data.email ?? '', telegram_nick: r.data.telegram_nick ?? '' });
      refreshUser({ name: r.data.name, email: r.data.email });
      say('profile', true, 'Сохранено');
    } catch (e) { say('profile', false, errText(e, 'Не удалось сохранить')); }
    finally { setBusy(''); }
  };

  const savePassword = async () => {
    setBusy('pw');
    try { await api.post('/auth/password', { old_password: pw.old, new_password: pw.next }); setPw({ old: '', next: '' }); say('pw', true, 'Пароль изменён'); }
    catch (e) { say('pw', false, errText(e, 'Не удалось сменить пароль')); }
    finally { setBusy(''); }
  };

  const Msg = ({ k }: { k: string }) => msg?.k === k ? <span className={`text-sm font-semibold ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.ok ? '✓ ' : ''}{msg.t}</span> : null;
  const initials = (form.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const box = 'rounded-3xl bg-white/[0.04] border border-white/10 p-4';

  return (
    <div className="space-y-4 pb-2 text-white">
      {/* Фото */}
      <div className={`${box} flex items-center gap-4`}>
        <div className="relative flex-shrink-0">
          {avatar
            ? <img src={avatar} alt="" className="w-20 h-20 rounded-3xl object-cover border-2 border-green-400/50" />
            : <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black text-green-400 bg-green-400/10 border-2 border-green-400/30">{initials}</div>}
          <button onClick={() => fileRef.current?.click()} disabled={busy === 'photo'} aria-label="Сменить фото"
            className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-[#2A1D14] shadow-lg">
            {busy === 'photo' ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : '📷'}
          </button>
        </div>
        <div className="min-w-0">
          <div className="font-black text-lg leading-tight">{form.name}</div>
          <div className="text-xs text-white/50 mt-0.5">{user?.phone}</div>
          <button onClick={() => fileRef.current?.click()} className="text-sm font-bold text-green-400 mt-1.5">Сменить фото</button>
          <div><Msg k="photo" /></div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
      </div>

      {/* Личные данные */}
      <div className={`${box} space-y-3`}>
        <div className="font-black">👤 Личные данные</div>
        <div><label className="label">Имя и фамилия</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="input" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="mail@example.ru" /></div>
        <div><label className="label">Telegram</label><input className="input" value={form.telegram_nick} onChange={(e) => setForm({ ...form, telegram_nick: e.target.value })} placeholder="@username" /></div>
        <div className="text-xs text-white/40">Телефон для входа: {user?.phone}</div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={saveProfile} disabled={busy === 'profile'} className="btn-gold py-3 px-6 text-sm">{busy === 'profile' ? 'Сохраняю…' : 'Сохранить'}</button>
          <Msg k="profile" />
        </div>
      </div>

      {/* Язык */}
      <div className={box}>
        <div className="font-black mb-3">🌍 Язык приложения</div>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map(([k, l]) => (
            <button key={k} onClick={() => { i18n.changeLanguage(k); setLang(k); }}
              className={`rounded-2xl py-2.5 text-sm font-bold border transition-colors ${lang === k ? 'bg-green-500 border-green-400 text-white' : 'bg-white/[0.05] border-white/10 text-white/75'}`}><span className="inline-flex items-center justify-center gap-2" data-notr><Flag code={k} />{l}</span></button>
          ))}
        </div>
      </div>

      {/* Пароль */}
      <div className={`${box} space-y-3`}>
        <div className="font-black">🔒 Пароль</div>
        <div><label className="label">Текущий пароль</label><input className="input" type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></div>
        <div><label className="label">Новый пароль</label><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="минимум 6 символов" /></div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={savePassword} disabled={busy === 'pw' || !pw.old || !pw.next} className="btn-gold py-3 px-6 text-sm">Сменить пароль</button>
          <Msg k="pw" />
        </div>
      </div>

      <button onClick={logout} className="w-full py-3.5 rounded-2xl text-sm font-bold text-red-400 border border-red-400/25 bg-red-500/[0.06]">Выйти из аккаунта</button>
    </div>
  );
}
