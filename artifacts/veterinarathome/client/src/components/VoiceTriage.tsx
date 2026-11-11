import { useState } from 'react';
import { getTriage, uploadVoice } from '../api';
import { useVoiceRecorder, VoiceBubble, VoicePayload } from './VoiceMessage';

export interface Triage {
  urgency: 'emergency' | 'urgent' | 'routine';
  summary: string;
  do_now: string[];
  dont: string[];
  possible_causes: string;
  recommended_service: string;
  source: 'ai' | 'rules';
}

const URGENCY = {
  emergency: { label: 'Срочно — нужна скорая помощь', color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '🚨' },
  urgent:    { label: 'Нужен врач сегодня',           color: '#FACC15', bg: 'rgba(250,204,21,0.12)', icon: '⚠️' },
  routine:   { label: 'Можно планово',                color: '#9BCD67', bg: 'rgba(124,184,66,0.12)', icon: '✓' },
};

interface Props {
  petLabel: string;
  onChange: (text: string, triage: Triage | null, voiceUrl: string | null) => void;
  onPickService?: (name: string) => void;
}

export default function VoiceTriage({ petLabel, onChange, onPickService }: Props) {
  const [text, setText] = useState('');
  const [micError, setMicError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [voice, setVoice] = useState<VoicePayload | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  const update = (next: string, tr: Triage | null, vu = voiceUrl) => { setText(next); onChange(next, tr, vu); };

  const analyze = async (t = text, vu = voiceUrl) => {
    if (t.trim().length < 5) return;
    setLoading(true);
    try {
      const tr: Triage = await getTriage(t, petLabel);
      setTriage(tr);
      onChange(t, tr, vu);
    } catch {
      setMicError('Не удалось получить подсказку. Врач всё равно увидит ваше описание.');
    } finally { setLoading(false); }
  };

  // Голос: записываем аудио (работает в любом браузере), расшифровываем на сервере нейросетью Whisper
  const rec = useVoiceRecorder(async (v) => {
    setVoice(v);
    setTranscribing(true);
    setMicError('');
    try {
      const r = await uploadVoice(v.audio);
      const spoken = (r.transcript || v.transcript || '').trim();
      setVoiceUrl(r.audio_url);
      const next = [text.trim(), spoken].filter(Boolean).join(' ');
      update(next, triage, r.audio_url);
      if (spoken) await analyze(next, r.audio_url);
      else setMicError('Не удалось разобрать слова — голосовое всё равно прикреплено к заказу, врач его прослушает. Можно дописать текстом.');
    } catch {
      setMicError('Не удалось сохранить запись. Попробуйте ещё раз или опишите текстом.');
    } finally { setTranscribing(false); }
  });

  const removeVoice = () => { setVoice(null); setVoiceUrl(null); onChange(text, triage, null); };
  const u = triage ? URGENCY[triage.urgency] : null;
  const busy = loading || transcribing;

  return (
    <div className="rounded-3xl p-5 md:p-6 mb-10 border border-green-400/30 bg-gradient-to-br from-green-600/15 via-[#2A1D14] to-[#1F150E]">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-green-300/80">ИИ-помощник · первая помощь</div>
      <h2 className="text-xl md:text-2xl font-black text-white leading-tight">Что случилось с питомцем?</h2>
      <p className="text-white/60 text-sm mt-1">
        Напишите или нажмите <span className="text-white font-semibold">🎤 микрофон</span> и расскажите голосом. ИИ подскажет, что делать до приезда врача, а врач получит ваш рассказ и голосовое заранее.
      </p>

      {/* Поле как в мессенджере: микрофон и «отправить» справа внизу */}
      <div className={`relative mt-4 rounded-2xl border transition-colors ${rec.recording ? 'border-red-400/70 bg-red-500/[0.08]' : 'border-white/15 bg-white/5 focus-within:border-green-400/60'}`}>
        {rec.recording ? (
          <div className="flex items-center gap-3 px-4 pt-4 pb-16 min-h-[104px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-red-200 text-sm w-10">{rec.fmt(rec.seconds)}</span>
            <div className="flex-1 flex items-center gap-[2px] h-9 overflow-hidden">
              {rec.levels.map((l, i) => <span key={i} className="w-[3px] rounded-full bg-red-400" style={{ height: `${Math.max(10, l * 100)}%` }} />)}
            </div>
            <span className="text-xs text-red-200">Говорите — нажмите ■, когда закончите</span>
          </div>
        ) : (
          <textarea value={text}
            onChange={(e) => update(e.target.value, triage)} rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze(); } }}
            placeholder={transcribing ? 'Расшифровываю голосовое…' : 'Например: «Кот третий день плохо ест, утром его стошнило, лежит и не встаёт»'}
            className="w-full bg-transparent resize-none text-sm text-white placeholder-white/35 px-4 pt-3.5 pb-14 pr-4 focus:outline-none rounded-2xl" />
        )}
        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
          {transcribing && <span className="text-xs text-green-200 font-semibold mr-1 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-green-200/40 border-t-green-200 rounded-full animate-spin" />Расшифровываю…</span>}
          {rec.recording && (
            <button type="button" onClick={() => rec.stop(true)} aria-label="Отменить запись"
              className="w-11 h-11 rounded-full border border-white/25 text-white/70 hover:text-white flex items-center justify-center">✕</button>
          )}
          <button type="button" onClick={() => (rec.recording ? rec.stop(false) : rec.start())} disabled={transcribing}
            aria-pressed={rec.recording} aria-label={rec.recording ? 'Закончить запись' : 'Рассказать голосом'}
            title={rec.recording ? 'Закончить запись' : 'Рассказать голосом'}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${rec.recording ? 'bg-red-500' : 'bg-green-500 hover:bg-green-400 shadow-lg shadow-green-900/40'}`}>
            {rec.recording && <span className="absolute inset-0 rounded-full bg-red-500/60 animate-ping" />}
            <svg className="relative" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {rec.recording ? <rect x="7" y="7" width="10" height="10" rx="2" fill="white" /> : <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" /></>}
            </svg>
          </button>
          {!rec.recording && (
            <button type="button" onClick={() => analyze()} disabled={busy || text.trim().length < 5} aria-label="Получить первую помощь" title="Получить первую помощь"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-[#FACC15] hover:bg-[#FDE047] text-[#1E140D] disabled:opacity-35 transition-all">
              {loading
                ? <span className="w-4 h-4 border-2 border-[#1E140D]/40 border-t-[#1E140D] rounded-full animate-spin" />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
            </button>
          )}
        </div>
      </div>

      {/* Записанное голосовое — прикрепляется к заказу */}
      {voice && !rec.recording && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-green-600 px-4 py-3">
          <div className="flex-1"><VoiceBubble url={voiceUrl ?? voice.url} duration={voice.duration} waveform={voice.waveform} transcript={text} mine /></div>
          <button type="button" onClick={removeVoice} aria-label="Удалить голосовое" className="text-white/70 hover:text-white text-lg px-1">✕</button>
        </div>
      )}
      {voice && voiceUrl && <p className="text-[11px] text-green-200 mt-1.5">🎧 Голосовое прикреплено к заказу — врач сможет его прослушать</p>}
      {rec.error && <p className="text-xs text-amber-200 mt-2">{rec.error}</p>}
      {micError && <p className="text-xs text-amber-200 mt-2">{micError}</p>}

      <p className="text-[11px] text-white/40 mt-2">После голосового подсказка появится сама; для текста нажмите жёлтую стрелку. Это не заменяет осмотр врача. При угрозе жизни выбирайте «Скорая ветпомощь».</p>

      {triage && u && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 font-bold text-sm" style={{ background: u.bg, color: u.color }}>
            <span>{u.icon}</span>{u.label}
          </div>
          <div className="p-5 space-y-4">
            <p className="text-white/90">{triage.summary}</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-green-300 mb-2">Что сделать сейчас</div>
                <ul className="space-y-1.5">{triage.do_now.map((d) => <li key={d} className="text-sm text-white/80 flex gap-2"><span className="text-green-400">✓</span>{d}</li>)}</ul>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-red-300 mb-2">Чего делать нельзя</div>
                <ul className="space-y-1.5">{triage.dont.map((d) => <li key={d} className="text-sm text-white/80 flex gap-2"><span className="text-red-400">✕</span>{d}</li>)}</ul>
              </div>
            </div>
            <p className="text-xs text-white/50">{triage.possible_causes}</p>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span className="text-xs text-white/60">📋 Ваш рассказ и эта оценка будут переданы врачу вместе с заказом</span>
              {onPickService && (
                <button type="button" onClick={() => onPickService(triage.recommended_service)}
                  className="text-xs font-bold px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white">
                  Выбрать услугу: {triage.recommended_service} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
