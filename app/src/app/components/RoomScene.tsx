import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useAppContext, type Friend, type FriendStatus } from '../context/AppContext';

/* -----------------------------------------------------------------------
 * RoomScene — a drum-roller zone picker for the study room.
 *
 * Five zones are laid out as rows in a snap-scroll vertical picker
 * (iOS-style selection dial). A static selection window sits at the
 * centre of the stage; dragging the list snaps it so the chosen zone
 * is centred in that window. Each row shows:
 *   • a zone glyph (SVG icon)   • zone label (uppercase kicker)
 *   • friends sitting there      • empty "sit" rings
 *
 * Two layouts:
 *  - default (StudyRoom): the five-row drum picker with tappable seats.
 *  - `compact`: a quiet horizontal row of friends — no picker, no zones.
 * ----------------------------------------------------------------------- */

/** viewBox coords kept for friend-seat tracking only — not rendered. */
const VB_W = 400;
const VB_H = 280;

/* ---- drum-picker layout ---- */
const PICKER_ROW_H  = 106;  // CSS px height of one zone row
/** Zone order in the picker — top = back (quiet), bottom = front (couch). */
const ZONE_ORDER: ZoneId[] = ['quiet', 'reading', 'focus', 'help', 'couch'];
const FOCUS_IDX = ZONE_ORDER.indexOf('focus'); // = 2

/* Zone slot coordinates live in "VB" space (VB_W × VB_H) and are only
 * used for tracking which slot a friend/user occupies — they are never
 * rendered directly in the new drum-picker layout. */
const ROW_BASE_X = 200;
const ROW_BASE_Y = 228;
const ROW_DX     = 10;
const ROW_DY     = 108;

function rowXY(depthStep: number, xOff: number): { x: number; y: number } {
  return {
    x: ROW_BASE_X + ROW_DX * depthStep + xOff,
    y: ROW_BASE_Y - ROW_DY * depthStep,
  };
}

const STATUS_GLYPH: Record<FriendStatus, string> = {
  focusing:   '✏️',
  on_break:   '🍵',
  finished:   '🎉',
  needs_help: '🙋',
  offline:    '💤',
};

/* Body-tone palette per friend id — kept restricted to the design-system
   palette tokens (peach, mint, sky, lavender, sun, coral). */
const PALETTE: Record<string, string> = {
  me: '#ff9c7a',
  f1: '#f5a48f',
  f2: '#7ed4ae',
  f3: '#aee1f9',
  f4: '#d6c8ff',
  f5: '#ffd56a',
  f6: '#ff9aa2',
};

/* --------------------------------------------------------------------- */
/* Zones — each one is one row in the vertical iso column.               */
/*                                                                       */
/* Row 0 (front, closest)   Snack Couch    · 2 seats                     */
/* Row 1                    Help Desk      · 1 seat                      */
/* Row 2 (mid)              Focus Table    · 5 stools (bell rests above) */
/* Row 3                    Reading Nook   · 1 seat                      */
/* Row 4 (back, faintest)   Quiet Desk     · 1 seat                      */
/* --------------------------------------------------------------------- */

export type ZoneId = 'focus' | 'quiet' | 'reading' | 'couch' | 'help';

interface Zone {
  id: ZoneId;
  label: string;
  status: FriendStatus;
  /** 0 = front row, increasing into the back. Used to project labels +
   *  seats onto screen via `rowXY(depthStep, xOff)`. */
  depthStep: number;
  /** Where the zone's caption text sits in viewBox coordinates. */
  labelAt: { x: number; y: number };
  /** Where the zone's small graphic glyph sits — in the gap above the
   *  row's seats, so it reads as the row's "object". */
  iconAt: { x: number; y: number };
  /** Absolute viewBox positions for each seat. */
  slots: { x: number; y: number }[];
}

/* Per-zone seat configuration. Seats are absolute positions on screen,
 * derived once from `rowXY()` so the rest of the file can treat them
 * as plain (x, y) coordinates. */
function buildZone(
  id: ZoneId,
  label: string,
  status: FriendStatus,
  depthStep: number,
  seatXOffsets: number[],
  labelXOff: number,
): Zone {
  const rowCenter = rowXY(depthStep, 0);
  const labelPos  = rowXY(depthStep, labelXOff);
  return {
    id,
    label,
    status,
    depthStep,
    /* Label sits below the friend-name line (which `SideCharacter`
     * draws at row + 16). 36 leaves a comfortable 20px gap between
     * a friend's name and the zone caption. */
    labelAt: { x: labelPos.x, y: labelPos.y + 36 },
    /* Glyph hovers 52 px above the seats — in the gap that sits
     * between this row and the row in front of it (label of row N+1
     * is at +36, so there's still ~16 px of breathing room). */
    iconAt:  { x: rowCenter.x, y: rowCenter.y - 52 },
    slots: seatXOffsets.map((xOff) => {
      const p = rowXY(depthStep, xOff);
      return { x: p.x, y: p.y };
    }),
  };
}

const ZONES: Record<ZoneId, Zone> = {
  couch:   buildZone('couch',   'Snack Couch',  'on_break',   0, [-30, 30], 0),
  help:    buildZone('help',    'Help Desk',    'needs_help', 1, [0],        0),
  focus:   buildZone('focus',   'Focus Table',  'focusing',   2, [-80, -40, 0, 40, 80], 0),
  reading: buildZone('reading', 'Reading Nook', 'focusing',   3, [0],        0),
  quiet:   buildZone('quiet',   'Quiet Desk',   'focusing',   4, [0],        0),
};

const ZONES_LIST = Object.values(ZONES);

/** Friends always sit at the *together* focus table when focusing —
 *  they never claim the user-only Quiet Desk or Reading Nook. */
function zoneIdForFriendStatus(s: FriendStatus): ZoneId | null {
  switch (s) {
    case 'focusing':   return 'focus';
    case 'finished':   return 'couch';
    case 'on_break':   return 'couch';
    case 'needs_help': return 'help';
    case 'offline':    return null;
  }
}

const SLOT_EQ_EPS = 4;
function slotsEqual(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) < SLOT_EQ_EPS && Math.abs(a.y - b.y) < SLOT_EQ_EPS;
}
function zoneIdForSeat(seat: { x: number; y: number }): ZoneId | null {
  for (const z of ZONES_LIST) {
    if (z.slots.some((s) => slotsEqual(s, seat))) return z.id;
  }
  return null;
}


/* --------------------------------------------------------------------- */
/* Public API                                                            */
/* --------------------------------------------------------------------- */

interface RoomSceneProps {
  /** Compact = small horizontal row of friends. No bell, no zones. */
  compact?: boolean;
  hideMe?: boolean;
  onWaveFriend?: (id: string) => void;
  onSitAt?: (zoneId: ZoneId, slot: { x: number; y: number }) => void;
  /** Called when the user taps the 🔔 bell seat — go to plan/home. */
  onPullBell?: () => void;
  /** Called when the user taps a friend's avatar — show their profile. */
  onProfileFriend?: (friend: Friend) => void;
  className?: string;
}

export function RoomScene(props: RoomSceneProps) {
  const { compact = false } = props;
  const { mySelf, friends, roomPulse, isDark } = useAppContext();

  /* Shared pulse listener — both layouts react. */
  const [reactingPulse, setReactingPulse] = useState<{
    id: number;
    fromId: string;
    kind: typeof roomPulse.kind;
  } | null>(null);
  useEffect(() => {
    if (roomPulse.id === 0) return;
    setReactingPulse({ id: roomPulse.id, fromId: roomPulse.fromId, kind: roomPulse.kind });
    const t = setTimeout(() => setReactingPulse(null), 1100);
    return () => clearTimeout(t);
  }, [roomPulse.id, roomPulse.fromId, roomPulse.kind]);

  if (compact) {
    return (
      <CompactScene
        mySelf={mySelf}
        friends={friends}
        hideMe={props.hideMe}
        onWaveFriend={props.onWaveFriend}
        reactingPulse={reactingPulse}
        className={props.className}
      />
    );
  }
  return (
    <FullScene
      mySelf={mySelf}
      friends={friends}
      hideMe={props.hideMe}
      onWaveFriend={props.onWaveFriend}
      onSitAt={props.onSitAt}
      onPullBell={props.onPullBell}
      onProfileFriend={props.onProfileFriend}
      reactingPulse={reactingPulse}
      className={props.className}
      isDark={isDark}
    />
  );
}

type ReactingPulse = {
  id: number;
  fromId: string;
  kind: 'pull' | 'wave' | 'break' | 'finish' | 'help';
} | null;

interface SceneSubProps {
  mySelf: Friend;
  friends: Friend[];
  hideMe?: boolean;
  onWaveFriend?: (id: string) => void;
  reactingPulse: ReactingPulse;
  className?: string;
}

/* --------------------------------------------------------------------- */
/* Full layout — side-view interior with five zones, bell, tappable seats */
/* --------------------------------------------------------------------- */

type FullSceneProps = SceneSubProps & {
  onSitAt?: (zoneId: ZoneId, slot: { x: number; y: number }) => void;
  onPullBell?: () => void;
  onProfileFriend?: (friend: Friend) => void;
  isDark?: boolean;
};

/** A single item in the drum-picker: a built-in zone, a user-created
 *  custom spot, or the trailing "Add" button row. */
type PickerItem =
  | { kind: 'zone';   id: ZoneId }
  | { kind: 'custom'; label: string; idx: number }
  | { kind: 'add' };

function FullScene({
  mySelf,
  friends,
  hideMe,
  onWaveFriend,
  onSitAt,
  onPullBell,
  onProfileFriend,
  reactingPulse,
  className,
  isDark = false,
}: FullSceneProps) {
  const ink     = isDark ? 'rgba(255,255,255,0.80)' : 'rgba(58,60,56,1)';
  const inkSub  = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(58,60,56,0.50)';
  const selBg   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(58,60,56,0.045)';
  const selBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(58,60,56,0.13)';

  /* ── custom-zone state ── */
  const [extraZoneLabels, setExtraZoneLabels] = useState<string[]>([]);
  const [addDraft, setAddDraft] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const pickerItems: PickerItem[] = [
    ...ZONE_ORDER.map(id => ({ kind: 'zone' as const, id })),
    ...extraZoneLabels.map((label, idx) => ({ kind: 'custom' as const, label, idx })),
    { kind: 'add' as const },
  ];

  /* Where is the user, in viewBox coords? */
  const userSeatPx = mySelf.status === 'offline'
    ? null
    : { x: mySelf.seat.x * VB_W, y: mySelf.seat.y * VB_H };
  const userZoneId = userSeatPx ? zoneIdForSeat(userSeatPx) : null;

  /* The center focus stool is the bell-pull seat — it's always reserved
   * for the user. Friends never sit there, and it never shows up as a
   * dashed empty "sit" ring (the bell pendant occupies that spot
   * visually). */
  const BELL_SEAT = ZONES.focus.slots[2];
  const isBellSeat = (slot: { x: number; y: number }) =>
    slotsEqual(slot, BELL_SEAT);

  /* Friend → slot assignment, skipping the user's slot and the bell seat. */
  const friendSlot = new Map<string, { x: number; y: number }>();
  for (const zone of ZONES_LIST) {
    const inZone = friends
      .filter((f) => zoneIdForFriendStatus(f.status) === zone.id)
      .sort((a, b) => a.id.localeCompare(b.id));
    let slotIdx = 0;
    for (const f of inZone) {
      while (
        slotIdx < zone.slots.length &&
        (
          isBellSeat(zone.slots[slotIdx]) ||
          (userZoneId === zone.id &&
            userSeatPx &&
            slotsEqual(zone.slots[slotIdx], userSeatPx))
        )
      ) {
        slotIdx++;
      }
      if (slotIdx >= zone.slots.length) break;
      friendSlot.set(f.id, zone.slots[slotIdx]);
      slotIdx++;
    }
  }

  /* Empty slots = zone slots not assigned to a friend, not the user's,
   * and not the bell seat (the pendant draws there). */
  const emptySlots: { zone: Zone; slot: { x: number; y: number } }[] = [];
  for (const zone of ZONES_LIST) {
    for (const slot of zone.slots) {
      const takenByFriend = Array.from(friendSlot.values()).some((s) => slotsEqual(s, slot));
      const takenByUser = userZoneId === zone.id && userSeatPx && slotsEqual(slot, userSeatPx);
      if (!takenByFriend && !takenByUser && !isBellSeat(slot)) {
        emptySlots.push({ zone, slot });
      }
    }
  }

  /* ── drum-picker state ── */
  const [activeIdx, setActiveIdx] = useState(FOCUS_IDX);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(460);
  const onSitAtRef = useRef(onSitAt);
  onSitAtRef.current = onSitAt;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setContainerH(entry.contentRect.height),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Focus the add-zone input whenever it becomes visible */
  useEffect(() => {
    if (isAddingZone) {
      const t = setTimeout(() => addInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isAddingZone]);

  const centerY  = (containerH - PICKER_ROW_H) / 2;
  const getListY = (idx: number) => -idx * PICKER_ROW_H;

  const confirmAddZone = () => {
    const name = addDraft.trim();
    if (!name) { setIsAddingZone(false); setAddDraft(''); return; }
    setExtraZoneLabels(prev => [...prev, name]);
    setAddDraft('');
    setIsAddingZone(false);
    /* Select the newly added custom zone */
    setActiveIdx(pickerItems.length - 1); // length before the new item is appended → points to new zone
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* ── Selection window — static, sits at the vertical midpoint ── */}
      <div
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 20, right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          height: PICKER_ROW_H,
          zIndex: 10,
          borderRadius: 22,
          background: selBg,
          borderTop:    `1px solid ${selBorder}`,
          borderBottom: `1px solid ${selBorder}`,
        }}
      />

      {/* ── Draggable zone list ── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -9999, bottom: 9999 }}
        dragElastic={0.08}
        dragMomentum={false}
        animate={{ y: getListY(activeIdx) }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        onDragEnd={(_, info) => {
          const threshold = PICKER_ROW_H * 0.38;
          const step =
            info.offset.y < -threshold ? 1 :
            info.offset.y >  threshold ? -1 : 0;
          setActiveIdx(prev =>
            Math.max(0, Math.min(pickerItems.length - 1, prev + step)),
          );
        }}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          touchAction: 'none', cursor: 'grab',
          paddingTop: centerY, paddingBottom: centerY,
        }}
      >
        {pickerItems.map((item, i) => {
          const isActive   = i === activeIdx;
          const dist       = Math.abs(i - activeIdx);
          const rowOpacity = isActive ? 1 : Math.max(0.22, 0.55 - dist * 0.18);
          const rowScale   = isActive ? 1 : Math.max(0.78, 0.93 - dist * 0.06);

          /* ── "Add spot" row ── */
          if (item.kind === 'add') {
            return (
              <div
                key="__add"
                style={{
                  height: PICKER_ROW_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 18,
                  opacity: rowOpacity,
                  transform: `scale(${rowScale})`,
                  transition: 'opacity 0.22s, transform 0.22s',
                }}
                onClick={() => { if (!isActive) setActiveIdx(i); }}
              >
                {isActive && isAddingZone ? (
                  /* Inline name-entry when the add row is active */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 220 }}>
                    <input
                      ref={addInputRef}
                      value={addDraft}
                      onChange={e => setAddDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmAddZone();
                        if (e.key === 'Escape') { setIsAddingZone(false); setAddDraft(''); }
                      }}
                      placeholder="Name your spot…"
                      maxLength={24}
                      style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        fontSize: 15, fontWeight: 600,
                        color: ink, caretColor: isDark ? '#5eead4' : '#3a3c38',
                        borderBottom: `1.5px solid ${isDark ? 'rgba(255,255,255,0.30)' : 'rgba(58,60,56,0.30)'}`,
                        paddingBottom: 3,
                      }}
                    />
                    <button
                      onMouseDown={e => { e.preventDefault(); confirmAddZone(); }}
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(58,60,56,0.10)',
                        border: 'none', borderRadius: 10, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700, color: ink, cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  /* Default "Add a spot" affordance */
                  <button
                    onClick={e => { e.stopPropagation(); if (isActive) setIsAddingZone(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'none', border: 'none', cursor: isActive ? 'pointer' : 'default',
                      padding: 0,
                    }}
                  >
                    {/* Plus icon */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 16,
                      border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(58,60,56,0.22)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <line x1="9" y1="3" x2="9" y2="15" stroke={inkSub} strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="3" y1="9" x2="15" y2="9" stroke={inkSub} strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: inkSub,
                      letterSpacing: '0.02em', whiteSpace: 'nowrap',
                    }}>
                      Add a spot
                    </span>
                  </button>
                )}
              </div>
            );
          }

          /* ── Custom zone row ── */
          if (item.kind === 'custom') {
            const fallbackSlot = { x: ROW_BASE_X, y: ROW_BASE_Y };
            return (
              <div
                key={`custom_${item.idx}`}
                onClick={() => { if (!isActive) setActiveIdx(i); }}
                style={{
                  height: PICKER_ROW_H,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  opacity: rowOpacity,
                  transform: `scale(${rowScale})`,
                  transition: 'opacity 0.22s, transform 0.22s',
                }}
              >
                {/* ── Delete button (minus) — always 20px from left edge ── */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setExtraZoneLabels(prev => prev.filter((_, fi) => fi !== item.idx));
                    setActiveIdx(prev => Math.max(0, Math.min(prev, pickerItems.length - 3)));
                  }}
                  aria-label={`Remove ${item.label}`}
                  style={{
                    position: 'absolute', left: 45,
                    width: 20, height: 20,
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="2" viewBox="0 0 12 2">
                    <line x1="1" y1="1" x2="11" y2="1"
                      stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'}
                      strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                {/* Left column: icon + label */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6, minWidth: 60 }}>
                  <svg width="48" height="48" viewBox="-20 -20 40 40" overflow="visible">
                    <g style={{ pointerEvents: 'none' }}>
                      <circle cx="0" cy="-2" r="11" fill={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(58,60,56,0.08)'} />
                      <text x="0" y="2" textAnchor="middle" fontSize="12" fontWeight={700} fill={inkSub}>✦</text>
                    </g>
                  </svg>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.9px',
                    color: ink, textTransform: 'uppercase',
                    opacity: isActive ? 0.85 : 0.45, whiteSpace: 'nowrap', maxWidth: 80,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.label}
                  </span>
                </div>
                {/* Sit button */}
                <div style={{ display:'flex', alignItems:'flex-end', gap: 5 }}>
                  <button
                    onClick={e => { e.stopPropagation(); onSitAtRef.current?.('focus', fallbackSlot); }}
                    aria-label={`Sit at ${item.label}`}
                    style={{
                      width: 40, height: 54, borderRadius: 18,
                      background: 'none',
                      border: `1.3px dashed ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(58,60,56,0.32)'}`,
                      cursor: 'pointer', display:'flex',
                      alignItems:'center', justifyContent:'center',
                      fontSize: 10, fontWeight: 700,
                      color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(58,60,56,0.42)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    sit
                  </button>
                </div>
              </div>
            );
          }

          /* ── Built-in zone row ── */
          const zoneId     = item.id;
          const zone       = ZONES[zoneId];

          const zoneFriends = friends.filter(f => {
            const slot = friendSlot.get(f.id);
            return slot && zone.slots.some(s => slotsEqual(s, slot));
          });
          const isMeHere   = userZoneId === zoneId;
          const emptyInZone = emptySlots.filter(e => e.zone.id === zoneId);

          return (
            <div
              key={zoneId}
              style={{
                height: PICKER_ROW_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                opacity: rowOpacity,
                transform: `scale(${rowScale})`,
                transition: 'opacity 0.22s, transform 0.22s',
              }}
              onClick={() => { if (!isActive) setActiveIdx(i); }}
            >
              {/* ── Left column: glyph + label ── */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6, minWidth: 60 }}>
                <svg width="48" height="48" viewBox="-20 -20 40 40" overflow="visible">
                  <ZoneIcon id={zoneId} cx={0} cy={0} opacity={1} />
                </svg>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.9px',
                  color: ink, textTransform: 'uppercase',
                  opacity: isActive ? 0.85 : 0.45, whiteSpace: 'nowrap',
                }}>
                  {zone.label}
                </span>
              </div>

              {/* ── Right column: friends + empty seats ── */}
              <div style={{ display:'flex', alignItems:'flex-end', gap: 5 }}>
                {zoneFriends.map(f => {
                  const isActor    = reactingPulse?.fromId === f.id;
                  const isObserver = reactingPulse !== null && !isActor;
                  return (
                    <InlineCharacter
                      key={f.id}
                      friend={f}
                      onWave={onWaveFriend ? () => onWaveFriend(f.id) : undefined}
                      onProfile={() => onProfileFriend?.(f)}
                      reaction={
                        isActor
                          ? reactingPulse!.kind === 'pull'   ? 'bow'
                          : reactingPulse!.kind === 'finish' ? 'cheer'
                          : reactingPulse!.kind === 'wave'   ? 'wave'
                          : reactingPulse!.kind === 'help'   ? 'hand'
                          : 'idle'
                          : isObserver ? 'look-up' : 'idle'
                      }
                    />
                  );
                })}

                {isMeHere && !hideMe && (
                  <InlineCharacter key="me" friend={mySelf} onWave={undefined} reaction="idle" />
                )}

                {/* Empty seat rings — always show at least one */}
                {(() => {
                  const seats = emptyInZone.length > 0
                    ? emptyInZone
                    : [{
                        zone,
                        slot: {
                          x: zone.slots[zone.slots.length - 1].x + 40,
                          y: zone.slots[zone.slots.length - 1].y,
                        },
                      }];
                  return seats.map(({ slot }, ei) => (
                    <button
                      key={ei}
                      onClick={e => { e.stopPropagation(); onSitAtRef.current?.(zoneId, slot); }}
                      aria-label={`Sit at ${zone.label}`}
                      style={{
                        width: 40, height: 54, borderRadius: 18,
                        background: 'none',
                        border: `1.3px dashed ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(58,60,56,0.32)'}`,
                        cursor: 'pointer', display:'flex',
                        alignItems:'center', justifyContent:'center',
                        fontSize: 10, fontWeight: 700,
                        color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(58,60,56,0.42)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      sit
                    </button>
                  ));
                })()}
              </div>
            </div>
          );
        })}
      </motion.div>

    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Compact layout — a quiet horizontal row of friends.                    */
/* No bell, no zones. Reserved for "people are here too" footers.         */
/* --------------------------------------------------------------------- */

function CompactScene({
  mySelf,
  friends,
  hideMe,
  onWaveFriend,
  reactingPulse,
  className,
}: SceneSubProps) {
  const seats = (hideMe ? friends : [...friends, mySelf])
    .filter((f) => f.status !== 'offline');
  const COMPACT_VB_H = 80;
  const baseline = 60;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${COMPACT_VB_H}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Friends in the study room"
    >
      <line x1="0" y1={baseline + 4} x2={VB_W} y2={baseline + 4} stroke="#3a3c38" strokeOpacity="0.10" />
      {seats.map((f, i) => {
        const cx = (i + 1) * (VB_W / (seats.length + 1));
        const isMe = f.id === 'me';
        const isActor = reactingPulse?.fromId === f.id;
        const isObserver = reactingPulse !== null && !isActor;
        return (
          <SideCharacter
            key={f.id}
            friend={f}
            cx={cx}
            cy={baseline}
            showName={false}
            clickable={!!onWaveFriend && !isMe}
            onClick={onWaveFriend && !isMe ? () => onWaveFriend(f.id) : undefined}
            reaction={
              isActor
                ? reactingPulse!.kind === 'pull'    ? 'bow'
                : reactingPulse!.kind === 'finish'  ? 'cheer'
                : reactingPulse!.kind === 'wave'    ? 'wave'
                : reactingPulse!.kind === 'help'    ? 'hand'
                : 'idle'
                : isObserver
                ? 'look-up'
                : 'idle'
            }
          />
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* --------------------------------------------------------------------- */
/* FriendProfileSheet — bottom sheet that appears when you tap a friend  */
/* --------------------------------------------------------------------- */

import type { ContactPlatform } from '../context/AppContext';

const PLATFORM_ICON: Record<ContactPlatform, string> = {
  instagram: '📸',
  discord:   '🎮',
  snapchat:  '👻',
  phone:     '📱',
};

const PLATFORM_URL: Record<ContactPlatform, (handle: string) => string> = {
  instagram: h => `https://instagram.com/${h.replace(/^@/, '')}`,
  discord:   h => `https://discord.com/users/${h}`,
  snapchat:  h => `https://snapchat.com/add/${h.replace(/^@/, '')}`,
  phone:     h => `tel:${h.replace(/\s/g, '')}`,
};

function openContact(contact: { platform: ContactPlatform; handle: string }) {
  window.open(PLATFORM_URL[contact.platform](contact.handle), '_blank', 'noopener');
}

const STATUS_LABEL_FULL: Record<FriendStatus, string> = {
  focusing:   'In a focus session',
  on_break:   'On a short break',
  finished:   'Done for today',
  needs_help: 'Looking for help',
  offline:    'Offline',
};

const STATUS_COLOR: Record<FriendStatus, string> = {
  focusing:   '#34d399',
  on_break:   '#fbbf24',
  finished:   '#a78bfa',
  needs_help: '#f87171',
  offline:    '#94a3b8',
};

export function FriendProfileSheet({
  friend,
  isDark,
  onWave,
  onClose,
}: {
  friend: Friend;
  isDark: boolean;
  onWave: () => void;
  onClose: () => void;
}) {
  const [waved, setWaved] = useState(false);

  const sheetBg  = isDark ? 'rgba(28,28,32,0.97)' : 'rgba(255,252,245,0.98)';
  const textMain = isDark ? 'rgba(255,255,255,0.88)' : '#1c1c1e';
  const textSub  = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(58,60,56,0.55)';
  const divider  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(58,60,56,0.08)';
  const chipBg   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(58,60,56,0.06)';
  const statusColor = STATUS_COLOR[friend.status];

  const breakIn = friend.minutesLeft ?? null;

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      {/* Sheet */}
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        style={{
          width: '100%',
          borderRadius: '28px 28px 0 0',
          background: sheetBg,
          backdropFilter: 'blur(18px)',
          padding: '0 0 32px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)' }} />
        </div>

        {/* Avatar + name */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop: 20, gap: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: PALETTE[friend.id] ?? '#d6c8ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, boxShadow: `0 0 0 3px ${statusColor}44`,
          }}>
            {friend.emoji}
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: textMain, letterSpacing: '-0.01em' }}>
            {friend.name}
          </span>

          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: chipBg, borderRadius: 20,
            padding: '5px 12px',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: textSub, letterSpacing: '0.02em' }}>
              {STATUS_LABEL_FULL[friend.status]}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ marginTop: 24, borderTop: `1px solid ${divider}`, marginInline: 24 }}>
          {friend.subject && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: '14px 0', borderBottom: `1px solid ${divider}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: textSub, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Subject</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: textMain }}>{friend.subject}</span>
            </div>
          )}
          {friend.minutesLeft !== undefined && friend.status === 'focusing' && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: '14px 0', borderBottom: `1px solid ${divider}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: textSub, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Time left</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: textMain }}>{friend.minutesLeft} min</span>
            </div>
          )}
        </div>

        {/* Wave button / sent / wave-back states */}
        <div style={{ marginTop: 20, paddingInline: 24 }}>
          {waved && friend.waving && friend.contact ? (
            /* ── Wave-back received + contact revealed ── */
            <div style={{
              borderRadius: 18, overflow: 'hidden',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(58,60,56,0.10)'}`,
            }}>
              <div style={{
                padding: '10px 16px 8px',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(58,60,56,0.04)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 15 }}>👋</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: textSub, letterSpacing: '0.03em' }}>
                  {friend.name} waved back!
                </span>
              </div>
              <button
                onClick={() => openContact(friend.contact!)}
                style={{
                  width: '100%', padding: '14px 16px',
                  border: 'none', cursor: 'pointer',
                  background: statusColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.03em',
                }}
              >
                <span style={{ fontSize: 17 }}>{PLATFORM_ICON[friend.contact.platform]}</span>
                {friend.contact.handle}
              </button>
            </div>
          ) : waved ? (
            /* ── Waiting for reply ── */
            <div style={{
              width: '100%', padding: '14px 16px',
              borderRadius: 18,
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(58,60,56,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: textSub, letterSpacing: '0.03em' }}>
                Waiting for reply…
              </span>
              {breakIn !== null && friend.status === 'focusing' && (
                <span style={{ fontSize: 11, color: textSub, opacity: 0.7 }}>
                  Their next break will be in {breakIn} min
                </span>
              )}
            </div>
          ) : (
            /* ── Wave button ── */
            <button
              onClick={() => { setWaved(true); onWave(); }}
              style={{
                width: '100%', padding: '14px 0',
                borderRadius: 18, border: 'none', cursor: 'pointer',
                background: statusColor,
                color: '#fff',
                fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
              }}
            >
              👋  Wave at {friend.name}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* InlineCharacter — a SideCharacter wrapped in its own tiny SVG so it  */
/* can live inside the HTML drum-picker rows without breaking layout.    */
/* --------------------------------------------------------------------- */

function InlineCharacter({
  friend,
  onWave,
  onProfile,
  reaction = 'idle',
}: {
  friend: Friend;
  onWave?: () => void;
  onProfile?: () => void;
  reaction?: Reaction;
}) {
  return (
    <svg
      width="36"
      height="50"
      viewBox="-18 4 36 52"
      overflow="visible"
      style={{ display: 'block', flexShrink: 0, cursor: onProfile ? 'pointer' : 'default' }}
      onClick={onProfile ?? onWave}
      role={onProfile ? 'button' : undefined}
      aria-label={onProfile ? `View ${friend.name}'s profile` : undefined}
    >
      <SideCharacter
        friend={friend}
        cx={0}
        cy={44}
        showName={false}
        clickable={!!(onWave || onProfile)}
        onClick={undefined}
        reaction={reaction}
      />
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* ZoneIcon — a small graphic glyph that sits above each row's seats.    */
/*                                                                       */
/* Each zone gets its own iconography drawn in the design-system palette */
/* (mint / sky / lavender / sun / coral / oak) so the rows feel distinct */
/* without any framing or furniture. Glyphs are ~24 px wide and          */
/* pointer-events-disabled so they never interfere with seat taps.       */
/* --------------------------------------------------------------------- */

function ZoneIcon({
  id,
  cx,
  cy,
  opacity,
}: {
  id: ZoneId;
  cx: number;
  cy: number;
  opacity: number;
}) {
  const wrap = (children: React.ReactNode) => (
    <g
      transform={`translate(${cx}, ${cy})`}
      opacity={opacity}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {children}
    </g>
  );

  switch (id) {
    /* Quiet Desk — a slim pair of headphones. Solo, hushed. */
    case 'quiet':
      return wrap(
        <>
          <path
            d="M -10 3 q 0 -12 10 -12 q 10 0 10 12"
            stroke="#a98660"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="-13" y="1" width="5" height="8" rx="1.5" fill="#a98660" />
          <rect x="8"   y="1" width="5" height="8" rx="1.5" fill="#a98660" />
        </>,
      );

    /* Reading Nook — an open book. */
    case 'reading':
      return wrap(
        <>
          <path
            d="M -13 -4 q 6 -3 13 0 q 7 -3 13 0 L 13 6 q -7 3 -13 0 q -7 3 -13 0 Z"
            fill="#e6dcff"
            stroke="#8a78c5"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <line x1="0" y1="-4" x2="0" y2="6" stroke="#8a78c5" strokeWidth="0.9" />
        </>,
      );

    /* Focus Table — a small stack of three books, like the bench had. */
    case 'focus':
      return wrap(
        <>
          <rect x="-13" y="1"  width="26" height="5" rx="1" fill="#aee1f9" stroke="#3a3c38" strokeOpacity="0.25" strokeWidth="0.6" />
          <rect x="-11" y="-4" width="22" height="5" rx="1" fill="#7ed4ae" stroke="#3a3c38" strokeOpacity="0.25" strokeWidth="0.6" />
          <rect x="-8"  y="-9" width="16" height="5" rx="1" fill="#ffd56a" stroke="#3a3c38" strokeOpacity="0.25" strokeWidth="0.6" />
        </>,
      );

    /* Help Desk — a small "?" placard on the wall. */
    case 'help':
      return wrap(
        <>
          <rect
            x="-8"
            y="-9"
            width="16"
            height="16"
            rx="2.5"
            fill="#ffe07a"
            stroke="#c79f3a"
            strokeWidth="0.7"
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            fontSize="12"
            fontWeight={800}
            fill="#c46a4d"
          >
            ?
          </text>
        </>,
      );

    /* Snack Couch — a mug with three little steam curls. */
    case 'couch':
      return wrap(
        <>
          {/* steam */}
          <g
            stroke="#a85962"
            strokeOpacity="0.55"
            strokeWidth="0.9"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M -4 -7 q 1.5 -2 0 -4" />
            <path d="M 0  -7 q -1.5 -2 0 -4" />
            <path d="M 4  -7 q 1.5 -2 0 -4" />
          </g>
          {/* mug body + handle */}
          <path
            d="M -7 -3 L -7 5 q 0 2.5 2.5 2.5 L 4.5 7.5 q 2.5 0 2.5 -2.5 L 7 -3 Z"
            fill="#ffb8be"
            stroke="#a85962"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M 7 -1 q 4 0 4 4 q 0 4 -4 4"
            fill="none"
            stroke="#a85962"
            strokeWidth="1"
          />
        </>,
      );

    default:
      return null;
  }
}

/* --------------------------------------------------------------------- */
/* EmptySeat — dashed pulsing ring with a tiny "sit" label.              */
/* --------------------------------------------------------------------- */

function EmptySeat({ cx, cy, onClick }: { cx: number; cy: number; onClick?: () => void }) {
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <circle cx={cx} cy={cy - 12} r={20} fill="transparent" />
      <circle
        cx={cx}
        cy={cy - 12}
        r={11}
        fill="none"
        stroke="#3a3c38"
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeDasharray="2.5 2.5"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.20;0.55;0.20"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </circle>
      <text
        x={cx}
        y={cy - 9}
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fill="#3a3c38"
        opacity="0.55"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        sit
      </text>
    </g>
  );
}

/* --------------------------------------------------------------------- */
/* SideCharacter — friend silhouette in side-view.                        */
/* A small "egg" body in palette colour, with an avatar-bubble head      */
/* carrying the user's emoji. Status glyph floats next to the head.      */
/* --------------------------------------------------------------------- */

type Reaction = 'idle' | 'look-up' | 'bow' | 'cheer' | 'wave' | 'hand';

interface CharacterProps {
  friend: Friend;
  cx: number;
  cy: number; // y at the friend's "feet" (= floor)
  showName?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  reaction?: Reaction;
}

function SideCharacter({
  friend,
  cx,
  cy,
  showName = true,
  clickable = false,
  onClick,
  reaction = 'idle',
}: CharacterProps) {
  const body = PALETTE[friend.id] ?? PALETTE.f1;
  const isOffline = friend.status === 'offline';

  const bobDur = 3 + (friend.id.length % 3) * 0.6;

  const reactionDy =
    reaction === 'bow'      ? 4 :
    reaction === 'cheer'    ? -3 :
    reaction === 'look-up'  ? -2 :
    reaction === 'wave'     ? -1 :
    reaction === 'hand'     ? -2 :
    0;

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      style={{ cursor: clickable ? 'pointer' : 'default', opacity: isOffline ? 0.55 : 1 }}
      onClick={onClick}
    >
      <g transform={`translate(0, ${reactionDy})`} style={{ transition: 'transform 0.35s cubic-bezier(0.5, 1.6, 0.5, 1)' }}>
        <g>
          {/* Subtle idle bob */}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-1.2; 0,0"
            dur={`${bobDur}s`}
            repeatCount="indefinite"
            additive="sum"
          />
          {/* Body — soft egg silhouette in the friend's palette colour */}
          <path
            d="M -11 0 Q -11 -16 0 -16 Q 11 -16 11 0 L 9 6 L -9 6 Z"
            fill={body}
            opacity={isOffline ? 0.6 : 1}
          />
          {/* Head — paper-white bubble with subtle hairline ring */}
          <circle cx="0" cy="-22" r="9" fill="#fff8ee" stroke="rgba(58,60,56,0.12)" strokeWidth="0.8" />
          {/* Avatar emoji */}
          <text
            x="0"
            y="-19"
            textAnchor="middle"
            fontSize="11"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {friend.emoji}
          </text>
          {/* Status glyph drifting up-right of the head */}
          {!isOffline && (
            <text
              x="11"
              y="-26"
              fontSize="9"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {STATUS_GLYPH[friend.status]}
            </text>
          )}
          {/* Closed-eyes overlay when sleeping/breaking — a tiny "z". */}
          {(isOffline || friend.status === 'on_break') && (
            <text x="-12" y="-28" fontSize="7" fill="#3a3c38" opacity="0.5">z</text>
          )}
        </g>
      </g>

      {/* One-shot reaction badges — wave/cheer/hand. */}
      {friend.waving && (
        <g transform="translate(-14, -34)">
          <circle r="7" fill="#ffe07a" stroke="#c79f3a" strokeWidth="0.8" />
          <text fontSize="9" textAnchor="middle" dominantBaseline="middle" y="0.5">👋</text>
          <animate attributeName="opacity" from="0" to="1" dur="0.25s" fill="freeze" />
        </g>
      )}
      {reaction === 'cheer' && (
        <g transform="translate(0, -38)" style={{ pointerEvents: 'none' }}>
          <text fontSize="11" textAnchor="middle">✨</text>
          <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
        </g>
      )}
      {reaction === 'wave' && (
        <g transform="translate(0, -38)" style={{ pointerEvents: 'none' }}>
          <text fontSize="11" textAnchor="middle">👋</text>
          <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
        </g>
      )}
      {reaction === 'hand' && (
        <g transform="translate(0, -38)" style={{ pointerEvents: 'none' }}>
          <text fontSize="11" textAnchor="middle">🙋</text>
          <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
        </g>
      )}

      {/* Name label below */}
      {showName && (
        <text
          x="0"
          y="16"
          fontSize="8.5"
          fontWeight="600"
          textAnchor="middle"
          fill="#5b574e"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {friend.name}
        </text>
      )}
    </g>
  );
}
