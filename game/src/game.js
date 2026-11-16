// game.js — the state machine of ORBITAL DECAY.
// States: title, playing, upgrade, paused, over. One update() runs the
// whole game for a fixed step; rendering lives in render.js.

import {
  ARENA, PLAYER, DEBRIS, HUNTER, ORB, PICKUP, COMBO_WINDOW, COMBO_MAX,
  DANGER_R, STAR_SCORES,
} from './config.js';
import {
  makePlayer, makeBolt, makePickup, makeParticle, burst,
  updatePlayer, updateDebris, updateHunter, updateBolt, updateOrb,
  updatePickup, updateParticles, clampToArena,
} from './entities.js';
import { makeWaveState, startWave, updateWave, rollUpgrades, applyUpgrade, rollPickupType } from './waves.js';
import { input, keyDown, keyPressed, thrustHeld, fireTapped, endFrameInput } from './input.js';
import { gravityAt, distToCenter, circlesHit, clamp, mulberry32 } from './physics.js';
import * as audio from './audio.js';

export const BEST_KEY = 'orbital-decay-best';
export const BEST_WAVE_KEY = 'orbital-decay-best-wave';

export function loadBest() {
  try {
    return {
      best: parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0,
      bestWave: parseInt(localStorage.getItem(BEST_WAVE_KEY) || '0', 10) || 0,
    };
  } catch (e) { return { best: 0, bestWave: 0 }; }
}

export function makeGame() {
  const saved = loadBest();
  return {
    state: 'title', // title | playing | upgrade | paused | over
    prevState: 'playing',
    time: 0,
    player: makePlayer(),
    debris: [],
    hunters: [],
    bolts: [],
    orbs: [],
    pickups: [],
    particles: [],
    trail: [],
    wave: makeWaveState(),
    shiftDeg: 0,
    score: 0,
    multiplier: 1,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    shifts: 0,
    shake: 0,
    best: saved.best,
    bestWave: saved.bestWave,
    newBest: false,
    stars: 0,
    stats: { wave: 0, kills: 0, shifts: 0, accuracy: 0, time: '0:00' },
    upgradeCards: [],
    hoverCard: -1,
    rng: mulberry32((Math.random() * 1e9) | 0),
    overTimer: 0,
  };
}

function saveBest(game) {
  try {
    localStorage.setItem(BEST_KEY, String(game.best));
    localStorage.setItem(BEST_WAVE_KEY, String(game.bestWave));
  } catch (e) { /* storage unavailable; best score just is not kept */ }
}

export function startRun(game) {
  game.player = makePlayer();
  game.debris = [];
  game.hunters = [];
  game.bolts = [];
  game.orbs = [];
  game.pickups = [];
  game.particles = [];
  game.trail = [];
  game.wave = makeWaveState();
  game.shiftDeg = 0;
  game.score = 0;
  game.time = 0;
  game.multiplier = 1;
  game.combo = 0;
  game.comboTimer = 0;
  game.kills = 0;
  game.shotsFired = 0;
  game.shotsHit = 0;
  game.shifts = 0;
  game.shake = 0;
  game.newBest = false;
  game.stars = 0;
  game.state = 'playing';
  startWave(game.wave, 1);
}

function addScore(game, base, x, y) {
  let s = base * game.multiplier;
  if (distToCenter(x, y) < DANGER_R) s *= 2; // danger-zone bonus
  game.score += s;
}

function registerKill(game, x, y, score) {
  game.kills++;
  game.combo++;
  game.comboTimer = COMBO_WINDOW;
  game.multiplier = Math.min(1 + Math.floor(game.combo / 2), COMBO_MAX);
  addScore(game, score, x, y);
}

function dropPickup(game, x, y) {
  if (game.rng() > PICKUP.dropChance) return;
  game.pickups.push(makePickup(x, y, rollPickupType(game.rng)));
}

function hurtPlayer(game) {
  const p = game.player;
  if (p.invuln > 0 || !p.alive) return;
  p.shield -= 1;
  p.invuln = PLAYER.invuln;
  game.shake = 14;
  game.combo = 0;
  game.multiplier = 1;
  audio.playHurt();
  burst(game.particles, p.x, p.y, 24, '#ff5d73', 260, 0.6);
  if (p.shield <= 0) killPlayer(game);
}

function killPlayer(game) {
  const p = game.player;
  p.alive = false;
  game.shake = 22;
  audio.playExplosion();
  burst(game.particles, p.x, p.y, 70, '#7df9ff', 380, 1.1);
  burst(game.particles, p.x, p.y, 40, '#ff5d73', 260, 0.9);
  game.state = 'over';
  game.overTimer = 0;
  const s = game.stats;
  s.wave = game.wave.wave;
  s.kills = game.kills;
  s.shifts = game.shifts;
  s.accuracy = game.shotsFired > 0 ? Math.round((game.shotsHit / game.shotsFired) * 100) : 0;
  const mins = Math.floor(game.time / 60);
  const secs = Math.floor(game.time % 60);
  s.time = mins + ':' + String(secs).padStart(2, '0');
  game.stars = STAR_SCORES.filter((t) => game.score >= t).length;
  if (game.score > game.best) {
    game.best = game.score;
    game.newBest = true;
  }
  if (game.wave.wave > game.bestWave) game.bestWave = game.wave.wave;
  saveBest(game);
  audio.playGameOver();
}

function fireBolt(game) {
  const p = game.player;
  if (!p.alive || p.fireTimer > 0 || p.fuel < PLAYER.fireCost) return;
  p.fireTimer = p.fireCooldown;
  p.fuel -= PLAYER.fireCost;
  game.shotsFired++;
  const ang = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
  p.angle = ang;
  game.bolts.push(makeBolt(p.x + Math.cos(ang) * 18, p.y + Math.sin(ang) * 18, ang, p.damage, p.pierce));
  audio.playShoot();
}

function doShift(game, dir) {
  const p = game.player;
  if (!p.alive || p.shiftTimer > 0) return;
  p.shiftTimer = p.shiftCooldown;
  game.shiftDeg = (game.shiftDeg + 90 * dir + 360) % 360;
  game.shifts++;
  audio.playShift();
  burst(game.particles, p.x, p.y, 18, '#c084fc', 200, 0.5);
}

function waveCleared(game) {
  const bonus = 100 * game.wave.wave;
  game.score += bonus;
  audio.playWaveClear();
  game.upgradeCards = rollUpgrades(game.rng);
  game.hoverCard = -1;
  game.state = 'upgrade';
}

function pickUpgrade(game, i) {
  const card = game.upgradeCards[i];
  if (!card) return;
  const line = applyUpgrade(game.player, card);
  void line;
  audio.playUpgrade();
  game.upgradeCards = [];
  // Grace period: clear lingering enemy shots and shield the player
  // for a second, so the new wave never opens with an unfair hit.
  game.orbs = [];
  game.player.invuln = Math.max(game.player.invuln, 1);
  startWave(game.wave, game.wave.wave + 1);
  game.state = 'playing';
}

// One fixed update step (dt seconds) for the playing state.
function updatePlaying(game, dt) {
  const p = game.player;
  game.time += dt;

  // --- input: thrust, fire, gravity shift
  const thrusting = thrustHeld();
  updatePlayer(p, dt, game.shiftDeg, input.mouseX, input.mouseY, thrusting);
  if (thrusting && p.fuel > 0) {
    game.trail.push({ x: p.x, y: p.y });
    if (game.trail.length > 26) game.trail.shift();
    if (Math.random() < 0.5) {
      game.particles.push(makeParticle(
        p.x - Math.cos(p.angle) * 12, p.y - Math.sin(p.angle) * 12,
        -Math.cos(p.angle) * 60 + (Math.random() - 0.5) * 40,
        -Math.sin(p.angle) * 60 + (Math.random() - 0.5) * 40,
        0.35, 1.6, '#ffb703',
      ));
    }
  } else if (game.trail.length > 0) {
    game.trail.shift();
  }
  if (fireTapped() || keyPressed('f') || keyPressed('j')) fireBolt(game);
  if (keyDown('f') || keyDown('j')) fireBolt(game); // hold F/J: auto-fire
  if (keyPressed('q') || keyPressed('a')) doShift(game, -1);
  if (keyPressed('e') || keyPressed('d')) doShift(game, 1);

  // --- combo decay
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) { game.combo = 0; game.multiplier = 1; }
  }

  // --- waves
  const waveState = updateWave(game.wave, dt, game);

  // --- enemies
  for (let i = game.debris.length - 1; i >= 0; i--) {
    const d = game.debris[i];
    if (!updateDebris(d, dt, game.shiftDeg)) {
      // Swallowed by the singularity.
      burst(game.particles, d.x, d.y, 8, '#b8a6d9', 120, 0.4);
      game.debris.splice(i, 1);
    }
  }
  for (let i = game.hunters.length - 1; i >= 0; i--) {
    const h = game.hunters[i];
    h.fired = false;
    if (!updateHunter(h, dt, game.shiftDeg, p, game.orbs)) {
      burst(game.particles, h.x, h.y, 10, '#ff5d73', 140, 0.4);
      game.hunters.splice(i, 1);
    } else if (h.fired) {
      audio.playShoot();
    }
  }

  // --- bolts
  for (let i = game.bolts.length - 1; i >= 0; i--) {
    const b = game.bolts[i];
    if (!updateBolt(b, dt, game.shiftDeg)) { game.bolts.splice(i, 1); continue; }
    let dead = false;
    for (let j = game.debris.length - 1; j >= 0; j--) {
      const d = game.debris[j];
      if (b.hitSet.has(d)) continue;
      if (circlesHit(b, d)) {
        b.hitSet.add(d);
        if (!b.counted) { b.counted = true; game.shotsHit++; }
        d.hp -= b.damage;
        burst(game.particles, b.x, b.y, 8, '#ffe066', 180, 0.35);
        audio.playHit();
        if (d.hp <= 0) {
          burst(game.particles, d.x, d.y, 22, '#b8a6d9', 260, 0.6);
          registerKill(game, d.x, d.y, DEBRIS.score);
          dropPickup(game, d.x, d.y);
          game.debris.splice(j, 1);
        }
        if (b.pierce <= 0) { dead = true; break; }
        b.pierce--;
      }
    }
    if (dead) { game.bolts.splice(i, 1); continue; }
    for (let j = game.hunters.length - 1; j >= 0; j--) {
      const h = game.hunters[j];
      if (b.hitSet.has(h)) continue;
      if (circlesHit(b, h)) {
        b.hitSet.add(h);
        if (!b.counted) { b.counted = true; game.shotsHit++; }
        h.hp -= b.damage;
        burst(game.particles, b.x, b.y, 8, '#ffe066', 180, 0.35);
        audio.playHit();
        if (h.hp <= 0) {
          burst(game.particles, h.x, h.y, 30, '#ff5d73', 300, 0.7);
          audio.playExplosion();
          registerKill(game, h.x, h.y, HUNTER.score);
          dropPickup(game, h.x, h.y);
          game.hunters.splice(j, 1);
        }
        if (b.pierce <= 0) { dead = true; break; }
        b.pierce--;
      }
    }
    if (dead) game.bolts.splice(i, 1);
  }

  // --- enemy orbs
  for (let i = game.orbs.length - 1; i >= 0; i--) {
    const o = game.orbs[i];
    if (!updateOrb(o, dt, game.shiftDeg)) { game.orbs.splice(i, 1); continue; }
    if (p.alive && circlesHit(o, p)) {
      hurtPlayer(game);
      game.orbs.splice(i, 1);
    }
  }

  // --- pickups
  for (let i = game.pickups.length - 1; i >= 0; i--) {
    const pk = game.pickups[i];
    updatePickup(pk, dt, p, 1);
    if (p.alive && circlesHit(pk, p)) {
      if (pk.type === 'fuel') p.fuel = Math.min(p.maxFuel, p.fuel + PICKUP.fuel);
      else p.shield = Math.min(p.maxShield, p.shield + 1);
      burst(game.particles, pk.x, pk.y, 12, pk.type === 'fuel' ? '#4ade80' : '#60a5fa', 160, 0.5);
      audio.playPickup();
      game.pickups.splice(i, 1);
    }
  }

  // --- collisions: player vs debris / hunters
  if (p.alive) {
    for (const d of game.debris) {
      if (circlesHit(d, p)) { hurtPlayer(game); break; }
    }
    if (p.alive) {
      for (const h of game.hunters) {
        if (circlesHit(h, p)) { hurtPlayer(game); break; }
      }
    }
    // Falling into the singularity hurts, then throws the ship back out.
    const dc = distToCenter(p.x, p.y);
    if (dc < 46) {
      hurtPlayer(game);
      if (!p.alive) return; // died on impact: do not move a dead ship
      const ang = Math.atan2(p.y - ARENA.cy, p.x - ARENA.cx);
      p.x = ARENA.cx + Math.cos(ang) * 90;
      p.y = ARENA.cy + Math.sin(ang) * 90;
      p.vx = Math.cos(ang) * 260;
      p.vy = Math.sin(ang) * 260;
    }
  }

  updateParticles(game.particles, dt);
  game.shake = Math.max(0, game.shake - dt * 26);
  audio.setHumFromRadius(distToCenter(p.x, p.y));

  if (waveState === 'clear' && game.state === 'playing') waveCleared(game);
}

// The one entry point the main loop calls each fixed step.
export function update(game, dt) {
  if (game.state === 'title') {
    game.time += dt;
    updateParticles(game.particles, dt);
    // Ambient demo: a few sparks orbit the singularity behind the title.
    if (Math.random() < 0.1) {
      const a = Math.random() * Math.PI * 2;
      game.particles.push(makeParticle(
        ARENA.cx + Math.cos(a) * 120, ARENA.cy + Math.sin(a) * 120,
        -Math.sin(a) * 60, Math.cos(a) * 60, 1.2, 1.8, '#c084fc',
      ));
    }
    if (keyPressed('enter') || fireTapped()) {
      audio.playClick();
      startRun(game);
    }
    endFrameInput();
    return;
  }
  if (game.state === 'upgrade') {
    game.time += dt;
    // Hover + click on cards (mouse position is in logical coordinates).
    const cw = 300, ch = 240, gap = 36;
    const total = cw * 3 + gap * 2;
    const x0 = (ARENA.w - total) / 2;
    game.hoverCard = -1;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (cw + gap);
      if (input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= 220 && input.mouseY <= 220 + ch) {
        game.hoverCard = i;
        if (fireTapped()) pickUpgrade(game, i);
      }
    }
    if (keyPressed('1')) pickUpgrade(game, 0);
    if (keyPressed('2')) pickUpgrade(game, 1);
    if (keyPressed('3')) pickUpgrade(game, 2);
    endFrameInput();
    return;
  }
  if (game.state === 'paused') {
    if (keyPressed('p') || keyPressed('escape')) { game.state = game.prevState; audio.playClick(); }
    if (keyPressed('r')) startRun(game);
    if (keyPressed('t')) { game.state = 'title'; }
    endFrameInput();
    return;
  }
  if (game.state === 'over') {
    game.overTimer += dt;
    updateParticles(game.particles, dt);
    if (game.overTimer > 0.6 && (keyPressed('r') || keyPressed('enter'))) startRun(game);
    if (game.overTimer > 0.6 && keyPressed('t')) game.state = 'title';
    // Click the PLAY AGAIN button.
    if (game.overTimer > 0.6 && fireTapped()) {
      if (input.mouseX >= ARENA.w / 2 - 110 && input.mouseX <= ARENA.w / 2 + 110 &&
          input.mouseY >= 520 && input.mouseY <= 572) startRun(game);
    }
    endFrameInput();
    return;
  }
  if (game.state === 'playing') {
    if (keyPressed('p') || keyPressed('escape')) {
      game.prevState = 'playing';
      game.state = 'paused';
      audio.playClick();
      return;
    }
    updatePlaying(game, dt);
  }
  endFrameInput();
}
