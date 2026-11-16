import { worldAccents } from '@/design-system/tokens';

import { makeCounterGame } from '../../game-runtime/__tests__/testGame';
import { games, gamesInWorld, getGame, getWorld, isPlayable, playableCount, worlds } from '../catalogue';
import { gameRegistry, registerGame } from '../registry';

describe('catalogue', () => {
  beforeEach(() => gameRegistry.clear());

  it('has six worlds in order, each with an accent', () => {
    expect(worlds.map((w) => w.id)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']);
    expect(worlds.map((w) => w.sortOrder)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const w of worlds) expect(worldAccents[w.id]).toBeDefined();
  });

  it('has 30 games, five per world', () => {
    expect(games).toHaveLength(30);
    for (const w of worlds) expect(gamesInWorld(w.id)).toHaveLength(5);
  });

  it('uses unique ids, slugs and titles', () => {
    for (const key of ['id', 'slug', 'title'] as const) {
      expect(new Set(games.map((g) => g[key])).size).toBe(30);
    }
    expect(new Set(worlds.map((w) => w.slug)).size).toBe(6);
  });

  it('uses GDD-style ids that match the world', () => {
    for (const g of games) {
      expect(g.id).toMatch(/^W[1-6]-G0[1-5]$/);
      expect(g.id.startsWith(g.worldId)).toBe(true);
      expect(g.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('fills every metadata field', () => {
    for (const g of games) {
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.mechanic.length).toBeGreaterThan(0);
      expect(g.summary.length).toBeGreaterThan(20);
      expect(g.primarySignal.length).toBeGreaterThan(0);
      expect(['procedural', 'authored', 'hybrid']).toContain(g.generatorType);
      expect(g.offline).toBe(true);
    }
  });

  it('avoids clinical wording in player-facing copy', () => {
    const banned = /\b(iq|diagnos\w*|treat\w*|clinical|therapy|dementia|cognitive)\b/i;
    for (const g of games) expect(`${g.title} ${g.summary} ${g.primarySignal}`).not.toMatch(banned);
    for (const w of worlds) expect(`${w.title} ${w.tagline}`).not.toMatch(banned);
  });

  it('looks up worlds and games', () => {
    expect(getWorld('W3').title).toBe('Spatial Dimension');
    expect(getGame('W3-G01')?.title).toBe('Arrow Escape');
    expect(getGame('W9-G01')).toBeUndefined();
  });

  it('marks nothing playable until a module is registered', () => {
    expect(playableCount()).toBe(0);
    expect(games.some((g) => isPlayable(g.id))).toBe(false);
  });

  it('derives playability from the registry', () => {
    registerGame({ ...makeCounterGame(), id: 'W3-G01' });
    expect(isPlayable('W3-G01')).toBe(true);
    expect(isPlayable('W3-G02')).toBe(false);
    expect(playableCount()).toBe(1);
    expect(playableCount('W3')).toBe(1);
    expect(playableCount('W1')).toBe(0);
  });
});
