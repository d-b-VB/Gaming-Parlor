import { MODES, modeList, STORAGE_KEY, generateBoard, estimateTargets, heartSafety, createClubBet, buyClubBet, unlockMode, buySpade, restoreHeart, settleRound, spadeCost, streakDuration } from './game/core.js';

const root = document.querySelector('#root');
const APP_VERSION = 'v0.2.1';
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
let selectedTarget = 'safe';
let stake = 1;
let timerId = null;

function fmt(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function seed() { return `${modeId}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
async function json(path) { const response = await fetch(path); if (!response.ok) throw new Error(`Unable to load ${path}`); return response.json(); }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadSaved(defaultState) { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultState); } catch { return structuredClone(defaultState); } }
function groupByDirection(direction) { return board.groups.filter((group) => group.direction === direction); }
function currentTargets() { return estimateTargets(modeId, state.gameMemory[modeId].entries); }
function stopTimer() { if (timerId) window.clearInterval(timerId); timerId = null; }
function startBoard(nextMode = modeId) {
  modeId = nextMode;
  board = generateBoard(modeId, seed(), items, selectors);
  queue = [...board.queue];
  startedAt = null;
  elapsed = 0;
  streak = 0;
  mistakes = 0;
  selectedTarget = 'safe';
  feedback = 'Board ready. Buy Clubs if you want odds, then sort the center glyph.';
  stopTimer();
  render();
}
function ensureTimer() {
  if (startedAt) return;
  startedAt = Date.now();
  timerId = window.setInterval(() => { elapsed = (Date.now() - startedAt) / 1000; render(); }, 100);
}
function finishRound() {
  const final = Math.max(1, Number(((Date.now() - startedAt) / 1000).toFixed(2)));
  stopTimer();
  state = settleRound(state, modeId, final, mistakes, board.seed);
  save();
  feedback = `Round complete in ${final.toFixed(2)}s with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`;
  startedAt = null;
  elapsed = final;
  render();
}
function dispatch(direction) {
  const mode = MODES[modeId];
  if (!queue[0] || !mode.directions.includes(direction)) return;
  ensureTimer();
  const prompt = queue[0];
  if (prompt.direction === direction) {
    queue.shift();
    streak += 1;
    feedback = `Correct ${arrows[direction]} — streak ${streak}; glide ${streakDuration(220, streak)}ms.`;
    if (queue.length === 0) finishRound(); else render();
  } else {
    queue = [...queue.slice(1), prompt];
    streak = 0;
    mistakes += 1;
    feedback = `Wrong ${arrows[direction]} — ${prompt.item.glyph} goes to the back.`;
    render();
  }
}
function setState(next) { state = next; save(); render(); }
function tryAction(fn) { try { setState(fn()); } catch (error) { feedback = error.message; render(); } }
function buyBet() {
  const offer = currentTargets().find((target) => target.id === selectedTarget);
  tryAction(() => buyClubBet(state, createClubBet(modeId, offer, stake)));
  feedback = `Club bet set: ${stake} on ${fmt(offer.timeSeconds)} at ${offer.oddsMultiplier}x.`;
  render();
}
function render() {
  const mode = MODES[modeId];
  const targets = currentTargets();
  const safety = heartSafety(modeId, state.gameMemory[modeId].entries);
  const current = queue[0];
  const progress = board.queue.length - queue.length;
  root.innerHTML = `
    <main class="app-shell">
      <div class="version-banner"><span>Emoji Wager Sort ${APP_VERSION}</span><span>Playable build</span></div>
      <header class="hero"><div><p class="eyebrow">Gaming Parlor</p><h1>Emoji Wager Sort</h1><p>Sort the center glyph into the matching visible gadget glyphs. 2-way is free; buy into 3-way and 4-way when you are ready.</p></div><div class="resources"><span>♥ ${state.resources.hearts}/${state.resources.maxHearts}</span><span>♦ ${state.resources.diamonds}</span><span>♠ ${state.upgrades.spades.global + state.upgrades.spades[modeId]} payout</span></div></header>
      <section class="panel mode-panel"><h2>Modes</h2><div class="mode-grid">${modeList.map((candidate) => `<button data-mode="${candidate.id}" class="${candidate.id === modeId ? 'selected' : ''}"><strong>${candidate.name}</strong><span>${state.unlockedModes[candidate.id] ? 'Play' : `Unlock ♦${candidate.unlockCost}`}</span></button>`).join('')}</div></section>
      <section class="game-layout"><div class="panel table"><div class="status-row"><span>⏱ ${elapsed.toFixed(1)}s</span><span>Queue ${queue.length}/${board.queue.length}</span><span>Streak ${streak}</span><span>♥ danger after ${fmt(safety)}</span>${state.activeClubBet ? `<span>♣ beat ${fmt(state.activeClubBet.targetSeconds)} for ♦${Math.floor(state.activeClubBet.stake * state.activeClubBet.oddsMultiplier)}</span>` : ''}</div>
      <div class="sort-board mode-${mode.directions.length}">${mode.directions.map((direction) => `<button class="zone zone-${direction}" data-dispatch="${direction}"><span class="direction">${arrows[direction]}</span><span class="groups">${groupByDirection(direction).map((group) => `<span class="glyph-group" title="${group.label}">${group.items.map((item) => `<span>${item.glyph}</span>`).join('')}</span>`).join('')}</span></button>`).join('')}<div class="center-card"><span class="prompt">${current?.item.glyph || '🏁'}</span><span>${current ? `${progress}/${board.queue.length} sorted` : 'Round finished'}</span></div></div><p class="feedback" role="status">${feedback}</p></div>
      <aside class="side-stack"><section class="panel"><h2>Club wager</h2><div class="target-list">${targets.map((offer) => `<button data-target="${offer.id}" class="${offer.id === selectedTarget ? 'selected' : ''}"><strong>${offer.label}</strong><span>Beat ${fmt(offer.timeSeconds)}</span><span>${offer.oddsMultiplier}x</span></button>`).join('')}</div><label class="stake-row">Clubs<input id="stake" type="number" min="1" value="${stake}"></label><button id="buy-bet" ${startedAt ? 'disabled' : ''}>Buy bet for ♦${stake}</button></section>
      <section class="panel shop"><h2>Spade shop</h2><button id="restore-heart">Restore Heart ♦5</button><button id="buy-global">+1 Global ♠ ♦${spadeCost('global', state.upgrades.spades.global)}</button><button id="buy-mode">+1 ${mode.name} ♠ ♦${spadeCost(modeId, state.upgrades.spades[modeId])}</button><button disabled>Faster glyphs soon</button><button disabled>Pause breaks soon</button><button disabled>Choose/rearrange categories soon</button></section>
      <section class="panel"><h2>Controls</h2><p>Use arrow keys or click a direction. Wrong glyphs recycle to the back of the queue.</p><button id="new-board">New board</button><button id="reset-save">Reset save</button></section></aside></section>
    </main>`;
  root.querySelectorAll('[data-dispatch]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.dispatch)));
  root.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.mode; if (state.unlockedModes[id]) startBoard(id); else tryAction(() => unlockMode(state, id)); }));
  root.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => { selectedTarget = button.dataset.target; render(); }));
  root.querySelector('#stake').addEventListener('input', (event) => { stake = Math.max(1, Number(event.target.value || 1)); render(); });
  root.querySelector('#buy-bet').addEventListener('click', buyBet);
  root.querySelector('#restore-heart').addEventListener('click', () => tryAction(() => restoreHeart(state)));
  root.querySelector('#buy-global').addEventListener('click', () => tryAction(() => buySpade(state, 'global')));
  root.querySelector('#buy-mode').addEventListener('click', () => tryAction(() => buySpade(state, modeId)));
  root.querySelector('#new-board').addEventListener('click', () => startBoard());
  root.querySelector('#reset-save').addEventListener('click', async () => { state = structuredClone(await json('./emoji_wager_game_spec/data/default_state.json')); save(); startBoard('sort_2'); });
}
window.addEventListener('keydown', (event) => { const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }; if (map[event.key]) { event.preventDefault(); dispatch(map[event.key]); } });
try {
  const [itemsData, selectorsData, stateData] = await Promise.all([json('./emoji_wager_game_spec/data/items.json'), json('./emoji_wager_game_spec/data/category_selectors.json'), json('./emoji_wager_game_spec/data/default_state.json')]);
  items = itemsData.items;
  selectors = selectorsData.selectors;
  state = loadSaved(stateData);
  startBoard('sort_2');
} catch (error) {
  root.innerHTML = `<main class="app-shell"><section class="panel"><h1>Unable to start</h1><p>${error.message}</p></section></main>`;
}
