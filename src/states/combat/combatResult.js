const { savePlayerDeck } = require('../../context');

module.exports = {
  inputSpec() {
    return { type: 'key' };
  },

  enter(ctx) {
    savePlayerDeck(ctx);

    // Clean up combat state
    ctx.combatPlayers = [];
    ctx.combatResult = null;
    ctx.currentNPC = null;
    ctx.combat = null;

    return 'main-menu';
  },
};
