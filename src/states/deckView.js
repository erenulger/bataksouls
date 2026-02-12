const { showCollection, showHeader, showSoulsBar } = require('../ui');
const { waitForKey } = require('../input');

module.exports = {
  name: 'deck-view',

  async enter(ctx) {
    // If viewing NPC deck (set via ctx.viewNPC), show that instead
    if (ctx.viewNPC) {
      showHeader(`${ctx.viewNPC.name.toUpperCase()}'S COLLECTION`);
      console.log(`  AI: ${ctx.viewNPC.aiType} | Panic: ${ctx.viewNPC.panic} | HP: ${ctx.viewNPC.hp}`);
      if (ctx.viewNPC.description) {
        console.log(`  ${ctx.viewNPC.description}\n`);
      }
      // Create temporary player object for showCollection
      const npcPlayer = {
        name: ctx.viewNPC.name,
        collection: ctx.viewNPC.cards,
        souls: 0, // NPCs don't have souls
      };
      showCollection(npcPlayer);
      ctx.viewNPC = null; // Clear after viewing
      await waitForKey();
      return 'main-menu';
    }

    // Default: show player collection
    showHeader('YOUR COLLECTION');
    showSoulsBar(ctx.player);
    showCollection(ctx.player);
    await waitForKey();
    return 'main-menu';
  },
};
