// Leo's Court — entry point. Detects WebGL2, dynamically imports the scene
// modules (so a CDN failure degrades to a static fallback, never a blank page),
// then runs the choreographed rally + orbit controls + HUD wiring.

import { RALLY_DURATION, RED_X, BLUE_X, ballStateAt, activeShot, strokeProgress, CONTACT_EVENTS } from "./rally.js";

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
  let THREE, sceneMod, charMod, audioMod;
  try {
    THREE = await import(THREE_URL);
    sceneMod = await import("./scene.js");
    charMod = await import("./characters.js");
    audioMod = await import("./audio.js");
  } catch (e) {
    showFallback("3D module load failed: " + (e && e.message ? e.message : e));
    return;
  }
  run(THREE, sceneMod, charMod, audioMod);
}

function run(THREE, sceneMod, charMod, audioMod) {
  const canvas = $("#court-canvas");
  if (!canvas) { showFallback("no canvas"); return; }

  const { initScene } = sceneMod;
  const { buildCharacter, updateCharacter } = charMod;
  const { createCourtAudio } = audioMod;
  const audio = createCourtAudio();

  const { renderer, scene, camera, ball, resize } = initScene(canvas);
  resize();
  window.addEventListener("resize", resize);

  // Players: red at +X faces -X (rotate PI), blue at -X faces +X.
  const red = buildCharacter({ jersey: 0xff3b3b, hair: 0x8a1010, skin: 0xf0c8a0 });
  red.root.position.set(RED_X, 0, 0);
  red.root.rotation.y = Math.PI;
  const blue = buildCharacter({ jersey: 0x3b6bff, hair: 0x0e2a7a, skin: 0xf0c8a0 });
  blue.root.position.set(BLUE_X, 0, 0);
  scene.add(red.root, blue.root);

  // ---- Camera / orbit state ----
  const camTarget = new THREE.Vector3(0, 0.95, 0);
  const REST = { theta: 0.42, phi: 1.08, radius: 5.9 };
  const INTRO_START = { theta: 0.85, phi: 1.42, radius: 7.6 };
  const LIMITS = { theta: [-0.66, 0.66], phi: [0.35, 1.26], radius: [3.6, 7.0] };
  const cam = { theta: INTRO_START.theta, phi: INTRO_START.phi, radius: INTRO_START.radius };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const introDur = reducedMotion ? 0 : 2.7;
  let introT = 0;

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

  // ---- State ----
  let paused = reducedMotion; // reduced motion starts paused (user opts in)
  let slow = false;
  let phase = 0;
  const clock = new THREE.Clock();

  // ---- HUD wiring ----
  const btnPlay = $("#btn-play");
  const btnSlow = $("#btn-slow");
  const btnReset = $("#btn-reset");
  const btnSound = $("#btn-sound");
  const modal = $("#court-modal");

  function setPaused(p) {
    paused = p;
    if (btnPlay) btnPlay.setAttribute("aria-pressed", String(p));
    if (btnPlay) btnPlay.querySelector(".label").textContent = p ? "Play" : "Pause";
  }
  function setSlow(s) {
    slow = s;
    if (btnSlow) btnSlow.setAttribute("aria-pressed", String(s));
  }
  function setSound(on) {
    audio.setEnabled(on);
    if (btnSound) btnSound.setAttribute("aria-pressed", String(on));
  }

  if (btnPlay) btnPlay.addEventListener("click", () => setPaused(!paused));
  if (btnSlow) btnSlow.addEventListener("click", () => setSlow(!slow));
  if (btnSound) btnSound.addEventListener("click", () => setSound(!audio.enabled));
  if (btnReset) btnReset.addEventListener("click", () => { cam.theta = REST.theta; cam.phi = REST.phi; cam.radius = REST.radius; });

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

  let resumeAfterModal = paused;
  function openPanel(key) {
    const p = PANELS[key];
    if (!p) return;
    resumeAfterModal = paused;
    setPaused(true);
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
  }
  function closePanel() {
    modal.hidden = true;
    setPaused(resumeAfterModal);
  }
  $all(".court-hotspot").forEach((b) => b.addEventListener("click", () => openPanel(b.dataset.panel)));
  $("#court-modal-close").addEventListener("click", closePanel);
  modal.addEventListener("click", (e) => { if (e.target === modal) closePanel(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal && !modal.hidden) closePanel(); });

  // Pause when hero leaves the viewport or tab hidden.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting && !modal.hidden) { /* keep modal state */ }
      });
    }, { threshold: 0.05 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) setPaused(true); });

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
    e.preventDefault();
    cam.radius = Math.max(LIMITS.radius[0], Math.min(LIMITS.radius[1], cam.radius + e.deltaY * 0.002));
  }, { passive: false });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "Space": e.preventDefault(); setPaused(!paused); break;
      case "KeyS": setSlow(!slow); break;
      case "KeyR": cam.theta = REST.theta; cam.phi = REST.phi; cam.radius = REST.radius; break;
      case "KeyM": setSound(!audio.enabled); break;
    }
  });

  // ---- Pose helpers ----
  function playerPose(player, side, time) {
    const shot = activeShot(side, time);
    const pose = { paddleTarget: null, supportTarget: null, torsoY: 0, torsoX: 0, crouch: 0 };
    if (shot) {
      const prog = strokeProgress(shot, time);
      const C = new THREE.Vector3(shot.contact.x, shot.contact.y, shot.contact.z);
      const sign = side === "red" ? -1 : 1; // red hits toward -X, blue toward +X
      if (prog && prog.stage === "windup") {
        const u = 1 - prog.u; // 1 at start (back), 0 at contact
        const windup = C.clone().add(new THREE.Vector3(-sign * 0.42 * u, 0.16 * u, 0));
        pose.paddleTarget = windup;
      } else if (prog && prog.stage === "follow") {
        const follow = C.clone().add(new THREE.Vector3(sign * 0.28 * prog.u, 0.04 * prog.u, 0));
        pose.paddleTarget = follow;
      } else {
        pose.paddleTarget = C;
      }
      pose.torsoY = (shot.contact.z / 1.4) * 0.35;
      pose.torsoX = 0.12;
      pose.crouch = -0.03;
    } else {
      pose.crouch = 0;
    }
    return pose;
  }

  // ---- Main loop ----
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);

    // intro camera
    if (introT < introDur) {
      introT += dt;
      const t = Math.min(1, introT / introDur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      cam.theta = INTRO_START.theta + (REST.theta - INTRO_START.theta) * e;
      cam.phi = INTRO_START.phi + (REST.phi - INTRO_START.phi) * e;
      cam.radius = INTRO_START.radius + (REST.radius - INTRO_START.radius) * e;
    }
    applyCamera();

    // advance rally phase
    const phaseBefore = phase;
    if (!paused) {
      phase = (phase + dt * (slow ? 0.3 : 1)) % RALLY_DURATION;
    }

    // ball
    const b = ballStateAt(phase);
    ball.position.set(b.x, b.y, b.z);

    // audio on contact (wrap-aware crossing detection)
    for (const c of CONTACT_EVENTS) {
      const crossed = phase >= phaseBefore
        ? c.t > phaseBefore && c.t <= phase
        : c.t > phaseBefore || c.t <= phase;
      if (crossed) audio.playHit();
    }

    // characters
    const redPose = playerPose(red, "red", phase);
    const bluePose = playerPose(blue, "blue", phase);
    updateCharacter(red, redPose, dt);
    updateCharacter(blue, bluePose, dt);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  const fb = $("#court-fallback");
  if (fb) fb.hidden = true;

  window.__courtInit = true;
  setPaused(paused);
  tick();
}

boot();
