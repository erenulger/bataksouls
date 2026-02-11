const { CONFIG } = require('./constants');
const { askNumber } = require('./input');
const { showCollection, showUpgradeResult, showSubheader } = require('./ui');

async function playerUpgradePhase(player) {
  showSubheader('⚒  UPGRADE FORGE  ⚒');
  console.log(`\n  Spend souls to strengthen your weapons.`);

  while (true) {
    showCollection(player);

    if (player.souls < CONFIG.upgradeCost(0)) {
      console.log(`\n  Not enough souls for any upgrade.`);
      break;
    }

    const upgradable = player.collection
      .map((c, i) => ({ card: c, index: i }))
      .filter(({ card }) => card.level < CONFIG.MAX_LEVEL && CONFIG.upgradeCost(card.level) <= player.souls);

    if (upgradable.length === 0) {
      console.log(`\n  No cards can be upgraded right now.`);
      break;
    }

    console.log(`\n  Enter card number to upgrade, or 0 to leave the forge.`);
    const choice = await askNumber('  > ', 0, player.collection.length);

    if (choice === 0) break;

    const card = player.collection[choice - 1];
    const cost = CONFIG.upgradeCost(card.level);

    if (card.level >= CONFIG.MAX_LEVEL) {
      console.log(`  That card is already at max level!`);
      continue;
    }
    if (player.souls < cost) {
      console.log(`  Not enough souls! Need ${cost}, have ${player.souls}.`);
      continue;
    }

    player.souls -= cost;
    card.level++;
    showUpgradeResult(card);
  }
}

module.exports = { playerUpgradePhase };
