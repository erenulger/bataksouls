const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ELEMENTS, MYSTICAL, PHYSICAL, ALL_ELEMENTS,
  MYSTICAL_WHEEL, PHYSICAL_WHEEL, beatsElement,
} = require('../src/constants');

describe('beatsElement', () => {
  it('mystical wheel: each element beats the next', () => {
    assert.ok(beatsElement(ELEMENTS.LIGHT, ELEMENTS.DARK));
    assert.ok(beatsElement(ELEMENTS.DARK, ELEMENTS.MAGIC));
    assert.ok(beatsElement(ELEMENTS.MAGIC, ELEMENTS.FIRE));
    assert.ok(beatsElement(ELEMENTS.FIRE, ELEMENTS.POISON));
    assert.ok(beatsElement(ELEMENTS.POISON, ELEMENTS.BLEED));
    assert.ok(beatsElement(ELEMENTS.BLEED, ELEMENTS.LIGHT));
  });

  it('physical wheel: each element beats the next', () => {
    assert.ok(beatsElement(ELEMENTS.ARMOR, ELEMENTS.SLASH));
    assert.ok(beatsElement(ELEMENTS.SLASH, ELEMENTS.PIERCE));
    assert.ok(beatsElement(ELEMENTS.PIERCE, ELEMENTS.ARMOR));
  });

  it('does not beat in reverse', () => {
    assert.ok(!beatsElement(ELEMENTS.DARK, ELEMENTS.LIGHT));
    assert.ok(!beatsElement(ELEMENTS.SLASH, ELEMENTS.ARMOR));
  });

  it('does not beat same element', () => {
    assert.ok(!beatsElement(ELEMENTS.FIRE, ELEMENTS.FIRE));
  });

  it('no cross-wheel interactions', () => {
    assert.ok(!beatsElement(ELEMENTS.FIRE, ELEMENTS.ARMOR));
    assert.ok(!beatsElement(ELEMENTS.ARMOR, ELEMENTS.LIGHT));
  });
});

describe('element lists', () => {
  it('MYSTICAL has 6 elements', () => {
    assert.equal(MYSTICAL.length, 6);
  });

  it('PHYSICAL has 3 elements', () => {
    assert.equal(PHYSICAL.length, 3);
  });

  it('ALL_ELEMENTS is MYSTICAL + PHYSICAL', () => {
    assert.equal(ALL_ELEMENTS.length, 9);
    assert.deepEqual(ALL_ELEMENTS, [...MYSTICAL, ...PHYSICAL]);
  });

  it('wheels cover all elements in their group', () => {
    MYSTICAL.forEach(el => {
      assert.ok(el in MYSTICAL_WHEEL, `${el} missing from MYSTICAL_WHEEL`);
    });
    PHYSICAL.forEach(el => {
      assert.ok(el in PHYSICAL_WHEEL, `${el} missing from PHYSICAL_WHEEL`);
    });
  });
});
