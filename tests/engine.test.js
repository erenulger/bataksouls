const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runEngine, EXIT } = require('../src/engine');
const { createScene } = require('../src/scene');
const { EventBus } = require('../src/eventBus');

function makeCtx() {
  return { events: new EventBus(), currentState: null, previousState: null };
}

function makeAdapter(inputs = []) {
  let i = 0;
  return {
    getInput() { return inputs[i++]; },
    close() {},
  };
}

describe('runEngine', () => {
  it('runs a single scene to completion', async () => {
    const visited = [];
    const scene = createScene({
      entry: 'a',
      states: {
        a: { enter() { visited.push('a'); return 'b'; } },
        b: { enter() { visited.push('b'); return null; } },
      },
    });
    const ctx = makeCtx();
    await runEngine({ main: scene }, 'main', ctx, makeAdapter());
    assert.deepEqual(visited, ['a', 'b']);
  });

  it('pushes child scene and resumes parent', async () => {
    const visited = [];
    const parent = createScene({
      entry: 'p1',
      states: {
        p1: { enter() { visited.push('p1'); return { push: 'child', resume: 'p2' }; } },
        p2: { enter() { visited.push('p2'); return null; } },
      },
    });
    const child = createScene({
      entry: 'c1',
      states: {
        c1: { enter() { visited.push('c1'); return EXIT; } },
      },
    });
    const ctx = makeCtx();
    await runEngine({ parent, child }, 'parent', ctx, makeAdapter());
    assert.deepEqual(visited, ['p1', 'c1', 'p2']);
  });

  it('EXIT from root scene stops engine', async () => {
    const visited = [];
    const scene = createScene({
      entry: 'a',
      states: {
        a: { enter() { visited.push('a'); return EXIT; } },
      },
    });
    const ctx = makeCtx();
    await runEngine({ main: scene }, 'main', ctx, makeAdapter());
    assert.deepEqual(visited, ['a']);
  });

  it('nested push: grandchild → child → parent', async () => {
    const visited = [];
    const gp = createScene({
      entry: 'gp1',
      states: {
        gp1: { enter() { visited.push('gp1'); return { push: 'parent', resume: 'gp2' }; } },
        gp2: { enter() { visited.push('gp2'); return null; } },
      },
    });
    const parent = createScene({
      entry: 'p1',
      states: {
        p1: { enter() { visited.push('p1'); return { push: 'child', resume: 'p2' }; } },
        p2: { enter() { visited.push('p2'); return EXIT; } },
      },
    });
    const child = createScene({
      entry: 'c1',
      states: {
        c1: { enter() { visited.push('c1'); return EXIT; } },
      },
    });
    const ctx = makeCtx();
    await runEngine({ gp, parent, child }, 'gp', ctx, makeAdapter());
    assert.deepEqual(visited, ['gp1', 'p1', 'c1', 'p2', 'gp2']);
  });

  it('throws on unknown state within scene', async () => {
    const scene = createScene({
      entry: 'a',
      states: {
        a: { enter() { return 'nonexistent'; } },
      },
    });
    const ctx = makeCtx();
    await assert.rejects(
      () => runEngine({ main: scene }, 'main', ctx, makeAdapter()),
      /Unknown state: "nonexistent"/,
    );
  });

  it('throws on unknown scene in push', async () => {
    const scene = createScene({
      entry: 'a',
      states: {
        a: { enter() { return { push: 'missing', resume: 'a' }; } },
      },
    });
    const ctx = makeCtx();
    await assert.rejects(
      () => runEngine({ main: scene }, 'main', ctx, makeAdapter()),
      /Unknown scene: "missing"/,
    );
  });

  it('updates ctx.sceneStack each iteration', async () => {
    const stacks = [];
    const parent = createScene({
      entry: 'p1',
      states: {
        p1: { enter(ctx) { stacks.push([...ctx.sceneStack]); return { push: 'child', resume: 'p2' }; } },
        p2: { enter(ctx) { stacks.push([...ctx.sceneStack]); return null; } },
      },
    });
    const child = createScene({
      entry: 'c1',
      states: {
        c1: { enter(ctx) { stacks.push([...ctx.sceneStack]); return EXIT; } },
      },
    });
    const ctx = makeCtx();
    await runEngine({ parent, child }, 'parent', ctx, makeAdapter());
    assert.deepEqual(stacks, [
      ['parent'],
      ['parent', 'child'],
      ['parent'],
    ]);
  });

  it('inputSpec + getInput work with scenes', async () => {
    const scene = createScene({
      entry: 'a',
      states: {
        a: {
          inputSpec() { return { type: 'number', min: 1, max: 3 }; },
          enter(ctx, input) { ctx.result = input; return null; },
        },
      },
    });
    const ctx = makeCtx();
    await runEngine({ main: scene }, 'main', ctx, makeAdapter([42]));
    assert.equal(ctx.result, 42);
  });

  it('emits stateEnter with scenePath', async () => {
    const emitted = [];
    const parent = createScene({
      entry: 'p1',
      states: {
        p1: { enter() { return { push: 'child', resume: 'p2' }; } },
        p2: { enter() { return null; } },
      },
    });
    const child = createScene({
      entry: 'c1',
      states: {
        c1: { enter() { return EXIT; } },
      },
    });
    const ctx = makeCtx();
    ctx.events.on('stateEnter', (evt) => {
      emitted.push({ state: evt.state, scenePath: evt.scenePath });
    });
    await runEngine({ parent, child }, 'parent', ctx, makeAdapter());
    assert.deepEqual(emitted, [
      { state: 'p1', scenePath: 'parent' },
      { state: 'c1', scenePath: 'parent/child' },
      { state: 'p2', scenePath: 'parent' },
    ]);
  });

  it('sets ctx.currentState and ctx.previousState', async () => {
    const states = [];
    const scene = createScene({
      entry: 'a',
      states: {
        a: { enter(ctx) { states.push({ cur: ctx.currentState, prev: ctx.previousState }); return 'b'; } },
        b: { enter(ctx) { states.push({ cur: ctx.currentState, prev: ctx.previousState }); return null; } },
      },
    });
    const ctx = makeCtx();
    await runEngine({ main: scene }, 'main', ctx, makeAdapter());
    assert.equal(states[0].cur, 'a');
    assert.equal(states[0].prev, null);
    assert.equal(states[1].cur, 'b');
    assert.equal(states[1].prev, 'a');
  });
});
