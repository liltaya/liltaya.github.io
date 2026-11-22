// Page routing, 3D page transitions and the WebGL scene for liltaya.github.io.
import * as THREE from 'three';
import { C, builders, makePlatform } from './models.js';

const html = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PROJECTS = ['buildscope', 'construction', 'platform', 'robot', 'virus'];
const TOP = ['home', 'work', 'about', 'path', 'contact'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isProject = (r) => r.startsWith('work/');
const pageEl = (r) => document.getElementById(isProject(r) ? 'p-' + r.slice(5) : r);
const underEl = (r) => document.getElementById('u-' + pageEl(r).id);

let current = null, sel = 0, busy = false, pending = null;

function parse() {
  let h = decodeURIComponent(location.hash).replace(/^#\/?/, '').replace(/\/$/, '');
  if (h === '' || h === 'top') h = 'home';
  if (h === 'collection') h = 'work';
  if (PROJECTS.includes(h)) h = 'work/' + h;
  if (TOP.includes(h) || (isProject(h) && PROJECTS.includes(h.slice(5)))) return h;
  return 'home';
}

/* ---------- the layer under the canvas: page colours and oversized type ---------- */
const under = $('#under');
for (const page of $$('[data-page]')) {
  const face = document.createElement('div');
  face.className = 'uface t-' + page.dataset.theme; face.id = 'u-' + page.id;
  if (page.id === 'home') face.innerHTML = '<div class="bigname" aria-hidden="true"><span><i>Taisiia</i></span><span><i>Mamenko</i></span></div>';
  if (page.id === 'work') face.innerHTML = '<div class="bigwork" aria-hidden="true"></div>';
  under.appendChild(face);
}
const info = PROJECTS.map((id) => {
  const d = document.getElementById('p-' + id).dataset;
  return { id, name: d.name, big: d.big, kind: d.kind, line: d.line };
});

/* ---------- WebGL scene ---------- */
const R = 16, FOV = 30, TAN = Math.tan((FOV * Math.PI) / 360);
const easeIO = (k) => (k < 0.5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2);

function createScene() {
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 400);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3aa0, 1.25));
  const aim = new THREE.Object3D(); aim.position.set(0, 0, -13); camera.add(aim);
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-6, 8, 5); key.target = aim; camera.add(key);
  const rim = new THREE.DirectionalLight(C.orange, 1.5); rim.position.set(9, 3, -22); rim.target = aim; camera.add(rim);

  const stations = PROJECTS.map((id, i) => {
    const a = (i / PROJECTS.length) * Math.PI * 2;
    const root = new THREE.Group(); root.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); root.rotation.y = a + Math.PI;
    const spin = new THREE.Group(); root.add(spin);
    const model = builders[id]();
    spin.add(makePlatform(), model.group); scene.add(root);
    return { id, a, root, pos: new THREE.Vector3(Math.sin(a) * R, 0, Math.cos(a) * R), spin, model, angle: -0.55, vel: 0 };
  });

  let W = 1, H = 1;
  const view = { cam: new THREE.Vector3(0, 30, 0.1), target: new THREE.Vector3(), ox: 0, oy: 0, k: 1 };
  let tween = null, live = new Set(), nextLive = null, auto = 0.16, dirty = true;

  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; dirty = true;
  }
  function distFor(fitH, fitW) { return Math.max(fitH / (2 * TAN), fitW / (2 * TAN * (W / H))); }
  function stationShot(id, o) {
    const s = stations[PROJECTS.indexOf(id)], dist = distFor(o.fitH, o.fitW), dir = s.a + Math.PI;
    return {
      cam: new THREE.Vector3(s.pos.x + Math.sin(dir) * dist, o.look + dist * (o.pitch ?? 0.1), s.pos.z + Math.cos(dir) * dist),
      target: new THREE.Vector3(s.pos.x, o.look, s.pos.z), ox: o.ox || 0, oy: o.oy || 0, k: 1, live: [s.id], auto: o.auto,
    };
  }
  function shotFor(route) {
    const narrow = W < 900;
    if (route === 'home') return stationShot('robot', narrow
      ? { fitH: 7, fitW: 9.2, look: 1.9, oy: 0.13, auto: 0.16 }
      : { fitH: 7.2, fitW: 15.5, look: 1.9, ox: 0.2, oy: -0.02, auto: 0.16 });
    if (route === 'work') return stationShot(PROJECTS[sel], narrow
      ? { fitH: 7, fitW: 8.4, look: 1.9, oy: 0.07, auto: 0.3 }
      : { fitH: 8.4, fitW: 12, look: 1.9, ox: 0.13, oy: 0.04, auto: 0.3 });
    if (isProject(route)) return stationShot(route.slice(5), narrow
      ? { fitH: 22, fitW: 8.6, look: 1.9, oy: 0.3, auto: 0.22 }
      : { fitH: 8.2, fitW: 15.8, look: 1.9, ox: -0.265, auto: 0.22 });
    if (route === 'about') {
      const d = distFor(narrow ? 84 : 27, narrow ? 25 : 54);
      return { cam: new THREE.Vector3(0, d * 0.62, d * 0.8), target: new THREE.Vector3(0, 0.5, 0), ox: narrow ? 0 : 0.245, oy: narrow ? 0.33 : 0.02, k: 0.5, live: PROJECTS, auto: 0.25 };
    }
    return { cam: new THREE.Vector3(0, 8, 0), target: new THREE.Vector3(0, 90, -14), ox: 0, oy: 0, k: 1, live: [], auto: 0 };
  }

  const cyl = (v) => ({ r: Math.hypot(v.x, v.z), a: Math.atan2(v.x, v.z), y: v.y });
  function mixCyl(A, B, k, out) {
    const a = cyl(A), b = cyl(B);
    if (a.r < 1) a.a = b.a; if (b.r < 1) b.a = a.a;
    let da = b.a - a.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    const ang = a.a + da * k, r = a.r + (b.r - a.r) * k;
    out.set(Math.sin(ang) * r, a.y + (b.y - a.y) * k, Math.cos(ang) * r);
  }
  function fly(shot, ms) {
    auto = shot.auto ?? auto;
    for (const id of shot.live) live.add(id);
    nextLive = new Set(shot.live);
    if (reduce || ms <= 0) {
      view.cam.copy(shot.cam); view.target.copy(shot.target); view.ox = shot.ox; view.oy = shot.oy; view.k = shot.k;
      live = nextLive; nextLive = null; tween = null; dirty = true; return;
    }
    tween = { A: { cam: view.cam.clone(), target: view.target.clone(), ox: view.ox, oy: view.oy, k: view.k }, B: shot, t0: performance.now(), ms };
  }
  function nudge(d) { for (const s of stations) if (live.has(s.id)) { s.angle += d; s.vel = Math.max(-6, Math.min(6, d * 30)); } dirty = true; }

  let last = performance.now() / 1000;
  function frame(nowMs) {
    requestAnimationFrame(frame);
    const t = nowMs / 1000, dt = Math.min(0.05, t - last); last = t;
    if (document.hidden) return;
    if (tween) {
      const k = Math.min(1, (nowMs - tween.t0) / tween.ms), e = easeIO(k);
      mixCyl(tween.A.cam, tween.B.cam, e, view.cam); mixCyl(tween.A.target, tween.B.target, e, view.target);
      view.ox = tween.A.ox + (tween.B.ox - tween.A.ox) * e; view.oy = tween.A.oy + (tween.B.oy - tween.A.oy) * e; view.k = tween.A.k + (tween.B.k - tween.A.k) * e;
      if (k >= 1) { tween = null; live = nextLive || live; nextLive = null; }
      dirty = true;
    }
    if (!live.size && !dirty) return;
    for (const s of stations) {
      s.visibleNow = live.has(s.id); s.root.visible = s.visibleNow; s.root.position.set(s.pos.x * view.k, 0, s.pos.z * view.k);
      if (!s.visibleNow) continue;
      if (!reduce) { s.angle += (auto + s.vel) * dt; s.vel *= Math.pow(0.04, dt); s.model.update(t); } else s.model.update(3.2);
      s.spin.rotation.y = s.angle;
    }
    camera.position.copy(view.cam); camera.lookAt(view.target);
    camera.setViewOffset(W, H, -view.ox * W, view.oy * H, W, H);
    renderer.render(scene, camera); dirty = false;
  }
  resize(); addEventListener('resize', () => { resize(); if (current) fly(shotFor(current), 0); });
  for (const s of stations) s.model.update(0);
  requestAnimationFrame(frame);
  return { fly, shotFor, nudge, intro() { const s = shotFor('home'); view.cam.copy(s.cam).multiplyScalar(1.5).setY(s.cam.y + 9); view.target.copy(s.target); view.ox = s.ox; view.oy = s.oy; } };
}

let gl = null;
try { gl = createScene(); html.classList.add('gl'); } catch (err) { html.classList.add('no-gl'); }

/* ---------- 3D page transitions ---------- */
const EASE = 'cubic-bezier(.76,0,.18,1)', MS = reduce ? 180 : 1050;
function kindOf(from, to) {
  const fp = isProject(from), tp = isProject(to);
  if (fp && tp) return ['cubeX', PROJECTS.indexOf(to.slice(5)) > PROJECTS.indexOf(from.slice(5)) ? 1 : -1];
  if (tp) return ['dive', 1];
  if (fp && to === 'work') return ['dive', -1];
  return ['cubeY', TOP.indexOf(to) >= TOP.indexOf(fp ? 'work' : from) ? 1 : -1];
}
function keyframes(kind, dir) {
  if (reduce) return { origin: '50% 50%', out: [{ opacity: 1 }, { opacity: 0 }], inn: [{ opacity: 0 }, { opacity: 1 }] };
  if (kind === 'cubeY') return { origin: '50% 50% -50vw', out: [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${-90 * dir}deg)` }], inn: [{ transform: `rotateY(${90 * dir}deg)` }, { transform: 'rotateY(0deg)' }] };
  if (kind === 'cubeX') return { origin: '50% 50% -50vh', out: [{ transform: 'rotateX(0deg)' }, { transform: `rotateX(${90 * dir}deg)` }], inn: [{ transform: `rotateX(${-90 * dir}deg)` }, { transform: 'rotateX(0deg)' }] };
  const near = { transform: 'translateZ(1000px)', opacity: 0 }, here = { transform: 'translateZ(0px) rotateX(0deg)', opacity: 1 }, far = { transform: 'translateZ(-1700px) rotateX(22deg)', opacity: 0 };
  return dir > 0
    ? { origin: '50% 50%', out: [here, near], inn: [far, { opacity: 1, offset: 0.45 }, here] }
    : { origin: '50% 50%', out: [here, { opacity: 1, offset: 0.55 }, far], inn: [near, here] };
}
function turn(from, to) {
  const [kind, dir] = kindOf(from, to), k = keyframes(kind, dir), opt = { duration: MS, easing: EASE, fill: 'both' };
  const anims = [];
  for (const el of [underEl(from), pageEl(from)]) { el.style.transformOrigin = k.origin; anims.push(el.animate(k.out, opt)); }
  for (const el of [underEl(to), pageEl(to)]) { el.style.transformOrigin = k.origin; anims.push(el.animate(k.inn, opt)); }
  if (!reduce && kind !== 'dive') for (const box of [under, $('#pages')]) {
    anims.push(box.animate([{ transform: 'scale(1)' }, { transform: 'scale(.8)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: MS, easing: 'ease-in-out' }));
  }
  return Promise.all(anims.map((a) => a.finished)).then(() => anims.forEach((a) => a.cancel()));
}
function show(route, on) { for (const el of [underEl(route), pageEl(route)]) el.classList.toggle('on', on); }

function paint(route) {
  const page = pageEl(route);
  html.dataset.theme = page.dataset.theme; html.dataset.route = isProject(route) ? 'project' : route;
  for (const a of $$('.nav a[data-nav]')) {
    const hit = a.dataset.nav === route || (a.dataset.nav === 'work' && isProject(route));
    if (hit) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  document.title = (route === 'home' ? '' : (page.dataset.title || page.dataset.name) + ' | ') + 'Taisiia Mamenko, Engineering Science';
  const vid = $('#robotVid');
  if (vid) { if (route === 'work/robot' && !reduce) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); } else vid.pause(); }
}

async function go(to, first) {
  if (busy) { pending = to; return; }
  const from = current;
  if (to === from) return;
  busy = true;
  if (isProject(to)) select(PROJECTS.indexOf(to.slice(5)), true);
  current = to; paint(to);
  const page = pageEl(to); const sc = $('.scroll', page); if (sc) sc.scrollTop = 0; page.scrollTop = 0;
  show(to, true);
  if (gl) gl.fly(gl.shotFor(to), first ? (reduce ? 0 : 1700) : MS + 80);
  if (from) { await turn(from, to); show(from, false); const h = $('h1', page); if (h) h.focus({ preventScroll: true }); }
  busy = false;
  if (pending && pending !== current) { const p = pending; pending = null; go(p); } else pending = null;
}

/* ---------- the work page: one project on the turntable at a time ---------- */
const wName = $('#w-name'), wKind = $('#w-kind'), wLine = $('#w-line'), wOpen = $('#w-open'), wCount = $('#w-count');
function select(i, quiet) {
  const n = PROJECTS.length, next = ((i % n) + n) % n, dir = next === sel ? 0 : ((next - sel + n) % n <= n / 2 ? 1 : -1);
  sel = next; const p = info[sel];
  wName.textContent = p.name; wKind.textContent = p.kind; wLine.textContent = p.line;
  wOpen.href = '#/work/' + p.id; wOpen.textContent = 'Open ' + p.name; wCount.textContent = sel + 1 + ' of ' + n;
  const big = $('.bigwork'); big.textContent = p.big; big.style.setProperty('--n', p.big.length);
  $$('#w-tabs button').forEach((b, k) => { if (k === sel) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  if (quiet || current !== 'work') return;
  if (gl) gl.fly(gl.shotFor('work'), 950);
  if (!reduce && dir) {
    const o = { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' };
    $('#w-text').animate([{ transform: `rotateX(${-80 * dir}deg) translateY(${30 * dir}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], o);
    big.animate([{ transform: `translateX(${18 * dir}%) rotateY(${-50 * dir}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}
const tabs = $('#w-tabs');
info.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = p.name; b.addEventListener('click', () => select(i)); tabs.appendChild(b); });
$('#w-prev').addEventListener('click', () => select(sel - 1));
$('#w-next').addEventListener('click', () => select(sel + 1));
addEventListener('keydown', (e) => {
  if (current !== 'work' || busy || e.target.closest('input,textarea')) return;
  if (e.key === 'ArrowRight') select(sel + 1); else if (e.key === 'ArrowLeft') select(sel - 1);
});
let wheelAt = 0;
$('#work').addEventListener('wheel', (e) => {
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, now = performance.now();
  if (Math.abs(d) < 24 || now - wheelAt < 750 || busy) return;
  wheelAt = now; select(sel + (d > 0 ? 1 : -1));
}, { passive: true });

/* ---------- drag to turn the models ---------- */
let drag = null;
addEventListener('pointerdown', (e) => {
  if (!gl || !e.target.closest('[data-stage]') || e.target.closest('a,button,video,.sheet,.col')) return;
  drag = { x: e.clientX }; html.classList.add('dragging');
});
addEventListener('pointermove', (e) => { if (!drag) return; gl.nudge((e.clientX - drag.x) * 0.009); drag.x = e.clientX; });
for (const type of ['pointerup', 'pointercancel', 'blur']) addEventListener(type, () => { drag = null; html.classList.remove('dragging'); });

/* ---------- small things ---------- */
const copy = $('#copyEmail'), status = $('#copyStatus');
if (copy) copy.addEventListener('click', () => {
  const fallback = () => { status.textContent = 'Could not copy. The address is tma133@sfu.ca.'; };
  try { navigator.clipboard.writeText('tma133@sfu.ca').then(() => { status.textContent = 'Email copied.'; }, fallback); } catch (err) { fallback(); }
});

select(0, true);
addEventListener('hashchange', () => go(parse()));
const start = parse();
for (const page of $$('[data-page]')) { page.classList.remove('on'); }
if (gl && start === 'home' && !reduce) gl.intro();
go(start, true);
html.classList.add('ready');
