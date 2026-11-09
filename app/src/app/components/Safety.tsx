import { useNavigate } from 'react-router';
import { DoorOpen, EyeOff, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';

const POINTS = [
  {
    Icon: Shield,
    title: 'This visit stays here',
    text: 'Your name and plan live only in this open page. Closing it clears them.',
  },
  {
    Icon: DoorOpen,
    title: 'You can leave',
    text: 'Nothing is graded, and stopping is allowed. There is no punishment for a short visit.',
  },
  {
    Icon: EyeOff,
    title: 'Your screen stays yours',
    text: 'The room can show that people are studying. It does not show what is on your phone.',
  },
];

/**
 * Safety — the front door. Three honest reassurances, then the welcome.
 */
export function Safety() {
  const navigate = useNavigate();
  const { setHasSeenSafety } = useAppContext();

  const comeIn = () => {
    setHasSeenSafety(true);
    navigate('/welcome');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col px-7 pb-8 pt-6"
    >
      <p className="text-[11px] font-semibold tracking-[0.22em] text-stone-400">BEFORE YOU COME IN</p>
      <h1 className="serif-display mt-3 text-[40px] leading-none text-stone-800">A safe room.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
        Pull It is a quiet place to start homework. Read this once, then come in when you want.
      </p>

      <ul className="mt-7 flex flex-col gap-3">
        {POINTS.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-2xl bg-white/70 px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F0E4] text-[#3a4a38]">
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold leading-tight text-stone-800">{title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-stone-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={comeIn}
        className="mt-auto rounded-full bg-[#3a4a38] px-5 py-3.5 text-[15px] font-semibold text-[#f4f1ea] active:opacity-80"
      >
        Come in
      </button>
    </Motion.div>
  );
}
