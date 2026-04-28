import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { ArrowRight } from 'lucide-react';
import { TreeAnchor } from './Tree';

export function Note() {
  const { setNote } = useAppContext();
  const navigate = useNavigate();
  const [localNote, setLocalNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localNote.trim()) return;
    setNote(localNote);
    navigate('/build');
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex h-full flex-col px-8"
    >
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-6 flex flex-col items-center">
          <TreeAnchor rope />
          <p className="mt-3 max-w-[240px] text-center text-[15px] font-extralight leading-snug text-stone-700">
            What do you want to focus?
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            placeholder="one small thing"
            className="w-full border-b border-stone-300 bg-transparent px-2 py-4 text-xl font-light text-stone-800 placeholder-stone-400 focus:border-stone-800 focus:outline-none"
            autoFocus
          />
          
          <Motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: localNote.trim() ? 1 : 0 }}
            disabled={!localNote.trim()}
            type="submit"
            className="self-end rounded-full bg-stone-800 p-4 text-white shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none"
          >
            <ArrowRight size={20} strokeWidth={1.5} />
          </Motion.button>

          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
            {['reply and leave', 'start homework', "don't look at tiktok", 'keep the first 20 minutes'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setLocalNote(ex)}
                className="rounded-full border border-stone-200 bg-white/60 px-3 py-1 text-[11px] font-light italic text-stone-400 transition active:scale-95 hover:text-stone-600"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      </div>
    </Motion.div>
  );
}
