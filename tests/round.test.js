const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TEAMS } = require('../src/constants');
const { sortPlayOrder } = require('../src/round');

function makePlayer(name, team, panic = 50) {
  return { name, team, hp: 100, maxHp: 100, isHuman: false, hand: [], panic, tricksWon: 0 };
}

// ── sortPlayOrder ──

describe('sortPlayOrder', () => {
  it('sorts by panic descending (highest panic plays first)', () => {
    const pA = makePlayer('Low', TEAMS.ALLIES, 30);
    const pB = makePlayer('High', TEAMS.ENEMIES, 70);
    const pC = makePlayer('Mid', TEAMS.ENEMIES, 50);

    const order = sortPlayOrder([pA, pB, pC], null, null);
    assert.equal(order[0], pB);  // 70
    assert.equal(order[1], pC);  // 50
    assert.equal(order[2], pA);  // 30
  });

  it('does not mutate the original array', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 30);
    const pB = makePlayer('B', TEAMS.ENEMIES, 70);
    const original = [pA, pB];

    const order = sortPlayOrder(original, null, null);
    assert.equal(original[0], pA);
    assert.equal(original[1], pB);
    assert.notEqual(order, original);
  });

  it('lastWinner plays earlier on panic tie (punishment)', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);

    const order = sortPlayOrder([pA, pB], pA, null);
    assert.equal(order[0], pA);  // lastWinner plays first (earlier = disadvantage)
    assert.equal(order[1], pB);
  });

  it('bidWinner plays later on panic tie (reward)', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);

    const order = sortPlayOrder([pA, pB], null, pA);
    assert.equal(order[0], pB);
    assert.equal(order[1], pA);  // bidWinner plays last (later = advantage)
  });

  it('lastWinner tiebreak takes priority over bidWinner tiebreak', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);

    // pA is both lastWinner and bidWinner — lastWinner should win
    const order = sortPlayOrder([pA, pB], pA, pA);
    assert.equal(order[0], pA);  // lastWinner forces early play
    assert.equal(order[1], pB);
  });

  it('panic difference overrides all tiebreakers', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 80);
    const pB = makePlayer('B', TEAMS.ENEMIES, 30);

    // pB is lastWinner, but pA has much higher panic
    const order = sortPlayOrder([pA, pB], pB, null);
    assert.equal(order[0], pA);  // 80 panic plays first regardless
    assert.equal(order[1], pB);  // 30 panic plays last regardless
  });

  it('handles three-way tie with lastWinner', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);
    const pC = makePlayer('C', TEAMS.ENEMIES, 50);

    const order = sortPlayOrder([pA, pB, pC], pB, null);
    assert.equal(order[0], pB);  // lastWinner plays first
  });

  it('handles three-way tie with bidWinner', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);
    const pC = makePlayer('C', TEAMS.ENEMIES, 50);

    const order = sortPlayOrder([pA, pB, pC], null, pC);
    assert.equal(order[2], pC);  // bidWinner plays last
  });

  it('handles no tiebreakers with equal panic', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);

    // With null lastWinner and bidWinner, order is stable (original order preserved)
    const order = sortPlayOrder([pA, pB], null, null);
    assert.equal(order.length, 2);
    // Both in result
    assert.ok(order.includes(pA));
    assert.ok(order.includes(pB));
  });

  it('works with single player', () => {
    const pA = makePlayer('Solo', TEAMS.ALLIES, 50);
    const order = sortPlayOrder([pA], null, null);
    assert.equal(order.length, 1);
    assert.equal(order[0], pA);
  });

  it('handles lastWinner and bidWinner being different players on same panic', () => {
    const pA = makePlayer('A', TEAMS.ALLIES, 50);
    const pB = makePlayer('B', TEAMS.ENEMIES, 50);
    const pC = makePlayer('C', TEAMS.ENEMIES, 50);

    // pA is lastWinner (plays early), pC is bidWinner (plays late)
    const order = sortPlayOrder([pA, pB, pC], pA, pC);
    assert.equal(order[0], pA);  // lastWinner → earliest
    assert.equal(order[2], pC);  // bidWinner → latest
  });

  it('mixed panic levels with tiebreakers only apply to tied players', () => {
    const pA = makePlayer('HighPanic', TEAMS.ALLIES, 80);
    const pB = makePlayer('TiedBidWinner', TEAMS.ENEMIES, 50);
    const pC = makePlayer('TiedNormal', TEAMS.ENEMIES, 50);

    const order = sortPlayOrder([pA, pB, pC], null, pB);
    assert.equal(order[0], pA);  // highest panic first
    assert.equal(order[1], pC);  // tied but not bidWinner
    assert.equal(order[2], pB);  // bidWinner plays later
  });
});
