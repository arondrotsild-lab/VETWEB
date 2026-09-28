import React from 'react';
import { Link } from 'react-router-dom';

const visits = [
  {
    date: '14 июля 2025',
    vet: 'Соколов Андрей Викторович',
    complaint: 'Вялость, отказ от еды, тусклая шерсть',
    diagnosis: 'Гиповитаминоз D3, лёгкое обезвоживание',
    treatment: 'В/м инъекция витамина D3 (0.2 мл), регидратационный раствор орально 5 дней',
    prescriptions: ['Аквавит-форте 5 кап/сут × 14 дней', 'Регидрон 1/4 пакета в воде 2 р/день × 5 дней'],
    nextVisit: '28 июля 2025',
    status: 'Завершён',
  },
  {
    date: '28 июля 2025',
    vet: 'Соколов Андрей Викторович',
    complaint: 'Контрольный осмотр после курса витаминов',
    diagnosis: 'Положительная динамика. Состояние в норме.',
    treatment: 'Профилактическая обработка от паразитов (Дронтал)',
    prescriptions: ['Дронтал Плюс 1/4 таб однократно', 'Продолжить Аквавит-форте ещё 14 дней'],
    nextVisit: '14 октября 2025',
    status: 'Завершён',
  },
  {
    date: '3 марта 2026',
    vet: 'Яковлева Марина Сергеевна',
    complaint: 'Царапина на хвосте, лёгкое воспаление',
    diagnosis: 'Поверхностная рана, начальная стадия дерматита',
    treatment: 'Обработка хлоргексидином, нанесение Левомеколя',
    prescriptions: ['Левомеколь мазь 2 р/день × 7 дней', 'Ошейник Elizabethan на 5 дней'],
    nextVisit: '10 марта 2026',
    status: 'Завершён',
  },
  {
    date: '8 августа 2026',
    vet: 'Петров Илья Романович',
    complaint: 'Плановый осмотр, вакцинация',
    diagnosis: 'Клинически здоров. Вес в норме.',
    treatment: 'Вакцинация (Нобивак Рабиес), взятие крови на биохимию',
    prescriptions: ['Ожидание результатов анализов (3–5 дней)'],
    nextVisit: 'По результатам анализов',
    status: 'Активен',
  },
];

export default function MedCardPage() {
  return (
    <div className="min-h-screen bg-[#060d06] text-white pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          На главную
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-px bg-amber-400" />
          <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">Пример медицинской карты</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-2">Медкарта питомца</h1>
        <p className="text-white/35 text-sm mb-10">Полная история здоровья — всегда под рукой</p>

        {/* Pet profile card */}
        <div
          className="rounded-3xl p-6 md:p-8 mb-10 flex flex-col md:flex-row gap-6 md:gap-10 items-start"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/20 rounded-2xl blur-xl" />
              <img
                src="/lemur-demo.jpg"
                alt="Рики — кольцехвостый лемур"
                className="relative w-44 h-44 md:w-52 md:h-52 rounded-2xl object-cover"
                style={{ border: '1.5px solid rgba(74,222,128,0.2)' }}
              />
              {/* Status badge */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-400 text-black whitespace-nowrap">
                ✓ На учёте
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl font-black text-white">Рики</h2>
                <p className="text-green-400 text-sm font-semibold mt-0.5">Кольцехвостый лемур · 4 года</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/25 uppercase tracking-widest">Карта №</div>
                <div className="text-white font-mono font-bold">VD-2024-0042</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {[
                { label: 'Вид', val: 'Лемур кольцехвостый' },
                { label: 'Порода', val: 'Lemur catta' },
                { label: 'Пол', val: 'Самец' },
                { label: 'Вес', val: '2.4 кг' },
                { label: 'Цвет', val: 'Серо-белый, полос. хвост' },
                { label: 'Чип / клеймо', val: 'RU-9870043221' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">{f.label}</div>
                  <div className="text-sm text-white/80 font-medium">{f.val}</div>
                </div>
              ))}
            </div>

            {/* Owner strip */}
            <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap gap-6">
              {[
                { label: 'Владелец', val: 'Артём Волков' },
                { label: 'Телефон', val: '+7 916 234 56 78' },
                { label: 'Telegram', val: '@artem_lemur' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">{f.label}</div>
                  <div className="text-sm text-white/70">{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selling banner */}
        <div
          className="rounded-2xl px-6 py-5 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(74,222,128,0.07) 0%, rgba(251,191,36,0.05) 100%)',
            border: '1px solid rgba(74,222,128,0.15)',
          }}
        >
          <div>
            <p className="text-white font-bold text-base mb-1">Вся история лечения — в одном месте</p>
            <p className="text-white/40 text-sm">После каждого визита врач заполняет карту: диагноз, назначения, дата следующего приёма. Вы всегда в курсе состояния питомца.</p>
          </div>
          <Link to="/register" className="btn-gold text-sm py-3 px-6 font-bold whitespace-nowrap flex-shrink-0">
            Создать карту
          </Link>
        </div>

        {/* Visit timeline */}
        <h2 className="text-2xl font-black mb-6">История визитов</h2>
        <div className="space-y-4">
          {visits.map((v, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${v.status === 'Активен' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {/* Visit header */}
              <div
                className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b"
                style={{ borderColor: v.status === 'Активен' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-white/10 font-mono">{String(visits.length - i).padStart(2,'0')}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{v.date}</div>
                    <div className="text-xs text-white/30">Врач: {v.vet}</div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{
                    background: v.status === 'Активен' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                    color: v.status === 'Активен' ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.3)',
                    border: v.status === 'Активен' ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {v.status}
                </span>
              </div>

              {/* Visit body */}
              <div className="px-6 py-5 grid md:grid-cols-2 gap-5">
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Жалоба</div>
                  <p className="text-sm text-white/65">{v.complaint}</p>
                </div>
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Диагноз</div>
                  <p className="text-sm text-white/80 font-medium">{v.diagnosis}</p>
                </div>
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Лечение</div>
                  <p className="text-sm text-white/65">{v.treatment}</p>
                </div>
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Назначения</div>
                  <ul className="space-y-1">
                    {v.prescriptions.map((p, j) => (
                      <li key={j} className="text-sm text-white/65 flex items-start gap-2">
                        <span className="text-green-400/60 mt-0.5 flex-shrink-0">·</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Next visit */}
              <div className="px-6 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-[10px] text-white/25 uppercase tracking-widest mr-3">Следующий приём:</span>
                <span className="text-xs text-amber-400/70 font-semibold">{v.nextVisit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="mt-14 text-center">
          <p className="text-white/30 text-sm mb-5">Зарегистрируйтесь — и медкарта вашего питомца будет выглядеть именно так</p>
          <Link to="/register" className="btn-gold text-base py-4 px-10 font-bold">
            Зарегистрировать питомца
          </Link>
        </div>
      </div>
    </div>
  );
}
