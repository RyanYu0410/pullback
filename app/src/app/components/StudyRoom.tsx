import React from 'react';
import { useNavigate } from 'react-router';
import {
  useAppContext,
  STATUS_LABEL,
  STATUS_EMOJI,
  STATUS_TONE,
} from '../context/AppContext';
import { Motion } from './Motion';
import { RoomScene, type ZoneId } from './RoomScene';
import { RoomChatter } from './RoomChatter';
import { ChevronLeft, HelpCircle } from 'lucide-react';

/* Same viewBox the scene uses — we convert tapped slot positions back
   to 0..1 ratios before storing them on `mySelf.seat`. */
const VB_W = 400;
const VB_H = 280;

/* -----------------------------------------------------------------------
 * StudyRoom
 *
 * The room is the screen. Friends sit in zones around the canvas based
 * on what they're doing (focusing → focus table; on break / finished →
 * snack couch; needs help → help desk). The user picks a seat by:
 *
 *   - tapping any empty seat at any desk, OR
 *   - pulling the bell that hangs over the focus table (the "primary"
 *     gesture, consistent with every other pull surface in the app).
 *
 * Each zone has a different consequence:
 *
 *   focus / quiet / reading  →  start a session (/session)
 *   couch                    →  go on break (/break)
 *   help                     →  stay in the room so friends can see
 *                                you've raised your hand
 *
 * In every case we fire the room pulse first so friends visibly look
 * up at you, and only navigate after a 750ms reaction window.
 * ----------------------------------------------------------------------- */
export function StudyRoom() {
  const navigate = useNavigate();
  const {
    mySelf,
    updateMyStatus,
    friends,
    sendWaveTo,
    askForHelp,
    sessionStartTime,
    routine,
    hasRoutine,
    pulseRoom,
  } = useAppContext();

  const inSession = sessionStartTime !== null;
  const here = friends.filter((f) => f.status !== 'offline').length;

  const handleSitAt = (zoneId: ZoneId, slot: { x: number; y: number }) => {
    // Convert viewBox px → 0..1 ratio so it survives a context update.
    const seatRatio = { x: slot.x / VB_W, y: slot.y / VB_H };

    // Friends look up regardless of whether the status actually changes.
    pulseRoom('me', zoneId === 'focus' ? 'pull' : zoneId === 'couch' ? 'break' : zoneId === 'help' ? 'help' : 'pull');

    // Map zone → status. quiet/reading/focus all share `focusing`; the
    // *seat* (not the status) is what differentiates them visually.
    const zoneStatus =
      zoneId === 'couch' ? 'on_break' :
      zoneId === 'help'  ? 'needs_help' :
      'focusing';

    updateMyStatus(zoneStatus, { subject: routine.subjects[0], seat: seatRatio });

    // Auto-navigate after a beat so the user sees friends' reaction
    // before the screen changes.
    window.setTimeout(() => {
      if (zoneId === 'help') {
        // Stay in /room so friends can see your raised hand.
        return;
      }
      if (zoneId === 'couch') {
        navigate('/break');
        return;
      }
      // focus / quiet / reading
      if (hasRoutine) navigate('/session');
      else            navigate('/setup/start-time');
    }, 750);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <div className="text-center">
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
            Study Room
          </span>
          <h2 className="text-[20px] font-bold leading-tight text-stone-800">
            Pick a seat
          </h2>
        </div>
        <span className="h-10 w-10" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-4 pb-32 pt-2">
        {/* The room itself — friends sit in their zones; you pick where
            to sit (or pull the bell over the focus table). */}
        <Motion.div
          layout
          className="relative mx-auto w-full max-w-[360px] rounded-[2rem] bg-gradient-to-b from-amber-50 via-rose-50/70 to-amber-100/80 p-2 ring-1 ring-amber-200/70"
        >
          {/* Soft "window" band — feels more like an interior. */}
          <div className="pointer-events-none absolute inset-x-3 top-3 h-12 rounded-2xl bg-gradient-to-b from-sky-100 to-transparent opacity-70" />

          <RoomScene
            onWaveFriend={sendWaveTo}
            onSitAt={handleSitAt}
            className="relative w-full"
          />

          {/* "N here" badge */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold text-emerald-600 shadow-sm ring-1 ring-emerald-200/80 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {here} here
          </div>

        </Motion.div>

        {/* Quiet chatter feed — the room's background hum. */}
        <div className="mt-2 min-h-0 flex-1 overflow-hidden">
          <span className="block text-center text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">
            Around the room
          </span>
          <div className="mt-1.5 flex justify-center">
            <RoomChatter limit={3} />
          </div>
        </div>

        {/* Your seat — slim status mini-bar. */}
        <div className="mt-3 flex items-center gap-3 rounded-3xl bg-white/85 p-3 shadow-sm ring-1 ring-stone-200/70 backdrop-blur">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-[20px]">
            {mySelf.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-stone-800">
              {mySelf.name} (you)
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[mySelf.status].bg} ${STATUS_TONE[mySelf.status].text}`}>
                {STATUS_EMOJI[mySelf.status]} {STATUS_LABEL[mySelf.status]}
              </span>
              {mySelf.subject && (
                <span className="truncate text-[11px] font-semibold text-stone-500">
                  · {mySelf.subject}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={askForHelp}
            aria-label="I need help"
            className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200/80 transition active:scale-95"
          >
            <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
            Help
          </button>
        </div>
      </div>

      {/* Quiet alt CTA — picking a seat is the primary action; this is a
          tappable backup for users who miss the gesture entirely. */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
        <button
          onClick={() => navigate(inSession ? '/session' : hasRoutine ? '/session' : '/setup/start-time')}
          className="rounded-full bg-white/80 px-5 py-2.5 text-[12px] font-bold text-stone-600 shadow-sm ring-1 ring-stone-200/80 backdrop-blur transition active:scale-95"
        >
          {inSession
            ? 'Back to focus →'
            : hasRoutine
            ? 'or tap to start →'
            : 'or tap to set my routine →'}
        </button>
      </div>
    </Motion.div>
  );
}
