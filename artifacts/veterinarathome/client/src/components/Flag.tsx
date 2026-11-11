// Флаги языков — рисуем SVG, а не эмодзи: эмодзи-флаги на Windows показываются буквами.
export default function Flag({ code, className = 'w-5 h-[14px]' }: { code: string; className?: string }) {
  const box = `${className} inline-block flex-shrink-0 rounded-[3px] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.18)]`;
  if (code === 'ru') return (
    <svg viewBox="0 0 9 6" className={box} preserveAspectRatio="none" aria-hidden>
      <rect width="9" height="2" fill="#fff" /><rect y="2" width="9" height="2" fill="#0039A6" /><rect y="4" width="9" height="2" fill="#D52B1E" />
    </svg>
  );
  if (code === 'en') return (
    <svg viewBox="0 0 60 30" className={box} preserveAspectRatio="none" aria-hidden>
      <clipPath id="fl-gb-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#fl-gb-t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
  if (code === 'tr') return (
    <svg viewBox="0 0 30 20" className={box} preserveAspectRatio="none" aria-hidden>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="11.25" cy="10" r="5" fill="#fff" />
      <circle cx="12.5" cy="10" r="4" fill="#E30A17" />
      <polygon fill="#fff" transform="translate(17.8 10) rotate(-90)"
        points="0,-2.5 0.59,-0.81 2.38,-0.77 0.95,0.31 1.47,2.02 0,1 -1.47,2.02 -0.95,0.31 -2.38,-0.77 -0.59,-0.81" />
    </svg>
  );
  // ar — Саудовская Аравия (упрощённо: надпись и меч)
  return (
    <svg viewBox="0 0 30 20" className={box} preserveAspectRatio="none" aria-hidden>
      <rect width="30" height="20" fill="#006C35" />
      <path d="M8 7.5 q2-1.5 3 0 t3 0 t3 0 t3 0 t2 0" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M9 10 q2.5-1 5 0 t5 0 t3 0" stroke="#fff" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M8 14 h13.5" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      <path d="M21.5 13.2 v1.6" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}
