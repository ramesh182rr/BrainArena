import type { Colour } from '../types';

/** Specimen colours. The colour is also written as a word on every card. */
export const specimenColors: Record<Colour, string> = {
  red: '#FF5A5F',
  blue: '#4C8DFF',
  green: '#3DD68C',
  yellow: '#FFC83D',
};

export const labColors = {
  card: '#2A1F6B',
  cardTested: '#221A5C',
  pass: '#5BE38F',
  fail: '#FF8A8A',
  markFill: '#FFFFFF',
  markStroke: '#1A1245',
  outline: '#1A1245',
  highlight: '#FFE58A',
} as const;
