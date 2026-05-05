import React from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../../context/AppContext';
import { PullSelect } from '../PullSelect';
import { SetupStep } from './SetupStep';

const OPTIONS = ['3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', 'Later tonight'];

const TO_HHMM: Record<string, string> = {
  '3:00 PM': '15:00',
  '3:30 PM': '15:30',
  '4:00 PM': '16:00',
  '4:30 PM': '16:30',
  '5:00 PM': '17:00',
  'Later tonight': '19:00',
};

export function StartTime() {
  const { routine, setRoutine } = useAppContext();
  const navigate = useNavigate();

  const choose = (label: string) => {
    setRoutine({ ...routine, startTime: TO_HHMM[label] ?? '16:00' });
    navigate('/setup/subjects');
  };

  return (
    <SetupStep
      step={1}
      total={5}
      badge="🌞"
      title="When do you usually start homework?"
    >
      <PullSelect items={OPTIONS} onSelect={choose} spacing={56} />
    </SetupStep>
  );
}
