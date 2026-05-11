import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, formatOnlineUsers } from '../context/AppContext';
import { Motion } from './Motion';
import { Pencil, Users, X, Headphones, ArrowRight, Hash, Plus } from 'lucide-react';
import { BellSVG } from './PullBell';

interface Block {
  kind: 'focus' | 'break';
  label: string;
  minutes: number;
  startsAt: string;
  emoji: string;
}

const PULL_THRESHOLD = 80;

const QUICK_SUBJECTS = ['Math', 'Science', 'English', 'History', 'Reading', 'Art', 'Music', 'Language', 'PE', 'Code'] as const;
const QUICK_TIMES    = ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00'] as const;
const FOCUS_LENGTHS  = [20, 25, 30, 45, 60] as const;

function fmt(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatNowTime() {
  const now = new Date();
  return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function buildBlocks(
  startTime: string,
  subjects: string[],
  focusMinutes: number,
  breakMinutes: number,
): Block[] {
  const [hh, mm] = startTime.split(':').map((n) => parseInt(n, 10));
  const start = new Date();
  start.setHours(hh || 16, mm || 0, 0, 0);

  const subjectsCount = subjects.length || 1;
  const blocks: Block[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < subjectsCount; i++) {
    const subj = subjects[i] ?? 'Homework';
    blocks.push({
      kind: 'focus',
      label: subj,
      minutes: focusMinutes,
      startsAt: fmt(cursor),
      emoji: emojiForSubject(subj),
    });
    cursor.setMinutes(cursor.getMinutes() + focusMinutes);
    if (i < subjectsCount - 1) {
      blocks.push({
        kind: 'break',
        label: 'Break',
        minutes: breakMinutes,
        startsAt: fmt(cursor),
        emoji: '·',
      });
      cursor.setMinutes(cursor.getMinutes() + breakMinutes);
    }
  }
  return blocks;
}

function emojiForSubject(name: string) {
  switch (name) {
    case 'Math':    return '➗';
    case 'Science': return '🔬';
    case 'English': return '📚';
    case 'History': return '🏛️';
    case 'Art':     return '🎨';
    case 'Music':   return '🎵';
    case 'Reading': return '📖';
    default:        return '✨';
  }
}

/**
 * RoutineReview — the home screen.
 *
 * Three quiet sections separated by generous whitespace:
 *   1. Header  ·  avatar + serif title + edit
 *   2. Bell    ·  the action; pull or tap to choose mode
 *   3. Schedule · clean time-column list, no chrome
 */
export function RoutineReview() {
  const navigate = useNavigate();
  const {
    routine,
    setRoutine,
    setRouteItems,
    setNote,
    setPace,
    setPaceMinutes,
    setIsLinePulled,
    userName,
    userEmoji,
    joinRoom,
    createRoom,
  } = useAppContext();

  const [showPicker, setShowPicker] = useState(false);
  // 'mode' = choose alone/together; 'code' = enter/create a room code
  const [pickerStep, setPickerStep] = useState<'mode' | 'code'>('mode');
  const [codeInput, setCodeInput] = useState('');

  // Plan editor sheet
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [draftSubjects, setDraftSubjects] = useState<string[]>([]);
  const [draftTime, setDraftTime] = useState('4:00');
  const [draftFocus, setDraftFocus] = useState(25);
  const [customSubject, setCustomSubject] = useState('');

  const openPlanEditor = () => {
    setDraftSubjects([...routine.subjects]);
    setDraftTime(routine.startTime);
    setDraftFocus(routine.focusMinutes);
    setCustomSubject('');
    setShowPlanEditor(true);
  };

  const toggleDraftSubject = (s: string) => {
    setDraftSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed || draftSubjects.includes(trimmed)) return;
    setDraftSubjects((prev) => [...prev, trimmed]);
    setCustomSubject('');
  };

  const blocks = useMemo(
    () => buildBlocks(routine.startTime, routine.subjects, routine.focusMinutes, routine.breakMinutes),
    [routine.startTime, routine.subjects, routine.focusMinutes, routine.breakMinutes],
  );

  useEffect(() => {
    const focusItems = blocks
      .filter((b) => b.kind === 'focus')
      .map((b, i) => ({
        id: `focus-${i}-${b.label}`,
        type: 'red' as const,
        label: b.label,
      }));
    setRouteItems(focusItems);
    setNote(`After-school plan · ${routine.subjects.join(' · ') || 'Homework'}`);
    setPace(`${routine.focusMinutes} min`);
    setPaceMinutes(routine.focusMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine.startTime, routine.subjects.join(','), routine.focusMinutes, routine.breakMinutes]);

  const totalMinutes = blocks.reduce((sum, b) => sum + b.minutes, 0);

  /* Pull-string interaction — pull or tap to open the mode picker. */
  const pullWrapRef = useRef<HTMLDivElement>(null);
  const stringRef   = useRef<SVGLineElement>(null);
  const pendantRef  = useRef<SVGGElement>(null);

  useEffect(() => {
    const wrap = pullWrapRef.current;
    if (!wrap) return;
    let isDragging = false;
    let startY = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0;
    let velocity = 0;
    let didDrag = false;

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
      apply(offset);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');
      if (pull >= PULL_THRESHOLD) {
        setShowPicker(true);
      } else if (!didDrag) {
        setShowPicker(true);
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
    window.addEventListener('mouseup',   onEnd);
    window.addEventListener('touchend',  onEnd);
    return () => {
      wrap.removeEventListener('mousedown', onStart);
      wrap.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onEnd);
      window.removeEventListener('touchend',  onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 pt-2">
        <button
          onClick={() => navigate('/settings')}
          aria-label="My profile"
          className="avatar-bubble"
        >
          {userEmoji || '🐶'}
        </button>

        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Today
          </span>
          <h2 className="truncate text-[20px] font-bold leading-tight tracking-tight text-stone-800">
            {userName ? `${userName}’s plan` : 'My plan'}
          </h2>
        </div>

        <button
          onClick={openPlanEditor}
          aria-label="Edit plan"
          className="icon-btn-sm"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>

      {/* BELL */}
      <div className="mt-2 flex flex-col items-center pb-2">
        <div
          ref={pullWrapRef}
          className="cursor-grab select-none touch-none active:cursor-grabbing"
        >
          <BellSVG
            width={88}
            stringLength={16}
            stringRef={stringRef}
            pendantRef={pendantRef}
          />
        </div>
        <span className="mt-1 text-[11px] font-medium tracking-wide text-stone-400">
          tap or pull to begin
        </span>
      </div>

      {/* SCHEDULE */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-7 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Schedule
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-stone-400 time-num">
            {totalMinutes}m total
          </span>
        </div>

        <div className="mt-2">
          {blocks.map((b, i) => {
            if (b.kind === 'break') {
              return (
                <Motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.04 * i }}
                  className="schedule-row"
                >
                  <span className="time-num text-[12px] font-semibold text-stone-300">{b.startsAt}</span>
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="flex-shrink-0 text-[14px] leading-none text-stone-300">{b.emoji}</span>
                    <span className="truncate text-[13px] font-medium text-stone-300">{b.label}</span>
                  </span>
                  <span className="time-num text-[11px] font-medium text-stone-300">{b.minutes}m</span>
                </Motion.div>
              );
            }

            // Focus block — swipe left to remove, tap to go home
            return (
              <Motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.04 * i }}
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                {/* Delete button revealed on swipe */}
                <button
                  onClick={() =>
                    setRoutine({
                      ...routine,
                      subjects: routine.subjects.filter((s) => s !== b.label),
                    })
                  }
                  aria-label={`Remove ${b.label}`}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    paddingRight: 14,
                    gap: 4,
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Remove ✕
                </button>

                {/* Draggable row */}
                <Motion.div
                  drag="x"
                  dragConstraints={{ left: -90, right: 0 }}
                  dragElastic={0.04}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) {
                      setRoutine({
                        ...routine,
                        subjects: routine.subjects.filter((s) => s !== b.label),
                      });
                    }
                  }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/')}
                  className="schedule-row"
                  style={{
                    background: '#fff8ee',
                    position: 'relative',
                    zIndex: 1,
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                  }}
                >
                  <span className="time-num text-[12px] font-semibold text-stone-400">{b.startsAt}</span>
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="flex-shrink-0 text-[16px] leading-none">{b.emoji}</span>
                    <span className="truncate text-[14px] font-semibold text-stone-800">{b.label}</span>
                  </span>
                  <span className="time-num text-[11px] font-medium text-stone-400">{b.minutes}m</span>
                </Motion.div>
              </Motion.div>
            );
          })}
        </div>

        {/* Footer: online count */}
        <div className="mt-6 flex items-center justify-center gap-2 pb-4">
          <span className="online-dot" />
          <span className="text-[11px] font-medium text-stone-400 time-num">
            {formatOnlineUsers()}
          </span>
        </div>
      </div>

      {/* MODE PICKER SHEET */}
      {showPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose study mode"
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(20,18,28,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowPicker(false); setPickerStep('mode'); setCodeInput(''); }}
        >
          <Motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="mx-3 mb-4 overflow-hidden rounded-[28px] bg-[#fff8ee] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-9 rounded-full bg-stone-300/80" />
            </div>

            {/* Sheet header */}
            <div className="flex items-start justify-between px-6 pb-1 pt-4">
              <div>
                {pickerStep === 'mode' ? (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                      Begin
                    </span>
                    <p className="serif-display mt-0.5 text-[20px] leading-tight text-stone-800">
                      Choose your space
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setPickerStep('mode'); setCodeInput(''); }}
                      className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-stone-400 transition hover:text-stone-600"
                    >
                      ← back
                    </button>
                    <p className="serif-display text-[20px] leading-tight text-stone-800">
                      Study together
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => { setShowPicker(false); setPickerStep('mode'); setCodeInput(''); }}
                aria-label="Close"
                className="icon-btn-sm"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>

            {/* ── Step 1: choose mode ── */}
            {pickerStep === 'mode' && (
              <div className="flex flex-col gap-2 px-4 pb-5 pt-4">
                <ModeOption
                  emoji="🤝"
                  title="Study together"
                  subtitle="Join or create a shared room"
                  meta="Group session"
                  tone="mint"
                  isLastUsed={routine.mode === 'together'}
                  onClick={() => setPickerStep('code')}
                />
                <ModeOption
                  emoji="🧘"
                  title="Study alone"
                  subtitle="A quiet, private session"
                  meta="Solo session"
                  tone="lav"
                  isLastUsed={routine.mode === 'alone'}
                  onClick={() => {
                    setIsLinePulled(true);
                    setShowPicker(false);
                    setPickerStep('mode');
                    navigate('/session');
                  }}
                />
              </div>
            )}

            {/* ── Step 2: room code entry ── */}
            {pickerStep === 'code' && (
              <div className="px-4 pb-6 pt-3">
                {/* Code input */}
                <div className="card-glass flex items-center gap-3 px-4 py-3">
                  <Hash className="h-4 w-4 flex-shrink-0 text-stone-400" strokeWidth={2} />
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) =>
                      setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
                    }
                    placeholder="Enter room code"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-bold tracking-[0.12em] text-stone-800 placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-300 outline-none"
                  />
                  {codeInput.length > 0 && (
                    <button
                      onClick={() => setCodeInput('')}
                      className="text-stone-300 transition hover:text-stone-500"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>

                {/* Join */}
                <button
                  disabled={codeInput.length < 3}
                  onClick={() => {
                    joinRoom(codeInput);
                    setIsLinePulled(true);
                    setShowPicker(false);
                    setPickerStep('mode');
                    setCodeInput('');
                    navigate('/room');
                  }}
                  className={[
                    'mt-3 flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.98]',
                    codeInput.length >= 3
                      ? 'btn-mint shadow-md'
                      : 'bg-stone-100 text-stone-400',
                  ].join(' ')}
                >
                  <span className="text-[14px] font-bold">Join this room</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </button>

                {/* Divider */}
                <div className="my-4 flex items-center gap-3">
                  <hr className="flex-1 border-stone-200" />
                  <span className="text-[11px] font-semibold text-stone-400">or</span>
                  <hr className="flex-1 border-stone-200" />
                </div>

                {/* Create */}
                <button
                  onClick={() => {
                    createRoom();
                    setIsLinePulled(true);
                    setShowPicker(false);
                    setPickerStep('mode');
                    setCodeInput('');
                    navigate('/room');
                  }}
                  className="flex w-full items-center justify-between rounded-2xl bg-white/90 px-4 py-3.5 text-left ring-1 ring-stone-200/80 transition active:scale-[0.98]"
                >
                  <span className="flex flex-col">
                    <span className="text-[14px] font-bold text-stone-800">Create a new room</span>
                    <span className="mt-0.5 text-[11px] text-stone-400">We'll give you a shareable code</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-stone-400" strokeWidth={2} />
                </button>
              </div>
            )}
          </Motion.div>
        </div>
      )}

      {/* ── PLAN EDITOR SHEET ── */}
      {showPlanEditor && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit today's study plan"
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(20,18,28,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowPlanEditor(false)}
        >
          <Motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="mx-3 mb-4 overflow-hidden rounded-[28px] bg-[#fff8ee] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-9 rounded-full bg-stone-300/80" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pb-0 pt-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                  Today's focus
                </span>
                <p className="mt-0.5 text-[20px] font-bold tracking-tight text-stone-800">
                  Set my study plan
                </p>
              </div>
              <button onClick={() => setShowPlanEditor(false)} aria-label="Close" className="icon-btn-sm">
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>

            {/* Subjects */}
            <div className="px-5 pt-5">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUBJECTS.map((s) => {
                  const active = draftSubjects.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleDraftSubject(s)}
                      className={[
                        'rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95',
                        active
                          ? 'bg-stone-800 text-[#fff8ee]'
                          : 'bg-white/90 ring-1 ring-stone-200 text-stone-600',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {/* Custom subject input */}
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-stone-200">
                <Plus className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" strokeWidth={2} />
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustomSubject(); }}
                  placeholder="Add subject…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-stone-700 outline-none placeholder:text-stone-300"
                />
                {customSubject.trim().length > 0 && (
                  <button
                    onClick={addCustomSubject}
                    className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] font-bold text-[#fff8ee]"
                  >
                    Add
                  </button>
                )}
              </div>
              {/* Chips for custom-added subjects not in QUICK_SUBJECTS */}
              {draftSubjects.filter((s) => !QUICK_SUBJECTS.includes(s as typeof QUICK_SUBJECTS[number])).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draftSubjects
                    .filter((s) => !QUICK_SUBJECTS.includes(s as typeof QUICK_SUBJECTS[number]))
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleDraftSubject(s)}
                        className="rounded-full bg-stone-800 px-3 py-1.5 text-[13px] font-semibold text-[#fff8ee] transition active:scale-95"
                      >
                        {s} ✕
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Start time */}
            <div className="px-5 pt-4">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Starts at
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraftTime(t)}
                    className={[
                      'rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 time-num',
                      draftTime === t
                        ? 'bg-stone-800 text-[#fff8ee]'
                        : 'bg-white/90 ring-1 ring-stone-200 text-stone-600',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={() => setDraftTime(formatNowTime())}
                  className={[
                    'rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95',
                    !QUICK_TIMES.includes(draftTime as typeof QUICK_TIMES[number]) && draftTime === formatNowTime()
                      ? 'bg-stone-800 text-[#fff8ee]'
                      : 'bg-white/90 ring-1 ring-stone-200 text-stone-600',
                  ].join(' ')}
                >
                  Now
                </button>
              </div>
            </div>

            {/* Focus block length */}
            <div className="px-5 pt-4">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Focus block
              </p>
              <div className="flex gap-1.5">
                {FOCUS_LENGTHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setDraftFocus(m)}
                    className={[
                      'flex-1 rounded-full py-1.5 text-[13px] font-semibold transition active:scale-95 time-num',
                      draftFocus === m
                        ? 'bg-stone-800 text-[#fff8ee]'
                        : 'bg-white/90 ring-1 ring-stone-200 text-stone-600',
                    ].join(' ')}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="px-5 pb-6 pt-5">
              <button
                onClick={() => {
                  setRoutine({
                    ...routine,
                    subjects: draftSubjects,
                    startTime: draftTime,
                    focusMinutes: draftFocus,
                  });
                  setShowPlanEditor(false);
                }}
                className="btn-soft btn-primary w-full text-[15px]"
              >
                Save plan
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </Motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* ModeOption — quiet picker row.                                          */
/* Uses the existing `btn-mint` / `btn-lav` palette so the picker stays    */
/* inside the design system instead of inventing one-off gradients.        */
/* ---------------------------------------------------------------------- */
function ModeOption({
  emoji,
  title,
  subtitle,
  meta,
  tone,
  isLastUsed,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  meta: string;
  tone: 'mint' | 'lav';
  isLastUsed: boolean;
  onClick: () => void;
}) {
  const palette = tone === 'mint'
    ? { active: 'btn-mint', textOn: '#18382b', icon: <Users className="h-3 w-3" /> }
    : { active: 'btn-lav',  textOn: '#2c2150', icon: <Headphones className="h-3 w-3" /> };

  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-4 rounded-[20px] px-4 py-3.5 text-left transition active:scale-[0.97]',
        isLastUsed
          ? `${palette.active} shadow-md`
          : 'bg-white/90 ring-1 ring-stone-200/60',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[26px] leading-none',
          isLastUsed ? 'bg-white/30' : 'bg-stone-50',
        ].join(' ')}
      >
        {emoji}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: isLastUsed ? palette.textOn : '#3a3c38' }}
        >
          {title}
        </span>
        <span
          className="truncate text-[12px] font-medium"
          style={{ color: isLastUsed ? `${palette.textOn}b3` : '#9ca29a' }}
        >
          {subtitle}
        </span>
        <span
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: isLastUsed ? `${palette.textOn}cc` : '#9ca29a' }}
        >
          {palette.icon} {isLastUsed ? 'Last used' : meta}
        </span>
      </div>
    </button>
  );
}
