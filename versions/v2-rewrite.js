// ============================================================
// QB Challenge v2 - 像素腰旗橄榄球 Roguelike
// Creative Director Review: Full rewrite with juice, depth, style
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Canvas Setup ---
const W = 540;
const H = 720;
canvas.width = W;
canvas.height = H;

function resizeCanvas() {
    const maxH = window.innerHeight - 10;
    const maxW = window.innerWidth - 10;
    const ratio = W / H;
    let cw, ch;
    if (maxW / maxH > ratio) { ch = maxH; cw = ch * ratio; }
    else { cw = maxW; ch = cw / ratio; }
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================
// SOUND ENGINE (Web Audio API - 8-bit)
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

function playSound(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    switch(type) {
        case 'snap':
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.06);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
            break;
        case 'throw':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
            break;
        case 'catch':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
            const osc2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            osc2.connect(g2); g2.connect(audioCtx.destination);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(659, now + 0.1);
            g2.gain.setValueAtTime(0.12, now + 0.1);
            g2.gain.linearRampToValueAtTime(0, now + 0.25);
            osc2.start(now + 0.1); osc2.stop(now + 0.25);
            break;
        case 'fail':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(120, now + 0.25);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
            break;
        case 'td':
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g); g.connect(audioCtx.destination);
                o.type = 'square';
                o.frequency.setValueAtTime(freq, now + i * 0.12);
                g.gain.setValueAtTime(0.1, now + i * 0.12);
                g.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.15);
                o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.15);
            });
            break;
        case 'select':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.linearRampToValueAtTime(660, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
            break;
        case 'tick':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.03);
            osc.start(now); osc.stop(now + 0.03);
            break;
        case 'warning':
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.setValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
            break;
    }
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
let particles = [];

function spawnParticles(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = speed * (0.5 + Math.random() * 0.5);
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - speed * 0.3,
            life: life * (0.7 + Math.random() * 0.3),
            maxLife: life,
            color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
            size: size || 2,
            gravity: 0.15,
        });
    }
}

function spawnConfetti(x, y) {
    const colors = ['#ffd700', '#e94560', '#2ecc71', '#5dade2', '#fff', '#f39c12'];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 200,
            y: y - 50,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 4 - 1,
            life: 2 + Math.random(),
            maxLife: 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 2 + Math.floor(Math.random() * 3),
            gravity: 0.08,
        });
    }
}

function spawnTrail(x, y, color) {
    particles.push({
        x, y, vx: 0, vy: 0,
        life: 0.15, maxLife: 0.15,
        color, size: 3, gravity: 0,
    });
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x) - p.size/2, Math.round(p.y) - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// ============================================================
// SCREEN SHAKE
// ============================================================
let shake = { x: 0, y: 0, intensity: 0, duration: 0, timer: 0 };

function triggerShake(intensity, duration) {
    shake.intensity = intensity;
    shake.duration = duration;
    shake.timer = 0;
}

function updateShake(dt) {
    if (shake.timer < shake.duration) {
        shake.timer += dt;
        const progress = shake.timer / shake.duration;
        const decay = 1 - progress;
        shake.x = (Math.random() - 0.5) * 2 * shake.intensity * decay;
        shake.y = (Math.random() - 0.5) * 2 * shake.intensity * decay;
    } else {
        shake.x = 0;
        shake.y = 0;
    }
}

// ============================================================
// CAMERA
// ============================================================
let camera = { x: 0, y: 0, zoom: 1, targetY: 0, targetZoom: 1, breathTimer: 0 };

function updateCamera(dt) {
    camera.breathTimer += dt;
    // Breathing sway in choosing phase
    if (gameState === 'preSnap' || gameState === 'choosing') {
        camera.y = Math.sin(camera.breathTimer * 1.5) * 1;
    }
    // Smooth follow
    camera.y += (camera.targetY - camera.y) * 0.05;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.05;
}

// ============================================================
// CONSTANTS & COLORS
// ============================================================
const LOS_Y = 420;
const ENDZONE_Y = 80;
const ENDZONE_H = 80;
const YARD_PX = 16;

const PAL = {
    field1: '#2d8a4e', field2: '#3ca55e',
    fieldDark1: '#267a43', fieldDark2: '#33994d',
    endzone1: '#8B2252', endzone2: '#a02a62',
    line: '#ffffff', lineGhost: 'rgba(255,255,255,0.25)',
    losLine: '#ffff44',
    firstDown: '#ff7722',
    offBody: '#1B3A5C', offLight: '#5B9BD5', offWhite: '#F0F0F0',
    defBody: '#8B2252', defLight: '#E74C3C', defDark: '#1A1A1A',
    qbGold: '#D4A017', qbBody: '#1B3A5C',
    ball: '#8B4513', ballLace: '#fff',
    skin: '#fdd5b1',
    highlight: '#ffd700',
    good: '#2ecc71', bad: '#e74c3c',
    hud: '#0a0a2a', hudBorder: '#e94560',
    accent: '#e94560', gold: '#ffd700',
    dark: 'rgba(0,0,0,0.75)',
    cardBg: '#0f1a3a', cardBorder: '#2a4080',
};

// ============================================================
// GAME STATE
// ============================================================
let gameState = 'title';
let currentLevel = 1;
const maxLevel = 10;
let score = 0;
let downs = { current: 1, yardsToGo: 20, ballPosition: 0 };

// Read timer
let readTimer = 0;
let readTimerMax = 4.0;
let readTimerWarning = false;

// QB stats
let qbStats = { accuracy: 70, armStrength: 60, readSpeed: 0, level: 1 };

// WR stats
let wrStats = [
    { id: 0, name: 'WR1', speed: 60, catching: 65, routeRunning: 60, level: 1 },
    { id: 1, name: 'WR2', speed: 55, catching: 60, routeRunning: 65, level: 1 },
    { id: 2, name: 'WR3', speed: 65, catching: 55, routeRunning: 55, level: 1 },
    { id: 3, name: 'WR4', speed: 50, catching: 70, routeRunning: 60, level: 1 },
];

// Relics
let relics = [];

// Buffs/debuffs
let defBuffs = [];
let offDebuffs = [];

// Defense disguise
let defenseDisguised = false;
let defenseRealFormation = null;
let defenseShownFormation = null;

function getDefenseBonus() {
    return (currentLevel - 1) * 6 + defBuffs.reduce((s, b) => s + b.value, 0);
}

function getReadTimerMax() {
    let base = Math.max(2.0, 4.0 - (currentLevel - 1) * 0.2);
    base += qbStats.readSpeed * 0.15;
    if (hasRelic('filmStudy')) base += 0.5;
    return base;
}

function hasRelic(id) {
    return relics.some(r => r.id === id);
}

// ============================================================
// FORMATIONS
// ============================================================
const offenseFormations = [
    {
        name: 'Shotgun Spread',
        qb: { x: 270, y: LOS_Y + 50 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'streak' },
            { x: 160, y: LOS_Y + 10, route: 'slant' },
            { x: 380, y: LOS_Y + 10, route: 'out' },
            { x: 480, y: LOS_Y - 5,  route: 'post' },
        ]
    },
    {
        name: 'Trips Right',
        qb: { x: 220, y: LOS_Y + 50 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'curl' },
            { x: 340, y: LOS_Y + 5,  route: 'slant' },
            { x: 400, y: LOS_Y - 5,  route: 'out' },
            { x: 460, y: LOS_Y + 5,  route: 'streak' },
        ]
    },
    {
        name: 'Trips Left',
        qb: { x: 320, y: LOS_Y + 50 },
        wrs: [
            { x: 80,  y: LOS_Y + 5,  route: 'streak' },
            { x: 140, y: LOS_Y - 5,  route: 'out' },
            { x: 200, y: LOS_Y + 5,  route: 'slant' },
            { x: 480, y: LOS_Y - 5,  route: 'curl' },
        ]
    },
    {
        name: 'Bunch Right',
        qb: { x: 220, y: LOS_Y + 50 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'post' },
            { x: 360, y: LOS_Y + 5,  route: 'flat' },
            { x: 385, y: LOS_Y - 12, route: 'slant' },
            { x: 410, y: LOS_Y + 5,  route: 'streak' },
        ]
    },
    {
        name: 'Empty Wide',
        qb: { x: 270, y: LOS_Y + 55 },
        wrs: [
            { x: 50,  y: LOS_Y - 5,  route: 'streak' },
            { x: 170, y: LOS_Y + 5,  route: 'drag' },
            { x: 370, y: LOS_Y + 5,  route: 'drag' },
            { x: 490, y: LOS_Y - 5,  route: 'streak' },
        ]
    },
    {
        name: 'Slot Left',
        qb: { x: 290, y: LOS_Y + 50 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'post' },
            { x: 170, y: LOS_Y + 5,  route: 'slant' },
            { x: 390, y: LOS_Y + 5,  route: 'curl' },
            { x: 490, y: LOS_Y - 5,  route: 'out' },
        ]
    },
    {
        name: 'Doubles',
        qb: { x: 270, y: LOS_Y + 50 },
        wrs: [
            { x: 70,  y: LOS_Y - 5,  route: 'corner' },
            { x: 160, y: LOS_Y + 8,  route: 'flat' },
            { x: 380, y: LOS_Y + 8,  route: 'slant' },
            { x: 470, y: LOS_Y - 5,  route: 'post' },
        ]
    },
];

const defenseFormations = [
    {
        name: 'Cover 1', desc: '人盯人 + 自由安全卫',
        rusher: { x: 270, y: LOS_Y - 15 },
        dbs: [
            { x: 80,  y: LOS_Y - 50, role: 'man', coverIdx: 0 },
            { x: 200, y: LOS_Y - 50, role: 'man', coverIdx: 1 },
            { x: 340, y: LOS_Y - 50, role: 'man', coverIdx: 2 },
            { x: 450, y: LOS_Y - 50, role: 'free', coverIdx: -1 },
        ]
    },
    {
        name: 'Cover 2 Zone', desc: '两深区域防守',
        rusher: { x: 270, y: LOS_Y - 15 },
        dbs: [
            { x: 140, y: LOS_Y - 110, role: 'deep', coverIdx: -1 },
            { x: 400, y: LOS_Y - 110, role: 'deep', coverIdx: -1 },
            { x: 160, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
            { x: 380, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
        ]
    },
    {
        name: 'Cover 3', desc: '三深区域防守',
        rusher: { x: 270, y: LOS_Y - 15 },
        dbs: [
            { x: 110, y: LOS_Y - 120, role: 'deep', coverIdx: -1 },
            { x: 270, y: LOS_Y - 130, role: 'deep', coverIdx: -1 },
            { x: 430, y: LOS_Y - 120, role: 'deep', coverIdx: -1 },
            { x: 270, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
        ]
    },
    {
        name: 'Cover 4', desc: '四深区域防守',
        rusher: { x: 270, y: LOS_Y - 15 },
        dbs: [
            { x: 90,  y: LOS_Y - 100, role: 'deep', coverIdx: -1 },
            { x: 210, y: LOS_Y - 100, role: 'deep', coverIdx: -1 },
            { x: 330, y: LOS_Y - 100, role: 'deep', coverIdx: -1 },
            { x: 450, y: LOS_Y - 100, role: 'deep', coverIdx: -1 },
        ]
    },
    {
        name: 'Man Blitz', desc: '全人盯人 + 快速冲传',
        rusher: { x: 270, y: LOS_Y - 10, fast: true },
        dbs: [
            { x: 90,  y: LOS_Y - 30, role: 'man', coverIdx: 0 },
            { x: 200, y: LOS_Y - 30, role: 'man', coverIdx: 1 },
            { x: 340, y: LOS_Y - 30, role: 'man', coverIdx: 2 },
            { x: 450, y: LOS_Y - 30, role: 'man', coverIdx: 3 },
        ]
    },
    {
        name: 'Cover 6', desc: '混合区域防守',
        rusher: { x: 270, y: LOS_Y - 15 },
        dbs: [
            { x: 110, y: LOS_Y - 110, role: 'deep', coverIdx: -1 },
            { x: 430, y: LOS_Y - 90,  role: 'deep', coverIdx: -1 },
            { x: 160, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
            { x: 380, y: LOS_Y - 60,  role: 'deep', coverIdx: -1 },
        ]
    },
];

const routePaths = {
    streak:  (sx, sy) => [{ x: sx, y: sy - 180 }],
    slant:   (sx, sy) => [{ x: sx + (sx < 270 ? 70 : -70), y: sy - 110 }],
    out:     (sx, sy) => [{ x: sx, y: sy - 65 }, { x: sx + (sx < 270 ? -80 : 80), y: sy - 65 }],
    post:    (sx, sy) => [{ x: sx, y: sy - 75 }, { x: sx + (sx < 270 ? 60 : -60), y: sy - 175 }],
    curl:    (sx, sy) => [{ x: sx, y: sy - 90 }, { x: sx + (sx < 270 ? -15 : 15), y: sy - 78 }],
    flat:    (sx, sy) => [{ x: sx + (sx < 270 ? -55 : 55), y: sy - 20 }],
    drag:    (sx, sy) => [{ x: sx + (sx < 270 ? 140 : -140), y: sy - 30 }],
    corner:  (sx, sy) => [{ x: sx, y: sy - 65 }, { x: sx + (sx < 270 ? -70 : 70), y: sy - 155 }],
    seam:    (sx, sy) => [{ x: sx + (sx < 270 ? 20 : -20), y: sy - 170 }],
};

// Route concepts - named combos
const routeConcepts = [
    { name: 'Mesh', routes: ['drag', 'drag', 'streak', 'curl'], desc: '交叉穿越克制人盯人' },
    { name: 'Flood', routes: ['flat', 'out', 'corner', 'streak'], desc: '同侧多层淹没区域防守' },
    { name: 'Four Verts', routes: ['streak', 'seam', 'seam', 'streak'], desc: '四路纵深攻击' },
    { name: 'Smash', routes: ['curl', 'corner', 'slant', 'streak'], desc: '高低配合' },
    { name: 'Drive', routes: ['drag', 'slant', 'out', 'post'], desc: '短传推进' },
];

// ============================================================
// PLAY GENERATION & EVALUATION
// ============================================================
let currentPlay = null;
let hoveredWR = -1;

function generatePlay() {
    const offIdx = Math.floor(Math.random() * offenseFormations.length);
    let defIdx = Math.floor(Math.random() * defenseFormations.length);

    // Limit formations by level
    if (currentLevel < 3) defIdx = defIdx % 5; // no Cover 6 early
    if (currentLevel < 5) defIdx = defIdx % 5;

    const offense = JSON.parse(JSON.stringify(offenseFormations[offIdx]));
    const defense = JSON.parse(JSON.stringify(defenseFormations[defIdx]));

    // Apply route concept randomly
    if (Math.random() < 0.4) {
        const concept = routeConcepts[Math.floor(Math.random() * routeConcepts.length)];
        for (let i = 0; i < 4; i++) {
            offense.wrs[i].route = concept.routes[i];
        }
    }

    // Man coverage: remap coverIdx based on WR positions
    if (defense.dbs.some(db => db.role === 'man')) {
        const manDBs = defense.dbs.filter(db => db.role === 'man');
        const wrOrder = offense.wrs.map((w, i) => ({ ...w, idx: i })).sort((a, b) => a.x - b.x);
        manDBs.forEach((db, i) => {
            if (i < wrOrder.length) {
                db.coverIdx = wrOrder[i].idx;
                db.x = offense.wrs[wrOrder[i].idx].x;
                db.y = offense.wrs[wrOrder[i].idx].y - 35;
            }
        });
    }

    // Disguise system (level 5+)
    defenseDisguised = false;
    defenseRealFormation = defense;
    defenseShownFormation = defense;

    if (currentLevel >= 5 && Math.random() < 0.3 + (currentLevel - 5) * 0.1) {
        defenseDisguised = true;
        // Show a different formation pre-snap
        let fakeIdx = (defIdx + 1 + Math.floor(Math.random() * 3)) % defenseFormations.length;
        if (currentLevel < 6) fakeIdx = fakeIdx % 5;
        defenseShownFormation = JSON.parse(JSON.stringify(defenseFormations[fakeIdx]));
        // Remap man coverage for shown formation
        if (defenseShownFormation.dbs.some(db => db.role === 'man')) {
            const manDBs = defenseShownFormation.dbs.filter(db => db.role === 'man');
            const wrOrder = offense.wrs.map((w, i) => ({ ...w, idx: i })).sort((a, b) => a.x - b.x);
            manDBs.forEach((db, i) => {
                if (i < wrOrder.length) {
                    db.coverIdx = wrOrder[i].idx;
                    db.x = offense.wrs[wrOrder[i].idx].x;
                    db.y = offense.wrs[wrOrder[i].idx].y - 35;
                }
            });
        }
    }

    // Calculate scores
    const wrScores = evaluateReceivers(offense, defense);
    const bestWR = wrScores.indexOf(Math.max(...wrScores));

    currentPlay = { offense, defense, bestWR, wrScores, offIdx, defIdx };

    // Setup read timer
    readTimerMax = getReadTimerMax();
    readTimer = readTimerMax;
    readTimerWarning = false;

    hoveredWR = -1;
    return currentPlay;
}

function evaluateReceivers(offense, defense) {
    const scores = [];
    const defBonus = getDefenseBonus();

    for (let i = 0; i < 4; i++) {
        const wr = offense.wrs[i];
        const wrStat = wrStats[i];
        const routeEnd = getRouteEndpoint(wr);

        let openness = wrStat.speed * 0.3 + wrStat.routeRunning * 0.4 + wrStat.catching * 0.3;
        let debuffReduction = offDebuffs.reduce((s, d) => s + d.value, 0);

        // Relic bonuses
        if (hasRelic('magnetGloves')) openness += 10;
        if (hasRelic('ghostStep') && Math.random() < 0.15) openness += 30;

        let closestDefDist = Infinity;
        for (const db of defense.dbs) {
            if (db.role === 'man' && db.coverIdx === i) {
                closestDefDist = Math.min(closestDefDist, 15);
            } else if (db.role === 'man') {
                continue;
            } else {
                const defTarget = getZonePosition(db, routeEnd);
                const dx = routeEnd.x - defTarget.x;
                const dy = routeEnd.y - defTarget.y;
                closestDefDist = Math.min(closestDefDist, Math.sqrt(dx * dx + dy * dy));
            }
        }

        if (closestDefDist < 30) openness -= (40 - closestDefDist) * 1.5;
        else if (closestDefDist > 60) openness += (closestDefDist - 60) * 0.5;

        openness -= (defBonus - debuffReduction) * 0.5;

        // Route vs coverage bonuses
        const hasDeep = defense.dbs.some(db => db.role === 'deep');
        const hasFlat = defense.dbs.some(db => db.role === 'flat');
        const isMan = defense.dbs.some(db => db.role === 'man');

        if (wr.route === 'streak' && !hasDeep) openness += 25;
        if (wr.route === 'slant' && !hasFlat) openness += 15;
        if (wr.route === 'flat' && !hasFlat) openness += 20;
        if (wr.route === 'drag' && isMan) openness += 18; // drags beat man
        if (wr.route === 'drag' && !hasFlat) openness += 12;
        if (wr.route === 'out' && hasDeep && !hasFlat) openness += 15;
        if (wr.route === 'post' && !hasDeep) openness += 22;
        if (wr.route === 'curl' && hasDeep) openness += 10;
        if (wr.route === 'corner' && !hasDeep) openness += 20;
        if (wr.route === 'seam' && !hasDeep) openness += 18;

        openness += (Math.random() - 0.5) * 8;
        scores.push(Math.max(0, openness));
    }
    return scores;
}

function getRouteEndpoint(wr) {
    const path = routePaths[wr.route](wr.x, wr.y);
    return path[path.length - 1];
}

function getZonePosition(db, targetPos) {
    if (db.role === 'deep') return { x: db.x + (targetPos.x - db.x) * 0.4, y: Math.min(db.y, targetPos.y) };
    if (db.role === 'flat') return { x: db.x + (targetPos.x - db.x) * 0.6, y: db.y + (targetPos.y - db.y) * 0.3 };
    if (db.role === 'free') return { x: db.x + (targetPos.x - db.x) * 0.3, y: db.y + (targetPos.y - db.y) * 0.2 };
    return { x: db.x, y: db.y };
}

function calculateCatchProb(wrIndex) {
    const wr = wrStats[wrIndex];
    const play = currentPlay;
    const sc = play.wrScores[wrIndex];
    const maxSc = Math.max(...play.wrScores);

    let prob = 40;
    if (wrIndex === play.bestWR) prob += 35;
    else prob += Math.max(0, 20 * (sc / maxSc));

    prob += (qbStats.accuracy - 60) * 0.3;
    prob += (wr.catching - 50) * 0.2;

    const routeEnd = getRouteEndpoint(currentPlay.offense.wrs[wrIndex]);
    const throwDist = Math.abs(routeEnd.y - LOS_Y);
    if (throwDist > 100) prob += (qbStats.armStrength - 60) * 0.3;

    // Read timer penalty: if timer ran out, reduce probability
    if (readTimer <= 0) prob -= 20;
    else if (readTimer < readTimerMax * 0.25) prob -= 10;

    // Relic effects
    if (hasRelic('magnetGloves')) prob += 12;
    if (hasRelic('gamblerHeart')) prob = 50; // always 50/50

    return Math.max(5, Math.min(95, prob));
}

// ============================================================
// SIMULATION
// ============================================================
let simState = null;

function startSimulation(chosenWR) {
    initAudio();
    const play = currentPlay;
    const wr = play.offense.wrs[chosenWR];
    const routeEndpoint = getRouteEndpoint(wr);
    const catchProb = calculateCatchProb(chosenWR);
    const success = Math.random() * 100 < catchProb;

    let yardsGained = 0;
    if (success) {
        yardsGained = Math.round(Math.abs(routeEndpoint.y - LOS_Y) / YARD_PX) + Math.floor(Math.random() * 5);
        if (hasRelic('yacMaster')) yardsGained += 3 + Math.floor(Math.random() * 5);
        if (hasRelic('gamblerHeart')) yardsGained *= 2;
    }

    // Use real defense positions for simulation (if disguised)
    const realDef = defenseRealFormation;

    simState = {
        phase: 'snap',
        timer: 0,
        chosenWR,
        success,
        catchProb,
        yardsGained,
        wrPositions: play.offense.wrs.map(w => ({ x: w.x, y: w.y })),
        dbPositions: realDef.dbs.map(db => ({ x: db.x, y: db.y })),
        rusherPos: { x: realDef.rusher.x, y: realDef.rusher.y },
        qbPos: { x: play.offense.qb.x, y: play.offense.qb.y },
        ballPos: null,
        ballTarget: null,
        routeProgress: 0,
        throwProgress: 0,
        slowMo: false,
        slowMoTimer: 0,
    };

    playSound('snap');
    triggerShake(2, 0.1);
    camera.targetY = -15;
    camera.targetZoom = 1.02;
    gameState = 'simulation';
}

function updateSimulation(dt) {
    if (!simState) return;

    // Slow-mo effect during throw
    let effectiveDt = dt;
    if (simState.slowMo) {
        simState.slowMoTimer += dt;
        if (simState.slowMoTimer < 0.4) effectiveDt = dt * 0.3;
        else { simState.slowMo = false; effectiveDt = dt * 1.5; }
    }

    simState.timer += effectiveDt;

    switch (simState.phase) {
        case 'snap':
            if (simState.timer > 0.25) {
                simState.phase = 'routes';
                simState.timer = 0;
            }
            break;

        case 'routes':
            simState.routeProgress = Math.min(1, simState.timer / 1.0);

            for (let i = 0; i < 4; i++) {
                const wr = currentPlay.offense.wrs[i];
                const path = routePaths[wr.route](wr.x, wr.y);
                const totalPts = path.length;
                const segProg = simState.routeProgress * totalPts;
                const segIdx = Math.min(Math.floor(segProg), totalPts - 1);
                const segT = segProg - segIdx;

                const fromX = segIdx === 0 ? wr.x : path[segIdx - 1].x;
                const fromY = segIdx === 0 ? wr.y : path[segIdx - 1].y;
                simState.wrPositions[i].x = fromX + (path[segIdx].x - fromX) * segT;
                simState.wrPositions[i].y = fromY + (path[segIdx].y - fromY) * segT;

                // Footstep particles
                if (Math.random() < 0.1) {
                    spawnParticles(simState.wrPositions[i].x, simState.wrPositions[i].y + 12, 1, PAL.field2, 0.5, 0.3, 2);
                }
            }

            // Move defenders
            const realDef = defenseRealFormation;
            for (let i = 0; i < 4; i++) {
                const db = realDef.dbs[i];
                if (db.role === 'man' && db.coverIdx >= 0) {
                    const t = simState.wrPositions[db.coverIdx];
                    simState.dbPositions[i].x += (t.x - simState.dbPositions[i].x) * 0.045;
                    simState.dbPositions[i].y += (t.y - simState.dbPositions[i].y) * 0.045;
                } else {
                    const t = simState.wrPositions[simState.chosenWR];
                    simState.dbPositions[i].x += (t.x - simState.dbPositions[i].x) * 0.018;
                    simState.dbPositions[i].y += (t.y - simState.dbPositions[i].y) * 0.012;
                }
            }

            // Rusher
            const rushSpd = realDef.rusher.fast ? 0.06 : 0.035;
            const irw = hasRelic('ironCenter') ? rushSpd * 0.5 : rushSpd;
            simState.rusherPos.x += (simState.qbPos.x - simState.rusherPos.x) * irw;
            simState.rusherPos.y += (simState.qbPos.y - simState.rusherPos.y) * irw;
            simState.qbPos.y += 0.2;

            if (simState.routeProgress >= 0.65) {
                simState.phase = 'throw';
                simState.timer = 0;
                simState.ballPos = { x: simState.qbPos.x, y: simState.qbPos.y };
                simState.ballTarget = { ...simState.wrPositions[simState.chosenWR] };
                simState.slowMo = true;
                simState.slowMoTimer = 0;
                playSound('throw');
                triggerShake(3, 0.12);
                spawnParticles(simState.qbPos.x, simState.qbPos.y - 5, 5, '#fff', 3, 0.3, 2);
            }
            break;

        case 'throw':
            simState.throwProgress = Math.min(1, simState.timer / 0.5);
            simState.ballPos.x = simState.qbPos.x + (simState.ballTarget.x - simState.qbPos.x) * simState.throwProgress;
            simState.ballPos.y = simState.qbPos.y + (simState.ballTarget.y - simState.qbPos.y) * simState.throwProgress;

            // Ball trail
            if (simState.throwProgress < 0.95) {
                spawnTrail(simState.ballPos.x, simState.ballPos.y, 'rgba(139,69,19,0.4)');
            }

            // Continue moving players
            for (let i = 0; i < 4; i++) {
                const wr = currentPlay.offense.wrs[i];
                const path = routePaths[wr.route](wr.x, wr.y);
                const endPt = path[path.length - 1];
                simState.wrPositions[i].x += (endPt.x - simState.wrPositions[i].x) * 0.05;
                simState.wrPositions[i].y += (endPt.y - simState.wrPositions[i].y) * 0.05;
            }
            for (let i = 0; i < 4; i++) {
                const db = defenseRealFormation.dbs[i];
                if (db.role === 'man' && db.coverIdx >= 0) {
                    const t = simState.wrPositions[db.coverIdx];
                    simState.dbPositions[i].x += (t.x - simState.dbPositions[i].x) * 0.06;
                    simState.dbPositions[i].y += (t.y - simState.dbPositions[i].y) * 0.06;
                }
            }

            if (simState.throwProgress >= 1) {
                simState.phase = 'catch';
                simState.timer = 0;
                if (simState.success) {
                    playSound('catch');
                    triggerShake(5, 0.2);
                    spawnParticles(simState.ballTarget.x, simState.ballTarget.y, 12, PAL.gold, 3, 0.5, 3);
                } else {
                    playSound('fail');
                    triggerShake(4, 0.25);
                    spawnParticles(simState.ballTarget.x, simState.ballTarget.y, 8, '#888', 2, 0.4, 2);
                }
            }
            break;

        case 'catch':
            if (simState.timer > 1.5) {
                simState.phase = 'result';
                simState.timer = 0;
            }
            break;

        case 'result':
            if (simState.timer > 1.0) {
                handlePlayResult();
            }
            break;
    }
}

function handlePlayResult() {
    if (simState.success) {
        score += simState.yardsGained * 10;
        downs.ballPosition += simState.yardsGained;
        if (downs.ballPosition >= 40) {
            score += 600;
            playSound('td');
            spawnConfetti(W / 2, H / 2);
            triggerShake(6, 0.5);
            if (currentLevel >= maxLevel) {
                gameState = 'victory';
            } else {
                gameState = 'upgrade';
                currentLevel++;
                downs = { current: 1, yardsToGo: 20, ballPosition: 0 };
                applyDefenseBuff();
                generateUpgradeOptions();
            }
        } else if (simState.yardsGained >= downs.yardsToGo) {
            downs.current = 1;
            downs.yardsToGo = Math.max(10, 40 - downs.ballPosition);
        } else {
            downs.current++;
            downs.yardsToGo -= simState.yardsGained;
            if (downs.current > 4) { gameState = 'gameOver'; simState = null; return; }
        }
    } else {
        downs.current++;
        if (downs.current > 4) { gameState = 'gameOver'; simState = null; return; }
    }

    if (gameState === 'simulation') {
        // Auto-advance to next play
        simState = null;
        camera.targetY = 0;
        camera.targetZoom = 1;
        gameState = 'transition';
        transitionTimer = 0;
    }
    simState = null;
}

// Transition
let transitionTimer = 0;

// ============================================================
// UPGRADE & RELIC SYSTEM
// ============================================================
let upgradeOptions = [];

const qbUpgrades = [
    { name: '精准臂力', desc: '传球精准度 +8', apply: () => { qbStats.accuracy += 8; } },
    { name: '火箭臂', desc: '臂力 +10', apply: () => { qbStats.armStrength += 10; } },
    { name: '快速阅读', desc: '阅读防守 +5, 额外决策时间', apply: () => { qbStats.readSpeed += 5; } },
    { name: '口袋大师', desc: '精准+5, 臂力+5', apply: () => { qbStats.accuracy += 5; qbStats.armStrength += 5; } },
    { name: '鹰眼视野', desc: '阅读+3, 精准+4', apply: () => { qbStats.readSpeed += 3; qbStats.accuracy += 4; } },
];

const wrUpgradePool = [
    { name: '闪电加速', desc: '速度 +10', stat: 'speed', value: 10 },
    { name: '黏手套', desc: '接球 +10', stat: 'catching', value: 10 },
    { name: '路线大师', desc: '跑路线 +10', stat: 'routeRunning', value: 10 },
    { name: '全面提升', desc: '所有属性 +5', stat: 'all', value: 5 },
];

const debuffPool = [
    { name: '迷雾干扰', desc: '防守反应降低', value: 8 },
    { name: '场地湿滑', desc: '防守移动降低', value: 10 },
    { name: '假动作', desc: '防守判断降低', value: 6 },
    { name: '节奏变化', desc: '防守协调降低', value: 12 },
];

const defBuffPool = [
    { name: '铁壁防守', desc: '覆盖增强', value: 8 },
    { name: '鹰眼', desc: '阅读进攻增强', value: 6 },
    { name: '闪电反应', desc: '反应增强', value: 10 },
    { name: '钢铁意志', desc: '整体提升', value: 7 },
];

const relicPool = [
    { id: 'magnetGloves', name: '磁力手套', desc: '接球率+12%, 但WR速度-5', effect: () => { wrStats.forEach(w => w.speed -= 5); } },
    { id: 'filmStudy', name: '赛前录像', desc: '决策时间+0.5秒, 偶尔显示防守名称', effect: () => {} },
    { id: 'ghostStep', name: '幽灵步', desc: 'WR有15%概率瞬间摆脱', effect: () => {} },
    { id: 'ironCenter', name: '铁壁中锋', desc: '冲传速度减半', effect: () => {} },
    { id: 'yacMaster', name: '接球后冲刺', desc: '接球后额外+3~8码', effect: () => {} },
    { id: 'gamblerHeart', name: '赌徒之心', desc: '所有传球50/50, 成功码数翻倍', effect: () => {} },
    { id: 'echoRadar', name: '回声雷达', desc: '显示DB移动预测线', effect: () => {} },
];

function generateUpgradeOptions() {
    upgradeOptions = [];

    // QB upgrade
    const qbOpt = qbUpgrades[Math.floor(Math.random() * qbUpgrades.length)];
    upgradeOptions.push({ type: 'qb', icon: 'qb', ...qbOpt });

    // WR upgrade
    const wrOpt = wrUpgradePool[Math.floor(Math.random() * wrUpgradePool.length)];
    const wrTarget = Math.floor(Math.random() * 4);
    upgradeOptions.push({
        type: 'wr', icon: 'wr', target: wrTarget,
        name: `${wrStats[wrTarget].name} ${wrOpt.name}`,
        desc: `${wrStats[wrTarget].name}: ${wrOpt.desc}`,
        stat: wrOpt.stat, value: wrOpt.value,
    });

    // Defense debuff
    const debOpt = debuffPool[Math.floor(Math.random() * debuffPool.length)];
    upgradeOptions.push({ type: 'debuff', icon: 'shield', ...debOpt });

    // Relic chance (20% per TD)
    if (Math.random() < 0.2 && relicPool.length > 0) {
        const availRelics = relicPool.filter(r => !hasRelic(r.id));
        if (availRelics.length > 0) {
            const relic = availRelics[Math.floor(Math.random() * availRelics.length)];
            upgradeOptions.push({ type: 'relic', icon: 'star', ...relic });
        }
    }
}

function applyUpgrade(index) {
    initAudio();
    playSound('select');
    const opt = upgradeOptions[index];
    if (opt.type === 'qb') {
        opt.apply();
        qbStats.level++;
    } else if (opt.type === 'wr') {
        const wr = wrStats[opt.target];
        if (opt.stat === 'all') { wr.speed += opt.value; wr.catching += opt.value; wr.routeRunning += opt.value; }
        else wr[opt.stat] += opt.value;
        wr.level++;
    } else if (opt.type === 'debuff') {
        offDebuffs.push({ name: opt.name, value: opt.value });
    } else if (opt.type === 'relic') {
        relics.push({ id: opt.id, name: opt.name, desc: opt.desc });
        if (opt.effect) opt.effect();
    }
}

function applyDefenseBuff() {
    if (currentLevel > 2 && Math.random() < 0.65) {
        const buff = defBuffPool[Math.floor(Math.random() * defBuffPool.length)];
        defBuffs.push({ ...buff });
    }
}

// ============================================================
// PIXEL ART RENDERING
// ============================================================

function drawPixelSprite(x, y, type, facingUp, highlighted, label, animFrame) {
    const px = Math.round(x);
    const py = Math.round(y);
    const f = animFrame || 0;

    ctx.save();

    if (type === 'qb') {
        // QB - larger, gold helmet, throwing pose
        // Helmet
        ctx.fillStyle = PAL.qbGold;
        ctx.fillRect(px - 6, py - 16, 12, 6);
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(px - 7, py - 13, 1, 3); // facemask
        // Head
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 5, py - 11, 10, 5);
        // Body
        ctx.fillStyle = PAL.offBody;
        ctx.fillRect(px - 7, py - 6, 14, 10);
        // Number
        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 2, py - 4, 1, 4);
        ctx.fillRect(px + 1, py - 4, 1, 4);
        ctx.fillRect(px - 1, py - 4, 1, 1);
        ctx.fillRect(px - 1, py, 1, 1);
        // Arms - throwing motion
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 10, py - 5, 4, 3);
        ctx.fillRect(px + 7, py - 8 + (f % 2), 4, 3);
        // Pants
        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 6, py + 4, 12, 4);
        // Legs
        ctx.fillStyle = PAL.offBody;
        const legOff = f % 2 === 0 ? 0 : 1;
        ctx.fillRect(px - 5, py + 8, 4, 5 + legOff);
        ctx.fillRect(px + 1, py + 8, 4, 5 - legOff);
        // Shoes
        ctx.fillStyle = '#333';
        ctx.fillRect(px - 5, py + 13 + legOff, 4, 2);
        ctx.fillRect(px + 1, py + 13 - legOff, 4, 2);
        // Flag (waist flags)
        ctx.fillStyle = PAL.accent;
        ctx.fillRect(px - 9, py + 2, 3, 5);
        ctx.fillRect(px + 7, py + 2, 3, 5);
    } else if (type === 'wr') {
        // WR - blue team, athletic build
        // Helmet
        ctx.fillStyle = PAL.offLight;
        ctx.fillRect(px - 5, py - 15, 10, 5);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(px - 6, py - 12, 1, 3);
        // Head
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 4, py - 10, 8, 4);
        // Body
        ctx.fillStyle = PAL.offBody;
        ctx.fillRect(px - 6, py - 6, 12, 9);
        // Number area
        ctx.fillStyle = PAL.offWhite;
        ctx.fillRect(px - 3, py - 4, 6, 5);
        // Arms
        ctx.fillStyle = PAL.skin;
        const armUp = f % 3 === 0 ? -1 : 0;
        ctx.fillRect(px - 9, py - 4 + armUp, 4, 3);
        ctx.fillRect(px + 6, py - 4 - armUp, 4, 3);
        // Pants
        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 5, py + 3, 10, 3);
        // Legs with run animation
        ctx.fillStyle = PAL.offBody;
        const legA = Math.sin(f * 0.8) * 2;
        ctx.fillRect(px - 4, py + 6, 3, 5 + Math.round(legA));
        ctx.fillRect(px + 1, py + 6, 3, 5 - Math.round(legA));
        // Shoes
        ctx.fillStyle = '#333';
        ctx.fillRect(px - 4, py + 11 + Math.round(legA), 3, 2);
        ctx.fillRect(px + 1, py + 11 - Math.round(legA), 3, 2);
        // Flags
        ctx.fillStyle = PAL.accent;
        ctx.fillRect(px - 8, py + 1, 3, 4);
        ctx.fillRect(px + 6, py + 1, 3, 4);
    } else if (type === 'db') {
        // DB - red team, lower stance
        // Helmet
        ctx.fillStyle = PAL.defLight;
        ctx.fillRect(px - 5, py - 13, 10, 5);
        ctx.fillStyle = '#333';
        ctx.fillRect(px - 6, py - 10, 1, 3);
        // Head
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 4, py - 9, 8, 4);
        // Body - wider stance
        ctx.fillStyle = PAL.defBody;
        ctx.fillRect(px - 7, py - 5, 14, 9);
        // Number
        ctx.fillStyle = '#ddd';
        ctx.fillRect(px - 2, py - 3, 4, 4);
        // Arms - out wide (backpedal)
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 11, py - 3, 5, 3);
        ctx.fillRect(px + 7, py - 3, 5, 3);
        // Pants
        ctx.fillStyle = '#222';
        ctx.fillRect(px - 6, py + 4, 12, 3);
        // Legs
        ctx.fillStyle = PAL.defBody;
        ctx.fillRect(px - 5, py + 7, 3, 4);
        ctx.fillRect(px + 2, py + 7, 3, 4);
        // Shoes
        ctx.fillStyle = '#111';
        ctx.fillRect(px - 5, py + 11, 4, 2);
        ctx.fillRect(px + 2, py + 11, 4, 2);
    } else if (type === 'rusher') {
        // Rusher - bigger, more aggressive
        // Helmet
        ctx.fillStyle = PAL.defLight;
        ctx.fillRect(px - 6, py - 14, 12, 5);
        ctx.fillStyle = '#333';
        ctx.fillRect(px - 7, py - 11, 2, 3);
        // Head
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 5, py - 10, 10, 4);
        // Body - wider
        ctx.fillStyle = PAL.defBody;
        ctx.fillRect(px - 8, py - 6, 16, 10);
        // Arms - forward (rushing)
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(px - 11, py - 5 - (f % 2), 4, 4);
        ctx.fillRect(px + 8, py - 5 + (f % 2), 4, 4);
        // Pants
        ctx.fillStyle = '#222';
        ctx.fillRect(px - 7, py + 4, 14, 3);
        // Legs
        ctx.fillStyle = PAL.defBody;
        ctx.fillRect(px - 6, py + 7, 4, 5);
        ctx.fillRect(px + 2, py + 7, 4, 5);
        ctx.fillStyle = '#111';
        ctx.fillRect(px - 6, py + 12, 5, 2);
        ctx.fillRect(px + 2, py + 12, 5, 2);
    }

    // Highlight ring
    if (highlighted) {
        ctx.strokeStyle = PAL.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing glow
        const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    // Label
    if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, px, py + 22);
    }
}

function drawBall(x, y) {
    const px = Math.round(x);
    const py = Math.round(y);
    ctx.fillStyle = PAL.ball;
    ctx.fillRect(px - 4, py - 2, 8, 5);
    ctx.fillStyle = PAL.ballLace;
    ctx.fillRect(px - 1, py - 2, 2, 5);
    ctx.fillRect(px - 3, py, 1, 1);
    ctx.fillRect(px + 2, py, 1, 1);
}

// ============================================================
// FIELD RENDERING
// ============================================================
function drawField() {
    // Dithered grass pattern
    for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
            const stripe = Math.floor(y / (YARD_PX * 5)) % 2;
            const dither = (x + y) % 4 < 2;
            if (stripe === 0) {
                ctx.fillStyle = dither ? PAL.field1 : PAL.field2;
            } else {
                ctx.fillStyle = dither ? PAL.fieldDark1 : PAL.fieldDark2;
            }
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // End zone - diagonal stripes
    for (let y = 0; y < ENDZONE_H; y += 2) {
        for (let x = 0; x < W; x += 2) {
            const stripe = ((x + y) / 8) % 2 < 1;
            ctx.fillStyle = stripe ? PAL.endzone1 : PAL.endzone2;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // End zone text
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TOUCHDOWN', W / 2, ENDZONE_H / 2 + 12);

    // Pylons
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(8, ENDZONE_H - 3, 4, 8);
    ctx.fillRect(W - 12, ENDZONE_H - 3, 4, 8);

    // Yard lines
    for (let i = 0; i <= 20; i++) {
        const y = ENDZONE_H + i * YARD_PX * 2;
        const isMajor = i % 5 === 0;
        ctx.strokeStyle = isMajor ? PAL.line : PAL.lineGhost;
        ctx.lineWidth = isMajor ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(25, y);
        ctx.lineTo(W - 25, y);
        ctx.stroke();

        // Hash marks
        if (isMajor) {
            ctx.fillStyle = PAL.line;
            ctx.fillRect(25, y - 1, 1, 4);
            ctx.fillRect(W - 26, y - 1, 1, 4);
            ctx.fillRect(W * 0.33, y - 1, 1, 4);
            ctx.fillRect(W * 0.67, y - 1, 1, 4);
        }
    }

    // Yard numbers
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    for (let i = 1; i <= 4; i++) {
        const y = ENDZONE_H + i * YARD_PX * 5 * 2 + 4;
        ctx.fillText(`${i * 10}`, 17, y);
        ctx.fillText(`${i * 10}`, W - 17, y);
    }

    // Sidelines
    ctx.strokeStyle = PAL.line;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 0, W - 12, H - 60);

    // Pixel crowd (sidelines)
    for (let y = 0; y < H - 60; y += 6) {
        for (let side = 0; side < 2; side++) {
            const baseX = side === 0 ? 0 : W - 6;
            const crowdColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#fff'];
            const ci = (y * 7 + side * 3) % crowdColors.length;
            ctx.fillStyle = crowdColors[ci];
            ctx.fillRect(baseX, y, 5, 4);
            // Occasional jump animation
            if (gameState === 'simulation' && simState && simState.phase === 'catch' && simState.success) {
                if (Math.random() < 0.3) {
                    ctx.fillRect(baseX, y - 2, 5, 4);
                }
            }
        }
    }

    // Line of Scrimmage (glowing yellow)
    ctx.fillStyle = 'rgba(255,255,68,0.15)';
    ctx.fillRect(6, LOS_Y - 3, W - 12, 6);
    ctx.strokeStyle = PAL.losLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(6, LOS_Y);
    ctx.lineTo(W - 6, LOS_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // First down line
    if (downs.yardsToGo > 0) {
        const fdY = LOS_Y - downs.yardsToGo * YARD_PX;
        ctx.fillStyle = 'rgba(255,119,34,0.12)';
        ctx.fillRect(6, fdY - 2, W - 12, 4);
        ctx.strokeStyle = PAL.firstDown;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(6, fdY);
        ctx.lineTo(W - 6, fdY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawRouteLines() {
    if (!currentPlay) return;
    for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i];
        const path = routePaths[wr.route](wr.x, wr.y);
        const isHovered = i === hoveredWR;

        ctx.strokeStyle = isHovered ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(wr.x, wr.y);
        for (const pt of path) ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow dot at end
        const endPt = path[path.length - 1];
        ctx.fillStyle = isHovered ? PAL.gold : 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(endPt.x, endPt.y, isHovered ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Separation visualization (openness fan)
function drawOpennessFan(wrIndex) {
    if (!currentPlay || wrIndex < 0) return;
    const wr = currentPlay.offense.wrs[wrIndex];
    const routeEnd = getRouteEndpoint(wr);
    const sc = currentPlay.wrScores[wrIndex];
    const maxSc = Math.max(...currentPlay.wrScores);
    const openness = sc / maxSc;

    // Only show if readSpeed is enough
    const clarity = Math.min(1, (qbStats.readSpeed + 2) / 10);

    const radius = 25 + openness * 20;
    const gradient = ctx.createRadialGradient(routeEnd.x, routeEnd.y, 5, routeEnd.x, routeEnd.y, radius);

    if (openness > 0.7) {
        gradient.addColorStop(0, `rgba(46,204,113,${0.3 * clarity})`);
        gradient.addColorStop(1, `rgba(46,204,113,0)`);
    } else if (openness > 0.4) {
        gradient.addColorStop(0, `rgba(241,196,15,${0.25 * clarity})`);
        gradient.addColorStop(1, `rgba(241,196,15,0)`);
    } else {
        gradient.addColorStop(0, `rgba(231,76,60,${0.25 * clarity})`);
        gradient.addColorStop(1, `rgba(231,76,60,0)`);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(routeEnd.x, routeEnd.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// ============================================================
// HUD
// ============================================================
function drawHUD() {
    // Bottom HUD bar
    ctx.fillStyle = PAL.hud;
    ctx.fillRect(0, H - 56, W, 56);
    ctx.strokeStyle = PAL.hudBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 56);
    ctx.lineTo(W, H - 56);
    ctx.stroke();

    // Level & Score
    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`第${currentLevel}关`, 10, H - 40);
    ctx.fillStyle = '#fff';
    ctx.fillText(`得分:${score}`, 10, H - 25);

    // Down & distance - using football icons
    ctx.textAlign = 'center';
    for (let i = 1; i <= 4; i++) {
        const dx = W / 2 - 40 + (i - 1) * 22;
        const dy = H - 42;
        if (i <= downs.current) {
            ctx.fillStyle = i === downs.current ? PAL.gold : '#555';
        } else {
            ctx.fillStyle = '#333';
        }
        // Mini football shape
        ctx.beginPath();
        ctx.ellipse(dx, dy, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (i === downs.current) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(dx - 1, dy - 3, 2, 6);
        }
    }
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`${downs.yardsToGo}码 to go`, W / 2, H - 18);

    // Progress bar
    ctx.fillStyle = '#222';
    ctx.fillRect(W / 2 - 50, H - 10, 100, 5);
    const progress = Math.min(1, downs.ballPosition / 40);
    ctx.fillStyle = PAL.good;
    ctx.fillRect(W / 2 - 50, H - 10, 100 * progress, 5);
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(W / 2 - 50 + 100 * progress - 1, H - 11, 3, 7);

    // QB info
    ctx.textAlign = 'right';
    ctx.fillStyle = PAL.qbGold;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`QB Lv${qbStats.level}`, W - 10, H - 40);
    ctx.fillStyle = '#aaa';
    ctx.font = '8px monospace';
    ctx.fillText(`精准${qbStats.accuracy} 臂力${qbStats.armStrength}`, W - 10, H - 28);

    // Relics display
    if (relics.length > 0) {
        ctx.fillStyle = '#666';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(relics.map(r => r.name).join(' '), W - 10, H - 16);
    }
}

// ============================================================
// READ TIMER
// ============================================================
function drawReadTimer() {
    if (gameState !== 'preSnap') return;

    const barW = 200;
    const barH = 8;
    const bx = W / 2 - barW / 2;
    const by = H - 70;
    const ratio = Math.max(0, readTimer / readTimerMax);

    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, barW, barH);

    // Timer bar
    let barColor;
    if (ratio > 0.5) barColor = PAL.gold;
    else if (ratio > 0.25) barColor = '#f39c12';
    else barColor = PAL.bad;

    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, barW * ratio, barH);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // Vignette warning when low
    if (ratio < 0.25) {
        const alpha = 0.15 + Math.sin(Date.now() / 150) * 0.1;
        ctx.fillStyle = `rgba(231,76,60,${alpha})`;
        ctx.fillRect(0, 0, 15, H);
        ctx.fillRect(W - 15, 0, 15, H);
        ctx.fillRect(0, 0, W, 15);
        ctx.fillRect(0, H - 70, W, 15);
    }
}

// ============================================================
// FORMATION INFO
// ============================================================
function drawFormationInfo() {
    if (!currentPlay) return;

    // Defense info
    const defName = defenseDisguised && !hasRelic('filmStudy')
        ? '???' 
        : (qbStats.readSpeed >= 3 || hasRelic('filmStudy')
            ? defenseFormations[currentPlay.defIdx].name
            : '阅读防守...');

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W / 2 - 85, 10, 170, 20);
    ctx.fillStyle = PAL.defLight;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`防守: ${defName}`, W / 2, 25);

    // Disguise warning
    if (defenseDisguised && hasRelic('echoRadar')) {
        ctx.fillStyle = PAL.gold;
        ctx.font = '8px monospace';
        ctx.fillText('⚠ 伪装防守!', W / 2, 40);
    }

    // Offense info
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W / 2 - 85, H - 80, 170, 18);
    ctx.fillStyle = PAL.offLight;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`进攻: ${offenseFormations[currentPlay.offIdx].name}`, W / 2, H - 66);
}

// ============================================================
// SCREENS
// ============================================================

function drawTitle() {
    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Animated pixel field background
    const t = Date.now() / 1000;
    for (let y = 200; y < 450; y += 4) {
        for (let x = 50; x < W - 50; x += 4) {
            const stripe = Math.floor(y / 20) % 2;
            ctx.fillStyle = stripe ? 'rgba(45,138,78,0.15)' : 'rgba(38,122,67,0.15)';
            ctx.fillRect(x, y, 3, 3);
        }
    }

    // Pixel football
    const cx = W / 2;
    ctx.fillStyle = PAL.ball;
    for (let i = -24; i <= 24; i++) {
        const h = Math.round(Math.sqrt(576 - i * i) * 0.55);
        ctx.fillRect(cx + i, 150 - h, 1, h * 2);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 1, 137, 2, 26);
    ctx.fillRect(cx - 7, 148, 14, 2);

    // Title
    ctx.fillStyle = PAL.accent;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QB CHALLENGE', cx, 220);

    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('像素腰旗橄榄球 v2', cx, 248);

    // Subtitle
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText('阅读防守 · 选择接球手 · 达阵得分', cx, 280);

    // Features
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    const features = [
        '⊕ Pre-snap阅读防守 + 限时决策',
        '⊕ 7种进攻阵型 × 6种防守阵型',
        '⊕ Roguelike升级 + 圣物系统',
        '⊕ 防守伪装 + 渐进难度',
        '⊕ 10关达阵挑战',
    ];
    features.forEach((f, i) => {
        ctx.fillText(f, cx, 320 + i * 18);
    });

    // Start button
    const btnX = cx - 80, btnY = 430, btnW = 160, btnH = 45;
    const isHover = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
    ctx.fillStyle = isHover ? PAL.accent : PAL.cardBg;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = PAL.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('开始游戏', cx, btnY + 28);

    genericButtons = [{ x: btnX, y: btnY, w: btnW, h: btnH, action: 'start' }];

    // Controls
    ctx.fillStyle = '#444';
    ctx.font = '9px monospace';
    ctx.fillText('点击选择外接手 | 在时间耗尽前做出决策', cx, 520);
    ctx.fillText('5v5: 1QB+4WR vs 1冲传手+4DB', cx, 540);
}

function drawUpgradeScreen() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // TD celebration
    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('达阵得分!', W / 2, 45);

    ctx.fillStyle = PAL.accent;
    ctx.font = '13px monospace';
    ctx.fillText(`进入第 ${currentLevel} 关`, W / 2, 70);

    // Defense buff notice
    if (defBuffs.length > 0) {
        const last = defBuffs[defBuffs.length - 1];
        ctx.fillStyle = PAL.bad;
        ctx.font = '9px monospace';
        ctx.fillText(`防守增强: ${last.name} - ${last.desc}`, W / 2, 90);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText('选择一项升级:', W / 2, 115);

    // Upgrade cards
    upgradeButtons = [];
    const cardH = upgradeOptions.length > 3 ? 105 : 120;
    const startY = 130;

    for (let i = 0; i < upgradeOptions.length; i++) {
        const opt = upgradeOptions[i];
        const cy = startY + i * (cardH + 12);
        const cx = 45;
        const cw = W - 90;

        const isHover = mouseX > cx && mouseX < cx + cw && mouseY > cy && mouseY < cy + cardH;
        upgradeButtons.push({ x: cx, y: cy, w: cw, h: cardH, index: i });

        // Card background
        ctx.fillStyle = isHover ? '#1a2a50' : PAL.cardBg;
        ctx.fillRect(cx, cy, cw, cardH);

        // Border color by type
        const borderColor = opt.type === 'qb' ? PAL.qbGold
            : opt.type === 'wr' ? PAL.offLight
            : opt.type === 'relic' ? PAL.gold
            : PAL.good;
        ctx.strokeStyle = isHover ? '#fff' : borderColor;
        ctx.lineWidth = isHover ? 2 : 1.5;
        ctx.strokeRect(cx, cy, cw, cardH);

        // Icon
        ctx.fillStyle = borderColor;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        const typeLabel = opt.type === 'qb' ? '🏈 QB升级'
            : opt.type === 'wr' ? '🧤 WR升级'
            : opt.type === 'relic' ? '⭐ 圣物'
            : '🛡 防守减益';
        ctx.fillText(typeLabel, cx + 12, cy + 24);

        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(opt.name, W / 2, cy + 50);

        // Description
        ctx.fillStyle = '#999';
        ctx.font = '10px monospace';
        ctx.fillText(opt.desc, W / 2, cy + 72);

        if (opt.type === 'relic') {
            ctx.fillStyle = PAL.gold;
            ctx.font = '9px monospace';
            ctx.fillText('永久被动效果', W / 2, cy + 90);
        }
    }

    // Current stats at bottom
    ctx.fillStyle = '#444';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`QB: 精准${qbStats.accuracy} 臂力${qbStats.armStrength} 阅读${qbStats.readSpeed}`, 20, H - 35);
    const wrInfo = wrStats.map(w => `${w.name}:${w.speed}/${w.catching}/${w.routeRunning}`).join(' ');
    ctx.fillText(wrInfo, 20, H - 20);
    if (relics.length > 0) {
        ctx.fillStyle = PAL.gold;
        ctx.fillText(`圣物: ${relics.map(r => r.name).join(', ')}`, 20, H - 8);
    }
}

function drawGameOver() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PAL.bad;
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, 200);

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('进攻档数用尽!', W / 2, 240);

    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`得分: ${score}`, W / 2, 290);
    ctx.font = '14px monospace';
    ctx.fillText(`到达第 ${currentLevel} 关`, W / 2, 320);

    // Stats
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`QB: 精准${qbStats.accuracy} 臂力${qbStats.armStrength}`, W / 2, 360);
    ctx.fillText(`圣物: ${relics.length}`, W / 2, 380);

    genericButtons = [{
        x: W / 2 - 70, y: 420, w: 140, h: 40, text: '重新开始', action: 'restart',
    }];
    drawButtonRect(genericButtons[0]);
}

function drawVictory() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Confetti
    for (let i = 0; i < 60; i++) {
        const colors = [PAL.gold, PAL.accent, PAL.good, PAL.offLight, '#fff'];
        ctx.fillStyle = colors[i % colors.length];
        const px = (Math.sin(i * 73.7 + Date.now() / 800) * 0.5 + 0.5) * W;
        const py = (Math.sin(i * 37.3 + Date.now() / 600) * 0.5 + 0.5) * 300;
        ctx.fillRect(px, py, 4, 4);
    }

    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜通关!', W / 2, 180);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('击败全部10关!', W / 2, 220);

    ctx.fillStyle = PAL.accent;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`最终得分: ${score}`, W / 2, 270);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(`QB Lv${qbStats.level} | 精准${qbStats.accuracy} 臂力${qbStats.armStrength}`, W / 2, 320);
    ctx.fillText(`圣物: ${relics.map(r => r.name).join(', ') || '无'}`, W / 2, 345);
    ctx.fillText(`防守增强: ${defBuffs.length} | 减益: ${offDebuffs.length}`, W / 2, 370);

    genericButtons = [{
        x: W / 2 - 70, y: 420, w: 140, h: 40, text: '再来一次', action: 'restart',
    }];
    drawButtonRect(genericButtons[0]);
}

function drawButtonRect(btn) {
    const isHover = mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h;
    ctx.fillStyle = isHover ? PAL.accent : PAL.cardBg;
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = PAL.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(btn.text || '', btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
}

function drawChoosePrompt() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(W / 2 - 140, H - 100, 280, 24);
    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('选择你要传球的外接手!', W / 2, H - 82);

    // WR info cards
    for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i];
        const stat = wrStats[i];
        const isHover = i === hoveredWR;

        ctx.fillStyle = isHover ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.5)';
        ctx.fillRect(wr.x - 32, wr.y + 25, 64, 30);

        if (isHover) {
            ctx.strokeStyle = PAL.gold;
            ctx.lineWidth = 1;
            ctx.strokeRect(wr.x - 32, wr.y + 25, 64, 30);
        }

        ctx.fillStyle = isHover ? PAL.gold : '#fff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${stat.name} Lv${stat.level}`, wr.x, wr.y + 37);

        ctx.fillStyle = '#aaa';
        ctx.font = '7px monospace';
        ctx.fillText(`S${stat.speed} C${stat.catching} R${stat.routeRunning}`, wr.x, wr.y + 48);
    }
}

function drawResultOverlay() {
    if (!simState) return;
    const text = simState.success ? '接球成功!' : '传球失败!';
    const sub = simState.success
        ? `+${simState.yardsGained}码 | 成功率${Math.round(simState.catchProb)}%`
        : `成功率${Math.round(simState.catchProb)}%`;
    const col = simState.success ? PAL.good : PAL.bad;

    // Flash effect on success
    if (simState.success && simState.timer < 0.1) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(W / 2 - 130, 240, 260, 100);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 130, 240, 260, 100);

    ctx.fillStyle = col;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, 275);

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(sub, W / 2, 300);

    if (simState.chosenWR !== currentPlay.bestWR) {
        ctx.fillStyle = PAL.gold;
        ctx.font = '10px monospace';
        const bestRoute = currentPlay.offense.wrs[currentPlay.bestWR].route;
        ctx.fillText(`最佳选择: ${wrStats[currentPlay.bestWR].name} (${bestRoute})`, W / 2, 325);
    }
}

// ============================================================
// INPUT
// ============================================================
let mouseX = 0, mouseY = 0;
let genericButtons = [];
let upgradeButtons = [];

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
}

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    mouseX = pos.x;
    mouseY = pos.y;

    // Update hovered WR
    hoveredWR = -1;
    if ((gameState === 'preSnap' || gameState === 'choosing') && currentPlay) {
        for (let i = 0; i < 4; i++) {
            const wr = currentPlay.offense.wrs[i];
            const dx = mouseX - wr.x, dy = mouseY - wr.y;
            if (dx * dx + dy * dy < 25 * 25) {
                hoveredWR = i;
                break;
            }
        }
    }
});

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    mouseX = pos.x;
    mouseY = pos.y;

    // Update hover for touch
    hoveredWR = -1;
    if ((gameState === 'preSnap' || gameState === 'choosing') && currentPlay) {
        for (let i = 0; i < 4; i++) {
            const wr = currentPlay.offense.wrs[i];
            const dx = mouseX - wr.x, dy = mouseY - wr.y;
            if (dx * dx + dy * dy < 30 * 30) {
                hoveredWR = i;
                break;
            }
        }
    }

    handleClick(e);
});

function handleClick(e) {
    initAudio();
    const pos = { x: mouseX, y: mouseY };

    switch (gameState) {
        case 'title':
            for (const btn of genericButtons) {
                if (isInside(pos, btn) && btn.action === 'start') {
                    playSound('select');
                    startNewGame();
                }
            }
            break;

        case 'preSnap':
        case 'choosing':
            // Click on WR
            if (currentPlay) {
                for (let i = 0; i < 4; i++) {
                    const wr = currentPlay.offense.wrs[i];
                    const dx = pos.x - wr.x, dy = pos.y - wr.y;
                    if (dx * dx + dy * dy < 30 * 30) {
                        playSound('select');
                        startSimulation(i);
                        return;
                    }
                }
            }
            break;

        case 'upgrade':
            for (const btn of upgradeButtons) {
                if (isInside(pos, btn)) {
                    applyUpgrade(btn.index);
                    gameState = 'transition';
                    transitionTimer = 0;
                    return;
                }
            }
            break;

        case 'gameOver':
        case 'victory':
            for (const btn of genericButtons) {
                if (isInside(pos, btn) && btn.action === 'restart') {
                    playSound('select');
                    startNewGame();
                }
            }
            break;
    }
}

function isInside(pos, rect) {
    return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
           pos.y >= rect.y && pos.y <= rect.y + rect.h;
}

// ============================================================
// GAME FLOW
// ============================================================
function startNewGame() {
    currentLevel = 1;
    score = 0;
    downs = { current: 1, yardsToGo: 20, ballPosition: 0 };
    qbStats = { accuracy: 70, armStrength: 60, readSpeed: 0, level: 1 };
    wrStats = [
        { id: 0, name: 'WR1', speed: 60, catching: 65, routeRunning: 60, level: 1 },
        { id: 1, name: 'WR2', speed: 55, catching: 60, routeRunning: 65, level: 1 },
        { id: 2, name: 'WR3', speed: 65, catching: 55, routeRunning: 55, level: 1 },
        { id: 3, name: 'WR4', speed: 50, catching: 70, routeRunning: 60, level: 1 },
    ];
    defBuffs = [];
    offDebuffs = [];
    relics = [];
    particles = [];

    generatePlay();
    gameState = 'preSnap';
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
let lastTime = 0;
let animFrame = 0;
let lastTickTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    animFrame++;

    // Update systems
    updateShake(dt);
    updateCamera(dt);
    updateParticles(dt);

    ctx.clearRect(0, 0, W, H);

    // Apply camera + shake
    ctx.save();
    ctx.translate(shake.x + camera.x, shake.y + camera.y);

    switch (gameState) {
        case 'title':
            ctx.restore();
            drawTitle();
            requestAnimationFrame(gameLoop);
            return;

        case 'preSnap':
            // Update read timer
            readTimer -= dt;
            if (readTimer <= readTimerMax * 0.25 && !readTimerWarning) {
                readTimerWarning = true;
                playSound('warning');
            }
            // Tick sound
            if (readTimer > 0 && readTimer < readTimerMax * 0.5) {
                if (timestamp - lastTickTime > 500) {
                    playSound('tick');
                    lastTickTime = timestamp;
                }
            }
            if (readTimer <= 0) {
                readTimer = 0;
                // Auto-snap: force random choice with penalty
                // Player can still choose but with penalty
            }

            drawField();
            drawRouteLines();
            if (hoveredWR >= 0) drawOpennessFan(hoveredWR);
            drawFormationInfo();

            // Draw defense (shown formation, may be disguise)
            if (currentPlay) {
                const shownDef = defenseDisguised ? defenseShownFormation : currentPlay.defense;

                // Pre-snap DB motion hints
                for (let i = 0; i < 4; i++) {
                    const db = shownDef.dbs[i];
                    let dbX = db.x, dbY = db.y;
                    // Man coverage hint: drift toward WR
                    if (db.role === 'man' && db.coverIdx >= 0) {
                        const wr = currentPlay.offense.wrs[db.coverIdx];
                        dbX += Math.sin(timestamp / 800) * 3;
                        dbY += (wr.y - db.y) * 0.05 * Math.sin(timestamp / 1000);
                    }
                    // Zone hint: drift toward zone area
                    if (db.role === 'deep') {
                        dbY += Math.sin(timestamp / 1200 + i) * 2;
                    }
                    drawPixelSprite(dbX, dbY, 'db', false, false, 'DB' + (i + 1), animFrame);
                }
                drawPixelSprite(shownDef.rusher.x, shownDef.rusher.y, 'rusher', false, false, 'RUSH', animFrame);

                // Draw offense
                for (let i = 0; i < 4; i++) {
                    const wr = currentPlay.offense.wrs[i];
                    drawPixelSprite(wr.x, wr.y, 'wr', true, i === hoveredWR, wrStats[i].name, animFrame);
                }
                drawPixelSprite(currentPlay.offense.qb.x, currentPlay.offense.qb.y, 'qb', true, false, 'QB', animFrame);
            }

            drawChoosePrompt();
            drawReadTimer();
            drawHUD();
            break;

        case 'simulation':
            updateSimulation(dt);
            drawField();
            drawRouteLines();

            if (simState) {
                for (let i = 0; i < 4; i++) {
                    const isChosen = i === simState.chosenWR;
                    drawPixelSprite(simState.wrPositions[i].x, simState.wrPositions[i].y,
                        'wr', true, isChosen, isChosen ? wrStats[i].name : '', animFrame);
                }
                for (let i = 0; i < 4; i++) {
                    drawPixelSprite(simState.dbPositions[i].x, simState.dbPositions[i].y,
                        'db', false, false, '', animFrame);
                }
                drawPixelSprite(simState.rusherPos.x, simState.rusherPos.y, 'rusher', false, false, '', animFrame);
                drawPixelSprite(simState.qbPos.x, simState.qbPos.y, 'qb', true, false, 'QB', animFrame);

                if (simState.ballPos && simState.phase !== 'snap' && simState.phase !== 'routes') {
                    drawBall(simState.ballPos.x, simState.ballPos.y);
                }

                if (simState.phase === 'catch' || simState.phase === 'result') {
                    drawResultOverlay();
                }

                drawFormationInfo();
            }
            drawHUD();
            break;

        case 'transition':
            transitionTimer += dt;
            // Quick fade
            drawField();
            drawHUD();
            ctx.fillStyle = `rgba(0,0,0,${Math.min(1, transitionTimer * 3)})`;
            ctx.fillRect(0, 0, W, H);

            if (transitionTimer > 0.4) {
                generatePlay();
                gameState = 'preSnap';
            }
            break;

        case 'upgrade':
            ctx.restore();
            drawUpgradeScreen();
            drawParticles();
            requestAnimationFrame(gameLoop);
            return;

        case 'gameOver':
            ctx.restore();
            drawGameOver();
            requestAnimationFrame(gameLoop);
            return;

        case 'victory':
            ctx.restore();
            drawVictory();
            drawParticles();
            requestAnimationFrame(gameLoop);
            return;
    }

    ctx.restore();

    // Draw particles on top (no camera transform)
    drawParticles();

    requestAnimationFrame(gameLoop);
}

// Start
requestAnimationFrame(gameLoop);
