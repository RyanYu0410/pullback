import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, SavedRoute } from '../context/AppContext';
import { Motion } from './Motion';
import { ChevronLeft, BookOpen } from 'lucide-react';

const FALLBACK: { id: string; date: string; title: string; subjects: string[]; minutes: number }[] = [
  { id: 'd1', date: 'Today', title: 'After-school plan', subjects: ['Math', 'English'], minutes: 50 },
  { id: 'd2', date: 'Yesterday', title: 'Quiz prep', subjects: ['Science'], minutes: 25 },
  { id: 'd3', date: 'Mon', title: 'Reading + Art', subjects: ['Reading', 'Art'], minutes: 40 },
];

function friendlyDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * "What I Did" — a friendly day-by-day list of saved sessions. Falls back
 * to a small set of seed entries when the user hasn't saved anything yet,
 * so the screen never feels empty.
 */
export function Log() {
  const { savedRoutes } = useAppContext();
  const navigate = useNavigate();

  const entries =
    savedRoutes.length > 0
      ? savedRoutes.map((r) => toEntry(r))
      : FALLBACK;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col"
      style={{ background: 'linear-gradient(180deg, #fff8ee 0%, #f6e8ff 100%)' }}
    >
      <div className="flex items-center justify-between px-6 pt-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <div className="text-center">
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-500">
            History
          </span>
          <h2 className="text-[20px] font-bold leading-tight text-stone-800">
            What I Did
          </h2>
        </div>
        <span className="h-10 w-10" aria-hidden />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-12 pt-4">
        <div className="flex flex-col gap-3">
          {entries.map((e, i) => (
            <Motion.div
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-stone-200"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
                  {e.date}
                </span>
                <span className="text-[11px] font-semibold text-stone-500">
                  {e.minutes}m
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                  <BookOpen className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <span className="text-[14px] font-bold text-stone-800">{e.title}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {e.subjects.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Motion.div>
          ))}
        </div>
      </div>
    </Motion.div>
  );
}

function toEntry(r: SavedRoute) {
  return {
    id: r.id,
    date: friendlyDate(r.lastUsedAt ?? r.createdAt),
    title: r.name || r.note || 'After-school plan',
    subjects: r.items.slice(0, 4).map((i) => i.label),
    minutes: r.paceMinutes != null ? r.paceMinutes * Math.max(r.items.length, 1) : r.items.length * 25,
  };
}
