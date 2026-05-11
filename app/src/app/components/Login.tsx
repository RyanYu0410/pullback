import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { ArrowRight, ChevronLeft } from 'lucide-react';

const AVATARS = [
  '🐶', '🐱', '🦊',
  '🐼', '🐰', '🐯',
  '🐨', '🐧', '🦁',
  '🦄', '🐸', '🐺',
];

/**
 * Login — a contemplative two-question form.
 * Editorial typography (serif headlines), breathing-room spacing,
 * and one big preview emoji floating above the page acting as the
 * compositional anchor.
 */
export function Login() {
  const navigate = useNavigate();
  const { setHasLoggedIn, setUserName, setUserEmoji, hasRoutine } = useAppContext();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🐶');

  const canContinue = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canContinue) return;
    setUserName(name.trim());
    setUserEmoji(avatar);
    setHasLoggedIn(true);
    navigate(hasRoutine ? '/routine' : '/setup/start-time');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="no-scrollbar flex h-full w-full flex-col overflow-y-auto"
    >
      {/* Top bar — back + step indicator */}
      <div className="flex items-center justify-between px-5 pt-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="icon-btn-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <span className="text-[11px] font-semibold tracking-[0.2em] text-stone-400 time-num">
          1 / 2
        </span>
        <span className="h-8 w-8" aria-hidden />
      </div>

      {/* Floating avatar preview — the page's compositional anchor */}
      <Motion.div
        key={avatar}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        className="mt-4 flex justify-center"
      >
        <span className="text-[64px] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          {avatar}
        </span>
      </Motion.div>

      {/* Question 1 — name */}
      <div className="mt-7 px-7">
        <p className="text-[22px] font-bold leading-tight tracking-tight text-stone-800">
          What should we call you?
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="your name"
          maxLength={24}
          autoFocus
          className="
            mt-4 w-full border-0 border-b border-stone-300 bg-transparent
            pb-2 text-[20px] font-semibold text-stone-800
            placeholder:font-medium placeholder:text-stone-300
            outline-none transition-colors duration-200
            focus:border-rose-400
          "
        />
      </div>

      {/* Question 2 — avatar */}
      <div className="mt-10 px-7">
        <div className="mt-0 grid grid-cols-3 gap-3">
          {AVATARS.map((emoji) => {
            const selected = avatar === emoji;
            return (
              <Motion.button
                key={emoji}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAvatar(emoji)}
                aria-label={`Pick ${emoji}`}
                aria-pressed={selected}
                className={[
                  'flex h-14 w-full items-center justify-center rounded-2xl text-[26px] transition-all duration-200',
                  selected
                    ? 'bg-rose-50 ring-1 ring-rose-300'
                    : 'bg-transparent ring-1 ring-stone-200/70 hover:bg-white/60',
                ].join(' ')}
              >
                {emoji}
              </Motion.button>
            );
          })}
        </div>
      </div>

      {/* Spacer pushes the CTA toward the bottom */}
      <div className="flex-1" />

      {/* CTA — one button, calmly placed */}
      <div className="px-7 pb-8 pt-8">
        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="btn-soft btn-primary w-full disabled:cursor-not-allowed disabled:opacity-30"
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </Motion.div>
  );
}
