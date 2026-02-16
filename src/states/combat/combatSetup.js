const { listNPCs, loadNPCBySlug } = require('../../npcRegistry');
const { createPlayer } = require('../../player');
const { TEAMS } = require('../../constants');

module.exports = {
  inputSpec(ctx) {
    const npcs = listNPCs();
    ctx._setupNpcs = npcs;
    if (npcs.length === 0) {
      return { type: 'key' };
    }
    return { type: 'number', min: 0, max: npcs.length, prompt: '  Choose opponent > ' };
  },

  enter(ctx, input) {
    const npcs = ctx._setupNpcs || [];

    if (npcs.length === 0 || input === 0) {
      delete ctx._setupNpcs;
      return 'main-menu';
    }

    const selectedNPC = npcs[input - 1];
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

    delete ctx._setupNpcs;
    return 'combat-init';
  },
};
