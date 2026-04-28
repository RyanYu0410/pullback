import React from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext, type BgStyle } from '../context/AppContext';

interface BgOption {
  id: BgStyle;
  label: string;
  /** CSS bg for the preview swatch (mirrors the shader's canvas colour) */
  canvasColor: string;
  /** CSS colour for the animated accent dot shown in the swatch */
  accentColor: string;
  isDark: boolean;
}

const BG_OPTIONS: BgOption[] = [
  { id: 'honey',  label: 'Honey',  canvasColor: '#F9F3E4', accentColor: '#FF7F50', isDark: false },
  { id: 'clay',   label: 'Clay',   canvasColor: '#EADCD1', accentColor: '#D97706', isDark: false },
  { id: 'iris',   label: 'Iris',   canvasColor: '#F5F2F9', accentColor: '#97A2FF', isDark: false },
  { id: 'steel',  label: 'Steel',  canvasColor: '#E8E9EA', accentColor: '#5F9EA0', isDark: false },
  { id: 'cosmos', label: 'Cosmos', canvasColor: '#0A0C14', accentColor: '#6366F1', isDark: true  },
  { id: 'void',   label: 'Void',   canvasColor: '#0A0B0A', accentColor: '#BFFF00', isDark: true  },
];

export function Settings() {
  const navigate = useNavigate();
  const { bgStyle, setBgStyle } = useAppContext();

  return (
    <div className="relative min-h-screen w-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-5">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink,#3d3d3d)] opacity-60 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium tracking-widest uppercase text-[var(--ink,#3d3d3d)] opacity-50">
          Settings
        </span>
      </div>

      {/* Section */}
      <div className="px-6 pt-1">
        <p className="mb-1 text-xs tracking-widest uppercase text-[var(--ink,#3d3d3d)] opacity-40">
          Background
        </p>
        <p className="mb-6 text-sm text-[var(--ink,#3d3d3d)] opacity-55 leading-relaxed">
          Ambient canvas style visible throughout the app.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {BG_OPTIONS.map((opt) => {
            const active = bgStyle === opt.id;
            return (
              <motion.button
                key={opt.id}
                onClick={() => setBgStyle(opt.id)}
                whileTap={{ scale: 0.96 }}
                className={[
                  'relative flex h-32 flex-col justify-end rounded-2xl overflow-hidden text-left transition-shadow duration-200',
                  active ? 'ring-2 shadow-lg' : 'ring-1 ring-black/10 shadow-sm',
                ].join(' ')}
                style={{
                  backgroundColor: opt.canvasColor,
                  ...(active ? { boxShadow: `0 0 0 2px ${opt.accentColor}` } : {}),
                }}
              >
                {/* Animated radial-gradient blobs to hint at the WebGL stars */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background: [
                      `radial-gradient(circle at 65% 70%, ${opt.accentColor}55 0%, transparent 55%)`,
                      `radial-gradient(circle at 30% 30%, ${opt.accentColor}33 0%, transparent 45%)`,
                    ].join(', '),
                  }}
                />
                {/* Subtle grain texture */}
                <span
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  }}
                />
                {/* Accent dot */}
                <span
                  className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 rounded-full"
                  style={{ backgroundColor: opt.accentColor, boxShadow: `0 0 8px ${opt.accentColor}` }}
                />
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold"
                    style={{ backgroundColor: opt.accentColor }}
                  >
                    ✓
                  </motion.span>
                )}

                {/* Label — sits directly on the swatch, contrast-reversed */}
                <p
                  className="relative px-4 py-3 text-sm font-medium tracking-wide"
                  style={{ color: opt.isDark ? '#F4F4F0' : '#2d2d2d' }}
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
