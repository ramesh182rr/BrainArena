import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { AppText, Button, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { DOT_TUTORIALS, starId, type ConstellationAction, type ConstellationState, type Hue } from './logic';

const HUE: Record<Hue, { color: string; shape: string }> = {
  gold: { color: '#FFD23F', shape: 'circle' },
  aqua: { color: '#4FD1FF', shape: 'diamond' },
  rose: { color: '#FF8FB8', shape: 'triangle' },
};
const STAR_R = 18;

function Marker({ x, y, hue }: { x: number; y: number; hue: Hue | null }) {
  if (!hue) return <Circle cx={x} cy={y} r={STAR_R} fill="#E8E4FF" stroke="#1A1245" strokeWidth={2} />;
  const { color, shape } = HUE[hue];
  const r = STAR_R;
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={color} stroke="#1A1245" strokeWidth={2} />
      {shape === 'diamond' ? <Polygon points={`${x},${y - 8} ${x + 8},${y} ${x},${y + 8} ${x - 8},${y}`} fill="#1A1245" opacity={0.55} /> : null}
      {shape === 'triangle' ? <Polygon points={`${x},${y - 8} ${x + 8},${y + 6} ${x - 8},${y + 6}`} fill="#1A1245" opacity={0.55} /> : null}
      {shape === 'circle' ? <Circle cx={x} cy={y} r={6} fill="#1A1245" opacity={0.55} /> : null}
    </G>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<ConstellationState, ConstellationAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.min(360, width - spacing.lg * 2 - spacing.md * 2);
  const pad = STAR_R + 6;
  const pos = (i: number) => ({ x: pad + state.stars[i]!.x * (size - pad * 2), y: pad + state.stars[i]!.y * (size - pad * 2) });
  const onRoute = new Set(state.route);
  const at = state.route[state.route.length - 1]!;
  return (
    <View style={styles.wrapper}>
      <View style={[styles.sky, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {state.links.map((l, i) => {
            const a = pos(l.a);
            const b = pos(l.b);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            const tip = (d: number, off: number) => `${mx + Math.cos(ang) * d - Math.sin(ang) * off},${my + Math.sin(ang) * d + Math.cos(ang) * off}`;
            return (
              <G key={i}>
                <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={3} strokeDasharray="6 6" />
                {l.oneWay ? <Polygon points={`${tip(9, 0)} ${tip(-6, 7)} ${tip(-6, -7)}`} fill="#FFFFFF" opacity={0.85} /> : null}
              </G>
            );
          })}
          {state.route.slice(1).map((s, i) => {
            const a = pos(state.route[i]!);
            const b = pos(s);
            return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFD23F" strokeWidth={6} strokeLinecap="round" />;
          })}
          {state.stars.map((st, i) => {
            const p = pos(i);
            return (
              <G key={i}>
                {onRoute.has(i) ? <Circle cx={p.x} cy={p.y} r={STAR_R + 6} fill="#FFD23F" opacity={0.35} /> : null}
                <Marker x={p.x} y={p.y} hue={st.hue} />
                {i === state.source || i === state.beacon ? (
                  <SvgText x={p.x} y={p.y - STAR_R - 6} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#FFFFFF">
                    {i === state.source ? 'START' : 'BEACON'}
                  </SvgText>
                ) : null}
                {i === at ? <Circle cx={p.x} cy={p.y} r={STAR_R + 3} fill="none" stroke="#FFFFFF" strokeWidth={3} /> : null}
              </G>
            );
          })}
        </Svg>
        {state.stars.map((st, i) => {
          const p = pos(i);
          const idx = state.route.indexOf(i);
          return (
            <Pressable
              key={i}
              testID={starId(i)}
              accessibilityRole="button"
              accessibilityLabel={`${i === state.source ? 'Start star' : i === state.beacon ? 'Beacon star' : 'Star'} ${i + 1}${st.hue ? `, ${st.hue}` : ''}${idx >= 0 ? `, lit as step ${idx + 1}` : ''}`}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'tap', star: i });
              }}
              style={[styles.hit, { left: p.x - 24, top: p.y - 24 }, highlightIds.includes(starId(i)) && styles.highlight]}
            />
          );
        })}
      </View>
      <AppText variant="caption" tone={state.lastRefusal ? 'danger' : 'secondary'} accessibilityLiveRegion="polite" style={styles.center}>
        {state.lastRefusal ?? `Lit ${state.route.length} of ${state.stars.length} stars. Tap a lit star to rewind.`}
      </AppText>
      <View style={styles.row}>
        <Button label="Undo" variant="secondary" size="sm" disabled={disabled || state.route.length < 2} onPress={() => onAction({ type: 'undo' })} />
        <Button label="Start over" variant="secondary" size="sm" disabled={disabled || state.route.length < 2} onPress={() => onAction({ type: 'reset' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  sky: { borderRadius: radii.lg, backgroundColor: '#140E3A' },
  hit: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent' },
  highlight: { borderWidth: 3, borderColor: '#FFE58A' },
  row: { flexDirection: 'row', gap: spacing.md },
});

export const dotConnectUi: GameUi<ConstellationState, ConstellationAction> = {
  gameId: 'W4-G01',
  howToPlay: [
    'Starting from the START star, tap stars one at a time to route the signal along the faint links.',
    'Light every star exactly once and finish on the BEACON.',
    'The signal cannot hop between two stars of the same colour (each colour also has its own inner mark).',
    'Arrowed links are one-way. Tap a lit star to rewind to it.',
  ],
  tutorials: DOT_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Lit ${s.route.length}/${s.stars.length} · Rewinds ${s.backtracks}`,
  levelNote: (s) => (s.links.some((l) => l.oneWay) ? 'Arrowed links are one-way.' : null),
  successMessage: () => 'The beacon is lit: every star carried the signal.',
  scoreExplanation: (s, { hintsUsed }) => `100 for lighting the beacon. ${s.backtracks} rewind${s.backtracks === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
