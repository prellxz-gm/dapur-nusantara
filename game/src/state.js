// state.js — game state: orders incl. VIP, held items, plates, wok + grill
// slots, score/combo/coins, shift timer, day, upgrades, rush events.
import { RECIPES, TIMINGS, DAY_CONFIG, UPGRADES } from './config.js';
import { makeRng } from './random.js';

export function unlockedRecipes(elapsedSeconds) {
  return RECIPES.filter((r) => r.unlockAt <= elapsedSeconds);
}

export function newOrder(id, day, elapsedSeconds, rng) {
  const dayCfg = DAY_CONFIG[day - 1] || DAY_CONFIG[0];
  const pool = unlockedRecipes(elapsedSeconds);
  const recipe = pool[Math.floor(rng() * pool.length)];
  const vip = rng() < dayCfg.vipChance;
  const patienceMax = Math.max(
    TIMINGS.patienceMin,
    TIMINGS.patienceBase * dayCfg.patienceScale * (vip ? TIMINGS.vipPatienceScale : 1),
  );
  return {
    id,
    recipe,
    vip,
    patience: patienceMax,
    patienceMax,
    served: false,
    expired: false,
  };
}

export function createState(day = 1, upgradesOwned = []) {
  return {
    screen: 'title', // title | playing | paused | shiftEnd | upgrade | campaignEnd
    day,
    dayCfg: DAY_CONFIG[day - 1] || DAY_CONFIG[0],
    upgradesOwned: upgradesOwned.slice(),
    timeLeft: TIMINGS.shiftSeconds,
    elapsed: 0,
    score: 0,
    coins: 0,
    totalScore: 0,
    combo: 0,
    bestCombo: 0,
    servedCount: 0,
    perfectCount: 0,
    lostCount: 0,
    orders: [],
    nextOrderId: 1,
    orderTimer: 4, // first order arrives quickly
    held: [], // ingredient/component ids, max 2 (3 with carry upgrade)
    plates: [ [], [], [] ], // 3 plating slots, each an array of components
    chop: null, // { item, progress, duration } or null
    wok: [null, null], // slots: { item, progress, duration, burn } or null
    grill: [null, null],
    rush: false,
    rushTimer: 0,
    rushDone: false,
    chef: { x: 640, y: 600, tx: 640, ty: 600, moving: false, face: 1 },
    selectedStation: null,
    message: '',
    messageTimer: 0,
    rng: makeRng(12345 + day * 777),
    dayCoinsEarned: 0,
    shiftStats: null,
    muted: false,
  };
}

export function hasUpgrade(state, id) {
  return state.upgradesOwned.includes(id);
}

export function carryLimit(state) {
  return hasUpgrade(state, 'carry') ? 3 : 2;
}

export function chopDuration(state) {
  return TIMINGS.chopSeconds * (hasUpgrade(state, 'chop') ? 0.6 : 1);
}

export function wokSlots(state) {
  return hasUpgrade(state, 'wok') ? 3 : 2;
}

export function burnTime(state) {
  return TIMINGS.burnAfterSeconds * (hasUpgrade(state, 'coals') ? 2 : 1);
}

export function patienceScale(state) {
  return hasUpgrade(state, 'patience') ? 1.25 : 1;
}

export function orderInterval(state) {
  const base = Math.max(
    TIMINGS.orderIntervalMin,
    TIMINGS.orderIntervalBase * state.dayCfg.intervalScale,
  );
  return state.rush ? base * 0.5 : base;
}

// Serve a finished plate (index) to the matching open order. Returns points or -1.
export function servePlate(state, plateIndex) {
  const plate = state.plates[plateIndex];
  if (!plate || plate.length === 0) return -1;
  const order = state.orders.find(
    (o) => !o.served && !o.expired && o.recipe.components.length === plate.length
      && o.recipe.components.every((c, i) => c === plate[i]),
  );
  if (!order) return -1;
  const frac = order.patience / order.patienceMax;
  const tip = Math.round(order.recipe.points * TIMINGS.tipMax * frac);
  const comboBefore = state.combo;
  state.combo = Math.min(5, state.combo + 1);
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const mult = 1 + 0.2 * (state.combo - 1);
  const pay = Math.round((order.recipe.points + tip) * mult * (order.vip ? TIMINGS.vipPayScale : 1));
  state.score += pay;
  state.coins += Math.round(pay / 10);
  state.dayCoinsEarned += Math.round(pay / 10);
  state.servedCount += 1;
  if (frac > 0.7) state.perfectCount += 1;
  order.served = true;
  state.plates[plateIndex] = [];
  state.orders = state.orders.filter((o) => o !== order);
  return { pay, combo: state.combo, comboBefore, vip: order.vip, recipe: order.recipe.name };
}

// Discard a held item or a plate's contents (small penalty).
export function discardHeld(state) {
  if (state.held.length === 0) return false;
  state.held.pop();
  state.score = Math.max(0, state.score - 5);
  return true;
}

export function upgradeList(state) {
  return UPGRADES.filter((u) => !state.upgradesOwned.includes(u.id));
}

export function applyUpgrade(state, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || state.upgradesOwned.includes(id)) return false;
  if (state.coins < u.cost) return false;
  state.coins -= u.cost;
  state.upgradesOwned.push(id);
  return true;
}
