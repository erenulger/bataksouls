/**
 * Step-based state machine with UI adapter.
 *
 * Each state has:
 *   - enter(ctx, input) — pure logic, returns next state name or null
 *   - inputSpec(ctx) — optional, returns input spec or null
 *
 * Flow per state:
 *   1. Emit 'stateEnter' event (adapter renders screen)
 *   2. If state needs input, adapter collects it
 *   3. Run state.enter(ctx, input) — pure logic, may emit game events
 *
 * @param {Object<string, {enter: function, inputSpec?: function}>} states
 * @param {string} initialState
 * @param {Object} ctx - Shared game context
 * @param {{getInput: function, close: function}} adapter - UI adapter
 */
async function runEngine(states, initialState, ctx, adapter) {
  let currentName = initialState;

  while (currentName) {
    const state = states[currentName];
    if (!state) {
      throw new Error(`Unknown state: "${currentName}"`);
    }

    ctx.previousState = ctx.currentState;
    ctx.currentState = currentName;

    // 1. Signal adapter to render for this state
    await ctx.events.emit('stateEnter', { state: currentName, ctx });

    // 2. Collect input if state needs it
    let input = null;
    if (state.inputSpec) {
      const spec = state.inputSpec(ctx);
      if (spec) {
        input = await adapter.getInput(spec);
      }
    }

    // 3. Run pure state logic
    const nextName = await state.enter(ctx, input);

    currentName = nextName ?? null;
  }
}

module.exports = { runEngine };
