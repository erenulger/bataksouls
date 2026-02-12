const { showCombatResultScreen } = require('../ui');
const { savePlayerDeck } = require('../context');
const { waitForKey } = require('../input');
const { BOLD, RESET } = require('../constants');

module.exports = {
  name: 'combat-result',

  async enter(ctx) {
    const result = ctx.combatResult;

    showCombatResultScreen(result, ctx.combatPlayers);

    if (result.playerWon) {
      // Souls were already awarded during combat when enemies died
      const defeatedCount = result.defeatedEnemies ? result.defeatedEnemies.length : 1;
      console.log(`  ${BOLD}Defeated ${defeatedCount} ${defeatedCount === 1 ? 'enemy' : 'enemies'}${RESET}`);
    } else {
      console.log(`  ${BOLD}No souls earned.${RESET}`);
    }

    console.log(`  ${BOLD}Total souls: ${ctx.player.souls}${RESET}\n`);

    savePlayerDeck(ctx);

    await waitForKey();

    // Clean up combat state
    ctx.combatPlayers = [];
    ctx.combatResult = null;
    ctx.currentNPC = null;

    return 'main-menu';
  },
};
