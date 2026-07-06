import { MODES, modeList, STORAGE_KEY, generateBoard, estimateTargets, heartSafety, percentileAtRun, createClubBet, buyClubBet, unlockMode, buySpade, restoreHeart, settleRound, spadeCost, streakDuration } from './game/core.js';

const root = document.querySelector('#root');
const APP_VERSION = 'v0.2.2';
const SAVE_SCHEMA_VERSION = '0.2.2-local';
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

function fmt(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function seed() { return `${modeId}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
async function json(path) { const response = await fetch(path); if (!response.ok) throw new Error(`Unable to load ${path}`); return response.json(); }
function makeLocalSaveId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().slice(0, 8);
  return Math.random().toString(16).slice(2, 10);
}
function normalizeSave(candidate, defaultState) {
  const next = structuredClone(candidate || defaultState);
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
function currentTargets() { return estimateTargets(modeId, state.gameMemory[modeId].entries); }
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
  return `<div class="queue-strip" style="--queue-total:${board.queue.length}" aria-label="Full prompt queue">${queue.map((prompt, index) => `<span class="queue-glyph ${index === 0 ? 'next' : ''}">${glyphHtml(prompt.item)}</span>`).join('')}</div>`;
}
function barsHtml(safety, activeBet) {
  const heartPct = Math.max(0, Math.min(100, ((safety - elapsed) / Math.max(1, safety)) * 100));
  const betTarget = activeBet?.targetSeconds;
  const betPct = betTarget ? Math.max(0, Math.min(100, ((betTarget - elapsed) / Math.max(1, betTarget)) * 100)) : 0;
  return `<div class="timer-stack"><div class="timer-label"><span>♥ Heart safe ${fmt(Math.max(0, safety - elapsed))}</span><span>${fmt(safety)}</span></div><div class="timer-bar heart-bar"><span style="width:${heartPct}%"></span></div>${activeBet ? `<div class="timer-label"><span>♣ Bet alive ${fmt(Math.max(0, activeBet.targetSeconds - elapsed))}</span><span>${activeBet.oddsLabel || `${activeBet.oddsMultiplier}:1`} / ${fmt(activeBet.targetSeconds)}</span></div><div class="timer-bar bet-bar"><span style="width:${betPct}%"></span></div>` : '<div class="timer-label muted"><span>♣ No active bet</span><span>Buy between rounds</span></div><div class="timer-bar bet-bar empty"><span style="width:0%"></span></div>'}${queueStripHtml()}</div>`;
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
  feedback = 'Board ready. Buy Clubs if you want odds, then start the full-screen round.';
  stopTimer();
  render();
}
function ensureTimer() {
  if (startedAt) return;
  startedAt = Date.now();
  timerId = window.setInterval(() => { elapsed = (Date.now() - startedAt) / 1000; render(); }, 100);
}
function startRound() {
  inRound = true;
  lastSummary = null;
  feedback = 'Full-screen round started. Sort every glyph as fast as you can.';
  render();
}
function motionPoint(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
function motionFor(direction, result, html) {
  const from = motionPoint(root.querySelector('.queue-glyph.next')?.getBoundingClientRect() || root.querySelector('.center-card').getBoundingClientRect());
  const center = motionPoint(root.querySelector('.center-card').getBoundingClientRect());
  const zone = motionPoint(root.querySelector(`.zone-${direction}`)?.getBoundingClientRect() || root.querySelector('.center-card').getBoundingClientRect());
  const back = motionPoint(root.querySelector('.queue-strip')?.getBoundingClientRect() || root.querySelector('.center-card').getBoundingClientRect());
  return { html, direction, result, from, center, zone, back };
}
function motionStyle() {
  if (!motion) return '';
  return `--from-x:${motion.from.x}px;--from-y:${motion.from.y}px;--center-x:${motion.center.x}px;--center-y:${motion.center.y}px;--zone-x:${motion.zone.x}px;--zone-y:${motion.zone.y}px;--back-x:${motion.back.x}px;--back-y:${motion.back.y}px;`;
}
function finishRound() {
  const final = Math.max(1, Number(((Date.now() - startedAt) / 1000).toFixed(2)));
  stopTimer();
  const before = state;
  const priorMemory = before.gameMemory[modeId].entries;
  const activeBet = before.activeClubBet;
  const percentile = percentileAtRun(final, priorMemory);
  const nextState = settleRound(before, modeId, final, mistakes, board.seed);
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
    betTarget: activeBet?.targetSeconds,
    betWon: Boolean(activeBet && final <= activeBet.targetSeconds),
  };
  feedback = `Round complete in ${final.toFixed(2)}s with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`;
  startedAt = null;
  inRound = false;
  elapsed = final;
  motion = null;
  render();
}
function dispatch(direction) {
  const mode = MODES[modeId];
  if (motion || !inRound || !queue[0] || !mode.directions.includes(direction)) return;
  ensureTimer();
  const prompt = queue[0];
  const isCorrect = prompt.direction === direction;
  motion = motionFor(direction, isCorrect ? 'correct' : 'wrong', glyphHtml(prompt.item));
  feedback = isCorrect ? `${prompt.item.name} flying ${arrows[direction]}…` : `${prompt.item.name} rejected ${arrows[direction]} and returning to the queue…`;
  render();
  window.setTimeout(() => {
    if (isCorrect) {
      queue.shift();
      streak += 1;
      feedback = `Correct ${arrows[direction]} — streak ${streak}; glide ${streakDuration(220, streak)}ms.`;
      motion = null;
      if (queue.length === 0) finishRound(); else render();
    } else {
      queue = [...queue.slice(1), prompt];
      streak = 0;
      mistakes += 1;
      feedback = `Wrong ${arrows[direction]} — ${prompt.item.name} slowly returned to the back.`;
      motion = null;
      render();
    }
  }, isCorrect ? 620 : 980);
}
function setState(next) { state = next; save(); render(); }
function tryAction(fn) { try { setState(fn()); } catch (error) { feedback = error.message; render(); } }
function buyBet() {
  const offer = currentTargets().find((target) => target.id === selectedTarget);
  if (!offer?.available) { feedback = 'That bet needs more actual history in this mode.'; render(); return; }
  tryAction(() => buyClubBet(state, createClubBet(modeId, offer, stake)));
  feedback = `Club bet set: ${stake} on ${fmt(offer.timeSeconds)} at ${offer.oddsLabel}.`;
  render();
}
function render() {
  const mode = MODES[modeId];
  const targets = currentTargets();
  const safety = heartSafety(modeId, state.gameMemory[modeId].entries);
  const current = queue[0];
  const progress = board.queue.length - queue.length;
  const sideZone = (direction) => `<button class="zone zone-${direction}" data-dispatch="${direction}"><span class="direction">${arrows[direction]}</span><span class="groups vertical-groups">${groupByDirection(direction).map((group) => `<span class="glyph-group" title="${group.label}">${group.items.map((item) => glyphHtml(item)).join('')}</span>`).join('')}</span></button>`;
  const boardHtml = `<div class="play-hud"><div class="status-row"><span>⏱ ${elapsed.toFixed(1)}s</span><span>${heartsHtml()}</span><span>Queue ${queue.length}/${board.queue.length}</span><span>Streak ${streak}</span></div>${barsHtml(safety, state.activeClubBet)}</div>
      <div class="sort-board framed-board mode-${mode.directions.length}">${mode.directions.map(sideZone).join('')}<div class="center-card ${motion ? 'busy' : ''}"><span class="prompt ${motion ? 'ghost-prompt' : ''}">${current ? glyphHtml(current.item) : '🏁'}</span><span>${current ? `${progress}/${board.queue.length} sorted` : 'Round finished'}</span></div></div>${motion ? `<span class="moving-glyph ${motion.result}" style="${motionStyle()}">${motion.html}</span>` : ''}<p class="feedback" role="status">${feedback}</p>`;
  const summaryHtml = lastSummary ? `<section class="panel post-round"><h2>Round summary</h2><div class="summary-grid"><span>Mode</span><strong>${lastSummary.modeName}</strong><span>Time</span><strong>${lastSummary.timeSeconds.toFixed(2)}s</strong><span>Percentile score</span><strong>${Math.round(lastSummary.percentile * 100)}%</strong><span>Mistakes</span><strong>${lastSummary.mistakes}</strong><span>Diamond payout</span><strong>♦ ${lastSummary.diamondsDelta}</strong><span>Heart change</span><strong>${lastSummary.heartsDelta}</strong><span>Bet result</span><strong>${lastSummary.betTarget ? `${lastSummary.betWon ? 'Won' : 'Lost'} vs ${fmt(lastSummary.betTarget)} (${lastSummary.betWinnings ? `♦ ${lastSummary.betWinnings}` : 'no payout'})` : 'No bet'}</strong></div><button id="continue-lobby" class="primary-action">Continue</button></section>` : '';
  root.innerHTML = inRound ? `
    <main class="play-shell">
      <div class="play-top"><span>Emoji Wager Sort ${APP_VERSION}</span><span>${mode.name}</span></div>
      ${boardHtml}
    </main>` : `
    <main class="app-shell">
      <div class="version-banner"><span>Emoji Wager Sort ${APP_VERSION}</span><span>Between rounds</span></div>
      <header class="hero"><div><p class="eyebrow">Gaming Parlor</p><h1>Emoji Wager Sort</h1><p>Set your mode, shop, and bet here. When the round starts, sorting takes the whole screen.</p><p class="save-scope">Save ${escapeHtml(state.saveMeta.localSaveId)} is local to this browser profile. If another device looks identical, it is probably still on the seeded starter stats unless you imported or synced site data outside the game.</p></div><div class="resources"><span>${heartsHtml()}</span><span>♦ ${state.resources.diamonds}</span><span>♠ ${state.upgrades.spades.global + state.upgrades.spades[modeId]} payout</span></div></header>
      ${summaryHtml}
      <section class="panel mode-panel"><h2>Modes</h2><div class="mode-grid">${modeList.map((candidate) => `<button data-mode="${candidate.id}" class="${candidate.id === modeId ? 'selected' : ''}"><strong>${candidate.name}</strong><span>${state.unlockedModes[candidate.id] ? 'Select' : `Unlock ♦${candidate.unlockCost}`}</span></button>`).join('')}</div></section>
      <section class="lobby-layout"><section class="panel"><h2>Ready: ${mode.name}</h2><p>${board.queue.length} glyphs queued. Active directions: ${mode.directions.map((direction) => arrows[direction]).join(' ')}</p>${queueStripHtml()}<button id="start-round" class="primary-action">Start full-screen round</button><button id="new-board">New board</button><p class="feedback" role="status">${feedback}</p></section>
      <section class="panel"><h2>Club wager</h2><p class="hint">Harder times pay more. Locked propositions need more actual history in this mode.</p><div class="target-list">${targets.map((offer) => `<button data-target="${offer.id}" class="${offer.id === selectedTarget ? 'selected' : ''}" ${offer.available ? '' : 'disabled'}><strong>${offer.label}</strong><span>Beat ${fmt(offer.timeSeconds)}</span><span>${offer.oddsLabel}</span><small>${offer.available ? 'Available' : `${offer.actualCount}/${offer.minHistory} history`}</small></button>`).join('')}</div><label class="stake-row">Clubs<input id="stake" type="number" min="${selectedTarget === 'half' ? 2 : 1}" step="${selectedTarget === 'half' ? 2 : 1}" value="${stake}"></label><button id="buy-bet" ${targets.find((offer) => offer.id === selectedTarget)?.available && !(selectedTarget === 'half' && stake % 2 !== 0) ? '' : 'disabled'}>Buy bet for ♦${stake}</button></section>
      <section class="panel shop"><h2>Spade shop</h2><button id="restore-heart">Restore Heart ♦5</button><button id="buy-global">+1 Global ♠ ♦${spadeCost('global', state.upgrades.spades.global)}</button><button id="buy-mode">+1 ${mode.name} ♠ ♦${spadeCost(modeId, state.upgrades.spades[modeId])}</button><button disabled>Faster glyphs soon</button><button disabled>Pause breaks soon</button><button disabled>Choose/rearrange categories soon</button><button id="reset-save">Reset save</button></section></section>
    </main>`;
  root.querySelectorAll('[data-dispatch]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.dispatch)));
  root.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.mode; if (state.unlockedModes[id]) startBoard(id); else tryAction(() => unlockMode(state, id)); }));
  root.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => { selectedTarget = button.dataset.target; if (selectedTarget === 'half' && stake % 2 !== 0) stake += 1; render(); }));
  root.querySelector('#stake')?.addEventListener('input', (event) => { stake = Math.max(1, Number(event.target.value || 1)); render(); });
  root.querySelector('#buy-bet')?.addEventListener('click', buyBet);
  root.querySelector('#restore-heart')?.addEventListener('click', () => tryAction(() => restoreHeart(state)));
  root.querySelector('#buy-global')?.addEventListener('click', () => tryAction(() => buySpade(state, 'global')));
  root.querySelector('#buy-mode')?.addEventListener('click', () => tryAction(() => buySpade(state, modeId)));
  root.querySelector('#start-round')?.addEventListener('click', startRound);
  root.querySelector('#new-board')?.addEventListener('click', () => startBoard());
  root.querySelector('#continue-lobby')?.addEventListener('click', () => { lastSummary = null; startBoard(modeId); });
  root.querySelector('#reset-save')?.addEventListener('click', async () => { state = normalizeSave(await json('./emoji_wager_game_spec/data/default_state.json')); save(); startBoard('sort_2'); });
}
window.addEventListener('keydown', (event) => { const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }; if (map[event.key]) { event.preventDefault(); dispatch(map[event.key]); } });
try {
  const [itemsData, selectorsData, stateData] = await Promise.all([json('./emoji_wager_game_spec/data/items.json'), json('./emoji_wager_game_spec/data/category_selectors.json'), json('./emoji_wager_game_spec/data/default_state.json')]);
  items = itemsData.items;
  selectors = selectorsData.selectors;
  state = loadSaved(stateData);
  save();
  startBoard('sort_2');
} catch (error) {
  root.innerHTML = `<main class="app-shell"><section class="panel"><h1>Unable to start</h1><p>${error.message}</p></section></main>`;
}
