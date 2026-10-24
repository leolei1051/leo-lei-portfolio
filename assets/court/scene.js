// Leo's Court — WebGL scene: renderer, camera, lights, floor, table, net,
// ball. All geometry is procedural (no external assets).
//
// Coordinate convention: X = width, Y = height, Z = length.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { TABLE, BALL_R } from "./rally.js";

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, "rgba(0,0,0,0.45)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeTable() {
  const g = new THREE.Group();
  const W = TABLE.width, L = TABLE.length, H = TABLE.height;

  // Tabletop: blue-green matte with white border + centre line.
  const topTex = canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#0e6e63";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.beginPath();
    ctx.moveTo(w / 2, 16);
    ctx.lineTo(w / 2, h - 16);
    ctx.stroke();
  });
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.05, L),
    new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.62, metalness: 0.02 })
  );
  top.position.y = H;
  top.receiveShadow = true;
  top.castShadow = true;
  g.add(top);

  // Frame: thin dark-metal band under the top edge (small chamfer read).
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.03, 0.05, L + 0.03),
    new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.5, metalness: 0.35 })
  );
  frame.position.y = H - 0.05;
  frame.receiveShadow = true;
  frame.castShadow = true;
  g.add(frame);

  // Competition-style base: two pedestal legs + cross brace, with open space
  // (replaces the previous solid box). Distinct materials for the parts.
  const metal = new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.5, metalness: 0.35 });
  const footMat = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.65, metalness: 0.2 });

  for (const z of [-0.7, 0.7]) {
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.30, H - 0.14, 0.30), metal);
    column.position.set(0, (H - 0.14) / 2, z);
    column.castShadow = true;
    column.receiveShadow = true;
    g.add(column);

    // Feet extend past the tabletop width so the base structure is visible from above.
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.85), footMat);
    foot.position.set(0, 0.04, z);
    foot.castShadow = true;
    foot.receiveShadow = true;
    g.add(foot);
  }

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, L - 0.7), metal);
  brace.position.set(0, 0.30, 0);
  brace.castShadow = true;
  g.add(brace);

  // Soft contact shadow under the base footprint so the table sits on the floor.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.5, L + 0.3),
    new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  g.add(shadow);

  // Net: fine dark grid with a thin white top band, at Z = 0.
  const netTex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#3a4045";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = "#d8dcdf";
    ctx.fillRect(0, 0, w, 2);
  });
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.16, TABLE.netHeight),
    new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.30, side: THREE.DoubleSide, roughness: 0.9 })
  );
  net.position.y = H + TABLE.netHeight / 2;
  net.receiveShadow = true;
  g.add(net);

  // Slim net posts (coordinated with the fine net).
  const postGeo = new THREE.CylinderGeometry(0.013, 0.013, TABLE.netTop + 0.04, 10);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.4, metalness: 0.6 });
  for (const px of [-(W / 2 + 0.10), (W / 2 + 0.10)]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, (TABLE.netTop + 0.04) / 2, 0);
    post.castShadow = true;
    g.add(post);
  }

  return g;
}

function makeFloor() {
  // Muted red sport flooring (desaturated, no loud grid).
  const tex = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#6e4a44";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 12;
    ctx.strokeRect(w * 0.08, h * 0.10, w * 0.84, h * 0.80);
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 15),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050706);
  scene.fog = new THREE.Fog(0x050706, 11, 30);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0.6, 3.5, 5.8);
  camera.lookAt(0, 0.75, 0);

  // Lights — kept neutral so they harmonise with the unlit anime sprites and
  // do not tint the blue jersey, skin or red/gold-dragon art.
  scene.add(new THREE.HemisphereLight(0xe3e7ec, 0x1c1514, 0.6));

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3.5, 6.5, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0002;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xd8dde2, 0.6);
  rim.position.set(-4, 4, -5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xfff1e0, 0.42);
  fill.position.set(0, 2.8, 6.5);
  scene.add(fill);

  // World
  const world = new THREE.Group();
  world.add(makeFloor(), makeTable());
  scene.add(world);

  // Ball (in the world group so any stage transform keeps it consistent).
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x333333, emissiveIntensity: 0.35 })
  );
  ball.castShadow = true;
  world.add(ball);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 50 : 35;
    camera.updateProjectionMatrix();
  }

  return { renderer, scene, camera, ball, world, resize };
}
