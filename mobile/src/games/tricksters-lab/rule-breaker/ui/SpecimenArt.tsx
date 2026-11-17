import { memo } from 'react';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

import type { Specimen } from '../types';
import { labColors, specimenColors } from './theme';

/** Original specimen drawing: shape, colour, size and 1–3 marks. Decorative; cards carry the text label. */
export const SpecimenArt = memo(function SpecimenArt({ specimen, size }: { specimen: Specimen; size: number }) {
  const c = size / 2;
  const r = (specimen.size === 'large' ? 0.44 : 0.3) * size;
  const fill = specimenColors[specimen.colour];
  const stroke = { stroke: labColors.outline, strokeWidth: 2.5 };
  let body;
  switch (specimen.shape) {
    case 'circle':
      body = <Circle cx={c} cy={c} r={r} fill={fill} {...stroke} />;
      break;
    case 'square':
      body = <Rect x={c - r * 0.88} y={c - r * 0.88} width={r * 1.76} height={r * 1.76} rx={r * 0.18} fill={fill} {...stroke} />;
      break;
    case 'triangle':
      body = <Polygon points={`${c},${c - r} ${c + r * 0.95},${c + r * 0.75} ${c - r * 0.95},${c + r * 0.75}`} fill={fill} strokeLinejoin="round" {...stroke} />;
      break;
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
      }).join(' ');
      body = <Polygon points={pts} fill={fill} strokeLinejoin="round" {...stroke} />;
      break;
    }
  }
  const dot = Math.max(3, r * 0.17);
  const offsets = specimen.marks === 1 ? [0] : specimen.marks === 2 ? [-1, 1] : [-1.4, 0, 1.4];
  const cy = specimen.shape === 'triangle' ? c + r * 0.25 : c;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {body}
      {offsets.map((o) => (
        <Circle key={o} cx={c + o * dot * 1.6} cy={cy} r={dot} fill={labColors.markFill} stroke={labColors.markStroke} strokeWidth={1.5} />
      ))}
    </Svg>
  );
});
