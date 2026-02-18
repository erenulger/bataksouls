/**
 * TriggerSystem.js
 * Detects overlap between the player and triggerable entities (enemies, chests,
 * doors, NPCs, …). Unlike CollisionSystem, this does NOT push the player out —
 * it only reports which entities are being touched this frame.
 *
 * Any entity with `triggerable: true` in its EntityType definition is checked.
 * The engine decides what to do with the results (start combat, open a chest, …).
 */

export class TriggerSystem {
  /**
   * Return every triggerable entity that overlaps the player this frame.
   *
   * @param {import('./Player.js').Player} player
   * @param {Array<Object>} entities
   * @returns {Array<Object>} triggered entities
   */
  check(player, entities) {
    const triggered = [];
    const p = player.bounds;

    for (const entity of entities) {
      if (!entity.triggerable) continue;
      if (this._overlaps(p, entity)) {
        triggered.push(entity);
      }
    }

    return triggered;
  }

  /** @private */
  _overlaps(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }
}
