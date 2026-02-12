# Sr Game Designer Review v3: BatakSouls

**Date:** 2026-02-12
**Reviewer:** Sr Game Designer Agent
**Build:** Post-architecture pass -- state machine, card library, deck persistence, NPC encounters, standalone forge
**Focus:** Situation analysis after RPG architecture evolution (v2 recommendations addressed)

---

## 1. Executive Summary

BatakSouls has taken its first concrete step from "card game" toward "RPG with card-based combat." The monolithic `game.js` loop has been replaced with a state machine, a shared game context object, and six focused states. Player decks now persist to disk via a card library reference system. The forge operates as a standalone feature with save/discard flow. NPCs are dynamically discovered from data files. A developer debug mode allows direct state entry from the CLI.

This is exactly the kind of incremental evolution recommended in v2. The game remains playable at every step. No existing combat logic was broken -- the same 33 tests still pass, and the core modules (`trick.js`, `card.js`, `round.js`, `bidding.js`, `ai.js`, `constants.js`) were untouched.

**Verdict:** The v2 report rated RPG readiness at 4/10. This build addresses the two most critical gaps (state management and data persistence) and partially addresses a third (progression system). RPG readiness is now **5.5/10** -- the architectural skeleton is in place, but the combat data model, AI framework, and event system remain unbuilt.

---

## 2. What Changed Since v2

### 2.1 New Architecture: State Machine + Game Context

| Component | Before (v2) | After (v3) |
|---|---|---|
| Entry point | 122-line monolithic loop in `game.js` | 64-line thin launcher with CLI arg parsing |
| Game state | Distributed across local variables in `game.js` | Centralized `ctx` object created by `context.js` |
| State management | None -- linear execution | State machine in `engine.js` (31 lines) |
| State transitions | Hardcoded sequence | String-based routing: `enter(ctx)` returns next state name |
| Player persistence | None -- player rebuilt each run | `savePlayerDeck(ctx)` writes cardId+level to `player.json` |

The state machine is deliberately minimal: ~20 lines of core logic. Each state has an `enter(ctx)` method that returns the next state name or `null` to exit. No frame loop, no event bus, no middleware -- just the minimum needed for terminal state transitions. This is the right call for the current scope.

**State flow:**
```
main-menu ──> combat-setup ──> combat ──> combat-result ──> main-menu
    │                                                          ^
    ├──> forge ────────────────────────────────────────────────┘
    ├──> deck-view ────────────────────────────────────────────┘
    └──> null (quit)
```

### 2.2 Card Library Reference System

| Aspect | Before | After |
|---|---|---|
| Deck files | Inline card data (name, element, basePower, level) | Card ID references (`{ "cardId": 1003, "level": 4 }`) |
| Card definitions | Scattered across deck JSON files | Centralized in `data/cards/*.json` (9 element libraries, 72 cards) |
| Resolution | None needed -- data was inline | Lazy-loaded singleton `getCardLibrary()` resolves at runtime |
| ID scheme | Auto-increment counter (non-deterministic) | Element-based ranges: Light 1000s, Dark 2000s, ... Pierce 9000s |

This directly addresses v2 issue #6 ("Global `nextId` counter in `card.js`"). Card IDs are now deterministic, defined in reference data, and stable across sessions. The counter still exists in `card.js` for runtime card creation, but deck persistence no longer depends on it.

### 2.3 New Source Files (7 files, ~278 lines)

| File | Lines | Purpose |
|---|---|---|
| `src/engine.js` | 31 | State machine runner |
| `src/context.js` | 40 | Game context factory + deck save |
| `src/npcRegistry.js` | 30 | NPC auto-discovery from `data/decks/` |
| `src/states/mainMenu.js` | 29 | Title + menu (Fight/Forge/Deck/Quit) |
| `src/states/deckView.js` | 14 | Collection viewer |
| `src/states/forge.js` | 41 | Standalone forge with save/discard |
| `src/states/combatSetup.js` | 53 | NPC selection + combat initialization |
| `src/states/combat.js` | 34 | Round loop wrapper |
| `src/states/combatResult.js` | 40 | Scoreboard + deck save + cleanup |

### 2.4 Modified Files

| File | Change |
|---|---|
| `game.js` | Rewritten: 122 → 64 lines. CLI arg parsing + engine launch |
| `src/deck.js` | Added `getCardLibrary()`, `resolveCard()`. 70 → 106 lines |
| `src/ui.js` | Added `showSoulsBar()`. Guard on `showCollection()` for nameless objects |
| `src/upgrade.js` | Snapshot pattern: works on deep copy, returns `{cards, souls, changed}` |

### 2.5 Untouched Files (10 of 12 original source files)

`trick.js`, `card.js`, `constants.js`, `ansiColors.js`, `ai.js`, `bidding.js`, `round.js`, `player.js`, `input.js`, `tutorial.js`

This is the most important metric. The RPG layer wrapped around the combat engine without modifying it. This validates v2's closing recommendation: "let the RPG layer wrap around it rather than replacing it."

---

## 3. v2 Recommendation Status

The v2 report proposed six RPG design priorities. Here is where each stands after this build.

### Priority 1: Encounter State Object — PARTIALLY ADDRESSED

**v2 asked for:** A serializable `EncounterState` containing players, mobs, trump, round number, trick history, and phase.

**What was built:** A `ctx` (game context) object in `context.js` that holds player, NPC reference, combat players array, combat result, and state tracking. This is not a full `EncounterState` -- it does not track trick history, trump element (that is still local in `round.js`), or combat phase. But it IS the shared state container that v2 identified as the #1 prerequisite.

**Remaining gap:** Combat-specific state (trump, trick history, round progress) still lives inside `round.js` local variables. The context handles inter-state communication but not intra-combat state. This will matter when abilities, phase transitions, or save-mid-combat are needed.

**Score: 40% complete.**

### Priority 2: Entity Type Hierarchy — NOT ADDRESSED

**v2 asked for:** Split `createPlayer()` into `CombatEntity`, `PlayerEntity`, `AllyEntity`, `MobEntity` with distinct data shapes.

**What was built:** No change. `createPlayer()` still produces a flat object used for all entity types. NPCs are differentiated only by `aiType`, `panic`, and `team` fields.

**Score: 0% complete.** This is acceptable -- entity hierarchy was not part of this iteration's scope.

### Priority 3: Event Hooks on Combat Resolution — NOT ADDRESSED

**v2 asked for:** `onTrickResolved()`, `onRoundEnd()`, `onCardPlayed()` hooks.

**What was built:** No event system. The state machine's `exit()` hook exists but is unused. Combat still uses direct function calls.

**Score: 0% complete.** Expected -- events come when abilities or status effects are added.

### Priority 4: Expanded Card Data Model — NOT ADDRESSED

**v2 asked for:** Abilities, traits, rarity, upgrade paths on the Card type.

**What was built:** No change to the Card type itself. However, the card library reference system creates the infrastructure to expand cards in one place (`data/cards/`) and have all decks inherit the changes. This is a prerequisite that v2 did not explicitly call out but which makes Priority 4 significantly easier.

**Score: 5% complete** (infrastructure only).

### Priority 5: State-Aware AI Framework — NOT ADDRESSED

**Score: 0% complete.** Expected -- depends on Priorities 2 and 3.

### Priority 6: Forge Rework — PARTIALLY ADDRESSED

**v2 asked for:** Branching upgrade options, material costs, irreversible choices.

**What was built:** The forge is now a standalone state with:
- Snapshot-based upgrades (works on deep copy, never modifies player directly)
- Save/discard flow (player sees final state before committing)
- Persistence (upgrades saved to `player.json` in cardId format)
- No auto-exit when souls hit 0 (player can browse their deck)

The upgrade mechanic itself is still +2 power per level. No branching paths, no materials. But the forge now has the architectural shape to support these features: the snapshot pattern means experimental features can be added without risking player state.

**Score: 20% complete** (architecture ready, content not added).

---

## 4. Design Pillar Re-evaluation

### Pillar 1: "Read the Battlefield" — UNCHANGED, STILL STRONG

The panic-based play order system is untouched. No changes needed for this iteration. The state machine does not affect intra-combat mechanics.

### Pillar 2: "Elemental Mastery" — STRENGTHENED BY CARD LIBRARY

The card library system establishes elements as a first-class organizational concept. 9 element files, 72 cards, deterministic IDs grouped by element. When element-specific mechanics are added (resistances, status effects, elemental combos), the data infrastructure is ready.

### Pillar 3: "Forge Your Arsenal" — IMPROVED ARCHITECTURE, SAME DEPTH

The forge is now a proper game state with persistence and undo capability. But the player-facing experience is identical: pick a card, spend souls, get +2 power. The design depth has not changed -- only the engineering quality.

### Pillar 4: "Undead Camaraderie" — CURRENTLY 1v1

The team system is temporarily reduced: combat is now 1v1 (player vs NPC). Allies are deferred. This is the right call -- getting the state machine and NPC selection working in the simplest case first. But the 4-player trick-taking dynamic is absent, which means team buffs, cross-team weakness interactions, and the play-order information asymmetry are all diminished.

**New concern:** In 1v1, the panic system has less impact. With only 2 players, play order is binary (first or second). The nuanced "I play 3rd of 5, so I see 2 cards but not 2 others" dynamic is gone. When allies return, the panic system will regain its depth.

---

## 5. NPC/Encounter System Assessment

### 5.1 What Works

- **Auto-discovery:** `npcRegistry.js` scans `data/decks/` for JSON files, excludes `player.json`. Adding a new NPC is dropping a file -- no code changes needed. This is good design.
- **Difficulty metadata:** NPCs have a `difficulty` field, and the selection screen sorts by it. This creates a natural progression path.
- **NPC identity:** Each NPC has `name`, `description`, `aiType`, and `panic` fields that give them personality. Patches (Chaotic, panic 55) feels different from Solaire (Aggressive, panic 40).

### 5.2 What is Missing

- **Only 2 NPCs.** Patches and Solaire. For a meaningful encounter selection, 4-6 NPCs covering all AI types (Aggressive, Defensive, Chaotic) and difficulty tiers would be better.
- **No encounter modifiers.** Every fight is "3 rounds, same rules." Encounters need variety: different round counts, special trump rules, handicaps, or environmental effects.
- **No rewards beyond souls.** Winning a fight gives souls (from tricks won). There are no card drops, no unlockable NPCs, no progression gates. The loop is: fight → get souls → upgrade → fight stronger. This works as a core loop but lacks variety.
- **No difficulty scaling.** NPC card levels are fixed at generation time. A level-0 player fights the same Solaire as a fully-upgraded player. NPC difficulty should scale with player power or offer selectable difficulty tiers.

### 5.3 Encounter Design Readiness

For the RPG to have meaningful encounters, each fight needs to feel different. The current system supports different NPCs with different AI types, but the combat itself is mechanically identical every time. The next evolution should focus on encounter modifiers that change the rules of individual fights.

---

## 6. Developer Debug Mode Assessment

The CLI arg system is clean and functional:

```bash
node game.js                                    # normal play
node game.js --state forge --souls 200          # jump to forge with 200 souls
node game.js --state combat --npc patches       # fight Patches directly
node game.js --state deck-view                  # view deck and exit
node game.js --debug                            # debug flag (for future use)
node game.js --state combat --npc solaire --rounds 1  # quick 1-round test fight
```

This is exactly what the developer experience needed. Testing a forge change no longer requires playing through the menu. Testing combat no longer requires NPC selection. The `--rounds` flag allows fast iteration on combat balance.

**Missing:** The `--debug` flag is set on the context but nothing reads it yet. Future uses: show power calculations during tricks, display AI decision reasoning, show hidden opponent hands.

---

## 7. Code Health Update

### 7.1 v2 Issues Resolved

| v2 Issue | Status | Notes |
|---|---|---|
| #4: `game.js` uses raw ANSI codes | RESOLVED | `game.js` rewritten, no longer contains display code |
| #6: Global `nextId` counter for persistence | RESOLVED | Deck persistence uses card library IDs, not runtime counter |
| No game state object | PARTIALLY RESOLVED | `ctx` object exists, combat internals still use locals |

### 7.2 v2 Issues Resolved This Pass

| v2 Issue | Status | Resolution |
|---|---|---|
| #1: `ledElement` tracked but unused | RESOLVED | Removed from `resolveTrick()` return value. Local variable in `round.js` kept (used for AI lead/follow decision). |
| #2: `aiUpgradeChaotic` renamed but comment stale | RESOLVED | Fixed "Reckless Lead/Bid" comments to "Chaotic Lead/Bid" in `ai.js`. |
| #3: Panic floor hardcoded to 1 | RESOLVED | Added `CONFIG.PANIC_FLOOR` (value: 10). Replaced hardcoded values in `bidding.js` and `player.js`. |
| #5: No test coverage for bidding/round/player/upgrade | RESOLVED | Added `player.test.js` (15 tests), `deck.test.js` (10 tests), `round.test.js` (5 tests). Exported `scoreRound` from `round.js`. Total: 62 tests (up from 33). |

All v2 code issues are now resolved.

### 7.3 New Observations

1. **Test coverage nearly doubled to 62 tests.** New coverage: `player.js` (createPlayer, dealHand, removeFromHand, shuffle), `deck.js` (getCardLibrary, loadDeck, loadNPC), `round.js` (scoreRound). Async I/O-coupled functions (biddingPhase, playRound, playerUpgradePhase) remain untested -- they require refactoring to extract pure logic before unit testing is feasible.

2. **`player.json` has a card at level 8.** `{ "cardId": 1003, "level": 8 }` -- this is a test artifact. Level 8 costs 45 souls to reach cumulatively (10+15+20+25+30+35+40+45 = 220 souls). Either this is legitimate playtest data or the file was manually edited. Not a bug, but worth noting for balance: a level 8 card has base power + 16, which dominates any level 0 card regardless of element matchups.

3. **Deck generation script (`generate-deck.js`) allows duplicate card IDs.** The `buildCards()` function picks randomly from the library per element, but does not check for duplicates. A generated deck can have the same card twice. This may be intentional (multiple copies of a weapon) or a bug (you should not have two identical Greatswords). Worth a design decision.

4. **No validation that deck files have the right size.** `loadDeck()` accepts any number of cards. `CONFIG.COLLECTION_SIZE` is 27, but `player.json` has 27 cards while NPC decks are generated with `CONFIG.COLLECTION_SIZE` cards. If a save operation writes fewer cards (e.g., a bug drops one), the game would continue with a short deck and deal fewer cards per hand.

5. **`combat.js` does not configure round count dynamically.** The state reads `ctx.combatRounds || 3` but there is no mechanism for NPCs or encounters to specify their own round count. Adding `rounds` to the NPC JSON schema would be a trivial and useful extension.

---

## 8. Updated RPG Readiness Score

| Dimension | v2 Score | v3 Score | Change | Rationale |
|---|---|---|---|---|
| Core combat math | 8/10 | 8/10 | — | Untouched, still solid |
| Data model extensibility | 3/10 | 4/10 | +1 | Card library adds reference data layer; Card type still thin |
| State management | 2/10 | 5/10 | +3 | State machine + context exists; combat internals still unmanaged |
| AI extensibility | 2/10 | 2/10 | — | Untouched |
| Progression system | 3/10 | 4/10 | +1 | Forge persists, has save/discard; still flat +2 upgrades |
| Event/hook system | 1/10 | 1/10 | — | No events yet |
| Test coverage | 7/10 | 7/10 | — | 62 tests (up from 33). New coverage for player, deck, round modules |
| Module boundaries | 7/10 | 8/10 | +1 | State separation is clean, NPC registry is well-scoped |
| **Deck/Data system** | —  | **7/10** | **NEW** | Card library, reference IDs, persistence, generate script |
| **Developer experience** | — | **7/10** | **NEW** | CLI debug mode, direct state entry, configurable rounds |

**Overall RPG Readiness: 5.5/10** (up from 4/10)

The improvement is real but concentrated in architecture and tooling. The player-facing game experience is nearly identical to v2 -- the same combat, the same forge mechanic, the same power math. What changed is the ability to extend: adding a new NPC is dropping a JSON file, adding a new state is one file + one line in `game.js`, and player progress persists between sessions.

---

## 9. Recommended Next Steps

### Immediate (before next review)

1. **Add 2-3 more NPCs** covering the Defensive AI type and higher difficulty tiers. The encounter selection screen with only 2 choices feels like a placeholder.

2. **Add encounter variety** -- let NPC JSON files specify `rounds` (override the default 3) and optionally a fixed `trumpElement` (forced trump for thematic encounters, e.g., Solaire always forces Light as trump).

3. **Write tests for `deck.js`** -- specifically `getCardLibrary()`, `resolveCard()`, and `loadDeck()`. These are the data foundation; if they break, everything breaks.

### Medium-term (next major evolution)

4. **Implement follow-suit or remove `ledElement`** -- this has been deferred twice now. It is dead code. Either make it matter or clean it up.

5. **Begin event hooks** -- start with `onRoundEnd(result, ctx)` in `combat.js`. Even a simple callback pattern would allow the RPG layer to react to combat outcomes without modifying `round.js`.

6. **Add card abilities to the data model** -- start with 1-2 simple abilities (e.g., "trump bonus +2" or "immune to weakness penalty") as fields in `data/cards/` JSON. Modify `computeTrickPowers()` to check for them. This is the minimum viable RPG card differentiation.

### Deferred (correct to defer)

- Entity type hierarchy (wait until mob mechanics are designed)
- Full AI framework rewrite (wait until event system exists)
- Branching forge paths (wait until card abilities exist)
- Ally/party system (wait until 1v1 encounters are polished)

---

## 10. Summary

### What is Strong
- State machine architecture is clean, minimal, and extensible
- Card library reference system is well-designed with deterministic IDs
- Deck persistence works correctly with save/discard flow
- NPC auto-discovery makes content creation trivial
- Developer debug mode enables fast iteration
- All 33 existing tests still pass -- zero regressions

### What Needs Work
- Combat internals (trump, trick history) are not part of managed state
- AI remains stateless and context-blind
- Forge upgrade is still a flat +2 power machine
- No event system for RPG hooks
- Test coverage ratio declined (new modules untested)
- Only 2 NPCs -- needs more for meaningful encounter selection
- 1v1 combat reduces depth of panic and team systems

### The One-Sentence Design Direction
The RPG skeleton is standing -- now it needs muscles: card abilities for combat depth, event hooks for system integration, and encounter variety for player motivation.
