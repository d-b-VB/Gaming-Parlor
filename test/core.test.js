import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateBoard, matchesSelector, estimateTargets, createClubBet, buyClubBet, settleRound, unlockMode, buySpade, spadeCost, streakDuration } from '../src/game/core.js';

const items = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/items.json', import.meta.url))).items;
const selectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/category_selectors.json', import.meta.url))).selectors;
const defaultState = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/default_state.json', import.meta.url)));

test('selector matching supports required tags and exact colors', () => {
  assert.equal(matchesSelector({ kind: 'emoji', tags: ['animal', 'arthropod'], colors: [], glyph: '🐜' }, { requiredTags: ['arthropod'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['flag'], colors: ['red', 'white'], glyph: '🇯🇵' }, { exactColors: ['white', 'red'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['flag'], colors: ['red', 'white', 'blue'], glyph: '🇺🇸' }, { exactColors: ['white', 'red'] }), false);
  assert.equal(matchesSelector({ kind: 'emoji', tags: ['round'], colors: [], glyph: '⚽' }, { kinds: ['emoji', 'symbol'], requiredTags: ['round'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['round'], colors: [], glyph: '🏳️' }, { kinds: ['emoji', 'symbol'], requiredTags: ['round'] }), false);
});

test('board generation creates valid unique boards for each mode', () => {
  const expectations = { sort_2: [4, 16], sort_3: [6, 24], sort_4: [8, 32] };
  for (const [modeId, [groups, prompts]] of Object.entries(expectations)) {
    const board = generateBoard(modeId, `seed-${modeId}`, items, selectors);
    assert.equal(board.groups.length, groups);
    assert.equal(board.queue.length, prompts);
    assert.equal(new Set(board.queue.map((prompt) => prompt.item.glyph)).size, prompts);
  }
});

test('board generation is reproducible from a stored seed', () => {
  const a = generateBoard('sort_2', 'same-seed', items, selectors);
  const b = generateBoard('sort_2', 'same-seed', items, selectors);
  assert.deepEqual(a.queue.map((prompt) => prompt.item.id), b.queue.map((prompt) => prompt.item.id));
});

test('economy handles unlocks, club bets, spades, memory, and winnings', () => {
  let state = structuredClone(defaultState);
  state = unlockMode(state, 'sort_3');
  assert.equal(state.unlockedModes.sort_3, true);
  const offer = estimateTargets('sort_2', state.gameMemory.sort_2.entries)[0];
  state = buyClubBet(state, createClubBet('sort_2', offer, 2));
  assert.equal(state.activeClubBet.oddsLabel, offer.oddsLabel);
  assert.equal(state.resources.diamonds, 3);
  state.resources.diamonds = 100;
  state = buySpade(state, 'sort_2');
  assert.equal(state.upgrades.spades.sort_2, 1);
  state = settleRound(state, 'sort_2', offer.timeSeconds - 1, 0, 'economy-seed', 'test');
  assert.equal(state.activeClubBet, null);
  assert.equal(state.eventLog.at(-1).betWinnings, 1);
  assert.equal(state.gameMemory.sort_3.entries.at(-1).entryType, 'rest');
});


test('bet propositions use sensible odds and require enough actual history', () => {
  const lowHistory = structuredClone(defaultState).gameMemory.sort_2.entries.slice(0, 5);
  const lowTargets = estimateTargets('sort_2', lowHistory);
  assert.deepEqual(lowTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.deepEqual(lowTargets.map((target) => target.available), [true, false, false, false, false]);
  const richHistory = Array.from({ length: 20 }, (_, index) => ({ timeSeconds: 45 - index, entryType: 'actual', createdAt: `t${index}` }));
  const richTargets = estimateTargets('sort_2', richHistory);
  assert.deepEqual(richTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.deepEqual(richTargets.map((target) => target.available), [true, true, true, true, true]);
  assert.ok(richTargets[4].timeSeconds < richTargets[0].timeSeconds);
});

test('spade costs and streak animation scale upward and downward respectively', () => {
  assert.equal(spadeCost('sort_2', 0), 8);
  assert.equal(spadeCost('sort_4', 0), 10);
  assert.ok(spadeCost('global', 1) > spadeCost('global', 0));
  assert.ok(streakDuration(220, 10) < 220);
  assert.equal(streakDuration(220, 100), 121);
});
