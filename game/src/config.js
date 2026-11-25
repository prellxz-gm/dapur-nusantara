// config.js — constants, recipes, station layout, colors, timings, upgrades.
// Dapur Nusantara: a warm Indonesian restaurant kitchen game.
export const W = 1280;
export const H = 720;

export const COLORS = {
  wood: '#8a5a2b',
  woodDark: '#6b421e',
  woodLight: '#a9713a',
  teal: '#0f766e',
  tealDark: '#0b4f4a',
  chili: '#c2410c',
  chiliBright: '#ea580c',
  amber: '#f59e0b',
  cream: '#fff7e6',
  rice: '#fff3c4',
  ink: '#2b1a0e',
  board: '#fde68a',
  floor: '#d9a05b',
  wall: '#f7e3c3',
  wallStripe: '#e8b26a',
  batik: '#7c2d12',
  green: '#16a34a',
  red: '#dc2626',
  gold: '#fbbf24',
};

export const INGREDIENTS = {
  rice:    { name: 'Nasi',    color: '#fff8dc', icon: '🍚', emoji: '🍚' },
  chicken: { name: 'Ayam',    color: '#f4a259', icon: '🍗', emoji: '🍗' },
  noodle:  { name: 'Mie',     color: '#fbbf24', icon: '🍜', emoji: '🍜' },
  egg:     { name: 'Telur',   color: '#fde68a', icon: '🥚', emoji: '🥚' },
  veg:     { name: 'Sayur',   color: '#4ade80', icon: '🥬', emoji: '🥬' },
  sauce:   { name: 'Saus',    color: '#dc2626', icon: '🌶️', emoji: '🌶️' },
  broth:   { name: 'Kuah',    color: '#fdba74', icon: '🍲', emoji: '🍲' },
  skewer:  { name: 'Sate',    color: '#b45309', icon: '🍢', emoji: '🍢' },
  peanut:  { name: 'Kacang',  color: '#d97706', icon: '🥜', emoji: '🥜' },
  lontong: { name: 'Lontong', color: '#fef3c7', icon: '🍙', emoji: '🍙' },
  chilli:  { name: 'Cabe',    color: '#ef4444', icon: '🌶️', emoji: '🌶️' },
  tofu:    { name: 'Tahu',    color: '#fef9c3', icon: '🧈', emoji: '🧈' },
};

// Each recipe: id, name, components (ingredient ids in assembly order),
// what each component needs, base points, unlock day-time (seconds into shift).
// prep: 'bin' (take from counter), 'chop' (needs chopping), 'wok' (needs wok),
// 'grill' (needs grill). A component id may need a station step first:
//   e.g. 'chicken' raw from bin -> chop -> 'chickenChopped'; wok turns it cooked.
export const RECIPES = [
  {
    id: 'nasi-ayam',
    name: 'Nasi Ayam Kilat',
    short: 'Nasi Ayam',
    components: ['rice', 'chickenCooked', 'sauce'],
    points: 120,
    unlockAt: 0,
    color: '#f59e0b',
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng Cepat',
    short: 'Mie Goreng',
    components: ['noodleCooked', 'egg', 'vegChopped'],
    points: 110,
    unlockAt: 0,
    color: '#fbbf24',
  },
  {
    id: 'soto-kilat',
    name: 'Soto Kilat',
    short: 'Soto Kilat',
    components: ['broth', 'chickenCooked', 'vegChopped'],
    points: 130,
    unlockAt: 0,
    color: '#fdba74',
  },
  {
    id: 'sate-ayam',
    name: 'Sate Ayam Bakar',
    short: 'Sate Ayam',
    components: ['skewerGrilled', 'peanut', 'lontong'],
    points: 150,
    unlockAt: 60,
    color: '#b45309',
  },
  {
    id: 'ayam-geprek',
    name: 'Ayam Geprek Kilat',
    short: 'Ayam Geprek',
    components: ['chickenCooked', 'chilli', 'sauce'],
    points: 140,
    unlockAt: 60,
    color: '#dc2626',
  },
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng Spesial',
    short: 'Nasi Goreng',
    components: ['rice', 'egg', 'vegChopped', 'sauce'],
    points: 160,
    unlockAt: 120,
    color: '#ea580c',
  },
  {
    id: 'gado-gado',
    name: 'Gado-Gado Nusantara',
    short: 'Gado-Gado',
    components: ['vegChopped', 'tofu', 'peanut'],
    points: 150,
    unlockAt: 120,
    color: '#16a34a',
  },
];

// Station transforms: raw ingredient -> station -> finished component id.
export const TRANSFORMS = {
  chop: { chicken: 'chickenChopped', veg: 'vegChopped' },
  wok: { chickenChopped: 'chickenCooked', noodle: 'noodleCooked', chicken: 'chickenCooked' },
  grill: { skewer: 'skewerGrilled' },
};

// Display names for finished components.
export const COMPONENT_LABELS = {
  rice: 'Nasi', chickenCooked: 'Ayam Masak', sauce: 'Saus',
  noodleCooked: 'Mie Masak', egg: 'Telur', vegChopped: 'Sayur Potong',
  broth: 'Kuah Soto', skewerGrilled: 'Sate Bakar', peanut: 'Saus Kacang',
  lontong: 'Lontong', chilli: 'Cabe Geprek', tofu: 'Tahu',
};

export const COMPONENT_COLORS = {
  rice: '#fff8dc', chickenCooked: '#d97706', sauce: '#dc2626',
  noodleCooked: '#f59e0b', egg: '#fde68a', vegChopped: '#4ade80',
  broth: '#fdba74', skewerGrilled: '#92400e', peanut: '#b45309',
  lontong: '#fef3c7', chilli: '#ef4444', tofu: '#fef9c3',
};

// Bins on the prep counter (raw ingredients the player can grab).
export const BINS = ['rice', 'chicken', 'noodle', 'egg', 'veg', 'sauce', 'broth', 'skewer', 'peanut', 'lontong', 'chilli', 'tofu'];

// Station layout (logical 1280x720). Top board y 0..118, stations y ~150..430,
// plating + pass y ~430..540, floor / chef y ~540..700.
export const LAYOUT = {
  board: { x: 8, y: 8, w: 1264, h: 112 },
  prep:   { x: 16,  y: 150, w: 300, h: 150 },
  chop:   { x: 336, y: 150, w: 180, h: 150 },
  stove:  { x: 536, y: 150, w: 320, h: 150 },
  grill:  { x: 876, y: 150, w: 180, h: 150 },
  plating:{ x: 1076,y: 150, w: 188, h: 150 },
  pass:   { x: 16,  y: 330, w: 1248, h: 92 },
  hud:    { x: 0,   y: 640, w: 1280, h: 80 },
};

export const TIMINGS = {
  shiftSeconds: 180,
  chopSeconds: 2.2,
  wokSeconds: 5.0,
  grillSeconds: 6.0,
  burnAfterSeconds: 4.0,   // food burns this long after its timer finishes
  patienceBase: 55,
  patienceMin: 28,
  orderIntervalBase: 13,   // seconds between new orders, day 1
  orderIntervalMin: 6,
  rushAt: 75,              // rush hour starts 75s into the shift
  rushDuration: 30,
  tipMax: 0.5,             // up to +50% tip for fast service
  vipPatienceScale: 0.6,
  vipPayScale: 2,
};

export const UPGRADES = [
  { id: 'chop',   name: 'Pisau Tajam',     desc: 'Chopping 40% faster', cost: 120 },
  { id: 'wok',    name: 'Wajan Ketiga',    desc: '+1 wok slot (3 total)', cost: 200 },
  { id: 'patience', name: 'Pelayan Ramah', desc: 'Customers wait 25% longer', cost: 150 },
  { id: 'carry',  name: 'Tangan Kedua',    desc: 'Carry 3 items at once', cost: 180 },
  { id: 'coals',  name: 'Arang Dingin',    desc: 'Food burns 50% slower', cost: 140 },
];

export const DAY_CONFIG = [
  { day: 1, orders: 5, vipChance: 0.08, intervalScale: 1.0, patienceScale: 1.0 },
  { day: 2, orders: 6, vipChance: 0.16, intervalScale: 0.85, patienceScale: 0.95 },
  { day: 3, orders: 7, vipChance: 0.25, intervalScale: 0.7, patienceScale: 0.9 },
];

export const CHEF = { speed: 300, radius: 22 };
