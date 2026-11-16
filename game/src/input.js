// input.js — keyboard and mouse state for ORBITAL DECAY.
// The game reads this module every frame; it owns no game logic.
//
// Mouse scheme: a quick left click fires a bolt; holding the button
// (longer than TAP_MS) thrusts toward the cursor instead.

export const TAP_MS = 150;

export const input = {
  mouseX: 640,
  mouseY: 300,
  mouseDown: false, // left button currently held
  mouseDownAt: 0, // performance.now() of the current press
  released: false, // set true for one frame when the left button goes up
  keys: new Set(),
  pressed: new Set(), // keys pressed since the last frame was consumed
};

export function initInput(canvas, onFirstGesture) {
  const rectOf = () => canvas.getBoundingClientRect();
  canvas.addEventListener('mousemove', (e) => {
    const r = rectOf();
    input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    input.mouseDown = true;
    input.mouseDownAt = performance.now();
    if (onFirstGesture) onFirstGesture();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    input.mouseDown = false;
    input.released = true;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
    if (onFirstGesture) onFirstGesture();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { input.keys.clear(); input.mouseDown = false; });
}

// True while the key is held down.
export function keyDown(k) { return input.keys.has(k); }

// True only on the frame the key was pressed; consumed by the game each frame.
export function keyPressed(k) { return input.pressed.has(k); }

export function endFrameInput() {
  input.pressed.clear();
  input.released = false;
}

// Thrust is held with Space, W, ArrowUp, or a long left-mouse hold.
export function thrustHeld() {
  if (keyDown(' ') || keyDown('w') || keyDown('arrowup')) return true;
  return input.mouseDown && (performance.now() - input.mouseDownAt > TAP_MS);
}

// A quick left click (press and release within TAP_MS) counts as a fire tap.
export function fireTapped() {
  return input.released && (performance.now() - input.mouseDownAt <= TAP_MS + 16);
}
