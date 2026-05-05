import React from 'react';

/**
 * Shared bell pendant. The same friendly orange bell is used for every
 * pull interaction in the app so the gesture always looks the same:
 *
 *  - PullSelect (routine wizard) hangs it on a string above the options
 *  - Welcome / RoutineReview / BreakScreen / FocusSession use it as the
 *    knot of an elastic string
 *
 * Two flavours are exported:
 *
 *  - `BellSVG`    — a standalone <svg> sized in CSS pixels. Drop it on
 *                   the page wherever you want a bell.
 *
 *  - `BellGroup`  — an inline <g> meant to be placed inside an existing
 *                   parent <svg>. Coordinates are local to the parent's
 *                   viewBox; the bell is *top-anchored* at (0, 0) so
 *                   wrapping in `<g transform="translate(cx, top)">`
 *                   places it where you want.
 *
 * Both flavours generate a unique <linearGradient> id internally so
 * multiple bells can coexist on the same page without colliding.
 */

let idCounter = 0;
function useUniqueId(prefix: string) {
  // useState avoids re-running on every render, but we don't need the setter
  const [id] = React.useState(() => {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
  });
  return id;
}

interface BellGroupProps {
  /** 1.0 ≈ 28px wide × 28px tall, top-anchored. */
  scale?: number;
  /** Optional drop shadow underneath. */
  shadow?: boolean;
}

/**
 * The original PULL pendant — a dark teardrop "seed" shape with a small
 * cream eye inside, top-anchored at (0, 0). Caller wraps in
 * `<g transform="translate(cx, top)">` to place it.
 *
 * The shape is ported directly from the very first prototype (Welcome's
 * pull-pendant + PullSelect's option pendant) so the look is consistent
 * with the original visual identity that lives in `legacy/index.html`.
 */
export function BellGroup({ scale = 1, shadow = true }: BellGroupProps) {
  return (
    <g transform={`scale(${scale})`}>
      {shadow && (
        <ellipse cx="0" cy="32" rx="13" ry="2.4" fill="#000" opacity="0.07" />
      )}
      {/* seed / teardrop body */}
      <path
        d="M 0 0
           C -10 0  -14 7  -14 14
           C -14 23 -8 28  0 28
           C 8 28   14 23  14 14
           C 14 7   10 0   0 0 Z"
        fill="#3a4a38"
      />
      {/* cream eye */}
      <circle cx="0" cy="15" r="3.5" fill="#eae8e3" opacity="0.82" />
    </g>
  );
}

/**
 * Standalone pendant + string. The string anchors at the top of the SVG
 * and the pendant hangs below it. Refs are exposed so a parent can
 * imperatively stretch the string and translate the pendant during a
 * drag — used by Welcome, RoutineReview, BreakScreen.
 */
export const BellSVG = React.forwardRef<
  SVGSVGElement,
  {
    width?: number;
    /** Length of the resting string in viewBox units (default 16). */
    stringLength?: number;
    /** Kept for API compatibility — the seed pendant has no sparkle. */
    sparkle?: boolean;
    stringRef?: React.Ref<SVGLineElement>;
    pendantRef?: React.Ref<SVGGElement>;
    className?: string;
  }
>(function BellSVGImpl(
  { width = 120, stringLength = 16, stringRef, pendantRef, className },
  svgRef,
) {
  // Local viewBox: 40 wide × (stringLength + 36) tall, top-anchored.
  // The pendant occupies ~28×28 at scale 1 plus a couple of px for shadow.
  const vbW = 40;
  const vbH = stringLength + 36;
  const cx = vbW / 2;
  return (
    <svg
      ref={svgRef}
      width={width}
      height={width * (vbH / vbW)}
      viewBox={`0 0 ${vbW} ${vbH}`}
      overflow="visible"
      className={className}
    >
      {stringLength > 0 && (
        <line
          ref={stringRef}
          x1={cx}
          y1={4}
          x2={cx}
          y2={stringLength}
          stroke="#7a8078"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
      {/*
        Two-layer pendant: the outer <g> is owned by the spring engine
        (it overwrites `transform` via setAttribute to translate the
        bell during a drag), the inner <g> stays put and holds the
        static (cx, stringLength) positioning + bell paths.
      */}
      <g ref={pendantRef}>
        <g transform={`translate(${cx}, ${stringLength})`}>
          <BellGroup scale={1} />
        </g>
      </g>
    </svg>
  );
});
