import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { BellSVG } from './PullBell';
import { CheckCircle2, Coffee, Flame } from 'lucide-react';

const PULL_THRESHOLD = 80;

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ENCOURAGEMENTS = [
  "You're on a roll 🔥",
  'Keep the momentum going ✨',
  'Great break — back to it 💪',
  "Your brain is recharged 🌿",
  'One more push 🎯',
];

export function ContinueFocus() {
  const navigate = useNavigate();
  const {
    routine,
    routeItems,
    completedIds,
    subTasks,
    completedSubTaskIds,
    sessionStartTime,
    updateMyStatus,
    setSessionStartTime,
    setSessionStatus,
    saveCurrentRoute,
    isDark,
  } = useAppContext();

  const [msg] = useState(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
  );

  const totalAll       = routeItems.length + subTasks.length;
  const completedCount = completedIds.length + completedSubTaskIds.length;
  const remaining      = totalAll - completedCount;

  const elapsedSec = sessionStartTime !== null
    ? Math.floor((Date.now() - sessionStartTime) / 1000)
    : 0;
  const focusedMinutes = Math.floor(elapsedSec / 60);
  const remainingFocusSec = Math.max(0, routine.focusMinutes * 60 - elapsedSec);

  /* Pull-string continue */
  const wrapRef    = useRef<HTMLDivElement>(null);
  const stringRef  = useRef<SVGLineElement>(null);
  const pendantRef = useRef<SVGGElement>(null);

  const handleContinue = () => {
    updateMyStatus('focusing', { subject: routine.subjects[0] });
    navigate('/session');
  };

  const handleDone = () => {
    saveCurrentRoute(`After-school plan ${new Date().toLocaleDateString()}`);
    updateMyStatus('finished');
    setSessionStatus('restored');
    setSessionStartTime(null);
    navigate('/done');
  };

  const handleBreakAgain = () => {
    updateMyStatus('on_break');
    navigate('/break');
  };

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
        handleContinue();
      } else {
        velocity = 0;
        animFrame = requestAnimationFrame(spring);
      }
      pull = 0;
    };
    wrap.addEventListener('mousedown',  onStart, { passive: false });
    wrap.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove',  onMove, { passive: false });
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',   onEnd);
    window.addEventListener('touchend',  onEnd);
    return () => {
      wrap.removeEventListener('mousedown',  onStart);
      wrap.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',   onEnd);
      window.removeEventListener('touchend',  onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bg       = isDark
    ? 'linear-gradient(180deg, #0f1a1f 0%, #14242c 100%)'
    : 'linear-gradient(180deg, #fff8ee 0%, #d6eef0 100%)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : '#1c1c1e';
  const textSub   = isDark ? 'rgba(255,255,255,0.42)' : '#78716c';
  const chipBg    = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.72)';
  const chipBorder= isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-4 pb-6"
      style={{ background: bg }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sky-400">
          Break over
        </span>
        <h2 className="text-[26px] font-bold leading-tight" style={{ color: textMain }}>
          Continue session
        </h2>
        <p className="text-[13px] font-medium" style={{ color: textSub }}>{msg}</p>
      </div>

      {/* Progress chips */}
      <div className="mt-5 flex gap-2.5">
        <div
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
          style={{ background: chipBg, border: `1px solid ${chipBorder}`, color: textMain }}
        >
          <Flame className="h-3.5 w-3.5 text-orange-400" strokeWidth={2.2} />
          <span>{focusedMinutes}min focused</span>
        </div>
        {totalAll > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
            style={{ background: chipBg, border: `1px solid ${chipBorder}`, color: textMain }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.2} />
            <span>{completedCount}/{totalAll} tasks</span>
          </div>
        )}
      </div>

      {/* Remaining focus time ring */}
      {remainingFocusSec > 0 && (
        <Motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-5 flex h-[88px] w-[88px] items-center justify-center rounded-full"
          style={{
            background: isDark ? 'rgba(56,189,248,0.10)' : 'rgba(186,230,253,0.55)',
            border: isDark ? '2px solid rgba(56,189,248,0.30)' : '3px solid #7dd3fc',
            boxShadow: isDark ? '0 6px 24px rgba(56,189,248,0.15)' : '0 6px 24px rgba(125,211,252,0.35)',
          }}
        >
          <div className="flex flex-col items-center">
            <span
              className="font-mono text-[22px] font-bold tabular-nums"
              style={{ color: isDark ? 'rgba(255,255,255,0.90)' : '#0369a1' }}
            >
              {fmt(remainingFocusSec)}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: textSub }}>
              left
            </span>
          </div>
        </Motion.div>
      )}

      {/* Pull bell */}
      <div className="mt-4 flex flex-col items-center">
        <div
          ref={wrapRef}
          className="cursor-grab select-none touch-none active:cursor-grabbing"
        >
          <BellSVG width={110} stringLength={20} stringRef={stringRef} pendantRef={pendantRef} />
        </div>
        <span className="mt-1 text-[12px] font-bold" style={{ color: textSub }}>
          Pull to focus
        </span>
      </div>

      {/* Task preview — up to 3 remaining tasks */}
      {remaining > 0 && (
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 w-full max-w-[300px] rounded-2xl px-4 py-3"
          style={{ background: chipBg, border: `1px solid ${chipBorder}` }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: textSub }}>
            Still to do
          </p>
          <div className="flex flex-col gap-1.5">
            {routeItems
              .filter((i) => !completedIds.includes(i.id))
              .slice(0, 3)
              .map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: isDark ? 'rgba(255,255,255,0.28)' : '#a8d5e2' }}
                  />
                  <span className="text-[13px] font-medium" style={{ color: textMain }}>
                    {item.label}
                  </span>
                </div>
              ))}
            {remaining > 3 && (
              <span className="text-[11px] font-medium" style={{ color: textSub }}>
                +{remaining - 3} more
              </span>
            )}
          </div>
        </Motion.div>
      )}

      {/* Action buttons */}
      <div className="mt-auto grid w-full grid-cols-2 gap-2 pt-4">
        <button onClick={handleBreakAgain} className="btn-soft btn-sun">
          <Coffee className="h-4 w-4" strokeWidth={2.2} />
          Another break
        </button>
        <button onClick={handleDone} className="btn-soft btn-mint">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
          Done for today
        </button>
      </div>
    </Motion.div>
  );
}
