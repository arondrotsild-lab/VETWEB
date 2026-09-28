import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders } from '../api';
import { useTranslation } from 'react-i18next';
import ServiceIcon from '../components/ServiceIcon';

interface Order {
  id: number; status: string; service_name: string; service_icon: string;
  pet_name?: string; address: string; total_price: number; created_at: string; vet_name?: string;
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const statusMap = () => ({
    pending:     { label: t('history.statuses.searching'), color: 'text-amber-400', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    confirmed:   { label: t('history.statuses.confirmed'), color: 'text-teal-400',  bg: 'rgba(45,212,191,0.08)',  border: 'rgba(45,212,191,0.2)' },
    on_the_way:  { label: t('history.statuses.coming'),    color: 'text-blue-400',  bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)' },
    arrived:     { label: t('history.statuses.arrived'),   color: 'text-purple-400',bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
    in_progress: { label: t('history.statuses.examining'), color: 'text-green-400', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)' },
    completed:   { label: t('history.statuses.done'),      color: 'text-green-400', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)' },
    cancelled:   { label: t('history.statuses.cancelled'), color: 'text-red-400',   bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  });

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d06] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  const sm = statusMap();

  return (
    <div className="min-h-screen bg-[#060d06] py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">{t('history.title')}</h1>
            <p className="text-white/30 text-sm mt-1">{t('history.sub')}</p>
          </div>
          <Link to="/order" className="btn-gold text-sm py-2 px-4">{t('history.newCall')}</Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl py-20 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3a11 11 0 1 0 0 22A11 11 0 0 0 14 3z"/><path d="M14 10v4M14 18h.01"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{t('history.empty')}</h2>
            <p className="text-white/30 text-sm mb-6">{t('history.emptyDesc')}</p>
            <Link to="/order" className="btn-gold inline-block">{t('history.callVet')}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const st = (sm as Record<string, { label: string; color: string; bg: string; border: string }>)[order.status] ?? sm.pending;
              const isActive = !['completed', 'cancelled'].includes(order.status);
              return (
                <Link key={order.id} to={`/order/${order.id}`}
                  className="block p-5 rounded-2xl transition-all duration-200 hover:scale-[1.005] group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-green-400/70"
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                        <ServiceIcon name={order.service_name} size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-white group-hover:text-green-400 transition-colors">{order.service_name}</div>
                        {order.pet_name && <div className="text-sm text-white/35 mt-0.5">🐾 {order.pet_name}</div>}
                        <div className="text-sm text-white/25 mt-1 line-clamp-1">{order.address}</div>
                        <div className="text-xs text-white/20 mt-1">{new Date(order.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}
                        style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                      <div className="text-sm font-bold text-white/60 mt-2">{order.total_price?.toLocaleString()} ₽</div>
                      {isActive && (
                        <div className="text-xs text-green-400 font-medium mt-1 flex items-center justify-end gap-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                          {t('history.active')}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
