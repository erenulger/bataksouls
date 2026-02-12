const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createPlayer, dealHand, removeFromHand, shuffle } = require('../src/player');
const { ELEMENTS, TEAMS, CONFIG } = require('../src/constants');

function makeDeckData(opts = {}) {
  const cards = [];
  for (let i = 0; i < (opts.size || 26); i++) {
    cards.push({ id: i, element: ELEMENTS.FIRE, name: `Card${i}`, basePower: 5, level: 0 });
  }
  return {
    name: opts.name || 'TestPlayer',
    aiType: opts.aiType || null,
    panic: opts.panic || 50,
    team: opts.team || TEAMS.ALLIES,
    cards,
  };
}

describe('createPlayer', () => {
  it('creates a player from deck data', () => {
    const deck = makeDeckData({ name: 'Alice', panic: 40, team: TEAMS.ENEMIES });
    const player = createPlayer(deck);
    assert.equal(player.name, 'Alice');
    assert.equal(player.team, TEAMS.ENEMIES);
    assert.equal(player.panic, 40);
    assert.equal(player.isHuman, false);
    assert.equal(player.collection.length, 26);
    assert.equal(player.tricksWon, 0);
    assert.equal(player.souls, 0);
    assert.equal(player.totalSouls, 0);
  });

  it('sets isHuman flag when specified', () => {
    const deck = makeDeckData();
    const player = createPlayer(deck, { isHuman: true });
    assert.equal(player.isHuman, true);
  });

  it('human player gets randomized panic within bounds', () => {
    const deck = makeDeckData();
    for (let i = 0; i < 20; i++) {
      const player = createPlayer(deck, { isHuman: true });
      assert.ok(player.panic >= CONFIG.PANIC_FLOOR, `panic ${player.panic} below floor`);
      assert.ok(player.panic <= 100, `panic ${player.panic} above 100`);
    }
  });

  it('NPC player uses deck panic value', () => {
    const deck = makeDeckData({ panic: 75 });
    const player = createPlayer(deck);
    assert.equal(player.panic, 75);
  });

  it('deep copies collection (mutations do not affect source)', () => {
    const deck = makeDeckData();
    const player = createPlayer(deck);
    player.collection[0].level = 99;
    assert.equal(deck.cards[0].level, 0);
  });

  it('defaults to allies team when not specified', () => {
    const deck = makeDeckData();
    delete deck.team;
    const player = createPlayer(deck);
    assert.equal(player.team, TEAMS.ALLIES);
  });
});

describe('dealHand', () => {
  it('deals HAND_SIZE cards from collection', () => {
    const player = createPlayer(makeDeckData());
    dealHand(player);
    assert.equal(player.hand.length, 13);
  });

  it('resets tricksWon to 0', () => {
    const player = createPlayer(makeDeckData());
    player.tricksWon = 5;
    dealHand(player);
    assert.equal(player.tricksWon, 0);
  });

  it('hand cards come from collection', () => {
    const player = createPlayer(makeDeckData());
    dealHand(player);
    const collectionIds = new Set(player.collection.map(c => c.id));
    player.hand.forEach(card => {
      assert.ok(collectionIds.has(card.id), `hand card ${card.id} not in collection`);
    });
  });

  it('sorts hand by element then power', () => {
    const player = createPlayer(makeDeckData());
    // Give diverse elements
    player.collection[0].element = ELEMENTS.LIGHT;
    player.collection[1].element = ELEMENTS.DARK;
    player.collection[2].element = ELEMENTS.PIERCE;
    dealHand(player);
    // Verify sorted: each card's element index should be >= previous
    const { MYSTICAL, PHYSICAL } = require('../src/constants');
    const order = [...MYSTICAL, ...PHYSICAL];
    for (let i = 1; i < player.hand.length; i++) {
      const prevIdx = order.indexOf(player.hand[i - 1].element);
      const currIdx = order.indexOf(player.hand[i].element);
      assert.ok(currIdx >= prevIdx, `hand not sorted at index ${i}`);
    }
  });
});

describe('removeFromHand', () => {
  it('removes card from hand by id', () => {
    const player = createPlayer(makeDeckData());
    dealHand(player);
    const card = player.hand[0];
    const sizeBefore = player.hand.length;
    removeFromHand(player, card);
    assert.equal(player.hand.length, sizeBefore - 1);
    assert.ok(!player.hand.some(c => c.id === card.id));
  });

  it('throws when card not in hand', () => {
    const player = createPlayer(makeDeckData());
    dealHand(player);
    const fakeCard = { id: 9999, name: 'Ghost' };
    assert.throws(() => removeFromHand(player, fakeCard), /not found/);
  });
});

describe('shuffle', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle([...arr]);
    assert.equal(result.length, arr.length);
  });

  it('contains same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle([...arr]);
    assert.deepEqual(result.sort(), arr.sort());
  });

  it('mutates in place', () => {
    const arr = [1, 2, 3, 4, 5];
    const same = shuffle(arr);
    assert.equal(same, arr);
  });
});
