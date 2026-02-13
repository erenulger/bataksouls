const path = require('path');
const { rawPower } = require('./src/card');
const { ALL_ELEMENTS, ELEMENT_COLORS, CONFIG, beatsElement, RESET } = require('./src/constants');
const { ANSI, color } = require('./src/ansiColors');
const { loadDeck, loadNPC } = require('./src/deck');
const { listNPCs, loadNPCBySlug } = require('./src/npcRegistry');

const BRIGHT_BOLD_YELLOW = color({ fg: ANSI.fg.bright.yellow, style: ANSI.style.bold });
const BOLD_WHITE = color({ fg: ANSI.fg.white, style: ANSI.style.bold });
const DIM_WHITE = color({ fg: ANSI.fg.white, style: ANSI.style.dim });
const GREEN = color({ fg: ANSI.fg.bright.green });
const RED = color({ fg: ANSI.fg.bright.red });

const PLAYER_DECK_PATH = path.join(__dirname, 'data', 'decks', 'player.json');

// ── Analysis ──

function analyzeDeck(deckData) {
  const cards = deckData.cards;
  const isPlayer = !deckData.aiType;

  // Power metrics
  const powers = cards.map(c => rawPower(c));
  const avgRawPower = powers.reduce((a, b) => a + b, 0) / cards.length;
  const minPower = Math.min(...powers);
  const maxPower = Math.max(...powers);
  const avgLevel = cards.reduce((a, c) => a + c.level, 0) / cards.length;
  const maxedCards = cards.filter(c => c.level >= CONFIG.MAX_LEVEL).length;

  // Element composition
  const elementCounts = {};
  for (const el of ALL_ELEMENTS) elementCounts[el] = 0;
  for (const c of cards) elementCounts[c.element]++;

  const uniqueElements = ALL_ELEMENTS.filter(e => elementCounts[e] > 0).length;
  let dominantElement = ALL_ELEMENTS[0];
  for (const el of ALL_ELEMENTS) {
    if (elementCounts[el] > elementCounts[dominantElement]) dominantElement = el;
  }

  // HHI concentration
  const shares = ALL_ELEMENTS.map(e => elementCounts[e] / cards.length);
  const concentration = shares.reduce((a, s) => a + s * s, 0);

  // Counter coverage
  const counterMap = {};
  for (const target of ALL_ELEMENTS) {
    counterMap[target] = cards.filter(c => beatsElement(c.element, target)).length;
  }
  const coverage = ALL_ELEMENTS.filter(e => counterMap[e] > 0).length;
  const vulnerabilities = ALL_ELEMENTS.filter(e => counterMap[e] === 0);

  // Trump potential
  const trumpBoosts = ALL_ELEMENTS.map(e => elementCounts[e] * CONFIG.TRUMP_BONUS);
  const bestTrumpIdx = trumpBoosts.indexOf(Math.max(...trumpBoosts));
  const bestTrumpElement = ALL_ELEMENTS[bestTrumpIdx];
  const bestTrumpBoost = trumpBoosts[bestTrumpIdx];
  const avgTrumpBoost = trumpBoosts.reduce((a, b) => a + b, 0) / ALL_ELEMENTS.length;

  // Tempo
  const panic = isPlayer ? 50 : deckData.panic;
  const handSize = deckData.handSize || CONFIG.HAND_SIZE;
  const drawRatio = handSize / cards.length;
  const hp = deckData.hp || CONFIG.DEFAULT_PLAYER_HP;

  // Composite score (0-100)
  const score = computeCompositeScore({
    avgRawPower, coverage, uniqueElements, bestTrumpBoost,
    cards, panic, hp,
  });

  return {
    name: deckData.name,
    isPlayer,
    cardCount: cards.length,
    avgRawPower, minPower, maxPower, avgLevel, maxedCards,
    elementCounts, uniqueElements, dominantElement, concentration,
    counterMap, coverage, vulnerabilities,
    bestTrumpElement, bestTrumpBoost, avgTrumpBoost,
    panic, handSize, drawRatio, hp,
    score,
  };
}

function computeCompositeScore({ avgRawPower, coverage, uniqueElements, bestTrumpBoost, cards, panic, hp }) {
  // Power: 35 points — avgRawPower normalized to theoretical 3-30 range
  const powerNorm = Math.min(1, Math.max(0, (avgRawPower - 3) / (30 - 3)));
  const powerScore = powerNorm * 35;

  // Versatility: 25 points — coverage (0-9 → 0-15) + element diversity (1-9 → 0-10)
  const coverageScore = (coverage / 9) * 15;
  const diversityScore = ((uniqueElements - 1) / 8) * 10;
  const versatilityScore = coverageScore + diversityScore;

  // Trump: 15 points — best trump boost per card, normalized
  const trumpPerCard = bestTrumpBoost / cards.length;
  const trumpScore = (trumpPerCard / CONFIG.TRUMP_BONUS) * 15;

  // Tempo: 25 points — panic advantage (10-100 → 25-0) + HP bonus (scaled)
  const panicNorm = Math.min(1, Math.max(0, (panic - CONFIG.PANIC_FLOOR) / (100 - CONFIG.PANIC_FLOOR)));
  const panicScore = (1 - panicNorm) * 17;
  const hpScore = Math.min(8, Math.max(0, (hp - 60) / (200 - 60) * 8));
  const tempoScore = panicScore + hpScore;

  return {
    power: round2(powerScore),
    versatility: round2(versatilityScore),
    trump: round2(trumpScore),
    tempo: round2(tempoScore),
    total: round2(powerScore + versatilityScore + trumpScore + tempoScore),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── Formatting ──

function formatDeckReport(analysis) {
  const a = analysis;
  const lines = [];

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}${'╔' + '═'.repeat(50) + '╗'}${RESET}`);
  lines.push(`${BRIGHT_BOLD_YELLOW}║${RESET} ${BOLD_WHITE}DECK ANALYSIS: ${a.name}${RESET}`);
  lines.push(`${BRIGHT_BOLD_YELLOW}${'╚' + '═'.repeat(50) + '╝'}${RESET}`);

  lines.push('');
  lines.push(`  ${BOLD_WHITE}Deck Strength: ${scoreColor(a.score.total)}${Math.round(a.score.total)}${RESET} / 100`);

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}── Power ${'─'.repeat(42)}${RESET}`);
  lines.push(`  Avg Raw Power:   ${BOLD_WHITE}${a.avgRawPower.toFixed(1)}${RESET}    Range: ${a.minPower} – ${a.maxPower}`);
  lines.push(`  Avg Level:       ${BOLD_WHITE}${a.avgLevel.toFixed(1)}${RESET}    Maxed: ${a.maxedCards} / ${a.cardCount}`);

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}── Elements ${'─'.repeat(39)}${RESET}`);
  const elemPairs = ALL_ELEMENTS
    .filter(e => a.elementCounts[e] > 0)
    .sort((x, y) => a.elementCounts[y] - a.elementCounts[x]);

  for (let i = 0; i < elemPairs.length; i += 2) {
    const left = formatElementBar(elemPairs[i], a.elementCounts[elemPairs[i]]);
    const right = i + 1 < elemPairs.length
      ? formatElementBar(elemPairs[i + 1], a.elementCounts[elemPairs[i + 1]])
      : '';
    lines.push(`  ${left}   ${right}`);
  }
  lines.push(`  Unique: ${BOLD_WHITE}${a.uniqueElements}${RESET} / 9  |  Dominant: ${ELEMENT_COLORS[a.dominantElement]}${a.dominantElement}${RESET} (${a.elementCounts[a.dominantElement]})`);

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}── Counter Coverage ${'─'.repeat(31)}${RESET}`);
  const coverLine = ALL_ELEMENTS.map(e => {
    const clr = ELEMENT_COLORS[e];
    const mark = a.counterMap[e] > 0
      ? `${clr}${e}${RESET} ${GREEN}\u2713${RESET}`
      : `${clr}${e}${RESET} ${RED}\u2717${RESET}`;
    return mark;
  }).join('  ');
  lines.push(`  ${coverLine}`);
  const weakStr = a.vulnerabilities.length > 0
    ? a.vulnerabilities.map(e => `${ELEMENT_COLORS[e]}${e}${RESET}`).join(', ')
    : `${GREEN}None${RESET}`;
  lines.push(`  Coverage: ${BOLD_WHITE}${a.coverage}${RESET} / 9  |  Weak to: ${weakStr}`);

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}── Trump Potential ${'─'.repeat(32)}${RESET}`);
  lines.push(`  Best Trump: ${ELEMENT_COLORS[a.bestTrumpElement]}${a.bestTrumpElement}${RESET} (+${a.bestTrumpBoost} from ${a.elementCounts[a.bestTrumpElement]} cards)`);
  lines.push(`  Avg Boost:  +${a.avgTrumpBoost.toFixed(1)} across all trumps`);

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}── Tempo ${'─'.repeat(42)}${RESET}`);
  const panicNote = a.isPlayer ? `${DIM_WHITE}(default)${RESET}` : '';
  lines.push(`  Panic: ${BOLD_WHITE}${a.panic}${RESET} ${panicNote}   Hand Size: ${a.handSize} / ${a.cardCount}    HP: ${BOLD_WHITE}${a.hp}${RESET}`);

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}── Score Breakdown ${'─'.repeat(32)}${RESET}`);
  lines.push(`  Power:        ${padScore(a.score.power)} / 35`);
  lines.push(`  Versatility:  ${padScore(a.score.versatility)} / 25`);
  lines.push(`  Trump:        ${padScore(a.score.trump)} / 15`);
  lines.push(`  Tempo:        ${padScore(a.score.tempo)} / 25`);
  lines.push(`                ${'─'.repeat(10)}`);
  lines.push(`  Total:        ${BOLD_WHITE}${padScore(a.score.total)}${RESET} / 100`);
  lines.push('');

  return lines.join('\n');
}

function formatComparison(analyses) {
  const lines = [];

  lines.push('');
  lines.push(`${BRIGHT_BOLD_YELLOW}${'╔' + '═'.repeat(50) + '╗'}${RESET}`);
  lines.push(`${BRIGHT_BOLD_YELLOW}║${RESET} ${BOLD_WHITE}DECK COMPARISON${RESET}`);
  lines.push(`${BRIGHT_BOLD_YELLOW}${'╚' + '═'.repeat(50) + '╝'}${RESET}`);
  lines.push('');

  const hdr = `  ${'Deck'.padEnd(20)}${'Score'.padStart(6)}${'AvgPow'.padStart(8)}${'Elem'.padStart(7)}${'Cover'.padStart(7)}${'Panic'.padStart(7)}${'HP'.padStart(6)}`;
  lines.push(`${BOLD_WHITE}${hdr}${RESET}`);
  lines.push(`  ${'─'.repeat(61)}`);

  const sorted = [...analyses].sort((a, b) => b.score.total - a.score.total);

  for (const a of sorted) {
    const panicStr = a.isPlayer ? `${a.panic}*` : `${a.panic}`;
    const row = `  ${a.name.padEnd(20)}${scoreColor(a.score.total)}${String(Math.round(a.score.total)).padStart(5)}${RESET}` +
      `${a.avgRawPower.toFixed(1).padStart(8)}` +
      `${(a.uniqueElements + '/9').padStart(7)}` +
      `${(a.coverage + '/9').padStart(7)}` +
      `${panicStr.padStart(7)}` +
      `${String(a.hp).padStart(6)}`;
    lines.push(row);
  }

  lines.push('');
  lines.push(`  ${DIM_WHITE}* Player panic shown as default (randomized 30-70 in combat)${RESET}`);
  lines.push('');

  return lines.join('\n');
}

// ── Helpers ──

function formatElementBar(element, count) {
  const clr = ELEMENT_COLORS[element];
  const bar = '\u2588'.repeat(count);
  const name = element.padEnd(7);
  const countStr = String(count).padStart(2);
  return `${clr}${name}${RESET} ${clr}${bar}${RESET} ${countStr}`;
}

function scoreColor(score) {
  if (score >= 70) return color({ fg: ANSI.fg.bright.green, style: ANSI.style.bold });
  if (score >= 45) return color({ fg: ANSI.fg.bright.yellow, style: ANSI.style.bold });
  return color({ fg: ANSI.fg.bright.red, style: ANSI.style.bold });
}

function padScore(n) {
  return String(Math.round(n)).padStart(3);
}

// ── CLI ──

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--npc': args.npc = argv[++i]; break;
      case '--all': args.all = true; break;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.all) {
  const playerDeck = loadDeck(PLAYER_DECK_PATH);
  const analyses = [analyzeDeck(playerDeck)];
  for (const npc of listNPCs()) {
    analyses.push(analyzeDeck(loadNPC(npc.filePath)));
  }
  console.log(formatComparison(analyses));
} else if (args.npc) {
  const data = loadNPCBySlug(args.npc);
  console.log(formatDeckReport(analyzeDeck(data)));
} else {
  const data = loadDeck(PLAYER_DECK_PATH);
  console.log(formatDeckReport(analyzeDeck(data)));
}
