import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { AppText, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { canStart, energyLeft, machineId, priceOf, WORKSHOP_TUTORIALS, type Kind, type WorkshopAction, type WorkshopState } from './logic';

const KIND_NAME: Record<Kind, string> = { gear: 'gear (makes linked machines 1 cheaper)', boiler: 'boiler (makes linked machines 1 dearer)', lock: 'lock (needs a linked machine running)', plain: 'machine' };

function KindIcon({ kind, size, on }: { kind: Kind; size: number; on: boolean }) {
  const c = size / 2;
  const col = on ? '#FFD23F' : '#B9B2E8';
  return (
    <Svg width={size} height={size}>
      {kind === 'gear' ? (
        <G>
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <Rect key={k} x={c - 4} y={c - size * 0.42} width={8} height={size * 0.2} fill={col} transform={`rotate(${(a * 180) / Math.PI} ${c} ${c})`} />;
          })}
          <Circle cx={c} cy={c} r={size * 0.26} fill={col} />
          <Circle cx={c} cy={c} r={size * 0.1} fill="#1A1245" />
        </G>
      ) : null}
      {kind === 'boiler' ? <Path d={`M ${c} ${size * 0.12} C ${c + size * 0.35} ${size * 0.4} ${c + size * 0.28} ${size * 0.85} ${c} ${size * 0.88} C ${c - size * 0.28} ${size * 0.85} ${c - size * 0.35} ${size * 0.4} ${c} ${size * 0.12} Z`} fill={on ? '#FF8A3D' : '#B9B2E8'} /> : null}
      {kind === 'lock' ? (
        <G>
          <Path d={`M ${c - size * 0.18} ${c} V ${c - size * 0.16} A ${size * 0.18} ${size * 0.18} 0 0 1 ${c + size * 0.18} ${c - size * 0.16} V ${c}`} fill="none" stroke={col} strokeWidth={5} />
          <Rect x={c - size * 0.28} y={c - 2} width={size * 0.56} height={size * 0.38} rx={5} fill={col} />
        </G>
      ) : null}
      {kind === 'plain' ? <Rect x={size * 0.2} y={size * 0.2} width={size * 0.6} height={size * 0.6} rx={8} fill={col} /> : null}
    </Svg>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<WorkshopState, WorkshopAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const rows = Math.ceil((Math.max(...state.machines.map((m) => m.slot)) + 1) / state.cols);
  const cell = Math.floor(Math.min(96, (width - spacing.lg * 2 - spacing.md * 2) / state.cols));
  const running = new Set(state.running);
  const left = energyLeft(state);
  const pos = (slot: number) => ({ x: (slot % state.cols) * cell + cell / 2, y: Math.floor(slot / state.cols) * cell + cell / 2 });
  return (
    <View style={styles.wrapper}>
      <View style={styles.energy} accessible accessibilityLabel={`Energy ${left} of ${state.budget}`}>
        <AppText variant="label">Energy</AppText>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${(left / Math.max(1, state.budget)) * 100}%` }]} />
        </View>
        <AppText variant="label" tone="gold">
          {left}/{state.budget}
        </AppText>
      </View>
      <View style={{ width: cell * state.cols, height: cell * rows }}>
        <Svg width={cell * state.cols} height={cell * rows} style={StyleSheet.absoluteFill}>
          {state.links.map(([a, b], i) => {
            const p = pos(state.machines[a]!.slot);
            const q = pos(state.machines[b]!.slot);
            const live = running.has(a) || running.has(b);
            return <Line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={live ? '#FFD23F' : '#FFFFFF'} strokeOpacity={live ? 0.8 : 0.25} strokeWidth={live ? 5 : 3} />;
          })}
        </Svg>
        {state.machines.map((m, i) => {
          const p = pos(m.slot);
          const on = running.has(i);
          const price = priceOf(state, running, i);
          const ok = canStart(state, running, i) && price <= left;
          const size = cell * 0.78;
          return (
            <Pressable
              key={i}
              testID={machineId(i)}
              accessibilityRole="button"
              accessibilityLabel={`${m.target ? 'Starred ' : ''}${KIND_NAME[m.kind]}, ${on ? 'running' : `costs ${price}${ok ? '' : m.kind === 'lock' && !canStart(state, running, i) ? ', locked' : ', not enough energy'}`}`}
              disabled={disabled || on}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'start', machine: i });
              }}
              style={[styles.machine, { left: p.x - size / 2, top: p.y - size / 2, width: size, height: size }, on && styles.on, !on && !ok && styles.unavailable, highlightIds.includes(machineId(i)) && styles.highlight]}
            >
              <KindIcon kind={m.kind} size={size * 0.62} on={on} />
              {m.target ? (
                <Svg width={22} height={22} style={styles.star}>
                  <Polygon points="11,1 14,8 21,8 15.5,12.5 17.5,20 11,15.5 4.5,20 6.5,12.5 1,8 8,8" fill={on ? '#5BE38F' : '#FFD23F'} stroke="#1A1245" strokeWidth={1.5} />
                </Svg>
              ) : null}
              {!on ? (
                <View style={styles.price}>
                  <AppText variant="caption" tone="onGold">
                    {price}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" tone="secondary" style={styles.center}>
        Start every ★ machine. Running gears cut linked prices by 1; boilers raise them by 1.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  energy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  bar: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.glass, overflow: 'hidden' },
  fill: { height: 12, backgroundColor: colors.gold },
  machine: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: '#2A2266', borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.25)' },
  on: { backgroundColor: '#3D2E8C', borderColor: '#FFD23F' },
  unavailable: { opacity: 0.55 },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  star: { position: 'absolute', top: -6, right: -6 },
  price: { position: 'absolute', bottom: -6, minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold },
});

export const limitedMovesUi: GameUi<WorkshopState, WorkshopAction> = {
  gameId: 'W4-G04',
  howToPlay: [
    'Start every machine marked ★ without running out of energy. Tap a machine to start it; its price is on the gold coin.',
    'Machines keep running. A running gear makes each linked machine 1 cheaper; a running boiler makes each linked machine 1 dearer.',
    'Locks can start only once a machine linked to them is running.',
    'Order is everything. Undo or reset any time.',
  ],
  tutorials: WORKSHOP_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Energy ${energyLeft(s)}/${s.budget} · Running ${s.running.length}`,
  levelNote: (s) => (s.budget === s.minCost ? 'The budget is exact: there is no energy to spare.' : null),
  successMessage: () => 'Every starred machine is humming.',
  scoreExplanation: (s, { hintsUsed }) => `100 for starting every starred machine. ${s.undos} undo${s.undos === 1 ? '' : 's'} or reset${s.undos === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
