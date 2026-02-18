/**
 * EntityFactory.js
 * Builds typed entity objects from raw map config data.
 * Merges each entity definition with its type properties from EntityTypes.
 *
 * Supported definition types:
 *
 *   Plain entity:
 *     { type: 'wall' | 'tree' | ..., x, y, w, h }
 *
 *   Wall group (chain of connected wall segments):
 *     {
 *       type: 'wallGroup',
 *       start: { x, y },          // top-left of the first segment
 *       thickness: 16,             // optional, wall thickness (default 16)
 *       segments: [
 *         { dir: 'right', length: 200 },
 *         { dir: 'down',  length: 150 },
 *         { dir: 'left',  length: 200 },
 *         { dir: 'up',    length: 150 },
 *       ]
 *     }
 *
 *   Each segment starts exactly where the previous one ended.
 *   Valid directions: 'right' | 'left' | 'down' | 'up'
 */

import { EntityTypes } from './EntityTypes.js';

export class EntityFactory {
  /**
   * Build a flat list of entity objects from raw map definitions.
   * wallGroup entries are expanded into individual wall entities.
   * Unknown types are skipped with a console warning.
   *
   * @param {Array<Object>} defs
   * @returns {Array<Object>}
   */
  buildAll(defs) {
    const entities = [];

    for (const def of defs) {
      if (def.type === 'wallGroup') {
        for (const wallDef of this._expandWallGroup(def)) {
          entities.push(this._buildOne(wallDef));
        }
      } else {
        const entity = this._buildOne(def);
        if (entity) entities.push(entity);
      }
    }

    return entities;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Merge a single raw def with its EntityTypes properties.
   * Returns null and warns if the type is unknown.
   * @private
   */
  _buildOne(def) {
    const typeDef = EntityTypes[def.type];
    if (!typeDef) {
      console.warn(`[EntityFactory] Unknown entity type: "${def.type}" — skipping.`);
      return null;
    }
    return { ...def, ...typeDef };
  }

  /**
   * Expand a wallGroup definition into individual wall defs.
   *
   * The cursor starts at `def.start` (top-left corner of the first segment).
   * Each segment advances the cursor to the far end of the placed wall so
   * the next segment begins exactly where the previous one ended.
   *
   * Directions:
   *   right → horizontal wall, cursor moves right by `length`
   *   left  → horizontal wall placed to the left, cursor moves left by `length`
   *   down  → vertical wall, cursor moves down by `length`
   *   up    → vertical wall placed upward, cursor moves up by `length`
   *
   * @private
   * @param {{ start: {x,y}, thickness?: number, segments: Array<{dir:string, length:number}> }} def
   * @returns {Array<{type:'wall', x:number, y:number, w:number, h:number}>}
   */
  _expandWallGroup(def) {
    const walls = [];
    const t = def.thickness ?? 16;
    let cx = def.start.x;
    let cy = def.start.y;

    const segments = def.segments;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      let wall = null;

      switch (seg.dir) {
        case 'right':
          wall = { type: 'wall', x: cx, y: cy, w: seg.length, h: t };
          cx += seg.length;
          break;

        case 'left':
          cx -= seg.length;
          wall = { type: 'wall', x: cx, y: cy, w: seg.length, h: t };
          break;

        case 'down':
          wall = { type: 'wall', x: cx, y: cy, w: t, h: seg.length };
          cy += seg.length;
          break;

        case 'up':
          cy -= seg.length;
          wall = { type: 'wall', x: cx, y: cy, w: t, h: seg.length };
          break;

        default:
          console.warn(`[EntityFactory] Unknown wallGroup direction: "${seg.dir}" — skipping segment.`);
          continue;
      }

      walls.push(wall);

      // At a perpendicular turn, the cursor sits at the joint between the two
      // walls. Depending on which directions are involved, one corner of the
      // T×T joint square may be left uncovered (e.g. right→up, down→left).
      // Placing a T×T fill square at the cursor position always covers it.
      // For turns that already fill the corner (right→down, down→right, …)
      // the square simply redraws the same pixels — harmless.
      // We skip same-axis transitions (180° or collinear) where no gap exists.
      if (i < segments.length - 1) {
        const nextDir    = segments[i + 1].dir;
        const curHoriz   = seg.dir === 'right' || seg.dir === 'left';
        const nextHoriz  = nextDir  === 'right' || nextDir  === 'left';
        if (curHoriz !== nextHoriz) {
          walls.push({ type: 'wall', x: cx, y: cy, w: t, h: t });
        }
      }
    }

    return walls;
  }
}
