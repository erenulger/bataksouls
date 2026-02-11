const path = require('path');
const { TEAMS, BOLD, RESET } = require('./src/constants');
const { createPlayer } = require('./src/player');
const { loadDeck, saveDeck, loadNPC } = require('./src/deck');
const { askNumber, waitForKey, close } = require('./src/input');
const { showTitle, showHeader, showFinalScoreboard, showElementLegend } = require('./src/ui');
const { playRound } = require('./src/round');
const { playerUpgradePhase } = require('./src/upgrade');

const PLAYER_DECK_PATH = path.join(__dirname, 'data', 'decks', 'player.json');
const NPC_DECK_PATH = path.join(__dirname, 'data', 'decks', 'patches.json');

function cloneNPCDeck(npcData, idOffset) {
  return {
    ...npcData,
    cards: npcData.cards.map(c => ({ ...c, id: c.id + idOffset })),
  };
}

function buildPlayerDeckData(player) {
  return {
    name: player.name,
    cards: player.collection.map(c => ({
      id: c.id,
      element: c.element,
      name: c.name,
      basePower: c.basePower,
      level: c.level,
    })),
  };
}

async function main() {
  try {
    showTitle();
    showElementLegend();

    console.log(`\n${BOLD}Welcome, Undead. The bonfire awaits.${RESET}\n`);

    // Load decks
    const playerDeck = loadDeck(PLAYER_DECK_PATH);
    const npcDeckBase = loadNPC(NPC_DECK_PATH);

    const numEnemies = await askNumber('  How many enemies? (1-4) > ', 1, 4);
    const maxAllies = Math.min(3, 5 - numEnemies - 1);
    let numAllies = 0;
    if (maxAllies > 0) {
      numAllies = await askNumber(`  How many allies? (0-${maxAllies}) > `, 0, maxAllies);
    }
    const numRounds = await askNumber('  How many rounds? (3-7) > ', 3, 7);

    // Create human player
    const human = createPlayer(playerDeck, { isHuman: true });
    console.log(`  Your Panic: ${BOLD}${human.panic}${RESET}\n`);

    // Create ally NPCs (clones of Patches with different IDs and ally team)
    const allyNPCs = [];
    for (let i = 0; i < numAllies; i++) {
      const allyDeck = cloneNPCDeck(npcDeckBase, (i + 1) * 1000);
      allyDeck.team = TEAMS.ALLIES;
      allyDeck.name = `${npcDeckBase.name} (Ally ${i + 1})`;
      const npc = createPlayer(allyDeck);
      allyNPCs.push(npc);
      console.log(`  ${BOLD}${npc.name}${RESET} joins as \x1b[92mALLY\x1b[0m (${npc.aiType}) — Panic: ${npc.panic}`);
    }

    // Create enemy NPCs (clones of Patches with offset IDs)
    const enemyNPCs = [];
    for (let i = 0; i < numEnemies; i++) {
      const enemyDeck = cloneNPCDeck(npcDeckBase, (numAllies + i + 1) * 1000);
      enemyDeck.name = `${npcDeckBase.name} (Enemy ${i + 1})`;
      const npc = createPlayer(enemyDeck);
      enemyNPCs.push(npc);
      console.log(`  ${BOLD}${npc.name}${RESET} joins as \x1b[91mENEMY\x1b[0m (${npc.aiType}) — Panic: ${npc.panic}`);
    }

    const players = [human, ...allyNPCs, ...enemyNPCs];
    await waitForKey();

    // Main game loop
    for (let round = 1; round <= numRounds; round++) {
      await playRound(players, round, numRounds);

      // Upgrade phase — human only (skip after final round)
      if (round < numRounds) {
        showHeader('⚒  UPGRADE FORGE  ⚒');
        await playerUpgradePhase(human);

        // Persist player deck after upgrades
        saveDeck(PLAYER_DECK_PATH, buildPlayerDeckData(human));

        await waitForKey();
      }
    }

    // Final save
    saveDeck(PLAYER_DECK_PATH, buildPlayerDeckData(human));

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
