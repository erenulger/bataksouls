const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveTrick } = require('../src/trick');
const { ELEMENTS, CONFIG } = require('../src/constants');

function makeCard(element, basePower) {
  return { element, basePower, level: 0 };
}

const ally = { team: 'allies' };
const enemy = { team: 'enemies' };

describe('resolveTrick', () => {
  it('highest power wins', () => {
    const plays = [
      { player: { ...ally, name: 'A' }, card: makeCard(ELEMENTS.FIRE, 5) },
      { player: { ...enemy, name: 'B' }, card: makeCard(ELEMENTS.LIGHT, 9) },
    ];
    const result = resolveTrick(plays, null);
    assert.equal(result.winner.name, 'B');
    assert.equal(result.winningPower, 9);
  });

  it('returns trickPowers array', () => {
    const plays = [
      { player: { ...ally, name: 'A' }, card: makeCard(ELEMENTS.FIRE, 5) },
    ];
    const result = resolveTrick(plays, null);
    assert.equal(result.trickPowers.length, 1);
    assert.equal(result.trickPowers[0].power, 5);
  });

  describe('tie-breaking', () => {
    it('trump card wins ties', () => {
      const plays = [
        { player: { ...ally, name: 'A' }, card: makeCard(ELEMENTS.FIRE, 7) },
        { player: { ...enemy, name: 'B' }, card: makeCard(ELEMENTS.LIGHT, 7) },
      ];
      const result = resolveTrick(plays, ELEMENTS.LIGHT);
      // B has Light which is trump, both base 7 but B gets +4 trump
      assert.equal(result.winner.name, 'B');
    });

    it('first player wins when fully tied', () => {
      const plays = [
        { player: { ...ally, name: 'A' }, card: makeCard(ELEMENTS.FIRE, 7) },
        { player: { ...ally, name: 'B' }, card: makeCard(ELEMENTS.FIRE, 7) },
      ];
      // Same team, same element, same power — team buff makes both 7+2=9
      const result = resolveTrick(plays, null);
      assert.equal(result.winner.name, 'A'); // first player wins tie
    });
  });

  it('elemental interactions affect winner', () => {
    // enemy Dark(8) vs ally Light(6): Light gets +4 empower = 10 > 8
    const plays = [
      { player: { ...enemy, name: 'Dark' }, card: makeCard(ELEMENTS.DARK, 8) },
      { player: { ...ally, name: 'Light' }, card: makeCard(ELEMENTS.LIGHT, 6) },
    ];
    const result = resolveTrick(plays, null);
    assert.equal(result.winner.name, 'Light');
    assert.equal(result.winningPower, 6 + CONFIG.WEAKNESS_BONUS);
  });
});
