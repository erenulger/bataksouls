const { MYSTICAL, PHYSICAL, TEAMS, CONFIG } = require('./constants');
const { rawPower } = require('./card');

/** @param {object} deckData @param {{isHuman?: boolean}} [opts] @returns {Player} */
function createPlayer(deckData, { isHuman = false } = {}) {
  const panic = isHuman
    ? Math.max(CONFIG.PANIC_FLOOR, Math.min(100, 50 + Math.floor(Math.random() * 41) - 20))
    : deckData.panic;
  const hp = deckData.hp || CONFIG.DEFAULT_PLAYER_HP;
  const handSize = deckData.handSize || CONFIG.HAND_SIZE;
  const deckSize = deckData.cards.length;
  const soulsReward = deckData.soulsReward || 0;
  return {
    name: deckData.name,
    isHuman,
    aiType: deckData.aiType || null,
    team: deckData.team || TEAMS.ALLIES,
    panic,
    hp,
    maxHp: hp,
    handSize,
    deckSize,
    soulsReward,
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
  player.hand = shuffled.slice(0, player.handSize);
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
  const idx = player.hand.indexOf(card);
  if (idx === -1) {
    throw new Error(`Card "${card.name}" (id:${card.id}) not found in ${player.name}'s hand`);
  }
  player.hand.splice(idx, 1);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { createPlayer, dealHand, removeFromHand, shuffle };
