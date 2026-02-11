# QA Agent Review: BatakSouls

**Date:** 2026-02-11
**Reviewer:** QA Agent
**Build:** main @ f675335 + 1 uncommitted fix (upgrade.js CHAOTIC -> RECKLESS rename)
**Test Runner:** Node.js built-in (`node --test`)
**Tests:** 33 passing, 0 failing

---

## 1. Bug Inventory

### 1.1 Confirmed Bugs

#### BUG-01 [COMMITTED] `AI_TYPES.CHAOTIC` reference in upgrade.js (Severity: High)

**File:** `src/upgrade.js` lines 60-61 (at commit f675335)
**Status:** Fix exists as uncommitted working-tree change; NOT yet committed to main.

At HEAD, the `aiUpgradePhase` switch statement references `AI_TYPES.CHAOTIC` and calls `aiUpgradeChaotic()`, but `constants.js` defines `AI_TYPES.RECKLESS` (renamed in commit f675335). Since `AI_TYPES.CHAOTIC` is `undefined`, the case never matches. Reckless AI players silently skip their entire upgrade phase -- they accumulate souls but never spend them.

```js
// src/upgrade.js at HEAD (committed)
case AI_TYPES.CHAOTIC:       // undefined -- never matches
  aiUpgradeChaotic(player);  // dead code
  break;

// src/constants.js
AI_TYPES = { AGGRESSIVE: 'Aggressive', DEFENSIVE: 'Defensive', RECKLESS: 'Reckless' };
```

**Impact:** One third of AI opponents (Reckless type) never upgrade cards. They play every round with level-0 collections while other AI types scale via upgrades. This creates a severe balance asymmetry -- Reckless AI falls progressively further behind each round.

**Working-tree fix:** The rename to `AI_TYPES.RECKLESS` / `aiUpgradeReckless` is present locally but must be committed.

---

#### BUG-02 Global card ID counter never resets (Severity: Low)

**File:** `src/card.js` line 41

```js
let nextId = 1;
```

Module-level mutable state. The counter increments across the entire Node process lifetime. In the current single-game CLI usage, this is cosmetic -- IDs remain unique but grow unboundedly. However:

- Test suites that call `createCard()` get unpredictable IDs depending on test execution order.
- If the game is ever embedded as a library, imported into a server, or run in a REPL session with multiple games, stale IDs will carry over.
- No `resetIdCounter()` function exists for test isolation.

**Impact:** Low for current usage. Becomes a real issue for testing and multi-instance scenarios.

---

#### BUG-03 Panic goes fractional with no display formatting (Severity: Low)

**File:** `src/round.js` line 66, `src/constants.js` line 102

```js
CONFIG.TRICK_WIN_PANIC_INCREASE: 0.5
// ...
result.winner.panic += CONFIG.TRICK_WIN_PANIC_INCREASE;
```

Panic starts as an integer (1-10) but increases by 0.5 per trick won. After winning 1 trick, a player with panic 5 displays as `5.5`. After winning 3 tricks, `6.5`. This propagates into the play order display in the UI (`showPlayOrder` renders `name(5.5)`).

The sort-by-panic logic still functions correctly with floats, but the fractional values feel unpolished and could confuse players expecting whole numbers.

**Impact:** Cosmetic. Display reads `You(5.5)` or `Solaire(6.5)` which is not terrible but inconsistent with the integer initialization.

---

#### BUG-04 Panic has no upper bound on trick-win increases (Severity: Low)

**File:** `src/round.js` line 66

```js
result.winner.panic += CONFIG.TRICK_WIN_PANIC_INCREASE;
```

Initial panic is clamped to `[1, 10]` at creation (`player.js` line 25). Bid reduction is clamped with `Math.max(1, ...)` (`bidding.js` line 51). But trick-win panic increase has no upper cap. A player who wins all 12 tricks gains `+6.0` panic per round, accumulating across rounds.

Over a 7-round game with a dominant player, panic could theoretically reach `10 + (6.0 * 7) = 52`, far beyond the original 1-10 design range.

**Impact:** Low in practice (no player sweeps every round), but violates the design contract of panic being a bounded value.

---

### 1.2 Suspected Bugs

#### SBUG-01 `removeFromHand` silently succeeds on nonexistent cards

**File:** `src/player.js` line 61

```js
function removeFromHand(player, card) {
  player.hand = player.hand.filter(c => c.id !== card.id);
}
```

If a card is not in the player's hand (e.g., already removed, or a stale reference), this is a no-op. No error, no warning. In the bidding phase, `aiChooseBid` picks a card from the hand, but `removeFromHand` does not verify the card was actually present. A subtle bug in AI logic could cause a card to remain in hand after being "sacrificed."

**Risk:** Currently AI always picks a valid card from `player.hand`, so the filter always removes exactly one card. But there are no guards against future regressions.

---

#### SBUG-02 `dealHand` assumes collection has >= 13 cards

**File:** `src/player.js` lines 41-46

```js
function dealHand(player) {
  const shuffled = shuffle([...player.collection]);
  player.hand = shuffled.slice(0, CONFIG.HAND_SIZE);  // CONFIG.HAND_SIZE = 13
  // ...
}
```

`COLLECTION_SIZE` is 26 and `HAND_SIZE` is 13, so the `slice` always returns 13 cards under current config. But if `COLLECTION_SIZE` were reduced below `HAND_SIZE` (or if upgrade logic ever mutated the collection size), `dealHand` would silently deal a short hand. Downstream code assumes `hand.length >= 1` but never checks against `HAND_SIZE`.

**Risk:** Low under current config. Becomes a real bug if config is tuned or if future features alter collection size.

---

#### SBUG-03 Play order tiebreaker logic has comparison ambiguity

**File:** `src/round.js` lines 33-37

```js
const playOrder = [...players].sort((a, b) =>
  b.panic - a.panic
  || (a === lastWinner ? -1 : b === lastWinner ? 1 : 0)
  || (a === bidWinner ? 1 : b === bidWinner ? -1 : 0)
);
```

This comparator uses reference equality (`===`) for `lastWinner` and `bidWinner`. If a player object is ever cloned or reconstructed (e.g., through serialization for save/load), the tiebreaker silently stops working and falls through to default JS sort stability.

Additionally, if the same player is both `lastWinner` AND `bidWinner`, the tiebreakers conflict: the first clause pushes them earlier (-1), the second pushes them later (+1). The first clause wins due to short-circuit `||`, meaning bid winner advantage is negated for the previous trick winner.

**Risk:** Medium. The bid-winner-who-also-won-last-trick scenario is common and the tiebreaker contradiction may produce unintended play order.

---

#### SBUG-04 Blink ANSI prompt has display artifacts

**File:** `src/input.js` lines 20-23

```js
getRL().question(`${BLINK}${prompt}${reset} `, answer => {
  // Move up one line, clear it, rewrite without blink
  process.stdout.write(`\x1b[A\r\x1b[K${prompt} ${answer}\n`);
  resolve(answer.trim());
});
```

The cursor-up + clear-line hack attempts to replace the blinking prompt with a static version after the user presses Enter. This has known issues:
- If the terminal does not support blink (many modern terminals ignore SGR 5), the rewrite is unnecessary visual churn.
- If the prompt wraps to multiple lines, `\x1b[A` moves up only one line, leaving the top portion of a wrapped prompt as a visual artifact.
- Race condition: if any other output is written between the question and the rewrite (e.g., readline internal echo), the cursor-up overwrites the wrong line.

**Impact:** Visual glitch. Not a logic bug but degrades terminal UX in edge cases.

---

#### SBUG-05 Majority bonus awarded to ALL tied players

**File:** `src/round.js` lines 81-91

```js
function scoreRound(players) {
  const maxTricks = Math.max(...players.map(p => p.tricksWon));
  players.forEach(p => {
    let earned = p.tricksWon * CONFIG.SOULS_PER_TRICK;
    if (p.tricksWon === maxTricks) {
      earned += CONFIG.MAJORITY_BONUS;
    }
    // ...
  });
}
```

If all 5 players tie at 2-3 tricks each (plausible with 12 tricks and 5 players), all 5 receive the +15 majority bonus. This dilutes the bonus completely and rewards mediocrity equally with dominance.

**Risk:** Design decision rather than bug, but worth flagging as potentially unintended behavior.

---

#### SBUG-06 `showTrickPlay` displays `effectivePower` base-only, not full trick resolution

**File:** `src/round.js` lines 58-60

```js
const { power, bonuses } = effectivePower(card, trumpElement);
plays.push({ player, card, power, bonuses });
showTrickPlay(player, card, power, bonuses);
```

The `power` stored in the `plays` array and shown via `showTrickPlay` is the `effectivePower` result (base + trump only). It does NOT include team buffs or cross-team interactions -- those are computed later by `computeTrickPowers` inside `resolveTrick`. So the "Base" power shown during play differs from the final resolved power.

The trick resolution display (`showTrickResolution`) correctly shows the full computation. But during the play-by-play, the displayed power is misleading -- a player sees `Base: 10` but the card may end up at `14` or `6` after interactions.

**Risk:** Not a logic bug (final resolution is correct), but confusing UX. Players may misinterpret the mid-trick power values.

---

## 2. Test Coverage Analysis

### 2.1 Current Coverage

| File | Tests | Status |
|---|---|---|
| `src/constants.js` | `constants.test.js` (11 tests) | Covered: beatsElement (5), element lists (4), wheel completeness (2) |
| `src/card.js` | `card.test.js` (18 tests) | Covered: rawPower (2), effectivePower (3), computeTrickPowers (11), createCard (2) |
| `src/trick.js` | `trick.test.js` (4 tests) | Covered: resolveTrick winner (1), ledElement (1), trickPowers (1), tie-breaking (2), elemental interactions (1) |
| `src/player.js` | None | **No tests** |
| `src/ai.js` | None | **No tests** |
| `src/bidding.js` | None | **No tests** |
| `src/round.js` | None | **No tests** |
| `src/upgrade.js` | None | **No tests** |
| `src/input.js` | None | **No tests** |
| `src/ui.js` | None | **No tests** |
| `src/ansiColors.js` | None | **No tests** |
| `game.js` | None | **No tests** |

**Summary:** 3 of 12 files have test coverage. 33 tests total, all passing. Test coverage is focused exclusively on pure game-logic functions (card power calculation, trick resolution, element relationships).

### 2.2 Coverage Gaps by Risk

| Risk Level | Module | Reason |
|---|---|---|
| **Critical** | `src/upgrade.js` | Contains BUG-01 (CHAOTIC reference). Unit tests would have caught the dead switch case. |
| **Critical** | `src/ai.js` | AI decision functions are deterministic (given a hand state) for Aggressive and Defensive types. Untested edge cases: empty hand, single-card hand, all same element. |
| **High** | `src/bidding.js` | Complex multi-step logic: bid collection, element tallying, trump determination, panic modification. All untested. |
| **High** | `src/player.js` | `createCollection` guarantee (1 per element), `dealHand` hand size, `removeFromHand` correctness, `shuffle` distribution. |
| **Medium** | `src/round.js` | `scoreRound` is a pure function and easily testable. `playRound` requires mocking but `scoreRound` does not. |
| **Low** | `src/ui.js` | Output-only functions. Low regression risk but could validate string formatting. |
| **Low** | `src/input.js` | Requires stdin mocking. Testing value is limited for a CLI app. |

### 2.3 What the Existing Tests Do Well

- Thorough coverage of the 3-step `computeTrickPowers` pipeline (trump, team buffs, cross-team interactions).
- Edge cases for stacking mechanics (first interaction +4, subsequent +1).
- Explicit tests for non-interaction scenarios (same team, no cross-wheel effects).
- Both directions of the weakness wheel (strong vs. and weak vs.).
- Tie-breaking in trick resolution.

### 2.4 What the Existing Tests Miss

Even within the covered files, these scenarios are untested:

- `computeTrickPowers` with 0 plays (empty trick).
- `computeTrickPowers` with 5+ players (max game size).
- `computeTrickPowers` with level > 0 cards.
- `resolveTrick` with 0 plays (returns null, but no test verifies this).
- `resolveTrick` with a single play (trivial winner).
- `createCard` randomness bounds verification (basePower always 3-10 across many iterations).
- `effectivePower` with leveled cards.
- `beatsElement` with invalid/undefined element inputs.

---

## 3. Edge Case Risk Assessment

### 3.1 Game Configuration Edge Cases

| Scenario | Risk | Analysis |
|---|---|---|
| 1 enemy, 0 allies (1v1) | **Medium** | Cross-team interactions work. Team buffs impossible (no teammates). Bidding always has exactly 2 bids. Play order is just 2 players. Functionally correct but degenerate gameplay. |
| 4 enemies, 0 allies (1v4) | **High** | Human faces 4 opponents. Enemy team can stack same-element team buffs (+2 per pair, up to +6 for 3 pairs). Cross-team interactions heavily favor the larger team. Likely unwinnable for the human. |
| 1 enemy, 3 allies (4v1) | **High** | Mirror of above -- the single enemy is overwhelmed. No balance scaling by team size. |
| 3 rounds (minimum) | **Low** | Fewer upgrade cycles. Reckless AI BUG-01 has less impact (fewer missed upgrades). |
| 7 rounds (maximum) | **Medium** | Panic accumulation over 84 tricks (12 per round). A dominant player could reach panic 30+. Upgrade costs escalate -- without enough souls, later upgrades become inaccessible. |

### 3.2 Card and Hand Edge Cases

| Scenario | Risk | Analysis |
|---|---|---|
| All 13 hand cards are same element | **Low** | Possible but rare (collection has at least 1 of each 9 elements in 26 cards, hand is 13 of 26). If it happens, bidding always sets that element as trump. Team buffs stack massively. |
| Hand has only 1 unique element across all cards | **Low** | Same as above. All plays are same element. Cross-team interactions are deterministic. |
| All players bid same element | **Medium** | All bid powers sum into one element. That element becomes trump. All players are "trump bidders" -- the winner gets -2, all losers get -1. Everyone loses a card of the dominant element. |
| All bid powers are equal across multiple elements | **Low** | Tie broken randomly (`tied[Math.floor(Math.random() * tied.length)]`). Fair, but not announced to the player that it was a random tiebreak. |
| Card basePower = 3 (minimum) at level 0 | **Low** | Weakest possible card. After a weakness debuff (-4), effective power goes to -1. Negative power is not clamped. The card can still win if all others are also negative. |
| Card at MAX_LEVEL (10) with basePower 10 | **Low** | Raw power = 10 + 10*2 = 30. With trump (+4) = 34. With stacking empowerment, could exceed 40. Dominant but achievable only in late-game rounds with heavy investment. |

### 3.3 Runtime Edge Cases

| Scenario | Risk | Analysis |
|---|---|---|
| Player enters non-numeric input | **None** | `askNumber` loops until valid integer in range. Handled correctly. |
| Player enters 0 in card selection (upgrade) | **None** | 0 is a valid "exit forge" option. Handled. |
| Player enters 0 in card play | **None** | `askNumber('Play card > ', 1, hand.length)` -- min is 1, so 0 is rejected. Correct. |
| Empty hand during trick play | **High** | If somehow `player.hand` is empty, `askNumber('Play card > ', 1, 0)` would loop forever (no valid input). AI functions would crash on `reduce()` of empty array. This shouldn't happen with 13 hand cards and 12 tricks, but there's no guard. |
| `resolveTrick` with empty plays array | **Medium** | Returns `null`. Caller in `round.js` line 63 accesses `result.trickPowers` -- would throw `TypeError: Cannot read properties of null`. No null check. |

---

## 4. Functional Test Plan for Untested Modules

### 4.1 `src/player.js` -- Proposed Tests

```
describe('createCollection')
  it('returns exactly COLLECTION_SIZE cards')
  it('contains at least 1 card per element')
  it('all cards have valid element from ALL_ELEMENTS')
  it('all cards have unique IDs')

describe('createPlayer')
  it('human player has isHuman = true')
  it('AI player has correct aiType')
  it('panic is within [1, 10] range')
  it('collection has COLLECTION_SIZE cards')
  it('hand starts empty')
  it('tricksWon and souls start at 0')

describe('dealHand')
  it('hand has exactly HAND_SIZE cards')
  it('hand cards are from the player collection')
  it('hand is sorted by element then power ascending')
  it('resets tricksWon to 0')
  it('does not mutate the collection')

describe('removeFromHand')
  it('removes the specified card by ID')
  it('hand size decreases by 1')
  it('does not remove other cards')
  it('is a no-op if card ID not found')  // documents current behavior

describe('shuffle')
  it('returns array of same length')
  it('contains same elements')
  it('mutates the input array (in-place)')
```

### 4.2 `src/ai.js` -- Proposed Tests

```
describe('aiChooseCard')
  describe('Aggressive')
    it('returns highest effectivePower card')
    it('prefers trump card when equal base power')
  describe('Defensive')
    it('returns lowest effectivePower card')
  describe('Reckless')
    it('returns a card from the hand')
    it('returns highest card approximately 70% of the time')  // statistical

describe('aiChooseLead')
  describe('Aggressive')
    it('returns highest effectivePower card')
  describe('Defensive')
    it('returns lowest rawPower card')
  describe('Reckless')
    it('returns highest effectivePower card')  // delegates to aggressive

describe('aiChooseBid')
  describe('Aggressive')
    it('returns weakest card of most-held element')
    it('handles single-element hand')
  describe('Defensive')
    it('returns absolute weakest card')
  describe('Reckless')
    it('returns strongest card of a random element')
    it('handles single-card hand')

describe('edge cases')
  it('all functions handle single-card hand')
  it('all functions handle hand of same element')
```

### 4.3 `src/bidding.js` -- Proposed Tests

Note: `biddingPhase` is async and requires stdin mocking for human player input. Extract the pure-logic functions for direct testing.

**Recommended refactor for testability:** Extract tallying and winner determination into pure functions:

```
describe('tallyBids')
  it('sums power by element correctly')
  it('handles single bid')
  it('handles all bids for same element')

describe('determineTrump')
  it('picks element with highest total')
  it('breaks ties randomly among tied elements')
  it('handles single element')

describe('determineBidWinner')
  it('picks highest-power bidder on trump element')
  it('breaks ties randomly among tied bidders')

describe('applyBidPanicReductions')
  it('winner gets -CONFIG.BID_WINNER_PANIC_REDUCTION panic')
  it('non-winner trump bidders get -1 panic')
  it('panic never goes below 1')
  it('non-trump bidders get no reduction')
```

### 4.4 `src/round.js` -- Proposed Tests

```
describe('scoreRound')
  it('awards SOULS_PER_TRICK * tricksWon')
  it('awards MAJORITY_BONUS to player with most tricks')
  it('awards MAJORITY_BONUS to ALL tied-for-most players')
  it('accumulates into both souls and totalSouls')
  it('handles all players at 0 tricks')

describe('play order sorting')
  it('higher panic plays first')
  it('last winner plays earlier on panic tie')
  it('bid winner plays later on panic tie')
  it('conflict: lastWinner == bidWinner resolves to earlier')
```

### 4.5 `src/upgrade.js` -- Proposed Tests

```
describe('aiUpgradePhase')
  it('Aggressive upgrades highest rawPower card first')
  it('Defensive upgrades lowest-level card first')
  it('Reckless upgrades random cards')
  it('stops when no affordable upgrades remain')
  it('respects MAX_LEVEL cap')
  it('correctly deducts souls for each upgrade')
  it('Reckless type actually enters the switch case')  // regression for BUG-01

describe('upgrade cost formula')
  it('level 0 costs 10')
  it('level 1 costs 15')
  it('level 9 costs 55')  // boundary at MAX_LEVEL - 1
```

---

## 5. Regression Risks for RPG Evolution

The Sr Game Designer Review (same date) marked several items as "Skipped -- RPG evolution will handle." The following analysis identifies what will break or become problematic when RPG features are added.

### 5.1 High Regression Risk

#### R-01: Player object structure is implicit

The `Player` object is a plain JS object created inline in `createPlayer()`. Every module (`round.js`, `bidding.js`, `ai.js`, `upgrade.js`, `ui.js`) directly accesses `.panic`, `.hand`, `.collection`, `.souls`, `.tricksWon`, `.team`, `.aiType`, etc. Adding RPG fields (HP, equipment slots, status effects, class) requires touching every file that reads player state.

**Mitigation:** Define a Player class or factory with explicit interface. Add `.toJSON()` for save/load early.

#### R-02: Card power pipeline assumes 3 fixed steps

`computeTrickPowers` hardcodes the sequence: base+trump -> team buffs -> cross-team interactions. RPG features will need additional modifiers (equipment bonuses, status effects, class abilities, passive skills). The pipeline has no extension points.

**Mitigation:** Refactor `computeTrickPowers` into a modifier pipeline pattern:
```js
const modifiers = [applyTrump, applyTeamBuffs, applyCrossTeam, applyEquipment, applyStatusEffects];
modifiers.forEach(fn => fn(results));
```

#### R-03: No game state serialization

No save/load mechanism exists. The entire game state is held in mutable objects in local scope. Adding persistence, undo, replay, or multiplayer requires extracting all state into a serializable format. The module-level `nextId` counter in `card.js` is the first obstacle -- deserialized cards would collide with newly created ones.

**Mitigation:** Add a `GameState` object that captures all player, card, and round state. Add `resetIdCounter(n)` to `card.js`.

#### R-04: AI decision functions have no context parameter

`aiChooseCard(player, trumpElement)` receives only the player's hand and trump. RPG features will need the AI to consider: other players' visible state, board status effects, equipment interactions, remaining cards played this round. The function signatures need a `gameContext` parameter.

**Mitigation:** Introduce a `TrickContext` or `GameContext` object passed to all AI functions.

#### R-05: `scoreRound` is a closed formula

Scoring is `tricks * 10 + majority bonus`. RPG evolution will need scoring modifiers: XP multipliers, quest bonuses, penalty effects, class-specific scoring. The current function has no extension points.

**Mitigation:** Refactor into `calculateRoundScore(player, context)` with a modifiable scoring pipeline.

### 5.2 Medium Regression Risk

#### R-06: Bidding consumes hand cards permanently

The bid card is removed from hand and never recoverable. If RPG adds "recover sacrificed card" abilities or "bid from equipment" mechanics, `biddingPhase` must be restructured to track bid cards separately rather than discarding them via `removeFromHand`.

#### R-07: Constants are flat, not composable

`CONFIG` is a single flat object. RPG features will need per-player or per-card overrides (e.g., a class that changes `TRUMP_BONUS` to +6, or equipment that modifies `WEAKNESS_BONUS`). The current pattern of `CONFIG.TRUMP_BONUS` as a global constant does not support per-entity overrides.

#### R-08: No event system

There is no hook for "on trick won", "on card played", "on round start", etc. RPG passive abilities, equipment triggers, and status effect ticks all need these hooks. Currently all game events are inline procedural code in `round.js`.

#### R-09: UI is tightly coupled to game logic

UI functions like `showTrickPlay`, `showTrickResolution`, `showRoundScores` directly access player and card properties. Adding RPG display elements (HP bars, status icons, equipment display) requires modifying both UI functions and the data they receive. No abstraction layer exists.

### 5.3 Low Regression Risk

#### R-10: Terminal-only output

All UI goes through `console.log`. A future web or GUI frontend would need a complete UI rewrite. However, for the terminal RPG evolution specifically, this is fine.

#### R-11: Shuffle uses Fisher-Yates correctly

The shuffle implementation is standard and correct. No regression risk from RPG additions.

---

## 6. Summary and Recommendations

### 6.1 Immediate Actions (Before Next Commit)

| Priority | Item | Action |
|---|---|---|
| P0 | BUG-01 | Commit the working-tree fix for `AI_TYPES.CHAOTIC` -> `AI_TYPES.RECKLESS` in `upgrade.js` |
| P0 | Test gap | Add a unit test that verifies `aiUpgradePhase` dispatches correctly for all 3 AI types -- this would have caught BUG-01 |
| P1 | BUG-04 | Add `Math.min(10, ...)` cap to panic increase in `round.js` line 66 |
| P1 | SBUG-03 | Decide intended behavior when `lastWinner === bidWinner` and document/test it |

### 6.2 Short-Term (Before RPG Evolution Begins)

| Priority | Item | Action |
|---|---|---|
| P2 | Test coverage | Add tests for `player.js`, `ai.js`, `upgrade.js`, and `scoreRound()` per Section 4 |
| P2 | BUG-02 | Add `resetIdCounter()` export to `card.js`; call it in test setup |
| P2 | BUG-03 | Either change `TRICK_WIN_PANIC_INCREASE` to 1 (integer) or add `toFixed(1)` formatting in panic display |
| P2 | SBUG-01 | Add assertion in `removeFromHand` that the card was actually present |
| P3 | Edge cases | Add guard for empty `plays` array in `resolveTrick` caller (`round.js` line 63) |
| P3 | Refactor | Extract bidding pure-logic functions for testability (Section 4.3) |

### 6.3 Pre-RPG Architecture Prep

| Priority | Item | Action |
|---|---|---|
| P3 | R-01 | Formalize Player as a class or typed factory with explicit interface |
| P3 | R-02 | Refactor `computeTrickPowers` into a modifier pipeline |
| P3 | R-04 | Add `GameContext` parameter to AI decision functions |
| P4 | R-03 | Add game state serialization (save/load) |
| P4 | R-08 | Add event emitter hooks for game lifecycle events |

---

## Appendix A: Test Execution Log

```
$ node --test tests/*.test.js
# 33 tests, 0 failures, 0 skipped
# Duration: ~37ms

Pass: rawPower (2 tests)
Pass: effectivePower (3 tests)
Pass: computeTrickPowers (11 tests, including stacking edge cases)
Pass: createCard (2 tests)
Pass: beatsElement (5 tests)
Pass: element lists (4 tests)
Pass: resolveTrick (6 tests)
```

## Appendix B: File Inventory

| File | Lines | Purpose | Test Coverage |
|---|---|---|---|
| `game.js` | 95 | Entry point, game loop | None |
| `src/constants.js` | 113 | Elements, wheels, config, ANSI | Partial (beatsElement, lists) |
| `src/card.js` | 147 | Card creation, power calc, display | Good (power pipeline, creation) |
| `src/trick.js` | 52 | Trick resolution, tie-breaking | Partial (resolution, ties) |
| `src/player.js` | 74 | Player creation, hand mgmt, shuffle | None |
| `src/ai.js` | 121 | AI decision logic (3 personalities) | None |
| `src/round.js` | 106 | Round loop, scoring, human play | None |
| `src/bidding.js` | 69 | Bid phase, trump determination | None |
| `src/upgrade.js` | 114 | Human/AI upgrade logic | None |
| `src/ui.js` | 168 | Terminal display functions | None |
| `src/input.js` | 54 | Readline wrapper, blink prompt | None |
| `src/ansiColors.js` | 72 | ANSI escape code builder | None |
