import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import type { RouteItem, SubTask } from '../context/AppContext';
import { Motion } from './Motion';
import { CanvasBackground } from './CanvasBackground';
import { BellSVG } from './PullBell';
import { Coffee, CheckCircle2, X, Plus, ListChecks } from 'lucide-react';

const MAX_PULL = 200;
const REVEAL_THRESHOLD = 80;

const RETRACTED = { x: 74, y: 16 };
const EXTENDED  = { x: 50, y: 50 };

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatRemaining(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * RingTimer — the visual focal point of an active focus session.
 *
 * Design system rules applied:
 *   - Track: white at 28% alpha (matches the dark veil's blur)
 *   - Progress arc: PULL primary gradient (rose-400 → rose-500)
 *   - Time numerals: monospace, tabular numerals, white with soft shadow
 *   - Elapsed badge: frosted pill, follows `chip`/`card-glass` family
 */
function RingTimer({
  elapsed,
  totalSeconds,
  visible,
}: {
  elapsed: number;
  totalSeconds: number;
  visible: boolean;
}) {
  const R = 76;
  const STROKE = 8;
  const SIZE = (R + STROKE) * 2 + 4;
  const C = 2 * Math.PI * R;
  const progress = Math.min(elapsed / Math.max(totalSeconds, 1), 1);
  const remaining = Math.max(totalSeconds - elapsed, 0);
  const gradId = 'ring-timer-grad';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0"
            style={{ transform: 'rotate(-90deg)' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#a8e6cf" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.45))' }}
            />
          </svg>
          <div className="relative flex flex-col items-center justify-center">
            <span
              role="timer"
              aria-live="polite"
              className="font-mono text-[52px] font-black leading-none tracking-tighter text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
            >
              {formatElapsed(elapsed)}
            </span>
            <span className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
              Elapsed
            </span>
          </div>
        </div>

        {/* Remaining badge */}
        <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-white/22 px-3 py-1 backdrop-blur-sm ring-1 ring-white/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          <span className="text-[11px] font-bold tracking-wide text-white/95 tabular-nums">
            {formatRemaining(remaining)} remaining
          </span>
        </div>
      </div>
    </div>
  );
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
    subTasks,
    completedSubTaskIds,
    addSubTask,
    toggleSubTaskCompleted,
    sessionStartTime,
    setSessionStartTime,
    setSessionStatus,
    setIsLinePulled,
    bgStyle,
    updateMyStatus,
    saveCurrentRoute,
  } = useAppContext();

  /* Tasks sheet — collapsed by default so the timer stays unobstructed. */
  const [showTasks, setShowTasks] = useState(false);

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

  const totalAll = routeItems.length + subTasks.length;
  const completedCount = completedIds.length + completedSubTaskIds.length;

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
        {/* Minimal header — just an exit button. The timer is the status. */}
        <header className="flex flex-shrink-0 items-center justify-between px-5 pt-3">
          <button onClick={handleExit} aria-label="Exit session" className="icon-btn-sm">
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
          {!isAnchored && (
            <span className="text-[11px] font-medium tracking-wide text-white/70">
              pull the bell
            </span>
          )}
          <span className="h-8 w-8" aria-hidden />
        </header>

        {/* Pull zone — bell (before) and ring timer (after) live here. */}
        <div
          ref={pullZoneRef}
          className="pointer-events-auto relative flex flex-1 cursor-grab select-none active:cursor-grabbing"
        >
          {/* Elastic start string */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              ref={stringPathRef}
              d={`M 50 0 Q ${RETRACTED.x} ${RETRACTED.y} 50 ${RETRACTED.y + 14}`}
              fill="none"
              stroke="#7a8078"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>

          {/* Bell — only visible before the session starts. */}
          <div
            ref={bellWrapRef}
            className="pointer-events-none absolute transition-opacity duration-500"
            style={{
              left: '50%',
              top: `${RETRACTED.y + 14}%`,
              transform: 'translate(-50%, 0)',
              opacity: isAnchored ? 0 : 1,
            }}
          >
            <BellSVG width={64} stringLength={0} />
          </div>

          {/* The ring timer — perfectly centered, the page's only subject. */}
          <RingTimer
            elapsed={elapsed}
            totalSeconds={routine.focusMinutes * 60}
            visible={isAnchored}
          />
        </div>

        {/* Bottom controls — only when running. Quiet pill row. */}
        {isAnchored && (
          <div className="pointer-events-auto relative z-[60] flex flex-col items-center gap-3 px-5 pb-6">
            {/* Tasks summary pill — taps to open sheet */}
            <button
              onClick={() => setShowTasks(true)}
              className="flex items-center gap-2 rounded-full bg-white/22 px-4 py-2 text-[12px] font-bold text-white/95 backdrop-blur-md ring-1 ring-white/20 transition active:scale-95"
            >
              <ListChecks className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span className="time-num">Tasks · {completedCount}/{totalAll}</span>
            </button>

            {/* Two minimal action buttons */}
            <div className="grid w-full grid-cols-2 gap-2">
              <button onClick={handleBreak} className="btn-soft btn-sun">
                <Coffee className="h-4 w-4" strokeWidth={2.2} />
                Break
              </button>
              <button onClick={handleDone} className="btn-soft btn-mint">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
                Done
              </button>
            </div>
          </div>
        )}

        {/* Tasks sheet — slides up from the bottom when the user taps the pill. */}
        {showTasks && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Today's tasks"
            className="absolute inset-0 z-[70] flex flex-col justify-end"
            style={{ background: 'rgba(20,18,28,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowTasks(false)}
          >
            <Motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="card-glass-lg mx-3 mb-4 max-h-[70%] overflow-hidden bg-[#fff8ee]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5">
                <span className="h-1 w-9 rounded-full bg-stone-300/80" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-2 pt-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                    Tasks
                  </span>
                  <p className="serif-display text-[20px] leading-tight text-stone-800">
                    {completedCount}<span className="text-stone-300"> / </span>{totalAll}
                  </p>
                </div>
                <button
                  onClick={() => setShowTasks(false)}
                  aria-label="Close"
                  className="icon-btn-sm"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>

              {/* List */}
              <div className="no-scrollbar overflow-y-auto px-4 pb-5 pt-1">
                <div className="flex flex-col gap-2">
                  {routeItems.map((item) => (
                    <SubjectCategory
                      key={item.id}
                      subject={item}
                      subjectDone={completedIds.includes(item.id)}
                      onSubjectDone={() => toggleCompleted(item.id)}
                      subTasks={subTasks.filter((t) => t.subjectId === item.id)}
                      completedSubTaskIds={completedSubTaskIds}
                      onSubTaskDone={toggleSubTaskCompleted}
                      onAddSubTask={(label) => addSubTask(item.id, label)}
                    />
                  ))}
                  {routeItems.length === 0 && (
                    <p className="py-4 text-center text-[12px] font-medium text-stone-400">
                      No subjects yet.
                    </p>
                  )}
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </div>
    </Motion.div>
  );
}

/* -----------------------------------------------------------------------
 * Subject emoji lookup
 * ----------------------------------------------------------------------- */
const SUBJECT_EMOJI: Record<string, string> = {
  Math: '➗', Science: '🔬', English: '📚', History: '🏛️',
  Art: '🎨', Music: '🎵', Reading: '📖',
};
function subjectEmoji(label: string) {
  return SUBJECT_EMOJI[label] ?? '✨';
}

/* -----------------------------------------------------------------------
 * SubjectCategory — a collapsible group with pull-to-complete sub-tasks
 * ----------------------------------------------------------------------- */
function SubjectCategory({
  subject,
  subjectDone,
  onSubjectDone,
  subTasks,
  completedSubTaskIds,
  onSubTaskDone,
  onAddSubTask,
}: {
  subject: RouteItem;
  subjectDone: boolean;
  onSubjectDone: () => void;
  subTasks: SubTask[];
  completedSubTaskIds: string[];
  onSubTaskDone: (id: string) => void;
  onAddSubTask: (label: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doneCount = subTasks.filter((t) => completedSubTaskIds.includes(t.id)).length;
  const allSubDone = subTasks.length > 0 && doneCount === subTasks.length;
  const effectiveDone = subjectDone || allSubDone;

  const commitAdd = () => {
    if (draft.trim()) onAddSubTask(draft.trim());
    setDraft('');
    setAdding(false);
  };

  const startAdding = () => {
    setExpanded(true);
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <div className="border-t border-stone-200/70 first:border-t-0">
      {/* Subject header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-3 text-left transition active:opacity-70"
      >
        <span className="text-[18px] leading-none">{subjectEmoji(subject.label)}</span>
        <span className={[
          'flex-1 text-[14px] font-semibold',
          effectiveDone ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-800',
        ].join(' ')}>
          {subject.label}
        </span>
        {subTasks.length > 0 ? (
          <span className="text-[11px] font-medium text-stone-400 time-num">
            {doneCount}/{subTasks.length}
          </span>
        ) : (
          effectiveDone ? (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onSubjectDone(); }}
              className="text-[10px] font-medium text-stone-400"
            >
              undo
            </span>
          ) : (
            <span onClick={(e) => e.stopPropagation()}>
              <PullTag label={subject.label} onFinish={onSubjectDone} />
            </span>
          )
        )}
        <span
          role="button"
          aria-label="Add task"
          onClick={(e) => { e.stopPropagation(); startAdding(); }}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 active:scale-90"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </button>

      {/* Sub-task list */}
      {expanded && (subTasks.length > 0 || adding) && (
        <div className="flex flex-col gap-1 pb-2 pl-7">
          {subTasks.map((task) => (
            <SubTaskRow
              key={task.id}
              task={task}
              done={completedSubTaskIds.includes(task.id)}
              onFinish={() => onSubTaskDone(task.id)}
            />
          ))}

          {adding && (
            <div className="flex items-center gap-2 border-b border-stone-200 py-1.5">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd();
                  if (e.key === 'Escape') { setAdding(false); setDraft(''); }
                }}
                placeholder="e.g. Read page 24…"
                className="flex-1 bg-transparent text-[13px] font-medium text-stone-700 placeholder:text-stone-300 outline-none"
              />
              <button
                onClick={commitAdd}
                className="text-[11px] font-semibold text-rose-400"
              >Add</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * PullTag — elastic left-pull chip shared by subject and sub-task rows
 * ----------------------------------------------------------------------- */
function PullTag({ label, onFinish }: { label: string; onFinish: () => void }) {
  const tagRef = useRef<HTMLButtonElement>(null);
  const TH = 64;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const tag = tagRef.current;
    if (!tag) return;
    let isDragging = false;
    let startX = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0;
    let velocity = 0;

    const apply = (x: number) => { tag.style.transform = `translateX(${x}px)`; };
    const spring = () => {
      velocity = (velocity + (0 - settled) * 0.18) * 0.78;
      settled += velocity;
      apply(settled);
      if (Math.abs(velocity) < 0.3 && Math.abs(settled) < 0.3) {
        settled = 0; apply(0); animFrame = 0;
      } else { animFrame = requestAnimationFrame(spring); }
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
      pull = Math.max(0, startX - clientX);
      const off = -TH * (1 - Math.exp(-pull / TH));
      settled = off; apply(off);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (pull >= TH) { onFinishRef.current(); }
      else { velocity = 0; animFrame = requestAnimationFrame(spring); }
      pull = 0;
    };

    tag.addEventListener('mousedown', onStart);
    tag.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      tag.removeEventListener('mousedown', onStart);
      tag.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <button
      ref={tagRef}
      aria-label={`Mark ${label} finished`}
      className="flex cursor-grab select-none items-center gap-1 rounded-full bg-stone-700 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white touch-none active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      ← pull
    </button>
  );
}

/* -----------------------------------------------------------------------
 * SubTaskRow — a single user-added task inside a subject category
 * ----------------------------------------------------------------------- */
function SubTaskRow({ task, done, onFinish }: { task: SubTask; done: boolean; onFinish: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={[
            'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors',
            done ? 'bg-emerald-400 text-white' : 'border border-stone-300',
          ].join(' ')}
        >
          {done && <span className="text-[8px] font-bold leading-none">✓</span>}
        </span>
        <span className={[
          'text-[13px]',
          done ? 'font-medium text-stone-400 line-through decoration-stone-300' : 'font-medium text-stone-700',
        ].join(' ')}>
          {task.label}
        </span>
      </div>
      {done ? (
        <button onClick={onFinish} className="text-[10px] font-medium text-stone-400">
          undo
        </button>
      ) : (
        <PullTag label={task.label} onFinish={onFinish} />
      )}
    </div>
  );
}
