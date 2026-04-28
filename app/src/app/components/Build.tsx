import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, CardType } from '../context/AppContext';
import { Motion } from './Motion';
import { Reorder } from 'motion/react';
import { Check, X, GripVertical } from 'lucide-react';
import { PRESETS } from './presets';

const availableCards: { type: CardType; label: string; color: string }[] = [
  { type: 'app', label: 'Instagram', color: 'bg-stone-50' },
  { type: 'app', label: 'TikTok', color: 'bg-stone-50' },
  { type: 'red', label: 'Pull', color: 'bg-rose-50' },
  { type: 'green', label: 'Steady', color: 'bg-emerald-50' },
  { type: 'yellow', label: 'Pause', color: 'bg-amber-50' },
  { type: 'blue', label: 'Return', color: 'bg-sky-50' },
  { type: 'white', label: 'Note', color: 'bg-white' },
];

function EditableLabel({
  value,
  onChange,
  editing,
  onStartEdit,
  onCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') onCommit();
        }}
        maxLength={24}
        size={Math.max(value.length, 4)}
        className="w-auto bg-transparent text-sm font-light text-stone-700 outline-none border-b border-stone-300 focus:border-stone-700"
      />
    );
  }
  return (
    <span
      onClick={onStartEdit}
      className="cursor-text text-sm font-light text-stone-700 whitespace-nowrap"
    >
      {value}
    </span>
  );
}

export function Build() {
  const {
    note,
    routeItems,
    addRouteItem,
    removeRouteItem,
    updateRouteItemLabel,
    reorderRouteItems,
    paceMinutes,
    widgetPreset,
  } = useAppContext();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedDef = PRESETS.find((p) => p.id === widgetPreset) ?? PRESETS[0];
  const paceLabel = paceMinutes != null
    ? `${paceMinutes} min · ${selectedDef.label}`
    : 'place along the line · tap to rename';

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col"
    >
      <div className="px-8 pt-6 pb-2 flex flex-col items-center gap-2">
        <span className="text-[10px] font-light tracking-[0.25em] text-stone-400 uppercase">
          tonight's note
        </span>
        <div className="rounded-2xl border border-stone-200 bg-white/80 px-5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <p className="text-[13px] font-light italic text-stone-700">"{note}"</p>
        </div>
        <span className="mt-1 text-[10px] font-light tracking-[0.25em] text-stone-400 uppercase">
          {paceLabel}
        </span>
      </div>

      <div className="relative flex-1 overflow-y-auto no-scrollbar pb-[140px]">
        {/* Centre spine */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 bg-stone-300 pointer-events-none" />

        {routeItems.length === 0 ? (
          <div className="flex justify-center py-12">
            <span className="h-1 w-10 rounded-full bg-stone-200" />
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={routeItems}
            onReorder={reorderRouteItems}
            className="relative flex flex-col gap-10 py-8 w-full list-none"
          >
            {routeItems.map((item, index) => {
              const cardDef = availableCards.find((c) => c.type === item.type);
              const isEven = index % 2 === 0;
              const editing = editingId === item.id;

              return (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="relative flex w-full cursor-grab active:cursor-grabbing"
                  whileDrag={{ scale: 1.03, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                >
                  <div className="flex w-1/2 justify-end pr-8 relative">
                    {isEven && (
                      <div
                        className={`group relative flex items-center gap-2 rounded-2xl border border-stone-200 px-3 py-3 shadow-sm z-10 ${
                          cardDef?.color || 'bg-white'
                        }`}
                      >
                        <GripVertical className="h-3 w-3 shrink-0 text-stone-300" strokeWidth={1.5} />
                        <EditableLabel
                          value={item.label}
                          onChange={(v) => updateRouteItemLabel(item.id, v)}
                          editing={editing}
                          onStartEdit={() => setEditingId(item.id)}
                          onCommit={() => {
                            if (!item.label.trim()) updateRouteItemLabel(item.id, cardDef?.label || 'note');
                            setEditingId(null);
                          }}
                        />
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeRouteItem(item.id); }}
                          aria-label="remove"
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-stone-300 opacity-60 transition hover:bg-stone-100 hover:text-stone-500 hover:opacity-100"
                        >
                          <X className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        <div className="absolute top-1/2 right-[-2rem] h-[1px] w-8 bg-stone-300" />
                        <div className="absolute top-1/2 right-[-2rem] h-1.5 w-1.5 -mt-[3px] translate-x-1/2 rounded-full bg-stone-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex w-1/2 justify-start pl-8 relative">
                    {!isEven && (
                      <div
                        className={`group relative flex items-center gap-2 rounded-2xl border border-stone-200 px-3 py-3 shadow-sm z-10 ${
                          cardDef?.color || 'bg-white'
                        }`}
                      >
                        <GripVertical className="h-3 w-3 shrink-0 text-stone-300" strokeWidth={1.5} />
                        <EditableLabel
                          value={item.label}
                          onChange={(v) => updateRouteItemLabel(item.id, v)}
                          editing={editing}
                          onStartEdit={() => setEditingId(item.id)}
                          onCommit={() => {
                            if (!item.label.trim()) updateRouteItemLabel(item.id, cardDef?.label || 'note');
                            setEditingId(null);
                          }}
                        />
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeRouteItem(item.id); }}
                          aria-label="remove"
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-stone-300 opacity-60 transition hover:bg-stone-100 hover:text-stone-500 hover:opacity-100"
                        >
                          <X className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        <div className="absolute top-1/2 left-[-2rem] h-[1px] w-8 bg-stone-300" />
                        <div className="absolute top-1/2 left-[-2rem] h-1.5 w-1.5 -mt-[3px] -translate-x-1/2 rounded-full bg-stone-400" />
                      </div>
                    )}
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex flex-col border-t border-stone-200 bg-white/80 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        {/* Card picker — horizontally scrollable with a right-fade hint */}
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 py-4 pb-2">
            {/* User's own task — always first */}
            {note && (
              <button
                onClick={() => addRouteItem({ type: 'white', label: note.split(/\s+/).slice(0, 4).join(' ') })}
                aria-label="add your task"
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-transform active:scale-95"
              >
                <span className="h-2 w-2 rounded-full bg-stone-700 shrink-0" />
                <span className="max-w-[96px] break-words text-[11px] font-light leading-snug text-stone-700">
                  {note}
                </span>
              </button>
            )}
            {availableCards.map((card) => {
              const dot =
                card.type === 'red' ? 'bg-rose-300'
                : card.type === 'green' ? 'bg-emerald-300'
                : card.type === 'yellow' ? 'bg-amber-300'
                : card.type === 'blue' ? 'bg-sky-300'
                : 'bg-stone-300';
              return (
                <button
                  key={card.label}
                  onClick={() => addRouteItem({ type: card.type, label: card.label })}
                  aria-label={card.label}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-transform active:scale-95 ${card.color}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                </button>
              );
            })}
          </div>
          {/* Scroll-fade hint on the right edge */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white/90 to-transparent" />
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={() => navigate('/pull')}
            disabled={routeItems.length === 0}
            aria-label="confirm"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-800 py-4 text-white transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
          >
            <Check size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </Motion.div>
  );
}

