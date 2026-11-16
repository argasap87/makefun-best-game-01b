// waves.js — wave flow and upgrades for ORBITAL DECAY.
// A wave spawns its debris and hunters over time; clearing it offers
// three upgrade cards, and picking one starts the next wave.

import { waveComposition, UPGRADES, PICKUP } from './config.js';
import { makeDebris, makeHunter } from './entities.js';
import { mulberry32 } from './physics.js';

export function makeWaveState() {
  return {
    wave: 0,
    spawning: false,
    spawnTimer: 0,
    toSpawnDebris: 0,
    toSpawnHunters: 0,
    comp: null,
    rng: mulberry32((Math.random() * 1e9) | 0),
    banner: 0, // seconds left on the "WAVE N" banner
    bannerText: '',
  };
}

export function startWave(ws, n) {
  ws.wave = n;
  ws.comp = waveComposition(n);
  ws.toSpawnDebris = ws.comp.debris;
  ws.toSpawnHunters = ws.comp.hunters;
  ws.spawnTimer = 0.5;
  ws.spawning = true;
  ws.banner = 2.2;
  ws.bannerText = 'WAVE ' + n;
}

// Returns 'clear' when the wave is fully spawned and nothing hostile
// is left, 'spawning' while enemies are still arriving, 'fighting'
// while enemies remain. The game decides what to do with 'clear'.
export function updateWave(ws, dt, game) {
  if (ws.banner > 0) ws.banner -= dt;
  if (!ws.spawning) {
    if (game.debris.length === 0 && game.hunters.length === 0 && game.orbs.length === 0) {
      return 'clear';
    }
    return 'fighting';
  }
  ws.spawnTimer -= dt;
  if (ws.spawnTimer > 0) return 'spawning';
  ws.spawnTimer = ws.comp.spawnInterval;
  const rng = ws.rng;
  if (ws.toSpawnDebris > 0) {
    ws.toSpawnDebris--;
    game.debris.push(makeDebris(rng, ws.comp.hpBonus, ws.comp.speedBonus));
  } else if (ws.toSpawnHunters > 0) {
    ws.toSpawnHunters--;
    game.hunters.push(makeHunter(rng, ws.comp.hpBonus, ws.comp.speedBonus));
  } else {
    ws.spawning = false;
  }
  return 'spawning';
}

// Three upgrade cards, one from each role, so every draft offers a
// real choice instead of "always take damage": one offensive card
// (damage / pierce / fire rate), one defensive card (fuel / shield),
// one utility card (thrust / shift / magnet).
const UPGRADE_ROLES = {
  offense: ['damage', 'pierce', 'rapid'],
  defense: ['tank', 'plating'],
  utility: ['thrust', 'gyro', 'magnet'],
};

export function rollUpgrades(rng) {
  const byId = new Map(UPGRADES.map((u) => [u.id, u]));
  const pick = (ids) => byId.get(ids[Math.floor(rng() * ids.length)]);
  return [pick(UPGRADE_ROLES.offense), pick(UPGRADE_ROLES.defense), pick(UPGRADE_ROLES.utility)];
}

// Apply one upgrade card to the player. Returns a short line for the log.
export function applyUpgrade(player, card) {
  switch (card.id) {
    case 'thrust':
      player.thrust *= 1.35;
      return 'Thrust +35%';
    case 'damage':
      player.damage += 1;
      return 'Bolt damage +1';
    case 'tank':
      player.maxFuel += 40;
      player.fuel = Math.min(player.maxFuel, player.fuel + 40);
      return 'Max fuel +40, refilled';
    case 'plating':
      player.maxShield += 1;
      player.shield = Math.min(player.maxShield, player.shield + 1);
      return 'Max shield +1, repaired';
    case 'gyro':
      player.shiftCooldown *= 0.6;
      return 'Gravity shift 40% faster';
    case 'magnet':
      player.magnetR *= 2.5;
      return 'Pickup magnet x2.5';
    case 'rapid':
      player.fireCooldown *= 0.65;
      return 'Fire rate +35%';
    case 'pierce':
      player.pierce += 1;
      return 'Bolts pierce +1 enemy';
    default:
      return 'Upgraded';
  }
}

// Roll a pickup type: fuel cells are common, shield cells are rare.
export function rollPickupType(rng) {
  return rng() < 0.75 ? 'fuel' : 'shield';
}

export { PICKUP };
