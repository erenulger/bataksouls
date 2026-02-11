#!/usr/bin/env node
const { ALL_ELEMENTS, WEAPON_NAMES, CONFIG } = require('../src/constants');

const args = process.argv.slice(2);
const name = args[0] || 'Generated';
const startId = parseInt(args[1], 10) || 1;
const size = parseInt(args[2], 10) || CONFIG.COLLECTION_SIZE;

function randomCard(id, element) {
  const names = WEAPON_NAMES[element];
  const cardName = names[Math.floor(Math.random() * names.length)];
  const basePower = Math.floor(Math.random() * 8) + 3; // 3-10
  return { id, element, name: cardName, basePower, level: 0 };
}

const cards = [];
let id = startId;

// Guarantee at least 1 card per element
for (const el of ALL_ELEMENTS) {
  cards.push(randomCard(id++, el));
}

// Fill remaining slots randomly
while (cards.length < size) {
  const el = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
  cards.push(randomCard(id++, el));
}

const deck = { name, cards };
console.log(JSON.stringify(deck, null, 2));
