// input.js — keyboard + mouse input (movement, interact, click-to-move/use).
import { LAYOUT, BINS } from './config.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 },
    interactPressed: false, // E or Space edge
    pausePressed: false,
    mutePressed: false,
    anyKey: false,
  };

  function toLogical(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!e.repeat) {
      input.anyKey = true;
      if (k === 'e' || k === ' ') input.interactPressed = true;
      if (k === 'p' || k === 'escape') input.pausePressed = true;
      if (k === 'm') input.mutePressed = true;
    }
    input.keys.add(k);
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = toLogical(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toLogical(e);
    input.mouse.down = true;
    input.mouse.clicked = true;
    input.mouse.clickX = p.x;
    input.mouse.clickY = p.y;
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });

  return input;
}

export function consumeClick(input) {
  if (!input.mouse.clicked) return null;
  input.mouse.clicked = false;
  return { x: input.mouse.clickX, y: input.mouse.clickY };
}

function inside(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

// Which station (and sub-slot) sits at logical point (x, y)?
export function stationAt(x, y) {
  const L = LAYOUT;
  if (inside(x, y, L.prep)) {
    // 6 columns x 2 rows of bins
    const cols = 6, rows = 2;
    const cw = L.prep.w / cols, ch = (L.prep.h - 26) / rows;
    const col = Math.min(cols - 1, Math.floor((x - L.prep.x) / cw));
    const row = Math.min(rows - 1, Math.floor((y - L.prep.y - 26) / ch));
    const bin = BINS[row * cols + col];
    return { station: 'prep', bin, cx: L.prep.x + col * cw + cw / 2, cy: L.prep.y + 26 + row * ch + ch / 2 };
  }
  if (inside(x, y, L.chop)) return { station: 'chop', cx: L.chop.x + L.chop.w / 2, cy: L.chop.y + L.chop.h / 2 };
  if (inside(x, y, L.stove)) {
    const slot = x < L.stove.x + L.stove.w / 2 ? 0 : 1;
    return { station: 'stove', slot, cx: L.stove.x + (slot === 0 ? L.stove.w / 4 : (3 * L.stove.w) / 4), cy: L.stove.y + L.stove.h / 2 };
  }
  if (inside(x, y, L.grill)) {
    const slot = x < L.grill.x + L.grill.w / 2 ? 0 : 1;
    return { station: 'grill', slot, cx: L.grill.x + (slot === 0 ? L.grill.w / 4 : (3 * L.grill.w) / 4), cy: L.grill.y + L.grill.h / 2 };
  }
  if (inside(x, y, L.plating)) {
    const slot = Math.min(2, Math.floor((x - L.plating.x) / (L.plating.w / 3)));
    return { station: 'plating', slot, cx: L.plating.x + slot * (L.plating.w / 3) + L.plating.w / 6, cy: L.plating.y + L.plating.h / 2 };
  }
  if (inside(x, y, L.pass)) return { station: 'pass', cx: x, cy: L.pass.y + L.pass.h / 2 };
  return null;
}

// Chef walk target for a station (a point just below it on the floor).
export function stationWalkTarget(hit) {
  const L = LAYOUT;
  const below = {
    prep: L.prep.y + L.prep.h + 26,
    chop: L.chop.y + L.chop.h + 26,
    stove: L.stove.y + L.stove.h + 26,
    grill: L.grill.y + L.grill.h + 26,
    plating: L.plating.y + L.plating.h + 26,
    pass: L.pass.y + L.pass.h + 18,
  };
  return { x: hit.cx, y: below[hit.station] || 560 };
}
