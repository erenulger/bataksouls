# AI Awareness Reference

**Purpose:** This document is the single source of truth for what game systems the AI knows about, how each AI personality uses that knowledge, and what behaviors the player should observe. When a new game mechanic is added, this document MUST be updated before the feature ships.

**Last updated:** 2026-02-13
**Related report:** `reports/2026-02-13/ai-behaviour-report.md`

---

## 1. Game Systems the AI Knows About

| System | Status | AI Awareness Level | Notes |
|---|---|---|---|
| **Own hand (cards)** | IMPLEMENTED | Full -- all types | AI always sees its own cards |
| **Trump element** | IMPLEMENTED | Full -- all types | AI knows which element is trump |
| **Cards played this trick** | NOT IMPLEMENTED | None | AI plays blind, cannot see table |
| **Element weakness wheels** | NOT IMPLEMENTED | None | AI never evaluates counters |
| **Same-element team buff** | NOT IMPLEMENTED | None | AI doesn't coordinate with allies |
| **Own HP** | NOT IMPLEMENTED | None | AI ignores health status |
| **Enemy HP** | NOT IMPLEMENTED | None | AI can't target wounded enemies |
| **Panic / play order position** | NOT IMPLEMENTED | None | AI doesn't know when it plays |
| **Cards remaining in hand** | NOT IMPLEMENTED | None | AI doesn't conserve for endurance |
| **Trick number / round progress** | NOT IMPLEMENTED | None | AI doesn't pace its plays |
| **Bidding outcome / trump control** | NOT IMPLEMENTED | None | Bid strategy is basic |
| **Endurance penalty system** | NOT IMPLEMENTED | None | AI doesn't fear exhaustion |
| **Cross-team damage calculation** | NOT IMPLEMENTED | None | AI doesn't consider damage output |

---

## 2. AI Types

### 2.1 Current Types

| Type | Constant | Used By | Description |
|---|---|---|---|
| `Aggressive` | `AI_TYPES.AGGRESSIVE` | Solaire | Always plays strongest card |
| `Defensive` | `AI_TYPES.DEFENSIVE` | (none currently) | Always plays weakest card |
| `Chaotic` | `AI_TYPES.CHAOTIC` | Patches, Undead | 70% strongest, 30% random |

### 2.2 Planned Types

| Type | Used By | Description |
|---|---|---|
| `Trickster` | Patches | Alternating aggressive/defensive with self-preservation |

---

## 3. Personality Behavior Tables

### 3.1 Aggressive (Solaire)

**Philosophy:** Hit hard, hit first, never back down.

| Situation | Current Behavior | Target Behavior |
|---|---|---|
| **Leading a trick** | Play highest effective power | Play highest effective power (unchanged) |
| **Following -- no enemy cards visible** | Play highest effective power | Play highest effective power (unchanged) |
| **Following -- enemy card visible** | Play highest effective power (ignores enemy) | Prefer card with element advantage over enemy card. If no counter available, play highest power. |
| **HP > 50%** | N/A (no HP awareness) | Normal aggressive behavior |
| **HP 25-50%** | N/A | No change -- aggressive stays aggressive |
| **HP < 25%** | N/A | Desperation: if holding trump-element cards, play those first. Otherwise highest power. |
| **Bidding** | Weakest card of most-held element | Weakest card of element where AI has strongest cards (set trump to benefit own hand) |

**Characteristic tax:** Never holds back. Will play a 30-power card even when a 15-power card would win the trick. The excess damage is "wasted" but it's in character.

### 3.2 Defensive (Siegmeyer -- planned)

**Philosophy:** Conserve strength, survive, strike only when necessary.

| Situation | Current Behavior | Target Behavior |
|---|---|---|
| **Leading a trick** | Play lowest power card | Play mid-range card (probe, don't give away weakest or strongest) |
| **Following -- trick already won by ally** | Play lowest power | Dump weakest card (save strong ones) |
| **Following -- trick being won by enemy** | Play lowest power | If can beat enemy card, play just-strong-enough card. If can't beat, dump weakest. |
| **HP > 50%** | N/A | Normal conservative play |
| **HP 25-50%** | N/A | Prioritize card conservation over winning tricks |
| **HP < 25%** | N/A | "Last stand" -- switches to aggressive play. Character moment. |
| **Bidding** | Absolute weakest card | Weakest card of least-represented element (sacrifice what you don't need) |

**Characteristic tax:** Misses opportunities. Could win tricks but plays conservatively, letting opponents build momentum. Player exploits this by applying early pressure.

### 3.3 Chaotic (Undead)

**Philosophy:** No strategy. No fear. No intelligence.

| Situation | Current Behavior | Target Behavior |
|---|---|---|
| **Leading** | Strongest card (same as aggressive) | Random card from hand |
| **Following** | 70% strongest, 30% random | Random card from hand (100% random) |
| **HP any level** | N/A | No change -- Undead don't fear death |
| **Bidding** | Strongest of random element | Random card (unchanged) |

**Characteristic tax:** Completely unpredictable but completely unintelligent. Sometimes accidentally plays the perfect card, sometimes throws away their best card for nothing.

**Note:** Chaotic is specifically for mindless enemies (Undead, hollows). It should NOT be used for smart-but-unpredictable enemies (Patches). Those use the Trickster type.

### 3.4 Trickster (Patches -- planned)

**Philosophy:** Cunning, self-serving, hard to read. Plays mind games.

| Situation | Target Behavior |
|---|---|
| **Leading -- odd trick number** | Play strongest card (aggressive facade) |
| **Leading -- even trick number** | Play weakest card (defensive facade) |
| **Following -- odd trick number** | Play like aggressive (seek counters) |
| **Following -- even trick number** | Play like defensive (dump trash) |
| **HP > 50%** | Normal alternating pattern |
| **HP < 50%** | Switches to pure defensive -- self-preservation overrides trickery |
| **Bidding** | Bid card of element that counters the most common element in own hand (set trump to protect own weakness) |

**Characteristic tax:** The alternating pattern is exploitable once the player figures it out. Patches is smart but predictable if you study him. This mirrors the Dark Souls character perfectly.

---

## 4. Decision Flow

```
AI Turn Start
├── Am I leading? (no cards played yet)
│   ├── YES → aiChooseLead(player, trickContext)
│   │   ├── Aggressive: highest power card
│   │   ├── Defensive: mid-range card
│   │   ├── Chaotic: random card
│   │   └── Trickster: alternates by trick number
│   └── NO → aiChooseCard(player, trickContext)
│       ├── Read played cards (if AI type supports it)
│       ├── Evaluate element counters (if AI type supports it)
│       ├── Check HP thresholds (if AI type supports it)
│       ├── Apply personality weights to each card
│       └── Select highest-scoring card
│
├── Bidding Phase → aiChooseBid(player, combatContext)
│   ├── Aggressive: set trump to strongest element
│   ├── Defensive: sacrifice least-useful element
│   ├── Chaotic: random
│   └── Trickster: counter-protect own hand
```

---

## 5. NPC Roster

| NPC | AI Type | Difficulty | HP | Panic | Hand Size | Key Trait |
|---|---|---|---|---|---|---|
| Undead | Chaotic | 0 | 10 | 100 | 5 | Mindless fodder |
| Patches | Chaotic (-> Trickster) | 1 | 80 | 55 | 10 | Alternating trickery |
| Solaire | Aggressive | 2 | 120 | 40 | 13 | Pure offense, Light-heavy deck |
| *Siegmeyer* | *Defensive* | *1.5* | *100* | *30* | *13* | *Conservation -> last stand* |

*Italic = planned, not yet implemented*

---

## 6. How to Update This Document

When adding a new game mechanic:

1. Add a row to the **"Game Systems the AI Knows About"** table (Section 1)
2. Set status to `NOT IMPLEMENTED`
3. Decide which AI types should be aware of this system
4. Add behavior rows to each affected personality's table (Section 3)
5. Update the **Decision Flow** if the mechanic adds a new decision point (Section 4)
6. Write a to-do item in the AI behaviour report

When adding a new NPC:

1. Add to the **NPC Roster** table (Section 5)
2. If using an existing AI type, no further changes needed
3. If needing a new AI type, add it to Section 2 and create a full behavior table in Section 3

When adding a new AI type:

1. Add to `AI_TYPES` in `src/constants.js`
2. Add to Section 2 of this document
3. Create a full behavior table in Section 3
4. Add to the Decision Flow in Section 4
5. Define the characteristic tax (what deliberate weakness defines this personality)

---

## 7. Testing Checklist

For every AI behavior change:

- [ ] Existing tests pass (`node --test tests/*.test.js`)
- [ ] AI functions accept old signatures (backward compat)
- [ ] Each AI type has a distinct, observable behavior in a 3-trick sequence
- [ ] No AI type wins > 80% of tricks against equal-power opponents (too smart)
- [ ] No AI type wins < 10% of tricks against equal-power opponents (too dumb, except Chaotic)
- [ ] `--debug` mode logs AI decision reasoning for every card selection
- [ ] NPC behavior matches this document's behavior table
