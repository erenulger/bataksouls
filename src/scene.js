const EXIT = '__exit__';

function createScene({ states, entry }) {
  if (!states || typeof states !== 'object') {
    throw new Error('Scene requires a states object');
  }
  if (!entry || !states[entry]) {
    throw new Error(`Scene entry "${entry}" not found in states`);
  }
  return Object.freeze({ states, entry });
}

module.exports = { createScene, EXIT };
