import { colors } from '@/design-system/tokens';

import type { PulseKind } from '../types';

/**
 * Pulse colours. Each kind also has its own symbol (▲ ● ◆), so colour is
 * never the only cue. All meet 3:1 against the white tile background.
 */
export const pulseColors: Record<PulseKind, string> = {
  spark: '#C2410C',
  wave: '#1D6FD1',
  flux: '#7048E8',
};

export const boardColors = {
  tile: colors.card,
  tileBorder: colors.border,
  fixedTile: '#E9EDF5',
  conduit: colors.textSecondary,
  highlight: colors.focus,
  overload: colors.danger,
  onPulse: '#FFFFFF',
} as const;
