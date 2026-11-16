// config.js — every tuning number for ORBITAL DECAY in one place.
// The arena is a fixed 1280x720 logical space, scaled to fit the window.

export const ARENA = { w: 1280, h: 720, cx: 640, cy: 360 };
export const SINGULARITY = { r: 26, killR: 30, pull: 40000, maxPull: 600 };

// Player ship.
export const PLAYER = {
  r: 12,
  thrust: 340, // px/s^2 toward the aim point while thrusting
  maxSpeed: 430,
  drag: 0.35, // per second, gentle damping so orbits stay controllable
  maxFuel: 100,
  thrustDrain: 20, // fuel per second
  fuelRegen: 8, // fuel per second, always: the ship is never helpless
  fireCost: 2, // fuel per bolt
  fireCooldown: 0.22, // seconds between bolts
  boltSpeed: 640,
  boltLife: 1.2,
  maxShield: 3,
  invuln: 1.2, // seconds of invulnerability after a hit
  shiftCooldown: 1.2, // seconds between gravity shifts
};

// Enemies.
export const DEBRIS = { rMin: 10, rMax: 18, hp: 1, score: 50, speed: 60 };
export const HUNTER = {
  r: 14, hp: 3, score: 150, speed: 95, steer: 140,
  shotCooldown: 2.6, orbSpeed: 150, orbR: 6,
};
export const ORB = { r: 6, score: 10 };

// Pickups.
export const PICKUP = { r: 11, fuel: 30, magnetR: 90, dropChance: 0.4 };

// Waves: wave n spawns debris and hunters over time.
export function waveComposition(n) {
  return {
    debris: 4 + 2 * n,
    hunters: Math.floor(n / 2),
    spawnInterval: Math.max(0.45, 0.95 - n * 0.04),
    hpBonus: Math.floor((n - 1) / 3), // +1 hp to every enemy every 3 waves
    speedBonus: 1 + Math.min(0.6, (n - 1) * 0.05),
  };
}

// Combo: kills chained within this window raise the multiplier.
export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 5;
export const DANGER_R = 240; // inside this radius of the singularity, score x2

// Stars on the game-over screen, by final score.
export const STAR_SCORES = [3000, 8000, 15000];

// Upgrade cards offered after each cleared wave (pick one of three).
export const UPGRADES = [
  { id: 'thrust', name: 'ION THRUSTERS', desc: '+35% thrust power', icon: '»' },
  { id: 'damage', name: 'HEAVY BOLTS', desc: '+1 bolt damage', icon: '✦' },
  { id: 'tank', name: 'FUEL TANK', desc: '+40 max fuel, refill 40', icon: '▣' },
  { id: 'plating', name: 'ABLATIVE PLATING', desc: '+1 max shield, repair 1', icon: '⬡' },
  { id: 'gyro', name: 'GYRO STABILIZER', desc: 'Gravity shift recharges 40% faster', icon: '↻' },
  { id: 'magnet', name: 'MAGNET COIL', desc: 'Pickup attraction x2.5', icon: '◎' },
  { id: 'rapid', name: 'RAPID CYCLER', desc: 'Fire 35% faster', icon: '≋' },
  { id: 'pierce', name: 'OVERCHARGE', desc: 'Bolts pierce +1 enemy', icon: '⇉' },
];

// Colours: a neon-on-void palette, one accent per system.
export const COLORS = {
  bg: '#05070f',
  grid: 'rgba(90,140,255,0.05)',
  player: '#7df9ff',
  playerCore: '#ffffff',
  bolt: '#ffe066',
  debris: '#b8a6d9',
  hunter: '#ff5d73',
  orb: '#ff8fa3',
  fuel: '#4ade80',
  shield: '#60a5fa',
  singularity: '#0b0b14',
  singularityRing: '#c084fc',
  danger: '#ff2e63',
  text: '#e6f1ff',
  dim: '#8b9bb4',
  gold: '#ffd166',
};
