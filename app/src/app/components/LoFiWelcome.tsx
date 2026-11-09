import { useNavigate } from 'react-router';
import { LoFiFrame, INK, MUTED, CARD } from './LoFiShell';

/**
 * Lofi wireframe of Welcome — pull/tap the sketched bell to enter.
 */
export function LoFiWelcome() {
  const navigate = useNavigate();

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col items-center px-6 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
          Welcome
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Pullback</h1>

        <button
          onClick={() => navigate('/lofi-login')}
          className="mt-16 flex flex-col items-center transition active:scale-95"
          aria-label="Pull to enter"
        >
          {/* Sketched pull-bell */}
          <svg width="88" height="140" viewBox="0 0 88 140" fill="none" aria-hidden>
            <line x1="44" y1="0" x2="44" y2="48" stroke={INK} strokeWidth="1.2" />
            <circle cx="44" cy="72" r="22" fill={CARD} stroke={INK} strokeWidth="1.5" />
            <circle cx="44" cy="72" r="6" fill={INK} />
          </svg>
          <span className="mt-2 text-[12px] font-medium" style={{ color: MUTED }}>
            tap or pull to enter
          </span>
        </button>

        <div className="mt-auto mb-8 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: INK }} />
          <span className="text-[11px]" style={{ color: MUTED }}>
            2,847 studying now
          </span>
        </div>
      </div>
    </LoFiFrame>
  );
}
