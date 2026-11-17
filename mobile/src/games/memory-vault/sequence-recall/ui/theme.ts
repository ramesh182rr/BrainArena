import type { SymbolId } from '../types';

/** Symbol colours; each symbol also has its own distinct shape. */
export const symbolColors: Record<SymbolId, string> = {
  star: '#FFD23F',
  moon: '#B6A6FF',
  gem: '#4FD1FF',
  bolt: '#FF9548',
  ring: '#5BE38F',
  wave: '#FF7AD9',
};

export const recallColors = {
  pad: '#2A1F6B',
  padLit: '#4A3A9E',
  padBorder: 'rgba(255,255,255,0.15)',
  glyphInk: '#1A1245',
  slot: 'rgba(255,255,255,0.12)',
  right: '#5BE38F',
  wrong: '#FF8A8A',
  highlight: '#FFE58A',
} as const;
