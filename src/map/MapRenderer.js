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
   */
  render(player, entities, camera) {
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._drawGrid(camera);
    this._drawEntities(entities, camera);
    this._drawPlayer(player, camera);
    this._drawHUD(this._isNearForge(player, entities));
  }

  /**
   * True if the player is within 20 px of any forge entity.
   * @private
   */
  _isNearForge(player, entities) {
    const p   = player.bounds;
    const pad = 20;
    return entities.some(e => {
      if (e.type !== 'forge') return false;
      return p.x < e.x + e.w + pad &&
             p.x + p.w > e.x - pad &&
             p.y < e.y + e.h + pad &&
             p.y + p.h > e.y - pad;
    });
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
      } else if (e.type === 'forge') {
        this._drawForge(sx, sy, e.w, e.h);
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

  /** Draw an anvil-shaped forge with a warm glow. */
  _drawForge(sx, sy, w, h) {
    const { ctx } = this;

    ctx.save();
    ctx.shadowColor = '#ff6b00';
    ctx.shadowBlur  = 10;

    // Top plate (hot surface)
    ctx.fillStyle = '#c46200';
    ctx.fillRect(sx - w * 0.08, sy, w * 1.16, h * 0.32);

    // Horn (left protrusion)
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.08, sy + h * 0.05);
    ctx.lineTo(sx - w * 0.30, sy + h * 0.20);
    ctx.lineTo(sx - w * 0.08, sy + h * 0.32);
    ctx.closePath();
    ctx.fill();

    // Neck (narrow waist)
    ctx.fillStyle = '#3d3d3d';
    const neckW = w * 0.55;
    ctx.fillRect(sx + (w - neckW) / 2, sy + h * 0.32, neckW, h * 0.18);

    // Base
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(sx, sy + h * 0.50, w, h * 0.50);

    ctx.restore();

    // Border
    ctx.strokeStyle = '#7a3c00';
    ctx.lineWidth   = 2;
    ctx.strokeRect(sx, sy, w, h);
  }

  _drawHUD(nearForge = false) {
    const { ctx, canvas } = this;
    ctx.font = '13px monospace';

    if (nearForge) {
      ctx.fillStyle = '#e07b39';
      ctx.fillText('[F] Open Forge', 12, canvas.height - 30);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('WASD / Arrows — move   |   Middle mouse drag — pan camera', 12, canvas.height - 12);
  }
}
