import React from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Pencil, Sprout, History } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext, type BgStyle } from '../context/AppContext';

interface BgOption {
  id: BgStyle;
  label: string;
  canvasColor: string;
  accentColor: string;
  isDark: boolean;
}

const BG_OPTIONS: BgOption[] = [
  { id: 'honey',  label: 'Honey',  canvasColor: '#FFF8EE', accentColor: '#FF7E9D', isDark: false },
  { id: 'clay',   label: 'Clay',   canvasColor: '#FFE6D2', accentColor: '#FF9C7A', isDark: false },
  { id: 'iris',   label: 'Iris',   canvasColor: '#F4EEFF', accentColor: '#B6A4F5', isDark: false },
  { id: 'steel',  label: 'Steel',  canvasColor: '#E5EEF2', accentColor: '#7BB7C8', isDark: false },
  { id: 'cosmos', label: 'Cosmos', canvasColor: '#1A1F35', accentColor: '#8B9BFF', isDark: true  },
  { id: 'void',   label: 'Void',   canvasColor: '#0A0B0A', accentColor: '#BFFF00', isDark: true  },
];

export function Settings() {
  const navigate = useNavigate();
  const { bgStyle, setBgStyle } = useAppContext();

  return (
    <div className="relative min-h-screen w-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <span className="text-[14px] font-bold tracking-wide text-stone-700">
          Settings
        </span>
        <span className="h-10 w-10" aria-hidden />
      </div>

      <div className="px-6 pt-1">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-stone-400">
          Your routine
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/setup/start-time')}
            className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-4 text-left shadow-sm ring-1 ring-stone-200 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                <Pencil className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="flex flex-col">
                <span className="text-[14px] font-bold text-stone-800">Edit My Routine</span>
                <span className="text-[11px] font-semibold text-stone-500">
                  Change times, subjects, or focus length
                </span>
              </span>
            </span>
          </button>
          <button
            onClick={() => navigate('/garden')}
            className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-4 text-left shadow-sm ring-1 ring-stone-200 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
                <Sprout className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="text-[14px] font-bold text-stone-800">My Garden</span>
            </span>
          </button>
          <button
            onClick={() => navigate('/log')}
            className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-4 text-left shadow-sm ring-1 ring-stone-200 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-500">
                <History className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="text-[14px] font-bold text-stone-800">What I Did</span>
            </span>
          </button>
        </div>
      </div>

      <div className="px-6 pt-6">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-stone-400">
          Room vibe
        </p>
        <p className="mb-4 text-[12px] font-medium text-stone-500">
          Pick a background. Try a few — it's only colour.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {BG_OPTIONS.map((opt) => {
            const active = bgStyle === opt.id;
            return (
              <motion.button
                key={opt.id}
                onClick={() => setBgStyle(opt.id)}
                whileTap={{ scale: 0.96 }}
                className={[
                  'relative flex h-28 flex-col justify-end overflow-hidden rounded-2xl text-left transition-shadow duration-200',
                  active ? 'ring-2 shadow-lg' : 'ring-1 ring-stone-200 shadow-sm',
                ].join(' ')}
                style={{
                  backgroundColor: opt.canvasColor,
                  ...(active ? { boxShadow: `0 0 0 2px ${opt.accentColor}` } : {}),
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    background: [
                      `radial-gradient(circle at 65% 70%, ${opt.accentColor}66 0%, transparent 55%)`,
                      `radial-gradient(circle at 30% 30%, ${opt.accentColor}33 0%, transparent 45%)`,
                    ].join(', '),
                  }}
                />
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ backgroundColor: opt.accentColor }}
                  >
                    ✓
                  </motion.span>
                )}
                <p
                  className="relative px-3 py-2 text-[13px] font-bold tracking-wide"
                  style={{ color: opt.isDark ? '#fff8ee' : '#3a3c38' }}
                >
                  {opt.label}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
