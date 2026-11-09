import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LoFiFrame, LoFiBtn, INK, MUTED, LINE, CARD, PAPER } from './LoFiShell';

const STEPS = [
  {
    title: 'When do you usually start homework?',
    options: ['3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', 'Later'],
  },
  {
    title: 'What are you working on today?',
    options: ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'Reading', 'Other'],
    multi: true,
  },
  {
    title: 'How long do you want to focus?',
    options: ['15 min', '20 min', '25 min', '30 min', '45 min'],
  },
  {
    title: 'How long should your breaks be?',
    options: ['5 min', '10 min', '15 min'],
  },
  {
    title: 'Study by yourself or with friends?',
    options: ['Study Together', 'Study Alone'],
  },
] as const;

/**
 * Lofi wireframe of the 5-step routine setup wizard.
 */
export function LoFiSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const current = STEPS[step];
  const total = STEPS.length;
  const isMulti = 'multi' in current && current.multi;

  const goBack = () => {
    if (step === 0) navigate('/lofi-login');
    else {
      setStep(step - 1);
      setPicked([]);
    }
  };

  const select = (opt: string) => {
    if (isMulti) {
      setPicked((prev) =>
        prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt],
      );
      return;
    }
    if (step < total - 1) {
      setStep(step + 1);
      setPicked([]);
    } else {
      navigate('/lofi-routine');
    }
  };

  const continueMulti = () => {
    if (picked.length === 0) return;
    setStep(step + 1);
    setPicked([]);
  };

  return (
    <LoFiFrame>
      <div className="relative z-10 flex h-full w-full flex-col px-6 pt-5">
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ border: `1px solid ${LINE}`, background: CARD }}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: CARD, border: `1px solid ${LINE}`, color: MUTED }}
          >
            Step {step + 1} of {total}
          </span>
          <span className="h-9 w-9" aria-hidden />
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: LINE }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%`, background: INK }}
          />
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-[18px] font-semibold leading-snug">{current.title}</h2>
        </div>

        <div className="mt-6 flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
          {current.options.map((opt) => {
            const selected = picked.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => select(opt)}
                className="rounded-[16px] px-4 py-3.5 text-left text-[14px] font-medium transition active:scale-[0.98]"
                style={{
                  background: selected ? INK : CARD,
                  color: selected ? PAPER : INK,
                  border: `1px solid ${selected ? INK : LINE}`,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {isMulti && (
          <div className="pb-8">
            <LoFiBtn className="w-full" disabled={picked.length === 0} onClick={continueMulti}>
              {picked.length > 0 ? `Got it — ${picked.length}` : 'Pick at least one'}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </LoFiBtn>
          </div>
        )}
      </div>
    </LoFiFrame>
  );
}
