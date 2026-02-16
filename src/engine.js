const { EXIT } = require('./scene');

/**
 * Stack-based state machine with scenes.
 *
 * Each scene is { states: {name → stateObj}, entry: 'stateName' }.
 * State return values:
 *   - 'stateName'              — intra-scene transition
 *   - null                     — stop engine entirely
 *   - '__exit__'               — pop current scene, resume parent
 *   - { push: 'sceneName', resume: 'stateName' } — push child scene
 *
 * @param {Object<string, Scene>} scenes - Scene registry
 * @param {string} initialSceneName - First scene to enter
 * @param {Object} ctx - Shared game context
 * @param {{getInput: function, close: function}} adapter - UI adapter
 */
async function runEngine(scenes, initialSceneName, ctx, adapter) {
  const stack = [];

  function pushScene(sceneName, resumeState) {
    const scene = scenes[sceneName];
    if (!scene) {
      throw new Error(`Unknown scene: "${sceneName}"`);
    }
    stack.push({ sceneName, scene, resumeState });
    return scene.entry;
  }

  let currentName = pushScene(initialSceneName, null);

  while (currentName) {
    const frame = stack[stack.length - 1];
    const state = frame.scene.states[currentName];
    if (!state) {
      throw new Error(`Unknown state: "${currentName}" in scene "${frame.sceneName}"`);
    }

    ctx.previousState = ctx.currentState;
    ctx.currentState = currentName;
    ctx.sceneStack = stack.map(f => f.sceneName);

    // 1. Signal adapter to render for this state
    const scenePath = stack.map(f => f.sceneName).join('/');
    await ctx.events.emit('stateEnter', { state: currentName, ctx, scenePath });

    // 2. Collect input if state needs it
    let input = null;
    if (state.inputSpec) {
      const spec = state.inputSpec(ctx);
      if (spec) {
        input = await adapter.getInput(spec);
      }
    }

    // 3. Run pure state logic
    const result = await state.enter(ctx, input);

    // 4. Interpret return value
    if (result === null || result === undefined) {
      // Stop engine entirely
      currentName = null;
    } else if (result === EXIT) {
      // Pop current scene; resumeState lives on the popped frame
      const popped = stack.pop();
      if (stack.length === 0) {
        currentName = null;
      } else {
        currentName = popped.resumeState;
      }
    } else if (typeof result === 'object' && result.push) {
      // Push child scene
      currentName = pushScene(result.push, result.resume);
    } else {
      // Normal intra-scene transition
      currentName = result;
    }
  }
}

module.exports = { runEngine, EXIT };
