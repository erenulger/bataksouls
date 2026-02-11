// ── Elements ──
const ELEMENTS = {
  // Mystical Wheel
  LIGHT:  'Light',
  DARK:   'Dark',
  MAGIC:  'Magic',
  FIRE:   'Fire',
  POISON: 'Poison',
  BLEED:  'Bleed',
  // Physical Wheel
  ARMOR:  'Armor',
  SLASH:  'Slash',
  PIERCE: 'Pierce',
};

const MYSTICAL = [ELEMENTS.LIGHT, ELEMENTS.DARK, ELEMENTS.MAGIC, ELEMENTS.FIRE, ELEMENTS.POISON, ELEMENTS.BLEED];
const PHYSICAL = [ELEMENTS.ARMOR, ELEMENTS.SLASH, ELEMENTS.PIERCE];
const ALL_ELEMENTS = [...MYSTICAL, ...PHYSICAL];
const { ANSI, color, reset } = require('./ansiColors');

// ── Weakness Wheels ──
// Each key beats the value
const MYSTICAL_WHEEL = {
  [ELEMENTS.LIGHT]:  ELEMENTS.DARK,
  [ELEMENTS.DARK]:   ELEMENTS.MAGIC,
  [ELEMENTS.MAGIC]:  ELEMENTS.FIRE,
  [ELEMENTS.FIRE]:   ELEMENTS.POISON,
  [ELEMENTS.POISON]: ELEMENTS.BLEED,
  [ELEMENTS.BLEED]:  ELEMENTS.LIGHT,
};

const PHYSICAL_WHEEL = {
  [ELEMENTS.ARMOR]:  ELEMENTS.SLASH,
  [ELEMENTS.SLASH]:  ELEMENTS.PIERCE,
  [ELEMENTS.PIERCE]: ELEMENTS.ARMOR,
};

function beatsElement(attacker, defender) {
  if (MYSTICAL_WHEEL[attacker] === defender) return true;
  if (PHYSICAL_WHEEL[attacker] === defender) return true;
  return false;
}

// ── ANSI Colors per Element ──
const ELEMENT_COLORS = {
  [ELEMENTS.LIGHT]:  color({ fg: ANSI.fg.bright.yellow }),                      // bright white
  [ELEMENTS.DARK]:   color({ fg: ANSI.fg.magenta }),                           // magenta
  [ELEMENTS.MAGIC]:  color({ fg: ANSI.fg.bright.blue }),                       // bright blue
  [ELEMENTS.FIRE]:   color({ fg: ANSI.fg.bright.red }),                        // bright red
  [ELEMENTS.POISON]: color({ fg: ANSI.fg.green }),                             // green
  [ELEMENTS.BLEED]:  color({ fg: ANSI.fg.red }),                               // red
  [ELEMENTS.ARMOR]:  color({ fg: ANSI.fg.yellow}),                            // yellow/orange
  [ELEMENTS.SLASH]:  color({ fg: ANSI.fg.white }),                             // white
  [ELEMENTS.PIERCE]: color({ fg: ANSI.fg.cyan }),                              // cyan
};

const RESET = reset;
const BOLD  = color({ style: ANSI.style.bold });
const DIM   = color({ style: ANSI.style.dim });

// ── Weapon Names per Element ──
const WEAPON_NAMES = {
  [ELEMENTS.LIGHT]:  ['Talisman', 'Sunlight Staff', 'Sacred Chime', 'Canvas Talisman'],
  [ELEMENTS.DARK]:   ['Dark Hand', 'Abyss Greatsword', 'Manus Catalyst', 'Chime of Screams'],
  [ELEMENTS.MAGIC]:  ['Crystal Staff', 'Moonlight Blade', 'Tin Catalyst', 'Logan\'s Staff'],
  [ELEMENTS.FIRE]:   ['Longsword', 'Claymore', 'Chaos Blade', 'Pyromancy Flame'],
  [ELEMENTS.POISON]: ['Poison Dagger', 'Spotted Whip', 'Poison Broadsword', 'Toxic Mist'],
  [ELEMENTS.BLEED]:  ['Bandit Knife', 'Flamberge', 'Priscilla Dagger', 'Notched Whip'],
  [ELEMENTS.ARMOR]:  ['Greatshield', 'Iron Shield', 'Stone Gauntlet', 'Tower Shield'],
  [ELEMENTS.SLASH]:  ['Uchigatana', 'Iaito', 'Washing Pole', 'Falchion'],
  [ELEMENTS.PIERCE]: ['Estoc', 'Rapier', 'Silver Spear', 'Winged Spear'],
};

// ── AI NPC Names ──
const NPC_NAMES = ['Solaire', 'Siegmeyer', 'Patches', 'Lautrec', 'Oscar'];

// ── Teams ──
const TEAMS = {
  ALLIES:  'allies',
  ENEMIES: 'enemies',
};

// ── AI Personalities ──
const AI_TYPES = {
  AGGRESSIVE: 'Aggressive',
  DEFENSIVE:  'Defensive',
  RECKLESS:   'Reckless',
};

// ── Balance Config ──
const CONFIG = {
  COLLECTION_SIZE: 26,
  HAND_SIZE: 13,
  TRICKS_PER_ROUND: 12,
  SOULS_PER_TRICK: 10,
  MAJORITY_BONUS: 15,
  MAX_LEVEL: 10,
  TRUMP_BONUS: 4,
  WEAKNESS_BONUS: 4,
  SAME_ELEMENT_TEAM_BUFF: 2,
  BID_WINNER_PANIC_REDUCTION: 2,
  TRICK_WIN_PANIC_INCREASE: 0.5,
  LEVEL_POWER_BONUS: 2,
  upgradeCost(level) { return 10 + level * 5; },
};

module.exports = {
  ELEMENTS, MYSTICAL, PHYSICAL, ALL_ELEMENTS,
  MYSTICAL_WHEEL, PHYSICAL_WHEEL, beatsElement,
  ELEMENT_COLORS, RESET, BOLD, DIM,
  WEAPON_NAMES, NPC_NAMES, AI_TYPES, TEAMS, CONFIG,
};
