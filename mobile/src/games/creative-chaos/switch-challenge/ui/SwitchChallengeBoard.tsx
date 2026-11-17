import { memo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, colors, Icon, radii, spacing, typography, useHaptics } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { switchId } from '../module';
import { pressesLeft } from '../rules';
import { SWITCH_NAMES, type SwitchAction, type SwitchState } from '../types';
import { machineColors, wireColors } from './theme';
import { dialLabel, statusMessage, switchLabel } from './view';

const DIAL_ROW = 96;
const WIRE_GAP = 140;

/** Gauge with numbered ticks on an arc, a needle and a gold target notch. */
const Dial = memo(function Dial({ value, target, levels, size }: { value: number; target: number; levels: number; size: number }) {
  const c = size / 2;
  const r = size * 0.42;
  // Ticks spread over a 240° arc, starting bottom-left.
  const angle = (v: number) => ((-210 + (240 * v) / (levels - 1)) * Math.PI) / 180;
  const pt = (v: number, rad: number) => ({ x: c + rad * Math.cos(angle(v)), y: c + rad * Math.sin(angle(v)) });
  // The needle stops short of the tick labels so the current number is never covered.
  const needle = pt(value, r * 0.42);
  const notch = pt(target, r * 1.02);
  const matched = value === target;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={c} cy={c} r={r} fill={machineColors.dialFace} stroke={matched ? machineColors.dialMatched : machineColors.dialRim} strokeWidth={matched ? 4 : 2} />
      {Array.from({ length: levels }, (_, v) => {
        const p = pt(v, r * 0.74);
        return (
          <SvgText key={v} x={p.x} y={p.y + 5} fontSize={13} fontWeight="bold" textAnchor="middle" fill={v === value ? '#FFFFFF' : machineColors.tick}>
            {v}
          </SvgText>
        );
      })}
      <Circle cx={notch.x} cy={notch.y} r={5} fill={machineColors.target} stroke="#1A1245" strokeWidth={1.5} />
      <Line x1={c} y1={c} x2={needle.x} y2={needle.y} stroke={machineColors.needle} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={c} cy={c} r={5} fill={machineColors.needle} />
    </Svg>
  );
});

export function SwitchChallengeBoard({ state, onAction, highlightIds, disabled }: GameBoardProps<SwitchState, SwitchAction>) {
  const { width: screen } = useWindowDimensions();
  const haptics = useHaptics();
  const width = screen - spacing.lg * 2 - spacing.md * 2;
  const n = state.start.length;
  const m = state.switches.length;
  const dialSize = Math.min(DIAL_ROW, Math.floor(width / n) - 6);
  const dialX = (i: number) => ((i + 0.5) * width) / n;
  const switchX = (j: number) => ((j + 0.5) * width) / m;
  const leverW = Math.min(72, Math.floor(width / m) - 8);
  const out = pressesLeft(state) <= 0;

  return (
    <View style={styles.wrapper}>
      <View style={{ width, height: dialSize + 28 + WIRE_GAP }}>
        {/* Wires for discovered switches, drawn beneath the dials. */}
        <Svg width={width} height={dialSize + 28 + WIRE_GAP} style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {state.switches.map((sw, j) => {
            if (!state.discovered[j]) return null;
            const color = wireColors[j % wireColors.length]!;
            const y1 = dialSize + 28 + WIRE_GAP;
            return (
              <G key={j}>
                {sw.effects.map((e, k) => {
                  const x2 = dialX(e.dial) + (j - (m - 1) / 2) * 6;
                  // Tags sit just below the dial captions so they never cover them.
                  const y2 = dialSize + 30;
                  return (
                    <G key={k}>
                      <Path d={`M ${switchX(j)} ${y1} C ${switchX(j)} ${y1 - 60}, ${x2} ${y2 + 60}, ${x2} ${y2 + 18}`} stroke={color} strokeWidth={3} fill="none" />
                      <Rect x={x2 - 15} y={y2 + 2} width={30} height={18} rx={9} fill={color} />
                      <SvgText x={x2} y={y2 + 15} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#1A1245">
                        {SWITCH_NAMES[j]}
                        {e.delta > 0 ? '▲' : '▼'}
                      </SvgText>
                    </G>
                  );
                })}
                {sw.condition ? (
                  <Path
                    d={`M ${switchX(j)} ${y1} L ${dialX(sw.condition.dial)} ${dialSize + 50}`}
                    stroke={machineColors.lock}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="none"
                  />
                ) : null}
              </G>
            );
          })}
        </Svg>
        <View style={styles.dials}>
          {state.dials.map((v, i) => (
            <View key={i} style={[styles.dialCell, { width: width / n }]} accessible accessibilityLabel={dialLabel(state, i)}>
              <Dial value={v} target={state.target[i]!} levels={state.levels} size={dialSize} />
              <AppText variant="caption" tone={v === state.target[i] ? 'success' : 'muted'}>
                {v === state.target[i] ? '✓ ' : ''}Dial {i + 1}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.levers, { width }]}>
        {state.switches.map((sw, j) => {
          const highlighted = highlightIds.includes(switchId(j));
          return (
            <View key={j} style={[styles.leverCell, { width: width / m }]}>
              <Pressable
                testID={switchId(j)}
                accessibilityRole="button"
                accessibilityLabel={switchLabel(state, j)}
                accessibilityState={{ disabled: disabled || out }}
                disabled={disabled || out}
                onPress={() => {
                  haptics.impact();
                  onAction({ type: 'press', index: j });
                }}
                style={({ pressed }) => [
                  styles.lever,
                  { width: leverW, borderColor: state.discovered[j] ? wireColors[j % wireColors.length] : 'rgba(255,255,255,0.25)' },
                  highlighted && styles.highlighted,
                  pressed && styles.pressed,
                  out && styles.dim,
                ]}
              >
                <View style={styles.leverTop} />
                <AppText style={styles.leverName}>{SWITCH_NAMES[j]}</AppText>
                {state.discovered[j] && sw.condition ? (
                  <View style={styles.lockBadge}>
                    <Icon name="lock" size={12} color="#1A1245" />
                    <AppText style={styles.lockText}>
                      {sw.condition.dial + 1}={sw.condition.level}
                    </AppText>
                  </View>
                ) : null}
                {!state.discovered[j] ? <AppText style={styles.unknown}>?</AppText> : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <AppText variant="caption" tone={out || (state.lastPress && !state.lastPress.fired) ? 'danger' : 'secondary'} accessibilityLiveRegion="polite" style={styles.message}>
        {statusMessage(state)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  dials: { flexDirection: 'row' },
  dialCell: { alignItems: 'center' },
  levers: { flexDirection: 'row', marginTop: -spacing.sm },
  leverCell: { alignItems: 'center' },
  lever: {
    height: 84,
    borderRadius: radii.md,
    backgroundColor: machineColors.lever,
    borderWidth: 3,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leverTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: machineColors.leverTop },
  leverName: { ...typography.title, color: '#FFFFFF' },
  unknown: { position: 'absolute', top: 2, right: 6, color: colors.textMuted, fontFamily: typography.label.fontFamily },
  lockBadge: { position: 'absolute', bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, borderRadius: 8, backgroundColor: machineColors.lock },
  lockText: { fontSize: 11, lineHeight: 14, color: '#1A1245', fontFamily: typography.label.fontFamily },
  highlighted: { borderColor: machineColors.highlight, borderWidth: 5 },
  pressed: { transform: [{ translateY: 4 }] },
  dim: { opacity: 0.45 },
  message: { textAlign: 'center', minHeight: 20 },
});
