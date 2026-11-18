import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, Button, colors, radii, spacing, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { devicesOf, GRAVITY_TUTORIALS, placeable, remaining, squareId, type DeviceKind, type GravityAction, type GravityState, type LabCell } from './logic';

const DEVICE = {
  attract: { color: '#4FD1FF', sign: '+', name: 'Attractor' },
  repel: { color: '#FF7A7A', sign: '−', name: 'Repulsor' },
  strongAttract: { color: '#B18CFF', sign: '++', name: 'Strong attractor' },
} as const;
const DIRS = ['up', 'right', 'down', 'left'];

function Device({ kind, size }: { kind: DeviceKind; size: number }) {
  const c = size / 2;
  const d = DEVICE[kind];
  return (
    <G>
      <Circle cx={c} cy={c} r={size * 0.32} fill={d.color} stroke="#1A1245" strokeWidth={2} />
      {kind === 'strongAttract' ? <Circle cx={c} cy={c} r={size * 0.42} fill="none" stroke={d.color} strokeWidth={2} /> : null}
      <SvgText x={c} y={c + 6} fontSize={size * 0.32} fontWeight="bold" textAnchor="middle" fill="#1A1245">
        {d.sign}
      </SvgText>
    </G>
  );
}

function describe(cell: LabCell, placed: DeviceKind | null, start: boolean): string {
  if (start) return 'Orb start';
  if (placed) return `${DEVICE[placed].name} (yours)`;
  switch (cell.t) {
    case 'wall':
      return 'Wall';
    case 'gate':
      return `Gate ${cell.n}`;
    case 'exit':
      return 'Exit';
    case 'fixed':
      return `Fixed ${DEVICE[cell.kind].name.toLowerCase()}`;
    default:
      return 'Empty';
  }
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<GravityState, GravityAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const size = Math.floor(Math.min(54, (width - spacing.lg * 2 - spacing.md * 2) / state.width));
  const run = state.lastRun;
  const [shown, setShown] = useState({ key: -1, n: 0 });
  const steps = run ? run.path.length : 0;
  const visible = !run ? 0 : reduceMotion ? steps : shown.key === state.launches ? shown.n : 1;
  useEffect(() => {
    if (!run || reduceMotion) return;
    let k = 1;
    const id = setInterval(() => {
      k += 1;
      setShown({ key: state.launches, n: k });
      if (k >= steps) clearInterval(id);
    }, 140);
    return () => clearInterval(id);
  }, [run, reduceMotion, steps, state.launches]);
  const pathCells = run ? run.path.slice(0, visible) : [];
  const orbAt = pathCells.length ? pathCells[pathCells.length - 1]! : state.start;
  const devices = devicesOf(state);
  const spots = new Set(placeable(state));
  const left = remaining(state);
  const done = run && visible >= steps;
  const message = !run
    ? 'Tap empty squares to place devices, then Launch.'
    : !done
      ? 'Launching…'
      : run.outcome === 'exit'
        ? 'Through every gate and out!'
        : run.outcome === 'crash'
          ? 'The orb crashed. Move a device and try again.'
          : run.outcome === 'lost'
            ? 'The orb drifted off the edge.'
            : `The orb never reached the exit${run.gates.length < state.cells.filter((c) => c.t === 'gate').length ? ' (gates missed)' : ''}.`;
  const center = (i: number) => ({ x: (i % state.width) * size + size / 2, y: Math.floor(i / state.width) * size + size / 2 });
  return (
    <View style={styles.wrapper}>
      <View style={{ width: size * state.width, height: size * state.height }}>
        <View style={[styles.grid, { width: size * state.width }]}>
          {state.cells.map((cell, i) => {
            const placed = state.placed[i] ?? null;
            const content = (
              <Svg width={size} height={size}>
                {cell.t === 'wall' ? <Rect x={2} y={2} width={size - 4} height={size - 4} rx={6} fill="#0E0A2A" /> : null}
                {cell.t === 'gate' ? (
                  <G>
                    <Circle cx={size / 2} cy={size / 2} r={size * 0.36} fill="none" stroke="#FFD23F" strokeWidth={3} strokeDasharray="5 4" />
                    <SvgText x={size / 2} y={size / 2 + 6} fontSize={16} fontWeight="bold" textAnchor="middle" fill="#FFD23F">
                      {cell.n}
                    </SvgText>
                  </G>
                ) : null}
                {cell.t === 'exit' ? <Rect x={size * 0.18} y={size * 0.12} width={size * 0.64} height={size * 0.76} rx={size * 0.3} fill="#5BE38F" stroke="#FFFFFF" strokeWidth={2} /> : null}
                {devices.has(i) ? <Device kind={devices.get(i)!} size={size} /> : null}
              </Svg>
            );
            const label = `${describe(cell, placed, i === state.start)}.`;
            return spots.has(i) ? (
              <Pressable
                key={i}
                testID={squareId(i)}
                accessibilityRole="button"
                accessibilityLabel={`${label} Tap to place or change a device.`}
                disabled={disabled}
                onPress={() => {
                  haptics.tap();
                  onAction({ type: 'cycle', cell: i });
                }}
                style={[styles.cell, { width: size, height: size }, highlightIds.includes(squareId(i)) && styles.highlight]}
              >
                {content}
              </Pressable>
            ) : (
              <View key={i} accessible accessibilityLabel={label} style={[styles.cell, { width: size, height: size }]}>
                {content}
              </View>
            );
          })}
        </View>
        <Svg width={size * state.width} height={size * state.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {pathCells.slice(1).map((c, k) => {
            const a = center(pathCells[k]!);
            const b = center(c);
            return <Line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFD23F" strokeWidth={3} strokeOpacity={0.7} strokeLinecap="round" />;
          })}
          <Circle cx={center(orbAt).x} cy={center(orbAt).y} r={size * 0.22} fill="#FFFFFF" stroke="#FFD23F" strokeWidth={3} />
          {!run ? (
            <SvgText x={center(state.start).x} y={center(state.start).y - size * 0.28} fontSize={12} textAnchor="middle" fill="#FFFFFF">
              {['▲', '▶', '▼', '◀'][state.startDir]}
            </SvgText>
          ) : null}
        </Svg>
      </View>
      <AppText variant="caption" tone="secondary" style={styles.center}>
        Orb starts heading {DIRS[state.startDir]}.
      </AppText>
      <View style={styles.inventory}>
        {[...new Set(state.inventory)].map((k) => (
          <View key={k} style={styles.stock} accessible accessibilityLabel={`${DEVICE[k].name}: ${left.get(k) ?? 0} left`}>
            <Svg width={30} height={30}>
              <Device kind={k} size={30} />
            </Svg>
            <AppText variant="label">×{left.get(k) ?? 0}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone={done && run?.outcome !== 'exit' ? 'danger' : done ? 'success' : 'secondary'} accessibilityLiveRegion="polite" style={styles.center}>
        {message}
      </AppText>
      <View style={styles.row}>
        <Button label="Clear" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'clear' })} />
        <Button label="Launch" variant="play" size="sm" disabled={disabled} onPress={() => onAction({ type: 'launch' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#1F1656', borderRadius: radii.sm },
  cell: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', borderStyle: 'solid' },
  highlight: { borderColor: '#FFE58A', borderWidth: 3 },
  inventory: { flexDirection: 'row', gap: spacing.md },
  stock: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.glass },
  row: { flexDirection: 'row', gap: spacing.md },
});

export const gravityLabUi: GameUi<GravityState, GravityAction> = {
  gameId: 'W6-G01',
  howToPlay: [
    'The orb drifts one square at a time in a straight line.',
    'As the orb slips past the corner of an attractor (+), it swings round towards it. As it nears the corner of a repulsor (−), it veers away.',
    'A strong attractor (++) reaches one square further. Each device bends the orb once; if two disagree, the orb keeps straight.',
    'Walls and devices stop the orb.',
    'Tap squares to place your devices, then Launch. Pass every numbered gate, then reach the exit.',
  ],
  tutorials: GRAVITY_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Launches ${s.launches} · Devices ${s.placed.filter(Boolean).length}/${s.inventory.length}`,
  levelNote: (s) => (s.cells.some((c) => c.t === 'fixed') ? 'Fixed devices are already part of the lab.' : null),
  successMessage: (s) => (s.cells.some((c) => c.t === 'gate') ? 'The orb flew through every gate to the exit.' : 'The orb flew to the exit.'),
  finishDelayMs: (s) => (s.lastRun ? s.lastRun.path.length * 140 + 400 : 0),
  scoreExplanation: (s, { hintsUsed }) => `100 for reaching the exit. ${s.launches} launch${s.launches === 1 ? '' : 'es'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
