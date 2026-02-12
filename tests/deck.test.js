const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { getCardLibrary, loadDeck, loadNPC } = require('../src/deck');
const { ALL_ELEMENTS } = require('../src/constants');

const DECKS_DIR = path.join(__dirname, '..', 'data', 'decks');

describe('getCardLibrary', () => {
  it('returns a Map', () => {
    const lib = getCardLibrary();
    assert.ok(lib instanceof Map);
  });

  it('loads cards from all 9 element files', () => {
    const lib = getCardLibrary();
    const elements = new Set();
    for (const card of lib.values()) {
      elements.add(card.element);
    }
    ALL_ELEMENTS.forEach(el => {
      assert.ok(elements.has(el), `missing element: ${el}`);
    });
  });

  it('each card has required fields', () => {
    const lib = getCardLibrary();
    for (const [id, card] of lib) {
      assert.equal(typeof card.id, 'number', `card ${id} missing numeric id`);
      assert.equal(typeof card.name, 'string', `card ${id} missing name`);
      assert.equal(typeof card.basePower, 'number', `card ${id} missing basePower`);
      assert.ok(ALL_ELEMENTS.includes(card.element), `card ${id} has invalid element: ${card.element}`);
    }
  });

  it('returns same instance on repeated calls (singleton)', () => {
    const a = getCardLibrary();
    const b = getCardLibrary();
    assert.equal(a, b);
  });

  it('card IDs match their map keys', () => {
    const lib = getCardLibrary();
    for (const [id, card] of lib) {
      assert.equal(id, card.id);
    }
  });
});

describe('loadDeck', () => {
  it('loads player deck with resolved cards', () => {
    const deck = loadDeck(path.join(DECKS_DIR, 'player.json'));
    assert.equal(deck.name, 'You');
    assert.ok(Array.isArray(deck.cards));
    assert.ok(deck.cards.length > 0);
    // Cards should be fully resolved with all fields
    deck.cards.forEach((card, i) => {
      assert.equal(typeof card.id, 'number', `card ${i} missing id`);
      assert.equal(typeof card.element, 'string', `card ${i} missing element`);
      assert.equal(typeof card.name, 'string', `card ${i} missing name`);
      assert.equal(typeof card.basePower, 'number', `card ${i} missing basePower`);
      assert.equal(typeof card.level, 'number', `card ${i} missing level`);
    });
  });

  it('resolves cardId references against library', () => {
    const lib = getCardLibrary();
    const deck = loadDeck(path.join(DECKS_DIR, 'player.json'));
    deck.cards.forEach(card => {
      const ref = lib.get(card.id);
      assert.ok(ref, `card id ${card.id} not in library`);
      assert.equal(card.name, ref.name);
      assert.equal(card.element, ref.element);
      assert.equal(card.basePower, ref.basePower);
    });
  });

  it('throws on non-existent file', () => {
    assert.throws(() => loadDeck(path.join(DECKS_DIR, 'nonexistent.json')));
  });
});

describe('loadNPC', () => {
  it('loads NPC with required fields', () => {
    const npc = loadNPC(path.join(DECKS_DIR, 'patches.json'));
    assert.equal(typeof npc.name, 'string');
    assert.equal(typeof npc.aiType, 'string');
    assert.equal(typeof npc.panic, 'number');
    assert.equal(typeof npc.team, 'string');
    assert.ok(Array.isArray(npc.cards));
  });

  it('rejects player.json as NPC (no aiType)', () => {
    assert.throws(
      () => loadNPC(path.join(DECKS_DIR, 'player.json')),
      /aiType/
    );
  });
});
