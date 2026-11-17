import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import type { Bloom } from '../types';

/** Original plant glyphs on a 24×24 grid: Rose flower, Sun burst, Leaf, Sky droplet. */
export function Glyph({ bloom, size, color }: { bloom: Bloom; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bloom === 'rose' ? (
        <>
          {[0, 72, 144, 216, 288].map((a) => {
            const r = (a * Math.PI) / 180;
            return <Circle key={a} cx={12 + 5.2 * Math.sin(r)} cy={12 - 5.2 * Math.cos(r)} r={4.2} fill={color} />;
          })}
          <Circle cx={12} cy={12} r={3} fill="#FFFFFF" opacity={0.9} />
        </>
      ) : null}
      {bloom === 'sun' ? (
        <Polygon
          points={Array.from({ length: 16 }, (_, i) => {
            const r = (i * Math.PI) / 8;
            const d = i % 2 === 0 ? 10.5 : 5.5;
            return `${12 + d * Math.sin(r)},${12 - d * Math.cos(r)}`;
          }).join(' ')}
          fill={color}
        />
      ) : null}
      {bloom === 'leaf' ? (
        <>
          <Path d="M4 20 C4 9 10 3 20 3 C20 13 14 20 4 20 Z" fill={color} />
          <Path d="M5 19 L15 9" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
        </>
      ) : null}
      {bloom === 'sky' ? <Path d="M12 2.5 C12 2.5 5 11 5 15.2 A7 7 0 0 0 19 15.2 C19 11 12 2.5 12 2.5 Z" fill={color} /> : null}
    </Svg>
  );
}
