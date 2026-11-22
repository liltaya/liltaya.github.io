// The five project models and their turntable, all drawn in code with three.js.
// Each builder returns { group, update(t) } where t is seconds since start.
import * as THREE from 'three';

export const C = {
  bone: 0xf3eee3, ink: 0x0c1230, navy: 0x18225a, cobalt: 0x3d5bff, orange: 0xff5b14,
  steel: 0xbfc9ee, wood: 0xe3c48d, green: 0x1fa37a, black: 0x10131f, dim: 0x39468f, wire: 0xe23d28,
};

const cache = new Map();
function mat(color, extra) {
  const key = color + JSON.stringify(extra || 0);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial(Object.assign(
      { color, roughness: 0.72, metalness: 0.04, flatShading: true }, extra)));
  }
  return cache.get(key);
}
const edgeMat = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.4 });

function box(w, h, d, color, x = 0, y = 0, z = 0, edges = true) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
  return mesh;
}
function cyl(r, h, color, x = 0, y = 0, z = 0, seg = 32, edges = true) {
  const geo = new THREE.CylinderGeometry(r, r, h, seg);
  const mesh = new THREE.Mesh(geo, typeof color === 'number' ? mat(color, { flatShading: false }) : color);
  mesh.position.set(x, y, z);
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), edgeMat));
  return mesh;
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => v * v * (3 - 2 * v);

// A dial-like turntable every model stands on.
export function makePlatform() {
  const g = new THREE.Group();
  g.add(cyl(3.5, 0.22, C.navy, 0, -0.11, 0, 96));
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.27, 128),
    new THREE.MeshBasicMaterial({ color: C.orange, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; g.add(ring);
  const n = 72;
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.012, 1),
    new THREE.MeshBasicMaterial({ color: C.bone }), n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, len = i % 6 === 0 ? 0.26 : 0.12;
    d.position.set(Math.sin(a) * (3.42 - len / 2), 0.006, Math.cos(a) * (3.42 - len / 2));
    d.rotation.set(0, a, 0); d.scale.set(1, 1, len); d.updateMatrix();
    ticks.setMatrixAt(i, d.matrix);
  }
  g.add(ticks);
  return g;
}

// Stair-climbing robot: a wooden deck, a rear leg on casters and a three-armed
// wheel linkage at the front, as in the ENSC 100 build. The stairs scroll forever.
function robot() {
  const g = new THREE.Group();
  const RUN = 0.86, RISE = 0.46, N = 7, W = 2.3, BASE = 0.2 + ((N - 1) / 2) * RISE;
  const slope = Math.atan2(RISE, RUN);
  const treads = [];
  for (let i = 0; i < N + 1; i++) {
    const s = new THREE.Group();
    s.add(box(RUN, 0.09, W, C.bone));
    s.add(box(0.09, RISE, W, C.steel, -RUN / 2 + 0.045, -RISE / 2, 0));
    g.add(s); treads.push(s);
  }
  const len = Math.hypot(RUN, RISE) * (N - 0.6);
  for (const z of [-W / 2 - 0.07, W / 2 + 0.07]) {
    const beam = box(len, 0.2, 0.08, C.dim, 0, BASE - 0.32, z);
    beam.rotation.z = slope; g.add(beam);
  }

  const bot = new THREE.Group(); g.add(bot);
  bot.rotation.z = slope;
  bot.add(box(2.7, 0.1, 1.5, C.wood, -0.45, 0.86, 0));                 // deck
  const leg = box(0.1, 0.8, 0.5, C.wood, -1.58, 0.47, 0); leg.rotation.z = 0.3; bot.add(leg);
  bot.add(box(0.08, 0.08, 1.36, C.wood, -1.7, 0.13, 0, false));
  for (const z of [-0.6, 0.6]) {
    const caster = cyl(0.11, 0.09, C.black, -1.74, 0.13, z, 20, false); caster.rotation.x = Math.PI / 2; bot.add(caster);
  }
  bot.add(box(0.34, 0.3, 0.32, C.green, 0.05, 1.06, 0.3));             // battery box
  bot.add(box(0.52, 0.04, 0.36, C.cobalt, -0.55, 0.93, -0.25));        // Raspberry Pi
  bot.add(box(0.16, 0.05, 0.16, C.black, -0.6, 0.97, -0.22, false));
  const post = box(0.1, 0.62, 0.1, C.wood, 0.72, 1.16, -0.45); post.rotation.z = -0.25; bot.add(post);
  const wires = [
    [[-0.4, 0.96, -0.2], [-0.1, 1.3, 0.05], [0.05, 1.2, 0.28]],
    [[-0.4, 0.96, -0.3], [0.2, 1.36, -0.4], [0.72, 1.3, -0.45]],
    [[-0.7, 0.96, -0.12], [-0.3, 1.24, 0.3], [0.0, 1.22, 0.36]],
  ];
  for (const pts of wires) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    bot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.018, 6), mat(C.wire, { flatShading: false })));
  }
  const axle = cyl(0.05, 1.9, C.black, 0.86, 0.36, 0, 12, false); axle.rotation.x = Math.PI / 2; bot.add(axle);
  const stars = [];
  for (const z of [-0.9, 0.9]) {
    const star = new THREE.Group(); star.position.set(0.86, 0.36, z);
    const hub = cyl(0.3, 0.07, C.wood, 0, 0, 0, 28); hub.rotation.x = Math.PI / 2; star.add(hub);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const arm = box(0.62, 0.11, 0.05, C.steel, Math.cos(a) * 0.3, Math.sin(a) * 0.3, z > 0 ? 0.06 : -0.06);
      arm.rotation.z = a; star.add(arm);
      const wheel = cyl(0.12, 0.12, C.black, Math.cos(a) * 0.6, Math.sin(a) * 0.6, z > 0 ? 0.12 : -0.12, 20, false);
      wheel.rotation.x = Math.PI / 2; star.add(wheel);
    }
    bot.add(star); stars.push(star);
  }

  function update(t) {
    const s = (t * 0.42) % 1;
    for (let i = 0; i < treads.length; i++) {
      const u = i - s - (N - 1) / 2;
      treads[i].position.set(u * RUN, BASE + u * RISE, 0);
      const f = ease(clamp01(u + (N - 1) / 2 + 1)) * ease(clamp01((N - 1) / 2 + 0.9 - u));
      treads[i].scale.setScalar(Math.max(f, 0.0001));
    }
    const bob = Math.abs(Math.sin(s * Math.PI)) * 0.07;
    bot.position.set(-0.05 - Math.sin(slope) * (0.12 + bob), BASE + 0.02 + Math.cos(slope) * (0.12 + bob), 0);
    for (const st of stars) st.rotation.z = -s * (Math.PI * 2 / 3) + 0.5;
  }
  return { group: g, update };
}

// BuildScope: a pipeline of six stages with a token moving through it, in front
// of the run matrix (one column per run, one row per stage).
function buildscope() {
  const g = new THREE.Group();
  g.add(box(5, 0.16, 2.7, C.bone, 0, 0.08, 0));
  const xs = [-1.95, -1.17, -0.39, 0.39, 1.17, 1.95], FAIL = 3;
  g.add(box(4.2, 0.05, 0.07, C.ink, 0, 0.34, 0.75, false));
  xs.forEach((x, i) => {
    const node = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.24, 6),
      mat(i === FAIL ? C.orange : i > FAIL ? C.dim : C.steel));
    node.position.set(x, 0.28, 0.75); g.add(node);
  });
  const token = new THREE.Mesh(new THREE.OctahedronGeometry(0.19),
    mat(C.orange, { emissive: C.orange, emissiveIntensity: 0.35 }));
  g.add(token);

  g.add(box(4.75, 2.62, 0.1, C.navy, 0, 1.53, -0.8));
  const COLS = 13, ROWS = 6;
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.28, 0.09),
    new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), COLS * ROWS);
  const col = new THREE.Color();
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    let hex = C.bone;
    if (r === FAIL && c >= 7) hex = C.orange;            // the open regression
    else if (r > FAIL && c >= 7) hex = C.dim;            // blocked behind it
    else if (r === 1 && (c === 2 || c === 9)) hex = C.cobalt; // passed on retry
    tiles.setColorAt(c * ROWS + r, col.setHex(hex));
  }
  g.add(tiles);
  const d = new THREE.Object3D();

  function update(t) {
    const wave = ((t / 5.6) % 1) * (COLS + 5) - 2;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const lift = Math.max(0, 1 - Math.abs(c - wave) * 0.6);
      d.position.set((c - (COLS - 1) / 2) * 0.345, 2.48 - r * 0.38, -0.7 + lift * 0.14);
      d.updateMatrix(); tiles.setMatrixAt(c * ROWS + r, d.matrix);
    }
    tiles.instanceMatrix.needsUpdate = true;
    const p = ((t / 5.6) % 1) * (FAIL + 1.6), i = Math.min(Math.floor(p), FAIL), f = p - i;
    if (i < FAIL) {
      const k = ease(clamp01(f));
      token.position.set(xs[i] + (xs[i + 1] - xs[i]) * k, 0.66 + Math.sin(k * Math.PI) * 0.4, 0.75);
      token.scale.setScalar(1);
    } else {
      token.position.set(xs[FAIL] + Math.sin(t * 40) * 0.025 * clamp01(1 - f), 0.66, 0.75);
      token.scale.setScalar(1 - ease(clamp01(f - 0.9) / 0.7));
    }
    token.rotation.y = t * 2;
  }
  return { group: g, update };
}

// Construction dashboard: a tower going up floor by floor under a crane, with
// planned and actual bars at the front.
function construction() {
  const g = new THREE.Group();
  g.add(box(5, 0.14, 3.5, C.bone, 0, 0.07, 0));
  const floors = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Group(); f.position.set(-0.85, 0.14 + i * 0.58, -0.1);
    f.add(box(2.3, 0.08, 1.7, C.bone, 0, 0.54, 0));
    for (const x of [-1.05, 0, 1.05]) for (const z of [-0.75, 0.75]) f.add(box(0.09, 0.5, 0.09, C.steel, x, 0.25, z, false));
    g.add(f); floors.push(f);
  }
  const crane = new THREE.Group(); crane.position.set(1.85, 0.14, -1.1); g.add(crane);
  crane.add(box(0.5, 0.12, 0.5, C.ink, 0, 0.06, 0));
  crane.add(box(0.2, 4.1, 0.2, C.orange, 0, 2.05, 0));
  const jib = new THREE.Group(); jib.position.y = 4.1; crane.add(jib);
  jib.add(box(0.34, 0.28, 0.34, C.ink, 0, 0.14, 0));
  jib.add(box(3.5, 0.1, 0.12, C.orange, -1.6, 0.32, 0));
  jib.add(box(1.1, 0.1, 0.12, C.orange, 0.7, 0.32, 0));
  jib.add(box(0.36, 0.32, 0.32, C.ink, 1.08, 0.12, 0));
  jib.add(box(0.1, 0.7, 0.1, C.orange, 0, 0.62, 0));
  const tie = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3.2, 0.37, 0), new THREE.Vector3(0, 0.97, 0), new THREE.Vector3(1.2, 0.37, 0)]);
  jib.add(new THREE.Line(tie, new THREE.LineBasicMaterial({ color: C.bone })));
  const trolley = box(0.18, 0.1, 0.2, C.ink, -1.6, 0.22, 0); jib.add(trolley);
  const cable = cyl(0.012, 1, C.bone, 0, 0, 0, 6, false); trolley.add(cable);
  const load = box(0.8, 0.07, 0.55, C.bone); trolley.add(load);

  const bars = [];
  [[1.0, 0.25], [0.8, 0.5], [0.55, 0.38], [0.4, 0.1]].forEach(([plan, actual], i) => {
    const x = -2.05 + i * 0.52;
    const a = box(0.18, 1, 0.18, C.cobalt, x, 0.14, 1.35), b = box(0.18, 1, 0.18, C.orange, x + 0.2, 0.14, 1.35);
    g.add(a, b); bars.push([a, plan * 1.25], [b, actual * 1.25]);
  });

  function update(t) {
    const p = (t % 11) / 11, built = p * 7.2, sink = ease(clamp01((p - 0.9) / 0.1));
    floors.forEach((f, i) => {
      const k = ease(clamp01(built - i)) * (1 - sink);
      f.visible = k > 0.002; f.scale.set(1, Math.max(k, 0.002), 1);
    });
    const w = (t / 11) * Math.PI * 2;
    jib.rotation.y = Math.sin(w) * 0.55 + 0.25;
    trolley.position.x = -1.7 + Math.sin(w * 2) * 1.0;
    const drop = 1.3 + Math.sin(w * 2 + 1) * 0.55;
    cable.scale.y = drop; cable.position.y = -drop / 2 - 0.05; load.position.y = -drop - 0.08;
    const grow = ease(clamp01(p * 4)) * (1 - sink);
    for (const [bar, h] of bars) { const s = Math.max(h * grow, 0.002); bar.scale.y = s; bar.position.y = 0.14 + s / 2; }
  }
  return { group: g, update };
}

// Data platform: requests flow from the API rack into the database, a live graph
// draws itself and a scanner sweeps the access log, lighting up flagged lines.
function platform() {
  const g = new THREE.Group();
  g.add(box(5, 0.14, 3.3, C.bone, 0, 0.07, 0));
  g.add(box(1.3, 2.75, 1.15, C.navy, -1.5, 1.515, -0.55));
  const leds = [];
  for (let i = 0; i < 7; i++) {
    const y = 0.44 + i * 0.355;
    g.add(box(1.08, 0.27, 0.06, C.bone, -1.5, y, 0.05));
    for (let k = 0; k < 2; k++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: C.orange }));
      led.position.set(-1.93 + k * 0.12, y, 0.09); g.add(led); leds.push(led);
    }
  }
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.74, 0.46, C.bone, 1.55, 0.39 + i * 0.56, -0.55, 40));
    g.add(cyl(0.755, 0.08, C.cobalt, 1.55, 0.39 + i * 0.56, -0.55, 40, false));
  }
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.5, 2.9, -0.55), new THREE.Vector3(0, 4.3, -0.55), new THREE.Vector3(1.55, 1.75, -0.55));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 6), mat(C.steel, { flatShading: false })));
  const packets = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), mat(C.orange, { emissive: C.orange, emissiveIntensity: 0.4, flatShading: false }));
    g.add(s); packets.push(s);
  }

  const screen = new THREE.Group(); screen.position.set(1.25, 0.72, 1.0); screen.rotation.x = -0.75; g.add(screen);
  screen.add(box(2.1, 1.3, 0.07, C.navy));
  const ys = [0.1, 0.16, 0.5, 0.42, 0.6, 0.55, 0.78, 0.62, 0.7, 0.95, 0.74, 0.8, 0.52, 0.6, 0.3];
  const line = new THREE.CatmullRomCurve3(ys.map((y, i) => new THREE.Vector3(-0.9 + (i / (ys.length - 1)) * 1.8, -0.5 + y, 0.06)));
  const graph = new THREE.Mesh(new THREE.TubeGeometry(line, 120, 0.022, 6), new THREE.MeshBasicMaterial({ color: C.orange }));
  screen.add(graph);
  const total = graph.geometry.index.count;

  const rows = [], FLAG = [2, 5];
  for (let i = 0; i < 7; i++) {
    const len = [1.5, 1.9, 1.2, 1.7, 2.0, 1.4, 1.8][i];
    const m = new THREE.MeshStandardMaterial({ color: FLAG.includes(i) ? C.orange : C.steel, roughness: 0.7, flatShading: true });
    const row = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.1), m);
    row.position.set(-2.3 + len / 2, 0.165, 0.5 + i * 0.16); g.add(row); rows.push([row, len, FLAG.includes(i)]);
  }
  const scan = box(0.05, 0.34, 1.2, mat(C.cobalt, { emissive: C.cobalt, emissiveIntensity: 0.6 }), 0, 0.31, 0.98, false); g.add(scan);

  function update(t) {
    packets.forEach((s, i) => { const u = (t * (12 / 56) + i / packets.length) % 1; s.position.copy(curve.getPoint(u)); s.scale.setScalar(Math.sin(u * Math.PI) * 0.7 + 0.5); });
    leds.forEach((l, i) => { l.material.color.setHex(Math.sin(t * (2 + (i % 5)) + i * 1.7) > 0.2 ? C.orange : C.dim); });
    const f = ((t / 8) % 1) * 1.25;
    graph.geometry.setDrawRange(0, Math.floor(total * clamp01(f) / 36) * 36);
    const sx = -2.3 + ((t * 0.5) % 1) * 2.1; scan.position.x = sx;
    for (const [row, len, flagged] of rows) if (flagged) row.position.y = 0.165 + (sx > -2.3 && sx < -2.3 + len ? 0.07 : 0);
  }
  return { group: g, update };
}

// Virus.exe: the four parts each player defends, with health bars sized by the
// rules (CPU 20, Storage 15, Memory 10, Network 5), a hand of cards and an ace's shield.
function cardTexture(rank, suit, red) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 360;
  const x = c.getContext('2d');
  x.fillStyle = '#f3eee3'; x.fillRect(0, 0, 256, 360);
  x.fillStyle = red ? '#ff5b14' : '#0c1230';
  x.font = '800 78px "Big Shoulders", "Arial Narrow", sans-serif'; x.textBaseline = 'top'; x.fillText(rank, 20, 12);
  x.font = '170px "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(suit, 128, 212);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function backTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 180;
  const x = c.getContext('2d');
  x.fillStyle = '#3d5bff'; x.fillRect(0, 0, 128, 180);
  x.strokeStyle = '#f3eee3'; x.lineWidth = 2;
  for (let i = -180; i < 300; i += 18) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 180, 180); x.stroke(); x.beginPath(); x.moveTo(i + 180, 0); x.lineTo(i, 180); x.stroke(); }
  x.lineWidth = 10; x.strokeRect(5, 5, 118, 170);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function virus() {
  const g = new THREE.Group();
  g.add(box(4.9, 0.14, 3.4, C.dim, 0, 0.07, 0));
  const trace = (w, d, x, z) => g.add(box(w, 0.02, d, C.steel, x, 0.15, z, false));
  trace(2.3, 0.04, 0, -0.75); trace(2.3, 0.04, 0, 0.85); trace(0.04, 1.6, -1.2, 0.05); trace(0.04, 1.6, 1.2, 0.05); trace(0.04, 1.6, 0, 0.05);
  const hp = (x, z, points) => { const h = points * 0.07; g.add(box(0.14, h, 0.14, C.orange, x, 0.14 + h / 2, z)); };
  g.add(box(1.1, 0.2, 1.1, C.black, -1.2, 0.24, -0.75)); g.add(box(0.72, 0.07, 0.72, C.steel, -1.2, 0.375, -0.75)); hp(-2.05, -0.75, 20);
  for (const z of [-0.95, -0.6]) g.add(box(1.3, 0.42, 0.09, C.cobalt, 1.2, 0.35, z)); hp(2.1, -0.75, 10);
  g.add(cyl(0.34, 0.2, C.bone, -1.2, 0.24, 0.85)); g.add(cyl(0.02, 0.7, C.bone, -1.2, 0.69, 0.85, 8, false));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mat(C.orange, { flatShading: false })); ball.position.set(-1.2, 1.06, 0.85); g.add(ball); hp(-2.05, 0.85, 5);
  for (let i = 0; i < 2; i++) g.add(cyl(0.48, 0.2, C.bone, 1.2, 0.24 + i * 0.25, 0.85)); hp(2.1, 0.85, 15);

  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: C.steel, transparent: true, opacity: 0.25, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  shield.position.set(-1.2, 0.14, -0.75); g.add(shield);

  const side = mat(C.bone), back = new THREE.MeshStandardMaterial({ map: backTexture(), roughness: 0.7 });
  const hand = [['A', '♥', 1], ['7', '♦', 1], ['K', '♣', 0], ['10', '♠', 0], ['Q', '♥', 1]];
  const cards = hand.map(([rank, suit, red]) => {
    const face = new THREE.MeshStandardMaterial({ map: cardTexture(rank, suit, red), roughness: 0.7 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.1, 0.02), [side, side, side, side, face, back]);
    g.add(card); return card;
  });

  function update(t) {
    cards.forEach((card, i) => {
      const w = (t / 9) * Math.PI * 2, a = w + (i / cards.length) * Math.PI * 2;
      card.position.set(Math.sin(a) * 1.75, 2.45 + Math.sin(w * 2 + i) * 0.12, Math.cos(a) * 1.3);
      card.rotation.set(-0.12, a, Math.sin(w + i) * 0.06);
    });
    const on = ease(clamp01(Math.sin((t / 9) * Math.PI * 2) * 2 + 0.6));
    shield.material.opacity = 0.3 * on; shield.scale.setScalar(0.92 + on * 0.08 + Math.sin(t * 5) * 0.006);
  }
  return { group: g, update };
}

export const builders = { buildscope, construction, platform, robot, virus };
// Seconds after which each model's animation repeats exactly.
export const LOOP = { buildscope: 5.6, construction: 11, platform: 8, robot: 2 / 0.42, virus: 9 };
