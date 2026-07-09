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
export function animationSpeedCost(owned) { return Math.ceil(10 * 1.55 ** owned); }
export function animationDuration(baseMs, state) { const level = state.upgrades?.animationSpeed ?? 0; return Math.round(baseMs * Math.max(0.45, 1 - level * 0.12)); }
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
function quantile(sortedAsc, chanceToBeat) { if (!sortedAsc.length) return 0; const position = chanceToBeat * (sortedAsc.length - 1); const lower = Math.floor(position); const upper = Math.ceil(position); if (lower === upper) return sortedAsc[lower]; const weight = position - lower; return sortedAsc[lower] * (1 - weight) + sortedAsc[upper] * weight; }
export function estimateTargets(modeId, entries) { const mode = MODES[modeId]; const actualEntries = entries.filter((entry) => entry.entryType !== 'rest'); const actualCount = actualEntries.length; const recentEntries = entries.slice(-TARGET_RECENT_ENTRY_LIMIT);
  const recentActual = actualEntries.slice(-TARGET_RECENT_ENTRY_LIMIT); const fallbackEven = mode.starterTargets[0].timeSeconds; const fallbackFactors = { half: 1.2, even: 1, double: 0.8, five: 0.65, ten: 0.55 }; const mistakeHistory = recentActual.filter((entry) => Number.isFinite(entry.mistakes)).map((entry) => entry.mistakes).sort((a, b) => a - b); const mistakeLimitFor = (target) => mistakeHistory.length ? Math.max(0, Math.floor(quantile(mistakeHistory, target.chance))) : 0; if (actualCount < 5) return BET_TIERS.map((target) => ({ ...target, timeSeconds: Math.max(1, Math.round(fallbackEven * fallbackFactors[target.id])), mistakeLimit: mistakeLimitFor(target), available: actualCount >= target.minHistory, actualCount })); const sorted = recentEntries.map((entry) => entry.timeSeconds).sort((a, b) => a - b); return BET_TIERS.map((target) => ({ ...target, timeSeconds: Math.max(1, Math.round(quantile(sorted, target.chance))), mistakeLimit: mistakeLimitFor(target), available: actualCount >= target.minHistory, actualCount })); }
export function heartSafety(modeId, entries) { const actual = entries.filter((entry) => entry.entryType === 'actual'); if (!actual.length) return Infinity; if (entries.length < 5) return MODES[modeId].heartSafetySeconds; const sorted = entries.map((entry) => entry.timeSeconds).sort((a, b) => a - b); return Math.round(quantile(sorted, 0.65)); }
export function addRoundMemory(state, modeId, timeSeconds, createdAt, mistakes = 0, extraActualEntries = 0, extraMeta = {}) { const next = structuredClone(state); next.gameMemory ??= {}; next.gameMemory[modeId] ??= { entries: [] }; const entries = next.gameMemory[modeId].entries ?? []; entries.push({ timeSeconds, mistakes, entryType: 'actual', createdAt, percentileAtRun: percentileAtRun(timeSeconds, entries) }); for (let i = 0; i < extraActualEntries; i += 1) entries.push({ timeSeconds, mistakes, entryType: 'actual', createdAt, weightedByBet: true, weightedIndex: i + 1, ...extraMeta }); next.gameMemory[modeId].entries = entries.slice(-MEMORY_LIMIT); for (const other of Object.keys(next.unlockedModes)) { if (other === modeId || !next.unlockedModes[other]) continue; next.gameMemory[other] ??= { entries: [] }; const otherEntries = next.gameMemory[other].entries ?? []; const worst = otherEntries.length ? Math.max(...otherEntries.map((entry) => entry.timeSeconds)) : MODES[other].heartSafetySeconds; otherEntries.push({ timeSeconds: worst, mistakes: 0, entryType: 'rest', createdAt }); next.gameMemory[other].entries = otherEntries.slice(-MEMORY_LIMIT); } return next; }
export function createClubBet(modeId, offer, stake) { return { modeId, targetId: offer.id, targetSeconds: offer.timeSeconds, mistakeLimit: offer.mistakeLimit ?? 0, oddsMultiplier: offer.oddsMultiplier, oddsLabel: offer.oddsLabel, stake, cost: stake * CLUB_COST }; }
export function payoutScore(state, modeId) { return MODES[modeId].baseDiamonds + state.upgrades.spades.global + state.upgrades.spades[modeId]; }
export function spadeCost(scope, owned) { const base = scope === 'global' ? 25 : scope === 'sort_2' ? 12 : scope === 'sort_3' ? 9 : 6; const growth = scope === 'global' ? 1.6 : 1.5; return Math.ceil(base * growth ** owned); }
export function perItemMedianBonusCost(modeId) { const levels = modeId === 'sort_2' ? 8 : modeId === 'sort_3' ? 12 : 16; return Array.from({ length: levels }, (_, owned) => spadeCost(modeId, owned)).reduce((sum, cost) => sum + cost, 0); }
export function hasModeBetHistory(state, modeId) { return (state.modeBetCounts?.[modeId] ?? 0) > 0; }
export function hasPerItemMedianBonus(state, modeId) { return (state.upgrades?.perItemMedianBonus?.[modeId] ?? 0) > 0; }
function ensureItemStats(next, modeId) {
  next.itemStats ??= {};
  next.itemStats[modeId] ??= { fastestSeconds: null, longestSeconds: null, entries: [] };
  next.itemStats[modeId].entries ??= [];
  return next.itemStats[modeId];
}
export function itemTimingTargets(state, modeId) { const entries = state.itemStats?.[modeId]?.entries ?? []; if (!entries.length) return { fastestSeconds: null, medianSeconds: null, longestSeconds: null, count: 0 }; const times = entries.map((entry) => entry.timeSeconds); return { fastestSeconds: Math.min(...times), medianSeconds: median(times), longestSeconds: Math.max(...times), count: times.length }; }
export function settleItemTiming(state, modeId, itemId, timeSeconds, createdAt = new Date().toISOString()) {
  const next = structuredClone(state);
  const stats = ensureItemStats(next, modeId);
  const targets = itemTimingTargets(next, modeId);
  const hasHistory = stats.entries.length > 0;
  const isNewLongest = hasHistory && timeSeconds > stats.longestSeconds;
  const isNewFastest = hasHistory && timeSeconds < stats.fastestSeconds;
  const medianBonusDelta = hasPerItemMedianBonus(next, modeId) && Number.isFinite(targets.medianSeconds) && timeSeconds < targets.medianSeconds ? 1 : 0;
  const heartsDelta = isNewLongest ? -1 : 0;
  const diamondsDelta = (isNewFastest ? payoutScore(next, modeId) : 0) + medianBonusDelta;
  stats.fastestSeconds = hasHistory ? Math.min(stats.fastestSeconds, timeSeconds) : timeSeconds;
  stats.longestSeconds = hasHistory ? Math.max(stats.longestSeconds, timeSeconds) : timeSeconds;
  stats.entries = [...stats.entries, { itemId, timeSeconds, createdAt, isNewFastest, isNewLongest, medianBonusDelta }].slice(-200);
  next.resources.hearts = Math.max(0, next.resources.hearts + heartsDelta);
  next.resources.diamonds += diamondsDelta;
  const event = { type: 'itemTiming', modeId, itemId, timeSeconds, createdAt, heartsDelta, diamondsDelta, medianBonusDelta, isNewFastest, isNewLongest };
  next.eventLog = [...next.eventLog, event].slice(-50);
  return { state: next, event };
}
export function buyClubBet(state, bet) { if (bet.stake <= 0) return { ...state, activeClubBet: null }; if (bet.oddsLabel === '1:2' && bet.stake % 2 !== 0) throw new Error('1:2 wagers must be paid in multiples of 2 Clubs'); if (state.resources.diamonds < bet.cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= bet.cost; next.activeClubBet = { ...bet, startingBank: state.resources.diamonds }; next.modeBetCounts ??= {}; next.modeBetCounts[bet.modeId] = (next.modeBetCounts[bet.modeId] ?? 0) + 1; return next; }
export function unlockMode(state, modeId) { const mode = MODES[modeId]; if (state.unlockedModes[modeId]) return state; if (state.resources.diamonds < mode.unlockCost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= mode.unlockCost; next.unlockedModes[modeId] = true; return next; }
export function buySpade(state, scope) { const cost = spadeCost(scope, state.upgrades.spades[scope]); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades.spades[scope] += 1; return next; }
export function buyPerItemMedianBonus(state, modeId) { if (!hasModeBetHistory(state, modeId)) throw new Error('Make at least one bet in this mode first'); if (hasPerItemMedianBonus(state, modeId)) return state; const cost = perItemMedianBonusCost(modeId); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.perItemMedianBonus ??= { sort_2: 0, sort_3: 0, sort_4: 0 }; next.upgrades.perItemMedianBonus[modeId] = 1; return next; }
export function buyAnimationSpeed(state) { const owned = state.upgrades?.animationSpeed ?? 0; const cost = animationSpeedCost(owned); if (state.resources.diamonds < cost) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= cost; next.upgrades ??= {}; next.upgrades.animationSpeed = owned + 1; return next; }
export function restoreHeart(state) { if (state.resources.hearts >= state.resources.maxHearts) return state; if (state.resources.diamonds < HEART_RESTORE_COST) throw new Error('Not enough Diamonds'); const next = structuredClone(state); next.resources.diamonds -= HEART_RESTORE_COST; next.resources.hearts += 1; return next; }
export function mistakePressure(entries, mistakes) { const actualMistakes = entries.filter((entry) => entry.entryType === 'actual' && Number.isFinite(entry.mistakes)).map((entry) => entry.mistakes); if (!actualMistakes.length) return { medianMistakes: null, maxMistakes: null, heartsLost: 0, highMistakeRound: false, newWorstMistakeRound: false }; const medianMistakes = median(actualMistakes); const maxMistakes = Math.max(...actualMistakes); const highMistakeRound = mistakes >= medianMistakes + 2; const newWorstMistakeRound = mistakes > maxMistakes; return { medianMistakes, maxMistakes, highMistakeRound, newWorstMistakeRound, heartsLost: (highMistakeRound ? 1 : 0) + (newWorstMistakeRound ? 1 : 0) }; }
export function settleRound(state, modeId, timeSeconds, mistakes, seed, createdAt = new Date().toISOString()) { const entries = state.gameMemory?.[modeId]?.entries ?? []; const safety = heartSafety(modeId, entries); const actual = entries.filter((entry) => entry.entryType === 'actual').map((entry) => entry.timeSeconds); const newWorst = actual.length > 0 && timeSeconds > Math.max(...actual); const timeHeartsLost = timeSeconds > safety ? (newWorst ? 2 : 1) : 0; const mistakeResult = mistakePressure(entries, mistakes); const heartsLost = timeHeartsLost + mistakeResult.heartsLost; const basePayout = Math.max(0, payoutScore(state, modeId) + (heartsLost ? -1 : 0)); const activeBet = state.activeClubBet?.modeId === modeId ? state.activeClubBet : null; const betMistakesOk = !activeBet || !Number.isFinite(activeBet.mistakeLimit) || mistakes <= activeBet.mistakeLimit; const betProfit = activeBet ? Math.floor(activeBet.stake * activeBet.oddsMultiplier) : 0; const betWon = Boolean(activeBet && timeSeconds <= activeBet.targetSeconds && betMistakesOk); const betWinnings = betWon ? activeBet.stake + betProfit : 0; const betConfidenceWeight = betWon && activeBet.startingBank > 0 ? Math.floor(betProfit / activeBet.startingBank) : 0; const next = addRoundMemory(state, modeId, timeSeconds, createdAt, mistakes, betConfidenceWeight, { betWeighted: true, betProfit, startingBank: activeBet?.startingBank ?? 0, betConfidenceWeight }); next.resources.hearts = Math.max(0, next.resources.hearts - heartsLost); next.resources.diamonds += basePayout + betWinnings; next.activeClubBet = null; next.eventLog = [...(next.eventLog ?? []), { type: 'round', modeId, timeSeconds, mistakes, seed, createdAt, diamondsDelta: basePayout + betWinnings, heartsDelta: -heartsLost, timeHeartsLost, mistakeHeartsLost: mistakeResult.heartsLost, medianMistakes: mistakeResult.medianMistakes, maxMistakes: mistakeResult.maxMistakes, betMistakeLimit: activeBet?.mistakeLimit, betMistakesOk, betProfit, startingBank: activeBet?.startingBank ?? 0, betConfidenceWeight, betWinnings }].slice(-50); return next; }
export function streakDuration(baseMs, streak) { return Math.round(baseMs * (1 - Math.min(0.45, Math.max(0, streak) * 0.03))); }
