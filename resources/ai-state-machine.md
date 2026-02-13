# AI Behaviour State Machine

**Purpose:** Editable specification for all AI decision logic. Review, accept, or change any node before implementation begins.

---

## Damage Model Recap

Damage is **pairwise across teams**. For every cross-team pair in a trick, the higher-power card deals `(difference)` damage to the lower-power card's player. Equal power = no damage.

Example: Player plays 10. Three enemy NPCs each choose from [8, 11, 15]:
- NPC plays **8** → NPC takes 2 damage (10 - 8). Player takes 0.
- NPC plays **11** → Player takes 1 damage (11 - 10). NPC takes 0.
- NPC plays **15** → Player takes 5 damage (15 - 10). NPC takes 0.

This means every card choice is an HP trade-off.

---

## Glossary

| Term | Definition |
|---|---|
| `strongest(hand)` | Card with highest `effectivePower(card, trump)` |
| `weakest(hand)` | Card with lowest `effectivePower(card, trump)` |
| `random(hand)` | Random card from hand |
| `midrange(hand)` | Card closest to median `effectivePower` of the hand |
| `counterCards(hand, enemyCard)` | Cards where `beatsElement(myCard.element, enemyCard.element)` is true |
| `trumpCards(hand)` | Cards where `card.element === trumpElement` |
| `bestElement(hand)` | Element with highest total `effectivePower` across all cards of that element in hand |
| `worstElement(hand)` | Element with fewest cards in hand (least invested) |
| `strongestEnemyPower` | Highest `effectivePower` among cross-team cards already played this trick |
| `justBeats(hand, power)` | Weakest card in hand whose `effectivePower` >= `power`. The minimum card that avoids taking damage. |
| `hpRatio` | `player.hp / player.maxHp` |

---

## 1. AGGRESSIVE (Solaire)

**Core drive:** Deal maximum damage. Every trick is an opportunity to hurt the enemy.

### Mood States

```
[NORMAL] ──── hpRatio < 0.25 ────> [DESPERATE]

No return from DESPERATE. Once triggered, stays for rest of combat.
```

### 1.1 Bid

```
[1] Find bestElement(hand)
[2] From cards of that element, pick weakest
[3] Return that card
```

**Intent:** Set trump to the element where AI hits hardest. Sacrifice the runt of that element.

### 1.2 Lead

```
         ┌──────────────┐
         │  Mood check   │
         └──────┬───────┘
                │
        ┌───────┴───────┐
     NORMAL          DESPERATE
        │                │
        ▼                ▼
  ┌───────────┐   ┌──────────────────────┐
  │ strongest │   │ trumpCards(hand)      │
  │  (hand)   │   │ exist?               │
  └───────────┘   └──────┬───────────────┘
                     YES │           NO
                         ▼            ▼
                   strongest    strongest
                  (trumpCards)    (hand)
```

**Intent:** Lead with maximum power to force enemies into a high-damage trick. In DESPERATE, lean on trump cards for the +4 bonus to squeeze out every last point of damage.

### 1.3 Follow

```
         ┌──────────────┐
         │  Mood check   │
         └──────┬───────┘
                │
        ┌───────┴───────┐
     NORMAL          DESPERATE
        │                │
        │                ▼
        │          (same as NORMAL but
        │           skip straight to
        │           strongest if no counter)
        ▼
  ┌─────────────────────────────┐
  │ Any enemy cards on table?   │
  └──────────┬──────────────────┘
         YES │              NO
             ▼               ▼
  ┌─────────────────────┐  strongest(hand)
  │ counterCards exist   │
  │ vs any enemy card?   │
  └──────┬──────────────┘
     YES │           NO
         ▼            ▼
   strongest     strongest(hand)
  (counterCards)
```

**Intent:** Maximize damage dealt. Strongest card = biggest power gap = most HP removed from enemies. When a counter exists, the +4 weakness bonus widens the gap further.

**Characteristic tax:** Plays 15 when 11 would have been enough. The overkill damage is real, but the AI burned a strong card that could have dealt damage in a future trick too. Player can exploit this: bait out the big cards early, dominate late.

---

## 2. DEFENSIVE (Siegmeyer)

**Core drive:** Preserve own HP. Win by not dying, not by killing fast.

### Mood States

```
[NORMAL] ──── hpRatio < 0.25 ────> [LAST_STAND]

No return from LAST_STAND. Once triggered, stays for rest of combat.
```

**LAST_STAND** overrides all decisions: behave exactly like AGGRESSIVE NORMAL. When HP is critical, survival requires dealing damage to end the fight.

### 2.1 Bid

```
[1] Find worstElement(hand)
[2] From cards of that element, pick weakest
[3] Return that card
```

**Intent:** Sacrifice from the element with least investment. Preserve the strong suits for HP protection.

### 2.2 Lead

```
         ┌──────────────┐
         │  Mood check   │
         └──────┬───────┘
                │
        ┌───────┴────────┐
     NORMAL          LAST_STAND
        │                │
        ▼                ▼
   midrange(hand)   strongest(hand)
```

**Intent:** Leading with midrange minimizes the damage gap either way. If enemies play higher, the gap is small (less incoming damage). If enemies play lower, the AI deals some damage without burning top cards. Leading weakest would invite big damage; leading strongest would waste resources.

### 2.3 Follow

```
         ┌──────────────┐
         │  Mood check   │
         └──────┬───────┘
                │
        ┌───────┴────────┐
     NORMAL          LAST_STAND
        │                │
        │                ▼
        │           (play like
        │            AGGRESSIVE NORMAL
        │            follow)
        ▼
  ┌──────────────────────────────────────┐
  │ Does justBeats(hand, strongestEnemy- │
  │ Power) exist?                        │
  │ (Can I avoid taking damage?)         │
  └──────────┬───────────────────────────┘
         YES │              NO
             ▼               ▼
  justBeats(hand,       weakest(hand)
   strongestEnemyPower)
```

**Intent:** The only question defensive cares about: *"Can I avoid taking damage this trick?"*

- **YES:** Play the minimum card that avoids damage. Don't overspend. Playing 11 against a 10 avoids all damage and saves the 15 for a trick where it's actually needed.
- **NO:** No card can beat the enemy's power, so damage is unavoidable. Play the weakest card to minimize waste. Accept the HP loss.

**Characteristic tax:** Never deals more damage than necessary. Plays 11 against a 10 when 15 would have dealt 5 damage. The enemy's HP stays high longer, giving them more time to turn the fight around. Player can exploit this: the defensive NPC won't punish weak plays.

---

## 3. CHAOTIC (Undead)

**Core drive:** None. No awareness of HP, damage, or consequences.

### Mood States

```
[MINDLESS]     (no transitions, single state forever)
```

### 3.1 Bid

```
random(hand)
```

### 3.2 Lead

```
random(hand)
```

### 3.3 Follow

```
random(hand)
```

**Intent:** No intelligence. No pattern. Pure randomness.

**Characteristic tax:** Everything. Might play 8 against a 15 (taking 7 damage for nothing) or play 15 against a 3 (wasting a huge card on a free trick). The undead doesn't know and doesn't care.

---

## 4. TRICKSTER (Patches)

**Core drive:** In SCHEMING: spend HP now to hoard strong cards for a devastating later play. In COWARD: stop the bleeding.

### Mood States

```
[SCHEMING] ──── hpRatio < 0.50 ────> [COWARD]

No return from COWARD. Once triggered, stays for rest of combat.
```

### 4.1 Bid

```
[1] Find bestElement(hand)
[2] From cards of that element, pick weakest
[3] Return that card
```

**Intent:** Same as aggressive bid. Patches is smart -- he wants trump to favour his hand.

### 4.2 Lead

```
         ┌──────────────┐
         │  Mood check   │
         └──────┬───────┘
                │
        ┌───────┴───────┐
     SCHEMING        COWARD
        │                │
        ▼                ▼
  ┌──────────────┐  midrange(hand)
  │ Trick # odd? │
  └──────┬───────┘
     YES │        NO
         ▼         ▼
   strongest   weakest
    (hand)     (hand)
```

**Intent:** SCHEMING alternates: odd tricks show strength (lead high, force enemies to respond or take damage), even tricks bait (lead low, accept incoming damage, save strong cards). COWARD plays midrange like a defensive -- tries to minimize HP loss without burning good cards.

### 4.3 Follow

```
         ┌──────────────┐
         │  Mood check   │
         └──────┬───────┘
                │
        ┌───────┴───────┐
     SCHEMING        COWARD
        │                │
        ▼                ▼
  ┌──────────────┐  (play like
  │ Trick # odd? │   DEFENSIVE NORMAL
  └──────┬───────┘   follow)
     YES │        NO
         ▼         ▼
   (play like    weakest(hand)
    AGGRESSIVE
    NORMAL
    follow)
```

**Intent:**
- **SCHEMING, odd trick:** Play aggressive -- counter enemies, deal max damage. This is where the hoarded cards pay off.
- **SCHEMING, even trick:** Play weakest card. Deliberately take damage. The HP cost is the price of saving strong cards for the next aggressive trick.
- **COWARD:** Play like defensive -- avoid taking damage when possible, dump weakest when not. Patches' HP is low and he can no longer afford to trade HP for card advantage.

**Characteristic tax:** The alternating pattern is exploitable. A player who counts tricks knows: "even trick = Patches plays trash, I can play low and save my good cards too." The player can sync with Patches' rhythm to minimize damage and dominate odd tricks.

---

## 5. Mood Transition Summary

| AI Type | Mood States | Trigger | Effect |
|---|---|---|---|
| Aggressive | NORMAL → DESPERATE | hpRatio < 0.25 | Prioritize trump cards for +4 bonus |
| Defensive | NORMAL → LAST_STAND | hpRatio < 0.25 | Switch to aggressive (must deal damage to survive) |
| Chaotic | MINDLESS (only) | never | Always random |
| Trickster | SCHEMING → COWARD | hpRatio < 0.50 | Stop trading HP for card advantage, play defensive |

---

## 6. NPC Assignments

| NPC | AI Type | Notes |
|---|---|---|
| Undead | Chaotic | Fodder enemy. Pure random. |
| Patches | Trickster | Trades HP for card advantage, collapses into coward at half HP. |
| Solaire | Aggressive | Maximum damage every trick. Burns bright, burns fast. |
| Siegmeyer (new) | Defensive | Takes minimum damage. Efficient. Flips aggressive when cornered. |

---

## 7. Edge Cases

### 7.1 Single-card hand

When hand has only 1 card, all decision trees resolve instantly: play that card. No decision needed.

### 7.2 No counter cards available

When aggressive/trickster follow logic looks for counter cards and finds none, fall through to `strongest(hand)`.

### 7.3 justBeats finds no qualifying card

For defensive follow: if no card in hand has `effectivePower >= strongestEnemyPower`, then damage is unavoidable. Play `weakest(hand)` to minimize card waste. The HP loss is accepted.

### 7.4 Multiple enemies on table

Damage is pairwise. When multiple cross-team cards are on the table:
- **Aggressive:** `strongest(hand)` maximizes damage against ALL of them simultaneously (biggest gap against each).
- **Defensive:** `justBeats` targets the `strongestEnemyPower`. Beating the strongest means beating everyone below too. Zero damage taken from any enemy.

### 7.5 No enemy cards on table yet

When following but only ally cards are visible (all enemy NPC plays came before any cross-team card):
- **Aggressive:** Play `strongest(hand)` -- no information to react to, just hit hard.
- **Defensive:** Play `midrange(hand)` -- no threat visible, hedge.

### 7.6 Tie-breaking

When multiple cards score equally (e.g., two cards both counter an enemy, or two cards both justBeat the enemy), pick the first one in hand order (which is sorted by element then power). No randomness in tie-breaking except for Chaotic.

---

## 8. What This State Machine Does NOT Cover

These are explicitly out of scope for this iteration:

- **Ally coordination** (playing same element as ally for team buff)
- **Trick history memory** (remembering what was played in previous tricks)
- **Endurance/hand conservation** (avoiding exhaustion penalty)
- **Card ability awareness** (abilities don't exist yet)
- **Boss phase transitions** (encounter-specific AI overrides)
- **Target selection** (in multi-enemy, choosing which specific enemy to counter)

---

## Review Checklist

For each AI type, confirm:

- [ ] Bid logic makes sense for the personality
- [ ] Lead logic makes sense for the personality
- [ ] Follow logic makes sense for the personality
- [ ] Mood transition threshold feels right
- [ ] Mood effect matches the character
- [ ] Characteristic tax is visible and exploitable by the player
- [ ] Edge cases are handled reasonably
