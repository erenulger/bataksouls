const { CONFIG, AI_TYPES } = require('./constants');
const { rawPower } = require('./card');
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

function aiUpgradePhase(player) {
  showSubheader(`${player.name} visits the forge...`);

  switch (player.aiType) {
    case AI_TYPES.AGGRESSIVE:
      aiUpgradeAggressive(player);
      break;
    case AI_TYPES.DEFENSIVE:
      aiUpgradeDefensive(player);
      break;
    case AI_TYPES.CHAOTIC:
      aiUpgradeChaotic(player);
      break;
  }
}

function aiUpgradeAggressive(player) {
  // Upgrade strongest cards first
  while (true) {
    const upgradable = player.collection
      .filter(c => c.level < CONFIG.MAX_LEVEL && CONFIG.upgradeCost(c.level) <= player.souls)
      .sort((a, b) => rawPower(b) - rawPower(a));

    if (upgradable.length === 0) break;

    const card = upgradable[0];
    player.souls -= CONFIG.upgradeCost(card.level);
    card.level++;
    showUpgradeResult(card);
  }
}

function aiUpgradeDefensive(player) {
  // Spread upgrades evenly — upgrade lowest-level card
  while (true) {
    const upgradable = player.collection
      .filter(c => c.level < CONFIG.MAX_LEVEL && CONFIG.upgradeCost(c.level) <= player.souls)
      .sort((a, b) => a.level - b.level);

    if (upgradable.length === 0) break;

    const card = upgradable[0];
    player.souls -= CONFIG.upgradeCost(card.level);
    card.level++;
    showUpgradeResult(card);
  }
}

function aiUpgradeChaotic(player) {
  // Random upgrades
  while (true) {
    const upgradable = player.collection
      .filter(c => c.level < CONFIG.MAX_LEVEL && CONFIG.upgradeCost(c.level) <= player.souls);

    if (upgradable.length === 0) break;

    const card = upgradable[Math.floor(Math.random() * upgradable.length)];
    player.souls -= CONFIG.upgradeCost(card.level);
    card.level++;
    showUpgradeResult(card);
  }
}

module.exports = { playerUpgradePhase, aiUpgradePhase };
