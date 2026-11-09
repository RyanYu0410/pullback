import { useNavigate } from 'react-router';
import { Sprout, History, Sparkles } from 'lucide-react';
import { LoFiFrame, LoFiBtn, LoFiCard, MUTED, LINE, CARD } from './LoFiShell';

/**
 * Lofi wireframe of DoneForToday — end-of-day celebration.
 */
export function LoFiDone() {
  const navigate = useNavigate();

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col items-center px-6 pt-10">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-[28px]"
          style={{ border: `1.5px dashed ${LINE}`, background: CARD }}
        >
          ★
        </div>
        <h1 className="mt-4 text-[22px] font-semibold">Done for today</h1>
        <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
          Nice work — session saved
        </p>

        <div className="mt-6 grid w-full max-w-[320px] grid-cols-2 gap-3">
          <LoFiCard>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
              Subjects
            </p>
            <p className="mt-1 text-[22px] font-semibold">3</p>
          </LoFiCard>
          <LoFiCard>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
              Minutes
            </p>
            <p className="mt-1 text-[22px] font-semibold">75</p>
          </LoFiCard>
        </div>

        <LoFiCard className="mt-4 w-full max-w-[320px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            Finished tonight
          </p>
          <div className="mt-2 flex items-center gap-2">
            {['🦊', '🐼', '🐯'].map((e) => (
              <span
                key={e}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[14px]"
                style={{ border: `1px solid ${LINE}`, background: CARD }}
              >
                {e}
              </span>
            ))}
            <span className="text-[12px]" style={{ color: MUTED }}>
              Mia, Leo, Sam
            </span>
          </div>
        </LoFiCard>

        <div className="mt-auto mb-8 flex w-full max-w-[320px] flex-col gap-2">
          <LoFiBtn className="w-full" variant="ghost" onClick={() => navigate('/lofi-garden')}>
            <Sprout className="h-4 w-4" strokeWidth={1.5} />
            See My Garden
          </LoFiBtn>
          <LoFiBtn className="w-full" variant="ghost" onClick={() => navigate('/lofi-log')}>
            <History className="h-4 w-4" strokeWidth={1.5} />
            See What I Did
          </LoFiBtn>
          <LoFiBtn className="w-full" onClick={() => navigate('/lofi-routine')}>
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            All done!
          </LoFiBtn>
        </div>
      </div>
    </LoFiFrame>
  );
}
