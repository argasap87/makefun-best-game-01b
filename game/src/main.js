// main.js — boot and the fixed-step loop of ORBITAL DECAY.
// The game updates at a fixed 60 Hz so play is identical on any
// machine; rendering draws the current state every animation frame.

import { ARENA } from './config.js';
import { makeGame, update, startRun } from './game.js';
import { initInput, input } from './input.js';
import { drawWorld, drawHud, drawTitle, drawUpgrade, drawPaused, drawGameOver } from './render.js';
import { buildShotScene, shotFromUrl } from './shots.js';
import { unlockAudio, toggleMute, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = ARENA.w;
canvas.height = ARENA.h;

const STEP = 1 / 60;
let game = makeGame();
let last = performance.now();
let acc = 0;
let shotMode = false;

function resize() {
  // Fit the 1280x720 arena into the window, keeping its aspect.
  const s = Math.min(window.innerWidth / ARENA.w, window.innerHeight / ARENA.h);
  canvas.style.width = Math.floor(ARENA.w * s) + 'px';
  canvas.style.height = Math.floor(ARENA.h * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

initInput(canvas, () => unlockAudio());

// Mute is a global key, handled here so it works on every screen.
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm') toggleMute();
});

function draw(t) {
  ctx.clearRect(0, 0, ARENA.w, ARENA.h);
  if (game.state === 'title') {
    drawWorld(ctx, game, t);
    drawTitle(ctx, game, t);
    return;
  }
  drawWorld(ctx, game, t);
  if (game.state === 'playing' || game.state === 'paused') drawHud(ctx, game);
  if (game.state === 'upgrade') { drawHud(ctx, game); drawUpgrade(ctx, game); }
  if (game.state === 'paused') drawPaused(ctx);
  if (game.state === 'over') drawGameOver(ctx, game);
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    update(game, STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === 5) acc = 0; // drop backlog rather than spiral
  draw(now / 1000);
  requestAnimationFrame(frame);
}

// Screenshot mode: build a fixed scene, draw it once, signal readiness.
const shot = shotFromUrl();
if (shot) {
  shotMode = true;
  game = buildShotScene(shot.name, shot.seed);
  // Let one real frame run so fonts and state settle, then draw and signal.
  requestAnimationFrame(() => {
    draw(1.25);
    window.__shotReady = true;
  });
} else {
  requestAnimationFrame(frame);
}

// Expose a little for debugging in the console.
window.__game = game;
void shotMode;
void input;
void startRun;
void isMuted;
