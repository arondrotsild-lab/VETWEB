import React from 'react';

const S = 1.6; // stroke-width
const PROPS = { fill: 'none', stroke: 'currentColor', strokeWidth: S, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const icons: Record<string, React.ReactNode> = {

  /** Первичный осмотр — стетоскоп */
  exam: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M5 7a2 2 0 0 1 4 0v4a2 2 0 0 1-4 0V7z"/>
      <path d="M7 13v1.5A5.5 5.5 0 0 0 18 13v-3"/>
      <circle cx="18" cy="10" r="2"/>
      <path d="M18 8V6"/>
    </svg>
  ),

  /** Вакцинация — шприц */
  vaccine: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="m19 5-7 7"/>
      <path d="m15 4 5 5"/>
      <path d="m7 12 2-2 4 4-2 2"/>
      <path d="M5 20 9 16"/>
      <path d="m3 21 4-4"/>
      <path d="m9 11 4 4"/>
    </svg>
  ),

  /** Скорая ветпомощь — молния в шестиугольнике */
  emergency: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M13 2 4.09 12.96A1 1 0 0 0 5 14.5h6.5l-1.5 7.5 8.91-10.96A1 1 0 0 0 18 9.5h-6.5z"/>
    </svg>
  ),

  /** Забор анализов — колба/пробирка */
  lab: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M14 2v7l4 9a1 1 0 0 1-.9 1.4H6.9A1 1 0 0 1 6 18l4-9V2"/>
      <path d="M9 2h6"/>
      <path d="M8 15h8"/>
      <circle cx="10" cy="17" r="0.8" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="16" r="0.6" fill="currentColor" stroke="none"/>
    </svg>
  ),

  /** Обработка от паразитов — щит с замком */
  shield: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M12 2 3.5 6v6c0 5.2 3.8 10.1 8.5 11.4C16.7 22.1 20.5 17.2 20.5 12V6z"/>
      <rect x="9" y="11" width="6" height="5" rx="1"/>
      <path d="M10 11V9a2 2 0 1 1 4 0v2"/>
    </svg>
  ),

  /** Хирургическая помощь — скальпель */
  surgery: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M20 4 9 15"/>
      <path d="m16 4 4 4"/>
      <path d="M9 15c-1.5 1.5-2.5 3.5-4 4.5a2 2 0 0 1-2.8-2.8C3.2 15.7 5.5 15 7 13.5"/>
      <path d="m12 12 2 2"/>
      <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),

  /** Уход и груминг — ножницы + блёстки */
  grooming: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <circle cx="6" cy="6" r="2.5"/>
      <circle cx="6" cy="18" r="2.5"/>
      <path d="m8.12 8.12 9.26 9.26"/>
      <path d="M17.38 6.62 8.12 15.88"/>
      <path d="M20 4l-1 1"/>
      <path d="M20 8l-1-1"/>
      <path d="M22 6h-2"/>
    </svg>
  ),

  /** Консультация — планшет с галочкой */
  consult: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <path d="M9 7h6"/>
      <path d="M9 11h6"/>
      <path d="M9 15l2 2 4-4"/>
    </svg>
  ),

  /** Капельница на дому — пакет с каплей */
  drip: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M12 2v4"/>
      <rect x="7" y="6" width="10" height="8" rx="2"/>
      <path d="M10 14v2"/>
      <path d="M14 14v2"/>
      <path d="M12 16v2"/>
      <path d="M9 20c0 1.1 1.3 2 3 2s3-.9 3-2c0-1.7-3-4-3-4s-3 2.3-3 4z"/>
      <path d="M9 9h6M9 11h4"/>
    </svg>
  ),

  /** Передержка — домик с сердцем */
  home: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="m3 10.5 9-7 9 7V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
      <path d="M12 17c0-1.4 1.7-3 2.9-2.7.9.2 1.5 1 1.4 2-.2 1.4-1.6 2.2-2.8 2.6-.5.1-.8.1-1.2 0-1.2-.4-2.6-1.2-2.8-2.6-.1-1 .5-1.8 1.4-2C12.3 14 14 15.6 14 17"/>
    </svg>
  ),

  /** Выгул животного — маршрут с шагами */
  walk: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <circle cx="12" cy="5" r="1.5"/>
      <path d="m9 8 1 3 2-1 2 1 1-3"/>
      <path d="m9 11-3 4h6"/>
      <path d="m15 11 3 4h-6"/>
      <path d="m7 19 2-4"/>
      <path d="m17 19-2-4"/>
    </svg>
  ),

  /** Кастрация — медицинский крест + метка */
  castrate: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  ),

  /** Стерилизация — медицинская справка */
  sterilize: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="m9 14 2 2 4-4"/>
    </svg>
  ),

  /** Паразиты — щит с галочкой (запасной для parasite-ключа) */
  parasite: (
    <svg viewBox="0 0 24 24" {...PROPS}>
      <path d="M12 2 3.5 6v6c0 5.2 3.8 10.1 8.5 11.4C16.7 22.1 20.5 17.2 20.5 12V6z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
};

function getSlug(nameOrSlug: string): string {
  const n = nameOrSlug.toLowerCase();
  if (n.includes('осмотр')    || n === 'exam')       return 'exam';
  if (n.includes('вакцин')    || n === 'vaccine')    return 'vaccine';
  if (n.includes('скорая')    || n === 'emergency')  return 'emergency';
  if (n.includes('анализ')    || n === 'lab')        return 'lab';
  if (n.includes('паразит')   || n === 'parasite')   return 'parasite';
  if (n.includes('хирург')    || n === 'surgery')    return 'surgery';
  if (n.includes('груминг') || n.includes('уход') || n === 'grooming') return 'grooming';
  if (n.includes('консультац')|| n === 'consult')    return 'consult';
  if (n.includes('капельниц') || n === 'drip')       return 'drip';
  if (n.includes('передержк') || n === 'home')       return 'home';
  if (n.includes('выгул')     || n === 'walk')       return 'walk';
  if (n.includes('кастрац')   || n === 'castrate')   return 'castrate';
  if (n.includes('стерилиз')  || n === 'sterilize')  return 'sterilize';
  return 'consult';
}

interface Props { name: string; size?: number; className?: string; }

export default function ServiceIcon({ name, size = 24, className = '' }: Props) {
  const slug = getSlug(name);
  const svg = icons[slug] ?? icons.consult;
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0 }}
    >
      {React.cloneElement(svg as React.ReactElement<React.SVGProps<SVGSVGElement>>, { width: size, height: size })}
    </span>
  );
}
