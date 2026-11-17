import {
  causes,
  consistent,
  consistentRules,
  describeRule,
  determines,
  observe,
  parseSpecimen,
  passes,
  ruleSpace,
  specimenCode,
  UNIVERSE,
} from '../rules';
import { parseRule } from '../authored';

const sp = parseSpecimen;

describe('specimens', () => {
  it('has 96 distinct specimens', () => {
    expect(UNIVERSE).toHaveLength(96);
    expect(new Set(UNIVERSE.map(specimenCode)).size).toBe(96);
  });

  it('round-trips compact codes and rejects bad ones', () => {
    expect(sp('Lbt2')).toEqual({ size: 'large', colour: 'blue', shape: 'triangle', marks: 2 });
    expect(specimenCode(sp('Syh1'))).toBe('Syh1');
    for (const bad of ['Xbt2', 'Lxt2', 'Lbz2', 'Lbt4', 'Lbt']) expect(() => sp(bad)).toThrow();
  });
});

describe('rules', () => {
  it.each([
    ['shape=triangle', 'Lrt1', true, []],
    ['shape=triangle', 'Lrc1', false, ['shape']],
    ['colour!=blue', 'Lbc1', false, ['colour']],
    ['marks>=2', 'Lrc1', false, ['marks']],
    ['marks<=2', 'Lrc3', false, ['marks']],
    ['shape=circle&size=large', 'Lrc1', true, []],
    ['shape=circle&size=large', 'Sgs1', false, ['shape', 'size']],
    ['shape=circle&size=large', 'Src1', false, ['size']],
    ['colour=red|shape=square', 'Lbs1', true, []],
    ['colour=red|shape=square', 'Lbc1', false, ['shape', 'colour']],
    ['colour=blue&!shape=square', 'Lbs1', false, ['shape']],
    ['colour=blue&!shape=square', 'Lrc1', false, ['colour']],
    ['colour=blue&!shape=square', 'Lrs1', false, ['shape', 'colour']],
  ] as const)('%s on %s → pass %s, causes %j', (rule, code, pass, why) => {
    const r = parseRule(rule);
    expect(passes(r, sp(code))).toBe(pass);
    expect(causes(r, sp(code))).toEqual(why);
  });

  it('describes rules in plain words', () => {
    expect(describeRule(parseRule('shape=hexagon'))).toBe('A specimen passes when it is a hexagon.');
    expect(describeRule(parseRule('colour!=blue'))).toBe('A specimen passes unless it is blue.');
    expect(describeRule(parseRule('colour=blue&!shape=square'))).toBe('A specimen passes when it is blue, unless it is a square.');
    expect(describeRule(parseRule('marks>=2'))).toBe('A specimen passes when it has 2 or more marks.');
  });

  it('rule spaces grow with the band and include earlier forms', () => {
    const sizes = (['intro', 'easy', 'standard', 'advanced', 'expert'] as const).map((b) => ruleSpace(b).length);
    expect(sizes).toEqual([13, 26, 92, 154, 278]);
  });

  it('consistency uses both the result and the reported causes', () => {
    const truth = parseRule('shape=circle&size=large');
    const o = observe(truth, sp('Src1'));
    expect(consistent(parseRule('size=large'), o)).toBe(true);
    expect(consistent(parseRule('shape=circle'), o)).toBe(false);
  });

  it('decides when evidence forces the answers', () => {
    const truth = parseRule('shape=triangle');
    const evidence = ['Lrt1', 'Lgc1'].map((c) => observe(truth, sp(c)));
    const left = consistentRules(ruleSpace('intro'), evidence);
    expect(left.map((r) => JSON.stringify(r))).toEqual([JSON.stringify(truth)]);
    expect(determines(left, [sp('Sbt3'), sp('Syh2')])).toBe(true);
    const weak = consistentRules(ruleSpace('intro'), [observe(truth, sp('Lrt1'))]);
    expect(determines(weak, [sp('Sbs1')])).toBe(false);
  });
});
