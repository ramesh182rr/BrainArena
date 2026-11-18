import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon } from 'react-native-svg';

import { AppText, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { MOTIFS, ruleFor, tileId, WEAVE_TUTORIALS, type WeaveAction, type WeaveState } from './logic';

const MOTIF_COLOR = ['#FFC233', '#B9C6FF', '#5BE38F', '#4FD1FF', '#FF8FB8'];

/** Each motif has its own silhouette; colour only reinforces it. */
export function MotifGlyph({ motif, size }: { motif: number; size: number }) {
  const c = size / 2;
  const r = size * 0.3;
  const fill = MOTIF_COLOR[motif]!;
  return (
    <Svg width={size} height={size}>
      {motif === 0 ? (
        <G>
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <Line key={k} x1={c + Math.cos(a) * r * 1.1} y1={c + Math.sin(a) * r * 1.1} x2={c + Math.cos(a) * r * 1.5} y2={c + Math.sin(a) * r * 1.5} stroke={fill} strokeWidth={3} strokeLinecap="round" />;
          })}
          <Circle cx={c} cy={c} r={r * 0.8} fill={fill} />
        </G>
      ) : null}
      {motif === 1 ? <Path d={`M ${c + r * 0.4} ${c - r} A ${r} ${r} 0 1 0 ${c + r * 0.4} ${c + r} A ${r * 0.75} ${r * 0.75} 0 1 1 ${c + r * 0.4} ${c - r} Z`} fill={fill} /> : null}
      {motif === 2 ? <Path d={`M ${c} ${c - r * 1.2} C ${c + r * 1.2} ${c - r * 0.4} ${c + r * 0.6} ${c + r} ${c} ${c + r * 1.2} C ${c - r * 0.6} ${c + r} ${c - r * 1.2} ${c - r * 0.4} ${c} ${c - r * 1.2} Z`} fill={fill} /> : null}
      {motif === 3 ? <Path d={`M ${c - r * 1.3} ${c} q ${r * 0.43} ${-r * 0.7} ${r * 0.87} 0 t ${r * 0.87} 0 t ${r * 0.87} 0`} fill="none" stroke={fill} strokeWidth={4} strokeLinecap="round" /> : null}
      {motif === 4 ? (
        <Polygon
          points={Array.from({ length: 10 }, (_, k) => {
            const a = -Math.PI / 2 + (k * Math.PI) / 5;
            const rr = k % 2 ? r * 0.5 : r * 1.2;
            return `${c + Math.cos(a) * rr},${c + Math.sin(a) * rr}`;
          }).join(' ')}
          fill={fill}
        />
      ) : null}
    </Svg>
  );
}

function Trail({ motifs, label }: { motifs: readonly number[]; label: string }) {
  return (
    <View style={styles.trail} accessible accessibilityLabel={`${label}: ${motifs.map((m) => MOTIFS[m]).join(', ')}`}>
      {motifs.map((m, i) => (
        <View key={i} style={styles.trailItem}>
          {i ? <AppText variant="caption" tone="muted">›</AppText> : null}
          <MotifGlyph motif={m} size={26} />
        </View>
      ))}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<WeaveState, WeaveAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.floor(Math.min(62, (width - spacing.lg * 2 - spacing.md * 2) / state.width));
  const at = state.path[state.path.length - 1]!;
  const visits = new Map<number, number>();
  state.path.forEach((c, i) => visits.set(c, i));
  const center = (i: number) => ({ x: (i % state.width) * size + size / 2, y: Math.floor(i / state.width) * size + size / 2 });
  return (
    <View style={styles.wrapper}>
      <View style={styles.examples}>
        <AppText variant="label" tone="gold">
          {state.showRule ? 'Rule card' : 'Example trails'}
        </AppText>
        {state.showRule
          ? ruleFor(state.grammar, 0).map((next, m) => (m < state.palette ? <Trail key={m} motifs={[m, ...next]} label={`After ${MOTIFS[m]} comes`} /> : null))
          : state.examples.map((ex, i) => <Trail key={i} motifs={ex} label={`Example ${i + 1}`} />)}
        {state.grammar.next.length > 1 ? (
          <AppText variant="caption" tone="secondary">
            Two rules take turns: odd steps follow one, even steps the other.
          </AppText>
        ) : null}
      </View>
      <View style={{ width: size * state.width, height: size * state.height }}>
        <View style={[styles.grid, { width: size * state.width }]}>
          {state.motifs.map((m, i) => (
            <Pressable
              key={i}
              testID={tileId(i)}
              accessibilityRole="button"
              accessibilityLabel={`${MOTIFS[m]}${i === state.start ? ', start' : ''}${i === state.goal ? ', goal' : ''}${i === at ? ', you are here' : ''}`}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'step', cell: i });
              }}
              style={[styles.tile, { width: size, height: size }, i === state.goal && styles.goal, i === state.start && styles.start, visits.has(i) && styles.visited, i === at && styles.here, highlightIds.includes(tileId(i)) && styles.highlight]}
            >
              <MotifGlyph motif={m} size={size * 0.7} />
            </Pressable>
          ))}
        </View>
        <Svg width={size * state.width} height={size * state.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {state.path.slice(1).map((c, k) => {
            const a = center(state.path[k]!);
            const b = center(c);
            return <Line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />;
          })}
        </Svg>
      </View>
      <AppText variant="caption" tone={state.lastRefusal ? 'danger' : 'secondary'} accessibilityLiveRegion="polite" style={styles.center}>
        {state.lastRefusal ?? `Step ${state.path.length}. Tap a neighbouring tile that may come next.`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  examples: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  trail: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  trailItem: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#1F1656', borderRadius: radii.sm },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' },
  start: { borderColor: '#4FD1FF', borderWidth: 3 },
  goal: { borderColor: '#5BE38F', borderWidth: 3, backgroundColor: 'rgba(91,227,143,0.15)' },
  visited: { backgroundColor: 'rgba(255,255,255,0.08)' },
  here: { borderColor: colors.gold, borderWidth: 3 },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
});

export const patternLinkUi: GameUi<WeaveState, WeaveAction> = {
  gameId: 'W4-G03',
  howToPlay: [
    'Walk from the blue-framed start tile to the green goal, one neighbouring tile at a time.',
    'Each step must follow the hidden rule for which motif may come next.',
    'Work out the rule from the example trails. A refused step tells you what cannot follow.',
    'You may cross your own trail. Fewer refused steps earn a bigger bonus.',
  ],
  tutorials: WEAVE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Steps ${s.path.length - 1} · Par ${s.par} · Refused ${s.refusals}`,
  levelNote: () => null,
  successMessage: () => 'The pattern carried you all the way to the goal.',
  scoreExplanation: (s, { hintsUsed }) => `100 for reaching the goal. ${s.refusals} refused step${s.refusals === 1 ? '' : 's'}, ${s.path.length - 1} steps against a par of ${s.par}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
