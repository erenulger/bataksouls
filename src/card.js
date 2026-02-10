const { ELEMENT_COLORS, RESET, BOLD, DIM, WEAPON_NAMES, CONFIG, beatsElement } = require('./constants');

let nextId = 1;

function createCard(element) {
  const names = WEAPON_NAMES[element];
  const name = names[Math.floor(Math.random() * names.length)];
  const basePower = Math.floor(Math.random() * 8) + 3; // 3-10
  return {
    id: nextId++,
    element,
    name,
    basePower,
    level: 0,
  };
}

function effectivePower(card, ledElement, trumpElement) {
  let power = card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS;
  let bonuses = [];
  if (trumpElement && card.element === trumpElement) {
    power += CONFIG.TRUMP_BONUS;
    bonuses.push(`+${CONFIG.TRUMP_BONUS} trump`);
  }
  if (ledElement) {
    if (beatsElement(card.element, ledElement)) {
      power += CONFIG.WEAKNESS_BONUS;
      bonuses.push(`+${CONFIG.WEAKNESS_BONUS} strong`);
    } else if (beatsElement(ledElement, card.element)) {
      power -= CONFIG.WEAKNESS_BONUS;
      bonuses.push(`-${CONFIG.WEAKNESS_BONUS} weak`);
    }
  }
  return { power, bonuses };
}

function cardDisplay(card, { showPower = true, ledElement = null, trumpElement = null, index = null } = {}) {
  const color = ELEMENT_COLORS[card.element];
  const lvl = card.level > 0 ? ` +${card.level}` : '';
  const { power, bonuses } = effectivePower(card, ledElement, trumpElement);
  const bonusStr = bonuses.length > 0 ? ` ${DIM}(${bonuses.join(', ')})${RESET}` : '';
  const prefix = index !== null ? `${DIM}[${index + 1}]${RESET} ` : '';
  const powerStr = showPower ? ` ${BOLD}Pw:${power}${RESET}${bonusStr}` : '';
  return `${prefix}${color}${card.element}${RESET} ${card.name}${lvl}${powerStr}`;
}

function shortDisplay(card) {
  const color = ELEMENT_COLORS[card.element];
  const lvl = card.level > 0 ? `+${card.level}` : '';
  return `${color}${card.element}${RESET} ${card.name}${lvl} (${card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS})`;
}

module.exports = { createCard, effectivePower, cardDisplay, shortDisplay };
