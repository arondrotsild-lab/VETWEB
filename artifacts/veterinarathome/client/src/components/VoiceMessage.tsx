import { useEffect, useRef, useState } from 'react';

/* ─── Запись голосового: MediaRecorder + «волна» + расшифровка через распознавание речи браузера ─── */

interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null; start(): void; stop(): void;
}
type SpeechRecCtor = new () => SpeechRec;

export interface VoicePayload { audio: string; duration: number; waveform: number[]; transcript: string; url: string }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function pickMime() {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return opts.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) ?? '';
}

export function useVoiceRecorder(onDone: (p: VoicePayload) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState('');
  const ref = useRef<{ rec?: MediaRecorder; stream?: MediaStream; ctx?: AudioContext; chunks: Blob[]; samples: number[]; t0: number; timer?: number; speech?: SpeechRec; transcript: string; cancelled: boolean }>({ chunks: [], samples: [], t0: 0, transcript: '', cancelled: false });

  const cleanup = () => {
    const r = ref.current;
    clearInterval(r.timer);
    r.stream?.getTracks().forEach((t) => t.stop());
    r.ctx?.close().catch(() => {});
    try { r.speech?.stop(); } catch { /* ignore */ }
  };
  useEffect(() => () => cleanup(), []);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Этот браузер не умеет записывать звук. Откройте сайт в Chrome, Safari или Opera последней версии.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const ctx = new AudioContext();
      const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      const r = ref.current;
      Object.assign(r, { rec, stream, ctx, chunks: [], samples: [], t0: Date.now(), transcript: '', cancelled: false });

      rec.ondataavailable = (e) => { if (e.data.size) r.chunks.push(e.data); };
      rec.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - r.t0) / 1000));
        cleanup();
        setRecording(false);
        if (r.cancelled || !r.chunks.length) return;
        const blob = new Blob(r.chunks, { type: rec.mimeType || mime || 'audio/webm' });
        // «Волна» из 40 столбиков
        const n = 40, s = r.samples, max = Math.max(0.05, ...s);
        const waveform = Array.from({ length: n }, (_, i) => {
          const part = s.slice(Math.floor((i * s.length) / n), Math.floor(((i + 1) * s.length) / n));
          const v = part.length ? part.reduce((a, b) => a + b, 0) / part.length : 0;
          return Math.round(Math.max(0.08, Math.min(1, v / max)) * 100) / 100;
        });
        const reader = new FileReader();
        reader.onload = () => onDone({ audio: String(reader.result), duration, waveform, transcript: r.transcript.trim(), url: URL.createObjectURL(blob) });
        reader.readAsDataURL(blob);
      };

      r.timer = window.setInterval(() => {
        an.getByteTimeDomainData(data);
        let sum = 0; for (const v of data) { const x = (v - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / data.length);
        r.samples.push(rms);
        setLevels((l) => [...l.slice(-29), Math.min(1, rms * 4)]);
        setSeconds(Math.floor((Date.now() - r.t0) / 1000));
        if (Date.now() - r.t0 > 180_000) rec.stop();   // не больше 3 минут
      }, 100);

      // Расшифровка речи параллельно с записью (Chrome, Safari)
      const Ctor = (window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }).SpeechRecognition
        || (window as unknown as { webkitSpeechRecognition?: SpeechRecCtor }).webkitSpeechRecognition;
      if (Ctor) {
        try {
          const sp = new Ctor(); sp.lang = 'ru-RU'; sp.continuous = true; sp.interimResults = false;
          sp.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) r.transcript += e.results[i][0].transcript + ' '; };
          sp.onerror = () => {};
          sp.start(); r.speech = sp;
        } catch { /* распознавание недоступно — отправим без расшифровки */ }
      }

      rec.start(250);
      setSeconds(0); setLevels([]); setRecording(true);
    } catch {
      setError('Нет доступа к микрофону. Разрешите его в настройках браузера.');
    }
  };

  const stop = (cancel = false) => {
    const r = ref.current;
    r.cancelled = cancel;
    // даём распознаванию дослушать последнюю фразу
    try { r.speech?.stop(); } catch { /* ignore */ }
    setTimeout(() => { if (r.rec?.state !== 'inactive') r.rec?.stop(); }, cancel ? 0 : 400);
  };

  return { recording, seconds, levels, error, start, stop, fmt };
}

/* ─── Пузырь голосового сообщения: плеер, «волна», расшифровка ─── */
export function VoiceBubble({ url, duration, waveform, transcript, mine }: { url: string; duration: number; waveform?: number[] | null; transcript?: string | null; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [showText, setShowText] = useState(false);
  const bars = waveform && waveform.length ? waveform : Array.from({ length: 40 }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i * 1.7)));
  const progress = duration ? pos / duration : 0;

  const toggle = () => {
    const a = audio.current; if (!a) return;
    if (playing) a.pause(); else a.play().catch(() => {});
  };

  return (
    <div className="min-w-[230px]">
      <audio ref={audio} src={url} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => setPos((e.target as HTMLAudioElement).currentTime)} />
      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label={playing ? 'Пауза' : 'Прослушать'}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${mine ? 'bg-white text-green-700' : 'bg-green-600 text-white'}`}>
          {playing
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" rx="1" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" /></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9.5-5.5z" /></svg>}
        </button>
        <div className="flex items-center gap-[2px] h-8 flex-1 cursor-pointer"
          onClick={(e) => {
            const a = audio.current; if (!a) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
            if (!playing) a.play().catch(() => {});
          }}>
          {bars.map((b, i) => (
            <span key={i} className="flex-1 rounded-full transition-colors"
              style={{ height: `${Math.max(12, b * 100)}%`, background: i / bars.length <= progress
                ? (mine ? '#fff' : '#3A651C') : (mine ? 'rgba(255,255,255,.45)' : 'rgba(58,101,28,.3)') }} />
          ))}
        </div>
      </div>
      <div className={`flex items-center justify-between mt-1.5 text-[11px] ${mine ? 'text-white/80' : 'text-coffee-500'}`}>
        <span>{fmt(playing || pos ? pos : duration)}</span>
        <button onClick={() => setShowText(!showText)} className="font-bold underline underline-offset-2">
          {showText ? 'Скрыть текст' : 'Aa  Расшифровка'}
        </button>
      </div>
      {showText && (
        <div className={`mt-2 rounded-xl px-3 py-2 text-[13px] leading-relaxed ${mine ? 'bg-white/15' : 'bg-[#F5EEE3]'}`}>
          {transcript || <span className="opacity-70">Расшифровка недоступна: браузер не поддерживает распознавание речи. Голосовое можно прослушать.</span>}
        </div>
      )}
    </div>
  );
}
