import React from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { Motion } from '../Motion';

interface Props {
  step: number;
  total: number;
  title: string;
  hint?: string;
  /** Optional emoji shown above the title to make each step recognisable. */
  badge?: string;
  children: React.ReactNode;
}

/**
 * Shared layout for every step of the routine setup wizard. Provides the
 * progress bar, big friendly title, helper line, and a back button.
 * Children are typically a `PullSelect` or a custom picker.
 */
export function SetupStep({ step, total, title, hint, badge, children }: Props) {
  const navigate = useNavigate();
  const pct = (step / total) * 100;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex h-full w-full flex-col px-6 pt-2"
    >
      {/* Header: back arrow + step pill */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-stone-500 shadow-sm transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <span className="rounded-full bg-white/70 px-3 py-1 text-[12px] font-bold text-stone-500 shadow-sm">
          Step {step} of {total}
        </span>
        <span className="h-10 w-10" aria-hidden />
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/50">
        <Motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-rose-300 to-orange-300"
        />
      </div>

      {/* Title */}
      <div className="flex flex-col items-center text-center">
        {badge && <span className="text-[34px] leading-none">{badge}</span>}
        <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-stone-800">
          {title}
        </h2>
        {hint && (
          <p className="mt-2 max-w-[280px] text-[13px] font-medium text-stone-500">
            {hint}
          </p>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">{children}</div>
    </Motion.div>
  );
}
