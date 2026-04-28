import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { Plus } from 'lucide-react';

const PULL_THRESHOLD = 72;  // px of drag before navigation fires

export function Welcome() {
  const navigate = useNavigate();
  const { savedRoutes, setHasEntered, loadSavedRoute, resetDraft } = useAppContext();

  const svgWrapRef   = useRef<HTMLDivElement>(null);
  const stringRef    = useRef<SVGLineElement>(null);
  const pendantRef   = useRef<SVGGElement>(null);

  const startNew = () => {
    resetDraft();
    setHasEntered(true);
    navigate('/ownership');
  };
  const startNewRef = useRef(startNew);
  // keep ref fresh on every render
  startNewRef.current = startNew;

  const startFromSaved = (id: string) => {
    loadSavedRoute(id);
    setHasEntered(true);
    navigate('/session');
  };

  // Pullable pendant interaction
  useEffect(() => {
    const wrap = svgWrapRef.current;
    if (!wrap) return;

    let isDragging = false;
    let startY = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0; // spring y offset
    let velocity = 0;

    const springBack = () => {
      const tension = 0.18;
      const damp    = 0.78;
      velocity = (velocity + (0 - settled) * tension) * damp;
      settled += velocity;
      applyTransform(settled);
      if (Math.abs(velocity) < 0.3 && Math.abs(settled) < 0.3) {
        settled = 0;
        applyTransform(0);
        animFrame = 0;
      } else {
        animFrame = requestAnimationFrame(springBack);
      }
    };

    const applyTransform = (offsetY: number) => {
      const pendant = pendantRef.current;
      const line    = stringRef.current;
      if (!pendant || !line) return;
      // Stretch the string endpoint down, pendant follows
      pendant.setAttribute('transform', `translate(0, ${offsetY})`);
      line.setAttribute('y2', String(16 + offsetY));
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
      // Elastic resistance — harder to pull the further down
      const offset = PULL_THRESHOLD * (1 - Math.exp(-pull / PULL_THRESHOLD));
      settled = offset;
      applyTransform(offset);
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');

      if (pull >= PULL_THRESHOLD) {
        // Pulled far enough — same as tapping the + button
        startNewRef.current();
      } else {
        // Spring back
        velocity = 0;
        animFrame = requestAnimationFrame(springBack);
      }
      pull = 0;
    };

    wrap.addEventListener('mousedown',  onStart, { passive: false });
    wrap.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove,  { passive: false });
    window.addEventListener('touchmove', onMove,  { passive: false });
    window.addEventListener('mouseup',   onEnd);
    window.addEventListener('touchend',  onEnd);

    return () => {
      wrap.removeEventListener('mousedown',  onStart);
      wrap.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onEnd);
      window.removeEventListener('touchend',  onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col px-8 pt-12"
    >
      <Motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-10 flex flex-col items-center"
      >
        {/* Pullable pendant — drag down to navigate to /pull */}
        <div ref={svgWrapRef} className="cursor-grab active:cursor-grabbing select-none touch-none">
          <svg width="80" height="120" viewBox="0 0 48 72" overflow="visible">
            {/* string — y2 stretches as pulled */}
            <line ref={stringRef} x1="24" y1="4" x2="24" y2="16" stroke="#3a4a38" strokeWidth="1.4" strokeLinecap="round" />
            {/* pendant group — translates down as pulled */}
            <g ref={pendantRef}>
              <path
                d="M 24 16 C 14 16 10 23 10 30 C 10 39 16 44 24 44 C 32 44 38 39 38 30 C 38 23 34 16 24 16 Z"
                fill="#3a4a38"
              />
              <circle cx="24" cy="31" r="3.5" fill="#eae8e3" opacity="0.82" />
            </g>
          </svg>
        </div>
      </Motion.div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {savedRoutes.length > 0 && (
          <div className="flex flex-col gap-3">
            {savedRoutes.map((r) => (
              <button
                key={r.id}
                onClick={() => startFromSaved(r.id)}
                className="flex flex-col rounded-2xl border border-stone-200 bg-white/80 px-5 py-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-transform active:scale-[0.99]"
              >
                <span className="truncate text-[13px] font-light italic text-stone-500">"{r.note}"</span>
                <div className="mt-3 flex items-center gap-1.5">
                  {r.items.slice(0, 8).map((it, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-stone-300"
                      style={{ opacity: 0.4 + (i / r.items.length) * 0.6 }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={startNew}
          aria-label="Begin"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" strokeWidth={1.2} />
        </button>
        {savedRoutes.length > 0 && (
          <button
            onClick={() => navigate('/log')}
            aria-label="Log"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-transform active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
              <path d="M5 6 L19 6" />
              <path d="M5 12 L19 12" />
              <path d="M5 18 L14 18" />
            </svg>
          </button>
        )}
        {savedRoutes.length > 0 && (
          <button
            onClick={() => navigate('/tree')}
            aria-label="Tree"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-transform active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
              <path d="M12 22 L12 12" />
              <path d="M12 14 C 9 12, 7 10, 6 7" />
              <path d="M12 14 C 15 12, 17 10, 18 7" />
              <path d="M12 12 C 11 9, 11 6, 12 3" />
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="12" cy="3" r="2" />
            </svg>
          </button>
        )}
      </div>
    </Motion.div>
  );
}
