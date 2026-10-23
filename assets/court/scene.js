// Leo's Court — WebGL scene: renderer, camera, lights, floor, walls,
// table, net, ball. All geometry is procedural (no external assets).

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

function makeTable() {
  const g = new THREE.Group();
  const L = TABLE.length, W = TABLE.width, H = TABLE.height;

  // Surface with painted white border + center line.
  const topTex = canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#0d2b45";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w / 2, h - 20);
    ctx.stroke();
  });
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(L, 0.03, W),
    new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.5, metalness: 0.05 })
  );
  top.position.y = H;
  top.receiveShadow = true;
  top.castShadow = true;
  g.add(top);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.06, H, 0.06);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  for (const [x, z] of [[L / 2 - 0.12, W / 2 - 0.12], [-L / 2 + 0.12, W / 2 - 0.12], [L / 2 - 0.12, -W / 2 + 0.12], [-L / 2 + 0.12, -W / 2 + 0.12]]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, H / 2, z);
    leg.castShadow = true;
    g.add(leg);
  }

  // Net (transparent grid) at X = 0.
  const netTex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  });
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.16, TABLE.netHeight),
    new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 })
  );
  net.rotation.y = Math.PI / 2; // span the table width (Z) at X = 0
  net.position.y = H + TABLE.netHeight / 2;
  net.receiveShadow = true;
  g.add(net);

  return g;
}

function makeFloor() {
  const tex = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#0a0f0c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#132018";
    ctx.lineWidth = 6;
    for (let i = 0; i <= 8; i++) {
      const p = (i / 8) * w;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke();
    }
    // court boundary
    ctx.strokeStyle = "#1d3528";
    ctx.lineWidth = 14;
    ctx.strokeRect(w * 0.1, h * 0.12, w * 0.8, h * 0.76);
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 9),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
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
  scene.background = new THREE.Color(0x060807);
  scene.fog = new THREE.Fog(0x060807, 9, 26);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 2.7, 5.6);
  camera.lookAt(0, 0.95, 0);

  // Lights
  scene.add(new THREE.HemisphereLight(0xd8e6ff, 0x0a0f0c, 0.75));

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0002;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x9fd7ff, 0.7);
  rim.position.set(-4, 4, -4);
  scene.add(rim);

  // World
  const world = new THREE.Group();
  world.add(makeFloor(), makeTable());
  scene.add(world);

  // Ball
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x333333, emissiveIntensity: 0.35 })
  );
  ball.castShadow = true;
  scene.add(ball);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Widen the vertical FOV on narrow/portrait screens so both players stay in frame.
    camera.fov = camera.aspect < 0.8 ? 72 : 50;
    camera.updateProjectionMatrix();
  }

  return { renderer, scene, camera, ball, world, resize };
}
