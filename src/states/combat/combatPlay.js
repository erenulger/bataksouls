const { CONFIG } = require('../../constants');
const { removeFromHand } = require('../../player');
const { aiChooseLead, aiChooseFollow } = require('../../ai');

module.exports = {
  inputSpec(ctx) {
    const c = ctx.combat;
    const player = c.playOrder[c.currentPlayerIndex];
    if (!player) return null;

    if (player.isHuman) {
      return { type: 'number', min: 1, max: player.hand.length, prompt: '  Play card > ' };
    }
    return null; // AI plays automatically in enter()
  },

  async enter(ctx, input) {
    const c = ctx.combat;
    const player = c.playOrder[c.currentPlayerIndex];

    let card;
    if (player.isHuman) {
      card = player.hand[input - 1];
    } else {
      const trickCtx = {
        player,
        hand: player.hand,
        trump: c.trumpElement,
        plays: c.plays,
        players: ctx.combatPlayers,
        trick: c.trickNum,
        totalTricks: CONFIG.TRICKS_PER_ROUND,
      };
      if (c.plays.length === 0) {
        card = aiChooseLead(trickCtx);
      } else {
        card = aiChooseFollow(trickCtx);
      }
    }

    removeFromHand(player, card);
    c.plays.push({ player, card });

    await ctx.events.emit('onCardPlayed', {
      player, card, trickNum: c.trickNum, roundNum: c.roundNum, plays: [...c.plays],
    });

    c.currentPlayerIndex++;

    if (c.currentPlayerIndex < c.playOrder.length) {
      return 'combat-play';
    }

    return 'combat-trick-resolve';
  },
};
