# Sr Game Designer Review: BatakSouls

**Date:** 2026-02-11
**Reviewer:** Sr Game Designer Agent
**Build:** Post team-system + global elemental interactions implementation

---

## 1. Executive Summary

BatakSouls is a terminal-based Dark Souls-themed trick-taking card game with a dual element wheel (9 elements), team-based play, card upgrades, and AI opponents. The core loop is solid and the theming is excellent. The main risks are balance issues around the global interaction system, last-player advantage, and architectural coupling that will slow future iteration.

---

## 2. What's Working Well

- **Dark Souls theming** is strong -- weapon names, "bonfire bidding", "souls" currency, "YOU DIED" / "VICTORY ACHIEVED" all land well
- **Dual element wheel** (6 mystical + 3 physical) creates interesting decision space without being overwhelming
- **Three distinct AI personalities** (Aggressive, Defensive, Chaotic) give variety to each game
- **Team system** (allies vs enemies) is unique for a trick-taking game and adds a strategic layer
- **Upgrade progression** between rounds gives a sense of growth across the game
- **Clean module structure** -- each file has a clear purpose (card, trick, player, ai, round, ui, input, constants)
- **Terminal UI** is readable with good use of ANSI colors and element-themed formatting

---

## 3. Critical Balance Issues

### 3.1 Last-Player Advantage is Overpowering

The global interaction system means the later you play, the more information you have AND the more buffs you can accumulate. A card played last can get empowered by every earlier enemy card it's strong against, but can never be debuffed by cards played after it (there are none).

**Example with 5 players:** If 3 enemies play early and you play last with the right counter-element, you get +4, +5, +6 = **+15 power** just from stacking. The first player can never receive any interaction bonus.

**Suggested fixes:**
- Make interactions symmetric (both earlier and later cards are affected)
- Cap stacking at 2 interactions max per card
- Or give the lead player a "lead bonus" to compensate

### 3.2 Stacking Escalation is Too Steep

4 -> 5 -> 6 -> 7... means a 3rd interaction gives -6. Combined with last-player advantage, this creates snowball scenarios where a well-timed late play is mathematically unbeatable regardless of base card power.

**Suggested fixes:**
- Use diminishing returns: `WEAKNESS_BONUS * (1 + count * 0.5)` instead of `WEAKNESS_BONUS + count`
- Or reduce base bonus from 4 to 2-3
- Or cap stacking bonus at +1 max (so 4, 5, 5, 5...)

### 3.3 Trump Bonus (+3) is the Weakest Modifier

| Modifier | Value |
|---|---|
| Trump bonus | +3 (static) |
| Weakness/Strength | +4 base (+ stacking) |
| Same-element team buff | +2 per teammate |
| Level bonus | +2 per level (up to +20) |

Trump should feel like a major advantage -- it's the reward for winning the bid. At +3 it barely matters vs a single weakness interaction (+4).

**Suggested fix:** Raise trump bonus to +5 or +6.

### 3.4 Team Size Creates Imbalance

With 1 enemy + 3 allies, the enemy faces 4 players who can all stack against them. The same-element team buff compounds this -- 3 allies playing the same element each get +4 (pairwise: +2+2). There's no anti-snowball mechanic.

**Suggested fixes:**
- Scale interaction bonuses inversely with team size
- Limit same-element team buff to 1 pair max
- Or give smaller teams a flat power bonus

### 3.5 No Catch-Up Mechanic

Players who fall behind in souls get the same upgrade costs. Aggressive AI that wins early rounds upgrades aggressively, creating runaway leaders. No comeback path exists.

**Suggested fixes:**
- Trailing players get reduced upgrade costs (e.g., -10% per round behind)
- Guaranteed minimum souls per round (floor at 20-30)
- Or "comeback" bonus: extra souls if you won fewer tricks than average last round

### 3.6 Majority Bonus Feels Insignificant

+15 souls (1.5 tricks worth) for winning the most tricks doesn't create dramatic tension.

**Suggested fix:** Scale with trick count:
- 6+ tricks: +20 souls
- 9+ tricks: +40 souls
- 12 tricks (sweep): +75 souls

### 3.7 Bidding Phase is Too Costly with No Upside

Each player sacrifices 1 of 13 hand cards permanently. The only reward is setting trump and getting first lead. The risk-reward is negative for high-power cards.

**Suggested fixes:**
- Let players buy back bid cards in upgrade phase for premium cost
- Or: bid cards go to a shared pool, winner of final trick claims one
- Or: reduce hand size penalty (bid from collection, not hand)

---

## 4. Architecture Concerns

### 4.1 DRY Violation -- Power Calculation in 3+ Places

```
card.js:19     -> card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS
ai.js:70       -> b.basePower + b.level * 2          <-- hardcoded!
round.js:98    -> card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS
```

`ai.js` hardcodes `* 2` instead of using `CONFIG.LEVEL_POWER_BONUS`. If you ever change that config value, AI bid/lead evaluation breaks silently.

**Fix:** Extract a `rawPower(card)` helper in `card.js` and use it everywhere.

### 4.2 Team Identity as Magic Strings

`'allies'` and `'enemies'` are bare strings scattered across `game.js`, `card.js`, and `ui.js`. A typo (`'alies'`) would silently break team interactions.

**Fix:** Add to `constants.js`:
```js
const TEAMS = { ALLIES: 'allies', ENEMIES: 'enemies' };
```

### 4.3 `round.js` is a God Module (152 lines, 5 responsibilities)

It handles:
1. Round orchestration
2. Bidding phase logic
3. Trick play loop
4. Human input coordination
5. Scoring

**Fix:** Extract `biddingPhase` and `scoreRound` into their own modules, or at minimum make them clearly separated pure functions with explicit inputs/outputs.

### 4.4 `computeTrickPowers()` Does Too Much (56 lines, 3 nested loops)

Handles trump bonus, team buffs, AND cross-team interactions in one function.

**Fix:** Split into sub-functions:
```js
function computeTrickPowers(plays, trumpElement) {
  const results = initBaseResults(plays, trumpElement);
  applyTeamBuffs(results);
  applyCrossTeamInteractions(results);
  return results.map(r => ({ power: r.power, bonuses: r.bonuses }));
}
```

### 4.5 UI Recalculates Game Logic

`showCurrentTrick()` and `showTrickPlay()` call `effectivePower()` to compute power for display. Game logic shouldn't live in UI functions.

**Fix:** Pre-calculate power and pass it to UI functions as data.

### 4.6 Global Card ID Counter

`let nextId = 1` in `card.js` is module-level state. A second game instance or test suite would get unexpected IDs. Should be reset-able or scoped.

### 4.7 No Input Validation Guards

- `removeFromHand()` mutates directly without checking card exists
- `dealHand()` assumes 13 cards are available
- `humanPlayCard()` doesn't null-check the selected card

---

## 5. Player Experience Concerns

### 5.1 Power Calculation is Opaque

A player sees `Power: 12 (+3 trump, +2 ally Fire, -4 weak vs Light)` but doesn't know:
- Is 12 the base or the final number?
- Why did my card get weakened when I played it after the enemy?
- How does stacking work?

**Fix:** Add an in-game help screen or legend explaining the interaction system. Show power as `Base 7 -> Final 12` format.

### 5.2 Bidding Strategy is Unclear

New players have no idea what makes a good bid. Should you sacrifice your weakest card? Your duplicate element? A card you want as trump? The game gives no guidance.

**Fix:** Add a brief tooltip: "Tip: Bid a low-power card of the element you want as trump."

### 5.3 Upgrade System is Flat

Every upgrade does the same thing: +2 power. No variety (element change, special ability, defense boost). Feels like a chore, not a strategic choice.

**Fix (future):** Add upgrade types:
- Power upgrade (+2 power, current)
- Element shift (change card element)
- Trump affinity (+1 extra trump bonus for this card)
- Team synergy (+1 extra same-element team buff)

### 5.4 Chaotic AI is Too Weak

Pure random play means Chaotic AI loses consistently. No counterplay needed, no tension.

**Fix:** Make Chaotic "semi-random" -- 70% random, 30% considers trump/weakness. Or rename to "Reckless" and make it always play highest card regardless of situation.

### 5.5 No Endgame Drama

Final round feels identical to round 1. No announcement, no stakes escalation.

**Fix:** Add "FINAL ROUND" banner, double souls for final round, or show standings prominently before last round.

---

## 6. Code Quality Issues

### 6.1 Inconsistent AI Algorithm Complexity

- `aggressivePlay()` uses `reduce()` -- O(n)
- `defensivePlay()` uses `sort()` then `[0]` -- O(n log n) for the same task

Both should use `reduce()`.

### 6.2 Bidding Has Duplicate Tallying

`round.js` lines 95-100 tally bids by element, then lines 107-112 re-filter for trump bids. Should be a single pass.

### 6.3 No Type Documentation

No JSDoc comments. Player object, Card object, and return types of complex functions are undocumented. Must read code to understand structures.

### 6.4 No Test Infrastructure

No test files, no test runner configured. `computeTrickPowers()` and `resolveTrick()` are critical game logic that should have unit tests.

---

## 7. Prioritized Fix List

| Priority | ID | Issue | Category |
|---|---|---|---|
✅| P0 | B-01 | Hardcoded `* 2` in ai.js -- use CONFIG.LEVEL_POWER_BONUS | Bug | ✅ Fixed
✅| P0 | B-02 | Team strings as magic values -- add TEAMS constant | Architecture | ✅ Fixed
✅| P1 | BAL-01 | Last-player advantage too strong | Balance | ✅ Added Panic System
✅| P1 | BAL-02 | Trump bonus too weak (+3 vs +4 weakness) | Balance | ✅ Balanced both at +4
✅| P1 | BAL-03 | Stacking escalation too steep | Balance | ✅ Increase only adds +1. One strong +4 2 strongs +5 3 strongs +5 etc.
✅| P1 | A-01 | Extract rawPower(card) helper, use everywhere | Architecture | ✅
◻️| P2 | BAL-04 | No catch-up mechanic for trailing players | Balance | Skipped — RPG evolution will handle
◻️| P2 | BAL-05 | Team size imbalance (1v4 is unwinnable) | Balance | Skipped — RPG evolution will handle
✅| P2 | A-02 | Split computeTrickPowers into sub-functions | Architecture | ✅ Split into initBaseResults, applyTeamBuffs, applyCrossTeamInteractions
✅| P2 | A-03 | Extract bidding/scoring from round.js | Architecture | ✅ Extracted biddingPhase to src/bidding.js
✅| P2 | UX-01 | Power calculation display clarity | UX | ✅ Shows Base X → Y format in trick resolution
◻️| P3 | BAL-06 | Majority bonus too small | Balance |
◻️| P3 | BAL-07 | Bidding cost too high, no recovery | Balance |
◻️| P3 | UX-02 | Bidding strategy guidance for new players | UX |
◻️| P3 | UX-03 | Endgame drama (final round announcement) | UX |
✅| P3 | A-04 | UI recalculates game logic | Architecture | ✅ UI receives pre-computed power data from callers
✅| P3 | Q-01 | Add unit tests for core game logic | Quality | ✅ 33 tests across card, trick, constants
◻️| P4 | UX-04 | Upgrade variety beyond +2 power | UX | Skipped — RPG evolution will handle
✅| P4 | UX-05 | Chaotic AI too weak / boring | UX | ✅ Renamed to Reckless — 70% strongest / 30% random play, bids strongest card of random element
✅| P4 | Q-02 | Add JSDoc type documentation | Quality | ✅ JSDoc types on card, trick, player, ai modules

---

## 8. Summary

**Verdict:** Strong foundation with excellent theming. The core trick-taking loop works. The two new features (global interactions + teams) add strategic depth but introduce balance risks that need tuning before the game feels fair across all player counts and team configurations.

**Top 3 immediate actions:**
1. Fix the hardcoded `* 2` in ai.js (P0 bug)
2. Add TEAMS constant to eliminate magic strings (P0 architecture)
3. Address last-player advantage + trump bonus balance (P1, biggest impact on game feel)
