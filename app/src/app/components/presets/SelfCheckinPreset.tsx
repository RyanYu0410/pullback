import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Motion } from '../Motion';
import { CanvasBackground } from '../CanvasBackground';
import { cssVarsFor, type SessionStatus } from '../../design/palettes';
import { useAppContext } from '../../context/AppContext';
import type { PresetProps } from './types';

const MAX_PULL = 200;
const REVEAL_THRESHOLD = 80;

// Quadratic bezier control points
//  drifting → string is curved & retracted, screen dark
//  anchored → string is taut & centered, screen bright
const RETRACTED = { x: 74, y: 16 };
const EXTENDED  = { x: 50, y: 50 };

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function SelfCheckinPreset({ status, setStatus, note, onAnchor }: PresetProps) {
  const navigate = useNavigate();
  const { routeItems, sessionStartTime, setSessionStartTime, bgStyle, incrementReturns } = useAppContext();

  const pullZoneRef   = useRef<HTMLDivElement>(null);
  const stringPathRef = useRef<SVGPathElement>(null);
  const stringKnotRef = useRef<SVGCircleElement>(null);
  const noteRef       = useRef<HTMLDivElement>(null);
  const veilRef       = useRef<HTMLDivElement>(null);

  // sessionStartTime !== null means an active session exists even if the
  // status prop hasn't been synced from Pull.tsx's useEffect yet.
  const isAnchored = status === 'anchored' || sessionStartTime !== null;

  // ---- Live timer (computed from wall-clock so it survives page navigation) ----
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (sessionStartTime === null) return;
    const tick = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [sessionStartTime]);
  const elapsed = sessionStartTime !== null
    ? Math.floor((Date.now() - sessionStartTime) / 1000)
    : 0;

  // Refs for callbacks that imperative listeners need fresh access to
  const onAnchorRef       = useRef(onAnchor);
  const setStatusRef      = useRef(setStatus);
  const setStartTimeRef   = useRef(setSessionStartTime);
  useEffect(() => { onAnchorRef.current     = onAnchor; },          [onAnchor]);
  useEffect(() => { setStatusRef.current    = setStatus; },         [setStatus]);
  useEffect(() => { setStartTimeRef.current = setSessionStartTime; }, [setSessionStartTime]);

  // ---- Visual sync: when status changes (from outside or our own actions),
  //      snap the visuals to match (string base, veil, note card). ----
  const syncVisualsRef = useRef<((status: 'anchored' | 'drifting', animate?: boolean) => void) | null>(null);
  useEffect(() => {
    const s: 'anchored' | 'drifting' = (status === 'anchored' || sessionStartTime !== null) ? 'anchored' : 'drifting';
    syncVisualsRef.current?.(s, true);
  }, [status, sessionStartTime]);

  // ---- Imperative pull/spring engine — installed once ----
  useEffect(() => {
    const pullZone = pullZoneRef.current;
    if (!pullZone) return;

    const initialStatus: 'anchored' | 'drifting' =
      (status === 'anchored' || sessionStartTime !== null) ? 'anchored' : 'drifting';

    const state = {
      isDragging:    false,
      startY:        0,
      pullDistance:  0,
      currentStatus: initialStatus as 'anchored' | 'drifting', // mirror of prop, kept in sync
      spring:   { ...RETRACTED },
      target:   { ...RETRACTED },
      velocity: { x: 0, y: 0 },
      animFrame: 0 as number,
    };

    const tension   = 0.16;
    const dampening = 0.78;

    const updateString = () => {
      const path = stringPathRef.current;
      const knot = stringKnotRef.current;
      if (!path || !knot) return;
      const knotY = Math.min(state.spring.y + 14, 95);
      path.setAttribute('d', `M 50 0 Q ${state.spring.x} ${state.spring.y} 50 ${knotY}`);
      knot.setAttribute('cy', String(knotY));
    };

    const setVeil = (opacity: number, smooth = false) => {
      const el = veilRef.current;
      if (!el) return;
      el.style.transition = smooth ? 'opacity 0.4s ease' : 'none';
      el.style.opacity = String(opacity);
    };

    const setNoteVisible = (visible: boolean, progress = visible ? 1 : 0) => {
      const noteEl = noteRef.current;
      if (!noteEl) return;
      noteEl.style.opacity = String(progress);
      noteEl.style.transform = `translateX(-50%) translateY(${-20 + progress * 20}px) scale(${0.95 + progress * 0.05})`;
      if (visible) noteEl.classList.add('note-revealed');
      else         noteEl.classList.remove('note-revealed');
    };

    const loop = () => {
      const dx = state.target.x - state.spring.x;
      const dy = state.target.y - state.spring.y;
      state.velocity.x = (state.velocity.x + dx * tension) * dampening;
      state.velocity.y = (state.velocity.y + dy * tension) * dampening;
      state.spring.x += state.velocity.x;
      state.spring.y += state.velocity.y;
      updateString();
      if (
        Math.abs(state.velocity.x) < 0.04 &&
        Math.abs(state.velocity.y) < 0.04 &&
        Math.abs(dx) < 0.04 &&
        Math.abs(dy) < 0.04
      ) {
        state.spring.x = state.target.x;
        state.spring.y = state.target.y;
        updateString();
        state.animFrame = 0;
      } else {
        state.animFrame = requestAnimationFrame(loop);
      }
    };

    const startSpring = () => {
      if (!state.animFrame) state.animFrame = requestAnimationFrame(loop);
    };

    // Sync to a status — sets string target, veil, note in one move
    const syncTo = (newStatus: 'anchored' | 'drifting', animate = true) => {
      state.currentStatus = newStatus;
      if (newStatus === 'anchored') {
        state.target.x = EXTENDED.x;
        state.target.y = EXTENDED.y;
        setVeil(0, true);   // smooth fade to bright
        setNoteVisible(true);
      } else {
        state.target.x = RETRACTED.x;
        state.target.y = RETRACTED.y;
        setVeil(1, animate); // smooth fade to dark when animated
        setNoteVisible(false);
      }
      if (animate) {
        startSpring();
      } else {
        state.spring.x = state.target.x;
        state.spring.y = state.target.y;
        state.velocity.x = 0;
        state.velocity.y = 0;
        updateString();
      }
    };
    syncVisualsRef.current = syncTo;

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      state.isDragging = true;
      state.startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      document.body.classList.add('pull-active');
      if (state.animFrame) { cancelAnimationFrame(state.animFrame); state.animFrame = 0; }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!state.isDragging) return;
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaY = Math.max(0, clientY - state.startY);
      state.pullDistance = MAX_PULL * (1 - Math.exp(-deltaY / MAX_PULL));

      // t: 0 = retracted/dark/slack, 1 = taut/bright
      const t = Math.min(state.pullDistance / REVEAL_THRESHOLD, 1);

      // Live override of string target during drag
      const baseFrom = state.currentStatus === 'anchored' ? EXTENDED : RETRACTED;
      const baseTo   = state.currentStatus === 'anchored' ? EXTENDED : EXTENDED;
      // Anchored already starts taut; pulling further just stretches it slightly past
      const stretch = state.currentStatus === 'anchored' ? Math.min(state.pullDistance * 0.05, 8) : 0;
      state.target.x = baseFrom.x + (baseTo.x - baseFrom.x) * t;
      state.target.y = (baseFrom.y + (baseTo.y - baseFrom.y) * t) + stretch;
      state.spring.x = state.target.x;
      state.spring.y = state.target.y;
      updateString();

      // Veil only changes when transitioning from drifting → anchored
      if (state.currentStatus === 'drifting') {
        setVeil(Math.max(0, 1 - t * 1.1));
        if (state.pullDistance > 30) {
          const np = Math.min((state.pullDistance - 30) / (REVEAL_THRESHOLD - 30), 1);
          setNoteVisible(np > 0, np);
        }
      }
    };

    const onEnd = () => {
      if (!state.isDragging) return;
      state.isDragging = false;
      document.body.classList.remove('pull-active');

      const reachedThreshold = state.pullDistance >= REVEAL_THRESHOLD;

      if (state.currentStatus === 'drifting' && reachedThreshold) {
        // Transition: drifting → anchored. Commits status + starts the timer.
        setStartTimeRef.current(Date.now());
        setStatusRef.current('anchored');
        // syncVisualsRef will be triggered by the status effect — but also
        // pre-snap here for instant feedback (no flicker).
        syncTo('anchored', true);
      } else {
        // Bounce back to current status's resting position with a playful overshoot.
        // The damped spring gives a natural twang.
        syncTo(state.currentStatus, true);
      }

      state.pullDistance = 0;
    };

    pullZone.addEventListener('mousedown',  onStart, { passive: false });
    pullZone.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove',  onMove, { passive: false });
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',    onEnd);
    window.addEventListener('touchend',   onEnd);

    // Initial sync without animation — use the pre-computed initial status
    syncTo(initialStatus, false);

    return () => {
      pullZone.removeEventListener('mousedown',  onStart);
      pullZone.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',    onEnd);
      window.removeEventListener('touchend',   onEnd);
      if (state.animFrame) cancelAnimationFrame(state.animFrame);
      document.body.classList.remove('pull-active');
    };
  }, []);

  // ---- Button actions ----
  const handleComeBack = () => {
    // Pause: timer keeps running, count this return, navigate to /save
    incrementReturns();
    navigate('/save');
  };
  const handleComplete = () => {
    // Finish: stop timer, commit anchor (call onAnchor which navigates to /save & flips status)
    setSessionStartTime(null);
    setStatus('drifting');
    onAnchorRef.current();
  };
  const handleExit = () => {
    // Abandon: clear session entirely
    setSessionStartTime(null);
    setStatus('drifting');
    navigate('/');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cssVarsFor(status)}
      className="relative flex h-full w-full flex-col overflow-hidden transition-colors duration-700"
    >
      {/* Full-screen canvas — extends above the parent's pt-12 so it covers
          the device-notch strip at the very top. */}
      <div className="pointer-events-none absolute -top-12 bottom-0 left-0 right-0 z-0">
        <CanvasBackground bgStyle={bgStyle} tint={false} />
      </div>

      {/* Full-screen dark veil — same upward extension so the dark wash blankets
          everything, including the notch area. Initial opacity matches isAnchored
          so there's no flash; after mount the imperative engine owns the opacity. */}
      <div
        ref={veilRef}
        className="pointer-events-none absolute -top-12 bottom-0 left-0 right-0 z-[50]"
        style={{ background: 'rgba(0,0,0,0.65)', opacity: isAnchored ? 0 : 1 }}
      />

      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col">
        {/* Dynamic island — single source of truth: shows status */}
        <header className="pointer-events-auto flex flex-shrink-0 items-center justify-center px-6 pt-3">
          <div
            className="flex items-center gap-3 rounded-full px-4 py-2 text-[13px] font-medium backdrop-blur transition-all duration-500"
            style={{
              background: isAnchored ? 'rgba(20,20,20,0.88)' : 'rgba(20,20,20,0.85)',
              color: '#ffffff',
              boxShadow: isAnchored
                ? '0 4px 24px rgba(58, 74, 56, 0.35)'
                : '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full transition-all duration-500"
              style={{
                background: 'var(--accent)',
                boxShadow: `0 0 ${isAnchored ? 12 : 4}px var(--glow)`,
              }}
            />
            {isAnchored ? (
              <span className="font-mono text-[13px] tabular-nums opacity-90">
                {formatElapsed(elapsed)}
              </span>
            ) : (
              <span className="opacity-75">pull to start</span>
            )}
          </div>
        </header>

        {/* Pull zone */}
        <div
          ref={pullZoneRef}
          className="relative flex flex-1 cursor-grab pointer-events-auto active:cursor-grabbing select-none"
        >
          {/* Dashed guide rails */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="10" y1="0" x2="10" y2="100" stroke="#7d7468" strokeWidth="0.5" strokeDasharray="2 5" opacity="0.35" />
            <line x1="90" y1="0" x2="90" y2="100" stroke="#7d7468" strokeWidth="0.5" strokeDasharray="1 7" opacity="0.25" />
          </svg>

          {/* Elastic string */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              ref={stringPathRef}
              d={`M 50 0 Q ${RETRACTED.x} ${RETRACTED.y} 50 ${RETRACTED.y + 14}`}
              fill="none"
              stroke="#3a4a38"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle ref={stringKnotRef} cx="50" cy={RETRACTED.y + 14} r="1.5" fill="#3a4a38" />
          </svg>

          {/* Note + route checklist card — dark text on light frosted glass */}
          <div
            ref={noteRef}
            className="absolute left-1/2 top-[110px] z-20 w-[260px] rounded-[6px] border border-black/10 p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur"
            style={{
              opacity: 0,
              transform: 'translateX(-50%) translateY(-20px) scale(0.95)',
              backgroundColor: 'rgba(255,255,255,0.55)',
              transition: 'opacity 0.1s linear, transform 0.1s linear',
            }}
          >
            <p className="font-serif text-[18px] italic leading-snug tracking-[-0.3px] text-stone-800">
              "{note || 'You are here. Everything else can wait.'}"
            </p>
            {routeItems.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5 text-left">
                {routeItems.map((item, i) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-stone-800 text-[8px] font-medium text-white"
                    >
                      {i + 1}
                    </span>
                    <span className="break-words text-[11px] font-light leading-snug text-stone-600">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom dark frosted tray */}
        <div
          className="pointer-events-auto relative z-[60] mx-3 mb-3 flex flex-col gap-3 rounded-3xl px-3 py-3 backdrop-blur-xl"
          style={{
            background: 'rgba(30, 30, 30, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          }}
        >
          {/* Buttons — exit always available; come back + complete appear after session starts */}
          <div className="flex items-stretch gap-2">
            <button
              onClick={handleExit}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl transition active:scale-95"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
              aria-label="Exit"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M12 4 L4 4 L4 16 L12 16" />
                <path d="M9 10 L17 10" />
                <path d="M14 7 L17 10 L14 13" />
              </svg>
            </button>
            {isAnchored && (
              <>
                <button
                  onClick={handleComeBack}
                  className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-light tracking-wide transition active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <rect x="6" y="5" width="3" height="10" rx="0.5" />
                    <rect x="11" y="5" width="3" height="10" rx="0.5" />
                  </svg>
                  come back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl transition active:scale-95"
                  style={{ background: '#ffffff', color: '#1a1a1a' }}
                  aria-label="Complete"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 10 8 14 16 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Motion.div>
  );
}


/** Tiny static preview rendered in Build's preset selector. */
export function SelfCheckinThumbnail({ status = 'drifting' as SessionStatus }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-xl border border-black/10 px-2 py-2"
      style={cssVarsFor(status)}
    >
      <span className="text-[7px] tracking-widest uppercase opacity-70">drift</span>
      <svg viewBox="0 0 24 40" className="h-12 w-6">
        <path d="M 12 0 Q 12 20 12 32" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <circle cx="12" cy="32" r="1.4" fill="currentColor" />
      </svg>
      <div className="flex w-full gap-1">
        <div className="h-2 flex-1 rounded-sm" style={{ background: 'var(--surface)' }} />
        <div className="h-2 flex-1 rounded-sm" style={{ background: 'var(--surface)' }} />
      </div>
    </div>
  );
}
