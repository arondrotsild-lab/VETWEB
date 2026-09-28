import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder } from '../api';
import { useTranslation } from 'react-i18next';
import ServiceIcon from '../components/ServiceIcon';
import { getSvcName } from '../utils/serviceNames';
import i18n from '../i18n';

/* ─── Types ────────────────────────────────────────────── */
interface OrderStatus { status: string; comment?: string; created_at: string; }
interface Order {
  id: number; status: string; service_name: string; service_icon: string;
  pet_name?: string; pet_species?: string; address: string; scheduled_at?: string;
  vet_name?: string; vet_photo_url?: string; vet_specialization?: string;
  vet_experience_years?: number; vet_rating?: number | string; vet_reviews_count?: number;
  total_price: number; notes?: string; created_at: string;
  history: OrderStatus[];
}

function SearchingLabel({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      Ищем ветеринара
      <span className="inline-flex w-5 justify-start" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="animate-pulse"
            style={{ animationDelay: `${index * 250}ms`, animationDuration: '900ms' }}
          >
            .
          </span>
        ))}
      </span>
    </span>
  );
}

const DEMO_VET = {
  name: 'Анна Соколова',
  photo: '/demo-vet-anna.jpg',
  specialization: 'Ветеринарный врач-терапевт',
  experience: 8,
  rating: 4.9,
  reviews: 127,
};

function DemoMap({ status }: { status: string }) {
  const searching = status === 'pending';
  const accepted = status === 'confirmed';
  const moving = status === 'on_the_way';
  const arrived = ['arrived', 'in_progress', 'completed'].includes(status);
  const vets = [
    { left: '18%', top: '25%', delay: '0ms' },
    { left: '72%', top: '20%', delay: '350ms' },
    { left: '25%', top: '67%', delay: '700ms' },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a160a]">
      <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 800 420" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-40 330 C130 250 220 280 350 180 S610 80 850 125" fill="none" stroke="#1b331d" strokeWidth="24" />
        <path d="M-40 330 C130 250 220 280 350 180 S610 80 850 125" fill="none" stroke="#345338" strokeWidth="2" strokeDasharray="9 10" />
        <path d="M110 -20 C145 100 250 130 290 250 S410 390 500 440" fill="none" stroke="#162b18" strokeWidth="18" />
        <path d="M110 -20 C145 100 250 130 290 250 S410 390 500 440" fill="none" stroke="#2c4930" strokeWidth="2" />
        <path d="M600 -20 C560 110 610 180 520 260 S390 345 300 440" fill="none" stroke="#162b18" strokeWidth="14" />
        <path d="M600 -20 C560 110 610 180 520 260 S390 345 300 440" fill="none" stroke="#29452d" strokeWidth="2" />
        {!searching && (
          <path d="M576 90 C520 130 445 165 385 220 S300 275 235 300" fill="none" stroke="#4ade80" strokeWidth="4" strokeDasharray="7 8" opacity=".8" />
        )}
      </svg>

      <div className="absolute left-[26%] top-[70%] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-green-400 text-lg shadow-[0_0_24px_rgba(74,222,128,.5)]">
          🏠
          <span className="absolute inset-[-7px] animate-ping rounded-full border border-green-400/40" />
        </div>
        <span className="mt-1.5 inline-block rounded-full bg-[#061006]/90 px-2.5 py-1 text-[10px] font-bold text-white/80">Вы здесь</span>
      </div>

      {searching && vets.map((vet, index) => (
        <div key={index} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: vet.left, top: vet.top }}>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-blue-300/60 bg-blue-400/20 text-base shadow-[0_0_20px_rgba(96,165,250,.3)]">
            🩺
            <span className="absolute inset-[-5px] animate-ping rounded-full border border-blue-300/35" style={{ animationDelay: vet.delay }} />
          </div>
        </div>
      ))}

      {!searching && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-[4000ms] ease-in-out"
          style={{ left: arrived ? '29%' : moving ? '47%' : '72%', top: arrived ? '65%' : moving ? '48%' : '22%' }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-blue-500 text-lg shadow-[0_0_24px_rgba(96,165,250,.45)]">🚗</div>
          <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-[#061006]/90 px-2 py-1 text-[9px] font-bold text-white/75">
            {arrived ? 'Ветеринар прибыл' : moving ? 'Едет к вам' : 'Вызов принят'}
          </span>
        </div>
      )}

      <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#061006]/85 px-4 py-2 text-center backdrop-blur-md">
        {searching ? (
          <>
            <SearchingLabel className="text-xs font-black text-amber-300" />
            <p className="mt-0.5 text-[9px] text-white/35">Отправили вызов ближайшим специалистам</p>
          </>
        ) : (
          <>
            <p className="text-xs font-black text-green-400">{accepted ? 'Анна приняла ваш вызов' : arrived ? 'Ветеринар у вашего адреса' : 'Ветеринар направляется к вам'}</p>
            <p className="mt-0.5 text-[9px] text-white/35">Статус обновлён автоматически</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Kazan coordinates ────────────────────────────────── */
// User is fixed near Kazan Kremlin (demo)
const USER_LATLNG = { lat: 55.7980, lng: 49.1060 };

// Vet route waypoints along real Kazan streets
const WAYPOINTS: { lat: number; lng: number }[] = [
  { lat: 55.8210, lng: 49.0680 }, // Start: Northern Kazan, Kirov St
  { lat: 55.8080, lng: 49.0680 }, // South on Spartakovskaya
  { lat: 55.8080, lng: 49.0860 }, // East on Dekabristov
  { lat: 55.8000, lng: 49.0860 }, // South on Pushkina
  { lat: 55.8000, lng: 49.1060 }, // East toward center
  { lat: 55.7980, lng: 49.1060 }, // Arrive – Kremlyovskaya
];

/* ─── Path helpers ─────────────────────────────────────── */
function deg2rad(d: number) { return d * Math.PI / 180; }
function segLen(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
function totalLen(pts: typeof WAYPOINTS) {
  let d = 0; for (let i = 1; i < pts.length; i++) d += segLen(pts[i-1], pts[i]);
  return d;
}
const TOTAL_M = totalLen(WAYPOINTS);

function posAtProgress(p: number) {
  const target = p * TOTAL_M;
  let acc = 0;
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const seg = segLen(WAYPOINTS[i-1], WAYPOINTS[i]);
    if (acc + seg >= target || i === WAYPOINTS.length - 1) {
      const t = Math.min((target - acc) / seg, 1);
      const a = WAYPOINTS[i-1], b = WAYPOINTS[i];
      const lat = a.lat + t * (b.lat - a.lat);
      const lng = a.lng + t * (b.lng - a.lng);
      const bearing = Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180 / Math.PI;
      return { lat, lng, bearing };
    }
    acc += seg;
  }
  return { ...USER_LATLNG, bearing: 0 };
}

/* ─── Google Maps loader ───────────────────────────────── */
let gmapsLoaded = false;
let gmapsLoading = false;
const gmapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (gmapsLoaded) { resolve(); return; }
    gmapsCallbacks.push(resolve);
    if (gmapsLoading) return;
    gmapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=ru`;
    script.async = true;
    script.onload = () => {
      gmapsLoaded = true;
      gmapsCallbacks.forEach(cb => cb());
      gmapsCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

/* ─── Dark map style ───────────────────────────────────── */
const DARK_STYLE = [
  { elementType:'geometry',            stylers:[{ color:'#0a160a' }] },
  { elementType:'labels.text.stroke',  stylers:[{ color:'#0a160a' }] },
  { elementType:'labels.text.fill',    stylers:[{ color:'#4a5c4a' }] },
  { featureType:'road',                elementType:'geometry', stylers:[{ color:'#152215' }] },
  { featureType:'road',                elementType:'geometry.stroke', stylers:[{ color:'#1a2e1a' }] },
  { featureType:'road',                elementType:'labels.text.fill', stylers:[{ color:'#3a5c3a' }] },
  { featureType:'road.highway',        elementType:'geometry', stylers:[{ color:'#1e381e' }] },
  { featureType:'road.highway',        elementType:'labels.text.fill', stylers:[{ color:'#4a7c4a' }] },
  { featureType:'water',               elementType:'geometry', stylers:[{ color:'#060d06' }] },
  { featureType:'water',               elementType:'labels.text.fill', stylers:[{ color:'#1a3a1a' }] },
  { featureType:'poi',                 stylers:[{ visibility:'off' }] },
  { featureType:'poi.park',            elementType:'geometry', stylers:[{ color:'#0d1f0d' }, { visibility:'on' }] },
  { featureType:'transit',             stylers:[{ visibility:'off' }] },
  { featureType:'administrative',      elementType:'geometry', stylers:[{ color:'#1a2e1a' }] },
  { featureType:'administrative.locality', elementType:'labels.text.fill', stylers:[{ color:'#3a6a3a' }] },
  { featureType:'landscape',           elementType:'geometry', stylers:[{ color:'#0c1a0c' }] },
];

/* ─── SVG icons as data URIs ───────────────────────────── */
const HOME_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="44" height="52" viewBox="0 0 44 52" xmlns="http://www.w3.org/2000/svg">
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.6)"/></filter>
  <g filter="url(#s)">
    <circle cx="22" cy="22" r="20" fill="rgba(74,222,128,0.9)" stroke="white" stroke-width="2.5"/>
    <path d="M22 8L8 19v17h10v-9h8v9h10V19z" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 48 L18 36 L22 40 L26 36 Z" fill="rgba(74,222,128,0.9)"/>
  </g>
  <circle cx="22" cy="22" r="4" fill="white" opacity="0.9"/>
</svg>`)}`;

function carSVG(bearing: number) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <filter id="g"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <g filter="url(#g)" transform="rotate(${bearing + 90} 20 20)">
    <ellipse cx="21" cy="21" rx="9" ry="12" fill="rgba(0,0,0,0.35)"/>
    <rect x="11" y="8" width="18" height="26" rx="6" fill="#22c55e"/>
    <rect x="13.5" y="10" width="13" height="13" rx="3" fill="rgba(6,40,6,0.85)"/>
    <rect x="12" y="7" width="6" height="3" rx="1.5" fill="rgba(255,255,200,0.95)"/>
    <rect x="22" y="7" width="6" height="3" rx="1.5" fill="rgba(255,255,200,0.95)"/>
    <rect x="12" y="32" width="6" height="3" rx="1.5" fill="rgba(248,113,113,0.9)"/>
    <rect x="22" y="32" width="6" height="3" rx="1.5" fill="rgba(248,113,113,0.9)"/>
    <circle cx="20" cy="20" r="3" fill="rgba(74,222,128,0.4)"/>
  </g>
  <circle cx="20" cy="20" r="18" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.5)" stroke-width="1.5"/>
</svg>`)}`;
}

/* ─── Google Map component ─────────────────────────────── */
interface MapProps { progress: number; status: string; bearing: number; carPos: { lat: number; lng: number }; }

function GoogleMap({ progress, status, bearing, carPos }: MapProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapObj     = useRef<any>(null);
  const carMarker  = useRef<any>(null);
  const homeMarker = useRef<any>(null);
  const routeLine  = useRef<any>(null);
  const travelLine = useRef<any>(null);
  const apiKey     = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  /* Init map once */
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    loadGoogleMaps(apiKey).then(() => {
      const g = (window as any).google.maps;
      const map = new g.Map(mapRef.current, {
        center: { lat: 55.8090, lng: 49.0870 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: false,
        styles: DARK_STYLE,
        gestureHandling: 'greedy',
      });
      mapObj.current = map;

      /* Home marker */
      homeMarker.current = new g.Marker({
        position: USER_LATLNG,
        map,
        icon: { url: HOME_SVG, scaledSize: new g.Size(44, 52), anchor: new g.Point(22, 50) },
        title: 'Ваш адрес',
        zIndex: 10,
      });

      /* Full route polyline (dashed) */
      routeLine.current = new g.Polyline({
        path: WAYPOINTS,
        map,
        strokeColor: 'rgba(74,222,128,0.25)',
        strokeWeight: 3,
        strokeOpacity: 0,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.5, scale: 4 }, offset: '0', repeat: '12px' }],
        zIndex: 1,
      });

      /* Traveled route polyline (solid) */
      travelLine.current = new g.Polyline({
        path: [],
        map,
        strokeColor: 'rgba(74,222,128,0.8)',
        strokeWeight: 4,
        strokeOpacity: 1,
        zIndex: 2,
      });

      /* Car marker */
      carMarker.current = new g.Marker({
        position: WAYPOINTS[0],
        map,
        icon: { url: carSVG(0), scaledSize: new g.Size(40, 40), anchor: new g.Point(20, 20) },
        title: 'Ветеринар',
        zIndex: 20,
      });
    });

    return () => {
      if (mapObj.current) {
        homeMarker.current?.setMap(null);
        carMarker.current?.setMap(null);
        routeLine.current?.setMap(null);
        travelLine.current?.setMap(null);
      }
    };
  }, [apiKey]);

  /* Update car position & traveled path */
  useEffect(() => {
    if (!carMarker.current || !travelLine.current) return;
    const g = (window as any).google?.maps;
    if (!g) return;

    const pos = carPos;
    carMarker.current.setPosition(pos);
    carMarker.current.setIcon({
      url: carSVG(bearing),
      scaledSize: new g.Size(40, 40),
      anchor: new g.Point(20, 20),
    });

    /* Build traveled path up to current position */
    const traveled: typeof WAYPOINTS = [];
    let acc = 0;
    const target = progress * TOTAL_M;
    for (let i = 1; i < WAYPOINTS.length; i++) {
      const seg = segLen(WAYPOINTS[i-1], WAYPOINTS[i]);
      if (acc + seg >= target) {
        traveled.push(WAYPOINTS[i-1]);
        const t = (target - acc) / seg;
        traveled.push({
          lat: WAYPOINTS[i-1].lat + t * (WAYPOINTS[i].lat - WAYPOINTS[i-1].lat),
          lng: WAYPOINTS[i-1].lng + t * (WAYPOINTS[i].lng - WAYPOINTS[i-1].lng),
        });
        break;
      }
      traveled.push(WAYPOINTS[i-1]);
      acc += seg;
    }
    travelLine.current.setPath(traveled.length ? traveled : [WAYPOINTS[0]]);

    /* Pan map to keep car in view */
    if (mapObj.current && status === 'on_the_way') {
      const bounds = new g.LatLngBounds();
      bounds.extend(pos);
      bounds.extend(USER_LATLNG);
      mapObj.current.fitBounds(bounds, { top:80, right:40, bottom:120, left:40 });
    }
  }, [progress, bearing, carPos, status]);

  if (!apiKey) {
    return <DemoMap status={status} />;
  }

  return <div ref={mapRef} className="w-full h-full"/>;
}

/* ─── Status config ────────────────────────────────────── */
const STATUS_STEPS = ['pending','confirmed','on_the_way','arrived','in_progress','completed'];
const STATUS_META: Record<string, { label: string; sub: string; color: string }> = {
  pending:     { label:'Ищем ветеринара',         sub:'Подбираем специалиста рядом с вами',           color:'#fbbf24' },
  confirmed:   { label:'Врач найден',             sub:'Специалист подтвердил вызов',                  color:'#2dd4bf' },
  on_the_way:  { label:'Ветеринар едет к вам',   sub:'Следите за машиной на карте',                  color:'#60a5fa' },
  arrived:     { label:'Врач прибыл',             sub:'Откройте дверь — ветеринар у вашего дома',     color:'#c084fc' },
  in_progress: { label:'Идёт приём',              sub:'Ветеринар осматривает питомца',                color:'#4ade80' },
  completed:   { label:'Приём завершён',           sub:'Спасибо! Питомец в безопасности',              color:'#4ade80' },
  cancelled:   { label:'Заказ отменён',            sub:'Обратитесь в поддержку если нужна помощь',    color:'#f87171' },
};
const STEP_LABELS: Record<string,string> = {
  pending:'Поиск', confirmed:'Найден', on_the_way:'В пути',
  arrived:'Прибыл', in_progress:'Приём', completed:'Готово',
};

/* ─── ETA hook ─────────────────────────────────────────── */
function useETA(status: string, orderId: number) {
  const TOTAL = 15 * 60;
  const [eta, setEta] = useState(TOTAL);
  useEffect(() => {
    if (status !== 'on_the_way') { setEta(status === 'arrived' ? 0 : TOTAL); return; }
    const key = `eta_start_${orderId}`;
    let stored = sessionStorage.getItem(key);
    if (!stored) { stored = String(Date.now()); sessionStorage.setItem(key, stored); }
    const start = parseInt(stored);
    const tick = () => setEta(Math.max(0, TOTAL - Math.floor((Date.now()-start)/1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [status, orderId]);
  return eta;
}

function fmtETA(s: number) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

function carProgress(status: string, etaSec: number) {
  if (['pending','confirmed'].includes(status)) return 0;
  if (['arrived','in_progress','completed'].includes(status)) return 1;
  if (status === 'on_the_way') {
    const t = Math.min((15*60 - etaSec) / (15*60), 0.96);
    return 1 - Math.pow(1-t, 2.5); // ease-out, stops just before user
  }
  return 0;
}

/* ─── Main page ────────────────────────────────────────── */
export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const lang = i18n.language || 'ru';
  const [order, setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try { const data = await getOrder(Number(id)); setOrder(data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const iv = setInterval(fetchOrder, 10000);
    return () => clearInterval(iv);
  }, [fetchOrder]);

  useEffect(() => {
    if (!order || order.status !== 'pending' || order.vet_name) {
      setDemoStatus(null);
      return;
    }
    const statuses = ['pending', 'confirmed', 'on_the_way', 'arrived', 'in_progress', 'completed'];
    let index = 0;
    setDemoStatus(statuses[index]);
    const first = window.setTimeout(() => {
      index = 1;
      setDemoStatus(statuses[index]);
      const interval = window.setInterval(() => {
        index += 1;
        if (index >= statuses.length) {
          window.clearInterval(interval);
          return;
        }
        setDemoStatus(statuses[index]);
      }, 5000);
      (window as Window & { __vetDemoInterval?: number }).__vetDemoInterval = interval;
    }, 4000);
    return () => {
      window.clearTimeout(first);
      const interval = (window as Window & { __vetDemoInterval?: number }).__vetDemoInterval;
      if (interval) window.clearInterval(interval);
    };
  }, [order?.id, order?.status, order?.vet_name]);

  const currentStatus = demoStatus ?? order?.status ?? '';
  const etaSec   = useETA(currentStatus, order?.id ?? 0);
  const progress = carProgress(currentStatus, etaSec);
  const carPosRaw = posAtProgress(progress);
  const carPos   = { lat: carPosRaw.lat, lng: carPosRaw.lng };
  const bearing  = carPosRaw.bearing;

  if (loading) return (
    <div className="min-h-screen bg-[#060d06] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"/>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-[#060d06] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/40 text-lg mb-4">{t('tracking.notFound')}</p>
        <Link to="/history" className="btn-gold inline-block">{t('history.title')}</Link>
      </div>
    </div>
  );

  const meta     = STATUS_META[currentStatus] ?? STATUS_META.pending;
  const isActive = !['completed','cancelled'].includes(currentStatus);
  const isMoving = currentStatus === 'on_the_way';
  const showMap  = !['cancelled'].includes(currentStatus);
  const vetName = order.vet_name || (demoStatus && demoStatus !== 'pending' ? DEMO_VET.name : '');
  const vetPhoto = order.vet_photo_url || DEMO_VET.photo;
  const vetSpecialization = order.vet_specialization || DEMO_VET.specialization;
  const vetExperience = order.vet_experience_years || DEMO_VET.experience;
  const vetRating = order.vet_rating || DEMO_VET.rating;
  const vetReviews = order.vet_reviews_count || DEMO_VET.reviews;

  return (
    <div className="min-h-screen bg-[#060d06] flex flex-col">

      {/* ════ MAP ════ */}
      {showMap && (
        <div className="relative w-full" style={{ height:'55vh', minHeight:280, maxHeight:460 }}>
          <GoogleMap progress={progress} status={currentStatus} bearing={bearing} carPos={carPos}/>

          {/* top gradient + back */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 pointer-events-none"
            style={{ background:'linear-gradient(to bottom,rgba(6,13,6,0.85),transparent)' }}>
            <Link to="/history" className="pointer-events-auto flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background:'rgba(6,13,6,0.7)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Назад
            </Link>
            <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white/50"
              style={{ background:'rgba(6,13,6,0.7)', border:'1px solid rgba(255,255,255,0.08)' }}>
              Заказ #{order.id}
            </div>
          </div>

          {/* bottom gradient + status */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{ background:'linear-gradient(to top,rgba(6,13,6,1) 45%,transparent)' }}>
            <div className="px-4 pb-5 pt-8">
              {isMoving && etaSec > 0 && (
                <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1.5 rounded-full text-xs font-black"
                  style={{ background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.35)', color:'#93c5fd' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
                  </svg>
                  Прибудет через {fmtETA(etaSec)}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }}/>
                  <div className="absolute inset-0 rounded-full" style={{ background: meta.color, animation:'sPing 1.4s ease-out infinite' }}/>
                </div>
                <div>
                  <p className="font-black text-white text-xl leading-tight">
                    {currentStatus === 'pending' ? <SearchingLabel /> : meta.label}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{meta.sub}</p>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes sPing { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(3.5);opacity:0} }
          `}</style>
        </div>
      )}

      {/* No-map header for completed/cancelled */}
      {!showMap && (
        <div className="pt-28 pb-8 px-4"
          style={{ background: order.status==='completed' ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)' }}>
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <Link to="/history" className="text-white/30 hover:text-white/70 transition-colors text-sm mr-2">← Назад</Link>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${meta.color}20`, border:`1px solid ${meta.color}40` }}>
              {order.status==='completed'
                ? <svg width="24" height="24" fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                : <svg width="24" height="24" fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            </div>
            <div>
              <p className="text-white/30 text-xs mb-0.5">Заказ #{order.id}</p>
              <h1 className="text-2xl font-black" style={{ color: meta.color }}>{meta.label}</h1>
              <p className="text-white/40 text-sm">{meta.sub}</p>
            </div>
          </div>
        </div>
      )}

      {/* ════ DETAILS ════ */}
      <div className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full space-y-4">

        {/* Progress steps */}
        {isActive && (
          <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="relative flex items-start justify-between">
              <div className="absolute top-4 left-4 right-4 h-px bg-white/6"/>
              <div className="absolute top-4 left-4 h-px transition-all duration-700"
                style={{ background:'rgba(74,222,128,0.5)', width:`${(STATUS_STEPS.indexOf(order.status)/(STATUS_STEPS.length-1))*100}%`, maxWidth:'calc(100% - 2rem)' }}/>
              {STATUS_STEPS.map((s, i) => {
                const done = STATUS_STEPS.indexOf(currentStatus) >= i;
                const cur  = currentStatus === s;
                return (
                  <div key={s} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500"
                      style={cur
                        ? { background:'rgba(74,222,128,0.15)', border:'2px solid rgba(74,222,128,0.9)', boxShadow:'0 0 14px rgba(74,222,128,0.4)' }
                        : done
                        ? { background:'rgba(74,222,128,0.9)' }
                        : { background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.1)' }}>
                      {done && !cur
                        ? <svg width="12" height="12" fill="none" stroke="#060d06" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 14 14"><path d="M2 7l3.5 3.5 6.5-6"/></svg>
                        : cur
                        ? <div className="w-2.5 h-2.5 rounded-full bg-green-400" style={{ animation:'sRing 1s ease-out infinite' }}/>
                        : <div className="w-2 h-2 rounded-full bg-white/10"/>}
                    </div>
                    <span className="text-[9px] text-center leading-tight font-semibold hidden sm:block"
                      style={{ color: cur ? 'rgba(74,222,128,0.9)' : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)' }}>
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                );
              })}
            </div>
            <style>{`@keyframes sRing{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}`}</style>
          </div>
        )}

        {/* Vet card */}
        {vetName && currentStatus !== 'pending' && (
          <div className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4"
            style={{ background:'linear-gradient(135deg,rgba(74,222,128,0.09),rgba(45,212,191,0.04))', border:'1px solid rgba(74,222,128,0.22)', boxShadow:'0 18px 50px rgba(0,0,0,0.18)' }}>
            <div className="absolute right-0 top-0 rounded-bl-2xl bg-green-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-green-400">
              Ветеринар найден
            </div>
            {vetPhoto ? (
              <img
                src={vetPhoto}
                alt={vetName}
                className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-green-400/25"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-green-400 flex-shrink-0"
                style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)' }}>
                {vetName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-green-400/60 uppercase tracking-widest font-black mb-1">Ваш ветеринар</p>
              <p className="text-white font-black text-lg leading-tight">{vetName}</p>
              {vetSpecialization && (
                <p className="text-white/45 text-xs mt-1">{vetSpecialization}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                <span className="text-amber-300 font-bold">★ {Number(vetRating).toFixed(1)}</span>
                {!!vetReviews && <span className="text-white/30">{vetReviews} отзывов</span>}
                {!!vetExperience && <span className="text-white/30">Опыт {vetExperience} лет</span>}
              </div>
            </div>
            {isMoving && etaSec > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="text-blue-400 font-black text-lg">{fmtETA(etaSec)}</p>
                <p className="text-white/30 text-[10px]">осталось</p>
              </div>
            )}
          </div>
        )}

        {/* Order details */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="w-6 h-6 text-green-400/60 flex-shrink-0">
              <ServiceIcon name={order.service_name} size={18}/>
            </div>
            <h2 className="font-bold text-white text-sm">{getSvcName(order.service_name||'', lang)}</h2>
          </div>
          {[
            { label:'Адрес', val: order.address },
            ...(order.pet_name ? [{ label:'Питомец', val: order.pet_name }] : []),
            { label:'Стоимость', val:`${order.total_price?.toLocaleString()} ₽` },
            { label:'Создан', val: new Date(order.created_at).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) },
          ].map((row,i,arr)=>(
            <div key={i} className="px-5 py-3 flex justify-between items-start"
              style={{ borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.05)':'none' }}>
              <span className="text-white/30 text-sm flex-shrink-0 mr-4">{row.label}</span>
              <span className="text-white text-sm font-medium text-right">{row.val}</span>
            </div>
          ))}
        </div>

        {/* History */}
        {order.history && order.history.length > 0 && (
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-bold text-white text-sm mb-4">Хронология</h2>
            <div className="space-y-0">
              {[...order.history].reverse().map((h,i,arr)=>{
                const m = STATUS_META[h.status];
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background:`${m?.color||'#fff'}18`, border:`1px solid ${m?.color||'#fff'}35` }}>
                        <div className="w-2 h-2 rounded-full" style={{ background:m?.color||'#fff' }}/>
                      </div>
                      {i<arr.length-1 && <div className="w-px my-1 flex-1 bg-white/6" style={{ minHeight:16 }}/>}
                    </div>
                    <div className="pb-4 flex-1">
                      <p className="font-semibold text-sm text-white">
                        {h.status === 'pending' && currentStatus === 'pending'
                          ? <SearchingLabel />
                          : m?.label || h.status}
                      </p>
                      {h.comment && <p className="text-xs text-white/30 mt-0.5">{h.comment}</p>}
                      <p className="text-xs text-white/20 mt-1">
                        {new Date(h.created_at).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isActive && <p className="text-center text-white/20 text-xs">Обновляется автоматически каждые 10 сек</p>}

        <div className="text-center pb-6">
          <Link to="/order" className="btn-gold inline-block">{t('tracking.newCall')}</Link>
        </div>
      </div>
    </div>
  );
}
