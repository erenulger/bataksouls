const { showCollection, showHeader, showSoulsBar } = require('../ui');
const { waitForKey } = require('../input');

module.exports = {
  name: 'deck-view',

  async enter(ctx) {
    showHeader('YOUR COLLECTION');
    showSoulsBar(ctx.player);
    showCollection(ctx.player);
    await waitForKey();
    return 'main-menu';
  },
};
