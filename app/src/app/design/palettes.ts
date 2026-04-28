import type { CSSProperties } from 'react';

/**
 * Six session phases. The Pull/Save lifecycle progresses through them
 * roughly in order, and each phase has a corresponding palette
 * extracted from the six "Self Check-in" HTML design variants.
 */
export type SessionStatus =
  | 'drifting'
  | 'checkingIn'
  | 'active'
  | 'ready'
  | 'anchored'
  | 'restored';

export interface Palette {
  /** Source design file the palette was lifted from. */
  source: string;
  /** Page background. */
  bg: string;
  /** Surface (cards, ambient widgets). */
  surface: string;
  /** Primary readable text. */
  ink: string;
  /** Secondary / muted text. */
  inkLight: string;
  /** Accent — the dynamic-island dot, glow, primary buttons. */
  accent: string;
  /** A glow color used for the accent halo (rgba). */
  glow: string;
  /** Whether the palette is dark-mode (informs island/text contrast). */
  isDark: boolean;
}

export const palettes: Record<SessionStatus, Palette> = {
  drifting: {
    source: 'design-387ffdc6',
    bg: '#F5F2F9',
    surface: 'rgba(255,255,255,0.55)',
    ink: '#3A3A52',
    inkLight: '#7A7A95',
    accent: '#97A2FF',
    glow: 'rgba(151,162,255,0.55)',
    isDark: false,
  },
  checkingIn: {
    source: 'design-f8b351cf',
    bg: '#E8E9EA',
    surface: 'rgba(255,255,255,0.55)',
    ink: '#2F3A3D',
    inkLight: '#6E7A7E',
    accent: '#5F9EA0',
    glow: 'rgba(95,158,160,0.5)',
    isDark: false,
  },
  active: {
    source: 'design-6c0c2a80',
    bg: '#F9F3E4',
    surface: 'rgba(255,255,255,0.5)',
    ink: '#3A2A1A',
    inkLight: '#8B6B4A',
    accent: '#FF7F50',
    glow: 'rgba(255,127,80,0.55)',
    isDark: false,
  },
  ready: {
    source: 'design-5e258e50',
    bg: '#EADCD1',
    surface: 'rgba(255,255,255,0.5)',
    ink: '#3A2A1F',
    inkLight: '#8A6B55',
    accent: '#D97706',
    glow: 'rgba(217,119,6,0.55)',
    isDark: false,
  },
  anchored: {
    source: 'design-47c57536',
    bg: '#0A0C14',
    surface: 'rgba(255,255,255,0.06)',
    ink: '#E5E7F0',
    inkLight: '#8A8FA8',
    accent: '#6366F1',
    glow: 'rgba(99,102,241,0.6)',
    isDark: true,
  },
  restored: {
    source: 'design-e59f88a3',
    bg: '#0A0B0A',
    surface: 'rgba(255,255,255,0.05)',
    ink: '#E8FFE0',
    inkLight: '#7A8A7A',
    accent: '#BFFF00',
    glow: 'rgba(191,255,0,0.7)',
    isDark: true,
  },
};

/**
 * Returns inline-style CSS custom properties that any preset component
 * can spread on its root, so children resolve `var(--bg)`, `var(--accent)`,
 * etc. against the active session palette.
 */
export function cssVarsFor(status: SessionStatus): CSSProperties {
  const p = palettes[status];
  return {
    ['--bg' as never]: p.bg,
    ['--surface' as never]: p.surface,
    ['--ink' as never]: p.ink,
    ['--ink-light' as never]: p.inkLight,
    ['--accent' as never]: p.accent,
    ['--glow' as never]: p.glow,
    color: p.ink,
    backgroundColor: p.bg,
  };
}

/** Convenience flag for components that need to swap dark/light surfaces. */
export function isDark(status: SessionStatus): boolean {
  return palettes[status].isDark;
}
