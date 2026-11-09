import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { LoFiFrame, LoFiBack, LoFiBtn, INK, MUTED, LINE, CARD } from './LoFiShell';

const AVATARS = ['🐶', '🐱', '🦊', '🐼', '🐰', '🐯', '🐨', '🐧', '🦁'];

/**
 * Lofi wireframe of Login — name + avatar picker.
 */
export function LoFiLogin() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🐶');
  const canContinue = name.trim().length > 0;

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col overflow-y-auto">
        <header className="flex items-center justify-between px-6 pt-5">
          <LoFiBack to="/lofi-welcome" />
          <span className="text-[11px] font-semibold tracking-[0.2em]" style={{ color: MUTED }}>
            1 / 2
          </span>
          <span className="h-9 w-9" aria-hidden />
        </header>

        <div className="mt-6 flex justify-center">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full text-[40px]"
            style={{ border: `1.5px dashed ${LINE}`, background: CARD }}
          >
            {avatar}
          </span>
        </div>

        <div className="mt-8 px-7">
          <p className="text-[18px] font-semibold leading-tight">What should we call you?</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            maxLength={24}
            className="mt-4 w-full border-0 border-b bg-transparent pb-2 text-[18px] font-medium outline-none"
            style={{ borderColor: LINE, color: INK }}
          />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 px-7">
          {AVATARS.map((emoji) => {
            const selected = avatar === emoji;
            return (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                aria-pressed={selected}
                className="flex h-14 items-center justify-center rounded-2xl text-[24px] transition active:scale-95"
                style={{
                  background: CARD,
                  border: selected ? `1.5px solid ${INK}` : `1px solid ${LINE}`,
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <div className="mt-auto px-7 pb-8 pt-8">
          <LoFiBtn
            className="w-full"
            disabled={!canContinue}
            onClick={() => navigate('/lofi-setup')}
          >
            Continue
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </LoFiBtn>
        </div>
      </div>
    </LoFiFrame>
  );
}
