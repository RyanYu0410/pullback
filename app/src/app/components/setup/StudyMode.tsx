import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../../context/AppContext';
import { PullSelect } from '../PullSelect';
import { SetupStep } from './SetupStep';

const OPTIONS = ['Study Together', 'Study Alone'];

export function StudyMode() {
  const { routine, setRoutine } = useAppContext();
  const navigate = useNavigate();

  const choose = (label: string) => {
    setRoutine({ ...routine, mode: label === 'Study Alone' ? 'alone' : 'together' });
    navigate('/routine');
  };

  return (
    <SetupStep
      step={5}
      total={5}
      badge="🤝"
      title="Study by yourself or with friends?"
    >
      <PullSelect items={OPTIONS} onSelect={choose} spacing={72} />
    </SetupStep>
  );
}
