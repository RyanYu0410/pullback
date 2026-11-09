import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, type SavedRoute } from '../context/AppContext';
import { Motion } from './Motion';
import { Plus, Search, X } from 'lucide-react';

const FALLBACK: { id: string; date: string; title: string; subjects: string[]; minutes: number }[] = [
  { id: 'd1', date: 'Today',     title: 'After-school plan', subjects: ['Math', 'English'],   minutes: 50 },
  { id: 'd2', date: 'Yesterday', title: 'Quiz prep',         subjects: ['Science'],            minutes: 25 },
  { id: 'd3', date: 'Mon',       title: 'Reading + Art',     subjects: ['Reading', 'Art'],     minutes: 40 },
];

function friendlyDate(ts: number) {
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function toEntry(r: SavedRoute) {
  return {
    id:       r.id,
    date:     friendlyDate(r.lastUsedAt ?? r.createdAt),
    title:    r.name || r.note || 'Study session',
    subjects: r.items.slice(0, 4).map((i) => i.label),
    minutes:  r.paceMinutes != null
      ? r.paceMinutes * Math.max(r.items.length, 1)
      : r.items.length * 25,
  };
}

/**
 * History — a day-by-day list of saved study sessions.
 * Falls back to seed entries when nothing has been saved yet.
 */
export function Log() {
  const { savedRoutes, routine, setRoutine, loadSavedRoute, isDark } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const allEntries = savedRoutes.length > 0 ? savedRoutes.map(toEntry) : FALLBACK;

  /* Collect unique subjects across all entries for the filter pills */
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach(e => e.subjects.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [allEntries]);

  /* Apply search text + subject filter */
  const entries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter(e => {
      const matchesSearch = !q ||
        e.title.toLowerCase().includes(q) ||
        e.subjects.some(s => s.toLowerCase().includes(q)) ||
        e.date.toLowerCase().includes(q);
      const matchesSubject = !activeSubject || e.subjects.includes(activeSubject);
      return matchesSearch && matchesSubject;
    });
  }, [allEntries, search, activeSubject]);

  const addToToday = (entryId: string, subjects: string[]) => {
    const matched = savedRoutes.find((r) => r.id === entryId);
    if (matched) {
      loadSavedRoute(entryId);
    } else {
      // Fallback entry — just apply the subjects
      setRoutine({ ...routine, subjects });
    }
    navigate('/');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-1">
        <span className="h-8 w-[10px] flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <span style={{color:isDark?'rgba(255,255,255,0.40)':'#9ca29a'}} className="text-[10px] font-semibold uppercase tracking-[0.2em]">History</span>
          <h2 style={{color:isDark?'rgba(255,255,255,0.88)':'#3a3c38'}} className="truncate text-[20px] font-bold leading-tight tracking-tight">What I Did</h2>
        </div>
        <span className="h-8 w-8" aria-hidden />
      </div>

      {/* ── Search bar ── */}
      <div className="px-5 pt-3">
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'}` }}
        >
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(58,60,56,0.35)' }} strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#3a3c38', caretColor: isDark ? '#a78bfa' : '#7c3aed' }}
          />
          {search.length > 0 && (
            <button onClick={() => setSearch('')} style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(58,60,56,0.35)' }}>
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Subject filter pills ── */}
      {allSubjects.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-2.5 pb-0.5">
          {allSubjects.map(s => {
            const active = activeSubject === s;
            return (
              <button
                key={s}
                onClick={() => setActiveSubject(active ? null : s)}
                className="flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-all duration-150 active:scale-95"
                style={{
                  background: active
                    ? (isDark ? 'rgba(167,139,250,0.28)' : 'rgba(124,58,237,0.12)')
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                  color: active
                    ? (isDark ? '#c4b5fd' : '#7c3aed')
                    : (isDark ? 'rgba(255,255,255,0.50)' : 'rgba(58,60,56,0.50)'),
                  border: `1px solid ${active ? (isDark ? 'rgba(167,139,250,0.40)' : 'rgba(124,58,237,0.25)') : 'transparent'}`,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Entry list ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-12 pt-3">
        {entries.length === 0 && (
          <p className="pt-8 text-center text-[13px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(58,60,56,0.35)' }}>
            No sessions match your filter.
          </p>
        )}
        <div className="flex flex-col gap-2.5">
          {entries.map((e, i) => (
            <Motion.div
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="px-4 py-3.5 rounded-2xl"
              style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.85)',border:`1px solid ${isDark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.04)'}`,boxShadow:'0 4px 14px rgba(0,0,0,0.05)',backdropFilter:'blur(8px)'}}
            >
              {/* Date + duration */}
              <div className="flex items-baseline justify-between">
                <span style={{color:isDark?'rgba(255,255,255,0.40)':'#9ca29a'}} className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {e.date}
                </span>
                <span style={{color:isDark?'rgba(255,255,255,0.50)':'#78716c'}} className="time-num text-[12px] font-semibold">
                  {e.minutes} min
                </span>
              </div>

              {/* Session title */}
              <p style={{color:isDark?'rgba(255,255,255,0.88)':'#3a3c38'}} className="mt-1.5 text-[15px] font-semibold leading-snug">
                {e.title}
              </p>

              {/* Subject chips */}
              {e.subjects.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {e.subjects.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Add to today */}
              <button
                onClick={() => addToToday(e.id, e.subjects)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition active:scale-[0.98]"
                style={{color:isDark?'rgba(255,255,255,0.60)':'#78716c',border:`1px solid ${isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.10)'}`}}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Add to today's plan
              </button>
            </Motion.div>
          ))}
        </div>
      </div>
    </Motion.div>
  );
}
