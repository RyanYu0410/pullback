import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, SavedRoute } from '../context/AppContext';
import { Motion } from './Motion';
import { ChevronLeft, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* TreeAnchor — small silhouette kept for legacy onboarding screens.  */
/* (Used by Note.tsx; do not remove.)                                  */
/* ------------------------------------------------------------------ */
export function TreeAnchor({
  rope = false,
  className = '',
}: {
  rope?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 80 100" className={`h-16 w-16 text-emerald-500 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M40 90 L40 50" />
      <path d="M40 60 C 32 56, 26 50, 22 42" />
      <path d="M40 56 C 48 50, 56 46, 60 38" />
      <path d="M40 50 C 36 44, 36 38, 38 30" />
      <circle cx="22" cy="40" r="5" fill="#a8e6cf" />
      <circle cx="60" cy="36" r="5" fill="#ffb39b" />
      <circle cx="38" cy="28" r="5" fill="#ffe07a" />
      {rope && (
        <path
          d="M40 50 C 38 60, 42 70, 40 84"
          stroke="#ff7e9d"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* GARDEN — an orthographic 2D calendar laid out as an iso 3D floor.   */
/*                                                                     */
/* The garden shows the last 14 days as a 7×2 calendar grid drawn on   */
/* an axonometric floor (same ~30° projection as the Study Room).      */
/* Each cell is a soil tile; each tile holds a plant whose silhouette  */
/* encodes the day's activity:                                          */
/*   • empty plot — no session                                          */
/*   • sprout     — short session (< 15m)                               */
/*   • bud        — one focus session (15–30m)                          */
/*   • bloom      — one full session (30–55m)                           */
/*   • bouquet    — long or multiple sessions (55m+)                    */
/*   • tree       — many sessions / a regular day                       */
/*                                                                     */
/* Layout, back → front:                                                */
/*   row 1 (back)  — the older week (cells[0..6])                       */
/*   row 0 (front) — the current week (cells[7..13]; today on right)    */
/*                                                                     */
/* The whole scene lives inside one SVG: sky background, sky decor,     */
/* distant hills, the iso floor parallelogram with grid lines, and      */
/* each tile's plant + day-of-month label.                              */
/* ------------------------------------------------------------------ */

const DAYS_BACK = 42;   // 6 weeks per page — the calendar reads as a vertical lattice

type PlantKind = 'empty' | 'sprout' | 'bud' | 'bloom' | 'bouquet' | 'tree';

/** A normalized day-cell for the garden track. */
interface DayCell {
  /** YYYY-MM-DD */
  key: string;
  date: Date;
  isToday: boolean;
  /** Total minutes studied that day. */
  minutes: number;
  /** Number of saved sessions on this day. */
  sessions: number;
  /** Subjects studied. */
  subjects: string[];
  /** First-touched saved route (used for the detail card title). */
  primary?: SavedRoute;
  kind: PlantKind;
  /** Token color name for the plant's flowers. */
  tone: ToneName;
}

type ToneName = 'mint' | 'peach' | 'sun' | 'lavender' | 'sky' | 'coral' | 'leaf';

const TONE: Record<ToneName, { flower: string; flowerDeep: string; leaf: string }> = {
  mint:     { flower: '#a8e6cf', flowerDeep: '#7ed4ae', leaf: '#86c597' },
  peach:    { flower: '#ffb39b', flowerDeep: '#ff9a7a', leaf: '#9bb98a' },
  sun:      { flower: '#ffe07a', flowerDeep: '#ffc24a', leaf: '#9bb98a' },
  lavender: { flower: '#d6c8ff', flowerDeep: '#b6a4f5', leaf: '#9bb98a' },
  sky:      { flower: '#aee1f9', flowerDeep: '#8ec8e9', leaf: '#86c597' },
  coral:    { flower: '#ff9aa2', flowerDeep: '#ee7a86', leaf: '#9bb98a' },
  leaf:     { flower: '#cfeacd', flowerDeep: '#8edc9c', leaf: '#86c597' },
};

/* Subject-keyword → tone mapping. Stays inside the design palette. */
function toneForSubjects(subjects: string[]): ToneName {
  const text = subjects.join(' ').toLowerCase();
  if (/math|算/.test(text))                            return 'coral';
  if (/sci|物理|chem|生物|biology/.test(text))         return 'mint';
  if (/eng|english|write|essay|read|文学/.test(text)) return 'lavender';
  if (/art|draw|paint|music|乐/.test(text))            return 'sun';
  if (/hist|社会|geo|历史/.test(text))                 return 'leaf';
  return 'peach';
}

function plantKindFor(minutes: number, sessions: number): PlantKind {
  if (sessions === 0 && minutes === 0) return 'empty';
  if (sessions >= 3 || minutes >= 90)  return 'tree';
  if (minutes >= 55)                   return 'bouquet';
  if (minutes >= 30)                   return 'bloom';
  if (minutes >= 15)                   return 'bud';
  return 'sprout';
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fullDate(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

/* When the user has no saved routes yet, seed a quiet handful of past
   days so the garden never feels barren on first run. The numbers are
   deliberately small — a real user will quickly outgrow them. */
const SEED_DAYS: { offset: number; minutes: number; sessions: number; subjects: string[] }[] = [
  { offset: 12, minutes: 12, sessions: 1, subjects: ['Reading'] },
  { offset:  9, minutes: 35, sessions: 1, subjects: ['Math'] },
  { offset:  7, minutes: 22, sessions: 1, subjects: ['English'] },
  { offset:  5, minutes: 65, sessions: 2, subjects: ['Science', 'Math'] },
  { offset:  3, minutes: 40, sessions: 1, subjects: ['Art'] },
  { offset:  1, minutes: 95, sessions: 3, subjects: ['History', 'English'] },
];

/* ------------------------------------------------------------------ */
/* Tree — exported as the /garden route component.                     */
/* (Name is preserved so routes.tsx & navigation continue to work.)    */
/*                                                                     */
/* The garden is paginated as a 14-day calendar window. `pageIdx` = 0  */
/* shows the most recent 14 days (today on the right); -1 shows the    */
/* 14 days before that, and so on. Horizontal swipe / drag on the      */
/* floor changes the page, so the calendar slides like a real one.    */
/* ------------------------------------------------------------------ */
export function Tree() {
  const navigate = useNavigate();
  const { savedRoutes } = useAppContext();
  const [selected, setSelected] = useState<DayCell | null>(null);
  const [pageIdx, setPageIdx] = useState(0);

  // Page-specific 14-day window. Stats below stay all-time so they
  // don't appear to change as the user swipes.
  const cells     = useMemo(() => buildCellsForPage(savedRoutes, pageIdx), [savedRoutes, pageIdx]);
  const allCells  = useMemo(() => buildCellsForPage(savedRoutes, 0),       [savedRoutes]);

  const totalSessions = allCells.reduce((n, c) => n + c.sessions, 0);
  const streak        = computeStreak(allCells);

  const weeksInWindow = Math.round(DAYS_BACK / 7);
  const rangeLabel = pageIdx === 0
    ? `last ${weeksInWindow} weeks`
    : `${shortDate(cells[0].date)} – ${shortDate(cells[cells.length - 1].date)}`;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col bg-[#fff8ee]"
    >
      {/* HEADER — same shape as RoutineReview / Settings for visual rhyme. */}
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
            Garden
          </span>
          <h2 className="truncate text-[20px] font-bold leading-tight tracking-tight text-stone-800">
            Your study garden
          </h2>
        </div>
        <span className="h-8 w-8" aria-hidden />
      </div>

      {/* Micro-stats — restrained, tabular, mono-ish. Streak + blooms
         stay anchored to all-time counts; the rightmost slot doubles as
         a Today shortcut when the user has swiped to an older window. */}
      <div className="mt-1 flex items-center gap-3 px-5 text-[11px] font-medium text-stone-400">
        <span className="time-num">
          {streak > 0 ? `${streak}-day streak` : 'no streak yet'}
        </span>
        <span className="text-stone-300" aria-hidden>·</span>
        <span className="time-num">
          {totalSessions} {totalSessions === 1 ? 'bloom' : 'blooms'}
        </span>
        <span className="text-stone-300" aria-hidden>·</span>
        {pageIdx === 0 ? (
          <span className="time-num">{rangeLabel}</span>
        ) : (
          <button
            onClick={() => setPageIdx(0)}
            className="time-num soft-link inline-flex items-center gap-1 text-stone-500"
            aria-label="Jump back to today"
          >
            <span>{rangeLabel}</span>
            <span aria-hidden className="text-stone-300">›</span>
            <span className="uppercase tracking-[0.18em] text-[10px] font-semibold text-stone-600">
              Today
            </span>
          </button>
        )}
      </div>

      {/* GARDEN STAGE — sky + hills sit in a static SVG; the calendar
         floor lives in a draggable layer that swipes left/right to
         reveal older 14-day windows. */}
      <div className="relative mt-4 flex-1 overflow-hidden">
        <div className="garden-sky absolute inset-0" />

        {/* Static back layer: sky decor + hills, always in place. */}
        <svg
          viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
          preserveAspectRatio="xMidYMax meet"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <SkyDecor />
          <DistantHills />
        </svg>

        {/* Slidable foreground: the calendar floor. The motion.div hosts
           the framer-motion horizontal drag; dragConstraints snap the
           layer back to x=0 on release while onDragEnd advances pageIdx
           if the swipe was decisive enough. We deliberately persist the
           same motion.div across page changes (no `key`) so the drag
           gesture state isn't interrupted by remounts. */}
        <Motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          dragMomentum={false}
          onDragEnd={(_event, info) => {
            const SWIPE = 50;
            if (info.offset.x > SWIPE) setPageIdx((p) => p - 1);
            else if (info.offset.x < -SWIPE && pageIdx < 0) setPageIdx((p) => p + 1);
          }}
          className="absolute inset-0 touch-none"
          style={{ cursor: 'grab' }}
        >
          <svg
            viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
            preserveAspectRatio="xMidYMax meet"
            className="absolute inset-0 h-full w-full"
            aria-label={`Garden calendar, ${rangeLabel}.`}
          >
            <SceneDefs />
            <CalendarFloor
              cells={cells}
              selectedKey={selected?.key ?? null}
              onSelect={setSelected}
              pageIdx={pageIdx}
            />
          </svg>
        </Motion.div>
      </div>

      {/* DETAIL CARD — slides up from above the bottom nav when a plot is tapped. */}
      <DetailSheet cell={selected} onClose={() => setSelected(null)} />
    </Motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene geometry — one shared viewBox, one shared iso projection.    */
/* Matches the Study Room's ~30° axonometric angle so the two scenes  */
/* read as the same projected world.                                  */
/* ------------------------------------------------------------------ */
const SCENE_W   = 400;
const SCENE_H   = 600;

// The grid is "vertical long": 7 columns (one per day) × many rows (one
// per week). Each row sits up-and-slightly-right of the row below in
// iso projection, but the per-row horizontal shift (ROW_RUN) is small
// so the rows stack mostly vertically — the overall lattice reads as
// a tall calendar climbing into the iso distance.
const COLS      = 7;                 // one column per day chronologically
const ROWS      = 6;                 // 6 weeks per page (= DAYS_BACK / 7)
const TILE_W    = 34;                // tile width along the iso x-axis (viewBox units)
const ROW_RUN   = 10;                // small per-row x shift — keeps the grid tall, not wide
const ROW_RISE  = 46;                // generous per-row y rise — gives plants headroom

const FLOOR_W   = COLS * TILE_W;     // floor width along the front edge
const FLOOR_DEPTH_X = ROWS * ROW_RUN; // horizontal extent of the iso depth
const FLOOR_DEPTH_Y = ROWS * ROW_RISE; // vertical extent of the iso depth

// Center the parallelogram's visual span horizontally, then anchor it so
// the whole tall lattice sits centered in the scene's vertical axis.
const FLOOR_X0  = (SCENE_W - FLOOR_W - FLOOR_DEPTH_X) / 2;
const FLOOR_Y0  = SCENE_H / 2 + FLOOR_DEPTH_Y / 2;

/* Map an idx in `cells` (0 = oldest, DAYS_BACK - 1 = newest in window)
 * to a (col, row) on the calendar floor.
 *
 *   row 0          (front, closest)   = the current week
 *   row 1          (one step back)    = the previous week
 *   row ROWS - 1   (back, farthest)   = the oldest week in the window
 *
 *   col 0          = leftmost day in the row (oldest)
 *   col COLS - 1   = rightmost day in the row (newest)
 *
 * So idx = DAYS_BACK - 1 (today on page 0) lands at (col=COLS-1, row=0)
 * — the front-right corner of the lattice. idx = 0 (the oldest day in
 * the window) lands at (col=0, row=ROWS-1) — the back-left corner.
 */
function tileForIdx(idx: number): { col: number; row: number } {
  return {
    col: idx % COLS,
    row: ROWS - 1 - Math.floor(idx / COLS),
  };
}

/* Iso-project a floor-local (x, depth) into the scene's viewBox coords. */
function isoXY(x: number, depth: number): { x: number; y: number } {
  return {
    x: FLOOR_X0 + x + depth * ROW_RUN,
    y: FLOOR_Y0 - depth * ROW_RISE,
  };
}

/* Four corners of a tile (front-left, front-right, back-right, back-left)
 * in scene viewBox coords. */
function tileCorners(col: number, row: number) {
  const fl = isoXY(col * TILE_W,       row);
  const fr = isoXY((col + 1) * TILE_W, row);
  const br = isoXY((col + 1) * TILE_W, row + 1);
  const bl = isoXY(col * TILE_W,       row + 1);
  return { fl, fr, br, bl };
}

/* The visual center of a tile's top face — where plants and labels sit. */
function tileCenter(col: number, row: number) {
  return isoXY((col + 0.5) * TILE_W, row + 0.5);
}

/* ------------------------------------------------------------------ */
/* SceneDefs — kept as an extension point. The floor is now drawn as a */
/* wireframe (no fills) but the <defs> block stays in place so future  */
/* tints / gradients can slot in without rewiring callers.             */
/* ------------------------------------------------------------------ */
function SceneDefs() {
  return <defs aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* CalendarFloor — no frame, no grid, no fills. Only the date numbers  */
/* sit at their orthographic positions; the iso "grid" is implied by   */
/* the staggered positions of the numbers themselves. Plants still      */
/* stand at each tile center so the page keeps its purpose as an       */
/* activity garden, but everything else is suppressed.                  */
/*                                                                     */
/* Z-ordering:                                                          */
/*   1. plants + labels (back row first, then front row)                */
/*   2. tap targets (invisible, on top, parallelogram-shaped)           */
/* ------------------------------------------------------------------ */
function CalendarFloor({
  cells,
  selectedKey,
  onSelect,
  pageIdx,
}: {
  cells: DayCell[];
  selectedKey: string | null;
  onSelect: (cell: DayCell) => void;
  pageIdx: number;
}) {
  // Render cells in z-order: back row first so front-row sprites paint
  // over the back row where they overlap.
  const sortedCells = [...cells].sort((a, b) => {
    const ra = tileForIdx(cells.indexOf(a)).row;
    const rb = tileForIdx(cells.indexOf(b)).row;
    if (ra !== rb) return rb - ra;
    return cells.indexOf(a) - cells.indexOf(b);
  });

  return (
    <g>
      {sortedCells.map((cell) => {
        const idx = cells.indexOf(cell);
        const { col, row } = tileForIdx(idx);
        const corners = tileCorners(col, row);
        const center  = tileCenter(col, row);
        const isSelected = cell.key === selectedKey;
        const tilePath =
          `M ${corners.fl.x} ${corners.fl.y} ` +
          `L ${corners.fr.x} ${corners.fr.y} ` +
          `L ${corners.br.x} ${corners.br.y} ` +
          `L ${corners.bl.x} ${corners.bl.y} Z`;

        return (
          <g
            key={cell.key}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(cell)}
            role="button"
            aria-label={`${fullDate(cell.date)}, ${cell.minutes} minutes studied`}
          >
            <PlantOnTile cell={cell} cx={center.x} cy={center.y} />

            <TileLabel cell={cell} cx={center.x} cy={center.y} isSelected={isSelected} />

            {/* Invisible tap target — parallelogram covers the whole
               tile so the user can tap anywhere in it, not just the
               number or plant. */}
            <path d={tilePath} fill="transparent" />
          </g>
        );
      })}

      {/* Page wayfinding — a discreet "← drag for older" mark, only
         on page 0. Tucked just left of the leftmost back-row tile so
         it reads as a quiet hint, not a button. */}
      {pageIdx === 0 && <SwipeHint />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* SwipeHint — a discreet "← drag" chevron tucked under the front-left */
/* corner of the floor. Reads as a quiet wayfinding mark, not a button.*/
/* ------------------------------------------------------------------ */
function SwipeHint() {
  const a = isoXY(0, 0);
  const x = a.x - 10;
  const y = a.y + 14;
  return (
    <g opacity={0.45} aria-hidden style={{ pointerEvents: 'none' }}>
      <path
        d={`M ${x + 4} ${y - 3} L ${x} ${y} L ${x + 4} ${y + 3}`}
        fill="none"
        stroke="#3a3c38"
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M ${x + 9} ${y - 3} L ${x + 5} ${y} L ${x + 9} ${y + 3}`}
        fill="none"
        stroke="#3a3c38"
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={x + 14}
        y={y + 2.4}
        fontSize="5.6"
        fontWeight={600}
        letterSpacing="0.6"
        fill="#3a3c38"
        style={{ userSelect: 'none' }}
      >
        DRAG FOR OLDER
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* TileLabel — the day-of-month number printed at each tile's iso      */
/* center. With no frame to read against, the number itself carries    */
/* all the calendar structure: 14 of them, staggered by the iso        */
/* projection, form the implicit grid.                                  */
/*                                                                     */
/* Visual hierarchy:                                                    */
/*   • TODAY   — heaviest, fully inked, slightly larger                 */
/*   • selected — bold + a short underline tick                         */
/*   • default  — semibold, soft stone                                  */
/* ------------------------------------------------------------------ */
function TileLabel({
  cell,
  cx,
  cy,
  isSelected,
}: {
  cell: DayCell;
  cx: number;
  cy: number;
  isSelected: boolean;
}) {
  if (cell.isToday) {
    return (
      <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize="7"
          fontWeight={800}
          letterSpacing="0.6"
          fill="#3a3c38"
          opacity={1}
        >
          TODAY
        </text>
      </g>
    );
  }
  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="9"
        fontWeight={isSelected ? 800 : 600}
        fill="#3a3c38"
        opacity={isSelected ? 0.95 : 0.55}
      >
        {cell.date.getDate()}
      </text>
      {isSelected && (
        <line
          x1={cx - 4}
          y1={cy + 7}
          x2={cx + 4}
          y2={cy + 7}
          stroke="#3a3c38"
          strokeWidth={0.8}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* PlantOnTile — positions and scales a Plant sprite to stand on the   */
/* tile center, with sizes tuned to fit between iso rows without       */
/* obscuring the back row.                                              */
/* ------------------------------------------------------------------ */
const PLANT_CSS_SIZE: Record<PlantKind, { w: number; h: number }> = {
  empty:   { w: 16, h:  4 },
  sprout:  { w: 22, h: 18 },
  bud:     { w: 22, h: 26 },
  bloom:   { w: 24, h: 32 },
  bouquet: { w: 26, h: 38 },
  tree:    { w: 30, h: 44 },
};

/** How many viewBox units to lift a plant above the tile center so it
 *  floats clearly above the date-number rather than overlapping it. */
const PLANT_LIFT = 12;

function PlantOnTile({ cell, cx, cy }: { cell: DayCell; cx: number; cy: number }) {
  const tone = TONE[cell.tone];

  // Empty days get the seed mound; today's empty plot gets the dashed
  // "ready to grow" ring so the user reads it as inviting, not absent.
  if (cell.kind === 'empty' && !cell.isToday) {
    // Seed mound — just a tiny dot, sits close above the number so it
    // reads as "nothing here yet" without floating too far up.
    return (
      <ellipse cx={cx} cy={cy - 6} rx={2} ry={0.8} fill="#5a3f28" opacity={0.35} />
    );
  }
  if (cell.kind === 'empty' && cell.isToday) {
    return (
      <g>
        <circle
          cx={cx} cy={cy - PLANT_LIFT - 2}
          r={4.5}
          fill="none"
          stroke="rgba(58,60,56,0.35)"
          strokeWidth="0.8"
          strokeDasharray="1.4 1.8"
        />
        <circle cx={cx} cy={cy - PLANT_LIFT - 2} r={0.9} fill="rgba(58,60,56,0.5)" />
      </g>
    );
  }

  const { w, h } = PLANT_CSS_SIZE[cell.kind];
  return (
    <svg
      x={cx - w / 2}
      y={cy - h - PLANT_LIFT}
      width={w}
      height={h}
      viewBox={`0 0 ${PLANT_VB.w} ${PLANT_VB.h}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ overflow: 'visible' }}
    >
      {cell.kind === 'sprout'  && <PlantSprout c={tone} />}
      {cell.kind === 'bud'     && <PlantBud c={tone} />}
      {cell.kind === 'bloom'   && <PlantBloom c={tone} />}
      {cell.kind === 'bouquet' && <PlantBouquet c={tone} />}
      {cell.kind === 'tree'    && <PlantTree c={tone} />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* SkyDecor — two soft clouds + a tiny bird, drawn in scene viewBox    */
/* coords. Held to a tight monochrome palette so the eye stays on the  */
/* iso floor.                                                          */
/* ------------------------------------------------------------------ */
function SkyDecor() {
  return (
    <g opacity={0.7} aria-hidden>
      <g fill="#f3ecdc">
        <ellipse cx="80"  cy="80"  rx="26" ry="9" />
        <ellipse cx="98"  cy="76"  rx="20" ry="8" />
        <ellipse cx="68"  cy="76"  rx="14" ry="6" />

        <ellipse cx="298" cy="130" rx="22" ry="8" />
        <ellipse cx="314" cy="126" rx="16" ry="7" />
        <ellipse cx="286" cy="126" rx="12" ry="6" />
      </g>
      <path
        d="M198 170 Q 204 164 210 170 Q 216 164 222 170"
        stroke="#a0a299"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* A pale morning sun in the top-right. */}
      <circle cx="350" cy="68" r="14" fill="#ffe9b3" opacity={0.85} />
      <circle cx="350" cy="68" r="9"  fill="#ffd877" opacity={0.9} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* DistantHills — a quiet silhouette set just above the iso floor's    */
/* back edge so the floor reads as a planter on a far horizon.         */
/* ------------------------------------------------------------------ */
function DistantHills() {
  // Anchor the hill silhouette so its bottom sits just above the floor's
  // back edge (= FLOOR_Y0 - FLOOR_DEPTH_Y). The internal viewBox of the
  // hill paths is 80 units tall; offsetting by `topY` aligns the bottom
  // of that box to a few pixels above the floor's horizon.
  const hillBaseY = FLOOR_Y0 - FLOOR_DEPTH_Y - 4;
  const topY      = hillBaseY - 80;
  return (
    <g opacity={0.6} aria-hidden transform={`translate(0, ${topY})`}>
      <path
        d="M0 60 C 60 36, 110 50, 170 38 S 280 20, 340 36 L 400 30 L 400 80 L 0 80 Z"
        fill="#e6dfcf"
      />
      <path
        d="M0 76 C 50 58, 120 70, 200 60 S 320 50, 400 64 L 400 80 L 0 80 Z"
        fill="#d6cdb8"
      />
      <g fill="#c9bfa6">
        <ellipse cx="74"  cy="58" rx="6" ry="4" />
        <rect    x="73"   y="57" width="2" height="6" />
        <ellipse cx="248" cy="52" rx="7" ry="5" />
        <rect    x="247"  y="51" width="2" height="7" />
        <ellipse cx="312" cy="60" rx="5" ry="3" />
        <rect    x="311"  y="59" width="2" height="5" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Plant silhouettes — drawn against a shared viewBox so they line up  */
/* on the tile center regardless of size. ground line is y = 100.      */
/* These are used by <PlantOnTile/> via a nested <svg>.                */
/* ------------------------------------------------------------------ */
const PLANT_VB = { w: 40, h: 100, ground: 100 } as const;

type C = (typeof TONE)[ToneName];

function PlantSprout({ c }: { c: C }) {
  return (
    <g>
      <path d="M20 100 L20 78" stroke={c.leaf} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <ellipse cx="14" cy="80" rx="4" ry="2.6" fill={c.leaf} transform="rotate(-30 14 80)" />
      <ellipse cx="26" cy="80" rx="4" ry="2.6" fill={c.leaf} transform="rotate(30 26 80)" />
    </g>
  );
}

function PlantBud({ c }: { c: C }) {
  return (
    <g>
      <path d="M20 100 L20 56" stroke={c.leaf} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Single side leaf */}
      <ellipse cx="13" cy="78" rx="5" ry="2.6" fill={c.leaf} transform="rotate(-25 13 78)" />
      {/* Closed bud — teardrop */}
      <path
        d="M20 56 C 16 56, 14 50, 17 46 C 19 43, 21 43, 23 46 C 26 50, 24 56, 20 56 Z"
        fill={c.flower}
      />
      <path
        d="M20 56 C 18 54, 17 51, 18 48"
        stroke={c.flowerDeep}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function PlantBloom({ c }: { c: C }) {
  return (
    <g>
      <path d="M20 100 L20 36" stroke={c.leaf} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Two leaves */}
      <ellipse cx="12" cy="74" rx="6" ry="2.8" fill={c.leaf} transform="rotate(-25 12 74)" />
      <ellipse cx="28" cy="62" rx="6" ry="2.8" fill={c.leaf} transform="rotate(25 28 62)" />
      {/* Flower — five petals around a center */}
      <g transform="translate(20 30)">
        <circle cx="0" cy="-7" r="4" fill={c.flower} />
        <circle cx="6.5" cy="-2" r="4" fill={c.flower} />
        <circle cx="-6.5" cy="-2" r="4" fill={c.flower} />
        <circle cx="4" cy="6" r="4" fill={c.flower} />
        <circle cx="-4" cy="6" r="4" fill={c.flower} />
        <circle cx="0" cy="0" r="2.4" fill={c.flowerDeep} />
      </g>
    </g>
  );
}

function PlantBouquet({ c }: { c: C }) {
  return (
    <g>
      {/* Three stems of varied height */}
      <path d="M20 100 L18 32" stroke={c.leaf} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M20 100 L28 44" stroke={c.leaf} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M20 100 L11 50" stroke={c.leaf} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* Leaves */}
      <ellipse cx="13" cy="76" rx="6" ry="2.8" fill={c.leaf} transform="rotate(-30 13 76)" />
      <ellipse cx="27" cy="68" rx="6" ry="2.8" fill={c.leaf} transform="rotate(28 27 68)" />
      <ellipse cx="17" cy="58" rx="5" ry="2.4" fill={c.leaf} transform="rotate(-12 17 58)" />
      {/* Three flower heads, one taller in the middle */}
      <FlowerHead cx={18} cy={28} c={c} r={4.2} />
      <FlowerHead cx={28} cy={42} c={c} r={3.4} alt />
      <FlowerHead cx={11} cy={48} c={c} r={3.4} alt />
    </g>
  );
}

function PlantTree({ c }: { c: C }) {
  // A small fruiting tree — trunk + two crown ellipses + 4 colored fruits.
  return (
    <g>
      {/* Trunk */}
      <path
        d="M19 100 C 19 90, 21 80, 19.5 60 L 20.5 60 C 19 80, 21 90, 21 100 Z"
        fill="#a06a4a"
      />
      <path d="M20 60 L20 24" stroke="#a06a4a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* A couple of branches */}
      <path d="M20 40 C 16 38, 14 34, 12 30" stroke="#a06a4a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M20 36 C 24 34, 26 30, 28 26" stroke="#a06a4a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Crown — two soft ellipses, same family as tone */}
      <ellipse cx="20" cy="22" rx="14" ry="11" fill={c.leaf} opacity="0.55" />
      <ellipse cx="14" cy="30" rx="9"  ry="7"  fill={c.leaf} opacity="0.55" />
      <ellipse cx="26" cy="28" rx="9"  ry="7"  fill={c.leaf} opacity="0.55" />
      {/* Fruits — small color pops */}
      <circle cx="14" cy="24" r="2.2" fill={c.flower} />
      <circle cx="26" cy="20" r="2.2" fill={c.flower} />
      <circle cx="20" cy="32" r="2.2" fill={c.flowerDeep} />
      <circle cx="22" cy="14" r="2.0" fill={c.flower} />
    </g>
  );
}

function FlowerHead({ cx, cy, c, r = 4, alt = false }: { cx: number; cy: number; c: C; r?: number; alt?: boolean }) {
  const fill = alt ? c.flowerDeep : c.flower;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle cx="0"     cy={-r * 1.6} r={r} fill={fill} />
      <circle cx={r * 1.5}  cy={-r * 0.4} r={r} fill={fill} />
      <circle cx={-r * 1.5} cy={-r * 0.4} r={r} fill={fill} />
      <circle cx={r * 0.9}  cy={r * 1.3}  r={r} fill={fill} />
      <circle cx={-r * 0.9} cy={r * 1.3}  r={r} fill={fill} />
      <circle cx="0" cy="0" r={r * 0.55} fill={alt ? c.flower : c.flowerDeep} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* DetailSheet — the soft card that slides up when a plot is tapped.   */
/* ------------------------------------------------------------------ */
function DetailSheet({
  cell,
  onClose,
}: {
  cell: DayCell | null;
  onClose: () => void;
}) {
  const open = !!cell;
  return (
    <Motion.div
      initial={false}
      animate={{ y: open ? 0 : 60, opacity: open ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="pointer-events-none absolute inset-x-0 bottom-3 z-30 px-4"
      aria-hidden={!open}
    >
      <div className="card-glass pointer-events-auto relative overflow-hidden p-4">
        {cell && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                {cell.isToday ? 'Today' : fullDate(cell.date)}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="icon-btn-sm h-6 w-6"
              >
                <X className="h-3 w-3" strokeWidth={2.4} />
              </button>
            </div>

            <p className="serif-display mt-1 text-[18px] leading-tight text-stone-800">
              {titleFor(cell)}
            </p>

            <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-stone-500">
              <span className="time-num">{cell.minutes}m focused</span>
              <span className="text-stone-300" aria-hidden>·</span>
              <span className="time-num">
                {cell.sessions} {cell.sessions === 1 ? 'session' : 'sessions'}
              </span>
              {cell.subjects.length > 0 && (
                <>
                  <span className="text-stone-300" aria-hidden>·</span>
                  <span className="truncate">{cell.subjects.slice(0, 3).join(', ')}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Build the 14 cells for a given page of the calendar.
 *   pageIdx =  0 → today and the 13 prior days (today on the right)
 *   pageIdx = -1 → the 14 days before that
 *   pageIdx = -N → 14 * N days further back
 *
 * Seed data is only used on page 0 (so older windows aren't poisoned
 * with fake activity).
 */
function buildCellsForPage(routes: SavedRoute[], pageIdx: number): DayCell[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Bucket saved routes by day key, so multiple sessions on the same day
  // collapse into a single richer plant.
  const byKey = new Map<string, { minutes: number; sessions: number; subjects: Set<string>; primary: SavedRoute }>();

  for (const r of routes) {
    const ts = r.lastUsedAt ?? r.createdAt;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const key = dayKey(d);
    const minutes =
      r.paceMinutes != null
        ? r.paceMinutes * Math.max(r.items.length, 1)
        : r.items.length * 25;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.minutes += minutes;
      bucket.sessions += 1;
      r.items.forEach((it) => bucket.subjects.add(it.label));
    } else {
      byKey.set(key, {
        minutes,
        sessions: 1,
        subjects: new Set(r.items.map((it) => it.label)),
        primary: r,
      });
    }
  }

  // Seed the garden with a quiet handful of past days on page 0 when
  // the user has no real history yet. Older pages stay honest.
  const useFallback = byKey.size === 0 && pageIdx === 0;
  if (useFallback) {
    for (const seed of SEED_DAYS) {
      const d = new Date(today);
      d.setDate(today.getDate() - seed.offset);
      byKey.set(dayKey(d), {
        minutes: seed.minutes,
        sessions: seed.sessions,
        subjects: new Set(seed.subjects),
        primary: undefined as unknown as SavedRoute,
      });
    }
  }

  // pageIdx=0 covers offsets 0..13; pageIdx=-1 covers 14..27; etc.
  const pageOffset = -pageIdx * DAYS_BACK;

  const cells: DayCell[] = [];
  // Build oldest → newest within the window, so the latest day in the
  // window sits at the right (front-right corner of the iso floor).
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i - pageOffset);
    const key = dayKey(d);
    const bucket = byKey.get(key);
    const minutes = bucket?.minutes ?? 0;
    const sessions = bucket?.sessions ?? 0;
    const subjects = bucket ? Array.from(bucket.subjects) : [];
    const isToday = pageIdx === 0 && i === 0;

    cells.push({
      key,
      date: d,
      isToday,
      minutes,
      sessions,
      subjects,
      primary: bucket?.primary,
      kind: plantKindFor(minutes, sessions),
      tone: subjects.length > 0 ? toneForSubjects(subjects) : 'leaf',
    });
  }

  return cells;
}

/** "Apr 28" — short label used in the date-range stat. */
function shortDate(d: Date): string {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function computeStreak(cells: DayCell[]): number {
  // Walk back from today; stop at the first day with no activity.
  let streak = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].sessions > 0 || cells[i].minutes > 0) streak += 1;
    else break;
  }
  return streak;
}

function titleFor(cell: DayCell): string {
  if (cell.primary?.name) return cell.primary.name;
  if (cell.primary?.note) return cell.primary.note;
  if (cell.sessions === 0) return cell.isToday ? 'Plant something today' : 'A quiet day';
  if (cell.kind === 'sprout')  return 'Just a few minutes';
  if (cell.kind === 'bud')     return 'A short focus';
  if (cell.kind === 'bloom')   return 'A full session';
  if (cell.kind === 'bouquet') return 'A long, varied day';
  return 'A great day in the garden';
}
