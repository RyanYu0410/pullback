import React from 'react';
import { useAppContext, type RoomEvent } from '../context/AppContext';
import { Motion, AnimatePresence } from './Motion';

/* -----------------------------------------------------------------------
 * RoomChatter
 *
 * A tiny rolling feed of recent room activity — "Mia opened Math",
 * "Leo is on a break", "You waved at Aya". Designed to read as the
 * background hum of a study room, not a notification list, so the
 * styling is whisper-quiet (small, faded, scrolling).
 *
 * Two layouts:
 *
 *  - default: a vertical stack of the most recent ~3 chips
 *  - `variant="ticker"`: a single line that cycles through events,
 *    intended for tight headers (e.g. inside FocusSession).
 * ----------------------------------------------------------------------- */

interface RoomChatterProps {
  variant?: 'stack' | 'ticker';
  /** Max events to show in stack mode (default 3). */
  limit?: number;
  className?: string;
}

const KIND_GLYPH: Record<RoomEvent['kind'], string> = {
  wave:           '👋',
  started_focus:  '✏️',
  started_break:  '🍵',
  finished:       '🎉',
  asked_help:     '🙋',
  arrived:        '🚪',
  left:           '👋',
};

export function RoomChatter({
  variant = 'stack',
  limit = 3,
  className,
}: RoomChatterProps) {
  const { roomEvents } = useAppContext();
  const items = roomEvents.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className={['text-center text-[11px] font-medium text-stone-400', className].filter(Boolean).join(' ')}>
        the room is quiet…
      </div>
    );
  }

  if (variant === 'ticker') {
    const newest = items[0];
    return (
      <div className={['flex items-center gap-1.5 overflow-hidden text-[11px] font-semibold text-stone-500', className].filter(Boolean).join(' ')}>
        <AnimatePresence mode="wait">
          <Motion.div
            key={newest.id}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            <span aria-hidden>{KIND_GLYPH[newest.kind]}</span>
            <span className="truncate">{newest.text}</span>
          </Motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <ul className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      <AnimatePresence initial={false}>
        {items.map((ev, idx) => (
          <Motion.li
            key={ev.id}
            layout
            initial={{ y: -8, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1 - idx * 0.18, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200/70 backdrop-blur"
          >
            <span aria-hidden className="text-[13px]">{KIND_GLYPH[ev.kind]}</span>
            <span className="truncate">{ev.text}</span>
          </Motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
