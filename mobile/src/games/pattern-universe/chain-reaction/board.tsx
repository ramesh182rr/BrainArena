import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, Button, radii, spacing, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { CHAIN_TUTORIALS, nodeId, rotatable, type ChainAction, type ChainNode, type ChainState } from './logic';

const DIR_NAMES = ['up', 'right', 'down', 'left'];

function Arrow({ c, len, dir, color }: { c: number; len: number; dir: number; color: string }) {
  const a = (dir * Math.PI) / 2;
  const x = c + Math.sin(a) * len;
  const y = c - Math.cos(a) * len;
  return (
    <G>
      <Line x1={c} y1={c} x2={x} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={x} cy={y} r={3.5} fill={color} />
    </G>
  );
}

function NodeArt({ node, orient, size, lit, fired }: { node: ChainNode; orient: number; size: number; lit: boolean; fired: boolean }) {
  const c = size / 2;
  const r = size * 0.3;
  const ink = '#1A1245';
  switch (node.t) {
    case 'wall':
      return <Rect x={3} y={3} width={size - 6} height={size - 6} rx={6} fill="#0E0A2A" />;
    case 'source':
      return (
        <G>
          <Circle cx={c} cy={c} r={r} fill="#FFD23F" stroke={ink} strokeWidth={2} />
          <Path d={`M ${c + 2} ${c - 9} L ${c - 5} ${c + 2} L ${c} ${c + 2} L ${c - 2} ${c + 9} L ${c + 5} ${c - 2} L ${c} ${c - 2} Z`} fill={ink} />
          <Arrow c={c} len={size * 0.44} dir={node.dir} color="#FFD23F" />
        </G>
      );
    case 'relay':
      return (
        <G>
          <Circle cx={c} cy={c} r={r} fill={fired ? '#4FD1FF' : '#2E2470'} stroke="#4FD1FF" strokeWidth={2.5} />
          {node.slow ? (
            <SvgText x={c} y={c + 5} fontSize={13} fontWeight="bold" textAnchor="middle" fill={fired ? ink : '#FFFFFF'}>
              2
            </SvgText>
          ) : null}
          <Arrow c={c} len={size * 0.44} dir={orient} color="#4FD1FF" />
        </G>
      );
    case 'split':
      return (
        <G>
          <Path d={`M ${c} ${c - r} L ${c + r} ${c} L ${c} ${c + r} L ${c - r} ${c} Z`} fill={fired ? '#FF7AD9' : '#2E2470'} stroke="#FF7AD9" strokeWidth={2.5} />
          <Arrow c={c} len={size * 0.44} dir={orient === 0 ? 0 : 1} color="#FF7AD9" />
          <Arrow c={c} len={size * 0.44} dir={orient === 0 ? 2 : 3} color="#FF7AD9" />
        </G>
      );
    case 'twin':
      return (
        <G>
          <Circle cx={c} cy={c} r={r} fill={fired ? '#5BE38F' : '#2E2470'} stroke="#5BE38F" strokeWidth={2.5} />
          <Circle cx={c} cy={c} r={r * 0.6} fill="none" stroke="#5BE38F" strokeWidth={2} />
          <Arrow c={c} len={size * 0.44} dir={node.dir} color="#5BE38F" />
        </G>
      );
    case 'star':
      return (
        <Path
          d={Array.from({ length: 10 }, (_, i) => {
            const a = (i * Math.PI) / 5;
            const rad = i % 2 === 0 ? r * 1.2 : r * 0.5;
            return `${i === 0 ? 'M' : 'L'} ${c + rad * Math.sin(a)} ${c - rad * Math.cos(a)}`;
          }).join(' ') + ' Z'}
          fill={lit ? '#FFD23F' : 'none'}
          stroke="#FFD23F"
          strokeWidth={2.5}
        />
      );
    default:
      return null;
  }
}

function describe(node: ChainNode, orient: number): string {
  switch (node.t) {
    case 'empty':
      return 'Empty';
    case 'wall':
      return 'Wall';
    case 'source':
      return `Source firing ${DIR_NAMES[node.dir]}`;
    case 'relay':
      return `${node.slow ? 'Slow relay' : 'Relay'} pointing ${DIR_NAMES[orient]}`;
    case 'split':
      return `Splitter firing ${orient === 0 ? 'up and down' : 'left and right'}`;
    case 'twin':
      return `Twin lock firing ${DIR_NAMES[node.dir]} when two pulses meet`;
    case 'star':
      return 'Star';
  }
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<ChainState, ChainAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const size = Math.floor(Math.min(58, (width - spacing.lg * 2 - spacing.md * 2) / state.width));
  const run = state.lastRun;
  const maxTick = run ? Math.max(0, ...run.trail.map((t) => t.tick)) : 0;
  const [tick, setTick] = useState({ key: -1, value: 0 });
  const showTick = reduceMotion || !run ? maxTick : tick.key === state.fires ? tick.value : 0;
  useEffect(() => {
    if (!run || reduceMotion) return;
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setTick({ key: state.fires, value: t });
      if (t >= maxTick) clearInterval(id);
    }, 160);
    return () => clearInterval(id);
  }, [run, reduceMotion, maxTick, state.fires]);
  const trail = new Set(run ? run.trail.filter((t) => t.tick <= showTick).map((t) => t.cell) : []);
  const shown = showTick >= maxTick;
  const stars = state.nodes.filter((n) => n.t === 'star').length;
  return (
    <View style={styles.wrapper}>
      <View style={[styles.grid, { width: size * state.width }]}>
        {state.nodes.map((n, i) => {
          const lit = shown && !!run?.lit.includes(i);
          const fired = shown && !!run?.fired.includes(i);
          const label = `${describe(n, state.orient[i] ?? 0)}${lit ? ', lit' : ''}.`;
          const content = (
            <Svg width={size} height={size}>
              {trail.has(i) ? <Rect x={2} y={2} width={size - 4} height={size - 4} rx={8} fill="rgba(255,210,63,0.25)" /> : null}
              <NodeArt node={n} orient={state.orient[i] ?? 0} size={size} lit={lit} fired={fired} />
            </Svg>
          );
          return rotatable(n) ? (
            <Pressable
              key={i}
              testID={nodeId(i)}
              accessibilityRole="button"
              accessibilityLabel={`${label} Tap to turn.`}
              disabled={disabled || state.rotations >= state.budget}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'rotate', cell: i });
              }}
              style={[styles.cell, { width: size, height: size }, highlightIds.includes(nodeId(i)) && styles.highlight]}
            >
              {content}
            </Pressable>
          ) : (
            <View key={i} accessible={n.t !== 'empty'} accessibilityLabel={label} style={[styles.cell, { width: size, height: size }]}>
              {content}
            </View>
          );
        })}
      </View>
      <AppText variant="caption" tone={run ? (run.success ? 'success' : 'danger') : 'secondary'} accessibilityLiveRegion="polite" style={styles.center}>
        {run && shown
          ? run.success
            ? 'Every star is lit!'
            : `${run.lit.length} of ${stars} stars lit. Turn some nodes and fire again.`
          : run
            ? 'Firing…'
            : state.rotations >= state.budget
              ? 'No turns left. Fire, or reset the turns.'
              : 'Turn relays and splitters, then fire.'}
      </AppText>
      <View style={styles.row}>
        <Button label="Fire" variant="play" disabled={disabled} onPress={() => onAction({ type: 'fire' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#1F1656', borderRadius: radii.sm },
  cell: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'solid' },
  highlight: { borderColor: '#FFE58A', borderWidth: 3 },
  row: { flexDirection: 'row', gap: spacing.md },
});

export const chainReactionUi: GameUi<ChainState, ChainAction> = {
  gameId: 'W4-G05',
  howToPlay: [
    'Press Fire: the source sends a pulse one square per tick.',
    'Relays fire on along their arrow one tick later (a 2 means two ticks). Splitters fire both ways.',
    'Twin locks (double ring) fire only when two pulses reach them in the same tick.',
    'Each node fires once. Turn nodes (within your turn budget), then fire to light every star.',
  ],
  tutorials: CHAIN_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Turns ${s.rotations}/${s.budget} · Fires ${s.fires}`,
  levelNote: (s) => (s.nodes.some((n) => n.t === 'twin') ? 'A twin lock needs two pulses in the same tick.' : null),
  successMessage: () => 'The chain lit every star.',
  finishDelayMs: (s) => (s.lastRun ? Math.max(0, ...s.lastRun.trail.map((t) => t.tick)) * 160 + 400 : 0),
  scoreExplanation: (s, { hintsUsed }) => `100 for lighting every star. ${s.rotations} turns (fewest ${s.par}), ${s.fires} fire${s.fires === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  resetAction: { type: 'reset' },
};
