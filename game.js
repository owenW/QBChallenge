// ============================================================
// QB CHALLENGE V15 — PIXEL ART ROGUELIKE (QB PLAYTESTED)
// Slay the Spire meets NFL QB simulator
// Pixel art style, unique defensive teams, deep rogue elements
// V15: Playtested and tuned by world-class IFAF 5v5 QB
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
// CAREER SAVE SYSTEM
// ============================================================
const Career = {
  data: null,
  load() {
    const saved = localStorage.getItem('qb_career_v14');
    this.data = saved ? JSON.parse(saved) : {
      seasons: 0, careerComp: 0, careerAtt: 0, careerYards: 0,
      careerTD: 0, careerINT: 0, bestRating: 0, bestYards: 0,
      milestones: [], unlockedCelebrations: ['basic'],
      unlockedColors: ['default'], qbLegacy: 0, championships: 0,
    };
  },
  save() { localStorage.setItem('qb_career_v14', JSON.stringify(this.data)); },
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
    if (stats.isChampion) this.data.championships++;
    const newMilestones = this.checkMilestones();
    this.save();
    return newMilestones;
  },
  checkMilestones() {
    const newlyUnlocked = [];
    const checks = [
      { id: 'yards_500', req: () => this.data.careerYards >= 500, reward: 'alt_blue', label: '500生涯码数', icon: '🏈' },
      { id: 'td_10', req: () => this.data.careerTD >= 10, reward: 'celebration_spike', label: '10生涯达阵', icon: '🎯' },
      { id: 'td_25', req: () => this.data.careerTD >= 25, reward: 'celebration_dance', label: '25生涯达阵', icon: '💃' },
      { id: 'seasons_5', req: () => this.data.seasons >= 5, reward: 'alt_gold', label: '5个赛季', icon: '⭐' },
      { id: 'rating_120', req: () => this.data.bestRating >= 120, reward: 'celebration_griddy', label: '评分120+', icon: '🔥' },
      { id: 'perfect', req: () => this.data.careerINT === 0 && this.data.seasons > 0, reward: 'alt_platinum', label: '零抄截赛季', icon: '💎' },
      { id: 'champ_1', req: () => this.data.championships >= 1, reward: 'alt_champion', label: '首个冠军', icon: '🏆' },
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
  getLegacyBonus() { return Math.min(this.data.qbLegacy || 0, 15); },
  getCareerCompPct() { return this.data.careerAtt === 0 ? 0 : ((this.data.careerComp / this.data.careerAtt) * 100).toFixed(1); },
  getAllMilestones() {
    return [
      { id: 'yards_500', label: '500码数', icon: '🏈' }, { id: 'td_10', label: '10达阵', icon: '🎯' },
      { id: 'td_25', label: '25达阵', icon: '💃' }, { id: 'seasons_5', label: '5赛季', icon: '⭐' },
      { id: 'rating_120', label: '评分120+', icon: '🔥' }, { id: 'perfect', label: '零抄截', icon: '💎' },
      { id: 'champ_1', label: '冠军', icon: '🏆' },
    ];
  }
};

// ============================================================
// SEED SYSTEM
// ============================================================
const SeedSystem = {
  currentSeed: null, challengeRating: null, isChallenge: false,
  generateSeed() {
    const parts = [game.mapSeed || 0, (game.teamOrder || []).slice(0,5).join(''), game.weatherSeed || 0];
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
      if (parts.length >= 2) {
        game.mapSeed = parseInt(parts[0]) || 0;
        game.weatherSeed = parseInt(parts[2]) || 0;
        this.isChallenge = true;
        return true;
      }
    } catch(e) {}
    return false;
  },
  seededRandom(seed) {
    let s = seed;
    return function() { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
  },
  copyToClipboard(text) { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); }
};

// ============================================================
// PIXEL ART COLOR PALETTE (Slay the Spire / Stardew Valley inspired)
// ============================================================
const COL = {
  // Field colors - deep emerald with warm undertones
  grassLight: '#2d6e2d', grassDark: '#1f5c1f', grassHighlight: '#3d8a3d',
  grassAlt: '#28632a', grassStitch: '#1a4f1c',
  fieldLine: '#e8dcc8', // parchment-toned lines
  endzone: '#1a2d4a', endzoneAway: '#6b1a1a',
  // Offense palette (warm white/blue)
  offJersey: '#e8e0d0', offJerseyDark: '#c4b8a0', offPants: '#1a2d4a', offPantsDark: '#122040',
  offHelmet: '#d8d0c0', offHelmetDark: '#b0a890', offStripe: '#1a2d4a', offAccent: '#2a5496',
  offPad: '#c8c0b0', offPadHighlight: '#e0d8c8',
  // Defense (changes per team - default red)
  defJersey: '#b02020', defJerseyDark: '#8a1818', defPants: '#e0d0b8', defPantsDark: '#c0b098',
  defHelmet: '#b02020', defHelmetDark: '#7a1010', defStripe: '#e8dcc8', defAccent: '#b02020',
  defPad: '#981818', defPadHighlight: '#c03030',
  // Skin tones
  skin: '#c68642', skinDark: '#a86e30',
  // Ball
  ball: '#7a4e2c', ballLace: '#e8dcc8',
  // UI - Parchment/card style
  uiBg: 'rgba(28,22,18,0.92)', uiPanel: 'rgba(42,34,28,0.95)',
  uiAccent: '#c8a85c', uiRed: '#c04040', uiGold: '#d4a840',
  uiGreen: '#3ca050', uiYellow: '#c8a840', uiWhite: '#e8dcc8',
  uiPurple: '#8856a8', uiPink: '#c05878', uiOrange: '#c07028',
  uiBlue: '#4878b8',
  // Score bug & UI frame
  scoreBug: 'rgba(28,22,18,0.94)', downPill: '#d4a840', tdFlash: '#e8dcc8',
  // Pass type colors
  bulletRed: '#c04040', touchYellow: '#c8a840', lobBlue: '#4878b8',
  // Card frame
  cardBg: 'rgba(38,30,24,0.95)', cardBorder: '#8a7650', cardHighlight: '#c8a85c',
  // Parchment
  parchment: '#d8c8a0', parchmentDark: '#b0a070',
};
const WR_COLORS = ['#5888c8', '#c8a840', '#48b870', '#c06888'];

// ============================================================
// FIELD COORDINATE SYSTEM
// ============================================================
const FIELD = {
  left: 30, top: 80, width: 420, height: 440,
  toScreen(yard, lane) {
    return { x: this.left + (lane / 60) * this.width, y: this.top + this.height - (yard / 50) * this.height };
  },
  fromScreen(sx, sy) {
    return { yard: (1 - (sy - this.top) / this.height) * 50, lane: ((sx - this.left) / this.width) * 60 };
  }
};

// ============================================================
// PHYSICS CONSTANTS — V18 physics-based simulation engine
// ============================================================
const PHYSICS = {
  WR_MAX_SPEED: 8.0,      // yards/sec — elite WR
  WR_ACCEL: 5.0,           // yards/sec²
  DB_MAX_SPEED: 7.5,       // yards/sec — slightly slower than WR
  DB_ACCEL: 4.8,           // yards/sec²
  DB_REACTION_DELAY: 0.15, // seconds — DB reacts to WR movement
  BALL_SPEED_BULLET: 22,   // yards/sec (~2.7x WR speed, realistic bullet pass)
  BALL_SPEED_TOUCH: 16,    // yards/sec (~2x WR speed)
  BALL_SPEED_LOB: 13,      // yards/sec (~1.6x WR speed, slightly faster to prevent overshoot)
  TURN_PENALTY: 0.6,       // speed multiplier when changing direction > 45°
};

// ============================================================
// UNIQUE DEFENSIVE TEAMS — 12 teams with star players
// ============================================================
const TEAMS = [
  {
    id: 'iron_wall', name: '钢铁壁垒', nameEn: 'Iron Wall', icon: '🛡️',
    colors: { jersey: '#505860', accent: '#a0a8b0', pants: '#303840', helmet: '#606870' },
    style: 'rush_heavy', zone: 0.3, man: 0.3, blitz: 0.4,
    desc: '精英冲传前线，二线防守一般', weakness: '深传',
    stars: [{ num: 99, name: '铁锤', role: 'rusher', speed: 95, power: 90, ability: 'elite_rush',
      desc: '冲传速度极快，给QB巨大压力', auraColor: '#708090' }],
    rushSpeedMod: 1.5, deepCovMod: 0.7,
    commentary: {
      sack: '铁锤的冲传太猛了！四分卫根本来不及出手！',
      pressure: '铁锤已经突破了进攻锋线，四分卫压力山大！',
      deep: '深传成功！这正是钢铁壁垒的弱点所在！',
    }
  },
  {
    id: 'shadow_hawks', name: '暗影鹰眼', nameEn: 'Shadow Hawks', icon: '🦅',
    colors: { jersey: '#1a2840', accent: '#4878b8', pants: '#e0d8c8', helmet: '#1a2840' },
    style: 'ballhawk', zone: 0.5, man: 0.3, blitz: 0.2,
    desc: '抄截能力极强的二线', weakness: '短传',
    stars: [{ num: 21, name: '鹰眼', role: 'safety', coverage: 95, intBonus: 50, ability: 'deep_int',
      desc: '深传区域有极高抄截风险', auraColor: '#4878b8' }],
    deepIntMod: 2.5, shortCovMod: 0.6,
    commentary: {
      int: '鹰眼再次展现超凡的阅读能力，这个深传被他轻松截断！',
      deep_danger: '小心！鹰眼已经在深区等候，这个传球太冒险了！',
      short: '短传撕裂了暗影鹰眼的防线！他们的底线防守不行！',
    }
  },
  {
    id: 'lightning_blitz', name: '闪电突袭', nameEn: 'Lightning Blitz', icon: '⚡',
    colors: { jersey: '#c8a820', accent: '#f0d848', pants: '#1a1a2a', helmet: '#c8a820' },
    style: 'blitz_heavy', zone: 0.1, man: 0.2, blitz: 0.7,
    desc: '超攻击性突袭，每档双人冲传', weakness: '快速出手',
    stars: [{ num: 55, name: '闪电', role: 'linebacker', speed: 98, ability: 'double_rush',
      desc: '1.5秒到达QB，冲传无法阻挡', auraColor: '#f0d848' }],
    rushSpeedMod: 2.0, coverageMod: 0.5, doubleRush: true,
    commentary: {
      sack: '闪电的速度简直不可思议！四分卫只有1.5秒出手，这对任何人来说都不够！',
      survive: '在闪电的冲传下存活下来！这需要极大的勇气！',
      open: '闪电突袭全力冲传，后场门户大开！',
    }
  },
  {
    id: 'phantom_zone', name: '幻影联防', nameEn: 'Phantom Zone', icon: '👻',
    colors: { jersey: '#483868', accent: '#8068a8', pants: '#e0d8e8', helmet: '#584878' },
    style: 'zone_perfect', zone: 0.8, man: 0.1, blitz: 0.1,
    desc: '完美区域联防，但从不换人', weakness: '区域缝隙',
    stars: [{ num: 0, name: '幻影指挥', role: 'coordinator', ability: 'read_tendency',
      desc: '阅读你的路线倾向，3次相同路线后效果下降', auraColor: '#8068a8' }],
    zoneGapExploitable: true, tendencyRead: true,
    commentary: {
      zone_gap: '找到了区域联防的缝隙！这就是击败幻影联防的方法！',
      tendency: '幻影指挥已经看穿了你的意图，路线被完美覆盖！',
      switch: '换条路线试试！幻影联防的弱点就是不会换人！',
    }
  },
  {
    id: 'twin_locks', name: '双子锁链', nameEn: 'Twin Locks', icon: '🔒',
    colors: { jersey: '#282828', accent: '#c0c0c0', pants: '#181818', helmet: '#303030' },
    style: 'elite_man', zone: 0.15, man: 0.7, blitz: 0.15,
    desc: '两个精英角卫锁死你的前两个WR', weakness: 'WR3/WR4',
    stars: [
      { num: 24, name: '锁链', role: 'cornerback', coverage: 95, ability: 'shutdown_wr1',
        desc: '锁死你的WR1', auraColor: '#808080' },
      { num: 28, name: '暗锁', role: 'cornerback', coverage: 90, ability: 'shutdown_wr2',
        desc: '锁死你的WR2', auraColor: '#606060' }
    ],
    wr1CovMod: -40, wr2CovMod: -35, wr34Bonus: 15,
    commentary: {
      wr1: '锁链紧紧贴防WR1，这个传球几乎不可能完成！',
      wr3: '聪明的选择！WR3是击败双子锁链的关键！',
      adapt: '注意！双子锁链在下半场调整了防守重心！',
    }
  },
  {
    id: 'storm_pressure', name: '狂风压迫', nameEn: 'Storm Pressure', icon: '🌪️',
    colors: { jersey: '#284048', accent: '#58a0b8', pants: '#183038', helmet: '#385058' },
    style: 'variable', zone: 0.33, man: 0.33, blitz: 0.34,
    desc: '每档随机切换防守方案', weakness: 'Motion阅读',
    stars: [{ num: 0, name: '风暴指挥', role: 'coordinator', ability: 'adapt_3plays',
      desc: '3档后适应你的进攻模式', auraColor: '#58a0b8' }],
    randomScheme: true, adaptAfter: 3,
    commentary: {
      random: '狂风压迫又换了一套方案！完全无法预测！',
      adapt: '风暴指挥已经看穿了你的套路，是时候改变策略了！',
      motion: 'Motion阅读是对付狂风压迫的关键武器！',
    }
  },
  {
    id: 'fortress', name: '铁桶阵', nameEn: 'Fortress', icon: '🏰',
    colors: { jersey: '#704820', accent: '#a87838', pants: '#503018', helmet: '#805828' },
    style: 'prevent', zone: 0.6, man: 0.3, blitz: 0.1,
    desc: '保守防守，短传随便接但深传不可能', weakness: '耐心短传',
    stars: [{ num: 0, name: '铁桶指挥', role: 'coordinator', ability: 'prevent_deep',
      desc: '所有DB退后15码，深传-40%', auraColor: '#a87838' }],
    deepPenalty: -40, shortBonus: 20, fatigueDrain: true,
    commentary: {
      short: '短传成功，但铁桶阵就是让你这么打——考验你的耐心和体力！',
      deep_fail: '深传失败！铁桶阵的DB全部退后15码，深区密不透风！',
      fatigue: '连续推进让体力下降，这正是铁桶阵想要的结果！',
    }
  },
  {
    id: 'viper_counter', name: '毒蛇反击', nameEn: 'Viper Counter', icon: '🐍',
    colors: { jersey: '#2a4828', accent: '#58a848', pants: '#1a3018', helmet: '#385838' },
    style: 'counter', zone: 0.35, man: 0.45, blitz: 0.2,
    desc: '研究你的选择模式', weakness: '分散传球',
    stars: [{ num: 31, name: '毒蛇', role: 'safety', ability: 'mirror_best',
      desc: '同一WR传3次后双人包夹', auraColor: '#58a848' }],
    counterAfterPicks: 3,
    commentary: {
      counter: '毒蛇已经第三次盯防你的WR了，是时候换个目标了！',
      spread: '分散传球！毒蛇反击最怕你雨露均沾！',
      double: '双人包夹！毒蛇反击已经锁定了你最爱的目标！',
    }
  },
  {
    id: 'giant_front', name: '巨人前线', nameEn: 'Giant Front', icon: '🗿',
    colors: { jersey: '#484050', accent: '#807088', pants: '#383040', helmet: '#585060' },
    style: 'slow_rush', zone: 0.4, man: 0.35, blitz: 0.25,
    desc: '冲传慢但3秒后无法阻挡', weakness: '快速出手',
    stars: [{ num: 97, name: '巨人', role: 'dlineman', ability: 'charge_up',
      desc: '3秒蓄力后100%擒杀', auraColor: '#807088' }],
    rushChargeUp: true, chargeUpTime: 3.0,
    commentary: {
      charge: '巨人开始蓄力了！你只有3秒钟出手！',
      sack: '巨人完成蓄力——无人能挡！',
      quick: '在巨人蓄力完成前快速出手！聪明的选择！',
    }
  },
  {
    id: 'ghost_mist', name: '幽灵迷雾', nameEn: 'Ghost Mist', icon: '🌫️',
    colors: { jersey: '#404858', accent: '#7888a0', pants: '#303848', helmet: '#505868' },
    style: 'disguise', zone: 0.3, man: 0.3, blitz: 0.4,
    desc: '伪装防守，snap前后阵型完全不同', weakness: '猜测',
    stars: [{ num: 0, name: '迷雾指挥', role: 'coordinator', ability: 'disguise',
      desc: '每半场3次完美伪装，Motion无效', auraColor: '#7888a0' }],
    disguisePlays: 3, motionNullified: true,
    commentary: {
      disguise: '伪装防守！看起来是Cover 2但变成了全面突袭！',
      guess_right: '猜对了！在迷雾中找到了正确的目标！',
      guess_wrong: '被伪装骗了！这就是幽灵迷雾的可怕之处！',
    }
  },
  {
    id: 'falcon_alliance', name: '猎鹰联盟', nameEn: 'Falcon Alliance', icon: '🦅',
    colors: { jersey: '#802020', accent: '#c04040', pants: '#e0c8a8', helmet: '#902828' },
    style: 'balanced_elite', zone: 0.35, man: 0.35, blitz: 0.3,
    desc: '全面精英防守，无明显弱点', weakness: '综合实力',
    stars: [{ num: 11, name: '猎鹰', role: 'all', ability: 'rotating_star',
      desc: '每场随机强化一个位置', auraColor: '#c04040' }],
    allStatBonus: 10,
    commentary: {
      elite: '猎鹰联盟每个位置都是精英，找不到弱点！',
      rotate: '今天猎鹰的重点防守在...小心应对！',
      respect: '这就是季后赛级别的防守，必须全力以赴！',
    }
  },
  {
    id: 'dynasty_guard', name: '王朝守卫', nameEn: 'Dynasty Guard', icon: '👑',
    colors: { jersey: '#c8a020', accent: '#f0d040', pants: '#1a1a1a', helmet: '#d4a828' },
    style: 'ultimate', zone: 0.33, man: 0.34, blitz: 0.33,
    desc: '终极防守，每2档适应，双星球员', weakness: '你学到的一切',
    stars: [
      { num: 1, name: '王冠', role: 'safety', coverage: 98, ability: 'ultimate_read',
        desc: '阅读能力满级，适应你的一切', auraColor: '#d4a828' },
      { num: 50, name: '守卫', role: 'linebacker', speed: 95, ability: 'ultimate_rush',
        desc: '冲传与覆盖双修', auraColor: '#f0d040' }
    ],
    allStatBonus: 20, adaptEvery: 2,
    commentary: {
      adapt: '王朝守卫已经完全适应了你的打法！快想新办法！',
      elite: '这是你见过的最强防守，每个动作都被预判了！',
      clutch: '这就是冠军赛！拿出你所有的本事！',
    }
  },
];

function getTeamColors(teamId) {
  const team = TEAMS.find(t => t.id === teamId);
  if (!team) return null;
  return team.colors;
}

// ============================================================
// GAME STATE
// ============================================================
const game = {
  state: 'title', ballYardLine: 5, downs: { current: 1, max: 4 },
  firstDownLine: 25, gotFirstDown: false, score: 0, // V16: midfield first down (25yd line)
  gameNum: 1, maxGames: 10, losses: 0, maxLosses: 3,
  animFrame: 0, animTimer: 0, time: 0, stress: 0, gold: 100,
  audiblesLeft: 1, weatherDebuff: 0, scoutReport: false,
  readingPhase: false, readingTimer: 0, weatherType: 'normal',
  playCount: 0, driveYards: 0, drivePlays: 0, highlightTimer: 0,
  scoreAnimTarget: 0, scoreAnimCurrent: 0,
  motionUsed: false, motionResult: null, motionWRIndex: -1,
  passType: 'touch', scrambleResult: null,
  tdCelebrationTimer: 0, replayActive: false, replayTimer: 0,
  seasonStats: { completions: 0, attempts: 0, yards: 0, tds: 0, ints: 0, sacks: 0, plays: [] },
  currentTeam: null, currentTeamIdx: 0,
  adaptiveTracker: { wrPicks: [0,0,0,0], routePicks: {} },
  victoryCeremony: false, victoryCeremonyTimer: 0,
  wrTrust: [50, 50, 50, 50],
  halftimeShown: false, halftimeAdjustment: null,
  mapSeed: 0, teamOrder: [], weatherSeed: 0,
  coverageTracker: { zone: 0, man: 0, blitz: 0 },
  newMilestones: [], challengeSeedCode: '',
  composureRecoveryBonus: 0, filmStudyFloorsLeft: 0, playBookExpanded: false,
  // V14 additions
  gameScore: { player: 0, opponent: 0 }, quarter: 1,
  gameClock: 360, gameClockRunning: false, // V17: 6-minute real-time countdown
  starAbilityUsed: {}, disguisesLeft: 3, teamWrPicks: [0,0,0,0],
  betweenGamePhase: 'none', // 'none', 'map', 'event', 'shop', 'rest', 'training'
  seasonRecord: [], // array of { teamId, won }
  iceFreezeUsed: false, defenseHandbookActive: false,
  comebackActive: false,
};

let qb = { accuracy: 70, arm: 60, readSpeed: 0, level: 1 };
let wrs = [
  { id: 0, name: '王牌', spd: 60, cat: 65, rte: 60, lvl: 1, num: 81 },
  { id: 1, name: '闪击', spd: 55, cat: 60, rte: 65, lvl: 1, num: 88 },
  { id: 2, name: '疾风', spd: 65, cat: 55, rte: 55, lvl: 1, num: 13 },
  { id: 3, name: '铁塔', spd: 50, cat: 70, rte: 60, lvl: 1, num: 84 },
];
let relics = [];
const MAX_RELICS = 10;
let defenseBonus = 0;

// ============================================================
// ENHANCED RELIC SYSTEM
// ============================================================
const RELIC_DEFS = [
  // Original relics
  { id: 'golden_arm', name: '黄金臂', desc: '深传精准度+15%', icon: '💪', tier: 'rare' },
  { id: 'route_tree', name: '路线百科', desc: '解锁新路线类型', icon: '📖', tier: 'rare' },
  { id: 'film_study', name: '录像研究', desc: '可看到防守覆盖提示', icon: '📋', tier: 'uncommon' },
  { id: 'quick_release', name: '快速出手', desc: '冲传速度降低20%', icon: '⚡', tier: 'uncommon' },
  { id: 'sticky_gloves', name: '黏手套', desc: '全队接球+8', icon: '🧤', tier: 'common' },
  { id: 'speed_shoes', name: '速度鞋', desc: '全队速度+8', icon: '👟', tier: 'common' },
  { id: 'playbook', name: '战术手册', desc: '精准度+5 臂力+5', icon: '📒', tier: 'common' },
  { id: 'hot_hand', name: '火热手感', desc: '连续成功接球后加成叠加', icon: '🔥', tier: 'rare' },
  { id: 'pocket_poise', name: '口袋沉稳', desc: '压力下精准不降', icon: '🧠', tier: 'uncommon' },
  { id: 'audible_master', name: '变阵大师', desc: '每局额外获得1次变阵', icon: '🎯', tier: 'rare' },
  { id: 'iron_will', name: '钢铁意志', desc: '第4档成功率+20%', icon: '🛡️', tier: 'uncommon' },
  { id: 'scramble', name: '跑动能力', desc: '闪避成功率提升', icon: '🏃', tier: 'common' },
  // V14 new relics
  { id: 'golden_armguard', name: '黄金臂套', desc: 'QB全传球精准度+15%', icon: '🦾', tier: 'legendary' },
  { id: 'ghost_boots', name: '幽灵战靴', desc: 'WR路线跑动+20%', icon: '👻', tier: 'rare' },
  { id: 'eagle_visor', name: '鹰眼护目镜', desc: 'Motion必定准确阅读防守', icon: '🥽', tier: 'legendary' },
  { id: 'time_freeze', name: '时间冻结器', desc: '传球选择无时间限制', icon: '⏱️', tier: 'rare' },
  { id: 'pressure_mask', name: '压力面罩', desc: '压力增加减半', icon: '😶', tier: 'uncommon' },
  { id: 'football_heart', name: '橄榄球之心', desc: '落后14+分时全属性+25%', icon: '❤️', tier: 'legendary' },
  { id: 'gambler_coin', name: '赌徒硬币', desc: '每档50%几率+30%或-20%精准', icon: '🪙', tier: 'rare' },
  { id: 'chain_lightning', name: '连锁闪电', desc: '3次连续完成=下次自动完成', icon: '⚡', tier: 'legendary' },
  { id: 'trust_medal', name: '信任勋章', desc: 'WR信任增长翻倍', icon: '🎖️', tier: 'uncommon' },
  { id: 'defense_handbook', name: '防守手册', desc: '选择WR前看到防守阵型', icon: '📕', tier: 'rare' },
  { id: 'ice_whistle', name: '冰冻口哨', desc: '每场1次强制显示防守', icon: '🧊', tier: 'uncommon' },
  { id: 'iron_armor', name: '铁壁护具', desc: '擒杀压力减少75%', icon: '🛡️', tier: 'uncommon' },
  { id: 'mvp_trophy', name: 'MVP奖杯', desc: '传给最差WR时经验翻倍', icon: '🏆', tier: 'rare' },
  { id: 'storm_horn', name: '暴风号角', desc: '防守失误几率+10%', icon: '📯', tier: 'uncommon' },
  { id: 'double_agent', name: '双面间谍', desc: '30%几率防守站错位', icon: '🕵️', tier: 'rare' },
];

const SYNERGIES = [
  { id: 'juke', name: '晃动能力', desc: '速度+路线大师', req: (wr) => wr.spd >= 75 && wr.rte >= 75, bonus: { openness: 15 } },
  { id: 'sure_hands', name: '稳接手', desc: '接球+速度高', req: (wr) => wr.cat >= 75 && wr.spd >= 70, bonus: { catchBonus: 10 } },
  { id: 'route_master', name: '路线宗师', desc: '路线+接球高', req: (wr) => wr.rte >= 75 && wr.cat >= 70, bonus: { openness: 10 } },
];
function hasRelic(id) { return relics.some(r => r.id === id); }
function checkSynergies(wrIdx) { return SYNERGIES.filter(s => s.req(wrs[wrIdx])); }

// ============================================================
// SEASON MAP SYSTEM — 10 games + between-game nodes
// ============================================================
let seasonMap = null;

function generateSeasonMap() {
  const seed = game.mapSeed || Math.floor(Math.random() * 100000);
  game.mapSeed = seed;
  const rng = SeedSystem.seededRandom(seed);

  // Pick 10 teams from 12 in order of difficulty
  const easyTeams = ['iron_wall', 'shadow_hawks', 'lightning_blitz'];
  const medTeams = ['phantom_zone', 'twin_locks', 'storm_pressure'];
  const hardTeams = ['fortress', 'viper_counter', 'giant_front', 'ghost_mist'];
  const bossTeams = ['falcon_alliance', 'dynasty_guard'];

  // Shuffle within tiers
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  shuffle(easyTeams); shuffle(medTeams); shuffle(hardTeams);

  const teamOrder = [
    easyTeams[0], easyTeams[1], easyTeams[2],   // Games 1-3
    medTeams[0], medTeams[1], medTeams[2],       // Games 4-6
    hardTeams[Math.floor(rng() * hardTeams.length)], // Game 7 (rival)
    hardTeams[0], hardTeams[1],                   // Games 8-9
    bossTeams[Math.floor(rng() * 2)],            // Game 10 (championship)
  ];
  game.teamOrder = teamOrder;

  // Between-game nodes: after each game, choose a node
  const betweenNodes = [];
  for (let i = 0; i < 9; i++) { // 9 gaps between 10 games
    const nodes = [];
    const r = rng();
    if (i === 4) { // Before game 6, always offer rest
      nodes.push({ type: 'rest' }, { type: 'shop' }, { type: 'training' });
    } else if (r < 0.3) {
      nodes.push({ type: 'rest' }, { type: 'event' });
    } else if (r < 0.6) {
      nodes.push({ type: 'shop' }, { type: 'event' });
    } else {
      nodes.push({ type: 'shop' }, { type: 'training' }, { type: 'event' });
    }
    betweenNodes.push(nodes);
  }

  seasonMap = { teamOrder, betweenNodes, currentGame: 0 };
}

function getCurrentTeam() {
  if (!seasonMap || game.gameNum > 10) return TEAMS[0];
  const teamId = seasonMap.teamOrder[game.gameNum - 1];
  return TEAMS.find(t => t.id === teamId) || TEAMS[0];
}

// ============================================================
// ENHANCED EVENT SYSTEM
// ============================================================
const EVENTS = [
  { title: '教练指导', desc: '一个老教练在场边画了几个新跑法。选择一名WR提升路线跑动+8。', type: 'choose_wr', effect: (wrIdx) => { wrs[wrIdx].rte += 8; } },
  { title: '大风天', desc: '风太大了！下一场所有深传精准度-12%。', type: 'instant', effect: () => { game.weatherDebuff = 12; } },
  { title: '加练冲刺', desc: '全队加练了冲刺训练。所有WR速度+4。', type: 'instant', effect: () => { wrs.forEach(w => w.spd += 4); } },
  { title: '情报泄露', desc: '有人透露了防守战术。下一场可以看到防守覆盖提示。', type: 'instant', effect: () => { game.scoutReport = true; } },
  { title: '新手套', desc: '捡到了一副好手套。选择一名WR提升接球+10。', type: 'choose_wr', effect: (wrIdx) => { wrs[wrIdx].cat += 10; } },
  { title: '专注训练', desc: 'QB冥想训练了一下。精准度+6。', type: 'instant', effect: () => { qb.accuracy += 6; } },
  { title: '团队默契', desc: '队友之间更有默契了。随机两名WR各项+3。', type: 'instant', effect: () => {
    const a = Math.floor(Math.random() * 4);
    let b; do { b = Math.floor(Math.random() * 4); } while (b === a);
    [a, b].forEach(i => { wrs[i].spd += 3; wrs[i].cat += 3; wrs[i].rte += 3; });
  }},
  { title: '垃圾话', desc: '对面一直在说垃圾话！压力+15。', type: 'instant', effect: () => { addStress(15); } },
  { title: '观众打赏', desc: '围观群众觉得你打得不错，给了50金币。', type: 'instant', effect: () => { game.gold += 50; } },
  { title: '深呼吸', desc: 'QB做了几个深呼吸。压力-15。', type: 'instant', effect: () => { reduceStress(15); } },
  // V14 new events
  { title: '更衣室矛盾', desc: '你的WR1和WR3因为更衣室矛盾发生冲突！选择支持哪一方：支持者信任+20，另一方-15。', type: 'choose_side',
    options: [{ text: '支持' + '王牌', effect: () => { game.wrTrust[0] += 20; game.wrTrust[2] -= 15; } },
              { text: '支持' + '疾风', effect: () => { game.wrTrust[2] += 20; game.wrTrust[0] -= 15; } }]
  },
  { title: '球探报告泄露', desc: '球探报告泄露了！下一场对手的明星球员能力提前揭晓。', type: 'instant',
    effect: () => { game.scoutReport = true; }
  },
  { title: '暴风雪来袭', desc: '暴风雪来袭！下一场深传-30%，短传+10%。', type: 'instant',
    effect: () => { game.weatherType = 'snow'; game.weatherDebuff = 15; }
  },
  { title: '赞助商送来新装备', desc: '赞助商送来新装备！免费选择一个圣物。', type: 'relic_choice', effect: () => {} },
  { title: '对手明星受伤', desc: '对手的明星球员在训练中受伤！下一场明星球员能力无效。', type: 'instant',
    effect: () => { game.starAbilityUsed = { disabled: true }; }
  },
  { title: '教练的特训', desc: '教练为一名WR制定了特训计划。选择一名WR获得某项属性+15。', type: 'choose_wr',
    effect: (wrIdx) => { const stats = ['spd', 'cat', 'rte']; wrs[wrIdx][stats[Math.floor(Math.random() * 3)]] += 15; }
  },
  { title: '记者采访', desc: '记者采访你对下一场比赛的看法。', type: 'choose_side',
    options: [
      { text: '谦虚回答 (全队信任+5)', effect: () => { game.wrTrust = game.wrTrust.map(t => Math.min(100, t + 5)); } },
      { text: '自信宣言 (压力抗性+10, 信任-3)', effect: () => { game.composureRecoveryBonus += 10; game.wrTrust = game.wrTrust.map(t => Math.max(0, t - 3)); } },
    ]
  },
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
    pool.push({ name: `${rel.icon} ${rel.name}`, cost: rel.tier === 'legendary' ? 200 : rel.tier === 'rare' ? 150 : 120, relicId: rel.id, apply: () => { relics.push(rel); } });
  }
  shopItems = pool.sort(() => Math.random() - 0.5).slice(0, 5);
}

// ============================================================
// FORMATIONS
// ============================================================
function getLOSYard() { return game.ballYardLine; }

const offenseFormations = [
  { name: 'Shotgun Spread', getPositions: (losY) => ({ qb: { yard: losY - 5, lane: 30 },
    wrs: [{ yard: losY, lane: 5, route: 'streak' }, { yard: losY - 1, lane: 18, route: 'slant' },
          { yard: losY - 1, lane: 42, route: 'out' }, { yard: losY, lane: 55, route: 'post' }] })},
  { name: 'Trips Right', getPositions: (losY) => ({ qb: { yard: losY - 5, lane: 25 },
    wrs: [{ yard: losY, lane: 5, route: 'curl' }, { yard: losY - 1, lane: 38, route: 'slant' },
          { yard: losY, lane: 46, route: 'out' }, { yard: losY - 1, lane: 54, route: 'streak' }] })},
  { name: 'Trips Left', getPositions: (losY) => ({ qb: { yard: losY - 5, lane: 35 },
    wrs: [{ yard: losY - 1, lane: 6, route: 'streak' }, { yard: losY, lane: 14, route: 'out' },
          { yard: losY - 1, lane: 22, route: 'slant' }, { yard: losY, lane: 55, route: 'curl' }] })},
  { name: 'Bunch Right', getPositions: (losY) => ({ qb: { yard: losY - 5, lane: 25 },
    wrs: [{ yard: losY, lane: 5, route: 'post' }, { yard: losY - 1, lane: 40, route: 'flat' },
          { yard: losY, lane: 44, route: 'slant' }, { yard: losY - 1, lane: 48, route: 'streak' }] })},
  { name: 'Empty Spread', getPositions: (losY) => ({ qb: { yard: losY - 6, lane: 30 },
    wrs: [{ yard: losY, lane: 4, route: 'streak' }, { yard: losY - 1, lane: 18, route: 'drag' },
          { yard: losY - 1, lane: 42, route: 'drag' }, { yard: losY, lane: 56, route: 'streak' }] })},
  { name: 'Slot Left', getPositions: (losY) => ({ qb: { yard: losY - 5, lane: 32 },
    wrs: [{ yard: losY, lane: 5, route: 'post' }, { yard: losY - 1, lane: 18, route: 'slant' },
          { yard: losY - 1, lane: 44, route: 'curl' }, { yard: losY, lane: 55, route: 'out' }] })},
];

const defenseFormations = [
  // Cover 1: 3 man DBs at LOS+6, free safety at LOS+10
  { name: 'Cover 1', desc: '人盯人+自由安全卫', coverType: 'man',
    getPositions: (losY) => ({ rusher: { yard: losY + 7, lane: 30, fast: false },
      dbs: [{ yard: losY + 6, lane: 10, role: 'man', coverIdx: 0 }, { yard: losY + 6, lane: 22, role: 'man', coverIdx: 1 },
            { yard: losY + 6, lane: 38, role: 'man', coverIdx: 2 }, { yard: losY + 10, lane: 30, role: 'free', coverIdx: -1 }] }) },
  // Cover 2: 2 deep safeties at LOS+10, 2 flat defenders at LOS+5
  { name: 'Cover 2', desc: '两深区域防守', coverType: 'zone',
    getPositions: (losY) => ({ rusher: { yard: losY + 7, lane: 30, fast: false },
      dbs: [{ yard: losY + 10, lane: 15, role: 'deep', coverIdx: -1 }, { yard: losY + 10, lane: 45, role: 'deep', coverIdx: -1 },
            { yard: losY + 5, lane: 18, role: 'flat', coverIdx: -1 }, { yard: losY + 5, lane: 42, role: 'flat', coverIdx: -1 }] }) },
  // Cover 3: 3 deep at LOS+10, 1 flat underneath at LOS+5
  { name: 'Cover 3', desc: '三深区域防守', coverType: 'zone',
    getPositions: (losY) => ({ rusher: { yard: losY + 7, lane: 30, fast: false },
      dbs: [{ yard: losY + 10, lane: 10, role: 'deep', coverIdx: -1 }, { yard: losY + 10, lane: 30, role: 'deep', coverIdx: -1 },
            { yard: losY + 10, lane: 50, role: 'deep', coverIdx: -1 }, { yard: losY + 5, lane: 30, role: 'flat', coverIdx: -1 }] }) },
  // Cover 4: all 4 at LOS+7 (quarters coverage)
  { name: 'Cover 4', desc: '四深区域防守', coverType: 'zone',
    getPositions: (losY) => ({ rusher: { yard: losY + 7, lane: 30, fast: false },
      dbs: [{ yard: losY + 7, lane: 8, role: 'deep', coverIdx: -1 }, { yard: losY + 7, lane: 23, role: 'deep', coverIdx: -1 },
            { yard: losY + 7, lane: 37, role: 'deep', coverIdx: -1 }, { yard: losY + 7, lane: 52, role: 'deep', coverIdx: -1 }] }) },
  // Man Blitz: all man DBs at LOS+5 (press), fast rusher
  { name: 'Man Blitz', desc: '全面突袭', coverType: 'blitz',
    getPositions: (losY) => ({ rusher: { yard: losY + 7, lane: 30, fast: true },
      dbs: [{ yard: losY + 5, lane: 10, role: 'man', coverIdx: 0 }, { yard: losY + 5, lane: 22, role: 'man', coverIdx: 1 },
            { yard: losY + 5, lane: 38, role: 'man', coverIdx: 2 }, { yard: losY + 5, lane: 50, role: 'man', coverIdx: 3 }] }) },
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
  dig: (sy, sl) => [{ yard: sy + 10, lane: sl }, { yard: sy + 10, lane: sl + (sl < 30 ? 15 : -15) }],
  seam: (sy, sl) => [{ yard: sy + 15, lane: sl + (sl < 30 ? 3 : -3) }],
};
function isDeepRoute(route) { return ['streak', 'post', 'corner', 'wheel', 'seam'].includes(route); }
function isShortRoute(route) { return ['flat', 'drag', 'hitch', 'curl'].includes(route); }

// ============================================================
// WR TRUST SYSTEM
// ============================================================
function updateTrust(targetWR, result) {
  let gain = result === 'complete' ? 8 : 3;
  if (hasRelic('trust_medal')) gain *= 2;
  game.wrTrust[targetWR] += gain;
  for (let i = 0; i < 4; i++) { if (i !== targetWR) game.wrTrust[i] -= 2; }
  game.wrTrust = game.wrTrust.map(t => Math.max(0, Math.min(100, t)));
}

function getTrustStatus(wrIndex) {
  const t = game.wrTrust[wrIndex];
  if (t > 70) return { status: 'clutch', emoji: '🔥', color: '#c07028', catchMod: 12, wrongRouteChance: 0 };
  if (t >= 40) return { status: 'normal', emoji: '', color: '#888', catchMod: 0, wrongRouteChance: 0 };
  if (t >= 20) return { status: 'cold', emoji: '❄️', color: '#4878b8', catchMod: -8, wrongRouteChance: 0.05 };
  return { status: 'frustrated', emoji: '😤', color: '#c04040', catchMod: -15, wrongRouteChance: 0.10 };
}

function getTrustCatchMod(wrIndex, isClutchDown) {
  const trust = getTrustStatus(wrIndex);
  if (trust.status === 'clutch' && isClutchDown) return trust.catchMod;
  if (trust.status === 'cold' || trust.status === 'frustrated') return trust.catchMod;
  return 0;
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
  if (hasRelic('pressure_mask')) mod *= 0.5;
  game.stress = Math.min(100, Math.max(0, game.stress + amount * mod));
  if (amount > 0) SFX.play('stress_up');
}
function reduceStress(amount) {
  amount += game.composureRecoveryBonus || 0;
  game.stress = Math.max(0, game.stress - amount);
}

// ============================================================
// TEAM-SPECIFIC COVERAGE SELECTION
// ============================================================
function getTeamCoverageWeights() {
  const team = getCurrentTeam();
  let weights = { zone: team.zone, man: team.man, blitz: team.blitz };

  // Random scheme teams change every play
  if (team.randomScheme) {
    const r = Math.random();
    if (r < 0.33) weights = { zone: 0.8, man: 0.1, blitz: 0.1 };
    else if (r < 0.66) weights = { zone: 0.1, man: 0.8, blitz: 0.1 };
    else weights = { zone: 0.1, man: 0.1, blitz: 0.8 };
  }

  // Adaptive teams adjust based on player patterns
  if (team.adaptEvery) {
    const totalPlays = game.teamWrPicks.reduce((a, b) => a + b, 0);
    if (totalPlays > 0 && totalPlays % team.adaptEvery === 0) {
      const maxPick = Math.max(...game.teamWrPicks);
      if (maxPick > 1) weights.man += 0.15;
    }
  }

  if (team.tendencyRead) {
    const maxRoute = Object.entries(game.adaptiveTracker.routePicks).sort((a, b) => b[1] - a[1])[0];
    if (maxRoute && maxRoute[1] >= 3) weights.zone += 0.1;
  }

  // Halftime DC adjustments
  if (game.halftimeShown && game.halftimeAdjustment) {
    const maxPicks = Math.max(...game.teamWrPicks);
    if (maxPicks > 2) defenseBonus += 3;
  }

  return weights;
}

function selectDefFormationByTeam() {
  const weights = getTeamCoverageWeights();
  const r = Math.random();
  let coverType;
  if (r < weights.zone) coverType = 'zone';
  else if (r < weights.zone + weights.man) coverType = 'man';
  else coverType = 'blitz';
  game.coverageTracker[coverType]++;
  const matching = defenseFormations.filter(f => f.coverType === coverType);
  if (matching.length > 0) return matching[Math.floor(Math.random() * matching.length)];
  return defenseFormations[Math.floor(Math.random() * defenseFormations.length)];
}

// ============================================================
// COMMENTARY SYSTEM
// ============================================================
const Commentary = {
  lines: [],
  templates: {
    presnap_motion_man: ["Motion识别——人盯人防守！调整你的阅读。", "DB跟着走了——确认Man Coverage！"],
    presnap_motion_zone: ["区域防守！那个缝隙是空的。", "DB没有跟——Zone Coverage。"],
    bullet_short: ["子弹传球——穿针引线！", "快速出手穿过人群！"],
    bullet_deep: ["子弹传球打入双人包夹！", "炮弹直飞深区！"],
    touch_mid: ["漂亮的弧线传球！", "完美螺旋，正中目标！"],
    lob_deep: ["远射！高弧线炸弹！", "冒险传向双人包夹的深区！"],
    lob_short: ["高抛到平面区？有意思的选择。", "把球飘到短区..."],
    big_play: ["{yards}码大爆发！太漂亮了！", "他炸了！{yards}码长传打击！"],
    td: ["TOUCHDOWN！完美的推进！", "达阵！六分到手！"],
    int: ["INTERCEPTION！太冒险了！", "被截！回合结束！"],
    sack: ["SACK！他拿球太久了！", "被擒杀！压力太大了！"],
    scramble_success: ["他闪开了！翻滚出来！", "躲开了冲传！还活着！"],
    scramble_fail: ["被从身后抓住了！", "无处可逃！"],
    scramble_stand: ["在口袋里挺住了！", "不慌——在压力下传球！"],
    incomplete: ["传球未完成。", "差一点就够到了！"],
    first_down: ["FIRST DOWN！继续推进！", "新的一组进攻！"],
    fourth_down: ["第4档...压力来了！", "必须在这里转换！"],
    audible: ["AUDIBLE！改变战术！", "他看到了什么——新的暗号！"],
    trust_hot: ["又传给他的最爱目标！", "和#{num}号越来越有默契！"],
    trust_cold: ["这个接球手状态冰冷——冒险的传球！", "整场比赛都没看他..."],
  },
  generate(key, vars) {
    const pool = this.templates[key];
    if (!pool || pool.length === 0) return;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (vars) { for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v); }
    this.show(text, 2.5);
    SFX.play('commentary_ding');
  },
  // Team-specific commentary
  teamComment(team, key) {
    if (team.commentary && team.commentary[key]) {
      this.show(team.commentary[key], 3.0);
      SFX.play('commentary_ding');
    }
  },
  show(text, duration) { this.lines.push({ text, alpha: 1, timer: duration || 2, maxTimer: duration || 2 }); },
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
    for (let i = 0; i < Math.min(this.lines.length, 3); i++) {
      const l = this.lines[i];
      c.globalAlpha = l.alpha * 0.95;
      c.font = 'bold 12px "Courier New", monospace';
      c.textAlign = 'center';
      const tw = c.measureText(l.text).width;
      // Pixel art speech bubble style
      const bx = W / 2 - tw / 2 - 12, by = baseY - 22 - i * 26, bw = tw + 24, bh = 22;
      c.fillStyle = COL.cardBg; c.fillRect(bx, by, bw, bh);
      c.strokeStyle = COL.cardBorder; c.lineWidth = 1;
      c.strokeRect(bx, by, bw, bh);
      c.fillStyle = COL.parchment;
      c.fillText(l.text, W / 2, baseY - 7 - i * 26);
    }
    c.restore();
  }
};

// ============================================================
// WEATHER SYSTEM
// ============================================================
const Weather = {
  rainDrops: [], snowFlakes: [], splashes: [], footprints: [],
  getWeatherForGame(gameNum) {
    if (game.weatherType === 'snow') return 'snow';
    if (gameNum <= 3) return 'day';
    if (gameNum <= 5) return 'dusk';
    if (gameNum <= 7) return 'night';
    if (gameNum <= 9) return Math.random() < 0.4 ? 'rain' : 'night';
    return 'rain';
  },
  isSnow() { return game.weatherType === 'snow'; },
  initParticles() { this.rainDrops = []; this.snowFlakes = []; this.splashes = []; this.footprints = []; },
  update(dt) {
    const weather = this.getWeatherForGame(game.gameNum);
    if (weather === 'rain' || weather === 'snow') {
      if (weather === 'snow' || this.isSnow()) {
        while (this.snowFlakes.length < 120) {
          this.snowFlakes.push({ x: Math.random() * W, y: Math.random() * H,
            size: 1 + Math.random() * 2, speed: 15 + Math.random() * 25,
            drift: (Math.random() - 0.5) * 30, alpha: 0.3 + Math.random() * 0.4 });
        }
        for (let i = this.snowFlakes.length - 1; i >= 0; i--) {
          const s = this.snowFlakes[i];
          s.y += s.speed * dt; s.x += s.drift * dt + Math.sin(game.time * 2 + i) * 0.3;
          if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
        }
      } else {
        while (this.rainDrops.length < 180) {
          this.rainDrops.push({ x: Math.random() * W, y: Math.random() * H,
            speed: 400 + Math.random() * 200, length: 6 + Math.random() * 10,
            alpha: 0.12 + Math.random() * 0.2 });
        }
        for (let i = this.rainDrops.length - 1; i >= 0; i--) {
          const d = this.rainDrops[i];
          d.y += d.speed * dt; d.x -= d.speed * 0.2 * dt;
          if (d.y > FIELD.top + FIELD.height) { d.y = -10; d.x = Math.random() * W + 80; }
          if (d.x < -20) { d.x = W + 10; d.y = Math.random() * H * 0.5; }
        }
      }
    } else { this.rainDrops = []; this.snowFlakes = []; }
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      this.footprints[i].life -= dt * 0.3;
      if (this.footprints[i].life <= 0) this.footprints.splice(i, 1);
    }
    if (this.footprints.length > 80) this.footprints.splice(0, 15);
  },
  addFootprint(x, y) { if (this.isSnow()) this.footprints.push({ x, y, life: 1 }); },
  drawWeatherOverlay(c) {
    const weather = this.getWeatherForGame(game.gameNum);
    if (weather === 'dusk') {
      c.save(); c.fillStyle = 'rgba(200,100,40,0.06)'; c.fillRect(0, 0, W, H);
      // Pixel art sunset
      const sg = c.createRadialGradient(W - 30, 20, 5, W - 30, 20, 100);
      sg.addColorStop(0, 'rgba(200,140,60,0.15)'); sg.addColorStop(1, 'rgba(200,100,40,0)');
      c.fillStyle = sg; c.fillRect(W - 130, 0, 130, 130); c.restore();
    } else if (weather === 'night') {
      c.save(); c.fillStyle = 'rgba(8,12,30,0.18)'; c.fillRect(0, 0, W, H);
      // Pixel art stadium lights
      const spots = [[FIELD.left, FIELD.top], [FIELD.left + FIELD.width, FIELD.top],
        [FIELD.left, FIELD.top + FIELD.height], [FIELD.left + FIELD.width, FIELD.top + FIELD.height]];
      for (const [sx, sy] of spots) {
        const g = c.createRadialGradient(sx, sy, 0, sx, sy, 200);
        g.addColorStop(0, 'rgba(255,248,200,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(sx - 200, sy - 200, 400, 400);
      }
      c.restore();
    } else if (weather === 'rain' || weather === 'snow') {
      c.save(); c.fillStyle = 'rgba(8,12,25,0.08)'; c.fillRect(0, 0, W, H); c.restore();
    }
  },
  drawParticles(c) {
    const weather = this.getWeatherForGame(game.gameNum);
    if (weather !== 'rain' && weather !== 'snow') return;
    c.save();
    if (weather === 'snow' || this.isSnow()) {
      for (const s of this.snowFlakes) {
        c.globalAlpha = s.alpha; c.fillStyle = '#e8e0d8';
        // Pixel art snowflake - small squares
        const sz = Math.round(s.size);
        c.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
      }
    } else {
      for (const d of this.rainDrops) {
        c.globalAlpha = d.alpha; c.strokeStyle = 'rgba(160,180,220,0.4)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(Math.round(d.x), Math.round(d.y));
        c.lineTo(Math.round(d.x - d.length * 0.2), Math.round(d.y + d.length)); c.stroke();
      }
    }
    c.globalAlpha = 1; c.restore();
  },
  getCatchDebuff() {
    const weather = this.getWeatherForGame(game.gameNum);
    if (weather === 'snow') return 8;
    if (weather === 'rain') return 5;
    return 0;
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
      case 'confetti': case 'td_confetti': case 'victory_confetti':
        p.vx = (Math.random() - 0.5) * 150; p.vy = -Math.random() * 150 - 40;
        p.size = 2 + Math.random() * 4;
        p.color = [COL.uiGold, COL.uiBlue, COL.uiRed, COL.uiGreen, COL.parchment][Math.floor(Math.random() * 5)];
        p.maxLife = 2 + Math.random(); p.gravity = 70; break;
      case 'catch_flash':
        p.vx = (Math.random() - 0.5) * 50; p.vy = (Math.random() - 0.5) * 50;
        p.size = 1 + Math.random() * 2; p.color = [COL.parchment, COL.uiGold][Math.floor(Math.random() * 2)];
        p.maxLife = 0.5 + Math.random() * 0.4; break;
      case 'impact_dust': case 'turf_spray': case 'scramble_dust':
        p.vx = (Math.random() - 0.5) * 35; p.vy = -Math.random() * 20 - 5;
        p.size = 1 + Math.random() * 2; p.color = '#6a5430'; p.maxLife = 0.3 + Math.random() * 0.3; p.gravity = 35; break;
      case 'star_sparkle':
        p.vx = (Math.random() - 0.5) * 60; p.vy = -Math.random() * 60 - 10;
        p.size = 1 + Math.random() * 2; p.color = COL.uiGold;
        p.maxLife = 0.8 + Math.random() * 0.5; p.gravity = 20; break;
      case 'firework_burst':
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 70;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        p.size = 1 + Math.random() * 2;
        p.color = [COL.uiGold, COL.parchment, COL.uiRed, COL.uiBlue][Math.floor(Math.random() * 4)];
        p.maxLife = 0.5 + Math.random() * 0.3; p.gravity = 40; break;
      default:
        p.vx = (Math.random() - 0.5) * 30; p.vy = -Math.random() * 30;
        p.size = 1 + Math.random() * 2; p.color = COL.parchment; p.maxLife = 0.5 + Math.random() * 0.5;
    }
    particles.push(p);
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt / p.maxLife; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life);
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.color;
    const s = Math.round(p.size * (0.5 + a * 0.5));
    // Pixel art style - use rectangles instead of circles
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// SCREEN SHAKE & CAMERA
// ============================================================
let screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
function triggerShake(intensity) { screenShake.intensity = Math.max(screenShake.intensity, intensity); }
function updateShake() {
  if (screenShake.intensity > 0.1) {
    screenShake.x = Math.round((Math.random() - 0.5) * screenShake.intensity);
    screenShake.y = Math.round((Math.random() - 0.5) * screenShake.intensity);
    screenShake.intensity *= screenShake.decay;
  } else { screenShake.x = 0; screenShake.y = 0; screenShake.intensity = 0; }
}

const Camera = {
  x: 0, y: 0, zoom: 1.0, targetX: 0, targetY: 0, targetZoom: 1.0,
  shakeX: 0, shakeY: 0, shakeDecay: 0.9, tdPulseTimer: -1,
  update(dt) {
    this.x += (this.targetX - this.x) * 0.08; this.y += (this.targetY - this.y) * 0.08;
    this.zoom += (this.targetZoom - this.zoom) * 0.06;
    this.shakeX *= this.shakeDecay; this.shakeY *= this.shakeDecay;
    if (this.tdPulseTimer >= 0) {
      this.tdPulseTimer += dt;
      if (this.tdPulseTimer < 0.5) this.targetZoom = 1.0 + (0.85 - 1.0) * (this.tdPulseTimer / 0.5);
      else if (this.tdPulseTimer < 2.0) this.targetZoom = 0.85 + (1.0 - 0.85) * ((this.tdPulseTimer - 0.5) / 1.5);
      else { this.tdPulseTimer = -1; this.targetZoom = 1.0; }
    }
  },
  shake(intensity) { this.shakeX = (Math.random() - 0.5) * intensity; this.shakeY = (Math.random() - 0.5) * intensity; },
  reset() { this.x = 0; this.y = 0; this.zoom = 1.0; this.targetX = 0; this.targetY = 0; this.targetZoom = 1.0; this.shakeX = 0; this.shakeY = 0; this.tdPulseTimer = -1; },
  setForPhase(phase) {
    switch (phase) {
      case 'reading': case 'presnap': case 'choosing': this.targetZoom = 1.0; this.targetX = 0; this.targetY = 0; break;
      case 'motion': this.targetZoom = 1.03; break;
      case 'throw': this.targetZoom = 1.08; if (sim && sim.ballTarget) { const ts = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane); this.targetY = (H/2 - ts.y) * 0.4; this.targetX = (W/2 - ts.x) * 0.2; } break;
      case 'catch': this.targetZoom = 1.12; if (sim && sim.wrPos && sim.chosenWR != null) { const ts = FIELD.toScreen(sim.wrPos[sim.chosenWR].yard, sim.wrPos[sim.chosenWR].lane); this.targetY = (H/2 - ts.y) * 0.4; } break;
      case 'td': this.tdPulseTimer = 0; break;
      case 'scramble': this.targetZoom = 1.15; break;
      case 'sack': case 'incomplete': this.shake(6); break;
      case 'replay_wide': this.targetZoom = 0.9; this.targetX = 0; this.targetY = 0; break;
      case 'replay_track': this.targetZoom = 1.15; break;
      case 'replay_tight': this.targetZoom = 1.3; break;
      case 'victory_ceremony': this.targetZoom = 0.75; this.targetX = 0; this.targetY = 0; break;
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
// REPLAY SYSTEM
// ============================================================
const Replay = {
  frames: [], playing: false, frameIdx: 0, timer: 0,
  skipRequested: false, autoPlay: false,
  catchPoint: null, totalFrames: 0, passTypeUsed: 'touch',
  reset() { this.frames = []; this.playing = false; this.frameIdx = 0; this.timer = 0; this.skipRequested = false; this.autoPlay = false; this.catchPoint = null; },
  capture(data) { if (!this.playing && this.frames.length < 300) this.frames.push(JSON.parse(JSON.stringify(data))); },
  startReplay(catchPt, passType) {
    this.playing = true; this.frameIdx = Math.max(0, this.frames.length - 90);
    this.timer = 0; this.skipRequested = false; this.autoPlay = true;
    this.catchPoint = catchPt || null; this.totalFrames = this.frames.length - this.frameIdx;
    this.passTypeUsed = passType || 'touch';
  },
  getReplayProgress() { return this.totalFrames <= 0 ? 0 : (this.frameIdx - (this.frames.length - this.totalFrames)) / this.totalFrames; },
  isSlowMoMoment() { return this.getReplayProgress() > 0.85; },
  update(dt) {
    if (!this.playing) return;
    if (this.skipRequested) { this.playing = false; return; }
    this.timer += dt;
    const advanceRate = this.isSlowMoMoment() ? 0.066 : 0.033;
    if (this.timer > advanceRate) { this.timer = 0; this.frameIdx = Math.min(this.frameIdx + 1, this.frames.length - 1); }
    if (this.frameIdx >= this.frames.length - 1) { this.timer += dt * 30; if (this.timer > 3.5) this.playing = false; }
  },
  getFrame() { return (this.frameIdx >= 0 && this.frameIdx < this.frames.length) ? this.frames[this.frameIdx] : null; },
  getTrailFrames(count) {
    const trails = [];
    for (let i = 1; i <= count; i++) { const idx = this.frameIdx - i * 3; if (idx >= 0 && idx < this.frames.length) trails.push(this.frames[idx]); }
    return trails;
  },
  drawBanner(c) {
    if (!this.playing) return;
    c.save();
    c.fillStyle = '#1c1612'; c.fillRect(0, 0, W, 26); c.fillRect(0, H - 26, W, 26);
    c.fillStyle = COL.uiGold; c.font = 'bold 12px "Courier New", monospace'; c.textAlign = 'center';
    c.fillText('◆ INSTANT REPLAY ◆', W / 2, 17);
    c.fillStyle = 'rgba(200,180,140,0.5)'; c.font = '8px "Courier New"';
    c.fillText('点击跳过', W / 2, H - 10);
    c.restore();
  },
  drawBallWithTrail(c, frame) {
    if (!frame || !frame.ballPos) return;
    const bs = FIELD.toScreen(frame.ballPos.yard, frame.ballPos.lane);
    const trails = this.getTrailFrames(3);
    for (let i = 0; i < trails.length; i++) {
      if (!trails[i].ballPos) continue;
      const ts = FIELD.toScreen(trails[i].ballPos.yard, trails[i].ballPos.lane);
      c.save(); c.globalAlpha = 0.3 - i * 0.1; c.fillStyle = COL.ball;
      c.fillRect(Math.round(ts.x) - 3, Math.round(ts.y) - 2, 6, 4); c.restore();
    }
    drawBall(bs.x, bs.y);
  }
};

// ============================================================
// POST-PROCESSING (pixel art style - minimal, no scanlines)
// ============================================================
let vignetteCanvas = null;
function generateVignette() {
  vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = W; vignetteCanvas.height = H;
  const vc = vignetteCanvas.getContext('2d');
  const diag = Math.sqrt(W * W + H * H);
  const g = vc.createRadialGradient(W / 2, H / 2, diag * 0.35, W / 2, H / 2, diag * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
  vc.fillStyle = g; vc.fillRect(0, 0, W, H);
}

const PostFX = {
  bloomAlpha: 0, bloomDecay: 0.95,
  triggerBloom(alpha) { this.bloomAlpha = alpha; },
  apply(c, w, h) {
    if (!vignetteCanvas) generateVignette();
    c.save(); c.globalAlpha = 0.6; c.drawImage(vignetteCanvas, 0, 0); c.restore();
    if (this.bloomAlpha > 0.01) {
      c.save(); c.fillStyle = `rgba(232,220,200,${this.bloomAlpha * 0.2})`;
      c.fillRect(0, 0, w, h); c.restore(); this.bloomAlpha *= this.bloomDecay;
    }
  }
};

// ============================================================
// WEB AUDIO (preserved from V11)
// ============================================================
const SFX = {
  ctx: null, muted: false, crowdNode: null, crowdGain: null,
  init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.startCrowd(); } catch (e) { this.muted = true; } },
  startCrowd() {
    if (!this.ctx || this.crowdNode) return;
    try {
      const bufLen = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      this.crowdNode = this.ctx.createBufferSource();
      this.crowdNode.buffer = buf; this.crowdNode.loop = true;
      this.crowdGain = this.ctx.createGain(); this.crowdGain.gain.value = 0.012;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
      this.crowdNode.connect(filt); filt.connect(this.crowdGain);
      this.crowdGain.connect(this.ctx.destination); this.crowdNode.start();
    } catch (e) {}
  },
  crowdSwell(level) {
    if (this.crowdGain) {
      const tension = (game.ballYardLine / 50) * 0.25 + (game.downs.current >= 3 ? 0.15 : 0);
      this.crowdGain.gain.setTargetAtTime(0.012 + (level + tension) * 0.035, this.ctx.currentTime, 0.3);
    }
  },
  play(name) {
    if (this.muted) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime, ac = this.ctx;
      switch (name) {
        case 'snap': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 1000; o.type = 'sine'; g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.start(t); o.stop(t + 0.08); break; }
        case 'throw': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(600, t + 0.2); o.type = 'sine'; g.gain.value = 0.06; g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.25); break; }
        case 'bullet_throw': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(900, t + 0.08); o.type = 'sawtooth'; g.gain.value = 0.08; g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.start(t); o.stop(t + 0.12); break; }
        case 'lob_throw': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(120, t); o.frequency.linearRampToValueAtTime(350, t + 0.4); o.type = 'sine'; g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.start(t); o.stop(t + 0.5); break; }
        case 'motion_slide': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(700, t + 0.3); o.type = 'sine'; g.gain.value = 0.03; g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.start(t); o.stop(t + 0.35); break; }
        case 'scramble_dodge': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15); o.type = 'triangle'; g.gain.value = 0.12; g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.18); break; }
        case 'sack_impact': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.3); o.type = 'triangle'; g.gain.value = 0.15; g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.start(t); o.stop(t + 0.4); this.crowdSwell(-0.5); break; }
        case 'catch': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 150; o.type = 'triangle'; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.start(t); o.stop(t + 0.12); this.crowdSwell(0.5); break; }
        case 'miss': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(100, t + 0.4); o.type = 'sawtooth'; g.gain.value = 0.03; g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.start(t); o.stop(t + 0.5); break; }
        case 'td': { [220, 330, 440].forEach(freq => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = freq; o.type = 'square'; g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.start(t); o.stop(t + 0.5); }); this.crowdSwell(1); break; }
        case 'whistle': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 2800; o.type = 'sine'; g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.start(t); o.stop(t + 0.4); break; }
        case 'click': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 700; o.type = 'sine'; g.gain.value = 0.03; g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.start(t); o.stop(t + 0.04); break; }
        case 'audible': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 600; o.type = 'sine'; g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.start(t); o.stop(t + 0.1); break; }
        case 'commentary_ding': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 1200; o.type = 'sine'; g.gain.value = 0.03; g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.start(t); o.stop(t + 0.12); break; }
        case 'level_up': { [330, 415, 495, 660].forEach((freq, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = freq; o.type = 'sine'; g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, t + 0.15 * i + 0.25); o.start(t + 0.15 * i); o.stop(t + 0.15 * i + 0.25); }); break; }
        case 'gameover': { [300, 260, 220, 160].forEach((freq, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = freq; o.type = 'triangle'; g.gain.value = 0.05; g.gain.exponentialRampToValueAtTime(0.001, t + 0.2 * i + 0.3); o.start(t + 0.2 * i); o.stop(t + 0.2 * i + 0.3); }); break; }
        case 'stress_up': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(100, t); o.frequency.linearRampToValueAtTime(60, t + 0.2); o.type = 'triangle'; g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.25); break; }
        case 'champion': { [262, 330, 392, 523, 659, 784].forEach((freq, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = freq; o.type = 'square'; g.gain.setValueAtTime(0.03, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.5); }); break; }
        case 'halftime_whistle': { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 2200; o.type = 'sine'; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8); o.start(t); o.stop(t + 0.8); break; }
        case 'milestone': { [523, 659, 784, 1047].forEach((freq, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = freq; o.type = 'sine'; g.gain.setValueAtTime(0.05, t + i * 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.4); }); break; }
        case 'dc_intro': { [165, 220, 330].forEach((freq, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = freq; o.type = 'triangle'; g.gain.setValueAtTime(0.05, t + i * 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.8); o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.8); }); break; }
      }
    } catch (e) {}
  }
};

// ============================================================
// PIXEL ART SPRITE SYSTEM — 24x24 canvas-drawn
// ============================================================
function drawPixelPlayer(c, x, y, team, num, action, frame, isQB, scale, starAura) {
  const s = scale || 1;
  const px = Math.round(x), py = Math.round(y);
  const isOff = team === 'offense';
  const teamData = !isOff ? getCurrentTeam() : null;
  const tc = teamData ? teamData.colors : null;

  const jc = isOff ? COL.offJersey : (tc ? tc.jersey : COL.defJersey);
  const ja = isOff ? COL.offAccent : (tc ? tc.accent : COL.defAccent);
  const pc = isOff ? COL.offPants : (tc ? tc.pants : COL.defPants);
  const hc = isOff ? COL.offHelmet : (tc ? tc.helmet : COL.defHelmet);

  const phase = (frame || 0) / 8;
  const bob = action === 'run' ? Math.round(Math.abs(Math.sin(phase * Math.PI * 2)) * 2) : action === 'idle' ? Math.round(Math.sin(phase * Math.PI * 2) * 0.5) : 0;
  const legSwing = action === 'run' ? Math.round(Math.sin(phase * Math.PI * 2) * 3) : 0;

  c.save();

  // Star player aura
  if (starAura) {
    c.globalAlpha = 0.3 + Math.sin(game.time * 4) * 0.15;
    c.fillStyle = starAura;
    c.fillRect(px - 14 * s, py - 22 * s - bob, 28 * s, 26 * s);
    c.globalAlpha = 1;
  }

  // Shadow - pixel art style (simple ellipse as rectangle)
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(px - 8 * s, py + 2, 16 * s, 4 * s);

  // Legs (2px wide pixel legs)
  c.fillStyle = pc;
  c.fillRect(px - 4 * s, py - 4 - bob, 3 * s, 6 * s); // left leg
  c.fillRect(px + 1 * s, py - 4 - bob, 3 * s, 6 * s); // right leg
  if (action === 'run') {
    c.fillRect(px - 4 * s + legSwing, py - 2 - bob, 3 * s, 4 * s);
    c.fillRect(px + 1 * s - legSwing, py - 2 - bob, 3 * s, 4 * s);
  }

  // Cleats
  c.fillStyle = '#1a1a1a';
  c.fillRect(px - 5 * s + legSwing, py + 1, 4 * s, 2 * s);
  c.fillRect(px + 1 * s - legSwing, py + 1, 4 * s, 2 * s);

  // Body/Jersey
  c.fillStyle = jc;
  c.fillRect(px - 7 * s, py - 14 - bob, 14 * s, 10 * s);

  // Jersey accent stripe
  c.fillStyle = ja;
  c.fillRect(px - 7 * s, py - 14 - bob, 14 * s, 2 * s);

  // Number on jersey
  c.fillStyle = isOff ? COL.offAccent : ja;
  c.font = `bold ${Math.round(7 * s)}px "Courier New", monospace`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(num || ''), px, py - 9 - bob);

  // Arms
  const armY = py - 12 - bob;
  if (action === 'throw' && isQB) {
    // Throwing arm raised
    c.fillStyle = jc;
    c.fillRect(px + 7 * s, armY - 6, 3 * s, 4 * s); // right arm up
    c.fillStyle = COL.skin;
    c.fillRect(px + 7 * s, armY - 8, 3 * s, 3 * s); // hand
    // Ball in hand
    c.fillStyle = COL.ball;
    c.fillRect(px + 7 * s, armY - 10, 4 * s, 3 * s);
    // Left arm down
    c.fillStyle = jc;
    c.fillRect(px - 10 * s, armY, 3 * s, 5 * s);
  } else if (action === 'catch') {
    // Arms reaching out
    c.fillStyle = jc;
    c.fillRect(px - 11 * s, armY - 4, 4 * s, 3 * s);
    c.fillRect(px + 7 * s, armY - 4, 4 * s, 3 * s);
    c.fillStyle = COL.skin;
    c.fillRect(px - 12 * s, armY - 5, 3 * s, 3 * s);
    c.fillRect(px + 9 * s, armY - 5, 3 * s, 3 * s);
  } else if (action === 'celebrate') {
    const armUp = Math.round(Math.sin(phase * Math.PI * 4) * 4);
    c.fillStyle = jc;
    c.fillRect(px - 10 * s, armY - 6 - armUp, 3 * s, 5 * s);
    c.fillRect(px + 7 * s, armY - 6 + armUp, 3 * s, 5 * s);
  } else {
    // Default arms
    const armSwing = action === 'run' ? Math.round(Math.sin(phase * Math.PI * 2) * 2) : 0;
    c.fillStyle = jc;
    c.fillRect(px - 10 * s, armY + armSwing, 3 * s, 5 * s);
    c.fillRect(px + 7 * s, armY - armSwing, 3 * s, 5 * s);
    c.fillStyle = COL.skin;
    c.fillRect(px - 10 * s, armY + armSwing + 4 * s, 3 * s, 2 * s);
    c.fillRect(px + 7 * s, armY - armSwing + 4 * s, 3 * s, 2 * s);
  }

  // Shoulder pads
  c.fillStyle = isOff ? COL.offPad : (tc ? tc.accent : COL.defPad);
  c.fillRect(px - 9 * s, py - 15 - bob, 18 * s, 3 * s);

  // Neck
  c.fillStyle = COL.skin;
  c.fillRect(px - 2 * s, py - 17 - bob, 4 * s, 3 * s);

  // Helmet
  c.fillStyle = hc;
  c.fillRect(px - 6 * s, py - 24 - bob, 12 * s, 8 * s);
  // Helmet stripe
  c.fillStyle = isOff ? COL.offStripe : ja;
  c.fillRect(px - 1 * s, py - 24 - bob, 2 * s, 8 * s);
  // Face mask (pixel grid)
  c.fillStyle = '#888';
  c.fillRect(px - 6 * s, py - 19 - bob, 2 * s, 1 * s);
  c.fillRect(px - 6 * s, py - 17 - bob, 2 * s, 1 * s);
  // Face/eye
  c.fillStyle = COL.skin;
  c.fillRect(px - 4 * s, py - 20 - bob, 4 * s, 4 * s);
  c.fillStyle = '#222';
  c.fillRect(px - 3 * s, py - 19 - bob, 1 * s, 1 * s); // eye

  // QB gold chin strap
  if (isQB) {
    c.fillStyle = COL.uiGold;
    c.fillRect(px - 5 * s, py - 16 - bob, 1 * s, 2 * s);
    c.fillRect(px - 5 * s, py - 14 - bob, 10 * s, 1 * s);
    c.fillRect(px + 4 * s, py - 16 - bob, 1 * s, 2 * s);
  }

  c.restore();
}

// ============================================================
// PIXEL ART FIELD RENDERING
// ============================================================
let fieldTexture = null;
function generateFieldTexture() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const fx = c.getContext('2d');

  // Dark background
  fx.fillStyle = '#12100e'; fx.fillRect(0, 0, W, H);

  const fl = FIELD.left, ft = FIELD.top, fw = FIELD.width, fh = FIELD.height;

  // Pixel art grass - alternating stripe pattern with subtle variation
  const stripeH = fh / 10;
  for (let i = 0; i < 10; i++) {
    fx.fillStyle = i % 2 === 0 ? COL.grassLight : COL.grassDark;
    fx.fillRect(fl, ft + i * stripeH, fw, stripeH);
    // Subtle pixel noise texture
    for (let px = fl; px < fl + fw; px += 4) {
      for (let py = ft + i * stripeH; py < ft + (i + 1) * stripeH; py += 4) {
        if (Math.random() < 0.15) {
          fx.fillStyle = Math.random() < 0.5 ? COL.grassAlt : COL.grassStitch;
          fx.globalAlpha = 0.3;
          fx.fillRect(px, py, 2, 2);
          fx.globalAlpha = 1;
        }
      }
    }
  }

  // End zones with pixel art pattern
  const ezH = fh * 5 / 50;
  fx.fillStyle = COL.endzoneAway; fx.fillRect(fl, ft - ezH, fw, ezH);
  // Pixel art diagonal stripes
  fx.fillStyle = 'rgba(232,220,200,0.08)';
  for (let sx = -fw; sx < fw * 2; sx += 16) {
    for (let sy = 0; sy < ezH; sy += 2) {
      fx.fillRect(fl + sx + sy, ft - ezH + sy, 8, 2);
    }
  }
  fx.fillStyle = 'rgba(232,220,200,0.2)'; fx.font = 'bold 14px "Courier New", monospace'; fx.textAlign = 'center';
  fx.fillText('防 守 端 区', fl + fw / 2, ft - ezH / 2 + 5);

  fx.fillStyle = COL.endzone; fx.fillRect(fl, ft + fh, fw, ezH);
  fx.fillStyle = 'rgba(232,220,200,0.08)';
  for (let sx = -fw; sx < fw * 2; sx += 16) {
    for (let sy = 0; sy < ezH; sy += 2) {
      fx.fillRect(fl + sx + sy, ft + fh + sy, 8, 2);
    }
  }
  fx.fillStyle = 'rgba(232,220,200,0.2)'; fx.font = 'bold 14px "Courier New", monospace'; fx.textAlign = 'center';
  fx.fillText('进 攻 端 区', fl + fw / 2, ft + fh + ezH / 2 + 5);

  // Yard lines - hand-drawn pixel style (slightly irregular)
  for (let y = 0; y <= 50; y += 5) {
    const sy = ft + fh - (y / 50) * fh;
    fx.strokeStyle = COL.fieldLine;
    fx.lineWidth = y % 10 === 0 ? 2 : 1;
    fx.globalAlpha = y % 10 === 0 ? 0.6 : 0.3;
    // Pixel-style dashed line
    for (let lx = fl; lx < fl + fw; lx += 6) {
      fx.fillStyle = COL.fieldLine;
      fx.fillRect(lx, Math.round(sy), 4, y % 10 === 0 ? 2 : 1);
    }
    fx.globalAlpha = 1;
  }

  // Hash marks
  for (let y = 0; y <= 50; y++) {
    const sy = ft + fh - (y / 50) * fh;
    fx.fillStyle = COL.fieldLine; fx.globalAlpha = 0.25;
    const h1x = fl + fw * 0.33, h2x = fl + fw * 0.67;
    fx.fillRect(h1x - 3, Math.round(sy), 6, 1);
    fx.fillRect(h2x - 3, Math.round(sy), 6, 1);
    fx.globalAlpha = 1;
  }

  // Yard number markers
  for (let y = 10; y <= 40; y += 10) {
    const sy = ft + fh - (y / 50) * fh;
    fx.fillStyle = 'rgba(232,220,200,0.35)';
    fx.font = 'bold 12px "Courier New", monospace'; fx.textAlign = 'right';
    fx.fillText(String(y), fl - 4, sy + 5);
    fx.textAlign = 'left';
    fx.fillText(String(y), fl + fw + 4, sy + 5);
  }

  // Center field pixel art logo
  const cfx = fl + fw / 2, cfy = ft + fh / 2;
  fx.save(); fx.globalAlpha = 0.08; fx.fillStyle = COL.fieldLine;
  fx.font = 'bold 20px "Courier New"'; fx.textAlign = 'center';
  fx.fillText('QB', cfx, cfy + 7); fx.restore();

  // Field border
  fx.strokeStyle = COL.fieldLine; fx.lineWidth = 2; fx.globalAlpha = 0.5;
  fx.strokeRect(fl, ft, fw, fh); fx.globalAlpha = 1;

  // Sideline details - pixel art bench and water cooler
  fx.fillStyle = '#6a5430'; fx.fillRect(fl - 22, ft + fh * 0.3, 16, 4); // bench
  fx.fillStyle = '#4878b8'; fx.fillRect(fl - 18, ft + fh * 0.3 - 6, 4, 6); // water cooler
  fx.fillStyle = '#6a5430'; fx.fillRect(fl + fw + 6, ft + fh * 0.6, 16, 4); // bench
  fx.fillStyle = '#c04040'; fx.fillRect(fl + fw + 10, ft + fh * 0.6 - 6, 4, 6); // gatorade

  fieldTexture = c;
}

// ============================================================
// PLAY GENERATION & EVALUATION
// ============================================================
let currentPlay = null, consecutiveCatches = 0;

function generatePlay(isElite, isBoss) {
  const losY = getLOSYard();
  const offIdx = Math.floor(Math.random() * offenseFormations.length);
  const offense = offenseFormations[offIdx].getPositions(losY);
  offense.name = offenseFormations[offIdx].name; offense.idx = offIdx;
  if (hasRelic('route_tree') || game.playBookExpanded) {
    const ar = game.playBookExpanded ? ['corner', 'wheel', 'hitch', 'dig', 'seam'] : ['corner', 'wheel', 'hitch'];
    for (let i = 0; i < 4; i++) if (Math.random() < 0.3) offense.wrs[i].route = ar[Math.floor(Math.random() * ar.length)];
  }
  const defForm = selectDefFormationByTeam();
  const defIdx = defenseFormations.indexOf(defForm);
  const defense = defForm.getPositions(losY);
  defense.name = defForm.name; defense.desc = defForm.desc || '';
  defense.idx = defIdx; defense.coverType = defForm.coverType;

  // Goal-line defense: when offense is within 10 yards of end zone (ballYardLine >= 40),
  // all DBs stand ON the goal line (yard 50)
  if (game.ballYardLine >= 40) {
    const goalLine = 50;
    for (const db of defense.dbs) {
      db.yard = goalLine; // DBs stand on goal line
      db.lane = db.lane * 0.8 + 30 * 0.2; // Compress toward center
    }
    // Rusher stays at LOS+7
    defense.rusher.yard = Math.min(goalLine, defense.rusher.yard);
  }
  // RULE: DBs must NEVER be at or behind the LOS. Always on defensive side.
  for (const db of defense.dbs) {
    if (db.yard <= losY) db.yard = losY + 0.5; // minimum: just past LOS (for goal-line defense)
  }

  // Double agent relic: 30% chance defense misaligns
  if (hasRelic('double_agent') && Math.random() < 0.3) {
    defense.dbs.forEach(db => { db.lane += (Math.random() - 0.5) * 15; });
  }

  // V17: Defense assignment overhaul (5A)
  if (defense.coverType === 'man' || defense.coverType === 'blitz') {
    // Man coverage: each DB assigned to nearest WR by lane distance
    const manDBs = defense.dbs.filter(db => db.role === 'man');
    const assigned = new Set();
    if (defense.coverType === 'blitz' && manDBs.length < 4) {
      // Blitz: one DB rushes, remaining 3 cover 4 WRs => one WR is open
      manDBs.forEach((db, i) => {
        let bestWRIdx = -1, bestDist = Infinity;
        for (let wi = 0; wi < 4; wi++) {
          if (assigned.has(wi)) continue;
          const dist = Math.abs(db.lane - offense.wrs[wi].lane);
          if (dist < bestDist) { bestDist = dist; bestWRIdx = wi; }
        }
        if (bestWRIdx >= 0) {
          db.coverIdx = bestWRIdx; assigned.add(bestWRIdx);
          db.lane = offense.wrs[bestWRIdx].lane; db.yard = offense.wrs[bestWRIdx].yard + 4;
        }
      });
    } else {
      // Man: each DB covers nearest WR by lane
      manDBs.forEach((db, i) => {
        let bestWRIdx = -1, bestDist = Infinity;
        for (let wi = 0; wi < 4; wi++) {
          if (assigned.has(wi)) continue;
          const dist = Math.abs(db.lane - offense.wrs[wi].lane);
          if (dist < bestDist) { bestDist = dist; bestWRIdx = wi; }
        }
        if (bestWRIdx >= 0) {
          db.coverIdx = bestWRIdx; assigned.add(bestWRIdx);
          db.lane = offense.wrs[bestWRIdx].lane; db.yard = offense.wrs[bestWRIdx].yard + 4;
        }
      });
    }
  }

  const weather = Weather.getWeatherForGame(game.gameNum);
  game.weatherType = weather === 'day' ? 'normal' : weather;

  const motionWR = Math.floor(Math.random() * 4);
  const rushSideRoll = Math.random();
  const rusherSide = rushSideRoll < 0.4 ? 'left' : rushSideRoll < 0.8 ? 'right' : 'center';

  // Trust-based wrong routes
  for (let i = 0; i < 4; i++) {
    const trust = getTrustStatus(i);
    if (trust.wrongRouteChance > 0 && Math.random() < trust.wrongRouteChance) {
      const wrongRoutes = ['flat', 'curl', 'drag', 'streak'];
      offense.wrs[i].route = wrongRoutes[Math.floor(Math.random() * wrongRoutes.length)];
    }
  }

  const wrScores = evaluateReceivers(offense, defense, isElite, isBoss);
  const bestWR = wrScores.indexOf(Math.max(...wrScores));

  // Team-specific rush speed modifier
  const team = getCurrentTeam();
  let rushFast = defense.rusher.fast;
  if (team.rushSpeedMod && team.rushSpeedMod > 1.3) rushFast = true;
  if (team.doubleRush) rushFast = true;

  currentPlay = { offense, defense, bestWR, wrScores, isElite, isBoss, motionWR,
    motionUsed: false, motionResult: null,
    coverageIsMan: defense.coverType === 'man' || defense.coverType === 'blitz',
    rusherSide, rushFast,
  };
  game.motionUsed = false; game.motionResult = null; game.motionWRIndex = motionWR;
  if (game.downs.current >= 3) addStress(10);
  if (game.gameNum > 5) addStress(Math.min(5, game.gameNum - 5));
  if (game.downs.current === 4) Commentary.generate('fourth_down');
  return currentPlay;
}

function evaluateReceivers(offense, defense, isElite, isBoss) {
  const team = getCurrentTeam();
  const scores = [], bonus = defenseBonus + (isElite ? 12 : 0) + (isBoss ? 20 : 0) + (team.allStatBonus || 0);
  for (let i = 0; i < 4; i++) {
    const wr = offense.wrs[i], stat = wrs[i], routeEnd = getRouteEndpoint(wr);
    let openness = stat.spd * 0.3 + stat.rte * 0.4 + stat.cat * 0.3;
    const syns = checkSynergies(i);
    for (const s of syns) if (s.bonus.openness) openness += s.bonus.openness;
    if (hasRelic('sticky_gloves')) openness += 4;
    if (hasRelic('speed_shoes')) openness += 4;
    if (hasRelic('ghost_boots')) openness += stat.rte * 0.2;

    let closestDist = Infinity;
    for (const db of defense.dbs) {
      if (db.role === 'man' && db.coverIdx === i) closestDist = Math.min(closestDist, 15);
      else if (db.role === 'man') continue;
      else {
        const dt2 = getZonePosition(db, routeEnd);
        const dy = routeEnd.yard - dt2.yard, dl = routeEnd.lane - dt2.lane;
        closestDist = Math.min(closestDist, Math.sqrt(dy * dy + dl * dl));
      }
    }
    if (closestDist < 8) openness -= (12 - closestDist) * 4;
    else if (closestDist > 15) openness += (closestDist - 15) * 1.5;
    openness -= bonus * 0.5;

    const hasDeep = defense.dbs.some(db => db.role === 'deep');
    const hasFlat = defense.dbs.some(db => db.role === 'flat');
    // V15: Rebalanced — streaks nerfed, short routes buffed for 5v5 flag football realism
    // In real flag football, slants/curls/drags are the bread-and-butter, not streaks
    if (wr.route === 'streak' && !hasDeep) openness += 15; // was 25 — streaks are high-risk in real flag
    if (wr.route === 'slant' && !hasFlat) openness += 18; // was 15 — slants are the #1 flag football route
    if (wr.route === 'flat' && !hasFlat) openness += 20;
    if (wr.route === 'drag' && !hasFlat) openness += 22; // was 18 — drags in space = big YAC in flag
    if (wr.route === 'out' && hasDeep && !hasFlat) openness += 16; // was 15
    if (wr.route === 'post' && !hasDeep) openness += 22;
    if (wr.route === 'curl' && hasDeep) openness += 14; // was 10 — curls are safe, reliable
    if (wr.route === 'corner' && !hasDeep) openness += 18; // was 20
    if (wr.route === 'wheel' && !hasDeep) openness += 16; // was 18
    if (wr.route === 'hitch') openness += 14; // was 12 — hitches are quick and reliable
    if (wr.route === 'dig') openness += 16; // was 14
    if (wr.route === 'seam' && !hasDeep) openness += 18; // was 20

    // Team-specific modifiers
    if (team.deepCovMod && isDeepRoute(wr.route)) openness *= team.deepCovMod;
    if (team.shortCovMod && isShortRoute(wr.route)) openness *= (2 - team.shortCovMod);
    if (team.deepPenalty && isDeepRoute(wr.route)) openness += team.deepPenalty;
    if (team.shortBonus && isShortRoute(wr.route)) openness += team.shortBonus;
    if (team.wr1CovMod && i === 0) openness += team.wr1CovMod;
    if (team.wr2CovMod && i === 1) openness += team.wr2CovMod;
    if (team.wr34Bonus && (i === 2 || i === 3)) openness += team.wr34Bonus;

    // Viper counter: double-team after 3 picks
    if (team.counterAfterPicks && game.teamWrPicks[i] >= team.counterAfterPicks) openness -= 30;

    // Adaptive tracker
    if (team.tendencyRead && game.adaptiveTracker.wrPicks[i] > 2) openness -= game.adaptiveTracker.wrPicks[i] * 3;

    if (game.filmStudyFloorsLeft > 0) openness += 8;
    if (hasRelic('storm_horn')) openness += 5; // defender mistakes

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
// V18: Physics-based movement — acceleration, max speed, turn penalty
function physicsMove(entity, targetYard, targetLane, dt) {
  // entity must have: yard, lane, vy, vl, maxSpeed, accel
  const dy = targetYard - entity.yard;
  const dl = targetLane - entity.lane;
  const distToTarget = Math.sqrt(dy * dy + dl * dl);

  if (distToTarget < 0.1) {
    entity.vy *= 0.5; entity.vl *= 0.5; // decelerate when arrived
    entity.yard += entity.vy * dt;
    entity.lane += entity.vl * dt;
    entity.lane = Math.max(2, Math.min(58, entity.lane));
    return;
  }

  // Direction to target (normalized)
  const dirY = dy / distToTarget;
  const dirL = dl / distToTarget;

  // Current speed and direction
  const currentSpeed = Math.sqrt(entity.vy * entity.vy + entity.vl * entity.vl);

  // Check if we need to change direction significantly
  let turnPenalty = 1.0;
  if (currentSpeed > 1.0) {
    const currentDirY = entity.vy / currentSpeed;
    const currentDirL = entity.vl / currentSpeed;
    const dot = currentDirY * dirY + currentDirL * dirL;
    if (dot < 0.7) turnPenalty = PHYSICS.TURN_PENALTY; // sharp turn = speed loss
    if (dot < 0) { entity.vy *= 0.3; entity.vl *= 0.3; } // reversing = hard brake
  }

  // Accelerate toward target
  entity.vy += dirY * entity.accel * dt;
  entity.vl += dirL * entity.accel * dt;

  // Clamp to max speed (with turn penalty)
  const effectiveMax = entity.maxSpeed * turnPenalty;
  const newSpeed = Math.sqrt(entity.vy * entity.vy + entity.vl * entity.vl);
  if (newSpeed > effectiveMax) {
    const scale = effectiveMax / newSpeed;
    entity.vy *= scale;
    entity.vl *= scale;
  }

  // Apply velocity
  entity.yard += entity.vy * dt;
  entity.lane += entity.vl * dt;

  // Clamp in bounds
  entity.lane = Math.max(2, Math.min(58, entity.lane));
}

// V18: Physics-based catch probability — ACTUAL positions are the dominant factor
function calculateCatchProb(wrIdx, passType) {
  if (!sim) return 50;
  const wrPos = sim.wrEntities[wrIdx];
  const pt = passType || game.passType;
  const route = currentPlay.offense.wrs[wrIdx].route;
  const wr = wrs[wrIdx];

  // Chain lightning: 3 consecutive = auto complete
  if (hasRelic('chain_lightning') && consecutiveCatches >= 3) return 99;

  // Base catch probability from WR catch stat
  let prob = 40 + wr.cat * 0.4; // base 62-68% for cat 55-70

  // DISTANCE IS KING — find closest DB using actual physics positions
  // Lane units scaled to yards (60 lanes ≈ 25 yards)
  const LANE_TO_YARD_CP = 0.42;
  let closestDB = 999;
  for (let i = 0; i < 4; i++) {
    const db = sim.dbEntities[i];
    const dy = db.yard - wrPos.yard;
    const dl = (db.lane - wrPos.lane) * LANE_TO_YARD_CP;
    const dist = Math.sqrt(dy * dy + dl * dl);
    if (dist < closestDB) closestDB = dist;
  }

  if (closestDB > 10) prob += 30;       // wide open — near-automatic
  else if (closestDB > 7) prob += 20;   // very open
  else if (closestDB > 5) prob += 12;   // good separation
  else if (closestDB > 3) prob += 5;    // slight advantage
  else if (closestDB > 1.5) prob -= 5;  // contested
  else prob -= 20;                       // blanketed — very hard catch

  // QB accuracy
  prob += (qb.accuracy - 70) * 0.3;

  // Pass type modifiers
  if (pt === 'bullet') {
    prob += 3; // quick delivery
    if (isDeepRoute(route)) prob -= 22; // can't rifle a bullet 20 yards accurately
    if (currentPlay.coverageIsMan) prob -= 5;
  } else if (pt === 'lob') {
    prob -= 5; // more time for DB to arrive
    if (isDeepRoute(route)) prob += 10;
    if (isShortRoute(route)) prob -= 7;
  }

  // Relics
  if (hasRelic('golden_armguard')) prob += 15;
  if (hasRelic('hot_hand') && consecutiveCatches > 0) prob += Math.min(consecutiveCatches * 5, 20);
  if (hasRelic('iron_will') && game.downs.current === 4) prob += 20;
  if (game.downs.current === 4) prob += 5;
  if (hasRelic('gambler_coin')) { prob += Math.random() < 0.5 ? 30 : -20; }
  if (hasRelic('football_heart') && game.gameScore.opponent - game.gameScore.player >= 14) prob += 25;

  // Deep route arm/weather
  const throwDist = Math.abs(getRouteEndpoint(currentPlay.offense.wrs[wrIdx]).yard - getLOSYard());
  if (throwDist > 12) { prob += (qb.arm - 60) * 0.3; if (hasRelic('golden_arm')) prob += 15; }

  // Composure and trust
  prob += getComposureAccuracyMod();
  if (getComposureLevel() === 'tilted' && Math.random() < 0.1) prob -= 30;
  const isClutchDown = game.downs.current >= 3;
  prob += getTrustCatchMod(wrIdx, isClutchDown);

  // Motion system
  if (game.motionUsed && game.motionResult) {
    if (game.motionResult === 'man' && wrIdx !== game.motionWRIndex) prob += 8;
    else if (game.motionResult === 'zone' && wrIdx === game.motionWRIndex) prob += 12;
    else if (game.motionResult === 'man' && wrIdx === game.motionWRIndex) prob -= 8;
  }

  // Synergies
  const syns = checkSynergies(wrIdx);
  for (const s of syns) if (s.bonus.catchBonus) prob += s.bonus.catchBonus;

  // Weather and scramble
  prob -= Weather.getCatchDebuff();
  if (game.scrambleResult === 'dodged') prob -= 15;
  if (game.scrambleResult === 'stand_tall') prob -= 25;

  return Math.max(5, Math.min(95, prob));
}

// V18: Physics-based INT chance — uses actual DB proximity
function calculateINTChance(wrIdx, passType) {
  if (!sim) return 3;
  const wrPos = sim.wrEntities[wrIdx];
  const pt = passType || game.passType;

  const LANE_TO_YARD_IC = 0.42;
  let closestDB = 999;
  for (let i = 0; i < 4; i++) {
    const db = sim.dbEntities[i];
    const dy = db.yard - wrPos.yard;
    const dl = (db.lane - wrPos.lane) * LANE_TO_YARD_IC;
    const dist = Math.sqrt(dy * dy + dl * dl);
    if (dist < closestDB) closestDB = dist;
  }

  let chance = 3; // base 3%
  if (closestDB < 1.5) chance = 18;      // DB right on top = high INT chance
  else if (closestDB < 3) chance = 10;   // contested
  else if (closestDB < 5) chance = 5;
  else chance = 2;                        // open = very unlikely INT

  if (pt === 'lob') chance += 5;    // lob gives DB time to read
  if (pt === 'bullet') chance -= 2; // quick delivery limits INT windows

  // Keep gameplay modifiers
  if (pt === 'bullet' && currentPlay.coverageIsMan) chance += 3;
  if (game.scrambleResult === 'dodged') chance += 4;
  if (game.scrambleResult === 'stand_tall') chance += 2;
  if (getComposureLevel() === 'tilted') chance += 5;
  if (getComposureLevel() === 'shaky') chance += 2;

  // Team INT bonus
  const team = getCurrentTeam();
  if (team.deepIntMod && isDeepRoute(currentPlay.offense.wrs[wrIdx].route)) chance *= team.deepIntMod;

  return Math.max(1, Math.min(30, chance));
}

// ============================================================
// SIMULATION
// ============================================================
let sim = null;
function startSimulation(chosenWR) {
  const play = currentPlay;
  game.adaptiveTracker.wrPicks[chosenWR]++;
  game.teamWrPicks[chosenWR]++;
  const route = play.offense.wrs[chosenWR].route;
  game.adaptiveTracker.routePicks[route] = (game.adaptiveTracker.routePicks[route] || 0) + 1;

  const team = getCurrentTeam();
  const rushSpeed = play.rushFast ? 0.06 : 0.035;
  const rushFactor = hasRelic('quick_release') ? 0.8 : 1;
  // V15.1: Reduced sack rate from 35% to 20%, ARM stat reduces further
  const armMod = Math.max(0.6, 1 - (game.qbStats?.arm || 0) * 0.03); // ARM 10 = 0.7x
  let willSack = play.rushFast && Math.random() < (0.20 * rushFactor * armMod);
  if (team.rushChargeUp) willSack = false; // Giant Front: sack only if play takes >3s

  // V18: Physics entities for all players
  const wrEntities = play.offense.wrs.map((w, i) => ({
    yard: w.yard, lane: w.lane,
    vy: 0, vl: 0,
    maxSpeed: PHYSICS.WR_MAX_SPEED * (0.92 + wrs[i].spd * 0.0013), // spd stat affects max speed
    accel: PHYSICS.WR_ACCEL,
  }));
  const dbEntities = play.defense.dbs.map(db => ({
    yard: db.yard, lane: db.lane,
    vy: 0, vl: 0,
    maxSpeed: PHYSICS.DB_MAX_SPEED,
    accel: PHYSICS.DB_ACCEL,
    role: db.role,
    coverIdx: db.coverIdx !== undefined ? db.coverIdx : -1,
    reactionTimer: db.role === 'man' ? 0.05 : PHYSICS.DB_REACTION_DELAY,
    hasReacted: false,
    zoneAnchorYard: db.role === 'deep' ? getLOSYard() + 12 : db.role === 'flat' ? getLOSYard() + 5 : db.role === 'free' ? getLOSYard() + 15 : db.yard,
    zoneAnchorLane: db.role === 'free' ? 30 : db.lane,
  }));
  const rushEntity = {
    yard: play.defense.rusher.yard, lane: play.defense.rusher.lane,
    vy: 0, vl: 0,
    maxSpeed: play.rushFast ? 7.0 : 5.5,
    accel: 4.0,
  };
  const qbEntity = {
    yard: play.offense.qb.yard, lane: play.offense.qb.lane,
    vy: 0, vl: 0, maxSpeed: 5.0, accel: 3.5,
  };

  sim = {
    phase: 'snap', timer: 0, chosenWR, success: false, catchProb: 0, yardsGained: 0,
    routeYards: 0, yacYards: 0, outcomeDecided: false,
    // V18: Physics entities (primary source of truth)
    wrEntities, dbEntities,
    rushEntity, qbEntity,
    // wrPos/dbPos/rushPos/qbPos are aliases for backwards compatibility with drawing code
    wrPos: wrEntities,
    dbPos: dbEntities,
    rushPos: rushEntity,
    qbPos: qbEntity,
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
    rusherSide: play.rusherSide || 'center',
    chargeUpTimer: 0, // for Giant Front
    // YAC phase fields
    yacTimer: 0, yacDuration: 0, yacStartYard: 0, yacStartLane: 0,
    yacTargetYard: 0, yacTargetLane: 0, yacChaserDB: 0,
  };
  game.state = 'passType'; game.passType = 'touch'; game.scrambleResult = null;
  game.readingPhase = false; Replay.reset();
  SFX.play('snap'); TimeScale.set(1, 0); Camera.setForPhase('reading');
}

// V18: No longer calculates success here — outcome determined at throw completion using actual positions
function beginSimAfterPassType() {
  if (!sim) return;
  // Just start the throw animation — success/failure calculated when ball arrives (throw phase end)
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
  if (sim.phase !== 'result' && sim.phase !== 'yac' && sim.phase !== 'scramble' && sim.phase !== 'tdCelebration' && sim.phase !== 'replay') {
    Replay.capture({ wrPos: sim.wrPos.map(p => ({ ...p })), dbPos: sim.dbPos.map(p => ({ ...p })),
      rushPos: { ...sim.rushPos }, qbPos: { ...sim.qbPos },
      ballPos: sim.ballPos ? { ...sim.ballPos } : null, phase: sim.phase });
  }

  switch (sim.phase) {
    case 'snap':
      sim.snapProgress = Math.min(1, sim.timer / 0.25); sim.qbAction = 'idle';
      if (sim.snapProgress >= 1) { sim.phase = 'dropback'; sim.timer = 0; } break;
    case 'dropback':
      sim.qbPos.yard += (sim.qbStartYard - 3 - sim.qbPos.yard) * 0.08; sim.qbAction = 'run';
      if (sim.timer > 0.4) { sim.phase = 'routes'; sim.timer = 0; sim.wrActions = ['run','run','run','run']; sim.defActions = ['run','run','run','run']; } break;
    case 'routes': {
      sim.routeProgress = Math.min(1, sim.timer / 1.2); sim.qbAction = 'idle';
      Camera.setForPhase('choosing');
      // V18: WRs use physicsMove toward their route path target
      for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i], path = routePaths[wr.route](wr.yard, wr.lane);
        const total = path.length, seg = sim.routeProgress * total;
        const idx = Math.min(Math.floor(seg), total - 1), t2 = seg - idx;
        const fy = idx === 0 ? wr.yard : path[idx - 1].yard;
        const fl2 = idx === 0 ? wr.lane : path[idx - 1].lane;
        const targetYard = fy + (path[idx].yard - fy) * t2;
        const targetLane = fl2 + (path[idx].lane - fl2) * t2;
        physicsMove(sim.wrEntities[i], targetYard, targetLane, sd);
      }
      // V18.1: Physics-based DB movement — man reacts with delay, zone drops then reads
      for (let i = 0; i < 4; i++) {
        const db = sim.dbEntities[i];
        if (db.reactionTimer > 0) {
          db.reactionTimer -= sd;
        } else if (db.role === 'man' && db.coverIdx >= 0) {
          // Man: physicsMove toward assigned WR, trailing slightly
          const tgt = sim.wrEntities[db.coverIdx];
          physicsMove(db, tgt.yard - 1.5, tgt.lane, sd);
        } else {
          // Zone: drop to zone anchor first, then read and react
          const inZone = Math.abs(db.yard - db.zoneAnchorYard) < 2 && Math.abs(db.lane - db.zoneAnchorLane) < 5;
          if (!inZone) {
            // Still dropping to zone position
            physicsMove(db, db.zoneAnchorYard, db.zoneAnchorLane, sd);
          } else {
            // In zone — look for WRs entering this zone
            let nearestWRInZone = -1, nearestDist = 999;
            for (let wi = 0; wi < 4; wi++) {
              const wrDist = Math.sqrt(
                Math.pow(sim.wrEntities[wi].yard - db.yard, 2) +
                Math.pow(sim.wrEntities[wi].lane - db.lane, 2)
              );
              if (wrDist < 8 && wrDist < nearestDist) {
                nearestDist = wrDist; nearestWRInZone = wi;
              }
            }
            if (nearestWRInZone >= 0) {
              // WR in zone — trail them by 1 yard
              const tgt = sim.wrEntities[nearestWRInZone];
              physicsMove(db, tgt.yard - 1, tgt.lane, sd);
            } else {
              // No WR in zone — help toward nearest uncovered WR
              let helpWR = -1, helpDist = 999;
              for (let wi = 0; wi < 4; wi++) {
                const hasCoverage = sim.dbEntities.some((odb, odi) =>
                  odi !== i && odb.role === 'man' && odb.coverIdx === wi
                );
                if (!hasCoverage) {
                  const d = Math.sqrt(Math.pow(sim.wrEntities[wi].yard - db.yard, 2) + Math.pow(sim.wrEntities[wi].lane - db.lane, 2));
                  if (d < helpDist) { helpDist = d; helpWR = wi; }
                }
              }
              if (helpWR >= 0 && helpDist < 15) {
                physicsMove(db, sim.wrEntities[helpWR].yard, sim.wrEntities[helpWR].lane, sd);
              } else {
                // Hold zone position
                physicsMove(db, db.zoneAnchorYard, db.zoneAnchorLane, sd);
              }
            }
          }
        }
      }
      const rs = currentPlay.rushFast ? 0.05 : 0.03;
      const sr = hasRelic('quick_release') ? 0.8 : 1;
      let rushTargetLane = sim.qbPos.lane;
      if (sim.rusherSide === 'left') rushTargetLane -= 5;
      else if (sim.rusherSide === 'right') rushTargetLane += 5;
      sim.rushPos.yard += (sim.qbPos.yard - sim.rushPos.yard) * rs * sr;
      sim.rushPos.lane += (rushTargetLane - sim.rushPos.lane) * rs * sr;

      // Giant Front charge-up
      const teamR = getCurrentTeam();
      if (teamR.rushChargeUp) {
        sim.chargeUpTimer += sd;
        if (sim.chargeUpTimer >= teamR.chargeUpTime && !sim.scrambleTriggered) {
          sim.willSack = true;
          Commentary.teamComment(teamR, 'sack');
        }
      }

      if (sim.willSack && sim.routeProgress >= 0.5 && !sim.scrambleTriggered) {
        sim.scrambleTriggered = true; sim.phase = 'scramble'; sim.timer = 0; sim.scrambleTimer = 1.8;
        Camera.setForPhase('scramble'); SFX.play('sack_impact');
        break;
      }
      if (sim.routeProgress >= 0.7) {
        sim.phase = 'throw'; sim.timer = 0;
        sim.ballPos = { yard: sim.qbPos.yard, lane: sim.qbPos.lane };
        // V18.6: Lead the receiver — throw to where WR WILL BE when ball arrives
        // Use route endpoint direction, not instantaneous velocity (handles turns correctly)
        const wrE = sim.wrEntities[sim.chosenWR];
        const wrRoute = currentPlay.offense.wrs[sim.chosenWR].route;
        const routeEnd = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]);
        
        // WR's intended run direction (toward route endpoint)
        const toEndY = routeEnd.yard - wrE.yard;
        const toEndL = routeEnd.lane - wrE.lane;
        const toEndDist = Math.sqrt(toEndY * toEndY + toEndL * toEndL);
        
        // Is WR still running or has stopped (static routes like curl/hitch)?
        const isStaticRoute = (wrRoute === 'curl' || wrRoute === 'hitch') && toEndDist < 2;
        
        if (isStaticRoute || toEndDist < 0.5) {
          // Static/settled WR — throw right to them
          sim.ballTarget = { yard: wrE.yard, lane: wrE.lane };
        } else {
          // Moving WR — calculate where they'll be when ball arrives
          // Step 1: WR run direction (normalized)
          const runDirY = toEndY / toEndDist;
          const runDirL = toEndL / toEndDist;
          const wrSpeed = Math.min(wrE.maxSpeed, Math.sqrt(wrE.vy * wrE.vy + wrE.vl * wrE.vl) + wrE.accel * 0.3);
          
          // Step 2: Estimate ball flight time (iterative — ball target affects distance)
          // Initial guess: throw to point ahead of WR
          const ballSpeed = game.passType === 'bullet' ? PHYSICS.BALL_SPEED_BULLET
            : game.passType === 'lob' ? PHYSICS.BALL_SPEED_LOB : PHYSICS.BALL_SPEED_TOUCH;
          
          // Iterate twice for better convergence
          let leadYard = wrE.yard, leadLane = wrE.lane;
          for (let iter = 0; iter < 2; iter++) {
            const bdy = leadYard - sim.qbPos.yard;
            const bdl = leadLane - sim.qbPos.lane;
            const ballDist = Math.sqrt(bdy * bdy + bdl * bdl);
            const flightTime = ballDist / ballSpeed;
            // Where WR will be after flightTime seconds of running
            const wrRunDist = wrSpeed * flightTime;
            const actualRun = Math.min(wrRunDist, toEndDist); // don't run past route end
            leadYard = wrE.yard + runDirY * actualRun;
            leadLane = wrE.lane + runDirL * actualRun;
          }
          
          sim.ballTarget = {
            yard: leadYard,
            lane: Math.max(2, Math.min(58, leadLane)),
          };
        }
        sim.qbAction = 'throw'; sim.wrActions[sim.chosenWR] = 'catch';
        sim.throwPowerTimer = 0.3; TimeScale.set(0.65, 0.5); Camera.setForPhase('throw');
        // Reset zone DB reaction timers so they react fresh to the throw
        for (let i = 0; i < 4; i++) {
          if (sim.dbEntities[i].role !== 'man') {
            sim.dbEntities[i].reactionTimer = PHYSICS.DB_REACTION_DELAY;
            sim.dbEntities[i].hasReacted = false;
          }
        }
      }
      break;
    }
    case 'scramble':
      sim.scrambleTimer -= sd;
      sim.rushPos.yard += (sim.qbPos.yard - sim.rushPos.yard) * 0.12;
      sim.rushPos.lane += (sim.qbPos.lane - sim.rushPos.lane) * 0.08;
      if (sim.scrambleChoice !== null && sim.scrambleChoice !== 'done') {
        if (sim.scrambleChoice === 'stand_tall') {
          game.scrambleResult = 'stand_tall'; SFX.play('scramble_dodge');
          Commentary.generate('scramble_stand');
          sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
          sim.success = Math.random() * 100 < sim.catchProb;
          if (!sim.success) { const ic = calculateINTChance(sim.chosenWR, game.passType); sim.isINT = Math.random() * 100 < ic; }
          if (sim.success) { const re = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]); sim.yardsGained = Math.max(1, Math.abs(re.yard - getLOSYard()) + Math.floor(Math.random() * 8)); sim.yacYards = 0; sim.yacType = "scramble"; }
          sim.phase = 'routes'; sim.timer = 0.84; sim.routeProgress = 0.7; sim.scrambleChoice = 'done';
        } else if (sim.scrambleChoice === 'left' || sim.scrambleChoice === 'right') {
          let dodgeSuccess = false;
          const side = sim.rusherSide;
          if (side === 'center') dodgeSuccess = Math.random() < 0.6;
          else if ((side === 'left' && sim.scrambleChoice === 'right') || (side === 'right' && sim.scrambleChoice === 'left')) dodgeSuccess = Math.random() < 0.8;
          else dodgeSuccess = Math.random() < 0.3;
          if (hasRelic('scramble')) dodgeSuccess = dodgeSuccess || Math.random() < 0.3;
          if (dodgeSuccess) {
            game.scrambleResult = 'dodged';
            sim.qbPos.lane += sim.scrambleChoice === 'left' ? -8 : 8; sim.qbPos.yard += 2;
            SFX.play('scramble_dodge'); Commentary.generate('scramble_success');
            sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
            sim.success = Math.random() * 100 < sim.catchProb;
            if (!sim.success) { const ic = calculateINTChance(sim.chosenWR, game.passType); sim.isINT = Math.random() * 100 < ic; }
            if (sim.success) { const re = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]); sim.yardsGained = Math.max(1, Math.abs(re.yard - getLOSYard()) + Math.floor(Math.random() * 8)); sim.yacYards = 0; sim.yacType = "scramble"; }
            sim.phase = 'routes'; sim.timer = 0.84; sim.routeProgress = 0.7; sim.scrambleChoice = 'done';
          } else {
            sim.isSack = true; sim.sackYards = 7; sim.phase = 'sackResult'; sim.timer = 0;
            SFX.play('sack_impact'); Commentary.generate('scramble_fail'); triggerShake(15);
            sim.scrambleChoice = 'done';
          }
        }
      } else if (sim.scrambleTimer <= 0 && sim.scrambleChoice === null) {
        sim.isSack = true; sim.sackYards = 5; sim.phase = 'sackResult'; sim.timer = 0;
        SFX.play('sack_impact'); Commentary.generate('sack'); triggerShake(12);
      }
      break;
    case 'sackResult':
      sim.resultTimer = Math.min(1, sim.timer / 0.5);
      if (sim.timer > 3.0) handlePlayResult(); break;
    case 'throw': {
      // V18.4: Ball flight is physics-based — duration = distance / ball_speed
      if (!sim.throwDuration) {
        const ballSpeed = game.passType === 'bullet' ? PHYSICS.BALL_SPEED_BULLET
          : game.passType === 'lob' ? PHYSICS.BALL_SPEED_LOB : PHYSICS.BALL_SPEED_TOUCH;
        const dx = sim.ballTarget.yard - sim.qbPos.yard;
        const dl = sim.ballTarget.lane - sim.qbPos.lane;
        const dist = Math.sqrt(dx * dx + dl * dl);
        sim.throwDuration = Math.max(0.25, dist / ballSpeed); // seconds for ball to arrive
      }
      sim.throwProgress = Math.min(1, sim.timer / sim.throwDuration);
      sim.throwPowerTimer -= sd;

      // All players continue moving during throw
      for (let i = 0; i < 4; i++) {
        if (i === sim.chosenWR) {
          // Thrown-to WR runs toward the ball landing point
          physicsMove(sim.wrEntities[i], sim.ballTarget.yard, sim.ballTarget.lane, sd);
        } else {
          const path = routePaths[currentPlay.offense.wrs[i].route](currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane);
          const end = path[path.length - 1];
          physicsMove(sim.wrEntities[i], end.yard, end.lane, sd);
        }
      }
      // DBs react to ball with physics
      for (let i = 0; i < 4; i++) {
        const db = sim.dbEntities[i];
        if (!db.hasReacted && (db.role !== 'man' || db.coverIdx !== sim.chosenWR)) {
          db.reactionTimer -= sd;
          if (db.reactionTimer <= 0) db.hasReacted = true;
          physicsMove(db, db.yard + 0.5, db.lane, sd);
        } else {
          physicsMove(db, sim.ballTarget.yard, sim.ballTarget.lane, sd);
        }
      }

      // V18.4: Ball trajectory — bullet=straight line, touch=slight arc, lob=high arc
      const t = sim.throwProgress;
      const startY = sim.qbPos.yard, startL = sim.qbPos.lane;
      const endY = sim.ballTarget.yard, endL = sim.ballTarget.lane;
      // Horizontal: linear interpolation
      sim.ballPos.yard = startY + (endY - startY) * t;
      sim.ballPos.lane = startL + (endL - startL) * t;
      // Vertical arc (visual only, stored as ballArc for drawing)
      // Lob has big arc, touch medium, bullet almost flat
      const arcHeight = game.passType === 'lob' ? 12 : game.passType === 'touch' ? 5 : 1;
      sim.ballArc = arcHeight * 4 * t * (1 - t); // parabola: peaks at t=0.5
      sim.ballTrail.push({ yard: sim.ballPos.yard, lane: sim.ballPos.lane, arc: sim.ballArc });
      if (sim.ballTrail.length > 8) sim.ballTrail.shift();

      if (sim.throwProgress > 0.6) TimeScale.set(0.6, 0.3);
      // V18.7: Camera follows ball during flight
      if (sim.ballPos) {
        const bscr = FIELD.toScreen(sim.ballPos.yard, sim.ballPos.lane);
        Camera.targetY = (H/2 - bscr.y) * 0.35;
        Camera.targetX = (W/2 - bscr.x) * 0.15;
      }
      if (sim.throwProgress >= 1) {
        // V18.7: Check if WR is actually near the ball landing point
        const wrAtCatch = sim.wrEntities[sim.chosenWR];
        const wrToBallY = wrAtCatch.yard - sim.ballTarget.yard;
        const wrToBallL = (wrAtCatch.lane - sim.ballTarget.lane) * 0.42;
        const wrToBallDist = Math.sqrt(wrToBallY * wrToBallY + wrToBallL * wrToBallL);
        
        // WR must be within catchable range (3 yards) of the ball landing point
        if (wrToBallDist > 3) {
          // WR too far from ball — overthrown or WR ran past it
          sim.success = false;
          sim.isINT = false;
          sim.catchProb = 0;
          sim.overthrown = true;
        } else {
          // WR is near ball — normal catch calculation
          // Penalty for not being right at the ball (reaching/diving)
          const reachPenalty = wrToBallDist > 1.5 ? -15 : wrToBallDist > 0.8 ? -5 : 0;
          sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType) + reachPenalty;
          sim.catchProb = Math.max(5, Math.min(95, sim.catchProb));
          sim.success = Math.random() * 100 < sim.catchProb;
          if (!sim.success) {
            const intChance = calculateINTChance(sim.chosenWR, game.passType);
            sim.isINT = Math.random() * 100 < intChance;
          }
        } // end else (WR near ball)
        // V18.4: Yards gained = WR's ACTUAL position at catch - LOS (physics-based)
        if (sim.success) {
          const wrCatchYard = sim.wrEntities[sim.chosenWR].yard;
          const losY = getLOSYard();
          const catchYards = Math.max(0, wrCatchYard - losY); // actual yards gained from catch point

          // YAC based on actual DB proximity at catch
          // V18.5: Distance in real yards — lane units scaled (60 lanes ≈ 25 yards, so 1 lane ≈ 0.42 yards)
          const LANE_TO_YARD = 0.42;
          let closestDBDist = 999;
          for (let i = 0; i < 4; i++) {
            const db = sim.dbEntities[i];
            const dyards = db.yard - wrCatchYard;
            const dlanes = (db.lane - sim.wrEntities[sim.chosenWR].lane) * LANE_TO_YARD;
            const dist = Math.sqrt(dyards * dyards + dlanes * dlanes);
            if (dist < closestDBDist) closestDBDist = dist;
          }
          const wrSpd = wrs[sim.chosenWR].spd;
          const spdBonus = Math.max(0, Math.floor((wrSpd - 65) / 10));
          let yacYards = 0;
          if (closestDBDist > 12) { yacYards = 8 + Math.floor(Math.random() * 8) + spdBonus; sim.yacType = 'wide_open'; }
          else if (closestDBDist > 6) { yacYards = 3 + Math.floor(Math.random() * 5) + spdBonus; sim.yacType = 'room_to_run'; }
          else if (closestDBDist > 3) { yacYards = 1 + Math.floor(Math.random() * 3); sim.yacType = 'flag_pull'; }
          else { yacYards = 0; sim.yacType = 'immediate_flag'; }
          if (hasRelic('ghost_boots')) yacYards = Math.floor(yacYards * 1.2);
          const maxYards = 50 - game.ballYardLine;
          sim.routeYards = Math.round(Math.min(catchYards, maxYards));
          sim.yacYards = Math.round(Math.min(yacYards, Math.max(0, maxYards - sim.routeYards)));
          sim.yardsGained = Math.round(Math.min(sim.routeYards + sim.yacYards, maxYards));
        }
        sim.phase = 'catch'; sim.timer = 0; TimeScale.set(0.5, 0.3);
        Camera.setForPhase('catch');
        const ws = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
        if (sim.success) { addParticle(ws.x, ws.y, 'catch_flash', 12); SFX.play('catch'); }
        else if (sim.isINT) { SFX.play('miss'); Commentary.generate('int'); Camera.setForPhase('incomplete'); }
        else if (sim.overthrown) { SFX.play('miss'); Commentary.show('传球偏离目标！', 2.5); Camera.setForPhase('incomplete'); }
        else { SFX.play('miss'); Commentary.generate('incomplete'); Camera.setForPhase('incomplete'); }
      }
      break;
    }
    case 'catch':
      sim.catchAnim = Math.min(1, sim.timer / 0.6);
      if (sim.success && sim.catchAnim > 0.5) sim.wrActions[sim.chosenWR] = 'celebrate';
      // V17.1: Recalculate YAC based on actual DB positions at catch point
      if (sim.success && !sim.yacRecalcDone) {
        sim.yacRecalcDone = true;
        let actualClosestDB = 999;
        for (let i = 0; i < 4; i++) {
          const dist = Math.sqrt(Math.pow(sim.dbPos[i].yard - sim.wrPos[sim.chosenWR].yard, 2) + Math.pow(sim.dbPos[i].lane - sim.wrPos[sim.chosenWR].lane, 2));
          if (dist < actualClosestDB) actualClosestDB = dist;
        }
        const wrSpd = wrs[sim.chosenWR].spd;
        const spdBonus = Math.max(0, Math.floor((wrSpd - 65) / 10));
        let newYac = 0;
        if (actualClosestDB > 12) { newYac = 8 + Math.floor(Math.random() * 8) + spdBonus; sim.yacType = "wide_open"; }
        else if (actualClosestDB > 6) { newYac = 3 + Math.floor(Math.random() * 5) + spdBonus; sim.yacType = "room_to_run"; }
        else if (actualClosestDB > 3) { newYac = 1 + Math.floor(Math.random() * 3); sim.yacType = "flag_pull"; }
        else { newYac = 0; sim.yacType = "immediate_flag"; }
        if (hasRelic("ghost_boots")) newYac = Math.floor(newYac * 1.2);
        const maxYards = 50 - game.ballYardLine;
        sim.yacYards = Math.min(newYac, Math.max(0, maxYards - sim.routeYards));
        sim.yardsGained = Math.min(sim.routeYards + sim.yacYards, maxYards);
      }
      if (sim.timer > 1.0) {
        if (sim.success && sim.yacYards > 0) {
          // V17: YAC phase — WR runs with ball after catch
          sim.phase = 'yac'; sim.timer = 0;
          sim.yacTimer = 0;
          sim.yacDuration = Math.max(0.3, sim.yacYards * 0.15);
          // Record catch position as yac start
          sim.yacStartYard = sim.wrPos[sim.chosenWR].yard;
          sim.yacStartLane = sim.wrPos[sim.chosenWR].lane;
          // Target: WR runs toward end zone by yacYards
          sim.yacTargetYard = Math.min(50, sim.yacStartYard + sim.yacYards);
          sim.yacTargetLane = sim.yacStartLane;
          sim.wrActions[sim.chosenWR] = 'run';
          // Find nearest DB to be the chaser
          let nearestDBIdx = 0, nearestDBDist = Infinity;
          for (let di = 0; di < 4; di++) {
            const dy = sim.dbPos[di].yard - sim.yacStartYard;
            const dl = sim.dbPos[di].lane - sim.yacStartLane;
            const dd = Math.sqrt(dy*dy + dl*dl);
            if (dd < nearestDBDist) { nearestDBDist = dd; nearestDBIdx = di; }
          }
          sim.yacChaserDB = nearestDBIdx;
          Camera.setForPhase('catch'); // keep zoom on player
        } else {
          // No YAC — go straight to result/TD
          const isTD = sim.success && (game.ballYardLine + sim.yardsGained >= 50);
          const isBigPlay = sim.success && sim.yardsGained >= 15;
          if (isTD) {
            sim.phase = 'tdCelebration'; sim.timer = 0; sim.tdCelebrating = true;
            SFX.play('td'); PostFX.triggerBloom(1.5); Camera.setForPhase('td');
            Commentary.generate('td'); addParticle(W / 2, 200, 'td_confetti', 50);
            for (let i = 0; i < 4; i++) sim.wrActions[i] = 'celebrate';
          } else if (isBigPlay) {
            sim.phase = 'replay'; sim.timer = 0;
            const ws = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
            Replay.startReplay({ x: ws.x, y: ws.y }, game.passType);
            PostFX.triggerBloom(1.0); game.highlightTimer = 3.0;
          } else {
            sim.phase = 'result'; sim.timer = 0; TimeScale.set(1, 0);
            Camera.targetX = 0; Camera.targetY = 0; Camera.targetZoom = 1.0;
          }
        }
      }
      break;
    case 'yac': {
      // V17: YAC animation — WR runs after catch, nearest DB chases
      sim.yacTimer += sd;
      const yacProg = Math.min(1, sim.yacTimer / sim.yacDuration);
      // Move WR forward
      const yacWRTargetYard = sim.yacStartYard + (sim.yacTargetYard - sim.yacStartYard) * yacProg;
      sim.wrPos[sim.chosenWR].yard += (yacWRTargetYard - sim.wrPos[sim.chosenWR].yard) * 0.12;
      sim.wrPos[sim.chosenWR].lane += (sim.yacTargetLane - sim.wrPos[sim.chosenWR].lane) * 0.08;
      sim.wrActions[sim.chosenWR] = 'run';
      // Ball tracks WR
      sim.ballPos = { yard: sim.wrPos[sim.chosenWR].yard, lane: sim.wrPos[sim.chosenWR].lane };
      // V18: DBs chase ball carrier using physics
      const chaserDB = sim.yacChaserDB;
      for (let di = 0; di < 4; di++) {
        physicsMove(sim.dbEntities[di], sim.wrPos[sim.chosenWR].yard, sim.wrPos[sim.chosenWR].lane, sd);
      }
      // Camera tracks the WR
      const wrScr = FIELD.toScreen(sim.wrPos[sim.chosenWR].yard, sim.wrPos[sim.chosenWR].lane);
      Camera.targetX = W/2 - wrScr.x; Camera.targetY = H/2 - wrScr.y; Camera.targetZoom = 1.2;

      // Check if YAC complete or DB caught up
      const chaserDist = Math.sqrt(
        Math.pow(sim.dbPos[chaserDB].yard - sim.wrPos[sim.chosenWR].yard, 2) +
        Math.pow(sim.dbPos[chaserDB].lane - sim.wrPos[sim.chosenWR].lane, 2)
      );
      const yacDone = yacProg >= 1 || chaserDist < 1.5;

      if (yacDone) {
        const isTD = game.ballYardLine + sim.yardsGained >= 50;
        if (isTD) {
          // TD: skip flag pull, go directly to tdCelebration
          sim.phase = 'tdCelebration'; sim.timer = 0; sim.tdCelebrating = true;
          SFX.play('td'); PostFX.triggerBloom(1.5); Camera.setForPhase('td');
          Commentary.generate('td'); addParticle(W / 2, 200, 'td_confetti', 50);
          for (let i = 0; i < 4; i++) sim.wrActions[i] = 'celebrate';
        } else {
          // Flag pull animation then result
          sim.wrActions[sim.chosenWR] = 'idle'; // stop
          const isBigPlay = sim.yardsGained >= 15;
          if (isBigPlay) {
            sim.phase = 'replay'; sim.timer = 0;
            const ws = FIELD.toScreen(sim.wrPos[sim.chosenWR].yard, sim.wrPos[sim.chosenWR].lane);
            Replay.startReplay({ x: ws.x, y: ws.y }, game.passType);
            PostFX.triggerBloom(1.0); game.highlightTimer = 3.0;
          } else {
            sim.phase = 'result'; sim.timer = 0; TimeScale.set(1, 0);
            Camera.targetX = 0; Camera.targetY = 0; Camera.targetZoom = 1.0;
          }
        }
      }
      break;
    }
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
  if (sim && !sim.isSack) updateTrust(sim.chosenWR, sim.success ? 'complete' : 'incomplete');

  if (sim.isSack) {
    game.seasonStats.sacks++;
    const sackLoss = sim.sackYards || 5;
    game.ballYardLine = Math.max(0, game.ballYardLine - sackLoss); // V17: allow yardline 0 for safety
    // V17: Safety rule — sacked in or past own end zone
    if (game.ballYardLine <= 0) {
      game.gameScore.opponent += 2;
      game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
      Commentary.show('安全分！防守方得2分', 3.5);
      let stressDmg = 20;
      if (hasRelic('iron_armor')) stressDmg *= 0.25;
      addStress(stressDmg);
      consecutiveCatches = 0; game.drivePlays++;
      if (game.gameClock <= 0) { endCurrentGame(game.gameScore.player > game.gameScore.opponent); sim = null; return; }
      if (game.state === 'simulation') game.state = 'playResult';
      sim = null; return;
    }
    let stressDmg = 20;
    if (hasRelic('iron_armor')) stressDmg *= 0.25;
    addStress(stressDmg);
    consecutiveCatches = 0; game.drivePlays++;
    game.downs.current++;
    if (game.downs.current > 4) { endCurrentGame(false); sim = null; return; }
  } else if (sim.isINT) {
    game.seasonStats.ints++; addStress(25); consecutiveCatches = 0; game.drivePlays++;
    // INT = opponent scores
    game.gameScore.opponent += 7;
    Commentary.teamComment(getCurrentTeam(), 'int');
    if (game.gameClock <= 0) { endCurrentGame(game.gameScore.player > game.gameScore.opponent); sim = null; return; }
    // Reset drive
    game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
  } else if (sim.success) {
    consecutiveCatches++; game.seasonStats.completions++;
    const yards = sim.yardsGained;
    game.seasonStats.yards += yards;
    game.score += yards * 10; game.gold += yards * 2;
    game.driveYards += yards; game.drivePlays++;
    game.ballYardLine = Math.min(50, game.ballYardLine + yards);
    game.seasonStats.plays.push({
      gameNum: game.gameNum, formation: currentPlay.offense.name,
      wrName: wrs[sim.chosenWR].name, route: currentPlay.offense.wrs[sim.chosenWR].route,
      yards: yards, passType: game.passType, isTD: game.ballYardLine >= 50,
    });
    reduceStress(5);
    if (game.ballYardLine >= 50) {
      // TOUCHDOWN!
      game.seasonStats.tds++; game.score += 600; game.gold += 100;
      game.gameScore.player += 7;
      reduceStress(10);
      // Reset for next drive
      game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
      // V15: Opponent scoring with progression logic instead of pure RNG
      // Later games = better opponents, but not random coinflips
      var oppScoreChance = 0.15 + game.gameNum * 0.04; // 19% game 1 → 55% game 10
      if (game.gameScore.player > game.gameScore.opponent + 14) oppScoreChance += 0.15; // Comeback mechanic
      if (Math.random() < oppScoreChance) game.gameScore.opponent += 7;
      if (game.gameClock <= 0) {
        endCurrentGame(game.gameScore.player > game.gameScore.opponent);
        sim = null; return;
      }
      // V15.1: Halftime check moved to end of handlePlayResult()
    } else {
      if (game.ballYardLine >= game.firstDownLine) {
        game.downs.current = 1;
        game.firstDownLine = 25; // V16: midfield always
        addParticle(W / 2, 300, 'confetti', 12);
        Commentary.generate('first_down');
      } else {
        game.downs.current++;
        if (game.downs.current > 4) {
          // V15: Turnover on downs — opponent field goal chance based on field position
          var fgChance = game.ballYardLine > 30 ? 0.5 : 0.25; // Better field position = more likely FG
          if (Math.random() < fgChance) game.gameScore.opponent += 3;
          game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
          if (game.gameClock <= 0) { endCurrentGame(game.gameScore.player > game.gameScore.opponent); sim = null; return; }
        }
      }
    }
  } else {
    consecutiveCatches = 0; addStress(15); game.drivePlays++;
    game.downs.current++;
    if (game.downs.current > 4) {
      // V15: Field position-based FG chance on incomplete 4th down turnover
      var fgChance2 = game.ballYardLine > 30 ? 0.45 : 0.2;
      if (Math.random() < fgChance2) game.gameScore.opponent += 3;
      game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
      if (game.gameClock <= 0) { endCurrentGame(game.gameScore.player > game.gameScore.opponent); sim = null; return; }
    }
  }
  // V15.1: Store play result for display before nullifying sim
  if (sim) {
    game.lastPlayResult = {
      success: sim.success, isINT: sim.isINT, isSack: sim.isSack,
      yardsGained: sim.yardsGained, yacYards: sim.yacYards, yacType: sim.yacType,
      sackYards: sim.sackYards, chosenWR: sim.chosenWR
    };
  }
  // V17: End game check — clock hits 0:00
  if (game.gameClock <= 0 && game.state !== 'halftime') {
    endCurrentGame(game.gameScore.player > game.gameScore.opponent);
    sim = null; return;
  }
  // V17: Halftime at 3:00 remaining (180s elapsed of 360s)
  if (game.gameClock <= 180 && !game.halftimeShown) {
    game.halftimeShown = true; game.gameClockRunning = false; game.state = 'halftime';
    SFX.play('halftime_whistle'); generateHalftimeOptions();
    sim = null; return;
  }
  if (game.state === 'simulation') game.state = 'playResult';
  sim = null;
}

function endCurrentGame(won) {
  const team = getCurrentTeam();
  const isTie = game.gameScore.player === game.gameScore.opponent;
  game.seasonRecord.push({ teamId: team.id, won, tied: isTie, playerScore: game.gameScore.player, oppScore: game.gameScore.opponent });
  if (!won && !isTie) game.losses++; // Ties don't count as losses
  if (game.losses >= game.maxLosses) {
    game.state = 'gameOver'; SFX.play('gameover'); return;
  }
  if (game.gameNum >= game.maxGames && won) {
    game.victoryCeremony = true; game.victoryCeremonyTimer = 0;
    game.state = 'victoryCeremony'; SFX.play('champion'); return;
  }
  if (game.gameNum >= game.maxGames) {
    game.state = won ? 'victory' : 'gameOver';
    SFX.play(won ? 'champion' : 'gameover'); return;
  }
  // Go to between-game phase
  game.state = 'betweenGame';
  game.gameNum++;
  game.betweenGamePhase = 'map';
}

// ============================================================
// HALFTIME SYSTEM
// ============================================================
let halftimeOptions = [];
function generateHalftimeOptions() {
  const allOptions = [
    { id: 'film_study', name: '录像分析', desc: '接下来3档可看到防守阵型', icon: '📋',
      apply: () => { game.filmStudyFloorsLeft = 3; game.scoutReport = true; } },
    { id: 'wr_clinic', name: 'WR特训', desc: '所有WR信任重置为60', icon: '🤝',
      apply: () => { game.wrTrust = [60, 60, 60, 60]; } },
    { id: 'qb_coach', name: 'QB教练', desc: '精准度永久+5', icon: '🎯',
      apply: () => { qb.accuracy += 5; } },
    { id: 'equipment', name: '装备检查', desc: '压力恢复每档+10', icon: '🔧',
      apply: () => { game.composureRecoveryBonus += 10; } },
    { id: 'playbook', name: '战术扩展', desc: '解锁dig和seam路线', icon: '📖',
      apply: () => { game.playBookExpanded = true; } },
  ];
  halftimeOptions = allOptions.sort(() => Math.random() - 0.5).slice(0, 3);
}

// ============================================================
// UPGRADES
// ============================================================
let upgradeOptions = [];
function generateUpgradeOptions() {
  upgradeOptions = [];
  const qbPool = [
    { name: '精准臂力', desc: '传球精准度+8', icon: '🎯', apply: () => qb.accuracy += 8 },
    { name: '火箭臂', desc: '臂力+10', icon: '💪', apply: () => qb.arm += 10 },
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
function applyUpgrade(idx) { upgradeOptions[idx].apply(); addParticle(W / 2, 300, 'confetti', 15); SFX.play('click'); }

// ============================================================
// QB RATING
// ============================================================
function calculateQBRating() {
  const s = game.seasonStats;
  if (s.attempts === 0) return 0;
  const a = Math.min(2.375, Math.max(0, ((s.completions / s.attempts) - 0.3) * 5));
  const b = Math.min(2.375, Math.max(0, ((s.yards / s.attempts) - 3) * 0.25));
  const c2 = Math.min(2.375, Math.max(0, (s.tds / s.attempts) * 20));
  const d = Math.min(2.375, Math.max(0, 2.375 - ((s.ints / s.attempts) * 25)));
  return ((a + b + c2 + d) / 6) * 100;
}

// ============================================================
// UI HELPERS — Pixel Art Card Style
// ============================================================
function drawPixelRect(c, x, y, w, h, color, borderColor) {
  c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (borderColor) {
    c.strokeStyle = borderColor; c.lineWidth = 1;
    c.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
}

function drawCardFrame(c, x, y, w, h, highlight) {
  // Parchment-style card background
  c.fillStyle = highlight ? 'rgba(50,42,34,0.96)' : COL.cardBg;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  // Double border (pixel art style)
  c.strokeStyle = highlight ? COL.cardHighlight : COL.cardBorder; c.lineWidth = 2;
  c.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  c.strokeStyle = 'rgba(138,118,80,0.3)'; c.lineWidth = 1;
  c.strokeRect(Math.round(x) + 3, Math.round(y) + 3, Math.round(w) - 6, Math.round(h) - 6);
}

function drawPixelButton(c, btn, hover) {
  const { x, y, w, h, text } = btn;
  drawCardFrame(c, x, y, w, h, hover);
  c.fillStyle = hover ? COL.parchment : COL.uiWhite;
  c.font = 'bold 12px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, Math.round(x + w / 2), Math.round(y + h / 2));
}

function drawRadarChart(c, cx, cy, r, stats, labels, color) {
  const n = stats.length, as = (Math.PI * 2) / n;
  for (let ring = 1; ring <= 3; ring++) {
    const rr = r * (ring / 3);
    c.strokeStyle = 'rgba(232,220,200,0.12)'; c.lineWidth = 0.5; c.beginPath();
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i * as; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i === 0 ? c.moveTo(px, py) : c.lineTo(px, py); }
    c.stroke();
  }
  c.fillStyle = color; c.globalAlpha = 0.2; c.beginPath();
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * as, v = Math.min(1, stats[i] / 100); const px = cx + Math.cos(a) * r * v, py = cy + Math.sin(a) * r * v; i === 0 ? c.moveTo(px, py) : c.lineTo(px, py); }
  c.closePath(); c.fill(); c.globalAlpha = 1;
  c.strokeStyle = color; c.lineWidth = 1.5; c.beginPath();
  for (let i = 0; i <= n; i++) { const idx = i % n, a = -Math.PI / 2 + idx * as, v = Math.min(1, stats[idx] / 100); const px = cx + Math.cos(a) * r * v, py = cy + Math.sin(a) * r * v; i === 0 ? c.moveTo(px, py) : c.lineTo(px, py); }
  c.stroke();
  c.fillStyle = '#aaa'; c.font = '7px "Courier New"'; c.textAlign = 'center';
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * as; c.fillText(labels[i], cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9)); }
}

// ============================================================
// SCORE BUG — Pixel Art Style
// ============================================================
function drawScoreBug() {
  const bH = 50, bY = H - bH - 4, bX = 6, bW = W - 12;
  ctx.save();
  drawPixelRect(ctx, bX, bY, bW, bH, COL.scoreBug, COL.cardBorder);
  // Accent line
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(bX + 2, bY, bW - 4, 2);

  const team = getCurrentTeam();
  // Team name & score
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'left';
  ctx.fillText(`${team.icon} ${team.name}`, bX + 8, bY + 14);
  ctx.fillStyle = COL.uiRed; ctx.font = 'bold 14px "Courier New"';
  ctx.fillText(String(game.gameScore.opponent), bX + 8, bY + 32);

  ctx.fillStyle = COL.parchment; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'right';
  ctx.fillText('QB CHALLENGE', bX + bW - 8, bY + 14);
  ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 14px "Courier New"';
  ctx.fillText(String(game.gameScore.player), bX + bW - 8, bY + 32);

  // Down & distance
  const ydsToGo = game.firstDownLine >= 50 ? (50 - game.ballYardLine) : (game.firstDownLine - game.ballYardLine);
  const dt2 = `第${game.downs.current}档 & ${ydsToGo > 0 ? ydsToGo + '码' : 'GOAL'}`;
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
  drawPixelRect(ctx, W / 2 - 40, bY + 6, 80, 16, 'rgba(212,168,64,0.15)', COL.uiGold);
  ctx.fillText(dt2, W / 2, bY + 17);

  // Quarter & play count
  ctx.fillStyle = '#888'; ctx.font = '8px "Courier New"';
  const _cm = Math.floor(game.gameClock / 60), _cs = Math.floor(game.gameClock % 60);
  ctx.fillText(`第${game.gameNum}场 · ${_cm}:${String(_cs).padStart(2,'0')}`, W / 2, bY + 38);

  // Gold
  ctx.fillStyle = COL.uiGold; ctx.font = '8px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(`💰${game.gold}`, W / 2, bY + bH - 4);

  ctx.restore();
}

function drawPoiseRating() {
  const level = getComposureLevel();
  const labels = { cool: '冷静', nervous: '紧张', shaky: '颤抖', tilted: '崩溃' };
  const colors = { cool: COL.uiGreen, nervous: COL.uiYellow, shaky: COL.uiOrange, tilted: COL.uiRed };
  const px = W - 58, py = 80, col = colors[level];
  const poise = 100 - game.stress;
  ctx.save();
  drawPixelRect(ctx, px - 2, py - 2, 54, 48, COL.cardBg, COL.cardBorder);
  ctx.fillStyle = '#888'; ctx.font = '7px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('POISE', px + 23, py + 7);
  // Bar segments
  for (let s = 0; s < 10; s++) {
    const filled = poise >= (s + 1) * 10;
    const segColor = s < 3 ? COL.uiRed : s < 6 ? COL.uiYellow : COL.uiGreen;
    ctx.fillStyle = filled ? segColor : 'rgba(232,220,200,0.1)';
    ctx.fillRect(px + s * 5, py + 12, 4, 10);
  }
  ctx.fillStyle = col; ctx.font = 'bold 10px "Courier New"';
  ctx.fillText(Math.round(poise), px + 23, py + 34);
  ctx.font = '6px "Courier New"'; ctx.fillText(labels[level], px + 23, py + 42);
  ctx.restore();
}

function drawRelicsBar() {
  if (relics.length === 0) return;
  ctx.save();
  for (let i = 0; i < relics.length; i++) {
    drawPixelRect(ctx, 4 + i * 18, 78, 16, 16, 'rgba(42,34,28,0.8)', 'rgba(138,118,80,0.4)');
    ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(relics[i].icon, 12 + i * 18, 87);
  }
  ctx.restore();
}

function drawTopBar() {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, 55);
  g.addColorStop(0, 'rgba(18,16,14,0.85)'); g.addColorStop(1, 'rgba(18,16,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 55);

  if (currentPlay) {
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(currentPlay.offense.name, 10, 18);
    if ((hasRelic('film_study') || game.scoutReport || game.filmStudyFloorsLeft > 0 || hasRelic('defense_handbook')) && currentPlay) {
      ctx.fillStyle = COL.uiRed; ctx.font = '8px "Courier New"';
      ctx.fillText(`防守: ${currentPlay.defense.name}`, 10, 32);
    }
    const team = getCurrentTeam();
    ctx.fillStyle = COL.uiOrange; ctx.font = '8px "Courier New"';
    ctx.fillText(`${team.icon} vs ${team.name}`, 10, 46);
  }

  ctx.fillStyle = '#aaa'; ctx.font = '8px "Courier New"'; ctx.textAlign = 'right';
  ctx.fillText(`ACC:${qb.accuracy} ARM:${qb.arm}`, W - 10, 18);

  const weather = Weather.getWeatherForGame(game.gameNum);
  if (weather !== 'day') {
    const wIcons = { dusk: '🌅', night: '🌙', rain: '🌧️', snow: '❄️' };
    ctx.fillStyle = '#aaa'; ctx.font = '8px "Courier New"';
    ctx.fillText(`${wIcons[weather] || ''} ${weather.toUpperCase()}`, W - 10, 32);
  }

  // Season record
  ctx.fillStyle = '#888'; ctx.font = '7px "Courier New"'; ctx.textAlign = 'right';
  const wins = game.seasonRecord.filter(r => r.won).length;
  const ties = game.seasonRecord.filter(r => r.tied).length;
  const losses = game.seasonRecord.filter(r => !r.won && !r.tied).length;
  ctx.fillText(`${wins}W${ties ? '-' + ties + 'T' : ''}-${losses}L`, W - 10, 46);
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
  // Highlight area between LOS and first down
  ctx.save(); ctx.fillStyle = 'rgba(200,168,64,0.06)';
  ctx.fillRect(fl, Math.min(losScr.y, fdScr.y), fw, Math.abs(fdScr.y - losScr.y)); ctx.restore();
  // LOS line
  ctx.save(); ctx.fillStyle = COL.uiYellow; ctx.globalAlpha = 0.7;
  ctx.fillRect(fl - 4, Math.round(losScr.y) - 1, fw + 8, 2); ctx.restore();
  // First down line
  ctx.save(); ctx.fillStyle = COL.uiOrange; ctx.globalAlpha = 0.6;
  ctx.fillRect(fl, Math.round(fdScr.y) - 1, fw, 2); ctx.restore();
}

function drawPlayer(x, y, team, action, frame, number, isQB, highlight, scale) {
  drawPixelPlayer(ctx, x, y, team, number, action, frame, isQB, scale, null);
  if (highlight) {
    ctx.save();
    const p = Math.sin(game.time * 5) * 0.2 + 0.8;
    ctx.globalAlpha = p * 0.4; ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) - 10, Math.round(y) - 24, 20, 28); ctx.restore();
  }
}

function drawStarPlayer(x, y, team, action, frame, number, starData) {
  // Draw with aura
  drawPixelPlayer(ctx, x, y, team, number, action, frame, false, 1, starData.auraColor);
  // Star icon above
  ctx.fillStyle = COL.uiGold; ctx.font = '8px serif'; ctx.textAlign = 'center';
  ctx.fillText('★', Math.round(x), Math.round(y) - 28);
}

function drawBall(x, y, trail) {
  // V18.4: Ball arc — lob goes high, bullet stays low
  const arcOffset = (sim && sim.ballArc) ? sim.ballArc * 3 : 0; // pixels upward
  if (trail && trail.length > 1) {
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = COL.ball;
    for (let i = 0; i < trail.length; i++) {
      const scr = FIELD.toScreen(trail[i].yard, trail[i].lane);
      const tArc = (trail[i].arc || 0) * 3;
      ctx.fillRect(Math.round(scr.x) - 2, Math.round(scr.y - tArc) - 1, 4, 2);
    }
    ctx.restore();
  }
  // V18.4: Ball shadow on ground when arcing
  if (arcOffset > 3) {
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(x) - 3, Math.round(y) - 1, 6, 2);
    ctx.restore();
  }
  // Pixel art football (elevated by arc)
  ctx.fillStyle = COL.ball;
  ctx.fillRect(Math.round(x) - 4, Math.round(y - arcOffset) - 2, 8, 4);
  ctx.fillStyle = COL.ballLace;
  ctx.fillRect(Math.round(x) - 1, Math.round(y - arcOffset) - 1, 2, 1);
  // Ball size scales slightly with height (lob = ball appears smaller at peak)
  if (arcOffset > 5) {
    ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = COL.ball;
    ctx.fillRect(Math.round(x) - 3, Math.round(y - arcOffset) - 1, 6, 3);
    ctx.restore();
  }
}

function drawRouteLines(alpha, animProgress) {
  if (!currentPlay) return;
  for (let i = 0; i < 4; i++) {
    const wr = currentPlay.offense.wrs[i], path = routePaths[wr.route](wr.yard, wr.lane), color = WR_COLORS[i];
    const points = [FIELD.toScreen(wr.yard, wr.lane)];
    for (const pt of path) points.push(FIELD.toScreen(pt.yard, pt.lane));
    const prog = animProgress !== undefined ? animProgress : 1;
    ctx.save(); ctx.globalAlpha = alpha || 0.6;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    // Pixel art dashed route lines
    let totalLen = 0;
    for (let j = 1; j < points.length; j++) {
      const dx = points[j].x - points[j-1].x, dy = points[j].y - points[j-1].y;
      totalLen += Math.sqrt(dx * dx + dy * dy);
    }
    const drawLen = totalLen * prog;
    let drawn = 0;
    ctx.beginPath(); ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
    for (let j = 1; j < points.length; j++) {
      const dx = points[j].x - points[j-1].x, dy = points[j].y - points[j-1].y;
      const sl = Math.sqrt(dx * dx + dy * dy);
      if (drawn + sl <= drawLen) {
        ctx.lineTo(Math.round(points[j].x), Math.round(points[j].y)); drawn += sl;
      } else {
        const rem = drawLen - drawn, t2 = rem / sl;
        ctx.lineTo(Math.round(points[j-1].x + dx * t2), Math.round(points[j-1].y + dy * t2));
        break;
      }
    }
    ctx.stroke();
    // Route label
    if (prog >= 0.9) {
      const end = points[points.length - 1];
      drawPixelRect(ctx, end.x - 16, end.y - 16, 32, 12, 'rgba(28,22,18,0.8)', color);
      ctx.fillStyle = color; ctx.font = '7px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText(wr.route.toUpperCase(), Math.round(end.x), Math.round(end.y) - 8);
    }
    ctx.restore();
  }
}

// ============================================================
// TITLE SCREEN — Pixel Art Roguelike Style
// ============================================================
let titleAnim = { timer: 0, spriteFrame: 0 };
let challengeInput = '', showChallengeInput = false;

function drawTitle(dt) {
  titleAnim.timer += dt; titleAnim.spriteFrame = Math.floor(titleAnim.timer * 6);
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);

  // Pixel art field background
  if (fieldTexture) { ctx.save(); ctx.globalAlpha = 0.25; ctx.drawImage(fieldTexture, 0, 0); ctx.restore(); }

  // Title
  ctx.save(); ctx.textAlign = 'center';
  const pulse = Math.sin(titleAnim.timer * 2) * 0.1 + 0.9;
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 32px "Courier New", monospace';
  ctx.fillText('QB CHALLENGE', W / 2, 75);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 14px "Courier New"';
  ctx.fillText('◆ ROGUELIKE EDITION ◆', W / 2, 100);
  // Version badge
  drawPixelRect(ctx, W - 42, 8, 34, 16, 'rgba(212,168,64,0.2)', COL.uiGold);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 8px "Courier New"'; ctx.fillText('V15', W - 25, 19);
  ctx.restore();

  ctx.strokeStyle = 'rgba(232,220,200,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 80, 112); ctx.lineTo(W / 2 + 80, 112); ctx.stroke();

  // Career stats
  if (Career.data && Career.data.seasons > 0) {
    ctx.save();
    drawCardFrame(ctx, 20, 122, W - 40, 70, false);
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('生涯数据', W / 2, 136);
    ctx.fillStyle = '#aaa'; ctx.font = '8px "Courier New"';
    ctx.fillText(`${Career.data.seasons}赛季 · ${Career.getCareerCompPct()}%命中 · ${Career.data.careerYards}码 · ${Career.data.careerTD}TD · ${Career.data.careerINT}INT`, W / 2, 152);
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 9px "Courier New"';
    ctx.fillText(`最佳评分: ${Career.data.bestRating.toFixed(1)} | 🏆×${Career.data.championships || 0}`, W / 2, 168);
    const legacy = Career.getLegacyBonus();
    if (legacy > 0) { ctx.fillStyle = COL.uiGreen; ctx.font = '8px "Courier New"'; ctx.fillText(`传承加成: +${legacy} ACC`, W / 2, 182); }
    ctx.restore();
  }

  // Pixel art QB sprite
  drawPixelPlayer(ctx, W / 2 - 40, 280, 'offense', 7, 'throw', Math.floor(titleAnim.timer * 4) % 6, true, 1.5, null);
  drawPixelPlayer(ctx, W / 2 + 50, 260, 'offense', 81, 'run', titleAnim.spriteFrame, false, 1.2, null);

  // Feature list
  ctx.fillStyle = 'rgba(232,220,200,0.4)'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('12支独特防守球队 · 明星球员系统 · 25+圣物', W / 2, 330);
  ctx.fillText('像素风美术 · 赛季制10场比赛 · 随机事件', W / 2, 346);

  // Buttons
  genericButtons = [];
  const startBtn = { x: W / 2 - 80, y: 370, w: 160, h: 40, text: '◆ 开始新赛季 ◆', action: 'start' };
  genericButtons.push(startBtn);
  drawPixelButton(ctx, startBtn, isInsideRect(mouseX, mouseY, startBtn.x, startBtn.y, startBtn.w, startBtn.h));

  const chalBtn = { x: W / 2 - 65, y: 420, w: 130, h: 30, text: '🏆 挑战码', action: 'challenge' };
  genericButtons.push(chalBtn);
  drawPixelButton(ctx, chalBtn, isInsideRect(mouseX, mouseY, chalBtn.x, chalBtn.y, chalBtn.w, chalBtn.h));

  // Challenge input overlay
  if (showChallengeInput) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    drawCardFrame(ctx, 40, H / 2 - 70, W - 80, 140, true);
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('输入挑战码', W / 2, H / 2 - 42);
    drawPixelRect(ctx, 60, H / 2 - 25, W - 120, 25, 'rgba(232,220,200,0.08)', COL.cardBorder);
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(challengeInput || 'QBXXXXXXXX', W / 2, H / 2 - 10);
    const goBtn = { x: W / 2 - 55, y: H / 2 + 10, w: 45, h: 25, text: 'GO', action: 'challenge_go' };
    const cancelBtn = { x: W / 2 + 10, y: H / 2 + 10, w: 45, h: 25, text: '✕', action: 'challenge_cancel' };
    genericButtons.push(goBtn, cancelBtn);
    drawPixelButton(ctx, goBtn, isInsideRect(mouseX, mouseY, goBtn.x, goBtn.y, goBtn.w, goBtn.h));
    drawPixelButton(ctx, cancelBtn, isInsideRect(mouseX, mouseY, cancelBtn.x, cancelBtn.y, cancelBtn.w, cancelBtn.h));
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(232,220,200,0.25)'; ctx.font = '7px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('V15 QB Tested · 12 Teams · Star Players · 25+ Relics', W / 2, H - 20);
  drawParticles();
}

// ============================================================
// SEASON MAP SCREEN — Slay the Spire style path
// ============================================================
let mapButtons = [];
function drawSeasonMapScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);

  // Header
  drawPixelRect(ctx, 0, 0, W, 50, COL.uiBg, null);
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(0, 48, W, 2);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('赛季日程', W / 2, 20);
  const wins2 = game.seasonRecord.filter(r => r.won).length;
  const ties2 = game.seasonRecord.filter(r => r.tied).length;
  const ls = game.seasonRecord.filter(r => !r.won && !r.tied).length;
  ctx.fillStyle = COL.uiGold; ctx.font = '9px "Courier New"';
  ctx.fillText(`第${game.gameNum}场 · ${wins2}胜${ties2 ? ties2 + '平' : ''}${ls}负 · 💰${game.gold}`, W / 2, 38);

  if (!seasonMap) return;
  mapButtons = [];

  // Draw the 10-game path
  const startY = 65, endY = H - 60;
  const gameH = (endY - startY) / 10;

  for (let g = 0; g < 10; g++) {
    const teamId = seasonMap.teamOrder[g];
    const team = TEAMS.find(t => t.id === teamId) || TEAMS[0];
    const ny = startY + g * gameH + gameH / 2;
    const isNext = g === game.gameNum - 1;
    const isPlayed = g < game.gameNum - 1;
    const isFuture = g > game.gameNum - 1;

    // Connection line
    if (g < 9) {
      ctx.strokeStyle = isPlayed ? 'rgba(232,220,200,0.3)' : 'rgba(232,220,200,0.08)';
      ctx.lineWidth = isPlayed ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(W / 2, ny + 16); ctx.lineTo(W / 2, ny + gameH - 16); ctx.stroke();
    }

    // Game node
    const nodeW = W - 60, nodeH = gameH - 8, nodeX = 30, nodeY = ny - nodeH / 2;

    if (isNext) {
      // Active game - highlight
      drawCardFrame(ctx, nodeX, nodeY, nodeW, nodeH, true);
      ctx.fillStyle = COL.uiGold; ctx.fillRect(nodeX + 2, nodeY + 2, 3, nodeH - 4);
      // Pulsing border
      ctx.save(); ctx.globalAlpha = Math.sin(game.time * 4) * 0.3 + 0.5;
      ctx.strokeStyle = COL.uiGold; ctx.lineWidth = 2;
      ctx.strokeRect(nodeX - 1, nodeY - 1, nodeW + 2, nodeH + 2); ctx.restore();
      mapButtons.push({ x: nodeX, y: nodeY, w: nodeW, h: nodeH, gameIdx: g });
    } else if (isPlayed) {
      drawPixelRect(ctx, nodeX, nodeY, nodeW, nodeH, 'rgba(42,34,28,0.5)', 'rgba(232,220,200,0.15)');
      const result = game.seasonRecord[g];
      if (result) {
        ctx.fillStyle = result.won ? COL.uiGreen : COL.uiRed;
        ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'right';
        const resultLabel = result.won ? 'W' : result.tied ? 'T' : 'L';
        ctx.fillText(`${resultLabel} ${result.playerScore}-${result.oppScore}`, nodeX + nodeW - 8, ny + 4);
      }
    } else {
      drawPixelRect(ctx, nodeX, nodeY, nodeW, nodeH, 'rgba(28,22,18,0.7)', 'rgba(232,220,200,0.1)');
    }

    // Game info
    ctx.globalAlpha = isFuture ? 0.4 : 1;
    // Difficulty indicator
    const diffColors = g < 3 ? COL.uiGreen : g < 6 ? COL.uiYellow : g < 9 ? COL.uiOrange : COL.uiRed;
    ctx.fillStyle = diffColors; ctx.fillRect(nodeX + 6, ny - 4, 3, 8);

    ctx.fillStyle = isNext ? COL.parchment : '#888';
    ctx.font = `${isNext ? 'bold ' : ''}9px "Courier New"`; ctx.textAlign = 'left';
    ctx.fillText(`第${g + 1}场`, nodeX + 14, ny - 4);
    ctx.fillText(`${team.icon} ${team.name}`, nodeX + 14, ny + 8);

    if (isNext || isPlayed) {
      ctx.fillStyle = '#888'; ctx.font = '7px "Courier New"'; ctx.textAlign = 'left';
      ctx.fillText(team.desc, nodeX + 14, ny + 18);
    }

    // Star player indicator
    if (!isFuture && team.stars) {
      ctx.fillStyle = COL.uiGold; ctx.font = '7px "Courier New"'; ctx.textAlign = 'right';
      ctx.fillText(`★${team.stars[0].name}`, nodeX + nodeW - 8, ny - 4);
    }

    ctx.globalAlpha = 1;

    // Game number label
    ctx.fillStyle = 'rgba(232,220,200,0.2)'; ctx.font = '7px "Courier New"'; ctx.textAlign = 'right';
    ctx.fillText(`G${g + 1}`, nodeX - 4, ny + 3);
  }

  // Bottom: Loss counter
  ctx.fillStyle = COL.uiRed; ctx.font = '9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(`败场: ${game.losses}/${game.maxLosses}（3败赛季结束，平局不算败）`, W / 2, H - 20);

  drawParticles();
}

// ============================================================
// BETWEEN GAME SCREEN — Rest/Shop/Event/Training
// ============================================================
function drawBetweenGameScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);

  // Header
  drawPixelRect(ctx, 0, 0, W, 45, COL.uiBg, null);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('备战阶段', W / 2, 18);

  const team = getCurrentTeam();
  // Scouting report for next game
  drawCardFrame(ctx, 15, 55, W - 30, 80, false);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('下场对手侦查报告', W / 2, 70);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 11px "Courier New"';
  ctx.fillText(`${team.icon} ${team.name}`, W / 2, 88);
  ctx.fillStyle = '#aaa'; ctx.font = '8px "Courier New"';
  ctx.fillText(team.desc, W / 2, 104);
  if (team.stars && team.stars[0]) {
    ctx.fillStyle = COL.uiGold; ctx.font = '8px "Courier New"';
    ctx.fillText(`★ 明星球员: #${team.stars[0].num} ${team.stars[0].name} — ${team.stars[0].desc}`, W / 2, 120);
  }

  // Node choices
  if (seasonMap && seasonMap.betweenNodes[game.gameNum - 2]) {
    const nodes = seasonMap.betweenNodes[game.gameNum - 2];
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('选择一个行动:', W / 2, 155);

    genericButtons = [];
    const nodeTypes = {
      rest: { name: '💤 休息', desc: '压力-25，重置档数', icon: '💤', color: COL.uiGreen },
      shop: { name: '🏪 商店', desc: '用金币购买升级', icon: '🏪', color: COL.uiGold },
      event: { name: '❓ 随机事件', desc: '可能好事也可能坏事', icon: '❓', color: COL.uiPink },
      training: { name: '🏋️ 特训', desc: '选择一名WR强化', icon: '🏋️', color: COL.uiBlue },
    };

    const btnH = 55, spacing = 10, totalH = nodes.length * btnH + (nodes.length - 1) * spacing;
    const startBY = 175;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const nt = nodeTypes[n.type] || nodeTypes.event;
      const bx = 25, by = startBY + i * (btnH + spacing), bw = W - 50;
      const btn = { x: bx, y: by, w: bw, h: btnH, text: '', action: `between_${n.type}` };
      genericButtons.push(btn);
      const hover = isInsideRect(mouseX, mouseY, bx, by, bw, btnH);
      drawCardFrame(ctx, bx, by, bw, btnH, hover);
      ctx.fillStyle = nt.color; ctx.fillRect(bx + 4, by + 4, 3, btnH - 8);
      ctx.fillStyle = COL.parchment; ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'left';
      ctx.fillText(nt.name, bx + 14, by + 22);
      ctx.fillStyle = '#aaa'; ctx.font = '8px "Courier New"';
      ctx.fillText(nt.desc, bx + 14, by + 40);
    }

    // Skip option
    const skipBtn = { x: W / 2 - 50, y: startBY + nodes.length * (btnH + spacing) + 10, w: 100, h: 30, text: '直接比赛 →', action: 'between_skip' };
    genericButtons.push(skipBtn);
    drawPixelButton(ctx, skipBtn, isInsideRect(mouseX, mouseY, skipBtn.x, skipBtn.y, skipBtn.w, skipBtn.h));
  }

  drawParticles();
}

// ============================================================
// READING PHASE — Pre-snap
// ============================================================
let motionAnimTimer = 0, motionAnimPhase = 'idle', motionWROrigLane = 0;
let audibleAnim = { active: false, timer: 0 };

function drawReadingPhase(dt) {
  Camera.beginTransform(); drawField();
  if (!currentPlay) { Camera.endTransform(); return; }
  // V15: Extended reading time from 2.5s to 4.0s — QBs need time to read pre-snap
  game.readingTimer += dt; const rd = 4.0, ra = Math.min(1, game.readingTimer / (rd * 0.8));
  Camera.setForPhase('reading');

  if (motionAnimPhase === 'moving') {
    motionAnimTimer += dt;
    const motionDir = currentPlay.offense.wrs[currentPlay.motionWR].lane < 30 ? 1 : -1;
    const motionProgress = Math.min(1, motionAnimTimer / 0.8);

    // Ghost Mist: motion nullified
    const team = getCurrentTeam();
    if (team.motionNullified && game.disguisesLeft > 0) {
      if (motionProgress > 0.5 && motionAnimPhase === 'moving') {
        game.motionResult = Math.random() < 0.5 ? 'man' : 'zone'; // random, unreliable
      }
    } else {
      if (motionProgress > 0.5 && motionAnimPhase === 'moving') {
        game.motionResult = currentPlay.coverageIsMan ? 'man' : 'zone';
      }
    }

    if (motionProgress >= 1) {
      motionAnimPhase = 'result'; motionAnimTimer = 0;
      game.motionUsed = true; currentPlay.motionUsed = true;
      currentPlay.motionResult = game.motionResult;
      // Eagle visor: always accurate
      if (hasRelic('eagle_visor')) {
        game.motionResult = currentPlay.coverageIsMan ? 'man' : 'zone';
        currentPlay.motionResult = game.motionResult;
      }
      currentPlay.wrScores = evaluateReceivers(currentPlay.offense, currentPlay.defense, currentPlay.isElite, currentPlay.isBoss);
      currentPlay.bestWR = currentPlay.wrScores.indexOf(Math.max(...currentPlay.wrScores));
      if (game.motionResult === 'man') Commentary.generate('presnap_motion_man');
      else Commentary.generate('presnap_motion_zone');
    }
  }
  if (audibleAnim.active) { audibleAnim.timer += dt; if (audibleAnim.timer > 1.0) audibleAnim.active = false; }

  // Draw defenders
  const team = getCurrentTeam();
  const starNums = (team.stars || []).map(s => s.num);
  for (let i = 0; i < 4; i++) {
    const db = currentPlay.defense.dbs[i];
    let hy = db.yard, hl = db.lane;
    const scr = FIELD.toScreen(hy, hl);
    const isStar = starNums.includes(db.num || (20 + i));
    if (isStar && team.stars) { drawStarPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), db.num || (20 + i), team.stars.find(s => s.num === (db.num || (20+i))) || team.stars[0]); }
    else drawPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), 20 + i, false, false);
  }
  // Rusher
  const rs = FIELD.toScreen(currentPlay.defense.rusher.yard, currentPlay.defense.rusher.lane);
  if (starNums.includes(99) || starNums.includes(97) || starNums.includes(55)) {
    const starData = team.stars.find(s => [99, 97, 55].includes(s.num)) || team.stars[0];
    drawStarPlayer(rs.x, rs.y, 'defense', 'idle', Math.floor(game.time * 4), starData.num, starData);
  } else {
    drawPlayer(rs.x, rs.y, 'defense', 'idle', Math.floor(game.time * 4), 99, false, false);
  }

  drawRouteLines(0.6, ra);

  // Draw WRs
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
    ctx.fillStyle = WR_COLORS[i]; ctx.font = '7px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(wrs[i].name, Math.round(scr.x), Math.round(scr.y) + 12);
  }

  // QB
  const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
  drawPlayer(qs.x, qs.y, 'offense', 'idle', Math.floor(game.time * 4), 7, true, false, 1.1);

  Camera.endTransform(); Weather.drawParticles(ctx);

  // Reading timer bar
  ctx.save();
  drawPixelRect(ctx, W / 2 - 80, H - 210, 160, 22, COL.cardBg, COL.cardBorder);
  ctx.fillStyle = COL.parchment; ctx.font = '9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('📖 阅读防守中...', W / 2, H - 196);
  ctx.fillStyle = 'rgba(232,220,200,0.15)'; ctx.fillRect(W / 2 - 75, H - 190, 150, 3);
  ctx.fillStyle = COL.uiAccent; ctx.fillRect(W / 2 - 75, H - 190, 150 * Math.min(1, game.readingTimer / rd), 3);
  ctx.restore();

  // Motion button
  genericButtons = [];
  if (!game.motionUsed && motionAnimPhase === 'idle') {
    const mb = { x: W - 120, y: H - 245, w: 110, h: 30, text: 'MOTION ➡', action: 'motion' };
    genericButtons.push(mb);
    drawPixelButton(ctx, mb, isInsideRect(mouseX, mouseY, mb.x, mb.y, mb.w, mb.h));
  }
  if (motionAnimPhase === 'result' && game.motionResult) {
    const resText = game.motionResult === 'man' ? '🔴 MAN!' : '🟢 ZONE!';
    const resColor = game.motionResult === 'man' ? COL.uiRed : COL.uiGreen;
    drawPixelRect(ctx, W / 2 - 50, H - 260, 100, 22, COL.cardBg, resColor);
    ctx.fillStyle = resColor; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(resText, W / 2, H - 246);
  }
  if (game.audiblesLeft > 0) {
    const ab = { x: 10, y: H - 245, w: 90, h: 24, text: `变阵(${game.audiblesLeft})`, action: 'audible' };
    genericButtons.push(ab);
    drawPixelButton(ctx, ab, isInsideRect(mouseX, mouseY, ab.x, ab.y, ab.w, ab.h));
  }
  // Ice whistle button
  if (hasRelic('ice_whistle') && !game.iceFreezeUsed) {
    const ib = { x: 10, y: H - 215, w: 90, h: 24, text: '🧊 冰冻口哨', action: 'ice_whistle' };
    genericButtons.push(ib);
    drawPixelButton(ctx, ib, isInsideRect(mouseX, mouseY, ib.x, ib.y, ib.w, ib.h));
  }

  drawWRCards(false); drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles();
  Commentary.draw(ctx);
  if (game.readingTimer >= rd) { game.state = 'choosing'; game.readingPhase = false; }
}

// ============================================================
// WR CARDS — Slay the Spire card style
// ============================================================
let cardButtons = [];
function drawWRCards(interactive) {
  if (!currentPlay) return;
  const cW = 100, cH = 140, totalW = 4 * cW + 3 * 6, startX = (W - totalW) / 2, baseY = H - cH - 55;
  cardButtons = [];
  for (let i = 0; i < 4; i++) {
    const wr = wrs[i], pw = currentPlay.offense.wrs[i], prob = calculateCatchProb(i, 'touch');
    const ih = interactive && isInsideRect(mouseX, mouseY, startX + i * (cW + 6), baseY, cW, cH);
    let cx2 = startX + i * (cW + 6), cy2 = baseY;
    if (ih) cy2 -= 8;
    cardButtons.push({ x: cx2, y: cy2, w: cW, h: cH, wrIndex: i });
    const trust = getTrustStatus(i);

    ctx.save();
    // Card frame
    drawCardFrame(ctx, cx2, cy2, cW, cH, ih);
    // Color stripe at top
    ctx.fillStyle = WR_COLORS[i]; ctx.fillRect(cx2 + 3, cy2 + 3, cW - 6, 3);

    // Trust glow
    if (trust.status === 'clutch') {
      ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#c07028'; ctx.fillRect(cx2, cy2, cW, cH); ctx.restore();
    } else if (trust.status === 'frustrated') {
      ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = '#4878b8'; ctx.fillRect(cx2, cy2, cW, cH); ctx.restore();
    }

    // Pixel art WR portrait
    drawPixelPlayer(ctx, cx2 + cW / 2, cy2 + 32, 'offense', wr.num, 'idle', Math.floor(game.time * 4), false, 0.8, null);

    // Name + trust
    ctx.fillStyle = WR_COLORS[i]; ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(`${wr.name} ${trust.emoji}`, cx2 + cW / 2, cy2 + 48);

    // Trust meter
    const trustBarW = cW - 14, trustX = cx2 + 7, trustY = cy2 + 52;
    ctx.fillStyle = 'rgba(232,220,200,0.1)'; ctx.fillRect(trustX, trustY, trustBarW, 3);
    const trustPct = game.wrTrust[i] / 100;
    const trustColor = trustPct > 0.7 ? COL.uiGreen : trustPct > 0.4 ? COL.uiYellow : COL.uiRed;
    ctx.fillStyle = trustColor; ctx.fillRect(trustX, trustY, trustBarW * trustPct, 3);

    // Stats - compact radar
    drawRadarChart(ctx, cx2 + cW / 2, cy2 + 76, 14,
      [wr.spd, wr.cat, wr.rte], ['SPD', 'CAT', 'RTE'], WR_COLORS[i]);

    // Route label
    ctx.fillStyle = 'rgba(232,220,200,0.4)'; ctx.font = '6px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(pw.route.toUpperCase(), cx2 + cW / 2, cy2 + 102);

    // Catch probability
    const pc = prob >= 60 ? COL.uiGreen : prob >= 35 ? COL.uiYellow : COL.uiRed;
    ctx.fillStyle = pc; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`${Math.round(prob)}%`, cx2 + cW / 2, cy2 + 122);

    // Best WR indicator
    if (i === currentPlay.bestWR && (hasRelic('film_study') || game.scoutReport || game.filmStudyFloorsLeft > 0)) {
      ctx.fillStyle = COL.uiGold; ctx.font = '10px serif'; ctx.textAlign = 'right';
      ctx.fillText('★', cx2 + cW - 5, cy2 + 16);
    }
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
  for (let i = 0; i < 4; i++) {
    const scr = FIELD.toScreen(currentPlay.defense.dbs[i].yard, currentPlay.defense.dbs[i].lane);
    drawPlayer(scr.x, scr.y, 'defense', 'idle', Math.floor(game.time * 4), 20 + i, false, false);
  }
  const rs2 = FIELD.toScreen(currentPlay.defense.rusher.yard, currentPlay.defense.rusher.lane);
  drawPlayer(rs2.x, rs2.y, 'defense', 'idle', Math.floor(game.time * 4), 99, false, false);
  drawRouteLines(0.5, 1);
  for (let i = 0; i < 4; i++) {
    const scr = FIELD.toScreen(currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane);
    let hl = false;
    for (const cb of cardButtons) if (cb.wrIndex === i && isInsideRect(mouseX, mouseY, cb.x, cb.y, cb.w, cb.h)) hl = true;
    drawPlayer(scr.x, scr.y, 'offense', 'idle', Math.floor(game.time * 4), wrs[i].num, false, hl);
  }
  const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
  drawPlayer(qs.x, qs.y, 'offense', 'idle', Math.floor(game.time * 4), 7, true, false, 1.1);
  Camera.endTransform(); Weather.drawParticles(ctx);

  drawPixelRect(ctx, W / 2 - 110, H - 210, 220, 22, COL.cardBg, COL.cardBorder);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('👇 点击卡牌选择传球目标!', W / 2, H - 196);

  drawWRCards(true); drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles();
  Commentary.draw(ctx);
}

// ============================================================
// PASS TYPE SELECTION
// ============================================================
let passTypeTimer = 0, passTypeButtons = [];
function drawPassTypeScreen(dt) {
  passTypeTimer += dt;
  Camera.beginTransform(); drawField();
  if (currentPlay) {
    for (let i = 0; i < 4; i++) {
      const scr = FIELD.toScreen(currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane);
      drawPlayer(scr.x, scr.y, 'offense', 'idle', Math.floor(game.time * 4), wrs[i].num, false, i === sim.chosenWR);
    }
    const qs = FIELD.toScreen(currentPlay.offense.qb.yard, currentPlay.offense.qb.lane);
    drawPlayer(qs.x, qs.y, 'offense', 'throw', 0, 7, true, false, 1.1);
    drawRouteLines(0.3, 1);
  }
  Camera.endTransform(); Weather.drawParticles(ctx);

  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, H / 2 - 70, W, 140);
  // V15: Extended from 2.0s to 3.5s (4.0s on 4th down) — QBs need time to process pass type
  const baseTimeLimit = game.downs.current === 4 ? 4.0 : 3.5;
  const timeLimit = hasRelic('time_freeze') ? 999 : baseTimeLimit;
  const timeLeft = Math.max(0, timeLimit - passTypeTimer);
  if (!hasRelic('time_freeze')) {
    ctx.fillStyle = 'rgba(232,220,200,0.15)'; ctx.fillRect(40, H / 2 - 60, W - 80, 4);
    ctx.fillStyle = timeLeft / baseTimeLimit > 0.3 ? COL.uiAccent : COL.uiRed;
    ctx.fillRect(40, H / 2 - 60, (W - 80) * (timeLeft / baseTimeLimit), 4);
  }
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(`选择传球类型 → ${wrs[sim.chosenWR].name}`, W / 2, H / 2 - 40);

  passTypeButtons = [];
  const types = [
    { type: 'bullet', label: '🔴 子弹', desc: '短传+10%', color: COL.bulletRed },
    { type: 'touch', label: '🟡 弧线', desc: '均衡', color: COL.touchYellow },
    { type: 'lob', label: '🔵 高抛', desc: '深传+15%', color: COL.lobBlue },
  ];
  const btnW = 120, spacing = 10, totalBW = 3 * btnW + 2 * spacing, startBX = (W - totalBW) / 2, bY = H / 2 - 18;
  for (let i = 0; i < 3; i++) {
    const t = types[i], bx = startBX + i * (btnW + spacing);
    const btn = { x: bx, y: bY, w: btnW, h: 44, action: `pass_${t.type}` };
    passTypeButtons.push(btn);
    const hover = isInsideRect(mouseX, mouseY, bx, bY, btnW, 44);
    drawCardFrame(ctx, bx, bY, btnW, 44, hover);
    ctx.fillStyle = t.color; ctx.fillRect(bx + 3, bY + 3, btnW - 6, 2);
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(t.label, bx + btnW / 2, bY + 22);
    ctx.fillStyle = '#888'; ctx.font = '8px "Courier New"'; ctx.fillText(t.desc, bx + btnW / 2, bY + 36);
  }
  ctx.restore();
  if (passTypeTimer >= timeLimit) { game.passType = 'touch'; beginSimAfterPassType(); }
  drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx);
}

// ============================================================
// SCRAMBLE UI
// ============================================================
let scrambleButtons = [];
function drawScrambleUI() {
  if (!sim || sim.phase !== 'scramble') return;
  ctx.save();
  const flash = Math.sin(game.time * 10) * 0.2 + 0.6;
  ctx.fillStyle = `rgba(200,168,64,${flash * 0.1})`; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 22px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('⚡ SCRAMBLE!', W / 2, H / 2 - 70);
  const sideText = sim.rusherSide === 'left' ? '← 左侧冲传' : sim.rusherSide === 'right' ? '右侧冲传 →' : '↑ 中路冲传 ↑';
  ctx.fillStyle = COL.uiRed; ctx.font = 'bold 11px "Courier New"'; ctx.fillText(sideText, W / 2, H / 2 - 48);
  const timeLeft = Math.max(0, sim.scrambleTimer);
  ctx.fillStyle = 'rgba(232,220,200,0.15)'; ctx.fillRect(W / 2 - 70, H / 2 - 36, 140, 4);
  ctx.fillStyle = timeLeft / 1.8 > 0.3 ? COL.uiGold : COL.uiRed;
  ctx.fillRect(W / 2 - 70, H / 2 - 36, 140 * (timeLeft / 1.8), 4);

  scrambleButtons = [];
  const btnW = 90, btnH = 38;
  const leftBtn = { x: W / 2 - btnW * 1.5 - 8, y: H / 2 - 18, w: btnW, h: btnH, action: 'scramble_left' };
  const standBtn = { x: W / 2 - btnW / 2, y: H / 2 - 18, w: btnW, h: btnH, action: 'scramble_stand' };
  const rightBtn = { x: W / 2 + btnW * 0.5 + 8, y: H / 2 - 18, w: btnW, h: btnH, action: 'scramble_right' };
  scrambleButtons.push(leftBtn, standBtn, rightBtn);

  const lh = isInsideRect(mouseX, mouseY, leftBtn.x, leftBtn.y, btnW, btnH);
  const sh = isInsideRect(mouseX, mouseY, standBtn.x, standBtn.y, btnW, btnH);
  const rh = isInsideRect(mouseX, mouseY, rightBtn.x, rightBtn.y, btnW, btnH);

  drawCardFrame(ctx, leftBtn.x, leftBtn.y, btnW, btnH, lh);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('← 左闪', leftBtn.x + btnW / 2, leftBtn.y + btnH / 2 + 4);

  drawCardFrame(ctx, standBtn.x, standBtn.y, btnW, btnH, sh);
  ctx.fillStyle = COL.uiGold; ctx.fillText('挺住', standBtn.x + btnW / 2, standBtn.y + btnH / 2 + 4);

  drawCardFrame(ctx, rightBtn.x, rightBtn.y, btnW, btnH, rh);
  ctx.fillStyle = COL.parchment; ctx.fillText('右闪 →', rightBtn.x + btnW / 2, rightBtn.y + btnH / 2 + 4);
  ctx.restore();
}

// ============================================================
// SIMULATION SCREEN
// ============================================================
function drawSimulationScreen(dt) {
  updateSimulation(dt);
  Camera.beginTransform(); drawField();
  if (!sim) { Camera.endTransform(); return; }
  const frame = Math.floor(game.time * 8);

  // Replay mode
  if (sim.phase === 'replay' && Replay.playing) {
    const rFrame = Replay.getFrame();
    if (rFrame) {
      const entities = [];
      for (let i = 0; i < 4; i++) { if (rFrame.wrPos[i]) { const scr = FIELD.toScreen(rFrame.wrPos[i].yard, rFrame.wrPos[i].lane); const ii = i; entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'offense', 'run', frame, wrs[ii].num, false, ii === sim.chosenWR) }); } }
      for (let i = 0; i < 4; i++) { if (rFrame.dbPos[i]) { const scr = FIELD.toScreen(rFrame.dbPos[i].yard, rFrame.dbPos[i].lane); entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'defense', 'run', frame, 20+i, false, false) }); } }
      if (rFrame.qbPos) { const qscr = FIELD.toScreen(rFrame.qbPos.yard, rFrame.qbPos.lane); entities.push({ y: qscr.y, draw: () => drawPlayer(qscr.x, qscr.y, 'offense', 'throw', frame, 7, true, false, 1.1) }); }
      entities.sort((a, b) => a.y - b.y); entities.forEach(e => e.draw());
      Replay.drawBallWithTrail(ctx, rFrame);
      Camera.endTransform(); Weather.drawParticles(ctx); Replay.drawBanner(ctx);
      drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx); return;
    }
  }

  // Normal sim drawing
  const entities = [];
  for (let i = 0; i < 4; i++) { const scr = FIELD.toScreen(sim.wrPos[i].yard, sim.wrPos[i].lane); const ii = i; entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'offense', sim.wrActions[ii] || 'run', frame, wrs[ii].num, false, ii === sim.chosenWR) }); }
  for (let i = 0; i < 4; i++) { const scr = FIELD.toScreen(sim.dbPos[i].yard, sim.dbPos[i].lane); entities.push({ y: scr.y, draw: () => drawPlayer(scr.x, scr.y, 'defense', 'run', frame, 20+i, false, false) }); }
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

  // Result overlays
  if (sim.phase === 'catch' || sim.phase === 'yac' || sim.phase === 'result' || sim.phase === 'tdCelebration') {
    const ts = FIELD.toScreen(sim.ballTarget.yard, sim.ballTarget.lane);
    if (sim.success) {
      ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 20px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('✓', Math.round(ts.x) + 20, Math.round(ts.y) - 8);
    } else if (sim.isINT) {
      ctx.fillStyle = COL.uiRed; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('INT!', Math.round(ts.x) + 20, Math.round(ts.y) - 8);
    } else {
      ctx.fillStyle = COL.uiRed; ctx.font = 'bold 20px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('✗', Math.round(ts.x) + 20, Math.round(ts.y) - 8);
    }
  }

  Camera.endTransform(); Weather.drawParticles(ctx);
  if (sim.phase === 'scramble') drawScrambleUI();

  if (sim.phase === 'tdCelebration') {
    ctx.save();
    const tdAlpha = Math.min(1, sim.tdTimer / 0.3);
    ctx.globalAlpha = tdAlpha;
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 36px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('TOUCHDOWN!', W / 2, H / 2 - 30);
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(`+${sim.yardsGained} 码`, W / 2, H / 2 + 0);
    if (sim.yacYards > 5) {
      ctx.fillStyle = '#88ddff'; ctx.font = '11px "Courier New"';
      ctx.fillText(`接球后狂奔${sim.yacYards}码直接达阵！`, W / 2, H / 2 + 20);
    }
    ctx.restore();
  }

  if (sim.phase === 'sackResult') {
    drawCardFrame(ctx, W / 2 - 100, H / 2 - 40, 200, 80, false);
    ctx.fillStyle = COL.uiRed; ctx.font = 'bold 18px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('SACK!', W / 2, H / 2 - 10);
    ctx.fillStyle = COL.parchment; ctx.font = '11px "Courier New"';
    ctx.fillText(`-${sim.sackYards || 5}码`, W / 2, H / 2 + 10);
    ctx.fillStyle = '#888'; ctx.font = '8px "Courier New"'; ctx.fillText('点击继续', W / 2, H / 2 + 28);
  }

  if (sim.phase === 'result') {
    drawCardFrame(ctx, W / 2 - 120, H / 2 - 50, 240, 100, false);
    if (sim.success) {
      ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 18px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('COMPLETE!', W / 2, H / 2 - 25);
      ctx.fillStyle = COL.uiGold; ctx.font = 'bold 14px "Courier New"';
      ctx.fillText(`+${sim.yardsGained} 码`, W / 2, H / 2 - 5);
      if (sim.yacYards > 0) {
        ctx.fillStyle = '#88ddff'; ctx.font = '10px "Courier New"';
        const yacMsg = sim.yacType === 'wide_open' ? `接球后狂奔 +${sim.yacYards}码！无人可挡！` :
                       sim.yacType === 'room_to_run' ? `接球后推进 +${sim.yacYards}码` :
                       `接球后小幅推进 +${sim.yacYards}码 被拔旗`;
        ctx.fillText(yacMsg, W / 2, H / 2 + 12);
      } else if (sim.yacType === 'immediate_flag') {
        ctx.fillStyle = '#aaa'; ctx.font = '10px "Courier New"';
        ctx.fillText('接球即被拔旗', W / 2, H / 2 + 12);
      }
    } else if (sim.isINT) {
      ctx.fillStyle = COL.uiPurple; ctx.font = 'bold 18px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('INTERCEPTION!', W / 2, H / 2 - 20);
      ctx.fillStyle = '#aaa'; ctx.font = '10px "Courier New"'; ctx.fillText('对手得到7分', W / 2, H / 2 + 4);
    } else {
      ctx.fillStyle = COL.uiRed; ctx.font = 'bold 18px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('INCOMPLETE', W / 2, H / 2 - 20);
    }
    ctx.fillStyle = '#888'; ctx.font = '8px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('点击继续', W / 2, H / 2 + 36);
  }

  drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx);
}

function drawPlayResult() {
  Camera.beginTransform(); drawField(); drawRouteLines(0.15, 1); Camera.endTransform(); Weather.drawParticles(ctx);
  // Show play result summary — V15.1: use game.lastPlayResult instead of sim (which is null by now)
  const resultH = 90;
  drawPixelRect(ctx, W / 2 - 110, H / 2 - 20, 220, resultH, COL.cardBg, COL.cardBorder);
  ctx.textAlign = 'center';
  const lr = game.lastPlayResult;
  if (lr && lr.isSack) {
    ctx.fillStyle = COL.uiRed; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`💥 SACK! -${lr.sackYards || 5}码`, W / 2, H / 2);
  } else if (lr && lr.isINT) {
    ctx.fillStyle = COL.uiRed; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('🏴 INTERCEPTION!', W / 2, H / 2);
  } else if (lr && lr.success) {
    ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`✅ 接球成功！+${lr.yardsGained}码`, W / 2, H / 2);
    if (lr.yacYards > 0) {
      ctx.fillStyle = COL.uiGold; ctx.font = '11px "Courier New"';
      const yacMsg = lr.yacType === 'wide_open' ? `接球后狂奔+${lr.yacYards}码！` :
                     lr.yacType === 'room_to_run' ? `接球后推进+${lr.yacYards}码` :
                     lr.yacType === 'flag_pull' ? `被拔旗，推进+${lr.yacYards}码` : '';
      ctx.fillText(yacMsg, W / 2, H / 2 + 16);
    }
  } else {
    ctx.fillStyle = '#ff6644'; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('❌ INCOMPLETE', W / 2, H / 2);
  }
  // Show field position
  ctx.fillStyle = COL.parchment; ctx.font = '10px "Courier New"';
  ctx.fillText(`球在 ${game.ballYardLine}码线 | 第${game.downs.current}档`, W / 2, H / 2 + 38);
  ctx.fillStyle = '#888'; ctx.font = '9px "Courier New"';
  ctx.fillText('点击继续', W / 2, H / 2 + 55);
  drawTopBar(); drawPoiseRating(); drawRelicsBar(); drawScoreBug(); drawParticles(); Commentary.draw(ctx);
}

// ============================================================
// UPGRADE, EVENT, SHOP, REST, HALFTIME, TRAINING SCREENS
// ============================================================
let upgradeButtons = [];
function drawUpgradeScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 20px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('🏈 TOUCHDOWN! 🏈', W / 2, 35);
  ctx.fillStyle = COL.parchment; ctx.font = '10px "Courier New"'; ctx.fillText('选择升级', W / 2, 55);
  upgradeButtons = []; const cW2 = W - 50, cH2 = 80;
  for (let i = 0; i < upgradeOptions.length; i++) {
    const opt = upgradeOptions[i], cy = 72 + i * (cH2 + 10), cx = 25;
    const btn = { x: cx, y: cy, w: cW2, h: cH2, index: i }; upgradeButtons.push(btn);
    const ih = isInsideRect(mouseX, mouseY, cx, cy, cW2, cH2);
    const bc = opt.type === 'qb' ? COL.uiGold : opt.type === 'wr' ? COL.uiBlue : opt.type === 'relic' ? COL.uiPurple : COL.uiGreen;
    drawCardFrame(ctx, cx, cy, cW2, cH2, ih);
    ctx.fillStyle = bc; ctx.fillRect(cx + 4, cy + 4, 3, cH2 - 8);
    ctx.font = '18px serif'; ctx.textAlign = 'right'; ctx.fillText(opt.icon, cx + cW2 - 12, cy + 42);
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(opt.name, cx + 14, cy + 35);
    ctx.fillStyle = '#aaa'; ctx.font = '9px "Courier New"'; ctx.fillText(opt.desc, cx + 14, cy + 55);
  }
  drawParticles();
}

function drawEventScreen() {
  if (!currentEvent) return;
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiPink; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('📜 随机事件', W / 2, 40);
  drawCardFrame(ctx, 30, 60, W - 60, 160, false);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 13px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(currentEvent.title, W / 2, 90);
  let line = '', lineY = 120; ctx.font = '10px "Courier New"'; ctx.fillStyle = '#ccc';
  for (const ch of currentEvent.desc) {
    if (ctx.measureText(line + ch).width > W - 120) { ctx.fillText(line, W / 2, lineY); line = ch; lineY += 16; }
    else line += ch;
  }
  ctx.fillText(line, W / 2, lineY);
  genericButtons = [];
  if (currentEvent.type === 'choose_wr') {
    for (let i = 0; i < 4; i++) {
      const btn = { x: 15 + i * 114, y: 250, w: 105, h: 36, text: wrs[i].name, action: `event_wr_${i}` };
      genericButtons.push(btn); drawPixelButton(ctx, btn, isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h));
    }
  } else if (currentEvent.type === 'choose_side' && currentEvent.options) {
    for (let i = 0; i < currentEvent.options.length; i++) {
      const btn = { x: 30, y: 250 + i * 46, w: W - 60, h: 36, text: currentEvent.options[i].text, action: `event_side_${i}` };
      genericButtons.push(btn); drawPixelButton(ctx, btn, isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h));
    }
  } else if (currentEvent.type === 'relic_choice') {
    const avail = RELIC_DEFS.filter(r => !hasRelic(r.id) && relics.length < MAX_RELICS);
    if (!currentEvent._picks) currentEvent._picks = avail.sort(() => Math.random() - 0.5).slice(0, 2);
    for (let i = 0; i < currentEvent._picks.length; i++) {
      const r = currentEvent._picks[i];
      const btn = { x: 30, y: 250 + i * 46, w: W - 60, h: 36, text: `${r.icon} ${r.name}`, action: `event_relic_${i}` };
      genericButtons.push(btn); drawPixelButton(ctx, btn, isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h));
    }
  } else {
    const btn = { x: W / 2 - 60, y: 260, w: 120, h: 36, text: '继续', action: 'event_ok' };
    genericButtons.push(btn); drawPixelButton(ctx, btn, isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h));
  }
  drawParticles();
}

function drawShopScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('🏪 商店', W / 2, 30); ctx.font = '10px "Courier New"'; ctx.fillText(`💰 ${game.gold} 金币`, W / 2, 50);
  genericButtons = [];
  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i]; if (item.bought) continue;
    const cy = 65 + i * 58, cb = game.gold >= item.cost;
    const btn = { x: 25, y: cy, w: W - 50, h: 48, text: '', action: `shop_${i}` };
    genericButtons.push(btn); const ih = isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h);
    drawCardFrame(ctx, btn.x, btn.y, btn.w, btn.h, ih && cb);
    ctx.fillStyle = cb ? COL.parchment : '#555'; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(item.name, btn.x + 10, cy + 22);
    ctx.fillStyle = cb ? COL.uiGold : '#555'; ctx.textAlign = 'right'; ctx.fillText(`${item.cost}G`, btn.x + btn.w - 10, cy + 22);
  }
  const lb = { x: W / 2 - 60, y: H - 70, w: 120, h: 36, text: '离开商店', action: 'shop_leave' };
  genericButtons.push(lb); drawPixelButton(ctx, lb, isInsideRect(mouseX, mouseY, lb.x, lb.y, lb.w, lb.h));
  drawParticles();
}

function drawRestScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('💤 休息', W / 2, 100);
  ctx.fillStyle = '#ccc'; ctx.font = '11px "Courier New"';
  ctx.fillText('在场边休息了一会儿...', W / 2, 140);
  ctx.fillStyle = COL.uiGreen; ctx.font = 'bold 11px "Courier New"'; ctx.fillText('压力 -25 😌', W / 2, 175);
  genericButtons = [{ x: W / 2 - 60, y: 210, w: 120, h: 36, text: '继续', action: 'rest_ok' }];
  drawPixelButton(ctx, genericButtons[0], isInsideRect(mouseX, mouseY, genericButtons[0].x, genericButtons[0].y, 120, 36));
  drawParticles();
}

function drawTrainingScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiBlue; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('🏋️ 特训', W / 2, 40);
  ctx.fillStyle = '#ccc'; ctx.font = '10px "Courier New"'; ctx.fillText('选择一名WR进行强化训练', W / 2, 65);
  genericButtons = [];
  for (let i = 0; i < 4; i++) {
    const wr = wrs[i];
    const btn = { x: 25, y: 85 + i * 70, w: W - 50, h: 58, text: '', action: `training_wr_${i}` };
    genericButtons.push(btn); const ih = isInsideRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h);
    drawCardFrame(ctx, btn.x, btn.y, btn.w, btn.h, ih);
    ctx.fillStyle = WR_COLORS[i]; ctx.fillRect(btn.x + 4, btn.y + 4, 3, btn.h - 8);
    drawPixelPlayer(ctx, btn.x + 30, btn.y + 28, 'offense', wr.num, 'idle', Math.floor(game.time * 4), false, 0.7, null);
    ctx.fillStyle = WR_COLORS[i]; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(wr.name, btn.x + 55, btn.y + 20);
    ctx.fillStyle = '#aaa'; ctx.font = '8px "Courier New"';
    ctx.fillText(`SPD:${wr.spd} CAT:${wr.cat} RTE:${wr.rte}`, btn.x + 55, btn.y + 34);
    ctx.fillStyle = COL.uiGreen; ctx.fillText('随机属性 +10', btn.x + 55, btn.y + 48);
  }
  drawParticles();
}

function drawHalftimeScreen() {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 24px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('HALFTIME', W / 2, 40);
  const s = game.seasonStats;
  drawCardFrame(ctx, 15, 55, W / 2 - 20, 100, false);
  ctx.fillStyle = COL.uiBlue; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('上半场', W / 4, 70);
  ctx.fillStyle = '#ccc'; ctx.font = '9px "Courier New"';
  ctx.fillText(`${s.completions}/${s.attempts}`, W / 4, 88);
  ctx.fillText(`${s.yards} YDS · ${s.tds} TD`, W / 4, 104);
  const rating = calculateQBRating();
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 12px "Courier New"'; ctx.fillText(rating.toFixed(1), W / 4, 130);
  drawCardFrame(ctx, W / 2 + 5, 55, W / 2 - 20, 100, false);
  ctx.fillStyle = COL.uiRed; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('防守倾向', W * 3 / 4, 70);
  const ct = game.coverageTracker, total = ct.zone + ct.man + ct.blitz || 1;
  ctx.fillStyle = '#ccc'; ctx.font = '9px "Courier New"';
  ctx.fillText(`Zone ${Math.round(ct.zone/total*100)}% Man ${Math.round(ct.man/total*100)}% Blitz ${Math.round(ct.blitz/total*100)}%`, W * 3 / 4, 100);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('选择半场调整', W / 2, 175);
  genericButtons = [];
  for (let i = 0; i < halftimeOptions.length; i++) {
    const opt = halftimeOptions[i], bx = 20, by = 190 + i * 56, bw = W - 40, bh = 46;
    const btn = { x: bx, y: by, w: bw, h: bh, text: '', action: `halftime_${i}` };
    genericButtons.push(btn); const ih = isInsideRect(mouseX, mouseY, bx, by, bw, bh);
    drawCardFrame(ctx, bx, by, bw, bh, ih);
    ctx.font = '16px serif'; ctx.textAlign = 'left'; ctx.fillText(opt.icon, bx + 10, by + 28);
    ctx.fillStyle = COL.parchment; ctx.font = 'bold 11px "Courier New"'; ctx.fillText(opt.name, bx + 36, by + 20);
    ctx.fillStyle = '#aaa'; ctx.font = '9px "Courier New"'; ctx.fillText(opt.desc, bx + 36, by + 36);
  }
  drawParticles();
}

function drawVictoryCeremony(dt) {
  game.victoryCeremonyTimer += dt;
  Camera.beginTransform(); drawField();
  const frame = Math.floor(game.time * 6);
  for (let i = 0; i < 4; i++) {
    const scr = FIELD.toScreen(25 + Math.sin(game.time + i) * 3, 15 + i * 10);
    drawPlayer(scr.x, scr.y, 'offense', 'celebrate', frame, wrs[i].num, false, false, 1.2);
  }
  const qScr = FIELD.toScreen(22, 30);
  drawPlayer(qScr.x, qScr.y, 'offense', 'celebrate', frame, 7, true, false, 1.4);
  Camera.endTransform();
  if (Math.random() < 0.3) addParticle(Math.random() * W, 0, 'victory_confetti', 3);
  if (Math.random() < 0.05) addParticle(60 + Math.random() * (W - 120), H * 0.7, 'firework_burst', 20);
  ctx.save(); const zoom = Math.min(1, game.victoryCeremonyTimer / 0.5);
  ctx.globalAlpha = zoom; ctx.fillStyle = COL.uiGold; ctx.font = `bold ${Math.round(44*zoom)}px "Courier New"`;
  ctx.textAlign = 'center'; ctx.fillText('CHAMPION!', W / 2, H / 2 - 50);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 14px "Courier New"'; ctx.fillText('你击败了所有对手!', W / 2, H / 2 - 15);
  ctx.restore(); drawParticles();
  if (game.victoryCeremonyTimer > 3.0) { game.state = 'victory'; game.victoryCeremony = false; }
}

function drawSeasonHighlights(isVictory) {
  ctx.fillStyle = '#12100e'; ctx.fillRect(0, 0, W, H);
  if (isVictory && Math.random() < 0.08) addParticle(Math.random() * W, 0, 'victory_confetti', 2);
  const rating = calculateQBRating();
  if (!game._seasonEnded) {
    game._seasonEnded = true;
    const stats = { completions: game.seasonStats.completions, attempts: game.seasonStats.attempts,
      yards: game.seasonStats.yards, tds: game.seasonStats.tds, ints: game.seasonStats.ints, rating, isChampion: isVictory };
    game.newMilestones = Career.endSeason(stats);
    game.challengeSeedCode = SeedSystem.generateSeed();
  }
  ctx.save(); ctx.textAlign = 'center';
  if (isVictory) { ctx.fillStyle = COL.uiGold; ctx.font = 'bold 20px "Courier New"'; ctx.fillText('🏆 CHAMPION! 🏆', W / 2, 30); }
  else { ctx.fillStyle = COL.uiRed; ctx.font = 'bold 20px "Courier New"'; ctx.fillText('赛季结束', W / 2, 30); }
  ctx.restore();
  drawCardFrame(ctx, 15, 45, W - 30, 50, false);
  ctx.fillStyle = '#ccc'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'center';
  const winsF = game.seasonRecord.filter(r => r.won).length, tiesF = game.seasonRecord.filter(r => r.tied).length, lsF = game.seasonRecord.filter(r => !r.won && !r.tied).length;
  ctx.fillText(`${winsF}W${tiesF ? ' ' + tiesF + 'T' : ''} ${lsF}L | ${game.seasonStats.completions}/${game.seasonStats.attempts} ${game.seasonStats.yards}码 ${game.seasonStats.tds}TD ${game.seasonStats.ints}INT`, W / 2, 65);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 14px "Courier New"'; ctx.fillText(`QB Rating: ${rating.toFixed(1)}`, W / 2, 85);
  const plays = [...game.seasonStats.plays].sort((a, b) => b.yards - a.yards).slice(0, 3);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 9px "Courier New"'; ctx.fillText('精彩时刻', W / 2, 110);
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i]; ctx.fillStyle = i === 0 ? COL.uiGold : '#aaa'; ctx.font = '8px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(`${i+1}. G${p.gameNum}: ${p.wrName} ${p.route.toUpperCase()} ${p.yards}码${p.isTD?' TD':''}`, 30, 126 + i * 16);
  }
  if (game.newMilestones && game.newMilestones.length > 0) {
    ctx.fillStyle = COL.uiGold; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('🎉 新成就!', W / 2, 186);
    for (let i = 0; i < game.newMilestones.length; i++) { ctx.fillStyle = COL.parchment; ctx.font = '9px "Courier New"'; ctx.fillText(`${game.newMilestones[i].icon} ${game.newMilestones[i].label}`, W / 2, 202 + i * 14); }
  }
  const cY = 220 + (game.newMilestones ? game.newMilestones.length * 14 : 0);
  drawCardFrame(ctx, 40, cY, W - 80, 42, false);
  ctx.fillStyle = COL.uiGold; ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('挑战码', W / 2, cY + 14);
  ctx.fillStyle = COL.parchment; ctx.font = 'bold 14px "Courier New"'; ctx.fillText(game.challengeSeedCode, W / 2, cY + 32);
  genericButtons = [];
  const copyBtn = { x: W/2-110, y: cY+52, w: 100, h: 30, text: '📋 复制', action: 'copy_seed' };
  const restartBtn = { x: W/2+10, y: cY+52, w: 100, h: 30, text: '🔄 再来', action: 'restart' };
  genericButtons.push(copyBtn, restartBtn);
  drawPixelButton(ctx, copyBtn, isInsideRect(mouseX, mouseY, copyBtn.x, copyBtn.y, copyBtn.w, copyBtn.h));
  drawPixelButton(ctx, restartBtn, isInsideRect(mouseX, mouseY, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h));
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
document.addEventListener('keydown', e => {
  if (showChallengeInput) {
    if (e.key === 'Backspace') challengeInput = challengeInput.slice(0, -1);
    else if (e.key === 'Enter') { if (SeedSystem.applySeed(challengeInput)) { showChallengeInput = false; startNewGame(); } }
    else if (e.key === 'Escape') { showChallengeInput = false; challengeInput = ''; }
    else if (e.key.length === 1 && challengeInput.length < 12) challengeInput += e.key.toUpperCase();
  }
});

function handleClick(e) {
  const pos = e.touches ? { x: mouseX, y: mouseY } : getCanvasPos(e);
  SFX.play('click');
  switch (game.state) {
    case 'title':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'start') startNewGame();
          else if (btn.action === 'challenge') { showChallengeInput = true; challengeInput = ''; }
          else if (btn.action === 'challenge_go') { if (SeedSystem.applySeed(challengeInput)) { showChallengeInput = false; startNewGame(); } }
          else if (btn.action === 'challenge_cancel') { showChallengeInput = false; challengeInput = ''; }
        }
      }
      break;
    case 'seasonMap':
      for (const btn of mapButtons) { if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) { startGame(btn.gameIdx); return; } }
      break;
    case 'betweenGame':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'between_rest') { reduceStress(25); game.downs.current = 1; game.ballYardLine = 5; game.firstDownLine = 25; game.state = 'rest'; }
          else if (btn.action === 'between_shop') { generateShop(); game.state = 'shop'; }
          else if (btn.action === 'between_event') { currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)]; game.state = 'event'; }
          else if (btn.action === 'between_training') { game.state = 'training'; }
          else if (btn.action === 'between_skip') { game.state = 'seasonMap'; }
          return;
        }
      }
      break;
    case 'reading':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'audible' && game.audiblesLeft > 0) { game.audiblesLeft--; SFX.play('audible'); audibleAnim.active = true; audibleAnim.timer = 0; Commentary.generate('audible'); Camera.shake(3); generatePlay(currentPlay && currentPlay.isElite, currentPlay && currentPlay.isBoss); game.readingTimer = 0; motionAnimPhase = 'idle'; motionAnimTimer = 0; return; }
          if (btn.action === 'motion' && !game.motionUsed && motionAnimPhase === 'idle') { motionAnimPhase = 'moving'; motionAnimTimer = 0; motionWROrigLane = currentPlay.offense.wrs[currentPlay.motionWR].lane; SFX.play('motion_slide'); return; }
          if (btn.action === 'ice_whistle' && hasRelic('ice_whistle') && !game.iceFreezeUsed) { game.iceFreezeUsed = true; game.scoutReport = true; game.filmStudyFloorsLeft = 1; Commentary.show('🧊 冰冻口哨！防守阵型暴露！', 2); return; }
        }
      }
      break;
    case 'choosing':
      for (const btn of cardButtons) { if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) { startSimulation(btn.wrIndex); passTypeTimer = 0; return; } }
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
    case 'playResult':
      generatePlay(false, false); game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0; genericButtons = []; motionAnimPhase = 'idle'; motionAnimTimer = 0; break;
    case 'upgrade':
      for (const btn of upgradeButtons) { if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) { applyUpgrade(btn.index); game.scoutReport = false; if (game.filmStudyFloorsLeft > 0) game.filmStudyFloorsLeft--; game.state = 'seasonMap'; return; } }
      break;
    case 'halftime':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h) && btn.action.startsWith('halftime_')) {
          const idx = parseInt(btn.action.split('_')[1]); halftimeOptions[idx].apply(); addParticle(W/2,200,'confetti',15); SFX.play('level_up');
          // V17: Reset ball position for second half kickoff
          game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
          game.gameClockRunning = true;
          generatePlay(false, false); game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0; motionAnimPhase = 'idle'; motionAnimTimer = 0; return;
        }
      }
      break;
    case 'event':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'event_ok') { if (currentEvent.type === 'instant') currentEvent.effect(); currentEvent = null; game.state = 'seasonMap'; }
          else if (btn.action.startsWith('event_wr_')) { const wi = parseInt(btn.action.split('_')[2]); currentEvent.effect(wi); currentEvent = null; game.state = 'seasonMap'; }
          else if (btn.action.startsWith('event_side_')) { const si = parseInt(btn.action.split('_')[2]); currentEvent.options[si].effect(); currentEvent = null; game.state = 'seasonMap'; }
          else if (btn.action.startsWith('event_relic_')) { const ri = parseInt(btn.action.split('_')[2]); if (currentEvent._picks && currentEvent._picks[ri]) relics.push(currentEvent._picks[ri]); currentEvent = null; game.state = 'seasonMap'; }
          return;
        }
      }
      break;
    case 'shop':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h)) {
          if (btn.action === 'shop_leave') game.state = 'seasonMap';
          else if (btn.action.startsWith('shop_')) { const idx = parseInt(btn.action.split('_')[1]); if (shopItems[idx] && !shopItems[idx].bought && game.gold >= shopItems[idx].cost) { game.gold -= shopItems[idx].cost; shopItems[idx].apply(); shopItems[idx].bought = true; addParticle(W/2,200,'confetti',10); } }
          return;
        }
      }
      break;
    case 'rest':
      for (const btn of genericButtons) { if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h) && btn.action === 'rest_ok') { game.state = 'seasonMap'; return; } }
      break;
    case 'training':
      for (const btn of genericButtons) {
        if (isInsideRect(pos.x, pos.y, btn.x, btn.y, btn.w, btn.h) && btn.action.startsWith('training_wr_')) {
          const wi = parseInt(btn.action.split('_')[2]); const stats = ['spd','cat','rte']; wrs[wi][stats[Math.floor(Math.random()*3)]] += 10;
          addParticle(W/2,200,'confetti',12); SFX.play('level_up'); game.state = 'seasonMap'; return;
        }
      }
      break;
    case 'victoryCeremony': if (game.victoryCeremonyTimer > 1.0) { game.state = 'victory'; game.victoryCeremony = false; } break;
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
  Career.load(); const legacyBonus = Career.getLegacyBonus();
  game.state = 'seasonMap'; game.ballYardLine = 5; game.downs = { current: 1, max: 4 };
  game.firstDownLine = 25; game.score = 0;
  game.gameNum = 1; game.losses = 0; game.stress = 0; game.gold = 100;
  game.audiblesLeft = 1; game.weatherDebuff = 0; game.scoutReport = false;
  game.readingPhase = false; game.readingTimer = 0; game.weatherType = 'normal';
  game.playCount = 0; game.driveYards = 0; game.drivePlays = 0;
  game.highlightTimer = 0; game.scoreAnimTarget = 0; game.scoreAnimCurrent = 0;
  game.motionUsed = false; game.motionResult = null; game.passType = 'touch';
  game.seasonStats = { completions: 0, attempts: 0, yards: 0, tds: 0, ints: 0, sacks: 0, plays: [] };
  game.adaptiveTracker = { wrPicks: [0,0,0,0], routePicks: {} };
  game.victoryCeremony = false; game.victoryCeremonyTimer = 0;
  game.wrTrust = [50,50,50,50]; game.halftimeShown = false; game.halftimeAdjustment = null;
  game.coverageTracker = { zone: 0, man: 0, blitz: 0 };
  game.newMilestones = []; game.challengeSeedCode = '';
  game.composureRecoveryBonus = 0; game.filmStudyFloorsLeft = 0; game.playBookExpanded = false;
  game._seasonEnded = false; game.gameScore = { player: 0, opponent: 0 }; game.gameClock = 360; game.gameClockRunning = false;
  game.starAbilityUsed = {}; game.disguisesLeft = 3; game.teamWrPicks = [0,0,0,0]; game.seasonRecord = [];
  game.iceFreezeUsed = false; game.betweenGamePhase = 'none';
  if (!SeedSystem.isChallenge) { game.mapSeed = Math.floor(Math.random()*100000); game.weatherSeed = Math.floor(Math.random()*100000); }
  qb = { accuracy: 70 + legacyBonus, arm: 60, readSpeed: 0, level: 1 };
  wrs = [ { id:0, name:'王牌', spd:60, cat:65, rte:60, lvl:1, num:81 }, { id:1, name:'闪击', spd:55, cat:60, rte:65, lvl:1, num:88 }, { id:2, name:'疾风', spd:65, cat:55, rte:55, lvl:1, num:13 }, { id:3, name:'铁塔', spd:50, cat:70, rte:60, lvl:1, num:84 } ];
  relics = []; defenseBonus = 0; consecutiveCatches = 0; particles = [];
  fieldTexture = null; Camera.reset(); Replay.reset();
  TimeScale.target = 1; TimeScale.current = 1;
  motionAnimPhase = 'idle'; motionAnimTimer = 0; passTypeTimer = 0; audibleAnim = { active: false, timer: 0 };
  Commentary.lines = []; Weather.initParticles();
  showChallengeInput = false; challengeInput = '';
  generateSeasonMap(); SeedSystem.isChallenge = false;
}

function startGame(gameIdx) {
  game.ballYardLine = 5; game.downs.current = 1; game.firstDownLine = 25;
  game.gameClock = 360; game.gameClockRunning = true; game.gameScore = { player: 0, opponent: 0 };
  game.halftimeShown = false; game.teamWrPicks = [0,0,0,0];
  game.audiblesLeft = 1 + (hasRelic('audible_master') ? 1 : 0);
  game.iceFreezeUsed = false; game.disguisesLeft = 3;
  game.driveYards = 0; game.drivePlays = 0;
  game.coverageTracker = { zone: 0, man: 0, blitz: 0 };
  game.motionUsed = false; game.motionResult = null;
  motionAnimPhase = 'idle'; motionAnimTimer = 0;
  defenseBonus = Math.max(0, (game.gameNum - 1) * 4);
  game.weatherType = Weather.getWeatherForGame(game.gameNum);
  generatePlay(false, false);
  game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0; genericButtons = [];
  SFX.play('dc_intro');
  const team = getCurrentTeam();
  Commentary.show(`本场对手: ${team.name} — ${team.desc}`, 4);
  if (team.stars && team.stars[0]) setTimeout(() => Commentary.show(`注意 #${team.stars[0].num} ${team.stars[0].name}: ${team.stars[0].desc}`, 4), 2000);
}

// ============================================================
// LOADING & MAIN LOOP
// ============================================================
let isLoading = true, lastTime = 0;
function initGame() {
  Career.load();
  const lf = document.getElementById('loadFill'), lt = document.getElementById('loadText');
  if (lt) lt.textContent = '生成像素球场...'; if (lf) lf.style.width = '30%';
  generateFieldTexture();
  if (lt) lt.textContent = '准备完毕...'; if (lf) lf.style.width = '100%';
  generateVignette(); Weather.initParticles();
  setTimeout(() => { const ls = document.getElementById('loadingScreen'); if (ls) ls.style.display = 'none'; isLoading = false; }, 300);
}
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); lastTime = timestamp;
  game.time += dt; game.animTimer += dt;
  if (game.animTimer > 0.12) { game.animFrame = (game.animFrame + 1) % 8; game.animTimer = 0; }
  updateParticles(dt); updateShake(); Camera.update(dt); Commentary.update(dt); Weather.update(dt);
  if (game.gameClockRunning && (game.state === 'reading' || game.state === 'choosing' || game.state === 'passType' || game.state === 'simulation' || game.state === 'playResult')) {
    game.gameClock = Math.max(0, game.gameClock - dt);
  }
  ctx.clearRect(0, 0, W, H);
  if (screenShake.x !== 0 || screenShake.y !== 0) { ctx.save(); ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y)); }
  if (!isLoading) {
    switch (game.state) {
      case 'title': drawTitle(dt); break;
      case 'seasonMap': drawSeasonMapScreen(); break;
      case 'betweenGame': drawBetweenGameScreen(); break;
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
      case 'training': drawTrainingScreen(); break;
      case 'victoryCeremony': drawVictoryCeremony(dt); break;
      case 'gameOver': drawGameOver(); break;
      case 'victory': drawVictory(); break;
    }
    PostFX.apply(ctx, W, H);
  }
  if (screenShake.x !== 0 || screenShake.y !== 0) ctx.restore();
  requestAnimationFrame(gameLoop);
}
setTimeout(initGame, 100);
requestAnimationFrame(gameLoop);
