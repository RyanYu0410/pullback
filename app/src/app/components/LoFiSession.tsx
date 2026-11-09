import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { LoFiFrame, INK, MUTED, LINE, CARD } from './LoFiShell';

/**
 * Lofi wireframe of FocusSession — pull the bell to reveal the timer.
 */
export function LoFiSession() {
  const navigate = useNavigate();

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="flex items-center justify-between px-6 pt-5">
          <button
            onClick={() => navigate('/lofi-room')}
            aria-label="Close session"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ border: `1px solid ${LINE}`, background: CARD }}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <span className="text-[12px] font-medium" style={{ color: MUTED }}>
            pull the bell
          </span>
          <span className="h-9 w-9" aria-hidden />
        </header>

        <button
          onClick={() => navigate('/lofi-break')}
          className="flex flex-1 flex-col items-center justify-center transition active:scale-[0.98]"
          aria-label="Pull to focus"
        >
          <svg width="120" height="220" viewBox="0 0 120 220" fill="none" aria-hidden>
            <path
              d="M60 24 C 60 24, 48 80, 60 120"
              stroke={INK}
              strokeWidth="1.4"
              fill="none"
            />
            <circle cx="60" cy="148" r="28" fill={CARD} stroke={INK} strokeWidth="1.6" />
            <circle cx="60" cy="148" r="7" fill={INK} />
          </svg>
          <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            Math · 25:00
          </span>
        </button>

        <div className="px-6 pb-8">
          <div
            className="flex items-center justify-between rounded-[16px] px-4 py-3"
            style={{ background: CARD, border: `1px solid ${LINE}` }}
          >
            <span className="text-[12px] font-medium" style={{ color: MUTED }}>
              Tasks
            </span>
            <span className="text-[13px] font-semibold">3 remaining</span>
          </div>
        </div>
      </div>
    </LoFiFrame>
  );
}
