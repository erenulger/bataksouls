const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ELEMENTS, AI_TYPES, AI_MOODS, TEAMS, CONFIG } = require('../src/constants');
const {
  strongest, weakest, midrange, justBeats, counterCards, trumpCards,
  bestElement, worstElement, strongestEnemyPower, hasEnemyCards,
  resolveMood, aggressiveNormalFollow, defensiveNormalFollow,
  aiChooseBid, aiChooseLead, aiChooseFollow,
  estimateMyPower, maxEnemyTrickPower, strongestCtx, weakestCtx, justBeatsCtx,
  PERSONALITIES,
} = require('../src/ai');

// ── Test Helpers ──

function makeCard(element, basePower, level = 0) {
  return { id: Math.floor(Math.random() * 99999), element, basePower, level, name: 'Test' };
}

function makePlayer(aiType, opts = {}) {
  return {
    name: opts.name || 'NPC',
    team: opts.team || TEAMS.ENEMIES,
    aiType,
    hp: opts.hp !== undefined ? opts.hp : 100,
    maxHp: opts.maxHp || 100,
    isHuman: false,
    hand: opts.hand || [],
    aiMood: null,
  };
}

function makeCtx(player, overrides = {}) {
  return {
    player,
    hand: player.hand,
    trump: overrides.trump || null,
    plays: overrides.plays || [],
    players: overrides.players || [player],
    trick: overrides.trick || 1,
    totalTricks: CONFIG.TRICKS_PER_ROUND,
  };
}

// ═══════════════════════════
// HELPER TESTS
// ═══════════════════════════

describe('strongest', () => {
  it('picks card with highest effectivePower', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10), makeCard('Fire', 7)];
    assert.equal(strongest(hand, null), hand[1]);
  });

  it('accounts for trump bonus', () => {
    const hand = [makeCard('Fire', 10), makeCard('Light', 8)];
    const result = strongest(hand, 'Light');
    assert.equal(result, hand[1]); // 8+4=12 > 10
  });

  it('first card wins ties', () => {
    const hand = [makeCard('Fire', 5), makeCard('Light', 5)];
    assert.equal(strongest(hand, null), hand[0]);
  });
});

describe('weakest', () => {
  it('picks card with lowest effectivePower', () => {
    const hand = [makeCard('Fire', 7), makeCard('Fire', 3), makeCard('Fire', 10)];
    assert.equal(weakest(hand, null), hand[1]);
  });

  it('accounts for trump bonus', () => {
    const hand = [makeCard('Fire', 5), makeCard('Light', 4)];
    // Fire=5, Light=4+4=8 with Light trump
    assert.equal(weakest(hand, 'Light'), hand[0]);
  });
});

describe('midrange', () => {
  it('picks card closest to median power', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    assert.equal(midrange(hand, null), hand[1]); // median=7, card[1]=7
  });

  it('works with 2 cards (picks higher = median)', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10)];
    // sorted=[3,10], median=sorted[1]=10, so card with power 10 is closest
    assert.equal(midrange(hand, null), hand[1]);
  });

  it('picks closest when no exact match', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 8), makeCard('Fire', 10)];
    // sorted=[3,8,10], median=8, card[1]=8 exact match
    assert.equal(midrange(hand, null), hand[1]);
  });
});

describe('counterCards', () => {
  it('finds cards that beat enemy element (Light beats Dark)', () => {
    const hand = [makeCard('Light', 5), makeCard('Fire', 8), makeCard('Dark', 3)];
    const enemy = makeCard('Dark', 10);
    const counters = counterCards(hand, enemy);
    assert.equal(counters.length, 1);
    assert.equal(counters[0].element, 'Light');
  });

  it('physical wheel works (Armor beats Slash)', () => {
    const hand = [makeCard('Armor', 5), makeCard('Slash', 8)];
    const enemy = makeCard('Slash', 10);
    const counters = counterCards(hand, enemy);
    assert.equal(counters.length, 1);
    assert.equal(counters[0].element, 'Armor');
  });

  it('returns empty when no counters', () => {
    const hand = [makeCard('Fire', 5), makeCard('Fire', 8)];
    const enemy = makeCard('Light', 10);
    assert.equal(counterCards(hand, enemy).length, 0);
  });
});

describe('trumpCards', () => {
  it('filters to matching trump element', () => {
    const hand = [makeCard('Fire', 5), makeCard('Light', 8), makeCard('Fire', 3)];
    const result = trumpCards(hand, 'Fire');
    assert.equal(result.length, 2);
  });

  it('returns empty when no trump cards', () => {
    const hand = [makeCard('Fire', 5)];
    assert.equal(trumpCards(hand, 'Light').length, 0);
  });
});

describe('justBeats', () => {
  it('returns weakest card that beats target', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const result = justBeats(hand, 6, null);
    assert.equal(result, hand[1]); // power 7 is weakest that beats 6
  });

  it('returns null when nothing qualifies', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 5)];
    assert.equal(justBeats(hand, 10, null), null);
  });

  it('returns exact match', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const result = justBeats(hand, 7, null);
    assert.equal(result, hand[1]); // power 7 = target 7, weakest qualifying
  });

  it('accounts for trump bonus', () => {
    const hand = [makeCard('Fire', 5), makeCard('Light', 4)];
    // Fire=5, Light=4+4=8 with Light trump. Target 7.
    // Fire(5) < 7, Light(8) >= 7
    const result = justBeats(hand, 7, 'Light');
    assert.equal(result.element, 'Light');
  });
});

describe('bestElement', () => {
  it('picks element with highest total effectivePower', () => {
    const hand = [
      makeCard('Fire', 8), makeCard('Fire', 7),   // Fire total: 15
      makeCard('Light', 10),                       // Light total: 10
    ];
    assert.equal(bestElement(hand, null), 'Fire');
  });

  it('trump bonus affects result', () => {
    const hand = [
      makeCard('Fire', 8),   // Fire: 8
      makeCard('Light', 6),  // Light: 6+4=10 with Light trump
    ];
    assert.equal(bestElement(hand, 'Light'), 'Light');
  });
});

describe('worstElement', () => {
  it('picks element with fewest cards', () => {
    const hand = [
      makeCard('Fire', 5), makeCard('Fire', 7),
      makeCard('Light', 10),
    ];
    assert.equal(worstElement(hand), 'Light');
  });
});

describe('strongestEnemyPower', () => {
  it('returns 0 when no enemy cards', () => {
    const player = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    assert.equal(strongestEnemyPower([], player, null), 0);
  });

  it('returns highest cross-team power', () => {
    const player = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Ally' });
    const plays = [
      { player: ally, card: makeCard('Fire', 10) },
      { player: ally, card: makeCard('Light', 5) },
    ];
    assert.equal(strongestEnemyPower(plays, player, null), 10);
  });

  it('ignores same-team cards', () => {
    const player = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const teammate = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Mate' });
    const plays = [
      { player: teammate, card: makeCard('Fire', 20) },
    ];
    assert.equal(strongestEnemyPower(plays, player, null), 0);
  });
});

describe('hasEnemyCards', () => {
  it('returns false when no enemy cards', () => {
    const player = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const teammate = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Mate' });
    const plays = [{ player: teammate, card: makeCard('Fire', 5) }];
    assert.equal(hasEnemyCards(plays, player), false);
  });

  it('returns true when cross-team card present', () => {
    const player = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Fire', 5) }];
    assert.equal(hasEnemyCards(plays, player), true);
  });
});

// ═══════════════════════════
// MOOD SYSTEM TESTS
// ═══════════════════════════

describe('resolveMood', () => {
  it('initializes AGGRESSIVE to NORMAL', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE);
    assert.equal(resolveMood(p), AI_MOODS.NORMAL);
  });

  it('initializes CHAOTIC to MINDLESS', () => {
    const p = makePlayer(AI_TYPES.CHAOTIC);
    assert.equal(resolveMood(p), AI_MOODS.MINDLESS);
  });

  it('initializes TRICKSTER to SCHEMING', () => {
    const p = makePlayer(AI_TYPES.TRICKSTER);
    assert.equal(resolveMood(p), AI_MOODS.SCHEMING);
  });

  it('initializes DEFENSIVE to NORMAL', () => {
    const p = makePlayer(AI_TYPES.DEFENSIVE);
    assert.equal(resolveMood(p), AI_MOODS.NORMAL);
  });

  it('transitions AGGRESSIVE to DESPERATE at hpRatio < 0.25', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hp: 24, maxHp: 100 });
    assert.equal(resolveMood(p), AI_MOODS.DESPERATE);
  });

  it('does NOT transition at hpRatio = 0.25 exactly', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hp: 25, maxHp: 100 });
    assert.equal(resolveMood(p), AI_MOODS.NORMAL);
  });

  it('transitions TRICKSTER to COWARD at hpRatio < 0.50', () => {
    const p = makePlayer(AI_TYPES.TRICKSTER, { hp: 49, maxHp: 100 });
    assert.equal(resolveMood(p), AI_MOODS.COWARD);
  });

  it('transitions DEFENSIVE to LAST_STAND at hpRatio < 0.25', () => {
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hp: 10, maxHp: 100 });
    assert.equal(resolveMood(p), AI_MOODS.LAST_STAND);
  });

  it('does not transition back (one-way)', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hp: 10, maxHp: 100 });
    resolveMood(p);
    assert.equal(p.aiMood, AI_MOODS.DESPERATE);
    p.hp = 100; // "healed"
    resolveMood(p);
    assert.equal(p.aiMood, AI_MOODS.DESPERATE); // still desperate
  });

  it('initializes SUPPORTIVE to NORMAL', () => {
    const p = makePlayer(AI_TYPES.SUPPORTIVE);
    assert.equal(resolveMood(p), AI_MOODS.NORMAL);
  });

  it('transitions SUPPORTIVE to LAST_STAND at hpRatio < 0.25', () => {
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hp: 24, maxHp: 100 });
    assert.equal(resolveMood(p), AI_MOODS.LAST_STAND);
  });

  it('unknown aiType defaults to MINDLESS', () => {
    const p = makePlayer('Unknown');
    assert.equal(resolveMood(p), AI_MOODS.MINDLESS);
  });
});

// ═══════════════════════════
// PERSONALITY BID TESTS
// ═══════════════════════════

describe('aggressive bid', () => {
  it('bids weakest card of bestElement', () => {
    const hand = [
      makeCard('Fire', 8), makeCard('Fire', 3),  // Fire total: 11
      makeCard('Light', 10),                      // Light total: 10
    ];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].bid(ctx);
    assert.equal(card.element, 'Fire');
    assert.equal(card.basePower, 3); // weakest Fire card
  });
});

describe('defensive bid', () => {
  it('bids weakest card of worstElement (fewest cards)', () => {
    const hand = [
      makeCard('Fire', 8), makeCard('Fire', 5),
      makeCard('Light', 10),
    ];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand });
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].bid(ctx);
    assert.equal(card.element, 'Light'); // only 1 Light card
  });
});

describe('chaotic bid', () => {
  it('returns a card from hand', () => {
    const hand = [makeCard('Fire', 5), makeCard('Light', 8)];
    const p = makePlayer(AI_TYPES.CHAOTIC, { hand });
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.CHAOTIC].bid(ctx);
    assert.ok(hand.includes(card));
  });
});

describe('trickster bid', () => {
  it('same as aggressive bid', () => {
    const hand = [
      makeCard('Fire', 8), makeCard('Fire', 3),
      makeCard('Light', 10),
    ];
    const p1 = makePlayer(AI_TYPES.AGGRESSIVE, { hand: [...hand] });
    const p2 = makePlayer(AI_TYPES.TRICKSTER, { hand: [...hand] });
    const c1 = PERSONALITIES[AI_TYPES.AGGRESSIVE].bid(makeCtx(p1));
    const c2 = PERSONALITIES[AI_TYPES.TRICKSTER].bid(makeCtx(p2));
    assert.equal(c1.element, c2.element);
    assert.equal(c1.basePower, c2.basePower);
  });
});

// ═══════════════════════════
// PERSONALITY LEAD TESTS
// ═══════════════════════════

describe('aggressive lead', () => {
  it('NORMAL: plays strongest card', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10), makeCard('Light', 7)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    resolveMood(p);
    const ctx = makeCtx(p, { trump: 'Fire' });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].lead(ctx);
    assert.equal(card, hand[1]); // Fire 10 = effectivePower 14 (10+4 trump)
  });

  it('DESPERATE: plays strongest trump card when available', () => {
    const hand = [makeCard('Light', 10), makeCard('Fire', 5), makeCard('Fire', 8)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand, hp: 10 });
    resolveMood(p);
    const ctx = makeCtx(p, { trump: 'Fire' });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].lead(ctx);
    assert.equal(card.element, 'Fire');
    assert.equal(card.basePower, 8); // strongest Fire card
  });

  it('DESPERATE: falls back to strongest when no trump cards', () => {
    const hand = [makeCard('Light', 10), makeCard('Dark', 7)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand, hp: 10 });
    resolveMood(p);
    const ctx = makeCtx(p, { trump: 'Fire' });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].lead(ctx);
    assert.equal(card, hand[0]); // Light 10 is strongest
  });
});

describe('defensive lead', () => {
  it('NORMAL: plays midrange card', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand });
    resolveMood(p);
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].lead(ctx);
    assert.equal(card, hand[1]); // midrange = 7
  });

  it('LAST_STAND: plays strongest', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand, hp: 10 });
    resolveMood(p);
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].lead(ctx);
    assert.equal(card, hand[1]); // strongest = 10
  });
});

describe('trickster lead', () => {
  it('SCHEMING odd trick: plays strongest', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.TRICKSTER, { hand });
    resolveMood(p);
    const ctx = makeCtx(p, { trick: 1 });
    const card = PERSONALITIES[AI_TYPES.TRICKSTER].lead(ctx);
    assert.equal(card, hand[1]);
  });

  it('SCHEMING even trick: plays weakest', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.TRICKSTER, { hand });
    resolveMood(p);
    const ctx = makeCtx(p, { trick: 2 });
    const card = PERSONALITIES[AI_TYPES.TRICKSTER].lead(ctx);
    assert.equal(card, hand[0]);
  });

  it('COWARD: plays midrange', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.TRICKSTER, { hand, hp: 30 });
    resolveMood(p);
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.TRICKSTER].lead(ctx);
    assert.equal(card, hand[1]); // midrange
  });
});

// ═══════════════════════════
// PERSONALITY FOLLOW TESTS
// ═══════════════════════════

describe('aggressive follow', () => {
  it('NORMAL with counter: plays strongest counter', () => {
    const hand = [makeCard('Light', 5), makeCard('Light', 8), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Dark', 7) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].follow(ctx);
    // Light beats Dark. Two Light cards: 5 and 8. Strongest counter = 8
    assert.equal(card.element, 'Light');
    assert.equal(card.basePower, 8);
  });

  it('NORMAL without counter: plays strongest', () => {
    const hand = [makeCard('Fire', 5), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Light', 7) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].follow(ctx);
    assert.equal(card, hand[1]); // Fire 10
  });

  it('NORMAL no enemy cards: plays strongest', () => {
    const hand = [makeCard('Fire', 5), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    resolveMood(p);
    const ctx = makeCtx(p, { plays: [] });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].follow(ctx);
    assert.equal(card, hand[1]);
  });

  it('DESPERATE: plays strongest regardless of counters', () => {
    const hand = [makeCard('Light', 5), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand, hp: 10 });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Dark', 7) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].follow(ctx);
    // Light 5 counters Dark but Fire 10 is strongest. DESPERATE picks strongest.
    assert.equal(card, hand[1]);
  });
});

describe('defensive follow', () => {
  it('NORMAL: plays justBeats when possible', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Light', 6) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].follow(ctx);
    assert.equal(card, hand[1]); // Fire 7 justBeats 6
  });

  it('NORMAL: plays weakest when cannot beat', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 5)];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Light', 10) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].follow(ctx);
    assert.equal(card, hand[0]); // Fire 3, weakest
  });

  it('NORMAL no enemy cards: plays midrange', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand });
    resolveMood(p);
    const ctx = makeCtx(p, { plays: [] });
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].follow(ctx);
    assert.equal(card, hand[1]); // midrange
  });

  it('LAST_STAND: plays like aggressive NORMAL follow', () => {
    const hand = [makeCard('Light', 5), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand, hp: 10 });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Dark', 7) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].follow(ctx);
    // LAST_STAND → aggressiveNormalFollow. Light beats Dark, so Light 5 is the counter.
    // Only 1 counter card (Light 5), so strongest of counters = Light 5
    assert.equal(card.element, 'Light');
  });
});

describe('trickster follow', () => {
  it('SCHEMING odd trick: aggressive follow (counter)', () => {
    const hand = [makeCard('Light', 5), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.TRICKSTER, { hand });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Dark', 7) }];
    const ctx = makeCtx(p, { plays, trick: 1 });
    const card = PERSONALITIES[AI_TYPES.TRICKSTER].follow(ctx);
    // Odd trick, Light counters Dark
    assert.equal(card.element, 'Light');
  });

  it('SCHEMING even trick: plays weakest', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.TRICKSTER, { hand });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Light', 7) }];
    const ctx = makeCtx(p, { plays, trick: 2 });
    const card = PERSONALITIES[AI_TYPES.TRICKSTER].follow(ctx);
    assert.equal(card, hand[0]); // weakest = Fire 3
  });

  it('COWARD: plays like defensive NORMAL follow', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.TRICKSTER, { hand, hp: 30 });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Hero' });
    const plays = [{ player: enemy, card: makeCard('Light', 6) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.TRICKSTER].follow(ctx);
    assert.equal(card, hand[1]); // justBeats 6 → Fire 7
  });
});

// ═══════════════════════════════════════════
// CONTEXT-AWARE HELPER TESTS
// ═══════════════════════════════════════════

describe('estimateMyPower', () => {
  it('returns effectivePower when no plays on table', () => {
    const card = makeCard('Fire', 8);
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand: [card] });
    const ctx = makeCtx(p, { plays: [] });
    assert.equal(estimateMyPower(card, ctx), 8);
  });

  it('adds same-element team buff from ally on table', () => {
    const card = makeCard('Armor', 9);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [card] });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const plays = [{ player: ally, card: makeCard('Armor', 5) }];
    const ctx = makeCtx(p, { plays });
    // Armor(9) + 2 ally buff = 11
    assert.equal(estimateMyPower(card, ctx), 11);
  });

  it('adds cross-team elemental advantage', () => {
    const card = makeCard('Pierce', 6);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [card] });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Armor', 7) }];
    const ctx = makeCtx(p, { plays });
    // Pierce beats Armor: 6 + 4 = 10
    assert.equal(estimateMyPower(card, ctx), 10);
  });

  it('subtracts cross-team elemental disadvantage', () => {
    const card = makeCard('Slash', 6);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [card] });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Armor', 7) }];
    const ctx = makeCtx(p, { plays });
    // Armor beats Slash: 6 - 4 = 2
    assert.equal(estimateMyPower(card, ctx), 2);
  });

  it('user example: Armor(9) with ally Armor + enemy Armor = 11', () => {
    const card = makeCard('Armor', 9);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [card] });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Armor', 7) },
    ];
    const ctx = makeCtx(p, { plays });
    assert.equal(estimateMyPower(card, ctx), 11);
  });

  it('user example: Pierce(6) with ally Armor + enemy Armor = 10', () => {
    const card = makeCard('Pierce', 6);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [card] });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Armor', 7) },
    ];
    const ctx = makeCtx(p, { plays });
    // Pierce beats enemy Armor: +4. No team buff (Pierce != Armor). = 10
    assert.equal(estimateMyPower(card, ctx), 10);
  });

  it('accounts for trump bonus in simulation', () => {
    const card = makeCard('Fire', 5);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [card] });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Light', 7) }];
    const ctx = makeCtx(p, { plays, trump: 'Fire' });
    // Fire(5) + 4 trump = 9
    assert.equal(estimateMyPower(card, ctx), 9);
  });
});

describe('maxEnemyTrickPower', () => {
  it('returns 0 with no plays', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const ctx = makeCtx(p, { plays: [] });
    assert.equal(maxEnemyTrickPower(ctx), 0);
  });

  it('returns 0 when only allies on table', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const plays = [{ player: ally, card: makeCard('Fire', 10) }];
    const ctx = makeCtx(p, { plays });
    assert.equal(maxEnemyTrickPower(ctx), 0);
  });

  it('returns enemy trick power including trump bonus', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Fire', 8) }];
    const ctx = makeCtx(p, { plays, trump: 'Fire' });
    // Fire(8) + trump(4) = 12
    assert.equal(maxEnemyTrickPower(ctx), 12);
  });

  it('returns max among multiple enemies', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const e1 = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'E1' });
    const e2 = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'E2' });
    const plays = [
      { player: e1, card: makeCard('Fire', 8) },
      { player: e2, card: makeCard('Light', 6) },
    ];
    const ctx = makeCtx(p, { plays });
    assert.equal(maxEnemyTrickPower(ctx), 8);
  });
});

describe('strongestCtx', () => {
  it('picks card with highest estimated trick power', () => {
    const pierce = makeCard('Pierce', 6);
    const armor = makeCard('Armor', 9);
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES, hand: [pierce, armor] });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Armor', 7) },
    ];
    const ctx = makeCtx(p, { plays });
    // Armor(9)+2=11, Pierce(6)+4=10. Strongest = Armor
    assert.equal(strongestCtx([pierce, armor], ctx), armor);
  });
});

describe('weakestCtx', () => {
  it('picks card with lowest estimated trick power', () => {
    const pierce = makeCard('Pierce', 6);
    const armor = makeCard('Armor', 9);
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES, hand: [pierce, armor] });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Armor', 7) },
    ];
    const ctx = makeCtx(p, { plays });
    // Armor(9)=11, Pierce(6)=10. Weakest = Pierce
    assert.equal(weakestCtx([pierce, armor], ctx), pierce);
  });
});

describe('justBeatsCtx', () => {
  it('returns weakest card that beats target in trick context', () => {
    const pierce = makeCard('Pierce', 6);
    const armor = makeCard('Armor', 9);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [pierce, armor] });
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Armor', 7) },
    ];
    const ctx = makeCtx(p, { plays });
    // Armor(9)=11, Pierce(6)=10. Target=10. Both qualify. Weakest = Pierce(10)
    assert.equal(justBeatsCtx([pierce, armor], 10, ctx), pierce);
  });

  it('returns null when nothing qualifies', () => {
    const slash = makeCard('Slash', 3);
    const p = makePlayer(AI_TYPES.DEFENSIVE, { team: TEAMS.ENEMIES, hand: [slash] });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Armor', 10) }];
    const ctx = makeCtx(p, { plays });
    // Slash(3) - 4 (Armor beats Slash) = -1. Target=10.
    assert.equal(justBeatsCtx([slash], 10, ctx), null);
  });
});

// ═══════════════════════════════════════════
// SUPPORTIVE PERSONALITY TESTS
// ═══════════════════════════════════════════

describe('supportive bid', () => {
  it('same as defensive bid (sacrifice weakest element)', () => {
    const hand = [
      makeCard('Fire', 8), makeCard('Fire', 5),
      makeCard('Light', 10),
    ];
    const p1 = makePlayer(AI_TYPES.DEFENSIVE, { hand: [...hand] });
    const p2 = makePlayer(AI_TYPES.SUPPORTIVE, { hand: [...hand] });
    const c1 = PERSONALITIES[AI_TYPES.DEFENSIVE].bid(makeCtx(p1));
    const c2 = PERSONALITIES[AI_TYPES.SUPPORTIVE].bid(makeCtx(p2));
    assert.equal(c1.element, c2.element);
    assert.equal(c1.basePower, c2.basePower);
  });
});

describe('supportive lead', () => {
  it('NORMAL: plays midrange', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 7), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand });
    resolveMood(p);
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].lead(ctx);
    assert.equal(card, hand[1]); // midrange = 7
  });

  it('LAST_STAND: plays strongest', () => {
    const hand = [makeCard('Fire', 3), makeCard('Fire', 10)];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, hp: 10 });
    resolveMood(p);
    const ctx = makeCtx(p);
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].lead(ctx);
    assert.equal(card, hand[1]); // strongest = 10
  });
});

describe('supportive follow', () => {
  it('NORMAL: support card justBeats enemy', () => {
    const armor9 = makeCard('Armor', 9);
    const pierce10 = makeCard('Pierce', 10);
    const hand = [armor9, pierce10];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Fire', 6) },
    ];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // Support cards matching ally Armor: [Armor(9)]. Armor(9)+2=11 >= 6. Play it.
    assert.equal(card, armor9);
  });

  it('NORMAL: support card cannot beat enemy, plays strongest support', () => {
    const armor3 = makeCard('Armor', 3);
    const pierce8 = makeCard('Pierce', 8);
    const hand = [armor3, pierce8];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Fire', 10) },
    ];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // Support cards: [Armor(3)]. Armor(3)+2=5 < 10. Can't beat → strongest support = Armor(3)
    assert.equal(card, armor3);
  });

  it('NORMAL: support card, no enemies, plays weakest support', () => {
    const armor3 = makeCard('Armor', 3);
    const armor9 = makeCard('Armor', 9);
    const hand = [armor3, armor9];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const plays = [{ player: ally, card: makeCard('Armor', 5) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // Both get +2. Armor(3)+2=5, Armor(9)+2=11. Weakest = Armor(3)
    assert.equal(card, armor3);
  });

  it('NORMAL: no support cards, falls back to defensive', () => {
    const armor7 = makeCard('Armor', 7);
    const pierce10 = makeCard('Pierce', 10);
    const hand = [armor7, pierce10];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Fire', 5) },
      { player: enemy, card: makeCard('Light', 8) },
    ];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // No support cards (Fire != Armor, Fire != Pierce). Defensive fallback.
    // Enemy power=8. Armor(7)=7<8, Pierce(10)=10>=8. justBeatsCtx → Pierce(10)
    assert.equal(card, pierce10);
  });

  it('NORMAL: no allies on table, falls back to defensive', () => {
    const fire5 = makeCard('Fire', 5);
    const fire10 = makeCard('Fire', 10);
    const hand = [fire5, fire10];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Light', 7) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // No allies on table → no support cards → defensive fallback
    // Enemy power=7. Fire(5)<7, Fire(10)>=7. justBeatsCtx → Fire(10)
    assert.equal(card, fire10);
  });

  it('LAST_STAND: ignores support, plays defensive', () => {
    const armor9 = makeCard('Armor', 9);
    const pierce3 = makeCard('Pierce', 3);
    const hand = [armor9, pierce3];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES, hp: 10 });
    resolveMood(p);
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 5) },
      { player: enemy, card: makeCard('Fire', 6) },
    ];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // LAST_STAND → defensiveNormalFollow. Enemy trick power=6.
    // Armor(9)+2=11>=6, Pierce(3)=3<6. justBeatsCtx: Pierce fails, Armor qualifies → Armor
    assert.equal(card, armor9);
  });

  it('NORMAL: picks cheapest support card among multiple that beat enemy', () => {
    const armor5 = makeCard('Armor', 5);
    const armor9 = makeCard('Armor', 9);
    const hand = [armor5, armor9];
    const p = makePlayer(AI_TYPES.SUPPORTIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const ally = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ENEMIES, name: 'Ally' });
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [
      { player: ally, card: makeCard('Armor', 4) },
      { player: enemy, card: makeCard('Fire', 6) },
    ];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.SUPPORTIVE].follow(ctx);
    // Both are support cards. Armor(5)+2=7>=6, Armor(9)+2=11>=6.
    // justBeatsCtx picks weakest qualifying = Armor(5)
    assert.equal(card, armor5);
  });
});

// ═══════════════════════════════════════════
// CONTEXT-AWARE FOLLOW BEHAVIOR TESTS
// ═══════════════════════════════════════════

describe('context-aware defensive follow', () => {
  it('uses trick power for justBeats (elemental advantage matters)', () => {
    // Enemy played Armor(8). Hand: Pierce(5), Slash(10).
    // Pierce(5)+4 (beats Armor)=9. Slash(10)-4 (Armor beats Slash)=6.
    // Enemy trick power=8. justBeatsCtx: Pierce(9)>=8 yes, Slash(6)<8 no → Pierce
    const pierce5 = makeCard('Pierce', 5);
    const slash10 = makeCard('Slash', 10);
    const hand = [pierce5, slash10];
    const p = makePlayer(AI_TYPES.DEFENSIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Armor', 8) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.DEFENSIVE].follow(ctx);
    assert.equal(card, pierce5);
  });
});

describe('context-aware aggressive follow', () => {
  it('picks strongest counter by trick power including bonuses', () => {
    // Enemy played Armor(7). Hand: Pierce(4), Pierce(6).
    // Both counter Armor. Pierce(4)+4=8, Pierce(6)+4=10. strongestCtx = Pierce(6)
    const pierce4 = makeCard('Pierce', 4);
    const pierce6 = makeCard('Pierce', 6);
    const hand = [pierce4, pierce6];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand, team: TEAMS.ENEMIES });
    resolveMood(p);
    const enemy = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'Enemy' });
    const plays = [{ player: enemy, card: makeCard('Armor', 7) }];
    const ctx = makeCtx(p, { plays });
    const card = PERSONALITIES[AI_TYPES.AGGRESSIVE].follow(ctx);
    assert.equal(card, pierce6);
  });
});

// ═══════════════════════════
// EDGE CASES
// ═══════════════════════════

describe('edge cases', () => {
  it('single card hand: all dispatchers return that card', () => {
    const hand = [makeCard('Fire', 5)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    const ctx = makeCtx(p);
    assert.equal(aiChooseBid(ctx), hand[0]);
    assert.equal(aiChooseLead(ctx), hand[0]);
    assert.equal(aiChooseFollow(ctx), hand[0]);
  });

  it('multiple enemies on table: strongestEnemyPower picks max', () => {
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { team: TEAMS.ENEMIES });
    const e1 = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'E1' });
    const e2 = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'E2' });
    const plays = [
      { player: e1, card: makeCard('Fire', 5) },
      { player: e2, card: makeCard('Light', 10) },
    ];
    assert.equal(strongestEnemyPower(plays, p, null), 10);
  });

  it('counterCards against multiple enemies collects unique counters', () => {
    const hand = [
      makeCard('Light', 5),  // beats Dark
      makeCard('Fire', 8),   // beats Poison
      makeCard('Magic', 3),  // beats Fire
    ];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand });
    resolveMood(p);
    const e1 = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'E1' });
    const e2 = makePlayer(AI_TYPES.CHAOTIC, { team: TEAMS.ALLIES, name: 'E2' });
    const plays = [
      { player: e1, card: makeCard('Dark', 7) },
      { player: e2, card: makeCard('Poison', 6) },
    ];
    const ctx = makeCtx(p, { plays });
    const card = aggressiveNormalFollow(ctx);
    // Light(5) counters Dark, Fire(8) counters Poison. Both are counters.
    // Strongest of [Light 5, Fire 8] = Fire 8
    assert.equal(card.basePower, 8);
  });
});

// ═══════════════════════════
// DISPATCHER TESTS
// ═══════════════════════════

describe('dispatcher', () => {
  it('unknown aiType falls back to chaotic', () => {
    const hand = [makeCard('Fire', 5), makeCard('Light', 8)];
    const p = makePlayer('Unknown', { hand });
    const ctx = makeCtx(p);
    const card = aiChooseLead(ctx);
    assert.ok(hand.includes(card));
  });

  it('aiChooseBid resolves mood before dispatching', () => {
    const hand = [makeCard('Fire', 5), makeCard('Fire', 8)];
    const p = makePlayer(AI_TYPES.AGGRESSIVE, { hand, hp: 10 });
    const ctx = makeCtx(p);
    aiChooseBid(ctx);
    assert.equal(p.aiMood, AI_MOODS.DESPERATE);
  });
});
