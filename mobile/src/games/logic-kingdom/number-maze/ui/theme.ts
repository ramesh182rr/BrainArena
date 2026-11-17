import type { Op } from '../types';

/** Room colours. The operation is always printed on the room, so colour is never the only cue. */
export const opColors: Record<Op, string> = {
  add: '#1E7A55',
  sub: '#B23A48',
  mul: '#5B3FD6',
  div: '#1F6F8B',
};

export const mazeColors = {
  roomText: '#FFFFFF',
  block: '#140D3D',
  blockDot: 'rgba(255,255,255,0.12)',
  lock: '#2A2050',
  lockAccent: '#FFD23F',
  start: '#2A2050',
  exit: '#3A1F7A',
  trail: '#FFD23F',
  orb: '#FFD23F',
  orbText: '#3A2200',
  legal: 'rgba(255,255,255,0.85)',
  highlight: '#FFE58A',
} as const;
