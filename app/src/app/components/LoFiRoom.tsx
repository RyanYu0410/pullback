import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LoFiFrame, LoFiBack, LoFiBtn, LoFiCard, INK, MUTED, LINE, CARD, PAPER } from './LoFiShell';

const ZONES = [
  { id: 'focus', label: 'Focus Table', x: 28, y: 38, w: 44, h: 22 },
  { id: 'help', label: 'Help Desk', x: 8, y: 48, w: 22, h: 16 },
  { id: 'snack', label: 'Snack Corner', x: 70, y: 50, w: 22, h: 16 },
] as const;

/**
 * Lofi wireframe of StudyRoom — pick a seat.
 */
export function LoFiRoom() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<(typeof ZONES)[number]['id']>('focus');
  const zone = ZONES.find((z) => z.id === selected)!;

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="flex items-center gap-3 px-6 pt-5">
          <LoFiBack to="/lofi-routine" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
              Study Together
            </p>
            <h1 className="text-[16px] font-semibold">Pick a seat</h1>
          </div>
        </header>

        <p className="mt-1 flex items-center gap-2 px-6 text-[11px]" style={{ color: MUTED }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: INK }} />
          5 friends here
        </p>

        {/* Sketched room plan */}
        <div className="relative mx-6 mt-4 flex-1 overflow-hidden rounded-[20px]" style={{ border: `1px solid ${LINE}`, background: CARD }}>
          {/* Floor / walls */}
          <div
            className="absolute inset-x-4 top-4 h-[42%]"
            style={{ border: `1px dashed ${LINE}`, borderRadius: 12 }}
          />
          <div
            className="absolute inset-x-3 bottom-3 top-[38%]"
            style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: PAPER }}
          />

          {ZONES.map((z) => {
            const isSel = selected === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setSelected(z.id)}
                className="absolute flex items-center justify-center rounded-lg text-[9px] font-semibold uppercase tracking-wide transition active:scale-95"
                style={{
                  left: `${z.x}%`,
                  top: `${z.y}%`,
                  width: `${z.w}%`,
                  height: `${z.h}%`,
                  background: isSel ? INK : CARD,
                  color: isSel ? PAPER : INK,
                  border: `1.5px solid ${INK}`,
                }}
              >
                {z.label}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4">
          <LoFiCard className="flex items-center justify-between gap-3 !p-3">
            <div>
              <p className="text-[14px] font-semibold">{zone.label}</p>
              <p className="text-[11px]" style={{ color: MUTED }}>
                Sit to start
              </p>
            </div>
            <LoFiBtn
              onClick={() =>
                navigate(selected === 'snack' ? '/lofi-break' : '/lofi-session')
              }
            >
              Sit here
            </LoFiBtn>
          </LoFiCard>
        </div>
      </div>
    </LoFiFrame>
  );
}
