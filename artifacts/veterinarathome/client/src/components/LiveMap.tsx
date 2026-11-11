import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEMO_ROUTE } from '../data/demoRoute';

/* Длительность каждой стадии в демонстрации (мс) — используется и страницей заказа */
export const PHASE_MS: Record<string, number> = {
  pending: 7000, confirmed: 6500, on_the_way: 15000, arrived: 4500, in_progress: 8000,
};

const HOME = DEMO_ROUTE[DEMO_ROUTE.length - 1];
const START = DEMO_ROUTE[0];
const BLUE = '#1A73E8';

// Другие ветеринары поблизости, которых «перебирает» поиск
const NEARBY: { p: [number, number]; r: number }[] = [
  { p: [55.7605, 37.5520], r: 30 }, { p: [55.7565, 37.5885], r: 120 }, { p: [55.7380, 37.5905], r: 200 },
  { p: [55.7425, 37.5390], r: 75 }, { p: [55.7615, 37.5735], r: 160 }, { p: START, r: 80 }, { p: [55.7330, 37.5640], r: 300 },
];

/* Геометрия маршрута */
const segLen = DEMO_ROUTE.slice(1).map((p, i) => L.latLng(DEMO_ROUTE[i]).distanceTo(L.latLng(p)));
const total = segLen.reduce((a, b) => a + b, 0);
function pointAt(t: number): { pos: [number, number]; idx: number; bearing: number } {
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segLen.length; i++) {
    if (d <= segLen[i] || i === segLen.length - 1) {
      const k = segLen[i] ? d / segLen[i] : 0;
      const [a1, b1] = DEMO_ROUTE[i], [a2, b2] = DEMO_ROUTE[i + 1];
      const bearing = (Math.atan2((b2 - b1) * Math.cos((a1 * Math.PI) / 180), a2 - a1) * 180) / Math.PI;
      return { pos: [a1 + (a2 - a1) * k, b1 + (b2 - b1) * k], idx: i, bearing };
    }
    d -= segLen[i];
  }
  return { pos: HOME, idx: segLen.length - 1, bearing: 0 };
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* Машинка — вид сверху, как в такси-приложениях */
const carSvg = (color: string) => `
<svg width="26" height="44" viewBox="0 0 26 44" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="1" width="22" height="42" rx="7" fill="${color}" stroke="#fff" stroke-width="2"/>
  <rect x="5" y="9" width="16" height="8" rx="2" fill="#1f2937" opacity=".85"/>
  <rect x="5" y="29" width="16" height="6" rx="2" fill="#1f2937" opacity=".7"/>
  <rect x="6" y="19" width="14" height="8" rx="1.5" fill="#fff" opacity=".9"/>
  <path d="M11 21.5h4M13 19.5v4" stroke="#5E9E2C" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

/* Иконки */
const homeIcon = L.divIcon({
  className: '', iconSize: [36, 48], iconAnchor: [18, 46],
  html: `<div class="lm-pin">
    <svg width="36" height="48" viewBox="0 0 36 48"><path d="M18 1C8.6 1 1 8.4 1 17.6 1 30 18 47 18 47s17-17 17-29.4C35 8.4 27.4 1 18 1z" fill="#EA4335" stroke="#B31412" stroke-width="1.5"/><circle cx="18" cy="17.5" r="6.5" fill="#7A1A12"/></svg>
    <div class="lm-pin-label">Кутузовский пр., 8</div>
  </div>`,
});
const nearbyIcon = (rot: number) => L.divIcon({
  className: '', iconSize: [26, 44], iconAnchor: [13, 22],
  html: `<div class="lm-nearby" style="transform:rotate(${rot}deg)">${carSvg('#9AA0A6')}</div>`,
});

function vetIcon(photo: string, bubble: string, bearing: number, button?: string) {
  return L.divIcon({
    className: '', iconSize: [26, 44], iconAnchor: [13, 22],
    html: `<div class="lm-vet">
      ${bubble ? `<div class="lm-bubble"><img src="${photo}" alt="" class="lm-ava"/><div><div>${bubble}</div>${button ? `<div class="lm-btn">${button}</div>` : ''}</div></div>` : ''}
      <div class="lm-car" style="transform:rotate(${bearing}deg)">${carSvg('#ffffff')}</div>
    </div>`,
  });
}

interface Props {
  status: string;
  vetName: string;
  vetPhoto: string;
  petName?: string;
  amount?: number;
}

export default function LiveMap({ status, vetName, vetPhoto, petName, amount }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layers = useRef<{ rings: L.Circle[]; nearby: L.Marker[]; vet?: L.Marker; lines: L.Polyline[] }>({ rings: [], nearby: [], lines: [] });
  const [overlay, setOverlay] = useState<{ radius?: number; eta?: number; km?: number; timer?: string }>({});
  const firstName = vetName.split(' ')[0] || 'Врач';

  /* Инициализация карты один раз */
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
      .setView(HOME, 15);
    L.tileLayer('/api/tiles/{z}/{x}/{y}.png', {
      maxZoom: 19, tileSize: 256,
      attribution: '&copy; участники OpenStreetMap',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.marker(HOME, { icon: homeIcon, zIndexOffset: 500 }).addTo(map);
    mapRef.current = map;
    // на случай, если контейнер получил размер позже
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* Анимация стадий */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ly = layers.current;
    ly.rings.forEach((r) => r.remove()); ly.rings = [];
    ly.nearby.forEach((m) => m.remove()); ly.nearby = [];
    ly.lines.forEach((l) => l.remove()); ly.lines = [];
    ly.vet?.remove(); ly.vet = undefined;
    setOverlay({});

    let raf = 0;
    const timers: number[] = [];
    const t0 = performance.now();
    const route = (pts: [number, number][], passed = false) => {
      ly.lines.push(L.polyline(pts, { color: '#fff', weight: 10, opacity: passed ? 0.6 : 1, lineCap: 'round', lineJoin: 'round' }).addTo(map));
      const line = L.polyline(pts, { color: passed ? '#9AA0A6' : BLUE, weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      ly.lines.push(line);
      return line;
    };

    if (status === 'pending') {
      map.flyTo(HOME, 14, { duration: 0.8 });
      ly.rings = [0, 1, 2].map(() => L.circle(HOME, { radius: 1, color: BLUE, weight: 2, fillColor: BLUE, fillOpacity: 0.1 }).addTo(map));
      NEARBY.forEach((n, i) => timers.push(window.setTimeout(() => {
        ly.nearby.push(L.marker(n.p, { icon: nearbyIcon(n.r) }).addTo(map));
      }, 500 + i * 700)));
      const loop = (now: number) => {
        const t = now - t0;
        ly.rings.forEach((r, i) => {
          const k = ((t / 2400) + i / 3) % 1;
          r.setRadius(150 + k * 2700);
          r.setStyle({ opacity: 0.8 * (1 - k), fillOpacity: 0.12 * (1 - k) });
        });
        setOverlay({ radius: Math.round(Math.min(3, 0.5 + (t / PHASE_MS.pending) * 2.5) * 10) / 10 });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    if (status === 'confirmed') {
      map.flyToBounds(L.latLngBounds(DEMO_ROUTE), { padding: [80, 80], duration: 1 });
      route(DEMO_ROUTE);
      const b0 = pointAt(0).bearing;
      ly.vet = L.marker(START, { icon: vetIcon(vetPhoto, `<b>${firstName}:</b> Вижу вызов${petName ? ` к ${petName}` : ''}. Готова принять!`, b0), zIndexOffset: 1000 }).addTo(map);
      timers.push(window.setTimeout(() => ly.vet?.setIcon(vetIcon(vetPhoto, `<b>${firstName}:</b> Беру чемоданчик…`, b0, '🚗 Я выезжаю')), 2600));
      timers.push(window.setTimeout(() => ly.vet?.setIcon(vetIcon(vetPhoto, `<b>${firstName}:</b> Я выезжаю! Буду через 12 мин`, b0, '✓ Выезжаю')), 4300));
      setOverlay({ km: Math.round(total / 100) / 10 });
    }

    if (status === 'on_the_way') {
      map.flyToBounds(L.latLngBounds(DEMO_ROUTE), { padding: [80, 80], duration: 0.8 });
      const passed = route([START], true);
      const ahead = route(DEMO_ROUTE);
      ly.vet = L.marker(START, { icon: vetIcon(vetPhoto, '', pointAt(0).bearing), zIndexOffset: 1000 }).addTo(map);
      let last = '';
      const loop = (now: number) => {
        const p = Math.min(1, (now - t0) / PHASE_MS.on_the_way);
        const { pos, idx, bearing } = pointAt(ease(p));
        ly.vet?.setLatLng(pos);
        passed.setLatLngs([...DEMO_ROUTE.slice(0, idx + 1), pos]);
        ly.lines[0].setLatLngs([...DEMO_ROUTE.slice(0, idx + 1), pos]);
        ahead.setLatLngs([pos, ...DEMO_ROUTE.slice(idx + 1)]);
        ly.lines[2].setLatLngs([pos, ...DEMO_ROUTE.slice(idx + 1)]);
        const eta = Math.max(1, Math.ceil(12 * (1 - p)));
        const bubble = p < 0.5 ? `В пути · ${eta} мин` : p < 0.92 ? `Уже близко · ${eta} мин` : 'Паркуюсь у дома';
        const key = `${bubble}|${Math.round(bearing / 10)}`;
        if (key !== last) { last = key; ly.vet?.setIcon(vetIcon(vetPhoto, bubble, bearing)); }
        setOverlay({ eta: p >= 1 ? 0 : eta, km: Math.round((total * (1 - ease(p))) / 100) / 10 });
        if (p < 1) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    if (status === 'arrived' || status === 'in_progress' || status === 'completed') {
      map.flyTo(HOME, 17, { duration: 1 });
      route(DEMO_ROUTE, true);
      const near: [number, number] = [HOME[0] - 0.00025, HOME[1] - 0.0005];
      const bubble = status === 'arrived' ? `<b>${firstName}:</b> Я на месте, поднимаюсь 🏠`
        : status === 'in_progress' ? `🩺 Идёт осмотр${petName ? ` · ${petName}` : ''}` : '✓ Осмотр завершён';
      ly.vet = L.marker(near, { icon: vetIcon(vetPhoto, bubble, 60), zIndexOffset: 1000 }).addTo(map);
      if (status === 'in_progress') {
        const tick = () => {
          const s = Math.floor((performance.now() - t0) / 1000) + 3;
          setOverlay({ timer: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` });
        };
        tick(); timers.push(window.setInterval(tick, 1000));
      }
    }

    return () => { cancelAnimationFrame(raf); timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); };
  }, [status, vetPhoto, firstName, petName]);

  return (
    <div className="relative w-full h-full z-0 isolate">
      <div ref={elRef} className="absolute inset-0" />

      {/* Плашки поверх карты — как в навигаторе */}
      <div className="absolute top-14 right-3 z-[500] flex flex-col items-end gap-2 pointer-events-none">
        {overlay.radius !== undefined && <div className="lm-chip"><span className="lm-dot" />Ищем врачей рядом · <b>{overlay.radius.toFixed(1)} км</b></div>}
        {overlay.eta !== undefined && overlay.eta > 0 && (
          <div className="lm-nav">
            <div className="text-2xl font-black leading-none">{overlay.eta} мин</div>
            <div className="text-xs opacity-80 mt-0.5">{overlay.km?.toFixed(1)} км · Кутузовский проспект</div>
          </div>
        )}
        {overlay.eta === undefined && overlay.km !== undefined && <div className="lm-chip">🚗 Маршрут {overlay.km.toFixed(1)} км · ~12 мин</div>}
        {overlay.timer && <div className="lm-chip">🩺 Осмотр идёт · <b>{overlay.timer}</b></div>}
      </div>

      {status === 'completed' && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/25 backdrop-blur-[2px] lm-fade">
          <div className="rounded-3xl bg-white text-[#1E140D] px-7 py-6 shadow-2xl text-center max-w-xs lm-pop">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#34A853] text-white text-3xl flex items-center justify-center mb-3">✓</div>
            <div className="text-xl font-black">Осмотр завершён</div>
            <div className="text-sm text-gray-500 mt-1">{petName ? `${petName} в безопасности` : 'Питомец в безопасности'}</div>
            <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <div className="text-xs text-[#34A853] font-semibold">✓ Оплата прошла успешно</div>
              <div className="text-2xl font-black">{amount ? `${amount.toLocaleString('ru-RU')} ₽` : '—'}</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lm-pin { position:relative; width:36px; height:48px; filter:drop-shadow(0 3px 4px rgba(0,0,0,.35)); animation:lmDrop .5s cubic-bezier(.2,1.4,.4,1); }
        .lm-pin-label { position:absolute; top:50px; left:50%; transform:translateX(-50%); white-space:nowrap; font:700 12px Roboto,Inter,system-ui,sans-serif; color:#B31412; text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff; }
        .lm-nearby { width:26px; height:44px; transform-origin:50% 50%; animation:lmPop .5s cubic-bezier(.2,1.6,.4,1); filter:drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
        .lm-vet { position:relative; width:26px; height:44px; }
        .lm-car { width:26px; height:44px; transform-origin:50% 50%; filter:drop-shadow(0 3px 5px rgba(0,0,0,.45)); transition:transform .3s linear; }
        .lm-car svg rect:first-child { fill:#fff; stroke:${BLUE}; stroke-width:2.5; }
        .lm-bubble { position:absolute; bottom:52px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:8px; white-space:nowrap; background:#fff; color:#202124; font:500 13px/1.3 Roboto,Inter,system-ui,sans-serif; padding:7px 12px 7px 7px; border-radius:22px; box-shadow:0 2px 6px rgba(60,64,67,.3),0 6px 16px rgba(60,64,67,.2); animation:lmPopB .4s ease-out; }
        .lm-bubble:after { content:''; position:absolute; left:50%; bottom:-6px; transform:translateX(-50%) rotate(45deg); width:12px; height:12px; background:#fff; }
        .lm-ava { width:30px; height:30px; border-radius:50%; object-fit:cover; border:2px solid #34A853; flex-shrink:0; }
        .lm-btn { margin-top:5px; text-align:center; background:#34A853; color:#fff; font-weight:700; border-radius:14px; padding:5px 10px; animation:lmPress 1.4s ease-in-out; }
        .lm-chip { display:flex; align-items:center; gap:6px; pointer-events:none; background:#fff; color:#202124; font:500 12px Roboto,Inter,system-ui,sans-serif; padding:8px 12px; border-radius:999px; box-shadow:0 2px 6px rgba(60,64,67,.3); }
        .lm-dot { width:8px; height:8px; border-radius:50%; background:${BLUE}; animation:lmPing 1.2s ease-out infinite; }
        .lm-nav { background:#0F9D58; color:#fff; padding:10px 14px; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,.3); font-family:Roboto,Inter,system-ui,sans-serif; }
        .lm-fade { animation:lmFade .5s ease-out; }
        .lm-pop { animation:lmPop .6s cubic-bezier(.2,1.5,.4,1); }
        @keyframes lmPing { 0%{box-shadow:0 0 0 0 rgba(26,115,232,.6)} 100%{box-shadow:0 0 0 8px rgba(26,115,232,0)} }
        @keyframes lmPop { 0%{opacity:0;scale:.3} 100%{opacity:1;scale:1} }
        @keyframes lmPopB { 0%{transform:translateX(-50%) scale(.4);opacity:0} 100%{transform:translateX(-50%) scale(1);opacity:1} }
        @keyframes lmDrop { 0%{transform:translateY(-30px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes lmFade { from{opacity:0} to{opacity:1} }
        @keyframes lmPress { 0%,60%{scale:1} 70%{scale:.9;background:#188038} 100%{scale:1} }
        .leaflet-container { background:#f2efe9; font-family:Roboto,Inter,system-ui,sans-serif; }
        .leaflet-control-attribution { font-size:9px; opacity:.75; }
        .leaflet-bottom.leaflet-right { margin-bottom:96px; }
        .leaflet-control-zoom a { width:36px !important; height:36px !important; line-height:36px !important; font-size:20px !important; color:#5f6368 !important; }
        .leaflet-control-zoom { border:none !important; box-shadow:0 1px 4px rgba(0,0,0,.3) !important; border-radius:8px !important; overflow:hidden; }
      `}</style>
    </div>
  );
}
