import type { PulseKind } from '../types';

/**
 * Neon board palette. Each pulse kind also has its own symbol (▲ ● ◆), so
 * colour is never the only cue. Contrast is tested against the tile faces.
 */
export const pulseColors: Record<PulseKind, string> = {
  spark: '#FFB547',
  wave: '#4FD1FF',
  flux: '#E07BFF',
};

export const boardColors = {
  tile: '#2A1F6B',
  tileHighlight: '#3A2D8A',
  tileBorder: 'rgba(170,150,255,0.35)',
  fixedTile: '#1A1250',
  conduit: '#8E84D0',
  highlight: '#FFE58A',
  overload: '#FF6B6B',
  /** Symbol colour drawn on top of a lit pulse colour. */
  onPulse: '#1A1245',
  emptyDot: 'rgba(255,255,255,0.18)',
} as const;
