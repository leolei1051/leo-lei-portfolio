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

function makeTable() {
  const g = new THREE.Group();
  const W = TABLE.width, L = TABLE.length, H = TABLE.height;

  // Surface: blue-green matte with white border + center line.
  // Canvas u runs along X (width), v along Z (length), so the vertical
  // w/2 line is the centre line running along the length, perpendicular to the net.
  const topTex = canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#0e6e63";
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
    new THREE.BoxGeometry(W, 0.06, L),
    new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.65, metalness: 0.02 })
  );
  top.position.y = H;
  top.receiveShadow = true;
  top.castShadow = true;
  g.add(top);

  // Wide dark solid base (replaces thin legs); sits on the floor.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.12, H - 0.02, L - 0.12),
    new THREE.MeshStandardMaterial({ color: 0x16181a, roughness: 0.7, metalness: 0.05 })
  );
  base.position.y = (H - 0.02) / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // Skirt for a thicker tabletop edge.
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.02, 0.10, L - 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0c0e0f, roughness: 0.7 })
  );
  skirt.position.y = H - 0.08;
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  g.add(skirt);

  // Net (dark grid, spans width X) at Z = 0, with a light top band.
  const netTex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#2a2d30";
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = "#c9cdd0";
    ctx.fillRect(0, 0, w, 4);
  });
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.16, TABLE.netHeight),
    new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 })
  );
  net.position.y = H + TABLE.netHeight / 2;
  net.receiveShadow = true;
  g.add(net);

  // Solid net posts.
  const postGeo = new THREE.CylinderGeometry(0.022, 0.028, TABLE.netTop + 0.06, 12);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.4, roughness: 0.5 });
  for (const px of [-(W / 2 + 0.09), (W / 2 + 0.09)]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, (TABLE.netTop + 0.06) / 2, 0);
    post.castShadow = true;
    g.add(post);
  }

  return g;
}

function makeFloor() {
  // Red sport flooring.
  const tex = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#7c1a20";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8a2530";
    ctx.lineWidth = 6;
    for (let i = 0; i <= 8; i++) {
      const p = (i / 8) * w;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke();
    }
    ctx.strokeStyle = "#a83540";
    ctx.lineWidth = 14;
    ctx.strokeRect(w * 0.1, h * 0.12, w * 0.8, h * 0.76);
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

  // Lights
  scene.add(new THREE.HemisphereLight(0xcdd6e6, 0x2a0d10, 0.55));

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

  const rim = new THREE.DirectionalLight(0x9fd7ff, 0.7);
  rim.position.set(-4, 4, -5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffdcc0, 0.4);
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
