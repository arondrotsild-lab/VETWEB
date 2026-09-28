import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getServices, getPets, createOrder, createPet } from '../api';
import ServiceIcon from '../components/ServiceIcon';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getSvcName, getSvcDesc } from '../utils/serviceNames';

interface Service { id: number; name: string; description: string; price_from: number; price_to: number; duration_minutes: number; icon: string; }
interface Pet { id: number; name: string; species: string; breed?: string; age_years?: number; }

export default function OrderPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const lang = i18n.language || 'ru';
  const tName = (name: string) => getSvcName(name, lang);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPet, setNewPet] = useState({ name: '', species: '', breed: '', age_years: '' });
  const [addingPet, setAddingPet] = useState(false);
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;

  // Payment state
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'sbp'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardFlipped, setCardFlipped] = useState(false);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [successProgress, setSuccessProgress] = useState(0);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  const formatCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };
  const detectBrand = (n: string): { label: string; icon: React.ReactNode } => {
    const d = n.replace(/\s/g, '');
    if (d.startsWith('4')) return { label: 'VISA', icon: (
      <svg width="44" height="16" viewBox="0 0 44 16" fill="none"><path d="M16.8 1.5L13.2 14.5H9.8L13.4 1.5H16.8ZM31.6 9.6L33.4 4.7L34.4 9.6H31.6ZM35.6 14.5H38.7L36 1.5H33.1C32.4 1.5 31.8 1.9 31.5 2.5L26.5 14.5H30.1L30.8 12.5H35.2L35.6 14.5ZM26.6 9.9C26.6 6.5 22 6.3 22 4.8C22 4.3 22.5 3.8 23.5 3.6C24.5 3.5 25.8 3.7 26.9 4.2L27.5 1.7C26.4 1.3 25 1 23.4 1C20 1 17.6 2.7 17.6 5.1C17.6 6.9 19.3 7.9 20.6 8.5C21.9 9.1 22.4 9.6 22.4 10.2C22.4 11.1 21.3 11.5 20.4 11.5C19 11.6 18.3 11.4 16.9 10.8L16.3 13.4C17.7 14 19.2 14.3 20.7 14.3C24.4 14.3 26.6 12.6 26.6 9.9ZM12.2 1.5L6.5 14.5H2.9L.1 4.1C-.1 3.4.4 2.7 1.1 2.5C2.4 2.1 3.9 1.5 5.5 1.2L8.8 14.5H12.2L12.2 1.5Z" fill="white"/></svg>
    )};
    if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return { label: 'MASTERCARD', icon: (
      <svg width="36" height="22" viewBox="0 0 36 22" fill="none"><circle cx="13" cy="11" r="11" fill="#EB001B" fillOpacity="0.85"/><circle cx="23" cy="11" r="11" fill="#F79E1B" fillOpacity="0.85"/><path fillRule="evenodd" d="M18 4.4a11 11 0 010 13.2A11 11 0 0118 4.4z" fill="#FF5F00" fillOpacity="0.85"/></svg>
    )};
    if (/^2/.test(d)) return { label: 'МИР', icon: (
      <svg width="40" height="14" viewBox="0 0 40 14" fill="none"><text x="0" y="11" fontSize="12" fontWeight="800" fill="white" fontFamily="sans-serif">МИР</text></svg>
    )};
    return { label: '', icon: null };
  };
  const brand = detectBrand(cardNumber);
  const displayNumber = cardNumber || '•••• •••• •••• ••••';

  const SPECIES = [t('order.species.cat'), t('order.species.dog'), t('order.species.rabbit'), t('order.species.hamster'), t('order.species.bird'), t('order.species.reptile'), t('order.species.other')];

  useEffect(() => {
    Promise.all([getServices(), getPets()]).then(([s, p]) => { setServices(s); setPets(p); });
    setNewPet((p) => ({ ...p, species: t('order.species.cat') }));
  }, []);

  const handleAddPet = async () => {
    if (!newPet.name) { alert(t('order.petName').replace(' *', '')); return; }
    setAddingPet(true);
    try {
      const pet = await createPet({ ...newPet, age_years: newPet.age_years ? parseInt(newPet.age_years) : null });
      setPets([...pets, pet]);
      setSelectedPetId(pet.id);
      setShowAddPet(false);
      setNewPet({ name: '', species: SPECIES[0], breed: '', age_years: '' });
    } catch { alert(t('order.errPet')); }
    finally { setAddingPet(false); }
  };

  const toggleService = (svc: Service) => {
    setSelectedServices((prev) => prev.find((s) => s.id === svc.id) ? prev.filter((s) => s.id !== svc.id) : [...prev, svc]);
  };

  const totalFrom = selectedServices.reduce((sum, s) => sum + s.price_from, 0);

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || !selectedPetId || !address || !scheduledAt) return;
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      alert(t('order.errOrder'));
      return;
    }
    setLoading(true);
    setPayProcessing(true);
    try {
      const orders = await Promise.all(
        selectedServices.map((svc) => createOrder({
          service_id: svc.id,
          pet_id: selectedPetId,
          address,
          scheduled_at: scheduledDate.toISOString(),
          notes,
        }))
      );
      setCreatedOrderId(orders[0].id);
      // Show success after a short processing delay
      await new Promise(r => setTimeout(r, 1400));
      setPayProcessing(false);
      setPaySuccess(true);
      // Animate progress bar, then navigate
      let p = 0;
      const iv = setInterval(() => {
        p += 2;
        setSuccessProgress(p);
        if (p >= 100) { clearInterval(iv); navigate(`/order/${orders[0].id}`); }
      }, 60);
    } catch { alert(t('order.errOrder')); setLoading(false); setPayProcessing(false); }
  };

  // Mini social proof (language-neutral counts, always relevant)
  const miniProof: Record<string, string> = {
    'Капельниц': '2 847', 'Передержк': '1 230', 'Выгул': '4 100+', 'Осмотр': '12 400',
    'Вакцин': '8 600', 'Скорая': '3 200', 'Хирург': '900+', 'Кастрац': '3 600',
    'Стерилиз': '2 900', 'Анализ': '15 000', 'Паразит': '6 000', 'Груминг': '4 400', 'Консульт': '7 500',
  };
  const getMini = (name: string) => {
    for (const key of Object.keys(miniProof)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return miniProof[key];
    }
    return '5 000+';
  };

  const stepLabels = [t('order.steps.service'), t('order.steps.pet'), t('order.steps.address'), t('order.steps.payment'), t('order.steps.confirm')];

  // Confetti particles — generated once
  const confetti = React.useMemo(() => Array.from({ length: 38 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    size: 5 + Math.random() * 8,
    delay: Math.random() * 0.8,
    dur: 2.2 + Math.random() * 1.4,
    color: ['#4ade80','#fbbf24','#60a5fa','#f472b6','#a78bfa','#34d399','#fb923c'][i % 7],
    shape: i % 4 === 0 ? 'circle' : i % 4 === 1 ? 'rect' : i % 4 === 2 ? 'star' : 'rect',
    rotate: Math.random() * 360,
    rotateSpeed: (Math.random() - 0.5) * 720,
  })), []);

  return (
    <>
    {/* ═══ PROCESSING OVERLAY ═══ */}
    {payProcessing && (
      <div className="fixed inset-0 z-[9000] flex flex-col items-center justify-center"
        style={{ background: 'rgba(4,10,4,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="relative flex items-center justify-center mb-8">
          {/* Outer ring */}
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: 'pay-spin 1.4s linear infinite', position: 'absolute' }}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(74,222,128,0.12)" strokeWidth="3"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(74,222,128,0.8)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="60 280" strokeDashoffset="0"/>
          </svg>
          {/* Inner ring reverse */}
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ animation: 'pay-spin-rev 2s linear infinite', position: 'absolute' }}>
            <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="2"
              strokeLinecap="round" strokeDasharray="30 210"/>
          </svg>
          {/* Card icon center */}
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#0f2417,#0a3320)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none" stroke="rgba(74,222,128,0.8)" strokeWidth="1.8" strokeLinecap="round">
              <rect x="1" y="1" width="26" height="18" rx="3"/>
              <path d="M1 7h26M6 13h4"/>
            </svg>
          </div>
        </div>
        <p className="text-white/70 text-base font-semibold tracking-wide mb-2" style={{ animation: 'pay-fade-in 0.5s ease' }}>
          {lang === 'ar' ? 'جاري معالجة الطلب...' : lang === 'tr' ? 'Ödeme işleniyor...' : lang === 'en' ? 'Processing payment...' : 'Обрабатываем заказ...'}
        </p>
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-400"
              style={{ animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
          ))}
        </div>
        <style>{`
          @keyframes pay-spin { to { transform: rotate(360deg); } }
          @keyframes pay-spin-rev { to { transform: rotate(-360deg); } }
          @keyframes pay-fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes dot-pulse { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1.3)} }
        `}</style>
      </div>
    )}

    {/* ═══ SUCCESS OVERLAY ═══ */}
    {paySuccess && (
      <div className="fixed inset-0 z-[9001] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'rgba(3,9,3,0.97)', backdropFilter: 'blur(16px)' }}>
        {/* Confetti */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {confetti.map(p => (
            <g key={p.id} style={{ animation: `confetti-fall-${p.id % 6} ${p.dur}s ${p.delay}s ease-in both` }}>
              {p.shape === 'circle'
                ? <circle cx={p.x} cy={p.y} r={p.size / 10} fill={p.color} opacity="0.85"/>
                : <rect x={p.x - p.size/20} y={p.y - p.size/20} width={p.size/10} height={p.size/10} rx="0.1" fill={p.color} opacity="0.85"/>
              }
            </g>
          ))}
        </svg>

        {/* Glow backdrop */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(74,222,128,0.08) 0%, transparent 70%)' }}/>

        {/* Checkmark circle */}
        <div className="relative mb-8" style={{ animation: 'success-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(74,222,128,0.08)', border: '2px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {/* Outer pulse ring */}
            <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '1.5px solid rgba(74,222,128,0.15)', animation: 'ring-pulse 2s ease-out 0.3s infinite' }}/>
            <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', border: '1px solid rgba(74,222,128,0.07)', animation: 'ring-pulse 2s ease-out 0.6s infinite' }}/>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="26" stroke="rgba(74,222,128,0.3)" strokeWidth="2"/>
              <circle cx="28" cy="28" r="26" stroke="#4ade80" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="163"
                style={{ animation: 'check-circle 0.7s ease 0.2s both', strokeDashoffset: 163 }}/>
              <path d="M16 28l9 9 16-16" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'check-path 0.4s ease 0.8s both', strokeDasharray: 40, strokeDashoffset: 40 }}/>
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center px-6 mb-10" style={{ animation: 'pay-fade-in 0.5s ease 0.5s both' }}>
          <h2 className="text-3xl font-black text-white mb-2">
            {lang === 'ar' ? '✅ تم قبول الطلب!' : lang === 'tr' ? '✅ Sipariş alındı!' : lang === 'en' ? '✅ Order placed!' : '✅ Заказ принят!'}
          </h2>
          <p className="text-white/40 text-sm mb-1">
            {lang === 'ar' ? `طلب #${createdOrderId}` : lang === 'tr' ? `Sipariş #${createdOrderId}` : lang === 'en' ? `Order #${createdOrderId}` : `Заказ №${createdOrderId}`}
          </p>
          <p className="text-green-400/70 text-sm font-semibold">
            {lang === 'ar' ? 'جاري البحث عن طبيب بيطري...' : lang === 'tr' ? 'Veteriner aranıyor...' : lang === 'en' ? 'Finding a vet near you...' : 'Ищем ближайшего ветеринара...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-none" style={{ width: `${successProgress}%`, background: 'linear-gradient(90deg,#4ade80,#22c55e)', boxShadow: '0 0 8px rgba(74,222,128,0.5)', transition: 'width 0.06s linear' }}/>
        </div>
        <p className="text-white/20 text-xs mt-3">
          {lang === 'ar' ? 'جاري الانتقال...' : lang === 'tr' ? 'Yönlendiriliyor...' : lang === 'en' ? 'Redirecting...' : 'Переходим к отслеживанию...'}
        </p>

        <style>{`
          @keyframes success-pop { from { opacity:0; transform:scale(0.4); } to { opacity:1; transform:scale(1); } }
          @keyframes ring-pulse { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.6)} }
          @keyframes check-circle { to { stroke-dashoffset:0; } }
          @keyframes check-path { to { stroke-dashoffset:0; } }
          @keyframes pay-fade-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          @keyframes confetti-fall-0 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(480deg);opacity:0} }
          @keyframes confetti-fall-1 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) translateX(8vw) rotate(-360deg);opacity:0} }
          @keyframes confetti-fall-2 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) translateX(-10vw) rotate(540deg);opacity:0} }
          @keyframes confetti-fall-3 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) translateX(5vw) rotate(-480deg);opacity:0} }
          @keyframes confetti-fall-4 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) translateX(-6vw) rotate(360deg);opacity:0} }
          @keyframes confetti-fall-5 { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) translateX(12vw) rotate(-540deg);opacity:0} }
        `}</style>
      </div>
    )}

    <div className="min-h-screen bg-[#060d06] text-white pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-6 h-px bg-amber-400" />
            <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">{t('order.title')}</span>
          </div>
          <h1 className="text-4xl font-black">{t('order.sub')}</h1>
          <p className="text-white/35 mt-2">{t('order.desc')}</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-10">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
                  step > i + 1 ? 'bg-green-400 border-green-400 text-black' : step === i + 1 ? 'border-green-400 text-green-400' : 'border-white/15 text-white/25'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step === i + 1 ? 'text-white' : 'text-white/25'}`}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && <div className={`flex-1 h-px transition-all ${step > i + 1 ? 'bg-green-400/50' : 'bg-white/8'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Service */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{t('order.selectServices')}</h2>
              {selectedServices.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <span className="text-green-400 text-xs font-bold">{selectedServices.length} {t('order.selected')}</span>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-white/50 text-xs">{t('order.from')}{totalFrom.toLocaleString()} ₽</span>
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {services.map((svc) => {
                const isSelected = !!selectedServices.find((s) => s.id === svc.id);
                return (
                  <button key={svc.id} onClick={() => toggleService(svc)}
                    className="text-left p-5 rounded-2xl transition-all duration-200 relative overflow-hidden group"
                    style={{ background: isSelected ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)', border: isSelected ? '1.5px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                    <span className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-green-400' : 'bg-white/5 border border-white/15'}`}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <div className="mb-3 text-green-400/70"><ServiceIcon name={svc.name} size={24} /></div>
                    <div className="font-bold text-white mb-1">{tName(svc.name)}</div>
                    <div className="text-white/35 text-xs mb-3 line-clamp-1">{getSvcDesc(svc.description, svc.name, lang)}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-bold text-sm">{t('order.from')}{svc.price_from.toLocaleString()} ₽</span>
                      <span className="text-white/20 text-xs">{svc.duration_minutes} {t('order.min')}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-white/25">{getMini(svc.name)}</span>
                      <Link to={`/service/${svc.id}`} onClick={(e) => e.stopPropagation()}
                        className="ml-2 flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 group/btn"
                        style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: 'rgba(251,191,36,0.9)', boxShadow: '0 0 8px rgba(251,191,36,0.1)' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(251,191,36,0.35)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 8px rgba(251,191,36,0.1)')}>
                        {t('order.details')}
                        <svg className="w-2.5 h-2.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 10 10"
                          style={{ transform: lang === 'ar' ? 'scaleX(-1)' : undefined }}>
                          <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedServices.length > 0 && (
              <div className="mt-6 p-4 rounded-2xl flex items-center justify-between gap-4" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <div>
                  <div className="text-xs text-white/40 mb-1">{t('order.selectedCount')}{selectedServices.length}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedServices.map((s) => (
                      <span key={s.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.12)', color: 'rgba(74,222,128,0.8)', border: '1px solid rgba(74,222,128,0.2)' }}>
                        <ServiceIcon name={s.name} size={14} className="inline-block mr-1.5 text-green-400/70" />{tName(s.name)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-white/30 text-[10px]">{t('order.totalFrom')}</div>
                  <div className="text-green-400 font-black text-lg">{totalFrom.toLocaleString()} ₽</div>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button className="btn-gold py-3 px-8 font-bold" onClick={() => setStep(2)} disabled={selectedServices.length === 0}>{t('order.next')}</button>
            </div>
          </div>
        )}

        {/* Step 2 — Pet */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-6">{t('order.selectPet')}</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {pets.map((pet) => (
                <button key={pet.id} onClick={() => setSelectedPetId(pet.id)}
                  className="text-left p-5 rounded-2xl transition-all duration-200"
                  style={{ background: selectedPetId === pet.id ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)', border: selectedPetId === pet.id ? '1.5px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-2xl mb-2">
                    {pet.species === 'Кошка' || pet.species === 'Cat' || pet.species === 'Kedi' || pet.species === 'قطة' ? '🐱' : pet.species === 'Собака' || pet.species === 'Dog' || pet.species === 'Köpek' || pet.species === 'كلب' ? '🐶' : '🐾'}
                  </div>
                  <div className="font-bold text-white">{pet.name}</div>
                  <div className="text-white/35 text-sm mt-0.5">{pet.species}{pet.breed ? `, ${pet.breed}` : ''}</div>
                </button>
              ))}
              <button onClick={() => setShowAddPet(true)}
                className="p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                style={{ border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-3xl text-white/25">+</span>
                <span className="text-sm font-medium text-white/40">{t('order.addPet')}</span>
              </button>
            </div>
            {showAddPet && (
              <div className="rounded-2xl p-6 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="font-semibold text-white mb-4">{t('order.newPet')}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">{t('order.petName')}</label><input className="input" value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} placeholder={t('order.petNamePh')} /></div>
                  <div><label className="label">{t('order.petSpecies')}</label><select className="input" value={newPet.species} onChange={(e) => setNewPet({ ...newPet, species: e.target.value })}>{SPECIES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div><label className="label">{t('order.petBreed')}</label><input className="input" value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} /></div>
                  <div><label className="label">{t('order.petAge')}</label><input className="input" type="number" value={newPet.age_years} onChange={(e) => setNewPet({ ...newPet, age_years: e.target.value })} /></div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button className="btn-gold py-2.5 px-6 font-bold text-sm" onClick={handleAddPet} disabled={addingPet || !newPet.name}>{addingPet ? t('order.petLoading') : t('order.petSubmit')}</button>
                  <button className="py-2.5 px-5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => setShowAddPet(false)}>{t('order.petCancel')}</button>
                </div>
              </div>
            )}
            <p className="text-sm text-white/25 mb-6">{t('order.petNote')}</p>
            <div className="flex justify-between">
              <button className="py-3 px-6 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => setStep(1)}>{t('order.back')}</button>
              <button className="btn-gold py-3 px-8 font-bold" onClick={() => setStep(3)} disabled={!selectedPetId}>{t('order.next')}</button>
            </div>
          </div>
        )}

        {/* Step 3 — Address */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-6">{t('order.addressTitle')}</h2>
            <div className="space-y-5">
              <div>
                <label className="label">{t('order.address')}</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('order.addressPh')} required />
                <p className="text-xs text-white/25 mt-1">{t('order.addressHint')}</p>
              </div>
              <div>
                <label className="label">{t('order.scheduledAt')} *</label>
                <input className="input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
                <p className="text-xs text-white/25 mt-1">{t('order.scheduleHint')}</p>
              </div>
              <div>
                <label className="label">{t('order.notes')} <span className="text-white/20 font-normal">{t('order.scheduleOpt')}</span></label>
                <textarea className="input resize-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('order.notesPh')} />
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button className="py-3 px-6 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => setStep(2)}>{t('order.back')}</button>
              <button className="btn-gold py-3 px-8 font-bold" onClick={() => setStep(4)} disabled={!address || !scheduledAt}>{t('order.next')}</button>
            </div>
          </div>
        )}

        {/* Step 4 — Payment */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-6">{t('order.payment.title')}</h2>

            {/* Method selector */}
            <div className="flex gap-2 mb-8">
              {(['card', 'cash', 'sbp'] as const).map((m) => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: payMethod === m ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                    border: payMethod === m ? '1.5px solid rgba(74,222,128,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: payMethod === m ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.4)',
                  }}>
                  {m === 'card' && '💳 '}{m === 'cash' && '💵 '}{m === 'sbp' && '📱 '}
                  {t(`order.payment.${m}`)}
                </button>
              ))}
            </div>

            {/* ═══ CARD ═══ */}
            {payMethod === 'card' && (
              <>
                {/* Animated card */}
                <div className="flex justify-center mb-8" style={{ perspective: '1200px' }}>
                  <div style={{
                    width: 320, height: 190,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.65s cubic-bezier(0.4,0,0.2,1)',
                    transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}>
                    {/* Front */}
                    <div style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, #0f2417 0%, #0a3320 40%, #0f2d1a 70%, #071a0e 100%)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,222,128,0.1)',
                      padding: '24px 28px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      overflow: 'hidden',
                    }}>
                      {/* Gloss */}
                      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      {/* Top row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ width: 34, height: 26, borderRadius: 6, background: 'linear-gradient(135deg, #f8c84a, #e8a020)', opacity: 0.9 }} />
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>{brand.icon || brand.label}</div>
                      </div>
                      {/* Card number */}
                      <div style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 4, color: cardNumber ? 'white' : 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                        {displayNumber}
                      </div>
                      {/* Bottom row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>{t('order.payment.cardHolder')}</div>
                          <div style={{ color: cardName ? 'white' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cardName || t('order.payment.cardNamePh')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>{t('order.payment.expires')}</div>
                          <div style={{ color: cardExpiry ? 'white' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 700 }}>{cardExpiry || t('order.payment.expiryPh')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Back */}
                    <div style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, #071a0e 0%, #0a2d1a 60%, #0f2417 100%)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                      transform: 'rotateY(180deg)',
                      overflow: 'hidden',
                    }}>
                      <div style={{ height: 48, background: 'rgba(0,0,0,0.55)', marginTop: 28 }} />
                      <div style={{ padding: '20px 28px 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 36, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 8px, transparent 8px, transparent 12px)', borderRadius: 4 }} />
                        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 6, padding: '6px 14px', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#0a1a0a', minWidth: 60, textAlign: 'center' }}>
                          {cardCvv || '•••'}
                        </div>
                      </div>
                      <div style={{ padding: '10px 28px 0', textAlign: 'right', color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>CVV</div>
                    </div>
                  </div>
                </div>

                {/* Card form */}
                <div className="space-y-4">
                  <div>
                    <label className="label">{t('order.payment.cardNumber')}</label>
                    <input className="input font-mono tracking-wider"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder={t('order.payment.cardNumberPh')}
                      maxLength={19}
                      inputMode="numeric" />
                  </div>
                  <div>
                    <label className="label">{t('order.payment.cardName')}</label>
                    <input className="input uppercase tracking-widest"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      placeholder={t('order.payment.cardNamePh')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">{t('order.payment.cardExpiry')}</label>
                      <input className="input font-mono"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder={t('order.payment.expiryPh')}
                        maxLength={5}
                        inputMode="numeric" />
                    </div>
                    <div>
                      <label className="label">{t('order.payment.cardCvv')}</label>
                      <input className="input font-mono"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder={t('order.payment.cvvPh')}
                        type="password"
                        maxLength={3}
                        inputMode="numeric"
                        onFocus={() => setCardFlipped(true)}
                        onBlur={() => setCardFlipped(false)} />
                    </div>
                  </div>
                </div>

                {/* Demo notice */}
                <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="6"/><path d="M7 5v2.5"/><circle cx="7" cy="10" r=".6" fill="rgba(251,191,36,0.7)"/></svg>
                  <span className="text-amber-400/60 text-xs">{t('order.payment.demo')}</span>
                </div>
              </>
            )}

            {/* ═══ CASH ═══ */}
            {payMethod === 'cash' && (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div className="text-5xl mb-5">💵</div>
                <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">{t('order.payment.cashNote')}</p>
              </div>
            )}

            {/* ═══ SBP ═══ */}
            {payMethod === 'sbp' && (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div className="text-5xl mb-5">📱</div>
                <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">{t('order.payment.sbpNote')}</p>
              </div>
            )}

            {/* Secure badge */}
            <div className="flex items-center justify-center gap-2 mt-6 mb-8">
              <svg width="13" height="15" viewBox="0 0 13 15" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="1.4" strokeLinecap="round"><path d="M6.5 1L1 3.5v4c0 3 2.5 5.5 5.5 6.3C9 12.5 12 10 12 7V3.5z"/><path d="M4 7.5l2 2 3-3"/></svg>
              <span className="text-green-400/40 text-xs">{t('order.payment.secure')}</span>
            </div>

            <div className="flex justify-between">
              <button className="py-3 px-6 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => setStep(3)}>{t('order.back')}</button>
              <button className="btn-gold py-3 px-8 font-bold" onClick={() => setStep(5)}>{t('order.payment.pay')}</button>
            </div>
          </div>
        )}

        {/* Step 5 — Confirm */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-6">{t('order.confirmTitle')}</h2>
            <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-white/30 text-sm mb-3">{t('order.servicesLabel')}{selectedServices.length})</div>
                <div className="space-y-2">
                  {selectedServices.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between">
                      <span className="text-white text-sm flex items-center gap-2"><ServiceIcon name={svc.name} size={14} className="text-green-400/70" />{tName(svc.name)}</span>
                      <span className="text-green-400 text-sm font-semibold">{t('order.from')}{svc.price_from.toLocaleString()} ₽</span>
                    </div>
                  ))}
                </div>
                {selectedServices.length > 1 && (
                  <div className="flex justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-white/40 text-sm font-semibold">{t('order.totalFrom')}</span>
                    <span className="text-green-400 font-black text-base">{totalFrom.toLocaleString()} ₽</span>
                  </div>
                )}
              </div>
              {[
                { label: t('order.petLabel'), val: selectedPet ? `${selectedPet.name} (${selectedPet.species})` : t('order.noPet'), sub: null },
                { label: t('order.addrLabel'), val: address, sub: null },
                { label: t('order.timeLabel'), val: new Date(scheduledAt).toLocaleString(), sub: null },
                ...(notes ? [{ label: t('order.notesLabel'), val: notes, sub: null }] : []),
              ].map((row, i, arr) => (
                <div key={i} className="px-6 py-4 flex justify-between items-start gap-4" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span className="text-white/30 text-sm flex-shrink-0">{row.label}</span>
                  <div className="text-right"><div className="text-white font-medium text-sm">{row.val}</div></div>
                </div>
              ))}
            </div>
            {selectedServices.length > 1 && (
              <div className="rounded-2xl px-5 py-3 mb-4 text-xs text-white/35" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {t('order.multiNote')}
              </div>
            )}
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <p className="text-white/70 text-sm"><span className="text-green-400 font-bold">{t('order.nextStep')}</span> {t('order.nextStepDesc')}</p>
            </div>
            <div className="flex justify-between">
              <button className="py-3 px-6 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => setStep(4)}>{t('order.back')}</button>
              <button className="btn-gold py-3.5 px-10 font-bold" onClick={handleSubmit} disabled={loading || !selectedPetId || !scheduledAt}>
                {loading ? t('order.creating') : `${t('order.confirmBtn')} ${selectedServices.length > 1 ? `${selectedServices.length} ${t('order.confirmOrders')}` : t('order.confirmOrder')}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
