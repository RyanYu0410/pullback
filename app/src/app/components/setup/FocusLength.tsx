import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../../context/AppContext';
import { PullSelect } from '../PullSelect';
import { SetupStep } from './SetupStep';

const OPTIONS = ['15 min', '20 min', '25 min', '30 min', '45 min'];

export function FocusLength() {
  const { routine, setRoutine } = useAppContext();
  const navigate = useNavigate();

  const choose = (label: string) => {
    const minutes = parseInt(label, 10) || 25;
    setRoutine({ ...routine, focusMinutes: minutes });
    navigate('/setup/break-length');
  };

  return (
    <SetupStep
      step={3}
      total={5}
      badge="⏳"
      title="How long do you want to focus?"
    >
      <PullSelect items={OPTIONS} onSelect={choose} spacing={64} />
    </SetupStep>
  );
}
