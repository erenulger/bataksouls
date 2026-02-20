# Data Scientist Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Analytics, Metrics & Predictive Modeling

---

## Analytics State Assessment

BatakSouls currently has **zero telemetry or analytics infrastructure**. The game is local-only — no server persists play data beyond the player's deck JSON file. This limits data-driven decision making entirely to:
- Direct playtesting observations
- Manual code analysis of balance formulas
- Theoretical combat simulations

This report focuses on:
1. **Balance analysis** (what can be inferred from code now)
2. **Analytics roadmap** (what to instrument when the game goes live)
3. **Simulation plan** (what to build for offline balance testing)

---

## Balance Analysis (Code-Derived)

### Issue B-01: Trump Bonus Dominance
**Observation:** Trump bonus is +4 power on top of base power. With base card powers ranging roughly from 2 to 22+ (level 10: base + 20), a +4 trump bonus represents 18–200% of a low-level card's power.

**Concern:** At low card levels (early game), trump bonus is enormous — a level 1 trump card (power 4) vs. a level 1 non-trump card (power 2) is a 2x advantage. At high card levels, the bonus becomes trivial.

**Risk:** Early game may feel heavily RNG-dependent (trump element luck); late game upgrades make trump irrelevant.

**Recommendation:** Scale trump bonus with game phase, or introduce a cap. Consider: `trumpBonus = min(4, Math.floor(cardPower * 0.2))`.

---

### Issue B-02: Bid Winner Panic Reduction Is Very Large
**Observation:**
- Bid winner: panic –20
- Trick winner: panic –5
- Bid loser in high element: panic –10 (approximate)
- Panic floor: 10

A single bid win can dramatically swing play order. With a starting panic of (assumed) ~40-60, a -20 reduction is 33-50% of starting panic in one event.

**Concern:** The bid winner gains both trump advantage AND play-order advantage (plays later = sees enemy cards). This double reward may make the bidding phase too dominant.

**Recommendation:** Playtest whether winning the bid feels too dominant. Consider reducing to -10 or making panic reduction scale with bid margin.

---

### Issue B-03: Chaotic AI Entropy
**Observation:** Chaotic AI (`aiType: 'Chaotic'`) selects cards randomly. In a 12-trick round with 13 cards, true random selection will occasionally produce extremely weak or extremely strong plays with no strategy.

**Concern:** This makes the Chaotic enemy unpredictable in both directions — it could win by luck or lose trivially. This is either "fun chaos" or "frustrating randomness" depending on player tolerance.

**Recommendation:** Track Chaotic AI win rate in simulation. If it wins > 40% of matches, it's too powerful (luck wins too often). If < 20%, it's trivially beatable.

---

### Issue B-04: Endurance Damage Formula
**Observation:** Endurance damage = average power of enemy's remaining cards.

**Concern:** Against high-level enemies with upgraded cards, endurance damage per trick could be very high — potentially a one-shot if the enemy has 10-power average cards and the player has 0 cards.

**Recommendation:** Cap endurance damage per trick at some value (e.g., max 15 per trick) or add player resistance scaling.

---

### Issue B-05: Forge Economy — Uncalibrated
**Observation:**
- First upgrade (level 0→1): 10 souls
- Level 9→10: 10 + (9×5) = 55 souls
- Fully upgrading one card (levels 0→10): sum(10 + n*5 for n in 0..9) = **10×10 + 5×(0+1+...+9)** = 100 + 225 = **325 souls**
- Fully upgrading all 26 cards: 26 × 325 = **8,450 souls**
- Solaire rewards 100 souls per kill

**Observation:** Fully upgrading a deck costs 84.5 Solaire kills. This is an enormous grind if there is no soul multiplier or economy scaling.

**Recommendation:** Either add escalating soul rewards for harder NPCs, or cap the meaningful upgrade path to 5-6 cards rather than all 26.

---

## Analytics Framework Design (For Live/Web Deployment)

### Essential Events to Instrument

```javascript
// Session events
trackEvent('session_start', { mode: 'web|terminal', player_level: avgCardLevel })
trackEvent('session_end', { duration_ms, combats_completed, souls_total })

// Combat events
trackEvent('combat_start', { npc_slug, player_hp, player_avg_card_level })
trackEvent('combat_end', { result: 'victory|defeat', round_count, souls_earned })
trackEvent('trump_reveal', { element, bid_winner: 'player|ai' })
trackEvent('trick_result', { trick_num, winner: 'player|ai', player_card_element, ai_card_element })

// Forge events
trackEvent('forge_upgrade', { card_id, from_level, to_level, cost, souls_remaining })
trackEvent('forge_abort', { reason: 'insufficient_souls|player_cancelled' })

// Balance events
trackEvent('player_death', { npc_slug, player_hp_at_death, round_num })
trackEvent('panic_state', { entity, panic_value, is_player: true|false })
```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Player win rate vs. each NPC | 40-60% | < 30% or > 75% |
| Average combat duration (rounds) | 2-4 | > 6 or < 1 |
| Trump bonus influence on trick win | 30-50% | > 65% (too dominant) |
| Most/least played elements | Balanced | Any element > 40% |
| Average souls per session | TBD | Inform forge balance |
| Forge upgrade frequency | TBD | Which cards get upgraded most |
| Endurance trigger rate | < 20% of rounds | > 40% (hands too small) |

---

## Combat Simulation Plan

For offline balance testing (no real players needed):

```javascript
// combat-simulator.js (to be built)
// Runs N simulated combats between defined player deck and NPC
// Outputs: win rate, avg combat length, element dominance stats

async function simulateCombat(playerDeckPath, npcSlug, iterations = 1000) {
  const results = { wins: 0, losses: 0, avgRounds: 0, elementStats: {} };
  for (let i = 0; i < iterations; i++) {
    const ctx = await createContext({ playerDeckPath, npcSlug });
    const result = await runCombatHeadless(ctx);
    results.wins += result.playerWon ? 1 : 0;
    results.losses += result.playerWon ? 0 : 1;
    results.avgRounds += result.rounds;
    // Aggregate element stats...
  }
  return results;
}
```

---

## Data Scientist Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| DS-01 | Critical | Build combat-simulator.js (headless combat runner) | Balance testing foundation |
| DS-02 | Critical | Run 1000-iteration simulations: player vs. each NPC | Baseline win rate data |
| DS-03 | Critical | Analyze trump bonus impact (B-01) — simulate with/without +4 bonus | Balance validation |
| DS-04 | High | Calculate full forge economy: souls income vs. upgrade cost | Spreadsheet + recommendation |
| DS-05 | High | Analyze bid winner panic reduction (B-02) — is -20 too large? | Balance validation |
| DS-06 | High | Simulate Chaotic AI win rate over 1000 combats | Determine if chaos is fun or frustrating |
| DS-07 | High | Analyze endurance damage formula (B-04) — worst-case scenarios | Stability check |
| DS-08 | Medium | Design minimal telemetry event schema (8-10 events) | For future live tracking |
| DS-09 | Medium | Create balance spreadsheet: all NPC stats, player progression | Single source of truth |
| DS-10 | Medium | Analyze element dominance: which elements win tricks most often? | From simulation data |
| DS-11 | Medium | Recommend NPC stat targets per zone (HP, panic, card power) | Feed to Mid Designer |
| DS-12 | Low | Design A/B test plan: trump bonus value (3 vs. 4 vs. 5) | For playtesting |
| DS-13 | Low | Design player segmentation model (casual vs. strategic players) | Post-launch |
| DS-14 | Low | Prototype local telemetry (write events to log file) | Pre-live analytics |
