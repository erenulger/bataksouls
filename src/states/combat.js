const { playRound } = require('../round');
const { determineCombatResult, checkDeaths } = require('../combat');
const { showHeader, drawElementWheels } = require('../ui');
const { waitForKey } = require('../input');
const { BOLD, RESET, TEAMS } = require('../constants');
const { ANSI, color, reset } = require('../ansiColors');

const BRIGHT_RED = color({ fg: ANSI.fg.bright.red, style: ANSI.style.bold });

module.exports = {
  name: 'combat',

  async enter(ctx) {
    const players = ctx.combatPlayers;

    showHeader('COMBAT BEGINS');
    drawElementWheels();
    const enemyCount = players.filter(p => p.team === TEAMS.ENEMIES).length;
    if (enemyCount > 1) {
      console.log(`\n  ${BOLD}Fight to the death${RESET} against ${BOLD}${enemyCount} enemies${RESET}`);
    } else {
      console.log(`\n  ${BOLD}Fight to the death${RESET} against ${BOLD}${ctx.currentNPC.name}${RESET}`);
    }
    await waitForKey();

    // Track defeated enemies for soul rewards
    const defeatedEnemies = [];

    // Listen for player defeats to award souls
    ctx.events.on('onPlayerDefeated', ({ player }) => {
      if (player.team === TEAMS.ENEMIES) {
        defeatedEnemies.push(player);
        const reward = player.soulsReward || 0;
        if (reward > 0) {
          ctx.player.souls += reward;
          console.log(`  ${BOLD}+${reward} souls${RESET} (${ctx.player.souls} total)`);
        }
      }
    });

    let roundNum = 0;
    while (true) {
      roundNum++;
      await playRound(ctx.combatPlayers, roundNum, ctx.events);

      // Check if combat is over (entire side eliminated)
      const result = determineCombatResult(ctx.combatPlayers);
      if (result) {
        ctx.combatResult = result;
        ctx.combatResult.defeatedEnemies = defeatedEnemies;
        ctx.events.emit('onCombatEnd', {
          winner: result.winner,
          playerWon: result.playerWon,
          players: ctx.combatPlayers,
          cause: result.cause,
          defeatedEnemies,
        });
        break;
      }
    }

    return 'combat-result';
  },
};
