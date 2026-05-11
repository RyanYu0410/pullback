import React from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext, type BgStyle } from '../context/AppContext';

interface BgOption {
  id:           BgStyle;
  label:        string;
  canvasColor:  string;
  accentColor:  string;
  isDark:       boolean;
}

const BG_OPTIONS: BgOption[] = [
  { id: 'honey',  label: 'Honey',  canvasColor: '#FFF8EE', accentColor: '#FF7E9D', isDark: false },
  { id: 'clay',   label: 'Clay',   canvasColor: '#FFE6D2', accentColor: '#FF9C7A', isDark: false },
  { id: 'iris',   label: 'Iris',   canvasColor: '#F4EEFF', accentColor: '#B6A4F5', isDark: false },
  { id: 'steel',  label: 'Steel',  canvasColor: '#E5EEF2', accentColor: '#7BB7C8', isDark: false },
  { id: 'cosmos', label: 'Cosmos', canvasColor: '#1A1F35', accentColor: '#8B9BFF', isDark: true  },
  { id: 'void',   label: 'Void',   canvasColor: '#0A0B0A', accentColor: '#BFFF00', isDark: true  },
];

const ROUTINE_ROWS = [
  { label: 'Edit My Routine', sub: 'Times, subjects & focus length', to: '/setup/start-time' },
  { label: 'My Garden',       sub: 'Streak calendar & growth',       to: '/garden'           },
  { label: 'What I Did',      sub: 'Session history',                to: '/log'              },
] as const;

export function Settings() {
  const navigate = useNavigate();
  const { bgStyle, setBgStyle } = useAppContext();

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto no-scrollbar bg-[#fff8ee] pb-24">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-1">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="icon-btn-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Preferences
          </span>
          <h2 className="text-[20px] font-bold leading-tight tracking-tight text-stone-800">
            Settings
          </h2>
        </div>
        <span className="h-8 w-8" aria-hidden />
      </div>

      {/* ── Your Routine ── */}
      <div className="px-5 pt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
          Your routine
        </p>
        <div className="card-glass overflow-hidden">
          {ROUTINE_ROWS.map((row, i) => (
            <button
              key={row.label}
              onClick={() => navigate(row.to)}
              className={[
                'flex w-full items-center justify-between px-4 py-3.5 text-left transition active:bg-stone-50 active:scale-[0.99]',
                i > 0 ? 'border-t border-stone-100' : '',
              ].join(' ')}
            >
              <span className="flex flex-col">
                <span className="text-[14px] font-semibold text-stone-800">{row.label}</span>
                <span className="mt-0.5 text-[11px] text-stone-400">{row.sub}</span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-300" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Room vibe ── */}
      <div className="px-5 pt-7">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
          Room vibe
        </p>
        <p className="mb-3 text-[12px] leading-relaxed text-stone-400">
          Pick a background — it's only colour.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {BG_OPTIONS.map((opt) => {
            const active = bgStyle === opt.id;
            return (
              <motion.button
                key={opt.id}
                onClick={() => setBgStyle(opt.id)}
                whileTap={{ scale: 0.95 }}
                className={[
                  'relative flex h-20 flex-col justify-end overflow-hidden rounded-2xl text-left',
                  active ? '' : 'ring-1 ring-black/[0.06]',
                ].join(' ')}
                style={{
                  backgroundColor: opt.canvasColor,
                  ...(active ? { boxShadow: `0 0 0 2px ${opt.accentColor}` } : {}),
                }}
              >
                {/* Accent glow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 70% 70%, ${opt.accentColor}50 0%, transparent 60%)`,
                  }}
                />
                {/* Active check */}
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: opt.accentColor }}
                  >
                    ✓
                  </motion.span>
                )}
                <p
                  className="relative px-2.5 py-1.5 text-[11px] font-bold tracking-wide"
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
