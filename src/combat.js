const { TEAMS } = require('./constants');

/**
 * Compute damage pairs from trick powers.
 * For each cross-team pair, higher power deals (diff) damage to lower.
 * @param {Play[]} plays - array of { player, card }
 * @param {TrickPower[]} trickPowers - matching array with { power }
 * @returns {DamageEntry[]} array of { attacker, defender, damage }
 */
function computeDamage(plays, trickPowers) {
  const damages = [];
  for (let i = 0; i < plays.length; i++) {
    for (let j = i + 1; j < plays.length; j++) {
      const pA = plays[i].player;
      const pB = plays[j].player;
      if (pA.team === pB.team) continue;

      const powA = trickPowers[i].power;
      const powB = trickPowers[j].power;
      const diff = powA - powB;

      if (diff > 0) {
        damages.push({ attacker: pA, defender: pB, damage: diff });
      } else if (diff < 0) {
        damages.push({ attacker: pB, defender: pA, damage: -diff });
      }
    }
  }
  return damages;
}

/**
 * Apply damage entries by mutating player HP. Clamps at 0.
 * @param {DamageEntry[]} damages
 * @returns {AppliedDamage[]} array of { attacker, defender, damage, oldHp, newHp }
 */
function applyDamage(damages) {
  return damages.map(({ attacker, defender, damage }) => {
    const oldHp = defender.hp;
    defender.hp = Math.max(0, defender.hp - damage);
    return { attacker, defender, damage, oldHp, newHp: defender.hp };
  });
}

/**
 * Check which players have 0 HP.
 * @param {Player[]} players
 * @returns {Player[]} dead players
 */
function checkDeaths(players) {
  return players.filter(p => p.hp <= 0);
}

/**
 * Determine combat result after a round/death.
 * @param {Player[]} players
 * @returns {null|{winner: Player, playerWon: boolean, cause: string}} null if no result yet
 */
function determineCombatResult(players) {
  const dead = checkDeaths(players);
  if (dead.length === 0) return null;

  const alliesDead = dead.some(p => p.team === TEAMS.ALLIES);
  const enemiesDead = dead.some(p => p.team === TEAMS.ENEMIES);

  if (alliesDead && enemiesDead) {
    // Both sides died — attacker (enemy) wins the trade
    const enemy = players.find(p => p.team === TEAMS.ENEMIES);
    return { winner: enemy, playerWon: false, cause: 'mutual-kill' };
  }

  if (alliesDead) {
    const enemy = players.find(p => p.team === TEAMS.ENEMIES);
    return { winner: enemy, playerWon: false, cause: 'death' };
  }

  const ally = players.find(p => p.team === TEAMS.ALLIES);
  return { winner: ally, playerWon: true, cause: 'death' };
}

module.exports = { computeDamage, applyDamage, checkDeaths, determineCombatResult };
