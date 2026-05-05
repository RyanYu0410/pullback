import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, SavedRoute } from '../context/AppContext';
import { Motion } from './Motion';
import { BellGroup } from './PullBell';
import { ChevronLeft } from 'lucide-react';

/* Reusable small silhouette used on onboarding screens */
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

/**
 * "My Study Garden" — the same growing tree as the original PULL Tree,
 * relabelled and recoloured for middle-schoolers. Each saved session
 * adds a branch; finished tasks show up as fruit-coloured leaves.
 */
export function Tree() {
  const navigate = useNavigate();
  const { savedRoutes } = useAppContext();
  const [selected, setSelected] = useState<SavedRoute | null>(null);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col"
      style={{ background: 'linear-gradient(180deg, #fff8ee 0%, #d6f0e0 100%)' }}
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
            My Study Garden
          </span>
          <h2 className="text-[20px] font-bold leading-tight text-stone-800">
            Look how it's growing!
          </h2>
        </div>
        <span className="h-10 w-10" aria-hidden />
      </div>

      <div className="flex-1 overflow-hidden">
        <TreeCanvas routes={savedRoutes} onLeafTap={(r) => setSelected(r)} />
      </div>

      <Motion.div
        initial={false}
        animate={{ y: selected ? 0 : 200, opacity: selected ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-8 pointer-events-none"
      >
        <div className="pointer-events-auto rounded-3xl bg-white/95 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-stone-200">
          {selected && (
            <>
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-500">
                {new Date(selected.lastUsedAt ?? selected.createdAt).toLocaleDateString()}
              </span>
              <p className="mt-1 text-[15px] font-bold text-stone-800">"{selected.note || selected.name}"</p>
              <div className="mt-3 flex items-center gap-1.5">
                {selected.items.map((it) => {
                  const dot =
                    it.type === 'red' ? 'bg-rose-300'
                    : it.type === 'green' ? 'bg-emerald-300'
                    : it.type === 'yellow' ? 'bg-amber-300'
                    : it.type === 'blue' ? 'bg-sky-300'
                    : 'bg-stone-300';
                  return <span key={it.id} className={`h-2 w-2 rounded-full ${dot}`} />;
                })}
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="close"
                className="absolute right-3 top-3 h-7 w-7 rounded-full bg-stone-100 text-[14px] font-bold text-stone-500"
              >
                ×
              </button>
            </>
          )}
        </div>
      </Motion.div>
    </Motion.div>
  );
}

/* viewBox is intentionally compact (320×460) so the SVG content always
   fits inside the available phone-frame area — no more clipped crowns or
   tops sliding off the screen. xMidYMid meet centers the tree without
   anchoring it to the bottom edge. */
const VB_W = 320;
const VB_H = 460;

function TreeCanvas({
  routes,
  onLeafTap,
}: {
  routes: SavedRoute[];
  onLeafTap: (r: SavedRoute) => void;
}) {
  const trunkX = VB_W / 2;
  const trunkBottom = VB_H - 30;
  const trunkTop = 50;
  const svgRef = useRef<SVGSVGElement | null>(null);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Soft leafy crown behind the tree — makes it feel like a real tree
         that the pull-strings hang on top of, rather than a bare diagram. */}
      <ellipse cx={trunkX} cy={trunkTop + 4} rx={84} ry={42} fill="#cfeacd" opacity="0.55" />
      <ellipse cx={trunkX - 32} cy={trunkTop + 32} rx={52} ry={30} fill="#bfe1c0" opacity="0.55" />
      <ellipse cx={trunkX + 36} cy={trunkTop + 36} rx={52} ry={30} fill="#bfe1c0" opacity="0.55" />
      <ellipse cx={trunkX} cy={trunkTop + 60} rx={66} ry={22} fill="#d6f0d8" opacity="0.5" />

      {/* Ground line */}
      <line x1="40" y1={trunkBottom} x2={VB_W - 40} y2={trunkBottom} stroke="#86c597" strokeWidth="0.8" />

      {/* Trunk */}
      <Motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        d={`M ${trunkX} ${trunkBottom} L ${trunkX} ${trunkTop}`}
        stroke="#a06a4a"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Roots — drawn before branches so bells render on top of them. */}
      <path
        d={`M ${trunkX} ${trunkBottom} C ${trunkX - 20} ${trunkBottom + 8}, ${trunkX - 40} ${trunkBottom + 4}, ${trunkX - 60} ${trunkBottom + 12}`}
        stroke="#a06a4a"
        strokeWidth="1"
        fill="none"
      />
      <path
        d={`M ${trunkX} ${trunkBottom} C ${trunkX + 20} ${trunkBottom + 8}, ${trunkX + 40} ${trunkBottom + 4}, ${trunkX + 60} ${trunkBottom + 12}`}
        stroke="#a06a4a"
        strokeWidth="1"
        fill="none"
      />

      {routes.map((route, i) => {
        const t = routes.length === 1 ? 0.5 : i / Math.max(routes.length - 1, 1);
        const branchY = trunkBottom - 60 - t * (trunkBottom - trunkTop - 80);
        const side = i % 2 === 0 ? -1 : 1;
        const length = 60 + Math.min(route.items.length * 4, 36);
        const endX = trunkX + side * length;
        const endY = branchY - 16 - Math.min(route.uses, 4) * 3;
        // Cap visible bells per branch so they don't crowd at high-use
        // routines. The detail-card still shows the true count.
        const visibleBells = Math.max(Math.min(route.uses, 4), 1);

        return (
          <g key={route.id}>
            {/* Branch */}
            <Motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 + i * 0.15 }}
              d={`M ${trunkX} ${branchY} Q ${trunkX + side * 30} ${branchY - 10}, ${endX} ${endY}`}
              stroke="#a06a4a"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Hanging pull-bells along the branch. Each bell is a real
               vertical pull: drag down to extend the string and reveal the
               route name in a small chip; release past the threshold (or a
               plain tap) opens the detail card. */}
            {Array.from({ length: visibleBells }).map((_, j) => {
              const offsetT = (j + 1) / (visibleBells + 1);
              const anchorX = trunkX + (endX - trunkX) * offsetT;
              const anchorY = branchY + (endY - branchY) * offsetT;
              const initialStringLen = 14 + (j % 3) * 6;
              const swayDur = 3 + ((i + j) % 4) * 0.7;
              const swayPhase = ((i * 0.6 + j * 0.4) % 1).toFixed(2);
              return (
                <PullableBell
                  key={j}
                  anchorX={anchorX}
                  anchorY={anchorY}
                  trunkX={trunkX}
                  initialStringLen={initialStringLen}
                  swayDur={swayDur}
                  swayPhase={swayPhase}
                  label={route.name || route.note || 'Saved routine'}
                  svgRef={svgRef}
                  onTrigger={() => onLeafTap(route)}
                />
              );
            })}
          </g>
        );
      })}

      {routes.length === 0 && (
        <text
          x={trunkX}
          y={trunkTop + 30}
          textAnchor="middle"
          fontSize="12"
          fill="#86c597"
          fontWeight="bold"
        >
          Finish a session to hang your first bell!
        </text>
      )}
    </svg>
  );
}

/**
 * One bell hanging on a string, with a real vertical-drag interaction.
 *
 * - Resting: SMIL gives a tiny ±1.6° sway around the string anchor so the
 *   bell never looks frozen.
 * - Pulling: pointerdown on the bell starts a drag; pointermove extends
 *   the string downward (clamped to MAX_PULL viewBox units) and fades in
 *   a small white chip showing the routine name. The chip is positioned
 *   so it never crosses the SVG edge — outward from the trunk by default,
 *   flipping inward when it would overflow.
 * - Release: pull ≥ TRIGGER_VB OR a plain tap (pull ≤ TAP_TOLERANCE) opens
 *   the detail card; otherwise the string snaps back silently.
 *
 * Pixel→viewBox conversion is computed on pointerdown using the current
 * SVG bounding rect, so the gesture feels 1:1 with finger travel
 * regardless of how the page is sized.
 */
function PullableBell({
  anchorX,
  anchorY,
  trunkX,
  initialStringLen,
  swayDur,
  swayPhase,
  label,
  svgRef,
  onTrigger,
}: {
  anchorX: number;
  anchorY: number;
  trunkX: number;
  initialStringLen: number;
  swayDur: number;
  swayPhase: string;
  label: string;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onTrigger: () => void;
}) {
  const MAX_PULL = 28;
  const TRIGGER_VB = 14;
  const TAP_TOLERANCE = 3;

  const [pull, setPull] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const pxToVbRef = useRef(1);
  const pullRef = useRef(0);

  const updatePull = (vb: number) => {
    const clamped = Math.max(0, Math.min(MAX_PULL, vb));
    pullRef.current = clamped;
    setPull(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / VB_W, rect.height / VB_H);
      pxToVbRef.current = 1 / Math.max(scale, 0.0001);
    }
    startYRef.current = e.clientY;
    draggingRef.current = true;
    pullRef.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - startYRef.current;
    updatePull(dy * pxToVbRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const finalPull = pullRef.current;
    if (finalPull >= TRIGGER_VB || finalPull <= TAP_TOLERANCE) {
      onTrigger();
    }
    updatePull(0);
  };

  const stringLen = initialStringLen + pull;
  const labelOpacity = Math.min(1, pull / 8);

  /* Decide which side of the bell the chip should appear on, and
     keep it clamped inside the SVG so labels never run past the
     screen edge. Default is outward (away from the trunk); flip inward
     if the outward side would overflow. */
  const PAD = 4;
  const LABEL_W = 110;
  const outwardLeft = anchorX < trunkX;
  let labelX: number;
  let labelAlign: 'left' | 'right';
  if (outwardLeft) {
    labelX = -LABEL_W - PAD;
    labelAlign = 'right';
    if (anchorX + labelX < PAD) {
      labelX = PAD;
      labelAlign = 'left';
    }
  } else {
    labelX = PAD;
    labelAlign = 'left';
    if (anchorX + labelX + LABEL_W > VB_W - PAD) {
      labelX = -LABEL_W - PAD;
      labelAlign = 'right';
    }
  }

  return (
    <g transform={`translate(${anchorX}, ${anchorY})`}>
      <g>
        {/* Always-on idle sway. The amplitude is small enough that it
           reads as "alive" but doesn't disrupt the drag visually. */}
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-1.6 0 0; 1.6 0 0; -1.6 0 0"
          dur={`${swayDur}s`}
          begin={`-${swayPhase}s`}
          repeatCount="indefinite"
        />
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={stringLen}
          stroke="#7a8078"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <g transform={`translate(0, ${stringLen})`}>
          <BellGroup scale={0.55} shadow={false} />
        </g>
        {pull > 1 && (
          <foreignObject
            x={labelX}
            y={stringLen + 6}
            width={LABEL_W}
            height={26}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{ opacity: labelOpacity, textAlign: labelAlign }}
              className="truncate rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-200"
            >
              {label}
            </div>
          </foreignObject>
        )}
        {/* Generous transparent hit area on top of the bell. */}
        <circle
          cx={0}
          cy={stringLen + 8}
          r={16}
          fill="transparent"
          style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </g>
    </g>
  );
}
