import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { Sparkles, Users, Settings as SettingsIcon } from 'lucide-react';
import { BellSVG } from './PullBell';

const PULL_THRESHOLD = 72;  // px of drag before navigation fires

export function Welcome() {
  const navigate = useNavigate();
  const { setHasEntered, hasRoutine, friends } = useAppContext();

  const svgWrapRef   = useRef<HTMLDivElement>(null);
  const stringRef    = useRef<SVGLineElement>(null);
  const pendantRef   = useRef<SVGGElement>(null);

  /** Tug the pendant — same destination as tapping the primary button. */
  const tugStart = () => {
    setHasEntered(true);
    navigate(hasRoutine ? '/routine' : '/setup/start-time');
  };
  const tugRef = useRef(tugStart);
  tugRef.current = tugStart;

  // Pullable pendant interaction
  useEffect(() => {
    const wrap = svgWrapRef.current;
    if (!wrap) return;

    let isDragging = false;
    let startY = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0;
    let velocity = 0;

    const springBack = () => {
      const tension = 0.18;
      const damp    = 0.78;
      velocity = (velocity + (0 - settled) * tension) * damp;
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

    const applyTransform = (offsetY: number) => {
      const pendant = pendantRef.current;
      const line    = stringRef.current;
      if (!pendant || !line) return;
      // Outer pendant <g> owns the dynamic translate; inner BellGroup is
      // already positioned relative to the string anchor (stringLength).
      pendant.setAttribute('transform', `translate(0, ${offsetY})`);
      line.setAttribute('y2', String(28 + offsetY));
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
      document.body.classList.add('pull-active');
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      pull = Math.max(0, clientY - startY);
      const offset = PULL_THRESHOLD * (1 - Math.exp(-pull / PULL_THRESHOLD));
      settled = offset;
      applyTransform(offset);
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');
      if (pull >= PULL_THRESHOLD) {
        tugRef.current();
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

  const onlineFriends = friends.filter((f) => f.status !== 'offline');

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col items-center px-6 pt-6"
    >
      {/* Friendly kicker */}
      <Motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center"
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-rose-400">
          Hi friend
        </span>
      </Motion.div>

      {/* Pullable bell pendant */}
      <Motion.div
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-4"
      >
        <div ref={svgWrapRef} className="cursor-grab active:cursor-grabbing select-none touch-none">
          <BellSVG
            width={140}
            stringLength={28}
            stringRef={stringRef}
            pendantRef={pendantRef}
          />
        </div>
      </Motion.div>

      {/* Buttons */}
      <Motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-2 flex w-full max-w-[300px] flex-col gap-3"
      >
        <button
          onClick={() => {
            setHasEntered(true);
            navigate(hasRoutine ? '/routine' : '/setup/start-time');
          }}
          className="btn-soft-lg btn-primary w-full"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          Start Homework Together
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setHasEntered(true);
              navigate('/room');
            }}
            className="btn-soft btn-mint w-full"
          >
            <Users className="h-4 w-4" strokeWidth={2.2} />
            Join Study Room
          </button>
          <button
            onClick={() => {
              setHasEntered(true);
              navigate('/setup/start-time');
            }}
            className="btn-soft btn-paper w-full"
          >
            <SettingsIcon className="h-4 w-4" strokeWidth={2.2} />
            Set My Routine
          </button>
        </div>
      </Motion.div>

      {/* Friend preview */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-8 flex w-full max-w-[300px] flex-col items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[13px] font-semibold text-stone-600">
            {onlineFriends.length} friend{onlineFriends.length === 1 ? '' : 's'} are studying now
          </span>
        </div>
        <div className="flex -space-x-2">
          {onlineFriends.slice(0, 6).map((f) => (
            <div
              key={f.id}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#fff8ee] bg-white text-[18px] shadow-sm"
              title={f.name}
            >
              {f.emoji}
            </div>
          ))}
        </div>
      </Motion.div>
    </Motion.div>
  );
}
