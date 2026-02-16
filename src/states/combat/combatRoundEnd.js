const { determineCombatResult } = require('../../combat');

module.exports = {
  async enter(ctx) {
    const c = ctx.combat;
    const players = ctx.combatPlayers;

    await ctx.events.emit('onRoundEnd', {
      players,
      roundNum: c.roundNum,
      standings: [...players].sort((a, b) => b.hp - a.hp),
    });

    // Check if combat is over
    const result = determineCombatResult(players);
    if (result) {
      ctx.combatResult = result;
      ctx.combatResult.defeatedEnemies = c.defeatedEnemies;
      await ctx.events.emit('onCombatEnd', {
        winner: result.winner,
        playerWon: result.playerWon,
        players,
        cause: result.cause,
        defeatedEnemies: c.defeatedEnemies,
      });
      return 'combat-end';
    }

    return 'combat-round-wait';
  },
};
