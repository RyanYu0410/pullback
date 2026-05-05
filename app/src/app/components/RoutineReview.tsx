import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { Pencil, Users, User } from 'lucide-react';
import { BellSVG } from './PullBell';

interface Block {
  kind: 'focus' | 'break';
  label: string;
  minutes: number;
  startsAt: string; // formatted
  emoji: string;
  tone: string;
}

const PULL_THRESHOLD = 80;

function fmt(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      tone: 'bg-rose-50 ring-rose-200',
    });
    cursor.setMinutes(cursor.getMinutes() + focusMinutes);
    if (i < subjectsCount - 1) {
      blocks.push({
        kind: 'break',
        label: 'Break',
        minutes: breakMinutes,
        startsAt: fmt(cursor),
        emoji: '🍪',
        tone: 'bg-amber-50 ring-amber-200',
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

export function RoutineReview() {
  const navigate = useNavigate();
  const {
    routine,
    setRouteItems,
    setNote,
    setPace,
    setPaceMinutes,
    setIsLinePulled,
    friends,
  } = useAppContext();

  const blocks = useMemo(
    () => buildBlocks(routine.startTime, routine.subjects, routine.focusMinutes, routine.breakMinutes),
    [routine.startTime, routine.subjects, routine.focusMinutes, routine.breakMinutes],
  );

  /* Sync the legacy routeItems list (used by FocusSession's task list)
     from the generated focus blocks whenever the routine changes. */
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

  const focusingNow = friends.filter((f) => f.status === 'focusing').length;

  const totalMinutes = blocks.reduce((sum, b) => sum + b.minutes, 0);

  /* Pull-string at the bottom — same spring engine as Welcome's pendant. */
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

    const apply = (y: number) => {
      pendantRef.current?.setAttribute('transform', `translate(0, ${y})`);
      stringRef.current?.setAttribute('y2', String(20 + y));
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
      apply(offset);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');
      if (pull >= PULL_THRESHOLD) {
        setIsLinePulled(true);
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
  }, [navigate, setIsLinePulled]);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-2">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-rose-400">
            Today
          </span>
          <h2 className="text-[22px] font-bold leading-tight text-stone-800">
            My After-School Plan
          </h2>
        </div>
        <button
          onClick={() => navigate('/setup/start-time')}
          aria-label="Edit plan"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition active:scale-95"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* Pull bell — hangs from the top of the content like every other
          screen's bell does. */}
      <div className="mt-2 flex flex-col items-center">
        <div
          ref={pullWrapRef}
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
          Pull to start
        </span>
      </div>

      {/* Summary chips */}
      <div className="mt-3 flex flex-wrap gap-2 px-6">
        <Chip>{`Starts ${blocks[0]?.startsAt ?? '4:00 PM'}`}</Chip>
        <Chip>{`${routine.focusMinutes}m focus · ${routine.breakMinutes}m break`}</Chip>
        <Chip>{`About ${totalMinutes}m total`}</Chip>
        <Chip>
          {routine.mode === 'together'
            ? <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Together</span>
            : <span className="flex items-center gap-1"><User className="h-3 w-3" /> Alone</span>}
        </Chip>
      </div>

      {/* Friends now strip */}
      {routine.mode === 'together' && (
        <div className="mt-3 flex items-center gap-2 px-6">
          <span className="text-[12px] font-semibold text-emerald-600">
            🟢 {focusingNow} friend{focusingNow === 1 ? '' : 's'} focusing now
          </span>
          <div className="flex -space-x-1.5">
            {friends.filter((f) => f.status === 'focusing').slice(0, 4).map((f) => (
              <span
                key={f.id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fff8ee] bg-white text-[14px] shadow-sm"
              >
                {f.emoji}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Blocks list */}
      <div className="mt-4 flex-1 overflow-y-auto no-scrollbar px-6 pb-8">
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-rose-200 via-amber-200 to-emerald-200" />
          <div className="flex flex-col gap-3">
            {blocks.map((b, i) => (
              <Motion.div
                key={i}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className={[
                  'relative rounded-2xl px-4 py-3 ring-1',
                  b.tone,
                ].join(' ')}
              >
                <span className="absolute -left-[18px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#fff8ee] bg-stone-700" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[20px]">{b.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-stone-800">
                        {b.label}
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">
                        {b.startsAt} · {b.minutes} min
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    {b.kind === 'focus' ? 'Focus' : 'Break'}
                  </span>
                </div>
              </Motion.div>
            ))}
          </div>
        </div>
      </div>

    </Motion.div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-stone-600 shadow-sm">
      {children}
    </span>
  );
}
