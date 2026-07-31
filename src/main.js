import { MODES, modeList, STORAGE_KEY, generateBoard, estimateTargets, heartSafety, itemPercentileAtRun, createClubBet, buyClubBet, unlockMode, canUnlockMode, isModeVisible, buySpade, buyPerItemMedianBonus, buySortedItemDisplay, restoreHeart, buyMaxHeart, maxHeartCost, buyAnimationSpeed, animationSpeedCost, animationDuration, buyStudyTime, studyTimeCost, buyPauseCount, pauseCountCost, buyPauseLength, pauseLengthCost, buyQueueVision, queueVisionCost, buyMultiSelect, multiSelectCost, multiSelectCapacity, sortedItemDisplayCost, hasSortedItemDisplay, settleRound, settleItemTiming, itemTimingTargets, roundReferenceCurve, spadeCost, payoutScore, perItemMedianBonusCost, hasModeBetHistory, streakDuration } from './game/core.js?v=0.4.3';

const root = document.querySelector('#root');
const APP_VERSION = 'v0.4.3';
const SAVE_SCHEMA_VERSION = '0.4.3-local';
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
let itemHistoryCountAtRoundStart = 0;
let selectedItemIds = new Set();
const openDrawers = new Set();

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
  next.unlockedModes ??= {};
  for (const id of Object.keys(MODES)) {
    next.unlockedModes[id] ??= id === 'sort_2';
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
  for (const key of ['animationSpeed', 'studyTime', 'pauseCount', 'pauseLength', 'queueVision', 'multiSelect']) {
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
function currentTargets() { return estimateTargets(modeId, state.gameMemory[modeId].entries, state.itemStats?.[modeId]?.entries ?? []); }
function targetAvailabilityText(target) { return target.available ? 'Available' : target.unavailableReason === 'duplicate-time' ? 'Same goal as lower payout' : `${target.actualCount}/${target.minHistory} history`; }
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
  if (MODES[modeId].interaction === 'multi') return `<div class="batch-status">Selected ${selectedItemIds.size}/${multiSelectCapacity(state, modeId)} · ${queue.length} left</div>`;
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
  const reference = roundReferenceCurve(modeId, itemEntries, entries);
  const rows = entries.map((entry, index) => `<tr><td>${index + 1}</td><td>${fmtDebugSeconds(entry.timeSeconds)}</td><td>${Number.isFinite(entry.percentileAtRun) ? `${Math.round(entry.percentileAtRun * 100)}%` : '—'}</td><td>${Number.isFinite(entry.mistakes) ? entry.mistakes : '—'}</td><td>${escapeHtml(entryTags(entry))}</td></tr>`).join('') || '<tr><td colspan="5">No round memory yet.</td></tr>';
  const itemRows = itemEntries.map((entry, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(entry.itemId ?? 'item')}</td><td>${fmtDebugSeconds(entry.timeSeconds)}</td><td>${`${Math.round((Number.isFinite(entry.percentileAtRun) ? entry.percentileAtRun : itemPercentileAtRun(entry.timeSeconds, itemEntries.slice(0, index))) * 100)}%`}</td><td>${[entry.entryType === 'rest' ? 'rest' : '', entry.restedWhilePlaying ? `away during ${entry.restedWhilePlaying}` : '', entry.isEliteItem ? 'elite' : '', entry.isNewFastest ? 'fastest' : '', entry.isNewLongest ? 'longest' : '', entry.eliteBonusDelta ? `+♦${entry.eliteBonusDelta}` : '', entry.medianBonusDelta ? `median +♦${entry.medianBonusDelta}` : ''].filter(Boolean).join(' · ') || '—'}</td></tr>`).join('') || '<tr><td colspan="5">No item timing entries yet.</td></tr>';
  return `<section class="panel debug-panel"><h2>Debug records for ${MODES[modeId].name}</h2><p class="hint">Shows the full stored records feeding ♥ safety, ♣ odds, mistake pressure, and item-timing bonuses. Temporary calibration records are replaced one at a time by later real runs.</p>${referenceCurveGraphHtml(reference, targets)}<div class="debug-grid"><div><h3>Round memory (${entries.length})</h3><p>♥ safety now: <strong>${fmtDebugSeconds(safety)}</strong></p><div class="debug-scroll"><table><thead><tr><th>#</th><th>Time</th><th>Pct</th><th>Err</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table></div></div><div><h3>♣ targets</h3><p>Reference curve: ${reference.windowCount} points from ${reference.realItemCount} real item records ×${reference.replicationFactor || 0}; overhead ${fmtDebugSeconds(reference.overheadSeconds)}${reference.times.length ? `; range ${fmtDebugSeconds(reference.times[0])}–${fmtDebugSeconds(reference.times.at(-1))}` : ''}.</p><ul>${targets.map((target) => `<li>${escapeHtml(target.label)}: ${fmtDebugSeconds(target.timeSeconds)} / ≤${target.mistakeLimit} errors · ${escapeHtml(targetAvailabilityText(target).toLowerCase())}</li>`).join('')}</ul><h3>Item timing (${itemEntries.length})</h3><p>Elite ${fmtDebugSeconds(stats.eliteSeconds)} · meta-median ${fmtDebugSeconds(stats.metaMedianSeconds)} · fastest ${fmtDebugSeconds(stats.fastestSeconds)} · median ${fmtDebugSeconds(stats.medianSeconds)} · longest ${fmtDebugSeconds(stats.longestSeconds)}${Number.isFinite(stats.metaMedianPercentile) ? ` · meta pct ${Math.round(stats.metaMedianPercentile * 100)}%` : ''}</p><div class="debug-scroll"><table><thead><tr><th>#</th><th>Item</th><th>Time</th><th>Prior pct</th><th>Flags</th></tr></thead><tbody>${itemRows}</tbody></table></div></div></div></section>`;
}
function referenceCurveGraphHtml(reference, targets) {
  if (reference.times.length < 2) return '<div class="reference-chart empty">Complete rounds to build the smooth reference curve.</div>';
  const times = reference.times;
  const fastest = times[0];
  const slowest = times.at(-1);
  const range = Math.max(0.01, slowest - fastest);
  const pointCount = Math.min(80, times.length);
  const points = Array.from({ length: pointCount }, (_, index) => {
    const performance = index / (pointCount - 1);
    const sourceIndex = Math.round((1 - performance) * (times.length - 1));
    const x = 8 + performance * 88;
    const y = 8 + ((times[sourceIndex] - fastest) / range) * 76;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const meta = targets.find((target) => target.id === 'even' && Number.isFinite(target.targetPercentile));
  const metaX = meta ? 8 + meta.targetPercentile * 88 : null;
  const metaY = meta ? 8 + ((meta.timeSeconds - fastest) / range) * 76 : null;
  return `<figure class="reference-chart"><figcaption><strong>Smooth whole-round reference curve</strong><span>Slower ← performance percentile → Faster</span></figcaption><svg viewBox="0 0 100 100" role="img" aria-label="Whole-round time by performance percentile"><line class="chart-axis" x1="8" y1="84" x2="96" y2="84"/><line class="chart-axis" x1="8" y1="8" x2="8" y2="84"/><polyline class="curve-line" points="${points}"/>${meta ? `<line class="meta-guide" x1="${metaX}" y1="8" x2="${metaX}" y2="84"/><circle class="meta-point" cx="${metaX}" cy="${Math.max(8, Math.min(84, metaY))}" r="2.4"/>` : ''}<text x="8" y="94">0%</text><text x="88" y="94">100%</text><text x="10" y="13">${fmt(fastest)}</text><text x="10" y="81">${fmt(slowest)}</text></svg>${meta ? `<p>Run meta-median: <strong>${Math.round(meta.targetPercentile * 100)}th percentile</strong> · ${fmtDebugSeconds(meta.timeSeconds)}</p>` : '<p>Run meta-median appears after enough round history.</p>'}</figure>`;
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
  return `<span class="item-timer-stack" aria-label="Item timing clocks">${rows.map(([label, seconds, cls]) => `<span class="item-clock ${cls}" data-timer-seconds="${seconds}" title="${label}: ${seconds.toFixed(2)}s" style="--pct:${timerPct(seconds)}"><span>${label[0]}</span></span>`).join('')}</span>`;
}
function barsHtml(safety, activeBet, hideTimers = false) {
  if (hideTimers) return `<div class="timer-stack"><div class="timer-label muted"><span>Final item</span><span>Timers hidden</span></div>${queueStripHtml()}</div>`;
  const hasHeartLimit = Number.isFinite(safety);
  const heartPct = hasHeartLimit ? Math.max(0, Math.min(100, ((safety - elapsed) / Math.max(1, safety)) * 100)) : 100;
  const betTarget = activeBet?.targetSeconds;
  const betPct = betTarget ? Math.max(0, Math.min(100, ((betTarget - elapsed) / Math.max(1, betTarget)) * 100)) : 0;
  const heartLabel = hasHeartLimit ? `<span>${heartsHtml()} ♥ safe <span id="heart-time-live">${fmt(Math.max(0, safety - elapsed))}</span></span><span>${fmt(safety)}</span>` : `<span>${heartsHtml()} First run: no ♥ timer</span><span>Take your time</span>`;
  return `<div class="timer-stack"><div class="timer-label">${heartLabel}</div><div class="timer-bar heart-bar ${hasHeartLimit ? '' : 'untimed'}"><span id="heart-bar-live" style="width:${heartPct}%"></span></div>${activeBet ? `<div class="timer-label"><span>♣ alive <span id="bet-time-live">${fmt(Math.max(0, activeBet.targetSeconds - elapsed))}</span></span><span>${activeBet.oddsLabel || `${activeBet.oddsMultiplier}:1`} / ${fmt(activeBet.targetSeconds)} / ≤${activeBet.mistakeLimit} errors</span></div><div class="timer-bar bet-bar"><span id="bet-bar-live" style="width:${betPct}%"></span></div>` : '<div class="timer-label muted"><span>♣ none</span><span>Buy between rounds</span></div><div class="timer-bar bet-bar empty"><span style="width:0%"></span></div>'}${queueStripHtml()}</div>`;
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
  selectedItemIds = new Set();
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
    updateLiveDisplay();
  }, 100);
}
function updateLiveDisplay() {
  const setText = (selector, value) => { const node = root.querySelector(selector); if (node) node.textContent = value; };
  setText('#elapsed-live', `${elapsed.toFixed(1)}s`);
  setText('#study-live', studying ? Math.max(0, (studyEndsAt - Date.now()) / 1000).toFixed(1) : '—');
  setText('#pause-live', paused ? Math.max(0, (pauseEndsAt - Date.now()) / 1000).toFixed(1) : pausesRemaining);
  const safety = heartSafety(modeId, state.gameMemory[modeId].entries);
  const heartBar = root.querySelector('#heart-bar-live');
  if (heartBar && Number.isFinite(safety)) heartBar.style.width = `${Math.max(0, Math.min(100, ((safety - elapsed) / Math.max(1, safety)) * 100))}%`;
  setText('#heart-time-live', fmt(Math.max(0, safety - elapsed)));
  const betTarget = state.activeClubBet?.targetSeconds;
  const betBar = root.querySelector('#bet-bar-live');
  if (betBar && betTarget) betBar.style.width = `${Math.max(0, Math.min(100, ((betTarget - elapsed) / Math.max(1, betTarget)) * 100))}%`;
  if (betTarget) setText('#bet-time-live', fmt(Math.max(0, betTarget - elapsed)));
  setText('.play-shell .feedback', feedback);
  root.querySelectorAll('[data-timer-seconds]').forEach((node) => { node.style.setProperty('--pct', timerPct(Number(node.dataset.timerSeconds))); });
  const pauseButton = root.querySelector('#pause-round');
  if (pauseButton) pauseButton.disabled = !(inRound && !studying && !paused && pausesRemaining > 0);
}
function resetPromptClock() { promptStartedAt = Date.now(); }
function startRound() {
  inRound = true;
  itemHistoryCountAtRoundStart = state.itemStats?.[modeId]?.entries?.length ?? 0;
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
  const activeBet = before.activeClubBet;
  const completedAt = new Date().toISOString();
  const nextState = settleRound(before, modeId, final, mistakes, board.seed, completedAt, roundItemTimes, itemHistoryCountAtRoundStart);
  const event = nextState.eventLog.at(-1);
  const percentile = nextState.gameMemory?.[modeId]?.entries?.findLast((entry) => entry.playedRound && entry.createdAt === completedAt)?.percentileAtRun ?? 0.5;
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
  const examples = showExamples ? group.items.map((item) => glyphHtml(item)).join('') : '';
  const sortedItems = sorted.map((item) => glyphHtml(item)).join('');
  const content = `${examples}${showExamples && !hasSortedItemDisplay(state, modeId) ? '' : sortedItems}`;
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
function pileLayout() {
  const slotCount = Math.min(16, board.queue.length);
  const columns = 4;
  return board.queue.map((prompt, index) => {
    const slot = index % slotCount;
    const depth = Math.floor(index / slotCount);
    const row = Math.floor(slot / columns);
    const column = slot % columns;
    const hash = Array.from(prompt.item.id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
    const jitterX = (hash % 13) - 6;
    const jitterY = (Math.floor(hash / 13) % 13) - 6;
    return { prompt, slot, depth, left: 14 + column * 24 + jitterX, top: 14 + row * 23 + jitterY, rotate: (Math.floor(hash / 169) % 25) - 12 };
  });
}
function multiPileHtml() {
  const layout = pileLayout();
  const capacity = multiSelectCapacity(state, modeId);
  const held = queue.filter((prompt) => selectedItemIds.has(prompt.item.id));
  const remainingIds = new Set(queue.map((prompt) => prompt.item.id).filter((id) => !selectedItemIds.has(id)));
  const topDepthBySlot = new Map();
  layout.forEach((entry) => { if (remainingIds.has(entry.prompt.item.id)) topDepthBySlot.set(entry.slot, Math.max(topDepthBySlot.get(entry.slot) ?? -1, entry.depth)); });
  const loose = layout.filter((entry) => remainingIds.has(entry.prompt.item.id));
  return `<div class="held-items" aria-label="Selected items">${held.map((prompt) => `<button class="pile-item held selected" data-select-item="${escapeHtml(prompt.item.id)}" aria-pressed="true" title="Return ${escapeHtml(prompt.item.name)} to pile">${glyphHtml(prompt.item)}</button>`).join('')}</div><div class="item-pile" aria-label="All remaining items spread across the table">${loose.map((entry) => {
    const isTop = entry.depth === topDepthBySlot.get(entry.slot);
    return `<button class="pile-item ${isTop ? 'top' : 'covered'}" data-select-item="${escapeHtml(entry.prompt.item.id)}" ${isTop ? '' : 'disabled'} style="--pile-left:${entry.left}%;--pile-top:${entry.top}%;--pile-rotate:${entry.rotate}deg;--pile-x:${entry.depth * 3}px;--pile-y:${entry.depth * -4}px;--pile-shadow-y:${4 + entry.depth * 3}px;--pile-shadow-blur:${8 + entry.depth * 4}px;z-index:${entry.depth + 1}" aria-pressed="false" title="${isTop ? `Pick up ${escapeHtml(entry.prompt.item.name)}` : `${escapeHtml(entry.prompt.item.name)} is under another item`}">${glyphHtml(entry.prompt.item)}</button>`;
  }).join('')}</div><span class="pile-caption">Pick up to ${capacity}; tapping one exposes anything underneath</span>`;
}
function multiBatchDecision(prompts, direction) {
  const mode = MODES[modeId];
  if (mode.variant !== 'freeform') return { isCorrect: prompts.every((prompt) => prompt.direction === direction), assignments: {} };
  const assignments = {};
  const newGroups = new Set();
  for (const prompt of prompts) {
    const assigned = categoryAssignments[prompt.groupId];
    if (assigned && assigned !== direction) return { isCorrect: false, assignments: {} };
    if (!assigned) newGroups.add(prompt.groupId);
  }
  const available = mode.groupsPerDirection - assignedGroupsForDirection(direction).length;
  if (newGroups.size > available) return { isCorrect: false, assignments: {} };
  newGroups.forEach((groupId) => { assignments[groupId] = direction; });
  return { isCorrect: true, assignments };
}
async function dispatchMulti(direction) {
  const prompts = queue.filter((prompt) => selectedItemIds.has(prompt.item.id));
  if (!prompts.length) { feedback = 'Select at least one top item first.'; render(); return; }
  if (studying) { studying = false; studyEndsAt = null; ensureTimer(); resetPromptClock(); }
  ensureTimer();
  const decision = multiBatchDecision(prompts, direction);
  const batchSeconds = promptStartedAt ? Math.max(0.01, Number(((Date.now() - promptStartedAt) / 1000).toFixed(2))) : 0;
  motion = { busy: true };
  feedback = decision.isCorrect ? `${prompts.length} items flying ${arrows[direction]}…` : 'The batch did not all belong there. Everything returns to the pile.';
  render();
  await Promise.all(prompts.map((prompt) => animateGlyphTravel(glyphHtml(prompt.item), direction, decision.isCorrect)));
  if (decision.isCorrect) {
    Object.assign(categoryAssignments, decision.assignments);
    const effectiveItemSeconds = Math.max(0.01, Number((batchSeconds / prompts.length).toFixed(2)));
    for (const prompt of prompts) {
      recordSortedPrompt(prompt, direction, { assignDirection: decision.assignments[prompt.groupId] });
      const result = settleItemTiming(state, modeId, prompt.item.id, effectiveItemSeconds, new Date().toISOString(), roundSlowHeartLossTimes);
      state = result.state;
      if (result.event.heartsDelta < 0) { itemHeartLosses += Math.abs(result.event.heartsDelta); roundSlowHeartLossTimes.push(effectiveItemSeconds); }
      if (result.event.diamondsDelta > 0) itemDiamondBonuses += result.event.diamondsDelta;
      if (result.event.isNewFastest || result.event.isNewLongest) itemRecordCount += 1;
      roundItemTimes.push(effectiveItemSeconds);
    }
    queue = queue.filter((prompt) => !selectedItemIds.has(prompt.item.id));
    streak += prompts.length;
    save();
    feedback = `${prompts.length} items sorted in ${batchSeconds.toFixed(2)}s (${effectiveItemSeconds.toFixed(2)}s each).`;
  } else {
    mistakes += 1;
    streak = 0;
  }
  selectedItemIds.clear();
  motion = null;
  resetPromptClock();
  if (queue.length === 0) finishRound(); else render();
}
async function dispatch(direction) {
  const mode = MODES[modeId];
  if (mode.interaction === 'multi') { if (!motion && !paused && inRound && mode.directions.includes(direction)) await dispatchMulti(direction); return; }
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
  if (!targets.find((target) => target.id === selectedTarget)?.available) selectedTarget = targets.find((target) => target.available)?.id ?? selectedTarget;
  const safety = heartSafety(modeId, state.gameMemory[modeId].entries);
  const current = queue[0];
  const progress = board.queue.length - queue.length;
  const studyLeft = studying ? Math.max(0, (studyEndsAt - Date.now()) / 1000) : 0;
  const pauseLeft = paused ? Math.max(0, (pauseEndsAt - Date.now()) / 1000) : 0;
  const medianBonusLevel = state.upgrades.perItemMedianBonus[modeId] ?? 0;
  const nextMedianBonus = medianBonusLevel + 1;
  const centerHtml = mode.interaction === 'multi'
    ? `<div class="center-card multi-center ${motion ? 'busy' : ''}">${current ? itemTimerHtml() : ''}${current ? multiPileHtml() : '<span class="prompt">🏁</span>'}</div>`
    : `<div class="center-card ${motion ? 'busy' : ''}">${current ? itemTimerHtml() : ''}<span class="prompt ${motion ? 'ghost-prompt' : ''}">${current ? glyphHtml(current.item) : '🏁'}</span><span>${current ? `${progress}/${board.queue.length} sorted` : 'Round finished'}</span></div>`;
  const boardHtml = `<div class="play-hud"><div class="status-row"><span>⏱ <span id="elapsed-live">${elapsed.toFixed(1)}s</span></span><span>${heartsHtml()}</span><span>Queue ${queue.length}/${board.queue.length}</span><span>Streak ${streak}</span><span>Study <span id="study-live">${studying ? studyLeft.toFixed(1) : '—'}</span></span><span>Pause <span id="pause-live">${paused ? pauseLeft.toFixed(1) : pausesRemaining}</span></span><button id="pause-round" ${inRound && !studying && !paused && pausesRemaining > 0 ? '' : 'disabled'}>Pause</button><span>Item ♦${itemDiamondBonuses} / ♥-${itemHeartLosses}</span></div>${barsHtml(safety, state.activeClubBet, inRound && queue.length === 1)}</div>
      <div class="sort-board framed-board mode-${mode.directions.length} ${mode.interaction === 'multi' ? 'multi-board' : ''}">${mode.directions.map(sideZoneHtml).join('')}${centerHtml}</div><p class="feedback" role="status">${feedback}</p>`;
  const debugHtml = debugRecordsHtml(targets, safety);
  const summaryHtml = lastSummary ? `<section class="panel post-round"><h2>Round summary</h2><div class="summary-grid"><span>Mode</span><strong>${lastSummary.modeName}</strong><span>Time</span><strong>${lastSummary.timeSeconds.toFixed(2)}s</strong><span>Percentile score</span><strong>${Math.round(lastSummary.percentile * 100)}%</strong><span>Mistakes</span><strong>${lastSummary.mistakes}</strong><span>♦ payout</span><strong>♦ ${lastSummary.diamondsDelta}</strong><span>Item speed bonus</span><strong>♦ ${lastSummary.itemDiamondBonuses}</strong><span>♥ change</span><strong>${lastSummary.heartsDelta} round / -${lastSummary.itemHeartLosses} item</strong><span>Mistake pressure</span><strong>${lastSummary.mistakeHeartsLost ? `-${lastSummary.mistakeHeartsLost} ♥` : 'Safe'}${Number.isFinite(lastSummary.medianMistakes) ? ` · median ${lastSummary.medianMistakes}` : ''}</strong><span>Item records</span><strong>${lastSummary.itemRecordCount}</strong><span>Bet result</span><strong>${lastSummary.betTarget ? `${lastSummary.betWon ? 'Won' : 'Lost'} vs ${fmt(lastSummary.betTarget)} / ≤${lastSummary.betMistakeLimit} errors (${lastSummary.betWinnings ? `♦ ${lastSummary.betWinnings}, +${lastSummary.betConfidenceWeight} memory` : 'no payout'})` : 'No bet'}</strong></div><button id="continue-lobby" class="primary-action">Continue</button></section>` : '';
  root.innerHTML = inRound ? `
    <main class="play-shell">
      <div class="play-top"><span>Emoji Wager Sort ${APP_VERSION}</span><span>${mode.name}</span><span>${heartsHtml()} ♦ ${state.resources.diamonds}</span></div>
      ${boardHtml}
    </main>` : `
    <main class="app-shell">
      <div class="version-banner"><span>Emoji Wager Sort ${APP_VERSION}</span><span>Between rounds</span></div>
      <header class="hero"><div><p class="eyebrow">Gaming Parlor</p><h1>Emoji Wager Sort</h1><p>Set your mode, shop, and bet here. When the round starts, sorting takes the whole screen.</p><p class="save-scope">Save ${escapeHtml(state.saveMeta.localSaveId)} is local to this browser profile. If another device looks identical, it is probably still on the seeded starter stats unless you imported or synced site data outside the game.</p></div><div class="resources"><span>${heartsHtml()}</span><span>♦ ${state.resources.diamonds}</span><span>♠ ${modePayout(modeId)} · ♦ ${modePayout(modeId)}</span></div></header>
      ${summaryHtml}
      <section class="play-launch panel"><p class="eyebrow">Ready now</p><h2>${mode.name}</h2><p>${board.queue.length} items · ${mode.directions.map((direction) => arrows[direction]).join(' ')}</p><button id="start-round" class="primary-action giant-play">PLAY</button><p class="feedback" role="status">${feedback}</p></section>
      <section class="control-drawers">
        <details class="panel" data-drawer="modes" ${openDrawers.has('modes') ? 'open' : ''}><summary>Game Modes</summary><div class="mode-grid">${modeList.filter((candidate) => isModeVisible(state, candidate.id)).map((candidate) => `<button data-mode="${candidate.id}" class="${candidate.id === modeId ? 'selected' : ''}"><strong>${candidate.name}</strong><span>♠ ${modePayout(candidate.id)} · ♦ ${modePayout(candidate.id)}</span><span>${state.unlockedModes[candidate.id] ? 'Select' : `Unlock ♦${candidate.unlockCost}`}</span></button>`).join('')}</div><button id="new-board">New board</button></details>
        <details class="panel" data-drawer="wagers" ${openDrawers.has('wagers') ? 'open' : ''}><summary>♣ Wagers</summary>${targets.some((offer) => offer.available) ? `<div class="target-list">${targets.filter((offer) => offer.available).map((offer) => `<button data-target="${offer.id}" class="${offer.id === selectedTarget ? 'selected' : ''}"><strong>${offer.label}</strong><span>Beat ${fmtDebugSeconds(offer.timeSeconds)} / ≤${offer.mistakeLimit} errors</span><span>${offer.oddsLabel}</span></button>`).join('')}</div><label class="stake-row">♣<input id="stake" type="number" min="${selectedTarget === 'half' ? 2 : 1}" step="${selectedTarget === 'half' ? 2 : 1}" value="${stake}"></label><button id="buy-bet" ${targets.find((offer) => offer.id === selectedTarget)?.available && !(selectedTarget === 'half' && stake % 2 !== 0) ? '' : 'disabled'}>Buy bet for ♦${stake}</button>` : '<p>Complete more rounds in this mode to reveal wagers.</p>'}</details>
        <details class="panel" data-drawer="upgrades" ${openDrawers.has('upgrades') ? 'open' : ''}><summary>♠ Upgrades</summary><div class="shop"><p class="hint">Current ${mode.name}: ♠ ${modePayout(modeId)} · ♦ before ♥ penalties.</p>${state.resources.hearts < state.resources.maxHearts ? '<button id="restore-heart">Restore ♥ ♦5</button>' : ''}<button id="buy-max-heart">+1 Max ♥ ♦${maxHeartCost(state.resources.maxHearts)}</button><button id="buy-global">+1 global ♠ ♦${spadeCost('global', state.upgrades.spades.global)}</button><button id="buy-mode">+1 mode ♠ ♦${spadeCost(modeId, state.upgrades.spades[modeId])}</button>${hasModeBetHistory(state, modeId) ? `<button id="buy-item-median">Meta-median item bonus Lv.${medianBonusLevel}: buy +♦${nextMedianBonus} per item target ♦${perItemMedianBonusCost(modeId, medianBonusLevel)}</button>` : ''}<button id="buy-study">+1s Study Time Lv.${modeUpgrade('studyTime')} ♦${studyTimeCost(modeUpgrade('studyTime'))}</button><button id="buy-pause-count">+1 Pause/Round Lv.${modeUpgrade('pauseCount')} ♦${pauseCountCost(modeUpgrade('pauseCount'))}</button><button id="buy-pause-length">+1s Pause Length Lv.${modeUpgrade('pauseLength')} ♦${pauseLengthCost(modeUpgrade('pauseLength'))}</button>${mode.interaction === 'single' ? `<button id="buy-queue-vision">Reveal +1 Queue Glyph Lv.${modeUpgrade('queueVision')} ♦${queueVisionCost(modeUpgrade('queueVision'))}</button>` : `<button id="buy-multi-select">Hold ${multiSelectCapacity(state, modeId) + 1} items ♦${multiSelectCost(modeUpgrade('multiSelect'))}</button>`}<button id="buy-speed">Faster glyphs Lv.${modeUpgrade('animationSpeed')} ♦${animationSpeedCost(modeUpgrade('animationSpeed'))}</button>${mode.variant === 'standard' && mode.interaction === 'single' && !hasSortedItemDisplay(state, modeId) ? `<button id="buy-sorted-display">Show sorted items ♦${sortedItemDisplayCost(modeId)}</button>` : ''}<button id="reset-save">Reset save</button></div></details>
      </section>
      ${debugHtml}
      <div class="debug-controls"><button id="toggle-debug" class="debug-toggle">${debugOpen ? 'Hide debug records' : 'Show debug records'}</button></div>
    </main>`;
  root.querySelectorAll('[data-dispatch]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.dispatch)));
  root.querySelectorAll('[data-drawer]').forEach((drawer) => drawer.addEventListener('toggle', () => { if (drawer.open) openDrawers.add(drawer.dataset.drawer); else openDrawers.delete(drawer.dataset.drawer); }));
  root.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.mode; if (state.unlockedModes[id]) startBoard(id); else tryAction(() => unlockMode(state, id)); }));
  root.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => { selectedTarget = button.dataset.target; if (selectedTarget === 'half' && stake % 2 !== 0) stake += 1; render(); }));
  root.querySelectorAll('[data-select-item]').forEach((button) => {
    const selectItem = () => {
    const itemId = button.dataset.selectItem;
    if (selectedItemIds.has(itemId)) selectedItemIds.delete(itemId);
    else if (selectedItemIds.size < multiSelectCapacity(state, modeId)) selectedItemIds.add(itemId);
    else feedback = `Your hand can hold ${multiSelectCapacity(state, modeId)} items.`;
    render();
    };
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); selectItem(); });
    button.addEventListener('click', (event) => { if (event.detail === 0) selectItem(); });
  });
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
  root.querySelector('#buy-multi-select')?.addEventListener('click', () => tryAction(() => buyMultiSelect(state, modeId)));
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
  const [itemsData, selectorsData, overlayData, expansionData, stateData] = await Promise.all([json('./emoji_wager_game_spec/data/items.json'), json('./emoji_wager_game_spec/data/category_selectors.json'), json('./emoji_wager_game_spec/data/cross_cutting_categories.json'), json('./emoji_wager_game_spec/data/category_expansion_overlays.json'), json('./emoji_wager_game_spec/data/default_state.json')]);
  items = itemsData.items;
  selectors = [...selectorsData.selectors, ...overlayData.selectors, ...expansionData.selectors];
  state = loadSaved(stateData);
  save();
  startBoard('sort_2');
} catch (error) {
  root.innerHTML = `<main class="app-shell"><section class="panel"><h1>Unable to start</h1><p>${error.message}</p></section></main>`;
}
