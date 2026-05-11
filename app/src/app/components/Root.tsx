import React, { useEffect } from 'react';
import { useNavigate, useLocation, useOutlet } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { AnimatePresence } from './Motion';
import { CanvasBackground } from './CanvasBackground';
import { BottomNav, useShowBottomNav } from './BottomNav';

/**
 * A friendly, low-saturation wash sits over the WebGL canvas so type stays
 * readable on every page. Each `bgStyle` keeps its own tint colour but at
 * a softer alpha than before — the room should feel like a sunny study
 * corner, not a moody widget app.
 */
const BG_OVERLAY: Record<string, string> = {
  void:   'rgba(20,22,30,0.18)',
  cosmos: 'rgba(20,24,40,0.22)',
  clay:   'rgba(255,243,229,0.78)',
  honey:  'rgba(255,248,234,0.82)',
  steel:  'rgba(232,237,240,0.78)',
  iris:   'rgba(245,242,255,0.78)',
};

export function Root() {
  const { hasEntered, hasLoggedIn, hasRoutine, bgStyle } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const showNav = useShowBottomNav();

  /* Onboarding gate — only the index route auto-redirects.
     Flow: / → /welcome → /login → /setup/* → /routine */
  useEffect(() => {
    if (location.pathname !== '/') return;
    if (!hasEntered) {
      navigate('/welcome', { replace: true });
    } else if (!hasLoggedIn) {
      navigate('/login', { replace: true });
    } else if (!hasRoutine) {
      navigate('/setup/start-time', { replace: true });
    } else {
      navigate('/routine', { replace: true });
    }
  }, [hasEntered, hasLoggedIn, hasRoutine, location.pathname, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#fff8ee] text-stone-800 font-sans">
      <div className="relative isolate flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-[#fff8ee] shadow-2xl sm:h-[800px] sm:rounded-[3rem] sm:border-[12px] sm:border-stone-900">
        <CanvasBackground tint={false} bgStyle={bgStyle} className="z-0" />
        <div
          className="pointer-events-none absolute inset-0 z-[1] backdrop-blur-[2px] transition-colors duration-700"
          style={{ backgroundColor: BG_OVERLAY[bgStyle] ?? BG_OVERLAY.honey }}
        />

        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-50 pointer-events-none">
          <div className="h-6 w-32 rounded-full bg-stone-900"></div>
        </div>
        <div className="relative z-10 flex h-full w-full flex-col overflow-hidden pt-12">
          <div className="min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {outlet ? React.cloneElement(outlet, { key: location.pathname }) : null}
            </AnimatePresence>
          </div>
          {showNav && <BottomNav />}
        </div>
      </div>
    </div>
  );
}
