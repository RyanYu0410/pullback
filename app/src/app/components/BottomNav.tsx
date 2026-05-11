import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Home, Sprout, History, Settings, type LucideIcon } from 'lucide-react';

interface Tab {
  label: string;
  path: string;
  Icon: LucideIcon;
}

const TABS: Tab[] = [
  { label: 'Today',    path: '/routine',  Icon: Home     },
  { label: 'Garden',   path: '/garden',   Icon: Sprout   },
  { label: 'History',  path: '/log',      Icon: History  },
  { label: 'Settings', path: '/settings', Icon: Settings },
];

const NAV_ROUTES = new Set(['/routine', '/garden', '/log', '/settings', '/room']);

export function useShowBottomNav(): boolean {
  const { pathname } = useLocation();
  return NAV_ROUTES.has(pathname);
}

/**
 * BottomNav — monochrome by default. The active tab is just darker.
 * No glows, no pips, no gradients. Quiet enough to disappear when
 * the user is reading the screen above it.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Main navigation"
      className="
        relative z-20 flex w-full items-stretch
        border-t border-stone-200/60
        bg-[#fff8ee]/90 backdrop-blur-xl
        pb-[max(env(safe-area-inset-bottom),4px)]
      "
      style={{ minHeight: 56 }}
    >
      {TABS.map(({ label, path, Icon }) => {
        const isActive = pathname === path || (path === '/routine' && pathname === '/');
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            className="
              relative flex flex-1 flex-col items-center justify-center gap-1
              pt-2 pb-1.5 select-none
              transition-opacity duration-150 active:opacity-50
              focus-visible:outline-none
            "
          >
            <Icon
              className={[
                'h-[20px] w-[20px] transition-colors duration-200',
                isActive ? 'text-stone-800' : 'text-stone-300',
              ].join(' ')}
              strokeWidth={isActive ? 2.2 : 1.6}
            />
            <span
              className={[
                'text-[10px] tracking-tight leading-none transition-colors duration-200',
                isActive ? 'font-semibold text-stone-800' : 'font-medium text-stone-300',
              ].join(' ')}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
