import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPets, createPet, deletePet, getOrders } from '../api';
import { useTranslation } from 'react-i18next';
import { getSvcName } from '../utils/serviceNames';
import ServiceIcon from '../components/ServiceIcon';
import AnimatedNumber from '../components/AnimatedNumber';
import i18n from '../i18n';

interface Pet { id: number; name: string; species: string; breed?: string; age_years?: number; weight_kg?: number; notes?: string; }
interface Order { id: number; status: string; service_name: string; pet_name?: string; created_at: string; total_price?: number; }

const ACTIVE_STATUSES = ['pending','confirmed','on_the_way','arrived','in_progress'];
const STATUS_LABEL: Record<string,string> = {
  pending:'Ожидание', confirmed:'Подтверждён', on_the_way:'Врач едет',
  arrived:'Врач прибыл', in_progress:'Идёт приём', completed:'Завершён', cancelled:'Отменён',
};
const STATUS_COLOR: Record<string,string> = {
  pending:'text-amber-400 bg-amber-400/10 border-amber-400/20',
  confirmed:'text-teal-400 bg-teal-400/10 border-teal-400/20',
  on_the_way:'text-blue-400 bg-blue-400/10 border-blue-400/20',
  arrived:'text-purple-400 bg-purple-400/10 border-purple-400/20',
  in_progress:'text-green-400 bg-green-400/10 border-green-400/20',
  completed:'text-white/40 bg-white/5 border-white/10',
  cancelled:'text-red-400/60 bg-red-400/5 border-red-400/10',
};

/* SVG pet icons — no emojis */
const PET_SVG: Record<string, React.ReactNode> = {
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="7" cy="10" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="17" cy="10" r="2"/>
      <circle cx="9.5" cy="6.5" r="1.2"/><circle cx="14.5" cy="6.5" r="1.2"/>
      <path d="M12 22c-3.5 0-6-2.5-5-5.5l2-3a3 3 0 016 0l2 3c1 3-1.5 5.5-5 5.5z"/>
    </svg>
  ),
  cat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M5 9 7 4l3 3.5"/><path d="M14 7.5l3-3.5 2 5"/>
      <ellipse cx="12" cy="14.5" rx="7" ry="6.5"/>
      <circle cx="9.5" cy="13.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="13.5" r=".6" fill="currentColor" stroke="none"/>
      <path d="M10.5 16.5q1.5 1 3 0"/><path d="M5 14h3M16 14h3"/>
    </svg>
  ),
  dog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M5.5 8 3 5c-.5 2.5.5 5 2.5 6"/>
      <circle cx="12" cy="13" r="7"/>
      <circle cx="10" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="12" r=".6" fill="currentColor" stroke="none"/>
      <path d="M9.5 15.5q2.5 2 5 0"/><ellipse cx="12" cy="17" rx="2" ry="1.2"/>
    </svg>
  ),
  rabbit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <ellipse cx="9" cy="7" rx="2" ry="5"/><ellipse cx="15" cy="6" rx="2" ry="5"/>
      <circle cx="12" cy="16" r="6"/>
      <circle cx="10.5" cy="15" r=".5" fill="currentColor" stroke="none"/>
      <circle cx="13.5" cy="15" r=".5" fill="currentColor" stroke="none"/>
      <path d="M11 17.5q1 .8 2 0"/>
    </svg>
  ),
  bird: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <ellipse cx="12" cy="13" rx="5" ry="6"/>
      <path d="M12 7a5 5 0 00-5-5"/><path d="M17 9a5 5 0 00-5-5"/>
      <circle cx="13.5" cy="11" r=".6" fill="currentColor" stroke="none"/>
      <path d="M14 13.5l2.5.5-1 2"/>
    </svg>
  ),
};

function getPetSVG(species: string) {
  const s = species?.toLowerCase() || '';
  if (s.match(/кошк|cat|kedi|قطة|кот/)) return PET_SVG.cat;
  if (s.match(/собак|dog|köpek|كلب/))  return PET_SVG.dog;
  if (s.match(/кролик|rabbit|tavşan|أرنب/)) return PET_SVG.rabbit;
  if (s.match(/птиц|bird|kuş|طائر/))  return PET_SVG.bird;
  return PET_SVG.default;
}

/* Loyalty tiers */
function getLoyalty(count: number) {
  if (count >= 20) return { label: 'Платина', color: '#e5e7eb', glow: 'rgba(229,231,235,0.3)', next: 20, progress: 100 };
  if (count >= 10) return { label: 'Золото',  color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  next: 20, progress: ((count-10)/10)*100 };
  if (count >= 5)  return { label: 'Серебро', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', next: 10, progress: ((count-5)/5)*100 };
  return             { label: 'Стартер', color: '#4ade80',  glow: 'rgba(74,222,128,0.3)',  next: 5,  progress: (count/5)*100 };
}

const SECTIONS = ['pets','actions','orders','recs','news'] as const;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const lang = i18n.language || 'ru';

  const SPECIES = [
    t('profile.species.cat'), t('profile.species.dog'),
    t('profile.species.rabbit'), t('profile.species.hamster'),
    t('profile.species.bird'), t('profile.species.reptile'), t('profile.species.other'),
  ];

  const [pets, setPets]         = useState<Pet[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ name:'',species:SPECIES[0],breed:'',age_years:'',weight_kg:'',notes:'' });
  const [activeSection, setActiveSection] = useState<typeof SECTIONS[number]>('pets');

  useEffect(() => {
    getPets().then(setPets).catch(()=>{});
    getOrders().then(setOrders).catch(()=>{});
  }, []);

  const activeOrders   = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const completedOrders= orders.filter(o => o.status === 'completed');
  const latestActive   = activeOrders[0] ?? null;
  const recentOrders   = [...orders].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5);
  const loyalty        = getLoyalty(completedOrders.length);

  const firstPet = pets[0];
  const petName  = firstPet?.name || '…';
  const isdog    = firstPet?.species?.toLowerCase().match(/соба|dog|köpek|كلب/i);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const pet = await createPet({ name:form.name, species:form.species, breed:form.breed||null, age_years:form.age_years?parseInt(form.age_years):null, weight_kg:form.weight_kg?parseFloat(form.weight_kg):null, notes:form.notes||null });
      setPets([...pets, pet]); setShowAdd(false);
      setForm({ name:'',species:SPECIES[0],breed:'',age_years:'',weight_kg:'',notes:'' });
    } catch { alert(t('profile.errAdd')); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('profile.confirmDelete'))) return;
    try { await deletePet(id); setPets(pets.filter(p=>p.id!==id)); }
    catch { alert(t('profile.errDel')); }
  };

  /* ─── Derived display strings ──────────────────────────────────── */
  const memberYear = user ? new Date().getFullYear() : 2024;
  const initials   = user?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';

  /* ─── Recommendations ──────────────────────────────────────────── */
  const recCards = [
    isdog
      ? { svc:'Первичный осмотр', title: isdog?`Осмотр для ${petName}`:`Вакцинация для ${petName}`, desc:'Плановая проверка здоровья, анализы и консультация специалиста.', tag:'Рекомендовано' }
      : { svc:'Вакцинация',       title:`Вакцинация для ${petName}`, desc:'Обновите прививки и защитите питомца от сезонных болезней.', tag:'Важно' },
    { svc:'Обработка от паразитов', title:'Защита от паразитов', desc:'Клещи, блохи, глисты — регулярная обработка обязательна.', tag:'Сезонно' },
    { svc:'Уход и груминг',         title:'Груминг и уход', desc:'Профессиональный уход за шерстью, стрижка когтей, чистка ушей.', tag:'Уход' },
  ];

  const newsItems = [
    { tag:'Новинка', color:'rgba(74,222,128,0.08)', border:'rgba(74,222,128,0.2)', tc:'text-green-400', title:'Ночной вызов ветеринара', desc:'Теперь вызов специалиста доступен с 22:00 до 06:00 — без наценки на срочность.', date:'Авг 2026' },
    { tag:'Акция',   color:'rgba(251,191,36,0.08)', border:'rgba(251,191,36,0.2)', tc:'text-amber-400', title:'−20% на груминг в августе', desc:'Скидка действует при записи онлайн через приложение до конца месяца.', date:'Авг 2026' },
    { tag:'Совет',   color:'rgba(96,165,250,0.08)', border:'rgba(96,165,250,0.2)', tc:'text-blue-400',  title:'Жара и питомцы', desc:'Как правильно поить животных летом и признаки теплового удара — советы ветеринара.', date:'Июл 2026' },
    { tag:'Сервис',  color:'rgba(192,132,252,0.08)',border:'rgba(192,132,252,0.2)',tc:'text-purple-400',title:'Медкарта теперь в приложении', desc:'Вся история болезней, прививок и анализов доступна в одном месте.', date:'Июн 2026' },
  ];

  const quickActions = [
    { label:'Вызвать врача', to:'/order', color:'#4ade80', bg:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.25)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 0116.9 1.18 2 2 0 0119.07 3.2l.03 2.92a2 2 0 01-2 2.06L15 8a2 2 0 00-2 1.72 12.84 12.84 0 00.7 3.74A2 2 0 0115 16a2 2 0 012.5 1.91z"/></svg> },
    { label:'История', to:'/history', color:'#fbbf24', bg:'rgba(251,191,36,0.1)', border:'rgba(251,191,36,0.25)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> },
    { label:'Медкарта', to:'/medcard', color:'#c084fc', bg:'rgba(192,132,252,0.1)', border:'rgba(192,132,252,0.25)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V8l-6-6z"/><path d="M13 2v6h6M12 11v6M9 14h6"/></svg> },
    { label:'Скорая', to:'/order', color:'#f87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.25)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg> },
  ];

  /* ─── Achievements ─────────────────────────────────────────────── */
  const achievements = [
    { icon:'🏅', label:'Первый шаг', desc:'Первый заказ', done: orders.length >= 1 },
    { icon:'⭐', label:'5 заказов',  desc:'Постоянный клиент', done: orders.length >= 5 },
    { icon:'🌟', label:'10 заказов', desc:'Надёжный партнёр',  done: orders.length >= 10 },
    { icon:'🏆', label:'20 заказов', desc:'Платиновый клиент', done: orders.length >= 20 },
    { icon:'🐾', label:'Питомец',    desc:'Добавлен питомец',  done: pets.length >= 1 },
    { icon:'💎', label:'Медкарта',   desc:'Полное досье',      done: pets.length >= 2 },
  ];

  return (
    <div className="min-h-screen bg-[#060d06]">

      {/* ══════════════════════ HERO HEADER ══════════════════════ */}
      <div className="relative overflow-hidden" style={{ background:'linear-gradient(180deg,rgba(10,26,10,1) 0%,rgba(6,13,6,1) 100%)' }}>
        {/* grid bg */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:'linear-gradient(rgba(74,222,128,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,0.04) 1px,transparent 1px)',
          backgroundSize:'48px 48px'
        }}/>
        {/* radial glow behind avatar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full pointer-events-none"
          style={{ background:'radial-gradient(ellipse,rgba(74,222,128,0.12) 0%,transparent 70%)' }}/>

        <div className="relative max-w-5xl mx-auto px-4 pt-28 pb-10">
          {/* logout top-right */}
          <button onClick={logout}
            className="absolute top-24 right-4 text-xs text-red-400/40 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg"
            style={{ border:'1px solid rgba(248,113,113,0.1)' }}>
            {t('profile.logout')}
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-green-400"
                style={{ background:'rgba(74,222,128,0.1)', border:'2px solid rgba(74,222,128,0.3)', boxShadow:'0 0 40px rgba(74,222,128,0.15)' }}>
                {initials}
              </div>
              {/* online dot */}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-[#060d06] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-[#060d06]"/>
              </span>
            </div>

            {/* User info */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                <h1 className="text-2xl font-black text-white">{user?.name}</h1>
                {/* loyalty badge */}
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ color: loyalty.color, background:`${loyalty.glow}20`, border:`1px solid ${loyalty.glow}` }}>
                  {loyalty.label}
                </span>
              </div>
              <p className="text-white/40 text-sm mb-0.5">{user?.phone}</p>
              {user?.email && <p className="text-white/25 text-xs">{user.email}</p>}
              <p className="text-white/20 text-xs mt-1">Клиент с {memberYear} года</p>
            </div>

            {/* Stats strip */}
            <div className="flex gap-6 sm:gap-8 text-center">
              {[
                { val: String(orders.length),           label:'Заказов' },
                { val: String(completedOrders.length),  label:'Выполнено' },
                { val: String(pets.length),             label:'Питомцев' },
              ].map(s => (
                <div key={s.label}>
                  <AnimatedNumber value={s.val} className="text-2xl font-black text-white block" duration={1600}/>
                  <span className="text-white/30 text-[10px] uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loyalty progress bar */}
          <div className="mt-8 rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: loyalty.color }}>Уровень: {loyalty.label}</span>
              <span className="text-white/30 text-xs">{completedOrders.length} / {loyalty.next} заказов до следующего уровня</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width:`${loyalty.progress}%`, background:`linear-gradient(90deg,${loyalty.color}80,${loyalty.color})`, boxShadow:`0 0 8px ${loyalty.glow}` }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════ ACTIVE ORDER ══════════════════════ */}
      {latestActive && (
        <div className="max-w-5xl mx-auto px-4 -mt-1 mb-6">
          <div className="relative rounded-2xl overflow-hidden" style={{ background:'linear-gradient(135deg,rgba(74,222,128,0.1),rgba(34,197,94,0.05))', border:'1.5px solid rgba(74,222,128,0.3)', boxShadow:'0 0 32px rgba(74,222,128,0.1)' }}>
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center text-green-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#060d06]" style={{ animation:'ping-dot 1.5s ease-in-out infinite' }}/>
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-green-400/60">{t('profile.activeOrder.badge')}</span>
                  <p className="text-white font-bold">{getSvcName(latestActive.service_name||'', lang)}</p>
                  <p className="text-white/40 text-xs">Заказ #{latestActive.id}{latestActive.pet_name?` · ${latestActive.pet_name}`:''}</p>
                </div>
              </div>
              <Link to={`/order/${latestActive.id}`}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
                style={{ background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', color:'rgba(74,222,128,0.95)' }}>
                Отслеживать
              </Link>
            </div>
          </div>
          <style>{`@keyframes ping-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.4}}`}</style>
        </div>
      )}

      {/* ══════════════════════ MAIN CONTENT ══════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 pb-24">

        {/* ── Tab nav ─────────────────────────────────────────── */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
          {([
            { id:'pets',    label:'Питомцы' },
            { id:'actions', label:'Действия' },
            { id:'orders',  label:'История' },
            { id:'recs',    label:'Рекомендации' },
            { id:'news',    label:'Новости' },
          ] as { id: typeof SECTIONS[number]; label: string }[]).map(tab => (
            <button key={tab.id} onClick={()=>setActiveSection(tab.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200"
              style={activeSection===tab.id
                ? { background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.3)', color:'rgba(74,222,128,1)' }
                : { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ SECTION: PETS ══════════════════════════════════════ */}
        {activeSection === 'pets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-px bg-amber-400"/>
                <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">{t('profile.myPets')}</span>
              </div>
              <button onClick={()=>setShowAdd(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)', color:'rgba(251,191,36,0.9)' }}>
                + {t('profile.addPet')}
              </button>
            </div>

            {showAdd && (
              <form onSubmit={handleAdd} className="rounded-2xl p-5 mb-2" style={{ background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.15)' }}>
                <h3 className="font-semibold text-white mb-4 text-sm">{t('profile.newPetTitle')}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="label">{t('profile.petName')}</label><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t('profile.petNamePh')}/></div>
                  <div><label className="label">{t('profile.petSpecies')}</label><select className="input" value={form.species} onChange={e=>setForm({...form,species:e.target.value})}>{SPECIES.map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><label className="label">{t('profile.petBreed')}</label><input className="input" value={form.breed} onChange={e=>setForm({...form,breed:e.target.value})} placeholder={t('profile.petBreedPh')}/></div>
                  <div><label className="label">{t('profile.petAge')}</label><input className="input" type="number" min="0" max="50" value={form.age_years} onChange={e=>setForm({...form,age_years:e.target.value})} placeholder={t('profile.petAgePh')}/></div>
                  <div><label className="label">{t('profile.petWeight')}</label><input className="input" type="number" step="0.1" min="0" value={form.weight_kg} onChange={e=>setForm({...form,weight_kg:e.target.value})} placeholder={t('profile.petWeightPh')}/></div>
                  <div><label className="label">{t('profile.petNotes')}</label><input className="input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={t('profile.petNotesPh')}/></div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" className="btn-gold text-sm" disabled={loading}>{loading?t('profile.petLoading'):t('profile.petSubmit')}</button>
                  <button type="button" onClick={()=>setShowAdd(false)}
                    className="py-2 px-4 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors"
                    style={{ border:'1px solid rgba(255,255,255,0.1)' }}>{t('profile.petCancel')}</button>
                </div>
              </form>
            )}

            {pets.length === 0 && !showAdd ? (
              <div className="rounded-2xl py-16 text-center" style={{ background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)' }}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white/20"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  {PET_SVG.default}
                </div>
                <p className="text-white/30 text-sm mb-1">{t('profile.noPets')}</p>
                <p className="text-white/15 text-xs mb-5">Добавьте питомца, чтобы отслеживать его здоровье</p>
                <button onClick={()=>setShowAdd(true)} className="btn-gold inline-block text-sm">{t('profile.petSubmit')}</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {pets.map(pet => {
                  const hasActive = activeOrders.some(o=>o.pet_name===pet.name);
                  return (
                    <div key={pet.id} className="rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.01]"
                      style={{ background:hasActive?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.03)', border:hasActive?'1.5px solid rgba(74,222,128,0.25)':'1px solid rgba(255,255,255,0.07)' }}>
                      {/* pet card header */}
                      <div className="flex items-start justify-between p-5 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-green-400/70"
                            style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.15)' }}>
                            {getPetSVG(pet.species)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm">{pet.name}</p>
                              {hasActive && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase"
                                  style={{ background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.25)', color:'rgba(74,222,128,0.8)' }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation:'ping-dot 1.5s infinite' }}/>live
                                </span>
                              )}
                            </div>
                            <p className="text-white/35 text-xs">{pet.species}{pet.breed?`, ${pet.breed}`:''}</p>
                          </div>
                        </div>
                        <button onClick={()=>handleDelete(pet.id)} className="text-white/15 hover:text-red-400 transition-colors p-1 mt-0.5">
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                      {/* pet stats */}
                      {(pet.age_years||pet.weight_kg||pet.notes) && (
                        <div className="mx-5 mb-4 pt-3 border-t border-white/5">
                          <div className="flex flex-wrap gap-3">
                            {pet.age_years && (
                              <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                {pet.age_years} л.
                              </div>
                            )}
                            {pet.weight_kg && (
                              <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 3h12l1 7H5z"/><path d="M12 10v7M8 17h8"/></svg>
                                {pet.weight_kg} кг
                              </div>
                            )}
                            {pet.notes && <p className="text-[11px] text-white/20 w-full mt-0.5">{pet.notes}</p>}
                          </div>
                        </div>
                      )}
                      {/* book for this pet */}
                      <div className="px-5 pb-4">
                        <Link to="/order" className="block text-center py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02]"
                          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }}>
                          Записать к врачу
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Achievements */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-px bg-amber-400"/>
                <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">Достижения</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {achievements.map((a, i) => (
                  <div key={i} className="rounded-xl p-3 text-center transition-all duration-200"
                    style={a.done
                      ? { background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)' }
                      : { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', opacity:0.4 }}>
                    <div className="text-xl mb-1">{a.icon}</div>
                    <div className="text-[9px] font-black text-white/70 uppercase tracking-wide leading-tight">{a.label}</div>
                    <div className="text-[8px] text-white/25 mt-0.5">{a.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION: QUICK ACTIONS ═════════════════════════════ */}
        {activeSection === 'actions' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-amber-400"/>
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">Быстрые действия</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((a, i) => (
                <Link key={i} to={a.to}
                  className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.02] group"
                  style={{ background: a.bg, border:`1px solid ${a.border}` }}>
                  <div style={{ color: a.color }}>{a.icon}</div>
                  <div>
                    <p className="text-white font-bold text-base">{a.label}</p>
                    <p className="text-white/30 text-xs mt-0.5 group-hover:text-white/50 transition-colors">Нажмите чтобы перейти →</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* User card */}
            <div className="rounded-2xl p-5 mt-2" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Аккаунт</p>
              <div className="space-y-3">
                {[
                  { label:'Имя', val: user?.name },
                  { label:'Телефон', val: user?.phone },
                  { label:'Email', val: user?.email || '—' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/30 text-xs">{row.label}</span>
                    <span className="text-white/70 text-sm font-medium">{row.val}</span>
                  </div>
                ))}
              </div>
              <button onClick={logout} className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-red-400/70 hover:text-red-400 transition-colors"
                style={{ border:'1px solid rgba(248,113,113,0.15)' }}>
                {t('profile.logout')}
              </button>
            </div>
          </div>
        )}

        {/* ══ SECTION: ORDER HISTORY ═════════════════════════════ */}
        {activeSection === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-amber-400"/>
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">История заказов</span>
            </div>

            {recentOrders.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)' }}>
                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center text-white/20"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                </div>
                <p className="text-white/30 text-sm mb-4">Заказов пока нет</p>
                <Link to="/order" className="btn-gold inline-block text-sm">Вызвать врача</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map(o => (
                  <Link key={o.id} to={`/order/${o.id}`}
                    className="flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] group"
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    {/* service icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-green-400/60"
                      style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.12)' }}>
                      <ServiceIcon name={o.service_name} size={18}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{getSvcName(o.service_name||'', lang)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {o.pet_name && <span className="text-white/30 text-xs">{o.pet_name}</span>}
                        {o.pet_name && <span className="text-white/15 text-xs">·</span>}
                        <span className="text-white/20 text-xs">{new Date(o.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'})}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[o.status]||STATUS_COLOR.completed}`}>
                      {STATUS_LABEL[o.status]||o.status}
                    </span>
                  </Link>
                ))}
                {orders.length > 5 && (
                  <Link to="/history" className="block text-center py-3 rounded-xl text-sm font-bold text-white/40 hover:text-white/70 transition-colors"
                    style={{ border:'1px solid rgba(255,255,255,0.07)' }}>
                    Смотреть все {orders.length} заказов →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ SECTION: RECOMMENDATIONS ═══════════════════════════ */}
        {activeSection === 'recs' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-amber-400"/>
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">{t('profile.recs.title')}</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {recCards.map((r, i) => (
                <div key={i} className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] group"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-green-400/70"
                      style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.15)' }}>
                      <ServiceIcon name={r.svc} size={20}/>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80 px-2 py-0.5 rounded-full"
                      style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.15)' }}>{r.tag}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold mb-1 leading-snug">{r.title}</p>
                    <p className="text-white/30 text-xs leading-relaxed">{r.desc}</p>
                  </div>
                  <Link to="/order" className="mt-auto text-[10px] font-bold text-green-400/60 group-hover:text-green-400 transition-colors flex items-center gap-1">
                    Записаться <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 10 10"><path d="M2 5h6M5 2l3 3-3 3"/></svg>
                  </Link>
                </div>
              ))}
            </div>

            {/* Tip card */}
            <div className="rounded-2xl p-5" style={{ background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-400"
                  style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">Совет ветеринара</p>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Регулярные осмотры раз в 6 месяцев помогают выявить болезни на ранней стадии. Для пожилых животных (старше 7 лет) рекомендуется раз в 3 месяца.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION: NEWS ══════════════════════════════════════ */}
        {activeSection === 'news' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-amber-400"/>
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">{t('profile.news.title')}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {newsItems.map((n, i) => (
                <div key={i} className="rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: n.color, border:`1px solid ${n.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${n.tc}`}>{n.tag}</span>
                    <span className="text-white/20 text-[10px]">{n.date}</span>
                  </div>
                  <p className="text-white font-bold mb-2 leading-snug">{n.title}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{n.desc}</p>
                  <p className={`text-[10px] font-bold mt-4 ${n.tc} opacity-60 group-hover:opacity-100 transition-opacity`}>Читать далее →</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
