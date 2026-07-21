import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BET_TIERS, generateBoard, matchesSelector, estimateTargets, heartSafety, createClubBet, buyClubBet, canUnlockMode, settleRound, settleItemTiming, itemTimingTargets, itemPercentileAtRun, itemSlowHeartThreshold, firstRoundCalibrationScores, mistakePressure, unlockMode, buySpade, buyPerItemMedianBonus, buySortedItemDisplay, sortedItemDisplayCost, hasSortedItemDisplay, buyMaxHeart, maxHeartCost, buyAnimationSpeed, animationSpeedCost, animationDuration, buyStudyTime, studyTimeCost, buyPauseCount, pauseCountCost, buyPauseLength, pauseLengthCost, buyQueueVision, queueVisionCost, spadeCost, payoutScore, perItemMedianBonusCost, hasPerItemMedianBonus, streakDuration, betWeightedSyntheticTimes } from '../src/game/core.js';

const items = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/items.json', import.meta.url))).items;
const baseSelectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/category_selectors.json', import.meta.url))).selectors;
const overlaySelectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/cross_cutting_categories.json', import.meta.url))).selectors;
const expansionSelectors = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/category_expansion_overlays.json', import.meta.url))).selectors;
const selectors = [...baseSelectors, ...overlaySelectors, ...expansionSelectors];
const defaultState = JSON.parse(await readFile(new URL('../emoji_wager_game_spec/data/default_state.json', import.meta.url)));

test('catalog is expanded enough for strong prototype coverage', () => {
  assert.ok(items.length >= 603);
  assert.ok(selectors.length >= 146);
  assert.ok(overlaySelectors.length >= 50);
  assert.ok(expansionSelectors.length >= 25);
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

test('category expansion overlay covers discussed face bridges and vignettes', () => {
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  const categoriesFor = (id) => selectors.filter((selector) => matchesSelector(byId[id], selector.selector)).map((selector) => selector.id);
  assert.ok(categoriesFor('emoji:overheated_face').includes('cx_hot_heat'));
  assert.ok(categoriesFor('emoji:freezing_face').includes('cx_cold_freezing'));
  assert.ok(categoriesFor('emoji:reversed_hand_with_middle_finger_extended').includes('cx_evil_mischief'));
  assert.ok(categoriesFor('emoji:bow_and_arrow').includes('cx_diagonal_slanted'));
  assert.ok(categoriesFor('emoji:bow_and_arrow').includes('cx_vignette_diagonal_crossing'));
  assert.ok(categoriesFor('emoji:zipper_mouth_face').includes('cx_quiet_silent'));
  assert.ok(categoriesFor('emoji:neutral_face').includes('cx_law_justice_faces'));
  assert.ok(categoriesFor('emoji:mouse_trap').includes('cx_vignette_mouse_house'));
  assert.ok(categoriesFor('emoji:amphora').includes('cx_vignette_ancient_ruins'));
  assert.ok(categoriesFor('emoji:wolf_face').includes('cx_vignette_little_forest_errand'));
  assert.ok(categoriesFor('emoji:door').includes('cx_vignette_locked_room_mystery'));
  assert.ok(categoriesFor('emoji:book').includes('cx_vignette_quiet_reading_night'));
  assert.ok(categoriesFor('emoji:crossed_swords').includes('cx_vignette_pirate_treasure'));
  assert.ok(categoriesFor('emoji:rocket').includes('cx_vignette_space_visitor'));
  assert.ok(categoriesFor('emoji:bouquet').includes('cx_vignette_garden_gift'));
  assert.ok(categoriesFor('emoji:blowfish').includes('cx_pointy_sharp'));
  assert.ok(categoriesFor('emoji:carrot').includes('cx_pointy_sharp'));
  assert.equal(categoriesFor('emoji:corn').includes('cx_pointy_sharp'), false);
  assert.equal(categoriesFor('emoji:hot_pepper').includes('cx_pointy_sharp'), false);
  assert.ok(categoriesFor('emoji:christmas_tree').includes('cx_tree_canopy'));
  assert.ok(categoriesFor('emoji:nest_with_eggs').includes('cx_tree_canopy'));
  assert.ok(categoriesFor('emoji:nest_with_eggs').includes('cx_nesting_family_life'));
  assert.ok(categoriesFor('emoji:potted_plant').includes('cx_office_plants'));
  assert.ok(categoriesFor('emoji:pig_2').includes('cx_pig_pork_luau'));
  assert.ok(categoriesFor('emoji:bacon').includes('cx_pig_pork_luau'));
  assert.ok(categoriesFor('emoji:peanuts').includes('cx_africa_peanut_foods'));
  assert.ok(categoriesFor('emoji:peanuts').includes('cx_north_america_foods'));
  assert.ok(categoriesFor('emoji:burrito').includes('cx_north_america_foods'));
  assert.ok(categoriesFor('emoji:croissant').includes('cx_europe_foods'));
  assert.ok(categoriesFor('emoji:falafel').includes('cx_abrahamic_foods'));
  assert.ok(categoriesFor('emoji:bagel').includes('cx_round_foods'));
  assert.ok(categoriesFor('emoji:musical_keyboard').includes('cx_keys_and_keyboards'));
  assert.ok(categoriesFor('emoji:closed_lock_with_key').includes('cx_keys_and_keyboards'));
});

test('category expansion gives every face a non-face-dominated bridge category', () => {
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  const faceIds = items.filter((item) => item.tags.includes('face')).map((item) => item.id);
  const expansionById = new Map(expansionSelectors.map((selector) => [selector.id, selector]));
  const nonFaceDominated = expansionSelectors.filter((selector) => {
    const members = selector.selector.itemIds ?? [];
    const faceCount = members.filter((id) => byId[id]?.tags.includes('face')).length;
    return members.length - faceCount > faceCount;
  });
  assert.equal(expansionById.get('cx_communication_social_signals').selector.itemIds.includes('emoji:face_with_rolling_eyes'), true);
  const covered = new Set(nonFaceDominated.flatMap((selector) => selector.selector.itemIds).filter((id) => faceIds.includes(id)));
  assert.deepEqual(faceIds.filter((id) => !covered.has(id)), []);
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
  assert.equal(byGlyph['🦇'].tags.includes('bird'), false);
  assert.equal(byGlyph['🐡'].tags.includes('land'), false);
  assert.equal(byGlyph['🐡'].tags.includes('water'), true);
});



test('board generation creates valid unique boards for each mode', () => {
  const expectations = { sort_2: [4, 16], sort_3: [6, 24], sort_4: [8, 32], freeform_2: [4, 16], freeform_3: [6, 24], freeform_4: [8, 32], mystery_2: [4, 16], mystery_3: [6, 24], mystery_4: [8, 32] };
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


test('variant modes are distinct games with gated unlocks and escalating payouts', () => {
  let state = structuredClone(defaultState);
  assert.equal(Object.keys(defaultState.gameMemory).length, 9);
  assert.equal(payoutScore(state, 'sort_2'), 2);
  assert.equal(payoutScore(state, 'freeform_2'), 4);
  assert.equal(payoutScore(state, 'mystery_2'), 8);
  assert.equal(canUnlockMode(state, 'freeform_2'), false);
  state.resources.diamonds = 1000;
  state = unlockMode(state, 'sort_3');
  state = unlockMode(state, 'sort_4');
  assert.equal(canUnlockMode(state, 'freeform_2'), true);
  state = unlockMode(state, 'freeform_4');
  assert.equal(canUnlockMode(state, 'mystery_2'), false);
  state = unlockMode(state, 'freeform_2');
  state = unlockMode(state, 'freeform_3');
  assert.equal(canUnlockMode(state, 'mystery_2'), true);
  state = unlockMode(state, 'mystery_2');
  assert.equal(state.unlockedModes.mystery_2, true);
});

test('per-game upgrades and standard sorted-item display are mode-scoped', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 1000;
  state = buyAnimationSpeed(state, 'freeform_2');
  assert.equal(state.upgrades.animationSpeed.freeform_2, 1);
  assert.equal(state.upgrades.animationSpeed.sort_2, 0);
  state = buyQueueVision(state, 'mystery_2');
  assert.equal(state.upgrades.queueVision.mystery_2, 1);
  assert.equal(state.upgrades.queueVision.sort_2, 0);
  assert.equal(hasSortedItemDisplay(state, 'sort_2'), false);
  state = buySortedItemDisplay(state, 'sort_2');
  assert.equal(hasSortedItemDisplay(state, 'sort_2'), true);
  assert.throws(() => buySortedItemDisplay(state, 'freeform_2'), /standard sort/);
  assert.ok(sortedItemDisplayCost('sort_2') < perItemMedianBonusCost('sort_2'));
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
  assert.equal(state.gameMemory.sort_3.entries.length, 0);
});



test('mode-away rest records accrue once per outside mode block and feed all calculations', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 100;
  state = unlockMode(state, 'sort_3');
  state = unlockMode(state, 'sort_4');
  const counts = () => Object.fromEntries(Object.keys(state.gameMemory).map((modeId) => [modeId, state.gameMemory[modeId].entries.filter((entry) => entry.entryType === 'rest').length]));
  const play = (modeId, time, mistakes = 0) => { state = settleRound(state, modeId, time, mistakes, `${modeId}-${time}`, `${modeId}-${time}`, [1, 2, 3, 4]); };
  for (const time of [80, 70, 60, 50, 40]) play('sort_2', time, time === 80 ? 3 : 0);
  for (const time of [90, 80, 70, 60]) play('sort_3', time, 1);
  for (const time of [120, 110, 100]) play('sort_4', time, 2);
  for (const time of [45, 44, 43]) play('sort_2', time, 0);
  for (const time of [55, 54]) play('sort_3', time, 0);
  assert.deepEqual(Object.fromEntries(Object.entries(counts()).filter(([modeId]) => modeId.startsWith('sort_'))), { sort_2: 3, sort_3: 2, sort_4: 2 });
  const sort2Rests = state.gameMemory.sort_2.entries.filter((entry) => entry.entryType === 'rest');
  assert.ok(sort2Rests.every((entry) => entry.timeSeconds === 70));
  assert.ok(sort2Rests.every((entry) => entry.mistakes === 0));
  assert.ok(estimateTargets('sort_2', state.gameMemory.sort_2.entries).find((target) => target.id === 'even').actualCount >= 8);
  assert.ok(heartSafety('sort_2', state.gameMemory.sort_2.entries) >= 50);
  assert.equal(mistakePressure(state.gameMemory.sort_2.entries, 4).maxMistakes, 0);
});

test('mode-away rest records load slow item timing samples with current percentiles', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 100;
  state = unlockMode(state, 'sort_3');
  state.itemStats.sort_2.entries = Array.from({ length: 20 }, (_, index) => ({ itemId: `item-${index}`, timeSeconds: index + 1, createdAt: `item-${index}` }));
  state.itemStats.sort_2.fastestSeconds = 1;
  state.itemStats.sort_2.longestSeconds = 20;
  state = settleRound(state, 'sort_2', 60, 0, 's2', 's2');
  state = settleRound(state, 'sort_3', 80, 0, 's3', 's3');
  const restItems = state.itemStats.sort_2.entries.filter((entry) => entry.entryType === 'rest');
  assert.equal(restItems.length, 16);
  assert.deepEqual(restItems.slice(0, 3).map((entry) => entry.itemId), ['item-19', 'item-18', 'item-17']);
  assert.equal(restItems[0].percentileAtRun, itemPercentileAtRun(20, state.itemStats.sort_2.entries.slice(0, 20)));
  assert.ok(itemTimingTargets(state, 'sort_2').longestSeconds >= 20);
});

test('stacked item rests include each item id at most once per rest set', () => {
  let state = structuredClone(defaultState);
  state.resources.diamonds = 100;
  state = unlockMode(state, 'sort_3');
  state.itemStats.sort_2.entries = Array.from({ length: 20 }, (_, index) => [
    { itemId: `item-${index}`, timeSeconds: index + 1, createdAt: `fast-${index}` },
    { itemId: `item-${index}`, timeSeconds: index + 21, createdAt: `slow-${index}` },
  ]).flat();
  state = settleRound(state, 'sort_2', 60, 0, 's2-1', 's2-1');
  state = settleRound(state, 'sort_3', 80, 0, 's3-1', 's3-1');
  state = settleRound(state, 'sort_2', 55, 0, 's2-2', 's2-2');
  state = settleRound(state, 'sort_3', 75, 0, 's3-2', 's3-2');
  const restSets = Map.groupBy(state.itemStats.sort_2.entries.filter((entry) => entry.entryType === 'rest'), (entry) => entry.createdAt);
  assert.equal(restSets.size, 2);
  for (const restItems of restSets.values()) {
    assert.equal(restItems.length, 16);
    assert.equal(new Set(restItems.map((entry) => entry.itemId)).size, 16);
  }
});
test('bet propositions use sensible odds and require enough actual history', () => {
  const lowHistory = structuredClone(defaultState).gameMemory.sort_2.entries;
  const lowTargets = estimateTargets('sort_2', lowHistory);
  assert.deepEqual(lowTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.deepEqual(lowTargets.map((target) => target.available), [false, false, false, false, false]);
  const richHistory = Array.from({ length: 20 }, (_, index) => ({ timeSeconds: 45 - index, percentileAtRun: 0.35 + index * 0.03, mistakes: index % 4, entryType: 'actual', createdAt: `t${index}` }));
  const richTargets = estimateTargets('sort_2', richHistory);
  assert.deepEqual(richTargets.map((target) => target.oddsLabel), ['1:2', '1:1', '2:1', '5:1', '10:1']);
  assert.ok(richTargets.every((target) => target.actualCount >= target.minHistory));
  assert.ok(richTargets.filter((target) => !target.available).every((target) => target.unavailableReason === 'duplicate-time'));
  assert.equal(new Set(richTargets.filter((target) => target.available).map((target) => target.timeSeconds)).size, richTargets.filter((target) => target.available).length);
  assert.ok(richTargets[4].timeSeconds < richTargets[0].timeSeconds);
});

test('club bet chance values are exactly fair for displayed profit odds', () => {
  for (const tier of BET_TIERS) {
    assert.equal(tier.chance, 1 / (tier.oddsMultiplier + 1));
  }
});

test('club target times use meta-percentile performance across all odds tiers', () => {
  const improvingHistory = [100, 90, 80, 70, 60, 55, 50, 45, 40, 35].map((timeSeconds, index) => ({
    timeSeconds,
    percentileAtRun: 0.68 + index * 0.03,
    mistakes: 0,
    entryType: 'actual',
    createdAt: `meta${index}`,
  }));
  const safety = heartSafety('sort_2', improvingHistory);
  const targets = estimateTargets('sort_2', improvingHistory);
  const half = targets.find((target) => target.id === 'half');
  const even = targets.find((target) => target.id === 'even');
  const double = targets.find((target) => target.id === 'double');
  assert.ok(half.timeSeconds < safety);
  assert.ok(even.timeSeconds <= half.timeSeconds);
  assert.ok(double.timeSeconds <= even.timeSeconds);
  assert.ok(half.targetPercentile < even.targetPercentile);
  assert.ok(double.targetPercentile > even.targetPercentile);
});

test('only the lowest payout remains available when club target times converge', () => {
  const flatHistory = Array.from({ length: 20 }, (_, index) => ({
    timeSeconds: 42,
    percentileAtRun: 0.75,
    mistakes: 0,
    entryType: 'actual',
    createdAt: `flat${index}`,
  }));
  const targets = estimateTargets('sort_2', flatHistory);
  assert.deepEqual(targets.map((target) => target.timeSeconds), [42, 42, 42, 42, 42]);
  assert.deepEqual(targets.map((target) => target.available), [true, false, false, false, false]);
  assert.equal(targets[0].unavailableReason, undefined);
  assert.deepEqual(targets.slice(1).map((target) => target.unavailableReason), Array(4).fill('duplicate-time'));
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
  const offer = { id: 'ten', timeSeconds: 80, mistakeLimit: 0, oddsMultiplier: 10, oddsLabel: '10:1' };
  state = buyClubBet(state, createClubBet('sort_2', offer, 10));
  const itemTimes = [1, 1.1, 1.3, 1.6, 2, 2.5, 3.1, 3.8, 4.6, 5.5, 6.5, 7.6, 8.8, 10.1, 11.5, 13];
  const next = settleRound(state, 'sort_2', 80, 0, 'weighted-win', 'test', itemTimes);
  const syntheticTimes = betWeightedSyntheticTimes(80, itemTimes, 10);
  const weightedEntries = next.gameMemory.sort_2.entries.filter((entry) => entry.weightedByBet);
  assert.equal(next.eventLog.at(-1).betProfit, 100);
  assert.equal(next.eventLog.at(-1).startingBank, 10);
  assert.equal(next.eventLog.at(-1).betConfidenceWeight, 10);
  assert.equal(next.gameMemory.sort_2.entries.length, 36);
  assert.equal(weightedEntries.length, 10);
  assert.deepEqual(weightedEntries.map((entry) => entry.timeSeconds), syntheticTimes);
  assert.ok(new Set(weightedEntries.map((entry) => entry.timeSeconds)).size > 5);
  assert.equal(weightedEntries[0].syntheticBetWeight, true);
  assert.equal(weightedEntries[0].sourceRoundTimeSeconds, 80);
  assert.ok(weightedEntries[1].timeSeconds > weightedEntries[0].timeSeconds);
  assert.ok(weightedEntries[2].timeSeconds < weightedEntries[0].timeSeconds);
  assert.ok(weightedEntries.every((entry) => Number.isFinite(entry.percentileAtRun)));
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
  assert.equal(heartSafety('sort_2', [...entries(30, 50, 40), { timeSeconds: 999, entryType: 'rest' }]), 50);
});

test('first round calibration creates temporary pseudo-scores no slower than actual', () => {
  const scores = firstRoundCalibrationScores(100, [10, 8, 6, 4, 3, 2, 2, 1], 8);
  assert.equal(scores[0].source, 'actual_first_round');
  assert.ok(scores.length > 3);
  assert.ok(scores.some((score) => score.derivedSources.includes('modal_item_pace')));
  assert.ok(scores.some((score) => score.derivedSources.includes('modal_second_half_item_pace')));
  assert.equal(new Set(scores.map((score) => score.timeSeconds.toFixed(2))).size, scores.length);
  assert.ok(scores.every((score) => score.timeSeconds <= 100));
  assert.ok(scores.some((score) => score.timeSeconds > 90));
  let state = settleRound(structuredClone(defaultState), 'sort_2', 100, 0, 'calibration', 't0', [10, 8, 6, 4, 3, 2, 2, 1]).gameMemory.sort_2.entries;
  assert.ok(state.length > 1);
  assert.ok(state.every((entry) => entry.temporary));
  assert.equal(heartSafety('sort_2', state), 97);
  const firstRoundEntry = state.find((entry) => entry.calibrationSource === 'actual_first_round');
  const slowestNonFirstTemporary = Math.max(...state.filter((entry) => entry.calibrationSource !== 'actual_first_round').map((entry) => entry.timeSeconds));
  const next = structuredClone(defaultState);
  next.gameMemory.sort_2.entries = state;
  state = settleRound(next, 'sort_2', 50, 0, 'after-calibration', 't1').gameMemory.sort_2.entries;
  assert.equal(state.some((entry) => entry.temporary && entry.timeSeconds === slowestNonFirstTemporary), false);
  assert.ok(state.some((entry) => entry.calibrationSource === 'actual_first_round' && entry.timeSeconds === firstRoundEntry.timeSeconds));
  assert.equal(heartSafety('sort_2', state), 80);
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

test('item slow Heart threshold uses outlier candidates and current-round failures', () => {
  let state = structuredClone(defaultState);
  state.itemStats.sort_2.entries = [1, 1.2, 1.4, 1.6, 10].map((timeSeconds) => ({ timeSeconds }));
  state.itemStats.sort_2.fastestSeconds = 1;
  state.itemStats.sort_2.longestSeconds = 10;
  const threshold = itemSlowHeartThreshold(state, 'sort_2');
  assert.equal(threshold, 7.375);
  assert.ok(itemSlowHeartThreshold(state, 'sort_2', [8]) > threshold);
  const result = settleItemTiming(state, 'sort_2', 'too-slow', 8, 'slow');
  assert.equal(result.event.heartsDelta, -1);
  const softened = settleItemTiming(state, 'sort_2', 'softened', 7.5, 'soft', [8]);
  assert.equal(softened.event.heartsDelta, 0);
  const safe = settleItemTiming(state, 'sort_2', 'safe', 2.1, 'safe');
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
  assert.equal(itemPercentileAtRun(1.5, state.itemStats.sort_2.entries), 0.625);
  assert.equal(result.event.medianBonusDelta, 2);
  assert.equal(result.event.metaMedianSeconds.toFixed(2), '1.50');
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
  assert.equal(state.upgrades.studyTime.sort_2, 1);
  assert.equal(state.resources.diamonds, 992);
  state = buyPauseCount(state);
  assert.equal(state.upgrades.pauseCount.sort_2, 1);
  assert.equal(state.resources.diamonds, 872);
  state = buyPauseLength(state);
  assert.equal(state.upgrades.pauseLength.sort_2, 1);
  assert.equal(state.resources.diamonds, 812);
  state = buyQueueVision(state);
  assert.equal(state.upgrades.queueVision.sort_2, 1);
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
  assert.equal(state.upgrades.animationSpeed.sort_2, 1);
  assert.equal(state.resources.diamonds, 100 - cost);
  assert.ok(animationDuration(1000, state) < 1000);
  state.upgrades.animationSpeed.sort_2 = 100;
  assert.equal(animationDuration(1000, state, 'sort_2'), 450);
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
