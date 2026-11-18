import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText, Button, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { beats, itemId, MACHINE_TUTORIALS, outputOf, slotId, type MachineAction, type MachineState, type ModuleKind } from './logic';

const INFO: Record<ModuleKind, { label: string; what: string; color: string }> = {
  delay: { label: 'Delay', what: 'shifts every beat one count later (the last wraps round)', color: '#4FD1FF' },
  echo: { label: 'Echo', what: 'adds a beat right after each beat', color: '#FFD23F' },
  thin: { label: 'Thin', what: 'keeps only beats on counts 1, 3, 5 and 7', color: '#5BE38F' },
  flip: { label: 'Flip', what: 'swaps beats and rests', color: '#FF8FB8' },
  mirror: { label: 'Mirror', what: 'plays the rhythm backwards', color: '#B18CFF' },
};

function ModuleIcon({ kind, size = 30 }: { kind: ModuleKind; size?: number }) {
  const col = '#1A1245';
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Rect x={1} y={1} width={28} height={28} rx={8} fill={INFO[kind].color} />
      {kind === 'delay' ? <Path d="M8 15 H20 M16 10 L21 15 L16 20" stroke={col} strokeWidth={3} fill="none" strokeLinecap="round" /> : null}
      {kind === 'echo' ? (
        <>
          <Circle cx={11} cy={15} r={4} fill={col} />
          <Circle cx={20} cy={15} r={4} fill="none" stroke={col} strokeWidth={2} />
        </>
      ) : null}
      {kind === 'thin' ? <Path d="M8 9 V21 M15 9 V21 M22 9 V21" stroke={col} strokeWidth={3} strokeDasharray="3 3" /> : null}
      {kind === 'flip' ? <Path d="M8 11 H22 L18 7 M22 19 H8 L12 23" stroke={col} strokeWidth={2.5} fill="none" strokeLinecap="round" /> : null}
      {kind === 'mirror' ? <Path d="M15 6 V24 M6 15 L11 11 V19 Z M24 15 L19 11 V19 Z" stroke={col} strokeWidth={2} fill={col} /> : null}
    </Svg>
  );
}

function Rhythm({ pattern, label, compare }: { pattern: number; label: string; compare?: number }) {
  const b = beats(pattern);
  const t = compare === undefined ? null : beats(compare);
  return (
    <View style={styles.rhythmRow} accessible accessibilityLabel={`${label}: ${b.map((x, i) => `${i + 1} ${x ? 'beat' : 'rest'}`).join(', ')}`}>
      <AppText variant="caption" tone="secondary" style={styles.rhythmLabel}>
        {label}
      </AppText>
      <View style={styles.rhythm}>
        {b.map((on, i) => {
          const wrong = t ? t[i] !== on : false;
          return (
            <View key={i} style={[styles.beatCell, wrong && styles.wrongCell]}>
              <View style={[styles.beat, on ? styles.beatOn : styles.beatOff]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<MachineState, MachineAction>) {
  const haptics = useHaptics();
  const [ranKey, setRanKey] = useState(-1);
  const full = state.slots.every((x) => x !== null);
  const showOutput = ranKey === state.tests && state.tests > 0;
  const kinds = [...new Set(state.inventory)];
  return (
    <View style={styles.wrapper}>
      <Rhythm pattern={state.input} label="Input" />
      <View style={styles.machine}>
        {state.slots.map((item, i) => (
          <View key={i} style={styles.slotWrap}>
            {i ? <AppText tone="muted">→</AppText> : null}
            <Pressable
              testID={slotId(i)}
              accessibilityRole="button"
              accessibilityLabel={`Slot ${i + 1}: ${item === null ? 'empty' : INFO[state.inventory[item]!].label}`}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'slot', index: i });
              }}
              style={[styles.slot, highlightIds.includes(slotId(i)) && styles.highlight, state.holding !== null && styles.slotReady]}
            >
              {item === null ? <AppText tone="muted">{i + 1}</AppText> : <ModuleIcon kind={state.inventory[item]!} size={40} />}
            </Pressable>
          </View>
        ))}
      </View>
      {showOutput ? <Rhythm pattern={outputOf(state)} label="Output" compare={state.target} /> : null}
      <Rhythm pattern={state.target} label="Target" />
      <View style={styles.tray}>
        {state.inventory.map((k, i) => {
          const placed = state.slots.includes(i);
          return (
            <Pressable
              key={i}
              testID={itemId(i)}
              accessibilityRole="button"
              accessibilityLabel={`${INFO[k].label} module${placed ? ', in a slot' : ''}${state.holding === i ? ', picked up' : ''}`}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'pick', item: i });
              }}
              style={[styles.trayItem, state.holding === i && styles.holding, placed && styles.placed, highlightIds.includes(itemId(i)) && styles.highlight]}
            >
              <ModuleIcon kind={k} />
              <AppText variant="caption">{INFO[k].label}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        {kinds.map((k) => (
          <AppText key={k} variant="caption" tone="secondary">
            <AppText variant="caption" tone="gold">
              {INFO[k].label}
            </AppText>{' '}
            {INFO[k].what}.
          </AppText>
        ))}
      </View>
      <View style={styles.row}>
        <Button label="Clear" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'clear' })} />
        <Button
          label="Run machine"
          variant="play"
          size="sm"
          disabled={disabled || !full}
          onPress={() => {
            setRanKey(state.tests + 1);
            onAction({ type: 'run' });
          }}
        />
      </View>
      {showOutput && !state.solved ? (
        <AppText variant="caption" tone="danger" style={styles.center} accessibilityLiveRegion="polite">
          The output misses the target on the outlined counts.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  rhythmRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  rhythmLabel: { width: 52 },
  rhythm: { flex: 1, flexDirection: 'row', gap: 4 },
  beatCell: { flex: 1, aspectRatio: 1, maxHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: 'rgba(10,6,30,0.45)', borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  wrongCell: { borderColor: '#FF7A7A' },
  beat: { width: '55%', aspectRatio: 1, borderRadius: 100 },
  beatOn: { backgroundColor: colors.gold },
  beatOff: { borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.3)' },
  machine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: radii.lg, backgroundColor: '#3A2C5E', borderWidth: 2, borderStyle: 'solid', borderColor: '#C98A4A' },
  slotWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  slot: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: '#1F1656', borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.25)' },
  slotReady: { borderColor: colors.gold },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  trayItem: { alignItems: 'center', gap: 2, padding: spacing.xs, minWidth: 64, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  holding: { borderColor: colors.gold },
  placed: { opacity: 0.45 },
  legend: { alignSelf: 'stretch', gap: 2 },
  row: { flexDirection: 'row', gap: spacing.md },
});

export const impossibleMachineUi: GameUi<MachineState, MachineAction> = {
  gameId: 'W6-G05',
  howToPlay: [
    'An 8-count rhythm loops into the machine and passes through its slots from left to right.',
    'Each module reshapes the rhythm: delay, echo, thin, flip or mirror. The legend says exactly how.',
    'Pick a module, tap a slot to place it, then Run the machine. Match the target rhythm.',
    'Order matters, and some modules are spares. Fewer runs earn a bigger bonus.',
  ],
  tutorials: MACHINE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Runs ${s.tests} · Slots ${s.slots.length} · Modules ${s.inventory.length}`,
  levelNote: (s) => (s.inventory.length > s.slots.length ? 'Not every module is needed.' : null),
  successMessage: () => 'The machine plays the target rhythm perfectly.',
  scoreExplanation: (s, { hintsUsed }) => `100 for fixing the machine. ${s.tests} run${s.tests === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
