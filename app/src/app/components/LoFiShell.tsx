import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Home, Sprout, History, Settings, type LucideIcon } from 'lucide-react';
import { Motion } from './Motion';

export const INK = '#161616';
export const PAPER = '#EFECE2';
export const CARD = '#FBFAF4';
export const LINE = 'rgba(22,22,22,0.28)';
export const MUTED = 'rgba(22,22,22,0.5)';
export const DIM = 'rgba(22,22,22,0.4)';

/** Shared dashed-frame shell used by every lofi wireframe page. */
export function LoFiFrame({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative flex h-full w-full flex-col overflow-hidden ${className}`}
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[28px]"
        style={{ border: `1px dashed ${LINE}` }}
      />
      {children}
    </Motion.div>
  );
}

export function LoFiBack({ to = '/lofi', label = 'Back to lofi hub' }: { to?: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      aria-label={label}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
      style={{ border: `1px solid ${LINE}`, background: CARD, color: INK }}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

export function LoFiIsland({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex items-center gap-3 rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide"
      style={{ background: INK, color: PAPER }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(239,236,226,0.6)' }} />
      {children}
    </div>
  );
}

export function LoFiCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-[18px] p-4 text-left ${onClick ? 'transition active:scale-[0.98]' : ''} ${className}`}
      style={{ background: CARD, border: `1px solid ${LINE}` }}
    >
      {children}
    </Tag>
  );
}

export function LoFiHeader({
  eyebrow,
  title,
  backTo = '/lofi',
  right,
}: {
  eyebrow?: string;
  title: string;
  backTo?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="relative z-10 flex flex-shrink-0 items-center gap-3 px-6 pt-5">
      <LoFiBack to={backTo} />
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-[16px] font-semibold">{title}</h1>
      </div>
      {right ?? <span className="h-9 w-9 flex-shrink-0" aria-hidden />}
    </header>
  );
}

const LOFI_TABS: { label: string; path: string; Icon: LucideIcon }[] = [
  { label: 'Today', path: '/lofi-routine', Icon: Home },
  { label: 'Garden', path: '/lofi-garden', Icon: Sprout },
  { label: 'History', path: '/lofi-log', Icon: History },
  { label: 'Settings', path: '/lofi-settings', Icon: Settings },
];

/** Wireframe bottom nav — only used inside the lofi suite tab pages. */
export function LoFiNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = LOFI_TABS.findIndex((t) => pathname.endsWith(t.path) || pathname.includes(t.path));

  return (
    <nav
      aria-label="Lofi navigation"
      className="relative z-10 flex w-full flex-shrink-0 items-center justify-around px-2 pb-6 pt-3"
      style={{ borderTop: `1px solid ${LINE}` }}
    >
      {LOFI_TABS.map(({ label, path: p, Icon }, i) => {
        const isActive = i === active;
        return (
          <button
            key={p}
            onClick={() => navigate(p)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-1"
          >
            <Icon
              className="h-5 w-5"
              strokeWidth={isActive ? 2 : 1.5}
              style={{ color: isActive ? INK : MUTED }}
            />
          </button>
        );
      })}
    </nav>
  );
}

export function LoFiBtn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
}) {
  const styles: React.CSSProperties =
    variant === 'primary'
      ? { background: INK, color: PAPER, border: `1px solid ${INK}` }
      : variant === 'danger'
        ? { background: 'transparent', color: '#B23B3B', border: 'none' }
        : { background: CARD, color: INK, border: `1px solid ${LINE}` };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-40 ${className}`}
      style={styles}
    >
      {children}
    </button>
  );
}
