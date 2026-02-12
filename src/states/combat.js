const { playRound } = require('../round');
const { determineCombatResult } = require('../combat');
const { showHeader } = require('../ui');
const { waitForKey } = require('../input');
const { BOLD, RESET } = require('../constants');

module.exports = {
  name: 'combat',

  async enter(ctx) {
    const players = ctx.combatPlayers;

    showHeader('COMBAT BEGINS');
    console.log(`\n  ${BOLD}Fight to the death${RESET} against ${BOLD}${ctx.currentNPC.name}${RESET}`);
    await waitForKey();

    let roundNum = 0;
    while (true) {
      roundNum++;
      const { deathOccurred } = await playRound(players, roundNum, ctx.events);

      const result = determineCombatResult(players);
      if (result) {
        ctx.combatResult = result;
        ctx.events.emit('onCombatEnd', {
          winner: result.winner,
          playerWon: result.playerWon,
          players,
          cause: result.cause,
        });
        break;
      }
    }

    return 'combat-result';
  },
};
