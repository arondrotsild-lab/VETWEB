import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChats } from '../api';

interface Dialog {
  order_id: number; service_name: string; pet_name?: string; scheduled_at: string;
  vet_name: string; vet_photo_url?: string; vet_specialization?: string;
  last_text?: string; last_sender?: string; last_at?: string; unread: number;
}

export default function ChatsPage() {
  const [list, setList] = useState<Dialog[] | null>(null);
  useEffect(() => { getChats().then(setList).catch(() => setList([])); }, []);

  return (
    <div className="min-h-screen bg-milk text-coffee-900 pt-24 md:pt-[156px] pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-px bg-green-600" />
          <span className="text-green-700 text-xs font-bold uppercase tracking-[0.3em]">Сообщения</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Связь с вашими ветеринарами</h1>
        <p className="text-coffee-600 mb-8">После каждого визита вы можете написать врачу, который у вас был: он видит медкарту и историю приёма.</p>

        {list === null ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-600 rounded-full animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="rounded-3xl bg-cream border border-coffee-200/70 p-8 text-center">
            <p className="text-coffee-600 mb-4">Диалоги появятся после первого визита ветеринара.</p>
            <Link to="/order" className="btn-gold">Вызвать ветеринара</Link>
          </div>
        ) : (
          <div className="rounded-3xl bg-cream border border-coffee-200/70 overflow-hidden divide-y divide-coffee-200/70">
            {list.map((d) => (
              <Link key={d.order_id} to={`/chat/${d.order_id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/60 transition-colors">
                {d.vet_photo_url
                  ? <img src={d.vet_photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-green-500" />
                  : <div className="w-14 h-14 rounded-full bg-green-500 text-white font-black flex items-center justify-center text-xl">{d.vet_name[0]}</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-black truncate">{d.vet_name}</div>
                    {d.last_at && <div className="text-[11px] text-coffee-400 whitespace-nowrap">{new Date(d.last_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>}
                  </div>
                  <div className="text-xs text-coffee-500 truncate">{d.service_name}{d.pet_name ? ` · ${d.pet_name}` : ''}</div>
                  <div className="text-sm text-coffee-700 truncate mt-0.5">
                    {d.last_text ? <>{d.last_sender === 'client' && <span className="text-coffee-400">Вы: </span>}{d.last_text}</> : <span className="text-green-700 font-semibold">Написать врачу →</span>}
                  </div>
                </div>
                {d.unread > 0 && <span className="min-w-6 h-6 px-2 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">{d.unread}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
