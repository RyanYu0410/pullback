import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import confetti from 'canvas-confetti';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { Sprout, History, Sparkles } from 'lucide-react';

export function DoneForToday() {
  const navigate = useNavigate();
  const {
    routine,
    completedIds,
    routeItems,
    friends,
    resetSession,
  } = useAppContext();

  const finishedCount = completedIds.length || routeItems.length;
  const totalMinutes = routine.focusMinutes * (finishedCount || 1);
  const friendsAlsoFinished = friends.filter((f) => f.status === 'finished');

  useEffect(() => {
    /* A short, friendly burst of confetti. Lower particle count keeps it
       tasteful on phones and avoids dropping frames. */
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#ff9c7a', '#ff7e9d', '#ffe07a', '#a8e6cf', '#aee1f9', '#d6c8ff'],
      });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const subjectsCovered = routine.subjects.length || finishedCount;

  const handleContinue = () => {
    resetSession();
    navigate('/welcome');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col items-center px-6 pt-6"
      style={{ background: 'linear-gradient(180deg, #fff8ee 0%, #ffe6d2 100%)' }}
    >
      <Motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="flex flex-col items-center"
      >
        <span className="text-[40px]">🎉</span>
      </Motion.div>

      {/* Stats */}
      <div className="mt-6 grid w-full max-w-[320px] grid-cols-2 gap-3">
        <Stat
          icon="✏️"
          label="Subjects"
          value={String(subjectsCovered)}
          tone="bg-rose-100 ring-rose-200 text-rose-700"
        />
        <Stat
          icon="⏱"
          label="Minutes"
          value={String(totalMinutes)}
          tone="bg-amber-100 ring-amber-200 text-amber-700"
        />
      </div>

      {/* Friends also finished */}
      {friendsAlsoFinished.length > 0 && (
        <div className="mt-5 w-full max-w-[320px] rounded-2xl bg-white/80 p-4 ring-1 ring-stone-200 shadow-sm">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-violet-500">
            Finished tonight
          </span>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {friendsAlsoFinished.slice(0, 6).map((f) => (
                <span
                  key={f.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-violet-50 text-[18px] shadow-sm"
                >
                  {f.emoji}
                </span>
              ))}
            </div>
            <span className="text-[12px] font-semibold text-stone-600">
              {friendsAlsoFinished.map((f) => f.name).slice(0, 3).join(', ')}
              {friendsAlsoFinished.length > 3 && ` + ${friendsAlsoFinished.length - 3} more`}
            </span>
          </div>
        </div>
      )}

      <div className="mt-auto mb-6 flex w-full max-w-[320px] flex-col gap-2">
        <button
          onClick={() => navigate('/garden')}
          className="btn-soft btn-mint w-full"
        >
          <Sprout className="h-4 w-4" strokeWidth={2.2} />
          See My Garden
        </button>
        <button
          onClick={() => navigate('/log')}
          className="btn-soft btn-paper w-full"
        >
          <History className="h-4 w-4" strokeWidth={2.2} />
          See What I Did
        </button>
        <button
          onClick={handleContinue}
          className="btn-soft btn-primary w-full"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          All done!
        </button>
      </div>
    </Motion.div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${tone}`}>
      <span className="text-[24px]">{icon}</span>
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70">
          {label}
        </span>
        <span className="block text-[22px] font-bold leading-tight">{value}</span>
      </div>
    </div>
  );
}
