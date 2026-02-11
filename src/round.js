const { CONFIG, ELEMENT_COLORS, RESET } = require('./constants');
const { dealHand, removeFromHand } = require('./player');
const { resolveTrick } = require('./trick');
const { aiChooseCard, aiChooseLead } = require('./ai');
const { askNumber, waitForKey, sleep } = require('./input');
const { biddingPhase } = require('./bidding');
const {
  showHeader, showSubheader, showHand, showTrickPlay,
  showTrickResult, showTrickResolution, showRoundScores, showCurrentTrick,
  showPlayOrder,
} = require('./ui');

async function playRound(players, roundNum, totalRounds) {
  showHeader(`Round ${roundNum} of ${totalRounds}`);

  // Deal hands
  players.forEach(p => dealHand(p));

  // ── Bidding Phase → determines trump suit, winner gets panic reduction ──
  const { trumpElement, bidWinner } = await biddingPhase(players);

  // Reset each round so trick 1 has no lastWinner tiebreaker (SBUG-03)
  let lastWinner = null;

  for (let trick = 1; trick <= CONFIG.TRICKS_PER_ROUND; trick++) {
    showSubheader(`Trick ${trick} of ${CONFIG.TRICKS_PER_ROUND}  ⚜ Trump: ${ELEMENT_COLORS[trumpElement]}${trumpElement}${RESET}`);

    const plays = [];
    let ledElement = null;

    // Play order: sorted by panic descending (highest panic = plays earliest = disadvantage)
    // Tiebreakers: last trick winner plays earlier (punishment), bid winner plays later (reward)
    const playOrder = [...players].sort((a, b) =>
      b.panic - a.panic
      || (a === lastWinner ? -1 : b === lastWinner ? 1 : 0)
      || (a === bidWinner ? 1 : b === bidWinner ? -1 : 0)
    );

    for (let i = 0; i < playOrder.length; i++) {
      const player = playOrder[i];

      let card;
      if (player.isHuman) {
        card = await humanPlayCard(player, trumpElement, plays, playOrder, i);
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
      if (!player.isHuman) await sleep(400);
      showTrickPlay(player, card);
    }

    const result = resolveTrick(plays, trumpElement);
    await showTrickResolution(plays, result.trickPowers);
    result.winner.tricksWon++;
    result.winner.panic += CONFIG.TRICK_WIN_PANIC_INCREASE;
    lastWinner = result.winner;
    await sleep(1000);
    showTrickResult(result.winner, trick);

    if (trick < CONFIG.TRICKS_PER_ROUND) {
      await waitForKey();
    }
  }

  // Score the round
  scoreRound(players);
  showRoundScores(players, roundNum);
  await waitForKey();
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

async function humanPlayCard(player, trumpElement, currentPlays, playOrder, currentIndex) {
  showPlayOrder(playOrder, currentIndex);
  showCurrentTrick(currentPlays);
  showHand(player.hand, trumpElement);

  const choice = await askNumber('  Play card > ', 1, player.hand.length);
  return player.hand[choice - 1];
}

module.exports = { playRound };
