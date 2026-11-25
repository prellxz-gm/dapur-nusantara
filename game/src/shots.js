// shots.js — deterministic shot-state setup from URL query (?shot=...&seed=...).
// Every shot shows the kitchen, the order board, ingredients on the counter,
// and a timer. Used by the screenshot harness and by main.js on boot.
import { createState, newOrder } from './state.js';
import { RECIPES, TIMINGS } from './config.js';
import { makeRng } from './random.js';

export function shotParams() {
  const q = new URLSearchParams(window.location.search);
  return { shot: q.get('shot') || '', seed: parseInt(q.get('seed') || '1', 10) || 1 };
}

function fillOrders(state, count, vipIndex) {
  const rng = makeRng(state.rngSeed || 1);
  for (let i = 0; i < count; i++) {
    const o = newOrder(state.nextOrderId++, state.day, state.elapsed, rng);
    if (i === vipIndex) {
      o.vip = true;
      o.patienceMax = Math.max(TIMINGS.patienceMin, o.patienceMax * 0.6);
      o.patience = o.patienceMax * 0.55;
    } else {
      o.vip = false;
      o.patience = o.patienceMax * (0.35 + rng() * 0.55);
    }
    state.orders.push(o);
  }
}

export function applyShot(state, shot, seed) {
  state.rngSeed = seed;
  const rng = makeRng(seed);
  state.rng = rng;
  if (shot === 'start') {
    state.screen = 'title';
    state.timeLeft = TIMINGS.shiftSeconds;
    fillOrders(state, 3, -1);
    return state;
  }
  state.screen = 'playing';
  state.elapsed = shot === 'play' ? 42 : shot === 'mid' ? 96 : 130;
  state.timeLeft = TIMINGS.shiftSeconds - state.elapsed;
  state.score = shot === 'play' ? 340 : shot === 'mid' ? 890 : 1420;
  state.coins = shot === 'play' ? 34 : shot === 'mid' ? 89 : 142;
  state.combo = shot === 'play' ? 2 : shot === 'mid' ? 3 : 4;
  state.bestCombo = state.combo;
  state.servedCount = shot === 'play' ? 3 : shot === 'mid' ? 8 : 12;
  fillOrders(state, 4, 1);
  // a wok cooking + a skewer grilling, always visible
  state.wok[0] = { item: 'chickenChopped', progress: 2.4, duration: TIMINGS.wokSeconds, burn: 0 };
  state.grill[0] = { item: 'skewer', progress: 3.4, duration: TIMINGS.grillSeconds, burn: 0 };
  if (shot === 'play') {
    state.held = ['veg'];
    state.chef.x = 430; state.chef.y = 560;
    state.chef.tx = 430; state.chef.ty = 560;
    return state;
  }
  if (shot === 'mid') {
    // dish mid-assembly: plate with 2 of 3 components (Nasi Ayam Kilat)
    const recipe = RECIPES[0];
    state.plates[0] = [recipe.components[0], recipe.components[1]];
    state.held = ['sauce'];
    state.chef.x = 1120; state.chef.y = 560;
    state.chef.tx = 1120; state.chef.ty = 560;
    return state;
  }
  // serve: completed plate on the pass, matching the first ticket
  const first = state.orders[0];
  state.plates[0] = first.recipe.components.slice();
  state.orders[0].patience = state.orders[0].patienceMax * 0.8;
  state.message = '✅ HIDANGAN SIAP — SAJIKAN DI PASS!';
  state.messageTimer = 99;
  state.held = [];
  state.chef.x = 640; state.chef.y = 560;
  state.chef.tx = 640; state.chef.ty = 560;
  return state;
}
