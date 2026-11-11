import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCharity, donate } from '../api';

export interface CharityCase {
  id: number; name: string; species: string; age: string; city: string; photo_url: string;
  problem: string; story: string; needs: string; goal: number; raised: number; donors: number; urgent: boolean;
}
interface Thanks { thanks: string; karma: number; karmaTotal: number | null; name: string }

const AMOUNTS = [300, 500, 1000, 3000, 5000];
const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;

function Progress({ raised, goal }: { raised: number; goal: number }) {
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  return (
    <div>
      <div className="h-2.5 rounded-full bg-coffee-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs mt-1.5">
        <span className="font-bold text-coffee-900">{rub(raised)}</span>
        <span className="text-coffee-500">из {rub(goal)} · {pct}%</span>
      </div>
    </div>
  );
}

function DonateModal({ c, onClose, onDone }: { c: CharityCase; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState('');
  const [stage, setStage] = useState<'form' | 'paying' | 'thanks'>('form');
  const [thanks, setThanks] = useState<Thanks | null>(null);
  const [err, setErr] = useState('');
  const value = custom ? Number(custom) : amount;

  const pay = async () => {
    if (!value || value < 50) { setErr('Минимальная сумма — 50 ₽'); return; }
    setErr(''); setStage('paying');
    try {
      const [res] = await Promise.all([donate(c.id, value), new Promise((r) => setTimeout(r, 1300))]);
      setThanks(res as Thanks); setStage('thanks'); onDone();
    } catch { setErr('Не удалось провести платёж. Попробуйте ещё раз.'); setStage('form'); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-cream text-coffee-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {stage !== 'thanks' ? (
          <>
            <div className="flex items-center gap-4 p-5 border-b border-coffee-100">
              <img src={c.photo_url} alt={c.name} className="w-14 h-14 rounded-2xl object-cover" />
              <div className="flex-1">
                <div className="text-xs text-coffee-500">Помощь для</div>
                <div className="text-lg font-black">{c.name} · {c.problem.toLowerCase()}</div>
              </div>
              <button onClick={onClose} className="text-coffee-400 hover:text-coffee-700 text-xl px-2" aria-label="Закрыть">✕</button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="text-sm font-bold mb-2">Сумма пожертвования</div>
                <div className="grid grid-cols-5 gap-2">
                  {AMOUNTS.map((a) => (
                    <button key={a} onClick={() => { setAmount(a); setCustom(''); }}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${!custom && amount === a ? 'border-green-500 bg-green-500 text-white' : 'border-coffee-200 bg-white hover:border-green-400'}`}>
                      {a >= 1000 ? `${a / 1000}к` : a}
                    </button>
                  ))}
                </div>
                <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="Другая сумма, ₽" inputMode="numeric"
                  className="mt-2 w-full rounded-xl border-2 border-coffee-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>

              {/* Банковская карта — заполнена заранее */}
              <div className="relative rounded-2xl p-5 text-white overflow-hidden bg-gradient-to-br from-[#3A651C] via-[#2F5119] to-[#1E140D] shadow-xl">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500" />
                  <span className="font-black italic tracking-wider">МИР</span>
                </div>
                <div className="font-mono text-lg tracking-[0.18em] mb-4">2202 2015 7845 3961</div>
                <div className="flex justify-between text-xs">
                  <div><div className="text-white/50 text-[10px]">Владелец</div><div className="font-semibold tracking-wider">ALEXANDER MOROZOV</div></div>
                  <div className="text-right"><div className="text-white/50 text-[10px]">Срок</div><div className="font-semibold">09/29</div></div>
                </div>
              </div>

              {err && <p className="text-sm text-red-600">{err}</p>}
              <button onClick={pay} disabled={stage === 'paying'}
                className="w-full btn-gold text-base py-4 flex items-center justify-center gap-2">
                {stage === 'paying'
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Проводим платёж…</>
                  : <>❤️ Пожертвовать {value ? rub(value) : ''}</>}
              </button>
              <p className="text-[11px] text-coffee-500 text-center">100% суммы идёт на лечение. Ветеринары ВетДом проводят лечение без наценки.</p>
            </div>
          </>
        ) : thanks && (
          <div className="p-7 text-center">
            <div className="relative mx-auto w-20 h-20 mb-4">
              <span className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-4xl shadow-lg">❤️</div>
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">Платёж прошёл успешно · {rub(value)}</div>
            <h3 className="text-2xl font-black mt-2 mb-3">Спасибо! {thanks.name} чувствует вашу заботу</h3>
            <p className="text-coffee-700 leading-relaxed">{thanks.thanks}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FACC15] text-coffee-950 px-5 py-2.5 font-black text-lg">
              ✨ +{thanks.karma} к карме
            </div>
            {thanks.karmaTotal !== null && (
              <div className="text-xs text-coffee-500 mt-2">Ваша карма добра: {Math.round(thanks.karmaTotal)}</div>
            )}
            <p className="mt-5 text-sm text-coffee-600 italic">Пусть никто из ваших близких никогда не болеет, а в доме всегда будут здоровье, радость и добро. 🐾</p>
            <div className="mt-6 flex gap-2 justify-center">
              <button onClick={() => { setStage('form'); setThanks(null); }} className="px-5 py-3 rounded-xl border-2 border-coffee-200 font-bold text-sm hover:bg-white">Помочь ещё</button>
              <button onClick={onClose} className="btn-gold px-6 py-3 text-sm">Готово</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CharityPage() {
  const [cases, setCases] = useState<CharityCase[]>([]);
  const [myKarma, setMyKarma] = useState<number | null>(null);
  const [active, setActive] = useState<CharityCase | null>(null);

  const load = useCallback(() => {
    getCharity().then((d) => { setCases(d.cases); setMyKarma(d.myKarma); }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const totalRaised = cases.reduce((s, c) => s + c.raised, 0);

  return (
    <div className="min-h-screen bg-milk text-coffee-900 pt-24 md:pt-[156px] pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-coffee-500 hover:text-coffee-800 text-sm mb-6">← На главную</Link>

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 items-end mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-px bg-red-500" />
              <span className="text-red-600 text-xs font-bold uppercase tracking-[0.3em]">Благотворительность</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
              Помогите тем, у кого <span className="text-green-600">нет хозяина</span>
            </h1>
            <p className="text-coffee-600 mt-4 max-w-xl">
              Это подопечные приютов и волонтёров. Наши ветеринары лечат их без наценки, а каждый ваш рубль идёт на операции, лекарства и реабилитацию.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden bg-coffee-200">
            {[
              { v: rub(totalRaised), l: 'собрано' },
              { v: '47', l: 'уже здоровы' },
              { v: myKarma !== null ? String(Math.round(myKarma)) : '♥', l: myKarma !== null ? 'ваша карма' : 'с любовью' },
            ].map((s) => (
              <div key={s.l} className="bg-cream px-4 py-4 text-center">
                <div className="text-lg md:text-xl font-black">{s.v}</div>
                <div className="text-[11px] text-coffee-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c) => (
            <div key={c.id} className="group rounded-3xl overflow-hidden bg-cream border border-coffee-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="relative h-52 overflow-hidden">
                <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                {c.urgent && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow">🚨 Срочно</span>}
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-coffee-800 text-[11px] font-semibold">📍 {c.city}</span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xl font-black">{c.name}</h3>
                  <span className="text-xs text-coffee-500">{c.species}, {c.age}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-red-600">🩹 {c.problem}</div>
                <p className="text-sm text-coffee-600 mt-2 line-clamp-3">{c.story}</p>
                <div className="mt-3 rounded-xl bg-white/70 border border-coffee-100 px-3 py-2 text-xs text-coffee-700">
                  <b>Нужно:</b> {c.needs}
                </div>
                <div className="mt-4"><Progress raised={c.raised} goal={c.goal} /></div>
                <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-coffee-500">❤️ {c.donors} помогли</span>
                  <button onClick={() => setActive(c)} className="btn-gold text-sm py-2.5 px-6">Помочь</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {active && <DonateModal c={active} onClose={() => setActive(null)} onDone={load} />}
    </div>
  );
}
