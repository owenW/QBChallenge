// ============================================================
// QB CHALLENGE V12 — 3D DYNASTY MODE (POLISHED)
// Three.js rebuild with broadcast camera, detailed players,
// stadium atmosphere, smooth animations
// ============================================================

// THREE is loaded globally via <script> tag — no import needed

// ============================================================
// CONSTANTS
// ============================================================
const WR_COLORS_HEX = [0x4488ff, 0xffcc00, 0x44ff88, 0xff66aa];
const WR_COLORS_CSS = ['#4488ff', '#ffcc00', '#44ff88', '#ff66aa'];
const FIELD_LENGTH = 100; // 50 yards * 2 scale
const FIELD_WIDTH = 60;
const YARD_SCALE = 2; // 1 yard = 2 units in 3D

function yardToZ(yard) { return -(yard * YARD_SCALE) + FIELD_LENGTH / 2; }
function laneToX(lane) { return (lane - 30) * (FIELD_WIDTH / 60); }
function fieldPos(yard, lane) { return new THREE.Vector3(laneToX(lane), 0, yardToZ(yard)); }

// Easing functions
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
}

// ============================================================
// THREE.JS SCENE SETUP
// ============================================================
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2a4a);
scene.fog = new THREE.FogExp2(0x1a2a4a, 0.004);

// Camera - broadcast TV angle
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(55, 35, 10);
camera.lookAt(0, 0, 0);

const cameraState = {
  target: new THREE.Vector3(0, 0, 0),
  offset: new THREE.Vector3(55, 35, 10),
  lerpSpeed: 0.035,
  shakeIntensity: 0,
  shakeDecay: 0.92,
  heroZoom: false,
  heroTimer: 0,
  currentAngle: 'broadcast', // 'broadcast', 'endzone', 'closeup'
  transitionProgress: 1,
};

// Lighting — Stadium atmosphere
const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
scene.add(ambientLight);

// Main sun/stadium key light
const sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
sunLight.position.set(40, 60, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -70;
sunLight.shadow.camera.right = 70;
sunLight.shadow.camera.top = 70;
sunLight.shadow.camera.bottom = -70;
sunLight.shadow.bias = -0.001;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);

// Fill light (cool side)
const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3);
fillLight.position.set(-30, 25, -20);
scene.add(fillLight);

// Rim/back light for player pop
const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
rimLight.position.set(-10, 30, -40);
scene.add(rimLight);

// Stadium lights (point lights for atmosphere)
const stadiumLights = [];
function createStadiumLights() {
  const positions = [
    [-38, 28, -55], [38, 28, -55],
    [-38, 28, 55], [38, 28, 55],
    [-38, 28, 0], [38, 28, 0],
  ];
  positions.forEach(([x, y, z]) => {
    const light = new THREE.PointLight(0xffeedd, 0.5, 100, 1.5);
    light.position.set(x, y, z);
    scene.add(light);
    stadiumLights.push(light);

    // Light fixture glow
    const glowGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(light.position);
    scene.add(glow);

    // Subtle lens flare effect via sprite
    const flareMat = new THREE.SpriteMaterial({
      color: 0xffeedd,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const flare = new THREE.Sprite(flareMat);
    flare.position.copy(light.position);
    flare.scale.set(4, 4, 1);
    scene.add(flare);
  });
}

// Sky hemisphere for atmosphere
const skyGeo = new THREE.SphereGeometry(200, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
const skyMat = new THREE.MeshBasicMaterial({
  color: 0x4488cc, side: THREE.BackSide, fog: false,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.position.y = -5;
scene.add(sky);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// SHARED MATERIALS (reuse for performance)
// ============================================================
const SharedMaterials = {
  white: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6, metalness: 0.1 }),
  darkBlue: new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.5, metalness: 0.15 }),
  red: new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, metalness: 0.1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.0 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.6 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.3, metalness: 0.7 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.7, metalness: 0.0 }),
  grass: null, // created in createField
};

// ============================================================
// 3D FIELD — HIGH QUALITY
// ============================================================
function createGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');

  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#2d7a2d');
  grad.addColorStop(1, '#3a8c3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Grass blade pattern
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const brightness = 0.85 + Math.random() * 0.3;
    const r = Math.floor(45 * brightness);
    const g = Math.floor(130 * brightness);
    const b = Math.floor(45 * brightness);
    ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
    ctx.fillRect(x, y, 1, 2 + Math.random() * 3);
  }

  // Mow stripes (alternating light/dark bands)
  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * c.height;
    const h = c.height / 20;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, y, c.width, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 8);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createField() {
  const group = new THREE.Group();

  // Main field plane with grass texture
  const grassTex = createGrassTexture();
  const fieldGeo = new THREE.PlaneGeometry(FIELD_WIDTH, FIELD_LENGTH, 1, 1);
  const fieldMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.85,
    metalness: 0.0,
    color: 0x44aa44,
  });
  SharedMaterials.grass = fieldMat;
  const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
  fieldMesh.rotation.x = -Math.PI / 2;
  fieldMesh.receiveShadow = true;
  group.add(fieldMesh);

  // Mow stripes overlay (subtle alternating bands)
  for (let i = 0; i < 10; i++) {
    const stripeGeo = new THREE.PlaneGeometry(FIELD_WIDTH, FIELD_LENGTH / 10);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x3a9a3a : 0x2d852d,
      transparent: true, opacity: 0.3,
      roughness: 0.9,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = 0.005;
    stripe.position.z = -FIELD_LENGTH / 2 + (i + 0.5) * (FIELD_LENGTH / 10);
    stripe.receiveShadow = true;
    group.add(stripe);
  }

  // Yard lines with glow effect
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let y = 0; y <= 50; y += 5) {
    const isMajor = y % 10 === 0;
    const w = isMajor ? 0.18 : 0.09;
    const lineGeo = new THREE.PlaneGeometry(FIELD_WIDTH * 0.95, w);
    const line = new THREE.Mesh(lineGeo, lineMat.clone());
    line.material.transparent = true;
    line.material.opacity = isMajor ? 0.85 : 0.45;
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.015;
    line.position.z = yardToZ(y);
    group.add(line);
  }

  // Hash marks
  const hashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
  for (let y = 0; y <= 50; y++) {
    for (const xOff of [-10, 10]) {
      const hashGeo = new THREE.PlaneGeometry(0.8, 0.08);
      const hash = new THREE.Mesh(hashGeo, hashMat);
      hash.rotation.x = -Math.PI / 2;
      hash.position.set(xOff, 0.016, yardToZ(y));
      group.add(hash);
    }
  }

  // Yard numbers with better quality
  const numberPositions = [10, 20, 30, 40];
  numberPositions.forEach(y => {
    for (const side of [-1, 1]) {
      const numCanvas = document.createElement('canvas');
      numCanvas.width = 128; numCanvas.height = 128;
      const ctx = numCanvas.getContext('2d');
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(y), 64, 64);
      const numTex = new THREE.CanvasTexture(numCanvas);
      const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true, side: THREE.DoubleSide });
      const numGeo = new THREE.PlaneGeometry(5, 5);
      const numMesh = new THREE.Mesh(numGeo, numMat);
      numMesh.rotation.x = -Math.PI / 2;
      numMesh.rotation.z = side > 0 ? 0 : Math.PI;
      numMesh.position.set(side * 22, 0.02, yardToZ(y));
      group.add(numMesh);
    }
  });

  // End zones with gradient feel
  const ezLength = 10 * YARD_SCALE;
  // Own end zone
  const ezOwnGeo = new THREE.PlaneGeometry(FIELD_WIDTH, ezLength);
  const ezOwnMat = new THREE.MeshStandardMaterial({ color: 0x162d50, roughness: 0.7 });
  const ezOwn = new THREE.Mesh(ezOwnGeo, ezOwnMat);
  ezOwn.rotation.x = -Math.PI / 2;
  ezOwn.position.set(0, 0.003, FIELD_LENGTH / 2 + ezLength / 2);
  ezOwn.receiveShadow = true;
  group.add(ezOwn);

  // Defense end zone
  const ezDefGeo = new THREE.PlaneGeometry(FIELD_WIDTH, ezLength);
  const ezDefMat = new THREE.MeshStandardMaterial({ color: 0x6b1515, roughness: 0.7 });
  const ezDef = new THREE.Mesh(ezDefGeo, ezDefMat);
  ezDef.rotation.x = -Math.PI / 2;
  ezDef.position.set(0, 0.003, -FIELD_LENGTH / 2 - ezLength / 2);
  ezDef.receiveShadow = true;
  group.add(ezDef);

  // End zone text — bold, professional
  for (const [text, z] of [['Q B  C H A L L E N G E', FIELD_LENGTH / 2 + ezLength / 2], ['D E F E N S E', -FIELD_LENGTH / 2 - ezLength / 2]]) {
    const tc = document.createElement('canvas');
    tc.width = 1024; tc.height = 128;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = 'rgba(255,255,255,0.35)';
    tctx.font = 'bold 64px Arial';
    tctx.textAlign = 'center'; tctx.textBaseline = 'middle';
    tctx.fillText(text, 512, 64);
    const ttex = new THREE.CanvasTexture(tc);
    const tmat = new THREE.MeshBasicMaterial({ map: ttex, transparent: true, side: THREE.DoubleSide });
    const tgeo = new THREE.PlaneGeometry(40, 5);
    const tmesh = new THREE.Mesh(tgeo, tmat);
    tmesh.rotation.x = -Math.PI / 2;
    tmesh.position.set(0, 0.025, z);
    group.add(tmesh);
  }

  // Sidelines — thick white border
  for (const x of [-FIELD_WIDTH / 2, FIELD_WIDTH / 2]) {
    const sideGeo = new THREE.PlaneGeometry(0.3, FIELD_LENGTH + ezLength * 2);
    const sideMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const side = new THREE.Mesh(sideGeo, sideMat);
    side.rotation.x = -Math.PI / 2;
    side.position.set(x, 0.015, 0);
    group.add(side);
  }

  // End lines
  for (const z of [FIELD_LENGTH / 2, -FIELD_LENGTH / 2]) {
    const endGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 0.25);
    const endMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const end = new THREE.Mesh(endGeo, endMat);
    end.rotation.x = -Math.PI / 2;
    end.position.set(0, 0.015, z);
    group.add(end);
  }

  // Surround ground
  const groundGeo = new THREE.PlaneGeometry(300, 400);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // Sideline warning track (orange/red strip)
  for (const x of [-1, 1]) {
    const trackGeo = new THREE.PlaneGeometry(3, FIELD_LENGTH + ezLength * 2);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8, transparent: true, opacity: 0.5 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(x * (FIELD_WIDTH / 2 + 1.8), 0.002, 0);
    track.receiveShadow = true;
    group.add(track);
  }

  return group;
}

// ============================================================
// STADIUM ENVIRONMENT
// ============================================================
function createStadium() {
  const group = new THREE.Group();

  // Stadium stands — bleachers on each side
  const standColor = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
  const crowdColor = new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.9 });

  // Side stands
  for (const xSide of [-1, 1]) {
    // Main structure
    const standGeo = new THREE.BoxGeometry(12, 15, FIELD_LENGTH + 50);
    const stand = new THREE.Mesh(standGeo, standColor);
    stand.position.set(xSide * 48, 5, 0);
    stand.receiveShadow = true;
    group.add(stand);

    // Crowd silhouette (rows of small boxes)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 30; col++) {
        const z = -70 + col * 5 + (Math.random() - 0.5) * 2;
        const crowdGeo = new THREE.BoxGeometry(
          0.6 + Math.random() * 0.3,
          0.8 + Math.random() * 0.4,
          0.5 + Math.random() * 0.2
        );
        // Random team colors for crowd
        const r = Math.random();
        const crowdMat = new THREE.MeshStandardMaterial({
          color: r < 0.3 ? 0x1e3a5f : r < 0.5 ? 0xffffff : r < 0.7 ? 0xcc2222 : 0x444466,
          roughness: 0.9
        });
        const person = new THREE.Mesh(crowdGeo, crowdMat);
        person.position.set(
          xSide * (42 + row * 2) + (Math.random() - 0.5),
          11 + row * 1.5 + Math.random() * 0.3,
          z
        );
        group.add(person);
      }
    }
  }

  // End zone stands
  for (const zSide of [-1, 1]) {
    const standGeo = new THREE.BoxGeometry(FIELD_WIDTH + 20, 10, 8);
    const stand = new THREE.Mesh(standGeo, standColor);
    stand.position.set(0, 3, zSide * 82);
    group.add(stand);
  }

  // Light poles
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.5 });
  const polePositions = [
    [-40, -60], [-40, 0], [-40, 60],
    [40, -60], [40, 0], [40, 60],
  ];
  polePositions.forEach(([x, z]) => {
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 30, 6);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 15, z);
    pole.castShadow = true;
    group.add(pole);

    // Light head
    const headGeo = new THREE.BoxGeometry(3, 0.5, 2);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(x, 30, z);
    group.add(head);
  });

  // Goal posts at end zones
  const goalPostMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.3, metalness: 0.5 });
  for (const zSide of [-1, 1]) {
    const gpZ = zSide * (FIELD_LENGTH / 2 + 10 * YARD_SCALE);
    // Main post
    const postGeo = new THREE.CylinderGeometry(0.12, 0.15, 12, 6);
    const post = new THREE.Mesh(postGeo, goalPostMat);
    post.position.set(0, 6, gpZ);
    group.add(post);
    // Crossbar
    const crossGeo = new THREE.CylinderGeometry(0.08, 0.08, 8, 6);
    const cross = new THREE.Mesh(crossGeo, goalPostMat);
    cross.position.set(0, 12, gpZ);
    cross.rotation.z = Math.PI / 2;
    group.add(cross);
    // Uprights
    for (const side of [-1, 1]) {
      const upGeo = new THREE.CylinderGeometry(0.07, 0.07, 8, 6);
      const up = new THREE.Mesh(upGeo, goalPostMat);
      up.position.set(side * 4, 16, gpZ);
      group.add(up);
    }
  }

  // Scoreboard behind end zone
  const boardGeo = new THREE.BoxGeometry(20, 8, 1);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.3 });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 12, -88);
  group.add(board);

  // Scoreboard text
  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = 512; sbCanvas.height = 256;
  const sbCtx = sbCanvas.getContext('2d');
  sbCtx.fillStyle = '#0a0a1a';
  sbCtx.fillRect(0, 0, 512, 256);
  sbCtx.fillStyle = '#ffd700';
  sbCtx.font = 'bold 48px Arial';
  sbCtx.textAlign = 'center';
  sbCtx.fillText('QB CHALLENGE', 256, 80);
  sbCtx.fillStyle = '#1e90ff';
  sbCtx.font = 'bold 32px Arial';
  sbCtx.fillText('3D DYNASTY', 256, 130);
  sbCtx.fillStyle = '#ffffff';
  sbCtx.font = '20px Arial';
  sbCtx.fillText('V12', 256, 180);
  const sbTex = new THREE.CanvasTexture(sbCanvas);
  const sbTexMat = new THREE.MeshBasicMaterial({ map: sbTex });
  const sbFace = new THREE.Mesh(new THREE.PlaneGeometry(19, 7.5), sbTexMat);
  sbFace.position.set(0, 12, -87.4);
  group.add(sbFace);

  return group;
}

// ============================================================
// 3D PLAYER (Detailed articulated model)
// ============================================================
function createPlayer(config) {
  const { color, number, heightScale = 1, widthScale = 1, isQB = false, helmetColor, hasVisor = false,
    visorColor = 0x4488ff, hasGloves = false, gloveColor = 0xff0000, hasHeadband = false,
    accentColor } = config;

  const group = new THREE.Group();
  const H = 2.4 * heightScale;
  const W = widthScale;

  // Color materials
  const jerseyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.6, metalness: 0.05,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: isQB ? 0x1e3a5f : (color === 0xcc2222 ? 0xeeeeee : 0x1e3a5f),
    roughness: 0.7,
  });

  // === TORSO ===
  const torsoGeo = new THREE.CylinderGeometry(0.38 * W, 0.32 * W, H * 0.35, 8);
  const torso = new THREE.Mesh(torsoGeo, jerseyMat);
  torso.position.y = H * 0.42;
  torso.castShadow = true;
  group.add(torso);

  // === SHOULDER PADS ===
  const padGeo = new THREE.BoxGeometry(0.38 * W * 2.8, 0.18, 0.38 * W * 2.0);
  const padMat = new THREE.MeshStandardMaterial({
    color: isQB ? 0xe8e8e8 : (color === 0xcc2222 ? 0xbb2020 : 0xe8e8e8),
    roughness: 0.4, metalness: 0.2,
  });
  const pads = new THREE.Mesh(padGeo, padMat);
  pads.position.y = H * 0.62;
  pads.castShadow = true;
  group.add(pads);

  // Pad edge detail
  const padEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.38 * W * 2.9, 0.04, 0.38 * W * 2.1),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.4 })
  );
  padEdge.position.y = H * 0.64;
  group.add(padEdge);

  // === ARMS (articulated) ===
  const armGroup = new THREE.Group();
  armGroup.position.y = H * 0.55;
  group.add(armGroup);
  armGroup.name = 'armGroup';

  for (const side of [-1, 1]) {
    const armContainer = new THREE.Group();
    armContainer.position.x = side * 0.45 * W;
    armContainer.name = side > 0 ? 'rightArm' : 'leftArm';

    // Upper arm
    const upperArmGeo = new THREE.CylinderGeometry(0.1, 0.09, H * 0.2, 6);
    const upperArm = new THREE.Mesh(upperArmGeo, jerseyMat);
    upperArm.position.y = -H * 0.05;
    upperArm.rotation.z = side * 0.15; // slight angle out
    upperArm.castShadow = true;
    armContainer.add(upperArm);

    // Forearm
    const forearmGeo = new THREE.CylinderGeometry(0.08, 0.07, H * 0.18, 6);
    const foreArm = new THREE.Mesh(forearmGeo, SharedMaterials.skin.clone());
    foreArm.position.y = -H * 0.2;
    foreArm.castShadow = true;
    armContainer.add(foreArm);

    // Hand
    const handGeo = new THREE.SphereGeometry(0.09, 6, 5);
    const handMat = hasGloves
      ? new THREE.MeshStandardMaterial({ color: gloveColor, roughness: 0.5 })
      : SharedMaterials.skin.clone();
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.y = -H * 0.3;
    hand.castShadow = true;
    hand.name = side > 0 ? 'rightHand' : 'leftHand';
    armContainer.add(hand);

    armGroup.add(armContainer);
  }

  // === LEGS ===
  const legGroup = new THREE.Group();
  legGroup.name = 'legGroup';
  legGroup.position.y = H * 0.15;
  group.add(legGroup);

  for (const side of [-1, 1]) {
    const legContainer = new THREE.Group();
    legContainer.position.x = side * 0.15;
    legContainer.name = side > 0 ? 'rightLeg' : 'leftLeg';

    // Thigh
    const thighGeo = new THREE.CylinderGeometry(0.13, 0.11, H * 0.22, 6);
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.position.y = -H * 0.03;
    thigh.castShadow = true;
    legContainer.add(thigh);

    // Shin
    const shinGeo = new THREE.CylinderGeometry(0.1, 0.08, H * 0.2, 6);
    const shin = new THREE.Mesh(shinGeo, pantsMat);
    shin.position.y = -H * 0.17;
    shin.castShadow = true;
    legContainer.add(shin);

    // Cleat
    const cleatGeo = new THREE.BoxGeometry(0.18, 0.08, 0.28);
    const cleat = new THREE.Mesh(cleatGeo, SharedMaterials.black);
    cleat.position.set(0, -H * 0.22, 0.04);
    cleat.castShadow = true;
    legContainer.add(cleat);

    legGroup.add(legContainer);
  }

  // === HELMET ===
  const helmR = 0.32;
  const helmGeo = new THREE.SphereGeometry(helmR, 16, 12);
  const hColor = helmetColor || (color === 0xcc2222 ? 0xcc2222 : 0xf0f0f0);
  const helmMat = new THREE.MeshStandardMaterial({
    color: hColor, roughness: 0.25, metalness: 0.3,
  });
  const helmet = new THREE.Mesh(helmGeo, helmMat);
  helmet.position.y = H * 0.78;
  helmet.scale.set(1, 1.05, 1.05);
  helmet.castShadow = true;
  group.add(helmet);

  // Helmet stripe
  const stripeColor = color === 0xcc2222 ? 0xffffff : 0x1e3a5f;
  const stripeGeo = new THREE.BoxGeometry(0.03, 0.45, 0.06);
  const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.4 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = H * 0.82;
  group.add(stripe);

  // Facemask — grid style
  const fmMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
  // Horizontal bars
  for (let i = 0; i < 3; i++) {
    const barGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4);
    const bar = new THREE.Mesh(barGeo, fmMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, H * 0.74 + i * 0.04, helmR * 0.9);
    group.add(bar);
  }
  // Vertical bars
  for (let i = -1; i <= 1; i++) {
    const vbarGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4);
    const vbar = new THREE.Mesh(vbarGeo, fmMat);
    vbar.position.set(i * 0.06, H * 0.76, helmR * 0.9);
    group.add(vbar);
  }

  // Visor
  if (hasVisor) {
    const visorGeo = new THREE.SphereGeometry(helmR - 0.02, 12, 6, -Math.PI * 0.4, Math.PI * 0.8, 0, Math.PI * 0.35);
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor, transparent: true, opacity: 0.5,
      roughness: 0.1, metalness: 0.3,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, H * 0.8, 0.05);
    visor.rotation.x = -0.3;
    group.add(visor);
  }

  // Headband
  if (hasHeadband) {
    const hbGeo = new THREE.TorusGeometry(helmR + 0.02, 0.025, 4, 20);
    const hbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const hb = new THREE.Mesh(hbGeo, hbMat);
    hb.position.y = H * 0.82;
    hb.rotation.x = Math.PI / 2;
    group.add(hb);
  }

  // QB gold chin strap
  if (isQB) {
    const chinGeo = new THREE.TorusGeometry(0.07, 0.012, 4, 10, Math.PI);
    const chin = new THREE.Mesh(chinGeo, SharedMaterials.gold);
    chin.position.set(0, H * 0.71, helmR * 0.5);
    chin.rotation.z = Math.PI;
    group.add(chin);

    // QB Captain's C patch
    const cGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
    const cMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3 });
    const cPatch = new THREE.Mesh(cGeo, cMat);
    cPatch.position.set(0.3 * W, H * 0.55, 0.35 * W);
    group.add(cPatch);
  }

  // WR accent stripe on helmet sides
  if (accentColor) {
    for (const side of [-1, 1]) {
      const aGeo = new THREE.BoxGeometry(0.02, 0.15, 0.2);
      const aMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.2 });
      const accent = new THREE.Mesh(aGeo, aMat);
      accent.position.set(side * (helmR - 0.02), H * 0.79, 0.05);
      group.add(accent);
    }
  }

  // Jersey number — front and back
  if (number) {
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 128; numCanvas.height = 128;
    const ctx = numCanvas.getContext('2d');
    const numColor = color === 0xffffff || color === 0xf0f0f0 ? '#1e3a5f' : '#ffffff';
    // Outline for readability
    ctx.strokeStyle = numColor === '#ffffff' ? '#000000' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(number), 64, 64);
    ctx.fillStyle = numColor;
    ctx.fillText(String(number), 64, 64);
    const numTex = new THREE.CanvasTexture(numCanvas);
    const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true, side: THREE.DoubleSide });
    const numGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const numFront = new THREE.Mesh(numGeo, numMat);
    numFront.position.set(0, H * 0.48, 0.35 * W + 0.01);
    group.add(numFront);
    const numBack = new THREE.Mesh(numGeo, numMat.clone());
    numBack.position.set(0, H * 0.48, -(0.35 * W + 0.01));
    numBack.rotation.y = Math.PI;
    group.add(numBack);
  }

  // Shadow circle on ground (baked shadow)
  const shadowGeo = new THREE.CircleGeometry(0.55 * W, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.userData = {
    idleBob: Math.random() * Math.PI * 2,
    config,
    runPhase: Math.random() * Math.PI * 2,
    throwPhase: 0,
    isAnimating: false,
  };
  return group;
}

// Player animation helpers
function animatePlayerRun(player, dt, speed = 1) {
  const data = player.userData;
  data.runPhase += dt * 8 * speed;

  const legGroup = player.getObjectByName('legGroup');
  const armGroup = player.getObjectByName('armGroup');
  if (!legGroup || !armGroup) return;

  const rightLeg = legGroup.getObjectByName('rightLeg');
  const leftLeg = legGroup.getObjectByName('leftLeg');
  const rightArm = armGroup.getObjectByName('rightArm');
  const leftArm = armGroup.getObjectByName('leftArm');

  if (rightLeg && leftLeg) {
    const swing = Math.sin(data.runPhase) * 0.5 * speed;
    rightLeg.rotation.x = swing;
    leftLeg.rotation.x = -swing;
  }
  if (rightArm && leftArm) {
    const armSwing = Math.sin(data.runPhase) * 0.35 * speed;
    rightArm.rotation.x = -armSwing;
    leftArm.rotation.x = armSwing;
  }
}

function animatePlayerIdle(player, time) {
  const bob = player.userData.idleBob || 0;
  const legGroup = player.getObjectByName('legGroup');
  const armGroup = player.getObjectByName('armGroup');

  // Subtle weight shift
  if (legGroup) {
    const rightLeg = legGroup.getObjectByName('rightLeg');
    const leftLeg = legGroup.getObjectByName('leftLeg');
    if (rightLeg) rightLeg.rotation.x = Math.sin(time * 1.5 + bob) * 0.03;
    if (leftLeg) leftLeg.rotation.x = Math.sin(time * 1.5 + bob + Math.PI) * 0.03;
  }
  if (armGroup) {
    const rightArm = armGroup.getObjectByName('rightArm');
    const leftArm = armGroup.getObjectByName('leftArm');
    if (rightArm) rightArm.rotation.x = Math.sin(time * 1.2 + bob) * 0.05;
    if (leftArm) leftArm.rotation.x = Math.sin(time * 1.2 + bob + 1) * 0.05;
  }
}

function animatePlayerThrow(player, progress) {
  const armGroup = player.getObjectByName('armGroup');
  if (!armGroup) return;
  const rightArm = armGroup.getObjectByName('rightArm');
  if (!rightArm) return;

  if (progress < 0.4) {
    // Wind up
    const t = progress / 0.4;
    rightArm.rotation.x = -1.2 * t; // Pull back
    rightArm.rotation.z = -0.3 * t;
  } else if (progress < 0.7) {
    // Release
    const t = (progress - 0.4) / 0.3;
    rightArm.rotation.x = -1.2 + 2.5 * easeOutCubic(t); // Throw forward
    rightArm.rotation.z = -0.3 + 0.5 * t;
  } else {
    // Follow through
    const t = (progress - 0.7) / 0.3;
    rightArm.rotation.x = 1.3 - 1.3 * t;
    rightArm.rotation.z = 0.2 * (1 - t);
  }
}

function animatePlayerCatch(player, progress) {
  const armGroup = player.getObjectByName('armGroup');
  if (!armGroup) return;
  const rightArm = armGroup.getObjectByName('rightArm');
  const leftArm = armGroup.getObjectByName('leftArm');

  if (progress < 0.5) {
    // Arms up
    const t = easeOutCubic(progress / 0.5);
    if (rightArm) { rightArm.rotation.x = -1.0 * t; rightArm.rotation.z = 0.3 * t; }
    if (leftArm) { leftArm.rotation.x = -1.0 * t; leftArm.rotation.z = -0.3 * t; }
  } else {
    // Arms down (secure ball)
    const t = (progress - 0.5) / 0.5;
    if (rightArm) { rightArm.rotation.x = -1.0 + 0.7 * t; rightArm.rotation.z = 0.3 - 0.3 * t; }
    if (leftArm) { leftArm.rotation.x = -1.0 + 0.7 * t; leftArm.rotation.z = -0.3 + 0.3 * t; }
  }
}

// ============================================================
// 3D FOOTBALL (detailed)
// ============================================================
function createFootball() {
  const group = new THREE.Group();

  // Ball shape (elongated sphere)
  const ballGeo = new THREE.SphereGeometry(0.18, 16, 12);
  ballGeo.scale(1.7, 1, 1);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0x8b5e3c, roughness: 0.6, metalness: 0.05,
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;
  group.add(ball);

  // Laces (multiple stitches)
  const laceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  for (let i = -2; i <= 2; i++) {
    const lGeo = new THREE.BoxGeometry(0.04, 0.015, 0.015);
    const lace = new THREE.Mesh(lGeo, laceMat);
    lace.position.set(i * 0.06, 0.18, 0);
    group.add(lace);
  }
  // Lace line
  const lineGeo = new THREE.BoxGeometry(0.28, 0.008, 0.008);
  const line = new THREE.Mesh(lineGeo, laceMat);
  line.position.y = 0.17;
  group.add(line);

  // Stripe details
  for (const x of [-0.2, 0.2]) {
    const sGeo = new THREE.TorusGeometry(0.17, 0.005, 4, 16);
    const sMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const s = new THREE.Mesh(sGeo, sMat);
    s.position.x = x;
    s.rotation.y = Math.PI / 2;
    group.add(s);
  }

  // Shadow under ball
  const shadowGeo = new THREE.CircleGeometry(0.12, 10);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.name = 'ballShadow';
  group.add(shadow);

  group.visible = false;
  return group;
}

// ============================================================
// 3D ROUTE LINES (dashed, animated)
// ============================================================
function createRouteLine(color) {
  const mat = new THREE.LineDashedMaterial({
    color, transparent: true, opacity: 0.8,
    dashSize: 0.5, gapSize: 0.25,
    linewidth: 1,
  });
  const points = [new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(0, 0.15, 0)];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, mat);
  line.visible = false;
  return line;
}

// Route endpoint marker (pulsing crosshair)
function createRouteTarget(color) {
  const group = new THREE.Group();
  // Outer ring
  const ringGeo = new THREE.RingGeometry(0.4, 0.55, 20);
  const ringMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);
  // Inner dot
  const dotGeo = new THREE.CircleGeometry(0.12, 10);
  const dotMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.rotation.x = -Math.PI / 2;
  dot.position.y = 0.01;
  group.add(dot);
  // Pulse ring
  const pulseGeo = new THREE.RingGeometry(0.55, 0.6, 20);
  const pulseMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
  });
  const pulse = new THREE.Mesh(pulseGeo, pulseMat);
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = -0.005;
  pulse.name = 'pulse';
  group.add(pulse);

  group.position.y = 0.06;
  group.visible = false;
  return group;
}

// ============================================================
// PARTICLE SYSTEM (3D) — Enhanced
// ============================================================
const particles3D = [];
function addParticles3D(pos, color, count, speed = 3, life = 1, opts = {}) {
  const { sizeMin = 0.04, sizeMax = 0.1, gravity = -6, shape = 'sphere' } = opts;
  for (let i = 0; i < count; i++) {
    let geo;
    if (shape === 'confetti') {
      geo = new THREE.PlaneGeometry(0.15 + Math.random() * 0.1, 0.08 + Math.random() * 0.05);
    } else {
      geo = new THREE.SphereGeometry(sizeMin + Math.random() * (sizeMax - sizeMin), 4, 3);
    }
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    particles3D.push({
      mesh,
      vx: (Math.random() - 0.5) * speed,
      vy: Math.random() * speed * 0.8 + speed * 0.3,
      vz: (Math.random() - 0.5) * speed,
      life,
      maxLife: life,
      gravity,
      rotSpeed: (Math.random() - 0.5) * 10,
    });
  }
}

function updateParticles3D(dt) {
  for (let i = particles3D.length - 1; i >= 0; i--) {
    const p = particles3D[i];
    p.life -= dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy += p.gravity * dt;
    p.mesh.rotation.x += p.rotSpeed * dt;
    p.mesh.rotation.y += p.rotSpeed * 0.7 * dt;
    const alpha = Math.max(0, p.life / p.maxLife);
    p.mesh.material.opacity = alpha;
    p.mesh.scale.setScalar(0.5 + alpha * 0.5);
    if (p.life <= 0 || p.mesh.position.y < -1) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles3D.splice(i, 1);
    }
  }
}

// Ball trail particles
const ballTrail = [];
function addBallTrail(pos, color = 0xffffff) {
  const geo = new THREE.SphereGeometry(0.04, 4, 3);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  scene.add(mesh);
  ballTrail.push({ mesh, life: 0.4, maxLife: 0.4 });
}

function updateBallTrail(dt) {
  for (let i = ballTrail.length - 1; i >= 0; i--) {
    const p = ballTrail[i];
    p.life -= dt;
    const t = p.life / p.maxLife;
    p.mesh.material.opacity = t * 0.4;
    p.mesh.scale.setScalar(t);
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      ballTrail.splice(i, 1);
    }
  }
}

// ============================================================
// WEATHER PARTICLES (3D)
// ============================================================
let rainParticles = null;
let snowParticles = null;

function createWeatherParticles() {
  // Rain
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(800 * 3);
  for (let i = 0; i < 800; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 100;
    rainPositions[i * 3 + 1] = Math.random() * 50;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.12, transparent: true, opacity: 0.35 });
  rainParticles = new THREE.Points(rainGeo, rainMat);
  rainParticles.visible = false;
  scene.add(rainParticles);

  // Snow
  const snowGeo = new THREE.BufferGeometry();
  const snowPositions = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * 100;
    snowPositions[i * 3 + 1] = Math.random() * 40;
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.7 });
  snowParticles = new THREE.Points(snowGeo, snowMat);
  snowParticles.visible = false;
  scene.add(snowParticles);
}

function updateWeatherParticles(dt) {
  if (rainParticles && rainParticles.visible) {
    const pos = rainParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= 35 * dt;
      pos[i] -= 5 * dt;
      if (pos[i + 1] < 0) { pos[i + 1] = 40 + Math.random() * 10; pos[i] = (Math.random() - 0.5) * 100; }
    }
    rainParticles.geometry.attributes.position.needsUpdate = true;
  }
  if (snowParticles && snowParticles.visible) {
    const pos = snowParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= 2.5 * dt;
      pos[i] += Math.sin(performance.now() * 0.001 + i) * 0.03;
      pos[i + 2] += Math.cos(performance.now() * 0.0007 + i * 0.5) * 0.02;
      if (pos[i + 1] < 0) { pos[i + 1] = 30 + Math.random() * 10; pos[i] = (Math.random() - 0.5) * 100; }
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
  }
}

// ============================================================
// LOS AND FIRST DOWN MARKERS (3D)
// ============================================================
let losLine = null, fdLine = null;

function createMarkerLines() {
  // LOS — blue glow with outer halo
  const losGroup = new THREE.Group();
  const losGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 0.35);
  const losMat = new THREE.MeshBasicMaterial({
    color: 0x2288ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
  });
  const losCore = new THREE.Mesh(losGeo, losMat);
  losCore.rotation.x = -Math.PI / 2;
  losGroup.add(losCore);
  // Glow halo
  const losHaloGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 1.2);
  const losHaloMat = new THREE.MeshBasicMaterial({
    color: 0x2288ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
  });
  const losHalo = new THREE.Mesh(losHaloGeo, losHaloMat);
  losHalo.rotation.x = -Math.PI / 2;
  losHalo.position.y = -0.005;
  losGroup.add(losHalo);
  losGroup.position.y = 0.04;
  losLine = losGroup;
  scene.add(losLine);

  // First down line — yellow with glow
  const fdGroup = new THREE.Group();
  const fdGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 0.3);
  const fdMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00, transparent: true, opacity: 0.65, side: THREE.DoubleSide,
  });
  const fdCore = new THREE.Mesh(fdGeo, fdMat);
  fdCore.rotation.x = -Math.PI / 2;
  fdGroup.add(fdCore);
  // Glow
  const fdHaloGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 1.0);
  const fdHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
  });
  const fdHalo = new THREE.Mesh(fdHaloGeo, fdHaloMat);
  fdHalo.rotation.x = -Math.PI / 2;
  fdHalo.position.y = -0.005;
  fdGroup.add(fdHalo);
  fdGroup.position.y = 0.04;
  fdLine = fdGroup;
  scene.add(fdLine);
}

let downArrow = null;
function createDownArrow() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.8);
  shape.lineTo(0.4, 0);
  shape.lineTo(0.15, 0);
  shape.lineTo(0.15, -0.8);
  shape.lineTo(-0.15, -0.8);
  shape.lineTo(-0.15, 0);
  shape.lineTo(-0.4, 0);
  shape.lineTo(0, 0.8);
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  downArrow = new THREE.Mesh(geo, mat);
  downArrow.rotation.x = -Math.PI / 2;
  downArrow.position.y = 0.05;
  scene.add(downArrow);
}

function updateMarkerLines() {
  if (losLine) losLine.position.z = yardToZ(game.ballYardLine);
  if (fdLine) fdLine.position.z = yardToZ(game.firstDownLine);
  // Position down arrow between LOS and first down
  if (downArrow) {
    const midYard = (game.ballYardLine + game.firstDownLine) / 2;
    downArrow.position.z = yardToZ(midYard);
    downArrow.position.x = 0;
    const scale = Math.max(1, (game.firstDownLine - game.ballYardLine) * 0.15);
    downArrow.scale.set(scale, scale, 1);
  }
}

// ============================================================
// GAME STATE (same core as V11 + V12 additions)
// ============================================================
const game = {
  state: 'loading', ballYardLine: 5, downs: { current: 1, max: 4 },
  firstDownLine: 25, gotFirstDown: false, score: 0, level: 1, maxLevel: 12,
  time: 0, stress: 0, gold: 100,
  audiblesLeft: 1, weatherDebuff: 0, scoutReport: false,
  readingPhase: false, readingTimer: 0, weatherType: 'normal',
  playCount: 0, driveYards: 0, drivePlays: 0,
  motionUsed: false, motionResult: null, motionWRIndex: -1,
  passType: 'touch', scrambleResult: null,
  seasonStats: { completions: 0, attempts: 0, yards: 0, tds: 0, ints: 0, sacks: 0, plays: [] },
  currentDC: null,
  adaptiveTracker: { wrPicks: [0,0,0,0], routePicks: {} },
  wrTrust: [50, 50, 50, 50],
  halftimeShown: false, halftimeAdjustment: null,
  mapSeed: 0, dcOrder: [0, 1, 2, 3], weatherSeed: 0,
  coverageTracker: { zone: 0, man: 0, blitz: 0 },
  newMilestones: [], challengeSeedCode: '',
  composureRecoveryBonus: 0, filmStudyFloorsLeft: 0, playBookExpanded: false,
  _seasonEnded: false,
  formationType: 'shotgun',
  rushProximityPenalty: 0,
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
let consecutiveCatches = 0;
let currentPlay = null;

// ============================================================
// CAREER SAVE SYSTEM (V11)
// ============================================================
const Career = {
  data: null,
  load() {
    const saved = localStorage.getItem('qb_career');
    this.data = saved ? JSON.parse(saved) : {
      seasons: 0, careerComp: 0, careerAtt: 0, careerYards: 0,
      careerTD: 0, careerINT: 0, bestRating: 0, bestYards: 0,
      milestones: [], unlockedCelebrations: ['basic'],
      unlockedColors: ['default'], qbLegacy: 0,
    };
  },
  save() { localStorage.setItem('qb_career', JSON.stringify(this.data)); },
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
    const nm = this.checkMilestones();
    this.save();
    return nm;
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
  getLegacyBonus() { return Math.min(this.data.qbLegacy || 0, 15); },
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
// SEED SYSTEM (V11)
// ============================================================
const SeedSystem = {
  currentSeed: null, isChallenge: false,
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
    return function() { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
  },
  copyToClipboard(text) { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); }
};

// ============================================================
// COMPOSURE / STRESS
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
}
function reduceStress(amount) {
  amount += game.composureRecoveryBonus || 0;
  game.stress = Math.max(0, game.stress - amount);
}

// ============================================================
// WR TRUST (V11)
// ============================================================
function updateTrust(targetWR, result) {
  game.wrTrust[targetWR] += result === 'complete' ? 8 : 3;
  for (let i = 0; i < 4; i++) { if (i !== targetWR) game.wrTrust[i] -= 2; }
  game.wrTrust = game.wrTrust.map(t => Math.max(0, Math.min(100, t)));
}
function getTrustStatus(wrIndex) {
  const t = game.wrTrust[wrIndex];
  if (t > 70) return { status: 'clutch', emoji: '🔥', catchMod: 12, wrongRouteChance: 0 };
  if (t >= 40) return { status: 'normal', emoji: '', catchMod: 0, wrongRouteChance: 0 };
  if (t >= 20) return { status: 'cold', emoji: '❄️', catchMod: -8, wrongRouteChance: 0.05 };
  return { status: 'frustrated', emoji: '😤', catchMod: -15, wrongRouteChance: 0.10 };
}
function getTrustCatchMod(wrIndex, isClutchDown) {
  const trust = getTrustStatus(wrIndex);
  if (trust.status === 'clutch' && isClutchDown) return trust.catchMod;
  if (trust.status === 'cold' || trust.status === 'frustrated') return trust.catchMod;
  return 0;
}

// ============================================================
// RELICS
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
  { id: 'juke', name: '晃动能力', req: (wr) => wr.spd >= 75 && wr.rte >= 75, bonus: { openness: 15 } },
  { id: 'sure_hands', name: '稳接手', req: (wr) => wr.cat >= 75 && wr.spd >= 70, bonus: { catchBonus: 10 } },
  { id: 'route_master', name: '路线宗师', req: (wr) => wr.rte >= 75 && wr.cat >= 70, bonus: { openness: 10 } },
];
function hasRelic(id) { return relics.some(r => r.id === id); }
function checkSynergies(wrIdx) { return SYNERGIES.filter(s => s.req(wrs[wrIdx])); }

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
  return weights;
}

// ============================================================
// MAP SYSTEM
// ============================================================
let mapData = null;
const NODE_TYPES = {
  play: { name: '进攻', icon: '🏈', color: '#4488ff' },
  elite: { name: '精英', icon: '⚔️', color: '#ee3333' },
  rest: { name: '休息', icon: '💤', color: '#22cc44' },
  shop: { name: '商店', icon: '🏪', color: '#ffd700' },
  event: { name: '事件', icon: '❓', color: '#ff66aa' },
  boss: { name: 'BOSS', icon: '💀', color: '#ee3333' },
};

function generateMap() {
  const seed = game.mapSeed || Math.floor(Math.random() * 100000);
  game.mapSeed = seed;
  const rng = SeedSystem.seededRandom(seed);
  const floors = [], numFloors = 12;
  for (let f = 0; f < numFloors; f++) {
    const floor = [];
    if (f === 0) { floor.push({ type: 'play', x: 0.5, connections: [] }); }
    else if (f === numFloors - 1) { floor.push({ type: 'boss', x: 0.5, connections: [] }); }
    else {
      const numNodes = 2 + (rng() > 0.6 ? 1 : 0);
      const spacing = 1 / (numNodes + 1);
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

function isNodeAccessible(floor, nodeIdx) {
  if (mapData.currentFloor < 0) return floor === 0;
  if (floor !== mapData.currentFloor + 1) return false;
  const cf = mapData.currentFloor, cn = mapData.currentNode;
  if (cn < 0) return floor === 0;
  if (!mapData.floors[cf] || !mapData.floors[cf][cn]) return false;
  return mapData.floors[cf][cn].connections.includes(nodeIdx);
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
function getRouteEndpoint(wr) { const p = routePaths[wr.route](wr.yard, wr.lane); return p[p.length - 1]; }

const offenseFormations = [
  { name: 'Shotgun Spread', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 30 },
    center: { yard: losY, lane: 30 },
    wrs: [
      { yard: losY, lane: 5, route: 'streak' },
      { yard: losY - 1, lane: 18, route: 'slant' },
      { yard: losY - 1, lane: 42, route: 'out' },
      { yard: losY, lane: 55, route: 'post' },
    ]
  })},
  { name: 'Trips Right', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 25 },
    center: { yard: losY, lane: 25 },
    wrs: [
      { yard: losY, lane: 5, route: 'curl' },
      { yard: losY - 1, lane: 38, route: 'slant' },
      { yard: losY, lane: 46, route: 'out' },
      { yard: losY - 1, lane: 54, route: 'streak' },
    ]
  })},
  { name: 'Trips Left', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 35 },
    center: { yard: losY, lane: 35 },
    wrs: [
      { yard: losY - 1, lane: 6, route: 'streak' },
      { yard: losY, lane: 14, route: 'out' },
      { yard: losY - 1, lane: 22, route: 'slant' },
      { yard: losY, lane: 55, route: 'curl' },
    ]
  })},
  { name: 'Bunch Right', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 25 },
    center: { yard: losY, lane: 25 },
    wrs: [
      { yard: losY, lane: 5, route: 'post' },
      { yard: losY - 1, lane: 40, route: 'flat' },
      { yard: losY, lane: 44, route: 'slant' },
      { yard: losY - 1, lane: 48, route: 'streak' },
    ]
  })},
  { name: 'Empty Spread', getPositions: (losY) => ({
    qb: { yard: losY - 6, lane: 30 },
    center: { yard: losY, lane: 30 },
    wrs: [
      { yard: losY, lane: 4, route: 'streak' },
      { yard: losY - 1, lane: 18, route: 'drag' },
      { yard: losY - 1, lane: 42, route: 'drag' },
      { yard: losY, lane: 56, route: 'streak' },
    ]
  })},
  { name: 'Slot Left', getPositions: (losY) => ({
    qb: { yard: losY - 5, lane: 32 },
    center: { yard: losY, lane: 32 },
    wrs: [
      { yard: losY, lane: 5, route: 'post' },
      { yard: losY - 1, lane: 18, route: 'slant' },
      { yard: losY - 1, lane: 44, route: 'curl' },
      { yard: losY, lane: 55, route: 'out' },
    ]
  })},
];

const defenseFormations = [
  { name: 'Cover 1', coverType: 'man', getPositions: (losY) => ({
    rusher: { yard: losY - 7, lane: 30, fast: false },
    dbs: [
      { yard: losY + 5, lane: 10, role: 'man', coverIdx: 0 },
      { yard: losY + 5, lane: 22, role: 'man', coverIdx: 1 },
      { yard: losY + 5, lane: 38, role: 'man', coverIdx: 2 },
      { yard: losY + 8, lane: 50, role: 'free', coverIdx: -1 },
    ]
  })},
  { name: 'Cover 2 Zone', coverType: 'zone', getPositions: (losY) => ({
    rusher: { yard: losY - 7, lane: 30, fast: false },
    dbs: [
      { yard: losY + 12, lane: 15, role: 'deep', coverIdx: -1 },
      { yard: losY + 12, lane: 45, role: 'deep', coverIdx: -1 },
      { yard: losY + 4, lane: 18, role: 'flat', coverIdx: -1 },
      { yard: losY + 4, lane: 42, role: 'flat', coverIdx: -1 },
    ]
  })},
  { name: 'Cover 3 Zone', coverType: 'zone', getPositions: (losY) => ({
    rusher: { yard: losY - 7, lane: 30, fast: false },
    dbs: [
      { yard: losY + 14, lane: 12, role: 'deep', coverIdx: -1 },
      { yard: losY + 15, lane: 30, role: 'deep', coverIdx: -1 },
      { yard: losY + 14, lane: 48, role: 'deep', coverIdx: -1 },
      { yard: losY + 4, lane: 30, role: 'flat', coverIdx: -1 },
    ]
  })},
  { name: 'Cover 4', coverType: 'zone', getPositions: (losY) => ({
    rusher: { yard: losY - 7, lane: 30, fast: false },
    dbs: [
      { yard: losY + 11, lane: 10, role: 'deep', coverIdx: -1 },
      { yard: losY + 11, lane: 24, role: 'deep', coverIdx: -1 },
      { yard: losY + 11, lane: 38, role: 'deep', coverIdx: -1 },
      { yard: losY + 11, lane: 52, role: 'deep', coverIdx: -1 },
    ]
  })},
  { name: 'Man Blitz', coverType: 'blitz', getPositions: (losY) => ({
    rusher: { yard: losY - 7, lane: 30, fast: true },
    dbs: [
      { yard: losY + 3, lane: 10, role: 'man', coverIdx: 0 },
      { yard: losY + 3, lane: 22, role: 'man', coverIdx: 1 },
      { yard: losY + 3, lane: 38, role: 'man', coverIdx: 2 },
      { yard: losY + 3, lane: 50, role: 'man', coverIdx: 3 },
    ]
  })},
];

// ============================================================
// PLAY GENERATION & EVALUATION
// ============================================================
function selectDefFormationByDC() {
  const weights = getDCCoverageWeights();
  const r = Math.random();
  let coverType;
  if (r < weights.zone) coverType = 'zone';
  else if (r < weights.zone + weights.man) coverType = 'man';
  else coverType = 'blitz';
  game.coverageTracker[coverType]++;
  const matching = defenseFormations.filter(f => f.coverType === coverType);
  return matching.length > 0 ? matching[Math.floor(Math.random() * matching.length)] : defenseFormations[0];
}

function generatePlay(isElite, isBoss) {
  const losY = game.ballYardLine;
  game.formationType = Math.random() < 0.5 ? 'shotgun' : 'under_center';
  const offIdx = Math.floor(Math.random() * offenseFormations.length);
  const offense = offenseFormations[offIdx].getPositions(losY);
  offense.name = offenseFormations[offIdx].name; offense.idx = offIdx;

  if (game.formationType === 'under_center') {
    offense.qb.yard = losY - 1;
    offense.name = 'Under Center ' + offense.name.replace('Shotgun ', '');
  }

  if (hasRelic('route_tree') || game.playBookExpanded) {
    const ar = game.playBookExpanded ? ['corner', 'wheel', 'hitch', 'dig', 'seam'] : ['corner', 'wheel', 'hitch'];
    for (let i = 0; i < 4; i++) if (Math.random() < 0.3) offense.wrs[i].route = ar[Math.floor(Math.random() * ar.length)];
  }
  const defForm = selectDefFormationByDC();
  const defense = defForm.getPositions(losY);
  defense.name = defForm.name; defense.coverType = defForm.coverType;
  if (defense.dbs.some(db => db.role === 'man')) {
    const manDBs = defense.dbs.filter(db => db.role === 'man');
    const wrOrder = offense.wrs.map((w, i) => ({ ...w, idx: i })).sort((a, b) => a.lane - b.lane);
    manDBs.forEach((db, i) => {
      if (i < wrOrder.length) { db.coverIdx = wrOrder[i].idx; db.lane = offense.wrs[wrOrder[i].idx].lane; db.yard = offense.wrs[wrOrder[i].idx].yard + 4; }
    });
  }
  for (let i = 0; i < 4; i++) {
    const trust = getTrustStatus(i);
    if (trust.wrongRouteChance > 0 && Math.random() < trust.wrongRouteChance) {
      offense.wrs[i].route = ['flat', 'curl', 'drag', 'streak'][Math.floor(Math.random() * 4)];
    }
  }
  const wrScores = evaluateReceivers(offense, defense, isElite, isBoss);
  const bestWR = wrScores.indexOf(Math.max(...wrScores));
  const motionWR = Math.floor(Math.random() * 4);
  const rushSideRoll = Math.random();
  const rusherSide = rushSideRoll < 0.4 ? 'left' : rushSideRoll < 0.8 ? 'right' : 'center';

  currentPlay = { offense, defense, bestWR, wrScores, isElite, isBoss, motionWR,
    motionUsed: false, motionResult: null,
    coverageIsMan: defense.coverType === 'man' || defense.coverType === 'blitz',
    rusherSide,
  };
  game.motionUsed = false; game.motionResult = null; game.motionWRIndex = motionWR;
  if (game.downs.current >= 3) addStress(10);
  if (game.level > 5) addStress(Math.min(5, game.level - 5));

  const weatherFloor = getWeatherForFloor(game.level);
  game.weatherType = weatherFloor;
  updateWeatherVisuals();

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
    if (game.filmStudyFloorsLeft > 0) openness += 8;
    openness += (Math.random() - 0.5) * 10;
    scores.push(Math.max(0, openness));
  }
  return scores;
}

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
  const throwDist = Math.abs(routeEnd.yard - game.ballYardLine);
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
  if (pt === 'bullet') { if (isShortRoute(route)) prob += 10; if (isDeepRoute(route)) prob -= 15; if (currentPlay.coverageIsMan) prob -= 5; }
  else if (pt === 'lob') { if (isDeepRoute(route)) prob += 15; if (isShortRoute(route)) prob -= 10; }
  if (game.scrambleResult === 'dodged') prob -= 15;
  if (game.scrambleResult === 'stand_tall') prob -= 25;
  prob -= game.rushProximityPenalty;
  const weather = getWeatherForFloor(game.level);
  if (weather === 'rain') prob -= 5;
  if (weather === 'snow') prob -= 8;
  prob += getTrustCatchMod(wrIndex, game.downs.current >= 3);
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
// WEATHER
// ============================================================
function getWeatherForFloor(floor) {
  if (floor <= 3) return 'day';
  if (floor <= 6) return 'dusk';
  if (floor <= 9) return 'night';
  return floor === 12 ? 'snow' : 'rain';
}

function updateWeatherVisuals() {
  const weather = getWeatherForFloor(game.level);
  if (rainParticles) rainParticles.visible = weather === 'rain';
  if (snowParticles) snowParticles.visible = weather === 'snow';

  // Stadium lights intensity based on time of day
  const nightMode = weather === 'night' || weather === 'rain' || weather === 'snow';
  stadiumLights.forEach(l => { l.intensity = nightMode ? 1.2 : 0.3; });

  if (weather === 'day') {
    scene.background = new THREE.Color(0x6aafe6);
    scene.fog = new THREE.FogExp2(0x6aafe6, 0.003);
    sunLight.color.setHex(0xffeedd); sunLight.intensity = 1.4;
    ambientLight.color.setHex(0x668899); ambientLight.intensity = 0.4;
    renderer.toneMappingExposure = 1.0;
    skyMat.color.setHex(0x6aafe6);
  } else if (weather === 'dusk') {
    scene.background = new THREE.Color(0xdd7744);
    scene.fog = new THREE.FogExp2(0xdd7744, 0.004);
    sunLight.color.setHex(0xffaa55); sunLight.intensity = 1.0;
    ambientLight.color.setHex(0xcc8866); ambientLight.intensity = 0.35;
    renderer.toneMappingExposure = 0.9;
    skyMat.color.setHex(0xee8855);
  } else if (weather === 'night') {
    scene.background = new THREE.Color(0x080e22);
    scene.fog = new THREE.FogExp2(0x080e22, 0.006);
    sunLight.color.setHex(0x445577); sunLight.intensity = 0.2;
    ambientLight.color.setHex(0x223355); ambientLight.intensity = 0.3;
    renderer.toneMappingExposure = 0.7;
    skyMat.color.setHex(0x0a1225);
  } else if (weather === 'rain') {
    scene.background = new THREE.Color(0x2a3a4a);
    scene.fog = new THREE.FogExp2(0x2a3a4a, 0.007);
    sunLight.color.setHex(0x889999); sunLight.intensity = 0.5;
    ambientLight.color.setHex(0x667788); ambientLight.intensity = 0.45;
    renderer.toneMappingExposure = 0.75;
    skyMat.color.setHex(0x3a4a5a);
  } else if (weather === 'snow') {
    scene.background = new THREE.Color(0xc8d0e0);
    scene.fog = new THREE.FogExp2(0xc8d0e0, 0.006);
    sunLight.color.setHex(0xdde0ee); sunLight.intensity = 0.6;
    ambientLight.color.setHex(0xccccee); ambientLight.intensity = 0.5;
    renderer.toneMappingExposure = 0.85;
    skyMat.color.setHex(0xd0d8e8);
  }
}

// ============================================================
// V12: CHINESE COMMENTARY
// ============================================================
const ChineseCommentary = {
  templates: {
    presnap_motion_man: ["Motion暴露了人盯人！调整你的阅读", "DB跟着动了——确认是人盯人防守"],
    presnap_motion_zone: ["区域防守！那个空档打开了", "DB没有跟着动——区域防守的迹象"],
    bullet_short: ["子弹传球——穿针引线！", "快速出手直入防守缝隙！"],
    bullet_deep: ["子弹传球进入双人包夹！好大的胆子！", "高速直线球投向深区！"],
    touch_mid: ["漂亮的触传！弧线完美", "完美的螺旋球，精准到位！"],
    lob_deep: ["Going deep！高抛远投！", "深远高抛球——风险极大但回报更大！"],
    lob_short: ["短距离高抛？有趣的选择", "把球浮在底线附近..."],
    big_play: ["{yards}码大传！这就是精英QB的表现！", "长传炸弹！{yards}码打击！"],
    td: ["TOUCHDOWN！达阵！完美的drive！", "杀入端区！六分到手！"],
    int: ["INTERCEPTED！被抄截了！太冒险了！", "糟糕！被摘了！攻守转换！"],
    sack: ["SACKED！他拿球太久了！", "被擒杀！防守端的压力太大了！"],
    scramble_success: ["他躲过了！口袋移动！", "闪避冲传！还活着！好的延长play！"],
    scramble_fail: ["被从后面追上了！", "无路可逃！"],
    scramble_stand: ["稳稳地站在口袋里！临危不惧！", "不慌不忙——在压力下完成传球！"],
    incomplete: ["传球不完整。", "差一点点就够到了！"],
    first_down: ["首攻！推进链条！", "新的一组四档！进攻火车头开动！"],
    fourth_down: ["第四档...压力全开！", "必须转换这一档！"],
    trust_hot: ["他最信任的目标！正在建立化学反应！", "#{name}今天火力全开！"],
    trust_cold: ["这个接球手冰冷——冒险的传球！", "好久没看他那边了..."],
    formation_shotgun: ["Shotgun阵型！QB在后方5码接球", "散弹枪阵型——有更多时间阅读防守"],
    formation_under_center: ["Under Center！QB在中锋身后！", "传统阵型——play action更具威胁"],
  },
  generate(key, vars) {
    const pool = this.templates[key];
    if (!pool || pool.length === 0) return;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (vars) { for (const [k, v] of Object.entries(vars)) { text = text.replace(`{${k}}`, v); } }
    showCommentary(text);
  }
};

// ============================================================
// COMMENTARY UI
// ============================================================
const commentaryEl = document.getElementById('commentary');
function showCommentary(text, duration = 3500) {
  const line = document.createElement('div');
  line.className = 'comment-line';
  line.textContent = text;
  line.style.transform = 'translateY(10px)';
  line.style.opacity = '0';
  commentaryEl.appendChild(line);
  // Animate in
  requestAnimationFrame(() => {
    line.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    line.style.transform = 'translateY(0)';
    line.style.opacity = '1';
  });
  setTimeout(() => {
    line.style.opacity = '0';
    line.style.transform = 'translateY(-10px)';
    setTimeout(() => line.remove(), 300);
  }, duration);
  while (commentaryEl.children.length > 3) commentaryEl.removeChild(commentaryEl.firstChild);
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

// ============================================================
// HALFTIME
// ============================================================
let halftimeOptions = [];
function generateHalftimeOptions() {
  const allOptions = [
    { id: 'film_study', name: 'Film Study', desc: "看到DC的精确覆盖3层", icon: '📋',
      apply: () => { game.filmStudyFloorsLeft = 3; game.scoutReport = true; } },
    { id: 'wr_clinic', name: 'WR Clinic', desc: '重置所有WR信任到60', icon: '🤝',
      apply: () => { game.wrTrust = [60, 60, 60, 60]; } },
    { id: 'qb_coach', name: 'QB Coach', desc: '+5永久精准度', icon: '🎯',
      apply: () => { qb.accuracy += 5; } },
    { id: 'equipment', name: 'Equipment Check', desc: '+10心态恢复/play', icon: '🔧',
      apply: () => { game.composureRecoveryBonus += 10; } },
    { id: 'playbook', name: 'Playbook扩展', desc: '解锁dig & seam路线', icon: '📖',
      apply: () => { game.playBookExpanded = true; } },
  ];
  halftimeOptions = allOptions.sort(() => Math.random() - 0.5).slice(0, 3);
  const maxPicks = Math.max(...game.adaptiveTracker.wrPicks);
  const totalPicks = game.adaptiveTracker.wrPicks.reduce((a, b) => a + b, 0);
  if (totalPicks > 0 && maxPicks / totalPicks >= 0.4) defenseBonus += 8;
  const bulletCount = game.seasonStats.plays.filter(p => p.passType === 'bullet').length;
  if (bulletCount > game.seasonStats.plays.length * 0.5) defenseBonus += 5;
  game.halftimeAdjustment = 'dc_adjusted';
}

// ============================================================
// 3D SCENE OBJECTS
// ============================================================
let fieldGroup = null;
let stadiumGroup = null;
let playerObjects = { qb: null, center: null, wrs: [], dbs: [], rusher: null };
let footballObj = null;
let routeLines = [];
let routeTargets = [];

function initScene() {
  fieldGroup = createField();
  scene.add(fieldGroup);

  stadiumGroup = createStadium();
  scene.add(stadiumGroup);

  createStadiumLights();

  // Create players — offense (dark blue/white)
  playerObjects.qb = createPlayer({
    color: 0x1e3a5f, number: 7, heightScale: 1.1, isQB: true,
    helmetColor: 0xf0f0f0,
  });
  scene.add(playerObjects.qb);

  playerObjects.center = createPlayer({
    color: 0x1e3a5f, number: 52, heightScale: 0.9, widthScale: 1.2,
    helmetColor: 0xf0f0f0,
  });
  scene.add(playerObjects.center);

  // WRs with distinct visual identity
  const wrConfigs = [
    { color: 0xffffff, number: 81, hasVisor: true, visorColor: 0x4488ff, accentColor: 0x4488ff }, // ACE - blue visor
    { color: 0xffffff, number: 88, hasGloves: true, gloveColor: 0xffcc00, accentColor: 0xffcc00 }, // BLITZ - gold gloves
    { color: 0xffffff, number: 13, heightScale: 1.15, hasHeadband: true, accentColor: 0x44ff88 }, // FLASH - tall, headband
    { color: 0xffffff, number: 84, widthScale: 1.1, accentColor: 0xff66aa }, // TANK - wider build
  ];
  for (const cfg of wrConfigs) {
    const wr = createPlayer(cfg);
    playerObjects.wrs.push(wr);
    scene.add(wr);
  }

  // Defense — red team
  const defNums = [21, 24, 32, 45];
  for (const num of defNums) {
    const db = createPlayer({ color: 0xcc2222, number: num, helmetColor: 0xcc2222 });
    playerObjects.dbs.push(db);
    scene.add(db);
  }

  playerObjects.rusher = createPlayer({ color: 0xcc2222, number: 99, widthScale: 1.3, heightScale: 1.05, helmetColor: 0xcc2222 });
  scene.add(playerObjects.rusher);

  // Football
  footballObj = createFootball();
  scene.add(footballObj);

  // Route lines + targets
  for (let i = 0; i < 4; i++) {
    const line = createRouteLine(WR_COLORS_HEX[i]);
    routeLines.push(line);
    scene.add(line);

    const target = createRouteTarget(WR_COLORS_HEX[i]);
    routeTargets.push(target);
    scene.add(target);
  }

  // Marker lines and down arrow
  createMarkerLines();
  createDownArrow();

  // Weather
  createWeatherParticles();
}

function setPlayersVisible(visible) {
  playerObjects.qb.visible = visible;
  playerObjects.center.visible = visible;
  playerObjects.wrs.forEach(w => w.visible = visible);
  playerObjects.dbs.forEach(d => d.visible = visible);
  playerObjects.rusher.visible = visible;
  routeLines.forEach(l => l.visible = false);
  routeTargets.forEach(t => t.visible = false);
  footballObj.visible = false;
}

function positionPlayersForPlay() {
  if (!currentPlay) return;
  const off = currentPlay.offense;
  const def = currentPlay.defense;

  // QB
  const qbPos = fieldPos(off.qb.yard, off.qb.lane);
  playerObjects.qb.position.copy(qbPos);
  playerObjects.qb.rotation.y = 0; // Face downfield

  // Center
  if (off.center) {
    const cPos = fieldPos(off.center.yard, off.center.lane);
    playerObjects.center.position.copy(cPos);
    playerObjects.center.visible = true;
  }

  // WRs
  for (let i = 0; i < 4; i++) {
    const wrPos = fieldPos(off.wrs[i].yard, off.wrs[i].lane);
    playerObjects.wrs[i].position.copy(wrPos);
    playerObjects.wrs[i].rotation.y = 0;
  }

  // DBs
  for (let i = 0; i < 4; i++) {
    const dbPos = fieldPos(def.dbs[i].yard, def.dbs[i].lane);
    playerObjects.dbs[i].position.copy(dbPos);
    playerObjects.dbs[i].rotation.y = Math.PI; // Face offense
  }

  // Rusher
  const rushPos = fieldPos(def.rusher.yard, def.rusher.lane);
  playerObjects.rusher.position.copy(rushPos);
  playerObjects.rusher.rotation.y = Math.PI;

  // Route lines
  updateRouteLines(1);

  // Update marker lines
  updateMarkerLines();
}

function updateRouteLines(progress) {
  if (!currentPlay) return;
  for (let i = 0; i < 4; i++) {
    const wr = currentPlay.offense.wrs[i];
    const path = routePaths[wr.route](wr.yard, wr.lane);
    const points = [fieldPos(wr.yard, wr.lane)];
    for (const pt of path) {
      const p = fieldPos(pt.yard, pt.lane);
      p.y = 0.15;
      points.push(p);
    }
    points[0].y = 0.15;

    const totalPoints = points.length;
    const drawTo = Math.ceil(totalPoints * progress);
    const drawPoints = points.slice(0, drawTo);
    if (drawPoints.length < 2) drawPoints.push(drawPoints[0].clone());

    routeLines[i].geometry.dispose();
    routeLines[i].geometry = new THREE.BufferGeometry().setFromPoints(drawPoints);
    routeLines[i].computeLineDistances();
    routeLines[i].visible = true;

    // Route endpoint target marker
    const endPt = points[points.length - 1];
    routeTargets[i].position.set(endPt.x, 0.05, endPt.z);
    routeTargets[i].visible = true;
    routeTargets[i].rotation.z = game.time * 2; // Slow spin
  }
}

// ============================================================
// 3D SIMULATION STATE
// ============================================================
let sim = null;

function startSimulation(chosenWR) {
  const play = currentPlay;
  game.adaptiveTracker.wrPicks[chosenWR]++;
  const rushSpeed = play.defense.rusher.fast ? 0.06 : 0.035;
  const rushFactor = hasRelic('quick_release') ? 0.8 : 1;
  const willSack = play.defense.rusher.fast && Math.random() < (0.35 * rushFactor);

  sim = {
    phase: 'snap', timer: 0, chosenWR, success: false, catchProb: 0, yardsGained: 0,
    wrPos: play.offense.wrs.map(w => ({ yard: w.yard, lane: w.lane })),
    dbPos: play.defense.dbs.map(db => ({ yard: db.yard, lane: db.lane })),
    rushPos: { yard: play.defense.rusher.yard, lane: play.defense.rusher.lane },
    qbPos: { yard: play.offense.qb.yard, lane: play.offense.qb.lane },
    qbStartYard: play.offense.qb.yard,
    ballPos: null, ballTarget: null,
    routeProgress: 0, throwProgress: 0, catchAnim: 0,
    willSack, scrambleTriggered: false, scrambleChoice: null, scrambleTimer: 0,
    isINT: false, isSack: false, sackYards: 0,
    rusherSide: play.rusherSide || 'center',
    heroMomentActive: false, heroTimer: 0,
    timeScale: 1,
    throwAnimProgress: 0,
  };
  game.state = 'passType'; game.passType = 'touch'; game.scrambleResult = null;
  game.readingPhase = false;

  if (game.formationType === 'shotgun') ChineseCommentary.generate('formation_shotgun');
  else ChineseCommentary.generate('formation_under_center');

  showPassTypePanel();
}

function beginSimAfterPassType() {
  if (!sim) return;
  sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
  sim.success = Math.random() * 100 < sim.catchProb;
  const intChance = calculateINTChance(sim.chosenWR, game.passType);
  if (!sim.success && Math.random() * 100 < intChance) sim.isINT = true;
  if (sim.success) {
    const routeEnd = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]);
    sim.yardsGained = Math.max(1, Math.abs(routeEnd.yard - game.ballYardLine) + Math.floor(Math.random() * 5));
  }
  game.state = 'simulation';
  hidePassTypePanel();

  const route = currentPlay.offense.wrs[sim.chosenWR].route;
  if (game.passType === 'bullet') ChineseCommentary.generate(isShortRoute(route) ? 'bullet_short' : 'bullet_deep');
  else if (game.passType === 'lob') ChineseCommentary.generate(isDeepRoute(route) ? 'lob_deep' : 'lob_short');
  else ChineseCommentary.generate('touch_mid');
}

function updateSimulation(dt) {
  if (!sim) return;
  const sd = dt * sim.timeScale;
  sim.timer += sd;

  switch (sim.phase) {
    case 'snap':
      // Center snaps animation
      if (sim.timer > 0.3) { sim.phase = 'dropback'; sim.timer = 0; }
      break;

    case 'dropback': {
      const dropTarget = sim.qbStartYard - 3;
      sim.qbPos.yard += (dropTarget - sim.qbPos.yard) * 0.1;
      if (sim.timer > 0.5) { sim.phase = 'routes'; sim.timer = 0; }
      break;
    }

    case 'routes':
      sim.routeProgress = Math.min(1, sim.timer / 1.2);
      const easedProgress = easeInOutQuad(sim.routeProgress);

      // Move WRs along routes with easing
      for (let i = 0; i < 4; i++) {
        const wr = currentPlay.offense.wrs[i], path = routePaths[wr.route](wr.yard, wr.lane);
        const total = path.length, seg = easedProgress * total;
        const idx = Math.min(Math.floor(seg), total - 1), t = seg - idx;
        const fy = idx === 0 ? wr.yard : path[idx - 1].yard;
        const fl = idx === 0 ? wr.lane : path[idx - 1].lane;
        sim.wrPos[i].yard = fy + (path[idx].yard - fy) * t;
        sim.wrPos[i].lane = fl + (path[idx].lane - fl) * t;
      }

      // Move DBs
      for (let i = 0; i < 4; i++) {
        const db = currentPlay.defense.dbs[i];
        if (db.role === 'man' && db.coverIdx >= 0) {
          sim.dbPos[i].yard += (sim.wrPos[db.coverIdx].yard - sim.dbPos[i].yard) * 0.045;
          sim.dbPos[i].lane += (sim.wrPos[db.coverIdx].lane - sim.dbPos[i].lane) * 0.045;
        } else {
          const tgt = sim.wrPos[sim.chosenWR];
          sim.dbPos[i].yard += (tgt.yard - sim.dbPos[i].yard) * 0.018;
          sim.dbPos[i].lane += (tgt.lane - sim.dbPos[i].lane) * 0.012;
        }
      }

      // Move rusher
      const rs = currentPlay.defense.rusher.fast ? 0.055 : 0.032;
      const sr = hasRelic('quick_release') ? 0.8 : 1;
      sim.rushPos.yard += (sim.qbPos.yard - sim.rushPos.yard) * rs * sr;
      sim.rushPos.lane += (sim.qbPos.lane - sim.rushPos.lane) * rs * sr;

      // Rush proximity penalty
      const rushDist = Math.sqrt(Math.pow(sim.rushPos.yard - sim.qbPos.yard, 2) + Math.pow(sim.rushPos.lane - sim.qbPos.lane, 2));
      game.rushProximityPenalty = Math.max(0, Math.floor((10 - rushDist) * 3));

      // Check sack / scramble
      if (sim.willSack && sim.routeProgress >= 0.5 && !sim.scrambleTriggered) {
        sim.scrambleTriggered = true; sim.phase = 'scramble'; sim.timer = 0; sim.scrambleTimer = 1.8;
        showScramblePanel();
        break;
      }

      if (sim.routeProgress >= 0.7) {
        sim.phase = 'throw'; sim.timer = 0; sim.throwAnimProgress = 0;
        sim.ballPos = { yard: sim.qbPos.yard, lane: sim.qbPos.lane };
        sim.ballTarget = { yard: sim.wrPos[sim.chosenWR].yard, lane: sim.wrPos[sim.chosenWR].lane };

        // Hero moment - slow time for dramatic effect
        sim.heroMomentActive = true;
        sim.heroTimer = 0;
        sim.timeScale = 0.25;
        footballObj.visible = true;

        // Camera: dramatic close-up on QB
        cameraState.heroZoom = true;
        const qbWorldPos = fieldPos(sim.qbPos.yard, sim.qbPos.lane);
        cameraState.target.copy(qbWorldPos);
        cameraState.offset.set(qbWorldPos.x + 6, 5, qbWorldPos.z + 4);

        // Release burst particles
        addParticles3D(
          qbWorldPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          0xffffff, 20, 3, 0.6,
          { sizeMin: 0.02, sizeMax: 0.06, gravity: -3 }
        );
      }
      break;

    case 'scramble':
      sim.scrambleTimer -= sd;
      sim.rushPos.yard += (sim.qbPos.yard - sim.rushPos.yard) * 0.12;
      sim.rushPos.lane += (sim.qbPos.lane - sim.rushPos.lane) * 0.08;

      if (sim.scrambleChoice !== null && sim.scrambleChoice !== 'done') {
        hideScramblePanel();
        if (sim.scrambleChoice === 'stand_tall') {
          game.scrambleResult = 'stand_tall';
          ChineseCommentary.generate('scramble_stand');
          sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
          sim.success = Math.random() * 100 < sim.catchProb;
          if (!sim.success) { const ic = calculateINTChance(sim.chosenWR, game.passType); sim.isINT = Math.random() * 100 < ic; }
          if (sim.success) { const re = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]); sim.yardsGained = Math.max(1, Math.abs(re.yard - game.ballYardLine) + Math.floor(Math.random() * 5)); }
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
            ChineseCommentary.generate('scramble_success');
            const qbWorldPos = fieldPos(sim.qbPos.yard, sim.qbPos.lane);
            addParticles3D(qbWorldPos, 0x886644, 12, 2.5, 0.6);
            sim.catchProb = calculateCatchProb(sim.chosenWR, game.passType);
            sim.success = Math.random() * 100 < sim.catchProb;
            if (!sim.success) { const ic = calculateINTChance(sim.chosenWR, game.passType); sim.isINT = Math.random() * 100 < ic; }
            if (sim.success) { const re = getRouteEndpoint(currentPlay.offense.wrs[sim.chosenWR]); sim.yardsGained = Math.max(1, Math.abs(re.yard - game.ballYardLine) + Math.floor(Math.random() * 5)); }
            sim.phase = 'routes'; sim.timer = 0.84; sim.routeProgress = 0.7; sim.scrambleChoice = 'done';
          } else {
            sim.isSack = true; sim.sackYards = 7; sim.phase = 'sackResult'; sim.timer = 0;
            ChineseCommentary.generate('scramble_fail');
            const qbWorldPos = fieldPos(sim.qbPos.yard, sim.qbPos.lane);
            addParticles3D(qbWorldPos, 0x886644, 20, 3.5, 1, { sizeMin: 0.05, sizeMax: 0.12 });
            cameraState.shakeIntensity = 2.0;
            sim.scrambleChoice = 'done';
          }
        }
      } else if (sim.scrambleTimer <= 0 && sim.scrambleChoice === null) {
        hideScramblePanel();
        sim.isSack = true; sim.sackYards = 5; sim.phase = 'sackResult'; sim.timer = 0;
        ChineseCommentary.generate('sack');
        cameraState.shakeIntensity = 1.5;
      }

      updateScrambleTimerBar();
      break;

    case 'sackResult':
      if (sim.timer > 2.5) handlePlayResult();
      else {
        showResultOverlay('SACKED!', `-${sim.sackYards}码`, '', '#ee3333');
      }
      break;

    case 'throw': {
      // Hero moment timing (use real dt)
      if (sim.heroMomentActive) {
        sim.heroTimer += dt;
        sim.throwAnimProgress = Math.min(1, sim.heroTimer / 0.6);
        // Animate QB throw
        animatePlayerThrow(playerObjects.qb, sim.throwAnimProgress);

        if (sim.heroTimer > 0.6) {
          sim.timeScale = 1.2; // Slight fast forward after release
          sim.heroMomentActive = false;
          cameraState.heroZoom = false;
        }
      }

      const throwDuration = game.passType === 'bullet' ? 0.45 : game.passType === 'lob' ? 0.85 : 0.6;
      sim.throwProgress = Math.min(1, sim.timer / throwDuration);
      const easedThrow = easeOutCubic(sim.throwProgress);

      // Ball position interpolation
      const t = easedThrow;
      sim.ballPos.yard = sim.qbPos.yard + (sim.ballTarget.yard - sim.qbPos.yard) * t;
      sim.ballPos.lane = sim.qbPos.lane + (sim.ballTarget.lane - sim.qbPos.lane) * t;

      // Ball in 3D with arc
      const ballWorldPos = fieldPos(sim.ballPos.yard, sim.ballPos.lane);
      let ballHeight = 2;
      if (game.passType === 'lob') {
        ballHeight = 2 + Math.sin(t * Math.PI) * 9;
      } else if (game.passType === 'bullet') {
        ballHeight = 2 + Math.sin(t * Math.PI) * 1.8;
      } else {
        ballHeight = 2 + Math.sin(t * Math.PI) * 4.5;
      }
      footballObj.position.set(ballWorldPos.x, ballHeight, ballWorldPos.z);

      // Spiral rotation
      footballObj.rotation.z += dt * 18;
      footballObj.rotation.x = -0.3 + t * 0.2;

      // Ball trail
      if (sim.throwProgress > 0.05 && sim.throwProgress < 0.95) {
        addBallTrail(footballObj.position.clone(), game.passType === 'bullet' ? 0xff6644 : 0xffffff);
      }

      // Ball shadow
      const shadow = footballObj.getObjectByName('ballShadow');
      if (shadow) {
        shadow.position.y = -ballHeight + 0.04;
        shadow.scale.setScalar(1 + ballHeight * 0.08);
        shadow.material.opacity = Math.max(0.05, 0.25 - ballHeight * 0.015);
      }

      // Continue WR movement
      for (let i = 0; i < 4; i++) {
        const path = routePaths[currentPlay.offense.wrs[i].route](currentPlay.offense.wrs[i].yard, currentPlay.offense.wrs[i].lane);
        const end = path[path.length - 1];
        sim.wrPos[i].yard += (end.yard - sim.wrPos[i].yard) * 0.06;
        sim.wrPos[i].lane += (end.lane - sim.wrPos[i].lane) * 0.06;
      }

      if (sim.throwProgress >= 1) {
        sim.phase = 'catch'; sim.timer = 0;
        const catchPos = fieldPos(sim.ballTarget.yard, sim.ballTarget.lane);
        if (sim.success) {
          addParticles3D(catchPos.clone().add(new THREE.Vector3(0, 1.8, 0)), 0x22cc44, 25, 3.5, 1.2, { sizeMin: 0.03, sizeMax: 0.08 });
          cameraState.shakeIntensity = 0.3;
          if (sim.yardsGained >= 20) ChineseCommentary.generate('big_play', { yards: sim.yardsGained });
        } else if (sim.isINT) {
          addParticles3D(catchPos.clone().add(new THREE.Vector3(0, 1.8, 0)), 0xee3333, 20, 3, 1.2);
          cameraState.shakeIntensity = 1.0;
          ChineseCommentary.generate('int');
        } else {
          addParticles3D(catchPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x886644, 12, 2, 0.8);
          ChineseCommentary.generate('incomplete');
        }
      }
      break;
    }

    case 'catch':
      sim.catchAnim = Math.min(1, sim.timer / 0.6);
      const catchWorldPos = fieldPos(sim.ballTarget.yard, sim.ballTarget.lane);

      if (sim.success) {
        // Catch animation on the WR
        animatePlayerCatch(playerObjects.wrs[sim.chosenWR], sim.catchAnim);
        footballObj.position.set(catchWorldPos.x, 1.8 - sim.catchAnim * 0.3, catchWorldPos.z);
      } else {
        // Ball drops and bounces
        footballObj.position.set(catchWorldPos.x, Math.max(0.2, 1.5 - sim.catchAnim * 2) + Math.abs(Math.sin(sim.timer * 10)) * (1 - sim.catchAnim) * 0.5, catchWorldPos.z);
        footballObj.rotation.x += dt * 5;
        footballObj.rotation.z += dt * 3;
      }

      if (sim.timer > 1.2) {
        const isTD = sim.success && (game.ballYardLine + sim.yardsGained >= 50);
        if (isTD) {
          sim.phase = 'tdCelebration'; sim.timer = 0;
          ChineseCommentary.generate('td');
          const tdPos = fieldPos(50, 30);
          // Big celebration burst
          const colors = [0xffd700, 0xffffff, 0x1e90ff, 0x22cc44, 0xee3333, 0xff66aa];
          for (let c = 0; c < 3; c++) {
            setTimeout(() => {
              addParticles3D(
                tdPos.clone().add(new THREE.Vector3((Math.random()-0.5)*8, 4 + c*2, (Math.random()-0.5)*6)),
                colors[Math.floor(Math.random() * colors.length)],
                15, 5, 2.5,
                { shape: 'confetti', gravity: -3 }
              );
            }, c * 200);
          }
        } else {
          sim.phase = 'result'; sim.timer = 0;
          if (sim.success) {
            showResultOverlay('COMPLETE!', `+${sim.yardsGained}码`, `${game.passType.toUpperCase()} · ${Math.round(sim.catchProb)}%`, '#22cc44');
          } else if (sim.isINT) {
            showResultOverlay('INTERCEPTED!', '攻守转换 — 赛季结束', '', '#aa66dd');
          } else {
            showResultOverlay('INCOMPLETE', `${Math.round(sim.catchProb)}% 接球概率`, '', '#ee3333');
          }
        }
      }
      break;

    case 'tdCelebration':
      // Continuous confetti from above
      if (Math.random() < 0.5) {
        const confPos = new THREE.Vector3((Math.random() - 0.5) * 30, 14, yardToZ(50) + (Math.random() - 0.5) * 15);
        addParticles3D(confPos,
          [0xffd700, 0xffffff, 0x1e90ff, 0x22cc44, 0xee3333, 0xff66aa][Math.floor(Math.random() * 6)],
          3, 2.5, 3, { shape: 'confetti', gravity: -1.5 });
      }
      // Ground burst
      if (sim.timer < 1.5 && Math.random() < 0.3) {
        const burstPos = new THREE.Vector3((Math.random() - 0.5) * 15, 0.5, yardToZ(50));
        addParticles3D(burstPos, 0xffd700, 5, 4, 1.2, { sizeMin: 0.03, sizeMax: 0.08 });
      }
      // Celebration animations
      playerObjects.wrs.forEach((wr, i) => {
        const phase = game.time * 5 + i * 1.5;
        // Jump with arms up
        wr.position.y = Math.abs(Math.sin(phase)) * 1.0;
        wr.rotation.y = game.time * 2 + i;
        const armGroup = wr.getObjectByName('armGroup');
        if (armGroup) {
          const ra = armGroup.getObjectByName('rightArm');
          const la = armGroup.getObjectByName('leftArm');
          if (ra) { ra.rotation.x = -1.5 + Math.sin(phase * 2) * 0.3; ra.rotation.z = 0.3; }
          if (la) { la.rotation.x = -1.5 + Math.sin(phase * 2 + 1) * 0.3; la.rotation.z = -0.3; }
        }
      });
      // QB fist pump with arm animation
      playerObjects.qb.position.y = Math.abs(Math.sin(game.time * 4)) * 0.6;
      const qbArm = playerObjects.qb.getObjectByName('armGroup');
      if (qbArm) {
        const ra = qbArm.getObjectByName('rightArm');
        if (ra) ra.rotation.x = -1.8 + Math.sin(game.time * 6) * 0.5;
      }

      if (sim.timer > 3) {
        sim.phase = 'result'; sim.timer = 0;
        showResultOverlay('TOUCHDOWN!', `+${sim.yardsGained}码 · +600分`, '达阵！', '#ffd700');
      }
      break;

    case 'result':
      if (sim.timer > 3) handlePlayResult();
      break;
  }

  // Update 3D positions from sim
  if (sim) {
    // QB
    const qbWorld = fieldPos(sim.qbPos.yard, sim.qbPos.lane);
    playerObjects.qb.position.lerp(qbWorld, 0.12);
    if (sim.phase !== 'tdCelebration') {
      playerObjects.qb.position.y = Math.sin(game.time * 3) * 0.03;
    }

    // WRs
    for (let i = 0; i < 4; i++) {
      const wrWorld = fieldPos(sim.wrPos[i].yard, sim.wrPos[i].lane);
      const prevPos = playerObjects.wrs[i].position.clone();
      playerObjects.wrs[i].position.lerp(wrWorld, 0.12);

      if (sim.phase !== 'tdCelebration') {
        // Running animation
        const dx = playerObjects.wrs[i].position.x - prevPos.x;
        const dz = playerObjects.wrs[i].position.z - prevPos.z;
        const moveDist = Math.sqrt(dx * dx + dz * dz);
        if (moveDist > 0.01 && (sim.phase === 'routes' || sim.phase === 'throw')) {
          animatePlayerRun(playerObjects.wrs[i], dt, Math.min(moveDist * 30, 1.5));
          // Face movement direction
          playerObjects.wrs[i].rotation.y = Math.atan2(dx, dz);
        } else {
          animatePlayerIdle(playerObjects.wrs[i], game.time);
        }
      }
    }

    // DBs
    for (let i = 0; i < 4; i++) {
      const dbWorld = fieldPos(sim.dbPos[i].yard, sim.dbPos[i].lane);
      const prevPos = playerObjects.dbs[i].position.clone();
      playerObjects.dbs[i].position.lerp(dbWorld, 0.12);

      const dx = playerObjects.dbs[i].position.x - prevPos.x;
      const dz = playerObjects.dbs[i].position.z - prevPos.z;
      const moveDist = Math.sqrt(dx * dx + dz * dz);
      if (moveDist > 0.01) {
        animatePlayerRun(playerObjects.dbs[i], dt, Math.min(moveDist * 25, 1.2));
        playerObjects.dbs[i].rotation.y = Math.atan2(dx, dz);
      } else {
        animatePlayerIdle(playerObjects.dbs[i], game.time);
      }
    }

    // Rusher
    const rushWorld = fieldPos(sim.rushPos.yard, sim.rushPos.lane);
    const prevRush = playerObjects.rusher.position.clone();
    playerObjects.rusher.position.lerp(rushWorld, 0.12);
    const rdx = playerObjects.rusher.position.x - prevRush.x;
    const rdz = playerObjects.rusher.position.z - prevRush.z;
    const rDist = Math.sqrt(rdx * rdx + rdz * rdz);
    if (rDist > 0.01) {
      animatePlayerRun(playerObjects.rusher, dt, Math.min(rDist * 30, 1.5));
      playerObjects.rusher.rotation.y = Math.atan2(rdx, rdz);
    }

    // Camera follow — broadcast angle
    if (!cameraState.heroZoom) {
      const focusYard = sim.ballPos ? sim.ballPos.yard : sim.qbPos.yard;
      const focusLane = sim.ballPos ? sim.ballPos.lane : sim.qbPos.lane;
      const focusWorld = fieldPos(focusYard, focusLane);

      // Smooth camera based on phase
      if (sim.phase === 'tdCelebration') {
        // Orbit around end zone
        const angle = game.time * 0.5;
        cameraState.target.set(0, 1, yardToZ(50));
        cameraState.offset.set(Math.sin(angle) * 20, 8, yardToZ(50) + Math.cos(angle) * 20);
      } else if (sim.phase === 'catch') {
        // Dramatic side angle zoom toward receiver
        const wrWorld = fieldPos(sim.ballTarget.yard, sim.ballTarget.lane);
        cameraState.target.lerp(wrWorld, 0.08);
        const side = wrWorld.x > 0 ? -1 : 1;
        cameraState.offset.lerp(new THREE.Vector3(wrWorld.x + side * 10, 4, wrWorld.z + 5), 0.06);
      } else if (sim.phase === 'throw' && sim.throwProgress > 0.3) {
        // Track ball flight — smooth follow
        const ballWorld = fieldPos(sim.ballPos.yard, sim.ballPos.lane);
        cameraState.target.lerp(ballWorld, 0.05);
        cameraState.offset.lerp(new THREE.Vector3(ballWorld.x + 30, 18, ballWorld.z + 12), 0.04);
      } else {
        cameraState.target.lerp(focusWorld, 0.04);
        cameraState.offset.set(focusWorld.x + 42, 25, focusWorld.z + 18);
      }
    }
  }
}

function handlePlayResult() {
  hideResultOverlay();
  const isTD = sim && sim.success && (game.ballYardLine + sim.yardsGained >= 50);
  game.seasonStats.attempts++;

  if (sim && !sim.isSack) updateTrust(sim.chosenWR, sim.success ? 'complete' : 'incomplete');

  if (sim.isSack) {
    game.seasonStats.sacks++;
    game.ballYardLine = Math.max(1, game.ballYardLine - (sim.sackYards || 5));
    addStress(20); consecutiveCatches = 0; game.drivePlays++;
    game.downs.current++;
    if (game.downs.current > 4) { endGame(false); return; }
  } else if (sim.isINT) {
    game.seasonStats.ints++; addStress(25); consecutiveCatches = 0;
    endGame(false); return;
  } else if (sim.success) {
    consecutiveCatches++; game.seasonStats.completions++;
    const yards = sim.yardsGained;
    game.seasonStats.yards += yards;
    game.score += yards * 10; game.gold += yards * 2;
    game.driveYards += yards; game.drivePlays++;
    game.ballYardLine = Math.min(50, game.ballYardLine + yards);
    game.seasonStats.plays.push({
      floor: game.level, formation: currentPlay.offense.name,
      wrName: wrs[sim.chosenWR].name, route: currentPlay.offense.wrs[sim.chosenWR].route,
      yards, passType: game.passType, isTD: game.ballYardLine >= 50,
    });
    reduceStress(5);
    if (game.ballYardLine >= 50) {
      game.seasonStats.tds++; game.score += 600; game.gold += 100; reduceStress(10);
      if (game.level >= game.maxLevel) {
        game.state = 'victory'; sim = null;
        showPanel('victory');
        return;
      } else {
        game.level++;
        game.ballYardLine = 5; game.downs.current = 1;
        game.gotFirstDown = false; game.firstDownLine = 25;
        game.audiblesLeft = 1 + (hasRelic('audible_master') ? 1 : 0);
        defenseBonus += 4; generateUpgradeOptions();
        if (game.filmStudyFloorsLeft > 0) game.filmStudyFloorsLeft--;
        if (game.level === 7 && !game.halftimeShown) {
          game.halftimeShown = true;
          game.state = 'halftime'; sim = null;
          generateHalftimeOptions();
          showPanel('halftime');
          return;
        }
        game.state = 'upgrade'; sim = null;
        showPanel('upgrade');
        return;
      }
    } else {
      if (!game.gotFirstDown && game.ballYardLine >= game.firstDownLine) {
        game.gotFirstDown = true; game.downs.current = 1;
        game.firstDownLine = 50;
        ChineseCommentary.generate('first_down');
      } else {
        game.downs.current++;
        if (game.downs.current > 4) { endGame(false); return; }
      }
    }
  } else {
    consecutiveCatches = 0; addStress(15); game.drivePlays++;
    game.downs.current++;
    if (game.downs.current > 4) { endGame(false); return; }
  }

  if (currentPlay && currentPlay.isElite && sim && sim.success) game.gold += 50;
  sim = null;
  footballObj.visible = false;

  // Reset player animations
  [playerObjects.qb, ...playerObjects.wrs, ...playerObjects.dbs, playerObjects.rusher].forEach(p => {
    const armGroup = p.getObjectByName('armGroup');
    const legGroup = p.getObjectByName('legGroup');
    if (armGroup) {
      const ra = armGroup.getObjectByName('rightArm');
      const la = armGroup.getObjectByName('leftArm');
      if (ra) { ra.rotation.x = 0; ra.rotation.z = 0; }
      if (la) { la.rotation.x = 0; la.rotation.z = 0; }
    }
    if (legGroup) {
      const rl = legGroup.getObjectByName('rightLeg');
      const ll = legGroup.getObjectByName('leftLeg');
      if (rl) rl.rotation.x = 0;
      if (ll) ll.rotation.x = 0;
    }
  });

  // Start next play
  generatePlay(false, false);
  game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0;
  setPlayersVisible(true);
  positionPlayersForPlay();
  enterReadingPhase();
}

function endGame(isVictory) {
  game.state = isVictory ? 'victory' : 'gameOver';
  sim = null;
  showPanel(isVictory ? 'victory' : 'gameOver');
}

// ============================================================
// UI MANAGEMENT
// ============================================================
const panelContainer = document.getElementById('panel-container');
const scoreBug = document.getElementById('score-bug');
const poiseMeter = document.getElementById('poise-meter');
const topBar = document.getElementById('top-bar');
const relicsBar = document.getElementById('relics-bar');
const readingPrompt = document.getElementById('reading-prompt');
const readingActions = document.getElementById('reading-actions');
const wrSelectEl = document.getElementById('wr-select');
const wrCardsEl = document.getElementById('wr-cards');
const passTypePanel = document.getElementById('pass-type-panel');
const scramblePanel = document.getElementById('scramble-panel');
const resultOverlay = document.getElementById('result-overlay');
const motionResultEl = document.getElementById('motion-result');
const formationBadge = document.getElementById('formation-badge');

function updateScoreBug() {
  scoreBug.classList.remove('hidden');
  document.getElementById('sb-score').textContent = game.score;
  const suffix = ['ST', 'ND', 'RD', 'TH'][Math.min(game.downs.current - 1, 3)];
  const dist = game.gotFirstDown ? 'GL' : (game.firstDownLine - game.ballYardLine);
  document.getElementById('sb-down').textContent = `${game.downs.current}${suffix} & ${dist}`;
  document.getElementById('sb-info').textContent = `OWN ${game.ballYardLine} · 💰${game.gold}`;
  const dc = getCurrentDC();
  document.getElementById('sb-dc').textContent = `${dc.icon} ${dc.name.split(' ')[1]}`;
  document.getElementById('sb-level').textContent = `L${game.level}`;
}

function updatePoiseMeter() {
  poiseMeter.classList.remove('hidden');
  const poise = 100 - game.stress;
  const level = getComposureLevel();
  const labels = { cool: 'COOL', nervous: 'NERVOUS', shaky: 'SHAKY', tilted: 'TILTED' };
  const colors = { cool: '#22cc44', nervous: '#ffcc00', shaky: '#ff8800', tilted: '#ee3333' };

  const bar = document.getElementById('poise-bar');
  bar.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const seg = document.createElement('div');
    seg.className = 'seg';
    if (poise >= (i + 1) * 10) {
      seg.className += i < 3 ? ' on-red' : i < 6 ? ' on-yellow' : ' on-green';
    }
    bar.appendChild(seg);
  }
  document.getElementById('poise-value').textContent = Math.round(poise);
  document.getElementById('poise-value').style.color = colors[level];
  document.getElementById('poise-status').textContent = labels[level];
  document.getElementById('poise-status').style.color = colors[level];
}

function updateTopBar() {
  topBar.classList.remove('hidden');
  document.getElementById('tb-formation').textContent = currentPlay ? currentPlay.offense.name : '';
  document.getElementById('tb-defense').textContent = (hasRelic('film_study') || game.scoutReport || game.filmStudyFloorsLeft > 0) && currentPlay ? `DEF: ${currentPlay.defense.name}` : '';
  const dc = getCurrentDC();
  document.getElementById('tb-dc').textContent = `${dc.icon} ${dc.name}`;
  document.getElementById('tb-qb-stats').textContent = `QB ACC:${qb.accuracy} ARM:${qb.arm}`;
  const weather = getWeatherForFloor(game.level);
  const wIcons = { day: '', dusk: '🌅 DUSK', night: '🌙 NIGHT', rain: '🌧️ RAIN', snow: '❄️ SNOW' };
  document.getElementById('tb-weather').textContent = wIcons[weather] || '';
}

function updateRelicsBar() {
  relicsBar.classList.remove('hidden');
  relicsBar.textContent = relics.map(r => r.icon).join(' ');
}

function hideGameUI() {
  scoreBug.classList.add('hidden');
  poiseMeter.classList.add('hidden');
  topBar.classList.add('hidden');
  relicsBar.classList.add('hidden');
  readingPrompt.classList.add('hidden');
  readingActions.classList.add('hidden');
  wrSelectEl.classList.add('hidden');
  motionResultEl.classList.add('hidden');
  formationBadge.classList.add('hidden');
}

function showGameUI() {
  updateScoreBug(); updatePoiseMeter(); updateTopBar(); updateRelicsBar();
}

// ============================================================
// READING PHASE UI
// ============================================================
let readingTimerInterval = null;

function enterReadingPhase() {
  showGameUI();
  readingPrompt.classList.remove('hidden');
  readingActions.classList.remove('hidden');
  formationBadge.classList.remove('hidden');
  formationBadge.textContent = `${game.formationType === 'shotgun' ? '🔫' : '🏈'} ${currentPlay.offense.name}`;

  readingActions.innerHTML = '';
  if (!game.motionUsed) {
    const motionBtn = document.createElement('div');
    motionBtn.className = 'action-btn';
    motionBtn.textContent = 'MOTION ➡';
    motionBtn.onclick = () => doMotion();
    readingActions.appendChild(motionBtn);
  }
  if (game.audiblesLeft > 0) {
    const audibleBtn = document.createElement('div');
    audibleBtn.className = 'action-btn';
    audibleBtn.textContent = `变阵 (${game.audiblesLeft})`;
    audibleBtn.onclick = () => doAudible();
    readingActions.appendChild(audibleBtn);
  }

  game.readingTimer = 0;
  const readingDuration = 2.5;
  if (readingTimerInterval) clearInterval(readingTimerInterval);
  readingTimerInterval = setInterval(() => {
    game.readingTimer += 0.05;
    const pct = Math.min(1, game.readingTimer / readingDuration) * 100;
    document.getElementById('reading-fill').style.width = pct + '%';
    if (game.readingTimer >= readingDuration) {
      clearInterval(readingTimerInterval);
      readingTimerInterval = null;
      enterChoosingPhase();
    }
  }, 50);
}

function doMotion() {
  if (game.motionUsed) return;
  game.motionUsed = true;
  game.motionResult = currentPlay.coverageIsMan ? 'man' : 'zone';
  currentPlay.motionUsed = true;
  currentPlay.motionResult = game.motionResult;
  currentPlay.wrScores = evaluateReceivers(currentPlay.offense, currentPlay.defense, currentPlay.isElite, currentPlay.isBoss);
  currentPlay.bestWR = currentPlay.wrScores.indexOf(Math.max(...currentPlay.wrScores));

  motionResultEl.classList.remove('hidden');
  motionResultEl.className = game.motionResult === 'man' ? 'man' : 'zone';
  motionResultEl.id = 'motion-result';
  motionResultEl.textContent = game.motionResult === 'man' ? '🔴 MAN DETECTED!' : '🟢 ZONE DETECTED!';

  if (game.motionResult === 'man') ChineseCommentary.generate('presnap_motion_man');
  else ChineseCommentary.generate('presnap_motion_zone');

  readingActions.innerHTML = '';
  if (game.audiblesLeft > 0) {
    const audibleBtn = document.createElement('div');
    audibleBtn.className = 'action-btn';
    audibleBtn.textContent = `变阵 (${game.audiblesLeft})`;
    audibleBtn.onclick = () => doAudible();
    readingActions.appendChild(audibleBtn);
  }
}

function doAudible() {
  if (game.audiblesLeft <= 0) return;
  game.audiblesLeft--;
  showCommentary('AUDIBLE! 变阵！');
  generatePlay(currentPlay && currentPlay.isElite, currentPlay && currentPlay.isBoss);
  game.readingTimer = 0;
  game.motionUsed = false;
  motionResultEl.classList.add('hidden');
  positionPlayersForPlay();
  enterReadingPhase();
}

function enterChoosingPhase() {
  game.state = 'choosing';
  readingPrompt.classList.add('hidden');
  readingActions.classList.add('hidden');
  wrSelectEl.classList.remove('hidden');

  wrCardsEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const wr = wrs[i];
    const pw = currentPlay.offense.wrs[i];
    const prob = calculateCatchProb(i, 'touch');
    const trust = getTrustStatus(i);

    const card = document.createElement('div');
    card.className = 'wr-card';
    card.style.borderColor = WR_COLORS_CSS[i];

    const probClass = prob >= 60 ? 'high' : prob >= 35 ? 'mid' : 'low';
    const trustPct = game.wrTrust[i];
    const trustColor = trustPct > 70 ? '#22cc44' : trustPct > 40 ? '#ffcc00' : '#ee3333';

    card.innerHTML = `
      <div class="color-stripe" style="background:${WR_COLORS_CSS[i]}"></div>
      <div class="name">${wr.name} ${trust.emoji} #${wr.num}</div>
      <div class="stats">SPD:${wr.spd} CAT:${wr.cat} RTE:${wr.rte}</div>
      <div class="route">${pw.route.toUpperCase()}</div>
      <div class="prob ${probClass}">${Math.round(prob)}%</div>
      <div class="trust-bar"><div class="trust-fill" style="width:${trustPct}%;background:${trustColor}"></div></div>
    `;

    if (i === currentPlay.bestWR && (hasRelic('film_study') || game.scoutReport || game.filmStudyFloorsLeft > 0)) {
      card.innerHTML += '<div style="color:#ffd700;font-size:10px">★ BEST</div>';
    }

    card.onclick = () => {
      wrSelectEl.classList.add('hidden');
      startSimulation(i);
    };
    wrCardsEl.appendChild(card);
  }
}

// ============================================================
// PASS TYPE UI
// ============================================================
let passTypeTimerInterval = null;
let passTypeTimer = 0;

function showPassTypePanel() {
  passTypePanel.classList.remove('hidden');
  document.getElementById('pt-title').textContent = `选择传球类型 → ${wrs[sim.chosenWR].name}`;
  passTypeTimer = 0;
  const maxTime = 6;

  if (passTypeTimerInterval) clearInterval(passTypeTimerInterval);
  passTypeTimerInterval = setInterval(() => {
    passTypeTimer += 0.05;
    const pct = Math.max(0, (1 - passTypeTimer / maxTime)) * 100;
    document.getElementById('pt-timer-fill').style.width = pct + '%';
    document.getElementById('pt-timer-fill').style.background = pct > 30 ? '#1e90ff' : '#ee3333';
    if (passTypeTimer >= maxTime) {
      clearInterval(passTypeTimerInterval);
      game.passType = 'touch';
      beginSimAfterPassType();
    }
  }, 50);
}

function hidePassTypePanel() {
  passTypePanel.classList.add('hidden');
  if (passTypeTimerInterval) { clearInterval(passTypeTimerInterval); passTypeTimerInterval = null; }
}

document.querySelectorAll('.pass-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    game.passType = btn.dataset.type;
    beginSimAfterPassType();
  });
});

// ============================================================
// SCRAMBLE UI
// ============================================================
function showScramblePanel() {
  scramblePanel.classList.remove('hidden');
  const sideText = sim.rusherSide === 'left' ? '← 冲传来自左侧' :
    sim.rusherSide === 'right' ? '冲传来自右侧 →' : '↑ 中路冲传 ↑';
  document.getElementById('scramble-dir').textContent = sideText;
}

function hideScramblePanel() {
  scramblePanel.classList.add('hidden');
}

function updateScrambleTimerBar() {
  if (!sim) return;
  const pct = Math.max(0, sim.scrambleTimer / 1.8) * 100;
  document.getElementById('scramble-timer-fill').style.width = pct + '%';
  document.getElementById('scramble-timer-fill').style.background = pct > 30 ? '#ffcc00' : '#ee3333';
}

document.querySelectorAll('.s-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (sim && sim.phase === 'scramble' && sim.scrambleChoice === null) {
      sim.scrambleChoice = btn.dataset.dir;
    }
  });
});

// ============================================================
// RESULT OVERLAY
// ============================================================
function showResultOverlay(text, detail, sub, color) {
  resultOverlay.classList.remove('hidden');
  document.getElementById('res-text').textContent = text;
  document.getElementById('res-text').style.color = color;
  resultOverlay.style.borderColor = color;
  document.getElementById('res-detail').textContent = detail;
  document.getElementById('res-sub').textContent = sub;
}

function hideResultOverlay() {
  resultOverlay.classList.add('hidden');
}

resultOverlay.addEventListener('click', () => {
  if (sim && (sim.phase === 'result' || sim.phase === 'sackResult') && sim.timer > 0.5) {
    handlePlayResult();
  }
});

// ============================================================
// PANEL SYSTEM (Full screen overlays)
// ============================================================
function showPanel(type) {
  hideGameUI();
  setPlayersVisible(false);

  let html = '<div class="panel active">';

  switch(type) {
    case 'title':
      html += `
        <h1 style="text-shadow:0 0 20px #1e90ff">QB CHALLENGE</h1>
        <h2 style="color:#ffd700">V12 3D DYNASTY</h2>
        <div class="subtitle">三维重建 · 广播视角 · Under Center · 冲传压力</div>`;

      if (Career.data && Career.data.seasons > 0) {
        html += `<div style="background:rgba(15,15,25,0.85);border:1px solid #ffd700;border-radius:6px;padding:12px;margin:12px 0;text-align:center">
          <div style="color:#ffd700;font-weight:700;font-size:10px">CAREER STATS</div>
          <div style="color:#ccc;font-size:10px;margin-top:4px">赛季 ${Career.data.seasons + 1} · ${Career.getCareerCompPct()}% COMP · ${Career.data.careerYards} YDS · ${Career.data.careerTD} TD · ${Career.data.careerINT} INT</div>
          <div style="color:#ffd700;font-weight:700;margin-top:4px">最佳Rating: ${Career.data.bestRating.toFixed(1)}</div>
          ${Career.getLegacyBonus() > 0 ? `<div style="color:#22cc44;font-size:10px">⬆ Legacy Bonus: +${Career.getLegacyBonus()} ACC</div>` : ''}
          <div style="margin-top:6px">${Career.getAllMilestones().map(m => `<span style="opacity:${Career.data.milestones.includes(m.id) ? 1 : 0.2}">${m.icon}</span>`).join(' ')}</div>
        </div>`;
      }

      html += `
        <button class="btn primary" onclick="window._startGame()">🏈 开始游戏</button>
        <button class="btn gold" onclick="window._showChallengeInput()">🏆 CHALLENGE</button>
        <div id="challenge-input-area" style="display:none;text-align:center;margin-top:12px">
          <input type="text" id="challenge-code-input" placeholder="QBXXXXXXXX" maxlength="12"
            style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);color:#fff;padding:8px 16px;border-radius:4px;font-size:16px;font-family:monospace;text-align:center;width:200px">
          <div style="margin-top:8px;display:flex;gap:8px;justify-content:center">
            <button class="btn green" style="width:80px" onclick="window._applyChallengeCode()">GO</button>
            <button class="btn red" style="width:80px" onclick="document.getElementById('challenge-input-area').style.display='none'">✕</button>
          </div>
        </div>
        <div class="subtitle" style="margin-top:20px">V12: 3D · Under Center · 冲传压力 · 中文解说 · 传球计时器x3</div>`;
      break;

    case 'map':
      html += `
        <h1>📺 SEASON SCHEDULE</h1>
        <h2>Week ${game.level} · ${game.score} PTS · 💰${game.gold}</h2>`;
      const dc = getCurrentDC();
      html += `<div style="text-align:center;color:#ff8844;font-size:11px;margin-bottom:16px">${dc.icon} ${dc.name} — ${dc.desc}</div>`;

      if (mapData) {
        html += '<div class="map-grid">';
        for (let f = 0; f < mapData.floors.length; f++) {
          if (f === 6) html += '<div style="text-align:center;color:#ffd700;font-size:9px;font-weight:700;border-top:1px dashed rgba(255,215,0,0.3);padding-top:4px">HALFTIME</div>';
          html += '<div class="map-row">';
          html += `<span style="font-size:8px;color:rgba(255,255,255,0.25);position:absolute;left:4px">WK${f+1}</span>`;
          for (let n = 0; n < mapData.floors[f].length; n++) {
            const node = mapData.floors[f][n], nt = NODE_TYPES[node.type];
            const isVisited = mapData.visited.has(`${f}_${n}`);
            const isAccessible = isNodeAccessible(f, n);
            const isCurrent = f === mapData.currentFloor && n === mapData.currentNode;
            let cls = 'map-node';
            if (isAccessible) cls += ' accessible';
            if (isVisited) cls += ' visited';
            if (isCurrent) cls += ' current';
            html += `<div class="${cls}" style="border-color:${nt.color}" ${isAccessible ? `onclick="window._selectNode(${f},${n})"` : ''}>
              <div class="icon">${nt.icon}</div>
              <div class="label" style="color:${nt.color}">${nt.name}</div>
            </div>`;
          }
          html += '</div>';
        }
        html += '</div>';
      }
      break;

    case 'upgrade':
      html += `<h1 style="color:#ffd700">🏈 TOUCHDOWN! 🏈</h1>
        <h2>进入第 ${game.level} 关</h2>
        <div class="subtitle">SELECT YOUR UPGRADE</div>`;
      for (let i = 0; i < upgradeOptions.length; i++) {
        const opt = upgradeOptions[i];
        const typeLabel = opt.type === 'qb' ? 'QB' : opt.type === 'wr' ? 'WR' : opt.type === 'relic' ? 'RELIC' : 'TACTIC';
        const typeColor = opt.type === 'qb' ? '#ffd700' : opt.type === 'wr' ? '#1e90ff' : opt.type === 'relic' ? '#cc66ff' : '#22cc44';
        html += `<div class="upgrade-card" onclick="window._applyUpgrade(${i})">
          <div class="icon">${opt.icon}</div>
          <div class="info">
            <span class="type-badge" style="color:${typeColor};border:1px solid ${typeColor}">${typeLabel}</span>
            <div class="name">${opt.name}</div>
            <div class="desc">${opt.desc}</div>
          </div>
        </div>`;
      }
      break;

    case 'halftime':
      html += `<h1 style="color:#ffd700;text-shadow:0 0 20px #ffd700">HALFTIME</h1>`;
      const s = game.seasonStats;
      const rating = calculateQBRating();
      html += `<div class="halftime-stats">
        <div class="half" style="border-color:#1e90ff">
          <h3 style="color:#1e90ff">上半场</h3>
          <div style="font-size:10px;color:#ccc">${s.completions}/${s.attempts} COMP · ${s.yards} YDS</div>
          <div style="font-size:10px;color:#ccc">${s.tds} TD · ${s.ints} INT</div>
          <div class="big">${rating.toFixed(1)}</div>
          <div style="font-size:8px;color:#888">QB RATING</div>
        </div>
        <div class="half" style="border-color:#ee3333">
          <h3 style="color:#ee3333">DC TENDENCIES</h3>
          <div style="font-size:10px;color:#ccc">Zone: ${game.coverageTracker.zone}</div>
          <div style="font-size:10px;color:#ccc">Man: ${game.coverageTracker.man}</div>
          <div style="font-size:10px;color:#ccc">Blitz: ${game.coverageTracker.blitz}</div>
        </div>
      </div>`;
      html += '<div style="text-align:center;font-weight:700;margin-bottom:8px">CHOOSE YOUR ADJUSTMENT (pick 1)</div>';
      for (let i = 0; i < halftimeOptions.length; i++) {
        const opt = halftimeOptions[i];
        html += `<div class="upgrade-card" onclick="window._applyHalftime(${i})">
          <div class="icon">${opt.icon}</div>
          <div class="info"><div class="name">${opt.name}</div><div class="desc">${opt.desc}</div></div>
        </div>`;
      }
      html += '<div style="text-align:center;color:#ee3333;font-size:10px;font-weight:700;margin-top:12px">⚠ 防守也在半场进行了调整!</div>';
      break;

    case 'event':
      html += `<h1 style="color:#cc66ff">📜 RANDOM EVENT</h1>`;
      if (currentEvent) {
        html += `<div style="background:rgba(20,15,35,0.9);border:1px solid #cc66ff;border-radius:6px;padding:16px;margin:12px 0;text-align:center">
          <div style="font-size:16px;font-weight:700">${currentEvent.title}</div>
          <div style="font-size:12px;color:#ccc;margin-top:8px">${currentEvent.desc}</div>
        </div>`;
        if (currentEvent.type === 'choose_wr') {
          for (let i = 0; i < 4; i++) {
            html += `<button class="btn" onclick="window._eventWR(${i})">${wrs[i].name}</button>`;
          }
        } else {
          html += `<button class="btn primary" onclick="window._eventOk()">继续</button>`;
        }
      }
      break;

    case 'shop':
      html += `<h1 style="color:#ffd700">🏪 SHOP</h1>
        <h2>💰 ${game.gold} Gold</h2>`;
      for (let i = 0; i < shopItems.length; i++) {
        const item = shopItems[i];
        const canBuy = game.gold >= item.cost && !item.bought;
        html += `<div class="shop-item ${item.bought ? 'bought' : ''}" ${canBuy ? `onclick="window._buyItem(${i})"` : ''}>
          <span style="color:${canBuy ? '#fff' : '#666'}">${item.name}</span>
          <span class="cost">${item.bought ? '✓' : item.cost + 'G'}</span>
        </div>`;
      }
      html += `<button class="btn" onclick="window._leaveShop()">离开商店</button>`;
      break;

    case 'rest':
      html += `<h1 style="color:#22cc44">💤 HALFTIME REST</h1>
        <div style="text-align:center;color:#ccc;font-size:13px;line-height:2">
          在场边歇了一会儿...<br>档数已重置为第1档<br>球位重置到5码线
        </div>
        <div style="text-align:center;color:#22cc44;font-weight:700;margin:12px 0">Poise +20 😌</div>
        <button class="btn primary" onclick="window._restOk()">继续</button>`;
      break;

    case 'gameOver':
    case 'victory':
      const isVictory = type === 'victory';
      if (!game._seasonEnded) {
        game._seasonEnded = true;
        const stats = { completions: game.seasonStats.completions, attempts: game.seasonStats.attempts,
          yards: game.seasonStats.yards, tds: game.seasonStats.tds, ints: game.seasonStats.ints,
          rating: calculateQBRating() };
        game.newMilestones = Career.endSeason(stats);
        game.challengeSeedCode = SeedSystem.generateSeed();
      }
      const r2 = calculateQBRating();
      html += isVictory
        ? `<h1 style="color:#ffd700;text-shadow:0 0 30px #ffd700">🏆 CHAMPION! 🏆</h1>`
        : `<h1 style="color:#1e90ff">📺 SEASON HIGHLIGHTS</h1>`;

      html += `<div style="background:rgba(15,15,25,0.9);border:1px solid #1e90ff;border-radius:6px;padding:12px;margin:12px 0;text-align:center">
        <div style="font-size:10px;color:#ccc">${game.seasonStats.completions}/${game.seasonStats.attempts} COMP · ${game.seasonStats.yards} YDS · ${game.seasonStats.tds} TD · ${game.seasonStats.ints} INT</div>
        <div style="font-size:10px;color:#ccc">Floor ${game.level} · ${game.score} PTS</div>
        <div style="color:#ffd700;font-weight:700;font-size:10px;margin-top:6px">QB RATING</div>
        <div style="font-size:24px;font-weight:900;color:#ffd700">${r2.toFixed(1)}</div>
      </div>`;

      html += `<div style="display:flex;gap:8px;justify-content:center;margin:8px 0">`;
      for (let i = 0; i < 4; i++) {
        const trust = getTrustStatus(i);
        html += `<div style="text-align:center;font-size:10px"><span style="color:${WR_COLORS_CSS[i]}">${wrs[i].name} ${trust.emoji}</span><br><span style="color:#888">${game.wrTrust[i]}%</span></div>`;
      }
      html += '</div>';

      const plays = [...game.seasonStats.plays].sort((a, b) => b.yards - a.yards).slice(0, 3);
      if (plays.length > 0) {
        html += '<div style="text-align:center;font-weight:700;font-size:11px;margin-top:12px">TOP PLAYS</div>';
        html += '<div class="highlight-plays">';
        plays.forEach((p, i) => {
          const ptE = p.passType === 'bullet' ? '🔴' : p.passType === 'lob' ? '🔵' : '🟡';
          html += `<div class="highlight-play">${i + 1}. Floor ${p.floor}: ${p.wrName} ${p.route.toUpperCase()} ${p.yards}yds ${ptE}${p.isTD ? ' TD' : ''}</div>`;
        });
        html += '</div>';
      }

      if (game.newMilestones && game.newMilestones.length > 0) {
        html += '<div style="text-align:center;color:#ffd700;font-weight:700;margin-top:12px">🎉 NEW MILESTONES! 🎉</div>';
        game.newMilestones.forEach(m => { html += `<div style="text-align:center;font-size:11px">${m.icon} ${m.label}</div>`; });
      }

      html += `<div style="background:rgba(25,25,40,0.9);border:1px solid #ffd700;border-radius:6px;padding:12px;margin:16px 0;text-align:center">
        <div style="color:#ffd700;font-weight:700;font-size:10px">CHALLENGE CODE</div>
        <div style="font-size:20px;font-weight:900;font-family:monospace">${game.challengeSeedCode}</div>
      </div>`;

      html += `<div style="display:flex;gap:8px;justify-content:center">
        <button class="btn gold" style="width:140px" onclick="window._copySeed()">📋 复制代码</button>
        <button class="btn primary" style="width:140px" onclick="window._startGame()">🔄 再来一局</button>
      </div>`;
      break;
  }

  html += '</div>';
  panelContainer.innerHTML = html;
}

function hidePanel() {
  panelContainer.innerHTML = '';
}

// ============================================================
// GLOBAL ACTION HANDLERS
// ============================================================
window._startGame = function() {
  hidePanel();
  startNewGame();
};

window._showChallengeInput = function() {
  document.getElementById('challenge-input-area').style.display = 'block';
};

window._applyChallengeCode = function() {
  const code = document.getElementById('challenge-code-input').value.toUpperCase();
  if (SeedSystem.applySeed(code)) {
    hidePanel();
    startNewGame();
  }
};

window._selectNode = function(floor, nodeIdx) {
  hidePanel();
  selectMapNode(floor, nodeIdx);
};

window._applyUpgrade = function(idx) {
  upgradeOptions[idx].apply();
  game.weatherDebuff = 0; game.scoutReport = false;
  game.driveYards = 0; game.drivePlays = 0;
  hidePanel();
  advanceMap();
};

window._applyHalftime = function(idx) {
  halftimeOptions[idx].apply();
  game.state = 'upgrade';
  generateUpgradeOptions();
  hidePanel();
  showPanel('upgrade');
};

window._eventWR = function(wrIdx) {
  if (currentEvent) { currentEvent.effect(wrIdx); currentEvent = null; }
  hidePanel();
  advanceMap();
};

window._eventOk = function() {
  if (currentEvent) { if (currentEvent.type === 'instant') currentEvent.effect(); currentEvent = null; }
  hidePanel();
  advanceMap();
};

window._buyItem = function(idx) {
  if (shopItems[idx] && !shopItems[idx].bought && game.gold >= shopItems[idx].cost) {
    game.gold -= shopItems[idx].cost;
    shopItems[idx].apply();
    shopItems[idx].bought = true;
    hidePanel();
    showPanel('shop');
  }
};

window._leaveShop = function() {
  hidePanel();
  advanceMap();
};

window._restOk = function() {
  hidePanel();
  advanceMap();
};

window._copySeed = function() {
  SeedSystem.copyToClipboard(game.challengeSeedCode);
  showCommentary('代码已复制！');
};

// ============================================================
// MAP NODE SELECTION
// ============================================================
function selectMapNode(floor, nodeIdx) {
  mapData.currentFloor = floor; mapData.currentNode = nodeIdx;
  mapData.visited.add(`${floor}_${nodeIdx}`);
  const node = mapData.floors[floor][nodeIdx];
  game.currentDC = getCurrentDC();

  switch (node.type) {
    case 'play':
      generatePlay(false, false);
      game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0;
      setPlayersVisible(true); positionPlayersForPlay(); enterReadingPhase();
      break;
    case 'elite':
      generatePlay(true, false);
      game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0;
      setPlayersVisible(true); positionPlayersForPlay(); enterReadingPhase();
      break;
    case 'boss':
      generatePlay(false, true);
      game.state = 'reading'; game.readingPhase = true; game.readingTimer = 0;
      setPlayersVisible(true); positionPlayersForPlay(); enterReadingPhase();
      break;
    case 'rest':
      game.downs.current = 1; game.ballYardLine = 5; game.gotFirstDown = false;
      game.firstDownLine = 25; reduceStress(20);
      game.state = 'rest'; showPanel('rest');
      break;
    case 'shop':
      generateShop(); game.state = 'shop'; showPanel('shop');
      break;
    case 'event':
      currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      game.state = 'event'; showPanel('event');
      break;
  }
}

function advanceMap() {
  if (!mapData || mapData.currentFloor >= mapData.floors.length - 1) {
    game.state = 'victory'; showPanel('victory'); return;
  }
  game.state = 'map'; showPanel('map');
}

// ============================================================
// START NEW GAME
// ============================================================
function startNewGame() {
  Career.load();
  const legacyBonus = Career.getLegacyBonus();

  game.state = 'map'; game.ballYardLine = 5; game.downs = { current: 1, max: 4 };
  game.firstDownLine = 25; game.gotFirstDown = false; game.score = 0; game.level = 1;
  game.weatherDebuff = 0; game.scoutReport = false; game.stress = 0; game.gold = 100;
  game.audiblesLeft = 1; game.readingPhase = false; game.readingTimer = 0;
  game.weatherType = 'normal'; game.playCount = 0; game.driveYards = 0; game.drivePlays = 0;
  game.motionUsed = false; game.motionResult = null; game.motionWRIndex = -1;
  game.passType = 'touch'; game.scrambleResult = null;
  game.seasonStats = { completions: 0, attempts: 0, yards: 0, tds: 0, ints: 0, sacks: 0, plays: [] };
  game.currentDC = null;
  game.adaptiveTracker = { wrPicks: [0,0,0,0], routePicks: {} };
  game.wrTrust = [50, 50, 50, 50];
  game.halftimeShown = false; game.halftimeAdjustment = null;
  game.coverageTracker = { zone: 0, man: 0, blitz: 0 };
  game.newMilestones = []; game.challengeSeedCode = '';
  game.composureRecoveryBonus = 0; game.filmStudyFloorsLeft = 0;
  game.playBookExpanded = false; game._seasonEnded = false;
  game.rushProximityPenalty = 0;

  if (!SeedSystem.isChallenge) {
    game.mapSeed = Math.floor(Math.random() * 100000);
    game.weatherSeed = Math.floor(Math.random() * 100000);
  }

  qb = { accuracy: 70 + legacyBonus, arm: 60, readSpeed: 0, level: 1 };
  wrs = [
    { id: 0, name: 'ACE', spd: 60, cat: 65, rte: 60, lvl: 1, num: 81 },
    { id: 1, name: 'BLITZ', spd: 55, cat: 60, rte: 65, lvl: 1, num: 88 },
    { id: 2, name: 'FLASH', spd: 65, cat: 55, rte: 55, lvl: 1, num: 13 },
    { id: 3, name: 'TANK', spd: 50, cat: 70, rte: 60, lvl: 1, num: 84 },
  ];
  relics = []; defenseBonus = 0; consecutiveCatches = 0;
  currentPlay = null; sim = null;

  footballObj.visible = false;
  setPlayersVisible(false);
  hideGameUI(); hideResultOverlay(); hidePassTypePanel(); hideScramblePanel();

  SeedSystem.isChallenge = false;
  generateMap(); mapData.currentFloor = -1; mapData.currentNode = 0;
  updateWeatherVisuals();

  showPanel('map');
}

// ============================================================
// CAMERA UPDATE
// ============================================================
function updateCamera(dt) {
  const targetPos = cameraState.offset.clone();
  camera.position.lerp(targetPos, cameraState.lerpSpeed);
  camera.lookAt(cameraState.target);

  // Screen shake
  if (cameraState.shakeIntensity > 0.01) {
    camera.position.x += (Math.random() - 0.5) * cameraState.shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * cameraState.shakeIntensity * 0.5;
    camera.position.z += (Math.random() - 0.5) * cameraState.shakeIntensity * 0.3;
    cameraState.shakeIntensity *= cameraState.shakeDecay;
  }
}

// ============================================================
// IDLE ANIMATION
// ============================================================
function updateIdleAnimations(dt) {
  const t = game.time;
  const allPlayers = [playerObjects.qb, playerObjects.center, ...playerObjects.wrs, ...playerObjects.dbs, playerObjects.rusher];
  allPlayers.forEach((p, i) => {
    if (p && p.visible && (!sim || sim.phase === 'snap' || game.state === 'reading' || game.state === 'choosing')) {
      animatePlayerIdle(p, t);
      // Subtle body sway
      p.position.y = Math.sin(t * 2 + (p.userData?.idleBob || i)) * 0.02;
    }
  });
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  game.time += dt;

  // Update simulation
  if (game.state === 'simulation' && sim) {
    updateSimulation(dt);
  }

  // Update camera
  if (game.state === 'reading' || game.state === 'choosing') {
    // Pre-snap: wide broadcast shot showing entire formation
    const focusZ = currentPlay ? yardToZ(game.ballYardLine + 10) : 0;
    cameraState.target.lerp(new THREE.Vector3(0, 0, focusZ), 0.03);
    cameraState.offset.lerp(new THREE.Vector3(50, 30, focusZ + 20), 0.025);
  } else if ((game.state === 'simulation' || game.state === 'passType') && sim) {
    // Handled inside updateSimulation camera logic
    if (!cameraState.heroZoom && sim.phase === 'snap') {
      // Quick zoom in during snap
      const focusZ = yardToZ(game.ballYardLine);
      cameraState.target.lerp(new THREE.Vector3(0, 0, focusZ), 0.05);
      cameraState.offset.lerp(new THREE.Vector3(38, 22, focusZ + 15), 0.04);
    }
  } else {
    // Menu state - cinematic slow orbit
    const orbitRadius = 55;
    cameraState.target.set(0, 2, 0);
    cameraState.offset.set(
      Math.sin(game.time * 0.08) * orbitRadius,
      30 + Math.sin(game.time * 0.05) * 5,
      Math.cos(game.time * 0.08) * orbitRadius * 0.6
    );
  }
  updateCamera(dt);

  // Update animations
  updateIdleAnimations(dt);
  updateParticles3D(dt);
  updateBallTrail(dt);
  updateWeatherParticles(dt);

  // Pulse LOS line opacity
  if (losLine && losLine.visible) {
    const pulse = 0.65 + Math.sin(game.time * 3) * 0.1;
    if (losLine.children && losLine.children[0]) losLine.children[0].material.opacity = pulse;
  }

  // Route target pulse animation
  routeTargets.forEach(t => {
    if (t.visible) {
      t.rotation.z = game.time * 1.5;
      const pulse = t.getObjectByName('pulse');
      if (pulse) {
        const s = 1 + Math.sin(game.time * 4) * 0.3;
        pulse.scale.set(s, s, s);
        pulse.material.opacity = 0.15 + Math.sin(game.time * 4) * 0.1;
      }
    }
  });

  // Render
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  const loadFill = document.getElementById('load-fill');
  const loadStatus = document.getElementById('load-status');

  loadStatus.textContent = '加载职业生涯...';
  loadFill.style.width = '20%';
  Career.load();

  loadStatus.textContent = '创建3D场景...';
  loadFill.style.width = '40%';
  initScene();

  loadStatus.textContent = '生成天气粒子...';
  loadFill.style.width = '60%';

  loadStatus.textContent = '初始化游戏...';
  loadFill.style.width = '80%';

  loadFill.style.width = '100%';
  loadStatus.textContent = '准备就绪!';

  setTimeout(() => {
    document.getElementById('loading-screen').style.display = 'none';
    game.state = 'title';
    showPanel('title');
    requestAnimationFrame(gameLoop);
  }, 500);
}

// Start
init();