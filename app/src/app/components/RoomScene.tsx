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
  className?: string;
}

export function RoomScene(props: RoomSceneProps) {
  const { compact = false } = props;
  const { mySelf, friends, roomPulse } = useAppContext();

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
      reactingPulse={reactingPulse}
      className={props.className}
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
};

function FullScene({
  mySelf,
  friends,
  hideMe,
  onWaveFriend,
  onSitAt,
  reactingPulse,
  className,
}: FullSceneProps) {
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

  /* The list has paddingTop = centerY, so row 0's centre is at y=centerY
   * when the list's own y-translate is 0. To put row `idx` at the container
   * centre we simply shift the list up by idx rows. */
  const centerY  = (containerH - PICKER_ROW_H) / 2;
  const getListY = (idx: number) => -idx * PICKER_ROW_H;

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
          background: 'rgba(58,60,56,0.045)',
          borderTop:    '1px solid rgba(58,60,56,0.13)',
          borderBottom: '1px solid rgba(58,60,56,0.13)',
        }}
      />

      {/* ── Draggable zone list ── */}
      {/* Spacer padding = centerY so both the first and last zone can
          reach the centre of the selection window when selected. */}
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
            Math.max(0, Math.min(ZONE_ORDER.length - 1, prev + step)),
          );
        }}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          touchAction: 'none', cursor: 'grab',
          paddingTop: centerY, paddingBottom: centerY,
        }}
      >
        {ZONE_ORDER.map((zoneId, i) => {
          const zone        = ZONES[zoneId];
          const isActive    = i === activeIdx;
          const dist        = Math.abs(i - activeIdx);
          const rowOpacity  = isActive ? 1 : Math.max(0.22, 0.55 - dist * 0.18);
          const rowScale    = isActive ? 1 : Math.max(0.78, 0.93 - dist * 0.06);

          /* Friends whose slot falls in this zone */
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
              /* Tapping a non-active row selects it */
              onClick={() => { if (!isActive) setActiveIdx(i); }}
            >
              {/* ── Left column: glyph + label ── */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 5, minWidth: 52 }}>
                <svg width="40" height="40" viewBox="-20 -20 40 40" overflow="visible">
                  <ZoneIcon id={zoneId} cx={0} cy={0} opacity={1} />
                </svg>
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '1.3px',
                  color: '#3a3c38', textTransform: 'uppercase',
                  opacity: 0.62, whiteSpace: 'nowrap',
                }}>
                  {zone.label}
                </span>
              </div>

              {/* ── Right column: friends + bell-seat + empty seats ── */}
              <div style={{ display:'flex', alignItems:'flex-end', gap: 5 }}>
                {zoneFriends.map(f => {
                  const isActor    = reactingPulse?.fromId === f.id;
                  const isObserver = reactingPulse !== null && !isActor;
                  return (
                    <InlineCharacter
                      key={f.id}
                      friend={f}
                      onWave={onWaveFriend ? () => onWaveFriend(f.id) : undefined}
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

                {/* You — shown in your current zone */}
                {isMeHere && !hideMe && (
                  <InlineCharacter
                    key="me"
                    friend={mySelf}
                    onWave={undefined}
                    reaction="idle"
                  />
                )}

                {/* Focus-table centre stool = bell-pull shortcut */}
                {zoneId === 'focus' && (
                  <button
                    onClick={e => { e.stopPropagation(); onSitAtRef.current?.('focus', ZONES.focus.slots[2]); }}
                    aria-label="Pull the bell to sit at the focus table"
                    style={{
                      width: 36, height: 50, borderRadius: 18,
                      background: 'rgba(58,60,56,0.07)',
                      border: '1px solid rgba(58,60,56,0.13)',
                      cursor: 'pointer', display:'flex',
                      alignItems:'center', justifyContent:'center', fontSize: 20,
                    }}
                  >
                    🔔
                  </button>
                )}

                {/* Empty seat rings */}
                {emptyInZone.map(({ slot }, ei) => (
                  <button
                    key={ei}
                    onClick={e => { e.stopPropagation(); onSitAtRef.current?.(zoneId, slot); }}
                    aria-label={`Sit at ${zone.label}`}
                    style={{
                      width: 36, height: 50, borderRadius: 18,
                      background: 'none',
                      border: '1.3px dashed rgba(58,60,56,0.32)',
                      cursor: 'pointer', display:'flex',
                      alignItems:'center', justifyContent:'center',
                      fontSize: 8, fontWeight: 700,
                      color: 'rgba(58,60,56,0.42)', letterSpacing: '0.04em',
                    }}
                  >
                    sit
                  </button>
                ))}
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
/* InlineCharacter — a SideCharacter wrapped in its own tiny SVG so it  */
/* can live inside the HTML drum-picker rows without breaking layout.    */
/* --------------------------------------------------------------------- */

function InlineCharacter({
  friend,
  onWave,
  reaction = 'idle',
}: {
  friend: Friend;
  onWave?: () => void;
  reaction?: Reaction;
}) {
  return (
    <svg
      width="36"
      height="50"
      viewBox="-18 4 36 52"
      overflow="visible"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <SideCharacter
        friend={friend}
        cx={0}
        cy={44}
        showName={false}
        clickable={!!onWave}
        onClick={onWave}
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
