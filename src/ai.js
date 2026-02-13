const { effectivePower, computeTrickPowers } = require('./card');
const { beatsElement, AI_TYPES, AI_MOODS } = require('./constants');

// ═══════════════════════════════════════════════════════════════
// HELPERS — all card evaluations use effectivePower(card, trump)
// ═══════════════════════════════════════════════════════════════

/** Card with highest effectivePower. Ties: first in hand order. */
function strongest(hand, trump) {
  return hand.reduce((best, card) =>
    effectivePower(card, trump).power > effectivePower(best, trump).power ? card : best
  );
}

/** Card with lowest effectivePower. Ties: first in hand order. */
function weakest(hand, trump) {
  return hand.reduce((best, card) =>
    effectivePower(card, trump).power < effectivePower(best, trump).power ? card : best
  );
}

/** Card closest to median effectivePower. */
function midrange(hand, trump) {
  const powers = hand.map(c => effectivePower(c, trump).power);
  const sorted = [...powers].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let best = hand[0];
  let bestDist = Math.abs(powers[0] - median);
  for (let i = 1; i < hand.length; i++) {
    const dist = Math.abs(powers[i] - median);
    if (dist < bestDist) {
      bestDist = dist;
      best = hand[i];
    }
  }
  return best;
}

/** Cards that elementally beat the given enemy card. */
function counterCards(hand, enemyCard) {
  return hand.filter(c => beatsElement(c.element, enemyCard.element));
}

/** Cards matching trump element. */
function trumpCards(hand, trump) {
  return hand.filter(c => c.element === trump);
}

/** Weakest card whose effectivePower >= target power. null if none qualify. */
function justBeats(hand, targetPower, trump) {
  const qualifying = hand.filter(c => effectivePower(c, trump).power >= targetPower);
  if (qualifying.length === 0) return null;
  return weakest(qualifying, trump);
}

/** Element with highest total effectivePower across all cards of that element. */
function bestElement(hand, trump) {
  const totals = {};
  hand.forEach(c => {
    totals[c.element] = (totals[c.element] || 0) + effectivePower(c, trump).power;
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

/** Element with fewest cards in hand. */
function worstElement(hand) {
  const counts = {};
  hand.forEach(c => { counts[c.element] = (counts[c.element] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
}

/** Highest effectivePower among cross-team cards already played. 0 if none. */
function strongestEnemyPower(plays, player, trump) {
  const enemyPlays = plays.filter(p => p.player.team !== player.team);
  if (enemyPlays.length === 0) return 0;
  return Math.max(...enemyPlays.map(p => effectivePower(p.card, trump).power));
}

/** Are there any cross-team cards on the table? */
function hasEnemyCards(plays, player) {
  return plays.some(p => p.player.team !== player.team);
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT-AWARE HELPERS — factor in trick bonuses for follow plays
// ═══════════════════════════════════════════════════════════════════

/** Estimate card's trick power if played now, simulating team buffs and cross-team interactions. */
function estimateMyPower(card, ctx) {
  if (!ctx.plays || ctx.plays.length === 0) {
    return effectivePower(card, ctx.trump).power;
  }
  const simPlays = [...ctx.plays, { player: ctx.player, card }];
  const sims = computeTrickPowers(simPlays, ctx.trump);
  return sims[sims.length - 1].power;
}

/** Highest trick power among enemy cards on the table (independent of our card choice). */
function maxEnemyTrickPower(ctx) {
  if (!ctx.plays || ctx.plays.length === 0) return 0;
  const enemyIndices = [];
  for (let i = 0; i < ctx.plays.length; i++) {
    if (ctx.plays[i].player.team !== ctx.player.team) enemyIndices.push(i);
  }
  if (enemyIndices.length === 0) return 0;
  const sims = computeTrickPowers(ctx.plays, ctx.trump);
  return Math.max(...enemyIndices.map(i => sims[i].power));
}

/** Card with highest estimated trick power. Ties: first in hand order. */
function strongestCtx(hand, ctx) {
  return hand.reduce((best, card) =>
    estimateMyPower(card, ctx) > estimateMyPower(best, ctx) ? card : best
  );
}

/** Card with lowest estimated trick power. Ties: first in hand order. */
function weakestCtx(hand, ctx) {
  return hand.reduce((best, card) =>
    estimateMyPower(card, ctx) < estimateMyPower(best, ctx) ? card : best
  );
}

/** Weakest card (by estimated trick power) whose estimated power >= target. null if none. */
function justBeatsCtx(hand, targetPower, ctx) {
  const qualifying = hand.filter(c => estimateMyPower(c, ctx) >= targetPower);
  if (qualifying.length === 0) return null;
  return weakestCtx(qualifying, ctx);
}

// ═══════════════════════════════════════════════
// MOOD SYSTEM — one-way transitions based on HP
// ═══════════════════════════════════════════════

function resolveMood(player) {
  if (!player.aiMood) {
    switch (player.aiType) {
      case AI_TYPES.AGGRESSIVE: player.aiMood = AI_MOODS.NORMAL; break;
      case AI_TYPES.DEFENSIVE:  player.aiMood = AI_MOODS.NORMAL; break;
      case AI_TYPES.TRICKSTER:  player.aiMood = AI_MOODS.SCHEMING; break;
      case AI_TYPES.CHAOTIC:    player.aiMood = AI_MOODS.MINDLESS; break;
      case AI_TYPES.SUPPORTIVE: player.aiMood = AI_MOODS.NORMAL; break;
      default:                  player.aiMood = AI_MOODS.MINDLESS; break;
    }
  }

  const hpRatio = player.hp / player.maxHp;

  if (player.aiType === AI_TYPES.AGGRESSIVE && player.aiMood === AI_MOODS.NORMAL && hpRatio < 0.25) {
    player.aiMood = AI_MOODS.DESPERATE;
  }
  if (player.aiType === AI_TYPES.DEFENSIVE && player.aiMood === AI_MOODS.NORMAL && hpRatio < 0.25) {
    player.aiMood = AI_MOODS.LAST_STAND;
  }
  if (player.aiType === AI_TYPES.TRICKSTER && player.aiMood === AI_MOODS.SCHEMING && hpRatio < 0.50) {
    player.aiMood = AI_MOODS.COWARD;
  }
  if (player.aiType === AI_TYPES.SUPPORTIVE && player.aiMood === AI_MOODS.NORMAL && hpRatio < 0.25) {
    player.aiMood = AI_MOODS.LAST_STAND;
  }

  return player.aiMood;
}

// ══════════════════════════════════════════════════════════════
// SHARED FOLLOW LOGIC — reused across personality mood states
// ══════════════════════════════════════════════════════════════

/** Aggressive normal follow: counter enemies if possible, else strongest (trick-power-aware). */
function aggressiveNormalFollow(ctx) {
  if (hasEnemyCards(ctx.plays, ctx.player)) {
    const enemyPlays = ctx.plays.filter(p => p.player.team !== ctx.player.team);
    const allCounters = [];
    for (const ep of enemyPlays) {
      for (const c of counterCards(ctx.hand, ep.card)) {
        if (!allCounters.includes(c)) allCounters.push(c);
      }
    }
    if (allCounters.length > 0) {
      return strongestCtx(allCounters, ctx);
    }
  }
  return strongestCtx(ctx.hand, ctx);
}

/** Defensive normal follow: justBeats enemy trick power, else weakest (trick-power-aware). */
function defensiveNormalFollow(ctx) {
  if (!hasEnemyCards(ctx.plays, ctx.player)) {
    return midrange(ctx.hand, ctx.trump);
  }
  const enemyPow = maxEnemyTrickPower(ctx);
  const jb = justBeatsCtx(ctx.hand, enemyPow, ctx);
  return jb !== null ? jb : weakestCtx(ctx.hand, ctx);
}

// ═════════════════════════════
// PERSONALITY MODULES
// ═════════════════════════════

// ── AGGRESSIVE: deal maximum damage ──

const aggressive = {
  bid(ctx) {
    const best = bestElement(ctx.hand, null);
    const suitCards = ctx.hand.filter(c => c.element === best);
    return weakest(suitCards, null);
  },

  lead(ctx) {
    if (ctx.player.aiMood === AI_MOODS.DESPERATE) {
      const tc = trumpCards(ctx.hand, ctx.trump);
      return tc.length > 0 ? strongest(tc, ctx.trump) : strongest(ctx.hand, ctx.trump);
    }
    return strongest(ctx.hand, ctx.trump);
  },

  follow(ctx) {
    if (ctx.player.aiMood === AI_MOODS.DESPERATE) {
      return strongestCtx(ctx.hand, ctx);
    }
    return aggressiveNormalFollow(ctx);
  },
};

// ── DEFENSIVE: preserve own HP ──

const defensive = {
  bid(ctx) {
    const worst = worstElement(ctx.hand);
    const suitCards = ctx.hand.filter(c => c.element === worst);
    return weakest(suitCards, null);
  },

  lead(ctx) {
    if (ctx.player.aiMood === AI_MOODS.LAST_STAND) {
      return strongest(ctx.hand, ctx.trump);
    }
    return midrange(ctx.hand, ctx.trump);
  },

  follow(ctx) {
    if (ctx.player.aiMood === AI_MOODS.LAST_STAND) {
      return aggressiveNormalFollow(ctx);
    }
    return defensiveNormalFollow(ctx);
  },
};

// ── CHAOTIC: no intelligence ──

const chaotic = {
  bid(ctx) {
    return ctx.hand[Math.floor(Math.random() * ctx.hand.length)];
  },
  lead(ctx) {
    return ctx.hand[Math.floor(Math.random() * ctx.hand.length)];
  },
  follow(ctx) {
    return ctx.hand[Math.floor(Math.random() * ctx.hand.length)];
  },
};

// ── TRICKSTER: spend HP to hoard cards, collapse when wounded ──

const trickster = {
  bid(ctx) {
    return aggressive.bid(ctx);
  },

  lead(ctx) {
    if (ctx.player.aiMood === AI_MOODS.COWARD) {
      return midrange(ctx.hand, ctx.trump);
    }
    const isOdd = ctx.trick % 2 === 1;
    return isOdd ? strongest(ctx.hand, ctx.trump) : weakest(ctx.hand, ctx.trump);
  },

  follow(ctx) {
    if (ctx.player.aiMood === AI_MOODS.COWARD) {
      return defensiveNormalFollow(ctx);
    }
    const isOdd = ctx.trick % 2 === 1;
    return isOdd ? aggressiveNormalFollow(ctx) : weakestCtx(ctx.hand, ctx);
  },
};

// ── SUPPORTIVE: support allies first, self-preservation second ──

const supportive = {
  bid(ctx) {
    return defensive.bid(ctx);
  },

  lead(ctx) {
    if (ctx.player.aiMood === AI_MOODS.LAST_STAND) {
      return strongest(ctx.hand, ctx.trump);
    }
    return midrange(ctx.hand, ctx.trump);
  },

  follow(ctx) {
    if (ctx.player.aiMood === AI_MOODS.LAST_STAND) {
      return defensiveNormalFollow(ctx);
    }

    // Find ally cards on the table
    const allyPlays = ctx.plays.filter(p =>
      p.player.team === ctx.player.team && p.player !== ctx.player
    );
    const allyElements = new Set(allyPlays.map(p => p.card.element));
    const supportCards = ctx.hand.filter(c => allyElements.has(c.element));

    if (supportCards.length > 0) {
      if (hasEnemyCards(ctx.plays, ctx.player)) {
        const enemyPow = maxEnemyTrickPower(ctx);
        const jb = justBeatsCtx(supportCards, enemyPow, ctx);
        if (jb !== null) return jb;
        return strongestCtx(supportCards, ctx);
      }
      return weakestCtx(supportCards, ctx);
    }

    return defensiveNormalFollow(ctx);
  },
};

// ══════════════════════════════════
// REGISTRY + DISPATCHER
// ══════════════════════════════════

const PERSONALITIES = {
  [AI_TYPES.AGGRESSIVE]: aggressive,
  [AI_TYPES.DEFENSIVE]:  defensive,
  [AI_TYPES.CHAOTIC]:    chaotic,
  [AI_TYPES.TRICKSTER]:  trickster,
  [AI_TYPES.SUPPORTIVE]: supportive,
};

function aiChooseBid(ctx) {
  if (ctx.hand.length === 1) return ctx.hand[0];
  resolveMood(ctx.player);
  const personality = PERSONALITIES[ctx.player.aiType] || chaotic;
  return personality.bid(ctx);
}

function aiChooseLead(ctx) {
  if (ctx.hand.length === 1) return ctx.hand[0];
  resolveMood(ctx.player);
  const personality = PERSONALITIES[ctx.player.aiType] || chaotic;
  return personality.lead(ctx);
}

function aiChooseFollow(ctx) {
  if (ctx.hand.length === 1) return ctx.hand[0];
  resolveMood(ctx.player);
  const personality = PERSONALITIES[ctx.player.aiType] || chaotic;
  return personality.follow(ctx);
}

module.exports = {
  aiChooseBid, aiChooseLead, aiChooseFollow,
  // Exported for testing
  strongest, weakest, midrange, justBeats, counterCards, trumpCards,
  bestElement, worstElement, strongestEnemyPower, hasEnemyCards,
  resolveMood, aggressiveNormalFollow, defensiveNormalFollow,
  estimateMyPower, maxEnemyTrickPower, strongestCtx, weakestCtx, justBeatsCtx,
  PERSONALITIES,
};
