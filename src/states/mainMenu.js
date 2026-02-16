module.exports = {
  inputSpec() {
    return { type: 'number', min: 0, max: 3, prompt: '  > ' };
  },

  enter(ctx, input) {
    switch (input) {
      case 1: return 'combat-setup';
      case 2: return 'forge';
      case 3: return 'deck-view';
      case 0: return null;
    }
  },
};
