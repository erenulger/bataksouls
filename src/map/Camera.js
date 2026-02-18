/**
 * Camera.js
 * Tracks a viewport that follows the player.
 * Converts world coordinates to screen coordinates for rendering.
 *
 * The camera is centered on the player, clamped to map bounds.
 */

export class Camera {
  /**
   * @param {number} canvasW  - Viewport width in pixels
   * @param {number} canvasH  - Viewport height in pixels
   * @param {number} [mapW]   - World map width  (0 = no clamping)
   * @param {number} [mapH]   - World map height (0 = no clamping)
   */
  constructor(canvasW, canvasH, mapW = 0, mapH = 0) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.mapW = mapW;
    this.mapH = mapH;
    this.x = 0; // world-space top-left corner of the viewport
    this.y = 0;
  }

  /**
   * Re-center the camera on the player, clamped to map bounds.
   * @param {{ x: number, y: number, w: number, h: number }} player
   */
  follow(player) {
    // Center camera on player
    this.x = player.x + player.w / 2 - this.canvasW / 2;
    this.y = player.y + player.h / 2 - this.canvasH / 2;

    // Clamp to map bounds (only if map size is known)
    if (this.mapW > 0) this.x = Math.max(0, Math.min(this.x, this.mapW  - this.canvasW));
    if (this.mapH > 0) this.y = Math.max(0, Math.min(this.y, this.mapH  - this.canvasH));
  }

  /**
   * Convert a world-space X coordinate to screen space.
   * @param {number} worldX
   * @returns {number}
   */
  toScreenX(worldX) { return worldX - this.x; }

  /**
   * Convert a world-space Y coordinate to screen space.
   * @param {number} worldY
   * @returns {number}
   */
  toScreenY(worldY) { return worldY - this.y; }

  /**
   * Offset the viewport by a screen-space drag delta.
   * Dragging right (dx > 0) pulls the world right → viewport moves left → camera.x decreases.
   * @param {number} dx - Horizontal drag delta in pixels
   * @param {number} dy - Vertical drag delta in pixels
   */
  pan(dx, dy) {
    this.x -= dx;
    this.y -= dy;
  }

  /** Update canvas size (call on window resize). */
  resize(canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
  }
}
