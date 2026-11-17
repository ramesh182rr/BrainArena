import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import type { SymbolId } from '../types';
import { recallColors, symbolColors } from './theme';

/** Original symbol set on a 24×24 grid: each a distinct silhouette in its own colour. */
export function SymbolGlyph({ symbol, size }: { symbol: SymbolId; size: number }) {
  const fill = symbolColors[symbol];
  const stroke = { stroke: recallColors.glyphInk, strokeWidth: 1.5, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {symbol === 'star' ? (
        <Polygon
          points={Array.from({ length: 10 }, (_, i) => {
            const a = (i * Math.PI) / 5;
            const r = i % 2 === 0 ? 10 : 4.4;
            return `${12 + r * Math.sin(a)},${12.5 - r * Math.cos(a)}`;
          }).join(' ')}
          fill={fill}
          {...stroke}
        />
      ) : null}
      {symbol === 'moon' ? <Path d="M15.5 2.5 A9.5 9.5 0 1 0 21.5 17 A7.5 7.5 0 0 1 15.5 2.5 Z" fill={fill} {...stroke} /> : null}
      {symbol === 'gem' ? <Polygon points="12,2 21,9.5 12,22 3,9.5" fill={fill} {...stroke} /> : null}
      {symbol === 'bolt' ? <Polygon points="13.5,1.5 4.5,13.5 11,13.5 9.5,22.5 19.5,9.5 13,9.5" fill={fill} {...stroke} /> : null}
      {symbol === 'ring' ? (
        <>
          <Circle cx={12} cy={12} r={9.5} fill={fill} {...stroke} />
          <Circle cx={12} cy={12} r={4.5} fill={recallColors.pad} {...stroke} />
        </>
      ) : null}
      {symbol === 'wave' ? (
        <Path d="M2 15 C5 8 8 8 11 13 C14 18 17 18 22 10 L22 18 C17 24 14 22 11 18 C8 14 5 14 2 20 Z" fill={fill} {...stroke} />
      ) : null}
    </Svg>
  );
}
