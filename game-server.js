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

const PORT = 3000;

// MIME types for static file serving
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// One adapter at a time — last connected client wins
let currentAdapter = null;

// ── HTTP server ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Serve the unified game page
  if (req.method === 'GET' && req.url === '/') {
    const htmlPath = path.join(__dirname, 'game.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // Static files for ES6 module imports (src/** and data/**)
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && (url.startsWith('/src/') || url.startsWith('/data/'))) {
    const filePath = path.join(__dirname, url);
    const ext = path.extname(filePath);
    // Security: stay within project root
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  // SSE event stream — slug comes from query param
  if (req.method === 'GET' && url === '/events') {
    const params = new URLSearchParams(req.url.slice(req.url.indexOf('?') + 1));
    const slug = params.get('slug');

    if (!slug) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'slug required' }));
      return;
    }

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

    startGame(slug, res);
    return;
  }

  // Receive player input
  if (req.method === 'POST' && url === '/input') {
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
function startGame(slug, sseRes) {
  function send(msg) {
    if (!sseRes.writableEnded) {
      sseRes.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  }

  let npcData;
  try {
    npcData = loadNPCBySlug(slug);
  } catch (e) {
    send({ type: 'error', message: `Unknown NPC slug: ${slug}` });
    sseRes.end();
    return;
  }

  const ctx = createContext({});
  const adapter = createHtmlAdapter(ctx.events, send);
  currentAdapter = adapter;

  ctx.player.hp = ctx.player.maxHp;
  ctx.player.tricksWon = 0;
  ctx.player.totalSouls = 0;

  const enemy = createPlayer(npcData);
  enemy.team = TEAMS.ENEMIES;

  ctx.currentNPC = npcData;
  ctx.combatPlayers = [ctx.player, enemy];

  runEngine(states, 'combat-init', ctx, adapter)
    .then(() => {
      send({ type: 'combatComplete', souls: ctx.player.souls || ctx.playerSouls || 0 });
      if (!sseRes.writableEnded) sseRes.end();
    })
    .catch(err => {
      console.error('Engine error:', err);
      send({ type: 'error', message: err.message });
      if (!sseRes.writableEnded) sseRes.end();
    });
}

// ── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`BatakSouls → http://localhost:${PORT}`);
  console.log('Open in browser to play. Ctrl+C to stop.');
});
