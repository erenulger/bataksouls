# Mechanics Developer Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Core Systems Architecture & Implementation

---

## Architecture Assessment

The codebase is well-structured. The state machine pattern (`engine.js`) with pluggable adapters is clean and maintainable. The event bus provides good decoupling. The separation between game logic and rendering is solid. This is a strong foundation for continued development.

**Tech Stack:** Node.js (v18+), ES6 modules, HTML5 Canvas (map), Server-Sent Events (web mode)

---

## Systems Status

| System | Status | Notes |
|--------|--------|-------|
| State Machine Engine | Stable | Clean, well-designed |
| EventBus | Stable | Sequential async emit works correctly |
| Combat (bidding + tricks) | Stable | All 13 combat states functional |
| AI Personalities | Stable | 5 types + mood transitions |
| Card Power Calculation | Stable | Trump, team, weakness bonuses applied |
| Forge / Upgrade System | Stable | Cost formula, max level, save to disk |
| Map Engine | Stable | Collision, triggers, camera, render loop |
| Deck Load/Save | Stable | JSON-based, persists to disk |
| NPC Registry | Stable | `listNPCs()`, `loadNPCBySlug()` |
| Terminal Adapter | Stable | Full game in CLI |
| HTML Adapter (SSE) | Partial | Combat only, no map mode |
| **Forge ↔ Map Integration** | **Broken** | Forge entity on map is dummy |
| **Map State Persistence** | **Missing** | Enemies respawn on restart |
| **Victory State** | **Missing** | No win condition implemented |
| **Game-Over / Restart Flow** | **Missing** | CLI args only, no in-game restart |

---

## Critical Bugs & Issues

### BUG-01: Forge Entity is a Stub
**Severity:** High
The commit message `"forge added"` and `"dummy forge entity added"` confirm the forge on the map does not trigger the forge game state. The `forgeOpen` DOM event fires but is not handled by the full game loop.
**Fix required:** Connect `forgeOpen` trigger → transition to `forge` state in the engine, maintaining context.

### BUG-02: No Map State Persistence
**Severity:** High
When the player returns to the map after combat, all enemies are alive again. Defeated enemies must be tracked and removed from the map.
**Fix required:** Context must hold `defeatedEnemies[]` persisted across sessions; `TriggerSystem.js` must filter defeated enemies.

### BUG-03: Endurance Edge Case — All Players Empty-Handed
**Severity:** Medium
In `combatEndurance`, the code checks if a player's hand is empty while enemies have cards. If *all* players (including enemies) have empty hands simultaneously, the endurance loop may not terminate cleanly.
**Fix required:** Add guard in `combatEndurance`: if everyone's hand is empty, skip endurance and proceed to round end.

### BUG-04: htmlAdapter serializeCtx — NPC Setup Race Condition
**Severity:** Medium
Per MEMORY.md: `stateEnter` fires before `inputSpec`, meaning `ctx._setupNpcs` is not set when `stateEnter` fires. htmlAdapter works around this by calling `listNPCs()` directly in `serializeCtx`. This is a workaround, not a fix. If other state data is read in `stateEnter` before it is set, similar bugs will occur.
**Recommendation:** Document this pattern as a known architectural constraint; add a comment in `engine.js` warning future developers.

### BUG-05: No In-Game Restart
**Severity:** Medium
The only way to restart is via CLI arguments. There is no in-game "Return to Main Menu" or "New Game" flow. The `combatEnd` state returns to `main-menu`, but main-menu does not have a "restart campaign" option — it just re-enters the existing context.
**Fix required:** Add a fresh context initialization flow from main menu.

---

## Architecture Recommendations

### 1. Map-Engine / Game-Engine Bridge
Currently MapEngine.js fires DOM events (`combatStart`, `forgeOpen`) that are caught by external JavaScript. This coupling is fragile. Consider a more robust bridge:
```javascript
// In MapEngine.js
this.onCombatTrigger = null; // Callback registered by game controller
// When trigger fires:
if (this.onCombatTrigger) this.onCombatTrigger({ npcSlug });
```

### 2. Persistent World State Object
Add a `world` object to context:
```javascript
{
  defeatedEnemies: Set<string>,   // entity IDs
  collectedItems: Set<string>,
  currentZone: 'zone1',
  playerPosition: { x, y }
}
```
Serialize this to disk alongside the player deck.

### 3. Full-Stack Web Mode
The combat-server only serves combat. A full web mode needs map rendering too. The MapEngine uses HTML5 Canvas — this can run in a browser. Consider serving the map page with SSE for both map and combat state updates.

---

## Mechanics Developer Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| ME-01 | Critical | Connect forge entity trigger to forge game state | Fix forge-map integration |
DONE| ME-02 | Critical | Implement persistent map state (defeated enemies, world object) | Core game loop blocker |
| ME-03 | Critical | Implement victory state and win condition flow | Requires SD-02 arc definition |
| ME-04 | Critical | Implement proper game-over → restart flow | In-game restart without CLI |
DONE| ME-05 | High | Fix endurance edge case (all-empty-hand) | Game stability |
| ME-06 | High | Add NPC death persistence across map sessions | Use defeatedEnemies in context |
| ME-07 | High | Implement world state save/load alongside player deck | JSON persistence |
| ME-08 | High | Refactor map-engine bridge (replace DOM events with callbacks) | Architecture improvement |
| ME-09 | Medium | Extend combat-server.js to support full game (map + combat) | Web mode completeness |
| ME-10 | Medium | Add multi-zone map support (zone2, zone3 map files) | Requires MD-11 zone content |
| ME-11 | Medium | Validate multi-enemy and multi-ally combat (3+ combatants) | Team dynamic edge cases |
| ME-12 | Medium | Add logging/debug mode for combat simulation | Needed by Data Scientist |
| ME-13 | Low | Document architectural constraint: stateEnter fires before inputSpec | Add warning comment in engine.js |
| ME-14 | Low | Investigate NPC registry for missing deck files (undeadSpear etc.) | Data integrity |
| ME-15 | Low | Refactor combat states into sub-folder index for clarity | Maintainability |
