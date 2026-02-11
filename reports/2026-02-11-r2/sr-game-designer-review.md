# Sr Game Designer Review v2: BatakSouls

**Date:** 2026-02-11
**Reviewer:** Sr Game Designer Agent
**Build:** Post-fix pass -- panic system, balanced bonuses, modular architecture, unit tests
**Focus:** Fresh assessment of current state + RPG evolution readiness

---

## 1. Executive Summary

BatakSouls has made strong progress since the first review. The P0 bugs are gone, architecture is cleaner, the panic system adds genuine tactical tension, and the power modifiers are now symmetrical (+4 trump = +4 weakness). The game is in a stable, playable state with 33 passing tests and clear module boundaries.

However, this review shifts focus: the card game is about to become the **combat engine** inside an RPG. That transition demands specific architectural and design preparation. The card game itself still has open balance items (catch-up mechanics, team-size scaling, endgame drama) that the v1 review deferred to "RPG evolution will handle." This report evaluates whether the current foundation can actually support that evolution, and what must change before the RPG layer arrives.

**Verdict:** The trick-taking core is solid for its scope. It is NOT yet RPG-ready. The data model, progression systems, and AI decision framework all need structural expansion before enemies can become mobs with stats, the forge can offer meaningful choices, and player identity can exist beyond "person who picks cards."

---

## 2. Core Design Pillars Assessment

Based on the codebase and player experience, BatakSouls currently rests on four implicit design pillars. I will name them, evaluate each, and flag which ones survive the RPG transition.

### Pillar 1: "Read the Battlefield" -- Positional Information Warfare

**What it is:** The panic-ordered play system means you see what earlier players played before committing your card. Higher panic = play earlier = reveal your intent = disadvantage. This is the central strategic axis of the game.

**Assessment: STRONG.**
The panic system is the best design decision in the game. It creates a clean information asymmetry that is:
- Intuitive (panicked people act rashly, calm people act with knowledge)
- Thematic (Dark Souls is about patience and reading enemy patterns)
- Dynamic (trick winners gain +0.5 panic, so winning has a cost)
- Bid-integrated (bid winner gets -2 panic as reward)

**Concern:** Panic currently ranges from 1-10 with 0.5 increments. Over 12 tricks, the winner accumulates +6.0 panic. A player starting at panic 3 who wins 8 tricks reaches 7.0 -- a significant shift. But a player at panic 8 who wins 0 tricks stays at 8.0. The system self-balances for winners but does nothing for consistent losers. Losers stay stuck at high panic with no relief mechanism beyond bidding.

**RPG survival:** This pillar MUST survive. In the RPG, "Read the Battlefield" becomes "Read the Encounter." Mob types, telegraphed attacks, and positional play all map cleanly to this pillar.

### Pillar 2: "Elemental Mastery" -- Rock-Paper-Scissors Depth

**What it is:** Two interlocking weakness wheels (6 mystical + 3 physical) create a 9-element system where every card has exactly one element it beats and one that beats it. Cross-team weakness interactions swing +/-4 power, same as trump.

**Assessment: SOLID but with hidden fragility.**
The dual-wheel design is elegant. The 6-element mystical wheel gives enough variety that memorizing matchups takes effort, while the 3-element physical wheel is immediately graspable. The two wheels being completely separate (no cross-wheel interactions) is the right call -- it keeps cognitive load manageable.

**Concern:** The current system has an asymmetry problem: mystical elements (6 of them, 66% of the pool) have a 1-in-6 chance of encountering their weakness in a random draw, while physical elements (3 of them, 33% of the pool) have a 1-in-3 chance. Physical cards are statistically more volatile -- they hit weaknesses more often AND get hit more often. This is not necessarily a problem (it could be a feature: "physical cards are high-risk, high-reward"), but it is not acknowledged or leveraged in the current design.

**RPG survival:** Critical. The element system IS the combat language. But it needs expansion hooks: elemental resistances on mobs, multi-element cards, element-specific status effects. None of these exist in the current data model.

### Pillar 3: "Forge Your Arsenal" -- Persistent Progression

**What it is:** Between rounds, spend souls to level cards. Costs scale (10+level*5), power increases (+2 per level), max level 10. AI has personality-driven upgrade strategies (aggressive = upgrade strongest, defensive = spread evenly, reckless = random).

**Assessment: FUNCTIONAL but FLAT.**
This is the weakest pillar. Every upgrade does exactly one thing: +2 power. There is no decision beyond "which card gets the +2." The soul economy is also linear -- more tricks won = more souls = more upgrades. No variance, no surprise, no trade-offs.

The v1 review flagged this as "RPG evolution will handle." That is correct, but the current architecture makes it hard to handle. The `Card` type has exactly 4 fields: `id`, `element`, `name`, `basePower`, `level`. There is no room for abilities, traits, enchantments, or any modifier beyond raw power. Adding them requires expanding the data model, which touches `card.js`, `player.js`, `ai.js`, `upgrade.js`, `ui.js`, and all test files.

**RPG survival:** This pillar must be REBUILT, not preserved. The forge needs to become a meaningful decision space with branching upgrade paths, not a +2 vending machine.

### Pillar 4: "Undead Camaraderie" -- Team-Based Trick-Taking

**What it is:** Human + AI allies vs AI enemies. Same-team same-element cards buff each other (+2). Cross-team weakness interactions provide the elemental combat layer. Team identity is baked into play order, scoring, and win conditions.

**Assessment: PROMISING but UNDERCOOKED.**
The team system is unique for trick-taking games and fits Dark Souls perfectly (summoning phantoms to help). But the current implementation is shallow:
- Allies and enemies use the same AI types with no team-aware behavior
- No coordination mechanism exists (allies cannot signal, share information, or plan)
- The same-element team buff (+2) is weak enough to be ignorable in most situations
- Win condition is individual (highest souls), not team-based

**RPG survival:** This pillar transforms into "party vs encounter." The team concept is essential, but it needs to evolve from "same AI on your side" to "party members with roles."

---

## 3. Balance State

### 3.1 What Improved Since v1

| Issue | v1 State | v2 State | Verdict |
|---|---|---|---|
| Trump bonus vs weakness | +3 vs +4 (trump felt irrelevant) | Both +4 (symmetric) | Fixed correctly |
| Stacking escalation | +4, +5, +6... (exponential) | +4 first, +1 each subsequent | Fixed -- diminishing returns work |
| Last-player advantage | Massive, unmitigated | Panic system: winners play earlier | Addressed well |
| Power calculation DRY | 3 places, one hardcoded | `rawPower()` used everywhere | Fixed |
| AI weakness (Chaotic) | Pure random, always lost | Reckless 70/30 strong/random | Improved |

### 3.2 Remaining Balance Concerns

**Team Size Imbalance (deferred from v1, still open).**
With 1 human + 3 allies vs 1 enemy, the lone enemy faces 4 opponents. The same-element team buff means allies can coordinate (accidentally) for +2 each, and the enemy has nobody to synergize with. The weakness interaction system compounds this: 4 players have 4 chances to play elements strong against the enemy. In a 4v1, the enemy wins approximately 1.5-2 tricks out of 12 unless they have significantly higher-level cards.

This WILL matter for the RPG: if enemies become mobs, a lone boss mob in a 4v1 trick game is mathematically doomed. Boss encounters need mechanics beyond "one mob plays cards."

**Catch-Up Mechanic (deferred from v1, still open).**
The panic system partially addresses this: winners gain panic, making them play earlier. But the soul economy still has no rubber-banding. A player who falls behind in round 1 has fewer upgrades, weaker cards, and wins even fewer tricks in round 2. The spiral is gentle but consistent across 7 rounds.

**Panic Does Not Reset Between Rounds.**
This is a subtle issue I did not see flagged in v1. Panic accumulates across rounds. A player who wins 8 of 12 tricks gains +4.0 panic. In the next round, they play earlier in every trick. The bid winner gets -2 reduction, which partially compensates, but panic drift over 7 rounds could push a dominant player to always-first play order, which is actually self-correcting (they are disadvantaged). The question is whether the self-correction is strong enough or whether it oscillates. Without simulation data, this is an open question.

**Led Element Has No Mechanical Weight.**
The `ledElement` is tracked in `resolveTrick()` and returned in the result, but nothing in the game uses it. In traditional trick-taking (Batak, Bridge, Hearts), you MUST follow the led suit if you have it. BatakSouls has no follow-suit rule. This is a deliberate simplification, but it removes an entire axis of strategic constraint. The led element is dead data.

Recommendation: Either implement a follow-suit rule (adds depth, matches Batak heritage) or remove `ledElement` tracking to avoid confusion. For the RPG evolution, follow-suit could map to "mob vulnerability windows" -- the mob leads with an element, and you must respond to it.

### 3.3 Power Range Analysis

Understanding the theoretical power range is essential for balance tuning:

| Component | Min | Max | Notes |
|---|---|---|---|
| Base power | 3 | 10 | Random at card creation |
| Level bonus | 0 | +20 | level*2, max level 10 |
| Trump bonus | 0 | +4 | If card element matches trump |
| Same-element team buff | 0 | +2 per teammate | Max +6 with 3 allies playing same element |
| Weakness empower | 0 | +4 first, +1 each | Max +7 vs 4 enemies playing weak element |
| Weakness weaken | 0 | -4 first, -1 each | Max -7 vs 4 enemies playing strong element |
| **Theoretical min** | **3 - 7 = -4** | | Level 0, no trump, 4 weakness penalties |
| **Theoretical max** | **10 + 20 + 4 + 6 + 7 = 47** | | Max level, trump, 3 allies, 4 enemies weak |

The realistic range in a typical 2v2 game is roughly 3-22. The gap between a level 0 card (3-10) and a level 10 card (23-30) means late-game rounds are dominated by whoever invested most efficiently. A level 10 card with base 10 has raw power 30, which beats a level 0 card with base 10 even if the level 0 card gets trump (+4) AND weakness bonus (+4) = 18. Upgrades outscale all other bonuses by round 5+.

This is fine for the current card game (it makes upgrades feel rewarding), but for the RPG, it means mob difficulty must scale with player card levels or encounters become trivial.

---

## 4. Strategic Depth Assessment

### 4.1 Meaningful Decisions Currently in the Game

| Decision Point | When | Depth | Assessment |
|---|---|---|---|
| **Bid card selection** | Start of round | Medium | Which card to sacrifice? Bid high to set trump, or bid low to save strong cards? The -2 panic reward for winning the bid is a real incentive. But the blind simultaneous bid means you cannot react to opponents -- it is pure read/prediction. |
| **Card play selection** | Each trick | Medium-High | Best decision point in the game. You see what earlier players played (based on panic ordering), you know the trump suit, you know which elements counter what is on the table. The information gradient from first-player to last-player creates genuinely different strategic contexts. |
| **Upgrade selection** | Between rounds | Low | Which card to upgrade? Only consideration is "which card do I want to be +2 stronger?" No trade-offs, no branching paths, no opportunity cost beyond souls. |

### 4.2 Decisions That Should Exist But Don't

**No follow-suit constraint.** As noted above, you can play any card at any time. This removes the tension of "I want to play my Fire card for the weakness bonus, but I must follow the led Light suit because I have Light cards."

**No information about opponent hands.** In traditional trick-taking, you can count cards and deduce what opponents hold. BatakSouls hands are drawn from a 26-card collection randomly each round, so card counting is impossible. The bid phase reveals one card per player, which is something, but after that, all information is within the current trick.

**No team communication.** Allies cannot signal their intent. In Bridge, partners bid to communicate hand strength. BatakSouls allies are black boxes to each other.

**No risk/reward trade-off in card play.** Playing your strongest card is almost always correct (unless you want to preserve it). There is no mechanic like "if you play a card much stronger than needed, the excess power is wasted" or "winning by a large margin triggers a bonus."

### 4.3 Depth Verdict

The game has **one strong decision axis** (which card to play in a trick, informed by positional knowledge) and **two weak ones** (bid selection, upgrade selection). For a card game, this is acceptable. For an RPG combat engine, it is insufficient. Players need more knobs to turn.

---

## 5. RPG Readiness Assessment

This is the critical section. The upcoming evolution will transform BatakSouls from a standalone card game into a combat system embedded in an RPG. Enemies become mobs. The forge becomes a progression system. Player identity extends beyond card choice. Here is what the current codebase can and cannot support.

### 5.1 Data Model Gaps

**Card type is too thin.**
```js
// Current (card.js)
{ id, element, name, basePower, level }
```
For the RPG, cards need:
- `abilities: []` -- triggered effects (draw, heal, poison, etc.)
- `traits: []` -- passive modifiers (e.g., "this card ignores weakness penalties")
- `rarity: string` -- common/uncommon/rare/legendary
- `upgradePath: object` -- branching upgrade options beyond +2 power
- `source: string` -- where the card came from (mob drop, forge craft, quest reward)

**Player type conflates human, ally AI, and enemy AI.**
```js
// Current (player.js)
{ name, isHuman, aiType, team, panic, collection, hand, tricksWon, souls, totalSouls }
```
For the RPG:
- Human player needs: `stats`, `equipment`, `inventory`, `questProgress`, `bonfireCheckpoint`
- Ally NPCs need: `loyalty`, `relationship`, `specialAbility`, `dialogueState`
- Enemy mobs need: `hp`, `attackPattern`, `lootTable`, `difficulty`, `phaseThresholds`

Cramming all of these into one `createPlayer()` function with boolean flags is unsustainable. The RPG needs distinct entity types with a shared combat interface.

**No game state object.**
The current game state is distributed across:
- `players` array (passed around by reference)
- `trumpElement` (local variable in `playRound`)
- `lastWinner` (local variable in `playRound`)
- `roundNum` / `totalRounds` (loop variables in `game.js`)

For the RPG, there needs to be a serializable `GameState` or `EncounterState` object that can be saved, loaded, and passed between systems. The current "state lives in local variables" approach cannot survive the addition of save/load, encounter selection, or overworld navigation.

### 5.2 Architecture Gaps

**No event system.**
Every interaction in the game is a direct function call. When a trick is won, `round.js` directly increments `tricksWon` and `panic`, then calls `showTrickResult()`. For the RPG, trick resolution needs to trigger:
- Status effect checks
- Ability activations
- Mob phase transitions
- Loot drops
- Achievement/quest progress
- Animation/sound hooks

An event emitter pattern (`on('trickWon', handler)`) or a simple hook system would let the RPG layer extend combat behavior without modifying the core trick engine.

**AI cannot reason about game state.**
Current AI functions receive `(hand, trumpElement)` and return a card. They have no knowledge of:
- What has been played this trick (except through the lead element, and even then they do not use it)
- What cards other players have played in previous tricks
- Their own panic or position in play order
- The team composition or current scores
- The specific enemy/encounter they are fighting

For the RPG, mob AI needs to be encounter-aware: a boss should play differently at 20% HP than at 80% HP. An ally should adapt to the player's strategy. None of this is possible with the current `(hand, trumpElement) => Card` signature.

**Upgrade system is hardcoded to +2 power.**
The `playerUpgradePhase` and `aiUpgradePhase` functions directly mutate `card.level` and assume `level * CONFIG.LEVEL_POWER_BONUS` is the only effect. For the RPG forge rework, the upgrade system needs to support:
- Multiple upgrade types per card
- Upgrade prerequisites (unlock path B at level 3)
- Material costs beyond souls (mob drops, rare items)
- Irreversible choices (infuse with Fire = this card becomes Fire element permanently)

### 5.3 What CAN Be Reused

Despite the gaps, significant portions of the current code are RPG-ready:

| Module | Reusable? | Notes |
|---|---|---|
| `constants.js` | Yes | Element wheels, weakness logic, CONFIG values -- all clean |
| `card.js: computeTrickPowers()` | Yes | Core combat math. Sub-functions are clean. Needs hooks, not rewrites |
| `trick.js: resolveTrick()` | Yes | Pure function, well-tested. Add event emission, keep logic |
| `ansiColors.js` | Yes | Presentation utility, no game logic |
| `ui.js` | Partially | Display functions are clean but tightly coupled to current data shapes |
| `input.js` | Yes | Generic input handling, game-agnostic |
| `bidding.js` | Yes | Already extracted, well-scoped. May need RPG-specific variants |
| `player.js` | No | Must be split into Player, Ally, Mob entity types |
| `ai.js` | No | Must be rebuilt with state-aware decision trees |
| `upgrade.js` | No | Must be rebuilt for branching forge system |
| `round.js` | Partially | Orchestration logic is fine, but needs event hooks and state management |
| `game.js` | No | Must become an encounter launcher, not a monolithic game loop |

### 5.4 RPG Readiness Score

| Dimension | Score | Rationale |
|---|---|---|
| Core combat math | 8/10 | Trick resolution, element wheels, power calculation are solid |
| Data model extensibility | 3/10 | Card and Player types are too thin, no entity hierarchy |
| State management | 2/10 | No game state object, state lives in local variables |
| AI extensibility | 2/10 | AI has no access to game state, cannot adapt to encounters |
| Progression system | 3/10 | Forge is a flat +2 machine, no branching or variety |
| Event/hook system | 1/10 | No events, no hooks, no middleware pattern |
| Test coverage of combat | 7/10 | 33 tests cover core math well, but no integration tests |
| Module boundaries | 7/10 | Clean separation post-v1 fixes, good foundation |

**Overall RPG Readiness: 4/10** -- The combat math kernel is reusable, but the surrounding architecture needs significant expansion before RPG systems can plug in cleanly.

---

## 6. Design Risks for the RPG Evolution

### Risk 1: "Second System Effect"

The RPG layer is much more ambitious than the card game. There is a temptation to rebuild everything at once -- new entity system, new forge, new AI, overworld, quests, saves -- which would mean months of work before anything is playable again. The current game works. Losing that playable state during a rewrite is the biggest risk.

**Mitigation:** Incremental evolution. Every change should leave the game playable. Add one RPG feature at a time, validate it works within the existing trick-taking loop, then add the next.

### Risk 2: Boss Encounters Break the Trick Model

The current trick-taking model assumes 2-5 roughly equal participants. A boss mob with 500 HP and a deck of 50 cards breaks every assumption:
- How many rounds = how many HP?
- Does the boss play multiple cards per trick?
- Can the boss change element mid-fight?
- What happens when the boss is "staggered"?

If the trick model cannot express these encounters, the entire combat system must be replaced, not extended.

**Mitigation:** Design boss encounters as "multi-round trick sequences" where the boss's deck and behavior evolve across phases, rather than trying to make one trick = one attack. The current 12-trick round structure could become "Phase 1: boss uses Fire deck, Phase 2: boss switches to Dark deck."

### Risk 3: Forge Rework Invalidates Existing Progression

If the forge changes from "+2 power per level" to a branching tree, existing card levels become meaningless. Players who have been upgrading for 3 rounds have invested in a system that no longer exists.

**Mitigation:** Make the current +2-per-level system the "base path" in the new forge. Branching options are ADDITIONS at certain level thresholds (e.g., "at level 3, choose: +2 more power OR gain Pierce resistance"). Existing investment is preserved.

### Risk 4: AI Complexity Explosion

Current AI is ~120 lines with 3 personality types. RPG-aware AI that can evaluate encounter state, manage mob phases, coordinate with allies, and adapt to player strategy could easily be 1000+ lines. Without a proper decision framework (behavior trees, utility AI, or state machines), the AI code becomes an unmaintainable if/else cascade.

**Mitigation:** Invest in an AI framework before adding RPG AI behaviors. Even a simple utility-based system (`score each card based on weighted factors, pick highest`) scales much better than the current switch/reduce pattern.

### Risk 5: The Card Game Stops Being Fun

The RPG layer adds complexity on TOP of the trick-taking game. If players must manage HP, inventory, quests, AND play 12 tricks per combat, the cognitive load may become exhausting. The card game's current elegance (pick a card, see what happens) could be buried under systems.

**Mitigation:** The trick-taking game should SIMPLIFY as the RPG layer grows. Fewer tricks per encounter (maybe 6 instead of 12). Auto-play options for trivial encounters. The RPG decisions (party composition, forge choices, encounter selection) should replace some of the per-trick decisions, not stack on top of them.

---

## 7. Recommended Design Priorities for the RPG Layer

Ordered by "implement this first" priority. Each item builds on the previous.

### Priority 1: Encounter State Object

**Why first:** Everything else depends on having a proper state container. Cannot add mob phases, save/load, or state-aware AI without it.

**What to build:**
```
EncounterState {
  players: CombatEntity[]
  mobs: CombatEntity[]
  trumpElement: string | null
  currentRound: number
  currentTrick: number
  trickHistory: TrickResult[]
  phase: string  // 'bidding' | 'tricks' | 'resolution' | 'forge'
}
```

**Acceptance test:** The entire game can be reconstructed from a serialized EncounterState.

### Priority 2: Entity Type Hierarchy

**Why second:** Mobs need different data than players. Allies need different data than enemies. The flat `Player` type cannot express this.

**What to build:**
```
CombatEntity (shared interface: name, team, hand, panic, tricksWon)
  -> PlayerEntity (extends: collection, souls, inventory, stats)
  -> AllyEntity (extends: loyalty, specialAbility, aiPersonality)
  -> MobEntity (extends: hp, lootTable, attackPattern, phases)
```

All existing combat code (`computeTrickPowers`, `resolveTrick`) should work with the `CombatEntity` interface. RPG-specific code works with the concrete types.

### Priority 3: Event Hooks on Combat Resolution

**Why third:** The forge rework, mob phases, and ability system all need to react to combat events. Adding hooks now means those systems can be built independently.

**What to build:**
- `onTrickResolved(result)` -- for loot drops, phase transitions, status effects
- `onRoundEnd(scores)` -- for XP awards, relationship changes, checkpoint saves
- `onCardPlayed(play)` -- for triggered abilities, counter-attacks, combo tracking

### Priority 4: Expanded Card Data Model

**Why fourth:** Cannot build a meaningful forge without card abilities and traits. Cannot create interesting mob decks without card variety.

**What to build:**
- Add `abilities: Ability[]` to Card type (start with 2-3 simple abilities)
- Add `traits: string[]` to Card type (passive modifiers like "ignores weakness")
- Add `rarity: string` to Card type
- Modify `computeTrickPowers` to check for abilities/traits during resolution

### Priority 5: State-Aware AI Framework

**Why fifth:** With the entity hierarchy and event system in place, AI can now receive the full encounter state and make informed decisions.

**What to build:**
- Replace `(hand, trumpElement) => Card` with `(hand, encounterState) => Card`
- Implement utility-based scoring: each AI personality weights factors differently
- Add mob-specific AI: boss phases, attack patterns, target selection

### Priority 6: Forge Rework

**Why sixth:** With the expanded card model and event system, the forge can now offer meaningful choices.

**What to build:**
- Keep +2 power as the "base upgrade path"
- Add branching options at level thresholds (3, 5, 7, 10)
- Add material costs from mob drops (not just souls)
- Add irreversible infusion choices (element change, ability grant)

---

## 8. Open Items from v1 (Deferred, Still Valid)

These items were deferred in the v1 review as "RPG evolution will handle." They remain valid concerns:

| ID | Issue | RPG Resolution Path |
|---|---|---|
| BAL-04 | No catch-up mechanic | RPG encounter selection: losing players choose easier encounters for guaranteed loot/souls |
| BAL-05 | Team size imbalance (1v4 unwinnable) | Mobs get multi-card plays, HP pools, and phase mechanics to offset numerical disadvantage |
| BAL-06 | Majority bonus too small (+15) | Replace with encounter-specific rewards: boss loot > trash mob loot |
| BAL-07 | Bidding cost too high | Make bid card recoverable through forge or encounter rewards |
| UX-02 | Bidding strategy guidance | Tutorial encounter that teaches bidding through a scripted scenario |
| UX-03 | Endgame drama | Boss encounter IS the endgame drama -- multi-phase fight with escalating stakes |
| UX-04 | Upgrade variety beyond +2 | Forge rework (Priority 6 above) |

---

## 9. Minor Code Issues Observed

These are not blockers but are worth noting for code health:

1. **`ledElement` is tracked but unused.** `resolveTrick()` returns it, `round.js` tracks it, but no game rule references it. Either implement follow-suit or remove the dead tracking.

2. **`aiUpgradeChaotic` function was renamed to `aiUpgradeReckless` but the comment still says "Random upgrades."** The comment should reflect the rename rationale.

3. **Panic floor is 1, not 0.** `Math.max(1, ...)` in `bidding.js` line 51. This means panic can never reach 0. Is this intentional? If panic 0 means "you always play last" (maximum advantage), then the floor prevents a player from ever achieving perfect calm. This is fine thematically (you are Undead, zero panic is impossible), but it should be a CONFIG constant, not a hardcoded 1.

4. **`game.js` still uses raw ANSI codes** (`\x1b[93m`, `\x1b[91m`, `\x1b[92m`) for the ally/enemy/victory text on lines 35, 44, 76, 79 instead of using the `ansiColors.js` utility or `ELEMENT_COLORS` constants. This was not flagged in v1 but is inconsistent with the otherwise clean color management.

5. **No test coverage for bidding, round, player, or upgrade modules.** The 33 tests cover `card.js`, `trick.js`, and `constants.js` only. The bidding tally logic, panic modification, score calculation, and AI upgrade strategies are all untested. For the RPG evolution, these modules will change significantly -- having test coverage before refactoring would prevent regressions.

6. **Global `nextId` counter in `card.js` (line 41).** Flagged in v1, still present. For the RPG (save/load, multiple encounter instances), card IDs must be deterministic or UUID-based. The module-level counter will produce different IDs depending on test execution order.

---

## 10. Summary

### What is Strong
- The panic-based play order system is an excellent core mechanic
- Element wheels are well-designed and well-tested
- Trick power resolution math is clean, modular, and correct
- Module boundaries are clear post-v1 fixes
- Dark Souls theming is consistent and effective

### What Needs Work for RPG
- Data model must expand (Card abilities, Entity hierarchy, Game state object)
- AI must become state-aware (current AI is stateless and context-blind)
- Forge must offer meaningful choices (branching paths, material costs)
- Event system must exist for RPG systems to hook into combat
- Follow-suit rule should be decided: implement or remove `ledElement`

### The One-Sentence Design Direction
The trick-taking engine is the **combat heartbeat** of the RPG -- keep it fast, keep it readable, and let the RPG layer wrap around it rather than replacing it.
