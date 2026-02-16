module.exports = {
  inputSpec() {
    return { type: 'number', min: 0, max: 4, prompt: '  > ' };
  },

  enter(ctx, input) {
    switch (input) {
      case 1: return 'combat-setup';
      case 2: return 'forge';
      case 3: return 'deck-view';
      case 4: return 'journey-select';
      case 0: return null;
    }
  },
};
