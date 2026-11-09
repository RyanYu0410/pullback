import { LoFiFrame, LoFiNav, INK, MUTED, LINE, CARD, PAPER } from './LoFiShell';

const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = 14 - i;
  const bloom = [0, 1, 2, 0, 1, 3, 2, 0, 1, 2, 1, 0, 2, 3][i];
  return { day: d, bloom, today: i === 13 };
});

/**
 * Lofi wireframe of Garden — study bloom calendar.
 */
export function LoFiGarden() {
  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="px-6 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            Garden
          </p>
          <h1 className="text-[16px] font-semibold">Your study garden</h1>
        </header>

        {/* Sketched hills */}
        <div
          className="relative mx-6 mt-4 h-24 overflow-hidden rounded-[18px]"
          style={{ border: `1px solid ${LINE}`, background: CARD }}
        >
          <div
            className="absolute -bottom-4 left-[-10%] h-20 w-[60%] rounded-[50%]"
            style={{ border: `1px solid ${LINE}`, background: PAPER }}
          />
          <div
            className="absolute -bottom-6 right-[-5%] h-24 w-[55%] rounded-[50%]"
            style={{ border: `1px solid ${LINE}`, background: PAPER }}
          />
          <span
            className="absolute right-6 top-4 h-5 w-5 rounded-full"
            style={{ border: `1.5px solid ${INK}` }}
          />
        </div>

        {/* Calendar grid */}
        <div className="mt-4 flex-1 overflow-y-auto px-6">
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((d) => (
              <div
                key={d.day}
                className="flex aspect-square flex-col items-center justify-end rounded-lg pb-1"
                style={{
                  border: d.today ? `1.5px solid ${INK}` : `1px solid ${LINE}`,
                  background: CARD,
                }}
              >
                {d.bloom > 0 && (
                  <svg width="14" height={10 + d.bloom * 4} viewBox="0 0 14 22" fill="none" aria-hidden>
                    <line x1="7" y1="22" x2="7" y2={22 - d.bloom * 5} stroke={INK} strokeWidth="1.2" />
                    {d.bloom >= 1 && <circle cx="7" cy={18 - d.bloom * 4} r="2.5" fill={CARD} stroke={INK} strokeWidth="1" />}
                    {d.bloom >= 2 && <circle cx="4" cy={14 - d.bloom * 2} r="2" fill={CARD} stroke={INK} strokeWidth="1" />}
                    {d.bloom >= 3 && <circle cx="10" cy={14 - d.bloom * 2} r="2" fill={CARD} stroke={INK} strokeWidth="1" />}
                  </svg>
                )}
                <span className="text-[9px] font-semibold" style={{ color: d.today ? INK : MUTED }}>
                  {d.today ? 'TODAY' : d.day}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[12px]" style={{ color: MUTED }}>
            <span>&lt; drag for older</span>
            <div className="text-right">
              <p className="font-semibold" style={{ color: INK }}>
                6-day streak
              </p>
              <p>9 blooms last 6 weeks</p>
            </div>
          </div>
        </div>

        <LoFiNav />
      </div>
    </LoFiFrame>
  );
}
