import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Motion } from './Motion';
import { PullSelect } from './PullSelect';

const OPTIONS = ['Not much', 'A little', 'Enough', "I'm not sure"];

export function Ownership() {
  const { setOwnership } = useAppContext();
  const navigate = useNavigate();

  const choose = (v: string) => {
    setOwnership(v);
    navigate('/pace');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full flex-col items-center justify-center"
    >
      <p className="mb-10 max-w-[260px] px-8 text-center text-[18px] font-extralight leading-snug text-stone-700">
        How much of this time feels like it belongs to you?
      </p>

      <PullSelect items={OPTIONS} onSelect={choose} spacing={82} />
    </Motion.div>
  );
}
