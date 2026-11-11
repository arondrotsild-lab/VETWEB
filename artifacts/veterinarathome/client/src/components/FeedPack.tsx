// Упаковка корма собственного бренда «ВетДом Натурал» — отрисовывается кодом,
// поэтому выглядит как настоящая пачка с маркетплейса.
export interface Pack { flavor: string; weight: string; pet: string; color: string; animal: 'dog' | 'cat' }

export default function FeedPack({ pack, size = 'md' }: { pack: Pack; size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.62 : size === 'lg' ? 1.25 : 1;
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#F7F2EA] to-[#E9DFCF]">
      <div style={{ width: 220 * scale, height: 300 * scale, fontSize: 10 * scale }}
        className="relative drop-shadow-[0_18px_22px_rgba(30,20,13,0.35)]">
        {/* пакет */}
        <div className="absolute inset-0 rounded-[1.4em] overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${pack.color} 0%, #1E140D 120%)` }}>
          {/* «шов» сверху */}
          <div className="absolute top-0 left-0 right-0 h-[2.2em]" style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 0.35em, transparent 0.35em 0.7em)' }} />
          <div className="absolute top-[2.2em] left-0 right-0 h-px bg-white/25" />
          {/* блик */}
          <div className="absolute top-0 bottom-0 left-[12%] w-[18%] bg-gradient-to-r from-white/0 via-white/15 to-white/0 skew-x-[-8deg]" />

          <div className="relative h-full flex flex-col items-center px-[1.4em] pt-[3em] text-white text-center">
            <div className="flex items-center gap-[0.5em]">
              <span className="w-[2.4em] h-[2.4em] rounded-full bg-white text-[#3A651C] font-black flex items-center justify-center text-[1.1em]">В</span>
              <div className="text-left leading-tight">
                <div className="font-black tracking-[0.12em] text-[1.25em]">ВЕТДОМ</div>
                <div className="tracking-[0.35em] text-[0.8em] text-[#DBB685]">НАТУРАЛ</div>
              </div>
            </div>

            <div className="mt-[1.2em] w-[11em] h-[11em] rounded-full overflow-hidden border-[0.35em] border-white/90 shadow-lg">
              <img src={pack.pet} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="mt-[1em] font-black text-[1.3em] leading-[1.1] w-full [overflow-wrap:anywhere]">{pack.flavor}</div>
            <div className="mt-[0.4em] text-[0.8em] uppercase tracking-[0.1em] text-white/75">
              {pack.animal === 'dog' ? 'для собак' : 'для кошек'} · сделано ветеринарами
            </div>
            <div className="mt-auto mb-[1.2em] flex items-center justify-between w-full">
              <span className="rounded-full bg-[#FACC15] text-[#1E140D] font-black px-[0.9em] py-[0.3em] text-[1.05em]">{pack.weight}</span>
              <span className="text-[0.8em] text-white/70">без красителей</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
