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

function effectivePower(card, trumpElement) {
  let power = card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS;
  let bonuses = [];
  if (trumpElement && card.element === trumpElement) {
    power += CONFIG.TRUMP_BONUS;
    bonuses.push(`+${CONFIG.TRUMP_BONUS} trump`);
  }
  return { power, bonuses };
}

function computeTrickPowers(plays, trumpElement) {
  // Step 1: Compute base power for each card (base + level + trump)
  const results = plays.map(({ player, card }) => {
    const { power, bonuses } = effectivePower(card, trumpElement);
    return {
      player,
      card,
      power,
      bonuses: [...bonuses],
      empowerCount: 0,
      weakenCount: 0,
    };
  });

  // Step 2: Same-team same-element buff (+2 per matching teammate, pairwise)
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

  // Step 3: Cross-team global interactions based on play order
  // The LATER card (j) is affected by EARLIER cards (i) on the table
  // Later card is strong vs earlier → later card empowered
  // Later card is weak vs earlier → later card weakened
  // Stacking: base WEAKNESS_BONUS + (count) for each subsequent interaction
  for (let j = 1; j < results.length; j++) {
    for (let i = 0; i < j; i++) {
      if (results[i].player.team === results[j].player.team) continue;

      const cardA = results[i].card; // earlier (on table)
      const cardB = results[j].card; // later (being played, "hitting" the table)

      if (beatsElement(cardB.element, cardA.element)) {
        // B is strong against A → B gets empowered
        const bonus = CONFIG.WEAKNESS_BONUS + results[j].empowerCount;
        results[j].empowerCount++;
        results[j].power += bonus;
        results[j].bonuses.push(`+${bonus} strong vs ${cardA.element}`);
      } else if (beatsElement(cardA.element, cardB.element)) {
        // A is strong against B → B gets weakened
        const penalty = CONFIG.WEAKNESS_BONUS + results[j].weakenCount;
        results[j].weakenCount++;
        results[j].power -= penalty;
        results[j].bonuses.push(`-${penalty} weak vs ${cardA.element}`);
      }
    }
  }

  return results.map(r => ({ power: r.power, bonuses: r.bonuses }));
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
  return `${color}${card.element}${RESET} ${card.name}${lvl} (${card.basePower + card.level * CONFIG.LEVEL_POWER_BONUS})`;
}

module.exports = { createCard, effectivePower, computeTrickPowers, cardDisplay, shortDisplay };
