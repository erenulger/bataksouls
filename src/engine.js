/**
 * Minimal state machine for terminal-based game.
 * Each state has enter(ctx) that returns next state name or null to exit.
 *
 * @param {Object<string, {enter: function, exit?: function}>} states
 * @param {string} initialState
 * @param {Object} ctx - Shared game context
 */
async function runEngine(states, initialState, ctx) {
  let currentName = initialState;

  while (currentName) {
    const state = states[currentName];
    if (!state) {
      throw new Error(`Unknown state: "${currentName}"`);
    }

    ctx.previousState = ctx.currentState;
    ctx.currentState = currentName;

    const nextName = await state.enter(ctx);

    if (state.exit) {
      await state.exit(ctx);
    }

    currentName = nextName;
  }
}

module.exports = { runEngine };
