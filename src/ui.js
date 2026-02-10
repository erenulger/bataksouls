const { ELEMENT_COLORS, RESET, BOLD, DIM, MYSTICAL, PHYSICAL, CONFIG } = require('./constants');
const { cardDisplay, shortDisplay, effectivePower } = require('./card');

const TITLE_ART = `
${BOLD}\x1b[91m
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║       ⚔  TRICK OF THE BONFIRE  ⚔                 ║
  ║                                                  ║
  ║      A Dark Souls Themed Card Game               ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
${RESET}`;

function showTitle() {
  console.clear();
  console.log(TITLE_ART);
}

function showHeader(text) {
  const line = '═'.repeat(50);
  console.log(`\n${BOLD}\x1b[93m╔${line}╗${RESET}`);
  console.log(`${BOLD}\x1b[93m║${RESET} ${BOLD}${text}${RESET}`);
  console.log(`${BOLD}\x1b[93m╚${line}╝${RESET}`);
}

function showSubheader(text) {
  console.log(`\n${BOLD}\x1b[33m── ${text} ──${RESET}`);
}

function showHand(hand, trumpElement = null) {
  console.log(`\n${BOLD}Your Hand:${RESET}`);
  hand.forEach((card, i) => {
    console.log(`  ${cardDisplay(card, { index: i, trumpElement })}`);
  });
}

function showTrickPlay(playerName, card, ledElement, trumpElement) {
  const { power, bonuses } = effectivePower(card, ledElement, trumpElement);
  const bonusStr = bonuses.length > 0 ? ` ${DIM}(${bonuses.join(', ')})${RESET}` : '';
  console.log(`  ${BOLD}${playerName}${RESET} plays ${shortDisplay(card)} → Effective: ${BOLD}${power}${RESET}${bonusStr}`);
}

function showTrickResult(winner, trickNum) {
  console.log(`\n  ${BOLD}\x1b[93m★ ${winner.name} wins trick #${trickNum}! ★${RESET}`);
}

function showRoundScores(players, roundNum) {
  showHeader(`Round ${roundNum} Results`);
  const maxTricks = Math.max(...players.map(p => p.tricksWon));
  players.forEach(p => {
    const soulsEarned = p.tricksWon * CONFIG.SOULS_PER_TRICK + (p.tricksWon === maxTricks ? CONFIG.MAJORITY_BONUS : 0);
    const majorityStr = p.tricksWon === maxTricks ? ` ${BOLD}\x1b[93m+${CONFIG.MAJORITY_BONUS} majority bonus!${RESET}` : '';
    console.log(`  ${BOLD}${p.name}${RESET}: ${p.tricksWon} tricks → ${BOLD}${soulsEarned} souls${RESET}${majorityStr}`);
  });
}

function showCollection(player) {
  showSubheader(`${player.name}'s Collection`);
  player.collection.forEach((card, i) => {
    const cost = CONFIG.upgradeCost(card.level);
    const lvlStr = card.level >= CONFIG.MAX_LEVEL ? `${DIM}(MAX)${RESET}` : `${DIM}(cost: ${cost} souls)${RESET}`;
    console.log(`  ${cardDisplay(card, { index: i })} ${lvlStr}`);
  });
  console.log(`\n  ${BOLD}Souls: ${player.souls}${RESET}`);
}

function showUpgradeResult(card) {
  const color = ELEMENT_COLORS[card.element];
  console.log(`  ${BOLD}\x1b[93m⚒${RESET}  ${color}${card.element}${RESET} ${card.name} upgraded to ${BOLD}+${card.level}${RESET}!`);
}

function showFinalScoreboard(players) {
  showHeader('FINAL SCOREBOARD');
  const sorted = [...players].sort((a, b) => b.totalSouls - a.totalSouls);
  sorted.forEach((p, i) => {
    const medal = i === 0 ? '\x1b[93m♛' : i === 1 ? '\x1b[37m♛' : i === 2 ? '\x1b[33m♛' : ' ';
    console.log(`  ${medal} ${BOLD}#${i + 1}${RESET} ${BOLD}${p.name}${RESET} — ${BOLD}${p.totalSouls} souls${RESET}`);
  });
  console.log();
}

function showElementLegend() {
  console.log(`\n${BOLD}Elements:${RESET}`);
  console.log(`  ${DIM}Mystical Wheel:${RESET} ${MYSTICAL.map(e => `${ELEMENT_COLORS[e]}${e}${RESET}`).join(' > ')} > ...`);
  console.log(`  ${DIM}Physical Wheel:${RESET} ${PHYSICAL.map(e => `${ELEMENT_COLORS[e]}${e}${RESET}`).join(' > ')} > ...`);
}

function showCurrentTrick(plays, ledElement, trumpElement) {
  if (plays.length === 0) return;
  console.log(`\n${BOLD}Current Trick${RESET} (led: ${ELEMENT_COLORS[ledElement]}${ledElement}${RESET}):`);
  plays.forEach(({ player, card }) => {
    const { power, bonuses } = effectivePower(card, ledElement, trumpElement);
    const bonusStr = bonuses.length > 0 ? ` ${DIM}(${bonuses.join(', ')})${RESET}` : '';
    console.log(`  ${player.name}: ${shortDisplay(card)} → ${BOLD}${power}${RESET}${bonusStr}`);
  });
}

function showBidReveal(bids, totals, winningElement) {
  console.log(`\n${BOLD}Bids Revealed:${RESET}`);
  bids.forEach(({ player, card }) => {
    const power = card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS;
    console.log(`  ${BOLD}${player.name}${RESET} sacrifices ${shortDisplay(card)} (${BOLD}${power}${RESET} power → ${ELEMENT_COLORS[card.element]}${card.element}${RESET})`);
  });
  console.log(`\n${BOLD}Element Totals:${RESET}`);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([element, total]) => {
    const marker = element === winningElement ? ` ${BOLD}\x1b[93m◀ TRUMP THIS ROUND${RESET}` : '';
    console.log(`  ${ELEMENT_COLORS[element]}${element}${RESET}: ${BOLD}${total}${RESET}${marker}`);
  });
}

function showTrumpSuit(element) {
  console.log(`\n  ${BOLD}\x1b[93m⚜ Trump suit: ${ELEMENT_COLORS[element]}${element}${RESET} ${BOLD}\x1b[93m⚜${RESET}`);
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

module.exports = {
  showTitle, showHeader, showSubheader, showHand,
  showTrickPlay, showTrickResult, showRoundScores, showCollection,
  showUpgradeResult, showFinalScoreboard, showElementLegend,
  showCurrentTrick, showBidReveal, showTrumpSuit,
};
