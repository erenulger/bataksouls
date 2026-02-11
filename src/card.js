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

function rawPower(card) {
  return card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS;
}

function effectivePower(card, trumpElement) {
  let power = rawPower(card);
  let bonuses = [];
  if (trumpElement && card.element === trumpElement) {
    power += CONFIG.TRUMP_BONUS;
    bonuses.push(`+${CONFIG.TRUMP_BONUS} trump`);
  }
  return { power, bonuses };
}

function initBaseResults(plays, trumpElement) {
  return plays.map(({ player, card }) => {
    const base = rawPower(card);
    const { power, bonuses } = effectivePower(card, trumpElement);
    return {
      player, card, base, power,
      bonuses: [...bonuses],
      empowerCount: 0, weakenCount: 0,
    };
  });
}

function applyTeamBuffs(results) {
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      if (results[i].player.team === results[j].player.team &&
          results[i].card.element === results[j].card.element) {
        results[i].power += CONFIG.SAME_ELEMENT_TEAM_BUFF;
        results[i].bonuses.push(`+${CONFIG.SAME_ELEMENT_TEAM_BUFF} ally ${results[j].card.element}`);
        results[j].power += CONFIG.SAME_ELEMENT_TEAM_BUFF;
        results[j].bonuses.push(`+${CONFIG.SAME_ELEMENT_TEAM_BUFF} ally ${results[i].card.element}`);
      }
    }
  }
}

function applyCrossTeamInteractions(results) {
  for (let j = 1; j < results.length; j++) {
    for (let i = 0; i < j; i++) {
      if (results[i].player.team === results[j].player.team) continue;
      const cardA = results[i].card;
      const cardB = results[j].card;
      if (beatsElement(cardB.element, cardA.element)) {
        const bonus = results[j].empowerCount === 0 ? CONFIG.WEAKNESS_BONUS : 1;
        results[j].empowerCount++;
        results[j].power += bonus;
        results[j].bonuses.push(`+${bonus} strong vs ${cardA.element}`);
      } else if (beatsElement(cardA.element, cardB.element)) {
        const penalty = results[j].weakenCount === 0 ? CONFIG.WEAKNESS_BONUS : 1;
        results[j].weakenCount++;
        results[j].power -= penalty;
        results[j].bonuses.push(`-${penalty} weak vs ${cardA.element}`);
      }
    }
  }
}

function computeTrickPowers(plays, trumpElement) {
  const results = initBaseResults(plays, trumpElement);
  applyTeamBuffs(results);
  applyCrossTeamInteractions(results);
  return results.map(r => ({ base: r.base, power: r.power, bonuses: r.bonuses }));
}

function cardDisplay(card, { showPower = true, trumpElement = null, index = null } = {}) {
  const color = ELEMENT_COLORS[card.element];
  const lvl = card.level > 0 ? ` +${card.level}` : '';
  const { power, bonuses } = effectivePower(card, trumpElement);
  const bonusStr = bonuses.length > 0 ? ` ${DIM}(${bonuses.join(', ')})${RESET}` : '';
  const prefix = index !== null ? `${DIM}[${index + 1}]${RESET} ` : '';
  const powerStr = showPower ? ` ${BOLD}Pw:${power}${RESET}${bonusStr}` : '';
  return `${prefix}${color}${card.element}${RESET} ${card.name}${lvl}${powerStr}`;
}

function shortDisplay(card) {
  const color = ELEMENT_COLORS[card.element];
  const lvl = card.level > 0 ? `+${card.level}` : '';
  return `${color}${card.element}${RESET} ${card.name}${lvl} (${rawPower(card)})`;
}

module.exports = { createCard, rawPower, effectivePower, computeTrickPowers, cardDisplay, shortDisplay };
