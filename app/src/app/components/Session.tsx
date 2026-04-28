import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion, AnimatePresence } from './Motion';
import { Check, ChevronUp, CornerDownLeft, X, Pause, Clock, Play } from 'lucide-react';

type LineState = 'steady' | 'drift' | 'returned';

const accentBg: Record<string, string> = {
  red: 'bg-rose-50',
  green: 'bg-emerald-50',
  yellow: 'bg-amber-50',
  blue: 'bg-sky-50',
  app: 'bg-stone-50',
  white: 'bg-white',
};

const accentDot: Record<string, string> = {
  red: 'bg-rose-300',
  green: 'bg-emerald-300',
  yellow: 'bg-amber-300',
  blue: 'bg-sky-300',
  app: 'bg-stone-300',
  white: 'bg-stone-300',
};

export function Session() {
  const navigate = useNavigate();
  const {
    note,
    routeItems,
    completedIds,
    toggleCompleted,
    setSessionActive,
    resetSession,
    activeRouteId,
    addReflectionToRoute,
  } = useAppContext();

  const [islandExpanded, setIslandExpanded] = useState(false);
  const [done, setDone] = useState(false);
  const [lineState, setLineState] = useState<LineState>('steady');
  const [hasReturned, setHasReturned] = useState(false);
  const [reflection, setReflection] = useState('');
  const [reflectionTag, setReflectionTag] = useState<string | null>(null);

  useEffect(() => {
    setSessionActive(true);
  }, [setSessionActive]);

  // Auto-drift after a quiet pause; only once per session
  useEffect(() => {
    if (lineState !== 'steady' || hasReturned) return;
    const t = setTimeout(() => setLineState('drift'), 12000);
    return () => clearTimeout(t);
  }, [lineState, hasReturned]);

  const total = routeItems.length;
  const completedCount = completedIds.length;
  const progress = total === 0 ? 0 : completedCount / total;
  const currentItem = routeItems.find((i) => !completedIds.includes(i.id)) ?? routeItems[routeItems.length - 1];

  useEffect(() => {
    if (total > 0 && completedCount === total) {
      const t = setTimeout(() => setDone(true), 600);
      return () => clearTimeout(t);
    }
  }, [completedCount, total]);

  const onReturn = () => {
    setLineState('returned');
    setHasReturned(true);
    setIslandExpanded(false);
    setTimeout(() => setLineState('steady'), 2200);
  };
  const onPause = () => setLineState('steady');
  const onLetGo = () => {
    resetSession();
    navigate('/');
  };

  const handleReturn = () => {
    setSessionActive(false);
    navigate('/');
  };
  const handleEndEarly = () => {
    resetSession();
    navigate('/');
  };

  const handleFinish = () => {
    if (activeRouteId) {
      const tag = reflectionTag ?? (hasReturned ? 'Came back in time' : 'Held steady');
      const text = reflection.trim() ? `${tag} — ${reflection.trim()}` : tag;
      addReflectionToRoute(activeRouteId, text);
    }
    resetSession();
    navigate('/');
  };

  if (done) {
    return <VictoryRecord
      note={note}
      hasReturned={hasReturned}
      reflection={reflection}
      setReflection={setReflection}
      reflectionTag={reflectionTag}
      setReflectionTag={setReflectionTag}
      onSave={handleFinish}
    />;
  }

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col"
    >
      <DynamicIsland
        expanded={islandExpanded}
        onToggle={() => setIslandExpanded((v) => !v)}
        lineState={lineState}
        progress={progress}
        note={note}
        currentLabel={currentItem?.label ?? '—'}
        completedCount={completedCount}
        total={total}
        onReturn={onReturn}
        onPause={onPause}
        onLetGo={onLetGo}
        onSessionReturn={handleReturn}
        onEndEarly={handleEndEarly}
      />

      <Motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 overflow-y-auto no-scrollbar px-8 pb-16 pt-10"
      >
        <RouteList items={routeItems} completedIds={completedIds} onToggle={toggleCompleted} progress={progress} lineState={lineState} />
      </Motion.div>
    </Motion.div>
  );
}

/* -------------------- Dynamic Island -------------------- */

function lineCopy(state: LineState) {
  if (state === 'drift') return { kicker: 'The line is loosening', sub: 'You can still come back.' };
  if (state === 'returned') return { kicker: 'You pulled it back', sub: 'Still yours.' };
  return { kicker: 'Line steady', sub: 'Still yours.' };
}

function DynamicIsland({
  expanded,
  onToggle,
  lineState,
  progress,
  note,
  currentLabel,
  completedCount,
  total,
  onReturn,
  onPause,
  onLetGo,
  onSessionReturn,
  onEndEarly,
}: {
  expanded: boolean;
  onToggle: () => void;
  lineState: LineState;
  progress: number;
  note: string;
  currentLabel: string;
  completedCount: number;
  total: number;
  onReturn: () => void;
  onPause: () => void;
  onLetGo: () => void;
  onSessionReturn: () => void;
  onEndEarly: () => void;
}) {
  const { kicker, sub } = lineCopy(lineState);
  const tone =
    lineState === 'drift'
      ? { dot: 'bg-rose-300', text: 'text-rose-200', stroke: 'stroke-rose-300' }
      : lineState === 'returned'
      ? { dot: 'bg-sky-300', text: 'text-sky-200', stroke: 'stroke-sky-300' }
      : { dot: 'bg-emerald-300', text: 'text-stone-200', stroke: 'stroke-emerald-300' };

  return (
    <div className="absolute left-1/2 top-[-30px] z-50 -translate-x-1/2">
      <Motion.div
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="overflow-hidden text-white"
        style={{
          borderRadius: expanded ? 24 : 999,
          width: expanded ? 304 : 168,
          height: expanded ? (lineState === 'steady' ? 220 : 268) : 32,
          background: 'rgba(20,20,20,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        }}
      >
        {!expanded ? (
          <button onClick={onToggle} className="flex h-full w-full items-center gap-2.5 px-4">
            <Motion.span
              initial={{ scale: 1, opacity: 1 }}
              animate={{
                scale: lineState === 'drift' ? [1, 1.3, 1] : 1,
                opacity: lineState === 'drift' ? [0.6, 1, 0.6] : 1,
              }}
              transition={{ repeat: lineState === 'drift' ? Infinity : 0, duration: 1.6 }}
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
            />
            <MiniLine state={lineState} className="h-3 flex-1" />
          </button>
        ) : (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex h-full w-full flex-col px-5 py-4"
          >
            {/* Header — status pill + collapse */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                <span className={`text-[11px] font-medium tracking-wide ${tone.text}`}>{kicker}</span>
              </div>
              <button onClick={onToggle} className="text-white/40 transition active:text-white/80">
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Sub-copy — italic serif for warmth */}
            <span className="mt-0.5 font-serif text-[12px] italic text-white/50">{sub}</span>

            {/* Note pill + line graph */}
            <div className="relative mt-4 h-14 w-full">
              <Motion.div
                animate={{
                  y: lineState === 'drift' ? -4 : 0,
                  rotate: lineState === 'drift' ? -2 : 0,
                  opacity: lineState === 'drift' ? 0.6 : 1,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="absolute left-0 top-0 max-w-[180px] truncate rounded-full px-3 py-1 font-serif text-[11px] italic text-white/85"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                "{note}"
              </Motion.div>
              <MiniLine state={lineState} className="absolute bottom-0 left-0 right-0 h-6" tall />
            </div>

            {/* Progress + count */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-[2px] flex-1 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white/80 transition-all duration-500"
                  style={{ width: `${(completedCount / Math.max(total, 1)) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-white/40">
                {completedCount}/{total}
              </span>
            </div>

            {/* Action buttons */}
            {lineState === 'drift' ? (
              <div className="mt-4 grid grid-cols-4 gap-1.5">
                <IslandBtn onClick={onReturn} primary aria-label="Return"><CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} /></IslandBtn>
                <IslandBtn onClick={onPause} aria-label="Pause"><Pause className="h-3.5 w-3.5" strokeWidth={1.5} /></IslandBtn>
                <IslandBtn onClick={onPause} aria-label="Stay"><Clock className="h-3.5 w-3.5" strokeWidth={1.5} /></IslandBtn>
                <IslandBtn onClick={onLetGo} danger aria-label="Let go"><X className="h-3.5 w-3.5" strokeWidth={1.5} /></IslandBtn>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-1.5">
                <IslandBtn onClick={onSessionReturn} aria-label="Return">
                  <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                </IslandBtn>
                <IslandBtn onClick={onEndEarly} danger aria-label="End">
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </IslandBtn>
              </div>
            )}
          </Motion.div>
        )}
      </Motion.div>
    </div>
  );
}

function IslandBtn({
  children,
  onClick,
  primary,
  danger,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  'aria-label'?: string;
}) {
  const base = 'flex h-9 items-center justify-center gap-1 rounded-xl text-[11px] font-light transition active:scale-95';
  const tone = primary
    ? 'bg-white text-stone-900'
    : danger
    ? 'bg-rose-500/15 text-rose-200/90'
    : 'bg-white/8 text-white/85';
  return (
    <button
      onClick={onClick}
      className={`${base} ${tone}`}
      style={primary ? undefined : { background: tone.includes('white/8') ? 'rgba(255,255,255,0.08)' : undefined }}
      {...rest}
    >
      {children}
    </button>
  );
}

/* The thin line illustration that lives inside Live Activity surfaces. */
function MiniLine({ state, className = '', tall }: { state: LineState; className?: string; tall?: boolean }) {
  const stroke =
    state === 'drift' ? '#fda4af' : state === 'returned' ? '#7dd3fc' : '#6ee7b7';
  const strokeW = state === 'drift' ? 1 : 1.5;

  // path varies per state
  const paths: Record<LineState, string> = {
    steady: 'M2 12 L62 12',
    drift:  'M2 12 C 14 8, 22 18, 32 12 S 50 6, 62 14',
    returned: 'M2 12 L62 12',
  };

  return (
    <svg viewBox={`0 0 64 ${tall ? 24 : 16}`} preserveAspectRatio="none" className={className}>
      {/* track */}
      <line x1="2" y1={tall ? 18 : 12} x2="62" y2={tall ? 18 : 12} stroke="#3f3f46" strokeWidth="0.5" />
      <Motion.path
        d={tall ? paths[state].replace(/12/g, '18').replace(/14/g, '20').replace(/8/g, '12').replace(/6/g, '8') : paths[state]}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
        initial={{ opacity: 1 }}
        animate={state === 'drift' ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
        transition={{ repeat: state === 'drift' ? Infinity : 0, duration: 2 }}
      />
      {/* anchor dots */}
      <circle cx="2" cy={tall ? 18 : 12} r="1.6" fill={stroke} />
      <circle cx="62" cy={tall ? 18 : 12} r="1.6" fill={stroke} />
    </svg>
  );
}

/* -------------------- Route check-in -------------------- */

function NoteCheckIn({ note, progress, lineState }: { note: string; progress: number; lineState: LineState }) {
  return (
    <div className="mb-10 flex flex-col items-center">
      <Motion.div
        animate={{
          y: lineState === 'drift' ? -4 : 0,
          rotate: lineState === 'drift' ? -1.5 : 0,
        }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        className={`relative w-full max-w-[280px] rounded-3xl border bg-white/80 px-6 py-5 backdrop-blur-sm transition-colors ${
          lineState === 'drift' ? 'border-rose-200 shadow-[0_4px_20px_rgba(244,63,94,0.08)]' : 'border-stone-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
        }`}
      >
        <p className="text-center text-[16px] font-light italic text-stone-700">"{note}"</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-stone-100">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-stone-400"
            />
          </div>
        </div>
      </Motion.div>
    </div>
  );
}

function RouteList({
  items,
  completedIds,
  onToggle,
  progress,
  lineState,
}: {
  items: { id: string; type: string; label: string }[];
  completedIds: string[];
  onToggle: (id: string) => void;
  progress: number;
  lineState: LineState;
}) {
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const firstUncompletedId = items.find((i) => !completedSet.has(i.id))?.id;

  const lineColor = lineState === 'drift' ? 'bg-rose-200' : lineState === 'returned' ? 'bg-sky-200' : 'bg-stone-200';

  return (
    <div className="relative flex flex-col items-stretch">
      <div className={`absolute left-5 top-2 bottom-2 w-[1px] ${lineColor}`} />
      <Motion.div
        initial={{ height: 0 }}
        animate={{ height: `${progress * 100}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute left-5 top-2 w-[1px] bg-stone-700"
      />
      {items.map((item, index) => {
        const isCompleted = completedSet.has(item.id);
        const isCurrent = item.id === firstUncompletedId;
        return (
          <Motion.button
            key={item.id}
            layout
            onClick={() => onToggle(item.id)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative mb-3 flex items-center gap-4 pl-0 pr-2 text-left"
          >
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
                isCompleted
                  ? 'border-emerald-300 bg-emerald-50'
                  : isCurrent
                  ? 'border-stone-700 bg-white'
                  : 'border-stone-200 bg-white'
              }`}
            >
              {isCompleted ? (
                <Check className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
              ) : (
                <span className={`h-2 w-2 rounded-full ${accentDot[item.type] ?? 'bg-stone-300'}`} />
              )}
            </div>
            <div
              className={`flex-1 rounded-2xl border px-5 py-3 transition-all ${
                isCompleted
                  ? 'border-stone-100 bg-stone-50/60'
                  : `border-stone-200 ${accentBg[item.type] ?? 'bg-white'}`
              }`}
            >
              <span
                className={`text-[15px] font-light ${
                  isCompleted ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-700'
                }`}
              >
                {item.label}
              </span>
            </div>
          </Motion.button>
        );
      })}
    </div>
  );
}

/* -------------------- Lock screen notification -------------------- */

function LockScreenView({
  note,
  currentLabel,
  completedCount,
  total,
  lineState,
  onReturn,
  onPause,
  onLetGo,
}: {
  note: string;
  currentLabel: string;
  completedCount: number;
  total: number;
  lineState: LineState;
  onReturn: () => void;
  onPause: () => void;
  onLetGo: () => void;
}) {
  const { kicker, sub } = lineCopy(lineState);
  const dot = lineState === 'drift' ? 'bg-rose-300' : lineState === 'returned' ? 'bg-sky-300' : 'bg-emerald-300';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: lineState === 'drift' ? '#e7e5e0' : '#eee9e1',
      }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.6 }}
      className="flex h-full flex-col items-center bg-gradient-to-b from-stone-100 to-stone-200/60 px-6 pb-28 pt-10"
    >
      <span className="text-[44px] font-extralight tracking-tight text-stone-700">21:14</span>

      <div className="mt-8 w-full max-w-[320px]">
        <Motion.div
          layout
          className={`rounded-3xl border p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl ${
            lineState === 'drift' ? 'border-rose-100 bg-white/75' : 'border-white/60 bg-white/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <Motion.span
              initial={{ scale: 1 }}
              animate={{ scale: lineState === 'drift' ? [1, 1.3, 1] : 1 }}
              transition={{ repeat: lineState === 'drift' ? Infinity : 0, duration: 1.6 }}
              className={`h-1.5 w-1.5 rounded-full ${dot}`}
            />
            <span className="text-[11px] font-light text-stone-700">{kicker}</span>
            <span className="ml-auto text-[10px] font-light italic text-stone-400">{sub}</span>
          </div>

          {/* note + line illustration */}
          <div className="relative mt-3 h-16">
            <Motion.div
              animate={{
                y: lineState === 'drift' ? -8 : 0,
                rotate: lineState === 'drift' ? -2 : 0,
              }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
              className="absolute left-2 top-0 max-w-[80%] truncate rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-light italic text-stone-700"
            >
              "{note}"
            </Motion.div>
            <div className="absolute bottom-0 left-0 right-0">
              <SoftLine state={lineState} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i < completedCount ? 'bg-stone-700' : 'bg-stone-300'}`}
              />
            ))}
          </div>

          {lineState === 'drift' ? (
            <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-stone-100 pt-3">
              <NotifBtn onClick={onReturn} primary aria-label="Return"><CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} /></NotifBtn>
              <NotifBtn onClick={onPause} aria-label="Pause"><Pause className="h-3.5 w-3.5" strokeWidth={1.5} /></NotifBtn>
              <NotifBtn onClick={onPause} aria-label="Stay"><Clock className="h-3.5 w-3.5" strokeWidth={1.5} /></NotifBtn>
              <NotifBtn onClick={onLetGo} danger aria-label="Let go"><X className="h-3.5 w-3.5" strokeWidth={1.5} /></NotifBtn>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-end border-t border-stone-100 pt-3">
              <NotifBtn onClick={onReturn} aria-label="Return">
                <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              </NotifBtn>
            </div>
          )}
        </Motion.div>
      </div>
    </Motion.div>
  );
}

function NotifBtn({
  children,
  onClick,
  primary,
  danger,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  'aria-label'?: string;
}) {
  const base = 'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-light transition active:scale-95';
  const tone = primary
    ? 'bg-stone-800 text-white'
    : danger
    ? 'bg-rose-50 text-rose-500'
    : 'bg-stone-100 text-stone-700';
  return <button onClick={onClick} className={`${base} ${tone}`} {...rest}>{children}</button>;
}

function SoftLine({ state }: { state: LineState }) {
  const stroke = state === 'drift' ? '#fda4af' : state === 'returned' ? '#7dd3fc' : '#a8a29e';
  const path =
    state === 'drift'
      ? 'M4 14 C 30 4, 60 22, 90 10 S 160 18, 220 12'
      : 'M4 14 L220 14';
  return (
    <svg viewBox="0 0 224 24" className="h-6 w-full">
      <line x1="4" y1="20" x2="220" y2="20" stroke="#e7e5e4" strokeWidth="0.6" />
      <Motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={state === 'drift' ? 0.8 : 1.2}
        strokeLinecap="round"
        initial={{ opacity: 1 }}
        animate={state === 'drift' ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
        transition={{ repeat: state === 'drift' ? Infinity : 0, duration: 2.2 }}
      />
      <circle cx="4" cy="14" r="2" fill={stroke} />
      <circle cx="220" cy="14" r="2" fill={stroke} />
    </svg>
  );
}

/* -------------------- Widget gallery -------------------- */

function WidgetView({
  note,
  progress,
  currentLabel,
  completedCount,
  total,
  lineState,
  onStart,
}: {
  note: string;
  progress: number;
  currentLabel: string;
  completedCount: number;
  total: number;
  lineState: LineState;
  onStart: () => void;
}) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full flex-col items-center bg-gradient-to-b from-[#f3efe9] to-[#e7e2da] px-6 pb-28 pt-8"
    >
      <div className="grid w-full max-w-[340px] grid-cols-2 gap-3">
        {/* Small */}
        <WidgetCard>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] font-light italic text-stone-700">"{note}"</p>
          <div className="mt-2"><SoftLine state={lineState} /></div>
          <button onClick={onStart} aria-label="Start" className="mt-2 flex w-full items-center justify-center rounded-lg bg-stone-800 py-1.5 text-white">
            <Play className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </WidgetCard>

        {/* Minimal */}
        <WidgetCard>
          <div className="flex flex-1 items-center"><SoftLine state={lineState} /></div>
          <button onClick={onStart} aria-label="Start" className="mt-2 flex w-full items-center justify-center rounded-lg bg-stone-800 py-1.5 text-white">
            <Play className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </WidgetCard>
      </div>

      {/* Medium - full width */}
      <div className="mt-3 w-full max-w-[340px]">
        <WidgetCard wide>
          <div className="flex items-center justify-between">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-2 line-clamp-2 text-[13px] font-light italic text-stone-700">"{note}"</p>

          <div className="relative mt-3 h-8">
            <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-stone-300/70" />
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-stone-700"
            />
            {Array.from({ length: total }).map((_, i) => {
              const left = total <= 1 ? 0 : (i / (total - 1)) * 100;
              const isDone = i < completedCount;
              return (
                <div
                  key={i}
                  className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                    isDone ? 'border-stone-700 bg-stone-700' : 'border-stone-300 bg-white'
                  }`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>

          <button onClick={onStart} aria-label="Start" className="mt-3 flex w-full items-center justify-center rounded-lg bg-stone-800 py-2 text-white">
            <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </WidgetCard>
      </div>
    </Motion.div>
  );
}

function WidgetCard({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative flex flex-col rounded-[22px] border border-white/60 bg-white/85 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl ${
        wide ? 'min-h-[140px]' : 'aspect-square'
      }`}
    >
      {children}
    </Motion.div>
  );
}

/* -------------------- Victory record -------------------- */

const REFLECTION_TAGS = ['Held steady', 'Loosened once', 'Came back in time', 'Got carried away'];

function VictoryRecord({
  note,
  hasReturned,
  reflection,
  setReflection,
  reflectionTag,
  setReflectionTag,
  onSave,
}: {
  note: string;
  hasReturned: boolean;
  reflection: string;
  setReflection: (v: string) => void;
  reflectionTag: string | null;
  setReflectionTag: (v: string) => void;
  onSave: () => void;
}) {
  const defaultTag = hasReturned ? 'Came back in time' : 'Held steady';
  const [tags, setTags] = useState<string[]>(REFLECTION_TAGS);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const activeTag = reflectionTag ?? defaultTag;
  const headline =
    activeTag === 'Got carried away' ? 'The line slipped tonight.'
    : activeTag === 'Came back in time' ? 'Not perfect. Not lost.'
    : activeTag === 'Loosened once' ? 'You felt it, you held on.'
    : 'The line stayed with you.';
  const sub =
    activeTag === 'Got carried away' ? 'The note can be kept again next time.'
    : activeTag === 'Came back in time' ? 'One return saved this route.'
    : activeTag === 'Loosened once' ? 'A small slip — still yours.'
    : 'Held steady, all the way through.';

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-full flex-col items-center justify-start px-8 pt-14 text-center"
    >
      <span className="mb-3 text-[11px] uppercase tracking-[0.3em] text-stone-400">What happened to the line?</span>
      <h2 className="text-[22px] font-extralight leading-snug text-stone-700">{headline}</h2>
      <p className="mt-2 text-[13px] font-light text-stone-500">{sub}</p>

      <div className="mt-6 w-full max-w-[300px] rounded-3xl border border-stone-200 bg-white/80 p-5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <span className="text-[10px] uppercase tracking-widest text-stone-400">Original note</span>
        <p className="mt-1 text-[14px] font-light italic text-stone-700">"{note}"</p>

        <span className="mt-4 block text-[10px] uppercase tracking-widest text-stone-400">A trace · tap again to edit</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t, i) => {
            const selected = (reflectionTag ?? defaultTag) === t;
            const editing = editingIndex === i;
            if (editing) {
              return (
                <input
                  key={i}
                  autoFocus
                  value={t}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTags((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                    if (selected) setReflectionTag(v);
                  }}
                  onBlur={() => setEditingIndex(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setEditingIndex(null);
                  }}
                  maxLength={28}
                  size={Math.max(t.length, 4)}
                  className="rounded-full border border-stone-700 bg-stone-800 px-3 py-1 text-[11px] font-light text-white outline-none"
                />
              );
            }
            return (
              <button
                key={i}
                onClick={() => {
                  if (selected) setEditingIndex(i);
                  else setReflectionTag(t);
                }}
                className={`rounded-full border px-3 py-1 text-[11px] font-light transition ${
                  selected
                    ? 'border-stone-700 bg-stone-800 text-white'
                    : 'border-stone-200 bg-white text-stone-500'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="A small reflection (optional)"
          maxLength={140}
          rows={2}
          className="mt-3 w-full resize-none border-t border-stone-100 bg-transparent pt-3 text-[13px] font-light text-stone-700 placeholder:text-stone-300 focus:outline-none"
        />
      </div>

      <button
        onClick={onSave}
        className="mt-6 rounded-2xl bg-stone-800 px-8 py-3 text-[15px] font-light tracking-wide text-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
      >
        Save
      </button>
    </Motion.div>
  );
}
