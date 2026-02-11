const { NPC_NAMES, AI_TYPES, TEAMS, BOLD, RESET } = require('./src/constants');
const { createPlayer } = require('./src/player');
const { askNumber, waitForKey, close } = require('./src/input');
const { showTitle, showHeader, showFinalScoreboard, showElementLegend } = require('./src/ui');
const { playRound } = require('./src/round');
const { playerUpgradePhase, aiUpgradePhase } = require('./src/upgrade');

const AI_TYPE_LIST = [AI_TYPES.AGGRESSIVE, AI_TYPES.DEFENSIVE, AI_TYPES.RECKLESS];

async function main() {
  try {
    showTitle();
    showElementLegend();

    console.log(`\n${BOLD}Welcome, Undead. The bonfire awaits.${RESET}\n`);

    const numEnemies = await askNumber('  How many enemies? (1-4) > ', 1, 4);
    const maxAllies = Math.min(3, 5 - numEnemies - 1);
    let numAllies = 0;
    if (maxAllies > 0) {
      numAllies = await askNumber(`  How many allies? (0-${maxAllies}) > `, 0, maxAllies);
    }
    const numRounds = await askNumber('  How many rounds? (3-7) > ', 3, 7);

    // Create players with team assignments
    const human = createPlayer('You', true, null, TEAMS.ALLIES);
    console.log(`  Your Panic: ${BOLD}${human.panic}${RESET}\n`);

    let nameIndex = 0;
    const allyNPCs = [];
    for (let i = 0; i < numAllies; i++) {
      const aiType = AI_TYPE_LIST[nameIndex % AI_TYPE_LIST.length];
      const npc = createPlayer(NPC_NAMES[nameIndex], false, aiType, TEAMS.ALLIES);
      allyNPCs.push(npc);
      console.log(`  ${BOLD}${NPC_NAMES[nameIndex]}${RESET} joins as \x1b[92mALLY\x1b[0m (${aiType}) — Panic: ${npc.panic}`);
      nameIndex++;
    }

    const enemyNPCs = [];
    for (let i = 0; i < numEnemies; i++) {
      const aiType = AI_TYPE_LIST[nameIndex % AI_TYPE_LIST.length];
      const npc = createPlayer(NPC_NAMES[nameIndex], false, aiType, TEAMS.ENEMIES);
      enemyNPCs.push(npc);
      console.log(`  ${BOLD}${NPC_NAMES[nameIndex]}${RESET} joins as \x1b[91mENEMY\x1b[0m (${aiType}) — Panic: ${npc.panic}`);
      nameIndex++;
    }

    const players = [human, ...allyNPCs, ...enemyNPCs];
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
        for (const npc of [...allyNPCs, ...enemyNPCs]) {
          aiUpgradePhase(npc);
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
    } else if (winner.team === TEAMS.ALLIES) {
      console.log(`${BOLD}\x1b[93m  ALLY VICTORY${RESET}`);
      console.log(`  ${winner.name} has linked the flame for your covenant.\n`);
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
