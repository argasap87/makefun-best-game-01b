// render.js — every pixel of ORBITAL DECAY is drawn here on one canvas.
// The palette is neon on void: cyan ship, violet singularity, gold bolts,
// red hunters, green fuel. Screenshots are taken from these same draws.

import { ARENA, COLORS, SINGULARITY, DANGER_R, STAR_SCORES } from './config.js';
import { distToCenter, TAU } from './physics.js';

let stars = null;
function getStars() {
  if (stars) return stars;
  const rng = (() => { let s = 1337; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  stars = [];
  for (let i = 0; i < 160; i++) {
    stars.push({ x: rng() * ARENA.w, y: rng() * ARENA.h, r: 0.5 + rng() * 1.4, tw: rng() * TAU });
  }
  return stars;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align, font, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.font = (font || 'bold ') + size + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || COLORS.text;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function drawBackground(ctx, t, shakeX, shakeY) {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(-20, -20, ARENA.w + 40, ARENA.h + 40);

  // Faint radial nebula around the singularity.
  const neb = ctx.createRadialGradient(ARENA.cx, ARENA.cy, 40, ARENA.cx, ARENA.cy, 520);
  neb.addColorStop(0, 'rgba(124,58,237,0.20)');
  neb.addColorStop(0.5, 'rgba(56,89,199,0.08)');
  neb.addColorStop(1, 'rgba(5,7,15,0)');
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);

  // Twinkling stars.
  for (const s of getStars()) {
    const a = 0.35 + 0.35 * Math.sin(t * 1.3 + s.tw);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Faint polar grid rings, for reading distances at a glance.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (const r of [120, 200, 300, 420]) {
    ctx.beginPath();
    ctx.arc(ARENA.cx, ARENA.cy, r, 0, TAU);
    ctx.stroke();
  }
  // Danger ring: inside this, score doubles.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,46,99,0.28)';
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.arc(ARENA.cx, ARENA.cy, DANGER_R, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function drawSingularity(ctx, t, shiftDeg) {
  const pulse = 1 + Math.sin(t * 2.2) * 0.06;
  // Accretion glow.
  const glow = ctx.createRadialGradient(ARENA.cx, ARENA.cy, 4, ARENA.cx, ARENA.cy, 90);
  glow.addColorStop(0, 'rgba(192,132,252,0.55)');
  glow.addColorStop(0.4, 'rgba(124,58,237,0.22)');
  glow.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ARENA.cx, ARENA.cy, 90, 0, TAU);
  ctx.fill();
  // Event horizon.
  ctx.fillStyle = COLORS.singularity;
  ctx.beginPath();
  ctx.arc(ARENA.cx, ARENA.cy, SINGULARITY.r * pulse, 0, TAU);
  ctx.fill();
  // Photon ring.
  ctx.strokeStyle = COLORS.singularityRing;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = COLORS.singularityRing;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(ARENA.cx, ARENA.cy, SINGULARITY.r * pulse + 3, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Orbiting sparks.
  for (let i = 0; i < 10; i++) {
    const a = t * (0.9 + i * 0.05) + (i * TAU) / 10;
    const r = 44 + (i % 3) * 9;
    ctx.fillStyle = 'rgba(216,180,254,0.8)';
    ctx.beginPath();
    ctx.arc(ARENA.cx + Math.cos(a) * r, ARENA.cy + Math.sin(a) * r, 1.6, 0, TAU);
    ctx.fill();
  }
  // Gravity-shift indicator: three chevrons riding a dashed ring, their
  // positions jumping with the shift, so the gravity state is visible
  // at a glance — the mechanic reads in a screenshot, not just in play.
  ctx.save();
  ctx.strokeStyle = 'rgba(192,132,252,0.5)';
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(ARENA.cx, ARENA.cy, 56, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#d8b4fe';
  for (let i = 0; i < 3; i++) {
    const a = (((shiftDeg || 0) + i * 120) * Math.PI) / 180 - Math.PI / 2;
    const x = ARENA.cx + Math.cos(a) * 56;
    const y = ARENA.cy + Math.sin(a) * 56;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawShip(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const blink = p.invuln > 0 && Math.floor(t * 16) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  // Thrust flame.
  if (p.thrusting && p.fuel > 0) {
    const fl = 14 + Math.random() * 10;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-10 - fl, 0);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 14;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -9);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 9);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDebris(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.rot);
  ctx.fillStyle = COLORS.debris;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < d.verts; i++) {
    const a = (i / d.verts) * TAU;
    const rr = d.r * (0.75 + 0.25 * Math.sin(d.seed * 20 + i * 2.7));
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // HP pips for tough debris.
  if (d.maxHp > 1) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(d.hp), 0, 0);
  }
  ctx.restore();
}

function drawHunter(ctx, h, t) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.angle);
  ctx.shadowColor = COLORS.hunter;
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.hunter;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-11, -10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2b0a12';
  ctx.beginPath();
  ctx.arc(3, 0, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  // HP bar.
  if (h.hp < h.maxHp) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(h.x - 14, h.y - 24, 28, 4);
    ctx.fillStyle = COLORS.hunter;
    ctx.fillRect(h.x - 14, h.y - 24, 28 * (h.hp / h.maxHp), 4);
  }
}

function drawPickups(ctx, pickups, t) {
  for (const pk of pickups) {
    const bob = Math.sin(pk.bob) * 2;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    const col = pk.type === 'fuel' ? COLORS.fuel : COLORS.shield;
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, pk.r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04120a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pk.type === 'fuel' ? 'F' : 'S', 0, 0);
    ctx.restore();
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrail(ctx, trail) {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const a = i / trail.length;
    ctx.strokeStyle = `rgba(125,249,255,${a * 0.5})`;
    ctx.lineWidth = 1 + a * 2;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }
}

export function drawWorld(ctx, game, t) {
  const sh = game.shake;
  const shX = sh > 0 ? (Math.random() - 0.5) * sh : 0;
  const shY = sh > 0 ? (Math.random() - 0.5) * sh : 0;
  drawBackground(ctx, t, shX, shY);
  ctx.save();
  ctx.translate(shX, shY);
  drawSingularity(ctx, t, game.shiftDeg);
  drawTrail(ctx, game.trail);
  for (const b of game.bolts) {
    ctx.save();
    ctx.shadowColor = COLORS.bolt;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = COLORS.bolt;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  for (const o of game.orbs) {
    ctx.save();
    ctx.shadowColor = COLORS.orb;
    ctx.shadowBlur = 10;
    ctx.fillStyle = COLORS.orb;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  drawPickups(ctx, game.pickups, t);
  for (const d of game.debris) drawDebris(ctx, d);
  for (const h of game.hunters) drawHunter(ctx, h, t);
  drawParticles(ctx, game.particles);
  if (game.player.alive) drawShip(ctx, game.player, t);
  ctx.restore();
}

// --- HUD -----------------------------------------------------------------

export function drawHud(ctx, game) {
  const p = game.player;
  // Top bar: score left, wave center, best right.
  text(ctx, 'SCORE ' + game.score.toLocaleString('en-US'), 24, 30, 24, COLORS.text, 'left');
  if (game.multiplier > 1) {
    text(ctx, 'x' + game.multiplier + ' COMBO', 24, 58, 16, COLORS.gold, 'left');
  }
  text(ctx, 'WAVE ' + Math.max(1, game.wave.wave), ARENA.w / 2, 30, 24, COLORS.text, 'center');
  text(ctx, 'BEST ' + game.best.toLocaleString('en-US'), ARENA.w - 24, 30, 20, COLORS.dim, 'right');

  // Fuel bar (bottom left) and shield pips.
  const bx = 24, by = ARENA.h - 44, bw = 220, bh = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, bx, by, bw, bh, 7);
  ctx.fill();
  ctx.fillStyle = p.fuel > 25 ? COLORS.fuel : COLORS.danger;
  if (p.fuel > 0) {
    roundRect(ctx, bx, by, bw * (p.fuel / p.maxFuel), bh, 7);
    ctx.fill();
  }
  text(ctx, 'FUEL', bx, by - 14, 12, COLORS.dim, 'left');
  for (let i = 0; i < p.maxShield; i++) {
    ctx.save();
    ctx.translate(bx + 8 + i * 26, by - 34);
    ctx.fillStyle = i < p.shield ? COLORS.shield : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(7, 0); ctx.lineTo(0, 8); ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  text(ctx, 'SHIELD', bx + 8 + p.maxShield * 26 + 8, by - 34, 12, COLORS.dim, 'left');

  // Gravity-shift dial (bottom right): Q/E rotates gravity, shown as an arrow.
  const cx = ARENA.w - 60, cy = ARENA.h - 60;
  const ready = p.shiftTimer <= 0;
  ctx.save();
  ctx.globalAlpha = ready ? 1 : 0.45;
  ctx.strokeStyle = COLORS.singularityRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, TAU);
  ctx.stroke();
  if (!ready) {
    ctx.fillStyle = 'rgba(192,132,252,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.shiftTimer / p.shiftCooldown));
    ctx.closePath();
    ctx.fill();
  }
  const ga = (game.shiftDeg * Math.PI) / 180 - Math.PI / 2;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ga) * 18, cy + Math.sin(ga) * 18);
  ctx.stroke();
  ctx.restore();
  text(ctx, 'GRAVITY  Q / E', cx, cy + 40, 12, COLORS.dim, 'center');
  text(ctx, 'THRUST: HOLD CLICK OR SPACE   FIRE: TAP CLICK OR F', ARENA.w / 2, ARENA.h - 16, 12, COLORS.dim, 'center');

  // Wave banner.
  if (game.wave.banner > 0) {
    const a = Math.min(1, game.wave.banner);
    text(ctx, game.wave.bannerText, ARENA.w / 2, 150, 52, COLORS.text, 'center', 'bold ', a);
  }
  // Danger-zone warning, only while actually playing (not on overlays).
  if (game.state === 'playing' && game.player.alive && distToCenter(p.x, p.y) < DANGER_R) {
    text(ctx, 'DANGER ZONE — SCORE x2', ARENA.w / 2, 96, 16, COLORS.danger, 'center');
  }
}

// --- Screens ---------------------------------------------------------------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(5,10,24,0.82)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125,249,255,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

export function drawTitle(ctx, game, t) {
  panel(ctx, ARENA.w / 2 - 360, 130, 720, 460);
  text(ctx, 'ORBITAL', ARENA.w / 2, 205, 64, COLORS.player, 'center');
  text(ctx, 'DECAY', ARENA.w / 2, 270, 64, COLORS.singularityRing, 'center');
  text(ctx, 'One singularity. One ship. Gravity is your weapon.', ARENA.w / 2, 325, 18, COLORS.dim, 'center');
  text(ctx, 'HOLD CLICK / SPACE — thrust toward the cursor', ARENA.w / 2, 385, 17, COLORS.text, 'center');
  text(ctx, 'TAP CLICK / F — fire a bolt  (costs 2 fuel)', ARENA.w / 2, 412, 17, COLORS.text, 'center');
  text(ctx, 'Q / E — rotate gravity 90°   P — pause   M — mute', ARENA.w / 2, 439, 17, COLORS.text, 'center');
  text(ctx, 'Clear each wave, pick an upgrade, survive the decay.', ARENA.w / 2, 478, 16, COLORS.dim, 'center');
  const pulse = 0.65 + 0.35 * Math.sin(t * 3);
  text(ctx, 'CLICK OR PRESS ENTER TO START', ARENA.w / 2, 535, 22, COLORS.gold, 'center', 'bold ', pulse);
  if (game.best > 0) {
    text(ctx, 'BEST  ' + game.best.toLocaleString('en-US') + '   ·   BEST WAVE  ' + game.bestWave, ARENA.w / 2, 568, 15, COLORS.dim, 'center');
  }
}

export function drawUpgrade(ctx, game) {
  ctx.fillStyle = 'rgba(3,6,14,0.55)';
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  text(ctx, 'WAVE ' + game.wave.wave + ' CLEARED', ARENA.w / 2, 120, 40, COLORS.gold, 'center');
  text(ctx, 'Choose one upgrade  —  click a card or press 1 / 2 / 3', ARENA.w / 2, 165, 18, COLORS.text, 'center');
  const cw = 300, ch = 240, gap = 36;
  const total = cw * 3 + gap * 2;
  const x0 = (ARENA.w - total) / 2;
  game.upgradeCards.forEach((card, i) => {
    const x = x0 + i * (cw + gap);
    const y = 220;
    const hov = game.hoverCard === i;
    ctx.save();
    if (hov) { ctx.translate(0, -8); ctx.shadowColor = COLORS.player; ctx.shadowBlur = 24; }
    panel(ctx, x, y, cw, ch);
    ctx.shadowBlur = 0;
    text(ctx, card.icon, x + cw / 2, y + 62, 52, COLORS.player, 'center');
    text(ctx, card.name, x + cw / 2, y + 130, 20, COLORS.text, 'center');
    text(ctx, card.desc, x + cw / 2, y + 168, 15, COLORS.dim, 'center');
    text(ctx, '[' + (i + 1) + ']', x + cw / 2, y + 208, 15, COLORS.gold, 'center');
    ctx.restore();
  });
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3,6,14,0.6)';
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  text(ctx, 'PAUSED', ARENA.w / 2, ARENA.h / 2 - 30, 48, COLORS.text, 'center');
  text(ctx, 'P — resume    R — restart    T — title screen', ARENA.w / 2, ARENA.h / 2 + 30, 18, COLORS.dim, 'center');
}

export function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(3,6,14,0.55)';
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  panel(ctx, ARENA.w / 2 - 330, 120, 660, 480);
  text(ctx, 'ORBIT DECAYED', ARENA.w / 2, 185, 44, COLORS.danger, 'center');
  const stars = game.stars;
  let starLine = '';
  for (let i = 0; i < 3; i++) starLine += i < stars ? '★ ' : '☆ ';
  text(ctx, starLine.trim(), ARENA.w / 2, 235, 34, COLORS.gold, 'center');
  text(ctx, 'FINAL SCORE  ' + game.score.toLocaleString('en-US'), ARENA.w / 2, 290, 28, COLORS.text, 'center');
  const s = game.stats;
  text(ctx, 'Wave ' + s.wave + '   ·   ' + s.kills + ' kills   ·   ' + s.shifts + ' gravity shifts', ARENA.w / 2, 335, 17, COLORS.dim, 'center');
  text(ctx, 'Accuracy ' + s.accuracy + '%   ·   Time ' + s.time, ARENA.w / 2, 362, 17, COLORS.dim, 'center');
  if (game.newBest) text(ctx, 'NEW BEST!', ARENA.w / 2, 395, 20, COLORS.gold, 'center');
  const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
  text(ctx, 'R — PLAY AGAIN      T — TITLE', ARENA.w / 2, 450, 20, COLORS.text, 'center', 'bold ', pulse);
  text(ctx, 'or click the button below', ARENA.w / 2, 490, 14, COLORS.dim, 'center');
  // A visible restart button (also clickable).
  ctx.fillStyle = COLORS.player;
  roundRect(ctx, ARENA.w / 2 - 110, 520, 220, 52, 12);
  ctx.fill();
  text(ctx, 'PLAY AGAIN', ARENA.w / 2, 547, 20, '#04121a', 'center');
}

export { STAR_SCORES };
