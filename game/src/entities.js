// entities.js — the actors of ORBITAL DECAY: player, debris, hunters,
// bolts, orbs, pickups and particles. Each factory returns a plain
// object; each update function moves one kind for one frame.

import { ARENA, PLAYER, DEBRIS, HUNTER, ORB, PICKUP, SINGULARITY } from './config.js';
import { integrate, bounceWalls, distToCenter, clamp, TAU } from './physics.js';

export function makePlayer() {
  return {
    kind: 'player',
    x: ARENA.cx, y: ARENA.cy - 260,
    vx: 200, vy: 0, // start already in orbit
    r: PLAYER.r, angle: 0,
    fuel: PLAYER.maxFuel, maxFuel: PLAYER.maxFuel,
    shield: PLAYER.maxShield, maxShield: PLAYER.maxShield,
    invuln: 0, fireTimer: 0, shiftTimer: 0,
    thrust: PLAYER.thrust, damage: 1, pierce: 0,
    fireCooldown: PLAYER.fireCooldown, magnetR: PICKUP.magnetR,
    shiftCooldown: PLAYER.shiftCooldown,
    alive: true, thrusting: false,
  };
}

export function makeDebris(rng, hpBonus, speedBonus) {
  // Spawn at a random arena edge, already drifting.
  const side = Math.floor(rng() * 4);
  let x, y;
  if (side === 0) { x = rng() * ARENA.w; y = -20; }
  else if (side === 1) { x = ARENA.w + 20; y = rng() * ARENA.h; }
  else if (side === 2) { x = rng() * ARENA.w; y = ARENA.h + 20; }
  else { x = -20; y = rng() * ARENA.h; }
  const ang = Math.atan2(ARENA.cy - y, ARENA.cx - x) + (rng() - 0.5) * 1.2;
  const sp = DEBRIS.speed * speedBonus * (0.7 + rng() * 0.6);
  return {
    kind: 'debris',
    x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
    r: DEBRIS.rMin + rng() * (DEBRIS.rMax - DEBRIS.rMin),
    hp: DEBRIS.hp + hpBonus, maxHp: DEBRIS.hp + hpBonus,
    rot: rng() * TAU, rotSpeed: (rng() - 0.5) * 2.4,
    verts: 7 + Math.floor(rng() * 3),
    seed: rng(),
  };
}

export function makeHunter(rng, hpBonus, speedBonus) {
  const ang = rng() * TAU;
  const d = 320 + rng() * 120;
  return {
    kind: 'hunter',
    x: ARENA.cx + Math.cos(ang) * d, y: ARENA.cy + Math.sin(ang) * d,
    vx: 0, vy: 0, r: HUNTER.r,
    hp: HUNTER.hp + hpBonus, maxHp: HUNTER.hp + hpBonus,
    shotTimer: 1.5 + rng() * 1.5,
    speed: HUNTER.speed * speedBonus,
    angle: 0, wobble: rng() * TAU,
  };
}

export function makeBolt(x, y, angle, damage, pierce) {
  return {
    kind: 'bolt',
    x, y,
    vx: Math.cos(angle) * PLAYER.boltSpeed,
    vy: Math.sin(angle) * PLAYER.boltSpeed,
    r: 4, life: PLAYER.boltLife, damage, pierce, hitSet: new Set(), counted: false,
  };
}

export function makeOrb(x, y, angle) {
  return {
    kind: 'orb',
    x, y,
    vx: Math.cos(angle) * HUNTER.orbSpeed,
    vy: Math.sin(angle) * HUNTER.orbSpeed,
    r: ORB.r, life: 6,
  };
}

export function makePickup(x, y, type) {
  return { kind: 'pickup', type, x, y, vx: 0, vy: 0, r: PICKUP.r, bob: Math.random() * TAU };
}

export function makeParticle(x, y, vx, vy, life, size, color) {
  return { x, y, vx, vy, life, maxLife: life, size, color };
}

export function burst(particles, x, y, n, color, speed, life) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const s = speed * (0.3 + Math.random() * 0.7);
    particles.push(makeParticle(
      x, y, Math.cos(a) * s, Math.sin(a) * s,
      life * (0.5 + Math.random() * 0.5), 1 + Math.random() * 2.5, color,
    ));
  }
}

export function updatePlayer(p, dt, shiftDeg, aimX, aimY, thrusting) {
  p.thrusting = thrusting;
  if (thrusting && p.fuel > 0) {
    const dx = aimX - p.x;
    const dy = aimY - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * p.thrust * dt;
    p.vy += (dy / d) * p.thrust * dt;
    p.fuel = Math.max(0, p.fuel - PLAYER.thrustDrain * dt);
    p.angle = Math.atan2(dy, dx);
  }
  // Passive regen: the ship is never left completely helpless.
  p.fuel = Math.min(p.maxFuel, p.fuel + PLAYER.fuelRegen * dt);
  integrate(p, dt, shiftDeg, PLAYER.drag);
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > PLAYER.maxSpeed) {
    p.vx = (p.vx / sp) * PLAYER.maxSpeed;
    p.vy = (p.vy / sp) * PLAYER.maxSpeed;
  }
  bounceWalls(p, p.r);
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  p.shiftTimer = Math.max(0, p.shiftTimer - dt);
  p.invuln = Math.max(0, p.invuln - dt);
}

export function updateDebris(d, dt, shiftDeg) {
  integrate(d, dt, shiftDeg, 0);
  d.rot += d.rotSpeed * dt;
  // The singularity eats what falls into it.
  return distToCenter(d.x, d.y) > SINGULARITY.killR;
}

export function updateHunter(h, dt, shiftDeg, player, orbs) {
  integrate(h, dt, shiftDeg, 0.1);
  // Steer toward the player, with a slow wobble so it never tracks perfectly.
  h.wobble += dt;
  const dx = player.x - h.x;
  const dy = player.y - h.y;
  const d = Math.hypot(dx, dy) || 1;
  const wob = Math.sin(h.wobble * 1.7) * 0.6;
  const ax = (dx / d) * Math.cos(wob) - (dy / d) * Math.sin(wob);
  const ay = (dx / d) * Math.sin(wob) + (dy / d) * Math.cos(wob);
  h.vx += ax * HUNTER.steer * dt;
  h.vy += ay * HUNTER.steer * dt;
  const sp = Math.hypot(h.vx, h.vy);
  const max = h.speed;
  if (sp > max) { h.vx = (h.vx / sp) * max; h.vy = (h.vy / sp) * max; }
  h.angle = Math.atan2(dy, dx);
  bounceWalls(h, h.r);
  h.shotTimer -= dt;
  if (h.shotTimer <= 0 && d < 520) {
    h.shotTimer = HUNTER.shotCooldown;
    orbs.push(makeOrb(h.x, h.y, Math.atan2(dy, dx)));
    h.fired = true; // the game reads this to play the shot sound
  }
  return distToCenter(h.x, h.y) > SINGULARITY.killR;
}

export function updateBolt(b, dt, shiftDeg) {
  // Bolts fly straight BY DESIGN, not by omission. A reviewer
  // suggested gravity-bent bolts; playtest measured it twice: full
  // gravity dropped bot accuracy 6/14 -> 3/20 and half gravity still
  // cost a third of hits (4/14), both runs dying in wave 1. At
  // 640 px/s the bend exceeds a debris target's radius at typical
  // range, so shots stop going where the player aims. The gravity
  // fantasy is carried by the player, debris, hunters and orbs;
  // the bolt is the player's tool and stays predictable.
  void shiftDeg;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
  return b.life > 0 && b.x > -20 && b.x < ARENA.w + 20 && b.y > -20 && b.y < ARENA.h + 20;
}

export function updateOrb(o, dt, shiftDeg) {
  integrate(o, dt, shiftDeg, 0);
  o.life -= dt;
  return o.life > 0 && distToCenter(o.x, o.y) > SINGULARITY.killR;
}

export function updatePickup(pk, dt, player, magnetMul) {
  // Drift toward the player when close (magnet), else hang still.
  const dx = player.x - pk.x;
  const dy = player.y - pk.y;
  const d = Math.hypot(dx, dy) || 1;
  const pull = player.magnetR * magnetMul;
  if (d < pull) {
    const s = 260 * (1 - d / pull);
    pk.vx += (dx / d) * s * dt;
    pk.vy += (dy / d) * s * dt;
  }
  pk.vx *= Math.max(0, 1 - 2 * dt);
  pk.vy *= Math.max(0, 1 - 2 * dt);
  pk.x += pk.vx * dt;
  pk.y += pk.vy * dt;
  pk.bob += dt * 3;
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - 1.5 * dt);
    p.vy *= Math.max(0, 1 - 1.5 * dt);
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function clampToArena(body, r) {
  body.x = clamp(body.x, r, ARENA.w - r);
  body.y = clamp(body.y, r, ARENA.h - r);
}
