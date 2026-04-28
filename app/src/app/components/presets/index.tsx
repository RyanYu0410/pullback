import { SelfCheckinPreset, SelfCheckinThumbnail } from './SelfCheckinPreset';
import {
  IntentionalInterfacePreset,
  IntentionalInterfaceThumbnail,
} from './IntentionalInterfacePreset';
import { SoftIosPreset, SoftIosThumbnail } from './SoftIosPreset';
import { IntentionRitualPreset, IntentionRitualThumbnail } from './IntentionRitualPreset';
import type { PresetDefinition } from './types';
import type { WidgetPreset } from '../../context/AppContext';

export type { PresetProps, PresetDefinition } from './types';

export const PRESETS: PresetDefinition[] = [
  {
    id: 'selfCheckin',
    label: 'Self check-in',
    tagline: 'Pull a string. Anchor the moment.',
    Component: SelfCheckinPreset,
    Thumbnail: SelfCheckinThumbnail,
  },
  {
    id: 'intentionalInterface',
    label: 'Intentional interface',
    tagline: 'Pick where your drift is going.',
    Component: IntentionalInterfacePreset,
    Thumbnail: IntentionalInterfaceThumbnail,
  },
  {
    id: 'softIos',
    label: 'Soft iOS',
    tagline: 'Widget dashboard. Restore focus.',
    Component: SoftIosPreset,
    Thumbnail: SoftIosThumbnail,
  },
  {
    id: 'intentionRitual',
    label: 'Intention ritual',
    tagline: 'Tether, release, write to let go.',
    Component: IntentionRitualPreset,
    Thumbnail: IntentionRitualThumbnail,
  },
];

export function getPreset(id: WidgetPreset): PresetDefinition {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
