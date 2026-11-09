import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { LoFiFrame, LoFiNav, INK, MUTED, LINE, CARD } from './LoFiShell';

const SCHEDULE = [
  { time: '4:00', label: 'Math', mins: 25, kind: 'focus' as const },
  { time: '4:25', label: 'Break', mins: 5, kind: 'break' as const },
  { time: '4:30', label: 'English', mins: 25, kind: 'focus' as const },
  { time: '4:55', label: 'Break', mins: 5, kind: 'break' as const },
  { time: '5:00', label: 'Science', mins: 25, kind: 'focus' as const },
];

/**
 * Lofi wireframe of RoutineReview — Today / My plan.
 */
export function LoFiRoutine() {
  const navigate = useNavigate();
  const total = SCHEDULE.reduce((s, b) => s + b.mins, 0);

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="flex items-center gap-3 px-6 pt-5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-[20px]"
            style={{ border: `1px solid ${LINE}`, background: CARD }}
          >
            🐶
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
              Today
            </p>
            <h1 className="text-[16px] font-semibold">My plan</h1>
          </div>
          <button
            onClick={() => navigate('/lofi-setup')}
            aria-label="Add subject"
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ border: `1px solid ${LINE}`, background: CARD }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </header>

        {/* Sketched bell */}
        <button
          onClick={() => navigate('/lofi-room')}
          className="mt-4 flex flex-col items-center transition active:scale-95"
          aria-label="Begin session"
        >
          <svg width="64" height="96" viewBox="0 0 64 96" fill="none" aria-hidden>
            <line x1="32" y1="0" x2="32" y2="36" stroke={INK} strokeWidth="1.2" />
            <circle cx="32" cy="54" r="16" fill={CARD} stroke={INK} strokeWidth="1.5" />
            <circle cx="32" cy="54" r="4" fill={INK} />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: MUTED }}>
            tap or pull to begin
          </span>
        </button>

        <div className="mt-4 flex-1 overflow-y-auto px-6 pb-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
              Schedule
            </span>
            <span className="text-[11px] font-semibold" style={{ color: MUTED }}>
              {total}m total
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {SCHEDULE.map((b) => (
              <div
                key={`${b.time}-${b.label}`}
                className="flex items-center gap-3 rounded-[14px] px-3 py-2.5"
                style={{
                  background: CARD,
                  border: `1px ${b.kind === 'break' ? 'dashed' : 'solid'} ${LINE}`,
                  opacity: b.kind === 'break' ? 0.65 : 1,
                }}
              >
                <span className="w-10 text-[12px] font-semibold" style={{ color: MUTED }}>
                  {b.time}
                </span>
                <span className="flex-1 text-[13px] font-medium">{b.label}</span>
                <span className="text-[11px] font-semibold" style={{ color: MUTED }}>
                  {b.mins}m
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: MUTED }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: INK }} />
            2,847 online studying now
          </p>
        </div>

        <LoFiNav />
      </div>
    </LoFiFrame>
  );
}
