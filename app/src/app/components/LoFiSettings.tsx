import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { LoFiFrame, LoFiNav, LoFiCard, INK, MUTED, LINE, CARD, PAPER } from './LoFiShell';

const ROUTINE_ROWS = [
  { title: 'My Habits', sub: 'Growth & focus trends over time' },
  { title: 'My Garden', sub: '9 blooms · streak calendar & growth' },
  { title: 'Group History', sub: 'Shared session log with your room' },
];

const VIBES = ['Honey', 'Clay', 'Iris', 'Steel', 'Cosmos', 'Void'];

/**
 * Lofi wireframe of Settings.
 */
export function LoFiSettings() {
  const [vibe, setVibe] = useState('Honey');

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="px-6 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            Preferences
          </p>
          <h1 className="text-[16px] font-semibold">Settings</h1>
        </header>

        <div className="mt-5 flex-1 overflow-y-auto px-6 pb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            Your Routine
          </p>
          <LoFiCard className="!p-0 overflow-hidden">
            {ROUTINE_ROWS.map((row, i) => (
              <button
                key={row.title}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition active:opacity-70"
                style={{ borderTop: i > 0 ? `1px solid ${LINE}` : undefined }}
              >
                <span className="flex flex-col">
                  <span className="text-[14px] font-semibold">{row.title}</span>
                  <span className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                    {row.sub}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} style={{ color: MUTED }} />
              </button>
            ))}
          </LoFiCard>

          <p className="mb-1 mt-6 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            Room Vibe
          </p>
          <p className="mb-3 text-[12px]" style={{ color: MUTED }}>
            Pick a background — it&rsquo;s only colour.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {VIBES.map((v) => {
              const selected = vibe === v;
              return (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className="flex h-16 flex-col items-center justify-center rounded-[14px] text-[11px] font-semibold transition active:scale-95"
                  style={{
                    background: selected ? INK : CARD,
                    color: selected ? PAPER : INK,
                    border: `1px solid ${selected ? INK : LINE}`,
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        <LoFiNav />
      </div>
    </LoFiFrame>
  );
}
