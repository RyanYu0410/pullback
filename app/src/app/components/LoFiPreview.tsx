import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { LoFiPullPreset } from './presets/LoFiPullPreset';
import { LoFiBack } from './LoFiShell';

/**
 * First page of the intentional-pull lofi prototype (`/lofi-preview`).
 * Reached via the `/lofi` hub. "Release" continues into `/lofi-save`.
 */
export function LoFiPreview() {
  const { sessionStatus, setSessionStatus, note, paceMinutes } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="relative h-full w-full">
      <LoFiPullPreset
        status={sessionStatus}
        setStatus={setSessionStatus}
        note={note}
        paceMinutes={paceMinutes}
        onAnchor={() => navigate('/lofi-save')}
      />
      <div className="absolute left-4 top-4 z-20">
        <LoFiBack to="/lofi" />
      </div>
    </div>
  );
}
