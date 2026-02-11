const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCard, rawPower, effectivePower, computeTrickPowers } = require('../src/card');
const { ELEMENTS, CONFIG } = require('../src/constants');

describe('rawPower', () => {
  it('returns basePower at level 0', () => {
    assert.equal(rawPower({ basePower: 7, level: 0 }), 7);
  });

  it('adds level bonus', () => {
    assert.equal(rawPower({ basePower: 5, level: 3 }), 5 + 3 * CONFIG.LEVEL_POWER_BONUS);
  });
});

describe('effectivePower', () => {
  it('returns base power with no trump', () => {
    const card = { element: ELEMENTS.FIRE, basePower: 6, level: 0 };
    const { power, bonuses } = effectivePower(card, ELEMENTS.LIGHT);
    assert.equal(power, 6);
    assert.equal(bonuses.length, 0);
  });

  it('adds trump bonus when element matches', () => {
    const card = { element: ELEMENTS.FIRE, basePower: 6, level: 0 };
    const { power, bonuses } = effectivePower(card, ELEMENTS.FIRE);
    assert.equal(power, 6 + CONFIG.TRUMP_BONUS);
    assert.equal(bonuses.length, 1);
    assert.match(bonuses[0], /trump/);
  });

  it('no trump bonus when trumpElement is null', () => {
    const card = { element: ELEMENTS.FIRE, basePower: 6, level: 0 };
    const { power } = effectivePower(card, null);
    assert.equal(power, 6);
  });
});

describe('computeTrickPowers', () => {
  const ally = { team: 'allies' };
  const enemy = { team: 'enemies' };

  function makeCard(element, basePower) {
    return { element, basePower, level: 0 };
  }

  it('returns base and power fields', () => {
    const plays = [
      { player: ally, card: makeCard(ELEMENTS.FIRE, 5) },
    ];
    const result = computeTrickPowers(plays, ELEMENTS.LIGHT);
    assert.equal(result[0].base, 5);
    assert.equal(result[0].power, 5);
    assert.ok(Array.isArray(result[0].bonuses));
  });

  it('applies trump bonus', () => {
    const plays = [
      { player: ally, card: makeCard(ELEMENTS.FIRE, 5) },
    ];
    const result = computeTrickPowers(plays, ELEMENTS.FIRE);
    assert.equal(result[0].base, 5);
    assert.equal(result[0].power, 5 + CONFIG.TRUMP_BONUS);
  });

  describe('same-team same-element buff', () => {
    it('buffs both teammates with same element', () => {
      const plays = [
        { player: ally, card: makeCard(ELEMENTS.FIRE, 5) },
        { player: ally, card: makeCard(ELEMENTS.FIRE, 7) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5 + CONFIG.SAME_ELEMENT_TEAM_BUFF);
      assert.equal(result[1].power, 7 + CONFIG.SAME_ELEMENT_TEAM_BUFF);
    });

    it('no buff for different elements', () => {
      const plays = [
        { player: ally, card: makeCard(ELEMENTS.FIRE, 5) },
        { player: ally, card: makeCard(ELEMENTS.LIGHT, 7) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5);
      assert.equal(result[1].power, 7);
    });

    it('no buff for cross-team same element', () => {
      const plays = [
        { player: ally, card: makeCard(ELEMENTS.FIRE, 5) },
        { player: enemy, card: makeCard(ELEMENTS.FIRE, 7) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5);
      assert.equal(result[1].power, 7);
    });
  });

  describe('cross-team interactions', () => {
    // Light beats Dark (MYSTICAL_WHEEL)
    it('later card empowered when strong vs earlier cross-team card', () => {
      const plays = [
        { player: enemy, card: makeCard(ELEMENTS.DARK, 5) },
        { player: ally, card: makeCard(ELEMENTS.LIGHT, 6) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5); // earlier unaffected
      assert.equal(result[1].power, 6 + CONFIG.WEAKNESS_BONUS); // later empowered
    });

    it('later card weakened when weak vs earlier cross-team card', () => {
      const plays = [
        { player: enemy, card: makeCard(ELEMENTS.LIGHT, 5) },
        { player: ally, card: makeCard(ELEMENTS.DARK, 6) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5);
      assert.equal(result[1].power, 6 - CONFIG.WEAKNESS_BONUS); // weakened
    });

    it('no interaction for same-team cards', () => {
      const plays = [
        { player: ally, card: makeCard(ELEMENTS.DARK, 5) },
        { player: ally, card: makeCard(ELEMENTS.LIGHT, 6) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5);
      assert.equal(result[1].power, 6);
    });

    it('first card is never affected by later cards', () => {
      const plays = [
        { player: ally, card: makeCard(ELEMENTS.DARK, 5) },
        { player: enemy, card: makeCard(ELEMENTS.LIGHT, 6) },
      ];
      const result = computeTrickPowers(plays, null);
      assert.equal(result[0].power, 5); // first card: no change
    });
  });

  describe('stacking', () => {
    it('first interaction gives full WEAKNESS_BONUS, subsequent give +1', () => {
      // Light beats Dark, Magic beats Fire — set up two empowering interactions
      // Play order: enemy Dark, enemy Fire, ally Light (strong vs Dark), ally Magic (strong vs Fire)
      // Wait, Light doesn't beat Fire. Let me use:
      // enemy Dark (beaten by Light), enemy Bleed (beaten by Light via... no)
      // Actually Light beats Dark only. Let me use two separate interactions.
      // Use: enemy Dark, enemy Magic, ally Light (strong vs Dark, no interaction with Magic)
      // That's only 1 interaction.
      // For 2 interactions on same card: enemy Dark + enemy Bleed → ally Light (beats Dark, beaten by Bleed)
      // Light beats Dark → empower. Bleed beats Light → weaken.
      // Those are different types. For stacking, need 2 empowers on same card.
      // enemy Dark + enemy Magic → ally Light: Light beats Dark (empower). Magic beats... Magic doesn't beat Light.
      // Hmm. For 2 empowers: need the later card to beat 2 earlier cards.
      // Fire beats Poison, Fire beats... no, Fire only beats one thing in wheel.
      // But we can test with 3 plays across both wheels:
      // enemy Dark, enemy Poison → ally Light: Light beats Dark (+4 empower). Poison doesn't interact with Light. Only 1.
      // Let me think about the wheel: Light→Dark→Magic→Fire→Poison→Bleed→Light
      // So Light beats Dark only.
      // To get 2 empowers: need card that beats 2 things. But each element only beats 1 in each wheel.
      // Unless cross-wheel? beatsElement checks both wheels.
      // So a card can beat at most 1 mystical + 1 physical = 2.
      // e.g. if there's an element in both wheels... there isn't. Elements are distinct.
      // Each element beats exactly 1 other element.
      // So max empowers from different earlier cards = depends on how many enemies played the beaten element.
      // Wait — multiple enemies can play the same element!
      const plays = [
        { player: enemy, card: makeCard(ELEMENTS.DARK, 5) },
        { player: enemy, card: makeCard(ELEMENTS.DARK, 6) },
        { player: ally, card: makeCard(ELEMENTS.LIGHT, 4) },
      ];
      const result = computeTrickPowers(plays, null);
      // Light beats Dark: first interaction +4, second +1 = total +5
      assert.equal(result[2].power, 4 + CONFIG.WEAKNESS_BONUS + 1);
    });

    it('weaken stacking: first gives full penalty, subsequent give -1', () => {
      const plays = [
        { player: enemy, card: makeCard(ELEMENTS.LIGHT, 5) },
        { player: enemy, card: makeCard(ELEMENTS.LIGHT, 6) },
        { player: ally, card: makeCard(ELEMENTS.DARK, 10) },
      ];
      const result = computeTrickPowers(plays, null);
      // Dark is weak vs Light: first -4, second -1 = total -5
      assert.equal(result[2].power, 10 - CONFIG.WEAKNESS_BONUS - 1);
    });
  });
});

describe('createCard', () => {
  it('creates a card with expected fields', () => {
    const card = createCard(ELEMENTS.FIRE, 42);
    assert.equal(card.element, ELEMENTS.FIRE);
    assert.equal(card.level, 0);
    assert.equal(card.id, 42);
    assert.ok(card.basePower >= 3 && card.basePower <= 10);
    assert.ok(card.name);
  });

  it('uses provided id', () => {
    const a = createCard(ELEMENTS.LIGHT, 1);
    const b = createCard(ELEMENTS.DARK, 2);
    assert.equal(a.id, 1);
    assert.equal(b.id, 2);
  });
});
