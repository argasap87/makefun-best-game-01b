// shots.js — deterministic screenshot scenes for ORBITAL DECAY.
// ?shot=title|play|upgrade|over&seed=N builds a fixed scene from a
// seeded RNG (no wall clock, no real input) and sets window.__shotReady
// once the scene is drawn, so a headless browser can capture it.
// These are real renders of the game's own code, never edited images.

import { ARENA } from './config.js';
import { makeGame, startRun } from './game.js';
import { makeDebris, makeHunter, makeBolt, makePickup, makeParticle, burst } from './entities.js';
import { rollUpgrades } from './waves.js';
import { mulberry32 } from './physics.js';

function scatterEnemies(game, rng, nDebris, nHunters) {
  for (let i = 0; i < nDebris; i++) {
    const d = makeDebris(rng, 1, 1.15);
    // Pull them into the arena instead of off the edges.
    d.x = 120 + rng() * (ARENA.w - 240);
    d.y = 80 + rng() * (ARENA.h - 160);
    d.vx = (rng() - 0.5) * 120;
    d.vy = (rng() - 0.5) * 120;
    game.debris.push(d);
  }
  for (let i = 0; i < nHunters; i++) {
    const h = makeHunter(rng, 1, 1.1);
    h.x = 150 + rng() * (ARENA.w - 300);
    h.y = 90 + rng() * (ARENA.h - 180);
    game.hunters.push(h);
  }
}

function seedBolts(game) {
  const p = game.player;
  for (let i = 0; i < 3; i++) {
    const a = -0.4 - i * 0.35;
    game.bolts.push(makeBolt(p.x + Math.cos(a) * (60 + i * 55), p.y + Math.sin(a) * (60 + i * 55), a, 1, 0));
  }
  game.bolts.push(makeBolt(p.x - 180, p.y - 90, 0.3, 1, 0));
}

function seedPickups(game) {
  game.pickups.push(makePickup(900, 220, 'fuel'));
  game.pickups.push(makePickup(330, 480, 'shield'));
}

function seedParticles(game) {
  burst(game.particles, 760, 300, 26, '#ffe066', 240, 0.7);
  burst(game.particles, 420, 430, 18, '#b8a6d9', 200, 0.6);
}

// Build one named scene on a fresh game. Returns the game.
export function buildShotScene(name, seed) {
  const rng = mulberry32(seed || 1);
  const game = makeGame();
  game.best = 12480;
  game.bestWave = 6;
  if (name === 'title') {
    game.state = 'title';
    return game;
  }
  startRun(game);
  // Shot scenes are frozen mid-run: no wave-start banner.
  game.wave.banner = 0;
  // Fast-forward to a mid-run feel: wave 4, some score, some wear.
  game.wave.wave = 4;
  game.score = 2450;
  game.multiplier = 3;
  game.combo = 5;
  game.comboTimer = 1.8;
  game.player.fuel = 62;
  game.player.shield = 2;
  game.player.x = 520;
  game.player.y = 430;
  game.player.vx = 190;
  game.player.vy = -60;
  game.player.angle = -0.5;
  game.player.thrusting = true;
  game.shiftDeg = 90;
  game.trail = [];
  for (let i = 0; i < 22; i++) {
    game.trail.push({ x: 520 - i * 9, y: 430 + i * 4 });
  }
  scatterEnemies(game, rng, 9, 3);
  seedBolts(game);
  seedPickups(game);
  seedParticles(game);

  if (name === 'play') {
    game.state = 'playing';
    return game;
  }
  if (name === 'upgrade') {
    game.state = 'upgrade';
    game.upgradeCards = rollUpgrades(rng);
    game.hoverCard = 1;
    return game;
  }
  if (name === 'over') {
    game.state = 'over';
    game.overTimer = 2;
    game.score = 9870;
    game.stars = 2;
    game.newBest = false;
    game.stats = { wave: 6, kills: 47, shifts: 12, accuracy: 61, time: '4:37' };
    game.player.alive = false;
    burst(game.particles, game.player.x, game.player.y, 40, '#7df9ff', 300, 1.0);
    return game;
  }
  game.state = 'playing';
  return game;
}

// Parse ?shot=... from the URL. Returns { name, seed } or null.
export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const name = q.get('shot');
  if (!name) return null;
  return { name, seed: parseInt(q.get('seed') || '1', 10) || 1 };
}
