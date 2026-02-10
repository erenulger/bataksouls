const { beatsElement } = require('./constants');
const { effectivePower } = require('./card');

function resolveTrick(plays, trumpElement) {
  if (plays.length === 0) return null;

  const ledElement = plays[0].card.element;
  let bestIndex = 0;
  let bestPower = effectivePower(plays[0].card, ledElement, trumpElement).power;

  for (let i = 1; i < plays.length; i++) {
    const { power } = effectivePower(plays[i].card, ledElement, trumpElement);
    if (power > bestPower) {
      bestPower = power;
      bestIndex = i;
    } else if (power === bestPower) {
      // Tiebreak: trump > weakness > first player
      bestIndex = breakTie(plays, bestIndex, i, ledElement, trumpElement);
      bestPower = effectivePower(plays[bestIndex].card, ledElement, trumpElement).power;
    }
  }

  return {
    winner: plays[bestIndex].player,
    winningCard: plays[bestIndex].card,
    winningPower: bestPower,
    ledElement,
  };
}

function tiePriority(card, ledElement, trumpElement) {
  let score = 0;
  if (card.element === trumpElement) score += 3;
  if (beatsElement(card.element, ledElement)) score += 1;      // strong vs lead
  else if (beatsElement(ledElement, card.element)) score -= 1;  // weak vs lead
  return score;
}

function breakTie(plays, aIdx, bIdx, ledElement, trumpElement) {
  const aPri = tiePriority(plays[aIdx].card, ledElement, trumpElement);
  const bPri = tiePriority(plays[bIdx].card, ledElement, trumpElement);
  if (aPri > bPri) return aIdx;
  if (bPri > aPri) return bIdx;
  return aIdx; // equal priority — first player wins
}

module.exports = { resolveTrick };
