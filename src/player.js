const { MYSTICAL, PHYSICAL, TEAMS, CONFIG } = require('./constants');
const { rawPower } = require('./card');

/** @param {object} deckData @param {{isHuman?: boolean}} [opts] @returns {Player} */
function createPlayer(deckData, { isHuman = false } = {}) {
  const panic = isHuman
    ? Math.max(CONFIG.PANIC_FLOOR, Math.min(100, 50 + Math.floor(Math.random() * 41) - 20))
    : deckData.panic;
  return {
    name: deckData.name,
    isHuman,
    aiType: deckData.aiType || null,
    team: deckData.team || TEAMS.ALLIES,
    panic,
    collection: deckData.cards.map(c => ({ ...c })),
    hand: [],
    tricksWon: 0,
    souls: 0,
    totalSouls: 0,
  };
}

/** @param {Player} player */
function dealHand(player) {
  const shuffled = shuffle([...player.collection]);
  player.hand = shuffled.slice(0, 13);
  sortHand(player);
  player.tricksWon = 0;
}

function sortHand(player) {
  const elementOrder = [...MYSTICAL, ...PHYSICAL];
  player.hand.sort((a, b) => {
    const suitA = elementOrder.indexOf(a.element);
    const suitB = elementOrder.indexOf(b.element);
    if (suitA !== suitB) return suitA - suitB;
    const powerA = rawPower(a);
    const powerB = rawPower(b);
    return powerA - powerB; // Ascending power
  });
}

/** @param {Player} player @param {Card} card */
function removeFromHand(player, card) {
  const before = player.hand.length;
  player.hand = player.hand.filter(c => c.id !== card.id);
  if (player.hand.length === before) {
    throw new Error(`Card "${card.name}" (id:${card.id}) not found in ${player.name}'s hand`);
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { createPlayer, dealHand, removeFromHand, shuffle };
