const fs = require('fs');
const path = require('path');
const { ALL_ELEMENTS } = require('./constants');

const REQUIRED_CARD_FIELDS = ['id', 'element', 'name', 'basePower', 'level'];

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

module.exports = { loadDeck, saveDeck, loadNPC };
