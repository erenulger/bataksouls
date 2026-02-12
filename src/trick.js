const { computeTrickPowers } = require('./card');

/**
 * @param {Play[]} plays
 * @param {string|null} trumpElement
 * @returns {{winner: Player, winningCard: Card, winningPower: number, trickPowers: TrickPower[]}}
 */
function resolveTrick(plays, trumpElement) {
  if (plays.length === 0) return null;

  const trickPowers = computeTrickPowers(plays, trumpElement);

  let bestIndex = 0;
  let bestPower = trickPowers[0].power;

  for (let i = 1; i < plays.length; i++) {
    const power = trickPowers[i].power;
    if (power > bestPower) {
      bestPower = power;
      bestIndex = i;
    } else if (power === bestPower) {
      bestIndex = breakTie(plays, bestIndex, i, trumpElement);
      bestPower = trickPowers[bestIndex].power;
    }
  }

  return {
    winner: plays[bestIndex].player,
    winningCard: plays[bestIndex].card,
    winningPower: bestPower,
    trickPowers,
  };
}

function tiePriority(card, trumpElement) {
  let score = 0;
  if (card.element === trumpElement) score += 3;
  return score;
}

function breakTie(plays, aIdx, bIdx, trumpElement) {
  const aPri = tiePriority(plays[aIdx].card, trumpElement);
  const bPri = tiePriority(plays[bIdx].card, trumpElement);
  if (aPri > bPri) return aIdx;
  if (bPri > aPri) return bIdx;
  return aIdx; // equal priority — first player wins
}

module.exports = { resolveTrick };
