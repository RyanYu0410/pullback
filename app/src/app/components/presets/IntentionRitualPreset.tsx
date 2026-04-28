import React, { useEffect, useRef, useState } from 'react';
import { Motion } from '../Motion';
import { CanvasBackground } from '../CanvasBackground';
import { cssVarsFor, type SessionStatus } from '../../design/palettes';
import type { PresetProps } from './types';

const ISLAND_TEXT: Record<SessionStatus, string> = {
  drifting: 'steady',
  checkingIn: 'tightening',
  active: 'pulling',
  ready: 'release',
  anchored: 'anchored',
  restored: 'restored',
};

const AMBIENT = ['in', 'the', 'grand', 'scheme', 'of', 'things'];
const AMBIENT_POS: React.CSSProperties[] = [
  { top: '12%', left: '10%' },
  { top: '12%', right: '10%' },
  { top: '50%', left: '10%', transform: 'translateY(-50%)' },
  { top: '50%', right: '10%', transform: 'translateY(-50%)' },
  { bottom: '24%', left: '10%' },
  { bottom: '24%', right: '10%' },
];

/**
 * "Intention Ritual" — drag a small handle along a tether to expose
 * the note input; three colored widget tiles at the bottom mirror
 * route status (clear / slight drift / drop anchor).
 */
export function IntentionRitualPreset({ status, setStatus, note, onAnchor }: PresetProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const tetherRef = useRef<SVGPathElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [text, setText] = useState(note);

  const stateRef = useRef({
    isDragging: false,
    startY: 0,
    pullY: 0,
    revealedLatched: false,
    completionTimer: 0 as number | 0,
  });

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    const s = stateRef.current;

    const updateTether = (y: number) => {
      const path = tetherRef.current;
      if (!path) return;
      // viewBox 0 0 100 400 — y maps to 0..360
      const ny = 30 + Math.min(y, 280);
      path.setAttribute('d', `M 50 0 Q 50 ${ny / 2} 50 ${ny}`);
    };

    const moveHandle = (y: number) => {
      handle.style.transform = `translate(-50%, ${y}px)`;
      updateTether(y);
    };

    const start = (e: MouseEvent | TouchEvent) => {
      s.isDragging = true;
      const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      s.startY = cy - s.pullY;
      document.body.classList.add('pull-active');
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!s.isDragging) return;
      const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const y = Math.max(0, Math.min(220, cy - s.startY));
      s.pullY = y;
      moveHandle(y);

      if (y > 130) {
        setStatus('ready');
      } else if (y > 70) {
        setStatus('active');
      } else if (y > 14) {
        setStatus('checkingIn');
      } else {
        setStatus('drifting');
      }

      if (y > 150 && !s.revealedLatched) {
        s.revealedLatched = true;
        setRevealed(true);
      }
    };

    const end = () => {
      if (!s.isDragging) return;
      s.isDragging = false;
      document.body.classList.remove('pull-active');
      if (s.pullY < 150) {
        s.pullY = 0;
        moveHandle(0);
        setStatus('drifting');
      } else {
        s.pullY = 200;
        moveHandle(200);
        setStatus('anchored');
      }
    };

    handle.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);

    moveHandle(0);

    return () => {
      handle.removeEventListener('mousedown', start);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      handle.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      if (s.completionTimer) clearTimeout(s.completionTimer);
      document.body.classList.remove('pull-active');
    };
  }, [setStatus]);

  const finish = () => {
    setStatus('anchored');
    setTimeout(onAnchor, 700);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cssVarsFor(status)}
      className="relative flex h-full w-full flex-col overflow-hidden transition-colors duration-700"
    >
      <CanvasBackground />

      {AMBIENT.map((w, i) => (
        <span
          key={w}
          className="pointer-events-none absolute z-[5] text-[11.5px] font-bold tracking-tight"
          style={{ ...AMBIENT_POS[i], color: 'var(--ink)', opacity: 0.85 }}
        >
          {w}
        </span>
      ))}

      <div className="relative z-10 flex h-full w-full flex-col">
        <div
          className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-[20px] px-3.5 py-1.5 text-[10px] font-semibold tracking-wide"
          style={{ background: 'var(--ink)', color: 'var(--bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: `0 0 6px var(--glow)` }}
          />
          {ISLAND_TEXT[status]}
        </div>

        <div className="relative mt-32 flex flex-1 flex-col items-center pointer-events-auto">
          <svg viewBox="0 0 100 400" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-full w-full">
            <path
              ref={tetherRef}
              d="M 50 0 Q 50 30 50 30"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="0.6"
              strokeLinecap="round"
            />
          </svg>

          <div
            ref={handleRef}
            className="absolute left-1/2 top-0 z-10 flex h-9 w-9 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-black/10 backdrop-blur active:cursor-grabbing"
            style={{ background: 'var(--surface)' }}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: 'var(--accent)', boxShadow: `0 0 8px var(--glow)` }} />
          </div>

          {revealed && (
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-1/2 top-[210px] z-10 w-[260px] -translate-x-1/2 rounded-2xl border border-black/10 p-4 text-left backdrop-blur"
              style={{ background: 'var(--surface)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: 'var(--ink-light)' }}
                >
                  Intention
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ink-light)' }}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: 'var(--ink)' }}>
                What is pulling you right now?
              </p>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="write to release…"
                spellCheck={false}
                className="mt-2 w-full border-b bg-transparent pb-1 text-[14px] font-light italic outline-none"
                style={{ borderColor: 'var(--ink-light)', color: 'var(--ink)' }}
              />
              <button
                onClick={finish}
                className="mt-3 w-full rounded-xl py-2 text-[12px] font-semibold transition active:scale-95"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                release
              </button>
            </Motion.div>
          )}
        </div>

        <div
          className="pointer-events-auto relative z-10 mb-6 mx-6 flex gap-3"
          style={{ borderTop: `1px solid var(--ink-light)`, paddingTop: 16 }}
        >
          <RitualTile color="green" label="Status" value="Route Clear" />
          <RitualTile color="yellow" label="Drift" value="Slight" />
          <RitualTile color="red" label="Anchor" value="Drop" />
        </div>
      </div>
    </Motion.div>
  );
}

function RitualTile({
  color,
  label,
  value,
}: {
  color: 'green' | 'yellow' | 'red';
  label: string;
  value: string;
}) {
  const dot =
    color === 'green' ? '#CDE2B8' : color === 'yellow' ? '#F9E9A9' : '#F4B3AE';
  return (
    <div
      className="flex flex-1 items-center gap-2 rounded-2xl border border-black/10 p-2.5 backdrop-blur"
      style={{ background: 'var(--surface)' }}
    >
      <span className="h-7 w-7 rounded-full" style={{ background: dot }} />
      <div className="flex flex-col">
        <span className="text-[8px] uppercase tracking-[0.05em]" style={{ color: 'var(--ink-light)' }}>
          {label}
        </span>
        <span className="text-[11px] font-medium" style={{ color: 'var(--ink)' }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function IntentionRitualThumbnail({ status = 'drifting' as SessionStatus }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-xl border border-black/10 px-2 py-2"
      style={cssVarsFor(status)}
    >
      <div className="mt-2 h-1.5 w-7 rounded-full" style={{ background: 'var(--ink)' }} />
      <div className="h-3 w-3 rounded-full" style={{ background: 'var(--accent)' }} />
      <div className="mb-1 flex w-full gap-0.5">
        <div className="h-2.5 flex-1 rounded-sm" style={{ background: '#CDE2B8' }} />
        <div className="h-2.5 flex-1 rounded-sm" style={{ background: '#F9E9A9' }} />
        <div className="h-2.5 flex-1 rounded-sm" style={{ background: '#F4B3AE' }} />
      </div>
    </div>
  );
}
