const { AI_TYPES, CONFIG } = require('./constants');
const { effectivePower, rawPower } = require('./card');

/** @param {Player} player @param {string|null} trumpElement @returns {Card} */
function aiChooseCard(player, trumpElement) {
  const hand = player.hand;

  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      return aggressivePlay(hand, trumpElement);
    case AI_TYPES.DEFENSIVE:
      return defensivePlay(hand, trumpElement);
    case AI_TYPES.RECKLESS:
      return recklessPlay(hand, trumpElement);
    default:
      return recklessPlay(hand, trumpElement);
  }
}

/** @param {Player} player @param {string|null} trumpElement @returns {Card} */
function aiChooseLead(player, trumpElement) {
  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      return aggressiveLeadChoice(player.hand, trumpElement);
    case AI_TYPES.DEFENSIVE:
      return defensiveLeadChoice(player.hand);
    case AI_TYPES.RECKLESS:
      return recklessLeadChoice(player.hand, trumpElement);
    default:
      return recklessLeadChoice(player.hand, trumpElement);
  }
}

/** @param {Player} player @returns {Card} */
function aiChooseBid(player) {
  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      return aggressiveBid(player.hand);
    case AI_TYPES.DEFENSIVE:
      return defensiveBid(player.hand);
    case AI_TYPES.RECKLESS:
      return recklessBid(player.hand);
    default:
      return recklessBid(player.hand);
  }
}

// ── Aggressive: plays highest effective power ──
function aggressivePlay(hand, trumpElement) {
  return hand.reduce((best, card) => {
    const bp = effectivePower(best, trumpElement).power;
    const cp = effectivePower(card, trumpElement).power;
    return cp > bp ? card : best;
  });
}

// ── Aggressive Lead: lead with strongest card (trump cards preferred) ──
function aggressiveLeadChoice(hand, trumpElement) {
  return hand.reduce((best, card) => {
    const bp = effectivePower(best, trumpElement).power;
    const cp = effectivePower(card, trumpElement).power;
    return cp > bp ? card : best;
  });
}

// ── Aggressive Bid: bid weakest card of most-held suit ──
function aggressiveBid(hand) {
  const counts = {};
  hand.forEach(c => { counts[c.element] = (counts[c.element] || 0) + 1; });
  const bestElement = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const suitCards = hand.filter(c => c.element === bestElement);
  return suitCards.reduce((best, card) => {
    return rawPower(card) < rawPower(best) ? card : best;
  });
}

// ── Defensive: dumps lowest power card ──
function defensivePlay(hand, trumpElement) {
  const sorted = [...hand].sort((a, b) =>
    effectivePower(a, trumpElement).power - effectivePower(b, trumpElement).power
  );
  return sorted[0];
}

// ── Defensive Lead: lead with weakest card to bait others ──
function defensiveLeadChoice(hand) {
  return hand.reduce((best, card) => {
    return rawPower(card) < rawPower(best) ? card : best;
  });
}

// ── Defensive Bid: bid absolute weakest card ──
function defensiveBid(hand) {
  return hand.reduce((best, card) => {
    return rawPower(card) < rawPower(best) ? card : best;
  });
}

// ── Reckless: 70% strongest, 30% random ──
function recklessPlay(hand, trumpElement) {
  if (Math.random() < 0.7) {
    return aggressivePlay(hand, trumpElement);
  }
  return hand[Math.floor(Math.random() * hand.length)];
}

// ── Reckless Lead: always leads with strongest card ──
function recklessLeadChoice(hand, trumpElement) {
  return aggressiveLeadChoice(hand, trumpElement);
}

// ── Reckless Bid: strongest card of a random element ──
function recklessBid(hand) {
  const elements = [...new Set(hand.map(c => c.element))];
  const pick = elements[Math.floor(Math.random() * elements.length)];
  const suitCards = hand.filter(c => c.element === pick);
  return suitCards.reduce((best, card) => rawPower(card) > rawPower(best) ? card : best);
}

module.exports = { aiChooseCard, aiChooseLead, aiChooseBid };
