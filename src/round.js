const { CONFIG, ELEMENT_COLORS, RESET, TEAMS, BOLD } = require('./constants');
const { dealHand, removeFromHand } = require('./player');
const { resolveTrick } = require('./trick');
const { computeDamage, applyDamage, checkDeaths, computeEnduranceDamage } = require('./combat');
const { aiChooseLead, aiChooseFollow } = require('./ai');
const { askNumber, waitForKey, sleep } = require('./input');
const { biddingPhase } = require('./bidding');
const { ANSI, color, reset } = require('./ansiColors');
const {
  showHeader, showSubheader, showHand, showTrickPlay,
  showTrickResult, showTrickResolution, showCurrentTrick,
  showPlayOrder, showDamageResults, showHpStatus, showCombatHud, showRoundHpSummary,
  showEndurancePenalty, drawElementWheels, clearScreen,
} = require('./ui');

const BRIGHT_RED = color({ fg: ANSI.fg.bright.red, style: ANSI.style.bold });

async function playRound(players, roundNum, events) {
  clearScreen();
  showHeader(`Round ${roundNum}`);
  drawElementWheels();

  // Deal hands
  players.forEach(p => dealHand(p));

  // ── Bidding Phase → determines trump suit, winner gets panic reduction ──
  const { trumpElement, bidWinner } = await biddingPhase(players, events);

  // Reset each round so trick 1 has no lastWinner tiebreaker (SBUG-03)
  let lastWinner = null;
  let deathOccurred = false;

  for (let trick = 1; trick <= CONFIG.TRICKS_PER_ROUND; trick++) {
    // ── Endurance Check (before trick starts) ──
    const depleted = players.filter(p => p.hand.length === 0);
    if (depleted.length > 0) {
      // Check if entire teams are depleted
      const alliesInPlay = players.filter(p => p.team === TEAMS.ALLIES);
      const enemiesInPlay = players.filter(p => p.team === TEAMS.ENEMIES);

      const alliesDepleted = alliesInPlay.every(p => p.hand.length === 0);
      const enemiesDepleted = enemiesInPlay.every(p => p.hand.length === 0);

      if (alliesDepleted && enemiesDepleted) {
        // Both teams exhausted — no damage, just reshuffle all, continue round
        console.log('\n  All sides exhausted! Reshuffling...');
        players.forEach(p => dealHand(p));
        await waitForKey();
      } else if (alliesDepleted || enemiesDepleted) {
        // ONE ENTIRE TEAM exhausted — apply endurance damage, then END ROUND
        for (const p of depleted) {
          const damage = computeEnduranceDamage(p, players, trumpElement);
          const oldHp = p.hp;
          p.hp = Math.max(0, p.hp - damage);
          showEndurancePenalty(p, damage, oldHp, p.hp);
          events.emit('onEnduranceDamage', {
            player: p, damage, oldHp, newHp: p.hp, trickNum: trick, roundNum
          });
        }
        await waitForKey();

        // Check for deaths after endurance damage
        const dead = checkDeaths(players);
        if (dead.length > 0) {
          deathOccurred = true;

          // Announce and remove dead players immediately
          for (const deadPlayer of dead) {
            console.log(`\n  ${BRIGHT_RED}${deadPlayer.name} has been defeated!${reset}`);

            events.emit('onPlayerDefeated', {
              player: deadPlayer,
              trickNum: trick,
              roundNum,
              cause: 'endurance'
            });
          }

          // Remove dead players from the round
          const beforeCount = players.length;
          players.splice(0, players.length, ...players.filter(p => p.hp > 0));

          if (players.length < beforeCount) {
            console.log(`  ${BOLD}${players.length} combatants remain...${reset}`);
          }

          await waitForKey();
        }

        // One side exhausted — END ROUND (don't reshuffle, start new round)
        console.log(`\n  ${BOLD}One side exhausted! Round ${roundNum} ends...${reset}`);
        await waitForKey();
        break; // Exit trick loop, round ends
      } else {
        // Only SOME players depleted (not entire teams) — damage + reshuffle, continue round
        for (const p of depleted) {
          const damage = computeEnduranceDamage(p, players, trumpElement);
          const oldHp = p.hp;
          p.hp = Math.max(0, p.hp - damage);
          showEndurancePenalty(p, damage, oldHp, p.hp);
          events.emit('onEnduranceDamage', {
            player: p, damage, oldHp, newHp: p.hp, trickNum: trick, roundNum
          });
        }
        await waitForKey();

        // Check for deaths after endurance damage
        const dead = checkDeaths(players);
        if (dead.length > 0) {
          deathOccurred = true;

          // Announce and remove dead players immediately
          for (const deadPlayer of dead) {
            console.log(`\n  ${BRIGHT_RED}${deadPlayer.name} has been defeated!${reset}`);

            events.emit('onPlayerDefeated', {
              player: deadPlayer,
              trickNum: trick,
              roundNum,
              cause: 'endurance'
            });
          }

          // Remove dead players from the round
          const beforeCount = players.length;
          players.splice(0, players.length, ...players.filter(p => p.hp > 0));

          if (players.length < beforeCount) {
            console.log(`  ${BOLD}${players.length} combatants remain...${reset}`);
          }

          await waitForKey();

          // If one side is completely eliminated, end the round early
          const alliesAfterEndurance = players.filter(p => p.team === TEAMS.ALLIES);
          const enemiesAfterEndurance = players.filter(p => p.team === TEAMS.ENEMIES);
          if (alliesAfterEndurance.length === 0 || enemiesAfterEndurance.length === 0) {
            break;
          }
        }

        // Reshuffle depleted players AFTER damage (only alive ones now), continue round
        depleted.filter(p => p.hp > 0).forEach(p => dealHand(p));
      }
    }

    showSubheader(`Trick ${trick} of ${CONFIG.TRICKS_PER_ROUND}  ⚜ Trump: ${ELEMENT_COLORS[trumpElement]}${trumpElement}${RESET}`);

    const plays = [];

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
        card = await humanPlayCard(player, trumpElement, plays, playOrder, i, players, trick);
      } else {
        const trickCtx = {
          player,
          hand: player.hand,
          trump: trumpElement,
          plays,
          players,
          trick,
          totalTricks: CONFIG.TRICKS_PER_ROUND,
        };
        if (plays.length === 0) {
          card = aiChooseLead(trickCtx);
        } else {
          card = aiChooseFollow(trickCtx);
        }
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

    // Check for deaths and handle immediately
    const dead = checkDeaths(players);
    if (dead.length > 0) {
      deathOccurred = true;

      // Announce and remove dead players immediately
      for (const deadPlayer of dead) {
        console.log(`\n  ${BRIGHT_RED}${deadPlayer.name} has been defeated!${reset}`);

        // Emit event for tracking
        events.emit('onPlayerDefeated', {
          player: deadPlayer,
          trickNum: trick,
          roundNum
        });
      }

      // Remove dead players from the round
      const beforeCount = players.length;
      players.splice(0, players.length, ...players.filter(p => p.hp > 0));

      if (players.length < beforeCount) {
        console.log(`  ${BOLD}${players.length} combatants remain...${reset}`);
      }

      await waitForKey();

      // If one side is completely eliminated, end the round early
      const alliesLeft = players.filter(p => p.team === TEAMS.ALLIES);
      const enemiesLeft = players.filter(p => p.team === TEAMS.ENEMIES);
      if (alliesLeft.length === 0 || enemiesLeft.length === 0) {
        break;
      }
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

  // Return dead players so combat state can handle them
  const dead = checkDeaths(players);
  return { completed: true, deathOccurred, deadPlayers: dead };
}

async function humanPlayCard(player, trumpElement, currentPlays, playOrder, currentIndex, allPlayers, trick) {
  clearScreen();
  drawElementWheels();
  showCombatHud(allPlayers, trick, CONFIG.TRICKS_PER_ROUND, trumpElement);
  showPlayOrder(playOrder, currentIndex);
  showCurrentTrick(currentPlays);
  showHand(player.hand, trumpElement);

  const choice = await askNumber('  Play card > ', 1, player.hand.length);
  return player.hand[choice - 1];
}

module.exports = { playRound };
