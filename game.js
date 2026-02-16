const { runEngine } = require('./src/engine');
const { createScene } = require('./src/scene');
const { createContext } = require('./src/context');
const { createTerminalAdapter } = require('./src/ui/terminalAdapter');

// --- Hub scene (main menu, deck view, forge, combat setup, journey) ---
const hubScene = createScene({
  entry: 'main-menu',
  states: {
    'main-menu':      require('./src/states/mainMenu'),
    'deck-view':      require('./src/states/deckView'),
    'forge':          require('./src/states/forge'),
    'combat-setup':   require('./src/states/combat/combatSetup'),
    'journey-select': require('./src/states/journeySelect'),
  },
});

// --- Combat scene (14 micro-states + combat-result) ---
const combatScene = createScene({
  entry: 'combat-init',
  states: {
    'combat-result':          require('./src/states/combat/combatResult'),
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
  },
});

// --- Level scene (sequential encounters) ---
const levelScene = createScene({
  entry: 'level-runner',
  states: {
    'level-runner':       require('./src/states/level/levelRunner'),
    'level-post-combat':  require('./src/states/level/levelPostCombat'),
    'level-complete':     require('./src/states/level/levelComplete'),
  },
});

const scenes = { hub: hubScene, combat: combatScene, level: levelScene };

function parseArgs(argv) {
  const args = { state: null, debug: false, npcs: [] };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--state': args.state = argv[++i]; break;
      case '--souls': args.souls = parseInt(argv[++i], 10); break;
      case '--npc':
        args.npc = argv[++i];
        args.npcs.push(args.npc);
        break;
      case '--npcs':
        args.npcs = argv[++i].split(',').map(s => s.trim());
        break;
      case '--allies':
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

    // Debug mode: flatten all scenes into one ad-hoc scene for --state jumps
    // Also register named scenes so push operations still work
    if (args.state) {
      const { createScene: cs } = require('./src/scene');
      const allStates = {};
      for (const scene of Object.values(scenes)) {
        Object.assign(allStates, scene.states);
      }
      const debugScene = cs({ states: allStates, entry: args.state });
      await runEngine({ _debug: debugScene, ...scenes }, '_debug', ctx, adapter);
    } else {
      await runEngine(scenes, 'hub', ctx, adapter);
    }
  } finally {
    if (adapter) adapter.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
