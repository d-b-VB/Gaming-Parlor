import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateBoard, matchesSelector, estimateTargets, heartSafety, createClubBet, buyClubBet, settleRound, settleItemTiming, itemTimingTargets, itemPercentileAtRun, itemSlowHeartThreshold, firstRoundCalibrationScores, mistakePressure, unlockMode, buySpade, buyPerItemMedianBonus, buyMaxHeart, maxHeartCost, buyAnimationSpeed, animationSpeedCost, animationDuration, buyStudyTime, studyTimeCost, buyPauseCount, pauseCountCost, buyPauseLength, pauseLengthCost, buyQueueVision, queueVisionCost, spadeCost, payoutScore, perItemMedianBonusCost, hasPerItemMedianBonus, streakDuration } from '../src/game/core.js';

const items = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/items.json', import.meta.url))).items;
const baseSelectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/category_selectors.json', import.meta.url))).selectors;
const overlaySelectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/cross_cutting_categories.json', import.meta.url))).selectors;
const selectors = [...baseSelectors, ...overlaySelectors];
const defaultState = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/default_state.json', import.meta.url)));

test('catalog is expanded enough for strong prototype coverage', () => {
  assert.ok(items.length >= 603);
  assert.ok(selectors.length >= 146);
  assert.ok(overlaySelectors.length >= 50);
  assert.ok(items.filter((item) => item.kind === 'emoji').length >= 342);
});

test('selector matching supports required tags and exact colors', () => {
  assert.equal(matchesSelector({ kind: 'emoji', tags: ['animal', 'arthropod'], colors: [], glyph: '🐜' }, { requiredTags: ['arthropod'] }), true);
  assert.equal(matchesSelector({ id: 'emoji:artist_palette', kind: 'emoji', tags: [], colors: [], glyph: '🎨' }, { itemIds: ['emoji:artist_palette'] }), true);
  assert.equal(matchesSelector({ id: 'emoji:factory', kind: 'emoji', tags: [], colors: [], glyph: '🏭' }, { itemIds: ['emoji:artist_palette'] }), false);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['flag'], colors: ['red', 'white'], glyph: '🇯🇵' }, { exactColors: ['white', 'red'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['flag'], colors: ['red', 'white', 'blue'], glyph: '🇺🇸' }, { exactColors: ['white', 'red'] }), false);
  assert.equal(matchesSelector({ kind: 'emoji', tags: ['round'], colors: [], glyph: '⚽' }, { kinds: ['emoji', 'symbol'], requiredTags: ['round'] }), true);
  assert.equal(matchesSelector({ kind: 'flag', tags: ['round'], colors: [], glyph: '🏳️' }, { kinds: ['emoji', 'symbol'], requiredTags: ['round'] }), false);
});

test('cross-cutting overlay connects formerly isolated obvious items', () => {
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  const categoriesFor = (id) => selectors.filter((selector) => matchesSelector(byId[id], selector.selector)).map((selector) => selector.id);
  for (const id of ['emoji:airplane_2', 'emoji:artist_palette', 'emoji:fire_engine', 'emoji:graduation_cap', 'emoji:ear_of_rice', 'symbol:check', 'symbol:cross_mark']) {
    assert.ok(categoriesFor(id).length >= 2, `${id} should be cross-linked`);
  }
  assert.ok(categoriesFor('emoji:graduation_cap').includes('cc_june_graduation'));
  assert.ok(categoriesFor('emoji:fire_engine').includes('cc_emergency_response'));
  assert.ok(categoriesFor('emoji:artist_palette').includes('cc_art_studio'));
  assert.ok(categoriesFor('emoji:corn').includes('cc_farm_to_table'));
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
  const richHistory = Array.from({ length: 20 }, (_, index) => ({ timeSeconds: 45 - index, mistakes: index % 4, entryType: 'actual', createdAt: `t${index}` }));
  const richTargets = estimateTargets('sort_2', richHistory);
  assert.deepEqual(richTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.deepEqual(richTargets.map((target) => target.available), [true, true, true, true, true]);
  assert.ok(richTargets[4].timeSeconds < richTargets[0].timeSeconds);
});



test('club bets require both time and mistake targets', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 100;
  state.gameMemory.sort_2.entries = [0, 1, 1, 2, 3, 3, 4, 5].map((mistakes, index) => ({ timeSeconds: 40 - index, mistakes, entryType: 'actual', createdAt: `m${index}` }));
  const offer = estimateTargets('sort_2', state.gameMemory.sort_2.entries).find((target) => target.id === 'double');
  assert.equal(offer.mistakeLimit, 1);
  state = buyClubBet(state, createClubBet('sort_2', offer, 2));
  let next = settleRound(state, 'sort_2', offer.timeSeconds, 2, 'too-many-mistakes', 'test');
  assert.equal(next.eventLog.at(-1).betWinnings, 0);
  state = buyClubBet({ ...structuredClone(defaultState), resources: { hearts: 5, maxHearts: 5, diamonds: 100 }, gameMemory: state.gameMemory }, createClubBet('sort_2', offer, 2));
  next = settleRound(state, 'sort_2', offer.timeSeconds, 1, 'clean-enough', 'test');
  assert.ok(next.eventLog.at(-1).betWinnings > 0);
});



test('memory keeps long history and bet wins add profit-weighted entries', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 10;
  state.gameMemory.sort_2.entries = Array.from({ length: 25 }, (_, index) => ({ timeSeconds: 60 - index, mistakes: 0, entryType: 'actual', createdAt: `old${index}` }));
  const offer = { id: 'ten', timeSeconds: 20, mistakeLimit: 0, oddsMultiplier: 10, oddsLabel: '10:1' };
  state = buyClubBet(state, createClubBet('sort_2', offer, 10));
  const next = settleRound(state, 'sort_2', 19, 0, 'weighted-win', 'test');
  assert.equal(next.eventLog.at(-1).betProfit, 100);
  assert.equal(next.eventLog.at(-1).startingBank, 10);
  assert.equal(next.eventLog.at(-1).betConfidenceWeight, 10);
  assert.equal(next.gameMemory.sort_2.entries.length, 36);
  assert.equal(next.gameMemory.sort_2.entries.filter((entry) => entry.weightedByBet).length, 10);
});

test('target estimates use recent performance windows rather than all past speeds', () => {
  const oldSlow = Array.from({ length: 150 }, (_, index) => ({ timeSeconds: 100 + index, mistakes: 4, entryType: 'actual', createdAt: `slow${index}` }));
  const recentFast = Array.from({ length: 100 }, (_, index) => ({ timeSeconds: 20 + (index % 5), mistakes: index % 2, entryType: 'actual', createdAt: `fast${index}` }));
  const targets = estimateTargets('sort_2', [...oldSlow, ...recentFast]);
  assert.ok(targets.find((target) => target.id === 'even').timeSeconds < 30);
  assert.ok(targets.find((target) => target.id === 'ten').mistakeLimit <= 1);
});



test('rest entries persist in target windows as a counterweight to fast weighted wins', () => {
  const fastActual = Array.from({ length: 50 }, (_, index) => ({ timeSeconds: 20, mistakes: 0, entryType: 'actual', createdAt: `fast${index}` }));
  const restEntries = Array.from({ length: 50 }, (_, index) => ({ timeSeconds: 100, mistakes: 0, entryType: 'rest', createdAt: `rest${index}` }));
  const targets = estimateTargets('sort_2', [...fastActual, ...restEntries]);
  assert.ok(targets.find((target) => target.id === 'even').timeSeconds > 20);
});

test('first round has no presumed Heart timer or loss', () => {
  const state = structuredClone(defaultState);
  assert.equal(heartSafety('sort_2', state.gameMemory.sort_2.entries), Infinity);
  const next = settleRound(state, 'sort_2', 999, 0, 'first-round', 'test');
  assert.equal(next.resources.hearts, state.resources.hearts);
  assert.equal(next.gameMemory.sort_2.entries.at(-1).timeSeconds, 999);
});

test('heart safety thresholds stage from actual run history', () => {
  const entries = (...times) => times.map((timeSeconds, index) => ({ timeSeconds, entryType: 'actual', createdAt: `run-${index}` }));
  assert.equal(heartSafety('sort_2', entries()), Infinity);
  assert.equal(heartSafety('sort_2', entries(30)), 60);
  assert.equal(heartSafety('sort_2', entries(30, 50)), 50);
  assert.equal(heartSafety('sort_2', entries(30, 50, 40)), 40);
  assert.equal(heartSafety('sort_2', entries(30, 50, 40, 70)), 50);
  assert.equal(heartSafety('sort_2', entries(30, 50, 40, 70, 60)), 50);
  assert.equal(heartSafety('sort_2', [...entries(30, 50, 40), { timeSeconds: 999, entryType: 'rest' }]), 40);
});

test('first round calibration creates temporary pseudo-scores no slower than actual', () => {
  const scores = firstRoundCalibrationScores(100, [10, 8, 6, 4, 3, 2, 2, 1], 8);
  assert.equal(scores[0].source, 'actual_first_round');
  assert.ok(scores.some((score) => score.source.includes('modal_item_pace')));
  assert.ok(scores.some((score) => score.source.includes('modal_second_half_item_pace')));
  assert.equal(new Set(scores.map((score) => score.timeSeconds.toFixed(2))).size, scores.length);
  assert.ok(scores.every((score) => score.timeSeconds <= 100));
  let state = settleRound(structuredClone(defaultState), 'sort_2', 100, 0, 'calibration', 't0', [10, 8, 6, 4, 3, 2, 2, 1]).gameMemory.sort_2.entries;
  assert.ok(state.length > 1);
  assert.ok(state.every((entry) => entry.temporary));
  const slowestTemporary = Math.max(...state.map((entry) => entry.timeSeconds));
  const next = structuredClone(defaultState);
  next.gameMemory.sort_2.entries = state;
  state = settleRound(next, 'sort_2', 50, 0, 'after-calibration', 't1').gameMemory.sort_2.entries;
  assert.equal(state.some((entry) => entry.temporary && entry.timeSeconds === slowestTemporary), false);
  assert.equal(state.at(-1).temporary, undefined);
});

test('round settlement records mistakes and tolerates missing mode memory', () => {
  const partial = structuredClone(defaultState);
  delete partial.gameMemory.sort_2;
  const next = settleRound(partial, 'sort_2', 12, 1, 'missing-memory', 'test');
  assert.equal(next.gameMemory.sort_2.entries.at(-1).mistakes, 1);
  assert.equal(next.eventLog.at(-1).type, 'round');
});

test('mistake pressure charges hearts above median and max errors', () => {
  const entries = [0, 1, 1, 2, 2].map((mistakes, index) => ({ entryType: 'actual', timeSeconds: 20 + index, mistakes }));
  assert.equal(mistakePressure(entries, 2).heartsLost, 0);
  const pressure = mistakePressure(entries, 3);
  assert.equal(pressure.medianMistakes, 1);
  assert.equal(pressure.heartsLost, 2);
  const state = structuredClone(defaultState);
  state.gameMemory.sort_2.entries = entries;
  const next = settleRound(state, 'sort_2', 20, 3, 'mistake-seed', 'test');
  assert.equal(next.resources.hearts, state.resources.hearts - 2);
  assert.equal(next.gameMemory.sort_2.entries.at(-1).mistakes, 3);
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
  assert.equal(result.event.eliteBonusDelta, payoutScore(state, 'sort_2'));
  assert.equal(result.event.diamondsDelta, payoutScore(state, 'sort_2'));
  const targets = itemTimingTargets(result.state, 'sort_2');
  assert.equal(targets.fastestSeconds, 1);
  assert.equal(targets.medianSeconds, 2);
  assert.equal(targets.longestSeconds, 3);
});

test('item slow Heart threshold uses median, IQR, and prior slowest', () => {
  let state = structuredClone(defaultState);
  state.itemStats.sort_2.entries = [1, 1.2, 1.4, 1.6, 10].map((timeSeconds) => ({ timeSeconds }));
  state.itemStats.sort_2.fastestSeconds = 1;
  state.itemStats.sort_2.longestSeconds = 10;
  assert.equal(itemSlowHeartThreshold(state, 'sort_2'), 1.8);
  const result = settleItemTiming(state, 'sort_2', 'too-slow', 2.1, 'slow');
  assert.equal(result.event.heartsDelta, -1);
  const safe = settleItemTiming(state, 'sort_2', 'safe', 1.3, 'safe');
  assert.equal(safe.event.heartsDelta, 0);
});

test('per-item median payout costs use early spade totals and require mode betting', () => {
  assert.equal(perItemMedianBonusCost('sort_2'), 96);
  assert.equal(perItemMedianBonusCost('sort_3'), 108);
  assert.equal(perItemMedianBonusCost('sort_4'), 96);
  assert.equal(perItemMedianBonusCost('sort_2', 1), 144);
  let state = structuredClone(defaultState);
  state.resources.diamonds = 10000;
  assert.throws(() => buyPerItemMedianBonus(state, 'sort_2'), /Make at least one bet/);
  const offer = { id: 'even', timeSeconds: 40, mistakeLimit: 0, oddsMultiplier: 1, oddsLabel: '1:1' };
  state = buyClubBet(state, createClubBet('sort_2', offer, 1));
  state = buyPerItemMedianBonus(state, 'sort_2');
  assert.equal(hasPerItemMedianBonus(state, 'sort_2'), true);
  assert.equal(state.resources.diamonds, 10000 - 1 - 96);
  state = buyPerItemMedianBonus(state, 'sort_2');
  assert.equal(state.upgrades.perItemMedianBonus.sort_2, 2);
  assert.equal(state.resources.diamonds, 10000 - 1 - 96 - 144);
  state.itemStats.sort_2.entries = [
    { itemId: 'slow', timeSeconds: 3, createdAt: 'a' },
    { itemId: 'mid', timeSeconds: 2, createdAt: 'b' },
    { itemId: 'fast', timeSeconds: 1, createdAt: 'c' },
  ];
  state.itemStats.sort_2.fastestSeconds = 1;
  state.itemStats.sort_2.longestSeconds = 3;
  const result = settleItemTiming(state, 'sort_2', 'bonus', 1.5, 'd');
  assert.equal(itemPercentileAtRun(1.5, state.itemStats.sort_2.entries), 2 / 3);
  assert.equal(result.event.medianBonusDelta, 2);
  assert.equal(result.event.metaMedianSeconds.toFixed(2), '1.67');
  assert.ok(result.event.diamondsDelta >= 2);
  state.itemStats.sort_2.entries = Array.from({ length: 250 }, (_, index) => ({ itemId: `i${index}`, timeSeconds: 1 + index / 100, percentileAtRun: 0.5, createdAt: `t${index}` }));
  state.itemStats.sort_2.fastestSeconds = 1;
  state.itemStats.sort_2.longestSeconds = 3.49;
  const retained = settleItemTiming(state, 'sort_2', 'kept', 1.2, 'kept');
  assert.equal(retained.state.itemStats.sort_2.entries.length, 251);
});



test('study pause and queue visibility upgrades cost diamonds and increment levels', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 1000;
  assert.equal(studyTimeCost(0), 8);
  assert.equal(pauseCountCost(0), 120);
  assert.equal(pauseLengthCost(0), 60);
  assert.equal(queueVisionCost(0), 35);
  state = buyStudyTime(state);
  assert.equal(state.upgrades.studyTime, 1);
  assert.equal(state.resources.diamonds, 992);
  state = buyPauseCount(state);
  assert.equal(state.upgrades.pauseCount, 1);
  assert.equal(state.resources.diamonds, 872);
  state = buyPauseLength(state);
  assert.equal(state.upgrades.pauseLength, 1);
  assert.equal(state.resources.diamonds, 812);
  state = buyQueueVision(state);
  assert.equal(state.upgrades.queueVision, 1);
  assert.equal(state.resources.diamonds, 777);
  assert.ok(studyTimeCost(1) > studyTimeCost(0));
  assert.ok(pauseCountCost(1) > pauseCountCost(0));
  assert.ok(pauseLengthCost(1) > pauseLengthCost(0));
  assert.ok(queueVisionCost(1) > queueVisionCost(0));
});

test('animation speed upgrades cost diamonds and shorten travel duration', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 100;
  const cost = animationSpeedCost(0);
  state = buyAnimationSpeed(state);
  assert.equal(state.upgrades.animationSpeed, 1);
  assert.equal(state.resources.diamonds, 100 - cost);
  assert.ok(animationDuration(1000, state) < 1000);
  state.upgrades.animationSpeed = 100;
  assert.equal(animationDuration(1000, state), 450);
});

test('max Heart upgrades increase heart spaces with escalating costs', () => {
  let state = structuredClone(defaultState);
  state.resources.hearts = 3;
  state.resources.diamonds = 100;
  assert.equal(maxHeartCost(state.resources.maxHearts), 20);
  state = buyMaxHeart(state);
  assert.equal(state.resources.maxHearts, 6);
  assert.equal(state.resources.hearts, 4);
  assert.equal(state.resources.diamonds, 80);
  assert.equal(maxHeartCost(state.resources.maxHearts), 40);
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
