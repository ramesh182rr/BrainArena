import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, colors, Icon, radii, spacing, typography, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { arrowId, DIR_NAMES, MIRROR_TUTORIALS, movesMade, TRANSFORM_TEXT, type Dir, type MirrorAction, type MirrorState } from './logic';

const EXPLORER = ['#FFD23F', '#4FD1FF'] as const;

function Room({ s, which, size }: { s: MirrorState; which: 0 | 1; size: number }) {
  const walls = which === 0 ? s.wallsA : s.wallsB;
  const exit = which === 0 ? s.exitA : s.exitB;
  const pos = s.path[s.path.length - 1]![which];
  const name = which === 0 ? 'Left' : 'Right';
  const label = (i: number) => `${Math.floor(i / s.width) + 1}, ${(i % s.width) + 1}`;
  return (
    <View
      style={[styles.room, { width: size * s.width + 4 }]}
      accessible
      accessibilityLabel={`${name} room. Explorer at row and column ${label(pos)}. Door at ${label(exit)}.${s.lastBump?.[which] ? ' Bumped a wall last move.' : ''}`}
    >
      {walls.map((wall, i) => (
        <View key={i} style={[styles.cell, { width: size, height: size }, wall && styles.wall]}>
          {i === exit ? (
            <View style={[styles.door, { width: size * 0.7, height: size * 0.7, borderColor: EXPLORER[which] }]}>
              <AppText style={[styles.small, { color: EXPLORER[which] }]}>{which === 0 ? 'A' : 'B'}</AppText>
            </View>
          ) : null}
          {i === pos ? (
            <View style={[styles.explorer, { width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: EXPLORER[which] }, s.lastBump?.[which] && styles.bumped]}>
              <AppText style={styles.explorerText}>{which === 0 ? 'A' : 'B'}</AppText>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<MirrorState, MirrorAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.floor(Math.min(46, (width - spacing.lg * 2 - spacing.md * 2 - spacing.md - 8) / (state.width * 2)));
  const arrow = (d: Dir, icon: 'back') => (
    <Pressable
      testID={arrowId(d)}
      accessibilityRole="button"
      accessibilityLabel={`Move ${DIR_NAMES[d]}`}
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onAction({ type: 'move', dir: d });
      }}
      style={({ pressed }) => [styles.arrow, highlightIds.includes(arrowId(d)) && styles.highlight, pressed && styles.pressed]}
    >
      <View style={{ transform: [{ rotate: `${[90, 180, 270, 0][d]}deg` }] }}>
        <Icon name={icon} size={30} color="#FFFFFF" />
      </View>
    </Pressable>
  );
  const bump = state.lastBump;
  return (
    <View style={styles.wrapper}>
      <View style={styles.rooms}>
        <Room s={state} which={0} size={size} />
        <Room s={state} which={1} size={size} />
      </View>
      <AppText variant="caption" tone="secondary" style={styles.center}>
        {TRANSFORM_TEXT[state.transform]}
      </AppText>
      <AppText variant="caption" tone={bump && (bump[0] || bump[1]) ? 'gold' : 'muted'} accessibilityLiveRegion="polite" style={styles.center}>
        {bump ? (bump[0] && bump[1] ? 'Both explorers bumped a wall.' : bump[0] ? 'A bumped a wall and waited.' : bump[1] ? 'B bumped a wall and waited.' : ' ') : ' '}
      </AppText>
      <View style={styles.pad}>
        {arrow(0, 'back')}
        <View style={styles.padRow}>
          {arrow(3, 'back')}
          <View style={styles.padGap} />
          {arrow(1, 'back')}
        </View>
        {arrow(2, 'back')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  rooms: { flexDirection: 'row', gap: spacing.md },
  room: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radii.sm, borderWidth: 2, borderColor: colors.glassBorder, backgroundColor: '#221A5C' },
  cell: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  wall: { backgroundColor: '#0E0A2A' },
  door: { position: 'absolute', borderWidth: 3, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: 11, lineHeight: 13, fontFamily: typography.label.fontFamily },
  explorer: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  explorerText: { fontSize: 13, lineHeight: 16, color: '#1A1245', fontFamily: typography.label.fontFamily },
  bumped: { borderColor: '#FF8A8A', borderWidth: 3 },
  pad: { alignItems: 'center', gap: spacing.xs },
  padRow: { flexDirection: 'row', gap: spacing.xs },
  padGap: { width: 64 },
  arrow: { width: 64, height: 56, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  pressed: { transform: [{ scale: 0.92 }] },
});

export const mirrorWorldUi: GameUi<MirrorState, MirrorAction> = {
  gameId: 'W3-G05',
  howToPlay: [
    'One arrow pad moves two explorers: A in the left room, B in the right.',
    'B receives a changed version of each move, explained under the rooms.',
    'An explorer facing a wall stays put while the other moves.',
    'Get A and B onto their doors at the same moment.',
  ],
  tutorials: MIRROR_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Moves ${movesMade(s)} · Best ${s.par}`,
  levelNote: () => null,
  successMessage: () => 'Both explorers reached their doors together.',
  scoreExplanation: (s, { hintsUsed }) =>
    `100 for reaching both doors. ${movesMade(s) <= s.par ? `Shortest possible: ${s.par} moves.` : `${movesMade(s)} moves; the shortest is ${s.par}.`}${hintsUsed ? ` ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}.` : ''}`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
