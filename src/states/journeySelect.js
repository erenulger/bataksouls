const fs = require('fs');
const path = require('path');

const LEVELS_DIR = path.join(__dirname, '..', '..', 'data', 'levels');

function listLevels() {
  const files = fs.readdirSync(LEVELS_DIR).filter(f => f.endsWith('.js'));
  return files.map(f => {
    const level = require(path.join(LEVELS_DIR, f));
    return {
      slug: f.replace('.js', ''),
      name: level.name,
      description: level.description || '',
      encounterCount: level.encounters.length,
      filePath: path.join(LEVELS_DIR, f),
    };
  });
}

module.exports = {
  inputSpec(ctx) {
    const levels = listLevels();
    ctx._journeyLevels = levels;
    if (levels.length === 0) {
      return { type: 'key' };
    }
    return { type: 'number', min: 0, max: levels.length, prompt: '  Choose a journey > ' };
  },

  enter(ctx, input) {
    const levels = ctx._journeyLevels || [];

    if (levels.length === 0 || input === 0) {
      delete ctx._journeyLevels;
      return 'main-menu';
    }

    const selected = levels[input - 1];
    const levelData = require(selected.filePath);

    ctx.level = {
      name: levelData.name,
      encounters: levelData.encounters,
      currentEncounter: 0,
    };

    delete ctx._journeyLevels;
    return { push: 'level', resume: 'journey-select' };
  },
};
