import React, { useState } from 'react';
import { Motion } from '../Motion';
import { CanvasBackground } from '../CanvasBackground';
import { cssVarsFor, type SessionStatus } from '../../design/palettes';
import type { PresetProps } from './types';

const ISLAND_TEXT: Record<SessionStatus, string> = {
  drifting: 'steady route',
  checkingIn: 'checking in',
  active: 'holding intention',
  ready: 'release to anchor',
  anchored: 'anchored',
  restored: 'restored',
};

const EMOTIONS: { id: SessionStatus; label: string; tint: string }[] = [
  { id: 'drifting', label: 'Holding steady', tint: 'rgba(204,224,197,0.7)' },
  { id: 'checkingIn', label: 'Drifting away', tint: 'rgba(245,230,186,0.7)' },
  { id: 'ready', label: 'Tension high', tint: 'rgba(242,196,196,0.7)' },
  { id: 'active', label: 'Need a pause', tint: 'rgba(179,215,235,0.7)' },
];

const AMBIENT_WORDS = ['in', 'the', 'grand', 'scheme', 'of', 'things'];
const AMBIENT_POS = [
  { top: '10%', left: '10%' },
  { top: '10%', right: '12%' },
  { top: '48%', left: '10%' },
  { top: '48%', right: '10%' },
  { bottom: '20%', left: '10%' },
  { bottom: '20%', right: '12%' },
] as const;

/** Paper-on-ink dashboard with ambient words and an emotion-grid check-in. */
export function IntentionalInterfacePreset({ status, setStatus, note, onAnchor }: PresetProps) {
  const [open, setOpen] = useState(false);

  const handlePullClick = () => {
    if (open) return;
    setStatus('checkingIn');
    setOpen(true);
  };

  const choose = (next: SessionStatus) => {
    setStatus(next);
    setTimeout(() => {
      setStatus('anchored');
      setTimeout(onAnchor, 700);
    }, 400);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cssVarsFor(status)}
      className="relative flex h-full w-full flex-col overflow-hidden transition-colors duration-700"
    >
      <CanvasBackground speed={0.6} />

      {/* Ambient corner words — the "in the grand scheme of things" type */}
      {AMBIENT_WORDS.map((w, i) => (
        <span
          key={w}
          className="pointer-events-none absolute z-[5] text-[14px] font-bold tracking-tight"
          style={{
            ...AMBIENT_POS[i],
            color: 'var(--ink)',
            mixBlendMode: 'overlay',
            opacity: open ? 0 : 0.65,
            transition: 'opacity 0.5s ease',
          }}
        >
          {w}
        </span>
      ))}

      <div className="relative z-10 flex h-full w-full flex-col items-center">
        <div
          className="mt-4 flex h-8 items-center gap-2 rounded-full px-4 text-[12px] font-medium tracking-wide"
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: `0 0 6px var(--glow)` }}
          />
          {ISLAND_TEXT[status]}
        </div>

        <div className="mt-16 flex flex-1 flex-col items-center justify-start">
          <button
            onClick={handlePullClick}
            disabled={open}
            className="group flex flex-col items-center gap-3 rounded-3xl border border-black/10 px-7 py-6 backdrop-blur transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--surface)' }}
          >
            <span
              className="font-serif text-[22px] italic leading-tight"
              style={{ color: 'var(--ink)' }}
            >
              "{note || 'You are here.'}"
            </span>
            <span
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ color: 'var(--ink-light)' }}
            >
              {open ? 'choose your drift' : 'pull to check in'}
            </span>
            {!open && (
              <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-active:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            )}
          </button>

          {open && (
            <Motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 grid w-full max-w-[320px] grid-cols-2 gap-3 px-6"
            >
              {EMOTIONS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => choose(e.id)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-black/10 p-3 text-left backdrop-blur transition active:scale-[0.98]"
                  style={{ background: 'var(--surface)' }}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: e.tint }} />
                  <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
                    {e.label}
                  </span>
                </button>
              ))}
            </Motion.div>
          )}
        </div>
      </div>
    </Motion.div>
  );
}

export function IntentionalInterfaceThumbnail({ status = 'drifting' as SessionStatus }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-xl border border-black/10 px-2 py-2"
      style={cssVarsFor(status)}
    >
      <span className="absolute left-1.5 top-1.5 text-[6px] font-bold opacity-60">in</span>
      <span className="absolute right-1.5 top-1.5 text-[6px] font-bold opacity-60">the</span>
      <span className="absolute bottom-1.5 left-1.5 text-[6px] font-bold opacity-60">of</span>
      <span className="absolute bottom-1.5 right-1.5 text-[6px] font-bold opacity-60">things</span>
      <div className="mt-2 h-1.5 w-8 rounded-full" style={{ background: 'var(--ink)' }} />
      <div
        className="rounded-md border border-black/10 px-2 py-1 text-[7px] italic"
        style={{ background: 'var(--surface)' }}
      >
        you are here
      </div>
      <div className="mb-1 grid grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-2 w-3 rounded-sm" style={{ background: 'var(--surface)' }} />
        ))}
      </div>
    </div>
  );
}
