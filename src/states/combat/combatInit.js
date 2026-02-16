const { TEAMS } = require('../../constants');

module.exports = {
  inputSpec() {
    return { type: 'key' };
  },

  enter(ctx) {
    const players = ctx.combatPlayers;

    // Track defeated enemies for soul rewards
    const defeatedEnemies = [];

    const onDefeated = ({ player }) => {
      if (player.team === TEAMS.ENEMIES) {
        defeatedEnemies.push(player);
        const reward = player.soulsReward || 0;
        if (reward > 0) {
          ctx.player.souls += reward;
          ctx.events.emit('onSoulsAwarded', { reward, totalSouls: ctx.player.souls });
        }
      }
    };
    ctx.events.on('onPlayerDefeated', onDefeated);

    ctx.combat = {
      roundNum: 0,
      trickNum: 0,
      trumpElement: null,
      bidWinner: null,
      lastWinner: null,
      bids: [],
      currentBidderIndex: 0,
      playOrder: [],
      currentPlayerIndex: 0,
      plays: [],
      deathOccurred: false,
      defeatedEnemies,
      enduranceAction: null,
      trickResult: null,
      damageApplied: [],
      onDefeatedHandler: onDefeated,
    };

    return 'combat-round-start';
  },
};
