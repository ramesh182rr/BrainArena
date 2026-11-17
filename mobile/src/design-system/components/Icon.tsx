import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'pause'
  | 'play'
  | 'undo'
  | 'reset'
  | 'hint'
  | 'star'
  | 'lock'
  | 'home'
  | 'explore'
  | 'arena'
  | 'progress'
  | 'profile'
  | 'check'
  | 'settings'
  | 'offline';

/** Original line/solid icon set, drawn on a 24×24 grid. Decorative: hidden from screen readers. */
export function Icon({ name, size = 24, color = '#FFFFFF' }: { name: IconName; size?: number; color?: string }) {
  const line = { stroke: color, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'back' ? <Path d="M15 5 L8 12 L15 19" {...line} /> : null}
      {name === 'pause' ? (
        <>
          <Rect x={6} y={5} width={4} height={14} rx={1.5} fill={color} />
          <Rect x={14} y={5} width={4} height={14} rx={1.5} fill={color} />
        </>
      ) : null}
      {name === 'play' ? <Path d="M8 5 L19 12 L8 19 Z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" /> : null}
      {name === 'undo' ? <Path d="M9 7 L4 11 L9 15 M4 11 H14 C17.5 11 20 13.5 20 16.5 C20 18 19.5 19 19 19.5" {...line} /> : null}
      {name === 'reset' ? <Path d="M5 12 A7 7 0 1 0 8 6.3 M8 2.8 V6.6 H4.2" {...line} /> : null}
      {name === 'hint' ? (
        <>
          <Path d="M9 18 H15 M10 21 H14 M12 3 C8.5 3 6 5.6 6 8.8 C6 11 7.2 12.4 8.4 13.6 C9 14.2 9.3 15 9.3 15.8 H14.7 C14.7 15 15 14.2 15.6 13.6 C16.8 12.4 18 11 18 8.8 C18 5.6 15.5 3 12 3 Z" {...line} />
        </>
      ) : null}
      {name === 'star' ? (
        <Path d="M12 2.8 L14.8 8.6 L21.2 9.4 L16.5 13.8 L17.7 20.2 L12 17.1 L6.3 20.2 L7.5 13.8 L2.8 9.4 L9.2 8.6 Z" fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
      ) : null}
      {name === 'lock' ? (
        <>
          <Rect x={5} y={10.5} width={14} height={10} rx={2.5} fill={color} />
          <Path d="M8 10.5 V8 A4 4 0 0 1 16 8 V10.5" {...line} />
        </>
      ) : null}
      {name === 'home' ? <Path d="M4 11 L12 4 L20 11 V20 H14.5 V14.5 H9.5 V20 H4 Z" {...line} /> : null}
      {name === 'explore' ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...line} />
          <Path d="M15.5 8.5 L13.4 13.4 L8.5 15.5 L10.6 10.6 Z" fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        </>
      ) : null}
      {name === 'arena' ? <Path d="M6 4 H18 V8 A6 6 0 0 1 6 8 Z M12 14 V18 M8 20.5 H16 M6 6 H3.5 A2.5 2.5 0 0 0 6 9.5 M18 6 H20.5 A2.5 2.5 0 0 1 18 9.5" {...line} /> : null}
      {name === 'progress' ? (
        <>
          <Rect x={4} y={13} width={4} height={7} rx={1.2} fill={color} />
          <Rect x={10} y={8} width={4} height={12} rx={1.2} fill={color} />
          <Rect x={16} y={4} width={4} height={16} rx={1.2} fill={color} />
        </>
      ) : null}
      {name === 'profile' ? (
        <>
          <Circle cx={12} cy={8} r={4} {...line} />
          <Path d="M4 20.5 C5.5 15.5 18.5 15.5 20 20.5" {...line} />
        </>
      ) : null}
      {name === 'check' ? <Path d="M5 12.5 L10 17.5 L19 7" {...line} /> : null}
      {name === 'settings' ? (
        <>
          <Circle cx={12} cy={12} r={3.2} {...line} />
          <Path d="M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5 M5.3 5.3 L7.4 7.4 M16.6 16.6 L18.7 18.7 M5.3 18.7 L7.4 16.6 M16.6 7.4 L18.7 5.3" {...line} />
        </>
      ) : null}
      {name === 'offline' ? <Path d="M3 9 C8 4.5 16 4.5 21 9 M6.5 12.5 C9.5 10 14.5 10 17.5 12.5 M10 16 C11.2 15 12.8 15 14 16 M12 19.5 H12.01 M4 4 L20 20" {...line} /> : null}
    </Svg>
  );
}
