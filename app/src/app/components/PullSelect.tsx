/**
 * PullSelect — a pullable pendant that slides through a list of options.
 * Drag the pendant down; it highlights the nearest option. Release to commit.
 *
 * Props:
 *   items     – array of labels
 *   onSelect  – called with the selected label when released at or past the
 *               first option (i.e. any intentional pull)
 *   spacing   – px between option rows (default 64)
 */
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  items: string[];
  onSelect: (label: string) => void;
  spacing?: number;
}

const STRING_TOP = 20;   // px from component top to string anchor
const PENDANT_REST = 0;  // pendant y-offset when not pulled (relative to first option)

export function PullSelect({ items, onSelect, spacing = 64 }: Props) {
  const wrapRef        = useRef<HTMLDivElement>(null);
  const stringPathRef  = useRef<SVGPathElement>(null);
  const pendantGRef    = useRef<SVGGElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered,  setHovered]  = useState<number | null>(null);

  // The total SVG height covers string top + options
  const totalH = STRING_TOP + items.length * spacing + spacing * 0.5;
  // Where the pendant rests (above first option) in SVG y coords
  const firstOptionY = STRING_TOP + spacing * 0.4;

  const yForIndex = (i: number) => firstOptionY + i * spacing;

  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let isDragging = false;
    let startY = 0;
    let rawPull = 0;
    // Spring state
    let springY = firstOptionY;
    let targetY  = firstOptionY;
    let vel      = 0;
    let animFrame = 0;

    const MAX_Y = yForIndex(items.length - 1) + spacing * 0.5;

    const updateSVG = (y: number) => {
      const path    = stringPathRef.current;
      const pendant = pendantGRef.current;
      if (!path || !pendant) return;
      // String: quadratic bezier from top anchor to pendant
      // Slight bow to the right when slack, straightens as it extends
      const bow = Math.max(0, (firstOptionY - y) * 0.35);
      path.setAttribute('d', `M 50 ${STRING_TOP} Q ${50 + bow} ${(STRING_TOP + y) / 2} 50 ${y}`);
      pendant.setAttribute('transform', `translate(0, ${y - firstOptionY})`);
    };

    const computeSelected = (y: number) => {
      // Find nearest option
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < items.length; i++) {
        const d = Math.abs(y - yForIndex(i));
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return y < firstOptionY - 8 ? null : best;
    };

    const loop = () => {
      const dx = targetY - springY;
      vel = (vel + dx * 0.18) * 0.8;
      springY += vel;
      updateSVG(springY);
      if (Math.abs(vel) < 0.3 && Math.abs(dx) < 0.3) {
        springY = targetY;
        updateSVG(springY);
        animFrame = 0;
      } else {
        animFrame = requestAnimationFrame(loop);
      }
    };

    const startSpring = () => {
      if (!animFrame) animFrame = requestAnimationFrame(loop);
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
      rawPull = Math.max(0, clientY - startY);
      // Map raw drag to SVG y with elastic clamping
      const elasticY = Math.min(
        firstOptionY + MAX_Y * (1 - Math.exp(-rawPull / MAX_Y)),
        MAX_Y,
      );
      targetY  = elasticY;
      springY  = elasticY;
      updateSVG(springY);
      setSelected(computeSelected(springY));
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('pull-active');

      const sel = computeSelected(springY);
      if (sel !== null && rawPull > 8) {
        // Snap to nearest option, then call onSelect after the snap animation
        targetY = yForIndex(sel);
        setSelected(sel);
        startSpring();
        setTimeout(() => onSelect(items[sel]), 220);
      } else {
        // Spring back to rest
        targetY = firstOptionY;
        setSelected(null);
        startSpring();
      }
      rawPull = 0;
    };

    wrap.addEventListener('mousedown',  onStart, { passive: false });
    wrap.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove',  onMove,  { passive: false });
    window.addEventListener('touchmove',  onMove,  { passive: false });
    window.addEventListener('mouseup',    onEnd);
    window.addEventListener('touchend',   onEnd);

    updateSVG(firstOptionY);

    return () => {
      wrap.removeEventListener('mousedown',  onStart);
      wrap.removeEventListener('touchstart', onStart);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',    onEnd);
      window.removeEventListener('touchend',   onEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
      document.body.classList.remove('pull-active');
    };
  }, [items, firstOptionY, spacing]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full cursor-grab select-none touch-none active:cursor-grabbing"
      style={{ height: totalH }}
    >
      {/* SVG layer: string + pendant — centred in full width */}
      <svg
        className="pointer-events-none absolute inset-0 w-full"
        style={{ height: totalH }}
        viewBox={`0 0 100 ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* String */}
        <path
          ref={stringPathRef}
          d={`M 50 ${STRING_TOP} Q 50 ${(STRING_TOP + firstOptionY) / 2} 50 ${firstOptionY}`}
          fill="none"
          stroke="#3a4a38"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        {/* Pendant group — translated imperatively */}
        <g ref={pendantGRef}>
          <path
            d={`M 50 ${firstOptionY}
                C 40 ${firstOptionY} 35 ${firstOptionY + 7} 35 ${firstOptionY + 15}
                C 35 ${firstOptionY + 24} 41.5 ${firstOptionY + 30} 50 ${firstOptionY + 30}
                C 58.5 ${firstOptionY + 30} 65 ${firstOptionY + 24} 65 ${firstOptionY + 15}
                C 65 ${firstOptionY + 7} 60 ${firstOptionY} 50 ${firstOptionY} Z`}
            fill="#3a4a38"
          />
          <circle cx="50" cy={firstOptionY + 16} r="4" fill="#eae8e3" opacity="0.82" />
        </g>
      </svg>

      {/* Options — full-width rows; clickable + hover-highlight */}
      {items.map((item, i) => {
        const isSelected = selected === i;
        const isHovered  = hovered  === i;
        const isActive   = isSelected || isHovered;
        const y = yForIndex(i);
        return (
          <button
            key={item}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            className="group absolute inset-x-0 flex w-full items-center transition-all duration-150 active:scale-[0.98]"
            style={{ top: y + 18, cursor: 'pointer' }}
          >
            <span
              className="transition-all duration-150"
              style={{
                flex: 1,
                height: isActive ? '1.5px' : '1px',
                background: isActive
                  ? 'linear-gradient(to right, transparent, #3a4a38)'
                  : 'linear-gradient(to right, transparent, #d4cfc9)',
              }}
            />
            <span
              className="mx-4 transition-all duration-150"
              style={{
                fontSize: isActive ? '15px' : '13px',
                fontWeight: isActive ? 400 : 300,
                color: isActive ? '#3a4a38' : '#a8a29e',
                letterSpacing: isActive ? '-0.02em' : '0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {item}
            </span>
            <span
              className="transition-all duration-150"
              style={{
                flex: 1,
                height: isActive ? '1.5px' : '1px',
                background: isActive
                  ? 'linear-gradient(to left, transparent, #3a4a38)'
                  : 'linear-gradient(to left, transparent, #d4cfc9)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
