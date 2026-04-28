import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { CanvasBackground } from './CanvasBackground';
import { cssVarsFor } from '../design/palettes';
import { Check, RotateCcw } from 'lucide-react';

/**
 * Reflection / save-the-line screen.  On mount we transition into
 * `restored` so the screen tints to the closing palette (black + neon
 * green from the e59f88a3 design).  Saving the route persists the
 * current draft and returns to Home — the WidgetSetup hop has been
 * removed.
 */
export function Save() {
  const navigate = useNavigate();
  const {
    note,
    saveCurrentRoute,
    sessionStatus,
    setSessionStatus,
    setSessionStartTime,
    returnsMade,
    bgStyle,
  } = useAppContext();
  const defaultName = note ? note.split(/\s+/).slice(0, 3).join(' ') : 'Evening route';
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSessionStatus('restored');
  }, [setSessionStatus]);

  const handleSave = () => {
    saveCurrentRoute(name.trim() || defaultName);
    setSessionStartTime(null);
    setSessionStatus('drifting');
    setSaved(true);
    navigate('/');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cssVarsFor(sessionStatus)}
      className="relative flex h-full w-full flex-col overflow-hidden transition-colors duration-700"
    >
      {/* Extend above the outlet's pt-12 so the canvas reaches the notch */}
      <div className="pointer-events-none absolute -top-12 bottom-0 left-0 right-0">
        <CanvasBackground speed={0.5} showAccent={false} bgStyle={bgStyle} tint={false} />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="flex flex-shrink-0 items-center justify-center px-6 pt-3">
          <div
            className="flex items-center gap-3 rounded-full px-4 py-2 text-[13px] font-medium backdrop-blur"
            style={{
              background: 'rgba(20,20,20,0.85)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--accent)', boxShadow: `0 0 8px var(--glow)` }}
            />
            <span className="opacity-90">Session complete</span>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-8 text-center">
          <div className="flex w-full max-w-[320px] flex-col gap-4 mt-4">
            <StatCard
              label="you've come here to:"
              value={note || '—'}
              icon={<Check className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Returns made"
              value={String(returnsMade)}
              icon={<RotateCcw className="h-4 w-4" strokeWidth={1.5} />}
              onClick={() => navigate('/log')}
            />
          </div>

          <div className="mt-10 flex w-full max-w-[320px] flex-col items-center gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="name this line"
              className="w-full border-b border-stone-400 bg-transparent pb-2 text-center text-[15px] font-light text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-700"
            />

            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate('/pull')}
                className="px-2 py-3 text-[14px] font-medium text-stone-800 transition-all active:scale-95"
              >
                keep going
              </button>
              <button
                onClick={handleSave}
                disabled={saved}
                className="px-2 py-3 text-[13px] font-light transition active:scale-95 disabled:opacity-60"
                style={{ color: saved ? 'var(--accent)' : '#c0392b' }}
              >
                {saved ? (
                  <Check className="h-4 w-4 inline" strokeWidth={1.5} />
                ) : (
                  'end session'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Motion.div>
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
  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[20px] border border-black/10 p-6 text-left backdrop-blur transition-transform ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
      style={{ background: 'rgba(255,255,255,0.55)' }}
    >
      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-stone-500">
          {label}
        </span>
        <span className="mt-1 block font-serif text-[24px] text-stone-800">
          {value}
        </span>
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/60 text-stone-600">
        {icon}
      </span>
    </Wrapper>
  );
}
