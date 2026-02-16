const { CONFIG, TEAMS } = require('../../constants');
const { resolveTrick } = require('../../trick');
const { computeDamage, applyDamage, checkDeaths } = require('../../combat');

module.exports = {
  async enter(ctx) {
    const c = ctx.combat;
    const players = ctx.combatPlayers;

    // Resolve trick winner
    const result = resolveTrick(c.plays, c.trumpElement);

    await ctx.events.emit('onTrickResolved', {
      winner: result.winner,
      winningCard: result.winningCard,
      winningPower: result.winningPower,
      trickPowers: result.trickPowers,
      plays: c.plays,
      trickNum: c.trickNum,
      roundNum: c.roundNum,
      trumpElement: c.trumpElement,
    });

    // Update winner stats
    result.winner.tricksWon++;
    const panicBefore = result.winner.panic;
    result.winner.panic += CONFIG.TRICK_WIN_PANIC_INCREASE;
    await ctx.events.emit('onPanicChanged', {
      player: result.winner,
      oldPanic: panicBefore,
      newPanic: result.winner.panic,
      cause: 'trick-win',
    });

    c.lastWinner = result.winner;

    // Damage phase
    const damages = computeDamage(c.plays, result.trickPowers);
    const applied = applyDamage(damages);
    for (const d of applied) {
      await ctx.events.emit('onDamageDealt', {
        attacker: d.attacker, defender: d.defender, damage: d.damage,
        oldHp: d.oldHp, newHp: d.newHp, trickNum: c.trickNum, roundNum: c.roundNum,
      });
    }
    await ctx.events.emit('onAllDamageApplied', { players });

    // Check for deaths
    const dead = checkDeaths(players);
    if (dead.length > 0) {
      c.deathOccurred = true;
      for (const deadPlayer of dead) {
        await ctx.events.emit('onPlayerDefeated', {
          player: deadPlayer, trickNum: c.trickNum, roundNum: c.roundNum,
        });
      }
      ctx.combatPlayers = players.filter(p => p.hp > 0);
      if (ctx.combatPlayers.length < players.length) {
        await ctx.events.emit('onCombatantsRemain', { count: ctx.combatPlayers.length });
      }
    }

    return 'combat-trick-wait';
  },
};
