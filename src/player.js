const { ALL_ELEMENTS, CONFIG, MYSTICAL, PHYSICAL, TEAMS } = require('./constants');
const { createCard } = require('./card');

function createCollection() {
  const cards = [];
  // Guarantee at least 1 card per suit
  for (const el of ALL_ELEMENTS) {
    cards.push(createCard(el));
  }
  // Fill remaining slots randomly
  while (cards.length < CONFIG.COLLECTION_SIZE) {
    const el = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
    cards.push(createCard(el));
  }
  return shuffle(cards);
}

function createPlayer(name, isHuman = false, aiType = null, team = TEAMS.ALLIES) {
  return {
    name,
    isHuman,
    aiType,
    team,
    collection: createCollection(),
    hand: [],
    tricksWon: 0,
    souls: 0,
    totalSouls: 0,
  };
}

function dealHand(player) {
  const shuffled = shuffle([...player.collection]);
  player.hand = shuffled.slice(0, CONFIG.HAND_SIZE);
  sortHand(player);
  player.tricksWon = 0;
}

function sortHand(player) {
  const elementOrder = [...MYSTICAL, ...PHYSICAL];
  player.hand.sort((a, b) => {
    const suitA = elementOrder.indexOf(a.element);
    const suitB = elementOrder.indexOf(b.element);
    if (suitA !== suitB) return suitA - suitB;
    const powerA = a.basePower + a.level * CONFIG.LEVEL_POWER_BONUS;
    const powerB = b.basePower + b.level * CONFIG.LEVEL_POWER_BONUS;
    return powerA - powerB; // Ascending power
  });
}

function removeFromHand(player, card) {
  player.hand = player.hand.filter(c => c.id !== card.id);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { createPlayer, dealHand, removeFromHand, shuffle };
