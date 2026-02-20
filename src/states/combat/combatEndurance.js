const { TEAMS } = require('../../constants');
const { computeEnduranceDamage, checkDeaths } = require('../../combat');
const { dealHand } = require('../../player');

module.exports = {
  async enter(ctx) {
    const c = ctx.combat;
    const players = ctx.combatPlayers;
    const depleted = players.filter(p => p.hand.length === 0);

    const alliesInPlay = players.filter(p => p.team === TEAMS.ALLIES);
    const enemiesInPlay = players.filter(p => p.team === TEAMS.ENEMIES);

    // Guard: one team already eliminated (can arrive here via the
    // endurance-wait → trick-start path, which bypasses the team-size
    // check in combatTrickWait). Array.every() on an empty array is
    // vacuously true, so skip before the depleted checks misfire.
    if (alliesInPlay.length === 0 || enemiesInPlay.length === 0) {
      c.enduranceAction = 'end-round';
      return 'combat-endurance-wait';
    }

    const alliesDepleted = alliesInPlay.every(p => p.hand.length === 0);
    const enemiesDepleted = enemiesInPlay.every(p => p.hand.length === 0);

    if (alliesDepleted && enemiesDepleted) {
      // Both teams exhausted — reshuffle all, continue round
      await ctx.events.emit('onEnduranceReshuffle', {});
      players.forEach(p => dealHand(p));
      c.enduranceAction = 'reshuffle-all';
      return 'combat-endurance-wait';
    }

    if (alliesDepleted || enemiesDepleted) {
      // One entire team exhausted — apply endurance damage, then end round
      for (const p of depleted) {
        const damage = computeEnduranceDamage(p, players, c.trumpElement);
        const oldHp = p.hp;
        p.hp = Math.max(0, p.hp - damage);
        await ctx.events.emit('onEnduranceDamage', {
          player: p, damage, oldHp, newHp: p.hp,
          trickNum: c.trickNum, roundNum: c.roundNum,
        });
      }

      // Check for deaths
      const dead = checkDeaths(players);
      if (dead.length > 0) {
        c.deathOccurred = true;
        for (const deadPlayer of dead) {
          await ctx.events.emit('onPlayerDefeated', {
            player: deadPlayer, trickNum: c.trickNum, roundNum: c.roundNum, cause: 'endurance',
          });
        }
        ctx.combatPlayers = players.filter(p => p.hp > 0);
        if (ctx.combatPlayers.length < players.length) {
          await ctx.events.emit('onCombatantsRemain', { count: ctx.combatPlayers.length });
        }
      }

      await ctx.events.emit('onRoundExhausted', { roundNum: c.roundNum });
      c.enduranceAction = 'end-round';
      return 'combat-endurance-wait';
    }

    // Partial depletion — damage depleted players, reshuffle them, continue round
    for (const p of depleted) {
      const damage = computeEnduranceDamage(p, players, c.trumpElement);
      const oldHp = p.hp;
      p.hp = Math.max(0, p.hp - damage);
      await ctx.events.emit('onEnduranceDamage', {
        player: p, damage, oldHp, newHp: p.hp,
        trickNum: c.trickNum, roundNum: c.roundNum,
      });
    }

    // Check for deaths
    const dead = checkDeaths(players);
    if (dead.length > 0) {
      c.deathOccurred = true;
      for (const deadPlayer of dead) {
        await ctx.events.emit('onPlayerDefeated', {
          player: deadPlayer, trickNum: c.trickNum, roundNum: c.roundNum, cause: 'endurance',
        });
      }
      ctx.combatPlayers = players.filter(p => p.hp > 0);
      if (ctx.combatPlayers.length < players.length) {
        await ctx.events.emit('onCombatantsRemain', { count: ctx.combatPlayers.length });
      }

      // If one side eliminated, end round
      const alliesLeft = ctx.combatPlayers.filter(p => p.team === TEAMS.ALLIES);
      const enemiesLeft = ctx.combatPlayers.filter(p => p.team === TEAMS.ENEMIES);
      if (alliesLeft.length === 0 || enemiesLeft.length === 0) {
        c.enduranceAction = 'end-round';
        return 'combat-endurance-wait';
      }
    }

    // Reshuffle depleted survivors, continue round
    depleted.filter(p => p.hp > 0).forEach(p => dealHand(p));
    c.enduranceAction = 'partial';
    return 'combat-endurance-wait';
  },
};
