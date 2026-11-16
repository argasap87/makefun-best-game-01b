// physics.js — gravity, orbits and collisions for ORBITAL DECAY.
// One idea runs the whole game: everything is pulled toward the
// singularity, and the gravity-shift rotates that pull by 90 degrees.

import { ARENA, SINGULARITY } from './config.js';

export const TAU = Math.PI * 2;

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function distToCenter(x, y) {
  return Math.hypot(x - ARENA.cx, y - ARENA.cy);
}

// The gravity acceleration on a body at (x, y), given the shift angle
// (0, 90, 180 or 270 degrees). The pull always points at the
// singularity, then rotates by the shift: shifting the pull 90 degrees
// turns every orbit sideways, which is how the player flings debris,
// dodges hunters and escapes the singularity's grip.
export function gravityAt(x, y, shiftDeg) {
  const dx = ARENA.cx - x;
  const dy = ARENA.cy - y;
  const d = Math.max(40, Math.hypot(dx, dy));
  const a = Math.min(SINGULARITY.maxPull, SINGULARITY.pull / d);
  const ang = Math.atan2(dy, dx) + (shiftDeg * Math.PI) / 180;
  return { ax: Math.cos(ang) * a, ay: Math.sin(ang) * a };
}

// Integrate one body for dt seconds: gravity, then drag, then move.
export function integrate(body, dt, shiftDeg, drag) {
  const g = gravityAt(body.x, body.y, shiftDeg);
  body.vx += g.ax * dt;
  body.vy += g.ay * dt;
  if (drag) {
    const f = Math.max(0, 1 - drag * dt);
    body.vx *= f;
    body.vy *= f;
  }
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

// Circle overlap test.
export function circlesHit(a, b) {
  const r = a.r + b.r;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < r * r;
}

// Keep a body inside the arena with a soft bounce at the walls.
export function bounceWalls(body, r) {
  if (body.x < r) { body.x = r; body.vx = Math.abs(body.vx) * 0.6; }
  if (body.x > ARENA.w - r) { body.x = ARENA.w - r; body.vx = -Math.abs(body.vx) * 0.6; }
  if (body.y < r) { body.y = r; body.vy = Math.abs(body.vy) * 0.6; }
  if (body.y > ARENA.h - r) { body.y = ARENA.h - r; body.vy = -Math.abs(body.vy) * 0.6; }
}

// A deterministic seeded RNG (mulberry32) for shot scenes and spawns.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
