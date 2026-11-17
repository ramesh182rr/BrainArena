import type { Bloom } from '../types';

/** Plant colours. Each colour also has its own glyph, so colour is never the only cue. */
export const bloomColors: Record<Bloom, string> = {
  rose: '#FF6B9A',
  sun: '#FFC83D',
  leaf: '#3DD68C',
  sky: '#4FC3FF',
};

export const gardenColors = {
  soil: '#1F1A55',
  glyph: '#1A1245',
  shell: '#FFFFFF',
  pad: '#FFD23F',
  stone: '#4A4470',
  stoneDark: '#2E2A55',
  highlight: '#FFE58A',
} as const;
