import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion, AnimatePresence } from './Motion';
import { PullSelect } from './PullSelect';

const PRESETS = [
  { label: '5 min',  minutes: 5  },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
];

const MORE_LABEL = 'more';
const LABELS = [...PRESETS.map((p) => p.label), MORE_LABEL];

export function Pace() {
  const { setPace, setPaceMinutes } = useAppContext();
  const navigate = useNavigate();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState(30);

  const commit = (label: string, minutes: number) => {
    setPace(label);
    setPaceMinutes(minutes);
    navigate('/note');
  };

  const choose = (label: string) => {
    if (label === MORE_LABEL) {
      setCustomOpen(true);
      return;
    }
    const preset = PRESETS.find((p) => p.label === label);
    if (!preset) return;
    commit(preset.label, preset.minutes);
  };

  const confirmCustom = () => {
    const n = Math.max(1, Math.min(240, Math.round(customValue)));
    commit(`${n} min`, n);
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-center justify-center"
    >
      <p className="mb-3 max-w-[260px] px-8 text-center text-[15px] font-extralight leading-snug text-stone-700">
        How long can you usually focus?
      </p>
      <span className="mb-8 text-[11px] font-light italic text-stone-400">
        No perfect number. Just your pace tonight.
      </span>

      <PullSelect items={LABELS} onSelect={choose} spacing={72} />

      <AnimatePresence>
        {customOpen && (
          <Motion.div
            key="custom-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setCustomOpen(false)}
          >
            <Motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="mx-6 w-[260px] rounded-3xl border border-black/10 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-[11px] font-light tracking-[0.18em] uppercase text-stone-400">
                Set your pace
              </p>

              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setCustomValue((v) => Math.max(1, v - 5))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition active:scale-95 hover:border-stone-400"
                >
                  −
                </button>
                <div className="flex items-baseline gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={240}
                    value={customValue}
                    onChange={(e) => setCustomValue(Number(e.target.value) || 0)}
                    className="w-[70px] bg-transparent text-center font-serif text-[40px] italic leading-none text-stone-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-[13px] font-light text-stone-400">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomValue((v) => Math.min(240, v + 5))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition active:scale-95 hover:border-stone-400"
                >
                  +
                </button>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="flex-1 rounded-2xl py-3 text-[13px] font-light text-stone-500 transition active:scale-95 hover:text-stone-800"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCustom}
                  className="flex-1 rounded-2xl bg-stone-900 py-3 text-[13px] font-light text-white transition active:scale-95"
                >
                  set
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
