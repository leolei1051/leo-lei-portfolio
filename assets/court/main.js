// Leo's Court — entry point. WebGL2 detection + dynamic imports (so a CDN
// failure degrades to a static fallback), then a table-tennis demo driven by a
// unified timeline, with an on-screen scoreboard and orbit/HUD controls.
//
// Characters: prefer real GLB models (skeleton + animation) via model-character;
// otherwise fall back to the 2.5D sprite covers, clearly labelled as a
// placeholder. This is "structure implemented", not a claim that a model is
// wired or that motion is verified.

import { RED_Z, BLUE_Z, RED_X, BLUE_X, ballStateAt, activeShot, strokeProgress, CONTACT_EVENTS, RALLY_DURATION, POINT_END_TIME } from "./rally.js";

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
const FAN_URL = "assets/court/fan.glb"; // placeholder until a real GLB exists
const MA_URL = "assets/court/ma.glb";   // placeholder until a real GLB exists

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
  let THREE, sceneMod, spritesMod, audioMod, modelMod = null;
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
    modelMod = await import("./model-character.js");
  } catch (e) {
    console.warn("[court] model-character module unavailable:", e && e.message ? e.message : e);
  }
  try {
    await run(THREE, sceneMod, spritesMod, audioMod, modelMod);
  } catch (e) {
    showFallback("3D setup failed: " + (e && e.message ? e.message : e));
  }
}

async function run(THREE, sceneMod, spritesMod, audioMod, modelMod) {
  const canvas = $("#court-canvas");
  if (!canvas) { showFallback("no canvas"); return; }

  const { initScene } = sceneMod;
  const { buildSprite } = spritesMod;
  const { createCourtAudio } = audioMod;
  const audio = createCourtAudio();

  const { renderer, scene, camera, ball, world, resize } = initScene(canvas);
  resize();
  window.addEventListener("resize", resize);

  // ---- Characters: real GLB models, else 2.5D sprite covers ----
  let fanModel = null, maModel = null;
  if (modelMod) {
    try {
      [fanModel, maModel] = await Promise.all([
        modelMod.loadModelCharacter({ url: FAN_URL, paddle: modelMod.buildPaddleMesh(0x3b6bff) }),
        modelMod.loadModelCharacter({ url: MA_URL, paddle: modelMod.buildPaddleMesh(0xff3b3b) }),
      ]);
    } catch (e) {
      fanModel = maModel = null;
    }
  }
  const modelMode = !!(fanModel && maModel);

  let fan, ma;
  if (modelMode) {
    fan = fanModel; ma = maModel;
    fan.root.position.set(RED_X, 0, RED_Z);
    ma.root.position.set(BLUE_X, 0, BLUE_Z);
    fan.root.rotation.y = Math.PI / 2;   // Fan (near) faces -Z toward the net
    ma.root.rotation.y = -Math.PI / 2;   // Ma (far) faces +Z toward the net
    world.add(fan.root, ma.root);
    fan.play("idle"); ma.play("idle");
  } else {
    fan = await buildSprite("assets/court/小胖.png", { height: 1.45, fallbackColor: 0x3b6bff });
    ma = await buildSprite("assets/court/马龙.png", { height: 1.45, fallbackColor: 0xff3b3b });
    fan.position.set(RED_X, 0, RED_Z);
    ma.position.set(BLUE_X, 0, BLUE_Z);
    world.add(fan, ma);
  }

  // ---- Camera / orbit state ----
  // Model mode: follow the near player (side-rear-top). Sprite fallback: table centre.
  const EYE_HEIGHT = 1.0;
  const anchor = new THREE.Vector3(0, 0.75, 0);
  const anchorTarget = new THREE.Vector3(0, 0.75, 0);
  const isMobile = window.matchMedia("(max-width: 640px)").matches;
  const REST = isMobile
    ? { theta: 0.10, phi: 1.05, radius: modelMode ? 5.6 : 8.0 }
    : { theta: 0.10, phi: 1.12, radius: modelMode ? 4.4 : 6.45 };
  const INTRO_START = { theta: 0.02, phi: 1.30, radius: modelMode ? 6.2 : 7.4 };
  const LIMITS = isMobile
    ? { theta: [-0.24, 0.24], phi: [0.95, 1.25], radius: modelMode ? [4.8, 7.0] : [7.2, 9.0] }
    : { theta: [-0.24, 0.24], phi: [1.00, 1.28], radius: modelMode ? [3.6, 5.6] : [5.6, 7.3] };

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
      anchor.x + radius * Math.sin(phi) * Math.sin(theta),
      anchor.y + radius * Math.cos(phi),
      anchor.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(anchor);
  }
  applyCamera();

  // ---- Rally / score state ----
  let paused = false;
  let slow = false;
  let phase = 0;
  let score = { fan: 8, ma: 8 };
  const clock = new THREE.Clock();

  // Debug hook: ?phase=N freezes the timeline at phase N (for screenshots/tests).
  const qp = new URLSearchParams(location.search).get("phase");
  if (qp !== null && !isNaN(parseFloat(qp))) {
    phase = ((parseFloat(qp) % RALLY_DURATION) + RALLY_DURATION) % RALLY_DURATION;
    paused = true;
  }

  // ---- HUD wiring ----
  const btnPlay = $("#btn-play");
  const btnSlow = $("#btn-slow");
  const btnReplay = $("#btn-reset");
  const btnSound = $("#btn-sound");
  const modal = $("#court-modal");
  const badge = $(".court-badge");

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

  function updateScoreboard() {
    const f = $("#score-fan"), m = $("#score-ma");
    if (f) f.textContent = String(score.fan);
    if (m) m.textContent = String(score.ma);
    const srv = $("#server-marker");
    if (srv) srv.textContent = "樊振东"; // fixed server in this demo choreography
  }

  function updateBadge() {
    if (badge) {
      badge.textContent = modelMode
        ? "3D 骨骼角色 · 演示比分（非真实数据）"
        : "3D 模型未接入 · 显示立绘占位（演示比分，非真实数据）";
    }
  }

  function replay() {
    phase = 0;
    setPaused(false);
    updateScoreboard();
  }

  if (btnPlay) btnPlay.addEventListener("click", () => setPaused(!paused));
  if (btnSlow) btnSlow.addEventListener("click", () => setSlow(!slow));
  if (btnReplay) btnReplay.addEventListener("click", replay);
  if (btnSound) btnSound.addEventListener("click", () => setSound(!audio.enabled));
  updateScoreboard();
  updateBadge();

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
    resumeAfterPaused = paused;
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

  // ---- Pointer orbit ----
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
      if (pinchDist > 0) cam.radius = Math.max(LIMITS.radius[0], Math.min(LIMITS.radius[1], cam.radius * (pinchDist / d)));
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
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    cam.radius = Math.max(LIMITS.radius[0], Math.min(LIMITS.radius[1], cam.radius + e.deltaY * 0.002));
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    const tag = t && t.tagName ? t.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || (t && t.isContentEditable)) return;
    switch (e.code) {
      case "Space": e.preventDefault(); setPaused(!paused); break;
      case "KeyS": setSlow(!slow); break;
      case "KeyR": replay(); break;
      case "KeyM": setSound(!audio.enabled); break;
    }
  });

  // ---- Timeline-driven helpers ----
  function demoScore(p) {
    return p >= POINT_END_TIME ? { fan: 8, ma: 9 } : { fan: 8, ma: 8 };
  }

  function spriteX(baseX, side, p) {
    const shot = activeShot(side, p);
    if (!shot) return baseX;
    const targetX = baseX + (shot.contact.x - baseX) * 0.65;
    const prog = strokeProgress(shot, p);
    if (prog && prog.stage === "windup") return baseX + (targetX - baseX) * prog.u;
    if (prog && prog.stage === "follow") return targetX + (baseX - targetX) * prog.u;
    return baseX;
  }

  // Placeholder clip mapping (uncalibrated until real clip durations exist).
  function poseFor(side, p) {
    const shot = activeShot(side, p);
    if (!shot) return { clip: "idle", loop: true };
    const prog = strokeProgress(shot, p);
    if (!prog) return { clip: "idle", loop: true };
    if (prog.stage === "windup") return { clip: "windup", loop: false };
    return prog.u < 0.35 ? { clip: "swing", loop: false } : { clip: "follow", loop: false };
  }
  function applyPose(char, pose) {
    if (!char || !char.play) return;
    if (char._clip === pose.clip) return;
    char._clip = pose.clip;
    char.play(pose.clip, { loop: pose.loop });
  }

  // ---- Main loop ----
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);

    if (introT < introDur) {
      introT += dt;
      const t = Math.min(1, introT / introDur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      cam.theta = INTRO_START.theta + (REST.theta - INTRO_START.theta) * e;
      cam.phi = INTRO_START.phi + (REST.phi - INTRO_START.phi) * e;
      cam.radius = INTRO_START.radius + (REST.radius - INTRO_START.radius) * e;
    }

    // anchor: near player in model mode, table centre otherwise
    if (modelMode) {
      fan.root.getWorldPosition(anchorTarget);
      anchorTarget.y += EYE_HEIGHT;
    } else {
      anchorTarget.set(0, 0.75, 0);
    }
    anchor.lerp(anchorTarget, 1 - Math.exp(-8 * dt));
    applyCamera();

    // advance timeline (play/pause/slow control the same clock)
    const prevPhase = phase;
    if (!paused) {
      phase = (phase + dt * (slow ? 0.3 : 1)) % RALLY_DURATION;
    }

    // ball follows the choreographed path
    const b = ballStateAt(phase);
    ball.position.set(b.x, b.y, b.z);

    // audio on contact (wrap-aware)
    for (const c of CONTACT_EVENTS) {
      const crossed = phase >= prevPhase ? (c.t > prevPhase && c.t <= phase) : (c.t > prevPhase || c.t <= phase);
      if (crossed) audio.playHit();
    }

    // score is a pure function of the timeline (8:8 -> 8:9 -> reset 8:8)
    const s = demoScore(phase);
    if (s.fan !== score.fan || s.ma !== score.ma) {
      score = s;
      updateScoreboard();
    }

    // characters: model animation, or sprite shift in fallback
    if (modelMode) {
      const dtAnim = paused ? 0 : dt * (slow ? 0.3 : 1);
      applyPose(fan, poseFor("red", phase));
      applyPose(ma, poseFor("blue", phase));
      fan.update(dtAnim);
      ma.update(dtAnim);
    } else {
      fan.position.x = spriteX(RED_X, "red", phase);
      ma.position.x = spriteX(BLUE_X, "blue", phase);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  const fb = $("#court-fallback");
  if (fb) fb.hidden = true;

  window.__courtInit = true;
  tick();
}

boot();
