const { CONFIG, ELEMENT_COLORS, RESET } = require('./constants');
const { dealHand, removeFromHand } = require('./player');
const { resolveTrick } = require('./trick');
const { computeDamage, applyDamage, checkDeaths } = require('./combat');
const { aiChooseCard, aiChooseLead } = require('./ai');
const { askNumber, waitForKey, sleep } = require('./input');
const { biddingPhase } = require('./bidding');
const {
  showHeader, showSubheader, showHand, showTrickPlay,
  showTrickResult, showTrickResolution, showCurrentTrick,
  showPlayOrder, showDamageResults, showHpStatus, showRoundHpSummary,
} = require('./ui');

async function playRound(players, roundNum, events) {
  showHeader(`Round ${roundNum}`);

  // Deal hands
  players.forEach(p => dealHand(p));

  // ── Bidding Phase → determines trump suit, winner gets panic reduction ──
  const { trumpElement, bidWinner } = await biddingPhase(players, events);

  // Reset each round so trick 1 has no lastWinner tiebreaker (SBUG-03)
  let lastWinner = null;
  let deathOccurred = false;

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
      events.emit('onCardPlayed', { player, card, trickNum: trick, roundNum, plays: [...plays] });
    }

    const result = resolveTrick(plays, trumpElement);
    await showTrickResolution(plays, result.trickPowers);
    result.winner.tricksWon++;
    const panicBefore = result.winner.panic;
    result.winner.panic += CONFIG.TRICK_WIN_PANIC_INCREASE;
    events.emit('onPanicChanged', {
      player: result.winner, oldPanic: panicBefore, newPanic: result.winner.panic, cause: 'trick-win',
    });
    events.emit('onTrickResolved', {
      winner: result.winner, winningCard: result.winningCard, winningPower: result.winningPower,
      trickPowers: result.trickPowers, plays, trickNum: trick, roundNum, trumpElement,
    });
    lastWinner = result.winner;
    await sleep(1000);
    showTrickResult(result.winner, trick);

    // ── Damage phase ──
    const damages = computeDamage(plays, result.trickPowers);
    const applied = applyDamage(damages);
    applied.forEach(d => {
      events.emit('onDamageDealt', {
        attacker: d.attacker, defender: d.defender, damage: d.damage,
        oldHp: d.oldHp, newHp: d.newHp, trickNum: trick, roundNum,
      });
    });
    showDamageResults(applied);
    showHpStatus(players);

    // Check for deaths
    const dead = checkDeaths(players);
    if (dead.length > 0) {
      deathOccurred = true;
      break;
    }

    if (trick < CONFIG.TRICKS_PER_ROUND) {
      await waitForKey();
    }
  }

  // End of round
  showRoundHpSummary(players, roundNum);
  events.emit('onRoundEnd', {
    players,
    standings: [...players].sort((a, b) => b.hp - a.hp),
  });
  await waitForKey();

  return { completed: !deathOccurred, deathOccurred };
}

async function humanPlayCard(player, trumpElement, currentPlays, playOrder, currentIndex) {
  showPlayOrder(playOrder, currentIndex);
  showCurrentTrick(currentPlays);
  showHand(player.hand, trumpElement);

  const choice = await askNumber('  Play card > ', 1, player.hand.length);
  return player.hand[choice - 1];
}

module.exports = { playRound };
