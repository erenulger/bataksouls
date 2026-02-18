/**
 * MapEngine.js
 * Game loop orchestrator. Entry point imported by map.html.
 *
 * Responsibilities:
 *   - Load map config and build entities
 *   - Initialize all subsystems
 *   - Run the requestAnimationFrame game loop
 *   - Order of operations each frame:
 *       1. Read input
 *       2. Move player
 *       3. Resolve collisions
 *       4. Update camera
 *       5. Render
 */

import mapConfig           from '../../data/map/sampleMap.js';
import { EntityFactory }  from './EntityFactory.js';
import { Player }         from './Player.js';
import { InputHandler }   from './InputHandler.js';
import { MouseHandler }   from './MouseHandler.js';
import { CollisionSystem } from './CollisionSystem.js';
import { TriggerSystem }  from './TriggerSystem.js';
import { Camera }         from './Camera.js';
import { MapRenderer }    from './MapRenderer.js';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const canvas  = document.getElementById('gameCanvas');
const factory = new EntityFactory();

// Build typed entity list from raw map config
const entities = factory.buildAll(mapConfig.entities);

// Player starts at the configured spawn point
const player  = new Player(mapConfig.playerStart.x, mapConfig.playerStart.y);
const input     = new InputHandler();
const mouse     = new MouseHandler(canvas);
const collision = new CollisionSystem();
const triggers  = new TriggerSystem();

// Resize canvas to fill the window
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const camera   = new Camera(canvas.width, canvas.height);
const renderer = new MapRenderer(canvas);

// ---------------------------------------------------------------------------
// Game loop
// ---------------------------------------------------------------------------

let lastTime    = null;
let combatFlash = null;                 // { message, timer, maxTimer } or null
const MAX_DT    = 0.1;                  // cap delta time to avoid spiral-of-death on tab switch
const FLASH_DURATION = 2.5;            // seconds the combat overlay stays visible

function tick(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, MAX_DT);
  lastTime = timestamp;

  // 1. Read input
  const inputVector = input.getVector();

  // 2. Move player
  player.move(inputVector, dt);

  // 3. Resolve collisions (push player out of solid entities)
  collision.resolve(player, entities);

  // 3b. Check triggers — enemies and other triggerable entities
  const triggered = triggers.check(player, entities);
  for (const enemy of triggered) {
    // Remove from map so it can't be triggered again
    const idx = entities.indexOf(enemy);
    if (idx !== -1) entities.splice(idx, 1);

    // Dispatch a DOM event so external systems (combat engine, UI) can react
    window.dispatchEvent(new CustomEvent('combatStart', { detail: { enemy } }));

    // Show the in-map combat flash (last triggered enemy wins if simultaneous)
    combatFlash = { message: enemy.name || enemy.label, timer: FLASH_DURATION, maxTimer: FLASH_DURATION };
  }

  // Tick combat flash countdown
  if (combatFlash) {
    combatFlash.timer -= dt;
    if (combatFlash.timer <= 0) combatFlash = null;
  }

  // 4. Update camera — pan if middle mouse is held, otherwise follow player
  camera.resize(canvas.width, canvas.height);
  if (mouse.isPanning) {
    const { dx, dy } = mouse.consumeDelta();
    camera.pan(dx, dy);
  } else {
    camera.follow(player);
  }

  // 5. Render the frame
  renderer.render(player, entities, camera, combatFlash);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
