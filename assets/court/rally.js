// Leo's Court — choreographed rally timeline.
//
// Coordinate convention: X = width, Y = height, Z = length. The table's long
// axis runs along Z, the net spans X at Z = 0, and the players stand at the
// +Z (near) and -Z (far) ends, rallying across the net along Z.
//
// The whole rally is data-driven: a list of ball waypoints (contacts and
// bounces) plus the stroke that produced each contact. The ball follows
// ballistic arcs between consecutive waypoints, so paddle-contact timing,
// net clearance and table bounces are all defined by the same keyframes —
// which is what keeps the loop seamless and the animation in sync.

export const TABLE = {
  length: 2.74,   // Z axis
  width: 1.525,   // X axis
  height: 0.76,   // top surface Y
  netHeight: 0.1525,
  netTop: 0.9125,
};
export const BALL_R = 0.02;
export const RED_Z = 1.6;    // Fan Zhendong (red) — near end (+Z)
export const BLUE_Z = -1.6;  // Ma Long (blue) — far end (-Z)
export const RED_X = -0.28;  // near player, slightly screen-left
export const BLUE_X = 0.28;  // far player, slightly screen-right
export const GRAVITY = [0, -9.8, 0];

export const RALLY_DURATION = 10.0;

// Each stroke: when + who + where the paddle meets the ball.
export const SHOTS = [
  { t: 1.20, actor: "red",  stroke: "serve",    contact: { x: 0.05, y: 1.02, z: 0.95 } },
  { t: 2.35, actor: "blue", stroke: "forehand", contact: { x: 0.15, y: 0.90, z: -0.90 } },
  { t: 3.45, actor: "red",  stroke: "forehand", contact: { x: -0.12, y: 0.90, z: 0.90 } },
  { t: 4.55, actor: "blue", stroke: "backhand", contact: { x: -0.18, y: 0.85, z: -0.88 } },
  { t: 5.60, actor: "red",  stroke: "backhand", contact: { x: 0.15, y: 0.85, z: 0.88 } },
  { t: 6.65, actor: "blue", stroke: "attack",   contact: { x: 0.00, y: 1.00, z: -0.80 } },
  { t: 7.45, actor: "red",  stroke: "block",    contact: { x: 0.00, y: 0.85, z: 0.85 } },
  { t: 8.45, actor: "blue", stroke: "push",     contact: { x: 0.00, y: 0.82, z: -0.85 } },
];

// Ball waypoints: { t, x, y, z }. Contacts and bounces alternate; the first
// and last waypoints coincide so the 10 s loop wraps seamlessly.
const BALL_WAYPOINTS = [
  { t: 0.00, x: -0.42, y: 1.20, z: 0.70 }, // ready (red holds)
  { t: 0.60, x: -0.42, y: 1.55, z: 0.70 }, // toss
  { t: 1.20, x: 0.05, y: 1.02, z: 0.95 }, // serve contact (red)
  { t: 1.90, x: 0.00, y: 0.78, z: -0.55 }, // bounce (blue side)
  { t: 2.35, x: 0.15, y: 0.90, z: -0.90 }, // blue forehand contact
  { t: 3.05, x: -0.08, y: 0.78, z: 0.55 }, // bounce (red side)
  { t: 3.45, x: -0.12, y: 0.90, z: 0.90 }, // red forehand contact
  { t: 4.15, x: 0.10, y: 0.78, z: -0.60 }, // bounce (blue side)
  { t: 4.55, x: -0.18, y: 0.85, z: -0.88 }, // blue backhand contact
  { t: 5.25, x: 0.12, y: 0.78, z: 0.50 }, // bounce (red side)
  { t: 5.60, x: 0.15, y: 0.85, z: 0.88 }, // red backhand contact
  { t: 6.30, x: -0.05, y: 0.78, z: -0.50 }, // bounce (blue side)
  { t: 6.65, x: 0.00, y: 1.00, z: -0.80 }, // blue attack contact
  { t: 7.15, x: 0.00, y: 0.78, z: 0.45 }, // bounce (red side)
  { t: 7.45, x: 0.00, y: 0.85, z: 0.85 }, // red block contact
  { t: 8.10, x: 0.00, y: 0.78, z: -0.55 }, // bounce (blue side)
  { t: 8.45, x: 0.00, y: 0.82, z: -0.85 }, // blue push contact
  { t: 9.10, x: -0.42, y: 0.95, z: 0.70 }, // red catch
  { t: 10.00, x: -0.42, y: 1.20, z: 0.70, hold: true }, // ready (held; == t 0)
];

function wrap(t) {
  return ((t % RALLY_DURATION) + RALLY_DURATION) % RALLY_DURATION;
}

// Solve a ballistic arc through p0 at t0 and p1 at t1.
function solveArc(p0, t0, p1, t1) {
  const dt = t1 - t0;
  const g = GRAVITY;
  const vx = (p1.x - p0.x) / dt;
  const vy = (p1.y - p0.y - 0.5 * g[1] * dt * dt) / dt;
  const vz = (p1.z - p0.z) / dt;
  return { p0, t0, vx, vy, vz };
}

export function ballStateAt(t) {
  const phase = wrap(t);
  const wp = BALL_WAYPOINTS;
  for (let i = 0; i < wp.length - 1; i++) {
    const a = wp[i], b = wp[i + 1];
    if (phase >= a.t && phase <= b.t) {
      const s = (phase - a.t) / (b.t - a.t);
      if (b.hold) {
        // Held in the hand: linear interpolation, no gravity.
        return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s, z: a.z + (b.z - a.z) * s };
      }
      const arc = solveArc(a, a.t, b, b.t);
      const dt = phase - a.t;
      return {
        x: arc.p0.x + arc.vx * dt,
        y: arc.p0.y + arc.vy * dt + 0.5 * GRAVITY[1] * dt * dt,
        z: arc.p0.z + arc.vz * dt,
      };
    }
  }
  const last = wp[wp.length - 1];
  return { x: last.x, y: last.y, z: last.z };
}

// Contact events, for audio + sync checks (time within the loop).
export const CONTACT_EVENTS = SHOTS.map((s) => ({ t: s.t, actor: s.actor }));

// For a player side and current time: the shot they are currently playing
// (windup -> contact -> follow-through), or null when at rest.
const WINDUP = 0.38;
const FOLLOW = 0.42;

export function activeShot(side, t) {
  const phase = wrap(t);
  for (const s of SHOTS) {
    if (s.actor !== side) continue;
    if (phase >= s.t - WINDUP && phase <= s.t + FOLLOW) return s;
  }
  return null;
}

export function strokeProgress(shot, t) {
  const phase = wrap(t);
  const d = phase - shot.t;
  if (d < -WINDUP) return null;
  if (d < 0) return { stage: "windup", u: 1 + d / WINDUP };      // 0 -> 1 (back to contact)
  if (d <= FOLLOW) return { stage: "follow", u: d / FOLLOW };    // 0 -> 1 (contact to finish)
  return null;
}
