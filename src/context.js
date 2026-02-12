const path = require('path');
const { loadDeck, saveDeck } = require('./deck');
const { createPlayer } = require('./player');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PLAYER_DECK_PATH = path.join(DATA_DIR, 'decks', 'player.json');

function createContext(opts = {}) {
  const playerDeck = loadDeck(PLAYER_DECK_PATH);
  const player = createPlayer(playerDeck, { isHuman: true });

  if (opts.souls !== undefined) {
    player.souls = opts.souls;
    player.totalSouls = opts.souls;
  }

  return {
    player,
    playerDeckPath: PLAYER_DECK_PATH,
    currentState: null,
    previousState: null,
    currentNPC: null,
    combatPlayers: [],
    combatResult: null,
    debug: opts.debug || false,
  };
}

function savePlayerDeck(ctx) {
  const deckData = {
    name: ctx.player.name,
    cards: ctx.player.collection.map(c => ({
      cardId: c.id,
      level: c.level,
    })),
  };
  saveDeck(ctx.playerDeckPath, deckData);
}

module.exports = { createContext, savePlayerDeck, PLAYER_DECK_PATH };
