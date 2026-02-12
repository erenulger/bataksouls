const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { scoreRound } = require('../src/round');
const { CONFIG } = require('../src/constants');

function makePlayer(name, tricksWon) {
  return { name, tricksWon, souls: 0, totalSouls: 0 };
}

describe('scoreRound', () => {
  it('awards souls per trick', () => {
    const players = [makePlayer('A', 3), makePlayer('B', 1)];
    scoreRound(players);
    assert.equal(players[1].souls, 1 * CONFIG.SOULS_PER_TRICK);
  });

  it('awards majority bonus to player with most tricks', () => {
    const players = [makePlayer('A', 5), makePlayer('B', 2)];
    scoreRound(players);
    assert.equal(players[0].souls, 5 * CONFIG.SOULS_PER_TRICK + CONFIG.MAJORITY_BONUS);
    assert.equal(players[1].souls, 2 * CONFIG.SOULS_PER_TRICK);
  });

  it('awards majority bonus to all tied for most tricks', () => {
    const players = [makePlayer('A', 4), makePlayer('B', 4)];
    scoreRound(players);
    const expected = 4 * CONFIG.SOULS_PER_TRICK + CONFIG.MAJORITY_BONUS;
    assert.equal(players[0].souls, expected);
    assert.equal(players[1].souls, expected);
  });

  it('accumulates totalSouls', () => {
    const players = [makePlayer('A', 3)];
    players[0].totalSouls = 100;
    players[0].souls = 50;
    scoreRound(players);
    const earned = 3 * CONFIG.SOULS_PER_TRICK + CONFIG.MAJORITY_BONUS;
    assert.equal(players[0].souls, 50 + earned);
    assert.equal(players[0].totalSouls, 100 + earned);
  });

  it('handles zero tricks', () => {
    const players = [makePlayer('A', 0), makePlayer('B', 5)];
    scoreRound(players);
    assert.equal(players[0].souls, 0);
  });
});
