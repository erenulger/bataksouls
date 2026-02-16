const {
  showTitle, showHeader, showSubheader, showHand,
  showTrickPlay, showTrickResult, showTrickResolution, showCollection,
  showUpgradeResult, showElementLegend,
  showCurrentTrick, showBidReveal, showTrumpSuit, showPlayOrder, showSoulsBar,
  showDamageResults, showHpStatus, showCombatHud, showRoundHpSummary, showCombatResultScreen,
  showEndurancePenalty, drawElementWheels, clearScreen,
} = require('../ui');
const { askNumber, waitForKey, sleep, close } = require('../input');
const { playerUpgradePhase } = require('../upgrade');
const { BOLD, RESET, TEAMS } = require('../constants');
const { listNPCs } = require('../npcRegistry');

function createTerminalAdapter(events) {

  // ── stateEnter: render the screen for each state ──
  events.on('stateEnter', async ({ state, ctx }) => {
    switch (state) {
      case 'main-menu': {
        showTitle();
        showElementLegend();
        console.log();
        showSoulsBar(ctx.player);
        console.log();
        console.log(`  [1] Fight     - Challenge an NPC`);
        console.log(`  [2] Forge     - Upgrade your cards`);
        console.log(`  [3] Deck      - View your collection`);
        console.log(`  [0] Quit      - Leave the bonfire\n`);
        break;
      }

      case 'deck-view': {
        clearScreen();
        drawElementWheels();
        if (ctx.viewNPC) {
          showHeader(`${ctx.viewNPC.name.toUpperCase()}'S COLLECTION`);
          console.log(`  AI: ${ctx.viewNPC.aiType} | Panic: ${ctx.viewNPC.panic} | HP: ${ctx.viewNPC.hp}`);
          if (ctx.viewNPC.description) {
            console.log(`  ${ctx.viewNPC.description}\n`);
          }
          const npcPlayer = {
            name: ctx.viewNPC.name,
            collection: ctx.viewNPC.cards,
            souls: 0,
          };
          showCollection(npcPlayer);
        } else {
          showHeader('YOUR COLLECTION');
          showSoulsBar(ctx.player);
          showCollection(ctx.player);
        }
        break;
      }

      case 'combat-setup': {
        clearScreen();
        showHeader('CHOOSE YOUR OPPONENT');
        const npcs = ctx._setupNpcs || listNPCs();
        if (npcs.length === 0) {
          console.log(`\n  No opponents found in data/decks/.`);
        } else {
          npcs.forEach((npc, i) => {
            console.log(`  [${i + 1}] ${BOLD}${npc.name}${RESET} (${npc.aiType})`);
            if (npc.description) console.log(`      ${npc.description}`);
            console.log(`      HP: ${npc.hp} | Souls Reward: ${npc.soulsReward}`);
          });
          console.log(`  [0] Back\n`);
        }
        break;
      }

      case 'combat-result': {
        clearScreen();
        const result = ctx.combatResult;
        showCombatResultScreen(result, ctx.combatPlayers);
        if (result.playerWon) {
          const defeatedCount = result.defeatedEnemies ? result.defeatedEnemies.length : 1;
          console.log(`  ${BOLD}Defeated ${defeatedCount} ${defeatedCount === 1 ? 'enemy' : 'enemies'}${RESET}`);
        } else {
          console.log(`  ${BOLD}No souls earned.${RESET}`);
        }
        console.log(`  ${BOLD}Total souls: ${ctx.player.souls}${RESET}\n`);
        break;
      }

      case 'forge': {
        showHeader('UPGRADE FORGE');
        drawElementWheels();
        console.log();
        showSoulsBar(ctx.player);
        break;
      }

      // ── Combat micro-states ──

      case 'combat-init': {
        showHeader('COMBAT BEGINS');
        drawElementWheels();
        const players = ctx.combatPlayers;
        const enemyCount = players.filter(p => p.team === TEAMS.ENEMIES).length;
        if (enemyCount > 1) {
          console.log(`\n  ${BOLD}Fight to the death${RESET} against ${BOLD}${enemyCount} enemies${RESET}`);
        } else {
          console.log(`\n  ${BOLD}Fight to the death${RESET} against ${BOLD}${ctx.currentNPC.name}${RESET}`);
        }
        break;
      }

      case 'combat-round-start': {
        clearScreen();
        showHeader(`Round ${ctx.combat ? ctx.combat.roundNum + 1 : 1}`);
        drawElementWheels();
        break;
      }

      case 'combat-bid-collect': {
        const c = ctx.combat;
        const bidder = ctx.combatPlayers[c.currentBidderIndex];
        if (c.currentBidderIndex === 0) {
          showSubheader('BONFIRE BIDDING \u2014 Sacrifice a card to set the trump suit');
          console.log(`  Each player bids one card blind. Element with highest total power becomes trump.`);
          console.log(`  Bid cards are ${BOLD}discarded${RESET} \u2014 choose wisely!\n`);
        }
        if (bidder && bidder.isHuman) {
          showHand(bidder.hand);
          console.log(`\n  Choose a card to sacrifice for the bid:`);
        }
        break;
      }

      case 'combat-bid-resolve':
        // Rendering handled by onBidResolved event
        break;

      case 'combat-bid-wait':
        // Adapter already rendered bid results via onBidResolved
        break;

      case 'combat-trick-start':
        break;

      case 'combat-endurance':
        // Rendering handled by onEnduranceDamage / onPlayerDefeated events
        break;

      case 'combat-endurance-wait':
        break;

      case 'combat-play': {
        const c = ctx.combat;
        const player = c.playOrder[c.currentPlayerIndex];
        if (player && player.isHuman) {
          clearScreen();
          drawElementWheels();
          showCombatHud(ctx.combatPlayers, c.trickNum, require('../constants').CONFIG.TRICKS_PER_ROUND, c.trumpElement);
          showPlayOrder(c.playOrder, c.currentPlayerIndex);
          showCurrentTrick(c.plays);
          showHand(player.hand, c.trumpElement);
        }
        break;
      }

      case 'combat-trick-resolve':
        // Rendering handled by onTrickResolved, onDamageDealt, onPlayerDefeated events
        break;

      case 'combat-trick-wait':
        break;

      case 'combat-round-end':
        // Rendering handled by onRoundEnd event
        break;

      case 'combat-round-wait':
        break;

      case 'combat-end':
        break;
    }
  });

  // ── Game event handlers (incremental renders during state execution) ──

  events.on('onCardPlayed', async ({ player, card }) => {
    if (!player.isHuman) await sleep(400);
    showTrickPlay(player, card);
  });

  events.on('onTrickResolved', async ({ plays, trickPowers, winner, trickNum }) => {
    await showTrickResolution(plays, trickPowers);
    await sleep(1000);
    showTrickResult(winner, trickNum);
  });

  events.on('onDamageDealt', ({ attacker, defender, damage, oldHp, newHp }) => {
    showDamageResults([{ attacker, defender, damage, oldHp, newHp }]);
  });

  events.on('onAllDamageApplied', ({ players }) => {
    showHpStatus(players);
  });

  events.on('onPlayerDefeated', async ({ player }) => {
    const { ANSI, color, reset } = require('../ansiColors');
    const BRIGHT_RED = color({ fg: ANSI.fg.bright.red, style: ANSI.style.bold });
    console.log(`\n  ${BRIGHT_RED}${player.name} has been defeated!${reset}`);
  });

  events.on('onSoulsAwarded', ({ reward, totalSouls }) => {
    console.log(`  ${BOLD}+${reward} souls${RESET} (${totalSouls} total)`);
  });

  events.on('onCombatantsRemain', ({ count }) => {
    const { reset } = require('../ansiColors');
    console.log(`  ${BOLD}${count} combatants remain...${reset}`);
  });

  events.on('onEnduranceDamage', ({ player, damage, oldHp, newHp }) => {
    showEndurancePenalty(player, damage, oldHp, newHp);
  });

  events.on('onEnduranceReshuffle', () => {
    console.log('\n  All sides exhausted! Reshuffling...');
  });

  events.on('onRoundExhausted', ({ roundNum }) => {
    const { reset } = require('../ansiColors');
    console.log(`\n  ${BOLD}One side exhausted! Round ${roundNum} ends...${reset}`);
  });

  events.on('onBidResolved', ({ bids, totals, winningElement, bidWinner, oldPanics, trumpBids }) => {
    showBidReveal(bids, totals, winningElement);
    showTrumpSuit(winningElement);
    console.log(`  ${BOLD}${bidWinner.name}${RESET} wins the bid! Panic: ${oldPanics[bidWinner.name]} \u2192 ${bidWinner.panic}`);
    trumpBids.filter(b => b.player !== bidWinner).forEach(b => {
      console.log(`  ${BOLD}${b.player.name}${RESET} bid on trump but lost. Panic: ${oldPanics[b.player.name]} \u2192 ${b.player.panic}`);
    });
  });

  events.on('onBidCommitted', () => {
    console.log(`  You commit your bid to the bonfire...`);
  });

  events.on('onRoundEnd', ({ players, roundNum }) => {
    showRoundHpSummary(players, roundNum);
  });

  events.on('onTrickHeader', ({ trickNum, totalTricks, trumpElement }) => {
    const { ELEMENT_COLORS } = require('../constants');
    showSubheader(`Trick ${trickNum} of ${totalTricks}  ⚜ Trump: ${ELEMENT_COLORS[trumpElement]}${trumpElement}${RESET}`);
  });

  events.on('onUpgradeResult', ({ card }) => {
    showUpgradeResult(card);
  });

  return {
    async getInput(spec) {
      if (spec.type === 'number') {
        return await askNumber(spec.prompt || '  > ', spec.min, spec.max);
      }
      if (spec.type === 'key') {
        await waitForKey(spec.prompt);
        return null;
      }
      if (spec.type === 'forge') {
        // Run the interactive forge sub-session
        const result = await playerUpgradePhase(spec.player);
        if (!result.changed) {
          console.log(`\n  No changes made.`);
          return { changed: false };
        }
        // Show final state and ask save/discard
        clearScreen();
        drawElementWheels();
        showHeader('FORGE RESULTS');
        showCollection({ collection: result.cards, souls: result.souls });
        console.log(`\n  [1] ${BOLD}Save${RESET}    - Keep these upgrades`);
        console.log(`  [2] Discard - Revert all changes\n`);
        const saveChoice = await askNumber('  > ', 1, 2);
        if (saveChoice === 1) {
          console.log(`\n  Upgrades saved.`);
        } else {
          console.log(`\n  Changes discarded.`);
        }
        return { ...result, saveChoice };
      }
      return null;
    },

    close() {
      close();
    },
  };
}

module.exports = { createTerminalAdapter };
