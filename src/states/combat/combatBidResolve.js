const { tallyBids, determineWinningElement, determineBidWinner, applyBidPanicReduction } = require('../../bidding');

module.exports = {
  async enter(ctx) {
    const c = ctx.combat;

    const totals = tallyBids(c.bids);
    const winningElement = determineWinningElement(totals);
    const { bidWinner, trumpBids } = determineBidWinner(c.bids, winningElement);
    const oldPanics = applyBidPanicReduction(bidWinner, trumpBids, ctx.events);

    c.trumpElement = winningElement;
    c.bidWinner = bidWinner;
    c.trickNum = 0;

    await ctx.events.emit('onBidResolved', {
      bids: c.bids,
      totals,
      winningElement,
      bidWinner,
      oldPanics,
      trumpBids,
    });

    return 'combat-bid-wait';
  },
};
