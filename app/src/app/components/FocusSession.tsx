import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { CanvasBackground } from './CanvasBackground';
import { BellSVG } from './PullBell';
import { RoomScene } from './RoomScene';
import { RoomChatter } from './RoomChatter';
import { Coffee, CheckCircle2, Users, X } from 'lucide-react';

const MAX_PULL = 200;
const REVEAL_THRESHOLD = 80;

const RETRACTED = { x: 74, y: 16 };
const EXTENDED  = { x: 50, y: 50 };

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Friendly focus-session screen.
 *
 * - Before start: a big pull-string ("Pull to Start") with a darkened veil.
 *   Tugging it past the threshold starts the timer + brightens the screen
 *   (the same elastic engine from `SelfCheckinPreset`, retained because the
 *   user wanted the pull metaphor maximised).
 * - During session: each task card gets its own tiny pull-tag. Drag the
 *   tag down to mark "I Finished This".
 * - Bottom: friendly rounded buttons for Take a Break / Done for Today,
 *   plus a floating Friends strip up top so studying never feels lonely.
 */
export function FocusSession() {
  const navigate = useNavigate();
  const {
    routine,
    routeItems,
    completedIds,
    toggleCompleted,
    sessionStartTime,
    setSessionStartTime,
    setSessionStatus,
    setIsLinePulled,
    bgStyle,
    updateMyStatus,
    sendWaveTo,
    saveCurrentRoute,
  } = useAppContext();

  const isAnchored = sessionStartTime !== null;

  /* Live timer */
  const [, force] = useState(0);
  useEffect(() => {
    if (sessionStartTime === null) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [sessionStartTime]);
  const elapsed = sessionStartTime !== null ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  const minutesLeft = Math.max(
    0,
    routine.focusMinutes - Math.floor(elapsed / 60),
  );

  /* Pull-string engine — same shape as SelfCheckinPreset. The bell is a
     separate DOM element that follows the string's knot endpoint, since
     the string SVG uses preserveAspectRatio="none" and would warp any
     bell paths drawn inside it. */
  const pullZoneRef   = useRef<HTMLDivElement>(null);
  const stringPathRef = useRef<SVGPathElement>(null);
  const bellWrapRef   = useRef<HTMLDivElement>(null);
  const veilRef       = useRef<HTMLDivElement>(null);

  const startSessionRef = useRef(() => {});
  startSessionRef.current = () => {
    setSessionStartTime(Date.now());
    setSessionStatus('anchored');
    setIsLinePulled(true);
    updateMyStatus('focusing', { subject: routine.subjects[0] });
  };

  useEffect(() => {
    const pullZone = pullZoneRef.current;
    if (!pullZone) return;

    const initialAnchored = sessionStartTime !== null;

    const state = {
      isDragging:    false,
      startY:        0,
      pullDistance:  0,
      anchored:      initialAnchored,
      spring:   { ...RETRACTED },
      target:   { ...RETRACTED },
      velocity: { x: 0, y: 0 },
      animFrame: 0 as number,
    };

    const updateString = () => {
      const path = stringPathRef.current;
      const bell = bellWrapRef.current;
      if (!path) return;
      const knotY = Math.min(state.spring.y + 14, 95);
      path.setAttribute('d', `M 50 0 Q ${state.spring.x} ${state.spring.y} 50 ${knotY}`);
      // The string SVG covers the pull zone with viewBox 0..100. The
      // bell wrapper lives in the same coordinate space (percent-based)
      // so setting `top: ${knotY}%` keeps the bell hanging from the
      // string's tip.
      if (bell) bell.style.top = `${knotY}%`;
    };
    const setVeil = (op: number, smooth = false) => {
      const el = veilRef.current;
      if (!el) return;
      el.style.transition = smooth ? 'opacity 0.4s ease' : 'none';
      el.style.opacity = String(op);
    };
    const loop = () => {
      const dx = state.target.x - state.spring.x;
      const dy = state.target.y - state.spring.y;
      state.velocity.x = (state.velocity.x + dx * 0.16) * 0.78;
      state.velocity.y = (state.velocity.y + dy * 0.16) * 0.78;
      state.spring.x += state.velocity.x;
      state.spring.y += state.velocity.y;
      updateString();
      if (Math.abs(state.velocity.x) < 0.05 && Math.abs(state.velocity.y) < 0.05 &&
          Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        state.spring = { ...state.target };
        updateString();
        state.animFrame = 0;
      } else {
        state.animFrame = requestAnimationFrame(loop);
      }
    };
    const startSpring = () => {
      if (!state.animFrame) state.animFrame = requestAnimationFrame(loop);
    };
    const syncTo = (anchored: boolean, animate = true) => {
      state.anchored = anchored;
      if (anchored) {
        state.target = { ...EXTENDED };
        setVeil(0, true);
      } else {
        state.target = { ...RETRACTED };
        setVeil(1, animate);
      }
      if (animate) startSpring();
      else { state.spring = { ...state.target }; updateString(); }
    };

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
      const t = Math.min(state.pullDistance / REVEAL_THRESHOLD, 1);
      const baseFrom = state.anchored ? EXTENDED : RETRACTED;
      const baseTo   = EXTENDED;
      const stretch  = state.anchored ? Math.min(state.pullDistance * 0.05, 8) : 0;
      state.target.x = baseFrom.x + (baseTo.x - baseFrom.x) * t;
      state.target.y = (baseFrom.y + (baseTo.y - baseFrom.y) * t) + stretch;
      state.spring   = { ...state.target };
      updateString();
      if (!state.anchored) setVeil(Math.max(0, 1 - t * 1.1));
    };
    const onEnd = () => {
      if (!state.isDragging) return;
      state.isDragging = false;
      document.body.classList.remove('pull-active');
      if (!state.anchored && state.pullDistance >= REVEAL_THRESHOLD) {
        startSessionRef.current();
        syncTo(true, true);
      } else {
        syncTo(state.anchored, true);
      }
      state.pullDistance = 0;
    };

    pullZone.addEventListener('mousedown',  onStart, { passive: false });
    pullZone.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove',  onMove, { passive: false });
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',    onEnd);
    window.addEventListener('touchend',   onEnd);

    syncTo(initialAnchored, false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-sync visuals if status changes (e.g. coming back from /break). */
  useEffect(() => {
    if (sessionStartTime !== null) {
      const el = veilRef.current;
      if (el) { el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '0'; }
    }
  }, [sessionStartTime]);

  /* Actions */
  const handleBreak = () => {
    updateMyStatus('on_break');
    navigate('/break');
  };
  const handleDone = () => {
    saveCurrentRoute(`After-school plan ${new Date().toLocaleDateString()}`);
    updateMyStatus('finished');
    setSessionStatus('restored');
    setSessionStartTime(null);
    navigate('/done');
  };
  const handleExit = () => {
    setSessionStartTime(null);
    setSessionStatus('drifting');
    updateMyStatus('offline');
    navigate('/welcome');
  };

  const total = routeItems.length;
  const completedCount = completedIds.length;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col overflow-hidden"
    >
      {/* Canvas — extends above the parent's pt-12 to cover the notch. */}
      <div className="pointer-events-none absolute -top-12 bottom-0 left-0 right-0 z-0">
        <CanvasBackground bgStyle={bgStyle} tint={false} />
      </div>

      {/* Dark veil — fades out when anchored. */}
      <div
        ref={veilRef}
        className="pointer-events-none absolute -top-12 bottom-0 left-0 right-0 z-[5]"
        style={{ background: 'rgba(20, 18, 30, 0.55)', opacity: isAnchored ? 0 : 1 }}
      />

      <div className="relative z-10 flex h-full w-full flex-col">
        {/* Header pill */}
        <header className="flex flex-shrink-0 items-center justify-between gap-2 px-4 pt-3">
          <button
            onClick={handleExit}
            aria-label="Exit"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-stone-600 shadow-sm transition active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold backdrop-blur"
            style={{
              background: isAnchored ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.85)',
              color: '#3a3c38',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isAnchored ? 'bg-emerald-500' : 'bg-rose-400'}`} />
            {isAnchored ? (
              <>
                <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
                <span className="text-stone-400">·</span>
                <span>{minutesLeft}m left</span>
              </>
            ) : (
              <span>Pull the bell to start</span>
            )}
          </div>
          <button
            onClick={() => navigate('/room')}
            aria-label="Open Study Room"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-stone-600 shadow-sm transition active:scale-95"
          >
            <Users className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        {/* Friends seated around you — compact room scene + ticker. */}
        {routine.mode === 'together' && (
          <div className="mt-1 flex flex-col items-center px-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/room')}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/room'); }}
              className="relative w-full max-w-[340px] rounded-3xl bg-white/80 p-1.5 shadow-sm ring-1 ring-stone-200/70 backdrop-blur"
            >
              <RoomScene
                compact
                hideMe
                onWaveFriend={sendWaveTo}
                className="w-full"
              />
            </div>
            <div className="mt-1.5 w-full max-w-[340px]">
              <RoomChatter variant="ticker" />
            </div>
          </div>
        )}

        {/* Pull zone (start string + tasks list) */}
        <div
          ref={pullZoneRef}
          className="relative flex flex-1 cursor-grab pointer-events-auto active:cursor-grabbing select-none"
        >
          {/* Elastic start string */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              ref={stringPathRef}
              d={`M 50 0 Q ${RETRACTED.x} ${RETRACTED.y} 50 ${RETRACTED.y + 14}`}
              fill="none"
              stroke="#7a8078"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>

          {/* Bell — DOM-positioned so its aspect ratio is preserved. The
              engine's `updateString` updates `top` to follow the string's
              tip; the inline `transform` keeps the bell horizontally
              centred regardless of width. */}
          <div
            ref={bellWrapRef}
            className="pointer-events-none absolute"
            style={{ left: '50%', top: `${RETRACTED.y + 14}%`, transform: 'translate(-50%, 0)' }}
          >
            <BellSVG width={64} stringLength={0} />
          </div>

          {/* Task list — only readable when anchored */}
          <div className="pointer-events-none absolute inset-x-4 top-[100px] z-20">
            <div
              className="rounded-3xl border border-black/5 bg-white/85 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur transition-opacity duration-500"
              style={{ opacity: isAnchored ? 1 : 0 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-stone-500">
                  Today's tasks
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  {completedCount}/{total}
                </span>
              </div>
              <div className="pointer-events-auto mt-3 flex flex-col gap-2">
                {routeItems.map((item) => {
                  const done = completedIds.includes(item.id);
                  return (
                    <TaskRow
                      key={item.id}
                      label={item.label}
                      done={done}
                      onFinish={() => toggleCompleted(item.id)}
                    />
                  );
                })}
                {routeItems.length === 0 && (
                  <p className="px-1 py-2 text-center text-[12px] font-medium text-stone-400">
                    No subjects yet — set your routine to add some.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action tray — only shown once the session is running. */}
        {isAnchored && (
          <div className="pointer-events-auto relative z-[60] mx-4 mb-4 flex flex-col gap-2 rounded-3xl bg-white/90 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleBreak}
                className="btn-soft btn-sun flex-1"
              >
                <Coffee className="h-4 w-4" strokeWidth={2.2} />
                Take a Break
              </button>
              <button
                onClick={handleDone}
                className="btn-soft btn-mint flex-1"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
                Done for Today
              </button>
            </div>
          </div>
        )}
      </div>
    </Motion.div>
  );
}

/* -----------------------------------------------------------------------
 * TaskRow — each task hangs a tiny pull-tag. Drag the tag rightward to
 * commit "I Finished This"; releasing before the threshold springs back.
 * ----------------------------------------------------------------------- */

function TaskRow({
  label,
  done,
  onFinish,
}: {
  label: string;
  done: boolean;
  onFinish: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tagRef  = useRef<HTMLButtonElement>(null);
  const TH = 64;

  useEffect(() => {
    const wrap = wrapRef.current;
    const tag  = tagRef.current;
    if (!wrap || !tag || done) return;
    let isDragging = false;
    let startX = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0;
    let velocity = 0;

    const apply = (x: number) => {
      tag.style.transform = `translateX(${x}px)`;
    };
    const spring = () => {
      velocity = (velocity + (0 - settled) * 0.18) * 0.78;
      settled += velocity;
      apply(settled);
      if (Math.abs(velocity) < 0.3 && Math.abs(settled) < 0.3) {
        settled = 0;
        apply(0);
        animFrame = 0;
      } else {
        animFrame = requestAnimationFrame(spring);
      }
    };
    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDragging = true;
      startX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      pull = Math.max(0, startX - clientX); // pulling LEFT
      const off = -TH * (1 - Math.exp(-pull / TH));
      settled = off;
      apply(off);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (pull >= TH) {
        onFinish();
      } else {
        velocity = 0;
        animFrame = requestAnimationFrame(spring);
      }
      pull = 0;
    };

    tag.addEventListener('mousedown',  onStart);
    tag.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      tag.removeEventListener('mousedown',  onStart);
      tag.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [done, onFinish]);

  return (
    <div
      ref={wrapRef}
      className={[
        'relative flex items-center justify-between overflow-hidden rounded-2xl px-3 py-2 ring-1 transition-colors',
        done ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold',
            done ? 'bg-emerald-500 text-white' : 'bg-white text-rose-500 ring-1 ring-rose-200',
          ].join(' ')}
        >
          {done ? '✓' : '•'}
        </span>
        <span
          className={[
            'text-[14px] font-bold',
            done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-stone-700',
          ].join(' ')}
        >
          {label}
        </span>
      </div>
      {done ? (
        <button
          onClick={onFinish}
          className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold text-stone-500"
        >
          undo
        </button>
      ) : (
        <button
          ref={tagRef}
          aria-label={`Mark ${label} finished`}
          className="flex select-none items-center gap-1 rounded-full bg-stone-800 px-3 py-1 text-[10px] font-bold text-white shadow touch-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          ← pull
        </button>
      )}
    </div>
  );
}
