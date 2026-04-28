import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { CornerDownLeft, Play } from 'lucide-react';
import { cssVarsFor } from '../design/palettes';
import { getPreset } from './presets';

export function Home() {
  const {
    note,
    routeItems,
    isLinePulled,
    widgetPreset,
    savedRoutes,
    activeRouteId,
    sessionStatus,
    setSessionStatus,
    paceMinutes,
  } = useAppContext();
  const navigate = useNavigate();

  // Returning to Home means the previous session is "drifting" again until
  // the user starts another pull.
  useEffect(() => {
    setSessionStatus('drifting');
  }, [setSessionStatus]);

  if (!isLinePulled) return null;

  const total = routeItems.length;
  const activeRoute = savedRoutes.find((r) => r.id === activeRouteId);
  const presetDef = getPreset(widgetPreset);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cssVarsFor(sessionStatus)}
      className="flex h-full w-full flex-col transition-colors duration-700"
    >
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-10">
        <div className="mb-8 flex flex-col items-center">
          <span
            className="text-[44px] font-extralight tracking-tight"
            style={{ color: 'var(--ink)' }}
          >
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="mb-5 grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              style={{ background: 'var(--surface)' }}
            />
          ))}
        </div>

        <Motion.div
          layout
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full overflow-hidden rounded-[28px] border border-black/10 shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
          style={{ background: 'var(--surface)' }}
        >
          {/* Header strip — meta */}
          <div
            className="flex items-center justify-between px-5 pt-4"
            style={{ color: 'var(--ink-light)' }}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-[10px] uppercase tracking-[0.22em]">
                {presetDef.label}
              </span>
            </div>
            {paceMinutes != null && (
              <span className="font-mono text-[10px] tabular-nums">
                {paceMinutes} min
              </span>
            )}
          </div>

          {/* Note — hero serif */}
          <div className="px-5 pt-3">
            <p
              className="line-clamp-2 font-serif text-[19px] italic leading-snug tracking-[-0.3px]"
              style={{ color: 'var(--ink)' }}
            >
              "{note}"
            </p>
          </div>

          {/* Timeline — gradient line w/ refined nodes */}
          <div className="px-5 pt-5">
            <div className="relative h-7 w-full">
              <div
                className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
                style={{
                  background: `linear-gradient(to right, transparent 0%, var(--ink-light) 12%, var(--ink-light) 88%, transparent 100%)`,
                  opacity: 0.45,
                }}
              />
              {Array.from({ length: total }).map((_, i) => {
                const left = total <= 1 ? 50 : 6 + (i / (total - 1)) * 88;
                const isFirst = i === 0;
                const isLast = i === total - 1;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}%` }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        height: isFirst || isLast ? 7 : 5,
                        width: isFirst || isLast ? 7 : 5,
                        background: isFirst ? 'var(--accent)' : 'var(--surface)',
                        border: `1px solid ${isFirst ? 'transparent' : 'var(--ink-light)'}`,
                        opacity: isFirst ? 1 : 0.7,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--ink-light)', opacity: 0.6 }}
            >
              <span>start</span>
              <span>{total} stops</span>
            </div>
          </div>

          {/* Action — refined start row */}
          <button
            onClick={() => navigate('/welcome')}
            aria-label="Start"
            className="mt-4 flex w-full items-center justify-between border-t border-black/10 px-5 py-4 transition-colors active:opacity-80"
            style={{ color: 'var(--ink)' }}
          >
            <span className="text-[13px] font-light tracking-wide">start the line</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              <Play className="h-3 w-3" strokeWidth={2} />
            </span>
          </button>
        </Motion.div>

        {activeRoute && activeRoute.reflections.length > 0 && (
          <div
            className="mt-6 rounded-3xl border border-black/10 p-4"
            style={{ background: 'var(--surface)' }}
          >
            <div className="mt-1 flex flex-col gap-2">
              {activeRoute.reflections.slice(0, 3).map((r, i) => (
                <p
                  key={i}
                  className="text-[12px] font-light italic"
                  style={{ color: 'var(--ink-light)' }}
                >
                  — {r}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        <button
          onClick={() => navigate('/welcome')}
          aria-label="All routes"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 backdrop-blur-md"
          style={{ background: 'var(--surface)', color: 'var(--ink-light)' }}
        >
          <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => navigate('/pull')}
          aria-label="Pull again"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 backdrop-blur-md"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => navigate('/tree')}
          aria-label="Tree"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 backdrop-blur-md"
          style={{ background: 'var(--surface)', color: 'var(--ink-light)' }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            <path d="M12 22 L12 12" />
            <path d="M12 14 C 9 12, 7 10, 6 7" />
            <path d="M12 14 C 15 12, 17 10, 18 7" />
            <path d="M12 12 C 11 9, 11 6, 12 3" />
            <circle cx="6" cy="6" r="2" />
            <circle cx="18" cy="6" r="2" />
            <circle cx="12" cy="3" r="2" />
          </svg>
        </button>
      </div>
    </Motion.div>
  );
}
