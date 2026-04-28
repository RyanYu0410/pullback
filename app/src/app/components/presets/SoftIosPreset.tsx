import React, { useState } from 'react';
import { Motion } from '../Motion';
import { CanvasBackground } from '../CanvasBackground';
import { cssVarsFor, type SessionStatus } from '../../design/palettes';
import type { PresetProps } from './types';

const ISLAND_TEXT: Record<SessionStatus, string> = {
  drifting: 'Drifting',
  checkingIn: 'Checking in',
  active: 'Pulling',
  ready: 'Ready',
  anchored: 'Anchored',
  restored: 'Restored',
};

const META_LABELS = [
  { pos: 'tl', text: 'sys.tension' },
  { pos: 'tr', text: 'drift.log' },
  { pos: 'cl', text: 'anchor' },
  { pos: 'cr', text: 'route' },
  { pos: 'bl', text: 'vol.01' },
  { pos: 'br', text: 'p.u.l.l' },
] as const;

function metaPos(pos: typeof META_LABELS[number]['pos']): React.CSSProperties {
  switch (pos) {
    case 'tl': return { top: 56, left: 16 };
    case 'tr': return { top: 56, right: 16 };
    case 'cl': return { top: '50%', left: 16, transform: 'translateY(-50%)' };
    case 'cr': return { top: '50%', right: 16, transform: 'translateY(-50%)' };
    case 'bl': return { bottom: 220, left: 16 };
    case 'br': return { bottom: 220, right: 16 };
  }
}

/**
 * "Soft iOS" widget dashboard — meta micro-labels in corners, a status
 * island, a pull-handle that reveals a "Restore Focus" prompt, and two
 * data widgets at the bottom (current drift / last anchor).
 */
export function SoftIosPreset({ status, setStatus, note, onAnchor }: PresetProps) {
  const [revealed, setRevealed] = useState(false);

  const handleRevealStart = () => {
    if (revealed) return;
    setStatus('checkingIn');
    setRevealed(true);
  };

  const handleRestore = () => {
    setStatus('active');
    setTimeout(() => setStatus('ready'), 350);
    setTimeout(() => setStatus('anchored'), 700);
    setTimeout(onAnchor, 1300);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cssVarsFor(status)}
      className="relative flex h-full w-full flex-col overflow-hidden transition-colors duration-700"
    >
      <CanvasBackground speed={0.5} showAccent={false} />

      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col px-6 pb-8 pt-4">
        {META_LABELS.map((m) => (
          <span
            key={m.text}
            className="absolute text-[11px] font-bold tracking-tight"
            style={{
              ...metaPos(m.pos),
              color: 'var(--ink-light)',
              opacity: 0.7,
              mixBlendMode: 'overlay',
            }}
          >
            {m.text}
          </span>
        ))}

        <div
          className="pointer-events-auto mx-auto mt-3 flex items-center gap-2 self-center rounded-full border border-black/10 px-4 py-2 text-[12px] font-semibold backdrop-blur"
          style={{ background: 'var(--surface)', color: 'var(--ink)' }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: `0 0 8px var(--glow)` }}
          />
          {ISLAND_TEXT[status]}
        </div>

        <div className="pointer-events-auto flex flex-1 items-center justify-center">
          <div
            onClick={handleRevealStart}
            className={`relative flex w-[260px] cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-[28px] border border-black/10 px-6 py-7 text-center backdrop-blur transition-all duration-500 ${
              revealed ? 'scale-100' : 'hover:scale-[1.02] active:scale-95'
            }`}
            style={{ background: 'var(--surface)' }}
          >
            {!revealed ? (
              <>
                <span
                  className="text-[11px] uppercase tracking-[0.2em]"
                  style={{ color: 'var(--ink-light)' }}
                >
                  pull to check in
                </span>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--ink)' }}>
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </>
            ) : (
              <Motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--ink)' }}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <p className="font-serif text-[15px] italic leading-snug" style={{ color: 'var(--ink)' }}>
                  Are you acting from intention,
                  <br />
                  or simply reacting?
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore();
                  }}
                  className="mt-1 rounded-full border px-5 py-2 text-[12px] font-semibold transition active:scale-95"
                  style={{
                    borderColor: 'var(--accent)',
                    color: 'var(--accent)',
                    background: 'transparent',
                  }}
                >
                  Restore Focus
                </button>
              </Motion.div>
            )}
          </div>
        </div>

        <div className="pointer-events-auto grid grid-cols-2 gap-3">
          <DataWidget
            title="Current Drift"
            tag="Warning"
            tagTone="rose"
            value={revealed ? '12' : '48'}
            unit="m"
            sub={revealed ? 'returning to anchor' : 'rapidly diverging'}
            escalating={!revealed}
          />
          <DataWidget
            title="Last Anchor"
            tag="Logged"
            tagTone="sky"
            valueText={note ? `"${note}"` : '"Read, don\'t scroll."'}
            sub="2 hours ago"
          />
        </div>
      </div>
    </Motion.div>
  );
}

function DataWidget({
  title,
  tag,
  tagTone,
  value,
  unit,
  valueText,
  sub,
  escalating,
}: {
  title: string;
  tag: string;
  tagTone: 'rose' | 'sky';
  value?: string;
  unit?: string;
  valueText?: string;
  sub: string;
  escalating?: boolean;
}) {
  const tagBg = tagTone === 'rose' ? 'rgba(253,234,234,0.9)' : 'rgba(234,244,253,0.9)';
  const tagFg = tagTone === 'rose' ? '#C45555' : '#5587C4';
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-black/10 p-4 backdrop-blur"
      style={{ background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </span>
        <span
          className="rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
          style={{ background: tagBg, color: tagFg }}
        >
          {tag}
        </span>
      </div>
      {valueText ? (
        <span
          className="font-serif text-[14px] italic leading-tight"
          style={{ color: 'var(--ink)' }}
        >
          {valueText}
        </span>
      ) : (
        <span
          className={`text-[24px] font-medium tracking-tight ${escalating ? 'animate-pulse' : ''}`}
          style={{ color: escalating ? 'var(--accent)' : 'var(--ink)' }}
        >
          {value}
          {unit && (
            <span className="ml-0.5 text-[14px] opacity-50">{unit}</span>
          )}
        </span>
      )}
      <span className="text-[11px]" style={{ color: 'var(--ink-light)' }}>
        {sub}
      </span>
    </div>
  );
}

export function SoftIosThumbnail({ status = 'drifting' as SessionStatus }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-xl border border-black/10 px-2 py-2"
      style={cssVarsFor(status)}
    >
      <span className="absolute left-1 top-1 text-[5px] font-bold opacity-60">sys</span>
      <span className="absolute right-1 top-1 text-[5px] font-bold opacity-60">log</span>
      <div className="mt-2 h-1.5 w-9 rounded-full" style={{ background: 'var(--surface)' }} />
      <div
        className="rounded-md border border-black/10 px-2 py-1 text-[6px] uppercase tracking-widest"
        style={{ background: 'var(--surface)' }}
      >
        pull
      </div>
      <div className="mb-1 flex w-full gap-0.5">
        <div className="h-3.5 flex-1 rounded-sm border border-black/10" style={{ background: 'var(--surface)' }} />
        <div className="h-3.5 flex-1 rounded-sm border border-black/10" style={{ background: 'var(--surface)' }} />
      </div>
    </div>
  );
}
