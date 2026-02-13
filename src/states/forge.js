const { playerUpgradePhase } = require('../upgrade');
const { savePlayerDeck } = require('../context');
const { showHeader, showSoulsBar, showCollection, drawElementWheels, clearScreen } = require('../ui');
const { askNumber } = require('../input');
const { BOLD, RESET } = require('../constants');

module.exports = {
  name: 'forge',

  async enter(ctx) {
    showHeader('UPGRADE FORGE');
    drawElementWheels();
    console.log();
    showSoulsBar(ctx.player);

    const result = await playerUpgradePhase(ctx.player);

    if (!result.changed) {
      console.log(`\n  No changes made.`);
      return 'main-menu';
    }

    // Show final state and ask save/discard
    clearScreen();
    drawElementWheels();
    showHeader('FORGE RESULTS');
    showCollection({ collection: result.cards, souls: result.souls });

    console.log(`\n  [1] ${BOLD}Save${RESET}    - Keep these upgrades`);
    console.log(`  [2] Discard - Revert all changes\n`);
    const choice = await askNumber('  > ', 1, 2);

    if (choice === 1) {
      ctx.player.collection = result.cards;
      ctx.player.souls = result.souls;
      savePlayerDeck(ctx);
      console.log(`\n  Upgrades saved.`);
    } else {
      console.log(`\n  Changes discarded.`);
    }

    return 'main-menu';
  },
};
