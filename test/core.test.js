import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateBoard, matchesSelector, estimateTargets, heartSafety, createClubBet, buyClubBet, settleRound, settleItemTiming, unlockMode, buySpade, spadeCost, payoutScore, streakDuration } from '../src/game/core.js';

const items = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/items.json', import.meta.url))).items;
const selectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/category_selectors.json', import.meta.url))).selectors;
const defaultState = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/default_state.json', import.meta.url)));

test('catalog is expanded enough for strong prototype coverage', () => {
  assert.ok(items.length >= 603);
  assert.ok(selectors.length >= 94);
  assert.ok(items.filter((item) => item.kind === 'emoji').length >= 342);
});

test('selector matching supports required tags and exact colors', () => {
  assert.equal(matchesSelector({ kind: 'emoji', tags: ['animal', 'arthropod'], colors: [], glyph: '🐜' }, { requiredTags: ['arthropod'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['flag'], colors: ['red', 'white'], glyph: '🇯🇵' }, { exactColors: ['white', 'red'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['flag'], colors: ['red', 'white', 'blue'], glyph: '🇺🇸' }, { exactColors: ['white', 'red'] }), false);
  assert.equal(matchesSelector({ kind: 'emoji', tags: ['round'], colors: [], glyph: '⚽' }, { kinds: ['emoji', 'symbol'], requiredTags: ['round'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['round'], colors: [], glyph: '🏳️' }, { kinds: ['emoji', 'symbol'], requiredTags: ['round'] }), false);
});

test('flag geography categories are categorical and non-subjective', () => {
  assert.equal(selectors.some((selector) => selector.id === 'mountainous' || selector.id === 'coastal'), false);
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  const equatorialFlags = items.filter((item) => item.kind === 'flag' && item.tags.includes('equatorial')).map((item) => item.id).sort();
  const polarFlags = items.filter((item) => item.kind === 'flag' && item.tags.includes('polar')).map((item) => item.id).sort();
  assert.deepEqual(equatorialFlags, ['flag:brazil', 'flag:democratic_republic_congo', 'flag:ecuador', 'flag:indonesia', 'flag:kenya', 'flag:uganda']);
  assert.deepEqual(polarFlags, ['flag:antarctica', 'flag:canada', 'flag:finland', 'flag:greenland', 'flag:norway', 'flag:sweden', 'flag:united_states']);
  assert.equal(byId['flag:rwanda'].tags.includes('equatorial'), false);
  assert.equal(byId['flag:singapore'].tags.includes('equatorial'), false);
});

test('expanded tags keep biological and object categories literal', () => {
  const byGlyph = Object.fromEntries(items.map((item) => [item.glyph, item]));
  for (const glyph of ['🪱', '🐌', '🦂', '🕷️']) {
    assert.equal(byGlyph[glyph].tags.includes('insect'), false);
  }
  assert.equal(byGlyph['🦤'].tags.includes('flying'), false);
  assert.equal(byGlyph['🐧'].tags.includes('flying'), false);
  assert.equal(byGlyph['🦴'].tags.includes('hand'), false);
  assert.equal(byGlyph['🦿'].tags.includes('hand'), false);
  assert.equal(byGlyph['🫀'].tags.includes('hand'), false);
  assert.equal(byGlyph['🫶'].tags.includes('hand'), true);
  assert.equal(byGlyph['🍳'].tags.includes('human'), false);
  assert.equal(byGlyph['💼'].tags.includes('human'), false);
  assert.equal(byGlyph['🧶'].tags.includes('game'), false);
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

test('board generation prevents cross-matching active categories', () => {
  const board = generateBoard('sort_4', 'strict-category-seed', items, selectors);
  const selectorById = Object.fromEntries(selectors.map((selector) => [selector.id, selector]));
  for (const group of board.groups) {
    const selector = selectorById[group.id];
    for (const prompt of board.queue) {
      if (prompt.groupId !== group.id) {
        assert.equal(matchesSelector(prompt.item, selector.selector), false, `${prompt.item.id} should not match ${group.id}`);
      }
    }
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
  state.gameMemory.sort_2.entries = Array.from({ length: 8 }, (_, index) => ({ timeSeconds: 42 - index, entryType: 'actual', createdAt: `history-${index}` }));
  const offer = estimateTargets('sort_2', state.gameMemory.sort_2.entries)[0];
  state = buyClubBet(state, createClubBet('sort_2', offer, 2));
  assert.equal(state.activeClubBet.oddsLabel, offer.oddsLabel);
  assert.throws(() => buyClubBet(structuredClone(defaultState), createClubBet('sort_2', offer, 1)), /multiples of 2/);
  assert.equal(state.resources.diamonds, 3);
  state.resources.diamonds = 100;
  state = buySpade(state, 'sort_2');
  assert.equal(state.upgrades.spades.sort_2, 1);
  state = settleRound(state, 'sort_2', offer.timeSeconds - 1, 0, 'economy-seed', 'test');
  assert.equal(state.activeClubBet, null);
  assert.equal(state.eventLog.at(-1).betWinnings, 3);
  assert.equal(state.gameMemory.sort_3.entries.at(-1).entryType, 'rest');
});


test('bet propositions use sensible odds and require enough actual history', () => {
  const lowHistory = structuredClone(defaultState).gameMemory.sort_2.entries;
  const lowTargets = estimateTargets('sort_2', lowHistory);
  assert.deepEqual(lowTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.deepEqual(lowTargets.map((target) => target.available), [false, false, false, false, false]);
  const richHistory = Array.from({ length: 20 }, (_, index) => ({ timeSeconds: 45 - index, entryType: 'actual', createdAt: `t${index}` }));
  const richTargets = estimateTargets('sort_2', richHistory);
  assert.deepEqual(richTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.deepEqual(richTargets.map((target) => target.available), [true, true, true, true, true]);
  assert.ok(richTargets[4].timeSeconds < richTargets[0].timeSeconds);
});

test('first round has no presumed Heart timer or loss', () => {
  const state = structuredClone(defaultState);
  assert.equal(heartSafety('sort_2', state.gameMemory.sort_2.entries), Infinity);
  const next = settleRound(state, 'sort_2', 999, 0, 'first-round', 'test');
  assert.equal(next.resources.hearts, state.resources.hearts);
  assert.equal(next.gameMemory.sort_2.entries.at(-1).timeSeconds, 999);
});

test('item timing records fastest and longest pressure events', () => {
  let state = structuredClone(defaultState);
  let result = settleItemTiming(state, 'sort_2', 'emoji:test', 2, 't1');
  state = result.state;
  assert.equal(result.event.isNewFastest, false);
  assert.equal(result.event.isNewLongest, false);
  result = settleItemTiming(state, 'sort_2', 'emoji:test2', 3, 't2');
  state = result.state;
  assert.equal(result.event.isNewLongest, true);
  assert.equal(result.event.heartsDelta, -1);
  result = settleItemTiming(state, 'sort_2', 'emoji:test3', 1, 't3');
  assert.equal(result.event.isNewFastest, true);
  assert.equal(result.event.diamondsDelta, payoutScore(state, 'sort_2'));
});

test('spade costs and streak animation scale upward and downward respectively', () => {
  assert.equal(payoutScore(defaultState, 'sort_2'), 2);
  assert.equal(payoutScore(defaultState, 'sort_3'), 3);
  assert.equal(payoutScore(defaultState, 'sort_4'), 4);
  assert.equal(spadeCost('sort_2', 0), 12);
  assert.equal(spadeCost('sort_3', 0), 9);
  assert.equal(spadeCost('sort_4', 0), 6);
  assert.ok(spadeCost('sort_4', 0) < spadeCost('sort_3', 0));
  assert.ok(spadeCost('sort_3', 0) < spadeCost('sort_2', 0));
  assert.ok(spadeCost('global', 1) > spadeCost('global', 0));
  assert.ok(streakDuration(220, 10) < 220);
  assert.equal(streakDuration(220, 100), 121);
});
