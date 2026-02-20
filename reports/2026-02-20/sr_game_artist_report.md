# Sr Game Artist Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Visual Director & Art Pipeline Manager

---

## Visual State Assessment

BatakSouls currently has **no visual art assets**. The game operates entirely through:
- **Terminal mode:** ANSI text with ASCII formatting
- **Web combat mode:** Raw HTML elements styled minimally via CSS
- **Map mode:** HTML5 Canvas with solid-color rectangle primitives

There is no defined art style, no color palette, no character art, no card illustrations, no UI chrome, and no environment visuals. Art direction must be established before any other visual work can begin.

---

## Art Direction Recommendation

Based on the game's thematic pillars (Dark Souls atmosphere + trick-taking card game mechanics), two viable art directions are proposed:

### Option A: Dark Pixel Art (Recommended)
- **Style:** 16x16 or 32x32 pixel sprites
- **Mood:** Gothic, moody, atmospheric — inspired by Dark Souls, Darkest Dungeon, Dead Cells
- **Advantages:** Feasible solo/small team, highly stylized, strong genre precedent (Inscryption uses dark aesthetic to great effect), fits browser + desktop
- **Palette:** Deep blacks, desaturated greys, accent colors per element (gold for fire, silver for armor, violet for dark magic, etc.)
- **Map:** Top-down dungeon tile set

### Option B: Hand-Drawn Ink Style
- **Style:** Black ink line art with flat color fills, like card game illustrations
- **Mood:** Gothic tarot card aesthetic — mysterious, archaic
- **Advantages:** Highly original, visually striking, fits the card game theme deeply
- **Disadvantages:** Higher art production cost, slower to iterate
- **Palette:** Aged parchment tones, ink blacks, and bold element accent colors

**Recommendation: Option A (Pixel Art)** — faster to produce, consistent with genre, easier to implement on Canvas and HTML.

---

## Visual Identity Needs

### Color Palette (Draft — Pixel Art Dark Fantasy)
| Role | Color | Hex |
|------|-------|-----|
| Primary Background | Near-black | `#0d0d0d` |
| UI Panel | Dark slate | `#1a1a2e` |
| Text (primary) | Aged white | `#e8e0d0` |
| Text (secondary) | Muted gold | `#b8950a` |
| HP Bar (full) | Deep red | `#8b1a1a` |
| HP Bar (low) | Bright red | `#ff2222` |
| Accent (fire) | Orange-amber | `#e87c1e` |
| Accent (light) | Pale gold | `#f0d060` |
| Accent (dark) | Violet | `#6b2fa0` |
| Accent (magic) | Blue-purple | `#3a6fd8` |
| Accent (poison) | Acid green | `#56b832` |
| Accent (bleed) | Crimson | `#c41010` |
| Accent (armor) | Steel grey | `#8fa0b0` |
| Accent (slash) | Silver | `#c8c8d0` |
| Accent (pierce) | Bone white | `#d0c8a8` |

### Typography
- **Headers:** Serif (gothic weight) — e.g., MedievalSharp or similar free font
- **Body/UI:** Monospace (fits terminal aesthetic) — e.g., Fira Code or Courier
- **Card Power Numbers:** Bold, high-contrast, large scale

---

## Asset Creation Priority List

### Tier 1 — Core (Needed for MVP)
1. **Element Icons** (9 elements) — small badge/icon per element
2. **HP Bar Component** — sprite/CSS component
3. **Card Frame** — border template for card display
4. **Main Menu Background** — establishing atmosphere
5. **Combat Background** — dungeon/ruin scene (static image or parallax layers)

### Tier 2 — Character (Needed for full release)
6. **Player Character Sprite** (map mode, 4-direction walk)
7. **NPC Portraits** (8 NPCs) — bust/head shots for combat display
8. **Enemy Map Sprites** (8 NPCs, top-down view)

### Tier 3 — Environment (Needed for multiple zones)
9. **Map Tileset Zone 1** (ruins, undead catacombs)
10. **Map Tileset Zone 2** (deeper dungeon, blighted)
11. **Map Tileset Zone 3** (boss realm)

### Tier 4 — Polish
12. **Card Illustrations** (sample cards per element — 1-2 per element)
13. **Atmospheric Effects** (fog, particle overlays)
14. **UI Icons** (forge, deck, souls counter)

---

## Sr Game Artist Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| SA-01 | Critical | Decide and finalize art direction (Option A or B or other) | All other art blocked by this |
| SA-02 | Critical | Create color palette specification document | Needed by Technical Artist and UI/UX |
| SA-03 | Critical | Design element icons for all 9 elements | Needed by UI and gameplay display |
| SA-04 | High | Design card frame template | Core gameplay visual |
| SA-05 | High | Create style guide document (typography, spacing, palette) | Architecture for all visual work |
| SA-06 | High | Design HP bar sprite/component | Immediate visual improvement |
| SA-07 | High | Create main menu background artwork | First impression |
| SA-08 | High | Create combat background (Zone 1 setting) | Combat atmosphere |
| SA-09 | Medium | Design NPC portraits — 8 characters | Combat display |
| SA-10 | Medium | Design player sprite — 4-direction walk cycle | Map mode |
| SA-11 | Medium | Design enemy map sprites — 8 NPCs | Map mode |
| SA-12 | Medium | Create Zone 1 map tileset (ruins/catacombs) | Map visual |
| SA-13 | Low | Design Zone 2 and Zone 3 tilesets | After zone structure defined |
| SA-14 | Low | Design card illustrations (1-2 per element) | Polish tier |
| SA-15 | Low | Design atmospheric effects (fog, soul particles) | Polish tier |
