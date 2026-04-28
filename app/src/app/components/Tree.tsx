import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, SavedRoute } from '../context/AppContext';
import { Motion } from './Motion';
import { CornerDownLeft } from 'lucide-react';

/* Reusable small silhouette used on onboarding screens */
export function TreeAnchor({
  rope = false,
  className = '',
}: {
  rope?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 80 100" className={`h-16 w-16 text-stone-400 ${className}`} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      {/* trunk */}
      <path d="M40 90 L40 50" />
      {/* branches */}
      <path d="M40 60 C 32 56, 26 50, 22 42" />
      <path d="M40 56 C 48 50, 56 46, 60 38" />
      <path d="M40 50 C 36 44, 36 38, 38 30" />
      {/* foliage hint */}
      <circle cx="22" cy="40" r="4" />
      <circle cx="60" cy="36" r="4" />
      <circle cx="38" cy="28" r="4" />
      {rope && (
        <path
          d="M40 50 C 38 60, 42 70, 40 84"
          stroke="#a8a29e"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
      )}
    </svg>
  );
}

/* The full tree page — branches per saved route, leaves per session */
export function Tree() {
  const navigate = useNavigate();
  const { savedRoutes } = useAppContext();
  const [selected, setSelected] = useState<SavedRoute | null>(null);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full w-full flex-col bg-gradient-to-b from-[#faf9f6] to-[#eee9e1]"
    >
      <div className="flex-1 overflow-hidden">
        <TreeCanvas
          routes={savedRoutes}
          onLeafTap={(route) => setSelected(route)}
        />
      </div>

      {/* Reflection panel */}
      <Motion.div
        initial={false}
        animate={{ y: selected ? 0 : 200, opacity: selected ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 pointer-events-none"
      >
        <div className="pointer-events-auto rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
          {selected && (
            <>
              <p className="text-[14px] font-light italic text-stone-700">"{selected.note}"</p>
              <div className="mt-3 flex items-center gap-1.5">
                {selected.items.map((it) => {
                  const dot =
                    it.type === 'red' ? 'bg-rose-300'
                    : it.type === 'green' ? 'bg-emerald-300'
                    : it.type === 'yellow' ? 'bg-amber-300'
                    : it.type === 'blue' ? 'bg-sky-300'
                    : 'bg-stone-300';
                  return <span key={it.id} className={`h-1.5 w-1.5 rounded-full ${dot}`} />;
                })}
              </div>
              {selected.reflections.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 border-t border-stone-100 pt-3">
                  {selected.reflections.slice(0, 4).map((r, i) => (
                    <p key={i} className="text-[12px] font-light italic text-stone-500">— {r}</p>
                  ))}
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                aria-label="close"
                className="absolute right-3 top-3 h-6 w-6 rounded-full text-stone-400"
              >
                ×
              </button>
            </>
          )}
        </div>
      </Motion.div>

      {/* Back */}
      <div className="absolute bottom-10 left-1/2 z-30 -translate-x-1/2">
        <button
          onClick={() => navigate(-1)}
          aria-label="back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-500 backdrop-blur-md"
        >
          <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </Motion.div>
  );
}

function TreeCanvas({
  routes,
  onLeafTap,
}: {
  routes: SavedRoute[];
  onLeafTap: (r: SavedRoute) => void;
}) {
  const W = 320;
  const H = 600;
  const trunkX = W / 2;
  const trunkBottom = H - 40;
  const trunkTop = 80;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMax meet">
      {/* ground line */}
      <line x1="40" y1={trunkBottom} x2={W - 40} y2={trunkBottom} stroke="#d6d3d1" strokeWidth="0.6" />

      {/* trunk */}
      <Motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        d={`M ${trunkX} ${trunkBottom} L ${trunkX} ${trunkTop}`}
        stroke="#78716c"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* branches per route */}
      {routes.map((route, i) => {
        const t = routes.length === 1 ? 0.5 : i / Math.max(routes.length - 1, 1);
        const branchY = trunkBottom - 60 - t * (trunkBottom - trunkTop - 80);
        const side = i % 2 === 0 ? -1 : 1;
        const length = 60 + Math.min(route.items.length * 4, 40);
        const endX = trunkX + side * length;
        const endY = branchY - 20 - Math.min(route.uses, 6) * 4;

        return (
          <g key={route.id}>
            <Motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 + i * 0.15 }}
              d={`M ${trunkX} ${branchY} Q ${trunkX + side * 30} ${branchY - 10}, ${endX} ${endY}`}
              stroke="#a8a29e"
              strokeWidth="1"
              strokeLinecap="round"
              fill="none"
            />
            {/* leaves: one per use, plus one per reflection */}
            {Array.from({ length: Math.max(route.uses, 1) }).map((_, j) => {
              const offsetT = (j + 1) / (Math.max(route.uses, 1) + 1);
              const lx = trunkX + side * (length * offsetT) + side * 6;
              const ly = endY + (1 - offsetT) * 14 - 4;
              const hasReflection = j < route.reflections.length;
              return (
                <Motion.circle
                  key={j}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.15 + j * 0.08, type: 'spring', stiffness: 280, damping: 18 }}
                  cx={lx}
                  cy={ly}
                  r={hasReflection ? 3.5 : 2.5}
                  fill={hasReflection ? '#86efac' : '#d4d4d4'}
                  stroke={hasReflection ? '#4ade80' : '#a8a29e'}
                  strokeWidth="0.4"
                  className="cursor-pointer"
                  onClick={() => onLeafTap(route)}
                />
              );
            })}
            {/* note tag */}
            <foreignObject
              x={side === -1 ? endX - 110 : endX + 4}
              y={endY - 8}
              width="110"
              height="20"
            >
              <div
                onClick={() => onLeafTap(route)}
                className="cursor-pointer truncate text-[8px] font-light italic text-stone-500"
                style={{ textAlign: side === -1 ? 'right' : 'left' }}
              >
                "{route.note}"
              </div>
            </foreignObject>
          </g>
        );
      })}

      {/* roots */}
      <path
        d={`M ${trunkX} ${trunkBottom} C ${trunkX - 20} ${trunkBottom + 8}, ${trunkX - 40} ${trunkBottom + 4}, ${trunkX - 60} ${trunkBottom + 12}`}
        stroke="#a8a29e"
        strokeWidth="0.6"
        fill="none"
      />
      <path
        d={`M ${trunkX} ${trunkBottom} C ${trunkX + 20} ${trunkBottom + 8}, ${trunkX + 40} ${trunkBottom + 4}, ${trunkX + 60} ${trunkBottom + 12}`}
        stroke="#a8a29e"
        strokeWidth="0.6"
        fill="none"
      />

      {routes.length === 0 && (
        <text
          x={trunkX}
          y={trunkTop + 30}
          textAnchor="middle"
          fontSize="10"
          fill="#a8a29e"
          fontStyle="italic"
        >
          no branches yet
        </text>
      )}
    </svg>
  );
}
