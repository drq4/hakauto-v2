/* ==========================================================================
   HAK AUTO — real-time 3D fly-through (free alternative to generated video)
   A stylised model of the Lendelede premises rendered live with Three.js.
   Same route and timing as the video beats (seconds), driven by scroll.
   Units: metres. Building: x -20..20, z -15..0. Showroom x<0, workshop x>0.
   ========================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

/* ---------------- camera route: {t seconds, p position, l look-at} ---------------- */
const KEYS = [
  { t: 0.0, p: [-4.0, 1.7, 26], l: [-10, 1.8, 0] },
  { t: 3.0, p: [-7.5, 1.6, 12], l: [-10, 1.6, 0] },
  { t: 5.0, p: [-9.8, 1.6, 3.0], l: [-10, 1.6, -5] },
  { t: 6.2, p: [-10, 1.6, -1.2], l: [-12, 1.4, -6] },
  { t: 8.5, p: [-10.7, 1.5, -1.9], l: [-14.8, 0.8, -5.4] },
  { t: 10.5, p: [-10.4, 1.4, -7.6], l: [-7.5, 1.0, -11] },
  { t: 12.5, p: [-7.0, 1.4, -9.4], l: [-3, 1.3, -9] },
  { t: 14.0, p: [-5.0, 1.5, -10.4], l: [-2.6, 1.0, -13] },
  { t: 16.0, p: [-2.4, 1.25, -10.0], l: [-3.2, 0.9, -13] },
  { t: 18.0, p: [-1.5, 1.5, -11.0], l: [0, 1.4, -10] },
  { t: 19.2, p: [-1.8, 1.6, -10.0], l: [0, 1.5, -10] },
  { t: 21.0, p: [0.8, 1.6, -10.0], l: [4, 1.5, -10] },
  { t: 22.5, p: [3.5, 1.6, -10.3], l: [7, 1.8, -8.5] },
  { t: 24.5, p: [4.8, 1.6, -12.0], l: [8.5, 1.7, -8] },
  { t: 26.5, p: [8.2, 0.9, -11.4], l: [8.5, 1.6, -7.6] },
  { t: 28.5, p: [10.8, 1.3, -11.0], l: [13.2, 0.8, -13.4] },
  { t: 30.0, p: [12.0, 1.7, -13.0], l: [12, 1.9, -17] },
  { t: 31.0, p: [12.0, 1.9, -14.6], l: [12, 2.0, -20] },
  { t: 33.0, p: [12.0, 2.1, -19.5], l: [12.5, 2.0, -26] },
  { t: 34.0, p: [12.2, 2.3, -22.0], l: [13, 2.3, -30] },
  { t: 35.25, p: [12.6, 2.6, -24.5], l: [20, 2.6, -24.5] },
  { t: 36.5, p: [12.4, 3.0, -26.5], l: [10, 3.0, -15] },
  { t: 39.0, p: [9.0, 14, -38], l: [4, 3, -8] },
  { t: 42.0, p: [4.0, 34, -58], l: [0, 2, -6] }
];

function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
function sampleKeys(t, prop) {
  const k = KEYS;
  if (t <= k[0].t) return k[0][prop];
  if (t >= k[k.length - 1].t) return k[k.length - 1][prop];
  let i = 0;
  while (t > k[i + 1].t) i++;
  const u = (t - k[i].t) / (k[i + 1].t - k[i].t);
  const a = k[Math.max(i - 1, 0)][prop], b = k[i][prop], c = k[i + 1][prop], d = k[Math.min(i + 2, k.length - 1)][prop];
  return [0, 1, 2].map((j) => catmull(a[j], b[j], c[j], d[j], u));
}

/* ---------------- procedural textures ---------------- */
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const noise = (g, w, h, base, amp, n = 4000) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = (Math.random() - 0.5) * amp;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
};

/* ---------------- builders ---------------- */
function box(w, h, d, mat, x, y, z, { cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

function makeCar(color, { van = false } = {}) {
  const g = new THREE.Group();
  const L = van ? 5.0 : 4.4, W = 1.78;
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.15, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0d1014, metalness: 0.3, roughness: 0.06, envMapIntensity: 1.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.9, roughness: 0.25 });

  // lower body: side profile with wheel arches, extruded across the width
  const belt = van ? 1.15 : 1.0;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0.32);
  s.lineTo(-L / 2, 0.78);
  s.quadraticCurveTo(-L / 2 + 0.04, belt - 0.02, -L / 2 + 0.3, belt);
  s.lineTo(L / 2 - 0.9, belt);
  s.quadraticCurveTo(L / 2 - 0.2, belt - 0.08, L / 2, 0.7);
  s.lineTo(L / 2, 0.32);
  s.lineTo(L / 2 - 0.55, 0.32);
  const wf = L / 2 - 0.95, wr = -L / 2 + 0.95;
  s.absarc(wf, 0.34, 0.43, 0, Math.PI, false);
  s.lineTo(wr + 0.43, 0.32);
  s.absarc(wr, 0.34, 0.43, 0, Math.PI, false);
  s.lineTo(-L / 2, 0.32);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: W - 0.16, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 6, curveSegments: 24 });
  bodyGeo.translate(0, 0, -(W - 0.16) / 2);
  const body = new THREE.Mesh(bodyGeo, paint);
  body.castShadow = true;
  g.add(body);

  // greenhouse: tapered glass cabin + roof
  const roof = van ? 2.15 : 1.44;
  const gh = new THREE.Shape();
  if (van) {
    gh.moveTo(-L / 2 + 0.15, belt); gh.lineTo(-L / 2 + 0.2, roof); gh.lineTo(L / 2 - 1.5, roof);
    gh.quadraticCurveTo(L / 2 - 1.0, roof - 0.1, L / 2 - 0.85, belt);
  } else {
    gh.moveTo(-L / 2 + 0.75, belt); gh.quadraticCurveTo(-L / 2 + 1.05, roof - 0.04, -L / 2 + 1.55, roof);
    gh.lineTo(0.45, roof); gh.quadraticCurveTo(0.85, roof - 0.04, 1.3, belt);
  }
  const ghGeo = new THREE.ExtrudeGeometry(gh, { depth: W - 0.42, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 12 });
  ghGeo.translate(0, 0, -(W - 0.42) / 2);
  const cabin = new THREE.Mesh(ghGeo, glass);
  cabin.castShadow = true;
  g.add(cabin);
  const roofLen = van ? L - 1.7 : 1.1;
  const roofPanel = box(roofLen, 0.05, W - 0.34, paint, van ? -0.65 : -0.1, roof + 0.04, 0, { cast: true });
  g.add(roofPanel);

  // wheels
  const tyreGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 28);
  tyreGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.02, 20);
  rimGeo.rotateX(Math.PI / 2);
  for (const x of [wf, wr]) for (const side of [-1, 1]) {
    const t = new THREE.Mesh(tyreGeo, rubber);
    t.position.set(x, 0.36, side * (W / 2 - 0.08));
    t.castShadow = true;
    g.add(t);
    const r = new THREE.Mesh(rimGeo, rim);
    r.position.set(x, 0.36, side * (W / 2 + 0.05));
    g.add(r);
  }
  // lights
  const head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 1.2 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2a2a, emissiveIntensity: 0.9 });
  for (const side of [-1, 1]) {
    g.add(box(0.06, 0.08, 0.36, head, L / 2 + 0.06, 0.72, side * 0.58, { receive: false }));
    g.add(box(0.06, 0.08, 0.32, tail, -L / 2 - 0.06, 0.84, side * 0.6, { receive: false }));
  }
  return g;
}

function makePerson(color) {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9a38a, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.75, 6, 12), suit);
  torso.position.y = 1.1; torso.castShadow = true; g.add(torso);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 4, 8), suit);
    leg.position.set(0, 0.42, s * 0.11); leg.castShadow = true; g.add(leg);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
  head.position.y = 1.72; head.castShadow = true; g.add(head);
  return g;
}

function makeTree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.2 * s, 6), new THREE.MeshStandardMaterial({ color: 0x4a3b2f, roughness: 1 }));
  trunk.position.y = 1.1 * s; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7 * s, 1), new THREE.MeshStandardMaterial({ color: 0x3f5a3a, roughness: 1, flatShading: true }));
  crown.position.y = 3.2 * s; crown.castShadow = true; g.add(crown);
  g.position.set(x, 0, z);
  return g;
}

/* ---------------- scene ---------------- */
export async function createFlightScene(canvas, { logoUrl }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const SKY = 0xc3ccd4;
  scene.fog = new THREE.Fog(SKY, 160, 700);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // sky dome (overcast Belgian sky)
  const skyGeo = new THREE.SphereGeometry(900, 32, 16);
  const cols = [];
  const pos = skyGeo.attributes.position;
  const top = new THREE.Color(0x8fa3b8), hor = new THREE.Color(0xd6dde3);
  for (let i = 0; i < pos.count; i++) {
    const h = Math.max(pos.getY(i) / 900, 0);
    const c = hor.clone().lerp(top, Math.pow(h, 0.6));
    cols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  // lights
  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x4a4d48, 0.55));
  const sun = new THREE.DirectionalLight(0xfff1df, 2.6);
  sun.position.set(-40, 70, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 200 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun);
  for (const [x, z, c] of [[-14, -5, 0xfff2df], [-5, -10, 0xfff2df], [9, -8, 0xeef5ff], [14, -4, 0xeef5ff]]) {
    const pl = new THREE.PointLight(c, 30, 18, 1.4);
    pl.position.set(x, 4.2, z);
    scene.add(pl);
  }

  /* ---- materials ---- */
  const M = {
    pavers: new THREE.MeshStandardMaterial({ roughness: 0.92, map: canvasTex(512, 512, (g, w, h) => {
      noise(g, w, h, "#8a8b88", 0.08);
      g.strokeStyle = "rgba(40,40,40,.35)"; g.lineWidth = 2;
      for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
    }, { repeat: [24, 8] }) }),
    asphalt: new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 256, (g, w, h) => noise(g, w, h, "#4a4c4f", 0.12, 6000), { repeat: [60, 4] }) }),
    grass: new THREE.MeshStandardMaterial({ roughness: 1, map: canvasTex(512, 512, (g, w, h) => {
      noise(g, w, h, "#6d8458", 0.1, 8000);
      for (let x = 0; x < w; x += 64) { g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x, 0, 32, h); }
    }, { repeat: [40, 40] }) }),
    tiles: new THREE.MeshStandardMaterial({ roughness: 0.14, metalness: 0.0, envMapIntensity: 1.2, map: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#eeeeea"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#cfcfca"; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
    }, { repeat: [8.3, 6.25] }) }),
    epoxy: new THREE.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.35, metalness: 0.05 }),
    wallLight: new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.9 }),
    wallShop: new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.85 }),
    cladding: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3, map: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#2a2e34"; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x, 0, 3, h); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 3, 0, 2, h); }
    }, { repeat: [10, 1] }) }),
    fascia: new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.55, metalness: 0.2 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.85, roughness: 0.3 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xaebfcf, metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.8 }),
    led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 }),
    desk: new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.35, metalness: 0.2 }),
    deskTop: new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x3d86ff, roughness: 0.45, metalness: 0.1 }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc23b2f, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.9 }),
    whiteBox: new THREE.MeshStandardMaterial({ color: 0xe4e6e8, roughness: 0.8 }),
    greyBox: new THREE.MeshStandardMaterial({ color: 0xa9adb2, roughness: 0.8 }),
    roofTile: new THREE.MeshStandardMaterial({ color: 0x5b4036, roughness: 0.9 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0b1a33, emissive: 0x3d86ff, emissiveIntensity: 0.9 })
  };

  /* ---- ground ---- */
  const plane = (w, d, mat, x, z, y = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
    scene.add(m); return m;
  };
  plane(1600, 1600, M.grass, 0, 0, -0.02);
  plane(70, 16, M.pavers, -5, 7, 0.0);              // forecourt
  plane(16, 30, M.pavers, -28, -8, 0.0);            // side parking
  plane(30, 16, M.asphalt, 10, -23, 0.0);           // rear yard
  plane(900, 8, M.asphalt, 0, 19, 0.01);                 // Spoelewielenlaan
  M.asphalt.map.repeat.set(4, 4);
  const dash = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  for (let x = -440; x < 440; x += 6) plane(3, 0.15, dash, x, 19, 0.02);
  plane(900, 2.2, new THREE.MeshStandardMaterial({ color: 0x9a9b98, roughness: 0.95 }), 0, 14, 0.015);
  plane(900, 2.2, new THREE.MeshStandardMaterial({ color: 0x9a9b98, roughness: 0.95 }), 0, 24, 0.015);

  /* ---- building ---- */
  const B = new THREE.Group();
  scene.add(B);
  const H = 6.2, FASCIA_Y = 5.0;
  // floors
  const tileFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 15), M.tiles);
  tileFloor.rotation.x = -Math.PI / 2; tileFloor.position.set(-10, 0.02, -7.5); tileFloor.receiveShadow = true; B.add(tileFloor);
  const shopFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 15), M.epoxy);
  shopFloor.rotation.x = -Math.PI / 2; shopFloor.position.set(10, 0.02, -7.5); shopFloor.receiveShadow = true; B.add(shopFloor);
  // roof slab + ceilings
  B.add(box(40.4, 0.4, 15.4, M.fascia, 0, H, -7.5));
  B.add(box(20, 0.1, 15, M.ceiling, -10, 4.7, -7.5));
  B.add(box(20, 0.1, 15, M.wallShop, 10, 5.8, -7.5));
  for (let z = -13.5; z <= -1; z += 2.5) B.add(box(18, 0.04, 0.12, M.led, -10, 4.64, z, { receive: false }));
  for (let z = -13; z <= -2; z += 3.5) B.add(box(18, 0.05, 0.14, M.led, 10, 5.74, z, { receive: false }));
  // showroom bulkhead between ceiling (4.7) and fascia (5.0) on the glazed faces
  B.add(box(20, 0.3, 0.2, M.fascia, -10, 4.85, -0.05));
  B.add(box(0.2, 0.3, 15, M.fascia, -19.95, 4.85, -7.5));

  // glazed curtain wall (front z=0 for x -20..0, side x=-20)
  const glassPane = (w, h, x, y, z, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass);
    m.position.set(x, y, z); m.rotation.y = rotY; m.renderOrder = 2; B.add(m);
  };
  const DOOR_X = -10, DOOR_W = 2.4, DOOR_H = 2.6;
  for (let x = -20; x < 0; x += 2.5) {
    const cx = x + 1.25;
    if (Math.abs(cx - DOOR_X) < 1.3) { glassPane(2.5, 4.7 - DOOR_H, cx, DOOR_H + (4.7 - DOOR_H) / 2, 0); continue; }
    glassPane(2.5, 4.7, cx, 2.35, 0);
  }
  for (let z = -15; z < 0; z += 2.5) glassPane(2.5, 4.7, -20, 2.35, z + 1.25, Math.PI / 2);
  for (let x = -20; x <= 0.01; x += 2.5) B.add(box(0.09, 4.7, 0.12, M.alu, x, 2.35, 0));
  for (let z = -15; z <= 0.01; z += 2.5) B.add(box(0.12, 4.7, 0.09, M.alu, -20, 2.35, z));
  for (const y of [0.05, 3.2, 4.65]) { B.add(box(20, 0.08, 0.12, M.alu, -10, y, 0)); B.add(box(0.12, 0.08, 15, M.alu, -20, y, -7.5)); }
  // open entrance doors (swung inwards)
  const doorFrame = new THREE.Group();
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W / 2 - 0.06, DOOR_H - 0.1), M.glass);
    pane.position.set(s * -(DOOR_W / 4), DOOR_H / 2, 0); pane.renderOrder = 2; leaf.add(pane);
    leaf.add(box(0.06, DOOR_H, 0.06, M.alu, s * -(DOOR_W / 2 - 0.03), DOOR_H / 2, 0));
    leaf.add(box(0.03, 0.4, 0.04, M.alu, s * -(DOOR_W / 2 - 0.15), 1.1, 0.05));
    leaf.position.set(DOOR_X + s * DOOR_W / 2, 0, 0);
    leaf.rotation.y = s * -1.35;
    doorFrame.add(leaf);
  }
  B.add(doorFrame);

  // fascia band with real signage (logo from hakauto.be, drawn on canvas)
  const logoImg = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = logoUrl; });
  const signTex = (w, h, draw) => canvasTex(w, h, (g) => { g.fillStyle = "#1d2127"; g.fillRect(0, 0, w, h); draw(g); });
  const frontSign = signTex(4096, 256, (g) => {
    if (logoImg) g.drawImage(logoImg, 260, 40, 176 * logoImg.width / logoImg.height, 176);
    g.fillStyle = "#f2f2f2"; g.font = "500 54px Jost, 'DM Sans', sans-serif";
    ["← Show room", "← Atelier/garage", "← Receptie"].forEach((t, i) => g.fillText(t, 1350, 78 + i * 62));
    if (logoImg) g.drawImage(logoImg, 2700, 50, 150 * logoImg.width / logoImg.height, 150);
    g.font = "400 34px 'DM Sans', sans-serif"; g.fillStyle = "#c9ced6";
    ["Onderhoud & Reparatie & Diagnose", "Remmen & Bandenservice", "Aircoservice & Polijsten"].forEach((t, i) => g.fillText(t, 3280, 90 + i * 48));
  });
  frontSign.repeat.set(1, 1);
  const fasciaFront = new THREE.Mesh(new THREE.BoxGeometry(40.4, 1.2, 0.3), [M.fascia, M.fascia, M.fascia, M.fascia, new THREE.MeshStandardMaterial({ map: frontSign, roughness: 0.5, metalness: 0.15 }), M.fascia]);
  fasciaFront.position.set(0, FASCIA_Y + 0.6, 0.05); B.add(fasciaFront);
  const sideSign = signTex(2048, 160, (g) => { if (logoImg) g.drawImage(logoImg, 760, 18, 124 * logoImg.width / logoImg.height, 124); });
  const fasciaSide = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 15.4), [M.fascia, new THREE.MeshStandardMaterial({ map: sideSign, roughness: 0.5 }), M.fascia, M.fascia, M.fascia, M.fascia]);
  fasciaSide.position.set(-20.05, FASCIA_Y + 0.6, -7.5); B.add(fasciaSide);
  const backSign = signTex(4096, 256, (g) => { if (logoImg) g.drawImage(logoImg, 2900, 40, 176 * logoImg.width / logoImg.height, 176); });
  const fasciaBack = new THREE.Mesh(new THREE.BoxGeometry(40.4, 1.2, 0.3), [M.fascia, M.fascia, M.fascia, M.fascia, M.fascia, new THREE.MeshStandardMaterial({ map: backSign, roughness: 0.5 })]);
  fasciaBack.position.set(0, FASCIA_Y + 0.6, -15.05); B.add(fasciaBack);

  // workshop shell: front, right and back walls in cladding (rear roller-door opening at x=12)
  B.add(box(20, 5.0, 0.25, M.cladding, 10, 2.5, 0));
  B.add(box(0.25, 6.0, 15, M.cladding, 20, 3.0, -7.5));
  const RD_X = 12, RD_W = 4.6, RD_H = 4.3;
  B.add(box(RD_X - RD_W / 2, 6.0, 0.25, M.cladding, (RD_X - RD_W / 2) / 2, 3.0, -15));
  B.add(box(20 - (RD_X + RD_W / 2), 6.0, 0.25, M.cladding, (20 + RD_X + RD_W / 2) / 2, 3.0, -15));
  B.add(box(RD_W, 6.0 - RD_H, 0.25, M.cladding, RD_X, RD_H + (6.0 - RD_H) / 2, -15));
  B.add(box(RD_W + 0.3, 0.5, 0.5, M.steel, RD_X, RD_H + 0.25, -14.75));       // rolled-up door drum
  B.add(box(20, 6.0, 0.25, M.cladding, -10, 3.0, -15.2));                         // showroom back (exterior)
  // front workshop roller door (closed, cosmetic)
  B.add(box(4.4, 4.0, 0.08, M.steel, 10, 2.0, 0.14));

  // interior: showroom back wall + partition with workshop door
  B.add(box(20, 4.7, 0.2, M.wallLight, -10, 2.35, -14.9));
  const PD_Z = -10, PD_W = 1.8, PD_H = 2.5;
  B.add(box(0.2, 5.8, (15 + PD_Z) - PD_W / 2, M.wallLight, 0, 2.9, (-15 + PD_Z - PD_W / 2) / 2 - 0.0));
  B.add(box(0.2, 5.8, -PD_Z - PD_W / 2, M.wallLight, 0, 2.9, (PD_Z + PD_W / 2) / 2));
  B.add(box(0.2, 5.8 - PD_H, PD_W, M.wallLight, 0, PD_H + (5.8 - PD_H) / 2, PD_Z));
  const shopDoor = new THREE.Group();
  const leafMesh = box(0.06, PD_H, PD_W - 0.04, new THREE.MeshStandardMaterial({ color: 0x6d737b, roughness: 0.5, metalness: 0.4 }), 0, PD_H / 2, PD_W / 2 - 0.02);
  shopDoor.add(leafMesh);
  shopDoor.add(box(0.12, 0.5, 0.35, new THREE.MeshPhysicalMaterial({ color: 0x9fb2c4, transparent: true, opacity: 0.4 }), 0, 1.75, PD_W / 2));
  shopDoor.position.set(0.05, 0, PD_Z - PD_W / 2);
  B.add(shopDoor);

  // reception desk
  B.add(box(3.4, 1.05, 0.8, M.desk, -3.4, 0.53, -13.2, { cast: true }));
  B.add(box(3.6, 0.06, 1.0, M.deskTop, -3.4, 1.08, -13.15, { cast: true }));
  B.add(box(0.55, 0.35, 0.04, M.screen, -3.0, 1.32, -13.45, { receive: false }));
  B.add(box(0.3, 0.02, 0.22, M.deskTop, -4.2, 1.12, -13.1));
  for (const x of [-4.4, -2.4]) {
    const pend = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.25, 20), new THREE.MeshStandardMaterial({ color: 0x1b1f26, emissive: 0xffc98a, emissiveIntensity: 0.6 }));
    pend.position.set(x, 3.0, -13.1); B.add(pend);
    B.add(box(0.01, 1.6, 0.01, M.steel, x, 3.9, -13.1));
  }

  // showroom cars (unbadged)
  const place = (obj, x, z, rot = 0) => { obj.position.set(x, 0.02, z); obj.rotation.y = rot; scene.add(obj); return obj; };
  place(makeCar(0x3d86ff), -14.5, -5.2, 0);                 // signal-blue hero car (side seen at 8.5 s)
  place(makeCar(0x2a2e35), -6.6, -6.0, 0.5);
  place(makeCar(0xf1f1ef), -14.2, -10.0, -0.25);
  place(makeCar(0xc9ced6), -16.5, -1.8, 0.15);
  place(makeCar(0x1b1f26), -4.5, -2.2, -0.7);

  // workshop: two-post lift with raised car + technician
  for (const x of [11.1, 5.9]) for (const z of [-6.7, -9.3]) {
    B.add(box(0.35, 3.6, 0.35, M.graphite, x, 1.8, z, { cast: true }));
    B.add(box(0.37, 0.5, 0.37, M.blue, x, 0.9, z));          // brand accent band
  }
  for (const x of [5.9, 11.1]) B.add(box(0.2, 0.12, 2.9, M.steel, x, 1.82, -8.0));
  place(makeCar(0x5d6670), 8.5, -8.0, 0).position.y = 1.9;
  const tech = makePerson(0x2a2e35); tech.position.set(8.9, 0.02, -8.3); tech.rotation.y = 0.6; scene.add(tech);
  // diagnostic trolley, airco station, tyre machine + stacks
  B.add(box(0.7, 0.9, 0.5, M.graphite, 13.4, 0.47, -13.6, { cast: true }));
  B.add(box(0.6, 0.42, 0.04, M.screen, 13.4, 1.25, -13.4, { receive: false }));
  B.add(box(0.75, 1.3, 0.65, new THREE.MeshStandardMaterial({ color: 0xe8e8e6, roughness: 0.5 }), 15.0, 0.67, -13.7, { cast: true }));
  B.add(box(0.5, 0.25, 0.05, M.blue, 15.0, 1.1, -13.36));
  B.add(box(0.9, 1.0, 0.9, M.graphite, 17.4, 0.52, -12.8, { cast: true }));
  const tyreGeo = new THREE.TorusGeometry(0.31, 0.12, 10, 24);
  for (let k = 0; k < 4; k++) for (let s = 0; s < 5; s++) {
    const t = new THREE.Mesh(tyreGeo, M.rubber);
    t.rotation.x = Math.PI / 2; t.position.set(18.2 - k * 0.8, 0.13 + s * 0.24, -3.2); t.castShadow = true; scene.add(t);
  }
  B.add(box(0.12, 2.2, 6, new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.6 }), 19.8, 1.6, -8));   // tool wall
  // mechanic who opens the workshop door
  const mechanic = makePerson(0x2a2e35); mechanic.position.set(1.0, 0.02, -8.6); mechanic.rotation.y = Math.PI; scene.add(mechanic);

  // rear yard: vans, cars, fence
  place(makeCar(0xf3f3f1, { van: true }), 16.5, -21, Math.PI / 2);
  place(makeCar(0xf3f3f1, { van: true }), 19.5, -21, Math.PI / 2);
  place(makeCar(0x6a7079), 6.0, -24, -0.2);
  place(makeCar(0x2d3b52), 3.0, -20, 0.1);
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x3d4a3f, roughness: 0.7, transparent: true, opacity: 0.55 });
  B.add(box(30, 2.0, 0.04, fenceMat, 10, 1.0, -31));
  B.add(box(0.04, 2.0, 16, fenceMat, 25, 1.0, -23));
  for (let x = -5; x <= 25; x += 2.5) B.add(box(0.07, 2.1, 0.07, M.steel, x, 1.05, -31));

  // forecourt and side parking: parked cars
  place(makeCar(0xf4f4f2), -3.5, 9.5, Math.PI / 2 + 0.05);     // the white hatchback passed at the start
  [[-25, -2, 0x9aa1aa], [-25, -6, 0x2a2f36], [-31, -10, 0x6b2f2a], [-25, -14, 0xd9d9d6], [-31, -2, 0x40546e]].forEach(([x, z, c]) => place(makeCar(c), x, z, Math.PI / 2));
  [[6, 9, 0x2f3540], [9, 9, 0xe2e2df], [-17, 9, 0x5b6470]].forEach(([x, z, c]) => place(makeCar(c), x, z, Math.PI / 2));

  // neighbours: business-park warehouses, houses across the road, trees, fields
  [[-62, -12, 34, 9, 26, M.whiteBox], [52, -10, 28, 8, 30, M.greyBox], [8, -58, 46, 10, 20, M.whiteBox], [-40, -55, 24, 7, 18, M.greyBox], [70, -55, 30, 9, 22, M.whiteBox]].forEach(([x, z, w, h, d, m]) => scene.add(box(w, h, d, m, x, h / 2, z, { cast: true })));
  const houseRoof = new THREE.CylinderGeometry(0, 1, 1, 4, 1);
  for (let x = -70; x <= 70; x += 13) {
    const hx = x + (Math.random() - 0.5) * 3;
    scene.add(box(8, 5.5, 7, new THREE.MeshStandardMaterial({ color: [0xb46b52, 0xd8d2c6, 0x8e5a48][Math.abs(Math.round(x / 13)) % 3], roughness: 0.9 }), hx, 2.75, 36, { cast: true }));
    const r = new THREE.Mesh(houseRoof, M.roofTile);
    r.scale.set(6.2, 3, 5.6); r.rotation.y = Math.PI / 4; r.position.set(hx, 7.0, 36); r.castShadow = true; scene.add(r);
  }
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    scene.add(makeTree(-120 + i * 3.5 + Math.random() * 2, side > 0 ? 28 + Math.random() * 2 : -38 - Math.random() * 3, 0.8 + Math.random() * 0.5));
  }
  for (let i = 0; i < 30; i++) scene.add(makeTree(-120 + Math.random() * 240, -90 - Math.random() * 60, 1 + Math.random() * 0.6));

  // traffic on the road (only noticeable in the aerial reveal)
  const traffic = [0xffffff, 0x2a3140, 0x8b939c, 0x1f4b8f, 0xb0322a].map((c, i) => {
    const car = makeCar(c);
    car.userData = { lane: i % 2 ? 17.2 : 20.8, dir: i % 2 ? 1 : -1, offset: i * 47 };
    car.rotation.y = i % 2 ? 0 : Math.PI;
    scene.add(car);
    return car;
  });

  /* ---- camera + render ---- */
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.05, 2000);
  const look = new THREE.Vector3();
  let width = 1, height = 1;

  function resize(w, h, dpr) {
    width = w; height = h;
    renderer.setPixelRatio(Math.min(dpr, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep horizontal coverage on tall phones
    camera.fov = w / h < 1 ? 74 : 52;
    camera.updateProjectionMatrix();
  }

  function render(time) {
    const p = sampleKeys(time, "p"), l = sampleKeys(time, "l");
    camera.position.set(p[0], p[1], p[2]);
    look.set(l[0], l[1], l[2]);
    camera.lookAt(look);
    // gentle banking from lateral curvature
    const p2 = sampleKeys(time + 0.25, "p");
    const dx = p2[0] - p[0], dz = p2[2] - p[2];
    const fwd = new THREE.Vector3(l[0] - p[0], 0, l[2] - p[2]).normalize();
    const lateral = fwd.x * dz - fwd.z * dx;
    camera.rotateZ(THREE.MathUtils.clamp(-lateral * 0.06, -0.08, 0.08));

    // workshop door opens 19.2–20.4 s; mechanic steps aside
    const o = THREE.MathUtils.smoothstep(time, 19.0, 20.4);
    shopDoor.rotation.y = o * 1.6;
    mechanic.position.set(1.0 + o * 0.5, 0.02, -8.6 + o * 0.4);

    traffic.forEach((c) => {
      const { lane, dir, offset } = c.userData;
      c.visible = time > 30;
      c.position.set(((time * 11 + offset) % 240 - 120) * dir, 0.02, lane);
    });
    renderer.render(scene, camera);
  }

  return { render, resize, renderer };
}
