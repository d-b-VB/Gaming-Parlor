export const MODES = {
  sort_2: { id: 'sort_2', name: '2-Way Sort', directions: ['left', 'right'], groupsPerDirection: 2, glyphsPerGroup: 4, unlockCost: 0, baseDiamonds: 2, heartSafetySeconds: 45, starterTargets: [{ id: 'even', label: 'Even', chance: 0.5, timeSeconds: 35, oddsMultiplier: 1, minHistory: 5, oddsLabel: '1:1' }] },
  sort_3: { id: 'sort_3', name: '3-Way Sort', directions: ['left', 'right', 'up'], groupsPerDirection: 2, glyphsPerGroup: 4, unlockCost: 15, baseDiamonds: 3, heartSafetySeconds: 65, starterTargets: [{ id: 'even', label: 'Even', chance: 0.5, timeSeconds: 50, oddsMultiplier: 1, minHistory: 5, oddsLabel: '1:1' }] },
  sort_4: { id: 'sort_4', name: '4-Way Sort', directions: ['left', 'right', 'up', 'down'], groupsPerDirection: 2, glyphsPerGroup: 4, unlockCost: 30, baseDiamonds: 4, heartSafetySeconds: 90, starterTargets: [{ id: 'even', label: 'Even', chance: 0.5, timeSeconds: 70, oddsMultiplier: 1, minHistory: 5, oddsLabel: '1:1' }] },
};
export const modeList = Object.values(MODES);
export const BET_TIERS = [
  { id: 'half', label: 'Conservative', chance: 0.8, oddsMultiplier: 0.5, minHistory: 5, oddsLabel: '1:2' },
  { id: 'even', label: 'Even', chance: 0.5, oddsMultiplier: 1, minHistory: 8, oddsLabel: '1:1' },
  { id: 'double', label: 'Double', chance: 0.25, oddsMultiplier: 2, minHistory: 10, oddsLabel: '2:1' },
  { id: 'five', label: 'Fivefold', chance: 0.1, oddsMultiplier: 5, minHistory: 15, oddsLabel: '5:1' },
  { id: 'ten', label: 'Tenfold', chance: 0.05, oddsMultiplier: 10, minHistory: 20, oddsLabel: '10:1' },
];
export const STORAGE_KEY = 'gaming-parlor-state-v1';
export const MEMORY_LIMIT = 2000;
const TARGET_RECENT_ENTRY_LIMIT = 100;
const CLUB_COST = 1;
const HEART_RESTORE_COST = 5;
const MAX_HEART_BASE_COST = 20;
export function animationSpeedCost(owned) { return Math.ceil(10 * 1.55 ** owned); }
export function animationDuration(baseMs, state) { const level = state.upgrades?.animationSpeed ?? 0; return Math.round(baseMs * Math.max(0.45, 1 - level * 0.12)); }
export function studyTimeCost(owned) { return Math.ceil(8 * 1.45 ** owned); }
export function pauseCountCost(owned) { return Math.ceil(120 * 2.25 ** owned); }
export function pauseLengthCost(owned) { return Math.ceil(60 * 1.9 ** owned); }
export function queueVisionCost(owned) { return Math.ceil(35 * 1.8 ** owned); }
export function hashSeed(seed) { let h = 2166136261; for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function createRng(seed) { let state = hashSeed(seed) || 1; return () => { state |= 0; state = (state + 0x6d2b79f5) | 0; let t = Math.imul(state ^ (state >>> 15), 1 | state); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function shuffle(items, rng) { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function matchesSelector(item, rule) { const all = (values, req = []) => req.every((x) => values.includes(x)); const none = (values, exc = []) => exc.every((x) => !values.includes(x)); if (rule.itemIds && !rule.itemIds.includes(item.id)) return false; if (rule.kind && item.kind !== rule.kind) return false; if (rule.kinds && !rule.kinds.includes(item.kind)) return false; if (!all(item.tags, rule.requiredTags)) return false; if (!none(item.tags, rule.excludesTags)) return false; if (!all(item.colors, rule.containsColors)) return false; if (!none(item.colors, rule.excludesColors)) return false; if (rule.colorCount !== undefined && item.colors.length !== rule.colorCount) return false; if (rule.exactColors) { const a = [...item.colors].sort(); const b = [...rule.exactColors].sort(); if (a.length !== b.length || !b.every((color, index) => a[index] === color)) return false; } return true; }
export function eligibleItems(items, selector) { return items.filter((item) => matchesSelector(item, selector.selector)); }
function overlapPenalty(item, selectors) { return selectors.filter((selector) => matchesSelector(item, selector.selector)).length; }
function boardIsUnambiguous(groups, chosen) {
  const selectorById = Object.fromEntries(chosen.map((selector) => [selector.id, selector]));
  const boardItems = groups.flatMap((group) => group.items.map((item) => ({ item, groupId: group.id })));
  return groups.every((group) => {
    const selector = selectorById[group.id];
    return boardItems.every(({ item, groupId }) => groupId === group.id || !matchesSelector(item, selector.selector));
  });
}
export function generateBoard(modeId, seed, items, selectors) {
  const mode = MODES[modeId];
  const rng = createRng(seed);
  const groupCount = mode.directions.length * mode.groupsPerDirection;
  const viable = selectors.filter((selector) => eligibleItems(items, selector).length >= mode.glyphsPerGroup);
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const chosen = shuffle(viable, rng).slice(0, groupCount);
    const used = new Set();
    const groups = [];
    let failed = false;
    for (let i = 0; i < chosen.length; i += 1) {
      const selector = chosen[i];
      const direction = mode.directions[Math.floor(i / mode.groupsPerDirection)];
      const otherSelectors = chosen.filter((other) => other.id !== selector.id);
      const candidates = shuffle(eligibleItems(items, selector), rng)
        .filter((item) => !used.has(item.glyph))
        .filter((item) => !otherSelectors.some((other) => matchesSelector(item, other.selector)))
        .sort((a, b) => overlapPenalty(a, chosen) - overlapPenalty(b, chosen));
      const selected = candidates.slice(0, mode.glyphsPerGroup);
      if (selected.length < mode.glyphsPerGroup) { failed = true; break; }
      selected.forEach((item) => used.add(item.glyph));
      groups.push({ id: selector.id, label: selector.label, direction, items: selected });
    }
    if (!failed && used.size === groupCount * mode.glyphsPerGroup && boardIsUnambiguous(groups, chosen)) {
      const queue = shuffle(groups.flatMap((group) => group.items.map((item) => ({ item, direction: group.direction, groupId: group.id }))), rng);
      return { modeId, seed, groups, queue };
    }
  }
  throw new Error(`Unable to generate ${mode.name} board`);
}
export function percentileAtRun(timeSeconds, entries) { if (!entries.length) return 0.5; return entries.filter((entry) => entry.timeSeconds >= timeSeconds).length / entries.length; }
function median(values) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function standardDeviation(values) { if (values.length < 2) return 0; const avg = mean(values); return Math.sqrt(mean(values.map((value) => (value - avg) ** 2))); }
function trimmedMean(values, trimRatio = 0.1) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const trim = Math.min(Math.floor(sorted.length * trimRatio), Math.floor((sorted.length - 1) / 2)); return mean(sorted.slice(trim, sorted.length - trim)); }
function quantile(sortedAsc, chanceToBeat) { if (!sortedAsc.length) return 0; const position = chanceToBeat * (sortedAsc.length - 1); const lower = Math.floor(position); const upper = Math.ceil(position); if (lower === upper) return sortedAsc[lower]; const weight = position - lower; return sortedAsc[lower] * (1 - weight) + sortedAsc[upper] * weight; }
function midhinge(values) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); return (quantile(sorted, 0.25) + quantile(sorted, 0.75)) / 2; }
function narrowestWindowMode(values) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const size = Math.min(sorted.length, Math.max(1, Math.ceil(sorted.length * 0.35))); let bestStart = 0; let bestWidth = Infinity; for (let start = 0; start <= sorted.length - size; start += 1) { const width = sorted[start + size - 1] - sorted[start]; if (width < bestWidth) { bestWidth = width; bestStart = start; } } return median(sorted.slice(bestStart, bestStart + size)); }
function expWeightedMean(values, growth = 1.06) { if (!values.length) return 0; let weight = 1; let total = 0; let weights = 0; for (const value of values) { total += value * weight; weights += weight; weight *= growth; } return total / weights; }
function roundScore(value) { return Math.max(1, Number(value.toFixed(2))); }
export function firstRoundCalibrationScores(totalTimeSeconds, itemTimes, totalItems) {
  if (!itemTimes.length) return [];
  const itemCount = totalItems || itemTimes.length;
  const observedItemSeconds = itemTimes.reduce((sum, value) => sum + value, 0);
  const animationAndOverheadPerItem = Math.max(0, totalTimeSeconds - observedItemSeconds) / itemCount;
  const effectiveItemTimes = itemTimes.map((value) => value + animationAndOverheadPerItem);
  const half = effectiveItemTimes.slice(Math.floor(effectiveItemTimes.length / 2));
  const quarter = effectiveItemTimes.slice(Math.floor(effectiveItemTimes.length * 0.75));
  const scores = [
    ['actual_first_round', totalTimeSeconds],
    ['second_half_pace', half.reduce((sum, value) => sum + value, 0) * 2],
    ['last_quarter_pace', quarter.reduce((sum, value) => sum + value, 0) * 4],
    ['exp_weighted_item_pace', expWeightedMean(effectiveItemTimes) * itemCount],
    ['median_last_half_item_pace', median(half) * itemCount],
    ['midhinge_item_pace', midhinge(effectiveItemTimes) * itemCount],
    ['modal_item_pace', narrowestWindowMode(effectiveItemTimes) * itemCount],
    ['modal_second_half_item_pace', narrowestWindowMode(half) * itemCount],
  ].map(([source, score]) => ({ source, sources: [source], timeSeconds: roundScore(score) })).filter((entry) => entry.source === 'actual_first_round' || entry.timeSeconds <= totalTimeSeconds);
  const byScore = new Map();
  for (const entry of scores) {
    const key = entry.timeSeconds.toFixed(2);
    if (byScore.has(key)) byScore.get(key).sources.push(...entry.sources);
    else byScore.set(key, { ...entry, sources: [...entry.sources] });
  }
  return [...byScore.values()].map((entry) => ({ ...entry, source: entry.source, derivedSources: entry.sources }));
}
export function estimateTargets(modeId, entries) { const mode = MODES[modeId]; const countableEntries = entries.filter((entry) => Number.isFinite(entry.timeSeconds) && !entry.weightedByBet); const actualCount = countableEntries.length; const recentEntries = countableEntries.slice(-TARGET_RECENT_ENTRY_LIMIT);
  const fallbackEven = mode.starterTargets[0].timeSeconds; const fallbackFactors = { half: 1.2, even: 1, double: 0.8, five: 0.65, ten: 0.55 }; const mistakeHistory = recentEntries.filter((entry) => Number.isFinite(entry.mistakes)).map((entry) => entry.mistakes).sort((a, b) => a - b); const mistakeLimitFor = (target) => mistakeHistory.length ? Math.max(0, Math.floor(quantile(mistakeHistory, target.chance))) : 0; if (actualCount < 5) return BET_TIERS.map((target) => ({ ...target, timeSeconds: Math.max(1, Math.round(fallbackEven * fallbackFactors[target.id])), mistakeLimit: mistakeLimitFor(target), available: actualCount >= target.minHistory, actualCount })); const sorted = recentEntries.map((entry) => entry.timeSeconds).sort((a, b) => a - b); return BET_TIERS.map((target) => ({ ...target, timeSeconds: Math.max(1, Math.round(quantile(sorted, target.chance))), mistakeLimit: mistakeLimitFor(target), available: actualCount >= target.minHistory, actualCount })); }
function realRoundEntries(entries) { return entries.filter((entry) => ['actual', 'rest'].includes(entry.entryType) && Number.isFinite(entry.timeSeconds) && !entry.weightedByBet); }
function heartBenchmarkEntries(entries) { return realRoundEntries(entries); }
export function heartSafety(modeId, entries) { const actual = heartBenchmarkEntries(entries).map((entry) => entry.timeSeconds); if (!actual.length) return Infinity; if (actual.length === 1) return Math.round(actual[0] * 2); const sorted = [...actual].sort((a, b) => a - b); if (actual.length === 2) return Math.round(sorted[1]); if (actual.length === 3) return Math.round(median(sorted)); if (actual.length === 4) return Math.round(sorted[2]); return Math.round(median(sorted)); }
function modePromptCount(modeId) { const mode = MODES[modeId]; return mode.directions.length * mode.groupsPerDirection * mode.glyphsPerGroup; }
function ensureRestTracking(next) {
  next.restTracking ??= { lastCompletedModeId: null, awayBlock: 0, restedBlockByMode: {} };
  next.restTracking.restedBlockByMode ??= {};
  next.restTracking.awayBlock ??= 0;
  return next.restTracking;
}
function trimModeMemory(next, modeId) { next.gameMemory[modeId].entries = (next.gameMemory[modeId].entries ?? []).slice(-MEMORY_LIMIT); }
function rebuildItemExtremes(stats) {
  const times = stats.entries.filter((entry) => Number.isFinite(entry.timeSeconds)).map((entry) => entry.timeSeconds);
  stats.fastestSeconds = times.length ? Math.min(...times) : null;
  stats.longestSeconds = times.length ? Math.max(...times) : null;
}
function addRestRecordForMode(next, restedModeId, activeModeId, createdAt) {
  next.gameMemory ??= {};
  next.gameMemory[restedModeId] ??= { entries: [] };
  const entries = next.gameMemory[restedModeId].entries ?? [];
  const timedEntries = realRoundEntries(entries);
  if (!timedEntries.length) return false;
  const slowestTime = Math.max(...timedEntries.map((entry) => entry.timeSeconds));
  const mistakeEntries = timedEntries.filter((entry) => Number.isFinite(entry.mistakes));
  const highestMistakes = mistakeEntries.length ? Math.max(...mistakeEntries.map((entry) => entry.mistakes)) : 0;
  entries.push({ timeSeconds: slowestTime, mistakes: highestMistakes, entryType: 'rest', restSource: 'mode_away_block', restedWhilePlaying: activeModeId, createdAt, percentileAtRun: percentileAtRun(slowestTime, entries) });
  next.gameMemory[restedModeId].entries = entries.slice(-MEMORY_LIMIT);

  const stats = ensureItemStats(next, restedModeId);
  const sourceItems = stats.entries.filter((entry) => Number.isFinite(entry.timeSeconds)).sort((a, b) => b.timeSeconds - a.timeSeconds).slice(0, modePromptCount(restedModeId));
  for (const item of sourceItems) {
    const percentileAtLoad = itemPercentileAtRun(item.timeSeconds, stats.entries);
    stats.entries.push({ itemId: item.itemId, timeSeconds: item.timeSeconds, createdAt, percentileAtRun: percentileAtLoad, entryType: 'rest', restSource: 'mode_away_block', restedWhilePlaying: activeModeId, sourceItemCreatedAt: item.createdAt });
  }
  stats.entries = stats.entries.slice(-MEMORY_LIMIT);
  rebuildItemExtremes(stats);
  return true;
}
function addDueRestRecords(next, activeModeId, createdAt) {
  const tracking = ensureRestTracking(next);
  if (tracking.lastCompletedModeId && tracking.lastCompletedModeId !== activeModeId) tracking.awayBlock += 1;
  for (const restedModeId of Object.keys(MODES)) {
    if (restedModeId === activeModeId || !next.unlockedModes?.[restedModeId]) continue;
    const hasEntries = (next.gameMemory?.[restedModeId]?.entries ?? []).some((entry) => Number.isFinite(entry.timeSeconds));
    if (!hasEntries || tracking.restedBlockByMode[restedModeId] === tracking.awayBlock) continue;
    if (addRestRecordForMode(next, restedModeId, activeModeId, createdAt)) tracking.restedBlockByMode[restedModeId] = tracking.awayBlock;
  }
  tracking.lastCompletedModeId = activeModeId;
}
export function addRoundMemory(state, modeId, timeSeconds, createdAt, mistakes = 0, extraActualEntries = 0, extraMeta = {}, itemTimes = []) { const next = structuredClone(state); next.gameMemory ??= {}; next.gameMemory[modeId] ??= { entries: [] }; ensureRestTracking(next); const entries = next.gameMemory[modeId].entries ?? []; const nonRestCount = entries.filter((entry) => entry.entryType !== 'rest').length; if (nonRestCount === 0 && itemTimes.length) { for (const score of firstRoundCalibrationScores(timeSeconds, itemTimes, itemTimes.length)) entries.push({ timeSeconds: score.timeSeconds, mistakes, entryType: 'actual', temporary: true, calibrationSource: score.source, calibrationSources: score.sources, createdAt, percentileAtRun: percentileAtRun(score.timeSeconds, entries) }); } else { const temporaryIndexes = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.temporary); if (temporaryIndexes.length) { const removableTemporaryIndexes = temporaryIndexes.filter(({ entry }) => entry.calibrationSource !== 'actual_first_round'); const removalCandidates = removableTemporaryIndexes.length ? removableTemporaryIndexes : temporaryIndexes; const removeIndex = removalCandidates.reduce((slowest, candidate) => candidate.entry.timeSeconds > slowest.entry.timeSeconds ? candidate : slowest).index; entries.splice(removeIndex, 1); } entries.push({ timeSeconds, mistakes, entryType: 'actual', createdAt, percentileAtRun: percentileAtRun(timeSeconds, entries) }); } for (let i = 0; i < extraActualEntries; i += 1) entries.push({ timeSeconds, mistakes, entryType: 'actual', createdAt, weightedByBet: true, weightedIndex: i + 1, ...extraMeta }); trimModeMemory(next, modeId); addDueRestRecords(next, modeId, createdAt); return next; }
export function createClubBet(modeId, offer, stake) { return { modeId, targetId: offer.id, targetSeconds: offer.timeSeconds, mistakeLimit: offer.mistakeLimit ?? 0, oddsMultiplier: offer.oddsMultiplier, oddsLabel: offer.oddsLabel, stake, cost: stake * CLUB_COST }; }
export function payoutScore(state, modeId) { return MODES[modeId].baseDiamonds + state.upgrades.spades.global + state.upgrades.spades[modeId]; }
export function spadeCost(scope, owned) { const base = scope === 'global' ? 25 : scope === 'sort_2' ? 12 : scope === 'sort_3' ? 9 : 6; const growth = scope === 'global' ? 1.6 : 1.5; return Math.ceil(base * growth ** owned); }
export function perItemMedianBonusCost(modeId, owned = 0) { const multiplier = modeId === 'sort_2' ? 8 : modeId === 'sort_3' ? 12 : 16; return multiplier * spadeCost(modeId, owned); }
export function hasModeBetHistory(state, modeId) { return (state.modeBetCounts?.[modeId] ?? 0) > 0; }
export function hasPerItemMedianBonus(state, modeId) { return (state.upgrades?.perItemMedianBonus?.[modeId] ?? 0) > 0; }
function ensureItemStats(next, modeId) {
  next.itemStats ??= {};
  next.itemStats[modeId] ??= { fastestSeconds: null, longestSeconds: null, entries: [] };
  next.itemStats[modeId].entries ??= [];
  return next.itemStats[modeId];
}
export function itemPercentileAtRun(timeSeconds, entries) { if (!entries.length) return 0.5; return (entries.filter((entry) => entry.timeSeconds >= timeSeconds).length + 0.5) / (entries.length + 1); }
export function itemTimingTargets(state, modeId) { const entries = state.itemStats?.[modeId]?.entries ?? []; if (!entries.length) return { fastestSeconds: null, medianSeconds: null, longestSeconds: null, metaMedianSeconds: null, eliteSeconds: null, metaMedianPercentile: null, count: 0 }; const times = entries.map((entry) => entry.timeSeconds); const sorted = [...times].sort((a, b) => a - b); const percentiles = entries.map((entry, index) => itemPercentileAtRun(entry.timeSeconds, entries.slice(0, index))).filter(Number.isFinite); const metaMedianPercentile = percentiles.length ? median(percentiles) : 0.5; const metaMedianSeconds = quantile(sorted, Math.max(0, Math.min(1, 1 - metaMedianPercentile))); const eliteSeconds = sorted[Math.floor(0.01 * (sorted.length - 1))]; return { fastestSeconds: Math.min(...times), medianSeconds: median(times), longestSeconds: Math.max(...times), metaMedianSeconds, eliteSeconds, metaMedianPercentile, count: entries.length }; }
export function itemSlowHeartThreshold(state, modeId, roundSlowHeartLossTimes = []) { const entries = state.itemStats?.[modeId]?.entries ?? []; if (!entries.length) return null; const mode = MODES[modeId]; const times = entries.map((entry) => entry.timeSeconds); const sorted = [...times].sort((a, b) => a - b); const medianTime = median(sorted); const meanTime = mean(times); const trimmedMeanTime = trimmedMean(times); const q1 = quantile(sorted, 0.25); const q3 = quantile(sorted, 0.75); const iqr = q3 - q1; const midhingeTime = (q1 + q3) / 2; const sd = standardDeviation(times); const targets = itemTimingTargets(state, modeId); const safeFloor = Math.max(meanTime, medianTime, trimmedMeanTime, midhingeTime, targets.metaMedianSeconds ?? 0); const desiredSlowHits = 1.25; const itemCount = mode.directions.length * mode.groupsPerDirection * mode.glyphsPerGroup; const modeTailPercentile = quantile(sorted, Math.max(0, Math.min(1, 1 - desiredSlowHits / itemCount))); const baselineCandidates = [2 * trimmedMeanTime, q3 + 1.5 * iqr, meanTime + 2 * sd, modeTailPercentile, Math.max(...times)]; const candidates = [...baselineCandidates, ...roundSlowHeartLossTimes].filter(Number.isFinite); return Math.max(safeFloor, median(candidates)); }
export function settleItemTiming(state, modeId, itemId, timeSeconds, createdAt = new Date().toISOString(), roundSlowHeartLossTimes = []) {
  const next = structuredClone(state);
  const stats = ensureItemStats(next, modeId);
  const targets = itemTimingTargets(next, modeId);
  const hasHistory = stats.entries.length > 0;
  const isNewLongest = hasHistory && timeSeconds > stats.longestSeconds;
  const isNewFastest = hasHistory && timeSeconds < stats.fastestSeconds;
  const isEliteItem = hasHistory && Number.isFinite(targets.eliteSeconds) && timeSeconds <= targets.eliteSeconds;
  const medianBonusDelta = Number.isFinite(targets.metaMedianSeconds) && timeSeconds <= targets.metaMedianSeconds ? (next.upgrades?.perItemMedianBonus?.[modeId] ?? 0) : 0;
  const slowThreshold = itemSlowHeartThreshold(next, modeId, roundSlowHeartLossTimes);
  const heartsDelta = hasHistory && Number.isFinite(slowThreshold) && timeSeconds > slowThreshold ? -1 : 0;
  const eliteBonusDelta = isEliteItem ? payoutScore(next, modeId) : 0;
  const diamondsDelta = eliteBonusDelta + medianBonusDelta;
  stats.fastestSeconds = hasHistory ? Math.min(stats.fastestSeconds, timeSeconds) : timeSeconds;
  stats.longestSeconds = hasHistory ? Math.max(stats.longestSeconds, timeSeconds) : timeSeconds;
  const percentileAtRun = itemPercentileAtRun(timeSeconds, stats.entries);
  stats.entries = [...stats.entries, { itemId, timeSeconds, createdAt, percentileAtRun, isNewFastest, isNewLongest, isEliteItem, eliteThreshold: targets.eliteSeconds, slowThreshold, medianBonusDelta, eliteBonusDelta }];
  next.resources.hearts = Math.max(0, next.resources.hearts + heartsDelta);
  next.resources.diamonds += diamondsDelta;
  const event = { type: 'itemTiming', modeId, itemId, timeSeconds, createdAt, heartsDelta, diamondsDelta, slowThreshold, medianBonusDelta, eliteBonusDelta, isEliteItem, eliteThreshold: targets.eliteSeconds, metaMedianSeconds: targets.metaMedianSeconds, percentileAtRun, isNewFastest, isNewLongest };
  next.eventLog = [...next.eventLog, event].slice(-50);
  return { state: next, event };
}
export function buyClubBet(state, bet) { if (bet.stake <= 0) return { ...state, activeClubBet: null }; if (bet.oddsLabel === '1:2' && bet.stake % 2 !== 0) throw new Error('1:2 wagers must be paid in multiples of 2 Clubs'); if (state.resources.diamonds < bet.cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= bet.cost; next.activeClubBet = { ...bet, startingBank: state.resources.diamonds }; next.modeBetCounts ??= {}; next.modeBetCounts[bet.modeId] = (next.modeBetCounts[bet.modeId] ?? 0) + 1; return next; }
export function unlockMode(state, modeId) { const mode = MODES[modeId]; if (state.unlockedModes[modeId]) return state; if (state.resources.diamonds < mode.unlockCost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= mode.unlockCost; next.unlockedModes[modeId] = true; return next; }
export function buySpade(state, scope) { const cost = spadeCost(scope, state.upgrades.spades[scope]); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades.spades[scope] += 1; return next; }
export function buyPerItemMedianBonus(state, modeId) { if (!hasModeBetHistory(state, modeId)) throw new Error('Make at least one bet in this mode first'); const owned = state.upgrades?.perItemMedianBonus?.[modeId] ?? 0; const cost = perItemMedianBonusCost(modeId, owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.perItemMedianBonus ??= { sort_2: 0, sort_3: 0, sort_4: 0 }; next.upgrades.perItemMedianBonus[modeId] = owned + 1; return next; }
export function buyAnimationSpeed(state) { const owned = state.upgrades?.animationSpeed ?? 0; const cost = animationSpeedCost(owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.animationSpeed = owned + 1; return next; }
export function buyStudyTime(state) { const owned = state.upgrades?.studyTime ?? 0; const cost = studyTimeCost(owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.studyTime = owned + 1; return next; }
export function buyPauseCount(state) { const owned = state.upgrades?.pauseCount ?? 0; const cost = pauseCountCost(owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.pauseCount = owned + 1; return next; }
export function buyPauseLength(state) { const owned = state.upgrades?.pauseLength ?? 0; const cost = pauseLengthCost(owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.pauseLength = owned + 1; return next; }
export function buyQueueVision(state) { const owned = state.upgrades?.queueVision ?? 0; const cost = queueVisionCost(owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.queueVision = owned + 1; return next; }
export function restoreHeart(state) { if (state.resources.hearts >= state.resources.maxHearts) return state; if (state.resources.diamonds < HEART_RESTORE_COST) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= HEART_RESTORE_COST; next.resources.hearts += 1; return next; }
export function maxHeartCost(maxHearts) { return Math.ceil(MAX_HEART_BASE_COST * 2 ** Math.max(0, maxHearts - 5)); }
export function buyMaxHeart(state) { const cost = maxHeartCost(state.resources.maxHearts); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.resources.maxHearts += 1; next.resources.hearts += 1; return next; }
export function mistakePressure(entries, mistakes) { const actualMistakes = realRoundEntries(entries).filter((entry) => Number.isFinite(entry.mistakes)).map((entry) => entry.mistakes); if (!actualMistakes.length) return { medianMistakes: null, maxMistakes: null, heartsLost: 0, highMistakeRound: false, newWorstMistakeRound: false }; const medianMistakes = median(actualMistakes); const maxMistakes = Math.max(...actualMistakes); const highMistakeRound = mistakes >= medianMistakes + 2; const newWorstMistakeRound = mistakes > maxMistakes; return { medianMistakes, maxMistakes, highMistakeRound, newWorstMistakeRound, heartsLost: (highMistakeRound ? 1 : 0) + (newWorstMistakeRound ? 1 : 0) }; }
export function settleRound(state, modeId, timeSeconds, mistakes, seed, createdAt = new Date().toISOString(), itemTimes = []) { const entries = state.gameMemory?.[modeId]?.entries ?? []; const safety = heartSafety(modeId, entries); const actual = heartBenchmarkEntries(entries).map((entry) => entry.timeSeconds); const newWorst = actual.length > 0 && timeSeconds > Math.max(...actual); const timeHeartsLost = timeSeconds > safety ? (newWorst ? 2 : 1) : 0; const mistakeResult = mistakePressure(entries, mistakes); const heartsLost = timeHeartsLost + mistakeResult.heartsLost; const basePayout = Math.max(0, payoutScore(state, modeId) + (heartsLost ? -1 : 0)); const activeBet = state.activeClubBet?.modeId === modeId ? state.activeClubBet : null; const betMistakesOk = !activeBet || !Number.isFinite(activeBet.mistakeLimit) || mistakes <= activeBet.mistakeLimit; const betProfit = activeBet ? Math.floor(activeBet.stake * activeBet.oddsMultiplier) : 0; const betWon = Boolean(activeBet && timeSeconds <= activeBet.targetSeconds && betMistakesOk); const betWinnings = betWon ? activeBet.stake + betProfit : 0; const betConfidenceWeight = betWon && activeBet.startingBank > 0 ? Math.floor(betProfit / activeBet.startingBank) : 0; const next = addRoundMemory(state, modeId, timeSeconds, createdAt, mistakes, betConfidenceWeight, { betWeighted: true, betProfit, startingBank: activeBet?.startingBank ?? 0, betConfidenceWeight }, itemTimes); next.resources.hearts = Math.max(0, next.resources.hearts - heartsLost); next.resources.diamonds += basePayout + betWinnings; next.activeClubBet = null; next.eventLog = [...(next.eventLog ?? []), { type: 'round', modeId, timeSeconds, mistakes, seed, createdAt, diamondsDelta: basePayout + betWinnings, heartsDelta: -heartsLost, timeHeartsLost, mistakeHeartsLost: mistakeResult.heartsLost, medianMistakes: mistakeResult.medianMistakes, maxMistakes: mistakeResult.maxMistakes, betMistakeLimit: activeBet?.mistakeLimit, betMistakesOk, betProfit, startingBank: activeBet?.startingBank ?? 0, betConfidenceWeight, betWinnings }].slice(-50); return next; }
export function streakDuration(baseMs, streak) { return Math.round(baseMs * (1 - Math.min(0.45, Math.max(0, streak) * 0.03))); }
