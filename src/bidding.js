const { CONFIG } = require('./constants');
const { rawPower } = require('./card');

// ── Pure logic (exported for states and testing) ──

function tallyBids(bids) {
  const totals = {};
  bids.forEach(({ card, power }) => {
    totals[card.element] = (totals[card.element] || 0) + power;
  });
  return totals;
}

function determineWinningElement(totals) {
  const maxTotal = Math.max(...Object.values(totals));
  const tied = Object.keys(totals).filter(el => totals[el] === maxTotal);
  return tied[Math.floor(Math.random() * tied.length)];
}

function determineBidWinner(bids, winningElement) {
  const trumpBids = bids.filter(b => b.card.element === winningElement);
  const maxBidPower = Math.max(...trumpBids.map(b => b.power));
  const topBidders = trumpBids.filter(b => b.power === maxBidPower);
  return {
    bidWinner: topBidders[Math.floor(Math.random() * topBidders.length)].player,
    trumpBids,
  };
}

function applyBidPanicReduction(bidWinner, trumpBids, events) {
  const oldPanics = {};
  trumpBids.forEach(b => { oldPanics[b.player.name] = b.player.panic; });
  bidWinner.panic = Math.max(CONFIG.PANIC_FLOOR, bidWinner.panic - CONFIG.BID_WINNER_PANIC_REDUCTION);
  events.emit('onPanicChanged', {
    player: bidWinner,
    oldPanic: oldPanics[bidWinner.name],
    newPanic: bidWinner.panic,
    cause: 'bid-winner',
  });
  trumpBids.filter(b => b.player !== bidWinner).forEach(b => {
    b.player.panic = Math.max(CONFIG.PANIC_FLOOR, b.player.panic - 10);
    events.emit('onPanicChanged', {
      player: b.player,
      oldPanic: oldPanics[b.player.name],
      newPanic: b.player.panic,
      cause: 'bid-runner-up',
    });
  });
  return oldPanics;
}

module.exports = { tallyBids, determineWinningElement, determineBidWinner, applyBidPanicReduction };
