import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister, createPet } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const { login, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(() => token ? 2 : 1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [owner, setOwner] = useState({ name: '', phone: '', email: '', password: '', confirm: '', telegram_nick: '' });
  const [pet, setPet] = useState({ name: '', species: 'Кошка', breed: '', age_years: '', diagnoses: '', previous_treatment: '', current_concern: '', photo_url: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (owner.password !== owner.confirm) { setError(t('register.errPassMismatch')); return; }
    if (owner.password.length < 6) { setError(t('register.errPassShort')); return; }
    setLoading(true);
    try {
      const data = await apiRegister({ name: owner.name, phone: owner.phone, email: owner.email, password: owner.password, telegram_nick: owner.telegram_nick || undefined });
      login(data.token, data.user);
      setStep(2);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || t('register.errGeneral'));
    } finally { setLoading(false); }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setPhotoPreview(base64);
      setPet((p) => ({ ...p, photo_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pet.name) { setError(t('register.errNoPetName')); return; }
    setLoading(true);
    try {
      await createPet({ name: pet.name, species: pet.species, breed: pet.breed || undefined, age_years: pet.age_years ? Number(pet.age_years) : undefined, photo_url: pet.photo_url || undefined, diagnoses: pet.diagnoses || undefined, previous_treatment: pet.previous_treatment || undefined, current_concern: pet.current_concern || undefined });
      navigate('/');
    } catch { setError(t('register.errPetSave')); }
    finally { setLoading(false); }
  };

  const inputCls = 'input w-full';
  const SPECIES_OPTS = [
    t('register.species.cat'), t('register.species.dog'), t('register.species.bird'),
    t('register.species.rodent'), t('register.species.reptile'), t('register.species.other'),
  ];

  return (
    <div className="min-h-screen bg-[#060d06] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {loading && step === 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020702]/80 px-5 backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-green-400/20 bg-[#0b160c] px-7 py-9 text-center shadow-[0_0_80px_rgba(74,222,128,0.15)]">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-green-400/80 to-transparent" />
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full border border-green-400/20" />
              <div className="absolute inset-2 animate-pulse rounded-full bg-green-400/10 blur-md" />
              <div className="relative flex h-16 w-16 animate-pulse items-center justify-center rounded-full border border-green-400/40 bg-green-400/10 text-3xl shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                🐾
              </div>
            </div>
            <h2 className="text-xl font-black leading-snug text-white">
              Идёт создание<br />
              <span className="text-green-400">виртуального паспорта</span>
            </h2>
            <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Сохраняем данные и фотографию питомца.<br />Пожалуйста, не закрывайте страницу.
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-800/15 rounded-full blur-[100px]" />
      </div>
      <div className="relative w-full max-w-lg">
        {/* Logo + step indicator */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/20 rounded-full blur-2xl" />
              <img src="/logo.jpeg" alt={t('nav.brand')} className="relative w-16 h-16 rounded-full object-cover border border-white/10" />
            </div>
            <div className="text-xs font-bold text-white tracking-[0.15em] uppercase">{t('nav.brand')} — {t('nav.brandSub')}</div>
          </Link>
          <div className="flex items-center justify-center gap-3 mt-6">
            {[1, 2].map((n) => (
              <React.Fragment key={n}>
                <div className={`flex items-center gap-2 transition-all ${step === n ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${step > n ? 'bg-green-400 border-green-400 text-black' : step === n ? 'border-green-400 text-green-400' : 'border-white/20 text-white/40'}`}>
                    {step > n ? '✓' : n}
                  </div>
                  <span className="text-xs text-white/60">{n === 1 ? t('register.tab1') : t('register.tab2')}</span>
                </div>
                {n < 2 && <div className={`w-10 h-px ${step > 1 ? 'bg-green-400/50' : 'bg-white/10'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
          {/* Step 1 — Owner */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-black text-white mb-1">{t('register.title')}</h1>
              <p className="text-white/30 text-sm mb-6">{t('register.step1')}</p>
              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="label">{t('register.name')}</label>
                  <input className={inputCls} type="text" placeholder={t('register.namePh')} value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t('register.phone')}</label>
                  <input className={inputCls} type="tel" placeholder={t('register.phonePh')} value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t('register.email')} <span className="text-white/20 font-normal">{t('register.emailOpt')}</span></label>
                  <input className={inputCls} type="email" placeholder={t('register.emailPh')} value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('register.tg')} <span className="text-white/20 font-normal">{t('register.emailOpt')}</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                    <input className={inputCls} style={{ paddingLeft: '2rem' }} type="text" placeholder={t('register.tgPh')} value={owner.telegram_nick} onChange={(e) => setOwner({ ...owner, telegram_nick: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('register.password')}</label>
                    <input className={inputCls} type="password" placeholder={t('register.passwordHint')} value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">{t('register.confirm')}</label>
                    <input className={inputCls} type="password" placeholder={t('register.confirmPh')} value={owner.confirm} onChange={(e) => setOwner({ ...owner, confirm: e.target.value })} required />
                  </div>
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2" role="alert">
                    <span>⚠</span> {error}
                  </div>
                )}
                <button type="submit" className="btn-gold w-full text-base py-3.5 font-bold tracking-wide mt-2" disabled={loading}>
                  {loading ? t('register.loading') : t('register.next')}
                </button>
              </form>
              <div className="divider my-5" />
              <p className="text-center text-sm text-white/30">
                {t('register.haveAccount')}{' '}
                <Link to="/login" className="text-green-400 font-semibold hover:text-green-300 transition-colors">{t('register.login')}</Link>
              </p>
            </>
          )}

          {/* Step 2 — Pet */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-black text-white mb-1">{t('register.petTitle')}</h1>
              <p className="text-white/30 text-sm mb-6">{t('register.petStep')}</p>
              <form onSubmit={handleStep2} className="space-y-4">
                <div>
                  <label className="label">{t('register.petPhoto')}</label>
                  <div className="relative flex items-center gap-4 p-4 rounded-xl border border-dashed border-white/15 cursor-pointer hover:border-green-400/40 transition-colors" onClick={() => fileRef.current?.click()}>
                    {photoPreview ? (
                      <img src={photoPreview} alt={t('register.petLabel')} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-2xl">🐾</div>
                    )}
                    <div>
                      <p className="text-white/60 text-sm">{photoPreview ? t('register.photoChosen') : t('register.photoClick')}</p>
                      <p className="text-white/25 text-xs mt-0.5">{t('register.photoHint')}</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('register.petName')}</label>
                    <input className={inputCls} type="text" placeholder={t('register.petNamePh')} value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">{t('register.petSpecies')}</label>
                    <select className={inputCls} value={pet.species} onChange={(e) => setPet({ ...pet, species: e.target.value })}>
                      {SPECIES_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('register.petBreed')} <span className="text-white/20 font-normal">{t('register.emailOpt')}</span></label>
                    <input className={inputCls} type="text" placeholder={t('register.petBreedPh')} value={pet.breed} onChange={(e) => setPet({ ...pet, breed: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('register.petAge')}</label>
                    <input className={inputCls} type="number" min="0" max="30" placeholder={t('register.petAgePh')} value={pet.age_years} onChange={(e) => setPet({ ...pet, age_years: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('register.petDiag')}</label>
                  <textarea className={inputCls} rows={2} placeholder={t('register.petDiagPh')} value={pet.diagnoses} onChange={(e) => setPet({ ...pet, diagnoses: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('register.petTreat')}</label>
                  <textarea className={inputCls} rows={2} placeholder={t('register.petTreatPh')} value={pet.previous_treatment} onChange={(e) => setPet({ ...pet, previous_treatment: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('register.petConcern')}</label>
                  <textarea className={inputCls} rows={2} placeholder={t('register.petConcernPh')} value={pet.current_concern} onChange={(e) => setPet({ ...pet, current_concern: e.target.value })} />
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2" role="alert">
                    <span>⚠</span> {error}
                  </div>
                )}
                <div className="flex gap-3 mt-2">
                  <button type="submit" className="btn-gold flex-1 text-base py-3.5 font-bold tracking-wide" disabled={loading}>
                    {loading ? t('register.petLoading') : t('register.petAdd')}
                  </button>
                  <button type="button" onClick={() => navigate('/')} className="px-5 py-3.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    {t('register.petSkip')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-white/15 text-xs mt-5">
          <Link to="/" className="hover:text-white/30 transition-colors">{t('register.back')}</Link>
        </p>
      </div>
    </div>
  );
}
