/**
 * InputHandler.js
 * Tracks which keys are currently held down.
 * Returns a normalized direction vector for WASD movement.
 *
 * Usage:
 *   const input = new InputHandler();
 *   // each frame:
 *   const { dx, dy } = input.getVector();
 *   input.destroy(); // cleanup when done
 */

export class InputHandler {
  constructor() {
    this._held = new Set();
    this._onKeyDown = (e) => this._held.add(e.code);
    this._onKeyUp   = (e) => this._held.delete(e.code);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  /**
   * Returns a direction vector based on held WASD / arrow keys.
   * The vector is normalized so diagonal movement isn't faster.
   * @returns {{ dx: number, dy: number }}
   */
  getVector() {
    let dx = 0;
    let dy = 0;

    if (this._held.has('KeyW') || this._held.has('ArrowUp'))    dy -= 1;
    if (this._held.has('KeyS') || this._held.has('ArrowDown'))  dy += 1;
    if (this._held.has('KeyA') || this._held.has('ArrowLeft'))  dx -= 1;
    if (this._held.has('KeyD') || this._held.has('ArrowRight')) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    return { dx, dy };
  }

  /** Remove DOM listeners when the engine shuts down. */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }
}
