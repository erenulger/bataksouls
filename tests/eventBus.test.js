const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventBus } = require('../src/eventBus');

describe('EventBus', () => {
  it('calls listener when event is emitted', async () => {
    const bus = new EventBus();
    let received = null;
    bus.on('test', (data) => { received = data; });
    await bus.emit('test', { value: 42 });
    assert.deepEqual(received, { value: 42 });
  });

  it('supports multiple listeners on same event', async () => {
    const bus = new EventBus();
    const calls = [];
    bus.on('test', () => calls.push('a'));
    bus.on('test', () => calls.push('b'));
    await bus.emit('test');
    assert.deepEqual(calls, ['a', 'b']);
  });

  it('does not call listeners for other events', async () => {
    const bus = new EventBus();
    let called = false;
    bus.on('other', () => { called = true; });
    await bus.emit('test');
    assert.equal(called, false);
  });

  it('removes listener with off', async () => {
    const bus = new EventBus();
    const calls = [];
    const fn = () => calls.push('x');
    bus.on('test', fn);
    await bus.emit('test');
    bus.off('test', fn);
    await bus.emit('test');
    assert.deepEqual(calls, ['x']);
  });

  it('off is safe when event has no listeners', () => {
    const bus = new EventBus();
    bus.off('nonexistent', () => {});
  });

  it('emit is safe when event has no listeners', async () => {
    const bus = new EventBus();
    await bus.emit('nonexistent', { data: 1 });
  });

  it('same function registered twice is only called once', async () => {
    const bus = new EventBus();
    let count = 0;
    const fn = () => count++;
    bus.on('test', fn);
    bus.on('test', fn);
    await bus.emit('test');
    assert.equal(count, 1);
  });

  it('listeners receive undefined when no data is passed', async () => {
    const bus = new EventBus();
    let received = 'sentinel';
    bus.on('test', (data) => { received = data; });
    await bus.emit('test');
    assert.equal(received, undefined);
  });
});
