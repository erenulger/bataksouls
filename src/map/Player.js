/**
 * Player.js
 * Represents the player entity: position, size, speed.
 * Movement is applied by the engine each frame using input + delta time.
 * Collision resolution is handled externally by CollisionSystem.
 */

export class Player {
  /**
   * @param {number} x       - Initial X (world coords)
   * @param {number} y       - Initial Y (world coords)
   * @param {number} [speed] - Pixels per second
   */
  constructor(x, y, speed = 160) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 24;
    this.speed = speed;
  }

  /**
   * Apply movement from an input vector scaled by delta time.
   * Does NOT resolve collisions — that happens after this call.
   * @param {{ dx: number, dy: number }} inputVector
   * @param {number} dt - Delta time in seconds
   */
  move(inputVector, dt) {
    this.x += inputVector.dx * this.speed * dt;
    this.y += inputVector.dy * this.speed * dt;
  }

  /**
   * Axis-aligned bounding box used by the collision system.
   * @returns {{ x: number, y: number, w: number, h: number }}
   */
  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
