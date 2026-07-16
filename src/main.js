import { MODES, modeList, STORAGE_KEY, generateBoard, estimateTargets, heartSafety, percentileAtRun, itemPercentileAtRun, createClubBet, buyClubBet, unlockMode, canUnlockMode, buySpade, buyPerItemMedianBonus, buySortedItemDisplay, restoreHeart, buyMaxHeart, maxHeartCost, buyAnimationSpeed, animationSpeedCost, animationDuration, buyStudyTime, studyTimeCost, buyPauseCount, pauseCountCost, buyPauseLength, pauseLengthCost, buyQueueVision, queueVisionCost, sortedItemDisplayCost, hasSortedItemDisplay, settleRound, settleItemTiming, itemTimingTargets, spadeCost, payoutScore, perItemMedianBonusCost, hasModeBetHistory, streakDuration } from './game/core.js?v=0.3.0';

const root = document.querySelector('#root');
const APP_VERSION = 'v0.3.0';
const SAVE_SCHEMA_VERSION = '0.3.0-local';
const arrows = { left: '←', right: '→', up: '↑', down: '↓' };
let items = [];
let selectors = [];
let state;
let modeId = 'sort_2';
let board;
let queue = [];
let startedAt = null;
let elapsed = 0;
let streak = 0;
let mistakes = 0;
let feedback = 'Loading the parlor…';
let inRound = false;
let selectedTarget = 'even';
let stake = 1;
let timerId = null;
let motion = null;
let lastSummary = null;
let promptStartedAt = null;
let itemHeartLosses = 0;
let itemDiamondBonuses = 0;
let itemRecordCount = 0;
let roundItemTimes = [];
let studying = false;
let studyEndsAt = null;
let paused = false;
let pauseStartedAt = null;
let pauseEndsAt = null;
let pausedAccumMs = 0;
let pausesRemaining = 0;
let roundSlowHeartLossTimes = [];
let debugOpen = false;
let categoryAssignments = {};
let sortedByGroup = {};

function fmt(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function fmtDebugSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  return seconds < 10 ? `${seconds.toFixed(2)}s` : `${fmt(seconds)} (${seconds.toFixed(2)}s)`;
}
function seed() { return `${modeId}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
async function json(path) { const response = await fetch(path); if (!response.ok) throw new Error(`Unable to load ${path}`); return response.json(); }
function makeLocalSaveId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().slice(0, 8);
  return Math.random().toString(16).slice(2, 10);
}
function normalizeSave(candidate, defaultState) {
  const next = structuredClone(candidate || defaultState);
  next.itemStats ??= {};
  for (const id of Object.keys(MODES)) {
    next.itemStats[id] ??= { fastestSeconds: null, longestSeconds: null, entries: [] };
    next.itemStats[id].entries ??= [];
    next.gameMemory ??= {};
    next.gameMemory[id] ??= { entries: [] };
    next.gameMemory[id].entries ??= [];
  }
  next.upgrades ??= {};
  next.upgrades.spades ??= { global: 0 };
  next.upgrades.spades.global ??= 0;
  next.upgrades.perItemMedianBonus ??= {};
  next.upgrades.sortedItemDisplay ??= {};
  next.modeBetCounts ??= {};
  for (const key of ['animationSpeed', 'studyTime', 'pauseCount', 'pauseLength', 'queueVision']) {
    const prior = typeof next.upgrades[key] === 'number' ? next.upgrades[key] : 0;
    if (typeof next.upgrades[key] !== 'object' || next.upgrades[key] === null) next.upgrades[key] = {};
    for (const id of Object.keys(MODES)) next.upgrades[key][id] ??= id === 'sort_2' ? prior : 0;
  }
  for (const id of Object.keys(MODES)) {
    next.upgrades.spades[id] ??= 0;
    next.upgrades.perItemMedianBonus[id] ??= 0;
    next.upgrades.sortedItemDisplay[id] ??= false;
    next.modeBetCounts[id] ??= 0;
  }
  next.restTracking ??= { lastCompletedModeId: null, awayBlock: 0, restedBlockByMode: {} };
  next.restTracking.restedBlockByMode ??= {};
  next.restTracking.awayBlock ??= 0;
  next.saveMeta = {
    localSaveId: next.saveMeta?.localSaveId || makeLocalSaveId(),
    schemaVersion: SAVE_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    saveScope: 'This browser profile on this device',
    createdAt: next.saveMeta?.createdAt || new Date().toISOString(),
    savedAt: next.saveMeta?.savedAt || new Date().toISOString(),
  };
  return next;
}
function save() {
  state.saveMeta = { ...state.saveMeta, schemaVersion: SAVE_SCHEMA_VERSION, appVersion: APP_VERSION, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadSaved(defaultState) {
  try { return normalizeSave(JSON.parse(localStorage.getItem(STORAGE_KEY)), defaultState); } catch { return normalizeSave(defaultState, defaultState); }
}
function groupByDirection(direction) { return board.groups.filter((group) => group.direction === direction); }
function modeUpgrade(key, id = modeId) { const value = state.upgrades?.[key]; return typeof value === 'number' ? value : (value?.[id] ?? 0); }
function currentTargets() { return estimateTargets(modeId, state.gameMemory[modeId].entries); }
function modePayout(id) { return payoutScore(state, id); }
function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
}
function flagCodepoints(glyph) {
  return Array.from(glyph || '').map((char) => char.codePointAt(0).toString(16)).join('-');
}
function flagHtml(item) {
  const codepoints = flagCodepoints(item.glyph);
  const src = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
  return `<img class="flag-img" src="${src}" alt="flag ${escapeHtml(item.name)}" title="${escapeHtml(item.name)}" loading="eager" decoding="async" draggable="false" />`;
}
function glyphHtml(item) {
  return item?.kind === 'flag' ? flagHtml(item) : `<span class="emoji-glyph">${item?.glyph ?? ''}</span>`;
}
function heartsHtml() {
  return `<span class="hearts" aria-label="${state.resources.hearts} of ${state.resources.maxHearts} hearts">${Array.from({ length: state.resources.maxHearts }, (_, index) => `<span class="heart ${index < state.resources.hearts ? 'full' : 'empty'}">${index < state.resources.hearts ? '♥' : '♥'}</span>`).join('')}</span>`;
}
function queueStripHtml() {
  const visibleAhead = modeUpgrade('queueVision');
  return `<div class="queue-strip" style="--queue-total:${board.queue.length}" aria-label="Prompt queue">${queue.map((prompt, index) => {
    const revealed = index === 0 || index <= visibleAhead || prompt.revealed;
    return `<span class="queue-glyph ${index === 0 ? 'next' : ''} ${revealed ? '' : 'hidden-glyph'}">${revealed ? glyphHtml(prompt.item) : '◆'}</span>`;
  }).join('')}</div>`;
}

function entryTags(entry) {
  const tags = [entry.entryType || 'actual'];
  if (entry.temporary) tags.push('temporary');
  if (entry.calibrationSource) tags.push(entry.calibrationSource);
  if (entry.weightedByBet) tags.push(`bet-weight ${entry.weightedIndex ?? ''}`.trim());
  if (['actual', 'rest'].includes(entry.entryType) && !entry.weightedByBet) tags.push('heart/odds');
  if (['actual', 'rest'].includes(entry.entryType) && !entry.weightedByBet) tags.push('mistakes');
  if (entry.restedWhilePlaying) tags.push(`away during ${entry.restedWhilePlaying}`);
  return tags.join(' · ');
}
function debugRecordsHtml(targets, safety) {
  if (!debugOpen) return '';
  const entries = state.gameMemory?.[modeId]?.entries ?? [];
  const stats = itemTimingTargets(state, modeId);
  const itemEntries = state.itemStats?.[modeId]?.entries ?? [];
  const rows = entries.map((entry, index) => `<tr><td>${index + 1}</td><td>${fmtDebugSeconds(entry.timeSeconds)}</td><td>${Number.isFinite(entry.mistakes) ? entry.mistakes : '—'}</td><td>${escapeHtml(entryTags(entry))}</td></tr>`).join('') || '<tr><td colspan="4">No round memory yet.</td></tr>';
  const itemRows = itemEntries.map((entry, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(entry.itemId ?? 'item')}</td><td>${fmtDebugSeconds(entry.timeSeconds)}</td><td>${`${Math.round(itemPercentileAtRun(entry.timeSeconds, itemEntries.slice(0, index)) * 100)}%`}</td><td>${[entry.entryType === 'rest' ? 'rest' : '', entry.restedWhilePlaying ? `away during ${entry.restedWhilePlaying}` : '', entry.isEliteItem ? 'elite' : '', entry.isNewFastest ? 'fastest' : '', entry.isNewLongest ? 'longest' : '', entry.eliteBonusDelta ? `+♦${entry.eliteBonusDelta}` : '', entry.medianBonusDelta ? `median +♦${entry.medianBonusDelta}` : ''].filter(Boolean).join(' · ') || '—'}</td></tr>`).join('') || '<tr><td colspan="5">No item timing entries yet.</td></tr>';
  return `<section class="panel debug-panel"><h2>Debug records for ${MODES[modeId].name}</h2><p class="hint">Shows the full stored records feeding ♥ safety, ♣ odds, mistake pressure, and item-timing bonuses. Temporary calibration records are replaced one at a time by later real runs.</p><div class="debug-grid"><div><h3>Round memory (${entries.length})</h3><p>♥ safety now: <strong>${fmtDebugSeconds(safety)}</strong></p><div class="debug-scroll"><table><thead><tr><th>#</th><th>Time</th><th>Err</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table></div></div><div><h3>♣ targets</h3><ul>${targets.map((target) => `<li>${escapeHtml(target.label)}: ${fmtDebugSeconds(target.timeSeconds)} / ≤${target.mistakeLimit} errors · ${target.available ? 'available' : `${target.actualCount}/${target.minHistory}`}</li>`).join('')}</ul><h3>Item timing (${itemEntries.length})</h3><p>Elite ${fmtDebugSeconds(stats.eliteSeconds)} · meta-median ${fmtDebugSeconds(stats.metaMedianSeconds)} · fastest ${fmtDebugSeconds(stats.fastestSeconds)} · median ${fmtDebugSeconds(stats.medianSeconds)} · longest ${fmtDebugSeconds(stats.longestSeconds)}${Number.isFinite(stats.metaMedianPercentile) ? ` · meta pct ${Math.round(stats.metaMedianPercentile * 100)}%` : ''}</p><div class="debug-scroll"><table><thead><tr><th>#</th><th>Item</th><th>Time</th><th>Prior pct</th><th>Flags</th></tr></thead><tbody>${itemRows}</tbody></table></div></div></div></section>`;
}
function timerPct(targetSeconds) {
  if (!targetSeconds || !promptStartedAt) return 0;
  const itemElapsed = (Date.now() - promptStartedAt) / 1000;
  return Math.max(0, Math.min(100, ((targetSeconds - itemElapsed) / Math.max(0.01, targetSeconds)) * 100));
}
function itemTimerHtml() {
  const targets = itemTimingTargets(state, modeId);
  if (!targets.count) return '<span class="item-timer-empty">First item sets clock</span>';
  const rows = [
    ['Elite', targets.eliteSeconds ?? targets.fastestSeconds, 'fast'],
    ['Target', targets.metaMedianSeconds ?? targets.medianSeconds, 'median'],
  ];
  return `<span class="item-timer-stack" aria-label="Item timing clocks">${rows.map(([label, seconds, cls]) => `<span class="item-clock ${cls}" title="${label}: ${seconds.toFixed(2)}s" style="--pct:${timerPct(seconds)}"><span>${label[0]}</span></span>`).join('')}</span>`;
}
function barsHtml(safety, activeBet, hideTimers = false) {
  if (hideTimers) return `<div class="timer-stack"><div class="timer-label muted"><span>Final item</span><span>Timers hidden</span></div>${queueStripHtml()}</div>`;
  const hasHeartLimit = Number.isFinite(safety);
  const heartPct = hasHeartLimit ? Math.max(0, Math.min(100, ((safety - elapsed) / Math.max(1, safety)) * 100)) : 100;
  const betTarget = activeBet?.targetSeconds;
  const betPct = betTarget ? Math.max(0, Math.min(100, ((betTarget - elapsed) / Math.max(1, betTarget)) * 100)) : 0;
  const heartLabel = hasHeartLimit ? `<span>${heartsHtml()} ♥ safe ${fmt(Math.max(0, safety - elapsed))}</span><span>${fmt(safety)}</span>` : `<span>${heartsHtml()} First run: no ♥ timer</span><span>Take your time</span>`;
  return `<div class="timer-stack"><div class="timer-label">${heartLabel}</div><div class="timer-bar heart-bar ${hasHeartLimit ? '' : 'untimed'}"><span style="width:${heartPct}%"></span></div>${activeBet ? `<div class="timer-label"><span>♣ alive ${fmt(Math.max(0, activeBet.targetSeconds - elapsed))}</span><span>${activeBet.oddsLabel || `${activeBet.oddsMultiplier}:1`} / ${fmt(activeBet.targetSeconds)} / ≤${activeBet.mistakeLimit} errors</span></div><div class="timer-bar bet-bar"><span style="width:${betPct}%"></span></div>` : '<div class="timer-label muted"><span>♣ none</span><span>Buy between rounds</span></div><div class="timer-bar bet-bar empty"><span style="width:0%"></span></div>'}${queueStripHtml()}</div>`;
}
function stopTimer() { if (timerId) window.clearInterval(timerId); timerId = null; }
function startBoard(nextMode = modeId) {
  modeId = nextMode;
  board = generateBoard(modeId, seed(), items, selectors);
  queue = [...board.queue];
  startedAt = null;
  elapsed = 0;
  streak = 0;
  mistakes = 0;
  selectedTarget = 'even';
  inRound = false;
  motion = null;
  lastSummary = null;
  promptStartedAt = null;
  itemHeartLosses = 0;
  itemDiamondBonuses = 0;
  itemRecordCount = 0;
  roundItemTimes = [];
  studying = false;
  studyEndsAt = null;
  paused = false;
  pauseStartedAt = null;
  pauseEndsAt = null;
  pausedAccumMs = 0;
  pausesRemaining = 0;
  roundSlowHeartLossTimes = [];
  categoryAssignments = {};
  sortedByGroup = {};
  feedback = 'Board ready. Buy ♣ if you want odds, then start the full-screen round.';
  stopTimer();
  render();
}
function ensureTimer() {
  if (startedAt) return;
  startedAt = Date.now();
  startTicker();
}
function startTicker() {
  if (timerId) return;
  timerId = window.setInterval(() => {
    if (studying && Date.now() >= studyEndsAt) {
      studying = false;
      studyEndsAt = null;
      ensureTimer();
      resetPromptClock();
    }
    if (paused && Date.now() >= pauseEndsAt) endPause();
    if (startedAt) elapsed = (Date.now() - startedAt - pausedAccumMs - (paused ? Date.now() - pauseStartedAt : 0)) / 1000;
    render();
  }, 100);
}
function resetPromptClock() { promptStartedAt = Date.now(); }
function startRound() {
  inRound = true;
  lastSummary = null;
  feedback = 'Full-screen round started. Sort every glyph as fast as you can.';
  pausesRemaining = modeUpgrade('pauseCount');
  pausedAccumMs = 0;
  const studySeconds = modeUpgrade('studyTime');
  if (studySeconds > 0) {
    studying = true;
    studyEndsAt = Date.now() + studySeconds * 1000;
    feedback = `Study time: ${studySeconds}s. Sort any glyph to start early.`;
    startTicker();
  } else {
    ensureTimer();
    resetPromptClock();
  }
  render();
}
function motionPoint(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
function backOfQueuePoint() {
  const rect = root.querySelector('.queue-strip')?.getBoundingClientRect() || root.querySelector('.center-card').getBoundingClientRect();
  return { x: rect.right - Math.min(24, rect.width / 2), y: rect.top + rect.height / 2 };
}
function pauseSeconds() { return 1 + modeUpgrade('pauseLength'); }
function endPause() {
  if (!paused) return;
  const pauseMs = Date.now() - pauseStartedAt;
  pausedAccumMs += pauseMs;
  if (promptStartedAt) promptStartedAt += pauseMs;
  paused = false;
  pauseStartedAt = null;
  pauseEndsAt = null;
  feedback = 'Pause finished. Back to the table.';
}
function activatePause() {
  if (!inRound || studying || paused || !startedAt || pausesRemaining <= 0 || motion) return;
  pausesRemaining -= 1;
  paused = true;
  pauseStartedAt = Date.now();
  pauseEndsAt = pauseStartedAt + pauseSeconds() * 1000;
  feedback = `Paused for ${pauseSeconds()}s.`;
  render();
}
async function animateGlyphTravel(html, direction, isCorrect) {
  await nextFrame();
  const centerCard = root.querySelector('.center-card');
  const from = motionPoint(root.querySelector('.queue-glyph.next')?.getBoundingClientRect() || centerCard.getBoundingClientRect());
  const center = motionPoint(centerCard.getBoundingClientRect());
  const zone = motionPoint(root.querySelector(`.zone-${direction}`)?.getBoundingClientRect() || centerCard.getBoundingClientRect());
  const back = backOfQueuePoint();
  const clone = document.createElement('span');
  clone.className = 'motion-clone';
  clone.innerHTML = html;
  clone.style.left = `${from.x}px`;
  clone.style.top = `${from.y}px`;
  document.body.append(clone);
  const timing = itemTimingTargets(state, modeId);
  const adaptiveBase = isCorrect
    ? Math.max(1000, Math.min(1900, (timing.medianSeconds || 2) * 650))
    : Math.max(1600, Math.min(3000, (timing.longestSeconds || 3) * 750));
  if (!clone.animate) {
    await new Promise((resolve) => window.setTimeout(resolve, animationDuration(adaptiveBase, state, modeId)));
    clone.remove();
    return;
  }
  const keyframes = isCorrect
    ? [
        { left: `${from.x}px`, top: `${from.y}px`, transform: 'translate(-50%, -50%) scale(0.72)', opacity: 0.9, offset: 0 },
        { left: `${center.x}px`, top: `${center.y}px`, transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.46 },
        { left: `${zone.x}px`, top: `${zone.y}px`, transform: 'translate(-50%, -50%) scale(0.42)', opacity: 0, offset: 1 },
      ]
    : [
        { left: `${from.x}px`, top: `${from.y}px`, transform: 'translate(-50%, -50%) scale(0.72)', opacity: 0.9, offset: 0 },
        { left: `${center.x}px`, top: `${center.y}px`, transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.34 },
        { left: `${zone.x}px`, top: `${zone.y}px`, transform: 'translate(-50%, -50%) scale(0.58) rotate(-7deg)', opacity: 0.96, offset: 0.62 },
        { left: `${back.x}px`, top: `${back.y}px`, transform: 'translate(-50%, -50%) scale(0.34)', opacity: 0, offset: 1 },
      ];
  const animation = clone.animate(keyframes, { duration: animationDuration(adaptiveBase, state, modeId), easing: 'cubic-bezier(0.18, 0.84, 0.24, 1)', fill: 'forwards' });
  await animation.finished.catch(() => {});
  clone.remove();
}

function showItemOutcomeFloat({ diamonds = 0, hearts = 0 } = {}) {
  const center = root.querySelector('.center-card')?.getBoundingClientRect();
  if (!center) return;
  const originX = center.left + center.width / 2;
  const originY = center.top + center.height / 2;
  const effects = [];
  if (diamonds > 0) effects.push({ kind: 'diamond', text: diamonds === 1 ? '+♦' : `+♦${diamonds}` });
  if (hearts < 0) effects.push({ kind: 'heart', text: hearts === -1 ? '-♥' : `-♥${Math.abs(hearts)}` });
  effects.forEach((effect, index) => {
    const node = document.createElement('span');
    node.className = `outcome-float ${effect.kind}`;
    node.textContent = effect.text;
    node.style.left = `${originX + (index - (effects.length - 1) / 2) * 42}px`;
    node.style.top = `${originY}px`;
    document.body.append(node);
    window.setTimeout(() => node.remove(), 1150);
  });
}

function finishRound() {
  const finalElapsed = startedAt ? (Date.now() - startedAt - pausedAccumMs - (paused ? Date.now() - pauseStartedAt : 0)) / 1000 : elapsed;
  const final = Math.max(1, Number(finalElapsed.toFixed(2)));
  stopTimer();
  const before = state;
  const priorMemory = before.gameMemory?.[modeId]?.entries ?? [];
  const activeBet = before.activeClubBet;
  const percentile = percentileAtRun(final, priorMemory);
  const nextState = settleRound(before, modeId, final, mistakes, board.seed, new Date().toISOString(), roundItemTimes);
  const event = nextState.eventLog.at(-1);
  state = nextState;
  save();
  lastSummary = {
    modeName: MODES[modeId].name,
    timeSeconds: final,
    mistakes,
    percentile,
    diamondsDelta: event?.diamondsDelta ?? 0,
    heartsDelta: event?.heartsDelta ?? 0,
    betWinnings: event?.betWinnings ?? 0,
    betConfidenceWeight: event?.betConfidenceWeight ?? 0,
    betTarget: activeBet?.targetSeconds,
    betMistakeLimit: activeBet?.mistakeLimit,
    betWon: Boolean(activeBet && final <= activeBet.targetSeconds && mistakes <= activeBet.mistakeLimit),
    itemHeartLosses,
    itemDiamondBonuses,
    itemRecordCount,
    mistakeHeartsLost: event?.mistakeHeartsLost ?? 0,
    medianMistakes: event?.medianMistakes,
    maxMistakes: event?.maxMistakes,
  };
  feedback = `Round complete in ${final.toFixed(2)}s with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`;
  startedAt = null;
  inRound = false;
  elapsed = final;
  motion = null;
  render();
}

function assignedGroupsForDirection(direction) {
  return Object.entries(categoryAssignments).filter(([, assignedDirection]) => assignedDirection === direction).map(([groupId]) => groupId);
}
function freeformDirectionHasSpace(direction) {
  return assignedGroupsForDirection(direction).length < MODES[modeId].groupsPerDirection;
}
function sortDecision(prompt, direction) {
  const mode = MODES[modeId];
  if (mode.variant !== 'freeform') return { isCorrect: prompt.direction === direction };
  const assigned = categoryAssignments[prompt.groupId];
  if (assigned) return { isCorrect: assigned === direction };
  return { isCorrect: freeformDirectionHasSpace(direction), assignDirection: freeformDirectionHasSpace(direction) ? direction : null };
}
function recordSortedPrompt(prompt, direction, decision) {
  if (decision.assignDirection) categoryAssignments[prompt.groupId] = decision.assignDirection;
  const mode = MODES[modeId];
  if (mode.variant !== 'standard' || hasSortedItemDisplay(state, modeId)) {
    sortedByGroup[prompt.groupId] ??= [];
    sortedByGroup[prompt.groupId].push(prompt.item);
  }
}
function groupSlotHtml(group, showExamples) {
  const sorted = sortedByGroup[group.id] ?? [];
  const content = showExamples ? group.items.map((item) => glyphHtml(item)).join('') : sorted.map((item) => glyphHtml(item)).join('');
  return `<span class="glyph-group ${content ? '' : 'mystery-group'}">${content || '◆ ◆ ◆ ◆'}</span>`;
}
function groupsForZone(direction) {
  const mode = MODES[modeId];
  if (mode.variant !== 'freeform') return groupByDirection(direction);
  const assigned = assignedGroupsForDirection(direction).map((groupId) => board.groups.find((group) => group.id === groupId)).filter(Boolean);
  return [...assigned, ...Array.from({ length: Math.max(0, mode.groupsPerDirection - assigned.length) }, (_, index) => ({ id: `open-${direction}-${index}`, open: true }))];
}
function sideZoneHtml(direction) {
  const mode = MODES[modeId];
  const showExamples = mode.variant === 'standard';
  const slots = groupsForZone(direction).map((group) => group.open ? '<span class="glyph-group mystery-group">◆ ◆ ◆ ◆</span>' : groupSlotHtml(group, showExamples)).join('');
  return `<button class="zone zone-${direction}" data-dispatch="${direction}"><span class="direction">${arrows[direction]}</span><span class="groups vertical-groups">${slots}</span></button>`;
}
async function dispatch(direction) {
  const mode = MODES[modeId];
  if (motion || paused || !inRound || !queue[0] || !mode.directions.includes(direction)) return;
  if (studying) {
    studying = false;
    studyEndsAt = null;
    ensureTimer();
    resetPromptClock();
  }
  ensureTimer();
  const prompt = queue[0];
  const decision = sortDecision(prompt, direction);
  const isCorrect = decision.isCorrect;
  const itemSeconds = promptStartedAt ? Math.max(0.01, Number(((Date.now() - promptStartedAt) / 1000).toFixed(2))) : 0;
  motion = { busy: true };
  feedback = isCorrect ? `${prompt.item.name} flying ${arrows[direction]}…` : `${prompt.item.name} rejected ${arrows[direction]} and returning to the queue…`;
  render();
  await animateGlyphTravel(glyphHtml(prompt.item), direction, isCorrect);
  if (isCorrect) {
    recordSortedPrompt(prompt, direction, decision);
    const itemResult = settleItemTiming(state, modeId, prompt.item.id, itemSeconds, new Date().toISOString(), roundSlowHeartLossTimes);
    state = itemResult.state;
    save();
    if (itemResult.event.heartsDelta < 0) { itemHeartLosses += Math.abs(itemResult.event.heartsDelta); roundSlowHeartLossTimes.push(itemSeconds); }
    if (itemResult.event.diamondsDelta > 0) itemDiamondBonuses += itemResult.event.diamondsDelta;
    showItemOutcomeFloat({ diamonds: itemResult.event.diamondsDelta, hearts: itemResult.event.heartsDelta });
    if (itemResult.event.isNewFastest || itemResult.event.isNewLongest) itemRecordCount += 1;
    roundItemTimes.push(itemSeconds);
    queue.shift();
    streak += 1;
    const itemNote = `${itemResult.event.isEliteItem ? ` Elite item: +♦${itemResult.event.eliteBonusDelta}.` : itemResult.event.isNewFastest ? ' New fastest item.' : itemResult.event.heartsDelta < 0 ? ' Too slow: -♥.' : ''}${itemResult.event.medianBonusDelta ? ` Beat item target: +♦${itemResult.event.medianBonusDelta}.` : ''}`;
    feedback = `Correct ${arrows[direction]} in ${itemSeconds.toFixed(2)}s — streak ${streak}; glide ${animationDuration(streakDuration(220, streak), state, modeId)}ms.${itemNote}`;
    motion = null;
    resetPromptClock();
    if (queue.length === 0) finishRound(); else render();
  } else {
    queue = [...queue.slice(1), { ...prompt, revealed: true }];
    streak = 0;
    mistakes += 1;
    feedback = `Wrong ${arrows[direction]} — ${prompt.item.name} slunk back to the end of the queue.`;
    motion = null;
    resetPromptClock();
    render();
  }
}
function setState(next) { state = next; save(); render(); }
function tryAction(fn) { try { setState(fn()); } catch (error) { feedback = error.message; render(); } }
function buyBet() {
  const stakeInput = root.querySelector('#stake');
  if (stakeInput) stake = Math.max(1, Number(stakeInput.value || 1));
  const offer = currentTargets().find((target) => target.id === selectedTarget);
  if (!offer?.available) { feedback = 'That bet needs more actual history in this mode.'; render(); return; }
  tryAction(() => buyClubBet(state, createClubBet(modeId, offer, stake)));
  feedback = `♣ bet set: ${stake} on ${fmt(offer.timeSeconds)} at ${offer.oddsLabel}.`;
  render();
}
function render() {
  const mode = MODES[modeId];
  const targets = currentTargets();
  const safety = heartSafety(modeId, state.gameMemory[modeId].entries);
  const current = queue[0];
  const progress = board.queue.length - queue.length;
  const studyLeft = studying ? Math.max(0, (studyEndsAt - Date.now()) / 1000) : 0;
  const pauseLeft = paused ? Math.max(0, (pauseEndsAt - Date.now()) / 1000) : 0;
  const medianBonusLevel = state.upgrades.perItemMedianBonus[modeId] ?? 0;
  const nextMedianBonus = medianBonusLevel + 1;
  const boardHtml = `<div class="play-hud"><div class="status-row"><span>⏱ ${elapsed.toFixed(1)}s</span><span>${heartsHtml()}</span><span>Queue ${queue.length}/${board.queue.length}</span><span>Streak ${streak}</span><span>Study ${studying ? studyLeft.toFixed(1) : '—'}</span><span>Pause ${paused ? pauseLeft.toFixed(1) : pausesRemaining}</span><button id="pause-round" ${inRound && !studying && !paused && pausesRemaining > 0 ? '' : 'disabled'}>Pause</button><span>Item ♦${itemDiamondBonuses} / ♥-${itemHeartLosses}</span></div>${barsHtml(safety, state.activeClubBet, inRound && queue.length === 1)}</div>
      <div class="sort-board framed-board mode-${mode.directions.length}">${mode.directions.map(sideZoneHtml).join('')}<div class="center-card ${motion ? 'busy' : ''}">${current ? itemTimerHtml() : ''}<span class="prompt ${motion ? 'ghost-prompt' : ''}">${current ? glyphHtml(current.item) : '🏁'}</span><span>${current ? `${progress}/${board.queue.length} sorted` : 'Round finished'}</span></div></div><p class="feedback" role="status">${feedback}</p>`;
  const debugHtml = debugRecordsHtml(targets, safety);
  const summaryHtml = lastSummary ? `<section class="panel post-round"><h2>Round summary</h2><div class="summary-grid"><span>Mode</span><strong>${lastSummary.modeName}</strong><span>Time</span><strong>${lastSummary.timeSeconds.toFixed(2)}s</strong><span>Percentile score</span><strong>${Math.round(lastSummary.percentile * 100)}%</strong><span>Mistakes</span><strong>${lastSummary.mistakes}</strong><span>♦ payout</span><strong>♦ ${lastSummary.diamondsDelta}</strong><span>Item speed bonus</span><strong>♦ ${lastSummary.itemDiamondBonuses}</strong><span>♥ change</span><strong>${lastSummary.heartsDelta} round / -${lastSummary.itemHeartLosses} item</strong><span>Mistake pressure</span><strong>${lastSummary.mistakeHeartsLost ? `-${lastSummary.mistakeHeartsLost} ♥` : 'Safe'}${Number.isFinite(lastSummary.medianMistakes) ? ` · median ${lastSummary.medianMistakes}` : ''}</strong><span>Item records</span><strong>${lastSummary.itemRecordCount}</strong><span>Bet result</span><strong>${lastSummary.betTarget ? `${lastSummary.betWon ? 'Won' : 'Lost'} vs ${fmt(lastSummary.betTarget)} / ≤${lastSummary.betMistakeLimit} errors (${lastSummary.betWinnings ? `♦ ${lastSummary.betWinnings}, +${lastSummary.betConfidenceWeight} memory` : 'no payout'})` : 'No bet'}</strong></div><button id="continue-lobby" class="primary-action">Continue</button></section>` : '';
  root.innerHTML = inRound ? `
    <main class="play-shell">
      <div class="play-top"><span>Emoji Wager Sort ${APP_VERSION}</span><span>${mode.name}</span><span>${heartsHtml()} ♦ ${state.resources.diamonds}</span></div>
      ${boardHtml}
    </main>` : `
    <main class="app-shell">
      <div class="version-banner"><span>Emoji Wager Sort ${APP_VERSION}</span><span>Between rounds</span><button id="toggle-debug" class="debug-toggle">${debugOpen ? 'Hide debug records' : 'Show debug records'}</button></div>
      <header class="hero"><div><p class="eyebrow">Gaming Parlor</p><h1>Emoji Wager Sort</h1><p>Set your mode, shop, and bet here. When the round starts, sorting takes the whole screen.</p><p class="save-scope">Save ${escapeHtml(state.saveMeta.localSaveId)} is local to this browser profile. If another device looks identical, it is probably still on the seeded starter stats unless you imported or synced site data outside the game.</p></div><div class="resources"><span>${heartsHtml()}</span><span>♦ ${state.resources.diamonds}</span><span>♠ ${modePayout(modeId)} · ♦ ${modePayout(modeId)}</span></div></header>
      ${summaryHtml}
      ${debugHtml}
      <section class="panel mode-panel"><h2>Modes</h2><div class="mode-grid">${modeList.map((candidate) => `<button data-mode="${candidate.id}" class="${candidate.id === modeId ? 'selected' : ''}"><strong>${candidate.name}</strong><span>♠ ${modePayout(candidate.id)} · ♦ ${modePayout(candidate.id)}</span><span>${state.unlockedModes[candidate.id] ? 'Select' : canUnlockMode(state, candidate.id) ? `Unlock ♦${candidate.unlockCost}` : 'Locked'}</span></button>`).join('')}</div></section>
      <section class="lobby-layout"><section class="panel"><h2>Ready: ${mode.name}</h2><p>${board.queue.length} glyphs queued. Active directions: ${mode.directions.map((direction) => arrows[direction]).join(' ')}</p>${queueStripHtml()}<button id="start-round" class="primary-action">Start full-screen round</button><button id="new-board">New board</button><p class="feedback" role="status">${feedback}</p></section>
      <section class="panel"><h2>♣ wager</h2><p class="hint">Harder times pay more. Locked propositions need more actual history in this mode.</p><div class="target-list">${targets.map((offer) => `<button data-target="${offer.id}" class="${offer.id === selectedTarget ? 'selected' : ''}" ${offer.available ? '' : 'disabled'}><strong>${offer.label}</strong><span>Beat ${fmt(offer.timeSeconds)} / ≤${offer.mistakeLimit} errors</span><span>${offer.oddsLabel}</span><small>${offer.available ? 'Available' : `${offer.actualCount}/${offer.minHistory} history`}</small></button>`).join('')}</div><label class="stake-row">♣<input id="stake" type="number" min="${selectedTarget === 'half' ? 2 : 1}" step="${selectedTarget === 'half' ? 2 : 1}" value="${stake}"></label><button id="buy-bet" ${targets.find((offer) => offer.id === selectedTarget)?.available && !(selectedTarget === 'half' && stake % 2 !== 0) ? '' : 'disabled'}>Buy bet for ♦${stake}</button></section>
      <section class="panel shop"><h2>♠ shop</h2><p class="hint">Current ${mode.name}: ♠ ${modePayout(modeId)} · ♦ before ♥ penalties.</p><button id="restore-heart">Restore ♥ ♦5</button><button id="buy-max-heart">+1 Max ♥ ♦${maxHeartCost(state.resources.maxHearts)}</button><button id="buy-global">+1 global ♠ ♦${spadeCost('global', state.upgrades.spades.global)}</button><button id="buy-mode">+1 mode ♠ ♦${spadeCost(modeId, state.upgrades.spades[modeId])}</button><button id="buy-item-median" ${hasModeBetHistory(state, modeId) ? '' : 'disabled'}>Meta-median item bonus Lv.${medianBonusLevel}: buy +♦${nextMedianBonus} per item target ♦${perItemMedianBonusCost(modeId, medianBonusLevel)}</button><small>${hasModeBetHistory(state, modeId) ? `Current item-target bonus: +♦${medianBonusLevel}; next upgrade pays +♦${nextMedianBonus} per item that beats the meta-median.` : 'Locked until you buy one ♣ bet in this mode.'}</small><button id="buy-study">+1s Study Time Lv.${modeUpgrade('studyTime')} ♦${studyTimeCost(modeUpgrade('studyTime'))}</button><button id="buy-pause-count">+1 Pause/Round Lv.${modeUpgrade('pauseCount')} ♦${pauseCountCost(modeUpgrade('pauseCount'))}</button><button id="buy-pause-length">+1s Pause Length Lv.${modeUpgrade('pauseLength')} ♦${pauseLengthCost(modeUpgrade('pauseLength'))}</button><button id="buy-queue-vision">Reveal +1 Queue Glyph Lv.${modeUpgrade('queueVision')} ♦${queueVisionCost(modeUpgrade('queueVision'))}</button><button id="buy-speed">Faster glyphs Lv.${modeUpgrade('animationSpeed')} ♦${animationSpeedCost(modeUpgrade('animationSpeed'))}</button>${mode.variant === 'standard' ? `<button id="buy-sorted-display" ${hasSortedItemDisplay(state, modeId) ? 'disabled' : ''}>Show sorted items ${hasSortedItemDisplay(state, modeId) ? 'owned' : `♦${sortedItemDisplayCost(modeId)}`}</button>` : ''}<button disabled>Choose/rearrange categories soon</button><button id="reset-save">Reset save</button></section></section>
    </main>`;
  root.querySelectorAll('[data-dispatch]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.dispatch)));
  root.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.mode; if (state.unlockedModes[id]) startBoard(id); else tryAction(() => unlockMode(state, id)); }));
  root.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => { selectedTarget = button.dataset.target; if (selectedTarget === 'half' && stake % 2 !== 0) stake += 1; render(); }));
  root.querySelector('#stake')?.addEventListener('input', (event) => { stake = Math.max(1, Number(event.target.value || 1)); });
  root.querySelector('#buy-bet')?.addEventListener('click', buyBet);
  root.querySelector('#toggle-debug')?.addEventListener('click', () => { debugOpen = !debugOpen; render(); });
  root.querySelector('#restore-heart')?.addEventListener('click', () => tryAction(() => restoreHeart(state)));
  root.querySelector('#buy-max-heart')?.addEventListener('click', () => tryAction(() => buyMaxHeart(state)));
  root.querySelector('#buy-global')?.addEventListener('click', () => tryAction(() => buySpade(state, 'global')));
  root.querySelector('#buy-mode')?.addEventListener('click', () => tryAction(() => buySpade(state, modeId)));
  root.querySelector('#buy-item-median')?.addEventListener('click', () => tryAction(() => buyPerItemMedianBonus(state, modeId)));
  root.querySelector('#buy-study')?.addEventListener('click', () => tryAction(() => buyStudyTime(state, modeId)));
  root.querySelector('#buy-pause-count')?.addEventListener('click', () => tryAction(() => buyPauseCount(state, modeId)));
  root.querySelector('#buy-pause-length')?.addEventListener('click', () => tryAction(() => buyPauseLength(state, modeId)));
  root.querySelector('#buy-queue-vision')?.addEventListener('click', () => tryAction(() => buyQueueVision(state, modeId)));
  root.querySelector('#buy-speed')?.addEventListener('click', () => tryAction(() => buyAnimationSpeed(state, modeId)));
  root.querySelector('#buy-sorted-display')?.addEventListener('click', () => tryAction(() => buySortedItemDisplay(state, modeId)));
  root.querySelector('#pause-round')?.addEventListener('click', activatePause);
  root.querySelector('#start-round')?.addEventListener('click', startRound);
  root.querySelector('#new-board')?.addEventListener('click', () => startBoard());
  root.querySelector('#continue-lobby')?.addEventListener('click', () => { lastSummary = null; startBoard(modeId); });
  root.querySelector('#reset-save')?.addEventListener('click', async () => { state = normalizeSave(await json('./emoji_wager_game_spec/data/default_state.json')); save(); startBoard('sort_2'); });
}
window.addEventListener('keydown', (event) => { const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }; if (event.code === 'Space') { event.preventDefault(); activatePause(); return; } if (map[event.key]) { event.preventDefault(); dispatch(map[event.key]); } });
try {
  const [itemsData, selectorsData, overlayData, stateData] = await Promise.all([json('./emoji_wager_game_spec/data/items.json'), json('./emoji_wager_game_spec/data/category_selectors.json'), json('./emoji_wager_game_spec/data/cross_cutting_categories.json'), json('./emoji_wager_game_spec/data/default_state.json')]);
  items = itemsData.items;
  selectors = [...selectorsData.selectors, ...overlayData.selectors];
  state = loadSaved(stateData);
  save();
  startBoard('sort_2');
} catch (error) {
  root.innerHTML = `<main class="app-shell"><section class="panel"><h1>Unable to start</h1><p>${error.message}</p></section></main>`;
}
