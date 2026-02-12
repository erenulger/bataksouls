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
      const reward = ctx.currentNPC.soulsReward || 0;
      ctx.player.souls += reward;
      console.log(`  ${BOLD}Souls earned: ${reward}${RESET}`);
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
