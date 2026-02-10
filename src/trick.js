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

function breakTie(plays, aIdx, bIdx, ledElement, trumpElement) {
  const aCard = plays[aIdx].card;
  const bCard = plays[bIdx].card;

  const aTrump = aCard.element === trumpElement;
  const bTrump = bCard.element === trumpElement;
  if (aTrump && !bTrump) return aIdx;
  if (bTrump && !aTrump) return bIdx;

  const aWeak = beatsElement(aCard.element, ledElement);
  const bWeak = beatsElement(bCard.element, ledElement);
  if (aWeak && !bWeak) return aIdx;
  if (bWeak && !aWeak) return bIdx;

  // Both have same bonuses — first player wins
  return aIdx;
}

module.exports = { resolveTrick };
