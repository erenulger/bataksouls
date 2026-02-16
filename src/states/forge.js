const { savePlayerDeck } = require('../context');

module.exports = {
  inputSpec(ctx) {
    return { type: 'forge', player: ctx.player };
  },

  enter(ctx, input) {
    if (!input || !input.changed || input.saveChoice !== 1) {
      return 'main-menu';
    }

    // Apply forge results
    ctx.player.collection = input.cards;
    ctx.player.souls = input.souls;
    savePlayerDeck(ctx);

    return 'main-menu';
  },
};
