import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

import { AppText, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { ESCAPE_TUTORIALS, pieceId, platformCells, type Dir, type EscapeAction, type EscapeState, type Piece } from './logic';

const DIRS: { dir: Dir; label: string; icon: string }[] = [
  { dir: 0, label: 'Up', icon: '▲' },
  { dir: 3, label: 'Left', icon: '◀' },
  { dir: 1, label: 'Right', icon: '▶' },
  { dir: 2, label: 'Down', icon: '▼' },
];

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<EscapeState, EscapeAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.floor(Math.min(58, (width - spacing.lg * 2 - spacing.md * 2) / state.width));
  const w = state.width;
  const sel = state.selected;
  const xy = (i: number) => ({ x: (i % w) * size, y: Math.floor(i / w) * size });
  const platformAt = (cell: number) => state.platforms.findIndex((p) => platformCells(w, p).includes(cell));

  const tapCell = (cell: number) => {
    const crate = state.crates.indexOf(cell);
    const plat = platformAt(cell);
    let piece: Piece | null = null;
    if (crate >= 0) {
      // Second tap on a riding crate selects the platform under it.
      piece = sel?.kind === 'crate' && sel.index === crate && plat >= 0 ? { kind: 'platform', index: plat } : { kind: 'crate', index: crate };
    } else if (plat >= 0) piece = { kind: 'platform', index: plat };
    if (piece) {
      haptics.tap();
      onAction({ type: 'select', piece });
    }
  };

  const describe = (cell: number) => {
    const t = state.tiles[cell];
    const crate = state.crates.indexOf(cell);
    const plat = platformAt(cell);
    const parts = [t === 'pit' ? 'pit' : t === 'wall' ? 'wall' : t === 'dock' ? 'dock' : 'floor'];
    if (plat >= 0) parts.push(`platform ${plat + 1}`);
    if (crate === 0) parts.push('gold crate');
    else if (crate > 0) parts.push(`crate ${crate}`);
    return `Row ${Math.floor(cell / w) + 1}, column ${(cell % w) + 1}: ${parts.join(', ')}`;
  };

  return (
    <View style={styles.wrapper}>
      <View style={{ width: size * w, height: size * state.height }}>
        <Svg width={size * w} height={size * state.height}>
          {state.tiles.map((t, i) => {
            const { x, y } = xy(i);
            if (t === 'wall') return <Rect key={i} x={x + 2} y={y + 2} width={size - 4} height={size - 4} rx={6} fill="#0E0A2A" />;
            if (t === 'pit')
              return (
                <Rect key={i} x={x} y={y} width={size} height={size} fill="#05030F" stroke="#2C2566" strokeWidth={1} />
              );
            return <Rect key={i} x={x + 1} y={y + 1} width={size - 2} height={size - 2} rx={4} fill={t === 'dock' ? '#1E6B52' : '#2A2266'} stroke={t === 'dock' ? '#5BE38F' : 'none'} strokeWidth={3} />;
          })}
          {state.platforms.map((p, k) => {
            const { x, y } = xy(p.at);
            const selected = sel?.kind === 'platform' && sel.index === k;
            return (
              <Rect
                key={k}
                x={x + 3}
                y={y + 3}
                width={p.w * size - 6}
                height={p.h * size - 6}
                rx={8}
                fill="#8A5A2B"
                stroke={highlightIds.includes(pieceId({ kind: 'platform', index: k })) ? '#FFE58A' : selected ? colors.gold : '#C98A4A'}
                strokeWidth={selected || highlightIds.includes(pieceId({ kind: 'platform', index: k })) ? 4 : 2}
              />
            );
          })}
          {state.crates.map((c, k) => {
            const { x, y } = xy(c);
            const selected = sel?.kind === 'crate' && sel.index === k;
            const lit = highlightIds.includes(pieceId({ kind: 'crate', index: k }));
            const m = size * 0.16;
            return (
              <Rect key={k} x={x + m} y={y + m} width={size - m * 2} height={size - m * 2} rx={5} fill={k === 0 ? '#FFC233' : '#B9B2E8'} stroke={lit ? '#FFE58A' : selected ? '#FFFFFF' : '#1A1245'} strokeWidth={selected || lit ? 4 : 2} />
            );
          })}
          {state.crates.map((c, k) => {
            const { x, y } = xy(c);
            const m = size * 0.16;
            return k === 0 ? (
              <Polygon key={`s${k}`} points={`${x + size / 2},${y + m + 6} ${x + size - m - 6},${y + size - m - 6} ${x + m + 6},${y + size - m - 6}`} fill="#1A1245" opacity={0.6} />
            ) : (
              <Line key={`s${k}`} x1={x + m + 4} y1={y + m + 4} x2={x + size - m - 4} y2={y + size - m - 4} stroke="#1A1245" strokeWidth={2} opacity={0.5} />
            );
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          {state.tiles.map((_, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={describe(i)} disabled={disabled} onPress={() => tapCell(i)} style={{ width: size, height: size }} />
          ))}
        </View>
      </View>
      <AppText variant="caption" tone="secondary" style={styles.center}>
        {sel ? `Selected: ${sel.kind === 'crate' ? (sel.index === 0 ? 'gold crate' : `crate ${sel.index}`) : `platform ${sel.index + 1}`}. Tap again on a riding crate to pick its platform.` : 'Tap a crate or platform, then move it.'}
      </AppText>
      <View style={styles.pad}>
        {DIRS.map((d) => (
          <Pressable
            key={d.dir}
            accessibilityRole="button"
            accessibilityLabel={`Move ${d.label}`}
            disabled={disabled || !sel}
            onPress={() => onAction({ type: 'move', dir: d.dir })}
            style={({ pressed }) => [styles.arrow, d.dir === 0 && styles.up, d.dir === 2 && styles.down, !sel && styles.dim, pressed && styles.pressed]}
          >
            <AppText variant="heading">{d.icon}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  overlay: { flexDirection: 'row', flexWrap: 'wrap' },
  pad: { width: 3 * 60 + 2 * spacing.sm, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  arrow: { width: 60, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.glassBorder },
  up: { marginHorizontal: 30 + spacing.sm },
  down: { marginHorizontal: 30 + spacing.sm },
  dim: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.92 }] },
});

export const blockEscapeUi: GameUi<EscapeState, EscapeAction> = {
  gameId: 'W3-G02',
  howToPlay: [
    'Get the gold crate (with the triangle) onto the green dock.',
    'Crates walk on the floor but cannot step into a pit. Platforms slide over floor and pits, carrying any crates riding on them.',
    'A crate standing on the floor blocks a platform, and platforms never push each other.',
    'Tap a crate or platform, then use the arrows. Tap a riding crate twice to select its platform.',
  ],
  tutorials: ESCAPE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Moves ${s.moves} · Par ${s.par}`,
  levelNote: () => null,
  successMessage: () => 'The gold crate is docked.',
  scoreExplanation: (s, { hintsUsed }) => `100 for docking the gold crate. ${s.moves} moves against a par of ${s.par}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
