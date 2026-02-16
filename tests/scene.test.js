const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createScene, EXIT } = require('../src/scene');

describe('createScene', () => {
  it('creates a frozen scene with states and entry', () => {
    const s = createScene({
      states: { a: { enter() { return null; } } },
      entry: 'a',
    });
    assert.equal(s.entry, 'a');
    assert.ok(s.states.a);
    assert.ok(Object.isFrozen(s));
  });

  it('throws if entry state is not in states', () => {
    assert.throws(
      () => createScene({ states: { a: {} }, entry: 'missing' }),
      /not found in states/,
    );
  });

  it('throws if states is missing', () => {
    assert.throws(
      () => createScene({ entry: 'a' }),
      /requires a states object/,
    );
  });

  it('throws if entry is missing', () => {
    assert.throws(
      () => createScene({ states: { a: {} } }),
      /not found in states/,
    );
  });
});

describe('EXIT constant', () => {
  it('equals __exit__', () => {
    assert.equal(EXIT, '__exit__');
  });
});
