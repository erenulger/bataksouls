const { CONFIG, BOLD, RESET } = require('./constants');
const { rawPower } = require('./card');
const { removeFromHand } = require('./player');
const { aiChooseBid } = require('./ai');
const { askNumber, waitForKey } = require('./input');
const { showHand, showSubheader, showBidReveal, showTrumpSuit } = require('./ui');

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
      const card = aiChooseBid(player);
      bids.push({ player, card, power: rawPower(card) });
      removeFromHand(player, card);
    }
  }

  // Tally bids by element
  const totals = {};
  bids.forEach(({ card, power }) => {
    totals[card.element] = (totals[card.element] || 0) + power;
  });

  // Determine winning element — highest total, ties broken randomly
  const maxTotal = Math.max(...Object.values(totals));
  const tied = Object.keys(totals).filter(el => totals[el] === maxTotal);
  const winningElement = tied[Math.floor(Math.random() * tied.length)];

  // Determine bid winner on the trump suit — gets panic reduction
  const trumpBids = bids.filter(b => b.card.element === winningElement);
  const maxBidPower = Math.max(...trumpBids.map(b => b.power));
  const topBidders = trumpBids.filter(b => b.power === maxBidPower);
  const bidWinner = topBidders[Math.floor(Math.random() * topBidders.length)].player;

  // Bid winner gets panic reduction, runners-up on trump suit get smaller reduction
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

module.exports = { biddingPhase };
