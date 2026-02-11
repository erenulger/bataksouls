# Data Scientist Review: BatakSouls

**Date:** 2026-02-11
**Reviewer:** Data Scientist Agent
**Build:** Post Sr Game Designer review -- panic system, stacking fix, trump rebalance applied
**Scope:** Analytics architecture, balance modeling, simulation design, telemetry recommendations

---

## 1. Executive Summary

BatakSouls has zero instrumentation. No event is logged, no metric is computed, no game state is persisted between sessions. This is normal for a terminal prototype, but the game has reached a complexity threshold where intuition-based balancing is no longer sufficient. The interaction between 9 elements, 2 weakness wheels, team compositions, panic ordering, trump bidding, and upgrade economies creates a combinatorial space too large to reason about without data.

This report defines what to measure, models the key balance distributions analytically, identifies the highest-value simulation targets, and proposes an A/B testing framework for the upcoming RPG evolution.

---

## 2. Telemetry Design: What to Track

### 2.1 Event Schema

Every game action should emit a structured event. The minimum viable telemetry for BatakSouls requires these event types:

| Event | Fields | Purpose |
|---|---|---|
| `game_start` | `player_count`, `team_sizes`, `ai_types[]`, `round_count` | Session segmentation |
| `collection_generated` | `player_id`, `card_ids[]`, `elements[]`, `base_powers[]` | Measure RNG fairness |
| `hand_dealt` | `player_id`, `round`, `card_ids[]`, `hand_power_sum` | Track deal quality variance |
| `bid_submitted` | `player_id`, `round`, `card_id`, `card_element`, `card_power`, `is_human` | Bidding behavior analysis |
| `trump_determined` | `round`, `element`, `total_power`, `bid_winner_id` | Trump distribution tracking |
| `card_played` | `player_id`, `round`, `trick`, `card_id`, `play_position`, `effective_power`, `bonuses[]` | Core gameplay telemetry |
| `trick_resolved` | `round`, `trick`, `winner_id`, `winning_power`, `led_element`, `all_powers[]` | Outcome analysis |
| `panic_changed` | `player_id`, `round`, `trick`, `old_panic`, `new_panic`, `reason` | Panic drift tracking |
| `round_scored` | `player_id`, `round`, `tricks_won`, `souls_earned`, `majority_bonus` | Economy tracking |
| `upgrade_performed` | `player_id`, `round`, `card_id`, `old_level`, `new_level`, `cost`, `remaining_souls` | Upgrade economy |
| `game_end` | `winner_id`, `winner_team`, `final_souls[]`, `total_rounds` | Outcome distribution |

### 2.2 Derived Metrics (Computed Post-Hoc)

These are not events but computed aggregations:

| Metric | Formula | Target Use |
|---|---|---|
| **Hand Quality Index (HQI)** | `sum(basePower) / HAND_SIZE` | Measure deal fairness; expected value = 6.5 |
| **Element Concentration Ratio** | `max_element_count / HAND_SIZE` | Detect degenerate hands |
| **Trump Hit Rate** | `trump_cards_in_hand / HAND_SIZE` | Per-player trump advantage |
| **Position Advantage Score** | `win_rate[position] - (1/player_count)` | Quantify play-order bias |
| **Interaction Swing** | `max(effective_power - base_power) per trick` | Measure modifier volatility |
| **Souls Gini Coefficient** | Standard Gini over `totalSouls[]` at game end | Measure outcome inequality |
| **Upgrade Efficiency** | `total_tricks_won_by_upgraded_cards / total_upgrade_cost` | ROI of upgrades |
| **Panic Drift** | `panic_end_of_game - panic_start_of_game` | Track systemic panic inflation/deflation |

### 2.3 Implementation Recommendation

Since BatakSouls is a Node.js terminal game with no server, the lightest viable approach is:

1. Create a `telemetry.js` module exporting an `emit(eventType, payload)` function
2. Buffer events in memory during a game session
3. Write a single JSON-lines file to `./logs/game_<timestamp>.jsonl` at `game_end`
4. Build a separate `analyze.js` CLI script that reads all `.jsonl` files and outputs aggregated statistics

This requires no external dependencies, no database, and no network. A 7-round, 5-player game would generate approximately 500 events (roughly 50KB of JSON). Thousands of simulated games would still fit in a single directory.

---

## 3. Balance Analysis: Statistical Modeling

### 3.1 Card Power Distribution

Cards have `basePower` drawn uniformly from [3, 10] via `Math.floor(Math.random() * 8) + 3`.

```
Distribution: Discrete Uniform(3, 10)
Mean:         6.5
Variance:     5.25
Std Dev:      2.29
```

A 26-card collection has expected total power of `26 * 6.5 = 169`. A 13-card hand drawn from that collection has expected total power of `13 * 6.5 = 84.5`.

**Concern:** The variance across hands is high. Two standard deviations of a 13-card hand sum is approximately `2 * sqrt(13 * 5.25) = 16.5`. This means a "lucky" hand totals around 101 while an "unlucky" hand totals around 68 -- a 48% spread. This is significant in a game where the total power budget per trick is typically 20-40.

**Recommendation:** Track the HQI distribution across 10,000+ simulated games. If the inter-quartile range of `sum(basePower)` for dealt hands exceeds 15% of the mean, consider tightening the power range to [4, 9] or implementing a "reroll" mechanic for hands below a quality floor.

### 3.2 Element Distribution in Collections

Each collection guarantees 1 card per element (9 cards), then fills 17 remaining slots uniformly at random across 9 elements. Expected cards per element:

```
Guaranteed:   1
Random fill:  17/9 = 1.89
Expected:     2.89 cards per element per collection
```

But variance matters more. The random fill for a single element follows `Binomial(17, 1/9)`:

```
P(0 extra) = (8/9)^17 = 0.133
P(1 extra) = C(17,1) * (1/9) * (8/9)^16 = 0.253
P(2 extra) = C(17,2) * (1/9)^2 * (8/9)^15 = 0.227
P(3 extra) = 0.128
P(4+ extra) = 0.259
```

So a player has a 13.3% chance of having exactly 1 card of a given element, and a 25.9% chance of having 5 or more cards of a single element. This creates a wide spectrum of "trump-ready" vs "trump-starved" hands.

**Recommendation:** Simulate the probability that a player has 0 cards of the trump element in their dealt hand, stratified by collection composition. If this exceeds 15%, the bid sacrifice mechanic becomes punishing without counterplay.

### 3.3 Trump Element Selection Probability

Trump is determined by the element with the highest total bid power across all players. In a 3-player game, each player bids 1 card. The probability that a specific element becomes trump depends on:

1. How many players hold cards of that element
2. The AI bidding strategy (Aggressive bids weakest card of most-held suit, Defensive bids absolute weakest, Reckless bids strongest of a random suit)
3. Whether the human player coordinates

**Key observation:** Aggressive AI always bids its most-held suit. With 2.89 expected cards per element, the most-held suit typically has 4-5 cards. This creates a systematic bias toward elements that multiple Aggressive AIs share in common.

**Simulation target:** Run 10,000 games with various AI compositions and measure the empirical trump element distribution. Hypothesis: with 2+ Aggressive AIs, certain elements will be trump disproportionately often, creating a "meta" that the human can exploit by drafting those elements heavily.

### 3.4 Play Order and Panic Dynamics

Play order is sorted by descending panic. Higher panic = plays first = disadvantage (less information, fewer interaction bonuses from earlier plays). Initial panic values:

```
Human:       5 + Uniform(-2, 2) = Uniform(3, 7)
Aggressive:  6 + Uniform(-2, 2) = Uniform(4, 8)
Defensive:   4 + Uniform(-2, 2) = Uniform(2, 6)
Reckless:    5 + Uniform(-2, 2) = Uniform(3, 7)
```

Panic modifiers per round:
- Bid winner: -2
- Trump suit losers (bid on trump but lost): -1
- Each trick won: +0.5

Over a 12-trick round, a player who wins 6 tricks gains +3 panic. The bid winner offsets this partially (-2). Net: +1 panic per round for a "normal" performer.

**Critical finding:** Over 7 rounds, a consistently moderate winner drifts from panic ~5 to panic ~12 (uncapped). But a player who never wins drifts toward the minimum (panic 1). This means losing players get to play later and later, gaining increasing positional advantage -- a natural catch-up mechanic. However, it also means dominant players get punished increasingly, which may feel unfair.

**Simulation target:** Track panic trajectories over 7-round games. Key questions:
1. Does panic converge to a steady state, or does it diverge?
2. What is the correlation between final panic and final souls? (Expect negative.)
3. Is the +0.5 per trick win the right coefficient? Too high creates oscillation, too low makes panic static.

### 3.5 Cross-Team Interaction Asymmetry

The interaction system only looks backward: card `j` (played later) is affected by card `i` (played earlier) if they are on different teams. This creates a structural asymmetry based on play order.

In a 5-player game with play positions 1-5, the expected number of cross-team interactions per position is:

```
Position 1: 0 interactions (no earlier cards)
Position 2: 0 or 1 (depends on 1 earlier card)
Position 3: 0, 1, or 2 (depends on 2 earlier cards)
Position 4: 0, 1, 2, or 3
Position 5: 0, 1, 2, 3, or 4
```

Expected interaction count (assuming 50% enemy probability and 1/9 chance of favorable element matchup for each pair):

```
Position k: E[interactions] = (k-1) * P(cross-team) * P(element_match)
           = (k-1) * 0.5 * (2/9)
           = (k-1) * 0.111
```

The factor `2/9` is because each element beats exactly 1 of 9 elements (empower) and is beaten by exactly 1 of 9 elements (weaken), giving 2/9 chance of any interaction.

So position 5 has `4 * 0.111 = 0.44` expected interactions vs position 1's 0. On average the bonus is small, but the variance is what matters -- when interactions DO fire, they swing +4 or -4 on a base power range of [3, 10]. A single interaction can reverse a 4-point power gap.

**Simulation target:** Compute the empirical distribution of `effective_power - base_power` per play position across 10,000 tricks. This quantifies the "volatility premium" of later positions.

### 3.6 Upgrade Economy Model

The upgrade cost function is `10 + level * 5`:

| Level | Cost | Cumulative Cost | Power Gain | Cumulative Power |
|---|---|---|---|---|
| 0 -> 1 | 10 | 10 | +2 | +2 |
| 1 -> 2 | 15 | 25 | +2 | +4 |
| 2 -> 3 | 20 | 45 | +2 | +6 |
| 3 -> 4 | 25 | 70 | +2 | +8 |
| 4 -> 5 | 30 | 100 | +2 | +10 |
| 5 -> 6 | 35 | 135 | +2 | +12 |
| 6 -> 7 | 40 | 175 | +2 | +14 |
| 7 -> 8 | 45 | 220 | +2 | +16 |
| 8 -> 9 | 50 | 265 | +2 | +18 |
| 9 -> 10 | 55 | 320 | +2 | +20 |

A maxed card has base [3-10] + 20 = [23-30]. Compare to an unupgraded card's [3-10]. The gap is enormous.

**Income analysis:** Per round, a player winning 6 of 12 tricks earns `6 * 10 + 15 = 75 souls` (with majority bonus). A player winning 3 tricks earns `3 * 10 = 30 souls`. Over 6 upgrade phases (7-round game), the high performer earns approximately 450 souls, enough to fully max 2 cards and partially upgrade 4 others. The low performer earns approximately 180 souls, enough for roughly 7 level-1 upgrades.

**This is a runaway leader problem.** By round 4, the leading player's upgraded cards are 4-6 power above the trailing player's, which translates to winning even more tricks, earning even more souls, upgrading further.

**Quantified recommendation:** Simulate the Gini coefficient of `totalSouls` at game end across 1,000 games for each round count (3, 4, 5, 6, 7). Plot the Gini trajectory round-by-round. If Gini exceeds 0.35 by the midpoint of the game (indicating severe inequality), the economy needs a catch-up mechanism. Options:

1. **Progressive cost scaling:** `upgradeCost = (10 + level * 5) * (1 + 0.1 * totalUpgradeLevels)` -- makes later upgrades globally more expensive for the leader
2. **Underdog bonus:** Players with below-median tricks won get +5 souls per trick next round
3. **Diminishing upgrade returns:** Power gain = `max(1, 2 - floor(averageLevel / 3))` -- less effective as overall collection level rises

### 3.7 Majority Bonus Analysis

The majority bonus (+15 souls) goes to the player(s) with the most tricks. In a 5-player game with 12 tricks, the expected tricks per player is 2.4. A "majority" of 4+ tricks is common.

**Problem:** The bonus is flat. Whether you win by 1 trick or by 6, you get +15. This doesn't differentiate dominant performances from narrow wins. Worse, in asymmetric team sizes (4 allies vs 1 enemy), allies collectively win most tricks but the majority bonus goes to the individual with the most, creating intra-team competition that conflicts with the team mechanic.

**Recommendation:** Track the distribution of majority winners by team and by margin. If allies win the majority bonus >80% of the time in 4v1 setups, the bonus is not functioning as intended for the enemy team.

---

## 4. AI Behavior Analysis

### 4.1 AI Strategy Effectiveness Model

The three AI types create measurably different play patterns:

| AI Type | Bid Strategy | Play Strategy | Lead Strategy | Upgrade Strategy |
|---|---|---|---|---|
| Aggressive | Weakest card of most-held suit | Highest effective power | Strongest card | Upgrade strongest cards first |
| Defensive | Absolute weakest card | Lowest effective power | Weakest card | Spread upgrades evenly |
| Reckless | Strongest card of random suit | 70% strongest / 30% random | Strongest card | Not implemented (falls through to nothing) |

**Bug detected in upgrade.js:** The `aiUpgradePhase` function switches on `AI_TYPES.CHAOTIC` (line 60), but the constant is named `AI_TYPES.RECKLESS`. This means Reckless AI never upgrades its cards. This is a silent, critical bug that makes Reckless AI progressively weaker each round.

```javascript
// upgrade.js line 53-63
switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      aiUpgradeAggressive(player);
      break;
    case AI_TYPES.DEFENSIVE:
      aiUpgradeDefensive(player);
      break;
    case AI_TYPES.CHAOTIC:    // <-- Should be AI_TYPES.RECKLESS
      aiUpgradeChaotic(player);
      break;
  }
```

**Simulation target:** Run 1,000 games per AI composition (all-Aggressive, all-Defensive, all-Reckless, mixed) and compute:
1. Win rate per AI type
2. Average souls per round per AI type
3. Tricks won distribution per AI type
4. Upgrade investment per AI type (currently 0 for Reckless due to bug)

**Hypothesis:** Aggressive AI dominates in short games (3 rounds) because it maximizes immediate trick wins. Defensive AI gains advantage in long games (7 rounds) because its spread-upgrade strategy builds a more balanced collection. Reckless AI should perform between the two but currently performs worst due to the upgrade bug.

### 4.2 Defensive AI: Suboptimal Design

Defensive AI always plays its weakest card. This is not actually "defensive" in a trick-taking context -- it's "surrender." A rational defensive strategy would:

1. Play weak cards on tricks it expects to lose (card dumping)
2. Play strong cards on tricks it expects to win (resource conservation)
3. Save trump cards for critical late-round tricks

The current implementation has no trick evaluation. It will play its weakest card even when it could easily win the trick.

**Metric to track:** `defensive_missed_wins` -- count of tricks where Defensive AI's strongest available card would have won but it played its weakest instead. If this exceeds 30% of tricks, the AI is leaving significant value on the table.

### 4.3 AI Bid Strategy Quality

Aggressive AI bids its weakest card of its most-held suit. This is strategically sound: it maximizes the chance of setting trump to a suit where it has depth, while sacrificing minimal power.

Defensive AI bids its absolute weakest card. This is strategically incoherent: it doesn't consider which element it wants as trump. If its weakest card is in an element it only has 1 card of, it spends its bid on an element with zero follow-up.

Reckless AI bids the strongest card of a random element. This is the worst strategy: it sacrifices a high-power card (reducing hand quality) and picks a random element (no trump correlation). However, it does contribute high power to the trump tally, meaning Reckless AI can accidentally force trump to an element that benefits other players.

**Recommendation:** Track `bid_element == trump_element` rate per AI type. Expected: Aggressive ~40-60%, Defensive ~15-25% (random chance), Reckless ~11% (1/9 random). If Aggressive AI's bid-to-trump conversion rate is below 30%, the bidding system has too much noise for strategic bidding to matter.

---

## 5. Simulation Framework Design

### 5.1 Architecture

Build a headless simulation runner that bypasses all UI and input:

```
src/simulate.js
  - Import: createPlayer, dealHand, biddingPhase (headless), resolveTrick
  - Remove all console.log, askNumber, waitForKey calls
  - Replace human player with an AI type
  - Run N games with configurable parameters
  - Output: JSON array of game summaries
```

### 5.2 Priority Simulations

Ordered by insight value per engineering hour:

| Priority | Simulation | Sample Size | Key Output |
|---|---|---|---|
| P0 | **Win rate by AI type** | 10,000 games | Win rate, souls mean/variance per type |
| P0 | **Play position advantage** | 10,000 games x 5 players | Win rate by play position (1st through 5th) |
| P1 | **Trump element distribution** | 10,000 games | Frequency of each element as trump |
| P1 | **Souls Gini over rounds** | 5,000 games x 7 rounds | Gini trajectory, identify snowball onset |
| P1 | **Hand quality vs outcome correlation** | 10,000 games | Pearson r between HQI and tricks won |
| P2 | **Panic steady-state analysis** | 1,000 games x 7 rounds | Panic distribution at each round boundary |
| P2 | **Upgrade ROI by strategy** | 5,000 games x 7 rounds | Souls-per-upgrade-level by AI type |
| P3 | **Element frequency in winning tricks** | 50,000 tricks | Element win rate above/below baseline |
| P3 | **Stacking interaction frequency** | 50,000 tricks | Distribution of interaction counts per trick |

### 5.3 Monte Carlo Parameter Sweep

For the upcoming RPG evolution, the following parameters should be swept simultaneously:

```
TRUMP_BONUS:               [2, 3, 4, 5, 6]
WEAKNESS_BONUS:            [2, 3, 4, 5]
SAME_ELEMENT_TEAM_BUFF:    [1, 2, 3]
TRICK_WIN_PANIC_INCREASE:  [0.25, 0.5, 1.0]
BID_WINNER_PANIC_REDUCTION:[1, 2, 3]
MAJORITY_BONUS:            [10, 15, 20, 30]
LEVEL_POWER_BONUS:         [1, 2, 3]
```

Total combinations: `5 * 4 * 3 * 3 * 3 * 4 * 3 = 6,480`. At 100 games per combination, that's 648,000 games. With headless simulation, each game takes <10ms (no I/O), so the full sweep runs in under 2 hours on a single core.

**Objective function:** Minimize the absolute value of `(ally_win_rate - 0.5)` while maximizing `entropy(souls_distribution)` and keeping `max(position_win_rate) - min(position_win_rate) < 0.05`.

---

## 6. A/B Testing Framework

Since BatakSouls is a terminal game without live users, "A/B testing" means simulation-based comparison of design variants. The framework applies identically to future live testing.

### 6.1 Test: Trump Bonus Value

```
Hypothesis: TRUMP_BONUS = 4 is too weak relative to WEAKNESS_BONUS = 4,
            making bidding strategy irrelevant.

Variant A (Control):  TRUMP_BONUS = 4
Variant B:            TRUMP_BONUS = 5
Variant C:            TRUMP_BONUS = 6

Primary metric:   Correlation between bid_element==trump and tricks_won
Secondary metric: Win rate of bid winner vs non-bid-winners
Sample size:      5,000 games per variant
Success criteria: Variant where bid winner win rate is 25-35%
                  (above random but not dominant)
```

### 6.2 Test: Panic Coefficient

```
Hypothesis: TRICK_WIN_PANIC_INCREASE = 0.5 creates insufficient
            positional rotation over a game.

Variant A (Control):  +0.5 per trick win
Variant B:            +1.0 per trick win
Variant C:            +0.25 per trick win, but -0.5 per trick loss

Primary metric:   Standard deviation of play_position per player across
                  12 tricks in a round
Secondary metric: Correlation between panic and win rate
Sample size:      3,000 games per variant
Success criteria: Position std dev > 1.0 (meaningful rotation)
                  without panic exceeding 15 by game end
```

### 6.3 Test: Upgrade Economy Variants

```
Hypothesis: Linear upgrade cost (10 + level * 5) creates runaway leaders.

Variant A (Control):  cost = 10 + level * 5 (linear)
Variant B:            cost = 10 + level * 10 (steeper linear)
Variant C:            cost = 10 * 1.5^level (exponential)
Variant D:            cost = 10 + level * 5, but trailing players
                      get 20% discount

Primary metric:   Gini coefficient of totalSouls at game end
Secondary metric: Average max card level at game end
Sample size:      5,000 7-round games per variant
Success criteria: Gini < 0.30, max card level between 3-6 for
                  the median player
```

### 6.4 Test: Defensive AI Rework

```
Hypothesis: Defensive AI always playing weakest card makes it
            non-competitive, reducing game quality.

Variant A (Control):  Always plays weakest
Variant B:            Plays weakest on tricks 1-6, strongest on 7-12
Variant C:            Evaluates expected trick power, plays weakest
                      if expected to lose, strongest if expected to win
Variant D:            Plays weakest non-trump card; saves trump for
                      last 3 tricks

Primary metric:   Defensive AI win rate (target: 20-30% in 5-player)
Secondary metric: Tricks won distribution (target: less peaked at 0-1)
Sample size:      5,000 games per variant
Success criteria: Win rate within 5 percentage points of Aggressive AI
```

---

## 7. RPG Evolution: Data Concerns

The upcoming RPG evolution (enemies become mobs, forge rework) introduces new data requirements.

### 7.1 New Events to Track

| Event | Fields | Purpose |
|---|---|---|
| `mob_spawned` | `mob_id`, `mob_type`, `round`, `difficulty_tier` | Track difficulty curve |
| `mob_defeated` | `mob_id`, `round`, `tricks_to_defeat`, `player_damage_taken` | Combat efficiency |
| `forge_choice` | `player_id`, `round`, `upgrade_type`, `card_id`, `cost` | Decision analytics |
| `ability_used` | `player_id`, `round`, `trick`, `ability_name`, `target` | Feature adoption |

### 7.2 Balance Risks of Mob System

If enemies become PvE mobs with fixed stats rather than AI opponents with random collections:

1. **Difficulty calibration:** Mob power must scale with the expected player power at each round. The expected player power at round R is `6.5 + (R-1) * average_upgrade_levels_per_round * 2`. This creates a formula dependency between upgrade economy and mob difficulty.

2. **Determinism risk:** Fixed mob stats remove the variance that currently comes from AI card generation. If mobs are too predictable, the game becomes solvable. Recommendation: mobs should have randomized power within a tier-appropriate range.

3. **Team size rebalancing:** Current 4v1 imbalance may flip -- if 4 players face a single powerful mob, the mob needs enough power to not be trivially overwhelmed. Track `rounds_where_mob_wins_zero_tricks` and ensure it stays below 20%.

### 7.3 Forge Rework Metrics

If the forge adds upgrade types beyond "+2 power":

- Track **adoption rate** per upgrade type. If >70% of players always pick the same upgrade type, the others are underpowered or unclear.
- Track **upgrade diversity** per collection: `unique_upgrade_types_used / total_upgrades`. Target: >0.4.
- Track **regret rate:** How often players upgrade a card then never play it in subsequent rounds. High regret indicates the upgrade decision has insufficient information.

---

## 8. Key Predictive Models to Build

### 8.1 Win Probability Model

Given the game state at trick T of round R, predict the probability that each player wins the game:

```
Features:
  - Current souls (normalized by max possible)
  - Tricks won this round
  - Hand strength remaining (sum of rawPower for remaining cards)
  - Number of trump cards in hand
  - Current panic value
  - Average collection level
  - Opponent souls (normalized)
  - Round number / total rounds

Model: Logistic regression or gradient-boosted trees
Training data: 50,000+ simulated games with full state histories
Output: P(win) per player, updated per trick
```

This model enables:
- Real-time difficulty assessment during play
- AI improvement (use win probability as evaluation function instead of simple heuristics)
- Balance diagnostics (which features are most predictive of winning?)

### 8.2 Card Value Model

Predict the marginal value of each card in the collection, given the game context:

```
Features:
  - Card element
  - Card base power
  - Card level
  - Collection element distribution
  - Historical trump element frequency
  - Team composition
  - Round number

Target: Expected souls contribution (tricks won by this card * SOULS_PER_TRICK)
```

This model directly improves AI decision-making (bid, play, and upgrade choices) and can generate human-facing card evaluation tooltips.

### 8.3 Churn Prediction (Future, with Real Players)

For when the game has actual users:

```
Features (measured in first 2 rounds):
  - Tricks won
  - Time per decision (human only)
  - Number of "help" or "legend" views
  - Win/loss outcome
  - Interaction modifier confusion (repeated sub-optimal plays after being weakened)

Target: Player completes the full game (binary)
```

Hypothesis: Players who lose the first 2 rounds AND have high decision latency are at highest churn risk. Intervention: offer a "Soul Ember" bonus (free souls) or reduce mob difficulty.

---

## 9. Dashboard Specification

For post-simulation analysis, build a simple terminal-based or HTML dashboard with these panels:

### Panel 1: Balance Overview
- Win rate by AI type (bar chart)
- Win rate by play position (bar chart)
- Trump element frequency (pie chart)
- Souls distribution (box plot per player/AI type)

### Panel 2: Economy Health
- Souls Gini coefficient over rounds (line chart)
- Average collection level over rounds by AI type (line chart)
- Upgrade spending by AI type (stacked bar)

### Panel 3: Interaction Analysis
- Power modifier distribution: histogram of (effective_power - base_power)
- Interaction frequency by trick number (heatmap)
- Trump bonus impact: win rate of trump cards vs non-trump cards

### Panel 4: Panic Dynamics
- Panic trajectory per player over a game (sparklines)
- Correlation matrix: panic vs win rate vs play position vs souls

---

## 10. Immediate Action Items

Ordered by impact and feasibility:

| Priority | Action | Effort | Impact |
|---|---|---|---|
| P0 | **Fix Reckless AI upgrade bug** (`AI_TYPES.CHAOTIC` should be `AI_TYPES.RECKLESS` in `upgrade.js` line 60) | 1 minute | Reckless AI currently never upgrades, making it non-competitive after round 1 |
| P0 | **Build headless simulation runner** | 2-4 hours | Unlocks all other analysis. Without this, everything is guesswork. |
| P1 | **Implement telemetry module** (`telemetry.js` with `emit()` and `flush()`) | 1-2 hours | Required for any data collection |
| P1 | **Run win-rate-by-AI-type simulation** | 30 min (after P0) | Establishes baseline AI competitiveness |
| P1 | **Run position-advantage simulation** | 30 min (after P0) | Quantifies the last-player advantage post-panic-fix |
| P2 | **Run Gini trajectory simulation** | 1 hour | Determines if upgrade economy needs rebalancing before RPG evolution |
| P2 | **Run parameter sweep** | 2-3 hours compute | Identifies optimal CONFIG values |
| P3 | **Build analysis dashboard** | 4-8 hours | Makes simulation outputs interpretable |
| P3 | **Build win probability model** | 4-8 hours | Foundation for smarter AI and balance diagnostics |

---

## 11. Summary

BatakSouls has a mathematically rich design space that is currently navigated entirely by intuition. The 9-element dual-wheel system, team interactions, panic ordering, and upgrade economy create emergent complexity that demands quantitative analysis.

**Three numbers that matter most right now:**

1. **Position advantage delta:** The difference in win rate between play position 1 and play position N. If this exceeds 10 percentage points, the panic system is not adequately compensating for information asymmetry. The Sr Game Designer's review flagged this as a concern; only simulation can confirm whether the fix was sufficient.

2. **Souls Gini at midgame:** If the Gini coefficient of totalSouls exceeds 0.35 by round 4 of a 7-round game, the upgrade economy is creating runaway leaders. The linear cost function `10 + level * 5` is suspicious -- it grows slowly relative to income scaling.

3. **AI type win rate spread:** The difference between the best and worst AI type win rates. If this exceeds 15 percentage points, the weaker AI types are not providing competitive games. The Reckless upgrade bug (P0) is almost certainly the largest contributor right now.

Build the simulation runner first. Everything else follows from data.
