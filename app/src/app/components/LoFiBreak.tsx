import { useNavigate } from 'react-router';
import { Coffee } from 'lucide-react';
import { LoFiFrame, INK, MUTED, LINE, CARD } from './LoFiShell';

/**
 * Lofi wireframe of BreakScreen.
 */
export function LoFiBreak() {
  const navigate = useNavigate();

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col items-center px-6 pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
          Take it easy
        </p>
        <h1 className="mt-1 text-[22px] font-semibold">Break time</h1>

        <button
          onClick={() => navigate('/lofi-continue')}
          className="mt-6 flex flex-col items-center transition active:scale-95"
          aria-label="Pull to go back"
        >
          <svg width="72" height="100" viewBox="0 0 72 100" fill="none" aria-hidden>
            <line x1="36" y1="0" x2="36" y2="36" stroke={INK} strokeWidth="1.2" />
            <circle cx="36" cy="56" r="18" fill={CARD} stroke={INK} strokeWidth="1.5" />
            <circle cx="36" cy="56" r="5" fill={INK} />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: MUTED }}>
            Pull to go back
          </span>
        </button>

        <div
          className="mt-8 flex h-40 w-40 flex-col items-center justify-center rounded-full"
          style={{ background: CARD, border: `2px solid ${LINE}` }}
        >
          <Coffee className="h-5 w-5" strokeWidth={1.5} style={{ color: MUTED }} />
          <span className="mt-1 font-mono text-[32px] font-bold tabular-nums">09:44</span>
          <span className="text-[11px] font-medium" style={{ color: MUTED }}>
            until focus
          </span>
        </div>

        <div
          className="mt-auto mb-8 w-full max-w-[280px] rounded-[18px] p-4 text-center"
          style={{ background: CARD, border: `1px solid ${LINE}` }}
        >
          <p className="text-[12px] font-medium" style={{ color: MUTED }}>
            On break with you
          </p>
          <div className="mt-2 flex justify-center -space-x-2">
            {['🐼', '🦊'].map((e) => (
              <span
                key={e}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[16px]"
                style={{ background: CARD, border: `1.5px solid ${INK}` }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    </LoFiFrame>
  );
}
