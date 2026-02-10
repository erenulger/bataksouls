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
  [ELEMENTS.LIGHT]:  '\x1b[0;93;49m',   // bright yellow
  [ELEMENTS.DARK]:   '\x1b[35m',   // magenta
  [ELEMENTS.MAGIC]:  '\x1b[0;94;49m',   // bright blue
  [ELEMENTS.FIRE]:   '\x1b[91m',   // bright red
  [ELEMENTS.POISON]: '\x1b[32m',   // green
  [ELEMENTS.BLEED]:  '\x1b[31m',   // red
  [ELEMENTS.ARMOR]:  '\x1b[33m',   // yellow
  [ELEMENTS.SLASH]:  '\x1b[37m',   // white
  [ELEMENTS.PIERCE]: '\x1b[36m',   // cyan
};

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

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

// ── AI Personalities ──
const AI_TYPES = {
  AGGRESSIVE: 'Aggressive',
  DEFENSIVE:  'Defensive',
  CHAOTIC:    'Chaotic',
};

// ── Balance Config ──
const CONFIG = {
  COLLECTION_SIZE: 14,
  HAND_SIZE: 7,
  TRICKS_PER_ROUND: 6,
  SOULS_PER_TRICK: 10,
  MAJORITY_BONUS: 15,
  MAX_LEVEL: 10,
  TRUMP_BONUS: 5,
  WEAKNESS_BONUS: 3,
  LEVEL_POWER_BONUS: 2,
  upgradeCost(level) { return 10 + level * 5; },
};

module.exports = {
  ELEMENTS, MYSTICAL, PHYSICAL, ALL_ELEMENTS,
  MYSTICAL_WHEEL, PHYSICAL_WHEEL, beatsElement,
  ELEMENT_COLORS, RESET, BOLD, DIM,
  WEAPON_NAMES, NPC_NAMES, AI_TYPES, CONFIG,
};
