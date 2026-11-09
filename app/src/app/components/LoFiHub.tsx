import { useNavigate } from 'react-router';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { LoFiFrame, MUTED, LINE, CARD } from './LoFiShell';

const SECTIONS = [
  {
    label: 'Onboarding',
    pages: [
      { path: '/lofi-welcome', title: 'Welcome', desc: 'Pull the bell to enter.' },
      { path: '/lofi-login', title: 'Login', desc: 'Name + avatar picker.' },
      { path: '/lofi-setup', title: 'Setup', desc: '5-step routine wizard.' },
    ],
  },
  {
    label: 'Core loop',
    pages: [
      { path: '/lofi-routine', title: 'Today', desc: 'Plan, schedule, pull to begin.' },
      { path: '/lofi-room', title: 'Room', desc: 'Pick a seat in the study room.' },
      { path: '/lofi-session', title: 'Session', desc: 'Pull the bell to focus.' },
      { path: '/lofi-break', title: 'Break', desc: 'Countdown + pull to return.' },
      { path: '/lofi-continue', title: 'Continue', desc: 'Resume or finish the day.' },
      { path: '/lofi-done', title: 'Done', desc: 'End-of-day stats & exits.' },
    ],
  },
  {
    label: 'Tabs',
    pages: [
      { path: '/lofi-garden', title: 'Garden', desc: 'Study bloom calendar.' },
      { path: '/lofi-log', title: 'History', desc: 'What I Did — session list.' },
      { path: '/lofi-settings', title: 'Settings', desc: 'Routine + room vibe.' },
    ],
  },
  {
    label: 'Prototype extras',
    pages: [
      { path: '/lofi-preview', title: 'Pull (anchor)', desc: 'Drag-to-anchor intentional pull.' },
      { path: '/lofi-save', title: 'Save', desc: 'Reflect and name the session.' },
    ],
  },
] as const;

/**
 * Entry hub for the full lofi wireframe suite — one card per hi-fi page.
 * Reached from Settings → "Lofi wireframe". Self-contained; never writes
 * into the real routine.
 */
export function LoFiHub() {
  const navigate = useNavigate();

  return (
    <LoFiFrame>
      <header className="relative z-10 flex flex-shrink-0 items-center gap-3 px-6 pt-5">
        <button
          onClick={() => navigate('/settings')}
          aria-label="Back to Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ border: `1px solid ${LINE}`, background: CARD }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            Prototype
          </p>
          <h1 className="text-[16px] font-semibold">Lofi wireframe</h1>
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-6 pt-4">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: MUTED }}
            >
              {section.label}
            </p>
            <div className="flex flex-col gap-2">
              {section.pages.map((p) => (
                <button
                  key={p.path}
                  onClick={() => navigate(p.path)}
                  className="flex items-center justify-between rounded-[18px] p-4 text-left transition active:scale-[0.98]"
                  style={{ background: CARD, border: `1px solid ${LINE}` }}
                >
                  <div>
                    <p className="text-[14px] font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                      {p.desc}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <p className="pb-2 text-center text-[11px]" style={{ color: MUTED }}>
          Self-contained tour · doesn&rsquo;t affect your real routine
        </p>
      </div>
    </LoFiFrame>
  );
}
