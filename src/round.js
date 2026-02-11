const { CONFIG, ELEMENT_COLORS, RESET, BOLD } = require('./constants');
const { rawPower } = require('./card');
const { dealHand, removeFromHand } = require('./player');
const { resolveTrick } = require('./trick');
const { aiChooseCard, aiChooseLead, aiChooseBid } = require('./ai');
const { askNumber, waitForKey } = require('./input');
const {
  showHeader, showSubheader, showHand, showTrickPlay,
  showTrickResult, showTrickResolution, showRoundScores, showCurrentTrick, showBidReveal, showTrumpSuit,
  showPlayOrder,
} = require('./ui');

async function playRound(players, roundNum, totalRounds) {
  showHeader(`Round ${roundNum} of ${totalRounds}`);

  // Deal hands
  players.forEach(p => dealHand(p));

  // ── Bidding Phase → determines trump suit, winner gets panic reduction ──
  const { trumpElement, bidWinner } = await biddingPhase(players);

  // First trick: highest panic player leads (most panicked goes first)
  let leaderIndex = players.indexOf(
    players.reduce((a, b) => b.panic > a.panic ? b : a)
  );

  for (let trick = 1; trick <= CONFIG.TRICKS_PER_ROUND; trick++) {
    showSubheader(`Trick ${trick} of ${CONFIG.TRICKS_PER_ROUND}  ⚜ Trump: ${ELEMENT_COLORS[trumpElement]}${trumpElement}${RESET}`);

    const plays = [];
    let ledElement = null;

    // Build play order: leader first, rest sorted by panic (highest first = plays earliest)
    const leader = players[leaderIndex];
    const others = players.filter((_, i) => i !== leaderIndex);
    others.sort((a, b) => b.panic - a.panic || (a === bidWinner ? 1 : b === bidWinner ? -1 : 0));
    const playOrder = [leader, ...others];

    for (let i = 0; i < playOrder.length; i++) {
      const player = playOrder[i];

      let card;
      if (player.isHuman) {
        card = await humanPlayCard(player, ledElement, trumpElement, plays, playOrder, i);
      } else {
        if (ledElement === null) {
          card = aiChooseLead(player, trumpElement);
        } else {
          card = aiChooseCard(player, trumpElement);
        }
      }

      if (ledElement === null) {
        ledElement = card.element;
      }

      removeFromHand(player, card);
      plays.push({ player, card });
      showTrickPlay(player, card, trumpElement);
    }

    const result = resolveTrick(plays, trumpElement);
    showTrickResolution(plays, result.trickPowers);
    result.winner.tricksWon++;
    result.winner.panic += CONFIG.TRICK_WIN_PANIC_INCREASE;
    showTrickResult(result.winner, trick);

    // Winner leads next trick
    leaderIndex = players.indexOf(result.winner);

    if (trick < CONFIG.TRICKS_PER_ROUND) {
      await waitForKey();
    }
  }

  // Score the round
  scoreRound(players);
  showRoundScores(players, roundNum);
  await waitForKey();
}

async function biddingPhase(players) {
  showSubheader('BONFIRE BIDDING — Sacrifice a card to set the trump suit');
  console.log(`  Each player bids one card blind. Element with highest total power becomes trump.`);
  console.log(`  Bid cards are ${BOLD}discarded${RESET} — choose wisely!\n`);

  const bids = [];

  for (const player of players) {
    if (player.isHuman) {
      showHand(player.hand);
      console.log(`\n  Choose a card to sacrifice for the bid:`);
      const choice = await askNumber('  Bid card > ', 1, player.hand.length);
      const card = player.hand[choice - 1];
      bids.push({ player, card });
      removeFromHand(player, card);
      console.log(`  You commit your bid to the bonfire...`);
    } else {
      const card = aiChooseBid(player);
      bids.push({ player, card });
      removeFromHand(player, card);
    }
  }

  // Tally bids by element
  const totals = {};
  bids.forEach(({ card }) => {
    const power = rawPower(card);
    totals[card.element] = (totals[card.element] || 0) + power;
  });

  // Determine winning element — highest total, ties broken randomly
  const maxTotal = Math.max(...Object.values(totals));
  const tied = Object.keys(totals).filter(el => totals[el] === maxTotal);
  const winningElement = tied[Math.floor(Math.random() * tied.length)];

  // Determine bid winner on the trump suit — gets panic reduction
  const trumpBids = bids
    .filter(b => b.card.element === winningElement)
    .map(b => ({ player: b.player, power: rawPower(b.card) }));
  const maxBidPower = Math.max(...trumpBids.map(b => b.power));
  const topBidders = trumpBids.filter(b => b.power === maxBidPower);
  const bidWinner = topBidders[Math.floor(Math.random() * topBidders.length)].player;

  // Bid winner gets panic reduction, runners-up on trump suit get smaller reduction
  const oldPanics = {};
  trumpBids.forEach(b => { oldPanics[b.player.name] = b.player.panic; });
  bidWinner.panic = Math.max(1, bidWinner.panic - CONFIG.BID_WINNER_PANIC_REDUCTION);
  trumpBids.filter(b => b.player !== bidWinner).forEach(b => {
    b.player.panic = Math.max(1, b.player.panic - 1);
  });

  // Reveal
  showBidReveal(bids, totals, winningElement);
  showTrumpSuit(winningElement);
  console.log(`  ${BOLD}${bidWinner.name}${RESET} wins the bid! Panic: ${oldPanics[bidWinner.name]} → ${bidWinner.panic}`);
  trumpBids.filter(b => b.player !== bidWinner).forEach(b => {
    console.log(`  ${BOLD}${b.player.name}${RESET} bid on trump but lost. Panic: ${oldPanics[b.player.name]} → ${b.player.panic}`);
  });
  await waitForKey();

  return { trumpElement: winningElement, bidWinner };
}

function scoreRound(players) {
  const maxTricks = Math.max(...players.map(p => p.tricksWon));

  players.forEach(p => {
    let earned = p.tricksWon * CONFIG.SOULS_PER_TRICK;
    if (p.tricksWon === maxTricks) {
      earned += CONFIG.MAJORITY_BONUS;
    }
    p.souls += earned;
    p.totalSouls += earned;
  });
}

async function humanPlayCard(player, ledElement, trumpElement, currentPlays, playOrder, currentIndex) {
  showPlayOrder(playOrder, currentIndex);
  showCurrentTrick(currentPlays, trumpElement);
  showHand(player.hand, trumpElement);

  if (ledElement) {
    console.log(`\n  Led: ${ELEMENT_COLORS[ledElement]}${ledElement}${RESET}  |  Trump: ${ELEMENT_COLORS[trumpElement]}${trumpElement}${RESET}`);
  } else {
    console.log(`\n  You lead! Trump: ${ELEMENT_COLORS[trumpElement]}${trumpElement}${RESET}`);
  }

  const choice = await askNumber('  Play card > ', 1, player.hand.length);
  return player.hand[choice - 1];
}

module.exports = { playRound };
