/**
 * CollisionSystem.js
 * AABB (Axis-Aligned Bounding Box) collision detection and resolution.
 *
 * Strategy: after the player moves, check all solid entities.
 * For each overlap, compute the minimum push-out vector and
 * correct the player's position along the axis of least penetration.
 */

export class CollisionSystem {
  /**
   * Check the player against all solid entities and resolve overlaps.
   * Mutates player.x and player.y directly.
   *
   * @param {import('./Player.js').Player} player
   * @param {Array<{x: number, y: number, w: number, h: number, solid: boolean}>} entities
   */
  resolve(player, entities) {
    for (const entity of entities) {
      if (!entity.solid) continue;
      this._resolveOne(player, entity);
    }
  }

  /**
   * Resolve overlap between the player and a single solid entity.
   * @private
   */
  _resolveOne(player, entity) {
    const p = player.bounds;

    // Compute overlap on each axis
    const overlapLeft  = (entity.x + entity.w) - p.x;
    const overlapRight = (p.x + p.w)  - entity.x;
    const overlapTop   = (entity.y + entity.h) - p.y;
    const overlapBot   = (p.y + p.h)  - entity.y;

    // No overlap if any axis gap is non-positive
    if (overlapLeft <= 0 || overlapRight <= 0 ||
        overlapTop  <= 0 || overlapBot   <= 0) return;

    // Push out along the axis with the smallest penetration
    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop,  overlapBot);

    if (minX < minY) {
      // Resolve horizontally
      player.x += overlapLeft < overlapRight ? overlapLeft : -overlapRight;
    } else {
      // Resolve vertically
      player.y += overlapTop < overlapBot ? overlapTop : -overlapBot;
    }
  }
}
