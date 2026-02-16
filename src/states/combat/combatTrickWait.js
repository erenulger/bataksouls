const { CONFIG, TEAMS } = require('../../constants');

module.exports = {
  inputSpec() {
    return { type: 'key' };
  },

  enter(ctx) {
    const c = ctx.combat;
    const players = ctx.combatPlayers;

    // Check if one side is completely eliminated
    const alliesLeft = players.filter(p => p.team === TEAMS.ALLIES);
    const enemiesLeft = players.filter(p => p.team === TEAMS.ENEMIES);
    if (alliesLeft.length === 0 || enemiesLeft.length === 0) {
      return 'combat-round-end';
    }

    // More tricks remaining in this round?
    if (c.trickNum < CONFIG.TRICKS_PER_ROUND) {
      return 'combat-trick-start';
    }

    return 'combat-round-end';
  },
};
