import { useEffect, useRef, useState } from 'react';

interface Options {
  /** Raw string like "2 500", "98%", "4.9★", "50+", "24/7", "45 мин" */
  value: string;
  /** Animation duration in ms (default 2400) */
  duration?: number;
  /** Extra CSS class for the outer span */
  className?: string;
}

/** Parse a raw stat string into { num, prefix, suffix, hasSpaceThousands } */
function parse(raw: string) {
  // Special non-numeric strings — just display as-is
  if (/^24\/7$/i.test(raw.trim())) return { num: null, display: raw };

  // Extract leading number (int or float), everything else is suffix
  const m = raw.match(/^([+-]?\d[\d\s]*)(\.\d+)?(.*)$/);
  if (!m) return { num: null, display: raw };

  const intPart   = m[1].replace(/\s/g, ''); // remove thousand-spaces
  const decPart   = m[2] ?? '';               // ".9" or ""
  const suffix    = m[3] ?? '';               // "%", "+", "★", " мин", etc.
  const hasSpace  = /\s/.test(m[1].trim());   // "2 500" had space-thousands
  const num       = parseFloat(intPart + decPart);
  const decimals  = decPart ? decPart.length - 1 : 0;

  return { num, suffix, decimals, hasSpace, display: null };
}

/** Sextic ease-out: very fast start → dramatic crawl at the end */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 6);
}

/** Format a number with optional space thousands */
function fmt(n: number, decimals: number, hasSpace: boolean) {
  if (decimals > 0) return n.toFixed(decimals);
  const s = Math.round(n).toString();
  if (hasSpace && s.length > 3) {
    // Insert non-breaking spaces every 3 digits from right
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  }
  return s;
}

export default function AnimatedNumber({ value, duration = 2400, className = '' }: Options) {
  const parsed = parse(value);
  const [display, setDisplay] = useState('0');
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (parsed.num === null) { setDisplay(parsed.display ?? value); return; }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (!started || parsed.num === null) return;

    const target   = parsed.num!;
    const dec      = parsed.decimals ?? 0;
    const hasSpace = parsed.hasSpace ?? false;
    const suffix   = parsed.suffix ?? '';
    const startTs  = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTs;
      const t       = Math.min(elapsed / duration, 1);
      const eased   = easeOut(t);
      const current = eased * target;

      setDisplay(fmt(current, dec, hasSpace) + suffix);

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else        setDisplay(fmt(target, dec, hasSpace) + suffix);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [started]);

  if (parsed.num === null) {
    return <span ref={ref} className={className}>{parsed.display ?? value}</span>;
  }

  return <span ref={ref} className={className}>{display}</span>;
}
