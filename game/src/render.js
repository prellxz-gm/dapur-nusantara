// render.js — all canvas drawing: kitchen, stations, tickets, chef, plates,
// steam, HUD, title / upgrade / end screens.
import { W, H, COLORS, LAYOUT, INGREDIENTS, RECIPES, BINS, COMPONENT_LABELS, COMPONENT_COLORS, UPGRADES, TIMINGS } from './config.js';

const EMOJI = {
  rice: '🍚', chicken: '🍗', noodle: '🍜', egg: '🥚', veg: '🥬', sauce: '🌶️',
  broth: '🍲', skewer: '🍢', peanut: '🥜', lontong: '🍙', chilli: '🌶️', tofu: '🧈',
  chickenCooked: '🍗', chickenChopped: '🍗', noodleCooked: '🍜', vegChopped: '🥗', skewerGrilled: '🍢',
};

export function componentEmoji(id) { return EMOJI[id] || '🍽️'; }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function batikTrim(ctx, x, y, w, h) {
  // batik-style diamond trim strip
  ctx.save();
  ctx.fillStyle = COLORS.batik;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = COLORS.gold;
  const step = 22;
  for (let i = 0; i < w / step; i++) {
    const cx = x + i * step + step / 2;
    const cy = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawKitchenShell(ctx, time) {
  // wall
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, W, 128);
  ctx.fillStyle = COLORS.wallStripe;
  ctx.fillRect(0, 122, W, 6);
  // batik trim under the board
  batikTrim(ctx, 0, 128, W, 14);
  // floor
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 442, W, H - 442);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 160 + 80, 442, 3, H - 442);
  // signage
  ctx.fillStyle = COLORS.chili;
  rr(ctx, 430, 8, 420, 34, 8);
  ctx.fill();
  text(ctx, '🍜  DAPUR NUSANTARA  🍜', 640, 33, 24, '#fff7e6', 'center');
  // hanging lamps
  for (const lx of [180, 640, 1100]) {
    ctx.strokeStyle = '#5b3a1a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 26); ctx.stroke();
    ctx.fillStyle = COLORS.amber;
    ctx.beginPath(); ctx.arc(lx, 34, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(245,158,11,0.25)';
    ctx.beginPath(); ctx.arc(lx, 34, 22 + Math.sin(time * 2 + lx) * 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPatienceBar(ctx, x, y, w, frac, vip) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, x, y, w, 9, 4); ctx.fill();
  const col = frac > 0.5 ? COLORS.green : frac > 0.25 ? COLORS.amber : COLORS.red;
  ctx.fillStyle = col;
  rr(ctx, x, y, Math.max(4, w * frac), 9, 4); ctx.fill();
  if (vip) text(ctx, '⭐', x + w + 4, y + 10, 12, '#fff', 'left');
}

function drawTicket(ctx, order, x, y, w, h) {
  const r = order.recipe;
  ctx.fillStyle = order.vip ? '#fef3c7' : '#fffdf5';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = order.vip ? COLORS.gold : '#d6a860';
  ctx.lineWidth = order.vip ? 3 : 2;
  rr(ctx, x, y, w, h, 8); ctx.stroke();
  if (order.vip) text(ctx, '★ VIP ★', x + w / 2, y + 16, 12, '#b45309', 'center');
  text(ctx, r.short, x + 10, y + (order.vip ? 34 : 22), 15, COLORS.ink);
  // components
  r.components.forEach((c, i) => {
    const cx = x + 22 + i * 34;
    const cy = y + (order.vip ? 56 : 46);
    ctx.fillStyle = COMPONENT_COLORS[c];
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    text(ctx, componentEmoji(c), cx, cy + 6, 16, '#000', 'center');
  });
  drawPatienceBar(ctx, x + 10, y + h - 20, w - 20, order.patience / order.patienceMax, false);
  text(ctx, `${r.points} pts`, x + w - 10, y + h - 24, 11, '#92400e', 'right');
}

function drawOrderBoard(ctx, state) {
  const b = LAYOUT.board;
  ctx.fillStyle = '#3f2d1e';
  rr(ctx, b.x, b.y + 34, b.w, b.h - 34, 10); ctx.fill();
  text(ctx, 'PESANAN  •  ORDERS', b.x + 14, b.y + 58, 14, COLORS.gold);
  const maxTickets = state.dayCfg.orders;
  const tw = 168, th = 84, gap = 10;
  const startX = b.x + 170;
  for (let i = 0; i < maxTickets; i++) {
    const x = startX + i * (tw + gap);
    const y = b.y + 40;
    if (i < state.orders.length) {
      drawTicket(ctx, state.orders[i], x, y, tw, th);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      rr(ctx, x, y, tw, th, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([4, 4]);
      rr(ctx, x, y, tw, th, 8); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, '—', x + tw / 2, y + th / 2 + 6, 20, 'rgba(255,255,255,0.4)', 'center');
    }
  }
  if (state.rush) {
    ctx.fillStyle = COLORS.chiliBright;
    rr(ctx, W - 210, b.y + 40, 190, 30, 8); ctx.fill();
    text(ctx, '🔥 RUSH HOUR! 🔥', W - 115, b.y + 61, 15, '#fff', 'center');
  }
}

function drawBins(ctx, state) {
  const p = LAYOUT.prep;
  ctx.fillStyle = COLORS.wood;
  rr(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill();
  ctx.fillStyle = COLORS.woodLight;
  rr(ctx, p.x + 6, p.y + 6, p.w - 12, 20, 6); ctx.fill();
  text(ctx, 'BAHAN  •  INGREDIENTS', p.x + p.w / 2, p.y + 21, 12, '#fff7e6', 'center');
  const cols = 6, rows = 2;
  const cw = p.w / cols, ch = (p.h - 26) / rows;
  BINS.forEach((id, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = p.x + col * cw + cw / 2;
    const cy = p.y + 26 + row * ch + ch / 2;
    ctx.fillStyle = '#fffdf5';
    rr(ctx, cx - 21, cy - 20, 42, 40, 7); ctx.fill();
    ctx.strokeStyle = '#d6a860'; ctx.lineWidth = 1.5;
    rr(ctx, cx - 21, cy - 20, 42, 40, 7); ctx.stroke();
    text(ctx, INGREDIENTS[id].emoji, cx, cy + 2, 20, '#000', 'center');
    text(ctx, INGREDIENTS[id].name, cx, cy + 16, 8, COLORS.ink, 'center');
  });
}

function drawChopBoard(ctx, state) {
  const c = LAYOUT.chop;
  ctx.fillStyle = COLORS.wood;
  rr(ctx, c.x, c.y, c.w, c.h, 10); ctx.fill();
  ctx.fillStyle = '#e8c98f';
  rr(ctx, c.x + 14, c.y + 30, c.w - 28, c.h - 44, 8); ctx.fill();
  text(ctx, 'TALENAN  •  CHOP', c.x + c.w / 2, c.y + 21, 12, '#fff7e6', 'center');
  if (state.chop) {
    const frac = state.chop.progress / state.chop.duration;
    text(ctx, componentEmoji(state.chop.item), c.x + c.w / 2, c.y + 78, 34, '#000', 'center');
    text(ctx, '🔪', c.x + c.w / 2 + 34, c.y + 60 + Math.sin(performance.now() / 60) * 4, 22, '#000', 'center');
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, c.x + 24, c.y + c.h - 24, c.w - 48, 10, 5); ctx.fill();
    ctx.fillStyle = COLORS.teal;
    rr(ctx, c.x + 24, c.y + c.h - 24, (c.w - 48) * frac, 10, 5); ctx.fill();
  } else {
    text(ctx, '🔪', c.x + c.w / 2, c.y + 72, 30, '#000', 'center');
    text(ctx, 'bawa bahan ke sini', c.x + c.w / 2, c.y + 108, 11, '#5b3a1a', 'center');
    text(ctx, 'E = potong', c.x + c.w / 2, c.y + 124, 11, '#5b3a1a', 'center');
  }
}

function drawCookSlot(ctx, x, y, r, slot, kind, time) {
  // kind: 'wok' | 'grill'
  ctx.fillStyle = '#3f2d1e';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (kind === 'wok') {
    ctx.fillStyle = '#374151';
    ctx.beginPath(); ctx.arc(x, y, r - 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(x, y, r - 12, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#57534e';
    ctx.beginPath(); ctx.arc(x, y, r - 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x - r + 10, y + i * 12); ctx.lineTo(x + r - 10, y + i * 12); ctx.stroke();
    }
  }
  if (!slot) {
    text(ctx, kind === 'wok' ? '🍳' : '🍢', x, y + 8, 22, '#000', 'center');
    return;
  }
  const frac = Math.min(1, slot.progress / slot.duration);
  const done = slot.progress >= slot.duration;
  text(ctx, componentEmoji(slot.item), x, y + 8, 26, '#000', 'center');
  // timer ring
  ctx.strokeStyle = done ? COLORS.red : COLORS.gold;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  if (done) {
    text(ctx, '⚠️ HANGUS!', x, y - r - 12, 12, COLORS.red, 'center');
    // smoke
    ctx.fillStyle = 'rgba(100,100,100,0.6)';
    for (let i = 0; i < 3; i++) {
      const sy = y - r - 22 - ((time * 30 + i * 14) % 26);
      ctx.beginPath(); ctx.arc(x - 8 + i * 8 + Math.sin(time * 3 + i) * 3, sy, 5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'grill') {
    // doneness meter: perfect zone in the middle
    const mw = 56;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    rr(ctx, x - mw / 2, y + r + 8, mw, 8, 4); ctx.fill();
    ctx.fillStyle = COLORS.green;
    rr(ctx, x - mw / 2 + mw * 0.35, y + r + 8, mw * 0.3, 8, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - mw / 2 + mw * frac - 1, y + r + 6, 2, 12);
  }
}

function drawStove(ctx, state, time) {
  const s = LAYOUT.stove;
  ctx.fillStyle = COLORS.wood;
  rr(ctx, s.x, s.y, s.w, s.h, 10); ctx.fill();
  ctx.fillStyle = COLORS.tealDark;
  rr(ctx, s.x + 6, s.y + 6, s.w - 12, 20, 6); ctx.fill();
  text(ctx, 'KOMPOR  •  WOK', s.x + s.w / 2, s.y + 21, 12, '#fff7e6', 'center');
  const n = state.wok.length;
  state.wok.forEach((slot, i) => {
    const x = s.x + (i + 0.5) * (s.w / n);
    drawCookSlot(ctx, x, s.y + 82, 42, slot, 'wok', time);
  });
  if (state.wok.some(Boolean)) {
    text(ctx, '♨ sizzle…', s.x + s.w / 2, s.y + s.h - 8, 11, '#fde68a', 'center');
  }
}

function drawGrill(ctx, state, time) {
  const g = LAYOUT.grill;
  ctx.fillStyle = COLORS.wood;
  rr(ctx, g.x, g.y, g.w, g.h, 10); ctx.fill();
  ctx.fillStyle = COLORS.chili;
  rr(ctx, g.x + 6, g.y + 6, g.w - 12, 20, 6); ctx.fill();
  text(ctx, 'PANGGANG  •  GRILL', g.x + g.w / 2, g.y + 21, 12, '#fff7e6', 'center');
  state.grill.forEach((slot, i) => {
    const x = g.x + (i + 0.5) * (g.w / 2);
    drawCookSlot(ctx, x, g.y + 78, 36, slot, 'grill', time);
  });
}

function drawPlate(ctx, x, y, components, highlight) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y, 34, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = highlight ? COLORS.gold : '#cbd5e1';
  ctx.lineWidth = highlight ? 4 : 2;
  ctx.beginPath(); ctx.ellipse(x, y, 34, 14, 0, 0, Math.PI * 2); ctx.stroke();
  components.forEach((c, i) => {
    const cx = x - 18 + i * 18;
    ctx.fillStyle = COMPONENT_COLORS[c];
    ctx.beginPath(); ctx.arc(cx, y - 4, 9, 0, Math.PI * 2); ctx.fill();
    text(ctx, componentEmoji(c), cx, y, 12, '#000', 'center');
  });
}

function drawPlating(ctx, state) {
  const p = LAYOUT.plating;
  ctx.fillStyle = COLORS.wood;
  rr(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill();
  ctx.fillStyle = COLORS.woodLight;
  rr(ctx, p.x + 6, p.y + 6, p.w - 12, 20, 6); ctx.fill();
  text(ctx, 'PIRING  •  PLATE', p.x + p.w / 2, p.y + 21, 12, '#fff7e6', 'center');
  state.plates.forEach((plate, i) => {
    const x = p.x + (i + 0.5) * (p.w / 3);
    drawPlate(ctx, x, p.y + 84, plate, plate.length > 0);
    if (plate.length > 0) {
      text(ctx, `${plate.length} item`, x, p.y + 118, 10, '#fff7e6', 'center');
    }
  });
  text(ctx, 'klik piring = tambah bahan', p.x + p.w / 2, p.y + p.h - 8, 10, '#fde68a', 'center');
}

function drawPass(ctx, state, time) {
  const p = LAYOUT.pass;
  ctx.fillStyle = '#3f2d1e';
  rr(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill();
  ctx.fillStyle = '#fef3c7';
  rr(ctx, p.x + 8, p.y + 8, 150, 26, 6); ctx.fill();
  text(ctx, '🍽️  PASS — SAJIKAN', p.x + 83, p.y + 26, 13, COLORS.ink, 'center');
  // completed plates waiting on the pass
  const ready = state.plates.map((pl, i) => ({ pl, i })).filter(({ pl }) => pl.length > 0);
  ready.forEach(({ pl, i }, k) => {
    const x = p.x + 220 + k * 130;
    const match = state.orders.some((o) => !o.served && o.recipe.components.length === pl.length
      && o.recipe.components.every((c, j) => c === pl[j]));
    if (match) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 5);
      ctx.fillStyle = `rgba(22,163,74,${0.25 + pulse * 0.3})`;
      rr(ctx, x - 52, p.y + 10, 116, 72, 10); ctx.fill();
      text(ctx, 'READY TO SERVE!', x + 6, p.y + 20, 11, '#bbf7d0', 'center');
    }
    drawPlate(ctx, x + 6, p.y + 52, pl, match);
    text(ctx, `piring ${i + 1}`, x + 6, p.y + 82, 10, '#fde68a', 'center');
  });
  if (ready.length === 0) {
    text(ctx, 'Selesaikan hidangan di piring, lalu sajikan di sini (E / klik)', p.x + 240, p.y + 52, 14, '#fde68a');
  }
  if (state.message && state.messageTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    rr(ctx, W / 2 - 260, p.y + 6, 520, 30, 8); ctx.fill();
    text(ctx, state.message, W / 2, p.y + 27, 15, '#fff', 'center');
  }
}

function drawChef(ctx, state, time) {
  const c = state.chef;
  const bob = c.moving ? Math.sin(time * 12) * 3 : 0;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(c.x, c.y + 26, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  // body (apron)
  ctx.fillStyle = '#f8fafc';
  rr(ctx, c.x - 18, c.y - 8 + bob, 36, 34, 10); ctx.fill();
  ctx.fillStyle = COLORS.teal;
  rr(ctx, c.x - 18, c.y + 6 + bob, 36, 20, 8); ctx.fill();
  // head + hat
  ctx.fillStyle = '#fcd9b8';
  ctx.beginPath(); ctx.arc(c.x, c.y - 20 + bob, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(c.x, c.y - 30 + bob, 13, Math.PI, 0); ctx.fill();
  ctx.fillRect(c.x - 13, c.y - 32 + bob, 26, 6);
  // eyes
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.arc(c.x - 5, c.y - 20 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(c.x + 5, c.y - 20 + bob, 2, 0, Math.PI * 2); ctx.fill();
  // held items above head
  state.held.forEach((item, i) => {
    const hx = c.x - (state.held.length - 1) * 14 + i * 28;
    const hy = c.y - 52 + bob;
    ctx.fillStyle = COMPONENT_COLORS[item] || '#fff';
    ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
    text(ctx, componentEmoji(item), hx, hy + 5, 14, '#000', 'center');
  });
}

function drawHUD(ctx, state) {
  const hud = LAYOUT.hud;
  ctx.fillStyle = 'rgba(43,26,14,0.92)';
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  batikTrim(ctx, 0, hud.y, W, 8);
  const t = Math.max(0, Math.ceil(state.timeLeft));
  const mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
  text(ctx, `⏱ ${mm}:${ss}`, 24, hud.y + 48, 28, t <= 30 ? '#fca5a5' : '#fff7e6');
  text(ctx, `HARI ${state.day} / 3`, 170, hud.y + 48, 22, COLORS.gold);
  text(ctx, `⭐ ${state.score}`, 330, hud.y + 48, 24, '#fff7e6');
  text(ctx, `🪙 ${state.coins}`, 480, hud.y + 48, 24, COLORS.gold);
  const combo = state.combo;
  text(ctx, combo > 1 ? `🔥 COMBO x${combo}` : 'combo x1', 620, hud.y + 48, 22, combo > 1 ? '#f97316' : '#d6c9b8');
  text(ctx, `🍽️ disajikan: ${state.servedCount}`, 800, hud.y + 48, 18, '#fff7e6');
  text(ctx, 'WASD gerak • E pakai • klik stasiun • P jeda • M bisu', 1256, hud.y + 28, 12, '#d6c9b8', 'right');
  // held indicator
  text(ctx, 'Dibawa:', 1000, hud.y + 48, 13, '#d6c9b8');
  if (state.held.length === 0) {
    text(ctx, '(kosong)', 1070, hud.y + 48, 13, '#d6c9b8');
  } else {
    state.held.forEach((item, i) => {
      text(ctx, componentEmoji(item), 1070 + i * 28, hud.y + 52, 18, '#000');
    });
  }
}

function drawSteam(ctx, time) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const spots = [[620, 210], [760, 210], [960, 210]];
  spots.forEach(([x, y], k) => {
    for (let i = 0; i < 2; i++) {
      const ph = ((time * 0.4 + k * 0.3 + i * 0.5) % 1);
      const sy = y - ph * 26;
      ctx.globalAlpha = 0.35 * (1 - ph);
      ctx.beginPath(); ctx.arc(x + Math.sin(time * 2 + i * 2) * 5, sy, 4 + ph * 6, 0, Math.PI * 2); ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

export function render(ctx, state, time) {
  drawKitchenShell(ctx, time);
  drawOrderBoard(ctx, state);
  drawBins(ctx, state);
  drawChopBoard(ctx, state);
  drawStove(ctx, state, time);
  drawGrill(ctx, state, time);
  drawPlating(ctx, state);
  drawPass(ctx, state, time);
  drawSteam(ctx, time);
  drawChef(ctx, state, time);
  drawHUD(ctx, state);
}

// ---- Screens ----

function overlay(ctx, alpha = 0.72) {
  ctx.fillStyle = `rgba(20,12,6,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = '#fff7e6';
  rr(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = COLORS.chili;
  ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, 16); ctx.stroke();
  batikTrim(ctx, x + 16, y + 8, w - 32, 10);
}

export function renderTitle(ctx, state, time) {
  render(ctx, state, time);
  overlay(ctx, 0.55);
  panel(ctx, 290, 90, 700, 540);
  text(ctx, '🍜 DAPUR NUSANTARA 🍜', 640, 170, 44, COLORS.chili, 'center');
  text(ctx, 'Restoran Indonesia — masak cepat, sajikan tepat waktu!', 640, 205, 18, COLORS.ink, 'center');
  const lines = [
    '🎯  Sajikan pesanan sebelum kesabaran pelanggan habis.',
    '🥬  Ambil bahan → potong di talenan → masak di wajan / panggang.',
    '🍽️  Rakit hidangan di piring sesuai tiket, sajikan di PASS.',
    '🔥  Combo naik tiap sajian tepat waktu — VIP bayar 2x lipat!',
    '⏰  Shift 180 detik, 3 hari. Di antara shift, beli upgrade.',
    '⌨️  WASD / panah gerak • E pakai • klik stasiun • P jeda • M bisu',
  ];
  lines.forEach((l, i) => text(ctx, l, 640, 250 + i * 34, 17, COLORS.ink, 'center'));
  const pulse = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.fillStyle = `rgba(194,65,12,${0.75 + pulse * 0.25})`;
  rr(ctx, 490, 500, 300, 56, 12); ctx.fill();
  text(ctx, '▶  MULAI MASAK  (Enter / klik)', 640, 536, 20, '#fff', 'center');
  text(ctx, '7 resep asli • wajan & panggangan • rush hour • upgrade antar-shift', 640, 596, 13, '#78716c', 'center');
}

export function renderPaused(ctx, state, time) {
  render(ctx, state, time);
  overlay(ctx, 0.6);
  panel(ctx, 440, 240, 400, 200);
  text(ctx, '⏸  JEDA', 640, 310, 36, COLORS.chili, 'center');
  text(ctx, 'Tekan P / Esc untuk lanjut', 640, 360, 17, COLORS.ink, 'center');
  text(ctx, 'M = bisu • E = pakai stasiun', 640, 392, 15, '#78716c', 'center');
}

export function renderShiftEnd(ctx, state) {
  const s = state.shiftStats;
  overlay(ctx, 0.6);
  panel(ctx, 340, 110, 600, 420);
  text(ctx, `🎉 SHIFT HARI ${state.day} SELESAI!`, 640, 170, 34, COLORS.chili, 'center');
  const rows = [
    ['Hidangan disajikan', `${s.served}`],
    ['Sajian sempurna', `${s.perfect} (${s.perfectRate}%)`],
    ['Combo terbaik', `x${s.bestCombo}`],
    ['Pesanan hangus', `${s.lost}`],
    ['Skor shift', `${s.score}`],
    ['Koin didapat', `🪙 ${s.coinsEarned}   (total 🪙 ${state.coins})`],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, 400, 220 + i * 38, 18, COLORS.ink);
    text(ctx, v, 880, 220 + i * 38, 18, COLORS.chili, 'right');
  });
  ctx.fillStyle = COLORS.teal;
  rr(ctx, 490, 460, 300, 52, 12); ctx.fill();
  text(ctx, 'BELI UPGRADE  →', 640, 494, 20, '#fff', 'center');
}

export function renderUpgrade(ctx, state) {
  overlay(ctx, 0.72);
  panel(ctx, 240, 70, 800, 560);
  text(ctx, '🛒  UPGRADE DAPUR', 640, 140, 34, COLORS.chili, 'center');
  text(ctx, `Koinmu: 🪙 ${state.coins}   •   Pilih SATU upgrade, lalu lanjut ke Hari ${state.day + 1}`, 640, 172, 16, COLORS.ink, 'center');
  const list = UPGRADES.filter((u) => !state.upgradesOwned.includes(u.id));
  list.forEach((u, i) => {
    const y = 200 + i * 62;
    const afford = state.coins >= u.cost;
    ctx.fillStyle = afford ? '#fff' : '#e7e5e4';
    rr(ctx, 280, y, 720, 52, 10); ctx.fill();
    ctx.strokeStyle = afford ? COLORS.teal : '#a8a29e';
    ctx.lineWidth = 2;
    rr(ctx, 280, y, 720, 52, 10); ctx.stroke();
    text(ctx, `${i + 1}. ${u.name}`, 300, y + 32, 18, COLORS.ink);
    text(ctx, u.desc, 560, y + 32, 15, '#57534e');
    text(ctx, `🪙 ${u.cost}`, 960, y + 32, 18, afford ? COLORS.chili : '#a8a29e', 'right');
  });
  if (list.length === 0) text(ctx, 'Semua upgrade sudah dibeli!', 640, 320, 18, COLORS.ink, 'center');
  ctx.fillStyle = COLORS.teal;
  rr(ctx, 490, 560, 300, 50, 12); ctx.fill();
  text(ctx, `LANJUT HARI ${state.day + 1}  →`, 640, 592, 19, '#fff', 'center');
  text(ctx, 'klik upgrade atau tekan 1–5, lalu Enter / klik tombol', 640, 630, 13, '#78716c', 'center');
}

export function renderCampaignEnd(ctx, state) {
  overlay(ctx, 0.72);
  panel(ctx, 340, 130, 600, 420);
  text(ctx, '🏆  KAMPANYE SELESAI!', 640, 200, 36, COLORS.chili, 'center');
  text(ctx, 'Tiga hari penuh di Dapur Nusantara. Terima kasih, Chef!', 640, 240, 17, COLORS.ink, 'center');
  const rows = [
    ['Total skor', `${state.totalScore}`],
    ['Total hidangan', `${state.servedCount}`],
    ['Combo terbaik', `x${state.bestCombo}`],
    ['Upgrade dibeli', `${state.upgradesOwned.length} / ${UPGRADES.length}`],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, 400, 300 + i * 38, 18, COLORS.ink);
    text(ctx, v, 880, 300 + i * 38, 18, COLORS.chili, 'right');
  });
  ctx.fillStyle = COLORS.chili;
  rr(ctx, 490, 470, 300, 52, 12); ctx.fill();
  text(ctx, '↻  MAIN LAGI', 640, 504, 20, '#fff', 'center');
}
