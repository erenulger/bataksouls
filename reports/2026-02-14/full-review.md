# BatakSouls Full Review -- 2026-02-14

**Compiled by:** Master Orchestrator
**Agents:** Sr Game Designer, QA Agent, Data Scientist, Game Feel Developer
**Build:** Post-AI overhaul -- 5 AI personalities, mood system, context-aware combat, expanded NPC roster, deck analyzer, element wheel UI
**Previous Reviews:** 2026-02-12 (v3, RPG readiness 5.5/10), 2026-02-13 (AI behaviour report)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Sr Game Designer Review](#2-sr-game-designer-review)
3. [QA Report](#3-qa-report)
4. [Data Scientist Balance Analysis](#4-data-scientist-balance-analysis)
5. [Game Feel Review](#5-game-feel-review)
6. [Cross-Agent Findings](#6-cross-agent-findings)
7. [Prioritized Action Items](#7-prioritized-action-items)

---

# 1. Executive Summary

BatakSouls has made its most significant leap since the architecture pass. The game has gone from "trick-taking card game with RPG scaffolding" to "an HP-based combat card game with readable AI opponents, team mechanics, and a working progression loop."

**Key changes since last review (2026-02-12):**

| Dimension | v3 State | v4 State |
|---|---|---|
| AI personalities | 3 (blind, context-free) | 5 (context-aware, mood system, element counters) |
| Combat model | Round-based scoring | HP-based elimination with mid-round death |
| NPC roster | 2 (Solaire, Patches) | 9 deck files (+ Rat, FooSupport, 4x Undead variants) |
| Event system | None | EventBus with 7 event types |
| UI | Basic text output | Element wheel overlay, HP bars, team tags, ANSI colors |
| Multi-combatant | 1v1 only | N-vs-M supported via CLI flags |
| Tests | 62 | 194 across 9 files |
| Tooling | CLI debug mode | + Deck analysis tool with composite scoring |

**RPG Readiness: 7.2/10** (up from 5.5/10)

---

# 2. Sr Game Designer Review

## 2.1 Core Loop Analysis

The loop is mechanically complete:

```
Fight (trick-taking combat) --> Earn Souls (on enemy kill) --> Forge Upgrades (+2 power/level) --> Fight Stronger
```

**Strengths:**
- Every step is implemented and functional
- Soul rewards scale with NPC difficulty (10 for trash, 50-100 for named NPCs)
- Forge has snapshot-based save/discard flow

**Weaknesses:**
- Economy is flat -- no "breakthrough" moment where player unlocks a new power tier
- `SOULS_PER_TRICK` and `MAJORITY_BONUS` in CONFIG are vestigial -- never used in combat flow
- No failure penalty. Losing costs nothing except time. Thematically at odds with Dark Souls

## 2.2 Design Pillar Assessment

| Pillar | Score | Assessment |
|---|---|---|
| "Read the Battlefield" | 8/10 | Strongest pillar. Panic play-order, trick visibility, element wheel HUD |
| "Elemental Mastery" | 7/10 | 9 elements, two wheels, trump/weakness/team-buff system. ~33% of matchups are "dead" (no cross-wheel interaction) |
| "Forge Your Arsenal" | 4/10 | Functional but one-dimensional. Every upgrade is +2 power. No branching, no abilities, no materials |
| "Undead Camaraderie" | 5/10 | Multi-combatant architecture exists but only accessible via CLI. Standard game is 1v1 |

## 2.3 AI System Review

The AI (`src/ai.js`, 368 lines) was completely rebuilt:

- **5 personalities:** Aggressive, Defensive, Chaotic, Trickster, Supportive
- **Mood system:** One-way HP-threshold transitions (Aggressive -> Desperate at <25% HP, etc.)
- **Context-aware:** AI sees plays on table, teams, element matchups via `estimateMyPower()`
- **92 tests** covering all personalities, moods, and edge cases

**Personality signatures:**
- **Aggressive (Solaire):** Always strongest. Seeks element counters when following. Desperate mode at low HP
- **Defensive:** Midrange leads, justBeats follow, dumps weakest when losing. Last Stand flips aggressive
- **Chaotic (Undead/Rat):** Pure random. No awareness. The "mindless tax"
- **Trickster (Patches):** Odd tricks = aggressive, even = defensive. Coward at <50% HP
- **Supportive (FooSupport):** Matches ally elements for +2 buff. Falls back to defensive solo

**Gaps:** No bid awareness of hand composition. Trickster pattern is fully predictable (odd/even). No endurance awareness (P2 from behavior report, still unimplemented).

## 2.4 NPC Roster

| NPC | AI Type | HP | Panic | Souls | Assessment |
|---|---|---|---|---|---|
| Rat | Chaotic | 20 | 100 | 10 | Trivial fodder |
| Undead (x4) | Chaotic | 20 | 100 | 10 | Trivial, all share same name |
| Patches | Trickster | 80 | 55 | 50 | Good mid-tier |
| FooSupport | Supportive | 90 | 25 | 55 | Placeholder name. Personality wasted in 1v1 |
| Solaire | Aggressive | 120 | 40 | 100 | Strong boss-tier |

**Missing:** No Defensive NPC exists (3rd consecutive review flagging this). No Siegmeyer equivalent.

## 2.5 RPG Readiness Score

| Dimension | v3 | v4 | Change |
|---|---|---|---|
| Core combat math | 8/10 | 9/10 | +1 |
| Data model extensibility | 4/10 | 4/10 | -- |
| State management | 5/10 | 6/10 | +1 |
| AI extensibility | 2/10 | 8/10 | **+6** |
| Progression system | 4/10 | 4/10 | -- |
| Event/hook system | 1/10 | 6/10 | **+5** |
| Test coverage | 7/10 | 9/10 | +2 |
| Module boundaries | 8/10 | 8/10 | -- |
| Deck/Data system | 7/10 | 7/10 | -- |
| Developer experience | 7/10 | 8/10 | +1 |
| **Overall** | **5.5/10** | **7.2/10** | **+1.7** |

---

# 3. QA Report

## 3.1 Test Coverage

**Total: 194 tests** across 9 files.

| File | Tests | Coverage |
|------|-------|----------|
| `ai.test.js` | 92 | Excellent -- all personalities, moods, helpers |
| `player.test.js` | 22 | Good |
| `combat.test.js` | 22 | Good |
| `card.test.js` | 18 | Good |
| `eventBus.test.js` | 16 | Good |
| `deck.test.js` | 10 | Good |
| `constants.test.js` | 9 | Good |
| `trick.test.js` | 5 | Adequate |
| `round.test.js` | 0 | **EMPTY** |

**Modules with ZERO test coverage:** `round.js`, `bidding.js`, `upgrade.js`, `input.js`, `ui.js`, `npcRegistry.js`, `engine.js`, `context.js`, all `states/*.js`, `deckAnalysis.js`

## 3.2 Bugs Found

### CRITICAL

**BUG-01: Event listener leak -- souls duplication across combats**
- `src/states/combat.js:30` -- `ctx.events.on('onPlayerDefeated', ...)` registers a new listener every combat but never removes it. After N fights, each enemy death awards souls N times.
- **Impact:** Real currency exploit. Souls multiply with each fight.

### HIGH

**BUG-03: `savePlayerDeck` does not persist souls**
- `src/context.js:31-39` -- Save format only stores `{name, cards}`. If process terminates after forge save but before next session, souls spent on upgrades are lost but upgrades are kept.
- **Impact:** Free upgrades on unexpected termination.

**BUG-05: `resolveTrick` returns null on empty plays array**
- `src/trick.js:9` -- Returns `null` if no plays. Caller at `round.js:189` accesses `result.winner.tricksWon++` without null check.
- **Impact:** Potential crash if all players die from endurance before playing cards.

**BUG-06: `round.js` mutates `ctx.combatPlayers` via splice**
- `src/round.js:80-81,125-126,235-236` -- Dead players permanently removed. Combat result screen only shows survivors, never shows defeated enemies at HP=0.

### MEDIUM

**BUG-02: Player deck has 27 cards, CONFIG.COLLECTION_SIZE is 26**
- `data/decks/player.json` vs `src/constants.js:103`
- Tutorial tells player "26 cards per player" which is wrong for actual deck.

**BUG-07: Missing ID x005 cards in every element**
- All `data/cards/*.json` skip IDs ending in 005 (e.g., 1005, 2005... 9005)
- 8 cards per element instead of expected 9. Content gap.

**BUG-09: `combatSetup.js` resets `totalSouls` to 0 every fight**
- `src/states/combatSetup.js:44` -- `ctx.player.totalSouls = 0` nukes tracking.

**BUG-10: Trickster odd/even pattern is fully deterministic**
- `src/ai.js:274-275` -- Player can always predict Patches' behavior.

**BUG-11: `deckAnalysis.js` executes on require()**
- CLI code at module top level prevents unit testing of analysis functions.

### LOW

**BUG-13/14: Dead code** -- `showRoundScores` and `showFinalScoreboard` in `ui.js` are exported but never called.

**BUG-15: Panic randomization formula duplicated** between `player.js:7` and `combatSetup.js:45`.

## 3.3 Regression Risks (Highest to Lowest)

1. **`round.js` (280 lines)** -- Most complex file, zero tests, interlocking loops with death handling
2. **`bidding.js`** -- Modifies panic, removes cards, determines trump. Zero tests
3. **`combat.js` state** -- Event listener leak means refactoring interacts with accumulated listeners
4. **`deck.js` card resolution** -- Singleton card library is load-bearing for all decks
5. **`player.js` array mutations** -- `removeFromHand` uses identity check, breaks if cards are cloned

---

# 4. Data Scientist Balance Analysis

## 4.1 Card Library

All 9 elements share an **identical** power distribution: {2, 3, 4, 5, 6, 7, 8, 9}. 8 cards per element, 72 total. **Elements are perfectly symmetrically balanced at the card-data level.** Differentiation comes entirely from the weakness wheel and deck composition.

## 4.2 Combat Math

Power modifiers stack up to 5 layers deep:

| Modifier | Value | Equivalent Upgrade Levels |
|---|---|---|
| Level bonus | +2 per level | 1 level |
| Trump bonus | +4 | 2 levels |
| Weakness bonus | +4 (first), +1 (subsequent) | 2 levels |
| Team buff | +2 per ally same-element | 1 level |

**Theoretical range:** -2 (base 2, elemental disadvantage) to 39 (maxed, trump, counter, team buff)

**Key insight:** Elemental advantage (+4) equals 2 upgrade levels of raw power. A base-7 card with counter bonus (11) matches a base-9 level-1 card (11). Element mastery rivals grinding.

## 4.3 Deck Balance Comparison

| Deck | Cards | Avg Power | Unique Elements | HP | Panic | Souls |
|---|---|---|---|---|---|---|
| Player | 27 | 6.96 | 9/9 | 100 | 30-70 | -- |
| Solaire | 26 | 6.77 | 9/9 | 120 | 40 | 100 |
| FooSupport | 18 | 3.89 | 9/9 | 90 | 25 | 55 |
| Patches | 26 | 6.12 | 9/9 | 80 | 55 | 50 |
| Rat | 10 | 3.20 | 2/9 | 20 | 100 | 10 |
| Undead (x4) | 12 | 3.08 | 1-2/9 | 20 | 100 | 10 |

## 4.4 Difficulty Curve Issues

**Massive gap between tiers:**
- Trash mobs: HP 20, panic 100, avg power ~3, Chaotic AI
- Named NPCs: HP 80-120, panic 25-55, avg power 4-7, smart AI

There is NO enemy between "trivial trash" (20 HP) and "named character" (80+ HP). Need 40-60 HP intermediates.

## 4.5 Soul Economy

| Upgrade | Cost | Cumulative |
|---|---|---|
| 0 -> 1 | 10 | 10 |
| 1 -> 2 | 15 | 25 |
| 3 -> 4 | 25 | 70 |
| 9 -> 10 | 55 | 325 |

**Cost to max one card: 325 souls. Full deck (27 cards): 8,775 souls.**

| Source | Fights to Max 1 Card | Fights to Max Deck |
|---|---|---|
| Rat/Undead (10 souls) | 33 | 878 |
| Patches (50 souls) | 7 | 176 |
| Solaire (100 souls) | 4 | 88 |

**Gap:** Jump from 10 to 50 souls (5x) between Undead and Patches. Need a 20-30 soul tier.

## 4.6 Deck Analyzer Issues

1. **Power normalization range (3-30) is too wide.** Level 0 decks score ~3/35 on power. A realistic range of 2-12 would be more meaningful for early game.
2. **Trump upside component has extremely low variance** (~1 point difference between best and worst decks). Essentially noise.
3. **No AI type factor.** Chaotic deck with same stats as Aggressive is dramatically weaker. Score should reflect this.
4. **No draw ratio metric.** `handSize / deckSize` affects consistency. FooSupport draws 61% of its deck vs Patches at 38%.

## 4.7 Specific Balance Concerns

1. **Player deck has a level 8 card** (Armor Talisman, raw power 21). This is 2.4x the strongest NPC card. Test artifact that should be reset.
2. **Mono-element Undead decks** (pure Pierce or pure Slash) have 0 counter coverage against 8 of 9 elements. Feast-or-famine based on trump roll.
3. **FooSupport has avg power 3.89** -- will lose almost every trick comparison. Only meaningful as an ally, not a standalone enemy.
4. **Negative effective power is possible** (base 2 card with elemental disadvantage = -2). Floor should be 0 or 1.

---

# 5. Game Feel Review

## 5.1 What Works Well

- **Title screen** with Dark Souls theming (sword emoji, bonfire yellow, box-drawing characters)
- **HP bar** with 3-color thresholds (green > 50%, yellow > 25%, red <= 25%) -- immediately readable
- **Element wheel overlay** using ANSI cursor positioning in top-right corner -- genuinely innovative for terminal
- **Trick resolution display** showing full power breakdowns with bonus annotations -- excellent feedback
- **Blink-on-prompt** input technique -- subtle "waiting for you" pulse

## 5.2 Critical UX Problems

### Information Starvation During Decision-Making

The moment where the player selects their card -- the most critical decision -- is missing:
- **No HP display** during card selection
- **No trick counter** ("Trick 5 of 12") after screen clear
- **No trump reminder** (was announced start of round, forgotten by trick 6)
- **No running trick score** ("You: 4 wins | Patches: 3 wins")
- **No panic change feedback** (panic changes but player never sees it)

### Pacing Tax from Mandatory Enter Presses

Per round of 12 tricks in 2-player combat:
- 1 Enter after bidding
- 11 Enters after tricks (last trick skips)
- 1 Enter after round summary
- **Total: 13+ Enter presses per round** just on continue prompts

Plus **~1.8 seconds of mandatory sleep per trick** (0.4s AI play + 0.4s resolution stagger + 1.0s before result). Over 12 tricks = **21.6 seconds of pure waiting per round.**

### Color Ambiguity

| Problem Pair | Colors | Risk |
|---|---|---|
| Light / Armor | Bright yellow (93) / Yellow (33) | Nearly indistinguishable on many terminals |
| Fire / Bleed | Bright red (91) / Red (31) | Same wheel -- confusion harms strategic play |
| Slash | White (37) | Blends with regular text, invisible as element |

## 5.3 Missing Feedback

- **No confirmation step for card play** -- one mistyped number wastes a strong card permanently
- **Damage magnitude is not reflected visually** -- a 2-damage hit looks identical to a 20-damage hit
- **Death screens lack drama** -- "YOU DIED" appears inline. Dark Souls' iconic death screen deserves isolation and pause
- **No running trick count** during combat
- **Forge has no upgrade preview** -- player cannot see "power 8 -> 10" before committing

## 5.4 High-Impact Quick Fixes

1. Show HP bars during card selection in `humanPlayCard()`
2. Show trick number and trump during card selection
3. Add card play confirmation ("Play Fire Claymore+2? [y/n]")
4. Differentiate Fire/Bleed and Light/Armor colors
5. Show panic change feedback inline
6. Scale damage messages by magnitude (bold, "Heavy blow!", "DEVASTATING!")

---

# 6. Cross-Agent Findings

Issues flagged by multiple agents:

| Finding | Flagged By | Severity |
|---|---|---|
| No Defensive NPC (Siegmeyer) | Sr Designer, Data Scientist | High |
| FooSupport is placeholder / wasted in 1v1 | Sr Designer, Data Scientist | High |
| Difficulty gap (20 HP trash -> 80 HP named) | Sr Designer, Data Scientist | High |
| Event listener leak (souls duplication) | QA | Critical |
| Player deck level 8 card is a test artifact | Data Scientist, Sr Designer | Medium |
| Dead code (showRoundScores, showFinalScoreboard) | QA, Sr Designer | Low |
| SOULS_PER_TRICK/MAJORITY_BONUS are vestigial | Sr Designer, Data Scientist | Medium |
| No card abilities | Sr Designer | High (design debt) |
| Information starvation during card selection | Game Feel | High |

---

# 7. Prioritized Action Items

## P0 -- Fix Now

1. **Fix event listener leak (BUG-01)** -- Souls duplication exploit. Store handler reference, remove on combat end. (`src/states/combat.js:30`)

2. **Fix Undead naming** -- All 4 variants show as "Undead" in selection. Add unique display names to each JSON file.

3. **Rename FooSupport** -- Replace placeholder name with thematic character (Quelana, Sieglinde, etc.)

## P1 -- Do Next

4. **Create Defensive NPC ("Siegmeyer")** -- Drop `siegmeyer.json` with `"aiType": "Defensive"`, HP ~100, panic ~35. Heavy Armor/Physical deck. This has been the #1 recommendation for 3 consecutive reviews.

5. **Add intermediate enemies** -- Fill the 20 HP -> 80 HP gap. Suggested: "Hollow Soldier" (HP 40, panic 80, Chaotic, 20 souls), "Black Knight" (HP 60, panic 65, Defensive, 35 souls).

6. **Show HP + trick info during card selection** -- Add HP bars, trick counter, trump reminder to `humanPlayCard()` screen. Single most impactful UX fix.

7. **Reset player test deck** -- Remove level 4/8 test artifacts from `player.json`. Fix card count to match CONFIG.COLLECTION_SIZE.

## P2 -- Important

8. **Activate per-trick soul income** -- Wire `SOULS_PER_TRICK` and `MAJORITY_BONUS` into combat flow. Rewards skillful play, not just winning.

9. **Add card play confirmation** -- "Play [card details]? (y/n)" prevents costly misplays from typos.

10. **Fix color ambiguity** -- Differentiate Fire/Bleed and Light/Armor element colors. Change Bleed and Armor to distinct ANSI codes.

11. **Add tests for `round.js` and `bidding.js`** -- Two most complex, highest-risk files with zero test coverage.

12. **Fix `deckAnalysis.js` power normalization** -- Change range from (3,30) to (2,12) for meaningful early-game scoring.

## P3 -- Design Evolution

13. **Add in-game ally summoning** -- Offer "summon ally" option in combat-setup. Activates multi-combatant code and makes Supportive AI relevant.

14. **Design 2-3 card abilities** -- Start minimal: "Sunlight" (+2 trump bonus for Light), "Hemorrhage" (+1 per trick won), "Fortify" (immune to first weakness penalty).

15. **Implement failure penalty** -- Lose 50% of unspent souls on defeat. Creates Dark Souls tension.

16. **Add encounter composition** -- Let NPC JSON define encounter groups: face 3 Undead + 1 Patches simultaneously.

17. **Reduce "Press Enter" fatigue** -- Combine damage + result screens. Add auto-advance option with 2-3 second pause.

---

*Report compiled 2026-02-14 by Master Orchestrator coordinating Sr Game Designer, QA Agent, Data Scientist, and Game Feel Developer agents.*
