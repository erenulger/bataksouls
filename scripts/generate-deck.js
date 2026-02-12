#!/usr/bin/env node
/**
 * Generate player and NPC decks from the card reference pool (data/cards/).
 * Decks store card ID references — the game resolves them at runtime.
 *
 * Usage:
 *   node scripts/generate-deck.js                  # regenerate all decks
 *   node scripts/generate-deck.js --player         # regenerate player deck only
 *   node scripts/generate-deck.js --npc            # regenerate NPC decks only
 */
const path = require('path');
const { getCardLibrary, saveDeck } = require('../src/deck');
const { ALL_ELEMENTS, CONFIG } = require('../src/constants');

const DECKS_DIR = path.join(__dirname, '..', 'data', 'decks');
const library = getCardLibrary();

// Group library cards by element
const byElement = {};
for (const [id, card] of library) {
  if (!byElement[card.element]) byElement[card.element] = [];
  byElement[card.element].push(id);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(weights) {
  const elements = Object.keys(weights);
  const total = elements.reduce((s, e) => s + weights[e], 0);
  let r = Math.random() * total;
  for (const el of elements) {
    r -= weights[el];
    if (r <= 0) return el;
  }
  return elements[elements.length - 1];
}

/**
 * Build a deck of card references.
 * @param {Object} opts
 * @param {number} opts.size
 * @param {Object} [opts.weights] - element weights (default: uniform)
 * @param {number} [opts.maxLevel] - max pre-assigned level (default: 0)
 * @param {number} [opts.levelChance] - probability a card gets a level (0-1)
 */
function buildCards({ size, weights, maxLevel = 0, levelChance = 0 }) {
  const cards = [];

  if (!weights) {
    weights = {};
    ALL_ELEMENTS.forEach(e => { weights[e] = 1; });
  }

  // Guarantee at least 1 card per element with weight > 0
  const guaranteed = Object.keys(weights).filter(e => weights[e] > 0 && byElement[e]);
  for (const el of guaranteed) {
    const cardId = pick(byElement[el]);
    const level = (maxLevel > 0 && Math.random() < levelChance)
      ? Math.floor(Math.random() * maxLevel) + 1 : 0;
    cards.push({ cardId, level });
  }

  // Fill remaining
  while (cards.length < size) {
    const el = pickWeighted(weights);
    if (!byElement[el]) continue;
    const cardId = pick(byElement[el]);
    const level = (maxLevel > 0 && Math.random() < levelChance)
      ? Math.floor(Math.random() * maxLevel) + 1 : 0;
    cards.push({ cardId, level });
  }

  return cards;
}

// ── Deck Definitions ──

const DECKS = {
  player: {
    file: 'player.json',
    data: {
      name: 'You',
      cards: buildCards({ size: CONFIG.COLLECTION_SIZE }),
    },
  },

  patches: {
    file: 'patches.json',
    data: {
      name: 'Patches',
      aiType: 'Chaotic',
      panic: 55,
      team: 'enemies',
      description: 'A treacherous trickster. Unpredictable and self-serving.',
      difficulty: 1,
      cards: buildCards({
        size: CONFIG.COLLECTION_SIZE,
        maxLevel: 2,
        levelChance: 0.25,
        weights: {
          Light: 1, Dark: 1, Magic: 1, Fire: 1, Poison: 1, Bleed: 1,
          Armor: 2, Slash: 2, Pierce: 2,
        },
      }),
    },
  },

  solaire: {
    file: 'solaire.json',
    data: {
      name: 'Solaire of Astora',
      aiType: 'Aggressive',
      panic: 40,
      team: 'enemies',
      description: 'Praise the sun! A warrior of faith who fights with conviction.',
      difficulty: 2,
      cards: buildCards({
        size: CONFIG.COLLECTION_SIZE,
        maxLevel: 3,
        levelChance: 0.35,
        weights: {
          Light: 5, Dark: 0.5, Magic: 1, Fire: 4, Poison: 0.5, Bleed: 0.5,
          Armor: 1, Slash: 1, Pierce: 1,
        },
      }),
    },
  },
};

// ── Main ──

const args = process.argv.slice(2);
const genPlayer = args.length === 0 || args.includes('--player');
const genNPC = args.length === 0 || args.includes('--npc');

if (genPlayer) {
  const p = DECKS.player;
  saveDeck(path.join(DECKS_DIR, p.file), p.data);
  console.log(`Generated ${p.file} (${p.data.cards.length} cards)`);
}

if (genNPC) {
  for (const [key, def] of Object.entries(DECKS)) {
    if (key === 'player') continue;
    saveDeck(path.join(DECKS_DIR, def.file), def.data);
    console.log(`Generated ${def.file} (${def.data.cards.length} cards, ${def.data.aiType})`);
  }
}

console.log('Done. Card pool sourced from data/cards/.');
