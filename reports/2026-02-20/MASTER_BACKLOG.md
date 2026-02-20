# BatakSouls — Master Backlog
**Generated:** 2026-02-20
**Source:** Merged from all 11 agent reports
**Phase:** Prototype → Early Production

---

## How to Read This

Items are sorted by **CRITICAL → HIGH → MEDIUM → LOW** priority and tagged with their owning agent. Dependencies are noted where one task blocks another. All IDs are preserved from individual agent reports.

---

## CRITICAL — Must complete before MVP is playable

| ID | Task | Owner | Blocks |
|----|------|-------|--------|
| P-01 | Create project-config.json with formal scope | Producer | All agents |
| P-02 | Commission GDD from Sr Game Designer | Producer | All design |
| P-03 | Define MVP scope (minimum shippable game) | Producer + Sr Designer | All |
| SD-01 | Write Game Vision Document (GDD v1) — pillars, player journey, success metrics | Sr Designer | SD-02 through SD-12 |
| SD-02 | Define victory condition and game arc (Boss Rush / Roguelike / Campaign) | Sr Designer | ME-03, MD-04 |
| SD-03 | Design tutorial / onboarding flow for trick-taking newcomers | Sr Designer | UX-04 |
| ME-01 | Connect forge map entity trigger to forge game state | Mechanics Dev | QA-09 |
| ME-02 | Implement persistent map state (defeated enemies, world object) | Mechanics Dev | ME-07, QA-02 |
| ME-03 | Implement victory state and win condition | Mechanics Dev | Blocked by SD-02 |
| ME-04 | Implement in-game restart / game-over flow (no CLI args required) | Mechanics Dev | |
| SA-01 | Decide and finalize art direction (pixel art vs. hand-drawn ink) | Sr Artist | All art tasks |
| SA-02 | Create color palette specification document | Sr Artist | TA-04, UX-12 |
| SA-03 | Design element icons for all 9 elements | Sr Artist | TA-04, UX combat HUD |
| UX-01 | Design visual card selection component (web mode — replace number-only input) | UI/UX | |
| UX-02 | Design persistent combat HUD (trump badge, HP bars, tricks won, play order) | UI/UX | |
| UX-03 | Build web mode main menu | UI/UX | |
| UX-04 | Design tutorial/onboarding flow | UI/UX | Blocked by SD-03 |
| QA-01 | Write unit tests for card power calculation (card.js) | QA | |
| QA-02 | Write unit tests for trick resolution (trick.js) | QA | |
| QA-03 | Write unit tests for bid resolution (bidding.js) | QA | |
| QA-04 | Verify deck files exist for all NPC slugs in sampleMap.js | QA | |
| DS-01 | Build combat-simulator.js (headless combat runner) | Data Scientist | DS-02 through DS-07 |
| DS-02 | Run 1000-iteration simulations: player vs. each NPC | Data Scientist | Blocked by DS-01 |
| DS-03 | Analyze trump bonus impact — simulate with/without +4 | Data Scientist | Blocked by DS-01 |
| MA-01 | Full competitor analysis: Inscryption, Slay the Spire, Card Shark | Market Analyst | MA-02, MA-08 |
| MA-02 | Define Steam store positioning (title, tags, description) | Market Analyst | |

---

## HIGH — Required for a complete, releasable game

| ID | Task | Owner | Blocks |
|----|------|-------|--------|
| P-04 | Establish milestone dates with acceptance criteria (M1–M4) | Producer | |
| P-05 | Define formal risk register | Producer | |
| P-06 | Weekly status report cadence (every Friday) | Producer | |
| P-07 | Decide target platform(s) — PC, Web, Mobile | Stakeholder | Art + Tech decisions |
| SD-04 | Write world/narrative premise (3-5 sentences minimum) | Sr Designer | MD-06, atmosphere |
| SD-05 | Design zone/world structure (3-5 zones + boss) | Sr Designer | MD-01, ME-10 |
| SD-06 | Design difficulty ramp: NPC stats per zone | Sr Designer | MD-01 |
| SD-07 | Decide player starting archetypes (universal or 3 builds) | Sr Designer | MD-03 |
| MD-01 | Write NPC progression table (zone assignment + stat targets) | Mid Designer | Blocked by SD-05, SD-06 |
| MD-02 | Audit all card files — count cards per element, identify gaps | Mid Designer | MD-08 |
| MD-03 | Specify player starting deck composition and upgrade path | Mid Designer | Blocked by SD-07 |
| MD-04 | Create Boss NPC design spec (name, lore, stats, special deck) | Mid Designer | Blocked by SD-02 |
| MD-05 | Balance forge economy (souls income vs. upgrade cost per zone) | Mid Designer | DS-04 |
| MD-06 | Fill in all NPC descriptions and characterization text | Mid Designer | Blocked by SD-04 |
| MD-07 | Rename placeholder NPC "support" with proper character name | Mid Designer | |
| ME-05 | Fix endurance edge case (all-empty-hand scenario) | Mechanics Dev | |
| ME-06 | Add NPC death persistence across map sessions | Mechanics Dev | |
| ME-07 | Implement world state save/load alongside player deck | Mechanics Dev | |
| ME-08 | Refactor map-engine bridge (replace DOM events with callbacks) | Mechanics Dev | |
| ME-09 | Extend combat-server.js to support full game loop (map + combat) | Mechanics Dev | |
| GF-01 | Design trump reveal moment (animation + audio cue, web mode) | Game Feel Dev | |
| GF-02 | Design combat result screen (victory/defeat) with animation | Game Feel Dev | |
| GF-03 | Implement HP bar smooth animation (CSS transition) | Game Feel Dev | |
| GF-04 | Implement player damage feedback (red flash overlay) | Game Feel Dev | |
| GF-05 | Design and implement souls counter animation (roll-up) | Game Feel Dev | |
| GF-06 | Create audio SFX plan (8-10 essential sounds list) | Game Feel Dev | TA-15 |
| GF-07 | Implement card play animation (slide + power number reveal, web mode) | Game Feel Dev | |
| QA-05 | Write integration test: full combat round (bid → tricks → result) | QA | |
| QA-06 | Test all 5 AI personalities through complete combat | QA | |
| QA-07 | Test endurance edge cases (all-empty-hand, single-player-empty) | QA | Blocked by ME-05 |
| QA-08 | Validate forge upgrade saves correctly and persists | QA | |
| QA-09 | Test forge-map integration | QA | Blocked by ME-01 |
| QA-10 | Test multi-enemy combat (2v1, 2v2, 3v1 scenarios) | QA | |
| SA-04 | Design card frame template | Sr Artist | |
| SA-05 | Create style guide document (typography, spacing, palette) | Sr Artist | Blocked by SA-01, SA-02 |
| SA-06 | Design HP bar sprite/component | Sr Artist | |
| SA-07 | Create main menu background artwork | Sr Artist | |
| SA-08 | Create combat background (Zone 1 setting) | Sr Artist | |
| TA-01 | Audit MapRenderer.js — document render pipeline, extension points | Technical Artist | All TA tasks |
| TA-02 | Design and implement SpriteManager.js for Canvas | Technical Artist | All sprite integration |
| TA-03 | Implement high-DPI canvas setup (devicePixelRatio) | Technical Artist | |
| TA-04 | Integrate element icons into combat.html UI | Technical Artist | Blocked by SA-03 |
| TA-05 | Implement canvas screen shake system (map mode) | Technical Artist | |
| TA-06 | Implement canvas particle system (pool-based) | Technical Artist | |
| TA-07 | Implement damage number pop-up system | Technical Artist | |
| TA-08 | Implement color flash overlay for player damage | Technical Artist | |
| UX-05 | Design NPC encounter intro screen | UI/UX | |
| UX-06 | Design forge UI (card grid, upgrade cost, confirmation) | UI/UX | |
| UX-07 | Add confirmation dialog for forge upgrade | UI/UX | |
| UX-08 | Design combat result screen (victory/defeat, souls earned) | UI/UX | |
| UX-09 | Design deck viewer UI (web mode) | UI/UX | |
| DS-04 | Calculate full forge economy: souls income vs. upgrade cost | Data Scientist | MD-05 |
| DS-05 | Analyze bid winner panic reduction (–20) — is it too dominant? | Data Scientist | |
| DS-06 | Simulate Chaotic AI win rate over 1000 combats | Data Scientist | Blocked by DS-01 |
| DS-07 | Analyze endurance damage formula — worst-case scenarios | Data Scientist | |
| MA-03 | Survey trick-taking digital game audience (Reddit / Discord polls) | Market Analyst | |
| MA-04 | Identify top 5 streamers/YouTubers in card game niche | Market Analyst | |
| MA-05 | Write formal market_overview.md report | Market Analyst | |
| MA-08 | Recommend Early Access vs. full launch strategy | Market Analyst | |

---

## MEDIUM — Polish and completeness items

| ID | Task | Owner |
|----|------|-------|
| P-08 | Evaluate monetization model (premium vs. free) | Market Analyst + Producer |
| P-09 | Create agent communication log (decisions and rationale) | Producer |
| SD-08 | Document all elemental interactions in readable format | Sr Designer |
| SD-09 | Review panic mechanic balance after playtesting | Sr Designer |
| SD-10 | Design post-death flow (souls lost? run restart? checkpoint?) | Sr Designer |
| MD-08 | Specify minimum card count per element (target: 8-12 unique) | Mid Designer |
| MD-09 | Write feature spec for NPC encounter intro screen | Mid Designer |
| MD-10 | Define multi-NPC combat party compositions | Mid Designer |
| MD-11 | Design additional map areas (Zone 2, Zone 3) content layout | Mid Designer |
| ME-10 | Add multi-zone map support (load zone2, zone3 map files) | Mechanics Dev |
| ME-11 | Validate multi-enemy and multi-ally combat (3+ combatants) | Mechanics Dev |
| ME-12 | Add logging/debug mode for combat simulation | Mechanics Dev |
| GF-08 | Implement trick win visual highlight | Game Feel Dev |
| GF-09 | Design panic indicator (visual state for high-panic entities) | Game Feel Dev |
| GF-10 | Add CSS transitions between SSE state updates | Game Feel Dev |
| GF-11 | Implement screen edge red flash for map combat triggers | Game Feel Dev |
| GF-12 | Add forge upgrade sound + visual (card glowing) | Game Feel Dev |
| QA-11 | Write performance baseline: FPS, memory, SSE latency | QA |
| QA-12 | Playtesting checklist: run full game loop manually | QA |
| QA-13 | Test deck load with malformed/missing card IDs | QA |
| QA-14 | Validate panic floor (10) enforced across all scenarios | QA |
| SA-09 | Design NPC portraits — 8 characters | Sr Artist |
| SA-10 | Design player sprite — 4-direction walk cycle | Sr Artist |
| SA-11 | Design enemy map sprites — 8 NPCs | Sr Artist |
| SA-12 | Create Zone 1 map tileset (ruins/catacombs) | Sr Artist |
| TA-09 | Implement vignette layer on map canvas | Technical Artist |
| TA-10 | Implement CSS animation system for combat.html transitions | Technical Artist |
| TA-11 | Integrate NPC portrait images into combat SSE renderer | Technical Artist |
| TA-12 | Implement spritesheet animation for player map movement | Technical Artist |
| TA-13 | Implement map tileset rendering (replace colored rects) | Technical Artist |
| UX-10 | Draw user flow diagrams (all modes) | UI/UX |
| UX-11 | Implement ARIA labels on all interactive web elements | UI/UX |
| UX-12 | Verify color contrast ratios meet WCAG AA (4.5:1) | UI/UX |
| UX-13 | Design map UI overlay (minimap, zone name, pause) | UI/UX |
| UX-14 | Design pause menu (web and map modes) | UI/UX |
| DS-08 | Design minimal telemetry event schema (8-10 events) | Data Scientist |
| DS-09 | Create balance spreadsheet: all NPC stats, player progression | Data Scientist |
| DS-10 | Analyze element dominance from simulation data | Data Scientist |
| DS-11 | Recommend NPC stat targets per zone | Data Scientist |
| MA-06 | Research Batak game origin and cultural context for marketing | Market Analyst |
| MA-07 | Analyze Inscryption launch strategy for lessons | Market Analyst |

---

## LOW — Nice-to-have / post-launch

| ID | Task | Owner |
|----|------|-------|
| P-10 | Plan soft launch / playtesting group | Producer |
| SD-11 | Design optional lore pickups (item descriptions, NPC dialogue) | Sr Designer |
| SD-12 | Spec PvP or co-op mode feasibility study | Sr Designer |
| MD-12 | Spec optional NPC dialogue system (pre/post combat lines) | Mid Designer |
| MD-13 | Design seasonal or unlockable NPCs | Mid Designer |
| ME-13 | Document: stateEnter fires before inputSpec (add engine.js comment) | Mechanics Dev |
| ME-14 | Investigate NPC registry for missing deck files | Mechanics Dev |
| ME-15 | Refactor combat states into sub-folder index | Mechanics Dev |
| GF-13 | Terminal mode "feel" improvements (ASCII art, timing) | Game Feel Dev |
| GF-14 | Investigate HTML5 Web Audio API integration | Game Feel Dev |
| GF-15 | Add ambient audio loop for map exploration | Game Feel Dev |
| QA-15 | Cross-browser test web mode (Chrome, Firefox, Safari) | QA |
| QA-16 | Test terminal mode on Linux and macOS | QA |
| SA-13 | Design Zone 2 and Zone 3 tilesets | Sr Artist |
| SA-14 | Design card illustrations (1-2 per element) | Sr Artist |
| SA-15 | Design atmospheric effects (fog, soul particles) | Sr Artist |
| TA-14 | Optimize canvas render: dirty region tracking | Technical Artist |
| TA-15 | Implement Web Audio API integration | Technical Artist |
| TA-16 | Create asset loading progress screen | Technical Artist |
| UX-15 | Implement responsive layout for web mode (mobile-friendly) | UI/UX |
| UX-16 | Design settings menu (volume, key rebinding) | UI/UX |
| UX-17 | Add keyboard shortcut legend in combat HUD | UI/UX |
| DS-12 | Design A/B test plan: trump bonus value (3 vs. 4 vs. 5) | Data Scientist |
| DS-13 | Design player segmentation model | Data Scientist |
| DS-14 | Prototype local telemetry (write events to log file) | Data Scientist |
| MA-09 | Monitor competitor updates quarterly | Market Analyst |
| MA-10 | Evaluate mobile market opportunity | Market Analyst |

---

## Dependency Map

```
SD-02 (arc/victory) ──────→ ME-03 (victory state)
                    └──────→ MD-04 (boss NPC)

SD-05 (zone design) ──────→ MD-01 (NPC table)
                    └──────→ ME-10 (multi-zone map)

SD-03 (tutorial design) ──→ UX-04 (tutorial UX)

SA-01 (art direction) ────→ SA-02 (palette)
                     └────→ SA-05 (style guide)

SA-02 (palette) ──────────→ TA-04 (icon integration)
                └──────────→ UX-12 (contrast check)

SA-03 (element icons) ────→ TA-04 (icon integration)
                      └───→ UX combat HUD

ME-01 (forge fix) ────────→ QA-09 (forge QA)

DS-01 (simulator) ────────→ DS-02, DS-03, DS-05, DS-06, DS-07, DS-10

P-01/P-02/P-03 ───────────→ All other agents (unblocks everything)
```

---

## Backlog Summary

| Priority | Count |
|----------|-------|
| Critical | 28 items |
| High | 52 items |
| Medium | 40 items |
| Low | 30 items |
| **Total** | **150 items** |

---

## Recommended Sprint 1 Focus (Next 2 Weeks)

The minimum set to unblock all other work:

1. **P-01/P-02/P-03** — Establish project scope and commission GDD
2. **SD-01/SD-02** — Write GDD and define victory condition
3. **SA-01** — Choose art direction
4. **ME-01/ME-02** — Fix forge integration and map persistence
5. **DS-01** — Build combat simulator for balance testing
6. **QA-01/QA-02/QA-03/QA-04** — Baseline test coverage
7. **MA-01** — Competitor analysis

These 13 items collectively unblock the majority of all other work in the backlog.
