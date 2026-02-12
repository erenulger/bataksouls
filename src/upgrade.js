const { CONFIG, BOLD, RESET } = require('./constants');
const { askNumber } = require('./input');
const { showCollection, showUpgradeResult, showSubheader } = require('./ui');

/**
 * Runs the forge upgrade loop on a snapshot of the player's collection.
 * Returns { cards, souls, changed } — the caller decides whether to apply.
 */
async function playerUpgradePhase(player) {
  showSubheader('⚒  UPGRADE FORGE  ⚒');
  console.log(`\n  Spend souls to strengthen your weapons.`);

  // Work on a deep copy so we can discard
  const snapshot = player.collection.map(c => ({ ...c }));
  let souls = player.souls;
  let changed = false;

  while (true) {
    // Show snapshot state
    showCollection({ collection: snapshot, souls });

    const canUpgrade = snapshot.some(
      c => c.level < CONFIG.MAX_LEVEL && CONFIG.upgradeCost(c.level) <= souls
    );

    if (!canUpgrade) {
      console.log(`\n  ${souls < CONFIG.upgradeCost(0)
        ? 'Not enough souls for any upgrade.'
        : 'No cards can be upgraded right now.'}`);
    }

    console.log(`\n  Enter card number to upgrade, or 0 to leave the forge.`);
    const choice = await askNumber('  > ', 0, snapshot.length);

    if (choice === 0) break;

    const card = snapshot[choice - 1];
    const cost = CONFIG.upgradeCost(card.level);

    if (card.level >= CONFIG.MAX_LEVEL) {
      console.log(`  That card is already at max level!`);
      continue;
    }
    if (souls < cost) {
      console.log(`  Not enough souls! Need ${cost}, have ${souls}.`);
      continue;
    }

    souls -= cost;
    card.level++;
    changed = true;
    showUpgradeResult(card);
  }

  return { cards: snapshot, souls, changed };
}

module.exports = { playerUpgradePhase };
