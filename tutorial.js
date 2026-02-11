const { ANSI, color, reset } = require('./src/ansiColors');
const { ELEMENT_COLORS, MYSTICAL, PHYSICAL, CONFIG, RESET, TEAMS } = require('./src/constants');
const { waitForKey, close } = require('./src/input');

const BOLD = color({ fg: ANSI.fg.white, style: ANSI.style.bold });
const DIM = color({ style: ANSI.style.dim });
const YELLOW = color({ fg: ANSI.fg.bright.yellow, style: ANSI.style.bold });
const GREEN = color({ fg: ANSI.fg.bright.green });
const RED = color({ fg: ANSI.fg.bright.red });

const ALLY_TAG = `${GREEN}[A]${RESET}`;
const ENEMY_TAG = `${RED}[E]${RESET}`;

function header(text) {
  const line = '─'.repeat(50);
  console.log(`\n${YELLOW}${line}${RESET}`);
  console.log(`${YELLOW}  ${text}${RESET}`);
  console.log(`${YELLOW}${line}${RESET}`);
}

function ec(element) {
  return `${ELEMENT_COLORS[element]}${element}${RESET}`;
}

async function main() {
  console.clear();
  console.log(`
${YELLOW}
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║           ⚔  BATAK SOULS — TUTORIAL  ⚔           ║
  ║                                                  ║
  ║      Learn the ways of the Undead Card Game      ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
${RESET}`);
  console.log(`  This tutorial explains the core mechanics of BatakSouls.`);
  console.log(`  Press Enter to advance through each section.`);
  await waitForKey();

  // ── Section 1: Elements & Wheels (GF-16) ──
  header('1. ELEMENTS & WEAKNESS WHEELS');
  console.log(`
  Every card belongs to one of ${BOLD}9 elements${RESET}, split into two wheels.

  ${BOLD}Mystical Wheel${RESET} ${DIM}(6 elements, circular):${RESET}

    ${ec('Light')} BEATS ${ec('Dark')} BEATS ${ec('Magic')} BEATS ${ec('Fire')} BEATS ${ec('Poison')} BEATS ${ec('Bleed')} BEATS ${ec('Light')}

  ${BOLD}Physical Wheel${RESET} ${DIM}(3 elements, circular):${RESET}

    ${ec('Armor')} BEATS ${ec('Slash')} BEATS ${ec('Pierce')} BEATS ${ec('Armor')}

  ${DIM}Each element defeats the next one in its wheel.${RESET}
  ${DIM}The last element wraps around and is beaten by the first.${RESET}
  ${DIM}Mystical and Physical elements do NOT interact with each other.${RESET}`);
  await waitForKey();

  // ── Section 2: Card Anatomy ──
  header('2. CARD ANATOMY');
  console.log(`
  Each card has four properties:

  ${BOLD}Example:${RESET}  ${ec('Fire')} Claymore+3  Pw:12 (+4 trump)

    ${ec('Fire')}          Element — determines which wheel it belongs to
    Claymore       Name — a Dark Souls weapon
    ${BOLD}+3${RESET}             Level — upgraded 3 times at the forge
    ${BOLD}Pw:12${RESET}          Power — base (6) + level bonus (3 x ${CONFIG.LEVEL_POWER_BONUS} = 6) = 12
    ${DIM}(+4 trump)${RESET}     Bonus — this card's element matches trump

  ${BOLD}Power formula:${RESET}  base power (${DIM}3-10, random${RESET}) + level x ${BOLD}${CONFIG.LEVEL_POWER_BONUS}${RESET}
  ${DIM}Higher power wins tricks.${RESET}`);
  await waitForKey();

  // ── Section 3: Bidding & Trump ──
  header('3. BIDDING & TRUMP');
  console.log(`
  At the start of each round, every player ${BOLD}sacrifices one card${RESET}
  from their hand as a bid. The bid card is removed from play.

  All bids are revealed simultaneously. The power of each bid card
  is tallied by element:

    ${ec('Fire')} bids total: 14     ${ec('Dark')} bids total: 8

  The element with the ${BOLD}highest total${RESET} becomes ${YELLOW}TRUMP${RESET} for the round.

  ${BOLD}Trump bonus:${RESET} All cards matching the trump element get
  ${YELLOW}+${CONFIG.TRUMP_BONUS} power${RESET} for every trick this round.

  ${BOLD}Bid winner:${RESET} The player who contributed the most power to
  the winning element wins the bid and receives a ${BOLD}panic reduction${RESET}.`);
  await waitForKey();

  // ── Section 4: Panic & Play Order (GF-08) ──
  header('4. PANIC & PLAY ORDER');
  console.log(`
  ${YELLOW}PANIC${RESET} is the core ordering mechanic. Each player has a panic
  value that determines ${BOLD}when they play${RESET} within each trick.

  ${RED}Higher panic = play EARLIER = DISADVANTAGE${RESET}
    You play with less information about what others will do.

  ${GREEN}Lower panic = play LATER = ADVANTAGE${RESET}
    You see what others played and can react accordingly.

  ${BOLD}Play order:${RESET} Players are sorted by panic ${BOLD}descending${RESET} each trick.
  The most panicked player goes first.

  ${BOLD}How panic changes:${RESET}
    ${RED}Win a trick:${RESET}   +${CONFIG.TRICK_WIN_PANIC_INCREASE} panic  ${DIM}(punishment — winners play earlier next trick)${RESET}
    ${GREEN}Win the bid:${RESET}  -${CONFIG.BID_WINNER_PANIC_REDUCTION} panic  ${DIM}(reward — bid winner plays later)${RESET}

  ${BOLD}Tiebreakers${RESET} ${DIM}(when panic is equal):${RESET}
    Last trick winner plays ${RED}earlier${RESET} ${DIM}(continued punishment)${RESET}
    Bid winner plays ${GREEN}later${RESET} ${DIM}(continued reward)${RESET}

  ${DIM}Example:${RESET}  ${ALLY_TAG}You(5) -> ${ENEMY_TAG}Patches(4.5) -> ${ALLY_TAG}Solaire(3)
  ${DIM}You play 1st of 3 (highest panic, least information).${RESET}`);
  await waitForKey();

  // ── Section 5: Teams ──
  header('5. TEAMS & ALLY BUFFS');
  console.log(`
  Players belong to one of two teams:

    ${ALLY_TAG} ${GREEN}Allies${RESET}    You and your summoned phantoms
    ${ENEMY_TAG} ${RED}Enemies${RESET}   Hostile invaders

  ${BOLD}Same-Element Team Buff:${RESET}
  When two ${GREEN}allies${RESET} play cards of the ${BOLD}same element${RESET} in the
  same trick, both cards receive ${BOLD}+${CONFIG.SAME_ELEMENT_TEAM_BUFF} power${RESET}.

    ${ALLY_TAG} You plays ${ec('Fire')} Claymore  (8)  -> ${BOLD}10${RESET} ${DIM}(+2 ally Fire)${RESET}
    ${ALLY_TAG} Solaire plays ${ec('Fire')} Longsword (6) -> ${BOLD}8${RESET}  ${DIM}(+2 ally Fire)${RESET}

  ${DIM}This buff only works between teammates, not enemies.${RESET}`);
  await waitForKey();

  // ── Section 6: Cross-Team Interactions ──
  header('6. CROSS-TEAM INTERACTIONS');
  console.log(`
  When cards from ${BOLD}opposing teams${RESET} are played in the same trick,
  the element wheels determine bonuses and penalties.

  ${BOLD}Empower${RESET} ${DIM}(your element beats an enemy's):${RESET}
  If an enemy played ${ec('Dark')} earlier, and you play ${ec('Light')} later:
    Your ${ec('Light')} is ${GREEN}empowered${RESET}: ${BOLD}+${CONFIG.WEAKNESS_BONUS}${RESET} power ${DIM}(strong vs Dark)${RESET}

  ${BOLD}Weaken${RESET} ${DIM}(an enemy's element beats yours):${RESET}
  If an enemy played ${ec('Light')} earlier, and you play ${ec('Dark')} later:
    Your ${ec('Dark')} is ${RED}weakened${RESET}: ${BOLD}-${CONFIG.WEAKNESS_BONUS}${RESET} power ${DIM}(weak vs Light)${RESET}

  ${BOLD}Stacking:${RESET}
  The first interaction gives the full ${BOLD}+/-${CONFIG.WEAKNESS_BONUS}${RESET} bonus.
  Each additional interaction gives only ${BOLD}+/-1${RESET}.

    ${ec('Light')} strong vs ${ec('Dark')}: +${CONFIG.WEAKNESS_BONUS}
    ${ec('Light')} strong vs ${ec('Magic')}: +1 ${DIM}(second interaction, diminished)${RESET}

  ${DIM}Only later cards are affected by earlier ones, not the reverse.${RESET}
  ${DIM}Same-team cards never interact through the weakness wheel.${RESET}`);
  await waitForKey();

  // ── Section 7: Scoring & Upgrades ──
  header('7. SCORING & THE FORGE');
  console.log(`
  ${BOLD}Trick Scoring:${RESET}
  The highest-power card wins each trick. The winner earns
  ${BOLD}${CONFIG.SOULS_PER_TRICK} souls${RESET} per trick won.

  ${BOLD}Majority Bonus:${RESET}
  The player who wins the ${BOLD}most tricks${RESET} in a round earns an
  extra ${YELLOW}+${CONFIG.MAJORITY_BONUS} souls${RESET}.

  ${BOLD}The Forge:${RESET}
  Between rounds, spend souls to upgrade your cards.
  Each upgrade gives ${BOLD}+${CONFIG.LEVEL_POWER_BONUS} power${RESET} permanently.

    Level 0 -> 1: ${BOLD}${CONFIG.upgradeCost(0)} souls${RESET}
    Level 1 -> 2: ${BOLD}${CONFIG.upgradeCost(1)} souls${RESET}
    Level 2 -> 3: ${BOLD}${CONFIG.upgradeCost(2)} souls${RESET}
    ${DIM}...up to max level ${CONFIG.MAX_LEVEL}${RESET}

  ${DIM}Choose wisely — upgrading trump-likely elements or${RESET}
  ${DIM}high-base-power cards yields the best return.${RESET}`);
  await waitForKey();

  // ── Section 8: Quick Reference ──
  header('8. QUICK REFERENCE');
  console.log(`
  ${BOLD}Collection:${RESET}     ${CONFIG.COLLECTION_SIZE} cards per player
  ${BOLD}Hand size:${RESET}      ${CONFIG.HAND_SIZE} cards dealt per round
  ${BOLD}Tricks:${RESET}         ${CONFIG.TRICKS_PER_ROUND} per round
  ${BOLD}Base power:${RESET}     3-10 ${DIM}(random at creation)${RESET}
  ${BOLD}Level bonus:${RESET}    +${CONFIG.LEVEL_POWER_BONUS} per level ${DIM}(max level ${CONFIG.MAX_LEVEL})${RESET}
  ${BOLD}Trump bonus:${RESET}    +${CONFIG.TRUMP_BONUS}
  ${BOLD}Team buff:${RESET}      +${CONFIG.SAME_ELEMENT_TEAM_BUFF} ${DIM}(same element, same team)${RESET}
  ${BOLD}Empower/Weaken:${RESET} +/-${CONFIG.WEAKNESS_BONUS} first, +/-1 each after
  ${BOLD}Souls/trick:${RESET}    ${CONFIG.SOULS_PER_TRICK}
  ${BOLD}Majority bonus:${RESET} +${CONFIG.MAJORITY_BONUS}
  ${BOLD}Panic on win:${RESET}   +${CONFIG.TRICK_WIN_PANIC_INCREASE}
  ${BOLD}Bid win panic:${RESET}  -${CONFIG.BID_WINNER_PANIC_REDUCTION}

  ${YELLOW}The Undead who accumulates the most souls wins.${RESET}
  ${DIM}May the flame guide thee.${RESET}`);
  await waitForKey('\nPress Enter to exit the tutorial...');

  close();
}

main();
