module.exports = {
  inputSpec() {
    return { type: 'key' };
  },

  enter(ctx) {
    const c = ctx.combat;

    if (c.enduranceAction === 'end-round') {
      return 'combat-round-end';
    }

    // reshuffle-all or partial — continue with tricks
    return 'combat-trick-start';
  },
};
