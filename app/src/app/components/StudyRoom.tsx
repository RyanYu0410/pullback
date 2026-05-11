import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useAppContext,
  STATUS_LABEL,
  STATUS_EMOJI,
} from '../context/AppContext';
import { Motion } from './Motion';
import { RoomScene, type ZoneId } from './RoomScene';
import { RoomChatter } from './RoomChatter';
import { ChevronLeft, HandHelping, Copy, Check } from 'lucide-react';

/* Same viewBox the scene uses — we convert tapped slot positions back
   to 0..1 ratios before storing them on `mySelf.seat`. */
const VB_W = 400;
const VB_H = 280;

/* -----------------------------------------------------------------------
 * StudyRoom — the workspace.
 *
 * A side-view interior cross-section of the shared study room. The scene
 * uses the same plane-stacking technique as the Garden: back wall →
 * window+clock+bell → mid-floor furniture → foreground floor strip.
 *
 * Tap a seat (or pull the bell over the focus counter) to sit somewhere.
 * Each zone has a different consequence:
 *   focus / quiet / reading  →  start a session (/session)
 *   couch                    →  go on break (/break)
 *   help                     →  stay so friends can see your raised hand
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
    routine,
    hasRoutine,
    pulseRoom,
    roomCode,
    roomName,
  } = useAppContext();

  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const here = friends.filter((f) => f.status !== 'offline').length;

  const handleSitAt = (zoneId: ZoneId, slot: { x: number; y: number }) => {
    const seatRatio = { x: slot.x / VB_W, y: slot.y / VB_H };

    pulseRoom('me',
      zoneId === 'focus' ? 'pull' :
      zoneId === 'couch' ? 'break' :
      zoneId === 'help'  ? 'help'  :
      'pull',
    );

    const zoneStatus =
      zoneId === 'couch' ? 'on_break' :
      zoneId === 'help'  ? 'needs_help' :
      'focusing';

    updateMyStatus(zoneStatus, { subject: routine.subjects[0], seat: seatRatio });

    window.setTimeout(() => {
      if (zoneId === 'help')  return; // stay in /room
      if (zoneId === 'couch') { navigate('/break'); return; }
      if (hasRoutine) navigate('/session');
      else            navigate('/setup/start-time');
    }, 750);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col bg-[#fff8ee]"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 pt-1">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="icon-btn-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Study Together
          </span>
          <h2 className="truncate text-[20px] font-bold leading-tight tracking-tight text-stone-800">
            {roomName ?? 'Pick a seat'}
          </h2>
        </div>
        {/* Room code chip + copy button */}
        {roomCode && (
          <button
            onClick={copyCode}
            aria-label="Copy room code"
            className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 ring-1 ring-stone-200/80 transition active:scale-95"
          >
            <span className="time-num text-[12px] font-bold tracking-[0.1em] text-stone-700">
              {roomCode}
            </span>
            {copied
              ? <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
              : <Copy className="h-3 w-3 text-stone-400" strokeWidth={2} />
            }
          </button>
        )}
        {!roomCode && <span className="h-8 w-8" aria-hidden />}
      </div>

      {/* Micro-stats */}
      <div className="mt-1 flex items-center gap-3 px-5 text-[11px] font-medium text-stone-400">
        <span className="online-dot" />
        <span className="time-num">
          {here} {here === 1 ? 'friend' : 'friends'} here
        </span>
        {roomCode && (
          <>
            <span className="text-stone-300" aria-hidden>·</span>
            <span className="time-num">share code: {roomCode}</span>
          </>
        )}
      </div>

      {/* ROOM STAGE — fills the remaining vertical space. */}
      <div className="relative mt-3 flex-1 overflow-hidden">
        <RoomScene
          onWaveFriend={sendWaveTo}
          onSitAt={handleSitAt}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {/* QUIET CHATTER — a single rolling line above the status bar. */}
      <div className="px-5 pb-2 pt-2">
        <RoomChatter variant="ticker" />
      </div>

      {/* YOUR SEAT — slim status mini-bar built from design-system parts. */}
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white/85 px-3 py-2.5 backdrop-blur">
        <span className="avatar-bubble h-9 w-9 text-[18px]">
          {mySelf.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-stone-800">
            {mySelf.name} (you)
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-stone-500">
            <span>{STATUS_EMOJI[mySelf.status]} {STATUS_LABEL[mySelf.status]}</span>
            {mySelf.subject && (
              <>
                <span className="text-stone-300" aria-hidden>·</span>
                <span className="truncate">{mySelf.subject}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={askForHelp}
          aria-label="I need help"
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-stone-600 ring-1 ring-stone-200 transition active:scale-95"
        >
          <HandHelping className="h-3.5 w-3.5" strokeWidth={2.2} />
          Help
        </button>
      </div>

    </Motion.div>
  );
}
