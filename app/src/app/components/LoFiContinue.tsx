import { useNavigate } from 'react-router';
import { Coffee, CheckCircle2 } from 'lucide-react';
import { LoFiFrame, LoFiBtn, LoFiCard, INK, MUTED, LINE, CARD } from './LoFiShell';

/**
 * Lofi wireframe of ContinueFocus — break over, resume or finish.
 */
export function LoFiContinue() {
  const navigate = useNavigate();

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col items-center px-6 pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
          Break over
        </p>
        <h1 className="mt-1 text-[22px] font-semibold">Continue session</h1>
        <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
          Keep the momentum going
        </p>

        <div className="mt-5 flex gap-2">
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: CARD, border: `1px solid ${LINE}` }}
          >
            12min focused
          </span>
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: CARD, border: `1px solid ${LINE}` }}
          >
            1/3 tasks
          </span>
        </div>

        <div
          className="mt-6 flex h-20 w-20 flex-col items-center justify-center rounded-full"
          style={{ background: CARD, border: `2px solid ${LINE}` }}
        >
          <span className="font-mono text-[18px] font-bold tabular-nums">13:00</span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            left
          </span>
        </div>

        <button
          onClick={() => navigate('/lofi-session')}
          className="mt-4 flex flex-col items-center transition active:scale-95"
          aria-label="Pull to focus"
        >
          <svg width="64" height="90" viewBox="0 0 64 90" fill="none" aria-hidden>
            <line x1="32" y1="0" x2="32" y2="32" stroke={INK} strokeWidth="1.2" />
            <circle cx="32" cy="50" r="16" fill={CARD} stroke={INK} strokeWidth="1.5" />
            <circle cx="32" cy="50" r="4" fill={INK} />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: MUTED }}>
            Pull to focus
          </span>
        </button>

        <LoFiCard className="mt-4 w-full max-w-[300px]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            Still to do
          </p>
          {['English', 'Science'].map((t) => (
            <div key={t} className="flex items-center gap-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: INK }} />
              <span className="text-[13px] font-medium">{t}</span>
            </div>
          ))}
        </LoFiCard>

        <div className="mt-auto mb-8 grid w-full max-w-[320px] grid-cols-2 gap-2">
          <LoFiBtn variant="ghost" onClick={() => navigate('/lofi-break')}>
            <Coffee className="h-4 w-4" strokeWidth={1.5} />
            Another break
          </LoFiBtn>
          <LoFiBtn variant="ghost" onClick={() => navigate('/lofi-done')}>
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
            Done for today
          </LoFiBtn>
        </div>
      </div>
    </LoFiFrame>
  );
}
