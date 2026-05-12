import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Trash2, Share2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext, isDarkBg, type BgStyle, type SavedRoute } from '../context/AppContext';

/* ── Tone palette (mirrors Tree.tsx) ── */
const TONE_COLOR: Record<string, { flower: string; deep: string }> = {
  mint:     { flower: '#a8e6cf', deep: '#7ed4ae' },
  peach:    { flower: '#ffb39b', deep: '#ff9a7a' },
  sun:      { flower: '#ffe07a', deep: '#ffc24a' },
  lavender: { flower: '#d6c8ff', deep: '#b6a4f5' },
  sky:      { flower: '#aee1f9', deep: '#8ec8e9' },
  coral:    { flower: '#ff9aa2', deep: '#ee7a86' },
  leaf:     { flower: '#cfeacd', deep: '#8edc9c' },
};
const TONES = Object.keys(TONE_COLOR);

function toneFor(route: SavedRoute): string {
  const text = (route.name + ' ' + route.note + ' ' + (route.items?.map(i => i.label ?? '').join(' '))).toLowerCase();
  if (/math|算/.test(text))                             return 'coral';
  if (/sci|phys|chem|bio|物理|生物/.test(text))         return 'mint';
  if (/eng|write|essay|read|文学/.test(text))          return 'lavender';
  if (/hist|social|geog|geo|政/.test(text))            return 'sky';
  if (/art|music|draw|design|创/.test(text))           return 'peach';
  if (/lang|french|spanish|japan|中文|语/.test(text))  return 'sun';
  return TONES[Math.abs(route.id.charCodeAt(0) % TONES.length)];
}

/* ── Small flower SVG used inside the bouquet ── */
function FlowerDot({ tone, size = 28 }: { tone: string; size?: number }) {
  const c = TONE_COLOR[tone] ?? TONE_COLOR.mint;
  const r = size / 2;
  const pr = r * 0.36;
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {angles.map(a => {
        const rad = (a * Math.PI) / 180;
        const px = r + Math.cos(rad) * pr * 1.05;
        const py = r + Math.sin(rad) * pr * 1.05;
        return <circle key={a} cx={px} cy={py} r={pr} fill={c.flower} />;
      })}
      <circle cx={r} cy={r} r={pr * 0.72} fill={c.deep} />
    </svg>
  );
}

/* ── Bouquet sheet ── */
function BouquetSheet({
  routes,
  onClose,
}: {
  routes: SavedRoute[];
  onClose: () => void;
}) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const text = `🌸 My study garden has ${routes.length} blooms!\nGrown one session at a time 🌱`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Study Bouquet', text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* cancelled */ }
  };

  /* Group flowers by tone for a rainbow layout */
  const grouped = routes.reduce<Record<string, SavedRoute[]>>((acc, r) => {
    const t = toneFor(r);
    (acc[t] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        style={{
          width: '100%', borderRadius: '28px 28px 0 0',
          background: 'rgba(255,252,245,0.98)', backdropFilter: 'blur(20px)',
          padding: '0 0 36px', maxHeight: '82vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca29a' }}>
              Your garden
            </span>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#3a3c38', marginTop: 2, letterSpacing: '-0.01em' }}>
              🌸 Bouquet
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleShare}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: shared ? '#34d399' : '#f0fdf4',
                border: '1px solid', borderColor: shared ? '#34d399' : '#bbf7d0',
                borderRadius: 20, padding: '7px 14px',
                fontSize: 12, fontWeight: 700, color: shared ? '#fff' : '#16a34a',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <Share2 size={13} strokeWidth={2.2} />
              {shared ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                background: 'rgba(0,0,0,0.06)', color: '#9ca29a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 14px' }}>
          {[
            { label: 'blooms', value: routes.length },
            { label: 'colours', value: Object.keys(grouped).length },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(0,0,0,0.04)', borderRadius: 14,
              padding: '6px 14px', textAlign: 'center',
            }}>
              <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: '#3a3c38' }}>{s.value}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca29a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Flower grid — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px 0' }}>
          {routes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca29a', fontSize: 13, padding: '24px 0' }}>
              No blooms yet — finish a session to grow your first flower 🌱
            </p>
          ) : (
            Object.entries(grouped).map(([tone, list]) => (
              <div key={tone} style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: TONE_COLOR[tone]?.deep ?? '#9ca29a', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                  {tone}  ·  {list.length}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {list.map(r => (
                    <div key={r.id} title={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <FlowerDot tone={tone} size={32} />
                      <span style={{ fontSize: 9, color: '#b5b0a8', maxWidth: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {r.name || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface BgOption {
  id:           BgStyle;
  label:        string;
  canvasColor:  string;
  accentColor:  string;
  isDark:       boolean;
}

const BG_OPTIONS: BgOption[] = [
  { id: 'honey',  label: 'Honey',  canvasColor: '#FFF8EE', accentColor: '#FF7E9D', isDark: false },
  { id: 'clay',   label: 'Clay',   canvasColor: '#FFE6D2', accentColor: '#FF9C7A', isDark: false },
  { id: 'iris',   label: 'Iris',   canvasColor: '#F4EEFF', accentColor: '#B6A4F5', isDark: false },
  { id: 'steel',  label: 'Steel',  canvasColor: '#E5EEF2', accentColor: '#7BB7C8', isDark: false },
  { id: 'cosmos', label: 'Cosmos', canvasColor: '#1A1F35', accentColor: '#8B9BFF', isDark: true  },
  { id: 'void',   label: 'Void',   canvasColor: '#0A0B0A', accentColor: '#BFFF00', isDark: true  },
];

export function Settings() {
  const navigate = useNavigate();
  const { bgStyle, setBgStyle, savedRoutes, clearSavedRoutes, routine } = useAppContext();
  const [habitsExpanded, setHabitsExpanded] = useState(false);
  const [gardenExpanded, setGardenExpanded] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [showBouquet, setShowBouquet] = useState(false);
  const bloomCount = savedRoutes.length;
  const dark = isDarkBg(bgStyle);

  /* ── Semantic colour tokens resolved from theme ── */
  const bg        = dark ? 'transparent'               : 'transparent';
  const textMain  = dark ? 'text-white/90'             : 'text-stone-800';
  const textSub   = dark ? 'text-white/40'             : 'text-stone-400';
  const cardBg    = dark ? 'rgba(255,255,255,0.08)'    : 'rgba(255,255,255,0.85)';
  const cardBorder= dark ? 'rgba(255,255,255,0.10)'    : 'rgba(0,0,0,0.04)';
  const cardRowDiv= dark ? 'border-white/10'           : 'border-stone-100';
  const btnBg     = dark ? 'rgba(255,255,255,0.10)'    : 'rgba(244,244,240,0.9)';
  const btnColor  = dark ? 'text-white/70'             : 'text-stone-500';
  const chevColor = dark ? 'text-white/25'             : 'text-stone-300';
  const rowTitle  = dark ? 'text-white/90'             : 'text-stone-800';
  const rowSub    = dark ? 'text-white/40'             : 'text-stone-400';

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-y-auto no-scrollbar pb-24"
      style={{ background: bg }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-1">
        <span className="h-8 w-[6px] flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${textSub}`}>
            Preferences
          </span>
          <h2 className={`text-[20px] font-bold leading-tight tracking-tight ${textMain}`}>
            Settings
          </h2>
        </div>
        <span className="h-8 w-8" aria-hidden />
      </div>

      {/* ── Your Routine ── */}
      <div className="px-5 pt-5">
        <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${textSub}`}>
          Your routine
        </p>
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', backdropFilter: 'blur(8px)' }}
        >
          {/* Row 1 — My Habits (expandable: current habits + edit button) */}
          <button
            onClick={() => setHabitsExpanded(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition active:opacity-60 active:scale-[0.99]"
          >
            <span className="flex flex-col">
              <span className={`text-[14px] font-semibold ${rowTitle}`}>My Habits</span>
              <span className={`mt-0.5 text-[11px] ${rowSub}`}>
                {routine.subjects.length > 0
                  ? `${routine.subjects.length} subject${routine.subjects.length > 1 ? 's' : ''} · ${routine.focusMinutes}m focus`
                  : 'Growth & focus trends over time'}
              </span>
            </span>
            <motion.span
              animate={{ rotate: habitsExpanded ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${chevColor}`} strokeWidth={2} />
            </motion.span>
          </button>

          {habitsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="overflow-hidden"
            >
              <div className={`border-t ${cardRowDiv} px-4 py-3 flex flex-col gap-2`}>
                {/* Habit stat chips */}
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-xl px-3 py-1 text-[12px] font-semibold ${rowSub}`}
                    style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                    🕐 Starts {routine.startTime}
                  </span>
                  <span className={`rounded-xl px-3 py-1 text-[12px] font-semibold ${rowSub}`}
                    style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                    ⏱ {routine.focusMinutes}m focus
                  </span>
                  <span className={`rounded-xl px-3 py-1 text-[12px] font-semibold ${rowSub}`}
                    style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                    ☕ {routine.breakMinutes}m break
                  </span>
                </div>
                {/* Subjects */}
                {routine.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {routine.subjects.map(s => (
                      <span key={s}
                        className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${rowTitle}`}
                        style={{ background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={`text-[12px] ${rowSub}`}>No subjects set yet.</span>
                )}
                {/* Edit button */}
                <button
                  onClick={() => navigate('/setup/start-time')}
                  className={`self-end rounded-xl px-4 py-1.5 text-[12px] font-semibold transition active:scale-95 ${rowTitle}`}
                  style={{ background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)' }}
                >
                  Edit habit →
                </button>
              </div>
            </motion.div>
          )}

          {/* Row 2 — My Garden (expandable: bloom count + wipe) */}
          <div className={`border-t ${cardRowDiv}`}>
            <button
              onClick={() => { setGardenExpanded(v => !v); setWipeConfirm(false); }}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition active:opacity-60 active:scale-[0.99]"
            >
              <span className="flex flex-col">
                <span className={`text-[14px] font-semibold ${rowTitle}`}>My Garden</span>
                <span className={`mt-0.5 text-[11px] ${rowSub}`}>
                  {bloomCount} {bloomCount === 1 ? 'bloom' : 'blooms'} · streak calendar &amp; growth
                </span>
              </span>
              <motion.span
                animate={{ rotate: gardenExpanded ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <ChevronRight className={`h-4 w-4 flex-shrink-0 ${chevColor}`} strokeWidth={2} />
              </motion.span>
            </button>

            {/* Expanded: view garden + wipe */}
            {gardenExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                className="overflow-hidden"
              >
                <div className={`border-t ${cardRowDiv} px-4 py-3 flex items-center justify-between gap-3`}>
                  <button
                    onClick={() => setShowBouquet(true)}
                    className={`text-[13px] font-semibold transition active:opacity-60 ${rowTitle}`}
                  >
                    View bouquet 🌸
                  </button>
                  {!wipeConfirm ? (
                    <button
                      onClick={() => setWipeConfirm(true)}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition active:scale-95"
                      style={{ background: dark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#ef4444' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Wipe all plants
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium ${rowSub}`}>Remove {bloomCount} blooms?</span>
                      <button
                        onClick={() => { clearSavedRoutes(); setWipeConfirm(false); setGardenExpanded(false); }}
                        className="rounded-xl px-3 py-1.5 text-[12px] font-bold transition active:scale-95"
                        style={{ background: '#ef4444', color: '#fff' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setWipeConfirm(false)}
                        className={`text-[12px] font-semibold transition active:opacity-60 ${rowSub}`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Row 3 — Group History */}
          <button
            onClick={() => navigate('/log')}
            className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition active:opacity-60 active:scale-[0.99] border-t ${cardRowDiv}`}
          >
            <span className="flex flex-col">
              <span className={`text-[14px] font-semibold ${rowTitle}`}>Group History</span>
              <span className={`mt-0.5 text-[11px] ${rowSub}`}>Shared session log with your room</span>
            </span>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 ${chevColor}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Room vibe ── */}
      <div className="px-5 pt-7">
        <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${textSub}`}>
          Room vibe
        </p>
        <p className={`mb-3 text-[12px] leading-relaxed ${textSub}`}>
          Pick a background — it's only colour.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {BG_OPTIONS.map((opt) => {
            const active = bgStyle === opt.id;
            return (
              <motion.button
                key={opt.id}
                onClick={() => setBgStyle(opt.id)}
                whileTap={{ scale: 0.95 }}
                className="relative flex h-20 flex-col justify-end overflow-hidden rounded-2xl text-left"
                style={{
                  backgroundColor: opt.canvasColor,
                  boxShadow: active
                    ? `0 0 0 2px ${opt.accentColor}`
                    : '0 0 0 1px rgba(0,0,0,0.06)',
                }}
              >
                {/* Accent glow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 70% 70%, ${opt.accentColor}50 0%, transparent 60%)`,
                  }}
                />
                {/* Active check */}
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: opt.accentColor, color: opt.isDark ? '#0a0b0a' : '#fff8ee' }}
                  >
                    ✓
                  </motion.span>
                )}
                <p
                  className="relative px-2.5 py-1.5 text-[11px] font-bold tracking-wide"
                  style={{ color: opt.isDark ? 'rgba(255,255,255,0.85)' : '#3a3c38' }}
                >
                  {opt.label}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bouquet sheet */}
      <AnimatePresence>
        {showBouquet && (
          <BouquetSheet routes={savedRoutes} onClose={() => setShowBouquet(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
