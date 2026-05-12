import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Home, Sprout, History, Settings, type LucideIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

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

// When a tab is active it grows wider (flex-[1.5]), which pushes it toward the
// edges. These per-tab offsets nudge the icon back toward the nav centre.
const ACTIVE_SHIFT_PX = [18, 6, -6, -18] as const;

const NAV_ROUTES = new Set(['/routine', '/garden', '/log', '/settings', '/room']);

export function useShowBottomNav(): boolean {
  const { pathname } = useLocation();
  return NAV_ROUTES.has(pathname);
}

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark } = useAppContext();

  const activeIdx = TABS.findIndex(({ path }) =>
    pathname === path || (path === '/routine' && pathname === '/'),
  );

  return (
    <nav
      aria-label="Main navigation"
      className="relative z-20 flex w-full items-center gap-0 justify-start backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),22px)]"
      style={{
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
        background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,248,238,0.90)',
        minHeight: 85,
      }}
    >
      {TABS.map(({ label, path, Icon }, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            className={`relative flex flex-col items-center justify-center select-none transition-all duration-200 active:opacity-50 focus-visible:outline-none ${isActive ? 'flex-[1.5]' : 'flex-1'}`}
          >
            <Icon
              style={{
                color: isActive
                  ? (isDark ? 'rgba(255,255,255,0.90)' : '#1c1c1c')
                  : (isDark ? 'rgba(255,255,255,0.28)' : '#c4c0ba'),
                transition: 'color 0.2s, transform 0.2s',
                transform: `translateX(${
                  isActive
                    ? ACTIVE_SHIFT_PX[idx]
                    : activeIdx !== -1
                      ? (activeIdx > idx ? 8 : -8)
                      : 0
                }px)`,
              }}
              className="h-[26px] w-[26px]"
              strokeWidth={isActive ? 2.2 : 1.6}
            />
          </button>
        );
      })}
    </nav>
  );
}
