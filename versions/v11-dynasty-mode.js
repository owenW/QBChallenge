// ============================================================
// QB CHALLENGE V11 — DYNASTY MODE
// Career saves, WR trust, halftime adjustments, seed challenges,
// milestones, on top of V10's broadcast visuals + V9's gameplay
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 480, H = 780;
canvas.width = W; canvas.height = H;
function resize() {
  const r = W / H, mw = innerWidth, mh = innerHeight;
  let w, h;
  if (mw / mh > r) { h = mh; w = h * r; } else { w = mw; h = w / r; }
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
}
addEventListener('resize', resize); resize();

// ============================================================
// V11: CAREER SAVE SYSTEM
// ============================================================
const Career = {
  data: null,

  load() {
    const saved = localStorage.getItem('qb_career');
    this.data = saved ? JSON.parse(saved) : {
      seasons: 0,
      careerComp: 0,
      careerAtt: 0,
      careerYards: 0,
      careerTD: 0,
      careerINT: 0,
      bestRating: 0,
      bestYards: 0,
      milestones: [],
      unlockedCelebrations: ['basic'],
      unlockedColors: ['default'],
      qbLegacy: 0,
    };
  },

  save() {
    localStorage.setItem('qb_career', JSON.stringify(this.data));
  },

  endSeason(stats) {
    this.data.seasons++;
    this.data.careerComp += stats.completions;
    this.data.careerAtt += stats.attempts;
    this.data.careerYards += stats.yards;
    this.data.careerTD += stats.tds;
    this.data.careerINT += stats.ints;
    this.data.bestRating = Math.max(this.data.bestRating, stats.rating);
    this.data.bestYards = Math.max(this.data.bestYards, stats.yards);
    this.data.qbLegacy = Math.floor(stats.rating * 0.3);
    const newMilestones = this.checkMilestones();
    this.save();
    return newMilestones;
  },

  checkMilestones() {
    const newlyUnlocked = [];
    const checks = [
      { id: 'yards_500', req: () => this.data.careerYards >= 500, reward: 'alt_blue', label: '500 Career Yards', icon: '🏈' },
      { id: 'td_10', req: () => this.data.careerTD >= 10, reward: 'celebration_spike', label: '10 Career TDs', icon: '🎯' },
      { id: 'td_25', req: () => this.data.careerTD >= 25, reward: 'celebration_dance', label: '25 Career TDs', icon: '💃' },
      { id: 'seasons_5', req: () => this.data.seasons >= 5, reward: 'alt_gold', label: '5 Seasons Played', icon: '⭐' },
      { id: 'rating_120', req: () => this.data.bestRating >= 120, reward: 'celebration_griddy', label: 'Rating 120+', icon: '🔥' },
      { id: 'perfect', req: () => this.data.careerINT === 0 && this.data.seasons > 0, reward: 'alt_platinum', label: 'No INTs (career)', icon: '💎' },
    ];
    checks.forEach(m => {
      if (!this.data.milestones.includes(m.id) && m.req()) {
        this.data.milestones.push(m.id);
        if (m.reward.startsWith('alt_')) this.data.unlockedColors.push(m.reward);
        if (m.reward.startsWith('celebration_')) this.data.unlockedCelebrations.push(m.reward);
        newlyUnlocked.push(m);
      }
    });
    return newlyUnlocked;
  },

  getLegacyBonus() {
    return Math.min(this.data.qbLegacy || 0, 15);
  },

  getCareerCompPct() {
    if (this.data.careerAtt === 0) return 0;
    return ((this.data.careerComp / this.data.careerAtt) * 100).toFixed(1);
  },

  getAllMilestones() {
    return [
      { id: 'yards_500', label: '500 Career Yards', icon: '🏈' },
      { id: 'td_10', label: '10 Career TDs', icon: '🎯' },
      { id: 'td_25', label: '25 Career TDs', icon: '💃' },
      { id: 'seasons_5', label: '5 Seasons', icon: '⭐' },
      { id: 'rating_120', label: 'Rating 120+', icon: '🔥' },
      { id: 'perfect', label: 'No INTs', icon: '💎' },
    ];
  }
};

// ============================================================
// V11: SEED-BASED CHALLENGE SYSTEM
// ============================================================
const SeedSystem = {
  currentSeed: null,
  challengeRating: null,
  isChallenge: false,

  generateSeed() {
    const parts = [game.mapSeed || 0, (game.dcOrder || [0,1,2,3]).join(''), game.weatherSeed || 0];
    const raw = parts.join('-');
    let encoded;
    try { encoded = btoa(raw).slice(0, 8).toUpperCase(); } catch(e) { encoded = 'XXXXXXXX'; }
    return 'QB' + encoded.replace(/[^A-Z0-9]/g, 'X');
  },

  applySeed(code) {
    if (!code || code.length < 4) return false;
    try {
      const decoded = atob(code.slice(2).replace(/X/g, '='));
      const parts = decoded.split('-');
      if (parts.length >= 3) {
        game.mapSeed = parseInt(parts[0]) || 0;
        game.dcOrder = parts[1].split('').map(Number);
        game.weatherSeed = parseInt(parts[2]) || 0;
        this.isChallenge = true;
        return true;
      }
    } catch(e) {}
    return false;
  },

  seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }
};

// ============================================================
// NFL BROADCAST COLOR PALETTE
// ============================================================
const COL = {
  grassLight: '#3a8c3a', grassDark: '#2d7a2d', grassHighlight: '#4ca64c',
  fieldLine: '#fff', endzone: '#1e3a5f', endzoneAway: '#8b1a1a',
  offJersey: '#fff', offJerseyDark: '#d8d8d8', offPants: '#1e3a5f', offPantsDark: '#14305a',
  offHelmet: '#f0f0f0', offHelmetDark: '#c8c8c8', offStripe: '#1e3a5f', offAccent: '#1e3a5f',
  offPad: '#e0e0e0', offPadHighlight: '#fff',
  defJersey: '#cc2222', defJerseyDark: '#aa1818', defPants: '#f0f0f0', defPantsDark: '#d4d4d4',
  defHelmet: '#cc2222', defHelmetDark: '#991818', defStripe: '#fff', defAccent: '#cc2222',
  defPad: '#bb2020', defPadHighlight: '#dd4444',
  skin: '#c68642', skinDark: '#a86e30',
  ball: '#8b5e3c', ballLace: '#fff',
  uiBg: 'rgba(15,15,25,0.88)', uiAccent: '#1e90ff', uiRed: '#ee3333', uiGold: '#ffd700',
  uiGreen: '#22cc44', uiYellow: '#ffcc00', uiWhite: '#f0f0f0', uiPurple: '#aa66dd',
  uiPink: '#ff66aa', uiOrange: '#ff8844',
  scoreBug: 'rgba(10,10,20,0.92)', downPill: '#ffcc00', tdFlash: '#fff',
  bulletRed: '#ee3333', touchYellow: '#ffcc00', lobBlue: '#4488ff',
};
const WR_COLORS = ['#4488ff', '#ffcc00', '#44ff88', '#ff66aa'];

// ============================================================
// FIELD COORDINATE SYSTEM
// ============================================================
const FIELD = {
  left: 30, top: 80, width: 420, height: 440,
  toScreen(yard, lane) {
    return {
      x: this.left + (lane / 60) * this.width,
      y: this.top + this.height - (yard / 50) * this.height
    };
  },
  fromScreen(sx, sy) {
    return {
      yard: (1 - (sy - this.top) / this.height) * 50,
      lane: ((sx - this.left) / this.width) * 60
    };
  }
};

// ============================================================
// GAME STATE
// ============================================================
const game = {
  state: 'title', ballYardLine: 5, downs: { current: 1, max: 4 },
  firstDownLine: 25, gotFirstDown: false, score: 0, level: 1, maxLevel: 12,
  animFrame: 0, animTimer: 0, time: 0, stress: 0, gold: 100,
  audiblesLeft: 1, weatherDebuff: 0, scoutReport: false,
  readingPhase: false, readingTimer: 0, weatherType: 'normal',
  playCount: 0, driveYards: 0, drivePlays: 0, highlightTimer: 0,
  scoreAnimTarget: 0, scoreAnimCurrent: 0,
  motionUsed: false, motionResult: null, motionWRIndex: -1,
  passType: 'touch',
  scrambleResult: null,
  tdCelebrationTimer: 0,
  replayActive: false, replayTimer: 0,
  seasonStats: {
    completions: 0, attempts: 0, yards: 0, tds: 0, ints: 0, sacks: 0,
    plays: []
  },
  currentDC: null,
  dcIntroTimer: 0, dcIntroShown: false,
  adaptiveTracker: { wrPicks: [0,0,0,0], routePicks: {} },
  victoryCeremony: false, victoryCeremonyTimer: 0,
  // V11 additions
  wrTrust: [50, 50, 50, 50],
  halftimeShown: false,
  halftimeAdjustment: null,
  mapSeed: 0,
  dcOrder: [0, 1, 2, 3],
  weatherSeed: 0,
  coverageTracker: { zone: 0, man: 0, blitz: 0 },
  newMilestones: [],
  challengeSeedCode: '',
  composureRecoveryBonus: 0,
  filmStudyFloorsLeft: 0,
  playBookExpanded: false,
};

let qb = { accuracy: 70, arm: 60, readSpeed: 0, level: 1 };
let wrs = [
  { id: 0, name: 'ACE', spd: 60, cat: 65, rte: 60, lvl: 1, num: 81 },
  { id: 1, name: 'BLITZ', spd: 55, cat: 60, rte: 65, lvl: 1, num: 88 },
  { id: 2, name: 'FLASH', spd: 65, cat: 55, rte: 55, lvl: 1, num: 13 },
  { id: 3, name: 'TANK', spd: 50, cat: 70, rte: 60, lvl: 1, num: 84 },
];
let relics = [];
const MAX_RELICS = 8;
let defenseBonus = 0;

// ============================================================
// DEFENSIVE COORDINATORS
// ============================================================
const DCs = [
  { name: 'Coach Shield', style: 'zone_heavy', zone: 0.7, man: 0.2, blitz: 0.1, desc: 'Zone specialist', icon: '🛡️' },
  { name: 'Coach Hawk', style: 'man_press', zone: 0.2, man: 0.6, blitz: 0.2, desc: 'Press man coverage', icon: '🦅' },
  { name: 'Coach Blaze', style: 'blitz_happy', zone: 0.15, man: 0.25, blitz: 0.6, desc: 'Blitz every down', icon: '🔥' },
  { name: 'Coach Mind', style: 'adaptive', zone: 0.33, man: 0.33, blitz: 0.34, desc: 'Studies your tendencies', icon: '🧠', adaptive: true },
];

function getCurrentDC() {
  const lvl = game.level;
  if (lvl <= 3) return DCs[0];
  if (lvl <= 6) return DCs[1];
  if (lvl <= 9) return DCs[2];
  return DCs[3];
}

function getDCCoverageWeights() {
  const dc = getCurrentDC();
  let weights = { zone: dc.zone, man: dc.man, blitz: dc.blitz };
  if (dc.adaptive) {
    const maxPick = Math.max(...game.adaptiveTracker.wrPicks);
    const adaptShift = maxPick > 3 ? 0.15 : 0;
    weights = { zone: dc.zone - adaptShift * 0.5, man: dc.man + adaptShift, blitz: dc.blitz + adaptShift * 0.5 };
  }
  // V11: Halftime DC adjustments
  if (game.halftimeShown && game.halftimeAdjustment === 'dc_adjusted') {
    // Already applied in halftime handler
  }
  return weights;
}

// ============================================================
// V11: WR TRUST SYSTEM
// ============================================================
function updateTrust(targetWR, result) {
  game.wrTrust[targetWR] += result === 'complete' ? 8 : 3;
  for (let i = 0; i < 4; i++) {
    if (i !== targetWR) game.wrTrust[i] -= 2;
  }
  game.wrTrust = game.wrTrust.map(t => Math.max(0, Math.min(100, t)));
}

function getTrustStatus(wrIndex) {
  const t = game.wrTrust[wrIndex];
  if (t > 70) return { status: 'clutch', emoji: '🔥', color: '#ff6600', catchMod: 12, wrongRouteChance: 0 };
  if (t >= 40) return { status: 'normal', emoji: '', color: '#888', catchMod: 0, wrongRouteChance: 0 };
  if (t >= 20) return { status: 'cold', emoji: '❄️', color: '#4488ff', catchMod: -8, wrongRouteChance: 0.05 };
  return { status: 'frustrated', emoji: '😤', color: '#ee3333', catchMod: -15, wrongRouteChance: 0.10 };
}

function getTrustCatchMod(wrIndex, isClutchDown) {
  const trust = getTrustStatus(wrIndex);
  if (trust.status === 'clutch' && isClutchDown) return trust.catchMod;
  if (trust.status === 'cold' || trust.status === 'frustrated') return trust.catchMod;
  return 0;
}

// V11: Trust-based commentary
function getTrustCommentary(wrIndex, targetWR) {
  const trust = getTrustStatus(wrIndex);
  if (wrIndex === targetWR) {
    if (trust.status === 'clutch') return `His favorite target again! #${wrs[wrIndex].num} is on fire!`;
    if (trust.status === 'cold') return `That receiver is ice cold — risky throw!`;
    if (trust.status === 'frustrated') return `${wrs[wrIndex].name} looks frustrated out there...`;
  }
  return null;
}

// ============================================================
// COMPOSURE / POISE SYSTEM
// ============================================================
function getComposureLevel() {
  if (game.stress <= 30) return 'cool';
  if (game.stress <= 60) return 'nervous';
  if (game.stress <= 80) return 'shaky';
  return 'tilted';
}
function getComposureAccuracyMod() {
  if (hasRelic('pocket_poise')) return 0;
  const lvl = getComposureLevel();
  if (lvl === 'nervous') return -5;
  if (lvl === 'shaky') return -15;
  if (lvl === 'tilted') return -25;
  return 0;
}
function addStress(amount) {
  let mod = 1;
  if (hasRelic('pocket_poise')) mod *= 0.7;
  game.stress = Math.min(100, Math.max(0, game.stress + amount * mod));
  if (amount > 0) SFX.play('stress_up');
}
function reduceStress(amount) {
  amount += game.composureRecoveryBonus || 0;
  game.stress = Math.max(0, game.stress - amount);
}

// ============================================================
// RELIC DEFINITIONS
// ============================================================
const RELIC_DEFS = [
  { id: 'golden_arm', name: '黄金臂', desc: '深传精准度 +15%', icon: '💪', tier: 'rare' },
  { id: 'route_tree', name: '路线百科', desc: '解锁新路线类型', icon: '📖', tier: 'rare' },
  { id: 'film_study', name: '录像研究', desc: '可看到防守覆盖提示', icon: '📋', tier: 'uncommon' },
  { id: 'quick_release', name: '快速出手', desc: '冲传速度降低20%', icon: '⚡', tier: 'uncommon' },
  { id: 'sticky_gloves', name: '黏手套', desc: '全队接球+8', icon: '🧤', tier: 'common' },
  { id: 'speed_shoes', name: '速度鞋', desc: '全队速度+8', icon: '👟', tier: 'common' },
  { id: 'playbook', name: '战术手册', desc: '精准度+5 臂力+5', icon: '📒', tier: 'common' },
  { id: 'hot_hand', name: '火热手感', desc: '连续成功接球后加成叠加', icon: '🔥', tier: 'rare' },
  { id: 'pocket_poise', name: '口袋沉稳', desc: '心态下精准不降', icon: '🧠', tier: 'uncommon' },
  { id: 'audible_master', name: '变阵大师', desc: '每局额外获得1次变阵', icon: '🎯', tier: 'rare' },
  { id: 'iron_will', name: '钢铁意志', desc: '第4档成功率+20%', icon: '🛡️', tier: 'uncommon' },
  { id: 'scramble', name: '跑动能力', desc: '冲传到达前可小幅移动', icon: '🏃', tier: 'common' },
];
const SYNERGIES = [
  { id: 'juke', name: '晃动能力', desc: '速度+路线大师同一WR', req: (wr) => wr.spd >= 75 && wr.rte >= 75, bonus: { openness: 15 } },
  { id: 'sure_hands', name: '稳接手', desc: '接球+速度同一WR', req: (wr) => wr.cat >= 75 && wr.spd >= 70, bonus: { catchBonus: 10 } },
  { id: 'route_master', name: '路线宗师', desc: '路线+接球同一WR', req: (wr) => wr.rte >= 75 && wr.cat >= 70, bonus: { openness: 10 } },
];
function hasRelic(id) { return relics.some(r => r.id === id); }
function checkSynergies(wrIdx) { return SYNERGIES.filter(s => s.req(wrs[wrIdx])); }

// ============================================================
// MAP SYSTEM — 12-Floor Branching
// ============================================================
let mapData = null;
const NODE_TYPES = {
  play: { name: '进攻', icon: '🏈', color: '#4488ff', desc: '常规进攻回合' },
  elite: { name: '精英', icon: '⚔️', color: '#ee3333', desc: '加强防守,更好奖励' },
  rest: { name: '休息', icon: '💤', color: '#22cc44', desc: '恢复档数/降低心态' },
  shop: { name: '商店', icon: '🏪', color: '#ffd700', desc: '购买升级' },
  event: { name: '事件', icon: '❓', color: '#ff66aa', desc: '随机事件' },
  boss: { name: 'BOSS', icon: '💀', color: '#ee3333', desc: '最终BOSS防守' },
};

function generateMap() {
  const seed = game.mapSeed || Math.floor(Math.random() * 100000);
  game.mapSeed = seed;
  const rng = SeedSystem.seededRandom(seed);

  const floors = [], numFloors = 12;
  for (let f = 0; f < numFloors; f++) {
    const floor = [];
    if (f === 0) { floor.push({ type: 'play', x: W / 2, connections: [] }); }
    else if (f === numFloors - 1) { floor.push({ type: 'boss', x: W / 2, connections: [] }); }
    else {
      const numNodes = 2 + (rng() > 0.6 ? 1 : 0);
      const spacing = W / (numNodes + 1);
      for (let n = 0; n < numNodes; n++) {
        let type;
        const r = rng();
        if (f % 4 === 3) type = r < 0.5 ? 'rest' : 'shop';
        else if (f > 2 && r < 0.15) type = 'elite';
        else if (r < 0.30) type = 'event';
        else if (r < 0.42) type = 'shop';
        else type = 'play';
        floor.push({ type, x: spacing * (n + 1), connections: [] });
      }
    }
    floors.push(floor);
  }
  for (let f = 0; f < floors.length - 1; f++) {
    for (let n = 0; n < floors[f].length; n++) {
      const node = floors[f][n], nextFloor = floors[f + 1];
      if (nextFloor.length === 1) { node.connections.push(0); }
      else {
        const sorted = nextFloor.map((nn, i) => ({ i, dist: Math.abs(nn.x - node.x) })).sort((a, b) => a.dist - b.dist);
        node.connections.push(sorted[0].i);
        if (sorted.length > 1 && rng() > 0.3) node.connections.push(sorted[1].i);
        node.connections = [...new Set(node.connections)];
      }
    }
  }
  mapData = { floors, currentFloor: -1, currentNode: 0, visited: new Set() };
}

// ============================================================
// EVENT SYSTEM
// ============================================================
const EVENTS = [
  { title: '教练指导', desc: '一个老教练在场边画了几个新跑法。选择一名WR提升路线跑动+8。', type: 'choose_wr', effect: (wrIdx) => { wrs[wrIdx].rte += 8; } },
  { title: '大风天', desc: '风太大了！本关所有深传精准度 -12%。', type: 'instant', effect: () => { game.weatherDebuff = 12; } },
  { title: '加练冲刺', desc: '全队加练了冲刺训练。所有WR速度+4。', type: 'instant', effect: () => { wrs.forEach(w => w.spd += 4); } },
  { title: '情报泄露', desc: '有人透露了防守战术。下一关可以看到防守覆盖提示。', type: 'instant', effect: () => { game.scoutReport = true; } },
  { title: '新手套', desc: '捡到了一副好手套。选择一名WR提升接球+10。', type: 'choose_wr', effect: (wrIdx) => { wrs[wrIdx].cat += 10; } },
  { title: '专注训练', desc: 'QB冥想训练了一下。精准度+6。', type: 'instant', effect: () => { qb.accuracy += 6; } },
  { title: '团队默契', desc: '队友之间更有默契了。随机两名WR各项+3。', type: 'instant', effect: () => {
    const a = Math.floor(Math.random() * 4);
    let b; do { b = Math.floor(Math.random() * 4); } while (b === a);
    [a, b].forEach(i => { wrs[i].spd += 3; wrs[i].cat += 3; wrs[i].rte += 3; });
  }},
  { title: '垃圾话', desc: '对面一直在说垃圾话！心态+15。', type: 'instant', effect: () => { addStress(15); } },
  { title: '观众打赏', desc: '围观群众觉得你打得不错，给了50金币。', type: 'instant', effect: () => { game.gold += 50; } },
  { title: '深呼吸', desc: 'QB做了几个深呼吸。心态-15。', type: 'instant', effect: () => { reduceStress(15); } },
];
let currentEvent = null;

// ============================================================
// SHOP SYSTEM
// ============================================================
let shopItems = [];
function generateShop() {
  shopItems = [];
  const pool = [
    { name: 'QB精准+10', cost: 80, apply: () => { qb.accuracy += 10; } },
    { name: 'QB臂力+10', cost: 80, apply: () => { qb.arm += 10; } },
    { name: `${wrs[0].name}速度+12`, cost: 60, apply: () => { wrs[0].spd += 12; } },
    { name: `${wrs[1].name}接球+12`, cost: 60, apply: () => { wrs[1].cat += 12; } },
    { name: `${wrs[2].name}路线+12`, cost: 60, apply: () => { wrs[2].rte += 12; } },
    { name: `${wrs[3].name}全项+6`, cost: 100, apply: () => { wrs[3].spd += 6; wrs[3].cat += 6; wrs[3].rte += 6; } },
    { name: '重置档数', cost: 40, apply: () => { game.downs.current = 1; } },
    { name: '冷静下来', cost: 50, apply: () => { reduceStress(25); } },
  ];
  const availRelics = RELIC_DEFS.filter(r => !hasRelic(r.id) && relics.length < MAX_RELICS);
  if (availRelics.length > 0) {
    const rel = availRelics[Math.floor(Math.random() * availRelics.length)];
    pool.push({ name: rel.name, cost: 120, relicId: rel.id, apply: () => { relics.push(rel); } });
  }
  shopItems = pool.sort(() => Math.random() - 0.5).slice(0, 4);
}

// ============================================================
// FORMATIONS
// ============================================================
function getLOSYard() { return game.ballYardLine; }

const offenseFormations = [
  { name: 'Shotgun Spread', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 30 },
    wrs: [
      { yard: losY, lane: 5, route: 'streak' },
      { yard: losY - 1, lane: 18, route: 'slant' },
      { yard: losY - 1, lane: 42, route: 'out' },
      { yard: losY, lane: 55, route: 'post' },
    ]
  })},
  { name: 'Trips Right', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 25 },
    wrs: [
      { yard: losY, lane: 5, route: 'curl' },
      { yard: losY - 1, lane: 38, route: 'slant' },
      { yard: losY, lane: 46, route: 'out' },
      { yard: losY - 1, lane: 54, route: 'streak' },
    ]
  })},
  { name: 'Trips Left', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 35 },
    wrs: [
      { yard: losY - 1, lane: 6, route: 'streak' },
      { yard: losY, lane: 14, route: 'out' },
      { yard: losY - 1, lane: 22, route: 'slant' },
      { yard: losY, lane: 55, route: 'curl' },
    ]
  })},
  { name: 'Bunch Right', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 25 },
    wrs: [
      { yard: losY, lane: 5, route: 'post' },
      { yard: losY - 1, lane: 40, route: 'flat' },
      { yard: losY, lane: 44, route: 'slant' },
      { yard: losY - 1, lane: 48, route: 'streak' },
    ]
  })},
  { name: 'Empty Spread', getPositions: (losY) => ({
    qb: { yard: losY - 6, lane: 30 },
    wrs: [
      { yard: losY, lane: 4, route: 'streak' },
      { yard: losY - 1, lane: 18, route: 'drag' },
      { yard: losY - 1, lane: 42, route: 'drag' },
      { yard: losY, lane: 56, route: 'streak' },
    ]
  })},
  { name: 'Slot Left', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 32 },
    wrs: [
      { yard: losY, lane: 5, route: 'post' },
      { yard: losY - 1, lane: 18, route: 'slant' },
      { yard: losY - 1, lane: 44, route: 'curl' },
      { yard: losY, lane: 55, route: 'out' },
    ]
  })},
];

const defenseFormations = [
  { name: 'Cover 1', desc: '人盯人+1自由安全卫', coverType: 'man',
    getPositions: (losY) => ({
      rusher: { yard: losY - 8, lane: 30, fast: false },
      dbs: [
        { yard: losY + 5, lane: 10, role: 'man', coverIdx: 0 },
        { yard: losY + 5, lane: 22, role: 'man', coverIdx: 1 },
        { yard: losY + 5, lane: 38, role: 'man', coverIdx: 2 },
        { yard: losY + 8, lane: 50, role: 'free', coverIdx: -1 },
      ]
    })
  },
  { name: 'Cover 2 Zone', desc: '两深区域防守', coverType: 'zone',
    getPositions: (losY) => ({
      rusher: { yard: losY - 8, lane: 30, fast: false },
      dbs: [
        { yard: losY + 12, lane: 15, role: 'deep', coverIdx: -1 },
        { yard: losY + 12, lane: 45, role: 'deep', coverIdx: -1 },
        { yard: losY + 4, lane: 18, role: 'flat', coverIdx: -1 },
        { yard: losY + 4, lane: 42, role: 'flat', coverIdx: -1 },
      ]
    })
  },
  { name: 'Cover 3 Zone', desc: '三深区域防守', coverType: 'zone',
    getPositions: (losY) => ({
      rusher: { yard: losY - 8, lane: 30, fast: false },
      dbs: [
        { yard: losY + 14, lane: 12, role: 'deep', coverIdx: -1 },
        { yard: losY + 15, lane: 30, role: 'deep', coverIdx: -1 },
        { yard: losY + 14, lane: 48, role: 'deep', coverIdx: -1 },
        { yard: losY + 4, lane: 30, role: 'flat', coverIdx: -1 },
      ]
    })
  },
  { name: 'Cover 4', desc: '四深区域防守', coverType: 'zone',
    getPositions: (losY) => ({
      rusher: { yard: losY - 8, lane: 30, fast: false },
      dbs: [
        { yard: losY + 11, lane: 10, role: 'deep', coverIdx: -1 },
        { yard: losY + 11, lane: 24, role: 'deep', coverIdx: -1 },
        { yard: losY + 11, lane: 38, role: 'deep', coverIdx: -1 },
        { yard: losY + 11, lane: 52, role: 'deep', coverIdx: -1 },
      ]
    })
  },
  { name: 'Man Blitz', desc: '全人盯人+快速冲传', coverType: 'blitz',
    getPositions: (losY) => ({
      rusher: { yard: losY - 8, lane: 30, fast: true },
      dbs: [
        { yard: losY + 3, lane: 10, role: 'man', coverIdx: 0 },
        { yard: losY + 3, lane: 22, role: 'man', coverIdx: 1 },
        { yard: losY + 3, lane: 38, role: 'man', coverIdx: 2 },
        { yard: losY + 3, lane: 50, role: 'man', coverIdx: 3 },
      ]
    })
  },
];

const routePaths = {
  streak: (sy, sl) => [{ yard: sy + 20, lane: sl }],
  slant: (sy, sl) => [{ yard: sy + 12, lane: sl + (sl < 30 ? 10 : -10) }],
  out: (sy, sl) => [{ yard: sy + 7, lane: sl }, { yard: sy + 7, lane: sl + (sl < 30 ? -12 : 12) }],
  post: (sy, sl) => [{ yard: sy + 8, lane: sl }, { yard: sy + 20, lane: sl + (sl < 30 ? 8 : -8) }],
  curl: (sy, sl) => [{ yard: sy + 10, lane: sl }, { yard: sy + 8, lane: sl + (sl < 30 ? -2 : 2) }],
  flat: (sy, sl) => [{ yard: sy + 2, lane: sl + (sl < 30 ? -8 : 8) }],
  drag: (sy, sl) => [{ yard: sy + 3, lane: sl + (sl < 30 ? 18 : -18) }],
  corner: (sy, sl) => [{ yard: sy + 7, lane: sl }, { yard: sy + 18, lane: sl + (sl < 30 ? -10 : 10) }],
  hitch: (sy, sl) => [{ yard: sy + 5, lane: sl }, { yard: sy + 4, lane: sl }],
  wheel: (sy, sl) => [{ yard: sy + 2, lane: sl + (sl < 30 ? -4 : 4) }, { yard: sy + 20, lane: sl + (sl < 30 ? -4 : 4) }],
  // V11: Playbook expansion routes
  dig: (sy, sl) => [{ yard: sy + 10, lane: sl }, { yard: sy + 10, lane: sl + (sl < 30 ? 15 : -15) }],
  seam: (sy, sl) => [{ yard: sy + 15, lane: sl + (sl < 30 ? 3 : -3) }],
};

function isDeepRoute(route) { return ['streak', 'post', 'corner', 'wheel', 'seam'].includes(route); }
function isShortRoute(route) { return ['flat', 'drag', 'hitch', 'curl'].includes(route); }

// ============================================================
// V10: LIVE COMMENTARY SYSTEM — V11: Fixed text size
// ============================================================
const Commentary = {
  lines: [],
  templates: {
    presnap_motion_man: ["Motion reveals MAN! Adjust your read.", "DB followed — man coverage confirmed."],
    presnap_motion_zone: ["Zone coverage! That gap is open.", "DB stayed put — zone look."],
    bullet_short: ["Bullet pass — threading the needle!", "Quick release into traffic!"],
    bullet_deep: ["Bullet into double coverage!", "Fastball to the deep zone!"],
    touch_mid: ["Nice touch pass!", "Perfect spiral, right on target!"],
    lob_deep: ["Going deep! High-arcing bomb!", "Risky throw into double coverage!"],
    lob_short: ["Lob to the flat? Interesting choice.", "Floating it underneath..."],
    big_play: ["WHAT A THROW! {yards} yards!", "He launched it! {yards} yard strike!"],
    td: ["TOUCHDOWN! What a drive!", "INTO THE ENDZONE! Six points!"],
    int: ["INTERCEPTED! Too risky!", "Picked off! That's a turnover!"],
    sack: ["SACKED! He held it too long!", "Brought down behind the line!"],
    scramble_success: ["He escapes! Rolls out!", "Dodges the rush! Still alive!"],
    scramble_fail: ["Caught from behind!", "Nowhere to run!"],
    scramble_stand: ["Stands tall in the pocket!", "No panic — delivers under pressure!"],
    incomplete: ["Pass falls incomplete.", "Just out of reach!"],
    first_down: ["First down! Moving the chains!", "That's a new set of downs!"],
    fourth_down: ["4th down... pressure is ON!", "Must convert here!"],
    audible: ["AUDIBLE! Changing the play!", "He sees something — new call!"],
    // V11: Trust commentary
    trust_hot: ["His favorite target again!", "Building chemistry with #{num}!"],
    trust_cold: ["That receiver is ice cold — risky throw!", "Haven't looked his way all game..."],
    trust_building: ["Building trust with #{name}!", "Getting #{name} involved early."],
    halftime_dc: ["The defense made adjustments at halftime!", "Watch out — they studied your tendencies!"],
  },
  generate(key, vars) {
    const pool = this.templates[key];
    if (!pool || pool.length === 0) return;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    this.show(text, 2.5);
    SFX.play('commentary_ding');
  },
  show(text, duration) {
    this.lines.push({ text, alpha: 1, timer: duration || 2, maxTimer: duration || 2 });
  },
  update(dt) {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      l.timer -= dt;
      if (l.timer < 0.5) l.alpha = Math.max(0, l.timer / 0.5);
      if (l.timer <= 0) this.lines.splice(i, 1);
    }
  },
  draw(c) {
    if (this.lines.length === 0) return;
    c.save();
    const baseY = FIELD.top + FIELD.height - 10;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      c.globalAlpha = l.alpha * 0.95;
      // V11 FIX: 14px bold, wider pill
      c.font = 'bold 14px Arial';
      c.textAlign = 'center';
      const tw = c.measureText(l.text).width;
      drawRoundedRect(c, W / 2 - tw / 2 - 14, baseY - 20 - i * 28, tw + 28, 24, 5);
      c.fillStyle = 'rgba(0,0,0,0.8)'; c.fill();
      c.fillStyle = '#000';
      c.fillText(l.text, W / 2 + 1, baseY - 5 - i * 28 + 1);
      c.fillStyle = '#fff';
      c.fillText(l.text, W / 2, baseY - 5 - i * 28);
    }
    c.restore();
  }
};

// ============================================================
// V10: WEATHER PARTICLE SYSTEM
// ============================================================
const Weather = {
  rainDrops: [],
  snowFlakes: [],
  splashes: [],
  footprints: [],

  getWeatherForFloor(floor) {
    if (floor <= 3) return 'day';
    if (floor <= 6) return 'dusk';
    if (floor <= 9) return 'night';
    return 'rain';
  },

  isSnow() {
    return game.level === 12 && currentPlay && currentPlay.isBoss;
  },

  initParticles() {
    this.rainDrops = [];
    this.snowFlakes = [];
    this.splashes = [];
    this.footprints = [];
  },

  update(dt) {
    const weather = this.getWeatherForFloor(game.level);

    if (weather === 'rain') {
      if (this.isSnow()) {
        while (this.snowFlakes.length < 150) {
          this.snowFlakes.push({
            x: Math.random() * W, y: Math.random() * H,
            size: 1 + Math.random() * 3, speed: 20 + Math.random() * 30,
            drift: (Math.random() - 0.5) * 40, alpha: 0.4 + Math.random() * 0.5,
          });
        }
        for (let i = this.snowFlakes.length - 1; i >= 0; i--) {
          const s = this.snowFlakes[i];
          s.y += s.speed * dt; s.x += s.drift * dt + Math.sin(game.time * 2 + i) * 0.5;
          if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
        }
      } else {
        while (this.rainDrops.length < 220) {
          this.rainDrops.push({
            x: Math.random() * W, y: Math.random() * H,
            speed: 480 + Math.random() * 240, length: 8 + Math.random() * 12,
            alpha: 0.15 + Math.random() * 0.25,
          });
        }
        for (let i = this.rainDrops.length - 1; i >= 0; i--) {
          const d = this.rainDrops[i];
          d.y += d.speed * dt; d.x -= d.speed * 0.26 * dt;
          if (d.y > FIELD.top + FIELD.height) {
            if (Math.random() < 0.3) {
              this.splashes.push({ x: d.x, y: d.y, life: 1, maxLife: 0.2 + Math.random() * 0.15 });
            }
            d.y = -10; d.x = Math.random() * W + 100;
          }
          if (d.x < -20) { d.x = W + 10; d.y = Math.random() * H * 0.5; }
        }
        for (let i = this.splashes.length - 1; i >= 0; i--) {
          this.splashes[i].life -= dt / this.splashes[i].maxLife;
          if (this.splashes[i].life <= 0) this.splashes.splice(i, 1);
        }
      }
    } else {
      this.rainDrops = []; this.snowFlakes = []; this.splashes = [];
    }

    for (let i = this.footprints.length - 1; i >= 0; i--) {
      this.footprints[i].life -= dt * 0.3;
      if (this.footprints[i].life <= 0) this.footprints.splice(i, 1);
    }
    if (this.footprints.length > 100) this.footprints.splice(0, 20);
  },

  addFootprint(x, y) {
    if (this.isSnow()) this.footprints.push({ x, y, life: 1 });
  },

  drawWeatherOverlay(c) {
    const weather = this.getWeatherForFloor(game.level);
    if (weather === 'dusk') {
      c.save();
      c.fillStyle = 'rgba(255,140,50,0.08)'; c.fillRect(0, 0, W, H);
      const sg = c.createRadialGradient(W - 30, 20, 5, W - 30, 20, 120);
      sg.addColorStop(0, 'rgba(255,200,80,0.2)');
      sg.addColorStop(0.5, 'rgba(255,160,50,0.08)');
      sg.addColorStop(1, 'rgba(255,140,50,0)');
      c.fillStyle = sg; c.fillRect(W - 150, 0, 150, 150);
      c.restore();
    } else if (weather === 'night') {
      c.save();
      c.fillStyle = 'rgba(10,15,40,0.22)'; c.fillRect(0, 0, W, H);
      const spots = [[FIELD.left, FIELD.top], [FIELD.left + FIELD.width, FIELD.top],
        [FIELD.left, FIELD.top + FIELD.height], [FIELD.left + FIELD.width, FIELD.top + FIELD.height]];
      for (const [sx, sy] of spots) {
        const g = c.createRadialGradient(sx, sy, 0, sx, sy, 280);
        g.addColorStop(0, 'rgba(255,255,220,0.09)');
        g.addColorStop(0.5, 'rgba(255,255,200,0.03)');
        g.addColorStop(1, 'rgba(255,255,200,0)');
        c.fillStyle = g; c.fillRect(sx - 280, sy - 280, 560, 560);
      }
      const lb = c.createRadialGradient(W / 2, -20, 10, W / 2, -20, 300);
      lb.addColorStop(0, 'rgba(255,255,200,0.06)'); lb.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = lb; c.fillRect(0, 0, W, 300);
      c.restore();
    } else if (weather === 'rain') {
      if (this.isSnow()) {
        c.save();
        c.fillStyle = 'rgba(220,225,240,0.06)'; c.fillRect(FIELD.left, FIELD.top, FIELD.width, FIELD.height);
        for (let y = 0; y <= 50; y += 5) {
          const sy = FIELD.top + FIELD.height - (y / 50) * FIELD.height;
          c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 4;
          c.beginPath(); c.moveTo(FIELD.left, sy); c.lineTo(FIELD.left + FIELD.width, sy); c.stroke();
        }
        c.fillStyle = 'rgba(60,80,60,0.25)';
        for (const fp of this.footprints) {
          c.globalAlpha = fp.life * 0.4;
          c.beginPath(); c.ellipse(fp.x, fp.y, 3, 2, 0, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1; c.restore();
      } else {
        c.save();
        c.fillStyle = 'rgba(10,15,30,0.10)'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(0,20,0,0.08)'; c.fillRect(FIELD.left, FIELD.top, FIELD.width, FIELD.height);
        for (let y = 0; y < FIELD.height; y += 22) {
          c.fillStyle = 'rgba(100,140,200,0.03)';
          c.fillRect(FIELD.left, FIELD.top + y, FIELD.width, 3);
        }
        c.restore();
      }
    }
  },

  drawParticles(c) {
    const weather = this.getWeatherForFloor(game.level);
    if (weather !== 'rain') return;
    c.save();
    if (this.isSnow()) {
      for (const s of this.snowFlakes) {
        c.globalAlpha = s.alpha; c.fillStyle = '#fff';
        c.beginPath(); c.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2); c.fill();
      }
    } else {
      for (const d of this.rainDrops) {
        c.globalAlpha = d.alpha; c.strokeStyle = 'rgba(180,200,255,0.5)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - d.length * 0.26, d.y + d.length); c.stroke();
      }
      for (const s of this.splashes) {
        const a = Math.max(0, s.life);
        c.globalAlpha = a * 0.5; c.fillStyle = 'rgba(200,220,255,0.6)';
        const r = (1 - a) * 4 + 1;
        c.beginPath(); c.arc(s.x, s.y, r, 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = 1; c.restore();
  },

  getCatchDebuff() {
    const weather = this.getWeatherForFloor(game.level);
    if (weather !== 'rain') return 0;
    return this.isSnow() ? 8 : 5;
  }
};

// ============================================================
// PARTICLES
// ============================================================
let particles = [];
function addParticle(x, y, type, count) {
  for (let i = 0; i < count; i++) {
    const p = { x, y, type, life: 1, maxLife: 0.5 + Math.random() * 0.8 };
    switch (type) {
      case 'confetti':
        p.vx = (Math.random() - 0.5) * 100; p.vy = -Math.random() * 120 - 30;
        p.size = 2 + Math.random() * 4;
        p.color = [COL.uiGold, COL.uiAccent, COL.uiRed, COL.uiGreen, '#fff'][Math.floor(Math.random() * 5)];
        p.maxLife = 1.5 + Math.random(); p.gravity = 80; break;
      case 'td_burst':
        p.vx = (Math.random() - 0.5) * 120; p.vy = -Math.random() * 140 - 30;
        p.size = 2 + Math.random() * 5;
        p.color = ['#fff', COL.uiGold, COL.uiAccent, COL.uiGreen, COL.uiRed][Math.floor(Math.random() * 5)];
        p.maxLife = 1.5 + Math.random(); p.gravity = 70; break;
      case 'catch_flash':
        p.vx = (Math.random() - 0.5) * 60; p.vy = (Math.random() - 0.5) * 60;
        p.size = 1 + Math.random() * 3; p.color = ['#fff', COL.uiGold, COL.uiAccent][Math.floor(Math.random() * 3)];
        p.maxLife = 0.6 + Math.random() * 0.5; break;
      case 'impact_dust':
        p.vx = (Math.random() - 0.5) * 40; p.vy = -Math.random() * 20 - 5;
        p.size = 1 + Math.random() * 2; p.color = '#864'; p.maxLife = 0.4 + Math.random() * 0.3; break;
      case 'turf_spray':
        p.vx = (Math.random() - 0.5) * 20; p.vy = -Math.random() * 15 - 5;
        p.size = 1.5 + Math.random() * 1.5;
        p.color = Math.random() < 0.6 ? '#3a5' : '#864';
        p.maxLife = 0.3 + Math.random() * 0.2; p.gravity = 40; break;
      case 'td_confetti':
        p.vx = (Math.random() - 0.5) * 180; p.vy = -Math.random() * 200 - 50;
        p.size = 3 + Math.random() * 5;
        p.color = [COL.uiGold, '#fff', COL.uiAccent, COL.uiGreen, COL.uiRed, COL.uiPink][Math.floor(Math.random() * 6)];
        p.maxLife = 2.5 + Math.random(); p.gravity = 60;
        p.rotation = Math.random() * Math.PI * 2; p.rotSpeed = (Math.random() - 0.5) * 8; break;
      case 'scramble_dust':
        p.vx = (Math.random() - 0.5) * 50; p.vy = -Math.random() * 25 - 10;
        p.size = 2 + Math.random() * 2; p.color = '#864'; p.maxLife = 0.5 + Math.random() * 0.3; p.gravity = 30; break;
      case 'firework_ascend':
        p.vx = (Math.random() - 0.5) * 10; p.vy = -200 - Math.random() * 100;
        p.size = 2; p.color = COL.uiGold; p.maxLife = 0.8 + Math.random() * 0.3; p.gravity = -20;
        p.isFirework = true; break;
      case 'firework_burst':
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 80;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        p.size = 1.5 + Math.random() * 2;
        p.color = [COL.uiGold, '#fff', COL.uiRed, COL.uiAccent, COL.uiGreen, COL.uiPink][Math.floor(Math.random() * 6)];
        p.maxLife = 0.6 + Math.random() * 0.4; p.gravity = 50; break;
      case 'victory_confetti':
        p.vx = (Math.random() - 0.5) * 250; p.vy = -Math.random() * 300 - 80;
        p.size = 3 + Math.random() * 6;
        p.color = [COL.uiGold, '#fff', COL.uiAccent, COL.uiGreen, COL.uiRed, COL.uiPink, COL.uiPurple][Math.floor(Math.random() * 7)];
        p.maxLife = 3 + Math.random() * 2; p.gravity = 50;
        p.rotation = Math.random() * Math.PI * 2; p.rotSpeed = (Math.random() - 0.5) * 10; break;
      case 'milestone_sparkle':
        p.vx = (Math.random() - 0.5) * 100; p.vy = -Math.random() * 80 - 20;
        p.size = 2 + Math.random() * 4; p.color = COL.uiGold;
        p.maxLife = 1.5 + Math.random(); p.gravity = 40; break;
      default:
        p.vx = (Math.random() - 0.5) * 30; p.vy = -Math.random() * 30;
        p.size = 1 + Math.random() * 2; p.color = '#fff'; p.maxLife = 0.5 + Math.random() * 0.5;
    }
    particles.push(p);
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt / p.maxLife; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.rotation !== undefined) p.rotation += p.rotSpeed * dt;
    if (p.isFirework && p.life <= 0) {
      addParticle(p.x, p.y, 'firework_burst', 20);
      SFX.play('firework_burst');
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life);
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.color;
    const s = p.size * (0.5 + a * 0.5);
    if (p.type === 'td_confetti' || p.type === 'victory_confetti') {
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.rotation !== undefined) ctx.rotate(p.rotation);
      ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore();
    } else if (p.type === 'firework_burst') {
      ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.ceil(s), Math.ceil(s));
    }
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// SCREEN SHAKE
// ============================================================
let screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
function triggerShake(intensity) { screenShake.intensity = Math.max(screenShake.intensity, intensity); }
function updateShake() {
  if (screenShake.intensity > 0.1) {
    screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.intensity *= screenShake.decay;
  } else { screenShake.x = 0; screenShake.y = 0; screenShake.intensity = 0; }
}

// ============================================================
// DYNAMIC CAMERA SYSTEM
// ============================================================
const Camera = {
  x: 0, y: 0, zoom: 1.0,
  targetX: 0, targetY: 0, targetZoom: 1.0,
  shakeX: 0, shakeY: 0, shakeDecay: 0.9,
  tdPulseTimer: -1,
  update(dt) {
    this.x += (this.targetX - this.x) * 0.08;
    this.y += (this.targetY - this.y) * 0.08;
    this.zoom += (this.targetZoom - this.zoom) * 0.06;
    this.shakeX *= this.shakeDecay; this.shakeY *= this.shakeDecay;
    if (this.tdPulseTimer >= 0) {
      this.tdPulseTimer += dt;
      if (this.tdPulseTimer < 0.5) this.targetZoom = 1.0 + (0.8 - 1.0) * (this.tdPulseTimer / 0.5);
      else if (this.tdPulseTimer < 2.0) this.targetZoom = 0.8 + (1.0 - 0.8) * ((this.tdPulseTimer - 0.5) / 1.5);
      else { this.tdPulseTimer = -1; this.targetZoom = 1.0; }
    }
  },
  shake(intensity) {
    this.shakeX = (Math.random() - 0.5) * intensity;
    this.shakeY = (Math.random() - 0.5) * intensity;
  },
  reset() { this.x = 0; this.y = 0; this.zoom = 1.0; this.targetX = 0; this.targetY = 0; this.targetZoom = 1.0; this.shakeX = 0; this.shakeY = 0; this.tdPulseTimer = -1; },
  setForPhase(phase) {
    switch (phase) {
      case 'reading': case 'presnap': this.targetZoom = 1.0; this.targetX = 0; this.targetY = 0; break;
      case 'motion': this.targetZoom = 1.05; break;
      case 'choosing': this.targetZoom = 1.0; this.targetX = 0; this.targetY = 0; break;
      case 'throw': this.targetZoom = 1.15; break;
      case 'catch': this.targetZoom = 1.25; break;
      case 'td': this.tdPulseTimer = 0; break;
      case 'scramble': this.targetZoom = 1.2; break;
      case 'sack': case 'incomplete': this.shake(8); break;
      case 'replay_wide': this.targetZoom = 0.85; this.targetX = 0; this.targetY = 0; break;
      case 'replay_track': this.targetZoom = 1.2; break;
      case 'replay_tight': this.targetZoom = 1.4; break;
      case 'victory_ceremony': this.targetZoom = 0.7; this.targetX = 0; this.targetY = 0; break;
    }
  },
  beginTransform() {
    ctx.save();
    const focusX = W / 2 + this.x + this.shakeX;
    const focusY = H / 2 + this.y + this.shakeY;
    ctx.translate(focusX, focusY); ctx.scale(this.zoom, this.zoom); ctx.translate(-focusX, -focusY);
  },
  endTransform() { ctx.restore(); }
};

// ============================================================
// TIME SCALE (slow-motion)
// ============================================================
const TimeScale = {
  current: 1, target: 1, transitionTime: 0,
  set(target, duration) { this.target = target; this.transitionTime = duration; },
  update(dt) {
    if (this.transitionTime > 0) { this.transitionTime -= dt; this.current += (this.target - this.current) * 0.1; }
    else { this.current += (this.target - this.current) * 0.15; }
  },
  getDt(dt) { return dt * this.current; }
};

// ============================================================
// V10: DYNAMIC REPLAY DIRECTOR — V11: Fixed auto-dismiss
// ============================================================
const Replay = {
  frames: [], playing: false, frameIdx: 0, timer: 0,
  skipRequested: false, autoPlay: false,
  catchPoint: null, replayZoom: 1.3,
  totalFrames: 0, passTypeUsed: 'touch',
  lobArcPoints: null,

  reset() {
    this.frames = []; this.playing = false; this.frameIdx = 0;
    this.timer = 0; this.skipRequested = false; this.autoPlay = false;
    this.catchPoint = null; this.lobArcPoints = null;
  },

  capture(data) {
    if (!this.playing && this.frames.length < 300) {
      this.frames.push(JSON.parse(JSON.stringify(data)));
    }
  },

  startReplay(catchPt, passType) {
    this.playing = true;
    this.frameIdx = Math.max(0, this.frames.length - 90);
    this.timer = 0; this.skipRequested = false; this.autoPlay = true;
    this.catchPoint = catchPt || null;
    this.totalFrames = this.frames.length - this.frameIdx;
    this.passTypeUsed = passType || 'touch';
    if (this.passTypeUsed === 'lob') this.computeLobArc();
  },

  computeLobArc() {
    this.lobArcPoints = [];
    let throwStart = null, throwEnd = null;
    for (let i = 0; i < this.frames.length; i++) {
      const f = this.frames[i];
      if (f.phase === 'throw' && f.ballPos) {
        if (!throwStart) throwStart = { ...f.ballPos };
        throwEnd = { ...f.ballPos };
      }
    }
    if (throwStart && throwEnd) {
      for (let t = 0; t <= 1; t += 0.05) {
        const yard = throwStart.yard + (throwEnd.yard - throwStart.yard) * t;
        const lane = throwStart.lane + (throwEnd.lane - throwStart.lane) * t;
        const arcHeight = Math.sin(t * Math.PI) * 8;
        this.lobArcPoints.push({ yard: yard + arcHeight, lane });
      }
    }
  },

  getReplayProgress() {
    if (this.totalFrames <= 0) return 0;
    return (this.frameIdx - (this.frames.length - this.totalFrames)) / this.totalFrames;
  },

  getCurrentAngle() {
    const progress = this.getReplayProgress();
    if (progress < 0.3) return 'wide';
    if (progress < 0.6) return 'tracking';
    return 'tight';
  },

  isSlowMoMoment() { return this.getReplayProgress() > 0.85; },

  update(dt) {
    if (!this.playing) return;
    if (this.skipRequested) { this.playing = false; return; }
    this.timer += dt;

    const isSlowMo = this.isSlowMoMoment();
    const advanceRate = isSlowMo ? 0.066 : 0.033;

    if (this.timer > advanceRate) {
      this.timer = 0;
      this.frameIdx = Math.min(this.frameIdx + 1, this.frames.length - 1);
    }

    const angle = this.getCurrentAngle();
    if (angle === 'wide') { Camera.setForPhase('replay_wide'); }
    else if (angle === 'tracking') {
      Camera.setForPhase('replay_track');
      const frame = this.getFrame();
      if (frame && frame.ballPos) {
        const bs = FIELD.toScreen(frame.ballPos.yard, frame.ballPos.lane);
        Camera.targetX = (W / 2 - bs.x) * 0.3; Camera.targetY = (H / 2 - bs.y) * 0.3;
      }
    } else {
      Camera.setForPhase('replay_tight');
      if (this.catchPoint) {
        Camera.targetX = (W / 2 - this.catchPoint.x) * 0.3;
        Camera.targetY = (H / 2 - this.catchPoint.y) * 0.3;
      }
    }

    // V11 FIX: Auto-dismiss after reaching end
    if (this.frameIdx >= this.frames.length - 1) {
      this.timer += dt * 30;
      if (this.timer > 3.5) this.playing = false;
    }
  },

  getFrame() {
    if (this.frameIdx >= 0 && this.frameIdx < this.frames.length) return this.frames[this.frameIdx];
    return null;
  },

  getTrailFrames(count) {
    const trails = [];
    for (let i = 1; i <= count; i++) {
      const idx = this.frameIdx - i * 3;
      if (idx >= 0 && idx < this.frames.length) trails.push(this.frames[idx]);
    }
    return trails;
  },

  drawBanner(c, W) {
    if (!this.playing) return;
    c.save();
    c.fillStyle = '#000'; c.fillRect(0, 0, W, 30); c.fillRect(0, H - 30, W, 30);
    const grad = c.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(200,0,0,0.9)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(200,0,0,0.9)');
    c.fillStyle = grad; c.fillRect(0, 0, W, 28);
    c.fillStyle = '#000'; c.font = 'bold 14px "Arial Black",Arial'; c.textAlign = 'center';
    c.fillText('INSTANT REPLAY', W / 2, 19);
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = '8px Arial';
    c.fillText('TAP TO SKIP', W / 2, H - 12);
    c.globalAlpha = 0.06;
    for (let i = 0; i < 80; i++) {
      const gx = Math.random() * W, gy = Math.random() * H;
      c.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      c.fillRect(gx, gy, 1, 1);
    }
    c.globalAlpha = 1; c.restore();
  },

  drawBallWithTrail(c, frame) {
    if (!frame || !frame.ballPos) return;
    const bs = FIELD.toScreen(frame.ballPos.yard, frame.ballPos.lane);
    const trails = this.getTrailFrames(4);
    const trailOpacities = [0.4, 0.3, 0.2, 0.1];
    for (let i = 0; i < trails.length; i++) {
      if (!trails[i].ballPos) continue;
      const ts = FIELD.toScreen(trails[i].ballPos.yard, trails[i].ballPos.lane);
      c.save(); c.globalAlpha = trailOpacities[i]; c.fillStyle = COL.ball;
      c.beginPath(); c.ellipse(ts.x, ts.y, 5, 3, -0.3, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (this.isSlowMoMoment() && trails.length > 0 && trails[0].ballPos) {
      const prevBs = FIELD.toScreen(trails[0].ballPos.yard, trails[0].ballPos.lane);
      const dx = bs.x - prevBs.x, dy = bs.y - prevBs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const angle = Math.atan2(dy, dx);
        c.save(); c.globalAlpha = 0.6; c.fillStyle = COL.ball;
        c.translate(bs.x, bs.y); c.rotate(angle);
        c.beginPath(); c.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }
    drawBall(bs.x, bs.y);
  },

  drawLobArc(c) {
    if (this.passTypeUsed !== 'lob' || !this.lobArcPoints || this.lobArcPoints.length < 2) return;
    c.save(); c.setLineDash([6, 4]); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < this.lobArcPoints.length; i++) {
      const scr = FIELD.toScreen(this.lobArcPoints[i].yard, this.lobArcPoints[i].lane);
      if (i === 0) c.moveTo(scr.x, scr.y); else c.lineTo(scr.x, scr.y);
    }
    c.stroke(); c.setLineDash([]); c.restore();
  }
};

// ============================================================
// POST-PROCESSING
// ============================================================
let scanlineCanvas = null, vignetteCanvas = null;

function generateScanlines() {
  scanlineCanvas = document.createElement('canvas');
  scanlineCanvas.width = W; scanlineCanvas.height = H;
  const sc = scanlineCanvas.getContext('2d');
  sc.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < H; y += 2) sc.fillRect(0, y, W, 1);
}

function generateVignette() {
  vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = W; vignetteCanvas.height = H;
  const vc = vignetteCanvas.getContext('2d');
  const diag = Math.sqrt(W * W + H * H);
  const g = vc.createRadialGradient(W / 2, H / 2, diag * 0.35, W / 2, H / 2, diag * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  vc.fillStyle = g; vc.fillRect(0, 0, W, H);
}

const PostFX = {
  bloomAlpha: 0, bloomDecay: 0.95, colorShift: 0, grainSeed: 0,
  triggerBloom(alpha) { this.bloomAlpha = alpha; },
  apply(c, w, h) {
    if (!scanlineCanvas) generateScanlines();
    c.drawImage(scanlineCanvas, 0, 0);
    if (!vignetteCanvas) generateVignette();
    const vigAlpha = 0.7 + (Camera.zoom - 1.0) * 0.5;
    c.save(); c.globalAlpha = Math.min(1, vigAlpha); c.drawImage(vignetteCanvas, 0, 0); c.restore();
    if (this.bloomAlpha > 0.01) {
      c.save(); c.fillStyle = `rgba(255,255,255,${this.bloomAlpha * 0.3})`;
      c.fillRect(0, 0, w, h); c.restore(); this.bloomAlpha *= this.bloomDecay;
    }
    this.grainSeed = (this.grainSeed + 1) % 60;
    if (this.grainSeed % 3 === 0) {
      c.save(); c.globalAlpha = 0.03;
      for (let i = 0; i < 40; i++) {
        const gx = Math.random() * w, gy = Math.random() * h;
        c.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'; c.fillRect(gx, gy, 1, 1);
      }
      c.restore();
    }
    if (this.colorShift < -0.05) {
      c.save(); c.fillStyle = `rgba(255,0,0,${Math.abs(this.colorShift) * 0.1})`;
      c.fillRect(0, 0, w, h); c.restore();
    }
  }
};

// ============================================================
// WEB AUDIO
// ============================================================
const SFX = {
  ctx: null, muted: false, crowdNode: null, crowdGain: null,
  rainNode: null, rainGain: null, snowNode: null, snowGain: null,
  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.startCrowd(); } catch (e) { this.muted = true; }
  },
  startCrowd() {
    if (!this.ctx || this.crowdNode) return;
    try {
      const bufLen = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
      this.crowdNode = this.ctx.createBufferSource();
      this.crowdNode.buffer = buf; this.crowdNode.loop = true;
      this.crowdGain = this.ctx.createGain(); this.crowdGain.gain.value = 0.015;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 400;
      this.crowdNode.connect(filt); filt.connect(this.crowdGain);
      this.crowdGain.connect(this.ctx.destination); this.crowdNode.start();
    } catch (e) {}
  },
  startRainSound() {
    if (!this.ctx || this.rainNode) return;
    try {
      const bufLen = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      this.rainNode = this.ctx.createBufferSource();
      this.rainNode.buffer = buf; this.rainNode.loop = true;
      this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2000;
      this.rainNode.connect(filt); filt.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination); this.rainNode.start();
    } catch (e) {}
  },
  startSnowSound() {
    if (!this.ctx || this.snowNode) return;
    try {
      const bufLen = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
      this.snowNode = this.ctx.createBufferSource();
      this.snowNode.buffer = buf; this.snowNode.loop = true;
      this.snowGain = this.ctx.createGain(); this.snowGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
      this.snowNode.connect(filt); filt.connect(this.snowGain);
      this.snowGain.connect(this.ctx.destination); this.snowNode.start();
    } catch (e) {}
  },
  updateWeatherSounds() {
    const weather = Weather.getWeatherForFloor(game.level);
    if (weather === 'rain' && !Weather.isSnow()) {
      if (!this.rainNode) this.startRainSound();
      if (this.rainGain) this.rainGain.gain.setTargetAtTime(0.02, this.ctx.currentTime, 0.5);
      if (this.snowGain) this.snowGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    } else if (weather === 'rain' && Weather.isSnow()) {
      if (!this.snowNode) this.startSnowSound();
      if (this.snowGain) this.snowGain.gain.setTargetAtTime(0.015, this.ctx.currentTime, 0.5);
      if (this.rainGain) this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    } else {
      if (this.rainGain) this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      if (this.snowGain) this.snowGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }
  },
  crowdSwell(level) {
    if (this.crowdGain) {
      const tension = (game.ballYardLine / 50) * 0.3 + (game.downs.current >= 3 ? 0.2 : 0);
      this.crowdGain.gain.setTargetAtTime(0.015 + (level + tension) * 0.04, this.ctx.currentTime, 0.3);
    }
  },
  play(name) {
    if (this.muted) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime, ac = this.ctx;
      switch (name) {
        case 'snap': {
          const pa = ac.createOscillator(), pg = ac.createGain();
          pa.connect(pg); pg.connect(ac.destination);
          pa.frequency.value = 1000; pa.type = 'sine'; pg.gain.value = 0.04;
          pg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          pa.start(t); pa.stop(t + 0.08);
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 800; o.type = 'square';
          g.gain.setValueAtTime(0.1, t + 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          o.start(t + 0.1); o.stop(t + 0.16); break;
        }
        case 'throw': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(600, t + 0.2);
          o.type = 'sine'; g.gain.value = 0.06;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          o.start(t); o.stop(t + 0.25);
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.2);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bl) * 0.1;
          buf.buffer = buffer;
          const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000;
          buf.connect(f); f.connect(ac.destination); buf.start(t); break;
        }
        case 'bullet_throw': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(900, t + 0.08);
          o.type = 'sawtooth'; g.gain.value = 0.1;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.start(t); o.stop(t + 0.12);
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.08);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bl) * 0.15;
          buf.buffer = buffer; buf.connect(ac.destination); buf.start(t); break;
        }
        case 'lob_throw': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(120, t); o.frequency.linearRampToValueAtTime(350, t + 0.4);
          o.type = 'sine'; g.gain.value = 0.05;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          o.start(t); o.stop(t + 0.5);
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.4);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / bl * Math.PI) * 0.06;
          buf.buffer = buffer;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
          buf.connect(f); f.connect(ac.destination); buf.start(t); break;
        }
        case 'motion_slide': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(700, t + 0.3);
          o.type = 'sine'; g.gain.value = 0.04;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          o.start(t); o.stop(t + 0.35); break;
        }
        case 'scramble_dodge': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
          o.type = 'triangle'; g.gain.value = 0.15;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o.start(t); o.stop(t + 0.18);
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.05);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bl) * 0.2;
          buf.buffer = buffer; buf.connect(ac.destination); buf.start(t); break;
        }
        case 'sack_impact': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
          o.type = 'triangle'; g.gain.value = 0.18;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          o.start(t); o.stop(t + 0.4);
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.15);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bl) * 0.25;
          buf.buffer = buffer; buf.connect(ac.destination); buf.start(t);
          this.crowdSwell(-0.5); break;
        }
        case 'dc_intro': {
          [165, 220, 330].forEach((freq, i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.frequency.value = freq; o.type = 'triangle';
            g.gain.setValueAtTime(0.06, t + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.8);
            o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.8);
          }); break;
        }
        case 'catch': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 150; o.type = 'triangle';
          g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.start(t); o.stop(t + 0.12);
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.05);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bl) * 0.2;
          buf.buffer = buffer; buf.connect(ac.destination); buf.start(t);
          this.crowdSwell(0.5); break;
        }
        case 'miss': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(100, t + 0.4);
          o.type = 'sawtooth'; g.gain.value = 0.03;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          o.start(t); o.stop(t + 0.5); this.crowdSwell(-0.3); break;
        }
        case 'td': {
          [220, 330, 440].forEach((freq) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.frequency.value = freq; o.type = 'square';
            g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o.start(t); o.stop(t + 0.5);
          });
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 1.5);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) {
            const env = Math.min(1, i / (bl * 0.1)) * Math.max(0, 1 - i / bl);
            d[i] = (Math.random() * 2 - 1) * env * 0.2;
          }
          buf.buffer = buffer;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
          buf.connect(f); f.connect(ac.destination); buf.start(t);
          this.crowdSwell(1); break;
        }
        case 'whistle': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 2800; o.type = 'sine'; g.gain.setValueAtTime(0.05, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          o.start(t); o.stop(t + 0.4); break;
        }
        case 'click': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 700; o.type = 'sine'; g.gain.value = 0.03;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          o.start(t); o.stop(t + 0.04); break;
        }
        case 'audible': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 600; o.type = 'sine'; g.gain.value = 0.05;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          o.start(t); o.stop(t + 0.1);
          const o2 = ac.createOscillator(), g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = 750; o2.type = 'sine'; g2.gain.value = 0.05;
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          o2.start(t + 0.1); o2.stop(t + 0.2); break;
        }
        case 'audible_hut': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(350, t + 0.05);
          o.frequency.linearRampToValueAtTime(150, t + 0.15);
          o.type = 'triangle'; g.gain.value = 0.12;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          o.start(t); o.stop(t + 0.2);
          const o3 = ac.createOscillator(), g3 = ac.createGain();
          o3.connect(g3); g3.connect(ac.destination);
          o3.frequency.setValueAtTime(220, t + 0.25); o3.frequency.linearRampToValueAtTime(380, t + 0.3);
          o3.frequency.linearRampToValueAtTime(160, t + 0.4);
          o3.type = 'triangle'; g3.gain.setValueAtTime(0.12, t + 0.25);
          g3.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
          o3.start(t + 0.25); o3.stop(t + 0.45); break;
        }
        case 'commentary_ding': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 1200; o.type = 'sine'; g.gain.value = 0.04;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          o.start(t); o.stop(t + 0.15); break;
        }
        case 'firework_ascend': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(2000, t + 0.6);
          o.type = 'sine'; g.gain.value = 0.03;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
          o.start(t); o.stop(t + 0.7); break;
        }
        case 'firework_burst': {
          const buf = ac.createBufferSource();
          const bl = Math.ceil(ac.sampleRate * 0.15);
          const buffer = ac.createBuffer(1, bl, ac.sampleRate);
          const d = buffer.getChannelData(0);
          for (let i = 0; i < bl; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bl) * 0.15;
          buf.buffer = buffer; buf.connect(ac.destination); buf.start(t); break;
        }
        case 'level_up': {
          [330, 415, 495, 660].forEach((freq, i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.frequency.value = freq; o.type = 'sine'; g.gain.value = 0.05;
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15 * i + 0.25);
            o.start(t + 0.15 * i); o.stop(t + 0.15 * i + 0.25);
          }); break;
        }
        case 'gameover': {
          [300, 260, 220, 160].forEach((freq, i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.frequency.value = freq; o.type = 'triangle'; g.gain.value = 0.06;
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2 * i + 0.3);
            o.start(t + 0.2 * i); o.stop(t + 0.2 * i + 0.3);
          }); break;
        }
        case 'stress_up': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(100, t); o.frequency.linearRampToValueAtTime(60, t + 0.2);
          o.type = 'triangle'; g.gain.value = 0.05;
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          o.start(t); o.stop(t + 0.25); break;
        }
        case 'champion': {
          [262, 330, 392, 523, 659, 784].forEach((freq, i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.frequency.value = freq; o.type = 'square';
            g.gain.setValueAtTime(0.04, t + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
            o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.5);
          }); break;
        }
        case 'milestone': {
          [523, 659, 784, 1047].forEach((freq, i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.frequency.value = freq; o.type = 'sine';
            g.gain.setValueAtTime(0.06, t + i * 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
            o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.4);
          }); break;
        }
        case 'halftime_whistle': {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 2200; o.type = 'sine'; g.gain.setValueAtTime(0.08, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
          o.start(t); o.stop(t + 0.8);
          const o2 = ac.createOscillator(), g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = 2200; o2.type = 'sine';
          g2.gain.setValueAtTime(0.08, t + 0.3);
          g2.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
          o2.start(t + 0.3); o2.stop(t + 1.1); break;
        }
      }
    } catch (e) {}
  }
};

// ============================================================
// SPRITE SYSTEM — 48x60 with gradient shading, keyframe animation
// ============================================================
class SpriteSystem {
  constructor() { this.sheets = {}; this.frameW = 48; this.frameH = 60; this.ready = false; }

  generateAll(onProgress) {
    const teams = ['offense', 'defense'];
    const actions = ['idle', 'run', 'throw', 'catch', 'celebrate'];
    const FC = { idle: 4, run: 8, throw: 6, catch: 4, celebrate: 4 };
    let total = 0, done = 0;
    for (const team of teams) { for (const action of actions) total++; }
    const offNums = [7, 81, 84, 13, 88];
    const defNums = [21, 24, 32, 45, 99];
    total += (offNums.length + defNums.length) * actions.length;

    for (const team of teams) {
      for (const action of actions) {
        const nf = FC[action];
        const c = document.createElement('canvas');
        c.width = this.frameW * nf; c.height = this.frameH;
        const sx = c.getContext('2d');
        for (let f = 0; f < nf; f++) this.drawPlayerFrame(sx, f * this.frameW, 0, team, action, f, nf, '88', false);
        this.sheets[`${team}_${action}`] = c;
        done++; if (onProgress) onProgress(done / total, `${team} ${action}`);
      }
    }
    for (const num of offNums) {
      for (const action of actions) {
        const nf = FC[action];
        const c = document.createElement('canvas');
        c.width = this.frameW * nf; c.height = this.frameH;
        const sx = c.getContext('2d');
        for (let f = 0; f < nf; f++) this.drawPlayerFrame(sx, f * this.frameW, 0, 'offense', action, f, nf, String(num), num === 7);
        this.sheets[`offense_${action}_${num}`] = c;
        done++; if (onProgress) onProgress(done / total, `OFF #${num} ${action}`);
      }
    }
    for (const num of defNums) {
      for (const action of actions) {
        const nf = FC[action];
        const c = document.createElement('canvas');
        c.width = this.frameW * nf; c.height = this.frameH;
        const sx = c.getContext('2d');
        for (let f = 0; f < nf; f++) this.drawPlayerFrame(sx, f * this.frameW, 0, 'defense', action, f, nf, String(num), false);
        this.sheets[`defense_${action}_${num}`] = c;
        done++; if (onProgress) onProgress(done / total, `DEF #${num} ${action}`);
      }
    }
    this.ready = true;
  }

  drawPlayerFrame(c, ox, oy, team, action, frame, totalFrames, number, isQB) {
    const cx = ox + 24, cy = oy + 48;
    const phase = frame / totalFrames;
    const isOff = team === 'offense';
    const jc = isOff ? COL.offJersey : COL.defJersey;
    const jd = isOff ? COL.offJerseyDark : COL.defJerseyDark;
    const pc = isOff ? COL.offPants : COL.defPants;
    const pd = isOff ? COL.offPantsDark : COL.defPantsDark;
    const hc = isOff ? COL.offHelmet : COL.defHelmet;
    const hdk = isOff ? COL.offHelmetDark : COL.defHelmetDark;
    const hs = isOff ? COL.offStripe : COL.defStripe;
    const padc = isOff ? COL.offPad : COL.defPad;
    const padh = isOff ? COL.offPadHighlight : COL.defPadHighlight;
    const nc = isOff ? COL.offAccent : '#fff';
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(cx, cy + 4, 14, 5, 0, 0, Math.PI * 2); c.fill();
    const legSwing = action === 'run' ? Math.sin(phase * Math.PI * 2) * 8 : action === 'celebrate' ? Math.sin(phase * Math.PI * 4) * 3 : 0;
    const kneeKick = action === 'run' ? Math.abs(Math.sin(phase * Math.PI * 2)) * 4 : 0;
    const bodyLean = action === 'run' ? (frame === 1 || frame === 5 ? 0.05 : 0) : 0;
    const bobY = action === 'run' ? Math.abs(Math.sin(phase * Math.PI * 2)) * 1.5 : action === 'idle' ? Math.sin(phase * Math.PI * 2) * 0.5 : 0;
    if (bodyLean !== 0) { c.translate(cx, cy); c.rotate(bodyLean); c.translate(-cx, -cy); }
    // Legs
    c.strokeStyle = pc; c.lineWidth = 5.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 5, cy - 16 + bobY);
    c.quadraticCurveTo(cx - 5 + legSwing * 0.5, cy - 9 - kneeKick + bobY, cx - 5 + legSwing, cy - 2 + bobY); c.stroke();
    c.strokeStyle = pd; c.lineWidth = 2; c.globalAlpha = 0.3;
    c.beginPath(); c.moveTo(cx - 7, cy - 15 + bobY); c.lineTo(cx - 7 + legSwing * 0.5, cy - 9 + bobY); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = pc; c.lineWidth = 5.5;
    c.beginPath(); c.moveTo(cx + 5, cy - 16 + bobY);
    c.quadraticCurveTo(cx + 5 - legSwing * 0.5, cy - 9 - kneeKick + bobY, cx + 5 - legSwing, cy - 2 + bobY); c.stroke();
    c.strokeStyle = pd; c.lineWidth = 2; c.globalAlpha = 0.3;
    c.beginPath(); c.moveTo(cx + 3, cy - 15 + bobY); c.lineTo(cx + 3 - legSwing * 0.5, cy - 9 + bobY); c.stroke(); c.globalAlpha = 1;
    // Cleats
    c.fillStyle = '#1a1a1a';
    c.fillRect(cx - 8 + legSwing - 1, cy - 3 + bobY, 7, 3);
    c.fillRect(cx + 3 - legSwing - 1, cy - 3 + bobY, 7, 3);
    c.fillStyle = '#444';
    for (let s = 0; s < 3; s++) {
      c.fillRect(cx - 7 + legSwing + s * 2, cy + bobY, 1, 1);
      c.fillRect(cx + 4 - legSwing + s * 2, cy + bobY, 1, 1);
    }
    // Jersey
    const jerseyGrad = c.createLinearGradient(cx - 12, cy - 16, cx + 12, cy - 16);
    jerseyGrad.addColorStop(0, jd); jerseyGrad.addColorStop(0.3, jc);
    jerseyGrad.addColorStop(0.7, jc); jerseyGrad.addColorStop(1, jd);
    c.fillStyle = jerseyGrad;
    c.beginPath(); c.moveTo(cx - 12, cy - 16 + bobY); c.lineTo(cx - 14, cy - 30 + bobY);
    c.lineTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 12, cy - 16 + bobY); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(cx - 12, cy - 16 + bobY); c.lineTo(cx - 14, cy - 30 + bobY);
    c.lineTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 12, cy - 16 + bobY); c.closePath(); c.stroke();
    // Jersey number
    c.save(); c.fillStyle = nc;
    if (isQB) { c.strokeStyle = COL.uiGold; c.lineWidth = 1.5;
      c.font = 'bold 12px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.strokeText(number, cx, cy - 22 + bobY); }
    c.font = 'bold 11px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(number, cx, cy - 22 + bobY); c.restore();
    // Shoulder pads
    c.fillStyle = padc;
    c.beginPath(); c.moveTo(cx - 16, cy - 30 + bobY); c.lineTo(cx - 14, cy - 34 + bobY);
    c.lineTo(cx + 14, cy - 34 + bobY); c.lineTo(cx + 16, cy - 30 + bobY); c.closePath(); c.fill();
    c.strokeStyle = padh; c.lineWidth = 1; c.globalAlpha = 0.6;
    c.beginPath(); c.moveTo(cx - 13, cy - 34 + bobY); c.lineTo(cx + 13, cy - 34 + bobY); c.stroke(); c.globalAlpha = 1;
    // Arms
    c.lineCap = 'round';
    if (action === 'throw') {
      if (frame === 0) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 18, cy - 36 + bobY); c.stroke();
        c.strokeStyle = COL.skin; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx + 18, cy - 36 + bobY); c.lineTo(cx + 20, cy - 39 + bobY); c.stroke();
        this.drawBallInHand(c, cx + 20, cy - 41 + bobY);
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 16, cy - 22 + bobY); c.stroke();
      } else if (frame === 1) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 18, cy - 43 + bobY); c.stroke();
        c.strokeStyle = COL.skin; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx + 18, cy - 43 + bobY); c.lineTo(cx + 19, cy - 46 + bobY); c.stroke();
        this.drawBallInHand(c, cx + 19, cy - 47 + bobY);
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 18, cy - 35 + bobY); c.stroke();
      } else if (frame === 2) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 20, cy - 44 + bobY); c.stroke();
        c.strokeStyle = COL.skin; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx + 20, cy - 44 + bobY); c.lineTo(cx + 22, cy - 46 + bobY); c.stroke();
        this.drawBallInHand(c, cx + 22, cy - 47 + bobY);
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 20, cy - 36 + bobY); c.stroke();
      } else if (frame === 3) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 22, cy - 34 + bobY); c.stroke();
        c.strokeStyle = COL.skin; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx + 22, cy - 34 + bobY); c.lineTo(cx + 26, cy - 32 + bobY); c.stroke();
        this.drawBallInHand(c, cx + 27, cy - 32 + bobY);
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 16, cy - 24 + bobY); c.stroke();
      } else if (frame === 4) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 24, cy - 30 + bobY); c.stroke();
        c.strokeStyle = COL.skin; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx + 24, cy - 30 + bobY); c.lineTo(cx + 28, cy - 28 + bobY); c.stroke();
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 15, cy - 23 + bobY); c.stroke();
      } else {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 18, cy - 22 + bobY); c.stroke();
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 14, cy - 23 + bobY); c.stroke();
      }
    } else if (action === 'catch') {
      if (frame === 0) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 18, cy - 35 + bobY); c.stroke();
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 18, cy - 35 + bobY); c.stroke();
      } else if (frame === 1) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 22, cy - 38 + bobY); c.stroke();
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 22, cy - 38 + bobY); c.stroke();
        c.fillStyle = COL.skin;
        c.beginPath(); c.arc(cx - 23, cy - 39 + bobY, 3, 0, Math.PI * 2); c.arc(cx + 23, cy - 39 + bobY, 3, 0, Math.PI * 2); c.fill();
      } else if (frame === 2) {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 19, cy - 38 + bobY); c.stroke();
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 19, cy - 38 + bobY); c.stroke();
        c.fillStyle = COL.skin;
        c.beginPath(); c.arc(cx - 20, cy - 39 + bobY, 3, 0, Math.PI * 2); c.arc(cx + 20, cy - 39 + bobY, 3, 0, Math.PI * 2); c.fill();
        this.drawBallInHand(c, cx, cy - 40 + bobY);
      } else {
        c.strokeStyle = jc; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 11, cy - 22 + bobY); c.stroke();
        c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 12, cy - 22 + bobY); c.stroke();
        this.drawBallInHand(c, cx + 5, cy - 23 + bobY);
      }
    } else if (action === 'celebrate') {
      const cp = phase * Math.PI * 2, armUp = Math.sin(cp) * 8;
      c.strokeStyle = jc; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 19, cy - 42 - armUp + bobY); c.stroke();
      c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 19, cy - 42 + armUp + bobY); c.stroke();
      c.fillStyle = COL.skin;
      c.beginPath(); c.arc(cx - 20, cy - 43 - armUp + bobY, 2.5, 0, Math.PI * 2); c.arc(cx + 20, cy - 43 + armUp + bobY, 2.5, 0, Math.PI * 2); c.fill();
    } else {
      const armSwing = action === 'run' ? Math.sin(phase * Math.PI * 2) * 5 : Math.sin(phase * Math.PI * 2) * 1;
      c.strokeStyle = jc; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(cx - 14, cy - 30 + bobY); c.lineTo(cx - 16, cy - 22 + armSwing + bobY); c.stroke();
      c.beginPath(); c.moveTo(cx + 14, cy - 30 + bobY); c.lineTo(cx + 16, cy - 22 - armSwing + bobY); c.stroke();
      c.fillStyle = COL.skin;
      c.beginPath(); c.arc(cx - 17, cy - 21 + armSwing + bobY, 2, 0, Math.PI * 2); c.arc(cx + 17, cy - 21 - armSwing + bobY, 2, 0, Math.PI * 2); c.fill();
    }
    // Neck
    c.fillStyle = COL.skin; c.fillRect(cx - 3, cy - 36 + bobY, 6, 4);
    // Helmet
    const hx = cx, hy = cy - 40 + bobY;
    const helmGrad = c.createRadialGradient(hx - 2, hy - 3, 2, hx, hy, 10);
    helmGrad.addColorStop(0, isOff ? '#fff' : '#ee4444');
    helmGrad.addColorStop(0.6, hc); helmGrad.addColorStop(1, hdk);
    c.fillStyle = helmGrad;
    c.beginPath(); c.arc(hx, hy, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = hdk; c.globalAlpha = 0.3;
    c.beginPath(); c.arc(hx, hy + 2, 8, 0, Math.PI); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(hx, hy, 10, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = hs; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(hx, hy - 10); c.lineTo(hx, hy + 7); c.stroke();
    c.strokeStyle = '#999'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(hx - 6, hy - 2); c.lineTo(hx - 10, hy); c.lineTo(hx - 10, hy + 4); c.lineTo(hx - 6, hy + 5); c.stroke();
    c.beginPath(); c.moveTo(hx - 6, hy + 1); c.lineTo(hx - 10, hy + 2); c.stroke();
    c.beginPath(); c.moveTo(hx - 6, hy + 3.5); c.lineTo(hx - 10, hy + 3.5); c.stroke();
    c.fillStyle = COL.skin; c.fillRect(hx - 7, hy - 3, 5, 7);
    c.fillStyle = '#222'; c.fillRect(hx - 5, hy - 1, 1.5, 1.5);
    if (isQB) { c.strokeStyle = COL.uiGold; c.lineWidth = 1;
      c.beginPath(); c.moveTo(hx - 7, hy + 5); c.quadraticCurveTo(hx, hy + 9, hx + 7, hy + 5); c.stroke(); }
    c.restore();
  }

  drawBallInHand(c, x, y) {
    c.save(); c.fillStyle = COL.ball;
    c.beginPath(); c.ellipse(x, y, 4.5, 2.8, -0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = COL.ballLace; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(x - 2, y - 0.5); c.lineTo(x + 2, y - 0.5); c.stroke();
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 1.5, y - 1.2); c.lineTo(x + i * 1.5, y + 0.2); c.stroke(); }
    c.restore();
  }

  getSheet(t, a, n) {
    if (n !== undefined) { const k = `${t}_${a}_${n}`; if (this.sheets[k]) return this.sheets[k]; }
    return this.sheets[`${t}_${a}`];
  }

  drawSprite(c, x, y, t, a, dir, frame, n, s) {
    const sheet = this.getSheet(t, a, n); if (!sheet) return;
    const FC = { idle: 4, run: 8, throw: 6, catch: 4, celebrate: 4 };
    const nf = FC[a] || 4; const f = Math.abs(frame) % nf; s = s || 1;
    c.drawImage(sheet, f * this.frameW, 0, this.frameW, this.frameH,
      x - this.frameW * s / 2, y - this.frameH * s + 10 * s, this.frameW * s, this.frameH * s);
  }
}
const sprites = new SpriteSystem();

// ============================================================
// PRE-RENDERED FIELD
// ============================================================
let fieldTexture = null;
function generateFieldTexture() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const fx = c.getContext('2d');
  fx.fillStyle = '#0a0a14'; fx.fillRect(0, 0, W, H);
  const fl = FIELD.left, ft = FIELD.top, fw = FIELD.width, fh = FIELD.height;
  const stripeH = fh / 10;
  for (let i = 0; i < 10; i++) {
    fx.fillStyle = i % 2 === 0 ? COL.grassLight : COL.grassDark;
    fx.fillRect(fl, ft + i * stripeH, fw, stripeH);
    if (i % 2 === 0) { fx.fillStyle = COL.grassHighlight; fx.globalAlpha = 0.15; fx.fillRect(fl, ft + i * stripeH, fw, 2); fx.globalAlpha = 1; }
  }
  const ezH = fh * 5 / 50;
  fx.fillStyle = COL.endzoneAway; fx.fillRect(fl, ft - ezH, fw, ezH);
  fx.save(); fx.beginPath(); fx.rect(fl, ft - ezH, fw, ezH); fx.clip();
  fx.strokeStyle = 'rgba(255,255,255,0.12)'; fx.lineWidth = 8;
  for (let sx = -fw; sx < fw * 2; sx += 24) { fx.beginPath(); fx.moveTo(fl + sx, ft - ezH); fx.lineTo(fl + sx + ezH, ft); fx.stroke(); }
  fx.restore();
  fx.font = 'bold 20px "Arial Black",Arial'; fx.textAlign = 'center'; fx.fillStyle = 'rgba(255,255,255,0.3)';
  fx.fillText('D E F E N S E', fl + fw / 2, ft - ezH / 2 + 7);
  fx.fillStyle = COL.endzone; fx.fillRect(fl, ft + fh, fw, ezH);
  fx.save(); fx.beginPath(); fx.rect(fl, ft + fh, fw, ezH); fx.clip();
  fx.strokeStyle = 'rgba(255,255,255,0.12)'; fx.lineWidth = 8;
  for (let sx = -fw; sx < fw * 2; sx += 24) { fx.beginPath(); fx.moveTo(fl + sx, ft + fh); fx.lineTo(fl + sx + ezH, ft + fh + ezH); fx.stroke(); }
  fx.restore();
  fx.font = 'bold 20px "Arial Black",Arial'; fx.textAlign = 'center'; fx.fillStyle = 'rgba(255,255,255,0.3)';
  fx.fillText('O F F E N S E', fl + fw / 2, ft + fh + ezH / 2 + 7);
  for (let y = 0; y <= 50; y += 5) {
    const sy = ft + fh - (y / 50) * fh;
    fx.strokeStyle = COL.fieldLine; fx.lineWidth = y % 10 === 0 ? 2 : 1; fx.globalAlpha = y % 10 === 0 ? 0.7 : 0.4;
    fx.beginPath(); fx.moveTo(fl, sy); fx.lineTo(fl + fw, sy); fx.stroke(); fx.globalAlpha = 1;
  }
  for (let y = 0; y <= 50; y++) {
    const sy = ft + fh - (y / 50) * fh;
    fx.strokeStyle = COL.fieldLine; fx.globalAlpha = 0.35; fx.lineWidth = 1;
    const h1x = fl + fw * 0.33, h2x = fl + fw * 0.67;
    fx.beginPath(); fx.moveTo(h1x - 4, sy); fx.lineTo(h1x + 4, sy); fx.moveTo(h2x - 4, sy); fx.lineTo(h2x + 4, sy); fx.stroke(); fx.globalAlpha = 1;
  }
  for (let y = 10; y <= 40; y += 10) {
    const sy = ft + fh - (y / 50) * fh;
    fx.font = 'bold 16px "Arial Black",Arial';
    fx.fillStyle = 'rgba(0,0,0,0.3)'; fx.textAlign = 'right'; fx.fillText(String(y), fl - 5, sy + 6);
    fx.textAlign = 'left'; fx.fillText(String(y), fl + fw + 7, sy + 6);
    fx.fillStyle = 'rgba(255,255,255,0.5)'; fx.textAlign = 'right'; fx.fillText(String(y), fl - 6, sy + 5);
    fx.textAlign = 'left'; fx.fillText(String(y), fl + fw + 6, sy + 5);
    fx.font = 'bold 10px Arial'; fx.fillStyle = 'rgba(255,255,255,0.3)';
    fx.textAlign = 'right'; fx.fillText('▶', fl - 2, sy + 16);
    fx.textAlign = 'left'; fx.fillText('◀', fl + fw + 2, sy + 16);
  }
  const cfx = fl + fw / 2, cfy = ft + fh / 2;
  fx.save(); fx.globalAlpha = 0.1; fx.fillStyle = '#fff';
  fx.beginPath(); fx.moveTo(cfx, cfy - 20); fx.lineTo(cfx + 16, cfy - 12); fx.lineTo(cfx + 16, cfy + 6);
  fx.quadraticCurveTo(cfx, cfy + 22, cfx, cfy + 22); fx.quadraticCurveTo(cfx, cfy + 22, cfx - 16, cfy + 6);
  fx.lineTo(cfx - 16, cfy - 12); fx.closePath(); fx.fill();
  fx.strokeStyle = '#fff'; fx.lineWidth = 1; fx.stroke();
  fx.font = 'bold 10px Arial'; fx.textAlign = 'center'; fx.fillText('QB', cfx, cfy + 4); fx.restore();
  fx.strokeStyle = COL.fieldLine; fx.lineWidth = 3; fx.strokeRect(fl, ft, fw, fh);
  fieldTexture = c;
}

// ============================================================
// PLAY GENERATION & EVALUATION
// ============================================================
let currentPlay = null, consecutiveCatches = 0;

function selectDefFormationByDC() {
  const weights = getDCCoverageWeights();
  const r = Math.random();
  let coverType;
  if (r < weights.zone) coverType = 'zone';
  else if (r < weights.zone + weights.man) coverType = 'man';
  else coverType = 'blitz';
  // V11: Track coverage for halftime chart
  game.coverageTracker[coverType]++;
  const matching = defenseFormations.filter(f => f.coverType === coverType);
  if (matching.length > 0) return matching[Math.floor(Math.random() * matching.length)];
  return defenseFormations[Math.floor(Math.random() * defenseFormations.length)];
}

function generatePlay(isElite, isBoss) {
  const losY = getLOSYard();
  const offIdx = Math.floor(Math.random() * offenseFormations.length);
  const offense = offenseFormations[offIdx].getPositions(losY);
  offense.name = offenseFormations[offIdx].name; offense.idx = offIdx;
  if (hasRelic('route_tree') || game.playBookExpanded) {
    const ar = game.playBookExpanded ? ['corner', 'wheel', 'hitch', 'dig', 'seam'] : ['corner', 'wheel', 'hitch'];
    for (let i = 0; i < 4; i++) if (Math.random() < 0.3) offense.wrs[i].route = ar[Math.floor(Math.random() * ar.length)];
  }
  const defForm = selectDefFormationByDC();
  const defIdx = defenseFormations.indexOf(defForm);
  const defense = defForm.getPositions(losY);
  defense.name = defForm.name; defense.desc = defForm.desc || '';
  defense.idx = defIdx; defense.coverType = defForm.coverType;
  if (defense.dbs.some(db => db.role === 'man')) {
    const manDBs = defense.dbs.filter(db => db.role === 'man');
    const wrOrder = offense.wrs.map((w, i) => ({ ...w, idx: i })).sort((a, b) => a.lane - b.lane);
    manDBs.forEach((db, i) => {
      if (i < wrOrder.length) { db.coverIdx = wrOrder[i].idx; db.lane = offense.wrs[wrOrder[i].idx].lane; db.yard = offense.wrs[wrOrder[i].idx].yard + 4; }
    });
  }
  const weatherFloor = Weather.getWeatherForFloor(game.level);
  if (weatherFloor === 'day') game.weatherType = 'normal';
  else if (weatherFloor === 'dusk') game.weatherType = 'dusk';
  else if (weatherFloor === 'night') game.weatherType = 'night';
  else game.weatherType = 'rain';
  SFX.updateWeatherSounds();
  const motionWR = Math.floor(Math.random() * 4);
  const rushSideRoll = Math.random();
  const rusherSide = rushSideRoll < 0.4 ? 'left' : rushSideRoll < 0.8 ? 'right' : 'center';

  // V11: Check trust-based wrong routes
  for (let i = 0; i < 4; i++) {
    const trust = getTrustStatus(i);
    if (trust.wrongRouteChance > 0 && Math.random() < trust.wrongRouteChance) {
      const wrongRoutes = ['flat', 'curl', 'drag', 'streak'];
      offense.wrs[i].route = wrongRoutes[Math.floor(Math.random() * wrongRoutes.length)];
    }
  }

  const wrScores = evaluateReceivers(offense, defense, isElite, isBoss);
  const bestWR = wrScores.indexOf(Math.max(...wrScores));
  currentPlay = { offense, defense, bestWR, wrScores, isElite, isBoss, motionWR,
    motionUsed: false, motionResult: null,
    coverageIsMan: defense.coverType === 'man' || defense.coverType === 'blitz',
    rusherSide,
  };
  game.motionUsed = false; game.motionResult = null; game.motionWRIndex = motionWR;
  if (game.downs.current >= 3) addStress(10);
  if (game.level > 5) addStress(Math.min(5, game.level - 5));
  if (game.downs.current === 4) Commentary.generate('fourth_down');
  return currentPlay;
}

function evaluateReceivers(offense, defense, isElite, isBoss) {
  const scores = [], bonus = defenseBonus + (isElite ? 12 : 0) + (isBoss ? 20 : 0);
  for (let i = 0; i < 4; i++) {
    const wr = offense.wrs[i], stat = wrs[i], routeEnd = getRouteEndpoint(wr);
    let openness = stat.spd * 0.3 + stat.rte * 0.4 + stat.cat * 0.3;
    const syns = checkSynergies(i);
    for (const s of syns) if (s.bonus.openness) openness += s.bonus.openness;
    if (hasRelic('sticky_gloves')) openness += 4;
    if (hasRelic('speed_shoes')) openness += 4;
    let closestDist = Infinity;
    for (const db of defense.dbs) {
      if (db.role === 'man' && db.coverIdx === i) closestDist = Math.min(closestDist, 15);
      else if (db.role === 'man') continue;
      else {
        const dt = getZonePosition(db, routeEnd);
        const dy = routeEnd.yard - dt.yard, dl = routeEnd.lane - dt.lane;
        closestDist = Math.min(closestDist, Math.sqrt(dy * dy + dl * dl));
      }
    }
    if (closestDist < 8) openness -= (12 - closestDist) * 4;
    else if (closestDist > 15) openness += (closestDist - 15) * 1.5;
    openness -= bonus * 0.5;
    const hasDeep = defense.dbs.some(db => db.role === 'deep');
    const hasFlat = defense.dbs.some(db => db.role === 'flat');
    if (wr.route === 'streak' && !hasDeep) openness += 25;
    if (wr.route === 'slant' && !hasFlat) openness += 15;
    if (wr.route === 'flat' && !hasFlat) openness += 20;
    if (wr.route === 'drag' && !hasFlat) openness += 18;
    if (wr.route === 'out' && hasDeep && !hasFlat) openness += 15;
    if (wr.route === 'post' && !hasDeep) openness += 22;
    if (wr.route === 'curl' && hasDeep) openness += 10;
    if (wr.route === 'corner' && !hasDeep) openness += 20;
    if (wr.route === 'wheel' && !hasDeep) openness += 18;
    if (wr.route === 'hitch') openness += 12;
    if (wr.route === 'dig') openness += 14;
    if (wr.route === 'seam' && !hasDeep) openness += 20;
    const dc = getCurrentDC();
    if (dc.adaptive && game.adaptiveTracker.wrPicks[i] > 2) openness -= game.adaptiveTracker.wrPicks[i] * 3;
    // V11: Film study bonus
    if (game.filmStudyFloorsLeft > 0) openness += 8;
    openness += (Math.random() - 0.5) * 10;
    scores.push(Math.max(0, openness));
  }
  return scores;
}

function getRouteEndpoint(wr) { const p = routePaths[wr.route](wr.yard, wr.lane); return p[p.length - 1]; }
function getZonePosition(db, t) {
  if (db.role === 'deep') return { yard: Math.max(db.yard, t.yard), lane: db.lane + (t.lane - db.lane) * 0.4 };
  if (db.role === 'flat') return { yard: db.yard + (t.yard - db.yard) * 0.3, lane: db.lane + (t.lane - db.lane) * 0.6 };
  if (db.role === 'free') return { yard: db.yard + (t.yard - db.yard) * 0.2, lane: db.lane + (t.lane - db.lane) * 0.3 };
  return { yard: db.yard, lane: db.lane };
}

function calculateCatchProb(wrIndex, passType) {
  const wr = wrs[wrIndex], score = currentPlay.wrScores[wrIndex], maxScore = Math.max(...currentPlay.wrScores);
  let prob = 40;
  if (wrIndex === currentPlay.bestWR) prob += 35;
  else prob += Math.max(0, 20 * (score / Math.max(1, maxScore)));
  prob += (qb.accuracy - 60) * 0.3; prob += (wr.cat - 50) * 0.2; prob += getComposureAccuracyMod();
  const routeEnd = getRouteEndpoint(currentPlay.offense.wrs[wrIndex]);
  const throwDist = Math.abs(routeEnd.yard - getLOSYard());
  if (throwDist > 12) { prob += (qb.arm - 60) * 0.3; if (hasRelic('golden_arm')) prob += 15; if (game.weatherDebuff) prob -= game.weatherDebuff; }
  const syns = checkSynergies(wrIndex);
  for (const s of syns) if (s.bonus.catchBonus) prob += s.bonus.catchBonus;
  if (hasRelic('hot_hand') && consecutiveCatches > 0) prob += Math.min(consecutiveCatches * 5, 20);
  if (hasRelic('iron_will') && game.downs.current === 4) prob += 20;
  if (game.downs.current === 4) prob += 5;
  if (getComposureLevel() === 'tilted' && Math.random() < 0.1) prob -= 30;
  if (game.motionUsed && game.motionResult) {
    if (game.motionResult === 'man' && wrIndex !== game.motionWRIndex) prob += 8;
    else if (game.motionResult === 'zone' && wrIndex === game.motionWRIndex) prob += 12;
    else if (game.motionResult === 'man' && wrIndex === game.motionWRIndex) prob -= 8;
  }
  const pt = passType || game.passType;
  const route = currentPlay.offense.wrs[wrIndex].route;
  if (pt === 'bullet') {
    if (isShortRoute(route)) prob += 10; if (isDeepRoute(route)) prob -= 15;
    if (currentPlay.coverageIsMan) prob -= 5;
  } else if (pt === 'lob') {
    if (isDeepRoute(route)) prob += 15; if (isShortRoute(route)) prob -= 10;
  }
  if (game.scrambleResult === 'dodged') prob -= 15;
  if (game.scrambleResult === 'stand_tall') prob -= 25;
  prob -= Weather.getCatchDebuff();
  // V11: Trust modifier
  const isClutchDown = game.downs.current >= 3;
  prob += getTrustCatchMod(wrIndex, isClutchDown);
  return Math.max(5, Math.min(95, prob));
}

function calculateINTChance(wrIndex, passType) {
  let intChance = 3;
  const pt = passType || game.passType;
  if (pt === 'lob') intChance += 5;
  if (pt === 'bullet' && currentPlay.coverageIsMan) intChance += 3;
  if (game.scrambleResult === 'dodged') intChance += 4;
  if (game.scrambleResult === 'stand_tall') intChance += 2;
  if (getComposureLevel() === 'tilted') intChance += 5;
  if (getComposureLevel() === 'shaky') intChance += 2;
  return intChance;
}

// ============================================================
// SIMULATION
// ============================================================
let sim = null;
function startSimulation(chosenWR) {
  const play = currentPlay, wr = play.offense.wrs[chosenWR], routeEnd = getRouteEndpoint(wr);
  game.adaptiveTracker.wrPicks[chosenWR]++;
  const route = wr.route;
  game.adaptiveTracker.routePicks[route] = (game.adaptiveTracker.routePicks[route] || 0) + 1;
  const rushSpeed = play.defense.rusher.fast ? 0.06 : 0.035;
  const rushFactor = hasRelic('quick_release') ? 0.8 : 1;
  const willSack = play.defense.rusher.fast && Math.random() < (0.35 * rushFactor);
  // V11: Trust commentary
  const trustComment = getTrustCommentary(chosenWR, chosenWR);
  if (trustComment && Math.random() < 0.5) Commentary.show(trustComment, 2.5);

  sim = {
    phase: 'snap', timer: 0, chosenWR, success: false, catchProb: 0, yardsGained: 0,
    wrPos: play.offense.wrs.map(w => ({ yard: w.yard, lane: w.lane })),
    dbPos: play.defense.dbs.map(db => ({ yard: db.yard, lane: db.lane })),
    rushPos: { yard: play.defense.rusher.yard, lane: play.defense.rusher.lane },
    qbPos: { yard: play.offense.qb.yard, lane: play.offense.qb.lane },
    qbStartYard: play.offense.qb.yard,
    ballPos: null, ballTarget: null, ballTrail: [],
    routeProgress: 0, throwProgress: 0, snapProgress: 0, catchAnim: 0, resultTimer: 0,
    wrActions: ['idle', 'idle', 'idle', 'idle'], qbAction: 'idle',
    defActions: ['idle', 'idle', 'idle', 'idle'],
    throwPowerTimer: 0, separationShown: false, separationText: '',
    willSack, scrambleTriggered: false, scrambleChoice: null, scrambleTimer: 0,
    scrambleDodgeDir: null, passTypeChosen: false,
    isINT: false, isSack: false,
    tdCelebrating: false, tdTimer: 0,
    replayQueued: false, replayPlaying: false,
    rusherSide: play.rusherSide || 'center',
  };
  game.state = 'passType'; game.passType = 'touch'; game.scrambleResult = null;
  game.readingPhase = false; Replay.reset();
  SFX.play('snap'); TimeScale.set(1, 0); Camera.setForPhase('reading');
}

function beginSimAfterPassType() {
  if (!sim) return;
  const play = currentPlay, wr = play.offense.wrs[sim.chosenWR], routeEnd = getRouteEndpoint(wr);
  sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
  sim.success = Math.random() * 100 < sim.catchProb;
  const intChance = calculateINTChance(sim.chosenWR, game.passType);
  if (!sim.success && Math.random() * 100 < intChance) sim.isINT = true;
  if (sim.success) {
    let yardsGained = Math.abs(routeEnd.yard - getLOSYard()) + Math.floor(Math.random() * 5);
    sim.yardsGained = Math.max(1, yardsGained);
  }
  game.state = 'simulation';
  const cl = getComposureLevel();
  if (cl === 'nervous') triggerShake(2); else if (cl === 'shaky') triggerShake(4); else if (cl === 'tilted') triggerShake(8);
  const route = currentPlay.offense.wrs[sim.chosenWR].route;
  if (game.passType === 'bullet') Commentary.generate(isShortRoute(route) ? 'bullet_short' : 'bullet_deep');
  else if (game.passType === 'lob') Commentary.generate(isDeepRoute(route) ? 'lob_deep' : 'lob_short');
  else Commentary.generate('touch_mid');
  if (game.passType === 'bullet') SFX.play('bullet_throw');
  else if (game.passType === 'lob') SFX.play('lob_throw');
  else SFX.play('throw');
}

function updateSimulation(dt) {
  if (!sim) return;
  TimeScale.update(dt);
  const sd = TimeScale.getDt(dt);
  sim.timer += sd;
  if (sim.phase !== 'result' && sim.phase !== 'scramble' && sim.phase !== 'tdCelebration' && sim.phase !== 'replay') {
    Replay.capture({ wrPos: sim.wrPos.map(p => ({ ...p })), dbPos: sim.dbPos.map(p => ({ ...p })),
      rushPos: { ...sim.rushPos }, qbPos: { ...sim.qbPos },
      ballPos: sim.ballPos ? { ...sim.ballPos } : null, phase: sim.phase });
  }
  if (sim.phase === 'routes' || sim.phase === 'throw') {
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.05) {
        const scr = FIELD.toScreen(sim.wrPos[i].yard, sim.wrPos[i].lane);
        Weather.addFootprint(scr.x, scr.y + 5);
      }
    }
  }
  switch (sim.phase) {
    case 'snap':
      sim.snapProgress = Math.min(1, sim.timer / 0.25); sim.qbAction = 'idle';
      if (sim.snapProgress >= 1) { sim.phase = 'dropback'; sim.timer = 0; } break;
    case 'dropback':
      sim.qbPos.yard += (sim.qbStartYard - 3 - sim.qbPos.yard) * 0.08; sim.qbAction = 'run';
      if (sim.timer > 0.4) { sim.phase = 'routes'; sim.timer = 0; sim.wrActions = ['run', 'run', 'run', 'run']; sim.defActions = ['run', 'run', 'run', 'run']; } break;
    case 'routes':
      sim.routeProgress = Math.min(1, sim.timer / 1.2); sim.qbAction = 'idle';
      Camera.setForPhase('choosing');
      for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i], path = routePaths[wr.route](wr.yard, wr.lane);
        const total = path.length, seg = sim.routeProgress * total;
        const idx = Math.min(Math.floor(seg), total - 1), t = seg - idx;
        const fy = idx === 0 ? wr.yard : path[idx - 1].yard;
        const fl2 = idx === 0 ? wr.lane : path[idx - 1].lane;
        sim.wrPos[i].yard = fy + (path[idx].yard - fy) * t;
        sim.wrPos[i].lane = fl2 + (path[idx].lane - fl2) * t;
        if (Math.random() < 0.06) { const scr = FIELD.toScreen(sim.wrPos[i].yard, sim.wrPos[i].lane); addParticle(scr.x, scr.y + 5, 'turf_spray', 2); }
      }
      for (let i = 0; i < 4; i++) {
        const db = currentPlay.defense.dbs[i];
        if (db.role === 'man' && db.coverIdx >= 0) {
          const tgt = sim.wrPos[db.coverIdx];
          sim.dbPos[i].yard += (tgt.yard - sim.dbPos[i].yard) * 0.04;
          sim.dbPos[i].lane += (tgt.lane - sim.dbPos[i].lane) * 0.04;
        } else {
          const tgt = sim.wrPos[sim.chosenWR];
          sim.dbPos[i].yard += (tgt.yard - sim.dbPos[i].yard) * 0.015;
          sim.dbPos[i].lane += (tgt.lane - sim.dbPos[i].lane) * 0.01;
        }
        if (Math.random() < 0.04) { const scr = FIELD.toScreen(sim.dbPos[i].yard, sim.dbPos[i].lane); addParticle(scr.x, scr.y + 5, 'turf_spray', 1); }
      }
      const rs = currentPlay.defense.rusher.fast ? 0.05 : 0.03;
      const sr = hasRelic('quick_release') ? 0.8 : 1;
      let rushTargetLane = sim.qbPos.lane;
      if (sim.rusherSide === 'left') rushTargetLane = sim.qbPos.lane - 5;
      else if (sim.rusherSide === 'right') rushTargetLane = sim.qbPos.lane + 5;
      sim.rushPos.yard += (sim.qbPos.yard - sim.rushPos.yard) * rs * sr;
      sim.rushPos.lane += (rushTargetLane - sim.rushPos.lane) * rs * sr;
      if (sim.willSack && sim.routeProgress >= 0.5 && !sim.scrambleTriggered) {
        sim.scrambleTriggered = true; sim.phase = 'scramble'; sim.timer = 0; sim.scrambleTimer = 1.8;
        Camera.setForPhase('scramble'); SFX.play('sack_impact');
        const qs = FIELD.toScreen(sim.qbPos.yard, sim.qbPos.lane);
        Camera.targetX = (W / 2 - qs.x) * 0.4; Camera.targetY = (W / 2 - qs.y) * 0.3; break;
      }
      if (sim.routeProgress >= 0.7) {
        sim.phase = 'throw'; sim.timer = 0;
        sim.ballPos = { yard: sim.qbPos.yard, lane: sim.qbPos.lane };
        sim.ballTarget = { yard: sim.wrPos[sim.chosenWR].yard, lane: sim.wrPos[sim.chosenWR].lane };
        sim.qbAction = 'throw'; sim.wrActions[sim.chosenWR] = 'catch';
        sim.throwPowerTimer = 0.3; TimeScale.set(0.4, 0.5); Camera.setForPhase('throw');
        const mid = FIELD.toScreen((sim.qbPos.yard + sim.ballTarget.yard) / 2, (sim.qbPos.lane + sim.ballTarget.lane) / 2);
        Camera.targetX = (W / 2 - mid.x) * 0.3; Camera.targetY = (H / 2 - mid.y) * 0.3;
      }
      break;
    case 'scramble':
      sim.scrambleTimer -= sd;
      let rushApproachLane = sim.qbPos.lane;
      if (sim.rusherSide === 'left') rushApproachLane = sim.qbPos.lane - 8;
      else if (sim.rusherSide === 'right') rushApproachLane = sim.qbPos.lane + 8;
      sim.rushPos.yard += (sim.qbPos.yard - sim.rushPos.yard) * 0.12;
      sim.rushPos.lane += (rushApproachLane - sim.rushPos.lane) * 0.08;
      if (sim.scrambleChoice !== null && sim.scrambleChoice !== 'done') {
        if (sim.scrambleChoice === 'stand_tall') {
          game.scrambleResult = 'stand_tall'; SFX.play('scramble_dodge');
          Commentary.generate('scramble_stand');
          sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
          sim.success = Math.random() * 100 < sim.catchProb;
          if (!sim.success) { const ic = calculateINTChance(sim.chosenWR, game.passType); sim.isINT = Math.random() * 100 < ic; }
          if (sim.success) { const re = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]); sim.yardsGained = Math.max(1, Math.abs(re.yard - getLOSYard()) + Math.floor(Math.random() * 5)); }
          sim.phase = 'routes'; sim.timer = 0.84; sim.routeProgress = 0.7; sim.scrambleChoice = 'done';
        } else if (sim.scrambleChoice === 'left' || sim.scrambleChoice === 'right') {
          let dodgeSuccess = false;
          const side = sim.rusherSide;
          if (side === 'center') dodgeSuccess = Math.random() < 0.6;
          else if ((side === 'left' && sim.scrambleChoice === 'right') || (side === 'right' && sim.scrambleChoice === 'left')) dodgeSuccess = Math.random() < 0.8;
          else dodgeSuccess = Math.random() < 0.3;
          if (dodgeSuccess) {
            game.scrambleResult = 'dodged';
            sim.qbPos.lane += sim.scrambleChoice === 'left' ? -8 : 8; sim.qbPos.yard += 2;
            SFX.play('scramble_dodge'); Commentary.generate('scramble_success');
            const qs = FIELD.toScreen(sim.qbPos.yard, sim.qbPos.lane);
            addParticle(qs.x, qs.y + 5, 'scramble_dust', 8);
            sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
            sim.success = Math.random() * 100 < sim.catchProb;
            if (!sim.success) { const ic = calculateINTChance(sim.chosenWR, game.passType); sim.isINT = Math.random() * 100 < ic; }
            if (sim.success) { const re = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]); sim.yardsGained = Math.max(1, Math.abs(re.yard - getLOSYard()) + Math.floor(Math.random() * 5)); }
            sim.phase = 'routes'; sim.timer = 0.84; sim.routeProgress = 0.7; sim.scrambleChoice = 'done';
          } else {
            sim.isSack = true; sim.sackYards = 7; sim.phase = 'sackResult'; sim.timer = 0;
            SFX.play('sack_impact'); Commentary.generate('scramble_fail'); triggerShake(15);
            const qs = FIELD.toScreen(sim.qbPos.yard, sim.qbPos.lane);
            addParticle(qs.x, qs.y, 'impact_dust', 15); Camera.shake(12); sim.scrambleChoice = 'done';
          }
        }
      } else if (sim.scrambleTimer <= 0 && sim.scrambleChoice === null) {
        sim.isSack = true; sim.sackYards = 5; sim.phase = 'sackResult'; sim.timer = 0;
        SFX.play('sack_impact'); Commentary.generate('sack'); triggerShake(12);
        const qs = FIELD.toScreen(sim.qbPos.yard, sim.qbPos.lane);
        addParticle(qs.x, qs.y, 'impact_dust', 15); Camera.shake(10);
      }
      break;
    case 'sackResult':
      sim.resultTimer = Math.min(1, sim.timer / 0.5);
      if (sim.timer > 3.0) handlePlayResult(); break;
    case 'throw': {
      const throwDuration = game.passType === 'bullet' ? 0.4 : game.passType === 'lob' ? 0.7 : 0.55;
      sim.throwProgress = Math.min(1, sim.timer / throwDuration);
      sim.throwPowerTimer -= sd;
      sim.ballPos.yard = sim.qbPos.yard + (sim.ballTarget.yard - sim.qbPos.yard) * sim.throwProgress;
      sim.ballPos.lane = sim.qbPos.lane + (sim.ballTarget.lane - sim.qbPos.lane) * sim.throwProgress;
      sim.ballTrail.push({ ...sim.ballPos }); if (sim.ballTrail.length > 8) sim.ballTrail.shift();
      if (sim.throwProgress > 0.6) TimeScale.set(0.5, 0.3);
      for (let i = 0; i < 4; i++) {
        const path = routePaths[currentPlay.offense.wrs[i].route](currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane);
        const end = path[path.length - 1];
        sim.wrPos[i].yard += (end.yard - sim.wrPos[i].yard) * 0.05;
        sim.wrPos[i].lane += (end.lane - sim.wrPos[i].lane) * 0.05;
        const db = currentPlay.defense.dbs[i];
        if (db && db.role === 'man' && db.coverIdx >= 0) {
          sim.dbPos[i].yard += (sim.wrPos[db.coverIdx].yard - sim.dbPos[i].yard) * 0.06;
          sim.dbPos[i].lane += (sim.wrPos[db.coverIdx].lane - sim.dbPos[i].lane) * 0.06;
        }
      }
      if (sim.throwProgress >= 1) {
        sim.phase = 'catch'; sim.timer = 0; TimeScale.set(0.3, 0.3);
        Camera.setForPhase('catch');
        const ws = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
        Camera.targetX = (W / 2 - ws.x) * 0.3; Camera.targetY = (H / 2 - ws.y) * 0.3;
        let closestDBDist = Infinity;
        for (let i = 0; i < 4; i++) {
          const dy = sim.wrPos[sim.chosenWR].yard - sim.dbPos[i].yard;
          const dl = sim.wrPos[sim.chosenWR].lane - sim.dbPos[i].lane;
          closestDBDist = Math.min(closestDBDist, Math.sqrt(dy * dy + dl * dl));
        }
        sim.separationText = closestDBDist.toFixed(1) + ' YDS'; sim.separationShown = true;
        if (sim.success) {
          addParticle(ws.x, ws.y, 'catch_flash', 15); addParticle(ws.x, ws.y + 5, 'turf_spray', 8);
          SFX.play('catch'); sim.wrActions[sim.chosenWR] = 'catch';
          if (sim.yardsGained >= 20) Commentary.generate('big_play', { yards: sim.yardsGained });
        } else if (sim.isINT) {
          SFX.play('miss'); Commentary.generate('int');
          addParticle(ws.x, ws.y, 'impact_dust', 12); Camera.setForPhase('incomplete');
        } else {
          SFX.play('miss'); Commentary.generate('incomplete');
          addParticle(ws.x, ws.y, 'impact_dust', 10); addParticle(ws.x, ws.y + 5, 'turf_spray', 8); Camera.setForPhase('incomplete');
        }
      }
      break;
    }
    case 'catch':
      sim.catchAnim = Math.min(1, sim.timer / 0.6);
      if (sim.success && sim.catchAnim > 0.5) sim.wrActions[sim.chosenWR] = 'celebrate';
      if (sim.timer > 1.0) {
        const isTD = sim.success && (game.ballYardLine + sim.yardsGained >= 50);
        const isBigPlay = sim.success && sim.yardsGained >= 15;
        if (isTD) {
          sim.phase = 'tdCelebration'; sim.timer = 0; sim.tdCelebrating = true;
          SFX.play('td'); PostFX.triggerBloom(1.5); Camera.setForPhase('td');
          Commentary.generate('td'); addParticle(W / 2, 200, 'td_confetti', 60);
          for (let i = 0; i < 4; i++) sim.wrActions[i] = 'celebrate';
        } else if (isBigPlay) {
          sim.phase = 'replay'; sim.timer = 0;
          const ws = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
          Replay.startReplay({ x: ws.x, y: ws.y }, game.passType);
          addParticle(W / 2, H / 2, 'td_burst', 30); PostFX.triggerBloom(1.0); game.highlightTimer = 3.0;
        } else {
          sim.phase = 'result'; sim.timer = 0; TimeScale.set(1, 0);
          Camera.targetX = 0; Camera.targetY = 0; Camera.targetZoom = 1.0;
        }
      }
      break;
    case 'tdCelebration':
      sim.tdTimer += sd;
      if (Math.random() < 0.3) addParticle(Math.random() * W, 0, 'td_confetti', 2);
      for (let i = 0; i < 4; i++) sim.wrActions[i] = 'celebrate';
      if (sim.tdTimer > 2.0) {
        sim.phase = 'replay'; sim.timer = 0;
        const ws = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
        Replay.startReplay({ x: ws.x, y: ws.y }, game.passType);
      }
      break;
    case 'replay':
      Replay.update(dt);
      if (!Replay.playing || sim.timer > 4.0) {
        sim.phase = 'result'; sim.timer = 0; TimeScale.set(1, 0);
        Camera.targetX = 0; Camera.targetY = 0; Camera.targetZoom = 1.0; Replay.playing = false;
      }
      break;
    case 'result':
      sim.resultTimer = Math.min(1, sim.timer / 0.5);
      if (sim.timer > 3.5) handlePlayResult(); break;
  }
}

function handlePlayResult() {
  const isTD = sim && sim.success && (game.ballYardLine + sim.yardsGained >= 50);
  game.seasonStats.attempts++;

  // V11: Update trust
  if (sim && !sim.isSack) {
    updateTrust(sim.chosenWR, sim.success ? 'complete' : 'incomplete');
  }

  if (sim.isSack) {
    game.seasonStats.sacks++;
    const sackLoss = sim.sackYards || 5;
    game.ballYardLine = Math.max(1, game.ballYardLine - sackLoss);
    addStress(20); consecutiveCatches = 0; game.drivePlays++;
    game.downs.current++;
    if (game.downs.current > 4) { game.state = 'gameOver'; SFX.play('gameover'); sim = null; return; }
  } else if (sim.isINT) {
    game.seasonStats.ints++; addStress(25); consecutiveCatches = 0; game.drivePlays++;
    game.state = 'gameOver'; SFX.play('gameover'); sim = null; return;
  } else if (sim.success) {
    consecutiveCatches++; game.seasonStats.completions++;
    const yards = sim.yardsGained;
    game.seasonStats.yards += yards;
    game.scoreAnimTarget = game.score + yards * 10;
    game.score += yards * 10; game.gold += yards * 2;
    game.driveYards += yards; game.drivePlays++;
    game.ballYardLine = Math.min(50, game.ballYardLine + yards);
    game.seasonStats.plays.push({
      floor: game.level, formation: currentPlay.offense.name,
      wrName: wrs[sim.chosenWR].name, route: currentPlay.offense.wrs[sim.chosenWR].route,
      yards: yards, passType: game.passType, isTD: game.ballYardLine >= 50,
    });
    reduceStress(5);
    if (game.ballYardLine >= 50) {
      game.seasonStats.tds++; game.scoreAnimTarget = game.score + 600;
      game.score += 600; game.gold += 100; reduceStress(10);
      if (game.level >= game.maxLevel) {
        game.victoryCeremony = true; game.victoryCeremonyTimer = 0;
        game.state = 'victoryCeremony'; SFX.play('champion');
      } else {
        game.state = 'upgrade'; game.level++;
        SFX.play('level_up');
        game.ballYardLine = 5; game.downs.current = 1;
        game.gotFirstDown = false; game.firstDownLine = 25;
        game.audiblesLeft = 1 + (hasRelic('audible_master') ? 1 : 0);
        defenseBonus += 4; generateUpgradeOptions();
        if (game.filmStudyFloorsLeft > 0) game.filmStudyFloorsLeft--;
        // V11: Check for halftime after floor 6
        if (game.level === 7 && !game.halftimeShown) {
          game.halftimeShown = true;
          game.state = 'halftime';
          SFX.play('halftime_whistle');
          generateHalftimeOptions();
          return;
        }
      }
    } else {
      if (!game.gotFirstDown && game.ballYardLine >= game.firstDownLine) {
        game.gotFirstDown = true; game.downs.current = 1;
        game.firstDownLine = 50; addParticle(W / 2, 300, 'confetti', 15);
        Commentary.generate('first_down');
      } else {
        game.downs.current++;
        if (game.downs.current > 4) { game.state = 'gameOver'; SFX.play('gameover'); sim = null; return; }
      }
    }
  } else {
    consecutiveCatches = 0; addStress(15); game.drivePlays++;
    game.downs.current++;
    if (game.downs.current > 4) { game.state = 'gameOver'; SFX.play('gameover'); sim = null; return; }
  }
  if (currentPlay && currentPlay.isElite && sim && sim.success) game.gold += 50;
  if (game.state === 'simulation') game.state = 'playResult';
  sim = null;
}

// ============================================================
// V11: HALFTIME SYSTEM
// ============================================================
let halftimeOptions = [];
function generateHalftimeOptions() {
  const allOptions = [
    { id: 'film_study', name: 'Film Study', desc: "See DC's exact coverage for 3 floors", icon: '📋',
      apply: () => { game.filmStudyFloorsLeft = 3; game.scoutReport = true; } },
    { id: 'wr_clinic', name: 'WR Clinic', desc: 'Reset all WR trust to 60', icon: '🤝',
      apply: () => { game.wrTrust = [60, 60, 60, 60]; } },
    { id: 'qb_coach', name: 'QB Coach', desc: '+5 permanent accuracy', icon: '🎯',
      apply: () => { qb.accuracy += 5; } },
    { id: 'equipment', name: 'Equipment Check', desc: '+10 composure recovery per play', icon: '🔧',
      apply: () => { game.composureRecoveryBonus += 10; } },
    { id: 'playbook', name: 'Playbook Expansion', desc: 'Unlock dig & seam routes', icon: '📖',
      apply: () => { game.playBookExpanded = true; } },
  ];
  // Pick 3 random
  const shuffled = allOptions.sort(() => Math.random() - 0.5);
  halftimeOptions = shuffled.slice(0, 3);

  // DC halftime adjustments
  applyHalftimeDCAdjustments();
}

function applyHalftimeDCAdjustments() {
  const maxPicks = Math.max(...game.adaptiveTracker.wrPicks);
  const maxWR = game.adaptiveTracker.wrPicks.indexOf(maxPicks);
  const totalPicks = game.adaptiveTracker.wrPicks.reduce((a, b) => a + b, 0);

  if (totalPicks > 0 && maxPicks / totalPicks >= 0.4) {
    // DC shifts coverage to favorite WR
    defenseBonus += 8;
    Commentary.show("The defense made adjustments at halftime!", 3);
  }

  // Check bullet usage
  const bulletCount = game.seasonStats.plays.filter(p => p.passType === 'bullet').length;
  if (bulletCount > game.seasonStats.plays.length * 0.5) {
    defenseBonus += 5;
  }
  game.halftimeAdjustment = 'dc_adjusted';
}

// ============================================================
// UPGRADES
// ============================================================
let upgradeOptions = [];
function generateUpgradeOptions() {
  upgradeOptions = [];
  const qbPool = [
    { name: '精准臂力', desc: '传球精准度 +8', icon: '🎯', apply: () => qb.accuracy += 8 },
    { name: '火箭臂', desc: '臂力 +10', icon: '💪', apply: () => qb.arm += 10 },
    { name: '快速阅读', desc: '阅读防守+5', icon: '📖', apply: () => qb.readSpeed += 5 },
    { name: '口袋感知', desc: '精准+5 臂力+5', icon: '🧠', apply: () => { qb.accuracy += 5; qb.arm += 5; } },
  ];
  upgradeOptions.push({ type: 'qb', ...qbPool[Math.floor(Math.random() * qbPool.length)] });
  const wrPool = [
    { name: '闪电加速', desc: '速度+12', stat: 'spd', value: 12, icon: '⚡' },
    { name: '黏手套', desc: '接球+12', stat: 'cat', value: 12, icon: '🧤' },
    { name: '路线大师', desc: '跑路线+12', stat: 'rte', value: 12, icon: '📖' },
    { name: '全面提升', desc: '所有属性+6', stat: 'all', value: 6, icon: '🛡️' },
  ];
  const wo = wrPool[Math.floor(Math.random() * wrPool.length)];
  const wt = Math.floor(Math.random() * 4);
  upgradeOptions.push({ type: 'wr', target: wt, name: `${wrs[wt].name} ${wo.name}`, desc: `${wrs[wt].name}: ${wo.desc}`, icon: wo.icon,
    apply: () => { const w = wrs[wt]; if (wo.stat === 'all') { w.spd += wo.value; w.cat += wo.value; w.rte += wo.value; } else w[wo.stat] += wo.value; w.lvl++; }
  });
  const ar = RELIC_DEFS.filter(r => !hasRelic(r.id) && relics.length < MAX_RELICS);
  if (ar.length > 0 && Math.random() < 0.5) {
    const rel = ar[Math.floor(Math.random() * ar.length)];
    upgradeOptions.push({ type: 'relic', name: rel.name, desc: rel.desc, icon: rel.icon, apply: () => relics.push(rel) });
  } else {
    upgradeOptions.push({ type: 'debuff', name: '心理战', desc: '降低防守覆盖效果', icon: '🌫️', apply: () => { defenseBonus = Math.max(0, defenseBonus - 6); } });
  }
}
function applyUpgrade(idx) { upgradeOptions[idx].apply(); addParticle(W / 2, 300, 'confetti', 20); SFX.play('click'); }

// ============================================================
// QB RATING CALCULATOR
// ============================================================
function calculateQBRating() {
  const s = game.seasonStats;
  if (s.attempts === 0) return 0;
  const a = Math.min(2.375, Math.max(0, ((s.completions / s.attempts) - 0.3) * 5));
  const b = Math.min(2.375, Math.max(0, ((s.yards / s.attempts) - 3) * 0.25));
  const c = Math.min(2.375, Math.max(0, (s.tds / s.attempts) * 20));
  const d = Math.min(2.375, Math.max(0, 2.375 - ((s.ints / s.attempts) * 25)));
  return ((a + b + c + d) / 6) * 100;
}

// ============================================================
// BROADCAST UI HELPERS
// ============================================================
function drawRoundedRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

function drawRadarChart(c, cx, cy, r, stats, labels, color) {
  const n = stats.length, as = (Math.PI * 2) / n;
  for (let ring = 1; ring <= 3; ring++) {
    const rr = r * (ring / 3);
    c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 0.5;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + i * as, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
  }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * as;
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke();
  }
  c.fillStyle = color; c.globalAlpha = 0.25; c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * as, v = Math.min(1, stats[i] / 100);
    const x = cx + Math.cos(a) * r * v, y = cy + Math.sin(a) * r * v;
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.closePath(); c.fill(); c.globalAlpha = 1;
  c.strokeStyle = color; c.lineWidth = 1.5; c.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n, a = -Math.PI / 2 + idx * as, v = Math.min(1, stats[idx] / 100);
    const x = cx + Math.cos(a) * r * v, y = cy + Math.sin(a) * r * v;
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.stroke();
  c.fillStyle = '#ccc'; c.font = '7px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * as;
    c.fillText(labels[i], cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
  }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * as, v = Math.min(1, stats[i] / 100);
    c.fillStyle = color; c.beginPath();
    c.arc(cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v, 2, 0, Math.PI * 2); c.fill();
  }
}

function drawPieChart(c, cx, cy, r, data, colors, labels) {
  const total = data.reduce((a, b) => a + b, 0);
  if (total === 0) return;
  let startAngle = -Math.PI / 2;
  for (let i = 0; i < data.length; i++) {
    const sliceAngle = (data[i] / total) * Math.PI * 2;
    c.beginPath(); c.moveTo(cx, cy);
    c.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    c.closePath(); c.fillStyle = colors[i]; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.stroke();
    // Label
    if (data[i] > 0) {
      const midAngle = startAngle + sliceAngle / 2;
      const lx = cx + Math.cos(midAngle) * (r * 0.65);
      const ly = cy + Math.sin(midAngle) * (r * 0.65);
      c.fillStyle = '#fff'; c.font = 'bold 8px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(`${labels[i]} ${Math.round(data[i] / total * 100)}%`, lx, ly);
    }
    startAngle += sliceAngle;
  }
}

// ============================================================
// SCORE BUG
// ============================================================
function drawScoreBug() {
  const bH = 54, bY = H - bH - 4, bX = 6, bW = W - 12;
  ctx.save();
  drawRoundedRect(ctx, bX, bY, bW, bH, 5); ctx.fillStyle = COL.scoreBug; ctx.fill();
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(bX + 4, bY, bW - 8, 2);
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(bX, bY, 3, bH);
  ctx.fillStyle = COL.offHelmet;
  ctx.beginPath(); ctx.arc(bX + 20, bY + 16, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COL.offStripe; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bX + 20, bY + 10); ctx.lineTo(bX + 20, bY + 22); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('QB CHALLENGE', bX + 30, bY + 16);
  ctx.fillStyle = COL.offAccent; ctx.fillRect(bX + 120, bY + 4, 60, bH - 8);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('OFF', bX + 150, bY + 14);
  if (game.scoreAnimCurrent < game.scoreAnimTarget) {
    game.scoreAnimCurrent = Math.min(game.scoreAnimTarget, game.scoreAnimCurrent + Math.max(1, Math.floor((game.scoreAnimTarget - game.scoreAnimCurrent) * 0.1)));
  } else { game.scoreAnimCurrent = game.score; }
  ctx.font = 'bold 18px "Arial Black",Arial'; ctx.fillText(String(game.scoreAnimCurrent), bX + 150, bY + 36);
  const dt2 = `${game.downs.current}${['ST', 'ND', 'RD', 'TH'][Math.min(game.downs.current - 1, 3)]} & ${game.gotFirstDown ? 'GL' : (game.firstDownLine - game.ballYardLine)}`;
  ctx.fillStyle = COL.downPill; drawRoundedRect(ctx, bX + 190, bY + 6, 80, 18, 9); ctx.fill();
  ctx.fillStyle = '#000'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText(dt2, bX + 230, bY + 17);
  ctx.fillStyle = '#aaa'; ctx.font = '8px Arial'; ctx.fillText(`OWN ${game.ballYardLine}`, bX + 230, bY + 34);
  const barX2 = bX + 195, barW2 = 70;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(barX2, bY + 40, barW2, 5);
  ctx.fillStyle = COL.uiGreen; ctx.fillRect(barX2, bY + 40, barW2 * (game.ballYardLine / 50), 5);
  const fdX = barX2 + barW2 * (game.firstDownLine / 50);
  ctx.fillStyle = COL.uiYellow; ctx.fillRect(fdX - 1, bY + 38, 2, 9);
  const ballDotX = barX2 + barW2 * (game.ballYardLine / 50);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ballDotX, bY + 42.5, 3, 0, Math.PI * 2); ctx.fill();
  const dc = getCurrentDC();
  ctx.fillStyle = COL.defHelmet; ctx.beginPath(); ctx.arc(bX + 290, bY + 16, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COL.defStripe; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bX + 290, bY + 10); ctx.lineTo(bX + 290, bY + 22); ctx.stroke();
  ctx.fillStyle = COL.defAccent; ctx.fillRect(bX + 300, bY + 4, 50, bH - 8);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('DEF', bX + 325, bY + 14);
  ctx.font = 'bold 18px "Arial Black",Arial'; ctx.fillText(`L${game.level}`, bX + 325, bY + 30);
  ctx.font = '9px Arial'; ctx.fillText(`${dc.icon} ${dc.name.split(' ')[1]}`, bX + 325, bY + 44);
  ctx.fillStyle = '#888'; ctx.font = 'bold 10px Arial'; ctx.fillText(`Q${Math.min(4, Math.ceil(game.level / 3))}`, bX + bW - 22, bY + 16);
  ctx.fillStyle = COL.uiGold; ctx.font = '8px Arial'; ctx.fillText(`💰${game.gold}`, bX + bW - 22, bY + 36);
  if (game.highlightTimer > 0) {
    game.highlightTimer -= 0.016;
    ctx.save(); const hAlpha = Math.min(1, game.highlightTimer);
    ctx.globalAlpha = hAlpha; ctx.fillStyle = COL.uiGold;
    drawRoundedRect(ctx, W / 2 - 50, bY - 24, 100, 20, 4); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⭐ HIGHLIGHT ⭐', W / 2, bY - 12); ctx.restore();
  }
  ctx.restore();
}

function drawPoiseRating() {
  const level = getComposureLevel();
  const labels = { cool: 'COOL', nervous: 'NERVOUS', shaky: 'SHAKY', tilted: 'TILTED' };
  const colors = { cool: COL.uiGreen, nervous: COL.uiYellow, shaky: '#f80', tilted: COL.uiRed };
  const px = W - 62, py = 80, col = colors[level];
  const poise = 100 - game.stress;
  ctx.save(); drawRoundedRect(ctx, px - 4, py - 4, 58, 54, 3);
  ctx.fillStyle = COL.uiBg; ctx.fill();
  ctx.fillStyle = '#888'; ctx.font = '7px Arial'; ctx.textAlign = 'center'; ctx.fillText('POISE', px + 25, py + 6);
  const segW = 4, segH = 12, startX = px + 1;
  for (let s = 0; s < 10; s++) {
    const filled = poise >= (s + 1) * 10;
    const segColor = s < 3 ? COL.uiRed : s < 6 ? COL.uiYellow : COL.uiGreen;
    ctx.fillStyle = filled ? segColor : 'rgba(255,255,255,0.1)';
    ctx.fillRect(startX + s * (segW + 1), py + 14, segW, segH);
    if (filled && (s === 2 || s === 5 || s === 9)) {
      ctx.save(); ctx.shadowColor = segColor; ctx.shadowBlur = 6;
      ctx.fillRect(startX + s * (segW + 1), py + 14, segW, segH); ctx.restore();
    }
  }
  ctx.fillStyle = col; ctx.font = 'bold 12px Arial'; ctx.fillText(Math.round(poise), px + 25, py + 38);
  ctx.font = 'bold 6px Arial'; ctx.fillText(labels[level], px + 25, py + 48);
  ctx.restore();
}

function drawRelicsBar() {
  if (relics.length === 0) return;
  ctx.save(); ctx.font = '12px serif'; ctx.textAlign = 'left';
  for (let i = 0; i < relics.length; i++) { ctx.globalAlpha = 0.8; ctx.fillText(relics[i].icon, 6 + i * 16, 86); }
  ctx.globalAlpha = 1; ctx.restore();
}

function drawTopBar() {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, 60);
  g.addColorStop(0, 'rgba(10,10,20,0.85)'); g.addColorStop(1, 'rgba(10,10,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 60);
  if (currentPlay) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
    ctx.fillText(currentPlay.offense.name, 10, 20);
    if ((hasRelic('film_study') || game.scoutReport || game.filmStudyFloorsLeft > 0) && currentPlay) {
      ctx.fillStyle = COL.uiRed; ctx.font = '9px Arial';
      ctx.fillText(`DEF: ${currentPlay.defense.name}`, 10, 36);
    }
    const dc = getCurrentDC();
    ctx.fillStyle = COL.uiOrange; ctx.font = '8px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`${dc.icon} ${dc.name}`, 10, 50);
  }
  ctx.fillStyle = '#aaa'; ctx.font = '8px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`QB ACC:${qb.accuracy} ARM:${qb.arm}`, W - 10, 20);
  if (game.state === 'simulation' && sim) {
    const ptColors = { bullet: COL.bulletRed, touch: COL.touchYellow, lob: COL.lobBlue };
    const ptNames = { bullet: 'BULLET', touch: 'TOUCH', lob: 'LOB' };
    ctx.fillStyle = ptColors[game.passType]; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`🏈 ${ptNames[game.passType]}`, W - 10, 36);
  }
  const weather = Weather.getWeatherForFloor(game.level);
  if (weather !== 'day') {
    const wIcons = { dusk: '🌅', night: '🌙', rain: Weather.isSnow() ? '❄️' : '🌧️' };
    const wNames = { dusk: 'DUSK', night: 'NIGHT', rain: Weather.isSnow() ? 'SNOW' : 'RAIN' };
    ctx.fillStyle = '#aaa'; ctx.font = '8px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`${wIcons[weather]} ${wNames[weather]}`, W - 10, 50);
  }
  ctx.restore();
}

// ============================================================
// FIELD DRAWING
// ============================================================
function drawField() {
  if (!fieldTexture) generateFieldTexture();
  ctx.drawImage(fieldTexture, 0, 0);
  Weather.drawWeatherOverlay(ctx);
  const fl = FIELD.left, fw = FIELD.width;
  const losScr = FIELD.toScreen(game.ballYardLine, 0);
  const fdScr = FIELD.toScreen(game.firstDownLine, 0);
  ctx.save(); ctx.fillStyle = 'rgba(255,204,0,0.08)';
  ctx.fillRect(fl, Math.min(losScr.y, fdScr.y), fw, Math.abs(fdScr.y - losScr.y)); ctx.restore();
  ctx.save(); ctx.shadowColor = COL.uiYellow; ctx.shadowBlur = 10;
  ctx.strokeStyle = COL.uiYellow; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(fl - 5, losScr.y); ctx.lineTo(fl + fw + 5, losScr.y); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.shadowColor = '#f80'; ctx.shadowBlur = 8;
  ctx.strokeStyle = '#f80'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(fl, fdScr.y); ctx.lineTo(fl + fw, fdScr.y); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#f80'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'right';
  ctx.globalAlpha = 0.6; ctx.fillText('1ST', fl - 3, fdScr.y + 3); ctx.globalAlpha = 1;
}

function drawPlayer(x, y, team, action, frame, number, isQB, highlight, scale) {
  const s = scale || 1;
  ctx.save();
  const weather = Weather.getWeatherForFloor(game.level);
  const shadowScale = weather === 'dusk' ? 1.8 : weather === 'night' ? 0.6 : 1;
  const shadowAngle = weather === 'dusk' ? 0.4 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath();
  ctx.ellipse(x + (weather === 'dusk' ? 8 : 0), y + 5, 11 * s, 4 * s * shadowScale, shadowAngle, 0, Math.PI * 2);
  ctx.fill(); ctx.restore();
  if (sprites.ready) sprites.drawSprite(ctx, x, y, team, action, 0, frame, number, s);
  else {
    ctx.fillStyle = team === 'offense' ? '#fff' : '#c22';
    ctx.beginPath(); ctx.arc(x, y - 15, 10 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = `${8 * s}px Arial`; ctx.textAlign = 'center';
    ctx.fillText(String(number || ''), x, y - 12);
  }
  if (weather === 'night' && team === 'offense') {
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y - 15, 14 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (weather === 'rain' && !Weather.isSnow()) {
    ctx.save(); ctx.globalAlpha = 0.08; ctx.scale(1, -0.3);
    const reflY = -(y + 15) / 0.3;
    if (sprites.ready) sprites.drawSprite(ctx, x, reflY, team, action, 0, frame, number, s);
    ctx.restore();
  }
  if (highlight) {
    ctx.save();
    const p = Math.sin(game.time * 5) * 0.2 + 0.8;
    ctx.globalAlpha = p * 0.5; ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 10, 18 * s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
}

function drawBall(x, y, trail) {
  if (trail && trail.length > 1) {
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const scr = FIELD.toScreen(trail[i].yard, trail[i].lane);
      if (i === 0) ctx.moveTo(scr.x, scr.y); else ctx.lineTo(scr.x, scr.y);
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  ctx.save(); ctx.fillStyle = COL.ball;
  ctx.beginPath(); ctx.ellipse(x, y, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(x - 1, y - 1, 2.5, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COL.ballLace; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x - 2, y - 0.5); ctx.lineTo(x + 2, y - 0.5); ctx.stroke();
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 1.5, y - 1.5); ctx.lineTo(x + i * 1.5, y + 0.5); ctx.stroke(); }
  ctx.restore();
}

function drawRouteLines(alpha, animProgress) {
  if (!currentPlay) return;
  for (let i = 0; i < 4; i++) {
    const wr = currentPlay.offense.wrs[i], path = routePaths[wr.route](wr.yard, wr.lane), color = WR_COLORS[i];
    const points = [FIELD.toScreen(wr.yard, wr.lane)];
    for (const pt of path) points.push(FIELD.toScreen(pt.yard, pt.lane));
    const prog = animProgress !== undefined ? animProgress : 1;
    ctx.save(); ctx.globalAlpha = alpha || 0.7;
    let totalLen = 0;
    for (let j = 1; j < points.length; j++) {
      const dx = points[j].x - points[j - 1].x, dy = points[j].y - points[j - 1].y;
      totalLen += Math.sqrt(dx * dx + dy * dy);
    }
    const drawLen = totalLen * prog; let drawn = 0, lastPt = points[0], endPt = points[0];
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(lastPt.x, lastPt.y);
    for (let j = 1; j < points.length; j++) {
      const dx = points[j].x - points[j - 1].x, dy = points[j].y - points[j - 1].y;
      const sl = Math.sqrt(dx * dx + dy * dy);
      if (drawn + sl <= drawLen) {
        ctx.lineTo(points[j].x, points[j].y); lastPt = points[j]; endPt = points[j]; drawn += sl;
      } else {
        const rem = drawLen - drawn, t = rem / sl;
        const ex = points[j - 1].x + dx * t, ey = points[j - 1].y + dy * t;
        ctx.lineTo(ex, ey); endPt = { x: ex, y: ey }; break;
      }
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    if (prog > 0.1) {
      const adx = endPt.x - lastPt.x, ady = endPt.y - lastPt.y, al = Math.sqrt(adx * adx + ady * ady);
      if (al > 3) {
        const ux = adx / al, uy = ady / al, hl = 10;
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(endPt.x, endPt.y);
        ctx.lineTo(endPt.x - ux * hl + uy * hl * 0.4, endPt.y - uy * hl - ux * hl * 0.4);
        ctx.lineTo(endPt.x - ux * hl - uy * hl * 0.4, endPt.y - uy * hl + ux * hl * 0.4);
        ctx.closePath(); ctx.fill();
      }
    }
    if (prog >= 0.9) {
      const end = points[points.length - 1];
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const tw = 30; drawRoundedRect(ctx, end.x - tw / 2 - 4, end.y - 18, tw + 8, 14, 3); ctx.fill();
      ctx.fillStyle = color; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
      ctx.fillText(wr.route.toUpperCase(), end.x, end.y - 9);
    }
    ctx.restore();
  }
}

function drawBroadcastButton(btn, hover) {
  const { x, y, w, h, text } = btn;
  ctx.save();
  if (hover) { drawRoundedRect(ctx, x, y, w, h, 4); ctx.fillStyle = COL.uiAccent; ctx.globalAlpha = 0.2; ctx.fill(); ctx.globalAlpha = 1; }
  drawRoundedRect(ctx, x, y, w, h, 4);
  ctx.strokeStyle = hover ? COL.uiAccent : 'rgba(255,255,255,0.3)'; ctx.lineWidth = hover ? 2 : 1; ctx.stroke();
  ctx.fillStyle = hover ? '#fff' : COL.uiWhite;
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2); ctx.restore();
}

// ============================================================
// V11: UPGRADED TITLE SCREEN with Career Stats + Challenge
// ============================================================
let titleAnim = { timer: 0, spriteFrame: 0, panOffset: 0 };
let challengeInput = '';
let showChallengeInput = false;

function drawTitle(dt) {
  titleAnim.timer += dt; titleAnim.spriteFrame = Math.floor(titleAnim.timer * 8);
  titleAnim.panOffset = Math.sin(titleAnim.timer * 0.3) * 20;
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  if (fieldTexture) {
    ctx.save(); ctx.globalAlpha = 0.35;
    ctx.translate(titleAnim.panOffset, Math.sin(titleAnim.timer * 0.2) * 10);
    ctx.drawImage(fieldTexture, 0, 0); ctx.restore();
  }
  const dg = ctx.createRadialGradient(W / 2, 320, 60, W / 2, 320, W);
  dg.addColorStop(0, 'rgba(10,10,20,0)'); dg.addColorStop(1, 'rgba(10,10,20,0.7)');
  ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pulse = Math.sin(titleAnim.timer * 2) * 0.15 + 0.85;
  ctx.shadowColor = COL.uiAccent; ctx.shadowBlur = 25 * pulse;
  ctx.font = 'bold 40px "Arial Black",Arial'; ctx.fillStyle = '#fff';
  ctx.fillText('QB CHALLENGE', W / 2, 80); ctx.shadowBlur = 0;
  const mg = ctx.createLinearGradient(W / 2 - 120, 60, W / 2 + 120, 100);
  mg.addColorStop(0, '#999'); mg.addColorStop(0.2, '#fff'); mg.addColorStop(0.4, '#ffd700');
  mg.addColorStop(0.6, '#fff'); mg.addColorStop(0.8, '#ccc'); mg.addColorStop(1, '#ffd700');
  ctx.fillStyle = mg; ctx.fillText('QB CHALLENGE', W / 2, 80);
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = COL.uiGold;
  ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 10;
  ctx.fillText('DYNASTY EDITION', W / 2, 108); ctx.shadowBlur = 0;
  // V11: Version badge
  ctx.fillStyle = 'rgba(255,215,0,0.2)'; drawRoundedRect(ctx, W - 45, 10, 35, 18, 4); ctx.fill();
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 9px Arial'; ctx.fillText('V11', W - 28, 21);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 100, 122); ctx.lineTo(W / 2 + 100, 122); ctx.stroke();

  // V11: Career Stats Summary
  if (Career.data && Career.data.seasons > 0) {
    ctx.save();
    drawRoundedRect(ctx, 20, 130, W - 40, 80, 5);
    ctx.fillStyle = 'rgba(15,15,25,0.85)'; ctx.fill();
    ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('CAREER STATS', W / 2, 144);
    ctx.fillStyle = '#ccc'; ctx.font = '9px Arial';
    ctx.fillText(`Season ${Career.data.seasons + 1} · ${Career.getCareerCompPct()}% COMP · ${Career.data.careerYards} YDS · ${Career.data.careerTD} TD · ${Career.data.careerINT} INT`, W / 2, 160);
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 10px Arial';
    ctx.fillText(`Best Rating: ${Career.data.bestRating.toFixed(1)}`, W / 2, 178);
    // Legacy bonus
    const legacy = Career.getLegacyBonus();
    if (legacy > 0) {
      ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 9px Arial';
      ctx.fillText(`⬆ Legacy Bonus: +${legacy} ACC`, W / 2, 194);
    }
    // Milestone badges
    const allM = Career.getAllMilestones();
    const badgeStartX = W / 2 - (allM.length * 18) / 2;
    for (let i = 0; i < allM.length; i++) {
      const unlocked = Career.data.milestones.includes(allM[i].id);
      ctx.globalAlpha = unlocked ? 1 : 0.2;
      ctx.font = '12px serif'; ctx.textAlign = 'left';
      ctx.fillText(allM[i].icon, badgeStartX + i * 18, 206);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Background WRs
  const routePhase = (titleAnim.timer % 4) / 4;
  const bgWR1X = 80 + routePhase * 100, bgWR1Y = 260 - Math.sin(routePhase * Math.PI) * 30;
  const bgWR2X = W - 80 - routePhase * 80, bgWR2Y = 310 - Math.sin(routePhase * Math.PI * 0.7) * 40;
  ctx.save(); ctx.globalAlpha = 0.4;
  drawPlayer(bgWR1X, bgWR1Y, 'offense', 'run', titleAnim.spriteFrame, 13, false, false, 0.9);
  drawPlayer(bgWR2X, bgWR2Y, 'offense', 'run', titleAnim.spriteFrame, 84, false, false, 0.9);
  ctx.restore();

  const tp = (titleAnim.timer % 3) / 3, tf = tp < 0.3 ? 0 : tp < 0.5 ? 1 : tp < 0.7 ? 2 : 3;
  drawPlayer(W / 2 - 50, 380, 'offense', 'throw', tf, 7, true, false, 1.3);
  drawPlayer(W / 2 + 80, 310, 'offense', 'run', titleAnim.spriteFrame, 81, false, false, 1.1);

  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('阅读防守 · WR信任 · 半场调整 · 挑战码 · 赛季回顾', W / 2, 420);

  genericButtons = [];
  const bx2 = W / 2 - 80, by2 = 450;
  genericButtons.push({ x: bx2, y: by2, w: 160, h: 45, text: '开 始 游 戏', action: 'start' });
  ctx.save(); ctx.shadowColor = COL.uiAccent; ctx.shadowBlur = 15 * (Math.sin(game.time * 3) * 0.3 + 0.7);
  drawBroadcastButton(genericButtons[0], isInsideRect(mouseX, mouseY, bx2, by2, 160, 45)); ctx.restore();

  // V11: Challenge button
  const cbx = W / 2 - 70, cby = 510;
  genericButtons.push({ x: cbx, y: cby, w: 140, h: 35, text: '🏆 CHALLENGE', action: 'challenge' });
  drawBroadcastButton(genericButtons[1], isInsideRect(mouseX, mouseY, cbx, cby, 140, 35));

  // Challenge input overlay
  if (showChallengeInput) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    drawRoundedRect(ctx, 40, H / 2 - 80, W - 80, 160, 8);
    ctx.fillStyle = 'rgba(15,15,25,0.95)'; ctx.fill();
    ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
    ctx.fillText('ENTER CHALLENGE CODE', W / 2, H / 2 - 50);
    // Input display
    drawRoundedRect(ctx, 60, H / 2 - 30, W - 120, 30, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(challengeInput || 'QBXXXXXXXX', W / 2, H / 2 - 13);
    // Buttons
    const goBtn = { x: W / 2 - 60, y: H / 2 + 15, w: 50, h: 30, text: 'GO', action: 'challenge_go' };
    const cancelBtn = { x: W / 2 + 10, y: H / 2 + 15, w: 50, h: 30, text: '✕', action: 'challenge_cancel' };
    genericButtons.push(goBtn, cancelBtn);
    drawBroadcastButton(goBtn, isInsideRect(mouseX, mouseY, goBtn.x, goBtn.y, goBtn.w, goBtn.h));
    drawBroadcastButton(cancelBtn, isInsideRect(mouseX, mouseY, cancelBtn.x, cancelBtn.y, cancelBtn.w, cancelBtn.h));
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '9px Arial';
    ctx.fillText('Type code with keyboard', W / 2, H / 2 + 60);
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('V11 Dynasty Mode · Career Saves · WR Trust · Halftime · Seed Challenges', W / 2, 560);
  drawParticles();
}

// ============================================================
// MAP SCREEN
// ============================================================
let mapButtons = [];
function drawMapScreen() {
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  const spot = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, 400);
  spot.addColorStop(0, 'rgba(255,255,220,0.06)'); spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = COL.uiBg; ctx.fillRect(0, 0, W, 52);
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(0, 50, W, 2);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Arial Black",Arial'; ctx.textAlign = 'center';
  ctx.fillText('SEASON SCHEDULE', W / 2, 22);
  ctx.fillStyle = COL.uiGold; ctx.font = '10px Arial';
  ctx.fillText(`Week ${game.level} · ${game.score} PTS · 💰${game.gold}`, W / 2, 40); ctx.restore();
  const dc = getCurrentDC();
  ctx.save(); drawRoundedRect(ctx, 10, 55, W - 20, 28, 4);
  ctx.fillStyle = 'rgba(200,50,50,0.2)'; ctx.fill();
  ctx.strokeStyle = COL.uiRed; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`${dc.icon} ${dc.name} — ${dc.desc}`, W / 2, 72); ctx.restore();
  if (!mapData) return;
  const floors = mapData.floors, flH = (H - 120) / floors.length;
  mapButtons = [];
  for (let f = 0; f < floors.length - 1; f++) {
    for (let n = 0; n < floors[f].length; n++) {
      const node = floors[f][n], ny = 95 + f * flH;
      for (const ci of node.connections) {
        if (!floors[f + 1][ci]) continue;
        const nn = floors[f + 1][ci], nny = 95 + (f + 1) * flH;
        const ip = mapData.visited.has(`${f}_${n}`);
        ctx.save(); ctx.strokeStyle = ip ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = ip ? 2 : 1; ctx.setLineDash(ip ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(node.x, ny + 16); ctx.lineTo(nn.x, nny - 16); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
    }
  }
  for (let f = 0; f < floors.length; f++) {
    const ny = 95 + f * flH;
    if (f === 3 || f === 6 || f === 9) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,100,100,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(15, ny - flH / 2); ctx.lineTo(W - 15, ny - flH / 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      // V11: Halftime marker
      if (f === 6) {
        ctx.fillStyle = COL.uiGold; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'left';
        ctx.fillText('HALFTIME', 18, ny - flH / 2 - 4);
      }
    }
    for (let n = 0; n < floors[f].length; n++) {
      const node = floors[f][n], nt = NODE_TYPES[node.type];
      const iv = mapData.visited.has(`${f}_${n}`);
      const ia = f === (mapData.currentFloor < 0 ? 0 : mapData.currentFloor + 1) && isNodeAccessible(f, n);
      const ic = f === mapData.currentFloor && n === mapData.currentNode;
      const cw = 52, ch = 30, cx2 = node.x - cw / 2, cy2 = ny - ch / 2;
      ctx.save(); drawRoundedRect(ctx, cx2, cy2, cw, ch, 4);
      if (ia) {
        ctx.fillStyle = 'rgba(25,25,40,0.9)'; ctx.fill();
        ctx.strokeStyle = nt.color; ctx.lineWidth = 2; ctx.stroke();
        const p = Math.sin(game.time * 4) * 0.3 + 0.7;
        ctx.shadowColor = nt.color; ctx.shadowBlur = 8 * p; ctx.stroke(); ctx.shadowBlur = 0;
        mapButtons.push({ x: cx2 - 5, y: cy2 - 5, w: cw + 10, h: ch + 10, floor: f, node: n });
      } else if (ic) {
        ctx.fillStyle = 'rgba(30,90,255,0.3)'; ctx.fill();
        ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.fillStyle = iv ? 'rgba(40,40,50,0.5)' : 'rgba(25,25,35,0.7)'; ctx.fill();
        ctx.strokeStyle = iv ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = ia ? 1 : iv ? 0.3 : 0.6;
      ctx.fillText(nt.icon, node.x - 8, ny);
      ctx.font = 'bold 7px Arial'; ctx.fillStyle = ia ? nt.color : '#888';
      ctx.fillText(nt.name, node.x + 10, ny); ctx.globalAlpha = 1; ctx.restore();
      if (n === 0) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '7px Arial'; ctx.textAlign = 'right'; ctx.fillText(`WK${f + 1}`, 22, ny); }
    }
  }
  if (mapData.currentNode >= 0 && mapData.currentFloor >= 0) {
    const cf = mapData.currentFloor, cn = mapData.currentNode;
    if (floors[cf] && floors[cf][cn]) {
      const node = floors[cf][cn], ny = 95 + cf * flH;
      ctx.fillStyle = COL.uiGold; ctx.font = '10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('▼', node.x, ny - 22);
    }
  }
  drawParticles();
}

function isNodeAccessible(floor, nodeIdx) {
  if (mapData.currentFloor < 0) return floor === 0;
  if (floor !== mapData.currentFloor + 1) return false;
  const cf = mapData.currentFloor, cn = mapData.currentNode;
  if (cn < 0) return floor === 0;
  if (!mapData.floors[cf] || !mapData.floors[cf][cn]) return false;
  return mapData.floors[cf][cn].connections.includes(nodeIdx);
}

// ============================================================
// READING PHASE
// ============================================================
let motionAnimTimer = 0, motionAnimPhase = 'idle';
let motionWROrigLane = 0;
let audibleAnim = { active: false, timer: 0, textFlash: 0 };

function drawReadingPhase(dt) {
  Camera.beginTransform(); drawField();
  if (!currentPlay) { Camera.endTransform(); return; }
  game.readingTimer += dt; const rd = 2.5, ra = Math.min(1, game.readingTimer / (rd * 0.8));
  Camera.setForPhase('reading');
  if (motionAnimPhase === 'moving') {
    motionAnimTimer += dt;
    const motionWR = currentPlay.motionWR;
    const motionDir = currentPlay.offense.wrs[motionWR].lane < 30 ? 1 : -1;
    const motionDist = 12 * motionDir;
    const motionProgress = Math.min(1, motionAnimTimer / 0.8);
    if (motionProgress > 0.5 && motionAnimPhase === 'moving') {
      game.motionResult = currentPlay.coverageIsMan ? 'man' : 'zone';
    }
    if (motionProgress >= 1) {
      motionAnimPhase = 'result'; motionAnimTimer = 0;
      game.motionUsed = true; currentPlay.motionUsed = true;
      currentPlay.motionResult = game.motionResult;
      currentPlay.wrScores = evaluateReceivers(currentPlay.offense, currentPlay.defense, currentPlay.isElite, currentPlay.isBoss);
      currentPlay.bestWR = currentPlay.wrScores.indexOf(Math.max(...currentPlay.wrScores));
      Camera.setForPhase('reading');
      if (game.motionResult === 'man') Commentary.generate('presnap_motion_man');
      else Commentary.generate('presnap_motion_zone');
    } else { Camera.setForPhase('motion'); }
  }
  if (audibleAnim.active) { audibleAnim.timer += dt; if (audibleAnim.timer > 1.0) audibleAnim.active = false; }
  const dn = [21, 24, 32, 45];
  for (let i = 0; i < 4; i++) {
    const db = currentPlay.defense.dbs[i]; let hy = db.yard, hl = db.lane;
    const dr = Math.sin(game.time * 2) * 0.5;
    if ((motionAnimPhase === 'moving' || motionAnimPhase === 'result') && db.role === 'man' && db.coverIdx === currentPlay.motionWR && currentPlay.coverageIsMan) {
      const motionDir = currentPlay.offense.wrs[currentPlay.motionWR].lane < 30 ? 1 : -1;
      const motionOffset = 12 * motionDir * Math.min(1, motionAnimTimer / 0.8);
      hl = db.lane + (motionAnimPhase === 'result' ? 12 * motionDir : motionOffset);
    }
    if (currentPlay.defense.coverType === 'man' && db.coverIdx >= 0) {
      const wr = currentPlay.offense.wrs[db.coverIdx];
      hl += (wr.lane - db.lane) * 0.05 * (game.readingTimer / rd);
    } else if (currentPlay.defense.coverType === 'zone') hl += dr;
    const scr = FIELD.toScreen(hy, hl);
    drawPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), dn[i], false, false);
  }
  let ry = currentPlay.defense.rusher.yard;
  if (currentPlay.defense.coverType === 'blitz') ry += 2 * (game.readingTimer / rd);
  const rs = FIELD.toScreen(ry, currentPlay.defense.rusher.lane);
  drawPlayer(rs.x, rs.y, 'defense', 'idle', Math.floor(game.time * 4), 99, false, false);
  drawRouteLines(0.7, ra);
  for (let i = 0; i < 4; i++) {
    let wrLane = currentPlay.offense.wrs[i].lane;
    if (i === currentPlay.motionWR && (motionAnimPhase === 'moving' || motionAnimPhase === 'result')) {
      const motionDir = currentPlay.offense.wrs[i].lane < 30 ? 1 : -1;
      const progress = motionAnimPhase === 'result' ? 1 : Math.min(1, motionAnimTimer / 0.8);
      wrLane = motionWROrigLane + 12 * motionDir * progress;
    }
    const scr = FIELD.toScreen(currentPlay.offense.wrs[i].yard, wrLane);
    const isMotionWR = i === currentPlay.motionWR;
    drawPlayer(scr.x, scr.y, 'offense', isMotionWR && motionAnimPhase === 'moving' ? 'run' : 'idle', Math.floor(game.time * 4), wrs[i].num, false, isMotionWR && motionAnimPhase !== 'result');
    ctx.fillStyle = WR_COLORS[i]; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText(wrs[i].name, scr.x, scr.y + 14);
  }
  const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
  drawPlayer(qs.x, qs.y, 'offense', 'idle', Math.floor(game.time * 4), 7, true, false, 1.1);
  if (audibleAnim.active) {
    ctx.save(); const flashAlpha = Math.max(0, 1 - audibleAnim.timer / 1.0);
    ctx.globalAlpha = flashAlpha; ctx.fillStyle = COL.uiGold; ctx.font = 'bold 24px "Arial Black"'; ctx.textAlign = 'center';
    ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 15;
    ctx.fillText('AUDIBLE!', W / 2, H / 2 - 40); ctx.shadowBlur = 0; ctx.restore();
  }
  Camera.endTransform(); Weather.drawParticles(ctx);
  ctx.save(); drawRoundedRect(ctx, W / 2 - 90, H - 215, 180, 28, 4);
  ctx.fillStyle = COL.uiBg; ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center'; ctx.fillText('📖 阅读防守中...', W / 2, H - 199);
  const tbW = 160, tbX = W / 2 - tbW / 2, tbY = H - 188;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(tbX, tbY, tbW, 3);
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(tbX, tbY, tbW * Math.min(1, game.readingTimer / rd), 3);
  ctx.restore();
  genericButtons = [];
  if (!game.motionUsed && motionAnimPhase === 'idle') {
    const mb = { x: W - 130, y: H - 250, w: 120, h: 36, text: 'MOTION ➡', action: 'motion' };
    genericButtons.push(mb); ctx.save();
    const mh = isInsideRect(mouseX, mouseY, mb.x, mb.y, mb.w, mb.h);
    drawRoundedRect(ctx, mb.x, mb.y, mb.w, mb.h, 6);
    ctx.fillStyle = mh ? 'rgba(30,90,255,0.4)' : 'rgba(30,90,255,0.2)'; ctx.fill();
    ctx.strokeStyle = COL.uiAccent; ctx.lineWidth = mh ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mb.text, mb.x + mb.w / 2, mb.y + mb.h / 2); ctx.restore();
  }
  if (motionAnimPhase === 'result' && game.motionResult) {
    ctx.save();
    const resText = game.motionResult === 'man' ? '🔴 MAN DETECTED!' : '🟢 ZONE DETECTED!';
    const resColor = game.motionResult === 'man' ? COL.uiRed : COL.uiGreen;
    drawRoundedRect(ctx, W / 2 - 80, H - 270, 160, 30, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
    ctx.strokeStyle = resColor; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = resColor; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(resText, W / 2, H - 255); ctx.restore();
  }
  if (game.audiblesLeft > 0) {
    const ab = { x: 10, y: H - 248, w: 100, h: 24, text: `变阵 (${game.audiblesLeft})`, action: 'audible' };
    genericButtons.push(ab);
    drawBroadcastButton(ab, isInsideRect(mouseX, mouseY, ab.x, ab.y, ab.w, ab.h));
  }
  drawWRCards(false); drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles();
  Commentary.draw(ctx);
  if (game.readingTimer >= rd) { game.state = 'choosing'; game.readingPhase = false; }
}

// ============================================================
// WR CARDS — V11: Trust meters + status emoji
// ============================================================
let cardButtons = [];
function drawWRCards(interactive) {
  if (!currentPlay) return;
  const cW = 100, cH = 155, totalW = 4 * cW + 3 * 8, startX = (W - totalW) / 2, baseY = H - cH - 60;
  cardButtons = [];
  for (let i = 0; i < 4; i++) {
    const wr = wrs[i], pw = currentPlay.offense.wrs[i], prob = calculateCatchProb(i, 'touch');
    const ih = interactive && isInsideRect(mouseX, mouseY, startX + i * (cW + 8), baseY, cW, cH);
    const ib = i === currentPlay.bestWR;
    let cx2 = startX + i * (cW + 8), cy2 = baseY;
    if (ih) cy2 -= 10;
    cardButtons.push({ x: cx2, y: cy2, w: cW, h: cH, wrIndex: i });
    const trust = getTrustStatus(i);
    ctx.save();
    // V11: Trust-based border glow
    if (trust.status === 'clutch') {
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
    } else if (trust.status === 'cold' || trust.status === 'frustrated') {
      ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 6;
    }
    drawRoundedRect(ctx, cx2, cy2, cW, cH, 5);
    ctx.fillStyle = ih ? 'rgba(25,35,60,0.95)' : 'rgba(15,15,25,0.92)'; ctx.fill();
    ctx.strokeStyle = ih ? COL.uiGold : WR_COLORS[i]; ctx.lineWidth = ih ? 2 : 1; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = WR_COLORS[i]; ctx.fillRect(cx2 + 2, cy2 + 2, cW - 4, 3);
    if (i === currentPlay.motionWR && game.motionUsed) {
      const mCol = game.motionResult === 'man' ? COL.uiRed : COL.uiGreen;
      ctx.fillStyle = mCol; ctx.globalAlpha = 0.15;
      ctx.fillRect(cx2, cy2, cW, cH); ctx.globalAlpha = 1;
    }
    drawPlayer(cx2 + cW / 2, cy2 + 35, 'offense', 'idle', Math.floor(game.time * 4), wr.num, false, false, 0.8);
    // V11: Name + trust emoji
    ctx.fillStyle = WR_COLORS[i]; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`${wr.name} ${trust.emoji}`, cx2 + cW / 2, cy2 + 52);
    // V11: Trust meter bar
    const trustBarW = cW - 16, trustBarH = 4;
    const trustX = cx2 + 8, trustY = cy2 + 56;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(trustX, trustY, trustBarW, trustBarH);
    const trustPct = game.wrTrust[i] / 100;
    const trustColor = trustPct > 0.7 ? COL.uiGreen : trustPct > 0.4 ? COL.uiYellow : COL.uiRed;
    ctx.fillStyle = trustColor; ctx.fillRect(trustX, trustY, trustBarW * trustPct, trustBarH);

    drawRadarChart(ctx, cx2 + cW / 2, cy2 + 82, 16,
      [wr.spd, wr.cat, wr.rte, (wr.spd + wr.cat + wr.rte) / 3, wr.rte],
      ['SPD', 'CAT', 'RTE', 'AWR', 'OVR'], WR_COLORS[i]);
    const re = routePaths[pw.route](0, 0), rsc = 1.5, rbx = cx2 + cW / 2, rby = cy2 + 108;
    ctx.strokeStyle = WR_COLORS[i]; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
    let px2 = rbx, py2 = rby;
    for (const pt of re) {
      const nx = rbx + pt.lane * rsc, ny = rby - pt.yard * rsc;
      ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(nx, ny); ctx.stroke();
      px2 = nx; py2 = ny;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '7px Arial';
    ctx.fillText(pw.route.toUpperCase(), cx2 + cW / 2, cy2 + 123);
    const pc = prob >= 60 ? COL.uiGreen : prob >= 35 ? COL.uiYellow : COL.uiRed;
    ctx.fillStyle = pc; ctx.font = 'bold 16px "Arial Black",Arial';
    ctx.fillText(`${Math.round(prob)}%`, cx2 + cW / 2, cy2 + 143);
    if (ib && (hasRelic('film_study') || game.scoutReport || game.filmStudyFloorsLeft > 0)) {
      ctx.fillStyle = COL.uiGold; ctx.font = '12px serif'; ctx.textAlign = 'right';
      ctx.fillText('★', cx2 + cW - 5, cy2 + 16);
    }
    const syns = checkSynergies(i);
    if (syns.length > 0) { ctx.fillStyle = '#f6a'; ctx.font = '7px Arial'; ctx.textAlign = 'left'; ctx.fillText('★' + syns[0].name, cx2 + 4, cy2 + cH - 4); }
    ctx.restore();
  }
}

// ============================================================
// CHOOSING SCREEN
// ============================================================
function drawChoosingScreen() {
  Camera.beginTransform(); drawField();
  if (!currentPlay) { Camera.endTransform(); return; }
  Camera.setForPhase('choosing');
  const dn = [21, 24, 32, 45];
  for (let i = 0; i < 4; i++) {
    const db = currentPlay.defense.dbs[i], scr = FIELD.toScreen(db.yard, db.lane);
    drawPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), dn[i], false, false);
  }
  const rs2 = FIELD.toScreen(currentPlay.defense.rusher.yard, currentPlay.defense.rusher.lane);
  drawPlayer(rs2.x, rs2.y, 'defense', 'idle', Math.floor(game.time * 4), 99, false, false);
  drawRouteLines(0.6, 1);
  for (let i = 0; i < 4; i++) {
    const wr = currentPlay.offense.wrs[i], scr = FIELD.toScreen(wr.yard, wr.lane);
    let hl = false;
    for (const cb of cardButtons) if (cb.wrIndex === i && isInsideRect(mouseX, mouseY, cb.x, cb.y, cb.w, cb.h)) hl = true;
    drawPlayer(scr.x, scr.y, 'offense', 'idle', Math.floor(game.time * 4), wrs[i].num, false, hl);
    ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const tagW = ctx.measureText(`#${wrs[i].num} ${wrs[i].name}`).width || 40;
    drawRoundedRect(ctx, scr.x - tagW / 2 - 4, scr.y + 8, tagW + 8, 14, 3); ctx.fill();
    ctx.fillStyle = WR_COLORS[i]; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.globalAlpha = 1;
    ctx.fillText(`#${wrs[i].num} ${wrs[i].name}`, scr.x, scr.y + 18); ctx.restore();
  }
  const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
  drawPlayer(qs.x, qs.y, 'offense', 'idle', Math.floor(game.time * 4), 7, true, false, 1.1);
  Camera.endTransform(); Weather.drawParticles(ctx);
  ctx.save(); drawRoundedRect(ctx, W / 2 - 120, H - 220, 240, 28, 4);
  ctx.fillStyle = COL.uiBg; ctx.fill(); ctx.fillStyle = COL.uiGold;
  ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('👇 点击下方卡牌选择传球目标!', W / 2, H - 204); ctx.restore();
  drawWRCards(true); drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles();
  Commentary.draw(ctx);
}

// ============================================================
// PASS TYPE SELECTION SCREEN
// ============================================================
let passTypeTimer = 0;
let passTypeButtons = [];
function drawPassTypeScreen(dt) {
  passTypeTimer += dt;
  Camera.beginTransform(); drawField();
  if (currentPlay) {
    const dn = [21, 24, 32, 45];
    for (let i = 0; i < 4; i++) {
      const scr = FIELD.toScreen(currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane);
      drawPlayer(scr.x, scr.y, 'offense', 'idle', Math.floor(game.time * 4), wrs[i].num, false, i === sim.chosenWR);
    }
    for (let i = 0; i < 4; i++) {
      const db = currentPlay.defense.dbs[i], scr = FIELD.toScreen(db.yard, db.lane);
      drawPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), dn[i], false, false);
    }
    const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
    drawPlayer(qs.x, qs.y, 'offense', 'throw', 0, 7, true, false, 1.1);
    drawRouteLines(0.3, 1);
  }
  Camera.endTransform(); Weather.drawParticles(ctx);
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H / 2 - 80, W, 160);
  const timeLeft = Math.max(0, 2.0 - passTypeTimer), timerPct = timeLeft / 2.0;
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(40, H / 2 - 70, W - 80, 6);
  ctx.fillStyle = timerPct > 0.3 ? COL.uiAccent : COL.uiRed;
  ctx.fillRect(40, H / 2 - 70, (W - 80) * timerPct, 6);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`选择传球类型 → ${wrs[sim.chosenWR].name}`, W / 2, H / 2 - 48);
  const btnW = 130, btnH = 50, spacing = 10;
  const totalBtnW = 3 * btnW + 2 * spacing, startBX = (W - totalBtnW) / 2, bY = H / 2 - 25;
  passTypeButtons = [];
  const types = [
    { type: 'bullet', label: '🔴 BULLET', desc: 'Short+10%', color: COL.bulletRed },
    { type: 'touch', label: '🟡 TOUCH', desc: 'Balanced', color: COL.touchYellow },
    { type: 'lob', label: '🔵 LOB', desc: 'Deep+15%', color: COL.lobBlue },
  ];
  for (let i = 0; i < 3; i++) {
    const t = types[i], bx = startBX + i * (btnW + spacing);
    const btn = { x: bx, y: bY, w: btnW, h: btnH, action: `pass_${t.type}` };
    passTypeButtons.push(btn);
    const hover = isInsideRect(mouseX, mouseY, bx, bY, btnW, btnH);
    drawRoundedRect(ctx, bx, bY, btnW, btnH, 6);
    ctx.fillStyle = hover ? 'rgba(40,50,70,0.95)' : 'rgba(20,25,40,0.9)'; ctx.fill();
    ctx.strokeStyle = hover ? t.color : 'rgba(255,255,255,0.3)'; ctx.lineWidth = hover ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle = t.color; ctx.fillRect(bx + 2, bY + 2, btnW - 4, 3);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(t.label, bx + btnW / 2, bY + 24);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '9px Arial'; ctx.fillText(t.desc, bx + btnW / 2, bY + 40);
  }
  ctx.restore();
  if (passTypeTimer >= 2.0) { game.passType = 'touch'; beginSimAfterPassType(); }
  drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx);
}

// ============================================================
// SCRAMBLE UI — V11 FIX: Visual cues instead of percentages
// ============================================================
let scrambleButtons = [];
function drawScrambleUI() {
  if (!sim || sim.phase !== 'scramble') return;
  ctx.save();
  const flash = Math.sin(game.time * 10) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255,200,0,${flash * 0.15})`; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiYellow; ctx.font = 'bold 28px "Arial Black",Arial'; ctx.textAlign = 'center';
  ctx.shadowColor = COL.uiYellow; ctx.shadowBlur = 15;
  ctx.fillText('⚡ SCRAMBLE!', W / 2, H / 2 - 80); ctx.shadowBlur = 0;
  // V11 FIX: Visual direction cues instead of text percentages
  const sideText = sim.rusherSide === 'left' ? '← RUSH FROM LEFT' :
                   sim.rusherSide === 'right' ? 'RUSH FROM RIGHT →' : '↑ CENTER RUSH ↑';
  ctx.fillStyle = COL.uiRed; ctx.font = 'bold 14px Arial';
  ctx.fillText(sideText, W / 2, H / 2 - 55);
  // Timer bar
  const timeLeft = Math.max(0, sim.scrambleTimer), timerPct = timeLeft / 1.8;
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(W / 2 - 80, H / 2 - 40, 160, 6);
  ctx.fillStyle = timerPct > 0.3 ? COL.uiYellow : COL.uiRed;
  ctx.fillRect(W / 2 - 80, H / 2 - 40, 160 * timerPct, 6);
  scrambleButtons = [];
  const btnW = 100, btnH = 45;
  const leftBtn = { x: W / 2 - btnW * 1.5 - 10, y: H / 2 - 20, w: btnW, h: btnH, action: 'scramble_left' };
  const standBtn = { x: W / 2 - btnW / 2, y: H / 2 - 20, w: btnW, h: btnH, action: 'scramble_stand' };
  const rightBtn = { x: W / 2 + btnW * 0.5 + 10, y: H / 2 - 20, w: btnW, h: btnH, action: 'scramble_right' };
  scrambleButtons.push(leftBtn, standBtn, rightBtn);
  const lh = isInsideRect(mouseX, mouseY, leftBtn.x, leftBtn.y, leftBtn.w, leftBtn.h);
  const sh = isInsideRect(mouseX, mouseY, standBtn.x, standBtn.y, standBtn.w, standBtn.h);
  const rh = isInsideRect(mouseX, mouseY, rightBtn.x, rightBtn.y, rightBtn.w, rightBtn.h);

  // V11 FIX: Color-coded glow hints instead of percentages
  // Correct direction = green glow, Wrong = red glow, Stand tall = yellow
  const leftIsCorrect = sim.rusherSide === 'right' || sim.rusherSide === 'center';
  const rightIsCorrect = sim.rusherSide === 'left' || sim.rusherSide === 'center';
  const leftGlowColor = leftIsCorrect ? 'rgba(34,204,68,0.3)' : 'rgba(238,51,51,0.3)';
  const rightGlowColor = rightIsCorrect ? 'rgba(34,204,68,0.3)' : 'rgba(238,51,51,0.3)';

  drawRoundedRect(ctx, leftBtn.x, leftBtn.y, leftBtn.w, leftBtn.h, 8);
  ctx.fillStyle = lh ? leftGlowColor : 'rgba(20,30,50,0.9)'; ctx.fill();
  ctx.strokeStyle = lh ? (leftIsCorrect ? COL.uiGreen : COL.uiRed) : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('← LEFT', leftBtn.x + leftBtn.w / 2, leftBtn.y + leftBtn.h / 2);

  drawRoundedRect(ctx, standBtn.x, standBtn.y, standBtn.w, standBtn.h, 8);
  ctx.fillStyle = sh ? 'rgba(255,180,0,0.4)' : 'rgba(40,35,20,0.9)'; ctx.fill();
  ctx.strokeStyle = sh ? COL.uiGold : 'rgba(255,200,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 11px Arial';
  ctx.fillText('STAND', standBtn.x + standBtn.w / 2, standBtn.y + standBtn.h / 2 - 6);
  ctx.fillText('TALL', standBtn.x + standBtn.w / 2, standBtn.y + standBtn.h / 2 + 8);

  drawRoundedRect(ctx, rightBtn.x, rightBtn.y, rightBtn.w, rightBtn.h, 8);
  ctx.fillStyle = rh ? rightGlowColor : 'rgba(20,30,50,0.9)'; ctx.fill();
  ctx.strokeStyle = rh ? (rightIsCorrect ? COL.uiGreen : COL.uiRed) : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial';
  ctx.fillText('RIGHT →', rightBtn.x + rightBtn.w / 2, rightBtn.y + rightBtn.h / 2);

  // V11 FIX: No percentage text — only visual hint
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('Green glow = safe direction · Red = danger · Gold = no sack risk', W / 2, H / 2 + 38);
  ctx.restore();
}

// ============================================================
// SIMULATION SCREEN
// ============================================================
function drawSimulationScreen(dt) {
  updateSimulation(dt);
  Camera.beginTransform(); drawField();
  if (!sim) { Camera.endTransform(); return; }
  PostFX.colorShift = game.stress > 60 ? -(game.stress - 60) / 40 : (60 - game.stress) / 120;
  const frame = Math.floor(game.time * 8), dn = [21, 24, 32, 45], entities = [];
  if (sim.phase === 'replay' && Replay.playing) {
    const rFrame = Replay.getFrame();
    if (rFrame) {
      for (let i = 0; i < 4; i++) { if (rFrame.wrPos[i]) { const scr = FIELD.toScreen(rFrame.wrPos[i].yard, rFrame.wrPos[i].lane); const ii = i; entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'offense', 'run', frame, wrs[ii].num, false, ii === sim.chosenWR) }); } }
      for (let i = 0; i < 4; i++) { if (rFrame.dbPos[i]) { const scr = FIELD.toScreen(rFrame.dbPos[i].yard, rFrame.dbPos[i].lane); const ii = i; entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'defense', 'run', frame, dn[ii], false, false) }); } }
      if (rFrame.rushPos) { const rscr = FIELD.toScreen(rFrame.rushPos.yard, rFrame.rushPos.lane); entities.push({ y: rscr.y, draw: () => drawPlayer(rscr.x, rscr.y, 'defense', 'run', frame, 99, false, false) }); }
      if (rFrame.qbPos) { const qscr = FIELD.toScreen(rFrame.qbPos.yard, rFrame.qbPos.lane); entities.push({ y: qscr.y, draw: () => drawPlayer(qscr.x, qscr.y, 'offense', 'throw', frame, 7, true, false, 1.1) }); }
      entities.sort((a, b) => a.y - b.y); entities.forEach(e => e.draw());
      drawRouteLines(0.15, 1); Replay.drawLobArc(ctx); Replay.drawBallWithTrail(ctx, rFrame);
      Camera.endTransform(); Weather.drawParticles(ctx); Replay.drawBanner(ctx, W);
      drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx); return;
    }
  }
  for (let i = 0; i < 4; i++) { const scr = FIELD.toScreen(sim.wrPos[i].yard, sim.wrPos[i].lane); const ii = i; entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'offense', sim.wrActions[ii] || 'run', frame, wrs[ii].num, false, ii === sim.chosenWR) }); }
  for (let i = 0; i < 4; i++) { const scr = FIELD.toScreen(sim.dbPos[i].yard, sim.dbPos[i].lane); const ii = i; entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'defense', sim.defActions[ii] || 'run', frame, dn[ii], false, false) }); }
  const rscr = FIELD.toScreen(sim.rushPos.yard, sim.rushPos.lane);
  entities.push({ y: rscr.y, draw: () => drawPlayer(rscr.x, rscr.y, 'defense', 'run', frame, 99, false, false) });
  const qscr = FIELD.toScreen(sim.qbPos.yard, sim.qbPos.lane);
  entities.push({ y: qscr.y, draw: () => drawPlayer(qscr.x, qscr.y, 'offense', sim.qbAction, frame, 7, true, false, 1.1) });
  entities.sort((a, b) => a.y - b.y); entities.forEach(e => e.draw());
  drawRouteLines(0.15, 1);
  if (sim.ballPos && (sim.phase === 'throw' || sim.phase === 'catch')) {
    const bs = FIELD.toScreen(sim.ballPos.yard, sim.ballPos.lane);
    drawBall(bs.x, bs.y, sim.ballTrail);
  }
  if (sim.throwPowerTimer > 0 && sim.phase === 'throw') {
    const qs2 = FIELD.toScreen(sim.qbPos.yard, sim.qbPos.lane);
    const pw = 30, ph = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(qs2.x - pw / 2, qs2.y - 55, pw, ph);
    const ptColor = game.passType === 'bullet' ? COL.bulletRed : game.passType === 'lob' ? COL.lobBlue : COL.uiAccent;
    ctx.fillStyle = ptColor; ctx.fillRect(qs2.x - pw / 2, qs2.y - 55, pw * sim.throwProgress, ph);
  }
  if (sim.separationShown && (sim.phase === 'catch' || sim.phase === 'result' || sim.phase === 'tdCelebration' || sim.phase === 'replay')) {
    const ws = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
    ctx.save(); ctx.globalAlpha = Math.min(1, 2 - sim.catchAnim);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; drawRoundedRect(ctx, ws.x + 15, ws.y - 25, 50, 16, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText(sim.separationText, ws.x + 40, ws.y - 15); ctx.restore();
  }
  if (sim.phase === 'catch' || sim.phase === 'result' || sim.phase === 'tdCelebration') {
    const ts = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
    if (sim.success) {
      ctx.save(); ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 28px "Arial Black"';
      ctx.textAlign = 'center'; ctx.shadowColor = COL.uiGreen; ctx.shadowBlur = 10;
      ctx.fillText('✓', ts.x + 25, ts.y - 10); ctx.restore();
    } else if (sim.isINT) {
      ctx.save(); ctx.fillStyle = COL.uiRed; ctx.font = 'bold 22px "Arial Black"';
      ctx.textAlign = 'center'; ctx.shadowColor = COL.uiRed; ctx.shadowBlur = 10;
      ctx.fillText('INT!', ts.x + 25, ts.y - 10); ctx.restore();
    } else {
      ctx.save(); ctx.fillStyle = COL.uiRed; ctx.font = 'bold 28px "Arial Black"';
      ctx.textAlign = 'center'; ctx.shadowColor = COL.uiRed; ctx.shadowBlur = 10;
      ctx.fillText('✗', ts.x + 25, ts.y - 10); ctx.restore();
    }
  }
  Camera.endTransform(); Weather.drawParticles(ctx);
  if (sim.phase === 'scramble') drawScrambleUI();
  if (sim.phase === 'tdCelebration') {
    ctx.save(); const tdAlpha = Math.min(1, sim.tdTimer / 0.3); ctx.globalAlpha = tdAlpha;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 42px "Arial Black",Arial'; ctx.textAlign = 'center';
    ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 25;
    ctx.fillText('TOUCHDOWN!', W / 2, H / 2 - 30); ctx.shadowBlur = 0;
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 18px Arial';
    ctx.fillText(`+${sim.yardsGained} YDS`, W / 2, H / 2 + 10); ctx.restore();
  }
  if (sim.phase === 'sackResult') {
    ctx.save(); drawRoundedRect(ctx, W / 2 - 120, H / 2 - 50, 240, 100, 6);
    ctx.fillStyle = COL.uiBg; ctx.fill(); ctx.strokeStyle = COL.uiRed; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COL.uiRed; ctx.font = 'bold 22px "Arial Black"'; ctx.textAlign = 'center';
    ctx.fillText('SACKED!', W / 2, H / 2 - 18);
    ctx.fillStyle = '#fff'; ctx.font = '14px Arial'; ctx.fillText(`-${sim.sackYards || 5} yards`, W / 2, H / 2 + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '9px Arial'; ctx.fillText('点击继续', W / 2, H / 2 + 34); ctx.restore();
  }
  if (sim.phase === 'result') {
    ctx.save(); drawRoundedRect(ctx, W / 2 - 140, H / 2 - 60, 280, 120, 6);
    ctx.fillStyle = COL.uiBg; ctx.fill();
    ctx.strokeStyle = sim.success ? COL.uiGreen : (sim.isINT ? COL.uiPurple : COL.uiRed); ctx.lineWidth = 2; ctx.stroke();
    if (sim.success) {
      ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 22px "Arial Black"'; ctx.textAlign = 'center';
      ctx.fillText('COMPLETE!', W / 2, H / 2 - 28);
      ctx.fillStyle = COL.uiGold; ctx.font = 'bold 16px Arial'; ctx.fillText(`+${sim.yardsGained} YDS`, W / 2, H / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(W / 2 - 60, H / 2 + 12, 120, 6);
      ctx.fillStyle = COL.uiGreen; ctx.fillRect(W / 2 - 60, H / 2 + 12, Math.min(120, sim.yardsGained * 6), 6);
      const ptNames = { bullet: '🔴 BULLET', touch: '🟡 TOUCH', lob: '🔵 LOB' };
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px Arial'; ctx.fillText(ptNames[game.passType], W / 2, H / 2 + 26);
    } else if (sim.isINT) {
      ctx.fillStyle = COL.uiPurple; ctx.font = 'bold 22px "Arial Black"'; ctx.textAlign = 'center';
      ctx.fillText('INTERCEPTED!', W / 2, H / 2 - 28);
      ctx.fillStyle = '#aaa'; ctx.font = '12px Arial'; ctx.fillText('Turnover — season over', W / 2, H / 2);
    } else {
      ctx.fillStyle = COL.uiRed; ctx.font = 'bold 22px "Arial Black"'; ctx.textAlign = 'center';
      ctx.fillText('INCOMPLETE', W / 2, H / 2 - 28);
      ctx.fillStyle = '#aaa'; ctx.font = '12px Arial'; ctx.fillText(`${Math.round(sim.catchProb)}% catch probability`, W / 2, H / 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '9px Arial'; ctx.fillText('点击继续', W / 2, H / 2 + 44);
    ctx.restore();
  }
  drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx);
}

function drawPlayResult() {
  Camera.beginTransform(); drawField();
  if (currentPlay) {
    drawRouteLines(0.15, 1);
    const dn = [21, 24, 32, 45];
    for (let i = 0; i < 4; i++) { const scr = FIELD.toScreen(currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane); drawPlayer(scr.x, scr.y, 'offense', 'idle', Math.floor(game.time * 4), wrs[i].num, false, false); }
    const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
    drawPlayer(qs.x, qs.y, 'offense', 'idle', Math.floor(game.time * 4), 7, true, false, 1.1);
    for (let i = 0; i < 4; i++) { const scr = FIELD.toScreen(currentPlay.defense.dbs[i].yard, currentPlay.defense.dbs[i].lane); drawPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), dn[i], false, false); }
    const rs2 = FIELD.toScreen(currentPlay.defense.rusher.yard, currentPlay.defense.rusher.lane);
    drawPlayer(rs2.x, rs2.y, 'defense', 'idle', Math.floor(game.time * 4), 99, false, false);
  }
  Camera.endTransform(); Weather.drawParticles(ctx);
  ctx.save(); drawRoundedRect(ctx, W / 2 - 100, H / 2 + 30, 200, 36, 5);
  ctx.fillStyle = COL.uiBg; ctx.fill(); ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('点击继续下一档', W / 2, H / 2 + 50); ctx.restore();
  drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx);
}

// ============================================================
// UPGRADE, EVENT, SHOP, REST, VICTORY CEREMONY, HALFTIME SCREENS
// ============================================================
let upgradeButtons = [];
function drawUpgradeScreen() {
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = COL.uiGold; ctx.font = 'bold 24px "Arial Black"';
  ctx.textAlign = 'center'; ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 15;
  ctx.fillText('🏈 TOUCHDOWN! 🏈', W / 2, 42); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.fillText(`进入第 ${game.level} 关`, W / 2, 65);
  const nextDC = getCurrentDC();
  const prevSection = Math.ceil((game.level - 1) / 3), nextSection = Math.ceil(game.level / 3);
  if (nextSection !== prevSection || game.level === 1) {
    ctx.fillStyle = COL.uiOrange; ctx.font = 'bold 10px Arial';
    ctx.fillText(`${nextDC.icon} vs ${nextDC.name}: ${nextDC.desc}`, W / 2, 82);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(30, 92); ctx.lineTo(W - 30, 92); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('SELECT YOUR UPGRADE', W / 2, 108);
  upgradeButtons = []; const cW2 = W - 50, cH2 = 95;
  for (let i = 0; i < upgradeOptions.length; i++) {
    const opt = upgradeOptions[i], cy = 122 + i * (cH2 + 12), cx = 25;
    const btn = { x: cx, y: cy, w: cW2, h: cH2, index: i }; upgradeButtons.push(btn);
    const ih = isInsideRect(mouseX, mouseY, cx, cy, cW2, cH2);
    const bc = opt.type === 'qb' ? COL.uiGold : opt.type === 'wr' ? COL.uiAccent : opt.type === 'relic' ? '#c6f' : COL.uiGreen;
    ctx.save(); drawRoundedRect(ctx, cx, cy, cW2, cH2, 5);
    ctx.fillStyle = ih ? 'rgba(30,40,60,0.95)' : 'rgba(18,18,30,0.9)'; ctx.fill();
    ctx.strokeStyle = ih ? COL.uiGold : bc; ctx.lineWidth = ih ? 2 : 1; ctx.stroke();
    ctx.fillStyle = bc; ctx.fillRect(cx + 2, cy + 2, 3, cH2 - 4);
    const tn = opt.type === 'qb' ? 'QB' : opt.type === 'wr' ? 'WR' : opt.type === 'relic' ? 'RELIC' : 'TACTIC';
    drawRoundedRect(ctx, cx + 12, cy + 8, 40, 14, 3);
    ctx.fillStyle = bc; ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = bc; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText(tn, cx + 32, cy + 17);
    ctx.font = '22px serif'; ctx.textAlign = 'right'; ctx.fillText(opt.icon, cx + cW2 - 14, cy + 45);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.fillText(opt.name, cx + 14, cy + 44);
    ctx.fillStyle = '#aaa'; ctx.font = '10px Arial'; ctx.fillText(opt.desc, cx + 14, cy + 62);
    ctx.restore();
  }
  drawParticles();
}

function drawEventScreen() {
  if (!currentEvent) return;
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#c6f'; ctx.font = 'bold 18px "Arial Black"'; ctx.textAlign = 'center';
  ctx.fillText('📜 RANDOM EVENT', W / 2, 50);
  ctx.save(); drawRoundedRect(ctx, 35, 80, W - 70, 180, 6);
  ctx.fillStyle = 'rgba(20,15,35,0.9)'; ctx.fill();
  ctx.strokeStyle = '#c6f'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.fillText(currentEvent.title, W / 2, 120);
  const desc = currentEvent.desc, maxTW = W - 120;
  let line = '', lineY = 155; ctx.font = '11px Arial';
  for (const ch of desc) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxTW) { ctx.fillStyle = '#ccc'; ctx.fillText(line, W / 2, lineY); line = ch; lineY += 18; }
    else line = test;
  }
  ctx.fillStyle = '#ccc'; ctx.fillText(line, W / 2, lineY); ctx.restore();
  genericButtons = [];
  if (currentEvent.type === 'choose_wr') {
    for (let i = 0; i < 4; i++) {
      const btn = { x: 18 + i * 114, y: 300, w: 105, h: 45, text: wrs[i].name, action: `event_wr_${i}` };
      genericButtons.push(btn); drawBroadcastButton(btn, isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h));
    }
  } else {
    const btn = { x: W / 2 - 70, y: 300, w: 140, h: 45, text: '继续', action: 'event_ok' };
    genericButtons.push(btn); drawBroadcastButton(btn, isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h));
  }
  drawParticles();
}

function drawShopScreen() {
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 18px "Arial Black"'; ctx.textAlign = 'center';
  ctx.fillText('🏪 SHOP', W / 2, 35); ctx.font = '12px Arial'; ctx.fillText(`💰 ${game.gold} Gold`, W / 2, 58);
  genericButtons = [];
  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i]; if (item.bought) continue;
    const cy = 80 + i * 80;
    const btn = { x: 30, y: cy, w: W - 60, h: 65, text: '', action: `shop_${i}` };
    genericButtons.push(btn); const cb = game.gold >= item.cost;
    const ih = isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h);
    ctx.save(); drawRoundedRect(ctx, btn.x, btn.y, btn.w, btn.h, 5);
    ctx.fillStyle = ih ? 'rgba(30,40,60,0.9)' : 'rgba(18,18,30,0.85)'; ctx.fill();
    ctx.strokeStyle = cb ? (ih ? COL.uiGold : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = ih ? 2 : 1; ctx.stroke();
    ctx.fillStyle = cb ? '#fff' : '#666'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
    ctx.fillText(item.name, btn.x + 14, cy + 30);
    ctx.fillStyle = cb ? COL.uiGold : '#666'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`${item.cost}G`, btn.x + btn.w - 14, cy + 30);
    if (item.bought) {
      ctx.fillStyle = 'rgba(10,10,20,0.6)'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText('✓ PURCHASED', btn.x + btn.w / 2, cy + 35);
    }
    ctx.restore();
  }
  const lb = { x: W / 2 - 70, y: H - 80, w: 140, h: 45, text: '离开商店', action: 'shop_leave' };
  genericButtons.push(lb); drawBroadcastButton(lb, isInsideRect(mouseX, mouseY, lb.x, lb.y, lb.w, lb.h));
  drawParticles();
}

function drawRestScreen() {
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 20px "Arial Black"'; ctx.textAlign = 'center';
  ctx.fillText('💤 HALFTIME REST', W / 2, 100);
  ctx.fillStyle = '#ccc'; ctx.font = '13px Arial';
  ctx.fillText('在场边歇了一会儿...', W / 2, 145);
  ctx.fillText('档数已重置为第1档', W / 2, 172);
  ctx.fillText('球位重置到5码线', W / 2, 199);
  ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 13px Arial'; ctx.fillText('Poise +20 😌', W / 2, 230);
  genericButtons = [{ x: W / 2 - 70, y: 270, w: 140, h: 45, text: '继续', action: 'rest_ok' }];
  drawBroadcastButton(genericButtons[0], isInsideRect(mouseX, mouseY, genericButtons[0].x, genericButtons[0].y, 140, 45));
  drawParticles();
}

// ============================================================
// V11: HALFTIME SCREEN
// ============================================================
function drawHalftimeScreen() {
  ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, W, H);
  // Banner
  ctx.save(); ctx.fillStyle = COL.uiGold; ctx.font = 'bold 32px "Arial Black"'; ctx.textAlign = 'center';
  ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 20;
  ctx.fillText('HALFTIME', W / 2, 50); ctx.shadowBlur = 0; ctx.restore();
  ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(30, 65); ctx.lineTo(W - 30, 65); ctx.stroke();

  // Left side: First half stats
  ctx.save();
  drawRoundedRect(ctx, 15, 78, W / 2 - 25, 150, 5);
  ctx.fillStyle = 'rgba(15,15,25,0.9)'; ctx.fill();
  ctx.strokeStyle = COL.uiAccent; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = COL.uiAccent; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('FIRST HALF', W / 4, 96);
  const s = game.seasonStats;
  ctx.fillStyle = '#ccc'; ctx.font = '10px Arial';
  ctx.fillText(`${s.completions}/${s.attempts} COMP`, W / 4, 116);
  ctx.fillText(`${s.yards} YDS`, W / 4, 134);
  ctx.fillText(`${s.tds} TD · ${s.ints} INT`, W / 4, 152);
  const rating = calculateQBRating();
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 16px "Arial Black"';
  ctx.fillText(rating.toFixed(1), W / 4, 178);
  ctx.fillStyle = '#888'; ctx.font = '8px Arial'; ctx.fillText('QB RATING', W / 4, 192);
  ctx.restore();

  // Right side: DC tendency pie chart
  ctx.save();
  drawRoundedRect(ctx, W / 2 + 10, 78, W / 2 - 25, 150, 5);
  ctx.fillStyle = 'rgba(15,15,25,0.9)'; ctx.fill();
  ctx.strokeStyle = COL.uiRed; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = COL.uiRed; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('DC TENDENCIES', W * 3 / 4, 96);
  const ct = game.coverageTracker;
  drawPieChart(ctx, W * 3 / 4, 160, 40,
    [ct.zone, ct.man, ct.blitz],
    [COL.uiAccent, COL.uiRed, COL.uiOrange],
    ['ZONE', 'MAN', 'BLITZ']);
  ctx.restore();

  // Bottom: Halftime adjustment options (pick 1 of 3)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
  ctx.fillText('CHOOSE YOUR ADJUSTMENT (pick 1)', W / 2, 248);

  genericButtons = [];
  for (let i = 0; i < halftimeOptions.length; i++) {
    const opt = halftimeOptions[i];
    const bx = 20, by = 265 + i * 70, bw = W - 40, bh = 58;
    const btn = { x: bx, y: by, w: bw, h: bh, text: '', action: `halftime_${i}` };
    genericButtons.push(btn);
    const ih = isInsideRect(mouseX, mouseY, bx, by, bw, bh);
    ctx.save();
    drawRoundedRect(ctx, bx, by, bw, bh, 5);
    ctx.fillStyle = ih ? 'rgba(30,40,60,0.95)' : 'rgba(18,18,30,0.9)'; ctx.fill();
    ctx.strokeStyle = ih ? COL.uiGold : 'rgba(255,255,255,0.3)'; ctx.lineWidth = ih ? 2 : 1; ctx.stroke();
    ctx.font = '20px serif'; ctx.textAlign = 'left'; ctx.fillText(opt.icon, bx + 12, by + 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.fillText(opt.name, bx + 42, by + 26);
    ctx.fillStyle = '#aaa'; ctx.font = '10px Arial'; ctx.fillText(opt.desc, bx + 42, by + 44);
    ctx.restore();
  }

  // DC adjustment warning
  ctx.fillStyle = COL.uiRed; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('⚠ The defense also made halftime adjustments!', W / 2, H - 30);
  drawParticles();
}

function drawVictoryCeremony(dt) {
  game.victoryCeremonyTimer += dt; const t = game.victoryCeremonyTimer;
  Camera.beginTransform(); drawField();
  Camera.setForPhase('victory_ceremony');
  const frame = Math.floor(game.time * 6);
  for (let i = 0; i < 4; i++) {
    const scr = FIELD.toScreen(25 + Math.sin(game.time + i) * 3, 15 + i * 10);
    drawPlayer(scr.x, scr.y, 'offense', 'celebrate', frame, wrs[i].num, false, false, 1.2);
  }
  const qScr = FIELD.toScreen(22, 30);
  drawPlayer(qScr.x, qScr.y, 'offense', 'celebrate', frame, 7, true, false, 1.4);
  Camera.endTransform();
  if (Math.random() < 0.4) addParticle(Math.random() * W, 0, 'victory_confetti', 3);
  if (t > 0.5 && Math.random() < 0.06) { addParticle(60 + Math.random() * (W - 120), H * 0.7, 'firework_ascend', 1); SFX.play('firework_ascend'); }
  ctx.save(); const zoom = Math.min(1, t / 0.5); ctx.globalAlpha = zoom;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 30 + Math.sin(game.time * 3) * 10;
  ctx.font = `bold ${52 * zoom}px "Arial Black",Arial`;
  const mg = ctx.createLinearGradient(W / 2 - 130, H / 2 - 80, W / 2 + 130, H / 2 - 40);
  mg.addColorStop(0, '#b8860b'); mg.addColorStop(0.25, '#ffd700'); mg.addColorStop(0.5, '#fff');
  mg.addColorStop(0.75, '#ffd700'); mg.addColorStop(1, '#b8860b');
  ctx.fillStyle = mg; ctx.fillText('CHAMPION!', W / 2, H / 2 - 60); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial';
  ctx.fillText('你击败了所有防守协调员!', W / 2, H / 2 - 20); ctx.restore();
  drawParticles();
  if (t > 3.0) { game.state = 'victory'; game.victoryCeremony = false; }
}

// ============================================================
// V11: ENHANCED SEASON HIGHLIGHTS + GAME OVER with Career
// ============================================================
function drawSeasonHighlights(isVictory) {
  ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, 0, W, H);
  if (isVictory && Math.random() < 0.1) addParticle(Math.random() * W, 0, 'victory_confetti', 2);
  const rating = calculateQBRating();
  // End season in career
  if (!game._seasonEnded) {
    game._seasonEnded = true;
    const stats = { completions: game.seasonStats.completions, attempts: game.seasonStats.attempts,
      yards: game.seasonStats.yards, tds: game.seasonStats.tds, ints: game.seasonStats.ints, rating };
    game.newMilestones = Career.endSeason(stats);
    game.challengeSeedCode = SeedSystem.generateSeed();
  }
  ctx.save(); ctx.textAlign = 'center';
  if (isVictory) {
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 24px "Arial Black"';
    ctx.shadowColor = COL.uiGold; ctx.shadowBlur = 20;
    ctx.fillText('🏆 CHAMPION! 🏆', W / 2, 35); ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = COL.uiAccent; ctx.font = 'bold 22px "Arial Black"';
    ctx.fillText('📺 SEASON HIGHLIGHTS', W / 2, 35);
  }
  ctx.restore();

  // Stats block
  const sY = 50;
  ctx.save(); drawRoundedRect(ctx, 20, sY, W - 40, 100, 6);
  ctx.fillStyle = 'rgba(15,15,25,0.9)'; ctx.fill();
  ctx.strokeStyle = COL.uiAccent; ctx.lineWidth = 1; ctx.stroke();
  const s = game.seasonStats;
  ctx.fillStyle = '#ccc'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`${s.completions}/${s.attempts} COMP · ${s.yards} YDS · ${s.tds} TD · ${s.ints} INT`, W / 2, sY + 20);
  ctx.fillText(`Floor ${game.level} · ${game.score} PTS`, W / 2, sY + 38);
  // QB Rating
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 10px Arial'; ctx.fillText('QB RATING', W / 2, sY + 56);
  ctx.font = 'bold 22px "Arial Black"'; ctx.fillText(rating.toFixed(1), W / 2, sY + 80);
  // V11: Career comparison
  if (Career.data.bestRating > 0) {
    ctx.fillStyle = '#888'; ctx.font = '9px Arial';
    ctx.fillText(`Career Best: ${Career.data.bestRating.toFixed(1)} | This Season: ${rating.toFixed(1)}`, W / 2, sY + 96);
  }
  ctx.restore();

  // V11: Trust breakdown
  const tY = sY + 110;
  ctx.save(); drawRoundedRect(ctx, 20, tY, W - 40, 50, 5);
  ctx.fillStyle = 'rgba(15,15,25,0.85)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('WR TRUST BREAKDOWN', W / 2, tY + 14);
  for (let i = 0; i < 4; i++) {
    const trust = getTrustStatus(i);
    const tx = 50 + i * 105;
    ctx.fillStyle = WR_COLORS[i]; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`${wrs[i].name} ${trust.emoji}`, tx, tY + 30);
    ctx.fillStyle = '#888'; ctx.font = '8px Arial';
    ctx.fillText(`${game.wrTrust[i]}%`, tx, tY + 42);
  }
  ctx.restore();

  // Top plays
  const plays = [...game.seasonStats.plays].sort((a, b) => b.yards - a.yards).slice(0, 3);
  const pY = tY + 58;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('TOP PLAYS', W / 2, pY);
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i], py = pY + 8 + i * 28;
    ctx.save(); drawRoundedRect(ctx, 25, py, W - 50, 24, 3);
    ctx.fillStyle = i === 0 ? 'rgba(255,215,0,0.12)' : 'rgba(25,25,40,0.8)'; ctx.fill();
    ctx.fillStyle = i === 0 ? COL.uiGold : '#ccc'; ctx.font = '9px Arial'; ctx.textAlign = 'left';
    const ptE = p.passType === 'bullet' ? '🔴' : p.passType === 'lob' ? '🔵' : '🟡';
    ctx.fillText(`${i + 1}. Floor ${p.floor}: ${p.wrName} ${p.route.toUpperCase()} ${p.yards}yds ${ptE}${p.isTD ? ' TD' : ''}`, 35, py + 16);
    ctx.restore();
  }

  // V11: New milestones
  const mY = pY + 8 + plays.length * 28 + 10;
  if (game.newMilestones && game.newMilestones.length > 0) {
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🎉 NEW MILESTONES UNLOCKED! 🎉', W / 2, mY);
    for (let i = 0; i < game.newMilestones.length; i++) {
      const m = game.newMilestones[i];
      ctx.fillStyle = '#fff'; ctx.font = '10px Arial';
      ctx.fillText(`${m.icon} ${m.label}`, W / 2, mY + 18 + i * 16);
    }
  }

  // V11: Challenge code
  const cY = mY + (game.newMilestones ? game.newMilestones.length * 16 + 30 : 20);
  ctx.save(); drawRoundedRect(ctx, 40, cY, W - 80, 50, 5);
  ctx.fillStyle = 'rgba(25,25,40,0.9)'; ctx.fill();
  ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('CHALLENGE CODE', W / 2, cY + 16);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Courier New"';
  ctx.fillText(game.challengeSeedCode, W / 2, cY + 38);
  ctx.restore();

  // Copy + restart buttons
  genericButtons = [];
  const copyBtn = { x: W / 2 - 130, y: cY + 60, w: 120, h: 40, text: '📋 Copy Code', action: 'copy_seed' };
  const restartBtn = { x: W / 2 + 10, y: cY + 60, w: 120, h: 40, text: '🔄 Play Again', action: 'restart' };
  genericButtons.push(copyBtn, restartBtn);
  drawBroadcastButton(copyBtn, isInsideRect(mouseX, mouseY, copyBtn.x, copyBtn.y, copyBtn.w, copyBtn.h));
  drawBroadcastButton(restartBtn, isInsideRect(mouseX, mouseY, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h));

  // Legacy preview
  ctx.fillStyle = '#888'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
  const nextLegacy = Math.min(Math.floor(rating * 0.3), 15);
  ctx.fillText(`Next season legacy bonus: +${nextLegacy} ACC`, W / 2, cY + 115);
  drawParticles();
}

function drawGameOver() { drawSeasonHighlights(false); }
function drawVictory() { drawSeasonHighlights(true); }

// ============================================================
// INPUT SYSTEM
// ============================================================
let mouseX = 0, mouseY = 0, genericButtons = [];
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = W / rect.width, sy = H / rect.height;
  const cx2 = e.touches ? e.touches[0].clientX : e.clientX;
  const cy2 = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx2 - rect.left) * sx, y: (cy2 - rect.top) * sy };
}
function isInsideRect(mx, my, rx, ry, rw, rh) { return mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh; }
canvas.addEventListener('mousemove', e => { const p = getCanvasPos(e); mouseX = p.x; mouseY = p.y; });
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', e => { e.preventDefault(); const p = getCanvasPos(e); mouseX = p.x; mouseY = p.y; handleClick(e); });

// V11: Keyboard input for challenge code
document.addEventListener('keydown', e => {
  if (showChallengeInput) {
    if (e.key === 'Backspace') { challengeInput = challengeInput.slice(0, -1); }
    else if (e.key === 'Enter') {
      if (SeedSystem.applySeed(challengeInput)) { showChallengeInput = false; startNewGame(); }
    }
    else if (e.key === 'Escape') { showChallengeInput = false; challengeInput = ''; }
    else if (e.key.length === 1 && challengeInput.length < 12) { challengeInput += e.key.toUpperCase(); }
  }
});

function handleClick(e) {
  const pos = e.touches ? { x: mouseX, y: mouseY } : getCanvasPos(e);
  SFX.play('click');
  switch (game.state) {
    case 'title':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'start') { SeedSystem.isChallenge = false; startNewGame(); }
          else if (btn.action === 'challenge') { showChallengeInput = true; challengeInput = ''; }
          else if (btn.action === 'challenge_go') {
            if (SeedSystem.applySeed(challengeInput)) { showChallengeInput = false; startNewGame(); }
          }
          else if (btn.action === 'challenge_cancel') { showChallengeInput = false; challengeInput = ''; }
        }
      }
      break;
    case 'map':
      for (const btn of mapButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) { selectMapNode(btn.floor, btn.node); return; }
      break;
    case 'reading':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'audible' && game.audiblesLeft > 0) {
            game.audiblesLeft--; SFX.play('audible'); SFX.play('audible_hut');
            audibleAnim.active = true; audibleAnim.timer = 0;
            Commentary.generate('audible'); Camera.shake(3);
            generatePlay(currentPlay && currentPlay.isElite, currentPlay && currentPlay.isBoss);
            game.readingTimer = 0; motionAnimPhase = 'idle'; motionAnimTimer = 0; return;
          }
          if (btn.action === 'motion' && !game.motionUsed && motionAnimPhase === 'idle') {
            motionAnimPhase = 'moving'; motionAnimTimer = 0;
            motionWROrigLane = currentPlay.offense.wrs[currentPlay.motionWR].lane;
            SFX.play('motion_slide'); return;
          }
        }
      }
      break;
    case 'choosing':
      for (const btn of cardButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
        startSimulation(btn.wrIndex); passTypeTimer = 0; return;
      }
      break;
    case 'passType':
      for (const btn of passTypeButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'pass_bullet') game.passType = 'bullet';
          else if (btn.action === 'pass_touch') game.passType = 'touch';
          else if (btn.action === 'pass_lob') game.passType = 'lob';
          beginSimAfterPassType(); return;
        }
      }
      break;
    case 'simulation':
      if (sim && sim.phase === 'scramble' && sim.scrambleChoice === null) {
        for (const btn of scrambleButtons) {
          if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
            if (btn.action === 'scramble_left') sim.scrambleChoice = 'left';
            else if (btn.action === 'scramble_right') sim.scrambleChoice = 'right';
            else if (btn.action === 'scramble_stand') sim.scrambleChoice = 'stand_tall';
            return;
          }
        }
      }
      if (sim && sim.phase === 'replay' && Replay.playing) { Replay.skipRequested = true; return; }
      if (sim && sim.phase === 'sackResult' && sim.timer > 0.5) handlePlayResult();
      if (sim && sim.phase === 'result' && sim.timer > 0.5) handlePlayResult();
      break;
    case 'playResult': {
      const ie = currentPlay && currentPlay.isElite, ib = currentPlay && currentPlay.isBoss;
      generatePlay(ie, ib); game.state = 'reading'; game.readingPhase = true;
      game.readingTimer = 0; genericButtons = [];
      motionAnimPhase = 'idle'; motionAnimTimer = 0; break;
    }
    case 'upgrade':
      for (const btn of upgradeButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
        applyUpgrade(btn.index); game.weatherDebuff = 0; game.scoutReport = false;
        game.driveYards = 0; game.drivePlays = 0; advanceMap(); return;
      }
      break;
    case 'halftime':
      for (const btn of genericButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
        if (btn.action.startsWith('halftime_')) {
          const idx = parseInt(btn.action.split('_')[1]);
          halftimeOptions[idx].apply();
          addParticle(W / 2, 200, 'confetti', 20);
          SFX.play('level_up');
          // Continue to upgrade screen
          game.state = 'upgrade';
          generateUpgradeOptions();
          return;
        }
      }
      break;
    case 'event':
      for (const btn of genericButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
        if (btn.action === 'event_ok') { if (currentEvent.type === 'instant') currentEvent.effect(); currentEvent = null; advanceMap(); }
        else if (btn.action.startsWith('event_wr_')) { const wi = parseInt(btn.action.split('_')[2]); currentEvent.effect(wi); currentEvent = null; advanceMap(); }
        return;
      }
      break;
    case 'shop':
      for (const btn of genericButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
        if (btn.action === 'shop_leave') advanceMap();
        else if (btn.action.startsWith('shop_')) {
          const idx = parseInt(btn.action.split('_')[1]);
          if (shopItems[idx] && !shopItems[idx].bought && game.gold >= shopItems[idx].cost) {
            game.gold -= shopItems[idx].cost; shopItems[idx].apply(); shopItems[idx].bought = true;
            addParticle(W / 2, 200, 'confetti', 12);
          }
        }
        return;
      }
      break;
    case 'rest':
      for (const btn of genericButtons) if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h) && btn.action === 'rest_ok') { advanceMap(); return; }
      break;
    case 'victoryCeremony':
      if (game.victoryCeremonyTimer > 1.0) { game.state = 'victory'; game.victoryCeremony = false; }
      break;
    case 'gameOver': case 'victory':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'restart') startNewGame();
          else if (btn.action === 'copy_seed') SeedSystem.copyToClipboard(game.challengeSeedCode);
        }
      }
      break;
  }
}

// ============================================================
// GAME FLOW
// ============================================================
function startNewGame() {
  // V11: Load career + apply legacy bonus
  Career.load();
  const legacyBonus = Career.getLegacyBonus();

  game.state = 'map'; game.ballYardLine = 5; game.downs = { current: 1, max: 4 };
  game.firstDownLine = 25; game.gotFirstDown = false; game.score = 0; game.level = 1;
  game.weatherDebuff = 0; game.scoutReport = false; game.stress = 0; game.gold = 100;
  game.audiblesLeft = 1; game.readingPhase = false; game.readingTimer = 0;
  game.weatherType = 'normal'; game.playCount = 0; game.driveYards = 0; game.drivePlays = 0;
  game.highlightTimer = 0; game.scoreAnimTarget = 0; game.scoreAnimCurrent = 0;
  game.motionUsed = false; game.motionResult = null; game.motionWRIndex = -1;
  game.passType = 'touch'; game.scrambleResult = null;
  game.tdCelebrationTimer = 0; game.replayActive = false; game.replayTimer = 0;
  game.seasonStats = { completions: 0, attempts: 0, yards: 0, tds: 0, ints: 0, sacks: 0, plays: [] };
  game.currentDC = null; game.dcIntroTimer = 0; game.dcIntroShown = false;
  game.adaptiveTracker = { wrPicks: [0,0,0,0], routePicks: {} };
  game.victoryCeremony = false; game.victoryCeremonyTimer = 0;
  // V11 resets
  game.wrTrust = [50, 50, 50, 50];
  game.halftimeShown = false; game.halftimeAdjustment = null;
  game.coverageTracker = { zone: 0, man: 0, blitz: 0 };
  game.newMilestones = []; game.challengeSeedCode = '';
  game.composureRecoveryBonus = 0; game.filmStudyFloorsLeft = 0;
  game.playBookExpanded = false; game._seasonEnded = false;
  if (!SeedSystem.isChallenge) {
    game.mapSeed = Math.floor(Math.random() * 100000);
    game.weatherSeed = Math.floor(Math.random() * 100000);
  }
  // V11: Apply legacy bonus
  qb = { accuracy: 70 + legacyBonus, arm: 60, readSpeed: 0, level: 1 };
  wrs = [
    { id: 0, name: 'ACE', spd: 60, cat: 65, rte: 60, lvl: 1, num: 81 },
    { id: 1, name: 'BLITZ', spd: 55, cat: 60, rte: 65, lvl: 1, num: 88 },
    { id: 2, name: 'FLASH', spd: 65, cat: 55, rte: 55, lvl: 1, num: 13 },
    { id: 3, name: 'TANK', spd: 50, cat: 70, rte: 60, lvl: 1, num: 84 },
  ];
  relics = []; defenseBonus = 0; consecutiveCatches = 0; particles = [];
  fieldTexture = null; Camera.reset(); Replay.reset();
  TimeScale.target = 1; TimeScale.current = 1;
  motionAnimPhase = 'idle'; motionAnimTimer = 0;
  passTypeTimer = 0; audibleAnim = { active: false, timer: 0, textFlash: 0 };
  Commentary.lines = []; Weather.initParticles();
  showChallengeInput = false; challengeInput = '';
  generateMap(); mapData.currentFloor = -1; mapData.currentNode = 0;
  SeedSystem.isChallenge = false;
}

function selectMapNode(floor, nodeIdx) {
  mapData.currentFloor = floor; mapData.currentNode = nodeIdx;
  mapData.visited.add(`${floor}_${nodeIdx}`);
  const node = mapData.floors[floor][nodeIdx];
  const prevDC = game.currentDC;
  game.currentDC = getCurrentDC();
  if (game.currentDC !== prevDC && (node.type === 'play' || node.type === 'elite' || node.type === 'boss')) SFX.play('dc_intro');
  switch (node.type) {
    case 'play': generatePlay(false, false); game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0; genericButtons = []; motionAnimPhase = 'idle'; motionAnimTimer = 0; break;
    case 'elite': generatePlay(true, false); game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0; genericButtons = []; motionAnimPhase = 'idle'; motionAnimTimer = 0; break;
    case 'boss': generatePlay(false, true); game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0; genericButtons = []; motionAnimPhase = 'idle'; motionAnimTimer = 0; break;
    case 'rest': game.downs.current = 1; game.ballYardLine = 5; game.gotFirstDown = false; game.firstDownLine = 25; reduceStress(20); game.state = 'rest'; break;
    case 'shop': generateShop(); game.state = 'shop'; break;
    case 'event': currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)]; game.state = 'event'; break;
  }
}

function advanceMap() {
  if (!mapData || mapData.currentFloor >= mapData.floors.length - 1) { game.state = 'victory'; return; }
  game.state = 'map';
}

// ============================================================
// LOADING & MAIN LOOP
// ============================================================
let isLoading = true, lastTime = 0;

function initGame() {
  Career.load(); // V11: Load career on init
  const lf = document.getElementById('loadFill'), lt = document.getElementById('loadText');
  if (lt) lt.textContent = 'Generating field...'; if (lf) lf.style.width = '20%';
  generateFieldTexture();
  if (lt) lt.textContent = 'Generating sprites...'; if (lf) lf.style.width = '30%';
  sprites.generateAll((p, d) => {
    const pct = 30 + p * 60;
    if (lf) lf.style.width = pct + '%'; if (lt) lt.textContent = d;
  });
  if (lt) lt.textContent = 'Generating post-processing...'; if (lf) lf.style.width = '95%';
  generateScanlines(); generateVignette(); Weather.initParticles();
  if (lf) lf.style.width = '100%'; if (lt) lt.textContent = 'Ready!';
  setTimeout(() => {
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.style.display = 'none';
    isLoading = false;
  }, 300);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); lastTime = timestamp;
  game.time += dt; game.animTimer += dt;
  if (game.animTimer > 0.12) { game.animFrame = (game.animFrame + 1) % 8; game.animTimer = 0; }
  updateParticles(dt); updateShake(); Camera.update(dt);
  Commentary.update(dt); Weather.update(dt);
  ctx.clearRect(0, 0, W, H);
  if (screenShake.x !== 0 || screenShake.y !== 0) { ctx.save(); ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y)); }
  if (game.stress > 80) {
    const tilt = Math.sin(game.time * 1.5) * 0.005 * (game.stress / 100);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(tilt); ctx.translate(-W / 2, -H / 2);
  }
  if (!isLoading) {
    switch (game.state) {
      case 'title': drawTitle(dt); break;
      case 'map': drawMapScreen(); break;
      case 'reading': drawReadingPhase(dt); break;
      case 'choosing': drawChoosingScreen(); break;
      case 'passType': drawPassTypeScreen(dt); break;
      case 'simulation': drawSimulationScreen(dt); break;
      case 'playResult': drawPlayResult(); break;
      case 'upgrade': drawUpgradeScreen(); break;
      case 'halftime': drawHalftimeScreen(); break;
      case 'event': drawEventScreen(); break;
      case 'shop': drawShopScreen(); break;
      case 'rest': drawRestScreen(); break;
      case 'victoryCeremony': drawVictoryCeremony(dt); break;
      case 'gameOver': drawGameOver(); break;
      case 'victory': drawVictory(); break;
    }
    PostFX.apply(ctx, W, H);
  }
  if (game.stress > 80) ctx.restore();
  if (screenShake.x !== 0 || screenShake.y !== 0) ctx.restore();
  requestAnimationFrame(gameLoop);
}

setTimeout(initGame, 100);
requestAnimationFrame(gameLoop);
