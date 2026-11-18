import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { AppText, spacing, radii, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { canEnter, GARDEN_TUTORIALS, neighbours, plotId, type GardenAction, type GardenState, type Ground } from './logic';

const NAME: Record<Ground, string> = { grass: 'grass', hedgeUp: 'raised hedge', hedgeDown: 'lowered hedge', stone: 'stone', flower: 'flower', fountain: 'fountain' };

function Plot({ g, size }: { g: Ground; size: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size}>
      <Rect x={1} y={1} width={size - 2} height={size - 2} rx={6} fill="#2E7D5B" opacity={0.55} />
      {g === 'hedgeUp' ? (
        <G>
          <Rect x={size * 0.12} y={size * 0.18} width={size * 0.76} height={size * 0.66} rx={size * 0.2} fill="#1F6B3A" stroke="#0E3B1F" strokeWidth={2} />
          <Circle cx={size * 0.35} cy={size * 0.36} r={size * 0.07} fill="#4FBF73" />
          <Circle cx={size * 0.62} cy={size * 0.5} r={size * 0.07} fill="#4FBF73" />
        </G>
      ) : null}
      {g === 'hedgeDown' ? <Rect x={size * 0.16} y={size * 0.6} width={size * 0.68} height={size * 0.16} rx={4} fill="#1F6B3A" opacity={0.7} /> : null}
      {g === 'stone' ? <Ellipse cx={c} cy={c + 2} rx={size * 0.34} ry={size * 0.26} fill="#8C88A8" stroke="#4A4766" strokeWidth={2} /> : null}
      {g === 'flower' ? (
        <G>
          {[0, 1, 2, 3, 4].map((k) => {
            const a = (k * 2 * Math.PI) / 5;
            return <Circle key={k} cx={c + Math.cos(a) * size * 0.16} cy={c + Math.sin(a) * size * 0.16} r={size * 0.11} fill="#FF8FB8" />;
          })}
          <Circle cx={c} cy={c} r={size * 0.08} fill="#FFD23F" />
        </G>
      ) : null}
      {g === 'fountain' ? (
        <G>
          <Ellipse cx={c} cy={c + size * 0.12} rx={size * 0.34} ry={size * 0.18} fill="#4FA3FF" stroke="#FFFFFF" strokeWidth={2} />
          <Path d={`M ${c} ${c + size * 0.05} Q ${c - size * 0.12} ${c - size * 0.25} ${c} ${c - size * 0.32} Q ${c + size * 0.12} ${c - size * 0.25} ${c} ${c + size * 0.05}`} fill="#B6E3FF" />
        </G>
      ) : null}
    </Svg>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<GardenState, GardenAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.floor(Math.min(64, (width - spacing.lg * 2 - spacing.md * 2) / state.width));
  const reachable = new Set(neighbours(state.width, state.height, state.at).filter((n) => canEnter(state.ground, n)));
  return (
    <View style={styles.wrapper}>
      <View style={[styles.grid, { width: size * state.width }]}>
        {state.ground.map((g, i) => (
          <Pressable
            key={i}
            testID={plotId(i)}
            accessibilityRole="button"
            accessibilityLabel={`Row ${Math.floor(i / state.width) + 1}, column ${(i % state.width) + 1}: ${NAME[g]}${i === state.at ? ', you are here' : reachable.has(i) ? ', can step here' : ''}`}
            disabled={disabled}
            onPress={() => {
              if (!reachable.has(i)) return;
              haptics.tap();
              onAction({ type: 'step', cell: i });
            }}
            style={[styles.plot, { width: size, height: size }, reachable.has(i) && styles.reachable, highlightIds.includes(plotId(i)) && styles.highlight]}
          >
            <Plot g={g} size={size} />
            {i === state.at ? <View style={[styles.walker, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, top: size * 0.29, left: size * 0.29 }]} /> : null}
            {i === state.start && i !== state.at ? <View style={styles.gate} /> : null}
          </Pressable>
        ))}
      </View>
      <AppText variant="caption" tone="secondary" style={styles.center}>
        Each step toggles the hedges beside the square you land on.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radii.md, overflow: 'hidden', backgroundColor: '#163A2B' },
  plot: { borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent' },
  reachable: { borderColor: 'rgba(255,255,255,0.55)' },
  highlight: { borderColor: '#FFE58A', borderWidth: 3 },
  walker: { position: 'absolute', backgroundColor: '#FFD23F', borderWidth: 3, borderStyle: 'solid', borderColor: '#FFFFFF' },
  gate: { position: 'absolute', left: 4, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4FD1FF' },
});

export const pathFinderUi: GameUi<GardenState, GardenAction> = {
  gameId: 'W3-G03',
  howToPlay: [
    'Walk from the gate to the fountain by tapping a neighbouring square.',
    'Raised hedges block. Every step toggles the hedges right next to the square you land on: raised ones drop, lowered ones rise.',
    'Stones never change. Flowers toggle every hedge in their row.',
    'The order of your steps decides which way stays open. Undo any time.',
  ],
  tutorials: GARDEN_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Steps ${s.steps} · Par ${s.par}`,
  levelNote: (s) => (s.ground.includes('flower') ? 'Flowers toggle their whole row.' : null),
  successMessage: () => 'You reached the fountain.',
  scoreExplanation: (s, { hintsUsed }) => `100 for reaching the fountain. ${s.steps} steps against a par of ${s.par}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
