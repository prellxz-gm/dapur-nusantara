// main.js — boot, game loop, state machine (title/playing/pause/upgrade/end),
// station interaction wiring.
import { W, H, LAYOUT, TIMINGS, RECIPES, TRANSFORMS, COMPONENT_LABELS, UPGRADES, CHEF } from './config.js';
import { createState, newOrder, servePlate, carryLimit, chopDuration, wokSlots, burnTime, patienceScale, orderInterval, applyUpgrade, hasUpgrade } from './state.js';
import { createInput, consumeClick, stationAt, stationWalkTarget } from './input.js';
import { render, renderTitle, renderPaused, renderShiftEnd, renderUpgrade, renderCampaignEnd } from './render.js';
import { sfx, setMuted } from './audio.js';
import { shotParams, applyShot } from './shots.js';
import { makeRng } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

let state = createState(1, []);
let input = createInput(canvas);
let lastTime = performance.now();
let time = 0;
let pendingUse = null; // station hit to use once the chef arrives
let boughtThisShift = false;

const { shot, seed } = shotParams();
if (shot) {
  applyShot(state, shot, seed);
  if (shot !== 'start') state.screen = 'playing';
}

function showStatus() {
  if (!statusEl) return;
  statusEl.textContent = `Dapur Nusantara — Hari ${state.day}/3, skor ${state.score}, koin ${state.coins}, ` +
    `waktu ${Math.max(0, Math.ceil(state.timeLeft))} detik, pesanan ${state.orders.length}, ` +
    `disajikan ${state.servedCount}, combo x${state.combo}.`;
}

// ---------- helpers ----------

function flash(msg, secs = 2.5) {
  state.message = msg;
  state.messageTimer = secs;
}

function rawFor(component) {
  // reverse a finished component to the raw bin ingredient that starts it
  for (const [raw, out] of Object.entries(TRANSFORMS.chop)) if (out === component) return raw;
  for (const [raw, out] of Object.entries(TRANSFORMS.wok)) if (out === component) return raw;
  for (const [raw, out] of Object.entries(TRANSFORMS.grill)) if (out === component) return raw;
  return component; // already a raw component (rice, egg, sauce, ...)
}

function neededRawIngredients() {
  // raw ingredients still needed by open orders, in ticket order
  const out = [];
  for (const o of state.orders) {
    for (const c of o.recipe.components) {
      const raw = rawFor(c);
      if (!out.includes(raw)) out.push(raw);
    }
  }
  return out;
}

function spawnOrder() {
  if (state.orders.length >= state.dayCfg.orders) return;
  const o = newOrder(state.nextOrderId++, state.day, state.elapsed, state.rng);
  const scale = patienceScale(state);
  o.patienceMax = Math.round(o.patienceMax * scale);
  o.patience = o.patienceMax;
  state.orders.push(o);
  sfx.click();
}

function endShift() {
  state.screen = 'shiftEnd';
  const served = state.servedCount;
  const perfectRate = served > 0 ? Math.round((state.perfectCount / served) * 100) : 0;
  state.shiftStats = {
    served, perfect: state.perfectCount, perfectRate,
    bestCombo: state.bestCombo, lost: state.lostCount,
    score: state.score, coinsEarned: state.dayCoinsEarned,
  };
  state.totalScore += state.score;
  boughtThisShift = false;
}

function startDay(day, upgradesOwned) {
  const keepScore = day === 1 ? 0 : state.totalScore;
  const keepServed = day === 1 ? 0 : state.servedCount;
  const keepBest = day === 1 ? 0 : state.bestCombo;
  state = createState(day, upgradesOwned);
  state.totalScore = keepScore;
  state.servedCount = keepServed;
  state.bestCombo = keepBest;
  state.screen = 'playing';
  state.orderTimer = 3;
  spawnOrder();
  flash(`HARI ${day} — shift dimulai!`, 3);
}

// ---------- interaction ----------

function takeFromChop() {
  if (!state.chop) return false;
  if (state.chop.progress < state.chop.duration) { flash('Masih dipotong…'); return false; }
  if (state.held.length >= carryLimit(state)) { flash('Tangan penuh!'); sfx.error(); return false; }
  const out = TRANSFORMS.chop[state.chop.item];
  state.held.push(out);
  state.chop = null;
  sfx.pickup();
  return true;
}

function useChop() {
  if (state.chop) return takeFromChop();
  const idx = state.held.findIndex((h) => TRANSFORMS.chop[h]);
  if (idx < 0) { flash('Bawa ayam / sayur ke talenan dulu'); return false; }
  const item = state.held.splice(idx, 1)[0];
  state.chop = { item, progress: 0, duration: chopDuration(state) };
  sfx.chop();
  return true;
}

function useCookSlot(slots, kind, slotIndex) {
  const transforms = kind === 'wok' ? TRANSFORMS.wok : TRANSFORMS.grill;
  const slot = slots[slotIndex];
  if (slot && slot.burnt) {
    slots[slotIndex] = null;
    state.score = Math.max(0, state.score - 10);
    flash('Makanan hangus dibuang (−10)');
    sfx.burn();
    return true;
  }
  if (slot) {
    if (slot.progress < slot.duration) { flash('Masih dimasak…'); return false; }
    if (state.held.length >= carryLimit(state)) { flash('Tangan penuh!'); sfx.error(); return false; }
    const out = transforms[slot.item];
    state.held.push(out);
    slots[slotIndex] = null;
    sfx.pickup();
    return true;
  }
  const idx = state.held.findIndex((h) => transforms[h]);
  if (idx < 0) {
    flash(kind === 'wok' ? 'Bawa bahan yang bisa dimasak di wajan' : 'Bawa sate ke panggangan');
    return false;
  }
  const item = state.held.splice(idx, 1)[0];
  slots[slotIndex] = { item, progress: 0, duration: kind === 'wok' ? TIMINGS.wokSeconds : TIMINGS.grillSeconds, burn: 0, burnt: false };
  if (kind === 'wok') sfx.sizzle(); else sfx.crackle();
  return true;
}

function usePlating(slotIndex) {
  const heldIdx = state.held.findIndex((h) => COMPONENT_LABELS[h]);
  if (heldIdx < 0) { flash('Bawa komponen hidangan ke piring'); return false; }
  const plate = state.plates[slotIndex];
  if (plate.length >= 4) { flash('Piring penuh!'); sfx.error(); return false; }
  const item = state.held.splice(heldIdx, 1)[0];
  plate.push(item);
  sfx.place();
  // wrong-component warning: plate no longer matches any open order prefix
  const stillOk = state.orders.some((o) => {
    const c = o.recipe.components;
    return plate.length <= c.length && plate.every((p, i) => p === c[i]);
  });
  if (!stillOk) flash('⚠️ Komponen salah — sajian ini tidak cocok dengan tiket!');
  return true;
}

function usePass() {
  for (let i = 0; i < state.plates.length; i++) {
    const plate = state.plates[i];
    if (plate.length === 0) continue;
    const match = state.orders.some((o) => !o.served && o.recipe.components.length === plate.length
      && o.recipe.components.every((c, j) => c === plate[j]));
    if (!match) continue;
    const res = servePlate(state, i);
    if (res && res !== -1) {
      if (res.vip) flash(`⭐ VIP! ${res.recipe} tersaji: +${res.pay} (combo x${res.combo})`);
      else flash(`✅ ${res.recipe} tersaji: +${res.pay} (combo x${res.combo})`);
      if (res.combo >= 3) sfx.perfect(); else sfx.serve();
      sfx.coin();
      return true;
    }
  }
  flash('Belum ada piring lengkap yang cocok dengan tiket');
  sfx.error();
  return false;
}

function usePrepBin(bin) {
  if (state.held.length >= carryLimit(state)) { flash('Tangan penuh!'); sfx.error(); return false; }
  state.held.push(bin);
  sfx.pickup();
  return true;
}

function useStation(hit) {
  if (!hit) return false;
  switch (hit.station) {
    case 'prep': return usePrepBin(hit.bin);
    case 'chop': return useChop();
    case 'stove': return useCookSlot(state.wok, 'wok', hit.slot ?? 0);
    case 'grill': return useCookSlot(state.grill, 'grill', hit.slot ?? 0);
    case 'plating': return usePlating(hit.slot ?? 0);
    case 'pass': return usePass();
    default: return false;
  }
}

// E / Space: use the nearest station to the chef.
function nearestStationHit() {
  const c = state.chef;
  const L = LAYOUT;
  const centers = [
    { station: 'prep', x: L.prep.x + L.prep.w / 2, y: L.prep.y + L.prep.h + 26 },
    { station: 'chop', x: L.chop.x + L.chop.w / 2, y: L.chop.y + L.chop.h + 26 },
    { station: 'stove', x: L.stove.x + L.stove.w / 2, y: L.stove.y + L.stove.h + 26 },
    { station: 'grill', x: L.grill.x + L.grill.w / 2, y: L.grill.y + L.grill.h + 26 },
    { station: 'plating', x: L.plating.x + L.plating.w / 2, y: L.plating.y + L.plating.h + 26 },
    { station: 'pass', x: c.x, y: L.pass.y + L.pass.h + 18 },
  ];
  let best = null, bestD = 210;
  for (const s of centers) {
    const d = Math.hypot(s.x - c.x, s.y - c.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (!best) return null;
  if (best.station === 'prep') {
    // smart grab: first raw ingredient an open order still needs
    const need = neededRawIngredients();
    if (need.length === 0) return { station: 'prep', bin: 'rice', cx: best.x, cy: best.y };
    return { station: 'prep', bin: need[0], cx: best.x, cy: best.y };
  }
  if (best.station === 'stove' || best.station === 'grill') {
    const slots = best.station === 'stove' ? state.wok : state.grill;
    // prefer a finished slot, else first empty slot
    let slot = slots.findIndex((s) => s && s.progress >= s.duration);
    if (slot < 0) slot = slots.findIndex((s) => !s);
    if (slot < 0) slot = 0;
    return { station: best.station, slot, cx: best.x, cy: best.y };
  }
  if (best.station === 'plating') {
    let slot = state.plates.findIndex((p) => p.length > 0 && p.length < 4);
    if (slot < 0) slot = state.plates.findIndex((p) => p.length === 0);
    if (slot < 0) slot = 0;
    return { station: 'plating', slot, cx: best.x, cy: best.y };
  }
  return best;
}

// ---------- update ----------

function updatePlaying(dt) {
  const c = state.chef;
  // movement: WASD/arrows override click target
  const k = input.keys;
  let mx = 0, my = 0;
  if (k.has('a') || k.has('arrowleft')) mx -= 1;
  if (k.has('d') || k.has('arrowright')) mx += 1;
  if (k.has('w') || k.has('arrowup')) my -= 1;
  if (k.has('s') || k.has('arrowdown')) my += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    c.x += (mx / len) * CHEF.speed * dt;
    c.y += (my / len) * CHEF.speed * dt;
    c.tx = c.x; c.ty = c.y;
    c.moving = true;
    pendingUse = null;
    if (mx !== 0) c.face = mx > 0 ? 1 : -1;
  } else if (c.tx !== c.x || c.ty !== c.y) {
    const dx = c.tx - c.x, dy = c.ty - c.y;
    const d = Math.hypot(dx, dy);
    const step = CHEF.speed * dt;
    if (d <= step + 4) {
      c.x = c.tx; c.y = c.ty;
      c.moving = false;
      if (pendingUse) {
        const hit = pendingUse;
        pendingUse = null;
        useStation(hit);
      }
    } else {
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
      c.moving = true;
      if (dx !== 0) c.face = dx > 0 ? 1 : -1;
    }
  } else {
    c.moving = false;
  }
  c.x = Math.max(20, Math.min(W - 20, c.x));
  c.y = Math.max(460, Math.min(H - 24, c.y));

  // click: walk to station and use it, or just walk
  const click = consumeClick(input);
  if (click) {
    const hit = stationAt(click.x, click.y);
    if (hit) {
      const t = stationWalkTarget(hit);
      c.tx = t.x; c.ty = t.y;
      pendingUse = hit;
    } else {
      c.tx = click.x;
      c.ty = Math.max(460, click.y);
      pendingUse = null;
    }
  }

  // E / Space
  if (input.interactPressed) {
    input.interactPressed = false;
    const hit = nearestStationHit();
    if (hit) useStation(hit);
    else flash('Dekati stasiun dulu, lalu tekan E');
  }

  // timers
  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  // rush hour
  if (!state.rushDone && state.elapsed >= TIMINGS.rushAt) {
    state.rush = true;
    state.rushTimer = TIMINGS.rushDuration;
    state.rushDone = true;
    flash('🔥 RUSH HOUR! Pesanan berdatangan 2x lipat!', 4);
    sfx.rush();
  }
  if (state.rush) {
    state.rushTimer -= dt;
    if (state.rushTimer <= 0) { state.rush = false; flash('Rush hour selesai.'); }
  }

  // orders
  state.orderTimer -= dt;
  if (state.orderTimer <= 0) {
    spawnOrder();
    const base = orderInterval(state);
    state.orderTimer = base * (0.8 + state.rng() * 0.4);
  }
  for (const o of state.orders) o.patience -= dt;
  const expired = state.orders.filter((o) => o.patience <= 0);
  if (expired.length > 0) {
    state.lostCount += expired.length;
    state.combo = 0;
    state.orders = state.orders.filter((o) => o.patience > 0);
    flash(`⏰ ${expired.length} pesanan hangus — combo reset!`);
    sfx.error();
  }

  // chopping
  if (state.chop) {
    state.chop.progress += dt;
    if (state.chop.progress >= state.chop.duration && !state.chop.doneNotified) {
      state.chop.doneNotified = true;
      sfx.place();
    }
  }
  // wok + grill
  for (const slots of [state.wok, state.grill]) {
    for (const slot of slots) {
      if (!slot) continue;
      if (slot.progress < slot.duration) {
        slot.progress += dt;
        if (slot.progress >= slot.duration) sfx.sizzle();
      } else if (!slot.burnt) {
        slot.burn += dt;
        if (slot.burn >= burnTime(state)) {
          slot.burnt = true;
          flash('🔥 Makanan hangus! Buang dulu sebelum masak lagi.');
          sfx.burn();
        }
      }
    }
  }

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endShift();
  }
  showStatus();
}

// ---------- screens ----------

function handleTitle(dt) {
  const click = consumeClick(input);
  const enter = input.keys.has('enter') || input.anyKey;
  if (click || enter) {
    input.anyKey = false;
    input.keys.delete('enter');
    sfx.click();
    startDay(1, []);
  }
}

function handleShiftEnd() {
  const click = consumeClick(input);
  const enter = input.keys.has('enter');
  if (click || enter) {
    input.keys.delete('enter');
    sfx.click();
    if (state.day >= 3) {
      state.screen = 'campaignEnd';
    } else {
      state.screen = 'upgrade';
    }
  }
}

function handleUpgrade() {
  // number keys 1-5 buy one upgrade
  const list = UPGRADES.filter((u) => !state.upgradesOwned.includes(u.id));
  for (let i = 0; i < list.length; i++) {
    if (input.keys.has(String(i + 1))) {
      input.keys.delete(String(i + 1));
      if (!boughtThisShift) {
        if (applyUpgrade(state, list[i].id)) {
          boughtThisShift = true;
          flash(`Upgrade dibeli: ${list[i].name}`);
          sfx.coin();
        } else {
          flash('Koin tidak cukup!');
          sfx.error();
        }
      } else {
        flash('Satu upgrade per shift saja');
      }
    }
  }
  const click = consumeClick(input);
  if (click) {
    // upgrade rows
    for (let i = 0; i < list.length; i++) {
      const y = 200 + i * 62;
      if (click.x >= 280 && click.x <= 1000 && click.y >= y && click.y <= y + 52) {
        if (!boughtThisShift) {
          if (applyUpgrade(state, list[i].id)) {
            boughtThisShift = true;
            flash(`Upgrade dibeli: ${list[i].name}`);
            sfx.coin();
          } else { flash('Koin tidak cukup!'); sfx.error(); }
        } else flash('Satu upgrade per shift saja');
        return;
      }
    }
    // continue button
    if (click.x >= 490 && click.x <= 790 && click.y >= 560 && click.y <= 610) {
      sfx.click();
      startDay(state.day + 1, state.upgradesOwned);
    }
  }
  if (input.keys.has('enter')) {
    input.keys.delete('enter');
    sfx.click();
    startDay(state.day + 1, state.upgradesOwned);
  }
}

function handleCampaignEnd() {
  const click = consumeClick(input);
  const enter = input.keys.has('enter');
  if (click || enter) {
    input.keys.delete('enter');
    input.anyKey = false;
    sfx.click();
    state = createState(1, []);
    state.screen = 'title';
  }
}

function update(dt) {
  time += dt;
  if (input.mutePressed) {
    input.mutePressed = false;
    setMuted(!state.muted);
    state.muted = !state.muted;
    flash(state.muted ? '🔇 Suara mati' : '🔊 Suara hidup');
  }
  if (input.pausePressed) {
    input.pausePressed = false;
    if (state.screen === 'playing') state.screen = 'paused';
    else if (state.screen === 'paused') state.screen = 'playing';
  }
  switch (state.screen) {
    case 'title': handleTitle(dt); break;
    case 'playing': updatePlaying(dt); break;
    case 'paused': break;
    case 'shiftEnd': handleShiftEnd(); break;
    case 'upgrade': handleUpgrade(); break;
    case 'campaignEnd': handleCampaignEnd(); break;
    default: break;
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  switch (state.screen) {
    case 'title': renderTitle(ctx, state, time); break;
    case 'paused': renderPaused(ctx, state, time); break;
    case 'shiftEnd': renderShiftEnd(ctx, state); break;
    case 'upgrade': renderUpgrade(ctx, state); break;
    case 'campaignEnd': renderCampaignEnd(ctx, state); break;
    default: render(ctx, state, time); break;
  }
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  // screenshot mode: freeze the staged scene, no simulation
  if (!shot) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();
showStatus();
requestAnimationFrame(loop);
