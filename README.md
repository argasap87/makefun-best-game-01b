# ORBITAL DECAY

One singularity. One ship. Gravity is your weapon.

A neon arcade roguelike: pilot a lone satellite around a black hole, slingshot
off its pull, blast debris and hunters, and — the twist — **rotate gravity
itself 90° with Q / E** to fling enemies into the singularity, dodge their
shots, and escape its grip. Clear each wave, pick one of three upgrades, and
survive as long as you can. Score chains into a combo multiplier, and flying
inside the danger ring doubles every point.

## Controls

- **Hold left click / Space / W** — thrust toward the cursor
- **Tap left click / F** — fire a bolt (costs 2 fuel)
- **Q / E (or A / D)** — rotate gravity 90°
- **P** — pause · **M** — mute · **R** — restart · **Enter** — start

## Run

```sh
node serve.ts
# then open http://localhost:8080
```

The game is plain static files under `game/` — no build step, no network
request, no external assets. All art is drawn on canvas and all sound is
synthesized with WebAudio.

## Entry

Built for the [best-game-01 bounty](https://make.fun/bounty/best-game-01) on make.fun.

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/argasap87/makefun-best-game-01b/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/argasap87/makefun-best-game-01b/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
