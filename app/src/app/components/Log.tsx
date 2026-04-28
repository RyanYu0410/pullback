import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, SavedRoute } from '../context/AppContext';
import { Motion } from './Motion';
import { CanvasBackground } from './CanvasBackground';
import { ChevronLeft } from 'lucide-react';

type DisplayEntry = {
  id: string;
  time: string;
  ago: string;
  quote: string;
  variant: 'flax' | 'glass' | 'rose';
  route: 'Active' | 'Passive';
  past?: boolean;
};

const FALLBACK_ENTRIES: DisplayEntry[] = [
  { id: 's1', time: '14:02', ago: '3 hrs ago', quote: '“You are here. Everything else can wait.”', variant: 'flax', route: 'Passive' },
  { id: 's2', time: '09:15', ago: '8 hrs ago', quote: '“Breath as a tether to the present.”', variant: 'glass', route: 'Active', past: true },
  { id: 's3', time: 'Yesterday', ago: '1d ago', quote: '“Soft focus. Gentle return.”', variant: 'rose', route: 'Passive', past: true },
  { id: 's4', time: 'Yesterday', ago: '1d ago', quote: '“Letting the noise settle.”', variant: 'flax', route: 'Passive', past: true },
  { id: 's5', time: 'Nov 12', ago: '2d ago', quote: '“Finding ground in the motion.”', variant: 'glass', route: 'Active', past: true },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAgo(ts: number) {
  const diffMs = Date.now() - ts;
  const hr = diffMs / (1000 * 60 * 60);
  if (hr < 24) return `${Math.max(1, Math.round(hr))} hr${hr >= 2 ? 's' : ''} ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function variantFromIndex(i: number): DisplayEntry['variant'] {
  return (['flax', 'glass', 'rose'] as const)[i % 3];
}

function toEntry(route: SavedRoute, i: number): DisplayEntry {
  const ts = route.lastUsedAt ?? route.createdAt;
  return {
    id: route.id,
    time: i === 0 ? formatTime(ts) : formatAgo(ts),
    ago: formatAgo(ts),
    quote: `“${route.note || route.name || 'a quiet line'}”`,
    variant: variantFromIndex(i),
    route: route.uses > 0 ? 'Active' : 'Passive',
    past: i > 0,
  };
}

/**
 * History & Anchors timeline.
 *
 * Visual language ported from `design-d27218d7...html` — dotted vertical
 * spine, time column, glassy log cards. Real entries are sourced from
 * `AppContext.savedRoutes`; falls back to a curated set of seeds when the
 * user hasn't saved anything yet so the timeline never feels empty.
 */
export function Log() {
  const { savedRoutes } = useAppContext();
  const navigate = useNavigate();

  const entries: DisplayEntry[] =
    savedRoutes.length > 0 ? savedRoutes.map(toEntry) : FALLBACK_ENTRIES;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#f2efe8]"
    >
      <CanvasBackground />

      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="flex flex-shrink-0 items-center justify-between px-6 pb-3 pt-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/40 text-stone-800 backdrop-blur transition active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <span className="text-[13px] font-medium tracking-[-0.2px] text-stone-800">History &amp; Anchors</span>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="no-scrollbar relative flex-1 overflow-y-auto px-6 pb-16 pt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[48px] top-6 bottom-16 z-[1] w-px"
            style={{
              background:
                'repeating-linear-gradient(to bottom, #a0aa98 0, #a0aa98 4px, transparent 4px, transparent 10px)',
              opacity: 0.3,
            }}
          />

          <div className="relative z-[2] flex flex-col gap-8">
            {entries.map((entry, i) => (
              <Motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex gap-5"
              >
                <div className="flex w-12 flex-col items-end pt-1">
                  <span className="text-[11px] font-medium text-stone-500">{entry.time}</span>
                  <span
                    className={`relative z-[3] mt-1.5 -mr-6 h-2 w-2 rounded-full border-[2px] border-[#f2efe8] ${
                      entry.past ? 'bg-stone-400' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <LogCard variant={entry.variant}>
                  <p className="font-serif text-[18px] italic leading-snug tracking-[-0.3px] text-stone-800">
                    {entry.quote}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[1px] text-stone-500">
                      <span
                        className={`h-1.5 w-1.5 rounded-full border border-stone-400 ${
                          entry.route === 'Active' ? 'bg-stone-400' : ''
                        }`}
                      />
                      {entry.route} route
                    </span>
                    <span className="text-[13px] text-stone-700">{entry.ago}</span>
                  </div>
                </LogCard>
              </Motion.div>
            ))}
          </div>
        </div>
      </div>
    </Motion.div>
  );
}

function LogCard({
  variant,
  children,
}: {
  variant: 'flax' | 'glass' | 'rose';
  children: React.ReactNode;
}) {
  const bg =
    variant === 'flax'
      ? 'from-amber-100/60 to-white/20'
      : variant === 'glass'
      ? 'from-stone-100/60 to-white/20'
      : 'from-rose-100/60 to-white/20';
  return (
    <div
      className={`relative flex-1 overflow-hidden rounded-[20px] border border-black/10 bg-gradient-to-br ${bg} p-5 backdrop-blur`}
    >
      {children}
    </div>
  );
}
