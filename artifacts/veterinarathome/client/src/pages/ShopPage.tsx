import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, getLoyalty } from '../api';
import { useAuth } from '../context/AuthContext';
import FeedPack, { Pack } from '../components/FeedPack';
import MobileHub, { useIsMobile } from '../components/MobileHub';

export interface Product {
  id: number; category: string; brand: string; title: string; subtitle: string;
  price: number; oldPrice?: number; bonusPrice: number; rating: number; reviews: number; sold: number;
  variants?: { label: string; price: number; oldPrice?: number; bonusPrice: number }[];
  images: string[]; pack?: Pack; badges: string[]; description: string; composition?: string; specs: [string, string][];
  feed?: {
    forWhom: string; grains: string; analysis: [string, string][];
    feeding: { head: [string, string]; rows: [string, string][] };
    benefits: { icon: string; title: string; text: string }[];
  };
}

export const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;

// Основная фасовка товара — та, что изображена на упаковке; по ней показываем точную цену
export function mainVariantIndex(p: Product) {
  if (!p.variants) return 0;
  const i = p.variants.findIndex((v) => v.label === p.pack?.weight);
  return i >= 0 ? i : 0;
}
export function mainVariant(p: Product) {
  return p.variants?.[mainVariantIndex(p)] ?? { label: '', price: p.price, oldPrice: p.oldPrice, bonusPrice: p.bonusPrice };
}
export const bon = (n: number) => `${n.toLocaleString('ru-RU')} Б`;

export function ProductImage({ p, src, size }: { p: Product; src?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = src ?? p.images[0];
  if (s === 'pack' && p.pack) return <FeedPack pack={p.pack} size={size} />;
  return <img src={s} alt={p.title} className="w-full h-full object-cover" />;
}

const CATS = ['Все', 'Корма', 'Лакомства', 'Препараты', 'Амуниция', 'Игрушки', 'Дом и уход'];

export default function ShopPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState('Все');
  const [balance, setBalance] = useState<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => { getProducts().then(setProducts).catch(() => {}); }, []);
  useEffect(() => { if (user) getLoyalty().then((l) => setBalance(l.balance)).catch(() => {}); }, [user]);

  const list = useMemo(() => (cat === 'Все' ? products : products.filter((p) => p.category === cat)), [products, cat]);

  // ── Телефон: магазин как в приложении — разделы иконками, товары списком в окне ──
  if (isMobile) {
    const Row = ({ p }: { p: Product }) => { const mv = mainVariant(p); return (
      <Link to={`/shop/${p.id}`} className="flex gap-3 rounded-2xl bg-white border border-coffee-200/70 p-2.5 active:scale-[0.98] transition-transform">
        <div className="w-[76px] h-[92px] rounded-xl overflow-hidden flex-shrink-0 bg-white"><ProductImage p={p} size="sm" /></div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-[11px] text-coffee-500">{p.brand}</div>
          <div className="text-[13px] font-semibold leading-snug">{p.title}</div>
          <div className="text-[11px] text-coffee-500 mt-0.5">⭐ {p.rating} · {p.reviews.toLocaleString('ru-RU')}</div>
          <div className="mt-auto flex items-center gap-2 pt-1">
            <span className="font-black whitespace-nowrap">{rub(mv.price)}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#FACC15] text-coffee-950 text-[11px] font-black whitespace-nowrap">{bon(mv.bonusPrice)}</span>
            {mv.oldPrice && <span className="text-[11px] font-bold text-red-500">−{Math.round((1 - mv.price / mv.oldPrice) * 100)}%</span>}
          </div>
        </div>
      </Link>
    ); };
    const listOf = (items: Product[]) => <div className="space-y-2 pb-2">{items.map((p) => <Row key={p.id} p={p} />)}{items.length === 0 && <p className="text-sm text-coffee-500 py-6 text-center">Товары скоро появятся</p>}</div>;
    const by = (c: string) => products.filter((p) => p.category === c);
    const ICONS: Record<string, [string, 'green' | 'yellow' | 'amber' | 'sky' | 'red' | 'purple' | 'white']> = {
      'Корма': ['🥩', 'green'], 'Лакомства': ['🦴', 'amber'], 'Препараты': ['💊', 'red'], 'Амуниция': ['🦮', 'sky'], 'Игрушки': ['🧸', 'purple'], 'Дом и уход': ['🛁', 'white'],
    };
    const sale = products.filter((p) => mainVariant(p).oldPrice);
    const hits = [...products].sort((a, b) => b.sold - a.sold).slice(0, 10);
    return (
      <MobileHub light
        header={<>
          <div className="rounded-3xl bg-[#FACC15] text-coffee-950 px-4 py-3.5 flex items-center gap-3 shadow-lg shadow-yellow-900/10">
            <span className="text-3xl">🎁</span>
            {user && balance !== null ? (
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Ваши бонусы</div>
                <div className="text-2xl font-black leading-none">{balance.toLocaleString('ru-RU')}&nbsp;Б</div>
                <div className="text-[11px] opacity-70 leading-snug">1 бонус = 1&nbsp;₽ · можно оплатить товар целиком</div>
              </div>
            ) : (
              <div className="flex-1"><div className="font-black">Покупайте за бонусы</div><Link to="/login" className="text-xs underline">Войдите, чтобы увидеть баланс</Link></div>
            )}
          </div>
          <div className="rounded-3xl bg-gradient-to-r from-[#3A651C] to-[#1E140D] text-white p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DBB685]">Собственное производство</div>
              <div className="text-lg font-black leading-tight mt-0.5">Корма «ВетДом Натурал»</div>
              <div className="text-[12px] text-white/70 leading-snug mt-1">Рецепты наших ветеринаров, без красителей</div>
            </div>
            <div className="flex -space-x-5">
              {products.filter((p) => p.pack).slice(0, 2).map((p) => (
                <Link key={p.id} to={`/shop/${p.id}`} className="w-14 h-[72px] rounded-xl overflow-hidden border-2 border-white/20 shadow-lg"><ProductImage p={p} size="sm" /></Link>
              ))}
            </div>
          </div>
        </>}
        tiles={[
          { k: 'hits', label: 'Хиты продаж', sub: 'выбор владельцев · топ-10', icon: '🏆', tone: 'yellow' as const, title: 'Хиты продаж', content: listOf(hits) },
          ...Object.entries(ICONS).map(([c, [icon, tone]]) => ({ k: c, label: c, sub: `${by(c).length} товаров`, icon, tone, content: listOf(by(c)) })),
          { k: 'sale', label: 'Скидки', sub: `${sale.length} товаров`, icon: '🏷️', tone: 'red' as const, title: 'Товары со скидкой', content: listOf(sale) },
        ]}
      />
    );
  }

  return (
    <div className="min-h-screen bg-milk text-coffee-900 pt-24 md:pt-[156px] pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Шапка магазина */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px bg-green-600" />
              <span className="text-green-700 text-xs font-bold uppercase tracking-[0.3em]">Магазин ВетДом</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Всё для здоровья питомца</h1>
            <p className="text-coffee-600 mt-2">Корма собственного производства, препараты и аксессуары. <b>Оплачивайте бонусами</b> — за бонусы на 10% выгоднее.</p>
          </div>
          <div className="rounded-2xl bg-[#FACC15] text-coffee-950 px-5 py-4 flex items-center gap-4 shadow-lg shadow-yellow-900/10">
            <span className="text-3xl">🎁</span>
            {user && balance !== null ? (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-70">Ваши бонусы</div>
                <div className="text-2xl font-black leading-none">{balance.toLocaleString('ru-RU')} Б</div>
                <div className="text-[11px] opacity-70">1 бонус = 1 ₽ · можно оплатить товар целиком</div>
              </div>
            ) : (
              <div>
                <div className="font-black">Покупайте за бонусы</div>
                <Link to="/login" className="text-xs underline">Войдите, чтобы увидеть баланс</Link>
              </div>
            )}
          </div>
        </div>

        {/* Баннер собственного производства */}
        <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-r from-[#3A651C] to-[#1E140D] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#DBB685]">Собственное производство</div>
            <h2 className="text-2xl md:text-3xl font-black mt-1">Корма «ВетДом Натурал»</h2>
            <p className="text-white/75 mt-2 max-w-lg">Рецепты разработаны нашими ветеринарами: натуральное мясо, без красителей и ароматизаторов. Подбираем корм по медкарте питомца.</p>
            <button onClick={() => setCat('Корма')} className="mt-4 btn-yellow px-5 py-2.5 text-sm">Смотреть корма →</button>
          </div>
          <div className="flex gap-3">
            {products.filter((p) => p.pack).slice(0, 3).map((p) => (
              <Link key={p.id} to={`/shop/${p.id}`} className="w-24 h-32 md:w-28 md:h-36 rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform">
                <ProductImage p={p} size="sm" />
              </Link>
            ))}
          </div>
        </div>

        {/* Категории */}
        <div data-tabs className="flex flex-wrap md:flex-nowrap gap-2 md:overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${cat === c ? 'bg-coffee-900 text-white border-coffee-900' : 'bg-cream border-coffee-200 hover:border-coffee-400'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Сетка товаров */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {list.map((p) => { const mv = mainVariant(p); return (
            <Link key={p.id} to={`/shop/${p.id}`} className="group flex flex-col rounded-2xl bg-cream border border-coffee-200/70 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="relative aspect-[4/5] overflow-hidden bg-white">
                <div className="w-full h-full group-hover:scale-105 transition-transform duration-500"><ProductImage p={p} size="sm" /></div>
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {mv.oldPrice && <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[11px] font-bold">−{Math.round((1 - mv.price / mv.oldPrice) * 100)}%</span>}
                  {p.badges.filter((b) => !b.startsWith('−')).slice(0, 1).map((b) => <span key={b} className="px-2 py-0.5 rounded-md bg-white/95 text-coffee-800 text-[10px] font-bold shadow">{b}</span>)}
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black">{rub(mv.price)}</span>
                  {mv.oldPrice && <span className="text-xs text-coffee-400 line-through">{rub(mv.oldPrice)}</span>}
                  {mv.label && <span className="text-xs text-coffee-500">· {mv.label}</span>}
                </div>
                <div className="inline-flex self-start items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-[#FACC15] text-coffee-950 text-xs font-black">или {bon(mv.bonusPrice)}</div>
                <div className="text-[11px] text-coffee-500 mt-2">{p.brand}</div>
                <div className="text-sm leading-snug line-clamp-2 font-medium">{p.title}</div>
                {p.variants && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.variants.map((v) => <span key={v.label} className={`px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${v.label === mv.label ? 'border-green-500 bg-green-50 text-green-700' : 'border-coffee-200 bg-white text-coffee-600'}`}>{v.label}</span>)}
                  </div>
                )}
                <div className="text-xs text-coffee-500 mt-1">⭐ {p.rating} · {p.reviews.toLocaleString('ru-RU')} отзывов</div>
                <span className="mt-auto pt-3">
                  <span className="block text-center rounded-xl bg-green-500 group-hover:bg-green-600 text-white text-sm font-bold py-2 transition-colors">Подробнее</span>
                </span>
              </div>
            </Link>
          ); })}
        </div>
      </div>
    </div>
  );
}
