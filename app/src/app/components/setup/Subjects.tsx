import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../../context/AppContext';
import { SetupStep } from './SetupStep';
import { Motion } from '../Motion';
import { ArrowRight } from 'lucide-react';

const SUBJECTS = [
  { name: 'Math',     emoji: '➗', tone: 'bg-rose-100 text-rose-700 ring-rose-300' },
  { name: 'Science',  emoji: '🔬', tone: 'bg-emerald-100 text-emerald-700 ring-emerald-300' },
  { name: 'English',  emoji: '📚', tone: 'bg-sky-100 text-sky-700 ring-sky-300' },
  { name: 'History',  emoji: '🏛️', tone: 'bg-amber-100 text-amber-700 ring-amber-300' },
  { name: 'Art',      emoji: '🎨', tone: 'bg-violet-100 text-violet-700 ring-violet-300' },
  { name: 'Music',    emoji: '🎵', tone: 'bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-300' },
  { name: 'Reading',  emoji: '📖', tone: 'bg-orange-100 text-orange-700 ring-orange-300' },
  { name: 'Other',    emoji: '✨', tone: 'bg-stone-100 text-stone-700 ring-stone-300' },
];

export function Subjects() {
  const { routine, setRoutine } = useAppContext();
  const navigate = useNavigate();
  const selected = routine.subjects;

  const toggle = (name: string) => {
    const next = selected.includes(name)
      ? selected.filter((s) => s !== name)
      : [...selected, name];
    setRoutine({ ...routine, subjects: next });
  };

  const next = () => navigate('/setup/focus-length');
  const canContinue = selected.length > 0;

  return (
    <SetupStep
      step={2}
      total={5}
      badge="📚"
      title="What are you working on today?"
    >
      <div className="flex w-full max-w-[320px] flex-col items-center gap-5">
        <div className="grid grid-cols-2 gap-3">
          {SUBJECTS.map((s) => {
            const isSel = selected.includes(s.name);
            return (
              <Motion.button
                key={s.name}
                whileTap={{ scale: 0.94 }}
                onClick={() => toggle(s.name)}
                className={[
                  'flex h-[72px] items-center gap-3 rounded-2xl px-3 text-left ring-2 transition-all',
                  isSel ? `${s.tone} shadow-md` : 'bg-white/70 text-stone-600 ring-transparent',
                ].join(' ')}
              >
                <span className="text-[22px]">{s.emoji}</span>
                <span className="text-[14px] font-bold">{s.name}</span>
              </Motion.button>
            );
          })}
        </div>

        <button
          onClick={next}
          disabled={!canContinue}
          className="btn-soft btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {canContinue
            ? `Got it — ${selected.length} subject${selected.length === 1 ? '' : 's'}`
            : 'Pick at least one'}
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </SetupStep>
  );
}
