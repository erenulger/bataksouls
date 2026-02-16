const { dealHand } = require('../../player');

module.exports = {
  enter(ctx) {
    const c = ctx.combat;
    c.roundNum++;
    c.lastWinner = null;
    c.deathOccurred = false;
    c.bids = [];
    c.currentBidderIndex = 0;

    ctx.combatPlayers.forEach(p => dealHand(p));

    return 'combat-bid-collect';
  },
};
