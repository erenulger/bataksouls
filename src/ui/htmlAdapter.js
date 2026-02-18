function serializeCard(card) {
  return {
    id: card.id,
    element: card.element,
    name: card.name,
    basePower: card.basePower,
    level: card.level,
  };
}

function serializePlayer(p) {
  return {
    name: p.name,
    isHuman: p.isHuman,
    team: p.team,
    hp: p.hp,
    maxHp: p.maxHp,
    panic: p.panic,
    tricksWon: p.tricksWon,
    handSize: p.handSize,
    souls: p.souls,
  };
}

function serializeCtx(state, ctx) {
  const result = {
    currentState: ctx.currentState,
    combatPlayers: (ctx.combatPlayers || []).map(serializePlayer),
  };

  if (ctx.combat) {
    const c = ctx.combat;
    result.combat = {
      roundNum: c.roundNum,
      trickNum: c.trickNum,
      trumpElement: c.trumpElement,
      currentPlayerIndex: c.currentPlayerIndex,
      currentBidderIndex: c.currentBidderIndex,
      plays: (c.plays || []).map(play => ({
        player: { name: play.player.name, isHuman: play.player.isHuman, team: play.player.team },
        card: serializeCard(play.card),
      })),
      playOrder: (c.playOrder || []).map(p => ({
        name: p.name, isHuman: p.isHuman, team: p.team,
      })),
    };
  }

  // Include human hand for states where human needs to choose a card
  if (state === 'combat-play' || state === 'combat-bid-collect') {
    const human = (ctx.combatPlayers || []).find(p => p.isHuman);
    if (human && human.hand) {
      result.humanHand = human.hand.map(serializeCard);
    }
  }

  // For result state, include outcome details
  if (state === 'combat-result') {
    result.combatResult = ctx.combatResult ? {
      playerWon: ctx.combatResult.playerWon,
      winner: ctx.combatResult.winner ? { name: ctx.combatResult.winner.name } : null,
      cause: ctx.combatResult.cause,
    } : null;
    result.playerSouls = ctx.player ? ctx.player.souls : 0;
  }

  return result;
}

function createHtmlAdapter(events, send) {
  let inputResolve = null;
  let pendingSpec = null;

  function sendMsg(type, data = {}) {
    send({ type, ...data });
  }

  // ── stateEnter ────────────────────────────────────────────────────────────
  events.on('stateEnter', async ({ state, ctx }) => {
    sendMsg('stateEnter', { state, ctx: serializeCtx(state, ctx) });
  });

  // ── Game events ───────────────────────────────────────────────────────────
  events.on('onCardPlayed', ({ player, card, plays }) => {
    sendMsg('onCardPlayed', {
      player: { name: player.name, isHuman: player.isHuman, team: player.team },
      card: serializeCard(card),
      plays: (plays || []).map(play => ({
        player: { name: play.player.name, isHuman: play.player.isHuman, team: play.player.team },
        card: serializeCard(play.card),
      })),
    });
  });

  events.on('onTrickResolved', ({ plays, trickPowers, winner, trickNum }) => {
    sendMsg('onTrickResolved', {
      plays: (plays || []).map(play => ({
        player: { name: play.player.name, isHuman: play.player.isHuman, team: play.player.team },
        card: serializeCard(play.card),
      })),
      trickPowers,
      winner: winner ? { name: winner.name, isHuman: winner.isHuman, team: winner.team } : null,
      trickNum,
    });
  });

  events.on('onDamageDealt', ({ attacker, defender, damage, oldHp, newHp }) => {
    sendMsg('onDamageDealt', {
      attacker: { name: attacker.name },
      defender: { name: defender.name },
      damage, oldHp, newHp,
    });
  });

  events.on('onAllDamageApplied', ({ players }) => {
    sendMsg('onAllDamageApplied', { players: players.map(serializePlayer) });
  });

  events.on('onPlayerDefeated', ({ player }) => {
    sendMsg('onPlayerDefeated', { player: { name: player.name, team: player.team } });
  });

  events.on('onCombatantsRemain', ({ count }) => {
    sendMsg('onCombatantsRemain', { count });
  });

  events.on('onSoulsAwarded', ({ reward, totalSouls }) => {
    sendMsg('onSoulsAwarded', { reward, totalSouls });
  });

  events.on('onEnduranceDamage', ({ player, damage, oldHp, newHp }) => {
    sendMsg('onEnduranceDamage', {
      player: { name: player.name },
      damage, oldHp, newHp,
    });
  });

  events.on('onEnduranceReshuffle', () => {
    sendMsg('onEnduranceReshuffle');
  });

  events.on('onRoundExhausted', ({ roundNum }) => {
    sendMsg('onRoundExhausted', { roundNum });
  });

  events.on('onBidResolved', ({ bids, totals, winningElement, bidWinner, oldPanics, trumpBids }) => {
    sendMsg('onBidResolved', {
      bids: (bids || []).map(b => ({
        player: { name: b.player.name },
        card: serializeCard(b.card),
        power: b.power,
      })),
      totals,
      winningElement,
      bidWinner: bidWinner ? { name: bidWinner.name } : null,
      oldPanics,
      trumpBids: (trumpBids || []).map(b => ({
        player: { name: b.player.name },
        card: serializeCard(b.card),
      })),
    });
  });

  events.on('onBidCommitted', () => {
    sendMsg('onBidCommitted');
  });

  events.on('onRoundEnd', ({ players, roundNum }) => {
    sendMsg('onRoundEnd', {
      players: players.map(serializePlayer),
      roundNum,
    });
  });

  events.on('onTrickHeader', ({ trickNum, totalTricks, trumpElement }) => {
    sendMsg('onTrickHeader', { trickNum, totalTricks, trumpElement });
  });

  events.on('onCombatEnd', ({ winner, playerWon, players, cause, defeatedEnemies }) => {
    sendMsg('onCombatEnd', {
      winner: winner ? { name: winner.name } : null,
      playerWon,
      players: players.map(serializePlayer),
      cause,
      defeatedEnemies: (defeatedEnemies || []).map(p => ({ name: p.name })),
    });
  });

  events.on('onPanicChanged', ({ player, oldPanic, newPanic, cause }) => {
    sendMsg('onPanicChanged', {
      player: { name: player.name },
      oldPanic,
      newPanic,
      cause,
    });
  });

  // ── Adapter interface ─────────────────────────────────────────────────────
  return {
    async getInput(spec) {
      pendingSpec = spec;
      sendMsg('requestInput', { spec });
      return new Promise(resolve => {
        inputResolve = resolve;
      });
    },

    deliverInput(rawValue) {
      if (!inputResolve) return;
      const spec = pendingSpec;
      let value = rawValue;
      if (spec && spec.type === 'number' && rawValue !== null && rawValue !== undefined) {
        value = parseInt(rawValue, 10);
      } else if (spec && spec.type === 'key') {
        value = null;
      }
      const resolve = inputResolve;
      inputResolve = null;
      pendingSpec = null;
      resolve(value);
    },

    close() {},
  };
}

module.exports = { createHtmlAdapter };
