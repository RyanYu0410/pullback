import React, { useEffect, useRef, useState } from 'react';
import { Motion } from '../Motion';
import type { PresetProps } from './types';

type Phase = 'steady' | 'tension' | 'revealed';

const AMBIENT = ['in', 'the', 'grand', 'scheme', 'of', 'things'];
const AMBIENT_POS: React.CSSProperties[] = [
  { top: '11%', left: '8%' },
  { top: '11%', right: '8%' },
  { top: '46%', left: '8%' },
  { top: '46%', right: '8%' },
  { bottom: '22%', left: '8%' },
  { bottom: '22%', right: '8%' },
];

const INK = '#161616';
const PAPER = '#EFECE2';
const CARD = '#FBFAF4';
const LINE = 'rgba(22,22,22,0.28)';

const ISLAND_TEXT: Record<Phase, string> = {
  steady: 'Steady',
  tension: 'Tension',
  revealed: 'Anchored',
};
const ISLAND_DOT: Record<Phase, string> = {
  steady: 'rgba(239,236,226,0.5)',
  tension: '#E0B24A',
  revealed: PAPER,
};

/**
 * Low-fidelity / wireframe rendition of the "PULL — Intentional Interface"
 * prototype (design-4e838ba3). Same drag-to-anchor spring physics, dynamic
 * island, elastic tether and note reveal as the original — but drawn as a
 * flat, monochrome sketch (dashed frame, thin outlines, no WebGL backdrop,
 * no blur/gradients) instead of the polished glass version.
 */
export function LoFiPullPreset({ note, onAnchor }: PresetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const tetherPathRef = useRef<SVGPathElement>(null);
  const [phase, setPhase] = useState<Phase>('steady');

  const onAnchorRef = useRef(onAnchor);
  useEffect(() => {
    onAnchorRef.current = onAnchor;
  }, [onAnchor]);

  // Imperative pull-physics engine — installed once. Only the continuous,
  // per-frame values (anchor position + tether path) are pushed straight to
  // the DOM; discrete state changes (island/ambient/note/widgets) go through
  // React state since they only flip a handful of times per session.
  useEffect(() => {
    const container = containerRef.current;
    const anchor = anchorRef.current;
    const tetherPath = tetherPathRef.current;
    if (!container || !anchor || !tetherPath) return;

    let rect = container.getBoundingClientRect();
    let restY = rect.height * 0.32;
    const topOriginY = 68;

    let isDragging = false;
    let revealed = false;
    let currentY = restY;
    let targetY = restY;
    let velocityY = 0;
    let startClientY = 0;
    let startElementY = 0;
    let raf = 0;

    const STIFFNESS = 0.12;
    const DAMPING = 0.76;

    const updateTether = (yPos: number) => {
      const startX = rect.width / 2;
      const startY = topOriginY;
      const endX = rect.width / 2;
      const endY = yPos - 24;
      const cx = rect.width / 2;
      const cy = startY + (endY - startY) / 2;
      tetherPath.setAttribute('d', `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`);

      const distance = endY - startY;
      const baseDistance = Math.max(restY - topOriginY, 1);
      const stretchRatio = Math.max(1, distance / baseDistance);
      tetherPath.style.strokeWidth = `${Math.max(0.75, 1.75 - (stretchRatio - 1) * 0.9)}px`;
      tetherPath.style.stroke = stretchRatio > 1.3 && !revealed ? '#B23B3B' : INK;
    };

    anchor.style.top = `${restY}px`;
    updateTether(restY);

    const startDrag = (e: MouseEvent | TouchEvent) => {
      if (revealed) return;
      isDragging = true;
      setPhase('tension');
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      startClientY = clientY;
      startElementY = currentY;
    };

    const drag = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaY = clientY - startClientY;
      const rawY = startElementY + deltaY;
      const pullDistance = rawY - restY;

      targetY = pullDistance > 0
        ? restY + Math.log(pullDistance + 1) * 40
        : restY + pullDistance * 0.2;

      if (targetY > rect.height * 0.55 && !revealed) {
        triggerReveal();
      }
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      if (!revealed) {
        targetY = restY;
        setPhase('steady');
      }
    };

    const triggerReveal = () => {
      revealed = true;
      isDragging = false;
      targetY = rect.height + 120;
      setPhase('revealed');
    };

    const loop = () => {
      const force = (targetY - currentY) * STIFFNESS;
      velocityY = (velocityY + force) * DAMPING;
      currentY += velocityY;
      if (Math.abs(velocityY) < 0.05 && Math.abs(targetY - currentY) < 0.05) {
        currentY = targetY;
        velocityY = 0;
      }
      anchor.style.top = `${currentY}px`;
      updateTether(currentY);
      raf = requestAnimationFrame(loop);
    };

    anchor.addEventListener('mousedown', startDrag);
    anchor.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('mousemove', drag, { passive: false });
    window.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    const onResize = () => {
      rect = container.getBoundingClientRect();
      restY = rect.height * 0.32;
      if (!revealed) targetY = restY;
    };
    window.addEventListener('resize', onResize);

    raf = requestAnimationFrame(loop);

    return () => {
      anchor.removeEventListener('mousedown', startDrag);
      anchor.removeEventListener('touchstart', startDrag);
      window.removeEventListener('mousemove', drag);
      window.removeEventListener('touchmove', drag);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleRelease = () => {
    // Small beat so the "Anchored" state reads before we hand off to /save.
    setTimeout(() => onAnchorRef.current(), 350);
  };

  const faded = phase !== 'steady';
  const revealed = phase === 'revealed';

  return (
    <Motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      {/* flat vignette — a plain radial tint instead of the WebGL noise field */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, transparent 45%, rgba(22,22,22,0.05) 100%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[28px]"
        style={{ border: `1px dashed ${LINE}` }}
      />

      {AMBIENT.map((w, i) => (
        <span
          key={w}
          className="pointer-events-none absolute z-[5] text-[13px] font-bold uppercase tracking-tight transition-all duration-300"
          style={{
            ...AMBIENT_POS[i],
            opacity: revealed ? 0 : faded ? 0.35 : 0.85,
            transform: faded && !revealed ? 'translateY(-6px)' : 'none',
          }}
        >
          {w}
        </span>
      ))}

      {/* dynamic island */}
      <div className="relative z-10 flex justify-center pt-4">
        <div
          className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide transition-[width] duration-300"
          style={{ background: INK, color: PAPER, width: revealed ? '280px' : 'auto' }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
            style={{ background: ISLAND_DOT[phase] }}
          />
          <span>{ISLAND_TEXT[phase]}</span>
          {revealed && (
            <span
              className="border-l pl-2.5 text-[10px] font-normal"
              style={{ borderColor: 'rgba(239,236,226,0.3)', color: 'rgba(239,236,226,0.7)' }}
            >
              Drift detected. Pull to anchor.
            </span>
          )}
        </div>
      </div>

      {/* note reveal card */}
      <div
        className="absolute left-1/2 top-[15%] z-[4] w-[85%] max-w-[320px] rounded-[22px] p-6 transition-all duration-500"
        style={{
          background: CARD,
          border: `1px solid ${LINE}`,
          opacity: revealed ? 1 : 0,
          transform: `translate(-50%, ${revealed ? 0 : -20}px) scale(${revealed ? 1 : 0.95})`,
          pointerEvents: revealed ? 'auto' : 'none',
        }}
      >
        <div
          className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(22,22,22,0.5)' }}
        >
          <span className="h-1 w-1 rounded-full" style={{ background: INK }} />
          Current state
        </div>
        <p className="text-[22px] font-medium leading-[1.25] tracking-tight">
          {note || 'What tension are you holding that doesn\u2019t belong to you?'}
        </p>
        <div
          className="mt-6 flex items-center justify-between pt-4 text-[11px]"
          style={{ borderTop: `1px solid ${LINE}`, color: 'rgba(22,22,22,0.55)' }}
        >
          <span>Route: {revealed ? 'Anchored' : 'Disconnected'}</span>
          <button
            onClick={handleRelease}
            className="rounded-full px-4 py-2 text-[11px] font-semibold transition active:scale-95"
            style={{ border: `1px solid ${INK}`, color: INK }}
          >
            Release
          </button>
        </div>
      </div>

      {/* elastic tether */}
      <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full">
        <path ref={tetherPathRef} fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" d="M 0 0" />
      </svg>

      {/* draggable anchor */}
      <div
        ref={anchorRef}
        className="absolute left-1/2 z-[6] flex h-12 w-12 -translate-x-1/2 cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
        style={{ background: CARD, border: `1px solid ${LINE}` }}
      >
        <span
          className="absolute -top-7 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.15em] transition-opacity duration-300"
          style={{ color: 'rgba(22,22,22,0.45)', opacity: phase === 'steady' ? 1 : 0 }}
        >
          Pull to anchor
        </span>
        <span
          className="h-3 w-3 rounded-full transition-transform duration-200"
          style={{ background: INK, transform: phase === 'tension' ? 'scale(0.6)' : 'scale(1)' }}
        />
      </div>

      {/* bottom widget tray */}
      <div
        className="absolute bottom-6 left-0 z-10 flex w-full gap-3 px-6 transition-all duration-300"
        style={{ opacity: faded ? 0.4 : 1, transform: faded ? 'translateY(16px)' : 'none' }}
      >
        <WireWidget
          icon={<path d="M12 4v16m-8-8h16" strokeLinecap="round" />}
          dot="rgba(184,146,59,0.7)"
          content="Last anchor was 4 hours ago."
          sub="System note"
        />
        <WireWidget
          icon={<circle cx="12" cy="12" r="8" strokeLinecap="round" />}
          dot="rgba(22,22,22,0.35)"
          content="Breath sync is available."
          sub="Live activity"
        />
      </div>
    </Motion.div>
  );
}

function WireWidget({
  icon,
  dot,
  content,
  sub,
}: {
  icon: React.ReactNode;
  dot: string;
  content: string;
  sub: string;
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-3 rounded-[20px] p-4"
      style={{ background: CARD, border: `1px solid ${LINE}` }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ border: `1px solid ${LINE}` }}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke={INK} strokeWidth="2">
            {icon}
          </svg>
        </div>
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
      </div>
      <p className="text-[12px] font-medium leading-snug">{content}</p>
      <span
        className="text-[9px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: 'rgba(22,22,22,0.45)' }}
      >
        {sub}
      </span>
    </div>
  );
}

/** Tiny static preview rendered in Build's preset selector. */
export function LoFiPullThumbnail() {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-xl p-2"
      style={{ background: PAPER, border: `1px solid ${LINE}` }}
    >
      <div className="mt-1 h-3 w-10 rounded-full" style={{ background: INK }} />
      <svg viewBox="0 0 24 40" className="h-10 w-6">
        <path d="M 12 0 L 12 26" stroke={INK} strokeWidth="1" strokeDasharray="2 2" fill="none" />
        <circle cx="12" cy="30" r="4" fill="none" stroke={INK} strokeWidth="1" />
      </svg>
      <div className="mb-1 flex w-full gap-1">
        <div className="h-3 flex-1 rounded-[4px]" style={{ border: `1px solid ${LINE}` }} />
        <div className="h-3 flex-1 rounded-[4px]" style={{ border: `1px solid ${LINE}` }} />
      </div>
    </div>
  );
}
