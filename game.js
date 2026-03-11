// ============================================================
// QB Challenge - 像素腰旗橄榄球 Roguelike
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Constants ---
const FIELD_W = 480;
const FIELD_H = 640;
const SCALE = 1;
canvas.width = FIELD_W;
canvas.height = FIELD_H;

// Resize canvas to fit screen while keeping aspect ratio
function resizeCanvas() {
    const maxH = window.innerHeight - 20;
    const maxW = window.innerWidth - 20;
    const ratio = FIELD_W / FIELD_H;
    let w, h;
    if (maxW / maxH > ratio) {
        h = maxH;
        w = h * ratio;
    } else {
        w = maxW;
        h = w / ratio;
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Field dimensions in game units
const YARD_PX = 16; // pixels per yard
const LOS_Y = 400;  // line of scrimmage Y position
const ENDZONE_Y = 80;

// Colors
const C = {
    field: '#2d8a4e',
    fieldDark: '#267a43',
    line: '#ffffff',
    lineFaint: 'rgba(255,255,255,0.3)',
    endzone: '#c0392b',
    endzoneText: 'rgba(255,255,255,0.15)',
    offenseMain: '#2980b9',
    offenseLight: '#5dade2',
    defenseMain: '#e74c3c',
    defenseLight: '#f1948a',
    qb: '#f39c12',
    ball: '#8B4513',
    highlight: '#f1c40f',
    highlightGood: '#2ecc71',
    highlightBad: '#e74c3c',
    hud: '#16213e',
    hudText: '#eee',
    accent: '#e94560',
    gold: '#ffd700',
    darkOverlay: 'rgba(0,0,0,0.7)',
    buttonBg: '#0f3460',
    buttonHover: '#e94560',
};

// ============================================================
// GAME STATE
// ============================================================
let gameState = 'title'; // title, formation, choosing, simulation, result, upgrade, gameOver, victory
let currentLevel = 1;
let maxLevel = 10;
let score = 0;
let downs = { current: 1, yardsToGo: 20, ballPosition: 0 }; // ballPosition: yards gained toward endzone

// Player stats
let qbStats = {
    accuracy: 70,    // base throw accuracy %
    armStrength: 60,  // affects deep throws
    readSpeed: 0,     // bonus time to read defense (not used as timer, but affects hints)
    level: 1,
};

let wrStats = [
    { id: 0, name: 'WR1', speed: 60, catching: 65, routeRunning: 60, level: 1 },
    { id: 1, name: 'WR2', speed: 55, catching: 60, routeRunning: 65, level: 1 },
    { id: 2, name: 'WR3', speed: 65, catching: 55, routeRunning: 55, level: 1 },
    { id: 3, name: 'WR4', speed: 50, catching: 70, routeRunning: 60, level: 1 },
];

let defBuffs = [];  // active defense buffs
let offDebuffs = []; // debuffs applied to defense (beneficial for offense)

// Level scaling
function getDefenseBonus() {
    return (currentLevel - 1) * 5 + defBuffs.reduce((s, b) => s + b.value, 0);
}

// ============================================================
// FORMATIONS
// ============================================================

// Offense formations - positions relative to field center (240) and LOS
const offenseFormations = [
    {
        name: 'Shotgun Spread',
        qb: { x: 240, y: LOS_Y + 40 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'streak' },
            { x: 140, y: LOS_Y + 10, route: 'slant' },
            { x: 340, y: LOS_Y + 10, route: 'out' },
            { x: 420, y: LOS_Y - 5,  route: 'post' },
        ]
    },
    {
        name: 'Trips Right',
        qb: { x: 200, y: LOS_Y + 40 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'curl' },
            { x: 300, y: LOS_Y + 5,  route: 'slant' },
            { x: 360, y: LOS_Y - 5,  route: 'out' },
            { x: 420, y: LOS_Y + 5,  route: 'streak' },
        ]
    },
    {
        name: 'Trips Left',
        qb: { x: 280, y: LOS_Y + 40 },
        wrs: [
            { x: 60,  y: LOS_Y + 5,  route: 'streak' },
            { x: 120, y: LOS_Y - 5,  route: 'out' },
            { x: 180, y: LOS_Y + 5,  route: 'slant' },
            { x: 420, y: LOS_Y - 5,  route: 'curl' },
        ]
    },
    {
        name: 'Bunch Right',
        qb: { x: 200, y: LOS_Y + 40 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'post' },
            { x: 320, y: LOS_Y + 5,  route: 'flat' },
            { x: 340, y: LOS_Y - 10, route: 'slant' },
            { x: 360, y: LOS_Y + 5,  route: 'streak' },
        ]
    },
    {
        name: 'Empty Spread',
        qb: { x: 240, y: LOS_Y + 45 },
        wrs: [
            { x: 50,  y: LOS_Y - 5,  route: 'streak' },
            { x: 160, y: LOS_Y + 5,  route: 'drag' },
            { x: 320, y: LOS_Y + 5,  route: 'drag' },
            { x: 430, y: LOS_Y - 5,  route: 'streak' },
        ]
    },
    {
        name: 'Slot Left',
        qb: { x: 260, y: LOS_Y + 40 },
        wrs: [
            { x: 60,  y: LOS_Y - 5,  route: 'post' },
            { x: 160, y: LOS_Y + 5,  route: 'slant' },
            { x: 350, y: LOS_Y + 5,  route: 'curl' },
            { x: 430, y: LOS_Y - 5,  route: 'out' },
        ]
    },
];

// Defense formations
const defenseFormations = [
    {
        name: 'Cover 1',
        desc: '人盯人+1自由安全卫',
        rusher: { x: 240, y: LOS_Y - 15 },
        dbs: [
            { x: 80,  y: LOS_Y - 50, role: 'man', coverIdx: 0 },
            { x: 180, y: LOS_Y - 50, role: 'man', coverIdx: 1 },
            { x: 300, y: LOS_Y - 50, role: 'man', coverIdx: 2 },
            { x: 400, y: LOS_Y - 50, role: 'free', coverIdx: -1 },
        ]
    },
    {
        name: 'Cover 2 Zone',
        desc: '两深区域防守',
        rusher: { x: 240, y: LOS_Y - 15 },
        dbs: [
            { x: 120, y: LOS_Y - 100, role: 'deep', coverIdx: -1 },
            { x: 360, y: LOS_Y - 100, role: 'deep', coverIdx: -1 },
            { x: 140, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
            { x: 340, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
        ]
    },
    {
        name: 'Cover 3 Zone',
        desc: '三深区域防守',
        rusher: { x: 240, y: LOS_Y - 15 },
        dbs: [
            { x: 100, y: LOS_Y - 110, role: 'deep', coverIdx: -1 },
            { x: 240, y: LOS_Y - 120, role: 'deep', coverIdx: -1 },
            { x: 380, y: LOS_Y - 110, role: 'deep', coverIdx: -1 },
            { x: 240, y: LOS_Y - 40,  role: 'flat', coverIdx: -1 },
        ]
    },
    {
        name: 'Cover 4',
        desc: '四深区域防守',
        rusher: { x: 240, y: LOS_Y - 15 },
        dbs: [
            { x: 80,  y: LOS_Y - 90, role: 'deep', coverIdx: -1 },
            { x: 190, y: LOS_Y - 90, role: 'deep', coverIdx: -1 },
            { x: 290, y: LOS_Y - 90, role: 'deep', coverIdx: -1 },
            { x: 400, y: LOS_Y - 90, role: 'deep', coverIdx: -1 },
        ]
    },
    {
        name: 'Man Blitz',
        desc: '全人盯人+快速冲传',
        rusher: { x: 240, y: LOS_Y - 10, fast: true },
        dbs: [
            { x: 80,  y: LOS_Y - 30, role: 'man', coverIdx: 0 },
            { x: 180, y: LOS_Y - 30, role: 'man', coverIdx: 1 },
            { x: 300, y: LOS_Y - 30, role: 'man', coverIdx: 2 },
            { x: 400, y: LOS_Y - 30, role: 'man', coverIdx: 3 },
        ]
    },
];

// Route definitions: how each route moves from start position
const routePaths = {
    streak:  (sx, sy) => [{ x: sx, y: sy - 160 }],
    slant:   (sx, sy) => [{ x: sx + (sx < 240 ? 60 : -60), y: sy - 100 }],
    out:     (sx, sy) => [{ x: sx, y: sy - 60 }, { x: sx + (sx < 240 ? -70 : 70), y: sy - 60 }],
    post:    (sx, sy) => [{ x: sx, y: sy - 70 }, { x: sx + (sx < 240 ? 50 : -50), y: sy - 160 }],
    curl:    (sx, sy) => [{ x: sx, y: sy - 80 }, { x: sx + (sx < 240 ? -15 : 15), y: sy - 70 }],
    flat:    (sx, sy) => [{ x: sx + (sx < 240 ? -50 : 50), y: sy - 20 }],
    drag:    (sx, sy) => [{ x: sx + (sx < 240 ? 120 : -120), y: sy - 30 }],
    corner:  (sx, sy) => [{ x: sx, y: sy - 60 }, { x: sx + (sx < 240 ? -60 : 60), y: sy - 140 }],
};

// ============================================================
// PLAY LOGIC: determine best receiver
// ============================================================

let currentPlay = null; // { offense, defense, bestWR, wrScores, wrOpenness }

function generatePlay() {
    const offIdx = Math.floor(Math.random() * offenseFormations.length);
    const defIdx = Math.floor(Math.random() * defenseFormations.length);
    const offense = JSON.parse(JSON.stringify(offenseFormations[offIdx]));
    const defense = JSON.parse(JSON.stringify(defenseFormations[defIdx]));

    // For man coverage, remap coverIdx based on actual WR positions
    if (defense.dbs.some(db => db.role === 'man')) {
        const manDBs = defense.dbs.filter(db => db.role === 'man');
        // Sort WRs by x position, assign man coverage left to right
        const wrOrder = offense.wrs.map((w, i) => ({ ...w, idx: i })).sort((a, b) => a.x - b.x);
        manDBs.forEach((db, i) => {
            if (i < wrOrder.length) {
                db.coverIdx = wrOrder[i].idx;
                // Position man defender near their assignment
                db.x = offense.wrs[wrOrder[i].idx].x;
                db.y = offense.wrs[wrOrder[i].idx].y - 30;
            }
        });
    }

    // Calculate openness for each WR
    const wrScores = evaluateReceivers(offense, defense);
    const bestWR = wrScores.indexOf(Math.max(...wrScores));

    currentPlay = { offense, defense, bestWR, wrScores, offIdx, defIdx };
    return currentPlay;
}

function evaluateReceivers(offense, defense) {
    const scores = [];
    const defBonus = getDefenseBonus();

    for (let i = 0; i < 4; i++) {
        const wr = offense.wrs[i];
        const wrStat = wrStats[i];
        const routeEnd = getRouteEndpoint(wr);

        // Base score from WR stats
        let openness = wrStat.speed * 0.3 + wrStat.routeRunning * 0.4 + wrStat.catching * 0.3;

        // Apply off-debuffs (reduce defense effectiveness)
        let debuffReduction = offDebuffs.reduce((s, d) => s + d.value, 0);

        // Check coverage
        let closestDefDist = Infinity;
        for (const db of defense.dbs) {
            let defTarget;
            if (db.role === 'man' && db.coverIdx === i) {
                // Man coverage directly on this WR - very tight
                defTarget = routeEnd;
                const dist = 15; // tight man coverage
                closestDefDist = Math.min(closestDefDist, dist);
            } else if (db.role === 'man') {
                continue; // covering someone else
            } else {
                // Zone coverage - check if route endpoint falls in zone
                defTarget = getZonePosition(db, routeEnd);
                const dx = routeEnd.x - defTarget.x;
                const dy = routeEnd.y - defTarget.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                closestDefDist = Math.min(closestDefDist, dist);
            }
        }

        // Distance-based openness boost
        if (closestDefDist < 30) {
            openness -= (40 - closestDefDist) * 1.5;
        } else if (closestDefDist > 60) {
            openness += (closestDefDist - 60) * 0.5;
        }

        // Apply defense bonus (level scaling)
        openness -= (defBonus - debuffReduction) * 0.5;

        // Route-specific bonuses vs defense types
        const hasDeepZone = defense.dbs.some(db => db.role === 'deep');
        const hasFlatZone = defense.dbs.some(db => db.role === 'flat');
        if (wr.route === 'streak' && !hasDeepZone) openness += 25;
        if (wr.route === 'slant' && !hasFlatZone) openness += 15;
        if (wr.route === 'flat' && !hasFlatZone) openness += 20;
        if (wr.route === 'drag' && !hasFlatZone) openness += 18;
        if (wr.route === 'out' && hasDeepZone && !hasFlatZone) openness += 15;
        if (wr.route === 'post' && !hasDeepZone) openness += 22;
        if (wr.route === 'curl' && hasDeepZone) openness += 10;

        // Add some randomness
        openness += (Math.random() - 0.5) * 10;

        scores.push(Math.max(0, openness));
    }
    return scores;
}

function getRouteEndpoint(wr) {
    const path = routePaths[wr.route](wr.x, wr.y);
    return path[path.length - 1];
}

function getZonePosition(db, targetPos) {
    // Zone defender adjusts toward route endpoint
    if (db.role === 'deep') {
        return { x: db.x + (targetPos.x - db.x) * 0.4, y: Math.min(db.y, targetPos.y) };
    } else if (db.role === 'flat') {
        return { x: db.x + (targetPos.x - db.x) * 0.6, y: db.y + (targetPos.y - db.y) * 0.3 };
    } else if (db.role === 'free') {
        return { x: db.x + (targetPos.x - db.x) * 0.3, y: db.y + (targetPos.y - db.y) * 0.2 };
    }
    return { x: db.x, y: db.y };
}

// Calculate catch success probability
function calculateCatchProb(wrIndex) {
    const wr = wrStats[wrIndex];
    const play = currentPlay;
    const score = play.wrScores[wrIndex];
    const maxScore = Math.max(...play.wrScores);

    let prob = 40; // base probability

    // If this is the best read, significant bonus
    if (wrIndex === play.bestWR) {
        prob += 35;
    } else {
        // Partial credit based on how close to best
        prob += Math.max(0, 20 * (score / maxScore));
    }

    // QB accuracy matters
    prob += (qbStats.accuracy - 60) * 0.3;

    // WR catching stat
    prob += (wr.catching - 50) * 0.2;

    // Deep throws affected by arm strength
    const routeEnd = getRouteEndpoint(currentPlay.offense.wrs[wrIndex]);
    const throwDist = Math.abs(routeEnd.y - LOS_Y);
    if (throwDist > 100) {
        prob += (qbStats.armStrength - 60) * 0.3;
    }

    // Clamp
    return Math.max(5, Math.min(95, prob));
}

// ============================================================
// SIMULATION ANIMATION
// ============================================================

let simState = null;

function startSimulation(chosenWR) {
    const play = currentPlay;
    const wr = play.offense.wrs[chosenWR];
    const routeEndpoint = getRouteEndpoint(wr);
    const catchProb = calculateCatchProb(chosenWR);
    const success = Math.random() * 100 < catchProb;

    // Calculate yards gained on success
    let yardsGained = 0;
    if (success) {
        yardsGained = Math.round(Math.abs(routeEndpoint.y - LOS_Y) / YARD_PX) + Math.floor(Math.random() * 5);
    }

    simState = {
        phase: 'snap',       // snap, routes, throw, catch, result
        timer: 0,
        chosenWR,
        success,
        catchProb,
        yardsGained,
        // Animated positions
        wrPositions: play.offense.wrs.map(w => ({ x: w.x, y: w.y })),
        dbPositions: play.defense.dbs.map(db => ({ x: db.x, y: db.y })),
        rusherPos: { x: play.defense.rusher.x, y: play.defense.rusher.y },
        qbPos: { x: play.offense.qb.x, y: play.offense.qb.y },
        ballPos: null,
        ballTarget: null,
        routeProgress: 0,
        throwProgress: 0,
        resultTimer: 0,
    };
    gameState = 'simulation';
}

function updateSimulation(dt) {
    if (!simState) return;
    simState.timer += dt;

    switch (simState.phase) {
        case 'snap':
            if (simState.timer > 0.3) {
                simState.phase = 'routes';
                simState.timer = 0;
            }
            break;

        case 'routes':
            simState.routeProgress = Math.min(1, simState.timer / 1.2);

            // Move WRs along routes
            for (let i = 0; i < 4; i++) {
                const wr = currentPlay.offense.wrs[i];
                const path = routePaths[wr.route](wr.x, wr.y);
                const totalPoints = path.length;
                const segProgress = simState.routeProgress * totalPoints;
                const segIdx = Math.min(Math.floor(segProgress), totalPoints - 1);
                const segT = segProgress - segIdx;

                const fromX = segIdx === 0 ? wr.x : path[segIdx - 1].x;
                const fromY = segIdx === 0 ? wr.y : path[segIdx - 1].y;
                const toX = path[segIdx].x;
                const toY = path[segIdx].y;

                simState.wrPositions[i].x = fromX + (toX - fromX) * segT;
                simState.wrPositions[i].y = fromY + (toY - fromY) * segT;
            }

            // Move defenders
            for (let i = 0; i < 4; i++) {
                const db = currentPlay.defense.dbs[i];
                if (db.role === 'man' && db.coverIdx >= 0) {
                    const target = simState.wrPositions[db.coverIdx];
                    simState.dbPositions[i].x += (target.x - simState.dbPositions[i].x) * 0.04;
                    simState.dbPositions[i].y += (target.y - simState.dbPositions[i].y) * 0.04;
                } else {
                    // Zone defenders shift toward chosen WR
                    const target = simState.wrPositions[simState.chosenWR];
                    simState.dbPositions[i].x += (target.x - simState.dbPositions[i].x) * 0.015;
                    simState.dbPositions[i].y += (target.y - simState.dbPositions[i].y) * 0.01;
                }
            }

            // Move rusher toward QB
            const rushSpeed = currentPlay.defense.rusher.fast ? 0.05 : 0.03;
            simState.rusherPos.x += (simState.qbPos.x - simState.rusherPos.x) * rushSpeed;
            simState.rusherPos.y += (simState.qbPos.y - simState.rusherPos.y) * rushSpeed;

            // QB steps back slightly
            simState.qbPos.y += 0.3;

            if (simState.routeProgress >= 0.7) {
                simState.phase = 'throw';
                simState.timer = 0;
                simState.ballPos = { x: simState.qbPos.x, y: simState.qbPos.y };
                simState.ballTarget = { ...simState.wrPositions[simState.chosenWR] };
            }
            break;

        case 'throw':
            simState.throwProgress = Math.min(1, simState.timer / 0.6);
            simState.ballPos.x = simState.qbPos.x + (simState.ballTarget.x - simState.qbPos.x) * simState.throwProgress;
            simState.ballPos.y = simState.qbPos.y + (simState.ballTarget.y - simState.qbPos.y) * simState.throwProgress;

            // Continue moving players
            for (let i = 0; i < 4; i++) {
                const wr = currentPlay.offense.wrs[i];
                const path = routePaths[wr.route](wr.x, wr.y);
                const endPt = path[path.length - 1];
                simState.wrPositions[i].x += (endPt.x - simState.wrPositions[i].x) * 0.05;
                simState.wrPositions[i].y += (endPt.y - simState.wrPositions[i].y) * 0.05;

                const db = currentPlay.defense.dbs[i];
                if (db.role === 'man' && db.coverIdx >= 0) {
                    const target = simState.wrPositions[db.coverIdx];
                    simState.dbPositions[i].x += (target.x - simState.dbPositions[i].x) * 0.06;
                    simState.dbPositions[i].y += (target.y - simState.dbPositions[i].y) * 0.06;
                }
            }

            if (simState.throwProgress >= 1) {
                simState.phase = 'catch';
                simState.timer = 0;
            }
            break;

        case 'catch':
            if (simState.timer > 0.5) {
                simState.phase = 'result';
                simState.timer = 0;
            }
            break;

        case 'result':
            simState.resultTimer = Math.min(1, simState.timer / 0.5);
            if (simState.timer > 2.0) {
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
            // Touchdown!
            score += 600;
            if (currentLevel >= maxLevel) {
                gameState = 'victory';
            } else {
                gameState = 'upgrade';
                currentLevel++;
                downs = { current: 1, yardsToGo: 20, ballPosition: 0 };
                applyDefenseBuff();
            }
        } else if (simState.yardsGained >= downs.yardsToGo) {
            // First down
            downs.current = 1;
            downs.yardsToGo = Math.max(10, 40 - downs.ballPosition);
        } else {
            downs.current++;
            downs.yardsToGo -= simState.yardsGained;
            if (downs.current > 4) {
                // Turnover on downs
                gameState = 'gameOver';
                return;
            }
        }
    } else {
        downs.current++;
        if (downs.current > 4) {
            gameState = 'gameOver';
            return;
        }
    }

    if (gameState === 'simulation') {
        gameState = 'result';
    }
    simState = null;
}

// ============================================================
// UPGRADE SYSTEM
// ============================================================

let upgradeOptions = [];

const qbUpgrades = [
    { name: '精准臂力', desc: '传球精准度 +8', apply: () => { qbStats.accuracy += 8; } },
    { name: '火箭臂', desc: '臂力 +10', apply: () => { qbStats.armStrength += 10; } },
    { name: '快速阅读', desc: '阅读防守能力 +5', apply: () => { qbStats.readSpeed += 5; } },
    { name: '口袋感知', desc: '精准度+5, 臂力+5', apply: () => { qbStats.accuracy += 5; qbStats.armStrength += 5; } },
];

const wrUpgradePool = [
    { name: '闪电加速', desc: '速度 +10', stat: 'speed', value: 10 },
    { name: '黏手套', desc: '接球 +10', stat: 'catching', value: 10 },
    { name: '路线大师', desc: '跑路线 +10', stat: 'routeRunning', value: 10 },
    { name: '全面提升', desc: '所有属性 +5', stat: 'all', value: 5 },
];

const debuffPool = [
    { name: '迷雾干扰', desc: '防守反应速度降低', value: 8 },
    { name: '场地湿滑', desc: '防守移动能力降低', value: 10 },
    { name: '假动作', desc: '防守判断力降低', value: 6 },
    { name: '节奏变化', desc: '防守协调性降低', value: 12 },
];

const defBuffPool = [
    { name: '铁壁防守', desc: '防守覆盖能力增强', value: 8 },
    { name: '鹰眼', desc: '防守阅读进攻能力增强', value: 6 },
    { name: '闪电反应', desc: '防守反应速度增强', value: 10 },
    { name: '钢铁意志', desc: '防守整体实力提升', value: 7 },
];

function generateUpgradeOptions() {
    upgradeOptions = [];

    // Always offer 3 choices: QB upgrade, WR upgrade, defense debuff
    const qbOpt = qbUpgrades[Math.floor(Math.random() * qbUpgrades.length)];
    upgradeOptions.push({ type: 'qb', ...qbOpt });

    const wrOpt = wrUpgradePool[Math.floor(Math.random() * wrUpgradePool.length)];
    const wrTarget = Math.floor(Math.random() * 4);
    upgradeOptions.push({
        type: 'wr',
        target: wrTarget,
        name: `${wrStats[wrTarget].name} ${wrOpt.name}`,
        desc: `${wrStats[wrTarget].name}: ${wrOpt.desc}`,
        stat: wrOpt.stat,
        value: wrOpt.value,
    });

    const debOpt = debuffPool[Math.floor(Math.random() * debuffPool.length)];
    upgradeOptions.push({ type: 'debuff', ...debOpt });
}

function applyUpgrade(index) {
    const opt = upgradeOptions[index];
    if (opt.type === 'qb') {
        opt.apply();
        qbStats.level++;
    } else if (opt.type === 'wr') {
        const wr = wrStats[opt.target];
        if (opt.stat === 'all') {
            wr.speed += opt.value;
            wr.catching += opt.value;
            wr.routeRunning += opt.value;
        } else {
            wr[opt.stat] += opt.value;
        }
        wr.level++;
    } else if (opt.type === 'debuff') {
        offDebuffs.push({ name: opt.name, value: opt.value });
    }
}

function applyDefenseBuff() {
    if (currentLevel > 2 && Math.random() < 0.7) {
        const buff = defBuffPool[Math.floor(Math.random() * defBuffPool.length)];
        defBuffs.push({ ...buff });
    }
}

// ============================================================
// PIXEL ART DRAWING
// ============================================================

function drawPixelPlayer(x, y, color, facingUp, isHighlighted, label, isQB) {
    const px = Math.round(x);
    const py = Math.round(y);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(px - 5, py - 4, 10, 10);

    // Head
    ctx.fillStyle = '#fdd';
    ctx.fillRect(px - 3, py - 8, 6, 5);

    // Helmet
    ctx.fillStyle = color;
    ctx.fillRect(px - 4, py - 9, 8, 3);

    // Legs
    ctx.fillStyle = '#333';
    if (facingUp) {
        ctx.fillRect(px - 4, py + 6, 3, 4);
        ctx.fillRect(px + 1, py + 6, 3, 4);
    } else {
        ctx.fillRect(px - 4, py + 6, 3, 4);
        ctx.fillRect(px + 1, py + 6, 3, 4);
    }

    // Arms
    ctx.fillStyle = color;
    ctx.fillRect(px - 7, py - 2, 3, 6);
    ctx.fillRect(px + 5, py - 2, 3, 6);

    // Number on jersey
    if (isQB) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 2, py - 1, 1, 3);
        ctx.fillRect(px + 1, py - 1, 1, 3);
    }

    // Highlight ring
    if (isHighlighted) {
        ctx.strokeStyle = C.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Label
    if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, px, py + 20);
    }
}

function drawBall(x, y) {
    ctx.fillStyle = C.ball;
    ctx.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 4);
}

function drawField() {
    // Main field
    ctx.fillStyle = C.field;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Darker stripes
    for (let y = 0; y < FIELD_H; y += YARD_PX * 10) {
        ctx.fillStyle = C.fieldDark;
        ctx.fillRect(0, y, FIELD_W, YARD_PX * 5);
    }

    // End zone
    ctx.fillStyle = C.endzone;
    ctx.fillRect(0, 0, FIELD_W, ENDZONE_Y);
    ctx.fillStyle = C.endzoneText;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TOUCHDOWN', FIELD_W / 2, ENDZONE_Y / 2 + 10);

    // Yard lines
    for (let i = 0; i <= 20; i++) {
        const y = ENDZONE_Y + i * YARD_PX * 2;
        ctx.strokeStyle = i % 5 === 0 ? C.line : C.lineFaint;
        ctx.lineWidth = i % 5 === 0 ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(FIELD_W - 20, y);
        ctx.stroke();
    }

    // Yard numbers
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 1; i <= 4; i++) {
        const y = ENDZONE_Y + i * YARD_PX * 5 * 2;
        ctx.fillText(`${i * 10}`, 15, y + 4);
        ctx.fillText(`${i * 10}`, FIELD_W - 15, y + 4);
    }

    // Sidelines
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 0, FIELD_W - 10, FIELD_H);

    // Line of scrimmage
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(5, LOS_Y);
    ctx.lineTo(FIELD_W - 5, LOS_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // First down line
    if (downs.yardsToGo > 0) {
        const fdY = LOS_Y - downs.yardsToGo * YARD_PX;
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(5, fdY);
        ctx.lineTo(FIELD_W - 5, fdY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawRouteLines() {
    if (!currentPlay) return;
    for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i];
        const path = routePaths[wr.route](wr.x, wr.y);

        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(wr.x, wr.y);
        for (const pt of path) {
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow at end
        const endPt = path[path.length - 1];
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(endPt.x, endPt.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================================
// HUD & UI
// ============================================================

function drawHUD() {
    // Top bar
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, FIELD_H, FIELD_W, 60);

    ctx.fillStyle = C.hudText;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${currentLevel}/${maxLevel} 关`, 10, FIELD_H - 45);
    ctx.fillText(`得分: ${score}`, 10, FIELD_H - 30);

    ctx.textAlign = 'center';
    ctx.fillText(`${downs.current}档 ${downs.yardsToGo}码`, FIELD_W / 2, FIELD_H - 45);
    ctx.fillText(`推进: ${downs.ballPosition}/40码`, FIELD_W / 2, FIELD_H - 30);

    ctx.textAlign = 'right';
    ctx.fillText(`QB Lv.${qbStats.level} 精准:${qbStats.accuracy}`, FIELD_W - 10, FIELD_H - 45);
    ctx.fillText(`臂力:${qbStats.armStrength}`, FIELD_W - 10, FIELD_H - 30);
}

function drawFormationInfo() {
    if (!currentPlay) return;

    // Defense formation name
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(FIELD_W / 2 - 80, 10, 160, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`防守: ${defenseFormations[currentPlay.defIdx].name}`, FIELD_W / 2, 26);

    // Offense formation name
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(FIELD_W / 2 - 80, FIELD_H - 62, 160, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`进攻: ${offenseFormations[currentPlay.offIdx].name}`, FIELD_W / 2, FIELD_H - 46);
}

// Buttons for WR selection
let wrButtons = [];
let upgradeButtons = [];
let genericButtons = [];

function setupWRButtons() {
    wrButtons = [];
    if (!currentPlay) return;
    for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i];
        wrButtons.push({
            x: wr.x - 15,
            y: wr.y - 15,
            w: 30,
            h: 30,
            wrIndex: i,
        });
    }
}

function drawChoosePrompt() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(FIELD_W / 2 - 130, FIELD_H - 90, 260, 28);
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('点击选择你要传球的外接手!', FIELD_W / 2, FIELD_H - 72);

    // Show WR info on hover
    for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i];
        const stat = wrStats[i];
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(wr.x - 30, wr.y + 22, 60, 28);
        ctx.fillStyle = '#fff';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${stat.name} Lv${stat.level}`, wr.x, wr.y + 33);
        ctx.fillText(`${wr.route}`, wr.x, wr.y + 43);
    }
}

// ============================================================
// SCREENS
// ============================================================

function drawTitle() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Pixel art football
    const cx = FIELD_W / 2;
    ctx.fillStyle = C.ball;
    for (let i = -20; i <= 20; i++) {
        const h = Math.round(Math.sqrt(400 - i * i) * 0.6);
        ctx.fillRect(cx + i, 180 - h, 1, h * 2);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 1, 168, 2, 24);
    ctx.fillRect(cx - 6, 178, 12, 2);
    ctx.fillRect(cx - 4, 174, 2, 2);
    ctx.fillRect(cx + 2, 174, 2, 2);
    ctx.fillRect(cx - 4, 182, 2, 2);
    ctx.fillRect(cx + 2, 182, 2, 2);

    ctx.fillStyle = C.accent;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QB CHALLENGE', cx, 250);

    ctx.fillStyle = C.gold;
    ctx.font = '14px monospace';
    ctx.fillText('像素腰旗橄榄球', cx, 275);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText('阅读防守，选择正确的外接手', cx, 310);
    ctx.fillText('击败10关越来越强的防守!', cx, 330);

    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.fillText('5v5 腰旗橄榄球 x Roguelike', cx, 360);

    // Start button
    genericButtons = [{
        x: cx - 70, y: 400, w: 140, h: 40,
        text: '开始游戏',
        action: 'start',
    }];
    drawButton(genericButtons[0]);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.fillText('进攻: 1 QB + 4 WR', cx, 480);
    ctx.fillText('防守: 1 冲传手 + 4 防守后卫', cx, 496);
    ctx.fillText('每关需要推进40码达阵得分', cx, 512);
    ctx.fillText('4档进攻机会, 选错可能浪费档数', cx, 528);
}

function drawButton(btn, hover) {
    ctx.fillStyle = hover ? C.buttonHover : C.buttonBg;
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
}

function drawUpgradeScreen() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    ctx.fillStyle = C.gold;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('达阵得分!', FIELD_W / 2, 50);

    ctx.fillStyle = C.accent;
    ctx.font = '14px monospace';
    ctx.fillText(`进入第 ${currentLevel} 关`, FIELD_W / 2, 80);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText('选择一项升级:', FIELD_W / 2, 110);

    // Defense buff notice
    if (defBuffs.length > 0) {
        const lastBuff = defBuffs[defBuffs.length - 1];
        ctx.fillStyle = '#e74c3c';
        ctx.font = '10px monospace';
        ctx.fillText(`防守获得增强: ${lastBuff.name}`, FIELD_W / 2, 130);
    }

    upgradeButtons = [];
    for (let i = 0; i < upgradeOptions.length; i++) {
        const opt = upgradeOptions[i];
        const y = 160 + i * 120;

        const btn = { x: 40, y, w: FIELD_W - 80, h: 100, index: i };
        upgradeButtons.push(btn);

        ctx.fillStyle = C.buttonBg;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = i === 0 ? C.gold : i === 1 ? C.offenseMain : '#2ecc71';
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        const typeLabel = opt.type === 'qb' ? '[四分卫升级]' : opt.type === 'wr' ? '[外接手升级]' : '[防守减益]';
        ctx.fillStyle = i === 0 ? C.gold : i === 1 ? C.offenseLight : '#2ecc71';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(typeLabel, FIELD_W / 2, y + 25);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(opt.name, FIELD_W / 2, y + 50);

        ctx.fillStyle = '#aaa';
        ctx.font = '11px monospace';
        ctx.fillText(opt.desc, FIELD_W / 2, y + 72);
    }

    // Show current stats
    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`QB: 精准${qbStats.accuracy} 臂力${qbStats.armStrength}`, 20, FIELD_H - 40);
    let wrInfo = wrStats.map(w => `${w.name}:S${w.speed}/C${w.catching}/R${w.routeRunning}`).join('  ');
    ctx.fillText(wrInfo, 20, FIELD_H - 25);
}

function drawResultScreen() {
    if (!simState) return;

    // Draw field and players in final positions
    drawField();

    // Draw players in final positions
    for (let i = 0; i < 4; i++) {
        const isChosen = i === simState.chosenWR;
        drawPixelPlayer(
            simState.wrPositions[i].x, simState.wrPositions[i].y,
            C.offenseMain, true, isChosen,
            wrStats[i].name, false
        );
    }
    for (let i = 0; i < 4; i++) {
        drawPixelPlayer(
            simState.dbPositions[i].x, simState.dbPositions[i].y,
            C.defenseMain, false, false, 'DB' + (i + 1), false
        );
    }
    drawPixelPlayer(simState.rusherPos.x, simState.rusherPos.y, C.defenseLight, false, false, 'RUSH', false);
    drawPixelPlayer(simState.qbPos.x, simState.qbPos.y, C.qb, true, false, 'QB', true);

    // Draw ball at target
    if (simState.ballPos) {
        drawBall(simState.ballTarget.x, simState.ballTarget.y);
    }

    // Result overlay
    if (simState.phase === 'catch' || simState.phase === 'result') {
        const text = simState.success ? '接球成功!' : '传球失败!';
        const subText = simState.success ? `+${simState.yardsGained}码` : '没有推进';
        const color = simState.success ? C.highlightGood : C.highlightBad;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(FIELD_W / 2 - 100, 260, 200, 70);

        ctx.fillStyle = color;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, FIELD_W / 2, 290);

        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.fillText(subText, FIELD_W / 2, 315);

        // Show best WR info
        if (!simState.success || simState.chosenWR !== currentPlay.bestWR) {
            ctx.fillStyle = C.gold;
            ctx.font = '10px monospace';
            ctx.fillText(`最佳选择: ${wrStats[currentPlay.bestWR].name} (${currentPlay.offense.wrs[currentPlay.bestWR].route})`,
                FIELD_W / 2, 340);
        }
    }
}

function drawGameOver() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    ctx.fillStyle = C.highlightBad;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', FIELD_W / 2, 200);

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('进攻档数用尽!', FIELD_W / 2, 240);

    ctx.fillStyle = C.gold;
    ctx.font = '16px monospace';
    ctx.fillText(`最终得分: ${score}`, FIELD_W / 2, 280);
    ctx.fillText(`到达第 ${currentLevel} 关`, FIELD_W / 2, 310);

    genericButtons = [{
        x: FIELD_W / 2 - 70, y: 360, w: 140, h: 40,
        text: '重新开始',
        action: 'restart',
    }];
    drawButton(genericButtons[0]);
}

function drawVictory() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // Celebration pixels
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = [C.gold, C.accent, C.highlightGood, C.offenseLight][i % 4];
        const px = Math.random() * FIELD_W;
        const py = Math.random() * 300;
        ctx.fillRect(px, py + Math.sin(Date.now() / 500 + i) * 10, 4, 4);
    }

    ctx.fillStyle = C.gold;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜通关!', FIELD_W / 2, 200);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('你击败了所有10关!', FIELD_W / 2, 240);

    ctx.fillStyle = C.accent;
    ctx.font = '20px monospace';
    ctx.fillText(`最终得分: ${score}`, FIELD_W / 2, 290);

    // Stats
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(`QB 精准:${qbStats.accuracy} 臂力:${qbStats.armStrength}`, FIELD_W / 2, 340);
    ctx.fillText(`防守增强数: ${defBuffs.length}`, FIELD_W / 2, 360);
    ctx.fillText(`获得减益数: ${offDebuffs.length}`, FIELD_W / 2, 380);

    genericButtons = [{
        x: FIELD_W / 2 - 70, y: 420, w: 140, h: 40,
        text: '再来一次',
        action: 'restart',
    }];
    drawButton(genericButtons[0]);
}

// ============================================================
// INPUT HANDLING
// ============================================================

let mouseX = 0, mouseY = 0;
let hoveredWR = -1;
let hoveredButton = -1;

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_W / rect.width;
    const scaleY = FIELD_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    mouseX = pos.x;
    mouseY = pos.y;
});

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    mouseX = pos.x;
    mouseY = pos.y;
    handleClick(e);
});

function handleClick(e) {
    const pos = e.touches ? { x: mouseX, y: mouseY } : getCanvasPos(e);

    switch (gameState) {
        case 'title':
            for (const btn of genericButtons) {
                if (isInside(pos, btn)) {
                    if (btn.action === 'start') startNewGame();
                }
            }
            break;

        case 'choosing':
            for (const btn of wrButtons) {
                if (isInside(pos, btn)) {
                    startSimulation(btn.wrIndex);
                    return;
                }
            }
            // Also allow clicking on WR labels area
            for (let i = 0; i < 4; i++) {
                const wr = currentPlay.offense.wrs[i];
                if (pos.x > wr.x - 30 && pos.x < wr.x + 30 && pos.y > wr.y - 20 && pos.y < wr.y + 50) {
                    startSimulation(i);
                    return;
                }
            }
            break;

        case 'result':
            // Click anywhere to continue
            gameState = 'formation';
            generatePlay();
            setupWRButtons();
            setTimeout(() => { gameState = 'choosing'; }, 300);
            break;

        case 'upgrade':
            for (const btn of upgradeButtons) {
                if (isInside(pos, btn)) {
                    applyUpgrade(btn.index);
                    gameState = 'formation';
                    generatePlay();
                    setupWRButtons();
                    setTimeout(() => { gameState = 'choosing'; }, 300);
                    return;
                }
            }
            break;

        case 'gameOver':
        case 'victory':
            for (const btn of genericButtons) {
                if (isInside(pos, btn)) {
                    if (btn.action === 'restart') startNewGame();
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

    generatePlay();
    setupWRButtons();
    gameState = 'choosing';
}

// ============================================================
// MAIN GAME LOOP
// ============================================================

let lastTime = 0;

function drawResultOverlay() {
    if (!simState) return;
    const text = simState.success ? '接球成功!' : '传球失败!';
    const subText = simState.success ? `+${simState.yardsGained}码 | 成功率:${Math.round(simState.catchProb)}%` : `成功率:${Math.round(simState.catchProb)}%`;
    const color = simState.success ? C.highlightGood : C.highlightBad;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(FIELD_W / 2 - 120, 250, 240, 90);

    ctx.fillStyle = color;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, FIELD_W / 2, 280);

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(subText, FIELD_W / 2, 305);

    if (simState.chosenWR !== currentPlay.bestWR) {
        ctx.fillStyle = C.gold;
        ctx.font = '10px monospace';
        ctx.fillText(`最佳: ${wrStats[currentPlay.bestWR].name} (${currentPlay.offense.wrs[currentPlay.bestWR].route})`,
            FIELD_W / 2, 330);
    }
}

function isInsideCircle(mx, my, cx, cy, r) {
    return (mx - cx) * (mx - cx) + (my - cy) * (my - cy) < r * r;
}

let lastUpgradeLevel = 0;

function checkUpgradeGeneration() {
    if (gameState === 'upgrade' && currentLevel !== lastUpgradeLevel) {
        generateUpgradeOptions();
        lastUpgradeLevel = currentLevel;
    }
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    ctx.clearRect(0, 0, FIELD_W, FIELD_H);

    if (gameState === 'upgrade') {
        checkUpgradeGeneration();
        drawUpgradeScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    switch (gameState) {
        case 'title':
            drawTitle();
            break;

        case 'formation':
        case 'choosing':
            drawField();
            drawRouteLines();
            drawFormationInfo();

            if (currentPlay) {
                for (let i = 0; i < 4; i++) {
                    const wr = currentPlay.offense.wrs[i];
                    const isHover = isInsideCircle(mouseX, mouseY, wr.x, wr.y, 20);
                    drawPixelPlayer(wr.x, wr.y, C.offenseMain, true, isHover,
                        wrStats[i].name, false);
                }
                drawPixelPlayer(currentPlay.offense.qb.x, currentPlay.offense.qb.y,
                    C.qb, true, false, 'QB', true);

                for (let i = 0; i < 4; i++) {
                    const db = currentPlay.defense.dbs[i];
                    drawPixelPlayer(db.x, db.y, C.defenseMain, false, false, 'DB' + (i + 1), false);
                }
                drawPixelPlayer(currentPlay.defense.rusher.x, currentPlay.defense.rusher.y,
                    C.defenseLight, false, false, 'RUSH', false);
            }

            if (gameState === 'choosing') {
                drawChoosePrompt();
            }
            drawHUD();
            break;

        case 'simulation':
            updateSimulation(dt);
            drawField();

            if (simState) {
                drawRouteLines();

                for (let i = 0; i < 4; i++) {
                    const isChosen = i === simState.chosenWR;
                    drawPixelPlayer(
                        simState.wrPositions[i].x, simState.wrPositions[i].y,
                        isChosen ? C.offenseLight : C.offenseMain,
                        true, isChosen, wrStats[i].name, false
                    );
                }
                for (let i = 0; i < 4; i++) {
                    drawPixelPlayer(
                        simState.dbPositions[i].x, simState.dbPositions[i].y,
                        C.defenseMain, false, false, '', false
                    );
                }
                drawPixelPlayer(simState.rusherPos.x, simState.rusherPos.y,
                    C.defenseLight, false, false, '', false);
                drawPixelPlayer(simState.qbPos.x, simState.qbPos.y,
                    C.qb, true, false, 'QB', true);

                if (simState.ballPos && (simState.phase === 'throw' || simState.phase === 'catch' || simState.phase === 'result')) {
                    drawBall(simState.ballPos.x, simState.ballPos.y);
                }

                if (simState.phase === 'catch' || simState.phase === 'result') {
                    drawResultOverlay();
                }

                drawFormationInfo();
            }
            drawHUD();
            break;

        case 'result':
            drawField();
            drawRouteLines();
            drawFormationInfo();

            if (currentPlay) {
                for (let i = 0; i < 4; i++) {
                    const wr = currentPlay.offense.wrs[i];
                    const isBest = i === currentPlay.bestWR;
                    drawPixelPlayer(wr.x, wr.y, C.offenseMain, true, isBest, wrStats[i].name, false);
                }
                drawPixelPlayer(currentPlay.offense.qb.x, currentPlay.offense.qb.y,
                    C.qb, true, false, 'QB', true);
                for (let i = 0; i < 4; i++) {
                    const db = currentPlay.defense.dbs[i];
                    drawPixelPlayer(db.x, db.y, C.defenseMain, false, false, '', false);
                }
            }

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(FIELD_W / 2 - 100, FIELD_H / 2 + 80, 200, 30);
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('点击继续下一档', FIELD_W / 2, FIELD_H / 2 + 100);

            drawHUD();
            break;

        case 'gameOver':
            drawGameOver();
            break;

        case 'victory':
            drawVictory();
            break;
    }

    requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame(gameLoop);
