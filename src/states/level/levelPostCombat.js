module.exports = {
  enter(ctx) {
    const level = ctx.level;

    // Player lost — exit the level
    if (ctx.combatResult && !ctx.combatResult.playerWon) {
      return 'level-complete';
    }

    // Advance to next encounter
    level.currentEncounter++;

    if (level.currentEncounter < level.encounters.length) {
      return 'level-runner';
    }

    return 'level-complete';
  },
};
