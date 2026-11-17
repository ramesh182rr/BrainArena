import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { TabParamList } from './types';

/** Simple original line icons for the tab bar. */
export function TabIcon({ name, color, size }: { name: keyof TabParamList; color: string; size: number }) {
  const common = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'Home' ? <Path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" {...common} /> : null}
      {name === 'Explore' ? (
        <>
          <Circle cx={12} cy={12} r={8} {...common} />
          <Path d="M15 9 L13 13 L9 15 L11 11 Z" {...common} />
        </>
      ) : null}
      {name === 'Arena' ? <Path d="M12 3 L14.6 8.6 L20.5 9.2 L16 13.2 L17.3 19 L12 16 L6.7 19 L8 13.2 L3.5 9.2 L9.4 8.6 Z" {...common} /> : null}
      {name === 'Progress' ? (
        <>
          <Rect x={4} y={13} width={4} height={7} rx={1} {...common} />
          <Rect x={10} y={8} width={4} height={12} rx={1} {...common} />
          <Rect x={16} y={4} width={4} height={16} rx={1} {...common} />
        </>
      ) : null}
      {name === 'Profile' ? (
        <>
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4 20 C5.5 15.5 18.5 15.5 20 20" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
