# Technical Artist Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Art-Technology Bridge & Implementation Specialist

---

## Technical Context

BatakSouls does not use Godot or a traditional game engine. Its rendering pipeline is:
- **Map:** HTML5 Canvas via `MapRenderer.js` (custom 2D renderer)
- **Combat (web):** DOM + CSS via SSE-driven HTML updates in `combat.html`
- **Combat (terminal):** ANSI text — no rendering pipeline

This report adapts Technical Artist concerns to the actual Node.js + Canvas + HTML stack.

---

## Rendering Pipeline Assessment

### MapRenderer.js (Canvas)
- Renders entities as solid color rectangles (no sprites)
- Camera follows player via translate transform
- `requestAnimationFrame` loop at native browser FPS
- **Current output:** Colored boxes on black background — functional but entirely placeholder

**Technical capabilities available:**
- Sprite/image drawing via `ctx.drawImage()`
- Spritesheet animation via `ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)`
- Particle systems via canvas primitives (circles, arcs)
- Screen shake via canvas transform offset
- Layer compositing (background → entities → effects → UI)
- Offscreen canvas for performance optimization

### combat.html (DOM/CSS)
- HTML elements updated via SSE JSON payloads
- CSS can handle animations, transitions, gradients
- Web Audio API available for sound
- CSS custom properties (variables) for theming
- SVG elements feasible for card/icon rendering

---

## Shader / Effect Equivalents (Canvas)

Since there is no shader pipeline, equivalent effects must be implemented in Canvas 2D:

| Shader Effect | Canvas 2D Implementation |
|-------------|--------------------------|
| Glow/bloom | Draw element multiple times with increasing blur radius (ctx.filter = 'blur') |
| Screen shake | Apply random translation offset each frame, decay over time |
| Color flash (damage) | Draw semi-transparent colored overlay rect |
| Particle burst | Spawn N circle primitives with velocity and alpha decay |
| Vignette | Radial gradient overlay (dark at edges) |
| Fog/atmosphere | Low-alpha dark rect over distant areas |

---

## Spritesheet Integration Plan

When assets are provided by Sr Artist, integration path:

```javascript
// SpriteManager.js (to be created)
class SpriteManager {
  constructor() {
    this.sprites = new Map();
  }

  async load(id, path) {
    const img = new Image();
    img.src = path;
    await img.decode();
    this.sprites.set(id, img);
  }

  draw(ctx, id, frameX, frameY, frameW, frameH, destX, destY, scale = 1) {
    const sprite = this.sprites.get(id);
    if (!sprite) return;
    ctx.drawImage(sprite,
      frameX * frameW, frameY * frameH, frameW, frameH,
      destX, destY, frameW * scale, frameH * scale
    );
  }
}
```

---

## Canvas Performance Considerations

- **Avoid per-frame layout queries:** Cache element sizes, don't query DOM in render loop
- **Dirty region rendering:** Only redraw changed areas (background static, entities dynamic)
- **Image caching:** Pre-load all sprites on game init, cache in SpriteManager
- **Particle pooling:** Reuse particle objects rather than creating/destroying each frame
- **Resolution scaling:** Use `devicePixelRatio` for crisp rendering on high-DPI screens

```javascript
// High-DPI canvas setup
const scale = window.devicePixelRatio || 1;
canvas.width = logicalWidth * scale;
canvas.height = logicalHeight * scale;
ctx.scale(scale, scale);
canvas.style.width = logicalWidth + 'px';
canvas.style.height = logicalHeight + 'px';
```

---

## Element Icon Implementation

Element icons (9 total) should be implemented as SVG or small PNG sprites:
- SVG preferred for web mode (scales perfectly, easy color theming)
- PNG spritesheet for Canvas/map mode

Each element icon needs: 16x16, 32x32, and 48x48 versions.

---

## Technical Artist Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| TA-01 | Critical | Audit MapRenderer.js — document render pipeline, identify extension points | Before any visual work |
| TA-02 | Critical | Design and implement SpriteManager.js for Canvas | Prerequisite for all sprite art |
| TA-03 | High | Implement high-DPI canvas setup (devicePixelRatio) | Visual quality |
| TA-04 | High | Integrate element icons into combat.html UI | Blocked by SA-03 (icon assets) |
| TA-05 | High | Implement canvas screen shake system (map mode) | Combat trigger and damage feel |
| TA-06 | High | Implement canvas particle system (simple pool-based) | Combat events, forge |
| TA-07 | High | Implement damage number pop-up system (canvas and DOM) | Visual feedback |
| TA-08 | High | Implement color flash overlay for player damage (red flash) | Soulslike essential |
| TA-09 | Medium | Implement vignette layer on map canvas (atmosphere) | Blocked by SA-01 (style direction) |
| TA-10 | Medium | Implement CSS animation system for combat.html state transitions | Polish |
| TA-11 | Medium | Integrate NPC portrait images into combat SSE renderer | Blocked by SA-09 (NPC portraits) |
| TA-12 | Medium | Implement spritesheet animation for player map movement | Blocked by SA-10 (player sprite) |
| TA-13 | Medium | Implement map tileset rendering (replace colored rects) | Blocked by SA-12 (tileset) |
| TA-14 | Low | Optimize canvas render: dirty region tracking | Performance |
| TA-15 | Low | Implement Web Audio API integration for sound playback | After GF-06 (audio plan) |
| TA-16 | Low | Create asset loading progress screen | Polish |
