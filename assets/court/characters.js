// Leo's Court — procedural placeholder players (prototype, NOT final art).
//
// Two stylised humanoids built entirely from Three.js primitives: spiky hair,
// face, jersey, limbs and a paddle. Each arm is a two-bone chain solved with
// world-space IK (Object3D.lookAt + analytic elbow) so the paddle can be aimed
// at the exact ball-contact point in the rally timeline.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const UP = new THREE.Vector3(0, 1, 0);

let _gradient = null;
function toonGradient() {
  if (_gradient) return _gradient;
  const data = new Uint8Array([64, 148, 240]);
  _gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  _gradient.minFilter = THREE.NearestFilter;
  _gradient.magFilter = THREE.NearestFilter;
  _gradient.needsUpdate = true;
  return _gradient;
}

function mat(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity || 0,
  });
}

// A bone capsule along +Z, pivot at the origin (extends toward +Z).
function bone(radius, length, color) {
  const geo = new THREE.CapsuleGeometry(radius, length, 4, 10);
  geo.rotateX(Math.PI / 2); // now along Z
  geo.translate(0, 0, length / 2);
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A leg bone capsule along -Y, pivot at the top (extends downward).
function legBone(radius, length, color) {
  const geo = new THREE.CapsuleGeometry(radius, length, 4, 10);
  geo.translate(0, -length / 2, 0);
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildArm(sideZ, jersey, skin) {
  // sideZ: -0.26 (right, striking) or +0.26 (left, support)
  const shoulder = new THREE.Group();
  shoulder.position.set(0, 1.32, sideZ);

  const upper = bone(0.05, 0.45, skin);
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.set(0, 0, 0.45);
  shoulder.add(elbow);

  const forearm = bone(0.04, 0.42, skin);
  elbow.add(forearm);

  const wrist = new THREE.Group();
  wrist.position.set(0, 0, 0.42);
  elbow.add(wrist);

  // Paddle: handle + blade, coloured by player.
  const paddle = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), mat(0x2a2a2a));
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.05;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.014), mat(jersey));
  blade.position.z = 0.13;
  paddle.add(handle, blade);
  wrist.add(paddle);

  return { shoulder, elbow, wrist, paddle, upper, forearm };
}

export function buildCharacter(opts) {
  const { jersey, hair, skin = 0xf0c8a0, accent = 0x111111 } = opts;

  const root = new THREE.Group();

  // ---- Legs (simple crouch stance, capsules point down) ----
  const legs = new THREE.Group();
  const hipY = 0.92;
  for (const s of [-0.12, 0.12]) {
    const hip = new THREE.Group();
    hip.position.set(0, hipY, s);
    const thigh = legBone(0.055, 0.46, accent);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.set(0, -0.46, 0);
    knee.rotation.x = -0.22; // slight knee bend
    hip.add(knee);
    const shin = legBone(0.045, 0.46, accent);
    knee.add(shin);
    const foot = box(0.09, 0.05, 0.22, 0xffffff);
    foot.position.set(0, -0.46, 0.06);
    knee.add(foot);
    legs.add(hip);
  }
  root.add(legs);

  // ---- Torso ----
  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  const chest = box(0.36, 0.46, 0.24, jersey);
  chest.position.y = 0.24;
  torso.add(chest);

  // ---- Head ----
  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), mat(skin));
  head.add(skull);

  // Spiky anime hair: tapered cones arranged in a crown.
  const hairGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), mat(hair));
    cone.position.set(Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1);
    cone.rotation.z = Math.cos(a) * 0.5;
    cone.rotation.x = -Math.sin(a) * 0.5;
    hairGroup.add(cone);
  }
  const topCone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 7), mat(hair));
  topCone.position.y = 0.16;
  hairGroup.add(topCone);
  head.add(hairGroup);

  // Face: eyes + brow for a readable "anime" look.
  for (const sx of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), mat(0xffffff));
    eye.position.set(0.045, 0.02, sx);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), mat(0x111111));
    pupil.position.set(0.052, 0.02, sx);
    head.add(pupil);
  }

  // ---- Arms ----
  const strike = buildArm(-0.26, jersey, skin);
  const support = buildArm(0.26, jersey, skin);
  root.add(strike.shoulder, support.shoulder);

  return {
    root,
    strike,
    support,
    body: { hips, torso, head },
    jersey,
  };
}

// ---------------------------------------------------------------------------
// IK helpers
// ---------------------------------------------------------------------------
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Elbow world position for a two-bone arm (S=shoulder, T=target, a,b = lengths).
function ikElbow(S, T, a, b) {
  const d = clamp(S.distanceTo(T), Math.abs(a - b), a + b);
  const cosTh = (a * a + b * b - d * d) / (2 * a * b);
  const theta = Math.acos(clamp(cosTh, -1, 1));
  const alpha = Math.atan2(b * Math.sin(theta), a + b * Math.cos(theta));
  const dir = new THREE.Vector3().subVectors(T, S).normalize();
  let bend = new THREE.Vector3().crossVectors(dir, UP);
  if (bend.lengthSq() < 1e-6) bend.set(0, 0, 1);
  bend.normalize();
  const upperDir = dir.clone().applyAxisAngle(bend, -alpha);
  return S.clone().addScaledVector(upperDir, a);
}

const _S = new THREE.Vector3();
const _T = new THREE.Vector3();

function aimArm(arm, targetWorld, upperLen, lowerLen) {
  arm.shoulder.getWorldPosition(_S);
  _T.copy(targetWorld);
  const E = ikElbow(_S, _T, upperLen, lowerLen);
  arm.shoulder.lookAt(E);
  arm.elbow.lookAt(_T);
}

// ---------------------------------------------------------------------------
// Per-frame update: aim arms + simple body sway. `pose` has world-space
// paddle targets and small body lean values.
// ---------------------------------------------------------------------------
export function updateCharacter(char, pose, dt) {
  const hasStrike = pose.paddleTarget;
  const hasSupport = pose.supportTarget;

  if (hasStrike) {
    aimArm(char.strike, pose.paddleTarget, 0.45, 0.42);
  } else {
    // rest aim — paddle held forward, slightly down.
    const rest = char.root.localToWorld(new THREE.Vector3(1.15, 1.15, -0.15));
    aimArm(char.strike, rest, 0.45, 0.42);
  }

  if (hasSupport) {
    aimArm(char.support, pose.supportTarget, 0.45, 0.42);
  } else {
    const rest = char.root.localToWorld(new THREE.Vector3(1.05, 1.1, 0.2));
    aimArm(char.support, rest, 0.45, 0.42);
  }

  // Body lean toward the action.
  const targetLeanY = pose.torsoY || 0;
  const targetLeanX = pose.torsoX || 0;
  char.body.torso.rotation.y += (targetLeanY - char.body.torso.rotation.y) * Math.min(1, dt * 8);
  char.body.torso.rotation.x += (targetLeanX - char.body.torso.rotation.x) * Math.min(1, dt * 8);
  // subtle crouch bob
  char.body.hips.position.y = 0.92 + (pose.crouch || 0);
}
