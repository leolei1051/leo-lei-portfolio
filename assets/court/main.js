// Leo's Court — entry point. Detects WebGL2, dynamically imports the scene
// modules (so a CDN failure degrades to a static fallback, never a blank page),
// then shows a static 2.5D ready-pose scene (3D court + two anime sprites)
// with orbit controls + HUD wiring.
//
// This is a preview: the procedural humanoid + rally code in characters.js and
// rally.js is kept for a future 3D-model / skeletal swap, but is not animated
// here because the current assets are two transparent full-body illustrations.

import { RED_Z, BLUE_Z, RED_X, BLUE_X } from "./rally.js";

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function supportsWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch (e) {
    return false;
  }
}

function showFallback(msg) {
  document.body.classList.add("no-webgl");
  const fb = $("#court-fallback");
  if (fb) fb.hidden = false;
  if (msg) console.warn("[court] fallback:", msg);
}

async function boot() {
  if (!supportsWebGL2()) {
    showFallback("WebGL2 unavailable");
    return;
  }
  let THREE, sceneMod, spritesMod, audioMod;
  try {
    THREE = await import(THREE_URL);
    sceneMod = await import("./scene.js");
    spritesMod = await import("./sprites.js");
    audioMod = await import("./audio.js");
  } catch (e) {
    showFallback("3D module load failed: " + (e && e.message ? e.message : e));
    return;
  }
  try {
    await run(THREE, sceneMod, spritesMod, audioMod);
  } catch (e) {
    showFallback("3D setup failed: " + (e && e.message ? e.message : e));
  }
}

async function run(THREE, sceneMod, spritesMod, audioMod) {
  const canvas = $("#court-canvas");
  if (!canvas) { showFallback("no canvas"); return; }

  const { initScene } = sceneMod;
  const { buildSprite } = spritesMod;
  const { createCourtAudio } = audioMod;
  const audio = createCourtAudio();

  const { renderer, scene, camera, ball, world, resize } = initScene(canvas);
  resize();
  window.addEventListener("resize", resize);

  // Static ready-pose preview: no rally, hide the ball.
  ball.visible = false;

  // Players (2.5D anime sprites). Fan = blue near-left, Ma = red/gold far-right.
  const [fan, ma] = await Promise.all([
    buildSprite("assets/court/小胖.png", { height: 1.45 }),
    buildSprite("assets/court/马龙.png", { height: 1.45 }),
  ]);
  fan.position.set(RED_X, 0, RED_Z);
  ma.position.set(BLUE_X, 0, BLUE_Z);
  world.add(fan, ma);

  // ---- Camera / orbit state ----
  const camTarget = new THREE.Vector3(0, 0.75, 0);
  const isMobile = window.matchMedia("(max-width: 640px)").matches;
  const REST = isMobile
    ? { theta: 0.10, phi: 1.05, radius: 8.0 }
    : { theta: 0.103, phi: 1.130, radius: 6.45 };
  const INTRO_START = { theta: 0.02, phi: 1.32, radius: 7.4 };
  const LIMITS = isMobile
    ? { theta: [-0.22, 0.22], phi: [0.95, 1.20], radius: [7.2, 9.0] }
    : { theta: [-0.22, 0.22], phi: [1.00, 1.26], radius: [5.6, 7.3] };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cam = {
    theta: reducedMotion ? REST.theta : INTRO_START.theta,
    phi: reducedMotion ? REST.phi : INTRO_START.phi,
    radius: reducedMotion ? REST.radius : INTRO_START.radius,
  };
  const introDur = (reducedMotion || isMobile) ? 0 : 2.7;
  let introT = 0;

  function resetCam() {
    cam.theta = REST.theta;
    cam.phi = REST.phi;
    cam.radius = REST.radius;
  }

  function applyCamera() {
    const { theta, phi, radius } = cam;
    camera.position.set(
      camTarget.x + radius * Math.sin(phi) * Math.sin(theta),
      camTarget.y + radius * Math.cos(phi),
      camTarget.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(camTarget);
  }
  applyCamera();

  // ---- HUD wiring ----
  const btnPlay = $("#btn-play");
  const btnSlow = $("#btn-slow");
  const btnReset = $("#btn-reset");
  const btnSound = $("#btn-sound");
  const modal = $("#court-modal");

  // Play / Slow are inert in the static preview (no rally), kept for the
  // future animated version; Reset and Sound remain functional.
  function setPaused(p) {
    if (btnPlay) btnPlay.setAttribute("aria-pressed", String(p));
    if (btnPlay) btnPlay.querySelector(".label").textContent = p ? "Play" : "Pause";
  }
  function setSlow(s) {
    if (btnSlow) btnSlow.setAttribute("aria-pressed", String(s));
  }
  function setSound(on) {
    audio.setEnabled(on);
    if (btnSound) btnSound.setAttribute("aria-pressed", String(on));
  }

  if (btnPlay) btnPlay.addEventListener("click", () => setPaused(btnPlay.getAttribute("aria-pressed") !== "true"));
  if (btnSlow) btnSlow.addEventListener("click", () => setSlow(btnSlow.getAttribute("aria-pressed") !== "true"));
  if (btnSound) btnSound.addEventListener("click", () => setSound(!audio.enabled));
  if (btnReset) btnReset.addEventListener("click", resetCam);

  // Hotspots -> modal
  const PANELS = {
    projects: { title: "Projects", items: [
      { label: "semiconductor-forecast — full write-up", href: "forecast.html" },
      { label: "Portfolio site — GitHub", href: "https://github.com/leolei1051/leo-lei-portfolio" },
      { label: "Portfolio site — live demo", href: "https://leo-lei-portfolio.vercel.app/" },
    ] },
    about: { title: "About & Resume", items: [
      { label: "Download CV (PDF)", href: "assets/Leo_Lei_Resume.pdf", download: true },
      { label: "Read about me", href: "#about" },
    ] },
    learning: { title: "Learning", items: [
      { label: "Study log", href: "#learning" },
    ] },
    contact: { title: "Contact", items: [
      { label: "Email — cnleo.lei@gmail.com", href: "mailto:cnleo.lei@gmail.com" },
      { label: "Phone — +61 481 860 718", href: "tel:+61481860718" },
      { label: "GitHub — leolei1051", href: "https://github.com/leolei1051" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/leo-lei-37705a349/" },
    ] },
  };

  let resumeAfterPaused = false;
  let lastFocused = null;
  function openPanel(key) {
    const p = PANELS[key];
    if (!p) return;
    resumeAfterPaused = btnPlay ? btnPlay.getAttribute("aria-pressed") === "true" : false;
    setPaused(true);
    lastFocused = document.activeElement;
    $("#court-modal-title").textContent = p.title;
    const list = $("#court-modal-list");
    list.innerHTML = "";
    p.items.forEach((it) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.textContent = it.label;
      a.href = it.href;
      if (it.download) { a.download = "Leo_Lei_Resume.pdf"; }
      if (it.href.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; }
      li.appendChild(a);
      list.appendChild(li);
    });
    modal.hidden = false;
    const close = $("#court-modal-close");
    if (close) close.focus();
  }
  function closePanel() {
    modal.hidden = true;
    setPaused(resumeAfterPaused);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  $all(".court-hotspot").forEach((b) => b.addEventListener("click", () => openPanel(b.dataset.panel)));
  $("#court-modal-close").addEventListener("click", closePanel);
  modal.addEventListener("click", (e) => { if (e.target === modal) closePanel(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal && !modal.hidden) closePanel(); });

  document.addEventListener("visibilitychange", () => { /* keep for parity; no rally to pause */ });

  // ---- Pointer orbit (mouse drag + touch) ----
  let dragging = false;
  let pointers = new Map();
  let pinchDist = 0;

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) dragging = true;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) {
        cam.radius = Math.max(LIMITS.radius[0], Math.min(LIMITS.radius[1], cam.radius * (pinchDist / d)));
      }
      pinchDist = d;
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    cam.theta = Math.max(LIMITS.theta[0], Math.min(LIMITS.theta[1], cam.theta + dx * 0.006));
    cam.phi = Math.max(LIMITS.phi[0], Math.min(LIMITS.phi[1], cam.phi + dy * 0.005));
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) dragging = false;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // plain wheel scrolls the page
    e.preventDefault();
    cam.radius = Math.max(LIMITS.radius[0], Math.min(LIMITS.radius[1], cam.radius + e.deltaY * 0.002));
  }, { passive: false });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    const tag = t && t.tagName ? t.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || (t && t.isContentEditable)) return;
    switch (e.code) {
      case "KeyR": resetCam(); break;
      case "KeyM": setSound(!audio.enabled); break;
    }
  });

  // ---- Main loop (camera + render only; static scene) ----
  const clock = new THREE.Clock();
  function tick() {
    clock.getDelta();

    // intro camera
    if (introT < introDur) {
      introT += 1 / 60;
      const t = Math.min(1, introT / introDur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      cam.theta = INTRO_START.theta + (REST.theta - INTRO_START.theta) * e;
      cam.phi = INTRO_START.phi + (REST.phi - INTRO_START.phi) * e;
      cam.radius = INTRO_START.radius + (REST.radius - INTRO_START.radius) * e;
    }
    applyCamera();

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  const fb = $("#court-fallback");
  if (fb) fb.hidden = true;

  window.__courtInit = true;
  tick();
}

boot();
