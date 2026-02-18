/**
 * MapRenderer.js
 * Draws the game world onto a Canvas 2D context.
 *
 * Draw order (painter's algorithm):
 *   1. Background grid
 *   2. Entities (walls, trees, …)
 *   3. Player (always on top)
 *   4. HUD overlay (controls hint)
 */

const GRID_SIZE  = 40;
const GRID_COLOR = '#1e1e1e';
const GRID_LINE  = '#2a2a2a';

const PLAYER_COLOR        = '#e9c46a';
const PLAYER_BORDER_COLOR = '#f4a261';

export class MapRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  /**
   * Render one frame.
   * @param {import('./Player.js').Player}   player
   * @param {Array<Object>}                  entities
   * @param {import('./Camera.js').Camera}   camera
   * @param {{ message: string, timer: number, maxTimer: number }|null} combatFlash
   */
  render(player, entities, camera, combatFlash = null) {
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._drawGrid(camera);
    this._drawEntities(entities, camera);
    this._drawPlayer(player, camera);
    this._drawHUD();
    this._drawCombatFlash(combatFlash);  // always last — draws over everything
  }

  // ---------------------------------------------------------------------------
  // Private draw methods
  // ---------------------------------------------------------------------------

  _drawGrid(camera) {
    const { ctx, canvas } = this;

    ctx.fillStyle = GRID_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth   = 1;

    // Offset so grid lines stay aligned to world space as camera moves
    const startX = -(camera.x % GRID_SIZE);
    const startY = -(camera.y % GRID_SIZE);

    ctx.beginPath();
    for (let x = startX; x < canvas.width;  x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = startY; y < canvas.height; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  _drawEntities(entities, camera) {
    const { ctx } = this;

    for (const e of entities) {
      const sx = camera.toScreenX(e.x);
      const sy = camera.toScreenY(e.y);

      ctx.fillStyle   = e.color;
      ctx.strokeStyle = e.borderColor;
      ctx.lineWidth   = 2;

      if (e.type === 'tree') {
        this._drawTree(sx, sy, e.w, e.h);
      } else if (e.type === 'enemy') {
        this._drawEnemy(sx, sy, e.w, e.h);
      } else {
        ctx.fillRect(sx, sy, e.w, e.h);
        if (e.border) ctx.strokeRect(sx, sy, e.w, e.h);
      }
    }
  }

  /** Draw a tree as a rounded rectangle to visually distinguish it from walls. */
  _drawTree(sx, sy, w, h) {
    const { ctx } = this;
    const r = Math.min(w, h) * 0.35;

    ctx.beginPath();
    ctx.moveTo(sx + r, sy);
    ctx.lineTo(sx + w - r, sy);
    ctx.quadraticCurveTo(sx + w, sy, sx + w, sy + r);
    ctx.lineTo(sx + w, sy + h - r);
    ctx.quadraticCurveTo(sx + w, sy + h, sx + w - r, sy + h);
    ctx.lineTo(sx + r, sy + h);
    ctx.quadraticCurveTo(sx, sy + h, sx, sy + h - r);
    ctx.lineTo(sx, sy + r);
    ctx.quadraticCurveTo(sx, sy, sx + r, sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Small trunk detail
    const trunkW = w * 0.2;
    const trunkH = h * 0.25;
    ctx.fillStyle = '#5c3317';
    ctx.fillRect(sx + w / 2 - trunkW / 2, sy + h - trunkH, trunkW, trunkH);
  }

  _drawPlayer(player, camera) {
    const { ctx } = this;
    const sx = camera.toScreenX(player.x);
    const sy = camera.toScreenY(player.y);

    // Body
    ctx.fillStyle   = PLAYER_COLOR;
    ctx.strokeStyle = PLAYER_BORDER_COLOR;
    ctx.lineWidth   = 2;
    ctx.fillRect(sx, sy, player.w, player.h);
    ctx.strokeRect(sx, sy, player.w, player.h);

    // Direction dot (top-center)
    ctx.fillStyle = PLAYER_BORDER_COLOR;
    ctx.beginPath();
    ctx.arc(sx + player.w / 2, sy + 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw an enemy as a red square with a white cross-sword marker. */
  _drawEnemy(sx, sy, w, h) {
    const { ctx } = this;

    // Body (color/borderColor already set by caller)
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeRect(sx, sy, w, h);

    // White X marker — visually distinct from the player's dot
    const pad = Math.max(4, Math.floor(w * 0.28));
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(sx + pad,     sy + pad);
    ctx.lineTo(sx + w - pad, sy + h - pad);
    ctx.moveTo(sx + w - pad, sy + pad);
    ctx.lineTo(sx + pad,     sy + h - pad);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Full-screen combat flash overlay. Fades out in the last 0.5 s.
   * @param {{ message: string, timer: number, maxTimer: number }|null} flash
   */
  _drawCombatFlash(flash) {
    if (!flash) return;
    const { ctx, canvas } = this;

    const alpha = flash.timer < 0.5 ? flash.timer / 0.5 : 1.0;
    const cx    = canvas.width  / 2;
    const cy    = canvas.height / 2;

    // Dark red tint over the whole screen
    ctx.fillStyle = `rgba(80, 0, 0, ${alpha * 0.75})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = `rgba(255, 70, 70, ${alpha})`;
    ctx.font      = 'bold 56px monospace';
    ctx.fillText('COMBAT', cx, cy - 36);

    ctx.fillStyle = `rgba(255, 220, 220, ${alpha})`;
    ctx.font      = '26px monospace';
    ctx.fillText(flash.message, cx, cy + 16);

    ctx.restore();
  }

  _drawHUD() {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font      = '13px monospace';
    ctx.fillText('WASD / Arrows — move   |   Middle mouse drag — pan camera', 12, canvas.height - 12);
  }
}
