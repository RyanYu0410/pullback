import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAppContext, formatOnlineUsers } from '../context/AppContext';
import { Motion } from './Motion';
import { Plus, Users, X, Headphones, ArrowRight, Hash } from 'lucide-react';
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
const REMOVE_REVEAL  = 88;

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

  if (subjects.length === 0) return [];

  const subjectsCount = subjects.length;
  const blocks: Block[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < subjectsCount; i++) {
    const subj = subjects[i];
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
  const location = useLocation();
  const fromRoom = !!(location.state as { openPlanEditor?: boolean } | null)?.openPlanEditor;
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
    isDark,
  } = useAppContext();

  const c = {
    bg:        isDark ? 'transparent'                   : 'transparent',
    text:      isDark ? 'rgba(255,255,255,0.88)'         : '#3a3c38',
    sub:       isDark ? 'rgba(255,255,255,0.40)'         : '#9ca29a',
    dim:       isDark ? 'rgba(255,255,255,0.22)'         : '#c4c0ba',
    rowBg:     isDark ? 'transparent'                   : '#fff8ee',
    rowBorder: isDark ? 'rgba(255,255,255,0.08)'         : 'rgba(0,0,0,0.05)',
    emptyBg:   isDark ? 'rgba(255,255,255,0.06)'        : 'transparent',
    emptyBorder: isDark ? 'rgba(255,255,255,0.14)'      : 'rgba(0,0,0,0.12)',
    removeBg:  isDark ? '#3a1a1a'                        : '#fff1f2',
    removeColor: isDark ? '#f87171'                     : '#ef4444',
    btnBg:     isDark ? 'rgba(255,255,255,0.10)'         : 'rgba(244,244,240,0.9)',
    btnColor:  isDark ? 'rgba(255,255,255,0.60)'         : '#6b6f68',
    avatarOutline: isDark ? 'rgba(255,255,255,0.18)'     : 'rgba(251,113,133,0.30)',
    card:      isDark ? 'rgba(28,28,36,0.97)'            : '#fff8ee',
    border:    isDark ? 'rgba(255,255,255,0.10)'         : 'rgba(0,0,0,0.06)',
  };

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
  const [revealedRemoveIndex, setRevealedRemoveIndex] = useState<number | null>(null);

  const removeFocusSubject = (label: string) => {
    setRoutine({
      ...routine,
      subjects: routine.subjects.filter((s) => s !== label),
    });
    setRevealedRemoveIndex(null);
  };

  const addSubjectInputRef = useRef<HTMLInputElement>(null);

  const openPlanEditor = (focusInput = false) => {
    setDraftSubjects([...routine.subjects]);
    setDraftTime(routine.startTime);
    setDraftFocus(routine.focusMinutes);
    setCustomSubject('');
    setShowPlanEditor(true);
    if (focusInput) {
      setTimeout(() => addSubjectInputRef.current?.focus(), 80);
    }
  };

  // Ref so the bell's stale closure can read the current plan state.
  const hasPlanRef = useRef(routine.subjects.length > 0);
  useEffect(() => { hasPlanRef.current = routine.subjects.length > 0; }, [routine.subjects.length]);

  // When navigated here from the room's "sit" button, open the plan editor immediately.
  useEffect(() => {
    if (fromRoom) openPlanEditor();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (hasPlanRef.current) setShowPicker(true); else openPlanEditor();
      } else if (!didDrag) {
        if (hasPlanRef.current) setShowPicker(true); else openPlanEditor();
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
          style={{display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,height:'2.5rem',width:'2.5rem',borderRadius:'9999px',background:'rgba(255,255,255,0.92)',fontSize:20,lineHeight:1,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',outline:`1.5px solid ${c.avatarOutline}`,outlineOffset:'-0.5px',transition:'transform 0.12s ease'}}
        >
          {userEmoji || '🐶'}
        </button>

        <div className="min-w-0 flex-1">
          <span style={{color:c.sub}} className="text-[10px] font-semibold uppercase tracking-[0.2em]">Today</span>
          <h2 style={{color: c.text}} className="truncate text-[20px] font-bold leading-tight tracking-tight">
            {userName ? `${userName}’s plan` : 'My plan'}
          </h2>
        </div>

        <button
          onClick={() => openPlanEditor(true)}
          aria-label="Add subject"
          style={{background:c.btnBg,color:c.btnColor}}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition active:scale-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
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
        <span style={{color:c.sub}} className="mt-1 text-[11px] font-medium tracking-wide">tap or pull to begin</span>
      </div>

      {/* SCHEDULE */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-7 pt-4">
        <div className="flex items-baseline justify-between">
          <span style={{color:c.sub}} className="text-[12px] font-semibold uppercase tracking-[0.2em]">Schedule</span>
          <span style={{color:c.sub}} className="text-[12px] font-semibold tracking-wide time-num">{totalMinutes}m total</span>
        </div>

        <div className="mt-2">
          {blocks.length === 0 ? (
            <button
              type="button"
              onClick={openPlanEditor}
              className="w-full rounded-2xl px-4 py-5 text-left transition active:scale-[0.99]"
              style={{border:`1px dashed ${c.emptyBorder}`,background:c.emptyBg}}
            >
              <p style={{color:c.text}} className="text-[16px] font-semibold">No subjects yet</p>
              <p style={{color:c.sub}} className="mt-1 text-[14px]">Tap to set today's study plan.</p>
            </button>
          ) : blocks.map((b, i) => {
            if (b.kind === 'break') {
              return (
                <Motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.04 * i }}
                  className="schedule-row"
                >
                  <span style={{color:c.dim}} className="time-num text-[13px] font-semibold">{b.startsAt}</span>
                  <span className="flex items-center gap-2.5 truncate">
                    <span style={{color:c.dim}} className="flex-shrink-0 text-[15px] leading-none">{b.emoji}</span>
                    <span style={{color:c.dim}} className="truncate text-[14px] font-medium">{b.label}</span>
                  </span>
                  <span style={{color:c.dim}} className="time-num text-[12px] font-medium">{b.minutes}m</span>
                </Motion.div>
              );
            }

            const isRevealed = revealedRemoveIndex === i;

            return (
              <Motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.04 * i }}
                className="relative overflow-hidden"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFocusSubject(b.label);
                  }}
                  aria-label={`Remove ${b.label}`}
                  className="absolute inset-y-0 right-0 z-0 flex w-[88px] items-center justify-end pr-3 text-[11px] font-bold uppercase tracking-[0.06em]"
                  style={{background:c.removeBg,color:c.removeColor,opacity:isRevealed?1:0,pointerEvents:isRevealed?'auto':'none',transition:'opacity 0.18s'}}
                >
                  Remove ✕
                </button>

                <Motion.div
                  drag="x"
                  dragConstraints={{ left: -REMOVE_REVEAL, right: 0 }}
                  dragElastic={0.08}
                  dragMomentum={false}
                  animate={{ x: isRevealed ? -REMOVE_REVEAL : 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -48 || info.velocity.x < -280) {
                      setRevealedRemoveIndex(i);
                      return;
                    }
                    if (isRevealed && info.offset.x > -24) {
                      setRevealedRemoveIndex(null);
                    }
                  }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (isRevealed) {
                      setRevealedRemoveIndex(null);
                      return;
                    }
                    navigate('/');
                  }}
                  className="schedule-row relative z-10 cursor-pointer"
                  style={{ touchAction:'pan-y', background:c.rowBg }}
                >
                  <span style={{color:c.sub}} className="time-num text-[13px] font-semibold">{b.startsAt}</span>
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="flex-shrink-0 text-[17px] leading-none">{b.emoji}</span>
                    <span style={{color:c.text}} className="truncate text-[15px] font-semibold">{b.label}</span>
                  </span>
                  <span style={{color:c.sub}} className="time-num text-[12px] font-medium">{b.minutes}m</span>
                </Motion.div>
              </Motion.div>
            );
          })}
        </div>

        {/* Footer: online count */}
        <div className="mt-6 flex items-center justify-center gap-2 pb-4">
          <span className="online-dot" />
          <span style={{color:c.sub}} className="text-[13px] font-medium time-num">{formatOnlineUsers()}</span>
        </div>
      </div>

      {/* MODE PICKER SHEET */}
      {showPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose study mode"
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowPicker(false); setPickerStep('mode'); setCodeInput(''); }}
        >
          <Motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="mx-3 mb-4 overflow-hidden rounded-[28px] shadow-2xl"
            style={{ background: c.card, border: `1px solid ${c.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-9 rounded-full" style={{ background: c.dim }} />
            </div>

            {/* Sheet header */}
            <div className="flex items-start justify-between px-6 pb-1 pt-4">
              <div>
                {pickerStep === 'mode' ? (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: c.sub }}>
                      Begin
                    </span>
                    <p className="mt-0.5 text-[20px] font-bold leading-tight tracking-tight" style={{ color: c.text }}>
                      Choose your space
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[20px] font-bold leading-tight tracking-tight" style={{ color: c.text }}>
                      Study together
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => { setShowPicker(false); setPickerStep('mode'); setCodeInput(''); }}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90"
                style={{ background: c.btnBg, color: c.btnColor }}
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
                  dark={isDark}
                  isLastUsed={routine.mode === 'together'}
                  onClick={() => setPickerStep('code')}
                />
                <ModeOption
                  emoji="🧘"
                  title="Study alone"
                  subtitle="A quiet, private session"
                  meta="Solo session"
                  tone="lav"
                  dark={isDark}
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
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: c.btnBg, border: `1px solid ${c.border}` }}
                >
                  <Hash className="h-4 w-4 flex-shrink-0" style={{ color: c.dim }} strokeWidth={2} />
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) =>
                      setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
                    }
                    placeholder="Enter room code"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-bold tracking-[0.12em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:opacity-30"
                    style={{ color: c.text }}
                  />
                  {codeInput.length > 0 && (
                    <button
                      onClick={() => setCodeInput('')}
                      className="transition"
                      style={{ color: c.dim }}
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
                    codeInput.length >= 3 ? 'btn-mint shadow-md' : '',
                  ].join(' ')}
                  style={codeInput.length < 3 ? { background: c.btnBg, color: c.sub, border: `1px solid ${c.border}` } : undefined}
                >
                  <span className="text-[14px] font-bold">Join this room</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </button>

                {/* Divider */}
                <div className="my-4 flex items-center gap-3">
                  <hr className="flex-1" style={{ borderColor: c.border }} />
                  <span className="text-[11px] font-semibold" style={{ color: c.sub }}>or</span>
                  <hr className="flex-1" style={{ borderColor: c.border }} />
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
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.98]"
                  style={{ background: c.btnBg, border: `1px solid ${c.border}` }}
                >
                  <span className="flex flex-col">
                    <span className="text-[14px] font-bold" style={{ color: c.text }}>Create a new room</span>
                    <span className="mt-0.5 text-[11px]" style={{ color: c.sub }}>We'll give you a shareable code</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: c.dim }} strokeWidth={2} />
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
            className="mx-3 mb-4 overflow-hidden rounded-[28px] shadow-2xl"
            style={{ background: c.card, border: `1px solid ${c.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-9 rounded-full" style={{ background: c.dim }} />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pb-0 pt-4">
              <div>
                <span style={{ color: c.sub }} className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Today's focus
                </span>
                <p style={{ color: c.text }} className="mt-0.5 text-[20px] font-bold tracking-tight">
                  Set my study plan
                </p>
              </div>
              <button onClick={() => setShowPlanEditor(false)} aria-label="Close"
                style={{ background: c.btnBg, color: c.sub }}
                className="icon-btn-sm">
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>

            {/* Subjects */}
            <div className="px-5 pt-5">
              <p style={{ color: c.sub }} className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
                Subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUBJECTS.map((s) => {
                  const active = draftSubjects.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleDraftSubject(s)}
                      style={active
                        ? { background: c.text, color: c.card }
                        : { background: c.btnBg, color: c.sub, boxShadow: `0 0 0 1px ${c.border}` }}
                      className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95"
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {/* Custom subject input */}
              <div className="mt-2 flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{ background: c.btnBg, boxShadow: `0 0 0 1px ${c.border}` }}>
                <Plus className="h-3.5 w-3.5 flex-shrink-0" style={{ color: c.dim }} strokeWidth={2} />
                <input
                  ref={addSubjectInputRef}
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustomSubject(); }}
                  placeholder="Add subject…"
                  style={{ color: c.text }}
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-30"
                />
                {customSubject.trim().length > 0 && (
                  <button
                    onClick={addCustomSubject}
                    style={{ background: c.text, color: c.card }}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  >
                    Add
                  </button>
                )}
              </div>
              {/* Chips for custom-added subjects */}
              {draftSubjects.filter((s) => !QUICK_SUBJECTS.includes(s as typeof QUICK_SUBJECTS[number])).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draftSubjects
                    .filter((s) => !QUICK_SUBJECTS.includes(s as typeof QUICK_SUBJECTS[number]))
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleDraftSubject(s)}
                        style={{ background: c.text, color: c.card }}
                        className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95"
                      >
                        {s} ✕
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Start time */}
            <div className="px-5 pt-4">
              <p style={{ color: c.sub }} className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
                Starts at
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraftTime(t)}
                    style={draftTime === t
                      ? { background: c.text, color: c.card }
                      : { background: c.btnBg, color: c.sub, boxShadow: `0 0 0 1px ${c.border}` }}
                    className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 time-num"
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={() => setDraftTime(formatNowTime())}
                  style={(!QUICK_TIMES.includes(draftTime as typeof QUICK_TIMES[number]) && draftTime === formatNowTime())
                    ? { background: c.text, color: c.card }
                    : { background: c.btnBg, color: c.sub, boxShadow: `0 0 0 1px ${c.border}` }}
                  className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-95"
                >
                  Now
                </button>
              </div>
            </div>

            {/* Focus block length */}
            <div className="px-5 pt-4">
              <p style={{ color: c.sub }} className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
                Focus block
              </p>
              <div className="flex gap-1.5">
                {FOCUS_LENGTHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setDraftFocus(m)}
                    style={draftFocus === m
                      ? { background: c.text, color: c.card }
                      : { background: c.btnBg, color: c.sub, boxShadow: `0 0 0 1px ${c.border}` }}
                    className="flex-1 rounded-full py-1.5 text-[13px] font-semibold transition active:scale-95 time-num"
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
                  if (fromRoom) navigate('/session');
                }}
                className="btn-soft w-full text-[15px]"
                style={{ background: c.text, color: c.card }}
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
  dark = false,
  isLastUsed,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  meta: string;
  tone: 'mint' | 'lav';
  dark?: boolean;
  isLastUsed: boolean;
  onClick: () => void;
}) {
  const palette = tone === 'mint'
    ? { activeBg: dark ? 'rgba(52,211,153,0.18)' : undefined, activeCls: dark ? '' : 'btn-mint', textOn: dark ? '#5eead4' : '#18382b', icon: <Users className="h-3 w-3" /> }
    : { activeBg: dark ? 'rgba(167,139,250,0.18)' : undefined, activeCls: dark ? '' : 'btn-lav',  textOn: dark ? '#c4b5fd' : '#2c2150', icon: <Headphones className="h-3 w-3" /> };

  const inactiveBg   = dark ? 'rgba(255,255,255,0.07)' : undefined;
  const inactiveCls  = dark ? '' : 'bg-white/90 ring-1 ring-stone-200/60';
  const inactiveBorder = dark ? '1px solid rgba(255,255,255,0.10)' : undefined;

  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-4 rounded-[20px] px-4 py-3.5 text-left transition active:scale-[0.97]',
        isLastUsed
          ? palette.activeCls + (dark ? ' shadow-lg' : ' shadow-md')
          : inactiveCls,
      ].join(' ')}
      style={isLastUsed
        ? (dark ? { background: palette.activeBg, border: `1px solid ${palette.textOn}40` } : undefined)
        : (dark ? { background: inactiveBg, border: inactiveBorder } : undefined)}
    >
      <span
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[26px] leading-none"
        style={{ background: isLastUsed
          ? (dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.30)')
          : (dark ? 'rgba(255,255,255,0.08)' : '#f5f5f2') }}
      >
        {emoji}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: isLastUsed ? palette.textOn : (dark ? 'rgba(255,255,255,0.88)' : '#3a3c38') }}
        >
          {title}
        </span>
        <span
          className="truncate text-[12px] font-medium"
          style={{ color: isLastUsed ? `${palette.textOn}bb` : (dark ? 'rgba(255,255,255,0.42)' : '#9ca29a') }}
        >
          {subtitle}
        </span>
        <span
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: isLastUsed ? `${palette.textOn}99` : (dark ? 'rgba(255,255,255,0.30)' : '#9ca29a') }}
        >
          {palette.icon} {isLastUsed ? 'Last used' : meta}
        </span>
      </div>
    </button>
  );
}
