import React, { useEffect } from 'react';
import { useNavigate, useLocation, useOutlet } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { AnimatePresence } from './Motion';
import { CanvasBackground } from './CanvasBackground';

/**
 * Overlay tint drawn on top of the WebGL canvas for non-palette pages
 * (Pace, Note, Build, Welcome, Ownership).
 * Palette pages render their own CanvasBackground + CSS-var tint, so this
 * overlay is effectively hidden beneath them.
 *
 * Light themes: semi-transparent canvas bg colour so the animated texture
 *   shows through subtly.
 * Dark themes: low-opacity dark tint — keeps text readable while letting the
 *   dark canvas give a moody feel; the full effect is seen on the Pull page.
 */
const BG_OVERLAY: Record<string, string> = {
  void:   'rgba(10,11,10,0.18)',
  cosmos: 'rgba(10,12,20,0.22)',
  clay:   'rgba(234,220,209,0.72)',
  honey:  'rgba(249,243,228,0.72)',
  steel:  'rgba(232,233,234,0.70)',
  iris:   'rgba(245,242,249,0.70)',
};

export function Root() {
  const { hasEntered, ownership, pace, note, isLinePulled, routeItems, bgStyle } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    if (location.pathname === '/') {
      if (!hasEntered) {
        navigate('/welcome', { replace: true });
      } else if (!ownership) {
        navigate('/ownership', { replace: true });
      } else if (!pace) {
        navigate('/pace', { replace: true });
      } else if (!note) {
        navigate('/note', { replace: true });
      } else if (routeItems.length === 0) {
        navigate('/build', { replace: true });
      } else if (!isLinePulled) {
        navigate('/pull', { replace: true });
      }
    }
  }, [hasEntered, ownership, pace, note, isLinePulled, routeItems, location.pathname, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#eae8e3] text-stone-800 font-sans">
      <div className="relative isolate flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-[#faf9f6] shadow-2xl sm:h-[800px] sm:rounded-[3rem] sm:border-[12px] sm:border-stone-900">
        {/* Global ambient canvas. Pages that need a palette-tinted backdrop
            (Save, Home, presets) render their own CanvasBackground on top,
            which drives the multiply overlay with their CSS vars. */}
        <CanvasBackground tint={false} bgStyle={bgStyle} className="z-0" />
        {/* User-chosen tint wash over the WebGL canvas. Palette pages render
            their own CanvasBackground on top so this only affects non-palette
            pages (Pace, Note, Build, Welcome, Ownership). */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] backdrop-blur-[2px] transition-colors duration-700"
          style={{ backgroundColor: BG_OVERLAY[bgStyle] ?? BG_OVERLAY.bloom }}
        />

        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-50 pointer-events-none">
          <div className="h-6 w-32 rounded-full bg-stone-900"></div>
        </div>
        <div className="relative z-10 flex h-full w-full flex-col overflow-hidden pt-12">
          <AnimatePresence mode="wait">
            {outlet ? React.cloneElement(outlet, { key: location.pathname }) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
