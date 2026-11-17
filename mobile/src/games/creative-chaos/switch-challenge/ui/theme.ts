/** One wire colour per switch; wires also carry the switch letter and an arrow. */
export const wireColors = ['#FFD23F', '#4FD1FF', '#FF7AD9', '#5BE38F', '#FF9548', '#B18CFF'] as const;

export const machineColors = {
  dialFace: '#2A1F6B',
  dialRim: 'rgba(255,255,255,0.25)',
  dialMatched: '#5BE38F',
  tick: '#B3A9EE',
  needle: '#FFFFFF',
  target: '#FFD23F',
  lever: '#3B2A8F',
  leverTop: '#5B45C8',
  lock: '#FF8A8A',
  highlight: '#FFE58A',
} as const;
