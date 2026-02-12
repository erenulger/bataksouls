const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TEAMS, ELEMENTS } = require('../src/constants');
const { computeDamage, applyDamage, checkDeaths, determineCombatResult, computeEnduranceDamage } = require('../src/combat');

function makePlayer(name, team, hp = 100) {
  return { name, team, hp, maxHp: hp, isHuman: team === TEAMS.ALLIES, hand: [] };
}

function makeCard(element, basePower, level = 0) {
  return { id: Math.random(), element, basePower, level, name: 'TestCard' };
}

describe('computeDamage', () => {
  it('deals difference as damage to lower-power cross-team player', () => {
    const pA = makePlayer('Player', TEAMS.ALLIES);
    const pB = makePlayer('Enemy', TEAMS.ENEMIES);
    const plays = [{ player: pA, card: {} }, { player: pB, card: {} }];
    const trickPowers = [{ power: 10 }, { power: 8 }];

    const damages = computeDamage(plays, trickPowers);
    assert.equal(damages.length, 1);
    assert.equal(damages[0].attacker, pA);
    assert.equal(damages[0].defender, pB);
    assert.equal(damages[0].damage, 2);
  });

  it('no damage when powers are equal', () => {
    const pA = makePlayer('Player', TEAMS.ALLIES);
    const pB = makePlayer('Enemy', TEAMS.ENEMIES);
    const plays = [{ player: pA, card: {} }, { player: pB, card: {} }];
    const trickPowers = [{ power: 10 }, { power: 10 }];

    const damages = computeDamage(plays, trickPowers);
    assert.equal(damages.length, 0);
  });

  it('skips same-team pairs', () => {
    const pA = makePlayer('Ally1', TEAMS.ALLIES);
    const pB = makePlayer('Ally2', TEAMS.ALLIES);
    const plays = [{ player: pA, card: {} }, { player: pB, card: {} }];
    const trickPowers = [{ power: 10 }, { power: 5 }];

    const damages = computeDamage(plays, trickPowers);
    assert.equal(damages.length, 0);
  });

  it('handles 1v2 scenario', () => {
    const player = makePlayer('Player', TEAMS.ALLIES);
    const e1 = makePlayer('Enemy1', TEAMS.ENEMIES);
    const e2 = makePlayer('Enemy2', TEAMS.ENEMIES);
    const plays = [
      { player, card: {} },
      { player: e1, card: {} },
      { player: e2, card: {} },
    ];
    const trickPowers = [{ power: 10 }, { power: 8 }, { power: 12 }];

    const damages = computeDamage(plays, trickPowers);
    assert.equal(damages.length, 2);
    // Player deals 2 to Enemy1
    assert.equal(damages[0].attacker, player);
    assert.equal(damages[0].defender, e1);
    assert.equal(damages[0].damage, 2);
    // Enemy2 deals 2 to Player
    assert.equal(damages[1].attacker, e2);
    assert.equal(damages[1].defender, player);
    assert.equal(damages[1].damage, 2);
  });
});

describe('applyDamage', () => {
  it('reduces defender HP and returns old/new values', () => {
    const defender = makePlayer('Enemy', TEAMS.ENEMIES);
    const attacker = makePlayer('Player', TEAMS.ALLIES);
    const damages = [{ attacker, defender, damage: 15 }];

    const results = applyDamage(damages);
    assert.equal(results.length, 1);
    assert.equal(results[0].oldHp, 100);
    assert.equal(results[0].newHp, 85);
    assert.equal(defender.hp, 85);
  });

  it('clamps HP at 0', () => {
    const defender = makePlayer('Enemy', TEAMS.ENEMIES, 5);
    const attacker = makePlayer('Player', TEAMS.ALLIES);
    const damages = [{ attacker, defender, damage: 20 }];

    const results = applyDamage(damages);
    assert.equal(results[0].newHp, 0);
    assert.equal(defender.hp, 0);
  });

  it('applies multiple damages in sequence', () => {
    const defender = makePlayer('Enemy', TEAMS.ENEMIES);
    const a1 = makePlayer('Ally1', TEAMS.ALLIES);
    const a2 = makePlayer('Ally2', TEAMS.ALLIES);
    const damages = [
      { attacker: a1, defender, damage: 30 },
      { attacker: a2, defender, damage: 25 },
    ];

    const results = applyDamage(damages);
    assert.equal(results[0].oldHp, 100);
    assert.equal(results[0].newHp, 70);
    assert.equal(results[1].oldHp, 70);
    assert.equal(results[1].newHp, 45);
    assert.equal(defender.hp, 45);
  });
});

describe('checkDeaths', () => {
  it('returns empty array when all alive', () => {
    const players = [makePlayer('A', TEAMS.ALLIES, 50), makePlayer('B', TEAMS.ENEMIES, 30)];
    assert.deepEqual(checkDeaths(players), []);
  });

  it('returns players at 0 HP', () => {
    const dead = makePlayer('Dead', TEAMS.ENEMIES, 0);
    const alive = makePlayer('Alive', TEAMS.ALLIES, 50);
    const result = checkDeaths([alive, dead]);
    assert.equal(result.length, 1);
    assert.equal(result[0], dead);
  });
});

describe('determineCombatResult', () => {
  it('returns null when no one is dead', () => {
    const players = [makePlayer('P', TEAMS.ALLIES, 50), makePlayer('E', TEAMS.ENEMIES, 50)];
    assert.equal(determineCombatResult(players), null);
  });

  it('player wins when enemy dies', () => {
    const player = makePlayer('P', TEAMS.ALLIES, 50);
    const enemy = makePlayer('E', TEAMS.ENEMIES, 0);
    const result = determineCombatResult([player, enemy]);
    assert.equal(result.playerWon, true);
    assert.equal(result.winner, player);
    assert.equal(result.cause, 'death');
  });

  it('enemy wins when player dies', () => {
    const player = makePlayer('P', TEAMS.ALLIES, 0);
    const enemy = makePlayer('E', TEAMS.ENEMIES, 50);
    const result = determineCombatResult([player, enemy]);
    assert.equal(result.playerWon, false);
    assert.equal(result.winner, enemy);
    assert.equal(result.cause, 'death');
  });

  it('returns null when only some enemies die (combat continues)', () => {
    const player = makePlayer('P', TEAMS.ALLIES, 50);
    const e1 = makePlayer('E1', TEAMS.ENEMIES, 0);
    const e2 = makePlayer('E2', TEAMS.ENEMIES, 50);
    const result = determineCombatResult([player, e1, e2]);
    assert.equal(result, null);
  });

  it('returns null when only some allies die (combat continues)', () => {
    const p1 = makePlayer('P1', TEAMS.ALLIES, 0);
    const p2 = makePlayer('P2', TEAMS.ALLIES, 50);
    const enemy = makePlayer('E', TEAMS.ENEMIES, 50);
    const result = determineCombatResult([p1, p2, enemy]);
    assert.equal(result, null);
  });

  it('player wins when all enemies die', () => {
    const player = makePlayer('P', TEAMS.ALLIES, 50);
    const e1 = makePlayer('E1', TEAMS.ENEMIES, 0);
    const e2 = makePlayer('E2', TEAMS.ENEMIES, 0);
    const result = determineCombatResult([player, e1, e2]);
    assert.equal(result.playerWon, true);
    assert.equal(result.winner, player);
  });

  it('enemy wins when all allies die', () => {
    const p1 = makePlayer('P1', TEAMS.ALLIES, 0);
    const p2 = makePlayer('P2', TEAMS.ALLIES, 0);
    const enemy = makePlayer('E', TEAMS.ENEMIES, 50);
    const result = determineCombatResult([p1, p2, enemy]);
    assert.equal(result.playerWon, false);
    assert.equal(result.winner, enemy);
  });

  it('enemy wins on mutual team kill', () => {
    const player = makePlayer('P', TEAMS.ALLIES, 0);
    const e1 = makePlayer('E1', TEAMS.ENEMIES, 0);
    const e2 = makePlayer('E2', TEAMS.ENEMIES, 50);
    // Player dead, at least one enemy alive
    const result = determineCombatResult([player, e1, e2]);
    assert.equal(result.playerWon, false);
  });
});

describe('computeEnduranceDamage', () => {
  it('returns average of enemy effective power', () => {
    const player = makePlayer('Player', TEAMS.ALLIES);
    const enemy = makePlayer('Enemy', TEAMS.ENEMIES);
    enemy.hand = [
      makeCard(ELEMENTS.FIRE, 5, 0),  // effective: 5
      makeCard(ELEMENTS.FIRE, 7, 0),  // effective: 7
      makeCard(ELEMENTS.LIGHT, 6, 1), // effective: 6 + 2 = 8
    ];
    // Total: 5 + 7 + 8 = 20, average = 20/3 = 6.666... → 6

    const damage = computeEnduranceDamage(player, [player, enemy], null);
    assert.equal(damage, 6);
  });

  it('includes trump bonus in effective power', () => {
    const player = makePlayer('Player', TEAMS.ALLIES);
    const enemy = makePlayer('Enemy', TEAMS.ENEMIES);
    enemy.hand = [
      makeCard(ELEMENTS.FIRE, 5, 0),  // not trump: 5
      makeCard(ELEMENTS.LIGHT, 6, 0), // trump: 6 + 4 = 10
    ];
    // Total with Light trump: 5 + 10 = 15, average = 15/2 = 7.5 → 7

    const damage = computeEnduranceDamage(player, [player, enemy], ELEMENTS.LIGHT);
    assert.equal(damage, 7);
  });

  it('returns 0 when all enemies have empty hands', () => {
    const player = makePlayer('Player', TEAMS.ALLIES);
    const enemy = makePlayer('Enemy', TEAMS.ENEMIES);
    enemy.hand = [];

    const damage = computeEnduranceDamage(player, [player, enemy], null);
    assert.equal(damage, 0);
  });

  it('averages power from multiple enemies', () => {
    const player = makePlayer('Player', TEAMS.ALLIES);
    const e1 = makePlayer('Enemy1', TEAMS.ENEMIES);
    const e2 = makePlayer('Enemy2', TEAMS.ENEMIES);
    e1.hand = [makeCard(ELEMENTS.FIRE, 8, 0)]; // 8
    e2.hand = [makeCard(ELEMENTS.DARK, 6, 0)]; // 6
    // Total: 14, 2 cards, average = 14/2 = 7

    const damage = computeEnduranceDamage(player, [player, e1, e2], null);
    assert.equal(damage, 7);
  });

  it('floors the result', () => {
    const player = makePlayer('Player', TEAMS.ALLIES);
    const enemy = makePlayer('Enemy', TEAMS.ENEMIES);
    enemy.hand = [
      makeCard(ELEMENTS.FIRE, 5, 0),  // 5
      makeCard(ELEMENTS.FIRE, 6, 0),  // 6
    ];
    // Total: 11, 2 cards, average = 11/2 = 5.5 → 5

    const damage = computeEnduranceDamage(player, [player, enemy], null);
    assert.equal(damage, 5);
  });
});
