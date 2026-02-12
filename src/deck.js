const fs = require('fs');
const path = require('path');
const { ALL_ELEMENTS } = require('./constants');

const CARDS_DIR = path.join(__dirname, '..', 'data', 'cards');
const REQUIRED_CARD_FIELDS = ['id', 'element', 'name', 'basePower', 'level'];

// ── Card Library (lazy-loaded singleton) ──

let _cardLibrary = null;

/**
 * Loads all cards from data/cards/*.json into an id-indexed map.
 * Each card gets its element stamped from the filename.
 * @returns {Map<number, {id, element, name, basePower}>}
 */
function getCardLibrary() {
  if (_cardLibrary) return _cardLibrary;

  _cardLibrary = new Map();
  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('Cards.json'));

  for (const file of files) {
    const element = file.replace('Cards.json', '');
    const elementName = element.charAt(0).toUpperCase() + element.slice(1);
    if (!ALL_ELEMENTS.includes(elementName)) continue;

    const raw = fs.readFileSync(path.join(CARDS_DIR, file), 'utf-8');
    const data = JSON.parse(raw);
    const cards = Object.values(data)[0];

    for (const card of cards) {
      if (_cardLibrary.has(card.id)) {
        throw new Error(`Duplicate card ID ${card.id} in ${file}`);
      }
      _cardLibrary.set(card.id, {
        id: card.id,
        element: elementName,
        name: card.name,
        basePower: card.basePower,
      });
    }
  }

  return _cardLibrary;
}

// ── Deck Loading ──

function resolveCard(entry, index) {
  const lib = getCardLibrary();

  // New format: { "cardId": 1004, "level": 2 }
  if (entry.cardId !== undefined) {
    const ref = lib.get(entry.cardId);
    if (!ref) throw new Error(`Card at index ${index}: unknown cardId ${entry.cardId}`);
    return {
      id: ref.id,
      element: ref.element,
      name: ref.name,
      basePower: ref.basePower,
      level: entry.level || 0,
    };
  }

  // Legacy format: full inline card object { id, element, name, basePower, level }
  return entry;
}

function validateCard(card, index) {
  for (const field of REQUIRED_CARD_FIELDS) {
    if (card[field] === undefined) {
      throw new Error(`Card at index ${index} missing required field: ${field}`);
    }
  }
  if (!ALL_ELEMENTS.includes(card.element)) {
    throw new Error(`Card at index ${index} has invalid element: ${card.element}`);
  }
}

function loadDeck(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.name) throw new Error(`Deck missing "name" field: ${filePath}`);
  if (!Array.isArray(data.cards)) throw new Error(`Deck missing "cards" array: ${filePath}`);

  data.cards = data.cards.map((entry, i) => resolveCard(entry, i));
  data.cards.forEach((card, i) => validateCard(card, i));
  return data;
}

function saveDeck(filePath, deckData) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(deckData, null, 2), 'utf-8');
}

function loadNPC(filePath) {
  const data = loadDeck(filePath);
  if (!data.aiType) throw new Error(`NPC deck missing "aiType": ${filePath}`);
  if (data.panic === undefined) throw new Error(`NPC deck missing "panic": ${filePath}`);
  if (!data.team) throw new Error(`NPC deck missing "team": ${filePath}`);
  return data;
}

module.exports = { loadDeck, saveDeck, loadNPC, getCardLibrary };
