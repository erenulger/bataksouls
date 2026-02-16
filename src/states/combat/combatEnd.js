module.exports = {
  enter(ctx) {
    // Deregister the defeat listener
    if (ctx.combat && ctx.combat.onDefeatedHandler) {
      ctx.events.off('onPlayerDefeated', ctx.combat.onDefeatedHandler);
    }

    return 'combat-result';
  },
};
