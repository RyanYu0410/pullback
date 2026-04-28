import type { ComponentType } from 'react';
import type { SessionStatus } from '../../design/palettes';
import type { WidgetPreset } from '../../context/AppContext';

/** Props shared by every preset component, delivered by `Pull.tsx`. */
export interface PresetProps {
  status: SessionStatus;
  setStatus: (s: SessionStatus) => void;
  /** User's saved intention note — shown inside the preset's note card. */
  note: string;
  paceMinutes: number | null;
  /** Called when the user completes the check-in for this preset. */
  onAnchor: () => void;
}

export interface PresetDefinition {
  id: WidgetPreset;
  label: string;
  /** One-line tagline shown under the label in the selector. */
  tagline: string;
  Component: ComponentType<PresetProps>;
  /** Tiny static visual for the Build selector. */
  Thumbnail: ComponentType<{ status?: SessionStatus }>;
}
