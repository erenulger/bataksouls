const { CONFIG, BOLD, RESET } = require('./constants');
const { rawPower } = require('./card');
const { removeFromHand } = require('./player');
const { aiChooseBid } = require('./ai');
const { askNumber, waitForKey } = require('./input');
const { showHand, showSubheader, showBidReveal, showTrumpSuit } = require('./ui');

// ── Pure logic (exported for testing) ──

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

// ── Main phase ──

async function biddingPhase(players, events) {
  showSubheader('BONFIRE BIDDING \u2014 Sacrifice a card to set the trump suit');
  console.log(`  Each player bids one card blind. Element with highest total power becomes trump.`);
  console.log(`  Bid cards are ${BOLD}discarded${RESET} \u2014 choose wisely!\n`);

  const bids = [];

  for (const player of players) {
    if (player.isHuman) {
      showHand(player.hand);
      console.log(`\n  Choose a card to sacrifice for the bid:`);
      const choice = await askNumber('  Bid card > ', 1, player.hand.length);
      const card = player.hand[choice - 1];
      bids.push({ player, card, power: rawPower(card) });
      removeFromHand(player, card);
      console.log(`  You commit your bid to the bonfire...`);
    } else {
      const bidCtx = { player, hand: player.hand, trump: null, players };
      const card = aiChooseBid(bidCtx);
      bids.push({ player, card, power: rawPower(card) });
      removeFromHand(player, card);
    }
  }

  const totals = tallyBids(bids);
  const winningElement = determineWinningElement(totals);
  const { bidWinner, trumpBids } = determineBidWinner(bids, winningElement);
  const oldPanics = applyBidPanicReduction(bidWinner, trumpBids, events);

  // Reveal
  showBidReveal(bids, totals, winningElement);
  showTrumpSuit(winningElement);
  console.log(`  ${BOLD}${bidWinner.name}${RESET} wins the bid! Panic: ${oldPanics[bidWinner.name]} \u2192 ${bidWinner.panic}`);
  trumpBids.filter(b => b.player !== bidWinner).forEach(b => {
    console.log(`  ${BOLD}${b.player.name}${RESET} bid on trump but lost. Panic: ${oldPanics[b.player.name]} \u2192 ${b.player.panic}`);
  });
  await waitForKey();

  return { trumpElement: winningElement, bidWinner };
}

module.exports = { biddingPhase, tallyBids, determineWinningElement, determineBidWinner, applyBidPanicReduction };
