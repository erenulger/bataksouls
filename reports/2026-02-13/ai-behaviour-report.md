# AI Behaviour Development Report

**Date:** 2026-02-13
**Authored by:** Multi-agent analysis (Sr Game Designer, Mid Game Designer, Mechanics Developer, QA Agent perspectives)
**Focus:** AI behaviour overhaul -- making NPCs game-system-aware with personality-driven logic
**Reference document:** `docs/ai-awareness-reference.md` (created alongside this report)

---

## 1. Executive Summary

The current AI (`src/ai.js`, 120 lines, 3 personality types) was written for a simple trick-taking card game. Since then, BatakSouls has grown into a combat system with:

- **Teams** (allies/enemies with cross-team damage)
- **HP/damage system** (power differences deal damage, deaths eliminate players)
- **Endurance/exhaustion** (empty hand = penalty damage)
- **Panic-based play order** (higher panic = plays earlier = sees less)
- **Element weakness wheels** (9 elements, 2 interlocking wheels)
- **Same-element team buffs** (+2 when allies play same element)
- **Bidding phase** (sacrifice a card to set trump, winner gets panic reduction)

The AI knows about **none of this.** It receives `(hand, trumpElement)` and returns a card. It cannot see what others have played in the trick, doesn't know its own HP, doesn't consider element counters, and doesn't coordinate with teammates.

**Goal:** Rebuild AI so each personality makes decisions that are **readable and characteristic** -- not optimal, but never nonsensical. A player watching Solaire should think "that's an aggressive move" and watching Patches should think "what a sneaky bastard." The AI should use game systems in ways that fit its personality, even when those ways aren't the mathematically best play.

---

## 2. Current State Analysis

### 2.1 What AI Currently Knows

| Information | Available to AI? | Used? |
|---|---|---|
| Own hand (cards) | Yes | Yes |
| Trump element | Yes | Yes |
| What cards were played this trick | **No** | N/A |
| Own HP / max HP | **No** | N/A |
| Enemy HP / max HP | **No** | N/A |
| Own panic value | **No** | N/A |
| Position in play order | **No** | N/A |
| Team composition | **No** | N/A |
| Element weakness relationships | **No** | N/A |
| Same-element team buff possibility | **No** | N/A |
| Cards remaining in hand after this play | **No** | N/A |
| Trick number / tricks remaining | **No** | N/A |

### 2.2 Current AI Personalities

| Type | Play | Lead | Bid | Problem |
|---|---|---|---|---|
| **Aggressive** | Highest effective power | Highest effective power | Weakest card of most-held element | Always dumps strongest card regardless of context. Wastes high cards on already-won tricks. |
| **Defensive** | Lowest effective power | Lowest power card | Absolute weakest card | Always dumps weakest card. Never tries to win. Guaranteed to lose every trick. |
| **Chaotic** | 70% strongest, 30% random | Strongest card (same as aggressive) | Strongest card of random element | Lead behavior identical to aggressive. Randomness doesn't serve any readable purpose. |

### 2.3 Critical Gaps

1. **No reactive play.** AI can't see what's on the table. It plays cards in a vacuum. An aggressive AI should see an enemy's weak card and pile on damage. A defensive AI should see a losing position and dump a trash card instead of wasting a good one.

2. **No element awareness.** AI never considers weakness counters. It never thinks "the enemy played Fire, I should play Poison to get +4." This is the most impactful missing feature.

3. **No HP awareness.** A wounded AI should behave differently from a healthy one. An aggressive NPC at 10% HP should become desperate. A defensive NPC at full HP can afford patience.

4. **No endurance awareness.** AI doesn't know that running out of cards means taking heavy endurance damage. It wastes cards indiscriminately.

5. **No bid strategy.** Bidding decisions ignore everything: what trump would benefit the AI's hand, what elements the AI is strong in, team context.

---

## 3. Design Philosophy

### 3.1 Core Principle: Readable > Optimal

The goal is NOT to make AI that plays perfectly. The goal is AI where the player can observe its behavior and say: *"I understand why it did that, even if it wasn't the best move."*

Each personality should have a **clear behavioral signature** that a player learns to predict after 2-3 fights. This prediction creates the gameplay:

- "Solaire always leads with his strongest card. If I play second, I can counter him."
- "Patches is unpredictable but he always protects his low-HP cards."
- "Undead are dumb -- they just throw cards randomly."

### 3.2 The "AI Characteristic Tax"

Every AI personality pays a "tax" -- a deliberate inefficiency that makes its behavior readable:

- **Aggressive** tax: wastes strong cards even when the trick is already won
- **Defensive** tax: misses winning opportunities by being too conservative
- **Chaotic** tax: makes suboptimal choices by prioritizing unpredictability

This tax is what makes each AI feel like a *character* rather than a calculator. The player should exploit these tendencies.

### 3.3 Information Access by AI Type

Not every AI type should use all available information. Less intelligent enemies should be more blind:

| AI Type | Trick Awareness | HP Awareness | Element Counter | Endurance |
|---|---|---|---|---|
| **Chaotic** | None (plays blind) | None | None | None |
| **Aggressive** | Sees played cards | Knows own HP | Uses counters offensively | Basic |
| **Defensive** | Sees played cards | Knows all HP | Uses counters defensively | Strategic |

This creates a natural difficulty curve: Chaotic enemies (Undead, Patches) are easy to read because they're dumb. Aggressive enemies (Solaire) are harder because they react. Defensive enemies (future) are hardest because they actively avoid your strengths.

---

## 4. Proposed AI Architecture

### 4.1 New Function Signatures

Current:
```js
function aiChooseCard(player, trumpElement)
function aiChooseLead(player, trumpElement)
function aiChooseBid(player)
```

Proposed:
```js
function aiChooseCard(player, trumpElement, trickContext)
function aiChooseLead(player, trumpElement, combatContext)
function aiChooseBid(player, combatContext)
```

Where:
```js
// trickContext: what the AI can observe during a trick
{
  plays: [{player, card}],  // cards played so far in this trick
  playOrder: Player[],       // all players in play order
  playerIndex: number,       // AI's position in play order
  trumpElement: string,
  allPlayers: Player[],      // all alive combatants (for HP/team checks)
  trickNum: number,
  tricksPerRound: number,
}

// combatContext: broader combat state
{
  allPlayers: Player[],      // all alive combatants
  trumpElement: string|null,
  trickNum: number,
  tricksPerRound: number,
}
```

### 4.2 Card Scoring System

Replace the current "pick highest/lowest" with a **scoring system** where each AI personality weights factors differently:

```
cardScore = baseWeight * effectivePower
          + counterWeight * elementCounterBonus
          + conserveWeight * handConservation
          + hpWeight * hpAwareBonus
          + trumpWeight * trumpSynergyBonus
```

Each personality defines its own weight profile:

| Weight | Aggressive | Defensive | Chaotic |
|---|---|---|---|
| `baseWeight` | 1.0 | 0.3 | 0.7 |
| `counterWeight` | 0.8 | 0.5 | 0.0 |
| `conserveWeight` | 0.0 | 1.0 | 0.0 |
| `hpWeight` | 0.3 | 0.8 | 0.0 |
| `trumpWeight` | 0.5 | 0.3 | 0.0 |
| `randomNoise` | 0.0 | 0.0 | 0.5 |

The scoring system means all AI types use the same evaluation pipeline but produce different behaviors through different weights. This is extensible: new AI types just define new weight profiles.

### 4.3 Element Counter Logic

When the AI can see played cards (trickContext.plays), it should evaluate element matchups:

```
For each card in hand:
  For each enemy card already played:
    if myCard beats enemyCard element: +counterBonus
    if enemyCard beats myCard element: -counterPenalty
```

- **Aggressive** uses this offensively: seeks cards that counter enemies
- **Defensive** uses this defensively: avoids cards that get countered
- **Chaotic** ignores it entirely

### 4.4 HP-Aware Behavior

When AI knows HP (aggressive, defensive), behavior shifts at HP thresholds:

| HP Range | Aggressive Shift | Defensive Shift |
|---|---|---|
| 75-100% | Normal aggressive play | Normal conservative play |
| 50-75% | No change | Starts dumping weaker cards to conserve strong ones |
| 25-50% | Becomes reckless -- plays strongest always | Becomes ultra-conservative -- plays weakest always |
| 0-25% | **Desperation mode**: plays trump cards if available | **Turtle mode**: plays absolute minimum to survive |

### 4.5 Lead vs Follow Decision Split

**When leading** (playing first in a trick):
- **Aggressive**: Lead with strongest card to force high responses
- **Defensive**: Lead with weakest card to bait strong enemy responses (then dump low on next tricks)
- **Chaotic**: Random card selection

**When following** (seeing cards already played):
- **Aggressive**: If can counter an enemy card, play the counter. Otherwise play strongest.
- **Defensive**: If the trick is already being won by an ally, dump weakest card. If losing, play just strong enough to have a chance (don't over-commit).
- **Chaotic**: 70% strongest, 30% random (same as current, but it's acceptable because chaotic doesn't read the battlefield)

### 4.6 Bidding Strategy

**Aggressive bid:**
- Bid a card of the element where AI has the most high-power cards (set trump to benefit own hand)
- Sacrifice the *weakest* card of that element (keep the strong ones for combat)

**Defensive bid:**
- Look at hand composition. Bid a weak card from the element AI has fewest cards in (sacrifice least-useful element)
- Doesn't care about setting trump -- wants to lose the bid card and keep everything else

**Chaotic bid:**
- Current behavior is fine: pick random element, sacrifice strongest of it. This is characteristically self-sabotaging.

---

## 5. NPC Personality Specifications

### 5.1 Undead (Chaotic, Difficulty 0)

**Character:** Mindless hollow. No strategy, no awareness, no self-preservation.

**Behavior:**
- Plays cards completely at random
- No awareness of game state (current behavior is fine)
- Never adjusts behavior based on HP
- Bid: random card
- Lead: random card
- Follow: random card

**Player read:** "These are fodder. I just need to play anything."

**No changes needed** to current chaotic behavior for Undead specifically -- the mindlessness IS the character.

### 5.2 Patches (Chaotic -> should become unique type)

**Character:** Trickster. Not stupid -- deliberately unpredictable. Self-serving.

**Proposed AI type: `Trickster`**

**Behavior:**
- Alternates between aggressive and defensive plays to confuse the player
- On odd-numbered tricks: plays like aggressive (strongest card)
- On even-numbered tricks: plays like defensive (weakest card)
- When HP < 50%: switches to pure defensive (self-preservation kicks in)
- Bid: always bids to set trump to an element he has counter-advantage against

**Player read:** "I can't predict Patches, but I notice he alternates. If I track his pattern..."

### 5.3 Solaire (Aggressive, Difficulty 2)

**Character:** Honorable warrior. Fights head-on. Doesn't hide behind tricks.

**Behavior:**
- Always leads with his strongest card (current behavior stays)
- When following: seeks element counters against enemy cards (NEW)
- Ignores defensive play entirely -- never dumps a weak card
- When HP < 25%: plays trump cards if available (desperate sunlight spear moment)
- Bid: bids to set trump to his strongest element (Light-heavy deck)

**Player read:** "Solaire always goes for the throat. If I can survive his initial burst and counter his element, he runs out of steam."

### 5.4 Future NPC: "Siegmeyer" (Defensive, Difficulty 1.5)

**Character:** Cautious but brave when cornered. The defensive archetype.

**Proposed behavior:**
- Dumps weakest cards consistently to preserve strong ones
- When following and trick is already won by ally: dumps weakest (don't waste)
- When HP < 25%: switches to aggressive as a "last stand" (character moment)
- Bid: sacrifices weakest element to keep all strong cards

**Player read:** "Siegmeyer hoards his good cards. I need to pressure him into using them before he's ready."

---

## 6. Technical Implementation Plan

### 6.1 Changes to `src/round.js`

The round loop must pass trick context to AI functions. Currently:

```js
// line 165-168 of round.js
if (ledElement === null) {
  card = aiChooseLead(player, trumpElement);
} else {
  card = aiChooseCard(player, trumpElement);
}
```

Must become:

```js
const trickContext = {
  plays: [...plays],
  playOrder,
  playerIndex: i,
  trumpElement,
  allPlayers: players,
  trickNum: trick,
  tricksPerRound: CONFIG.TRICKS_PER_ROUND,
};

if (plays.length === 0) {
  card = aiChooseLead(player, trickContext);
} else {
  card = aiChooseCard(player, trickContext);
}
```

### 6.2 Changes to `src/bidding.js`

Pass player list to AI bid:

```js
// Currently: aiChooseBid(player)
// Becomes:  aiChooseBid(player, { allPlayers: players })
```

### 6.3 New AI Module Structure

```
src/ai.js                  -- Main entry point (dispatcher)
src/ai/                    -- (optional future: split into personality modules)
```

Keep everything in `src/ai.js` for now. The scoring system is small enough. Split only when we exceed 4+ AI types or 300+ lines.

### 6.4 Backward Compatibility

The new `aiChooseCard(player, trumpElement, trickContext)` must still work if `trickContext` is undefined (fallback to current blind behavior). This allows incremental rollout and prevents breaking existing tests.

---

## 7. Priority / To-Do List

### P0 -- Critical (Do First)

These are the minimum changes to make AI feel aware:

- [ ] **Pass trick context to AI functions.** Modify `round.js` to build `trickContext` and pass it to `aiChooseCard` and `aiChooseLead`. Modify `bidding.js` to pass combat context to `aiChooseBid`. This is pure plumbing -- no behavior changes yet.

- [ ] **Add element counter awareness to Aggressive AI.** When following (not leading), aggressive AI should check played enemy cards and prefer cards that have element advantage. This single change makes Solaire feel dramatically smarter.

- [ ] **Add "dump when losing" to Defensive AI.** When a defensive AI sees the trick is already being won by a very high-power card it can't beat, it should dump its weakest card instead of playing its weakest anyway (which it already does -- but now it's a *conscious* choice with different lead behavior). Defensive lead should probe with mid-range cards, not always weakest.

### P1 -- Important (Do Second)

These make each NPC feel like a character:

- [ ] **Implement HP-aware behavior thresholds.** Add HP ratio checks to aggressive (desperation at <25%) and defensive (turtle at <25%, last-stand flip). This makes fights feel dynamic -- the NPC's behavior changes as the battle progresses.

- [ ] **Improve bid strategy.** Aggressive bids to set trump to strongest element. Defensive bids weakest element. Chaotic stays random. This makes the bidding phase feel like each NPC has an agenda.

- [ ] **Add `Trickster` AI type for Patches.** Implement alternating play pattern (odd=aggressive, even=defensive) with HP-triggered self-preservation. Update Patches' deck JSON to use the new type. Add to `AI_TYPES` in constants.

- [ ] **Create AI reference document** (`docs/ai-awareness-reference.md`). Document every game system the AI knows about, how it uses each one, and per-personality behavior tables. This document is the contract between game design and implementation.

### P2 -- Nice To Have (Do When Ready)

These add depth but aren't critical for the AI to feel "reasonable":

- [ ] **Implement card scoring system.** Replace direct card selection with weighted scoring. Each personality defines a weight profile. This is the extensible architecture for future AI types.

- [ ] **Add hand conservation logic.** AI tracks how many cards remain and avoids exhaustion (running out triggers endurance penalty). Defensive AI conserves more. Aggressive AI ignores this.

- [ ] **Add ally coordination (for future multi-ally combat).** When allies are present, same-element team buff awareness: if an ally already played Light, play Light too for +2 buff.

- [ ] **Add "Siegmeyer" defensive NPC.** Create deck JSON and test the defensive AI type in practice.

### P3 -- Future (After Event System / Card Abilities)

These require systems that don't exist yet:

- [ ] **State-aware AI with trick history.** Track what cards have been played across all tricks in the round. AI remembers which elements opponents are running out of.

- [ ] **Boss phase AI.** Bosses change AI personality at HP thresholds (e.g., Solaire switches from Aggressive to a new "Sunlight Spear" mode at 25% HP with forced trump override).

- [ ] **Ability-aware AI.** When card abilities exist, AI must evaluate them during card selection. "This card has +2 trump bonus ability, that makes it better than the raw power suggests."

- [ ] **Encounter-specific AI modifiers.** NPCs can have per-encounter behavior overrides in their JSON: `"aiOverrides": { "alwaysLeadWithTrump": true }`.

---

## 8. Acceptance Criteria

### For P0 (minimum viable AI improvement):

1. Aggressive AI, when following, prefers cards that have element advantage over played enemy cards.
2. All AI types still function correctly if trick context is not provided (backward compat).
3. Existing 62+ tests still pass with no modifications.
4. Player can observe Solaire making element-counter plays and think "he's targeting my weakness."

### For P1 (personality-driven AI):

1. Solaire becomes desperate (only plays strongest/trump) when below 25% HP.
2. Patches alternates between aggressive and defensive plays in a pattern the player can learn to exploit.
3. Bid strategy differs visibly between NPC types.
4. Each NPC's behavior feels distinct within 2-3 tricks of observation.

### For P2 (scoring system):

1. New AI types can be created by defining a weight profile only (no new functions).
2. AI behavior is tunable through weight values without code changes.
3. Card scoring produces same results as current hardcoded logic when weights are set to legacy values.

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| AI becomes too strong after improvements | Medium | Players feel cheated | The "AI tax" principle -- every personality has deliberate blind spots |
| AI behavior changes break existing game feel | Low | Disrupts tested combat | Backward-compatible signatures, fallback to current behavior |
| Scoring system over-engineering | Medium | Complexity without benefit | Only implement scoring (P2) after P0/P1 prove the approach works |
| New AI types require constant rebalancing | Medium | Maintenance burden | Weight profiles are data, not code -- tweak without deploys |
| Element counter AI makes defensive play feel unfair | Low | Player frustration | Only aggressive AI uses counters offensively. Defensive avoids, chaotic ignores |

---

## 10. Agent Recommendations

### Sr Game Designer

The AI overhaul should preserve the core design pillar: **"Read the Battlefield."** The player reads the AI's personality. The AI reads the player's cards (when it can see them). This creates a mutual reading game that is thematically aligned with Dark Souls' "learn the boss patterns" philosophy.

**Key design constraint:** No AI type should be allowed to make the "perfect play" every time. The characteristic tax is non-negotiable. AI personality > AI efficiency.

### Mid Game Designer

Each NPC's behavior table should be documented in the AI reference doc and treated as a **content specification**, not an engineering detail. When we add new NPCs, the designer writes the behavior table and the scoring weights -- the engineer implements the weight profile.

Minimum viable NPC roster for AI to feel meaningful:
- 1 Chaotic (Undead -- already exists, no changes needed)
- 1 Trickster (Patches -- needs new AI type)
- 1 Aggressive (Solaire -- needs awareness upgrades)
- 1 Defensive (Siegmeyer -- new NPC needed)

### Mechanics Developer

The `trickContext` parameter is the only structural change to the codebase. Everything else is internal to `ai.js`. The round loop, trick resolution, damage calculation, and combat state are **untouched**. This is a leaf-node change with minimal blast radius.

The scoring system (P2) should be implemented as a pure function: `scoreCard(card, weights, context) -> number`. This is trivially testable and can be validated against current behavior before deploying.

### QA Agent

**Test strategy for AI changes:**
1. Unit tests: `scoreCard()` produces expected values for known inputs
2. Behavior tests: aggressive AI picks counter-element cards when available
3. Regression tests: all existing tests pass without modification
4. Observability tests: run `--debug` mode that logs AI decision reasoning (e.g., "Solaire chose Fire Longsword: base=14, counter bonus=4, total score=18")

**Debug logging is critical.** Without it, we cannot verify AI is making decisions for the right reasons. Add `--debug` output for all AI card selections.

### Data Scientist

When AI behavior becomes more complex, track these metrics:
- Average tricks won by AI type (should vary by personality)
- Player win rate vs each NPC (should be < 100%, > 30%)
- Player perception: do they notice AI personality differences? (future: in-game survey)
- Combat length by NPC type (aggressive fights should be shorter, defensive longer)

---

## 11. Summary

| What | Status | Action |
|---|---|---|
| AI awareness of trick state | Missing | P0: Pass trickContext |
| Element counter play | Missing | P0: Aggressive counter logic |
| HP-aware behavior | Missing | P1: Threshold-based shifts |
| Personality-driven bidding | Missing | P1: Per-type bid strategy |
| Trickster AI type | Missing | P1: New type for Patches |
| Card scoring system | Missing | P2: Weight-based scoring |
| Hand conservation | Missing | P2: Endurance awareness |
| Trick history memory | Missing | P3: Requires event system |
| Boss phase transitions | Missing | P3: Requires encounter redesign |

The AI reference document (`docs/ai-awareness-reference.md`) is the living contract for what the AI knows and how it behaves. Every future mechanic added to the game should update that document's "Systems AI Is Aware Of" table before implementation begins. This prevents the current situation from recurring: game systems evolving while AI stays blind.
