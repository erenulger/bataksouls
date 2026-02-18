/**
 * sampleMap.js
 * Map configuration file. Edit this to change the map layout.
 *
 * playerStart : where the player spawns (world coordinates)
 * entities    : list of objects on the map
 *
 * Plain entity:
 *   { type: 'wall' | 'tree' | ..., x, y, w, h }
 *
 * Wall group (chained segments — each starts where the previous ended):
 *   {
 *     type: 'wallGroup',
 *     start: { x, y },       // top-left of the first segment
 *     thickness: 16,          // optional, defaults to 16
 *     segments: [
 *       { dir: 'right', length: 300 },
 *       { dir: 'down',  length: 200 },
 *       ...
 *     ]
 *   }
 *   Valid directions: 'right' | 'left' | 'down' | 'up'
 */

const T = 16;   // default wall thickness

export default {
  playerStart: { x: 80, y: 80 },

  entities: [

    // -------------------------------------------------------------------------
    // Border — one continuous loop
    // -------------------------------------------------------------------------
    {
      type: 'wallGroup',
      start: { x: 0, y: 0 },
      thickness: T,
      segments: [
        { dir: 'down', length: 800 },
        { dir: 'right',  length: 1000 },
        { dir: 'down',    length: 150 },
        { dir: 'left', length: 500 },
        { dir: 'down', length: 200 },
        { dir: 'right', length: 500 },
        { dir: 'down', length: 850 }, 
      ],
    },

    // -------------------------------------------------------------------------
    // Interior wall — L-shape
    // -------------------------------------------------------------------------
    {
      type: 'wallGroup',
      start: { x: 0, y: 0 },
      thickness: T,
      segments: [
        { dir: 'right', length: 200 },
        { dir: 'down', length: 600 },
        { dir: 'right',  length: 1000 },
        { dir: 'down',    length: 400 }, 
        { dir: 'right', length: 400 },
        { dir: 'down' , length: 200 },
        { dir: 'left', length: 400 },
        { dir: 'down', length: 800 },
        { dir: 'left', length: 200 },
      ],
    },
  ],
};
