const { runEngine } = require('./src/engine');
const { createContext } = require('./src/context');
const { close } = require('./src/input');

const states = {
  'main-menu':      require('./src/states/mainMenu'),
  'deck-view':      require('./src/states/deckView'),
  'forge':          require('./src/states/forge'),
  'combat-setup':   require('./src/states/combatSetup'),
  'combat':         require('./src/states/combat'),
  'combat-result':  require('./src/states/combatResult'),
};

function parseArgs(argv) {
  const args = { state: 'main-menu', debug: false };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--state': args.state = argv[++i]; break;
      case '--souls': args.souls = parseInt(argv[++i], 10); break;
      case '--npc':   args.npc = argv[++i]; break;
      case '--debug': args.debug = true; break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  try {
    const ctx = createContext({
      debug: args.debug,
      souls: args.souls,
    });

    // Direct NPC shortcuts
    if (args.npc) {
      const { loadNPCBySlug } = require('./src/npcRegistry');
      const npcData = loadNPCBySlug(args.npc);

      // --state combat --npc patches
      if (args.state === 'combat') {
        const { createPlayer } = require('./src/player');
        const { TEAMS } = require('./src/constants');

        const enemy = createPlayer(npcData);
        enemy.team = TEAMS.ENEMIES;
        ctx.currentNPC = npcData;
        ctx.player.hp = ctx.player.maxHp;
        ctx.player.tricksWon = 0;
        ctx.player.totalSouls = 0;
        ctx.combatPlayers = [ctx.player, enemy];
      }

      // --state deck-view --npc patches
      if (args.state === 'deck-view') {
        ctx.viewNPC = npcData;
      }
    }

    await runEngine(states, args.state, ctx);
  } finally {
    close();
  }
}

main().catch(err => {
  console.error(err);
  close();
  process.exit(1);
});
