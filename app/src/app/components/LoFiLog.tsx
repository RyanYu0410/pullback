import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { useAppContext, type SavedRoute } from '../context/AppContext';
import { LoFiFrame, LoFiNav, LoFiCard, INK, MUTED, LINE, CARD } from './LoFiShell';

const FALLBACK = [
  { id: 'd1', date: 'Today', title: 'Math', minutes: 25 },
  { id: 'd2', date: 'Yesterday', title: 'English', minutes: 30 },
  { id: 'd3', date: 'Sat, 9 May', title: 'Science', minutes: 45 },
  { id: 'd4', date: 'Fri, 8 May', title: 'Art', minutes: 35 },
];

function friendlyDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function toEntry(r: SavedRoute) {
  return {
    id: r.id,
    date: friendlyDate(r.lastUsedAt ?? r.createdAt),
    title: r.name || r.note || r.items[0]?.label || 'Study session',
    minutes:
      r.paceMinutes != null
        ? r.paceMinutes * Math.max(r.items.length, 1)
        : r.items.length * 25,
  };
}

/**
 * Lofi wireframe of History (Log) — matches hi-fi "What I Did" structure.
 */
export function LoFiLog() {
  const { savedRoutes } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const entries = useMemo(() => {
    const all = savedRoutes.length > 0 ? savedRoutes.map(toEntry) : FALLBACK;
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) =>
        e.title.toLowerCase().includes(q) || e.date.toLowerCase().includes(q),
    );
  }, [savedRoutes, search]);

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="px-6 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            History
          </p>
          <h1 className="text-[16px] font-semibold">What I Did</h1>
        </header>

        <div className="mt-4 px-6">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2.5"
            style={{ background: CARD, border: `1px solid ${LINE}` }}
          >
            <Search className="h-4 w-4" strokeWidth={1.5} style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions..."
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: INK }}
            />
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-6 pb-2">
          <div className="flex flex-col gap-3">
            {entries.map((e) => (
              <LoFiCard key={e.id}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: MUTED }}>
                    {e.date}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: MUTED }}>
                    {e.minutes} min
                  </span>
                </div>
                <p className="mt-1 text-[15px] font-semibold">{e.title}</p>
                <button
                  onClick={() => navigate('/lofi-routine')}
                  className="mt-3 w-full rounded-full py-2 text-[12px] font-semibold transition active:scale-[0.98]"
                  style={{ border: `1px solid ${LINE}`, background: CARD }}
                >
                  + Add to today&rsquo;s plan
                </button>
              </LoFiCard>
            ))}
          </div>
        </div>

        <LoFiNav />
      </div>
    </LoFiFrame>
  );
}
