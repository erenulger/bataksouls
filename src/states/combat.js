const { playRound } = require('../round');
const { showHeader } = require('../ui');
const { askNumber, waitForKey } = require('../input');
const { BOLD, RESET } = require('../constants');

const DEFAULT_ROUNDS = 3;

module.exports = {
  name: 'combat',

  async enter(ctx) {
    const players = ctx.combatPlayers;
    const numRounds = ctx.combatRounds || DEFAULT_ROUNDS;

    showHeader('COMBAT BEGINS');
    console.log(`\n  ${BOLD}${numRounds} rounds${RESET} against ${BOLD}${ctx.currentNPC.name}${RESET}`);
    await waitForKey();

    for (let round = 1; round <= numRounds; round++) {
      await playRound(players, round, numRounds);
    }

    // Build combat result
    const sorted = [...players].sort((a, b) => b.totalSouls - a.totalSouls);
    const winner = sorted[0];

    ctx.combatResult = {
      winner,
      playerWon: winner.isHuman,
    };

    return 'combat-result';
  },
};
