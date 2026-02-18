const http = require('http');
const fs = require('fs');
const path = require('path');

const { runEngine } = require('./src/engine');
const { createContext } = require('./src/context');
const { createHtmlAdapter } = require('./src/ui/htmlAdapter');
const { loadNPCBySlug } = require('./src/npcRegistry');
const { createPlayer } = require('./src/player');
const { TEAMS } = require('./src/constants');

const states = {
  'combat-result':         require('./src/states/combat/combatResult'),
  'combat-init':           require('./src/states/combat/combatInit'),
  'combat-round-start':    require('./src/states/combat/combatRoundStart'),
  'combat-bid-collect':    require('./src/states/combat/combatBidCollect'),
  'combat-bid-resolve':    require('./src/states/combat/combatBidResolve'),
  'combat-bid-wait':       require('./src/states/combat/combatBidWait'),
  'combat-trick-start':    require('./src/states/combat/combatTrickStart'),
  'combat-endurance':      require('./src/states/combat/combatEndurance'),
  'combat-endurance-wait': require('./src/states/combat/combatEnduranceWait'),
  'combat-play':           require('./src/states/combat/combatPlay'),
  'combat-trick-resolve':  require('./src/states/combat/combatTrickResolve'),
  'combat-trick-wait':     require('./src/states/combat/combatTrickWait'),
  'combat-round-end':      require('./src/states/combat/combatRoundEnd'),
  'combat-round-wait':     require('./src/states/combat/combatRoundWait'),
  'combat-end':            require('./src/states/combat/combatEnd'),
  // Stub so engine exits cleanly after combat-result returns 'main-menu'
  'main-menu': { enter() { return null; } },
};

function parseArgs(argv) {
  const args = { port: 3000, npcs: [], allies: [] };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--port':  args.port = parseInt(argv[++i], 10); break;
      case '--npc':
        args.npcs.push(argv[++i]);
        break;
      case '--npcs':
        args.npcs = argv[++i].split(',').map(s => s.trim());
        break;
      case '--allies':
        args.allies = argv[++i].split(',').map(s => s.trim());
        break;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.npcs.length === 0) {
  const { listNPCs } = require('./src/npcRegistry');
  const available = listNPCs().map(n => n.slug).join(', ');
  console.error('Error: specify at least one NPC with --npc <slug>');
  console.error(`Available: ${available}`);
  process.exit(1);
}

// One adapter at a time — last connected client wins
let currentAdapter = null;

// ── HTTP server ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Serve the HTML page
  if (req.method === 'GET' && req.url === '/') {
    const htmlPath = path.join(__dirname, 'combat.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // SSE event stream — one per game session
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.flushHeaders();

    // Keep-alive ping
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': ping\n\n');
    }, 15000);

    req.on('close', () => clearInterval(heartbeat));

    startGame(res);
    return;
  }

  // Receive player input
  if (req.method === 'POST' && req.url === '/input') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { value } = JSON.parse(body);
        if (currentAdapter) currentAdapter.deliverInput(value);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad json' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ── Game session ──────────────────────────────────────────────────────────
function startGame(sseRes) {
  function send(msg) {
    if (!sseRes.writableEnded) {
      sseRes.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  }

  const ctx = createContext({});
  const adapter = createHtmlAdapter(ctx.events, send);
  currentAdapter = adapter;

  ctx.player.hp = ctx.player.maxHp;
  ctx.player.tricksWon = 0;
  ctx.player.totalSouls = 0;

  const combatPlayers = [ctx.player];

  args.allies.forEach(slug => {
    const allyData = loadNPCBySlug(slug);
    const ally = createPlayer(allyData);
    ally.team = TEAMS.ALLIES;
    combatPlayers.push(ally);
  });

  args.npcs.forEach(slug => {
    const npcData = loadNPCBySlug(slug);
    const enemy = createPlayer(npcData);
    enemy.team = TEAMS.ENEMIES;
    combatPlayers.push(enemy);
  });

  ctx.currentNPC = loadNPCBySlug(args.npcs[0]);
  ctx.combatPlayers = combatPlayers;

  runEngine(states, 'combat-init', ctx, adapter)
    .then(() => {
      send({ type: 'gameOver' });
      if (!sseRes.writableEnded) sseRes.end();
    })
    .catch(err => {
      console.error('Engine error:', err);
      send({ type: 'error', message: err.message });
      if (!sseRes.writableEnded) sseRes.end();
    });
}

// ── Start ─────────────────────────────────────────────────────────────────
server.listen(args.port, () => {
  console.log(`BatakSouls combat server → http://localhost:${args.port}`);
  console.log('Open in browser to begin. Ctrl+C to stop.');
});
