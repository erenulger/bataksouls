const { showTitle, showElementLegend, showSoulsBar } = require('../ui');
const { askNumber } = require('../input');

module.exports = {
  name: 'main-menu',

  async enter(ctx) {
    showTitle();
    showElementLegend();

    console.log();
    showSoulsBar(ctx.player);
    console.log();

    console.log(`  [1] Fight     - Challenge an NPC`);
    console.log(`  [2] Forge     - Upgrade your cards`);
    console.log(`  [3] Deck      - View your collection`);
    console.log(`  [0] Quit      - Leave the bonfire\n`);

    const choice = await askNumber('  > ', 0, 3);

    switch (choice) {
      case 1: return 'combat-setup';
      case 2: return 'forge';
      case 3: return 'deck-view';
      case 0: return null;
    }
  },
};
