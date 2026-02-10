const { NPC_NAMES, AI_TYPES, BOLD, RESET } = require('./src/constants');
const { createPlayer } = require('./src/player');
const { askNumber, waitForKey, close } = require('./src/input');
const { showTitle, showHeader, showFinalScoreboard, showElementLegend } = require('./src/ui');
const { playRound } = require('./src/round');
const { playerUpgradePhase, aiUpgradePhase } = require('./src/upgrade');

const AI_TYPE_LIST = [AI_TYPES.AGGRESSIVE, AI_TYPES.DEFENSIVE, AI_TYPES.CHAOTIC];

async function main() {
  try {
    showTitle();
    showElementLegend();

    console.log(`\n${BOLD}Welcome, Undead. The bonfire awaits.${RESET}\n`);

    const numOpponents = await askNumber('  How many opponents? (1-4) > ', 1, 4);
    const numRounds = await askNumber('  How many rounds? (3-7) > ', 3, 7);

    // Create players
    const human = createPlayer('You', true);
    const opponents = [];
    for (let i = 0; i < numOpponents; i++) {
      const aiType = AI_TYPE_LIST[i % AI_TYPE_LIST.length];
      const npc = createPlayer(NPC_NAMES[i], false, aiType);
      opponents.push(npc);
      console.log(`  ${BOLD}${NPC_NAMES[i]}${RESET} joins (${aiType})`);
    }

    const players = [human, ...opponents];
    await waitForKey();

    // Main game loop
    for (let round = 1; round <= numRounds; round++) {
      await playRound(players, round, numRounds);

      // Upgrade phase (skip after final round)
      if (round < numRounds) {
        showHeader('⚒  UPGRADE FORGE  ⚒');

        // Human upgrades first
        await playerUpgradePhase(human);

        // AI upgrades
        for (const opp of opponents) {
          aiUpgradePhase(opp);
        }

        await waitForKey();
      }
    }

    // Final scoreboard
    showFinalScoreboard(players);

    const winner = [...players].sort((a, b) => b.totalSouls - a.totalSouls)[0];
    if (winner.isHuman) {
      console.log(`${BOLD}\x1b[93m  VICTORY ACHIEVED${RESET}`);
      console.log(`  You have linked the flame.\n`);
    } else {
      console.log(`${BOLD}\x1b[91m  YOU DIED${RESET}`);
      console.log(`  ${winner.name} has claimed the bonfire.\n`);
    }
  } finally {
    close();
  }
}

main().catch(err => {
  console.error(err);
  close();
  process.exit(1);
});
