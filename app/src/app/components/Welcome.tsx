import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, formatOnlineUsers } from '../context/AppContext';
import { Motion } from './Motion';
import { BellSVG } from './PullBell';

const PULL_THRESHOLD = 72;

/**
 * Welcome — a single, quiet page. The bell is the only action.
 * Pull it past the threshold OR tap it to enter.
 *
 * Composition rules:
 *   - One serif wordmark, top-centered
 *   - One subject (the bell), perfectly centered in its visual field
 *   - One whisper-quiet hint underneath
 *   - One footnote at the bottom edge — never competing for attention
 */
export function Welcome() {
  const navigate = useNavigate();
  const { setHasEntered } = useAppContext();

  const svgWrapRef = useRef<HTMLDivElement>(null);
  const stringRef  = useRef<SVGLineElement>(null);
  const pendantRef = useRef<SVGGElement>(null);

  const goNext = () => {
    setHasEntered(true);
    navigate('/login');
  };
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  useEffect(() => {
    const wrap = svgWrapRef.current;
    if (!wrap) return;

    let isDragging = false;
    let startY = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0;
    let velocity = 0;
    let didDrag = false;

    const applyTransform = (offsetY: number) => {
      pendantRef.current?.setAttribute('transform', `translate(0, ${offsetY})`);
      stringRef.current?.setAttribute('y2', String(28 + offsetY));
    };
    const springBack = () => {
      velocity = (velocity + (0 - settled) * 0.18) * 0.78;
      settled += velocity;
      applyTransform(settled);
      if (Math.abs(velocity) < 0.3 && Math.abs(settled) < 0.3) {
        settled = 0;
        applyTransform(0);
        animFrame = 0;
      } else {
        animFrame = requestAnimationFrame(springBack);
      }
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDragging = true;
      didDrag = false;
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
      document.body.classList.add('pull-active');
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      pull = Math.max(0, clientY - startY);
      if (pull > 4) didDrag = true;
      const offset = PULL_THRESHOLD * (1 - Math.exp(-pull / PULL_THRESHOLD));
      settled = offset;
      applyTransform(offset);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');
      if (pull >= PULL_THRESHOLD) {
        goNextRef.current();
      } else if (!didDrag) {
        // Treat as a tap — go to next, no spring.
        goNextRef.current();
      } else {
        velocity = 0;
        animFrame = requestAnimationFrame(springBack);
      }
      pull = 0;
    };

    wrap.addEventListener('mousedown',  onStart, { passive: false });
    wrap.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove,  { passive: false });
    window.addEventListener('touchmove', onMove,  { passive: false });
    window.addEventListener('mouseup',   onEnd);
    window.addEventListener('touchend',  onEnd);

    return () => {
      wrap.removeEventListener('mousedown',  onStart);
      wrap.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onEnd);
      window.removeEventListener('touchend',  onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      {/* Centerpiece — the bell, the only thing on this page */}
      <div className="flex flex-1 flex-col items-center justify-start pt-16">
        <Motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 22 }}
          className="flex flex-col items-center"
        >
          <div
            ref={svgWrapRef}
            className="cursor-grab select-none touch-none active:cursor-grabbing"
          >
            <BellSVG
              width={140}
              stringLength={28}
              stringRef={stringRef}
              pendantRef={pendantRef}
            />
          </div>
        </Motion.div>
      </div>

      {/* Footer — single line, low-contrast */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 pb-8"
      >
        <span className="online-dot" />
        <span className="text-[11px] font-medium text-stone-400 time-num">
          {formatOnlineUsers()}
        </span>
      </Motion.div>
    </Motion.div>
  );
}
