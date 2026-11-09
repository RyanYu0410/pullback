import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Check, RotateCcw } from 'lucide-react';
import {
  LoFiFrame,
  LoFiBack,
  LoFiIsland,
  LoFiCard,
  INK,
  MUTED,
  LINE,
} from './LoFiShell';

/**
 * Lofi wireframe of mid-session reflection (legacy Save).
 * Tour path: /lofi-preview → /lofi-save → /lofi-log
 */
export function LoFiSave() {
  const navigate = useNavigate();
  const { note, returnsMade } = useAppContext();
  const defaultName = note ? note.split(/\s+/).slice(0, 3).join(' ') : 'Evening route';
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="flex flex-shrink-0 items-center px-6 pt-5">
          <LoFiBack to="/lofi" />
          <LoFiIsland>Session complete</LoFiIsland>
          <span className="h-9 w-9 flex-shrink-0" aria-hidden />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-8 text-center">
          <div className="mt-4 flex w-full max-w-[320px] flex-col gap-4">
            <StatCard
              label="you've come here to:"
              value={note || '\u2014'}
              icon={<Check className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Returns made"
              value={String(returnsMade)}
              icon={<RotateCcw className="h-4 w-4" strokeWidth={1.5} />}
              onClick={() => navigate('/lofi-log')}
            />
          </div>

          <div className="mt-10 flex w-full max-w-[320px] flex-col items-center gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="name this line"
              className="w-full border-b bg-transparent pb-2 text-center text-[15px] font-light outline-none"
              style={{ borderColor: LINE, color: INK }}
            />

            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate('/lofi-preview')}
                className="px-2 py-3 text-[14px] font-medium transition-all active:scale-95"
                style={{ color: INK }}
              >
                keep going
              </button>
              <button
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => navigate('/lofi'), 400);
                }}
                disabled={saved}
                className="px-2 py-3 text-[13px] font-light transition active:scale-95 disabled:opacity-60"
                style={{ color: saved ? '#4E7D52' : '#B23B3B' }}
              >
                {saved ? <Check className="inline h-4 w-4" strokeWidth={1.5} /> : 'end session'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </LoFiFrame>
  );
}

function StatCard({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <LoFiCard onClick={onClick} className="flex w-full items-center justify-between !p-6">
      <div>
        <span
          className="block text-[11px] font-medium uppercase tracking-[0.5px]"
          style={{ color: MUTED }}
        >
          {label}
        </span>
        <span className="mt-1 block text-[22px] font-medium" style={{ color: INK }}>
          {value}
        </span>
      </div>
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ border: `1px solid ${LINE}`, color: INK }}
      >
        {icon}
      </span>
    </LoFiCard>
  );
}
