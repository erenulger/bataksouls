const { EXIT } = require('../../scene');

module.exports = {
  inputSpec() {
    return { type: 'key' };
  },

  enter(ctx) {
    ctx.level = null;
    return EXIT;
  },
};
