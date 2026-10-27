// Leo's Court — 3D skeletal character loader.
//
// Loads a GLB/GLTF character (skinned mesh + bones + animation clips) via the
// official THREE GLTFLoader, sets up an AnimationMixer, attaches a paddle to a
// named hand bone, and exposes the paddle's world position for contact checks.
//
// This is the "structure implemented" tier. It never throws: on any load or
// parse failure it returns null so the caller can fall back to the 2.5D sprite
// cover. It is NOT a claim that a model is wired or that motion is verified.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const DEFAULT_HAND_BONE = "mixamorigRightHand";

// Procedural placeholder paddle (no paddle model asset yet).
export function buildPaddleMesh(color = 0xff3b3b) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 })
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.05;
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.15, 0.014),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
  blade.position.z = 0.13;
  g.add(handle, blade);
  return g;
}

export async function loadModelCharacter({
  url,
  handBoneName = DEFAULT_HAND_BONE,
  clipMap = {},
  paddle = null,
  paddleOffset = { position: [0, 0, 0.06], rotation: [0, 0, 0] },
  targetHeight = 1.45,
  onWarn = console.warn,
} = {}) {
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(url);
  } catch (e) {
    onWarn("[court] model load failed:", url, e && e.message ? e.message : e);
    return null;
  }

  const root = gltf.scene || gltf.scenes[0];

  // Normalise scale to a target height so the character sits naturally on court.
  const box = new THREE.Box3().setFromObject(root);
  const h = box.max.y - box.min.y;
  if (h > 0.001) root.scale.setScalar(targetHeight / h);

  // Resolve the hand bone (named, or scanned from skinned-mesh skeletons).
  let handBone = root.getObjectByName(handBoneName) || null;
  if (!handBone) {
    root.traverse((o) => {
      if (handBone) return;
      if (o.isSkinnedMesh && o.skeleton) {
        for (const b of o.skeleton.bones) {
          if (b.name === handBoneName) { handBone = b; break; }
        }
      }
    });
  }
  if (!handBone) onWarn("[court] hand bone not found:", handBoneName);

  // Attach the paddle to the hand bone so it follows the skeletal animation.
  if (handBone && paddle) {
    paddle.position.set(paddleOffset.position[0], paddleOffset.position[1], paddleOffset.position[2]);
    paddle.rotation.set(paddleOffset.rotation[0], paddleOffset.rotation[1], paddleOffset.rotation[2]);
    handBone.add(paddle);
  }

  // AnimationMixer + actions keyed by clip name.
  const mixer = new THREE.AnimationMixer(root);
  const clips = {};
  const actions = {};
  for (const clip of gltf.animations || []) {
    clips[clip.name] = clip;
    actions[clip.name] = mixer.clipAction(clip);
  }

  function resolveClip(name) { return clipMap[name] || name; }

  function play(name, { loop = true, fadeIn = 0.15 } = {}) {
    const cn = resolveClip(name);
    const action = actions[cn];
    if (!action) { onWarn("[court] clip not found:", cn); return null; }
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    action.clampWhenFinished = !loop;
    action.fadeIn(fadeIn);
    action.play();
    return action;
  }

  function stop(name) {
    const action = actions[resolveClip(name)];
    if (action) action.fadeOut(0.15);
  }

  function crossfade(from, to, dur = 0.2) {
    const fa = actions[resolveClip(from)];
    const ta = actions[resolveClip(to)];
    if (!fa || !ta) return;
    if (!ta.isRunning()) { ta.reset(); ta.setLoop(THREE.LoopRepeat); ta.play(); }
    fa.crossFadeTo(ta, dur, true);
  }

  function update(dt) { mixer.update(dt); }

  function getPaddleWorldPosition(out = new THREE.Vector3()) {
    if (!handBone || !paddle) return null;
    root.updateMatrixWorld(true);
    return paddle.getWorldPosition(out);
  }

  function dispose() { mixer.stopAllAction(); }

  return {
    root, mixer, actions, clips, handBone, paddle,
    play, crossfade, stop, update, getPaddleWorldPosition, dispose,
  };
}
