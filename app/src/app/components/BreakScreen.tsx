import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { Coffee } from 'lucide-react';
import { BellSVG } from './PullBell';

const PULL_THRESHOLD = 80;

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function BreakScreen() {
  const navigate = useNavigate();
  const { routine, friends, updateMyStatus } = useAppContext();
  const [remaining, setRemaining] = useState(routine.breakMinutes * 60);

  useEffect(() => {
    if (remaining <= 0) {
      // Auto-end break when timer hits zero
      updateMyStatus('focusing');
      navigate('/session');
      return;
    }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, navigate, updateMyStatus]);

  /* Pull-string back-to-focus */
  const wrapRef = useRef<HTMLDivElement>(null);
  const stringRef = useRef<SVGLineElement>(null);
  const pendantRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let isDragging = false, startY = 0, pull = 0, animFrame = 0, settled = 0, velocity = 0;

    const apply = (y: number) => {
      pendantRef.current?.setAttribute('transform', `translate(0, ${y})`);
      stringRef.current?.setAttribute('y2', String(20 + y));
    };
    const spring = () => {
      velocity = (velocity + (0 - settled) * 0.18) * 0.78;
      settled += velocity;
      apply(settled);
      if (Math.abs(velocity) < 0.3 && Math.abs(settled) < 0.3) {
        settled = 0; apply(0); animFrame = 0;
      } else {
        animFrame = requestAnimationFrame(spring);
      }
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
      const off = PULL_THRESHOLD * (1 - Math.exp(-pull / PULL_THRESHOLD));
      settled = off;
      apply(off);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');
      if (pull >= PULL_THRESHOLD) {
        updateMyStatus('focusing');
        navigate('/session');
      } else {
        velocity = 0;
        animFrame = requestAnimationFrame(spring);
      }
      pull = 0;
    };
    wrap.addEventListener('mousedown', onStart, { passive: false });
    wrap.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      wrap.removeEventListener('mousedown', onStart);
      wrap.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [navigate, updateMyStatus]);

  const onBreak = friends.filter((f) => f.status === 'on_break');

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col items-center px-6 pt-2"
      style={{ background: 'linear-gradient(180deg, #fff8ee 0%, #d6f0e0 100%)' }}
    >
      <div className="flex flex-col items-center">
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
          Take it easy
        </span>
        <h2 className="mt-1 text-[24px] font-bold text-stone-800">Break time</h2>
      </div>

      {/* Pull bell — hangs from the top of the content like every other
          screen's bell does. */}
      <div className="mt-2 flex flex-col items-center">
        <div
          ref={wrapRef}
          className="cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <BellSVG
            width={110}
            stringLength={20}
            stringRef={stringRef}
            pendantRef={pendantRef}
          />
        </div>
        <span className="mt-1 text-[12px] font-bold text-stone-600">
          Pull to go back
        </span>
      </div>

      {/* Countdown */}
      <Motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-6 flex h-44 w-44 items-center justify-center rounded-full bg-white/85 shadow-[0_10px_40px_rgba(168,230,207,0.6)] ring-4 ring-emerald-200"
      >
        <div className="flex flex-col items-center">
          <Coffee className="h-6 w-6 text-emerald-500" strokeWidth={2} />
          <span className="mt-1 font-mono text-[36px] font-bold tabular-nums text-stone-800">
            {fmt(remaining)}
          </span>
          <span className="text-[11px] font-semibold text-stone-400">until focus</span>
        </div>
      </Motion.div>

      {/* Friends on break */}
      {onBreak.length > 0 && (
        <div className="mt-6 flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-white/70 p-3 shadow-sm">
          <span className="text-[12px] font-semibold text-stone-500">
            🍪 On break with you
          </span>
          <div className="mt-2 flex -space-x-2">
            {onBreak.slice(0, 6).map((f) => (
              <span
                key={f.id}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-50 text-[18px] shadow-sm"
              >
                {f.emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </Motion.div>
  );
}
