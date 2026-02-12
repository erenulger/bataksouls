const { TEAMS } = require('./constants');
const { effectivePower } = require('./card');

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
 * Determine combat result. Returns result only when one side is completely eliminated.
 * @param {Player[]} players - all combat participants (including dead)
 * @returns {null|{winner: Player, playerWon: boolean, cause: string, deadNPCs: Player[]}} null if combat continues
 */
function determineCombatResult(players) {
  // Check team presence — dead players may already be removed from the array
  const alliesAlive = players.filter(p => p.hp > 0 && p.team === TEAMS.ALLIES);
  const enemiesAlive = players.filter(p => p.hp > 0 && p.team === TEAMS.ENEMIES);

  // Combat continues if both sides have survivors
  if (alliesAlive.length > 0 && enemiesAlive.length > 0) {
    return null;
  }

  // All allies dead = enemy victory
  if (alliesAlive.length === 0) {
    const winner = enemiesAlive[0] || players.find(p => p.team === TEAMS.ENEMIES);
    return { winner, playerWon: false, cause: 'death', deadNPCs: [] };
  }

  // All enemies dead = player victory
  const winner = alliesAlive.find(p => p.isHuman) || alliesAlive[0];
  return { winner, playerWon: true, cause: 'death', deadNPCs: [] };
}

/**
 * Compute endurance damage when a player has empty hand while enemies have cards.
 * Applied once per trick while depleted.
 * @param {Player} depletedPlayer - player with no cards
 * @param {Player[]} allPlayers - all combat participants
 * @param {string|null} trumpElement - current trump for power calculation
 * @returns {number} damage to apply to depleted player (average power of enemy cards)
 */
function computeEnduranceDamage(depletedPlayer, allPlayers, trumpElement) {
  const enemies = allPlayers.filter(p => p.team !== depletedPlayer.team);
  const enemyCards = enemies.flatMap(p => p.hand);

  if (enemyCards.length === 0) return 0;

  const totalEffectivePower = enemyCards.reduce((sum, card) =>
    sum + effectivePower(card, trumpElement).power, 0);

  return Math.floor(totalEffectivePower / enemyCards.length);
}

module.exports = { computeDamage, applyDamage, checkDeaths, determineCombatResult, computeEnduranceDamage };
