const fs = require('fs');
const path = require('path');
const { loadNPC } = require('./deck');

const DECKS_DIR = path.join(__dirname, '..', 'data', 'decks');

function listNPCs() {
  const files = fs.readdirSync(DECKS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'player.json');

  return files.map(f => {
    const filePath = path.join(DECKS_DIR, f);
    const data = loadNPC(filePath);
    return {
      slug: f.replace('.json', ''),
      name: data.name,
      aiType: data.aiType,
      difficulty: data.difficulty || 1,
      description: data.description || '',
      filePath,
    };
  }).sort((a, b) => a.difficulty - b.difficulty);
}

function loadNPCBySlug(slug) {
  const filePath = path.join(DECKS_DIR, `${slug}.json`);
  return loadNPC(filePath);
}

module.exports = { listNPCs, loadNPCBySlug };
