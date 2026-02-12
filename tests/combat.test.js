const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TEAMS } = require('../src/constants');
const { computeDamage, applyDamage, checkDeaths, determineCombatResult } = require('../src/combat');

function makePlayer(name, team, hp = 100) {
  return { name, team, hp, maxHp: hp, isHuman: team === TEAMS.ALLIES };
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

  it('enemy wins on mutual kill', () => {
    const player = makePlayer('P', TEAMS.ALLIES, 0);
    const enemy = makePlayer('E', TEAMS.ENEMIES, 0);
    const result = determineCombatResult([player, enemy]);
    assert.equal(result.playerWon, false);
    assert.equal(result.cause, 'mutual-kill');
  });
});
