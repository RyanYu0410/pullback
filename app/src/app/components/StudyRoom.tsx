import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import type { Friend, ContactPlatform } from '../context/AppContext';
import { Motion } from './Motion';
import { RoomScene, FriendProfileSheet, type ZoneId } from './RoomScene';
import { ChevronLeft, Copy, Check, X } from 'lucide-react';

const HELPER_PLATFORM_ICON: Record<ContactPlatform, string> = {
  instagram: '📸', discord: '🎮', snapchat: '👻', phone: '📱',
};
const HELPER_PLATFORM_URL: Record<ContactPlatform, (h: string) => string> = {
  instagram: h => `https://instagram.com/${h.replace(/^@/, '')}`,
  discord:   h => `https://discord.com/users/${h}`,
  snapchat:  h => `https://snapchat.com/add/${h.replace(/^@/, '')}`,
  phone:     h => `tel:${h.replace(/\s/g, '')}`,
};
const DEMO_HELPER = { name: 'Leo', emoji: '🐼', contact: { platform: 'discord' as ContactPlatform, handle: 'leo#4821' } };

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
    routine,
    hasRoutine,
    pulseRoom,
    roomCode,
    roomName,
    isDark,
  } = useAppContext();

  const [copied, setCopied] = useState(false);
  const [profileFriend, setProfileFriend] = useState<Friend | null>(null);

  type HelpWaveState = 'hidden' | 'incoming' | 'waved-back';
  const [helpWave, setHelpWave] = useState<HelpWaveState>('hidden');
  const helpWaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (zoneId === 'help') {
        if (helpWaveTimer.current) clearTimeout(helpWaveTimer.current);
        setHelpWave('hidden');
        helpWaveTimer.current = setTimeout(() => setHelpWave('incoming'), 3000);
        return;
      }
      if (hasRoutine) navigate('/session');
      else navigate('/routine', { state: { openPlanEditor: true } });
    }, 750);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 pt-1">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{background:isDark?'rgba(255,255,255,0.10)':'rgba(244,244,240,0.9)',color:isDark?'rgba(255,255,255,0.60)':'#6b6f68'}}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition active:scale-90"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <span style={{color:isDark?'rgba(255,255,255,0.40)':'#9ca29a'}} className="text-[10px] font-semibold uppercase tracking-[0.2em]">Study Together</span>
          <h2 style={{color:isDark?'rgba(255,255,255,0.88)':'#3a3c38'}} className="truncate text-[20px] font-bold leading-tight tracking-tight">
            {roomName ?? 'Pick a seat'}
          </h2>
        </div>
        {/* Room code chip + copy button */}
        {roomCode && (
          <button
            onClick={copyCode}
            aria-label="Copy room code"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition active:scale-95"
            style={{background:isDark?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.9)',border:`1px solid ${isDark?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.08)'}`}}
          >
            <span style={{color:isDark?'rgba(255,255,255,0.88)':'#3a3c38'}} className="time-num text-[12px] font-bold tracking-[0.1em]">
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
      <div style={{color:isDark?'rgba(255,255,255,0.38)':'#9ca29a'}} className="mt-1 flex items-center gap-3 px-5 text-[11px] font-medium">
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
          onPullBell={() => navigate('/routine')}
          onProfileFriend={setProfileFriend}
          className="absolute inset-0 h-full w-full"
        />
      </div>


      {/* HELP DESK WAVE TOAST */}
      {helpWave !== 'hidden' && (
        <Motion.div
          key={helpWave}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="pointer-events-auto absolute bottom-[80px] left-4 right-4 z-[50]"
        >
          <div style={{
            borderRadius: 22,
            background: 'rgba(28,28,36,0.94)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
            overflow: 'hidden',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10, padding: '14px 16px 10px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#7ed4ae',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {DEMO_HELPER.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', display:'block' }}>
                  {helpWave === 'incoming'
                    ? `${DEMO_HELPER.name} wants to help 👋`
                    : `${DEMO_HELPER.name} is on their way!`}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
                  {helpWave === 'incoming' ? 'Help Desk · on break' : 'Connect to keep in touch'}
                </span>
              </div>
              <button
                onClick={() => setHelpWave('hidden')}
                style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)', padding: 4, flexShrink: 0 }}
                aria-label="Dismiss"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            {helpWave === 'incoming' ? (
              <button
                onClick={() => setHelpWave('waved-back')}
                style={{
                  width: '100%', padding: '12px 0',
                  border: 'none', cursor: 'pointer',
                  background: '#34d399', color: '#fff',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                👋  Wave back at {DEMO_HELPER.name}
              </button>
            ) : (
              <button
                onClick={() => window.open(HELPER_PLATFORM_URL[DEMO_HELPER.contact.platform](DEMO_HELPER.contact.handle), '_blank', 'noopener')}
                style={{
                  width: '100%', padding: '12px 0',
                  border: 'none', cursor: 'pointer',
                  background: '#34d399', color: '#fff',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>{HELPER_PLATFORM_ICON[DEMO_HELPER.contact.platform]}</span>
                {DEMO_HELPER.contact.handle}
              </button>
            )}
          </div>
        </Motion.div>
      )}

      {/* FRIEND PROFILE SHEET — rendered at root so it covers seat bar + chatter */}
      {profileFriend && (
        <FriendProfileSheet
          friend={profileFriend}
          isDark={isDark}
          onWave={() => sendWaveTo(profileFriend.id)}
          onClose={() => setProfileFriend(null)}
        />
      )}
    </Motion.div>
  );
}
