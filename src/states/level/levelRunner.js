const { loadNPCBySlug } = require('../../npcRegistry');
const { createPlayer } = require('../../player');
const { TEAMS } = require('../../constants');

module.exports = {
  enter(ctx) {
    const level = ctx.level;
    const encounter = level.encounters[level.currentEncounter];

    const npcData = loadNPCBySlug(encounter.npcSlug);
    ctx.currentNPC = npcData;

    const enemy = createPlayer(npcData);
    enemy.team = TEAMS.ENEMIES;

    // Reset player per-combat stats
    ctx.player.hp = ctx.player.maxHp;
    ctx.player.tricksWon = 0;
    ctx.player.totalSouls = 0;
    ctx.player.panic = Math.max(10, Math.min(100, 50 + Math.floor(Math.random() * 41) - 20));

    const combatPlayers = [ctx.player, enemy];

    // Add allies if encounter specifies them
    if (encounter.allies) {
      encounter.allies.forEach(slug => {
        const allyData = loadNPCBySlug(slug);
        const ally = createPlayer(allyData);
        ally.team = TEAMS.ALLIES;
        combatPlayers.push(ally);
      });
    }

    ctx.combatPlayers = combatPlayers;

    return { push: 'combat', resume: 'level-post-combat' };
  },
};
