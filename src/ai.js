const { AI_TYPES, CONFIG } = require('./constants');
const { effectivePower, rawPower } = require('./card');

function aiChooseCard(player, trumpElement) {
  const hand = player.hand;

  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      return aggressivePlay(hand, trumpElement);
    case AI_TYPES.DEFENSIVE:
      return defensivePlay(hand, trumpElement);
    case AI_TYPES.CHAOTIC:
      return chaoticPlay(hand);
    default:
      return chaoticPlay(hand);
  }
}

function aiChooseLead(player, trumpElement) {
  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      return aggressiveLeadChoice(player.hand, trumpElement);
    case AI_TYPES.DEFENSIVE:
      return defensiveLeadChoice(player.hand);
    case AI_TYPES.CHAOTIC:
      return chaoticPlay(player.hand);
    default:
      return chaoticPlay(player.hand);
  }
}

function aiChooseBid(player) {
  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      return aggressiveBid(player.hand);
    case AI_TYPES.DEFENSIVE:
      return defensiveBid(player.hand);
    case AI_TYPES.CHAOTIC:
      return chaoticPlay(player.hand);
    default:
      return chaoticPlay(player.hand);
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

// ── Chaotic: random ──
function chaoticPlay(hand) {
  return hand[Math.floor(Math.random() * hand.length)];
}

module.exports = { aiChooseCard, aiChooseLead, aiChooseBid };
