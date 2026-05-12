import React, { useEffect, useRef, useState } from 'react';
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
  reading: buildZone('reading', 'Reading Corner', 'focusing',   3, [0],        0),
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

/* ══════════════════════════════════════════════════════════════
 * Room-drawing geometry
 * ══════════════════════════════════════════════════════════════ */
const RVW = 390;
const RVH = 310;

const RFL = { x:   0, y: 265 };   // floor front-left
const RFR = { x: 390, y: 265 };   // floor front-right
const RBL = { x:  44, y: 107 };   // floor back-left
const RBR = { x: 346, y: 107 };   // floor back-right

/** Project (xRatio 0→1, depth 0=front→1=back) to SVG screen coords. */
function rp(xRatio: number, depth: number) {
  const y  = RFL.y + (RBL.y - RFL.y) * depth;
  const lx = RFL.x + (RBL.x - RFL.x) * depth;
  const rx = RFR.x + (RBR.x - RFR.x) * depth;
  return { x: lx + (rx - lx) * xRatio, y, s: 1 - 0.26 * depth };
}

/** Zone world positions: [xRatio 0..1, depth 0=front..1=back]. */
const ZW: Record<ZoneId, readonly [number, number]> = {
  quiet:   [0.19, 0.86],
  reading: [0.80, 0.80],
  focus:   [0.50, 0.52],
  help:    [0.22, 0.28],
  couch:   [0.73, 0.22],
};

/** Render order: back → front (painter's algorithm). */
const ZONE_DRAW_ORDER: ZoneId[] = ['quiet', 'reading', 'focus', 'help', 'couch'];

function FullScene({
  mySelf,
  friends,
  hideMe,
  onWaveFriend,
  onSitAt,
  onPullBell: _onPullBell,
  onProfileFriend,
  reactingPulse: _reactingPulse,
  className,
  isDark = false,
}: FullSceneProps) {
  const ink      = isDark ? 'rgba(255,255,255,0.82)' : 'rgba(38,36,32,1)';
  const inkSub   = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(58,60,56,0.50)';
  const panelBg  = isDark ? 'rgba(26,22,18,0.97)' : 'rgba(255,252,248,0.97)';
  const panelBdr = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(58,60,56,0.10)';
  const iconBg   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(58,60,56,0.05)';

  /* ── selected zone ── */
  const [activeZoneId, setActiveZoneId] = useState<ZoneId>('focus');

  /* ── custom-zone state ── */
  const [extraZoneLabels, setExtraZoneLabels] = useState<string[]>([]);
  const [addDraft, setAddDraft] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

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

  /* Focus the add-zone input whenever it becomes visible */
  useEffect(() => {
    if (isAddingZone) {
      const t = setTimeout(() => addInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isAddingZone]);

  const confirmAddZone = () => {
    const name = addDraft.trim();
    if (!name) { setIsAddingZone(false); setAddDraft(''); return; }
    setExtraZoneLabels(prev => [...prev, name]);
    setAddDraft('');
    setIsAddingZone(false);
  };

  /* Group friends by zone for room rendering */
  const friendsByZone: Record<ZoneId, Friend[]> = {
    quiet: [], reading: [], focus: [], help: [], couch: [],
  };
  for (const f of friends) {
    const slot = friendSlot.get(f.id);
    if (!slot) continue;
    const zid = zoneIdForSeat(slot);
    if (zid) friendsByZone[zid].push(f);
  }

  const onSitAtRef = useRef(onSitAt);
  onSitAtRef.current = onSitAt;

  const activeZone    = ZONES[activeZoneId];
  const activeFriends = friendsByZone[activeZoneId];
  const activeEmpty   = emptySlots.filter(e => e.zone.id === activeZoneId);
  const isMeInActive  = userZoneId === activeZoneId && !hideMe;

  const handleSit = () => {
    if (activeEmpty.length > 0) {
      onSitAtRef.current?.(activeZoneId, activeEmpty[0].slot);
    } else {
      onSitAtRef.current?.(activeZoneId, activeZone.slots[activeZone.slots.length - 1]);
    }
  };

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {/* ── Drawn room ── */}
      <svg
        viewBox={`0 0 ${RVW} ${RVH}`}
        style={{ flex: 1, width: '100%', minHeight: 0, display: 'block' }}
        preserveAspectRatio="xMidYMin meet"
      >
        <RoomBackground isDark={isDark} />

        {ZONE_DRAW_ORDER.map(zid => {
          const [xRatio, depth] = ZW[zid];
          const { x, y, s }    = rp(xRatio, depth);
          const isActive        = activeZoneId === zid;
          const zoneFriends     = friendsByZone[zid];
          const furnitureScale  = isActive ? s * 1.10 : s;

          return (
            <g
              key={zid}
              onClick={() => setActiveZoneId(zid)}
              style={{
                cursor: 'pointer',
                opacity: isActive ? 1 : 0.38,
                transition: 'opacity 0.25s',
              }}
            >
              {/* Invisible hit target */}
              <ellipse cx={x} cy={y} rx={88 * s} ry={44 * s} fill="transparent" />

              {/* ── Spotlight pool (outer + inner) ── */}
              {isActive && (
                <>
                  {/* Wide soft halo */}
                  <ellipse
                    cx={x} cy={y + 12 * s}
                    rx={96 * s} ry={34 * s}
                    fill={isDark ? 'rgba(255,210,80,0.22)' : 'rgba(255,190,30,0.30)'}
                  />
                  {/* Bright inner pool */}
                  <ellipse
                    cx={x} cy={y + 8 * s}
                    rx={58 * s} ry={20 * s}
                    fill={isDark ? 'rgba(255,220,90,0.40)' : 'rgba(255,200,40,0.48)'}
                  />
                  {/* Sharp centre highlight */}
                  <ellipse
                    cx={x} cy={y + 6 * s}
                    rx={28 * s} ry={9 * s}
                    fill={isDark ? 'rgba(255,240,140,0.55)' : 'rgba(255,220,60,0.62)'}
                  />
                </>
              )}

              {/* Furniture — scaled up when active */}
              <g transform={`translate(${x},${y}) scale(${furnitureScale})`}>
                <FurnitureSVG zoneId={zid} isDark={isDark} />
              </g>

              {/* Friend avatars above furniture */}
              {zoneFriends.map((f, fi) => {
                const xOff = (fi - (zoneFriends.length - 1) / 2) * 34;
                const fs   = s * 1.5;
                return (
                  <g
                    key={f.id}
                    transform={`translate(${x + xOff * s}, ${y - 58 * s})`}
                    onClick={e => { e.stopPropagation(); onProfileFriend?.(f); onWaveFriend?.(f.id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle r={11 * fs} fill={PALETTE[f.id] ?? '#d6c8ff'} />
                    <text
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={12 * fs}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{f.emoji}</text>
                    <text
                      x={12 * fs} y={-12 * fs}
                      fontSize={9 * fs}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{STATUS_GLYPH[f.status]}</text>
                  </g>
                );
              })}

              {/* My avatar */}
              {isMeInActive && isActive && (
                <g transform={`translate(${x + activeFriends.length * 34 * s}, ${y - 58 * s})`}>
                  <circle r={11 * s * 1.5} fill={PALETTE.me} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={12 * s * 1.5}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>{mySelf.emoji}</text>
                </g>
              )}

              {/* Zone label */}
              <text
                x={x} y={y + 32 * s}
                textAnchor="middle"
                fontSize={isActive ? 10 * s : 8 * s}
                fontWeight={isActive ? 800 : 700}
                fill={isActive ? ink : inkSub}
                letterSpacing="0.07em"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {ZONES[zid].label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Zone info panel ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 16px 18px',
        background: panelBg,
        borderTop: `1px solid ${panelBdr}`,
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Zone icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="44" height="44" viewBox="-20 -20 40 40" overflow="visible">
              <ZoneIcon id={activeZoneId} cx={0} cy={0} opacity={1} />
            </svg>
          </div>

          {/* Zone info text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: ink, letterSpacing: '0.01em' }}>
              {activeZone.label}
            </div>
            <div style={{ fontSize: 12, color: inkSub, marginTop: 2 }}>
              {activeFriends.length > 0
                ? activeFriends.map(f => f.emoji).join(' ') +
                    (activeFriends.length === 1 ? ' is here' : ' are here')
                : isMeInActive
                ? 'You are here'
                : 'Open spot · be first'}
            </div>
          </div>

          {/* Sit button */}
          <button
            onClick={handleSit}
            style={{
              padding: '10px 20px', borderRadius: 18,
              border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(94,234,212,0.18)' : 'rgba(58,60,56,0.09)',
              fontSize: 13, fontWeight: 700, color: ink,
              letterSpacing: '0.02em', flexShrink: 0,
            }}
          >
            Sit here
          </button>
        </div>

        {/* Custom zone pills + add */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
          {extraZoneLabels.map((label, idx) => (
            <div key={idx} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, flexShrink: 0,
              background: iconBg, border: `1px solid ${panelBdr}`,
              fontSize: 11, fontWeight: 600, color: inkSub,
            }}>
              <span>✦</span>
              <span>{label}</span>
              <button
                onClick={() => setExtraZoneLabels(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: inkSub, fontSize: 13, lineHeight: 1 }}
              >×</button>
            </div>
          ))}
          {isAddingZone ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input
                ref={addInputRef}
                value={addDraft}
                onChange={e => setAddDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmAddZone();
                  if (e.key === 'Escape') { setIsAddingZone(false); setAddDraft(''); }
                }}
                placeholder="Name…"
                maxLength={20}
                style={{
                  width: 80, background: 'none', border: `1px solid ${panelBdr}`,
                  borderRadius: 12, padding: '4px 8px',
                  fontSize: 11, color: ink, outline: 'none',
                }}
              />
              <button
                onMouseDown={e => { e.preventDefault(); confirmAddZone(); }}
                style={{
                  background: iconBg, border: `1px solid ${panelBdr}`, borderRadius: 12,
                  padding: '4px 8px', fontSize: 11, fontWeight: 700, color: ink, cursor: 'pointer',
                }}
              >Add</button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingZone(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                padding: '4px 10px', borderRadius: 20, background: 'none',
                border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.20)' : 'rgba(58,60,56,0.18)'}`,
                fontSize: 11, fontWeight: 600, color: inkSub, cursor: 'pointer',
              }}
            >+ Add spot</button>
          )}
        </div>

      {/* ── (old picker removed) ── */}
      {null}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
 * RoomBackground — SVG walls, floor, window, decorations.
 * ══════════════════════════════════════════════════════════════ */
function RoomBackground({ isDark }: { isDark: boolean }) {
  const wallC  = isDark ? '#1c1914' : '#f5ecdc';
  const wallSC = isDark ? '#161210' : '#e6d8c2';
  const floorC = isDark ? '#221d14' : '#dfc49a';
  const plankL = isDark ? '#1a170f' : '#cdb27a';
  const moldC  = isDark ? '#2c2618' : '#d4c098';
  const winPane = isDark ? '#1a2c3a' : '#c4dcf0';
  const winFr   = isDark ? '#253848' : '#88b8d8';
  const plankXs = [0.13, 0.30, 0.50, 0.68, 0.86];
  const plankDs = [0.20, 0.42, 0.63, 0.82];
  return (
    <>
      <rect x="0" y="0" width={RVW} height={RBL.y} fill={wallC} />
      <polygon points={`0,0 ${RBL.x},${RBL.y} 0,${RFL.y}`} fill={wallSC} />
      <polygon points={`${RVW},0 ${RBR.x},${RBR.y} ${RVW},${RFL.y}`} fill={wallSC} />
      <polygon points={`${RBL.x},${RBL.y} ${RBR.x},${RBR.y} ${RFR.x},${RFL.y} ${RFL.x},${RFL.y}`} fill={floorC} />
      <rect x="0" y={RFL.y} width={RVW} height={RVH - RFL.y} fill={floorC} />
      {plankXs.map((xr, i) => {
        const back = rp(xr, 1);
        return <line key={`pl${i}`} x1={RFL.x + (RFR.x - RFL.x) * xr} y1={RFL.y} x2={back.x} y2={back.y} stroke={plankL} strokeWidth="0.7" opacity="0.55" />;
      })}
      {plankDs.map((d, i) => {
        const l = rp(0, d); const r = rp(1, d);
        return <line key={`pd${i}`} x1={l.x} y1={l.y} x2={r.x} y2={r.y} stroke={plankL} strokeWidth="0.6" opacity="0.38" />;
      })}
      <polygon points={`${RBL.x - 2},${RBL.y} ${RBR.x + 2},${RBR.y} ${RBR.x + 2},${RBR.y + 8} ${RBL.x - 2},${RBL.y + 8}`} fill={moldC} />
      <line x1={RBL.x} y1={RBL.y} x2={RBR.x} y2={RBR.y} stroke={plankL} strokeWidth="1.5" opacity="0.5" />
      <g transform="translate(195, 62)">
        {/* Windowsill */}
        <rect x="-27" y="10" width="54" height="5" rx="1" fill={moldC} />
        {/* Rounded-corner trapezoid pane (r=4 arcs at each corner) */}
        {(() => {
          // TL(-34,-24) TR(34,-24) BR(25,10) BL(-25,10), r=4
          // slant vector (-9,-34), magnitude≈35.17, unit≈(±0.256, ±0.967)
          const d = 'M -30,-24 L 30,-24 A 4,4 0 0,1 33.0,-20.1 L 26.0,6.1 A 4,4 0 0,1 21,10 L -21,10 A 4,4 0 0,1 -26.0,6.1 L -33.0,-20.1 A 4,4 0 0,1 -30,-24 Z';
          return (
            <>
              <path d={d} fill={winPane} />
              <path d={d} fill="none" stroke={winFr} strokeWidth="2" />
              <line x1="0" y1="-24" x2="0" y2="10" stroke={winFr} strokeWidth="1.2" />
              <line x1="-30" y1="-7" x2="30" y2="-7" stroke={winFr} strokeWidth="1.2" />
              <path d={d} fill="white" opacity={isDark ? 0.04 : 0.24} />
            </>
          );
        })()}
        {/* Light shaft */}
        <polygon points="-25,10 25,10 55,160 -55,160" fill={isDark ? 'rgba(255,240,180,0.03)' : 'rgba(255,245,200,0.13)'} style={{ pointerEvents: 'none' }} />
      </g>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
 * FurnitureSVG — per-zone furniture, centered at (0,0).
 * ══════════════════════════════════════════════════════════════ */
function FurnitureSVG({ zoneId, isDark }: { zoneId: ZoneId; isDark: boolean }) {
  switch (zoneId) {
    case 'quiet': {
      const dt = isDark ? '#6a4c28' : '#c4965e';
      const df = isDark ? '#4e3618' : '#9a7040';
      return (
        <>
          <rect x="-10" y="-38" width="20" height="12" rx="3.5" fill={isDark ? '#3a3028' : '#e2c88a'} />
          <rect x="-24" y="-12" width="48" height="20" rx="3" fill={dt} />
          <rect x="-24" y="8" width="48" height="7" rx="1.5" fill={df} />
          <rect x="-9" y="-26" width="18" height="13" rx="1.5" fill={isDark ? '#2e2e2e' : '#484848'} />
          <rect x="-7" y="-13" width="14" height="2" rx="0.5" fill={isDark ? '#4a4a4a' : '#686868'} />
          <rect x="-8" y="-25" width="16" height="11" rx="1" fill={isDark ? '#2e5a78' : '#b8dcf0'} opacity="0.65" />
          <path d="M -13 -4 q 0 -9 6.5 -9 q 6.5 0 6.5 9" stroke="#a98660" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <rect x="-15" y="-5" width="4" height="6" rx="1" fill="#a98660" />
          <rect x="11" y="-5" width="4" height="6" rx="1" fill="#a98660" />
          <rect x="16" y="-1" width="7" height="8" rx="1.5" fill={isDark ? '#4a3818' : '#a07840'} />
          <circle cx="19" cy="-6" r="5.5" fill={isDark ? '#2a5a30' : '#62a058'} />
          <circle cx="16" cy="-3" r="3" fill={isDark ? '#225028' : '#4e8845'} />
        </>
      );
    }
    case 'reading': {
      const cm = isDark ? '#4a3870' : '#d6c8ff';
      const cb = isDark ? '#3a2860' : '#c4aeff';
      return (
        <>
          <line x1="28" y1="-46" x2="28" y2="14" stroke={isDark ? '#7a6a40' : '#c0a050'} strokeWidth="2" />
          <path d="M 20 -46 Q 28 -58 36 -46" fill={isDark ? '#ffe07a' : '#ffe89a'} stroke={isDark ? '#c8a020' : '#c09020'} strokeWidth="1.2" />
          <ellipse cx="28" cy="-40" rx="13" ry="7" fill={isDark ? 'rgba(255,230,100,0.10)' : 'rgba(255,230,100,0.22)'} />
          <rect x="-22" y="-26" width="44" height="17" rx="5" fill={cb} />
          <rect x="-24" y="-18" width="7" height="20" rx="4" fill={cb} />
          <rect x="17" y="-18" width="7" height="20" rx="4" fill={cb} />
          <rect x="-22" y="-10" width="44" height="22" rx="5" fill={cm} />
          <line x1="-22" y1="1" x2="22" y2="1" stroke={cb} strokeWidth="0.9" opacity="0.5" />
          <g transform="translate(-14, -6) scale(0.65)">
            <path d="M -10 -4 q 5 -3 10 0 q 5 -3 10 0 L 10 5 q -5 3 -10 0 q -5 3 -10 0 Z" fill={isDark ? '#d8d0f0' : '#f8f4ff'} stroke="#8a78c5" strokeWidth="0.8" strokeLinejoin="round" />
            <line x1="0" y1="-4" x2="0" y2="5" stroke="#8a78c5" strokeWidth="0.8" />
          </g>
        </>
      );
    }
    case 'focus': {
      const tt = isDark ? '#264838' : '#c0e8cc';
      const tf = isDark ? '#1a3428' : '#92c0a0';
      return (
        <>
          {[-38, -14, 10, 34].map((xo, i) => (
            <rect key={`bc${i}`} x={xo - 8} y="-44" width="16" height="12" rx="3" fill={isDark ? '#382e24' : '#e2ca90'} />
          ))}
          <rect x="-54" y="-14" width="108" height="26" rx="4" fill={tt} />
          <rect x="-54" y="12" width="108" height="7" rx="2" fill={tf} />
          <rect x="-50" y="19" width="6" height="9" rx="1" fill={tf} />
          <rect x="44" y="19" width="6" height="9" rx="1" fill={tf} />
          <rect x="-30" y="-22" width="19" height="6" rx="1.2" fill="#aee1f9" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />
          <rect x="-28" y="-28" width="15" height="6" rx="1.2" fill="#7ed4ae" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />
          <rect x="-25" y="-34" width="11" height="6" rx="1.2" fill="#ffd56a" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />
          <rect x="20" y="-22" width="9" height="12" rx="2" fill={isDark ? '#5a4030' : '#d4a870'} />
          <line x1="22.5" y1="-22" x2="22" y2="-31" stroke="#444" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="25" y1="-22" x2="25.5" y2="-30" stroke="#c04040" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="27.5" y1="-22" x2="27.5" y2="-29" stroke="#40a040" strokeWidth="1.2" strokeLinecap="round" />
          {[-38, -14, 10, 34].map((xo, i) => (
            <rect key={`fc${i}`} x={xo - 8} y="30" width="16" height="12" rx="3" fill={isDark ? '#382e24' : '#e2ca90'} />
          ))}
        </>
      );
    }
    case 'help': {
      const ct = isDark ? '#4a420e' : '#fff068';
      const cf = isDark ? '#3a3208' : '#e4c830';
      return (
        <>
          <rect x="-8" y="-36" width="16" height="11" rx="3" fill={isDark ? '#3a2a18' : '#c8a050'} />
          <rect x="-27" y="-14" width="54" height="22" rx="3" fill={ct} />
          <rect x="-27" y="8" width="54" height="9" rx="2" fill={cf} />
          <rect x="-8" y="-30" width="16" height="18" rx="2.5" fill={isDark ? '#cc5500' : '#ff9040'} />
          <text x="0" y="-18" textAnchor="middle" fontSize="13" fontWeight={900} fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>?</text>
          <rect x="10" y="-12" width="12" height="9" rx="1.5" fill={isDark ? '#2a2a2a' : '#888'} />
          <rect x="11" y="-11" width="10" height="7" rx="0.5" fill={isDark ? '#3a6a9a' : '#a0c8f0'} opacity="0.8" />
          <rect x="-23" y="-10" width="18" height="7" rx="1" fill={isDark ? '#6a5a20' : '#fff4c0'} />
          <line x1="-21" y1="-7.5" x2="-9" y2="-7.5" stroke={isDark ? '#8a7a30' : '#d4b840'} strokeWidth="0.8" />
        </>
      );
    }
    case 'couch': {
      const sm = isDark ? '#5a2830' : '#ffb8be';
      const sb = isDark ? '#4a1e25' : '#ff9aa5';
      const tc = isDark ? '#4a3820' : '#d4a868';
      return (
        <>
          <rect x="-39" y="-23" width="78" height="15" rx="6" fill={sb} />
          <rect x="-41" y="-18" width="9" height="22" rx="5" fill={sb} />
          <rect x="32" y="-18" width="9" height="22" rx="5" fill={sb} />
          <rect x="-39" y="-10" width="78" height="24" rx="5" fill={sm} />
          <line x1="-1" y1="-10" x2="-1" y2="14" stroke={sb} strokeWidth="1.2" opacity="0.45" />
          <rect x="-23" y="20" width="46" height="13" rx="3" fill={tc} />
          <g transform="translate(-10, 24)">
            <path d="M -4 0 L -4 9 Q -4 11 -2 11 L 4 11 Q 6 11 6 9 L 6 0 Z" fill={isDark ? '#587888' : '#ffb8be'} stroke={isDark ? '#3a5868' : '#a85962'} strokeWidth="0.9" />
            <path d="M 6 2 Q 9.5 2 9.5 5 Q 9.5 8 6 8" fill="none" stroke={isDark ? '#3a5868' : '#a85962'} strokeWidth="0.9" />
            <path d="M -2 0 q 1 -2 0 -3.5" stroke={isDark ? '#8ab0b8' : '#a85962'} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.65" />
            <path d="M 2 0 q -1 -2 0 -3.5" stroke={isDark ? '#8ab0b8' : '#a85962'} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.65" />
          </g>
          <circle cx="12" cy="25" r="5" fill={isDark ? '#6a5030' : '#f4c878'} />
          <circle cx="10.5" cy="24" r="1.3" fill={isDark ? '#4a3820' : '#c87840'} opacity="0.7" />
          <circle cx="13" cy="26" r="1.3" fill={isDark ? '#4a3820' : '#c87840'} opacity="0.7" />
        </>
      );
    }
    default: return null;
  }
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
