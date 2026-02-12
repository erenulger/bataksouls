const { listNPCs, loadNPCBySlug } = require('../npcRegistry');
const { createPlayer } = require('../player');
const { TEAMS, BOLD, RESET } = require('../constants');
const { askNumber, waitForKey } = require('../input');
const { showHeader } = require('../ui');

module.exports = {
  name: 'combat-setup',

  async enter(ctx) {
    showHeader('CHOOSE YOUR OPPONENT');

    const npcs = listNPCs();

    if (npcs.length === 0) {
      console.log(`\n  No opponents found in data/decks/.`);
      await waitForKey();
      return 'main-menu';
    }

    npcs.forEach((npc, i) => {
      const diffStr = '\u2605'.repeat(npc.difficulty);
      console.log(`  [${i + 1}] ${BOLD}${npc.name}${RESET} (${npc.aiType}) ${diffStr}`);
      if (npc.description) console.log(`      ${npc.description}`);
      console.log(`      HP: ${npc.hp} | Souls Reward: ${npc.soulsReward}`);
    });
    console.log(`  [0] Back\n`);

    const choice = await askNumber('  Choose opponent > ', 0, npcs.length);

    if (choice === 0) return 'main-menu';

    const selectedNPC = npcs[choice - 1];
    const npcData = loadNPCBySlug(selectedNPC.slug);

    ctx.currentNPC = npcData;

    const enemy = createPlayer(npcData);
    enemy.team = TEAMS.ENEMIES;

    // Reset human per-combat stats
    ctx.player.hp = ctx.player.maxHp;
    ctx.player.tricksWon = 0;
    ctx.player.totalSouls = 0;
    ctx.player.panic = Math.max(10, Math.min(100, 50 + Math.floor(Math.random() * 41) - 20));

    ctx.combatPlayers = [ctx.player, enemy];

    console.log(`\n  ${BOLD}${enemy.name}${RESET} challenges you!`);
    console.log(`  AI: ${enemy.aiType} | Panic: ${enemy.panic} | HP: ${enemy.hp}/${enemy.maxHp}`);
    console.log(`  Your HP: ${ctx.player.hp}/${ctx.player.maxHp}`);
    await waitForKey();

    return 'combat';
  },
};
