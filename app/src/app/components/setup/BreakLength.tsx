import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../../context/AppContext';
import { PullSelect } from '../PullSelect';
import { SetupStep } from './SetupStep';

const OPTIONS = ['5 min', '10 min', '15 min'];

export function BreakLength() {
  const { routine, setRoutine } = useAppContext();
  const navigate = useNavigate();

  const choose = (label: string) => {
    const minutes = parseInt(label, 10) || 10;
    setRoutine({ ...routine, breakMinutes: minutes });
    navigate('/setup/mode');
  };

  return (
    <SetupStep
      step={4}
      total={5}
      badge="🍪"
      title="How long should your breaks be?"
    >
      <PullSelect items={OPTIONS} onSelect={choose} spacing={68} />
    </SetupStep>
  );
}
