import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getChat, sendChat, sendVoice } from '../api';
import { useVoiceRecorder, VoiceBubble, VoicePayload } from '../components/VoiceMessage';

interface Msg { id: number; sender: 'client' | 'vet'; text: string; created_at: string; kind?: string; audio_url?: string; duration?: number; waveform?: number[] | null; transcript?: string | null }
interface ChatOrder {
  id: number; status: string; scheduled_at: string; service_name: string; pet_name?: string; pet_species?: string;
  vet_name: string; vet_photo_url?: string; vet_specialization?: string;
}

const QUICK = ['Как давать лекарство?', 'Можно ли купать и гулять?', 'Чем лучше кормить?', 'Появились новые симптомы'];

const time = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const day = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

export default function ChatPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<ChatOrder | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);     // область сообщений — прокручиваем только её, не страницу
  const lastCount = useRef(0);
  const stickBottom = useRef(true);                // пользователь внизу переписки?
  const forceScroll = useRef(true);                // прокрутить после своего сообщения

  const load = () => getChat(Number(orderId)).then((d) => {
    setOrder(d.order);
    setMsgs(d.messages);
    const last = d.messages[d.messages.length - 1];
    if (last?.sender === 'vet') setWaiting(false);
  }).catch(() => setError('Диалог не найден'));

  useEffect(() => { load(); const iv = setInterval(load, 2000); return () => clearInterval(iv); }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (msgs.length !== lastCount.current || waiting) {
      if (stickBottom.current || forceScroll.current) box.scrollTo({ top: box.scrollHeight, behavior: lastCount.current ? 'smooth' : 'auto' });
      forceScroll.current = false;
      lastCount.current = msgs.length;
    }
  }, [msgs.length, waiting]);

  const send = async (t = text) => {
    const v = t.trim();
    if (!v) return;
    setText('');
    forceScroll.current = true;
    setMsgs((m) => [...m, { id: -Date.now(), sender: 'client', text: v, created_at: new Date().toISOString() }]);
    setWaiting(true);
    try { await sendChat(Number(orderId), v); } catch { setWaiting(false); }
  };

  const sendVoiceMsg = async (v: VoicePayload) => {
    forceScroll.current = true;
    setMsgs((m) => [...m, { id: -Date.now(), sender: 'client', text: '🎤 Голосовое сообщение', created_at: new Date().toISOString(), kind: 'voice', audio_url: v.url, duration: v.duration, waveform: v.waveform, transcript: v.transcript }]);
    setWaiting(true);
    try { await sendVoice(Number(orderId), { audio: v.audio, duration: v.duration, waveform: v.waveform, transcript: v.transcript }); }
    catch { setWaiting(false); }
  };
  const voice = useVoiceRecorder(sendVoiceMsg);

  if (error) return (
    <div className="min-h-screen bg-milk pt-24 md:pt-[156px] text-center text-coffee-700">
      <p className="mb-4">{error}</p><Link to="/chats" className="btn-gold">Все сообщения</Link>
    </div>
  );

  const firstName = order?.vet_name.split(' ')[0] ?? '';
  let lastDay = '';

  return (
    <div className="min-h-screen bg-milk text-coffee-900 pt-16 md:pt-[150px] md:pb-6 md:px-3">
      <div className="max-w-3xl mx-auto flex flex-col md:rounded-3xl overflow-hidden bg-cream md:border border-coffee-200/70 shadow-xl h-[calc(100dvh-64px)] md:h-[calc(100vh-175px)] md:min-h-[520px]">
        {/* Шапка диалога */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-coffee-100">
          <Link to="/chats" className="text-coffee-400 hover:text-coffee-800 text-xl px-1" aria-label="Назад">←</Link>
          {order?.vet_photo_url
            ? <img src={order.vet_photo_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-green-500" />
            : <div className="w-11 h-11 rounded-full bg-green-500 text-white font-black flex items-center justify-center">{firstName[0]}</div>}
          <div className="flex-1 min-w-0">
            <div className="font-black leading-tight truncate">{order?.vet_name ?? '…'}</div>
            <div className="text-xs text-green-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {waiting ? 'печатает…' : `в сети · ${order?.vet_specialization ?? 'ветеринар'}`}
            </div>
          </div>
          <Link to="/order" className="hidden sm:inline-flex text-xs font-bold px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white">Вызвать снова</Link>
        </div>

        {/* О каком визите */}
        {order && (
          <div className="px-4 py-2.5 bg-[#FBF6EF] border-b border-coffee-100 text-xs text-coffee-600 flex items-center gap-2">
            <span>🩺</span>
            <span className="truncate">Визит {day(order.scheduled_at)} · {order.service_name}{order.pet_name ? ` · ${order.pet_name}` : ''}</span>
            <Link to={`/order/${order.id}`} className="ml-auto font-bold text-green-700 whitespace-nowrap">Детали →</Link>
          </div>
        )}

        {/* Сообщения */}
        <div ref={boxRef} onScroll={(e) => { const b = e.currentTarget; stickBottom.current = b.scrollHeight - b.scrollTop - b.clientHeight < 80; }}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2" style={{ background: 'radial-gradient(circle at 20% 10%, rgba(124,184,66,.06), transparent 40%), #F5EEE3' }}>
          {msgs.length === 0 && (
            <div className="text-center text-sm text-coffee-500 mt-10">
              Напишите {firstName} — врач видит медкарту и историю этого визита.
            </div>
          )}
          {msgs.map((m) => {
            const d = day(m.created_at);
            const showDay = d !== lastDay; lastDay = d;
            const mine = m.sender === 'client';
            return (
              <div key={m.id}>
                {showDay && <div className="text-center my-3"><span className="text-[11px] px-3 py-1 rounded-full bg-white/80 text-coffee-500">{d}</span></div>}
                <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && order?.vet_photo_url && <img src={order.vet_photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />}
                  <div className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${mine ? 'bg-green-600 text-white rounded-2xl rounded-br-md' : 'bg-white text-coffee-900 rounded-2xl rounded-bl-md'}`}>
                    {m.kind === 'voice' && m.audio_url
                      ? <VoiceBubble url={m.audio_url} duration={m.duration || 1} waveform={m.waveform} transcript={m.transcript} mine={mine} />
                      : m.text}
                    <div className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-coffee-400'}`}>{time(m.created_at)}{mine && ' ✓✓'}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {waiting && (
            <div className="flex items-end gap-2">
              {order?.vet_photo_url && <img src={order.vet_photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />}
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-coffee-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Быстрые вопросы */}
        <div className="flex gap-2 px-3 pt-3 overflow-x-auto bg-white" style={{ scrollbarWidth: 'none' }}>
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} className="whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border border-green-300 text-green-700 hover:bg-green-50">{q}</button>
          ))}
        </div>

        {/* Поле ввода: текст или голосовое (микрофон справа, как в мессенджерах) */}
        {voice.error && <div className="px-4 pt-2 bg-white text-xs text-red-600">{voice.error}</div>}
        {voice.recording ? (
          <div className="flex items-center gap-3 p-3 bg-white">
            <button onClick={() => voice.stop(true)} aria-label="Отменить запись"
              className="w-12 h-12 rounded-full border-2 border-coffee-200 text-coffee-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center flex-shrink-0">✕</button>
            <div className="flex-1 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 h-12">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm text-red-700 w-10">{voice.fmt(voice.seconds)}</span>
              <div className="flex-1 flex items-center gap-[2px] h-7 overflow-hidden">
                {voice.levels.map((l, i) => <span key={i} className="w-[3px] rounded-full bg-red-400" style={{ height: `${Math.max(10, l * 100)}%` }} />)}
              </div>
              <span className="hidden sm:inline text-xs text-red-600">Запись…</span>
            </div>
            <button onClick={() => voice.stop(false)} aria-label="Отправить голосовое"
              className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 p-3 bg-white">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Сообщение или голосовое для ${firstName || 'врача'}…`}
              className="flex-1 resize-none rounded-2xl border border-coffee-200 bg-[#FBF8F3] px-4 py-3 text-sm focus:outline-none focus:border-green-500 max-h-32" />
            {text.trim() ? (
              <button type="submit" aria-label="Отправить"
                className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </button>
            ) : (
              <button type="button" onClick={voice.start} aria-label="Записать голосовое" title="Записать голосовое"
                className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-900/20">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" /></svg>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
