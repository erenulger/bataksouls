const { rawPower } = require('../../card');
const { removeFromHand } = require('../../player');
const { aiChooseBid } = require('../../ai');

module.exports = {
  inputSpec(ctx) {
    const c = ctx.combat;
    const bidder = ctx.combatPlayers[c.currentBidderIndex];
    if (!bidder) return null;

    if (bidder.isHuman) {
      return { type: 'number', min: 1, max: bidder.hand.length, prompt: '  Bid card > ' };
    }
    return null; // AI bids automatically in enter()
  },

  enter(ctx, input) {
    const c = ctx.combat;
    const bidder = ctx.combatPlayers[c.currentBidderIndex];

    let card;
    if (bidder.isHuman) {
      card = bidder.hand[input - 1];
      ctx.events.emit('onBidCommitted', {});
    } else {
      const bidCtx = { player: bidder, hand: bidder.hand, trump: null, players: ctx.combatPlayers };
      card = aiChooseBid(bidCtx);
    }

    c.bids.push({ player: bidder, card, power: rawPower(card) });
    removeFromHand(bidder, card);

    c.currentBidderIndex++;

    if (c.currentBidderIndex < ctx.combatPlayers.length) {
      return 'combat-bid-collect';
    }

    return 'combat-bid-resolve';
  },
};
