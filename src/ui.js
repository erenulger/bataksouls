const { ELEMENT_COLORS, MYSTICAL, PHYSICAL, CONFIG, TEAMS } = require('./constants');
const { cardDisplay, shortDisplay, effectivePower } = require('./card');
const { ANSI, color, reset } = require('./ansiColors');
const { sleep } = require('./input');

const BOLD_WHITE = color({ fg: ANSI.fg.white, style: ANSI.style.bold });
const DIM_WHITE = color({ fg: ANSI.fg.white, style: ANSI.style.dim });
const BRIGHT_BOLD_YELLOW = color({ fg: ANSI.fg.bright.yellow, style: ANSI.style.bold });
const BRIGHT_YELLOW_MEDAL = color({ fg: ANSI.fg.bright.yellow });
const WHITE_MEDAL = color({ fg: ANSI.fg.white });
const YELLOW_MEDAL = color({ fg: ANSI.fg.yellow });
const RESET = reset;

const ALLY_TAG = `${color({ fg: ANSI.fg.bright.green })}[A]${RESET}`;
const ENEMY_TAG = `${color({ fg: ANSI.fg.bright.red })}[E]${RESET}`;

function teamTag(player) {
  return player.team === TEAMS.ALLIES ? ALLY_TAG : ENEMY_TAG;
}

const TITLE_ART = `
${BRIGHT_BOLD_YELLOW}
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║                ⚔  BATAK SOULS  ⚔                 ║
  ║                                                  ║
  ║      A Dark Souls Themed Trick-Taking Game       ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
${RESET}`;

function showTitle() {
  console.clear();
  console.log(TITLE_ART);
}

function showHeader(text) {
  const line = '═'.repeat(50);
  console.log(`\n${BRIGHT_BOLD_YELLOW}╔${line}╗${RESET}`);
  console.log(`${BRIGHT_BOLD_YELLOW}║${RESET} ${BRIGHT_BOLD_YELLOW}${text}${RESET}`);
  console.log(`${BRIGHT_BOLD_YELLOW}╚${line}╝${RESET}`);
}

function showSubheader(text) {
  console.log(`\n${BRIGHT_BOLD_YELLOW}── ${text} ──${RESET}`);
}

const ELEM_SHORT = {
  Light: 'LGT', Dark: 'DRK', Magic: 'MAG',
  Fire: 'FIR', Poison: 'PSN', Bleed: 'BLD',
  Armor: 'AMR', Slash: 'SLS', Pierce: 'PRC',
};

function showHand(hand, trumpElement = null) {
  console.log(`\n${BOLD_WHITE}Your Hand:${RESET}`);
  const COL_WIDTH = 36;
  const entries = hand.map((card, i) => {
    const idx = `[${i + 1}]`.padEnd(4);
    const elem = ELEM_SHORT[card.element] || card.element.slice(0, 3).toUpperCase();
    const lvl = card.level > 0 ? `+${card.level}` : '';
    const nameStr = `${card.name}${lvl}`;
    const { power } = effectivePower(card, trumpElement);
    const trump = trumpElement && card.element === trumpElement ? '*' : '';
    const clr = ELEMENT_COLORS[card.element];
    return `${DIM_WHITE}${idx}${RESET} ${clr}${elem}${RESET} ${nameStr.padEnd(18)} ${BOLD_WHITE}${String(power).padStart(2)}${RESET}${trump}`;
  });
  for (let i = 0; i < entries.length; i += 2) {
    const left = entries[i];
    const right = entries[i + 1] || '';
    if (right) {
      // Pad left column to fixed visual width using ANSI-aware padding
      const leftPlain = left.replace(/\x1b\[[0-9;]*m/g, '');
      const pad = ' '.repeat(Math.max(1, COL_WIDTH - leftPlain.length));
      console.log(`  ${left}${pad}${right}`);
    } else {
      console.log(`  ${left}`);
    }
  }
  if (trumpElement) {
    console.log(`  ${DIM_WHITE}(* = trump)${RESET}`);
  }
}

function showTrickPlay(player, card, power, bonuses) {
  const bonusStr = bonuses.length > 0 ? ` ${DIM_WHITE}(${bonuses.join(', ')})${RESET}` : '';
  console.log(`  ${teamTag(player)} ${BOLD_WHITE}${player.name}${RESET} plays ${shortDisplay(card)} → Base: ${BOLD_WHITE}${power}${RESET}${bonusStr}`);
}

async function showTrickResolution(plays, trickPowers) {
  console.log(`\n${BOLD_WHITE}Trick Resolution:${RESET}`);
  for (let i = 0; i < plays.length; i++) {
    if (i > 0) await sleep(200);
    const { player, card } = plays[i];
    const { base, power, bonuses } = trickPowers[i];
    const bonusStr = bonuses.length > 0 ? ` ${DIM_WHITE}(${bonuses.join(', ')})${RESET}` : '';
    const powerStr = base !== power
      ? `Base ${DIM_WHITE}${base}${RESET} → ${BOLD_WHITE}${power}${RESET}`
      : `${BOLD_WHITE}${power}${RESET}`;
    console.log(`  ${teamTag(player)} ${player.name}: ${shortDisplay(card)} → ${powerStr}${bonusStr}`);
  }
}

function showTrickResult(winner, trickNum) {
  console.log(`\n  ${BRIGHT_BOLD_YELLOW}★ ${winner.name} wins trick #${trickNum}! ★${RESET}`);
}

function showRoundScores(players, roundNum) {
  showHeader(`Round ${roundNum} Results`);
  const maxTricks = Math.max(...players.map(p => p.tricksWon));
  players.forEach(p => {
    const soulsEarned = p.tricksWon * CONFIG.SOULS_PER_TRICK + (p.tricksWon === maxTricks ? CONFIG.MAJORITY_BONUS : 0);
    const majorityStr = p.tricksWon === maxTricks ? ` ${BRIGHT_BOLD_YELLOW}+${CONFIG.MAJORITY_BONUS} majority bonus!${RESET}` : '';
    console.log(`  ${teamTag(p)} ${BOLD_WHITE}${p.name}${RESET}: ${p.tricksWon} tricks → ${BOLD_WHITE}${soulsEarned} souls${RESET}${majorityStr}`);
  });
}

function showCollection(player) {
  showSubheader(`${player.name}'s Collection`);
  player.collection.forEach((card, i) => {
    const cost = CONFIG.upgradeCost(card.level);
    const lvlStr = card.level >= CONFIG.MAX_LEVEL ? `${DIM_WHITE}(MAX)${RESET}` : `${DIM_WHITE}(cost: ${cost} souls)${RESET}`;
    console.log(`  ${cardDisplay(card, { index: i })} ${lvlStr}`);
  });
  console.log(`\n  ${BOLD_WHITE}Souls: ${player.souls}${RESET}`);
}

function showUpgradeResult(card) {
  const clr = ELEMENT_COLORS[card.element];
  console.log(`  ${BRIGHT_BOLD_YELLOW}⚒${RESET}  ${clr}${card.element}${RESET} ${card.name} upgraded to ${BOLD_WHITE}+${card.level}${RESET}!`);
}

function showFinalScoreboard(players) {
  showHeader('FINAL SCOREBOARD');
  const sorted = [...players].sort((a, b) => b.totalSouls - a.totalSouls);
  sorted.forEach((p, i) => {
    const medal = i === 0 ? `${BRIGHT_YELLOW_MEDAL}♛${RESET}` : i === 1 ? `${WHITE_MEDAL}♛${RESET}` : i === 2 ? `${YELLOW_MEDAL}♛${RESET}` : ' ';
    console.log(`  ${medal} ${teamTag(p)} ${BOLD_WHITE}#${i + 1}${RESET} ${BOLD_WHITE}${p.name}${RESET} — ${BOLD_WHITE}${p.totalSouls} souls${RESET}`);
  });
  console.log();
}

function showElementLegend() {
  console.log(`\n${BOLD_WHITE}Elements:${RESET}`);
  console.log(`  ${DIM_WHITE}Mystical Wheel:${RESET} ${MYSTICAL.map(e => `${ELEMENT_COLORS[e]}${e}${RESET}`).join(' > ')} > ...`);
  console.log(`  ${DIM_WHITE}Physical Wheel:${RESET} ${PHYSICAL.map(e => `${ELEMENT_COLORS[e]}${e}${RESET}`).join(' > ')} > ...`);
}

function showCurrentTrick(plays) {
  if (plays.length === 0) return;
  console.log(`\n${BOLD_WHITE}Current Trick:${RESET}`);
  plays.forEach(({ player, card, power, bonuses }) => {
    const bonusStr = bonuses.length > 0 ? ` ${DIM_WHITE}(${bonuses.join(', ')})${RESET}` : '';
    console.log(`  ${teamTag(player)} ${player.name}: ${shortDisplay(card)} → ${BOLD_WHITE}${power}${RESET}${bonusStr}`);
  });
}

function showBidReveal(bids, totals, winningElement) {
  console.log(`\n${BOLD_WHITE}Bids Revealed:${RESET}`);
  bids.forEach(({ player, card, power }) => {
    console.log(`  ${teamTag(player)} ${BOLD_WHITE}${player.name}${RESET} sacrifices ${shortDisplay(card)} (${BOLD_WHITE}${power}${RESET} power → ${ELEMENT_COLORS[card.element]}${card.element}${RESET})`);
  });
  console.log(`\n${BOLD_WHITE}Element Totals:${RESET}`);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([element, total]) => {
    const marker = element === winningElement ? ` ${BRIGHT_BOLD_YELLOW}◀ TRUMP THIS ROUND${RESET}` : '';
    console.log(`  ${ELEMENT_COLORS[element]}${element}${RESET}: ${BOLD_WHITE}${total}${RESET}${marker}`);
  });
}

function showTrumpSuit(element) {
  console.log(`\n  ${BRIGHT_BOLD_YELLOW}⚜ Trump suit: ${ELEMENT_COLORS[element]}${element}${RESET} ${BRIGHT_BOLD_YELLOW}⚜${RESET}`);
}

function showPlayOrder(playOrder, currentIndex) {
  const orderStr = playOrder.map((p, i) => {
    const tag = teamTag(p);
    const name = i === currentIndex ? `${BRIGHT_BOLD_YELLOW}${p.name}${RESET}` : p.name;
    return `${tag}${name}(${p.panic})`;
  }).join(' → ');
  console.log(`\n  ${DIM_WHITE}Play order:${RESET} ${orderStr}`);
  console.log(`  ${DIM_WHITE}You play ${currentIndex + 1}${ordinalSuffix(currentIndex + 1)} of ${playOrder.length}${RESET}`);
}

function ordinalSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

module.exports = {
  showTitle, showHeader, showSubheader, showHand,
  showTrickPlay, showTrickResult, showTrickResolution, showRoundScores, showCollection,
  showUpgradeResult, showFinalScoreboard, showElementLegend,
  showCurrentTrick, showBidReveal, showTrumpSuit, showPlayOrder,
};
