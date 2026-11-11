import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MobileHub, { useIsMobile } from '../components/MobileHub';
import { getProduct, getLoyalty, buyProduct } from '../api';
import { useAuth } from '../context/AuthContext';
import { Product, ProductImage, rub, bon, mainVariantIndex } from './ShopPage';

// Как производятся корма «ВетДом Натурал» — общий блок для всех кормов бренда
const PRODUCTION = [
  { n: '01', t: 'Рецепт от ветеринаров', d: 'Каждый рецепт разрабатывают ветеринары-диетологи ВетДом на основе тысяч медкарт наших пациентов: мы видим, какие проблемы встречаются чаще всего, и решаем их питанием.' },
  { n: '02', t: 'Охлаждённое мясо, а не мука', d: 'Главный ингредиент — свежее охлаждённое мясо от фермерских хозяйств Центральной России. Каждая поставка сопровождается ветеринарным свидетельством.' },
  { n: '03', t: 'Цельные злаки и овощи', d: 'Используем бурый рис, голозёрный овёс и ячмень — без пшеницы, кукурузы и сои, которые чаще всего вызывают аллергию.' },
  { n: '04', t: 'Бережное приготовление', d: 'Низкотемпературная экструзия при 90 °C сохраняет витамины и аминокислоты. Жир и рыбий жир наносятся на гранулы после выпекания.' },
  { n: '05', t: 'Лабораторный контроль каждой партии', d: 'Проверяем на сальмонеллу, микотоксины, тяжёлые металлы и соответствие анализа на упаковке. Партия, не прошедшая проверку, не поступает в продажу.' },
  { n: '06', t: 'Дегустационная панель', d: 'Новый рецепт сначала пробуют 40 собак и кошек наших сотрудников и волонтёров. В продажу идёт только то, что съедают охотно и без проблем с пищеварением.' },
  { n: '07', t: 'Сертификация и прослеживаемость', d: 'Производство по принципам ХАССП, ветеринарный сертификат в системе «Меркурий» на каждую партию. По номеру партии на пакете видно, когда и из чего сделан корм.' },
  { n: '08', t: 'Подбор по медкарте', d: 'Ветеринар ВетДом подбирает корм по медкарте питомца — с учётом аллергий, веса, возраста и хронических заболеваний.' },
];

const REVIEWS: Record<string, { name: string; pet: string; stars: number; text: string; date: string }[]> = {
  'Корма': [
    { name: 'Ирина К.', pet: 'хозяйка лабрадора', stars: 5, text: 'Перешли по совету нашего ветеринара — через месяц шерсть стала блестящей, перестал чесаться. Ест с удовольствием, гранулы не крошатся.', date: '2 ноября 2026' },
    { name: 'Сергей П.', pet: 'двое котов', stars: 5, text: 'Наконец-то корм без курицы, на который у кота нет аллергии. Упаковка с зип-замком, запах приятный.', date: '28 октября 2026' },
    { name: 'Марина Л.', pet: 'хозяйка шпица', stars: 4, text: 'Хороший состав и понятная цена. Брали за бонусы — очень удобно, почти бесплатно получилось.', date: '15 октября 2026' },
  ],
  default: [
    { name: 'Анна В.', pet: 'хозяйка мопса', stars: 5, text: 'Качество отличное, всё как на фото. Привезли вместе с визитом врача — удобно!', date: '5 ноября 2026' },
    { name: 'Дмитрий С.', pet: 'хозяин овчарки', stars: 5, text: 'Брал за бонусы после приёма. Собака в восторге, рекомендую.', date: '30 октября 2026' },
    { name: 'Елена Р.', pet: 'хозяйка кошки', stars: 4, text: 'Хороший товар за свои деньги. Немного дольше ждали доставку, но всё пришло целым.', date: '19 октября 2026' },
  ],
};

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [vi, setVi] = useState(0);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'desc' | 'comp' | 'analysis' | 'prod' | 'specs' | 'rev'>('desc');
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ pay: 'rub' | 'bonus'; amount: number; balance: number } | null>(null);

  useEffect(() => { getProduct(Number(id)).then((d) => { setP(d); setImg(0); setVi(mainVariantIndex(d)); setTab('desc'); }).catch(() => {}); }, [id]);
  useEffect(() => { if (user) getLoyalty().then((l) => setBalance(l.balance)).catch(() => {}); }, [user]);

  if (!p) return <div className="min-h-screen bg-milk pt-24 md:pt-[156px] flex justify-center"><div className="w-10 h-10 border-2 border-green-500/30 border-t-green-600 rounded-full animate-spin" /></div>;

  const unit = p.variants?.[vi] ?? { label: '', price: p.price, oldPrice: p.oldPrice, bonusPrice: p.bonusPrice };
  const needBonus = unit.bonusPrice * qty;
  const enoughBonus = balance !== null && balance >= needBonus;
  const reviews = REVIEWS[p.category] ?? REVIEWS.default;

  const buy = async (pay: 'rub' | 'bonus') => {
    if (!user) { navigate('/login'); return; }
    setErr(''); setBusy(true);
    try {
      const [r] = await Promise.all([buyProduct(p.id, qty, pay, vi), new Promise((res) => setTimeout(res, 900))]);
      setBalance(r.balance);
      setDone({ pay, amount: pay === 'bonus' ? r.bonusUsed : r.totalRub, balance: r.balance });
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Не удалось оформить покупку');
    } finally { setBusy(false); }
  };

  // ── Блоки страницы: на компьютере — как раньше, на телефоне — по иконкам ──
  const tab_desc = (<>
              <div className="space-y-6">
                {p.feed && (
                  <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-green-700">Для кого</div>
                    <div className="font-semibold mt-1">{p.feed.forWhom}</div>
                  </div>
                )}
                <p className="leading-relaxed text-coffee-700">{p.description}</p>
                {p.feed && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {p.feed.benefits.map((b) => (
                      <div key={b.title} className="rounded-2xl bg-cream border border-coffee-200/70 p-4">
                        <div className="text-2xl">{b.icon}</div>
                        <div className="font-black mt-2">{b.title}</div>
                        <div className="text-sm text-coffee-600">{b.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
  </>);
  const tab_comp = (<>
              <div className="space-y-5">
                {p.feed && (
                  <div className="rounded-2xl bg-[#FBF6EF] border border-amber-200 p-5">
                    <div className="font-black mb-1">🌾 Злаки и углеводы</div>
                    <p className="text-coffee-700 leading-relaxed">{p.feed.grains}</p>
                  </div>
                )}
                <div>
                  <div className="font-black mb-1">Полный состав</div>
                  <p className="leading-relaxed text-coffee-700">{p.composition}</p>
                </div>
              </div>
  </>);
  const tab_analysis = (<>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="font-black mb-2">Гарантированный анализ</div>
                  <dl className="rounded-2xl bg-cream border border-coffee-200/70 divide-y divide-coffee-200/70">
                    {p.feed!.analysis.map(([k, v]) => (
                      <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><dt className="text-coffee-600">{k}</dt><dd className="font-bold">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <div>
                  <div className="font-black mb-2">Суточная норма кормления</div>
                  <table className="w-full rounded-2xl overflow-hidden bg-cream border border-coffee-200/70 text-sm">
                    <thead><tr className="bg-green-600 text-white">{p.feed!.feeding.head.map((h) => <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
                    <tbody>{p.feed!.feeding.rows.map(([a, b]) => <tr key={a} className="border-t border-coffee-200/70"><td className="px-4 py-2.5">{a}</td><td className="px-4 py-2.5 font-bold">{b}</td></tr>)}</tbody>
                  </table>
                  <p className="text-xs text-coffee-500 mt-2">Норма зависит от активности. Разделите на 2 кормления, свежая вода всегда в доступе. Точную норму подскажет ветеринар ВетДом по медкарте.</p>
                </div>
              </div>
  </>);
  const tab_prod = (<>
              <div>
                <p className="text-coffee-700 mb-5 max-w-2xl">«ВетДом Натурал» — корма, которые делают ветеринары. Мы видим здоровье тысяч питомцев на приёмах и знаем, что питание — основа профилактики. Вот как устроено наше производство:</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {PRODUCTION.map((st) => (
                    <div key={st.n} className="flex gap-4 rounded-2xl bg-cream border border-coffee-200/70 p-4">
                      <span className="text-2xl font-black text-green-600 leading-none">{st.n}</span>
                      <div><div className="font-black">{st.t}</div><div className="text-sm text-coffee-600 mt-1">{st.d}</div></div>
                    </div>
                  ))}
                </div>
              </div>
  </>);
  const tab_specs = (<>
              <dl className="divide-y divide-coffee-200/70">
                {p.specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-2.5 text-sm"><dt className="text-coffee-500">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
                ))}
              </dl>
  </>);
  const tab_rev = (<>
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.name} className="rounded-2xl bg-cream border border-coffee-200/70 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 text-white font-bold flex items-center justify-center">{r.name[0]}</div>
                        <div><div className="font-bold text-sm">{r.name}</div><div className="text-xs text-coffee-500">{r.pet}</div></div>
                      </div>
                      <div className="text-right"><div className="text-amber-500">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div><div className="text-[11px] text-coffee-400">{r.date}</div></div>
                    </div>
                    <p className="text-sm text-coffee-700 mt-3">{r.text}</p>
                  </div>
                ))}
              </div>
  </>);
  const buyPanel = (<>
            <div className="mt-6 rounded-3xl bg-cream border border-coffee-200/70 p-5 shadow-sm">
              <div className="flex items-end gap-3">
                <span className="text-3xl md:text-4xl font-black whitespace-nowrap">{rub(unit.price * qty)}</span>
                {unit.oldPrice && <span className="text-lg text-coffee-400 line-through mb-1">{rub(unit.oldPrice * qty)}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-[#FACC15] text-coffee-950 font-black">или {bon(needBonus)}</span>
                <span className="text-xs text-coffee-500">за бонусы выгоднее на 10%</span>
              </div>
              {user && balance !== null && (
                <div className={`mt-2 text-sm ${enoughBonus ? 'text-green-700' : 'text-coffee-500'}`}>
                  На вашем счёте {bon(balance)} {enoughBonus ? '— хватает на покупку ✓' : `— не хватает ${bon(needBonus - balance)}`}
                </div>
              )}

              {p.variants && (
                <div className="mt-5">
                  <div className="text-sm font-bold mb-2">Фасовка</div>
                  <div className="flex flex-wrap gap-2">
                    {p.variants.map((v, i) => (
                      <button key={v.label} onClick={() => setVi(i)}
                        className={`rounded-xl border-2 px-4 py-2 text-left transition-colors ${vi === i ? 'border-green-500 bg-green-50' : 'border-coffee-200 bg-white hover:border-green-400'}`}>
                        <div className="font-black">{v.label}</div>
                        <div className="text-xs text-coffee-500">{rub(v.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-xl border-2 border-coffee-200 bg-white">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-11 text-xl font-bold text-coffee-600" aria-label="Меньше">−</button>
                  <span className="w-8 text-center font-bold">{qty}</span>
                  <button onClick={() => setQty(Math.min(20, qty + 1))} className="w-10 h-11 text-xl font-bold text-coffee-600" aria-label="Больше">+</button>
                </div>
                <button onClick={() => buy('rub')} disabled={busy} className="flex-1 btn-gold py-3.5 px-3 text-[15px] md:text-base whitespace-nowrap">Купить за {rub(unit.price * qty)}</button>
              </div>
              <button onClick={() => buy('bonus')} disabled={busy || (user !== null && balance !== null && !enoughBonus)}
                className="mt-3 w-full rounded-xl bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-50 text-coffee-950 font-black py-3.5 transition-colors">
                🎁 Купить за {bon(needBonus)}
              </button>
              {err && <p className="text-sm text-red-600 mt-2">{err}</p>}

              <div className="hidden md:grid mt-5 grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white/70 p-3"><b className="block text-sm">🚚 Завтра</b>Курьер или врач привезёт при визите</div>
                <div className="rounded-xl bg-white/70 p-3"><b className="block text-sm">✨ +{Math.round(unit.price * qty * 0.05)} Б</b>кешбэк при оплате рублями</div>
              </div>
            </div>
  </>);
  const doneModal = (<>
      {done && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDone(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-cream p-7 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500 text-white text-3xl flex items-center justify-center mb-3">✓</div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">Заказ оформлен</div>
            <h3 className="text-xl font-black mt-1">{p.title}</h3>
            <p className="text-coffee-600 mt-2">
              {done.pay === 'bonus' ? <>Оплачено бонусами: <b>{bon(done.amount)}</b></> : <>Оплачено: <b>{rub(done.amount)}</b></>}
            </p>
            <p className="text-sm text-coffee-500 mt-1">Остаток бонусов: {bon(done.balance)}</p>
            <p className="text-sm text-coffee-500 mt-3">Доставим завтра. Если у вас запланирован визит — врач привезёт заказ с собой.</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Link to="/shop" className="px-5 py-3 rounded-xl border-2 border-coffee-200 font-bold text-sm">В магазин</Link>
              <button onClick={() => setDone(null)} className="btn-gold px-6 py-3 text-sm">Отлично</button>
            </div>
          </div>
        </div>
      )}
  </>);

  if (isMobile) {
    const has: Record<string, boolean> = { desc: true, comp: !!p.composition, analysis: !!p.feed, prod: !!p.feed, specs: true, rev: true };
    const T = (k: string, label: string, icon: string, tone: 'green' | 'yellow' | 'amber' | 'sky' | 'red' | 'purple' | 'white', content: React.ReactNode, title?: string) =>
      has[k] ? [{ k, label, icon, tone, content: <div className="pb-2">{content}</div>, title }] : [];
    return (
      <MobileHub light cols={3}
        header={<>
          <div className="rounded-3xl bg-white border border-coffee-200/70 p-3 flex gap-3">
            <div className="w-[104px] h-[128px] rounded-2xl overflow-hidden flex-shrink-0 bg-white">
              <ProductImage p={p.pack && unit.label ? { ...p, pack: { ...p.pack, weight: unit.label } } : p} src={p.images[img]} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-green-700">{p.brand}</div>
              <h1 className="text-[17px] font-black leading-tight mt-0.5">{p.title}</h1>
              <div className="text-[12px] text-coffee-500 mt-1 leading-snug">{p.subtitle}</div>
              <div className="text-[12px] mt-1.5"><b>⭐ {p.rating}</b> <span className="text-coffee-500">· {p.reviews.toLocaleString('ru-RU')} отзывов</span></div>
            </div>
          </div>
          <div className="-mt-6">{buyPanel}</div>
        </>}
        tiles={[
          ...T('desc', p.feed ? 'О корме' : 'Описание', '📖', 'green', tab_desc),
          ...T('comp', 'Состав', '🥩', 'amber', tab_comp, p.feed ? 'Состав и злаки' : 'Состав'),
          ...T('analysis', 'Анализ', '🔬', 'sky', tab_analysis, 'Анализ и нормы'),
          ...T('prod', 'Производство', '🏭', 'purple', tab_prod, 'Как мы производим'),
          ...T('specs', 'Детали', '📋', 'white', tab_specs, 'Характеристики'),
          ...T('rev', 'Отзывы', '⭐', 'yellow', tab_rev, `Отзывы · ${p.reviews.toLocaleString('ru-RU')}`),
          { k: 'photos', label: 'Фото', icon: '🖼️', tone: 'white' as const, title: 'Фотографии', content: (
            <div className="grid grid-cols-2 gap-2 pb-2">
              {p.images.map((src, i) => (
                <button key={i} onClick={() => setImg(i)} className={`aspect-[4/5] rounded-2xl overflow-hidden border-2 ${img === i ? 'border-green-500' : 'border-transparent'}`}>
                  <ProductImage p={p} src={src} size="sm" />
                </button>
              ))}
            </div>
          ) },
        ]}
        footer={doneModal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-milk text-coffee-900 pt-24 md:pt-[156px] pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-sm text-coffee-500 mb-5">
          <Link to="/shop" className="hover:text-coffee-800">Магазин</Link> <span className="mx-1">/</span>
          <span>{p.category}</span> <span className="mx-1">/</span> <span className="text-coffee-800">{p.brand}</span>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
          {/* Галерея */}
          <div className="flex flex-col-reverse md:flex-row gap-3">
            <div className="flex flex-row md:flex-col gap-2">
              {p.images.map((s, i) => (
                <button key={i} onClick={() => setImg(i)}
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 ${img === i ? 'border-green-500' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <ProductImage p={p} src={s} size="sm" />
                </button>
              ))}
            </div>
            <div className="relative w-full md:flex-1 aspect-[4/5] rounded-3xl overflow-hidden bg-white border border-coffee-200/70">
              <ProductImage p={p.pack && unit.label ? { ...p, pack: { ...p.pack, weight: unit.label } } : p} src={p.images[img]} size="lg" />
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {p.badges.map((b) => <span key={b} className="px-2.5 py-1 rounded-lg bg-white/95 text-coffee-800 text-xs font-bold shadow">{b}</span>)}
              </div>
            </div>
          </div>

          {/* Информация и покупка */}
          <div>
            <div className="text-sm font-semibold text-green-700">{p.brand}</div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight mt-1">{p.title}</h1>
            <div className="text-coffee-500 mt-1">{p.subtitle}</div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              <span className="font-bold">⭐ {p.rating}</span>
              <button onClick={() => setTab('rev')} className="text-coffee-600 underline underline-offset-2">{p.reviews.toLocaleString('ru-RU')} отзывов</button>
              <span className="text-coffee-500">Купили {p.sold.toLocaleString('ru-RU')} раз</span>
            </div>

            {buyPanel}
          </div>
        </div>

        {/* Вкладки */}
        <div className="mt-10">
          <div data-tabs className="flex flex-wrap md:flex-nowrap gap-1 border-b border-coffee-200 md:overflow-x-auto">
            {([['desc', p.feed ? 'О корме' : 'Описание'], ...(p.composition ? [['comp', p.feed ? 'Состав и злаки' : 'Состав']] : []),
              ...(p.feed ? [['analysis', 'Анализ и нормы'], ['prod', 'Как мы производим']] : []), ['specs', 'Характеристики'], ['rev', `Отзывы · ${p.reviews.toLocaleString('ru-RU')}`]] as [typeof tab, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-green-600 text-coffee-900' : 'border-transparent text-coffee-500 hover:text-coffee-800'}`}>{l}</button>
            ))}
          </div>
          <div className="py-6 max-w-4xl">
            {tab === 'desc' && tab_desc}
            {tab === 'comp' && tab_comp}
            {tab === 'analysis' && p.feed && tab_analysis}
            {tab === 'prod' && tab_prod}
            {tab === 'specs' && tab_specs}
            {tab === 'rev' && tab_rev}
          </div>
        </div>
      </div>

      {doneModal}
    </div>
  );
}
