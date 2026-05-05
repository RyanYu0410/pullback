import React, { useEffect, useRef, useState } from 'react';
import { useAppContext, type Friend, type FriendStatus } from '../context/AppContext';
import { BellGroup } from './PullBell';

/* -----------------------------------------------------------------------
 * RoomScene
 *
 * A flat-SVG illustration of the shared study room. Two layouts:
 *
 *  - `compact` (used inside FocusSession): a single round table with
 *    every friend at their own fixed seat. No zones, no bell, no
 *    interactive seat-tapping. Friends just react to the room pulse.
 *
 *  - default (used by StudyRoom): a richer room with five purpose-zones
 *    arranged around the canvas:
 *
 *      • Focus Table   — round shared table, 5 seats; the pull-bell
 *                         hangs above it
 *      • Quiet Desk    — small desk top-right, 1 seat (focus alone)
 *      • Reading Nook  — armchair + lamp top-left, 1 seat
 *      • Snack Couch   — long couch bottom-right, 2 seats (break)
 *      • Help Desk     — desk with a "?" sign bottom-left, 1 seat
 *
 *    Friends are placed by status (focusing → table; on_break /
 *    finished → couch; needs_help → help desk; offline → not rendered).
 *    The user is rendered at `mySelf.seat`. Empty seats are tappable.
 *
 * The pull-bell is embedded directly in the scene SVG — its string and
 * pendant share the same viewBox as the rest of the room, so the bell
 * scales with the scene without any DOM-position math. The pull engine
 * attaches to a transparent SVG hit-circle.
 * ----------------------------------------------------------------------- */

const VB_W = 400;
const VB_H = 280;

const PALETTE: Record<string, { body: string; trim: string }> = {
  me: { body: '#ff9c7a', trim: '#c46a4d' },
  f1: { body: '#f5a48f', trim: '#c47865' },
  f2: { body: '#7ed4ae', trim: '#4ea884' },
  f3: { body: '#aee1f9', trim: '#76b0ce' },
  f4: { body: '#d6c8ff', trim: '#9d8ed1' },
  f5: { body: '#ffd56a', trim: '#c79f3a' },
  f6: { body: '#ff9aa2', trim: '#c4666e' },
};

const STATUS_GLYPH: Record<FriendStatus, string> = {
  focusing:   '📖',
  on_break:   '🍵',
  finished:   '🎉',
  needs_help: '🙋',
  offline:    '💤',
};

/* --------------------------------------------------------------------- */
/* Hairstyles                                                            */
/* --------------------------------------------------------------------- */
/* Each style is a small SVG fragment positioned relative to the head    */
/* center at (0, -30) with head radius 11 (so head top ≈ y=-41). Stable  */
/* mapping per friend id keeps each character recognisable across        */
/* re-renders and zone changes.                                          */

type HairStyle =
  | 'short'    // small messy tuft, slightly off-centre
  | 'flat'     // tidy even cap
  | 'bun'      // top knot above a flat base
  | 'pigtails' // two side puffs + flat top
  | 'spiky'    // punk-ish triangle row
  | 'long'     // top + two strands flowing past the jaw
  | 'bowl';    // bowl cut covering forehead

const HAIR_STYLE_BY_ID: Record<string, HairStyle> = {
  me: 'short',
  f1: 'bun',
  f2: 'bowl',
  f3: 'pigtails',
  f4: 'spiky',
  f5: 'flat',
  f6: 'long',
};

/* All paths trace the SAME basic shape: an outer outline that wraps the
   skull from one ear, up over the crown, and back down to the other
   ear; then an inner hairline (the bangs) that sweeps back across the
   forehead just above the eyes. The shape between those two outlines
   is filled with `trim`, so the head circle behind shows skin only
   where there's no hair (i.e. the face). Coordinates are anchored to
   the head center (0, -30) with head radius 11. */
function Hair({ style, trim }: { style: HairStyle; trim: string }) {
  switch (style) {
    case 'short':
      // Short tousled hair, sides down to ~ear level, slightly messy bangs.
      return (
        <path
          d="M -11 -28 Q -13 -42 0 -42 Q 13 -42 11 -28
             L 10 -31 Q 5 -33 1 -32 Q -3 -33 -7 -32 Q -10 -31 -10 -30 Z"
          fill={trim}
        />
      );
    case 'flat':
      // Even tidy cap, straight bangs across the forehead.
      return (
        <path
          d="M -11 -29 Q -12 -42 0 -42 Q 12 -42 11 -29
             L 10 -32 Q 0 -33 -10 -32 Z"
          fill={trim}
        />
      );
    case 'bun':
      // Full crown coverage + a top knot above. Tiny ribbon dot inside.
      return (
        <g>
          <path
            d="M -11 -26 Q -12 -42 0 -42 Q 12 -42 11 -26
               L 10 -31 Q 5 -33 0 -32 Q -5 -33 -10 -31 Z"
            fill={trim}
          />
          <circle cx={0} cy={-44} r={4.5} fill={trim} />
          <circle cx={0} cy={-44} r={1.4} fill="#fff8ee" opacity="0.55" />
        </g>
      );
    case 'pigtails':
      // Crown coverage + two side puffs that visibly extend past the head.
      return (
        <g>
          <path
            d="M -11 -28 Q -12 -42 0 -42 Q 12 -42 11 -28
               L 9 -32 Q 0 -33 -9 -32 Z"
            fill={trim}
          />
          <circle cx={-13.5} cy={-29} r={4.2} fill={trim} />
          <circle cx={13.5}  cy={-29} r={4.2} fill={trim} />
        </g>
      );
    case 'spiky':
      // Crown band with a saw-tooth row of spikes above. The spikes are
      // baked into the same path so the silhouette stays solid.
      return (
        <path
          d="M -10 -29 Q -11 -38 -8 -40
             L -7 -44 L -4 -38 L -2 -45 L 1 -38 L 4 -45 L 6 -38 L 8 -44
             Q 11 -38 10 -29
             L 9 -32 Q 0 -33 -9 -32 Z"
          fill={trim}
        />
      );
    case 'long':
      // Full top + two strands that flow past the jaw to about chest level.
      return (
        <g>
          <path
            d="M -11 -25 Q -12 -42 0 -42 Q 12 -42 11 -25
               L 9 -32 Q 0 -33 -9 -32 Z"
            fill={trim}
          />
          {/* left strand */}
          <path
            d="M -11 -25 Q -13 -14 -9 -6 L -7 -7 Q -9 -14 -7 -25 Z"
            fill={trim}
          />
          {/* right strand */}
          <path
            d="M 11 -25 Q 13 -14 9 -6 L 7 -7 Q 9 -14 7 -25 Z"
            fill={trim}
          />
        </g>
      );
    case 'bowl':
      // Classic bowl cut — sides come down past the ears, low even bangs.
      return (
        <path
          d="M -12 -22 Q -13 -42 0 -42 Q 13 -42 12 -22
             L 11 -32 Q 7 -34 0 -33 Q -7 -34 -11 -32 Z"
          fill={trim}
        />
      );
  }
}

/* --------------------------------------------------------------------- */
/* Zones                                                                 */
/* --------------------------------------------------------------------- */

export type ZoneId = 'focus' | 'quiet' | 'reading' | 'couch' | 'help';

interface Zone {
  id: ZoneId;
  label: string;
  /** Status the user takes on when they sit at this zone. */
  status: FriendStatus;
  /** Where the label sits, in viewBox coords. */
  labelAt: { x: number; y: number };
  /** Seats in viewBox coords. Friends fill from index 0 in id-sort order. */
  slots: { x: number; y: number }[];
}

const ZONES: Record<ZoneId, Zone> = {
  focus: {
    id: 'focus',
    label: 'Focus Table',
    status: 'focusing',
    labelAt: { x: 200, y: 232 },
    slots: [
      { x: 135, y: 110 }, // back-left
      { x: 200, y: 100 }, // back-center (under the bell)
      { x: 265, y: 110 }, // back-right
      { x: 145, y: 178 }, // front-left
      { x: 255, y: 178 }, // front-right
    ],
  },
  quiet: {
    id: 'quiet',
    label: 'Quiet Desk',
    status: 'focusing',
    labelAt: { x: 350, y: 95 },
    slots: [{ x: 350, y: 75 }],
  },
  reading: {
    id: 'reading',
    label: 'Reading Nook',
    status: 'focusing',
    labelAt: { x: 50, y: 95 },
    slots: [{ x: 50, y: 75 }],
  },
  couch: {
    id: 'couch',
    label: 'Snack Couch',
    status: 'on_break',
    labelAt: { x: 320, y: 268 },
    slots: [
      { x: 295, y: 248 },
      { x: 348, y: 248 },
    ],
  },
  help: {
    id: 'help',
    label: 'Help Desk',
    status: 'needs_help',
    labelAt: { x: 50, y: 268 },
    slots: [{ x: 50, y: 248 }],
  },
};

const ZONES_LIST = Object.values(ZONES);

/** Friends always sit at the *together* table when focusing — they
 *  never claim the user-only Quiet Desk or Reading Nook. */
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

/** Find which zone a viewBox-coord seat belongs to (by exact slot match). */
function zoneIdForSeat(seat: { x: number; y: number }): ZoneId | null {
  for (const z of ZONES_LIST) {
    if (z.slots.some((s) => slotsEqual(s, seat))) return z.id;
  }
  return null;
}

/** Bell geometry, all in viewBox units. */
const BELL = {
  cx: 200,
  stringTop: 0,
  stringRest: 28,
  scale: 0.7,
  // hit-area placement (in pendant-local coords, before the spring offset)
  hitOffsetY: 14,
  hitR: 16,
  // pull thresholds
  triggerPx: 64,
  maxOffset: 22,
};

/* --------------------------------------------------------------------- */
/* Public API                                                            */
/* --------------------------------------------------------------------- */

interface RoomSceneProps {
  /** Compact = small, no zones, no bell. Used by FocusSession. */
  compact?: boolean;
  /** Hide the user's character. */
  hideMe?: boolean;
  /** Tap a friend's seat → wave at them. */
  onWaveFriend?: (id: string) => void;
  /** Tap an empty seat OR pull the bell → user wants to sit somewhere.
   *  Parent decides what the status / navigation consequences are. */
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

/* --------------------------------------------------------------------- */
/* Compact layout — single round table, fixed seats, no bell             */
/* --------------------------------------------------------------------- */

interface SceneSubProps {
  mySelf: Friend;
  friends: Friend[];
  hideMe?: boolean;
  onWaveFriend?: (id: string) => void;
  reactingPulse: ReactingPulse;
  className?: string;
}

function CompactScene({
  mySelf,
  friends,
  hideMe,
  onWaveFriend,
  reactingPulse,
  className,
}: SceneSubProps) {
  const seats = hideMe ? friends : [...friends, mySelf];
  return (
    <svg
      viewBox={`0 0 ${VB_W} 180`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Friends at the focus table"
    >
      <RoomTable cx={VB_W / 2} cy={180 * 0.62} rx={VB_W * 0.34} ry={22} />
      {seats
        .slice()
        .sort((a, b) => a.seat.y - b.seat.y)
        .map((f) => {
          const isMe = f.id === 'me';
          const isActor = reactingPulse?.fromId === f.id;
          const isObserver = reactingPulse !== null && !isActor;
          return (
            <Character
              key={f.id}
              friend={f}
              cx={f.seat.x * VB_W}
              cy={f.seat.y * 180}
              size={0.78}
              showName={false}
              showWave={!isMe}
              clickable={!!onWaveFriend && !isMe}
              onClick={onWaveFriend && !isMe ? () => onWaveFriend(f.id) : undefined}
              reaction={
                isActor
                  ? reactingPulse!.kind === 'pull'
                    ? 'bow'
                    : reactingPulse!.kind === 'finish'
                    ? 'cheer'
                    : reactingPulse!.kind === 'wave'
                    ? 'wave'
                    : reactingPulse!.kind === 'help'
                    ? 'hand'
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
/* Full layout — five zones + bell + tappable seats                      */
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

  /* Friend → slot assignment, skipping the user's slot. */
  const friendSlot = new Map<string, { x: number; y: number }>();
  for (const zone of ZONES_LIST) {
    const inZone = friends
      .filter((f) => zoneIdForFriendStatus(f.status) === zone.id)
      .sort((a, b) => a.id.localeCompare(b.id));
    let slotIdx = 0;
    for (const f of inZone) {
      while (
        slotIdx < zone.slots.length &&
        userZoneId === zone.id &&
        userSeatPx &&
        slotsEqual(zone.slots[slotIdx], userSeatPx)
      ) {
        slotIdx++;
      }
      if (slotIdx >= zone.slots.length) break;
      friendSlot.set(f.id, zone.slots[slotIdx]);
      slotIdx++;
    }
  }

  /* Empty slots = zone slots not assigned to a friend AND not the user's. */
  const emptySlots: { zone: Zone; slot: { x: number; y: number } }[] = [];
  for (const zone of ZONES_LIST) {
    for (const slot of zone.slots) {
      const takenByFriend = Array.from(friendSlot.values()).some((s) => slotsEqual(s, slot));
      const takenByUser = userZoneId === zone.id && userSeatPx && slotsEqual(slot, userSeatPx);
      if (!takenByFriend && !takenByUser) emptySlots.push({ zone, slot });
    }
  }

  /* --- Bell pull engine -------------------------------------------- */
  const stringRef  = useRef<SVGLineElement>(null);
  const pendantRef = useRef<SVGGElement>(null);
  const bellHitRef = useRef<SVGCircleElement>(null);

  const onSitAtRef = useRef(onSitAt);
  onSitAtRef.current = onSitAt;

  useEffect(() => {
    const hit = bellHitRef.current;
    if (!hit) return;
    let isDragging = false;
    let startY = 0;
    let pull = 0;
    let animFrame = 0;
    let settled = 0;
    let velocity = 0;

    const apply = (offset: number) => {
      const pendant = pendantRef.current;
      const line    = stringRef.current;
      if (!pendant || !line) return;
      pendant.setAttribute('transform', `translate(0, ${offset})`);
      line.setAttribute('y2', String(BELL.stringRest + offset));
    };
    const spring = () => {
      velocity = (velocity + (0 - settled) * 0.18) * 0.78;
      settled += velocity;
      apply(settled);
      if (Math.abs(velocity) < 0.3 && Math.abs(settled) < 0.3) {
        settled = 0;
        apply(0);
        animFrame = 0;
      } else {
        animFrame = requestAnimationFrame(spring);
      }
    };
    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
      document.body.classList.add('pull-active');
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      pull = Math.max(0, clientY - startY);
      const offset = BELL.maxOffset * (1 - Math.exp(-pull / BELL.triggerPx));
      settled = offset;
      apply(offset);
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');
      if (pull >= BELL.triggerPx) {
        // Bell pull → user sits at front-center of the focus table.
        // Front-center is index 1 in ZONES.focus.slots (back-center).
        // Pick the *front* one — closer to viewer, more "I'm sitting down"
        // feeling. That's slot index 4 (front-right) or 3 (front-left).
        // Use the table's center-front slot: the bell isn't tied to any
        // particular friend slot, but for consistency we pick back-center
        // since the bell hangs there.
        onSitAtRef.current?.('focus', ZONES.focus.slots[1]);
      } else {
        velocity = 0;
        animFrame = requestAnimationFrame(spring);
      }
      pull = 0;
    };

    hit.addEventListener('mousedown',  onStart as EventListener, { passive: false });
    hit.addEventListener('touchstart', onStart as EventListener, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup',   onEnd);
    window.addEventListener('touchend',  onEnd);
    return () => {
      hit.removeEventListener('mousedown',  onStart as EventListener);
      hit.removeEventListener('touchstart', onStart as EventListener);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onEnd);
      window.removeEventListener('touchend',  onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
      document.body.classList.remove('pull-active');
    };
  }, []);

  /* --- Render order matters: floor → zones → bell → empty seats →
        characters → reactions. We sort characters by Y so closer ones
        sit in front. */
  const renderableSeats: Array<{ friend: Friend; pos: { x: number; y: number } }> = [];
  for (const f of friends) {
    const slot = friendSlot.get(f.id);
    if (slot) renderableSeats.push({ friend: f, pos: slot });
  }
  if (!hideMe && userSeatPx) renderableSeats.push({ friend: mySelf, pos: userSeatPx });
  renderableSeats.sort((a, b) => a.pos.y - b.pos.y);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Shared study room with seating zones"
    >
      {/* Soft floor band underneath the focus table */}
      <ellipse cx={VB_W / 2} cy={VB_H * 0.92} rx={VB_W * 0.46} ry={12} fill="#e9dfca" opacity="0.55" />

      {/* Zone decorations + labels */}
      <FocusTableDecor />
      <QuietDeskDecor />
      <ReadingNookDecor />
      <SnackCouchDecor />
      <HelpDeskDecor />
      {ZONES_LIST.map((z) => (
        <text
          key={z.id}
          x={z.labelAt.x}
          y={z.labelAt.y}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.3"
          fill="#8a7a64"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {z.label}
        </text>
      ))}

      {/* Bell — string + pendant inside the SVG so they scale together. */}
      <g pointerEvents="auto">
        <line
          ref={stringRef}
          x1={BELL.cx}
          y1={BELL.stringTop}
          x2={BELL.cx}
          y2={BELL.stringRest}
          stroke="#7a8078"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <g ref={pendantRef}>
          <g transform={`translate(${BELL.cx}, ${BELL.stringRest})`}>
            <BellGroup scale={BELL.scale} shadow={false} />
          </g>
        </g>
        {/* Hit area — transparent fill catches drag events. The cursor
            inline-style has to live on the element since SVG ignores
            stylesheet `cursor` cleanly across browsers. */}
        <circle
          ref={bellHitRef}
          cx={BELL.cx}
          cy={BELL.stringRest + BELL.hitOffsetY}
          r={BELL.hitR}
          fill="transparent"
          style={{ cursor: 'grab', touchAction: 'none' }}
        />
      </g>

      {/* Empty seats — tappable */}
      {emptySlots.map(({ zone, slot }) => (
        <EmptySeat
          key={`${zone.id}-${slot.x}-${slot.y}`}
          cx={slot.x}
          cy={slot.y}
          onClick={() => onSitAt?.(zone.id, slot)}
        />
      ))}

      {/* Characters (friends + you), sorted by Y */}
      {renderableSeats.map(({ friend, pos }) => {
        const isMe = friend.id === 'me';
        const isActor = reactingPulse?.fromId === friend.id;
        const isObserver = reactingPulse !== null && !isActor;
        return (
          <Character
            key={friend.id}
            friend={friend}
            cx={pos.x}
            cy={pos.y}
            size={1}
            showName={!isMe}
            showWave={!isMe}
            clickable={!!onWaveFriend && !isMe}
            onClick={onWaveFriend && !isMe ? () => onWaveFriend(friend.id) : undefined}
            reaction={
              isActor
                ? reactingPulse!.kind === 'pull'
                  ? 'bow'
                  : reactingPulse!.kind === 'finish'
                  ? 'cheer'
                  : reactingPulse!.kind === 'wave'
                  ? 'wave'
                  : reactingPulse!.kind === 'help'
                  ? 'hand'
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
/* Zone decorations — flat SVG shapes per zone                           */
/* --------------------------------------------------------------------- */

function FocusTableDecor() {
  const cx = 200;
  const cy = 145;
  const rx = 80;
  const ry = 28;
  return (
    <g>
      {/* Shadow under table */}
      <ellipse cx={cx} cy={cy + 5} rx={rx} ry={ry} fill="#000" opacity="0.06" />
      {/* Table top */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#e6c69a" />
      <ellipse cx={cx} cy={cy - 2} rx={rx - 8} ry={ry - 6} fill="#f1d7af" />
      {/* A book stack + a mug, suggesting a shared workspace */}
      <rect x={cx - 14} y={cy - 6} width={26} height={5} rx={1} fill="#a98660" opacity="0.55" />
      <rect x={cx - 12} y={cy - 11} width={22} height={5} rx={1} fill="#c4a878" opacity="0.55" />
      <circle cx={cx + 24} cy={cy - 1} r={3.2} fill="#fff8ee" stroke="#c8a878" strokeWidth="0.6" />
      <path d="M 224.5 -1 q 2 0 2 2" transform={`translate(0, ${cy})`} stroke="#c8a878" strokeWidth="0.6" fill="none" />
    </g>
  );
}

function QuietDeskDecor() {
  // Top-right small desk
  return (
    <g>
      {/* Desk top */}
      <rect x={325} y={70} width={50} height={8} rx={2} fill="#d9b48a" />
      <rect x={325} y={70} width={50} height={2} rx={1} fill="#a17c4c" />
      {/* Legs */}
      <line x1={329} y1={78} x2={329} y2={84} stroke="#a17c4c" strokeWidth="1.4" />
      <line x1={371} y1={78} x2={371} y2={84} stroke="#a17c4c" strokeWidth="1.4" />
      {/* A neat little book + headphones suggestion */}
      <rect x={336} y={64} width={14} height={6} rx={1} fill="#7ed4ae" />
      <rect x={355} y={64} width={10} height={6} rx={1} fill="#aee1f9" />
      <path d="M 332 60 Q 332 56 336 56 Q 340 56 340 60" stroke="#3a3c38" strokeWidth="1" fill="none" strokeLinecap="round" />
    </g>
  );
}

function ReadingNookDecor() {
  // Top-left armchair + lamp
  return (
    <g>
      {/* Armchair body */}
      <path
        d="M 28 88 L 28 60 Q 28 50 38 50 L 62 50 Q 72 50 72 60 L 72 88 Z"
        fill="#b6a4f5"
      />
      {/* Cushion */}
      <rect x={32} y={62} width={36} height={20} rx={6} fill="#d6c8ff" />
      {/* Lamp stand */}
      <line x1={20} y1={88} x2={20} y2={58} stroke="#a98660" strokeWidth="1.2" />
      <ellipse cx={20} cy={88} rx={5} ry={1.5} fill="#a98660" />
      {/* Lampshade */}
      <path d="M 12 58 L 28 58 L 24 48 L 16 48 Z" fill="#ffe07a" stroke="#c79f3a" strokeWidth="0.6" />
      {/* Soft glow circle around lamp */}
      <circle cx={20} cy={55} r={9} fill="#ffe07a" opacity="0.18" />
    </g>
  );
}

function SnackCouchDecor() {
  // Bottom-right couch
  const baseY = 252;
  return (
    <g>
      {/* Floor shadow */}
      <ellipse cx={320} cy={baseY + 14} rx={66} ry={4} fill="#000" opacity="0.06" />
      {/* Couch seat */}
      <rect x={262} y={baseY} width={116} height={14} rx={6} fill="#ff9aa2" />
      {/* Couch back */}
      <rect x={262} y={baseY - 14} width={116} height={18} rx={6} fill="#ff9aa2" />
      {/* Cushion bumps */}
      <rect x={268} y={baseY - 10} width={32} height={10} rx={3} fill="#ffb8be" />
      <rect x={304} y={baseY - 10} width={32} height={10} rx={3} fill="#ffb8be" />
      <rect x={340} y={baseY - 10} width={32} height={10} rx={3} fill="#ffb8be" />
      {/* Plate of cookies on the side */}
      <ellipse cx={262} cy={baseY + 8} rx={8} ry={2.5} fill="#fff8ee" stroke="#c8a878" strokeWidth="0.5" />
      <circle cx={258} cy={baseY + 5} r={2.5} fill="#c4a070" />
      <circle cx={266} cy={baseY + 6} r={2}   fill="#c4a070" />
    </g>
  );
}

function HelpDeskDecor() {
  // Bottom-left small desk with "?" sign
  const top = 252;
  return (
    <g>
      {/* Desk */}
      <rect x={25} y={top} width={50} height={8} rx={2} fill="#d9b48a" />
      <rect x={25} y={top} width={50} height={2} rx={1} fill="#a17c4c" />
      {/* Legs */}
      <line x1={29} y1={top + 8} x2={29} y2={top + 14} stroke="#a17c4c" strokeWidth="1.4" />
      <line x1={71} y1={top + 8} x2={71} y2={top + 14} stroke="#a17c4c" strokeWidth="1.4" />
      {/* "?" sign on a small post */}
      <line x1={70} y1={top - 2} x2={70} y2={top - 16} stroke="#a17c4c" strokeWidth="1.2" />
      <rect x={64} y={top - 24} width={14} height={10} rx={2} fill="#ffe07a" stroke="#c79f3a" strokeWidth="0.6" />
      <text x={71} y={top - 16} textAnchor="middle" fontSize="9" fontWeight="900" fill="#c46a4d">?</text>
      {/* Sticky notes on the desk */}
      <rect x={32} y={top - 5} width={6} height={6} rx={1} fill="#aee1f9" />
      <rect x={42} y={top - 5} width={6} height={6} rx={1} fill="#ff9aa2" />
    </g>
  );
}

/* --------------------------------------------------------------------- */
/* EmptySeat — dashed circle with idle pulse, tappable                   */
/* --------------------------------------------------------------------- */

function EmptySeat({ cx, cy, onClick }: { cx: number; cy: number; onClick?: () => void }) {
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Generous transparent hit area */}
      <circle cx={cx} cy={cy} r={18} fill="transparent" />
      {/* Visual: dashed pulsing ring */}
      <circle
        cx={cx}
        cy={cy - 4}
        r={11}
        fill="none"
        stroke="#a98660"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
        opacity="0.55"
      >
        <animate
          attributeName="opacity"
          values="0.25;0.7;0.25"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Tiny "+" hint inside */}
      <text
        x={cx}
        y={cy - 1}
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="800"
        fill="#a98660"
        opacity="0.7"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        sit
      </text>
    </g>
  );
}

/* --------------------------------------------------------------------- */
/* Shared: round table for the compact layout                            */
/* --------------------------------------------------------------------- */

function RoomTable({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + 4} rx={rx} ry={ry} fill="#000" opacity="0.06" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#e6c69a" />
      <ellipse cx={cx} cy={cy - 2} rx={rx - 8} ry={ry - 6} fill="#f1d7af" />
      <rect x={cx - 12} y={cy - 6} width={24} height={10} rx={2} fill="#a98660" opacity="0.55" />
      <circle cx={cx + rx * 0.4} cy={cy - 2} r={4} fill="#fff8ee" stroke="#c8a878" strokeWidth="0.8" />
    </g>
  );
}

/* --------------------------------------------------------------------- */
/* Character — body + head + eyes + status accessory + reactions         */
/* --------------------------------------------------------------------- */

type Reaction = 'idle' | 'look-up' | 'bow' | 'cheer' | 'wave' | 'hand';

interface CharacterProps {
  friend: Friend;
  cx: number;
  cy: number;
  size?: number;
  showName?: boolean;
  showWave?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  reaction?: Reaction;
}

function Character({
  friend,
  cx,
  cy,
  size = 1,
  showName = true,
  showWave = true,
  clickable = false,
  onClick,
  reaction = 'idle',
}: CharacterProps) {
  const palette = PALETTE[friend.id] ?? PALETTE.f1;
  const isOffline = friend.status === 'offline';

  const bobDur = 3 + (friend.id.length % 3) * 0.6;

  const reactionTransform =
    reaction === 'bow'      ? 'translate(0, 4) rotate(8)' :
    reaction === 'cheer'    ? 'translate(0, -3)' :
    reaction === 'look-up'  ? 'translate(0, -2)' :
    reaction === 'wave'     ? 'translate(0, -1)' :
    reaction === 'hand'     ? 'translate(0, -2)' :
    'translate(0, 0)';

  const eyeShape: 'dot' | 'closed' | 'happy' | 'wide' =
    isOffline                            ? 'closed'
    : reaction === 'cheer'               ? 'happy'
    : reaction === 'look-up'             ? 'wide'
    : friend.status === 'on_break'       ? 'closed'
    : friend.status === 'finished'       ? 'happy'
    : 'dot';

  return (
    <g
      transform={`translate(${cx}, ${cy}) scale(${size})`}
      style={{ cursor: clickable ? 'pointer' : 'default', opacity: isOffline ? 0.55 : 1 }}
      onClick={onClick}
    >
      <rect x={-18} y={-32} width={36} height={32} rx={10} fill="#caa377" opacity="0.6" />
      <g transform={reactionTransform} style={{ transition: 'transform 0.35s cubic-bezier(0.5, 1.6, 0.5, 1)' }}>
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-1.6; 0,0"
            dur={`${bobDur}s`}
            repeatCount="indefinite"
            additive="sum"
          />
          <path
            d="M -16 0 Q -16 -22 0 -22 Q 16 -22 16 0 L 14 8 L -14 8 Z"
            fill={palette.body}
          />
          <path
            d="M -12 -4 Q 0 4 12 -4"
            fill="none"
            stroke={palette.trim}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx={0} cy={-30} r={11} fill="#f7d6b1" />
          <Hair
            style={HAIR_STYLE_BY_ID[friend.id] ?? 'short'}
            trim={palette.trim}
          />
          {eyeShape === 'dot' && (
            <>
              <circle cx={-3.5} cy={-30} r={1.2} fill="#2c2a26" />
              <circle cx={3.5}  cy={-30} r={1.2} fill="#2c2a26" />
            </>
          )}
          {eyeShape === 'closed' && (
            <>
              <path d="M -5 -30 Q -3.5 -28.5 -2 -30" stroke="#2c2a26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M 2 -30 Q 3.5 -28.5 5 -30"   stroke="#2c2a26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </>
          )}
          {eyeShape === 'happy' && (
            <>
              <path d="M -5 -31 Q -3.5 -29 -2 -31" stroke="#2c2a26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M 2 -31 Q 3.5 -29 5 -31"   stroke="#2c2a26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </>
          )}
          {eyeShape === 'wide' && (
            <>
              <circle cx={-3.5} cy={-30} r={1.7} fill="#2c2a26" />
              <circle cx={3.5}  cy={-30} r={1.7} fill="#2c2a26" />
            </>
          )}
          {(friend.status === 'finished' || reaction === 'cheer') && (
            <path d="M -3 -25 Q 0 -22 3 -25" stroke="#2c2a26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          )}
        </g>
      </g>
      <text
        x={14}
        y={-30}
        fontSize="14"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {STATUS_GLYPH[friend.status]}
      </text>
      {showWave && friend.waving && (
        <g transform="translate(-18, -42)">
          <circle r={9} fill="#ffe07a" stroke="#c79f3a" strokeWidth="1" />
          <text fontSize="11" textAnchor="middle" dominantBaseline="middle" y={1}>👋</text>
          <animate attributeName="opacity" from="0" to="1" dur="0.25s" fill="freeze" />
        </g>
      )}
      {reaction === 'cheer' && (
        <g transform="translate(0, -50)" style={{ pointerEvents: 'none' }}>
          <text fontSize="14" textAnchor="middle">✨</text>
          <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
        </g>
      )}
      {reaction === 'wave' && (
        <g transform="translate(0, -52)" style={{ pointerEvents: 'none' }}>
          <text fontSize="14" textAnchor="middle">👋</text>
          <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
        </g>
      )}
      {reaction === 'hand' && (
        <g transform="translate(0, -52)" style={{ pointerEvents: 'none' }}>
          <text fontSize="14" textAnchor="middle">🙋</text>
          <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
        </g>
      )}
      {showName && (
        <text
          x={0}
          y={20}
          fontSize="9.5"
          fontWeight="700"
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
