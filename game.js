const { runEngine } = require('./src/engine');
const { createContext } = require('./src/context');
const { createTerminalAdapter } = require('./src/ui/terminalAdapter');

const states = {
  'main-menu':              require('./src/states/mainMenu'),
  'deck-view':              require('./src/states/deckView'),
  'forge':                  require('./src/states/forge'),
  'combat-setup':           require('./src/states/combat/combatSetup'),
  'combat-result':          require('./src/states/combat/combatResult'),
  // Combat micro-states
  'combat-init':            require('./src/states/combat/combatInit'),
  'combat-round-start':     require('./src/states/combat/combatRoundStart'),
  'combat-bid-collect':     require('./src/states/combat/combatBidCollect'),
  'combat-bid-resolve':     require('./src/states/combat/combatBidResolve'),
  'combat-bid-wait':        require('./src/states/combat/combatBidWait'),
  'combat-trick-start':     require('./src/states/combat/combatTrickStart'),
  'combat-endurance':       require('./src/states/combat/combatEndurance'),
  'combat-endurance-wait':  require('./src/states/combat/combatEnduranceWait'),
  'combat-play':            require('./src/states/combat/combatPlay'),
  'combat-trick-resolve':   require('./src/states/combat/combatTrickResolve'),
  'combat-trick-wait':      require('./src/states/combat/combatTrickWait'),
  'combat-round-end':       require('./src/states/combat/combatRoundEnd'),
  'combat-round-wait':      require('./src/states/combat/combatRoundWait'),
  'combat-end':             require('./src/states/combat/combatEnd'),
};

function parseArgs(argv) {
  const args = { state: 'main-menu', debug: false, npcs: [] };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--state': args.state = argv[++i]; break;
      case '--souls': args.souls = parseInt(argv[++i], 10); break;
      case '--npc':
        args.npc = argv[++i];
        args.npcs.push(args.npc);
        break;
      case '--npcs':
        // --npcs patches,solaire,undead
        args.npcs = argv[++i].split(',').map(s => s.trim());
        break;
      case '--allies':
        // --allies solaire,patches (allies on player team)
        args.allies = argv[++i].split(',').map(s => s.trim());
        break;
      case '--debug': args.debug = true; break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  let adapter;

  try {
    const ctx = createContext({
      debug: args.debug,
      souls: args.souls,
    });

    adapter = createTerminalAdapter(ctx.events);

    // Direct NPC shortcuts
    if (args.npc || args.npcs.length > 0 || args.allies) {
      const { loadNPCBySlug } = require('./src/npcRegistry');

      // --state deck-view --npc patches
      if (args.state === 'deck-view' && args.npc) {
        const npcData = loadNPCBySlug(args.npc);
        ctx.viewNPC = npcData;
      }

      // --state combat-init with NPCs (shortcut directly into combat)
      if (args.state === 'combat' || args.state === 'combat-init') {
        const { createPlayer } = require('./src/player');
        const { TEAMS } = require('./src/constants');

        args.state = 'combat-init';

        // Reset player
        ctx.player.hp = ctx.player.maxHp;
        ctx.player.tricksWon = 0;
        ctx.player.totalSouls = 0;

        const combatPlayers = [ctx.player];

        // Add allies (on player's team)
        if (args.allies && args.allies.length > 0) {
          args.allies.forEach(slug => {
            const allyData = loadNPCBySlug(slug);
            const ally = createPlayer(allyData);
            ally.team = TEAMS.ALLIES;
            combatPlayers.push(ally);
          });
        }

        // Add enemies
        if (args.npcs.length > 0) {
          args.npcs.forEach(slug => {
            const npcData = loadNPCBySlug(slug);
            const enemy = createPlayer(npcData);
            enemy.team = TEAMS.ENEMIES;
            combatPlayers.push(enemy);
          });
          // Set currentNPC to first enemy for reward purposes
          ctx.currentNPC = loadNPCBySlug(args.npcs[0]);
        }

        ctx.combatPlayers = combatPlayers;
      }
    }

    await runEngine(states, args.state, ctx, adapter);
  } finally {
    if (adapter) adapter.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
