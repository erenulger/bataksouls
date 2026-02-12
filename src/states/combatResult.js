const { showFinalScoreboard } = require('../ui');
const { savePlayerDeck } = require('../context');
const { waitForKey } = require('../input');
const { BOLD, RESET } = require('../constants');
const { ANSI, color, reset } = require('../ansiColors');

const YELLOW = color({ fg: ANSI.fg.bright.yellow, style: ANSI.style.bold });
const RED = color({ fg: ANSI.fg.bright.red, style: ANSI.style.bold });

module.exports = {
  name: 'combat-result',

  async enter(ctx) {
    const result = ctx.combatResult;

    showFinalScoreboard(ctx.combatPlayers);

    if (result.playerWon) {
      console.log(`${YELLOW}  VICTORY ACHIEVED${reset}`);
      console.log(`  You have linked the flame.\n`);
    } else {
      console.log(`${RED}  YOU DIED${reset}`);
      console.log(`  ${result.winner.name} has claimed the bonfire.\n`);
    }

    console.log(`  ${BOLD}Souls earned: ${ctx.player.totalSouls}${RESET}`);
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
