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
      case '--rounds': args.rounds = parseInt(argv[++i], 10); break;
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

    // Direct combat launch: --state combat --npc patches
    if (args.npc && args.state === 'combat') {
      const { loadNPCBySlug } = require('./src/npcRegistry');
      const { createPlayer } = require('./src/player');
      const { TEAMS } = require('./src/constants');

      const npcData = loadNPCBySlug(args.npc);
      const enemy = createPlayer(npcData);
      enemy.team = TEAMS.ENEMIES;
      ctx.currentNPC = npcData;
      ctx.combatPlayers = [ctx.player, enemy];
      ctx.player.tricksWon = 0;
      ctx.player.totalSouls = 0;
      if (args.rounds) ctx.combatRounds = args.rounds;
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
