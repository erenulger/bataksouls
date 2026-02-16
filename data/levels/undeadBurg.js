module.exports = {
  name: 'Undead Burg',
  description: 'Fight through the undead-infested burg to reach the bonfire.',
  encounters: [
    { npcSlug: 'undeadSword' },
    { npcSlug: 'undeadSpear' },
    { npcSlug: 'undeadShieldedSword', allies: ['solaire'] },
  ],
};
