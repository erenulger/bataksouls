/**
 * MouseHandler.js
 * Tracks middle mouse button drag for camera panning.
 *
 * Usage:
 *   const mouse = new MouseHandler(canvas);
 *   // each frame:
 *   if (mouse.isPanning) {
 *     const { dx, dy } = mouse.consumeDelta();
 *     camera.pan(dx, dy);
 *   }
 *   mouse.destroy(); // cleanup when done
 */

export class MouseHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this._canvas   = canvas;
    this.isPanning = false;
    this._lastX    = 0;
    this._lastY    = 0;
    this._dx       = 0;
    this._dy       = 0;

    this._onMouseDown = (e) => {
      if (e.button !== 1) return;
      e.preventDefault(); // suppress browser auto-scroll cursor
      this.isPanning = true;
      this._lastX    = e.clientX;
      this._lastY    = e.clientY;
    };

    this._onMouseMove = (e) => {
      if (!this.isPanning) return;
      this._dx   += e.clientX - this._lastX;
      this._dy   += e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    };

    this._onMouseUp = (e) => {
      if (e.button !== 1) return;
      this.isPanning = false;
    };

    // Prevent the default middle-click scroll/autoscroll on Windows
    this._onAuxClick = (e) => { if (e.button === 1) e.preventDefault(); };

    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('auxclick',  this._onAuxClick);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup',   this._onMouseUp);
  }

  /**
   * Returns the accumulated drag delta since the last call and resets it.
   * @returns {{ dx: number, dy: number }}
   */
  consumeDelta() {
    const delta = { dx: this._dx, dy: this._dy };
    this._dx = 0;
    this._dy = 0;
    return delta;
  }

  /** Remove DOM listeners when the engine shuts down. */
  destroy() {
    this._canvas.removeEventListener('mousedown', this._onMouseDown);
    this._canvas.removeEventListener('auxclick',  this._onAuxClick);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup',   this._onMouseUp);
  }
}
