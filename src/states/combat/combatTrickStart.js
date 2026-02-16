const { CONFIG } = require('../../constants');
const { sortPlayOrder } = require('../../round');

module.exports = {
  async enter(ctx) {
    const c = ctx.combat;

    // Check if any players have depleted hands
    const depleted = ctx.combatPlayers.filter(p => p.hand.length === 0);
    if (depleted.length > 0) {
      return 'combat-endurance';
    }

    c.trickNum++;
    c.plays = [];
    c.currentPlayerIndex = 0;
    c.playOrder = sortPlayOrder(ctx.combatPlayers, c.lastWinner, c.bidWinner);

    await ctx.events.emit('onTrickHeader', {
      trickNum: c.trickNum,
      totalTricks: CONFIG.TRICKS_PER_ROUND,
      trumpElement: c.trumpElement,
    });

    return 'combat-play';
  },
};
