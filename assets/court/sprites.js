// Leo's Court — 2.5D character billboards.
//
// The current assets are two transparent full-body anime illustrations (PNG),
// not 3D models or skeletal animations. This module turns them into fixed,
// upright planes standing in the 3D court. It is a preview stand-in, NOT a
// finished 3D character; the procedural humanoid + rally code in characters.js
// and rally.js is kept for a future 3D-model / skeletal swap.
//
// Facing note: the sprites are rendered exactly as provided (single-sided,
// front toward the camera, no mirroring). The drawn facing of the art has NOT
// been visually verified, so a correct back/side view for the near player is a
// pending resource. The near-end diagonal camera and its movement limits are
// kept unchanged.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed: " + url));
    img.src = url;
  });
}

function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, "rgba(0,0,0,0.42)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Loads a full-body transparent sprite as a fixed upright plane with a soft
// ground shadow. `height` is the on-court height of the full image (metres).
export async function buildSprite(textureUrl, { height = 1.45 } = {}) {
  const img = await loadImage(textureUrl);
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const aspect = img.width / img.height;
  const width = height * aspect;

  const g = new THREE.Group();

  // Unlit material: the anime art renders with its original colours, so scene
  // lights cannot tint the skin, blue jersey or red/gold-dragon artwork.
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05 })
  );
  plane.position.y = height / 2; // feet at y = 0
  plane.renderOrder = 1;         // draw after the opaque table/net for depth sorting
  g.add(plane);

  // Soft ground shadow so the character does not float.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.82, width * 0.30),
    new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.renderOrder = 2;
  g.add(shadow);

  return g;
}
