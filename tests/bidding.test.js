const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TEAMS, ELEMENTS, CONFIG } = require('../src/constants');
const { EventBus } = require('../src/eventBus');
const { tallyBids, determineWinningElement, determineBidWinner, applyBidPanicReduction } = require('../src/bidding');

function makePlayer(name, team, panic = 50) {
  return { name, team, hp: 100, maxHp: 100, isHuman: false, hand: [], panic, tricksWon: 0 };
}

function makeCard(element, basePower, level = 0) {
  return { id: Math.random(), element, basePower, level, name: 'TestCard' };
}

function makeBid(player, card, power) {
  return { player, card, power };
}

// ── tallyBids ──

describe('tallyBids', () => {
  it('sums power by element', () => {
    const bids = [
      makeBid(null, makeCard(ELEMENTS.FIRE, 5), 5),
      makeBid(null, makeCard(ELEMENTS.FIRE, 7), 7),
      makeBid(null, makeCard(ELEMENTS.LIGHT, 4), 4),
    ];
    const totals = tallyBids(bids);
    assert.equal(totals[ELEMENTS.FIRE], 12);
    assert.equal(totals[ELEMENTS.LIGHT], 4);
  });

  it('handles single bid', () => {
    const bids = [makeBid(null, makeCard(ELEMENTS.DARK, 6), 6)];
    const totals = tallyBids(bids);
    assert.equal(totals[ELEMENTS.DARK], 6);
    assert.equal(Object.keys(totals).length, 1);
  });

  it('handles all different elements', () => {
    const bids = [
      makeBid(null, makeCard(ELEMENTS.FIRE, 3), 3),
      makeBid(null, makeCard(ELEMENTS.LIGHT, 5), 5),
      makeBid(null, makeCard(ELEMENTS.SLASH, 8), 8),
    ];
    const totals = tallyBids(bids);
    assert.equal(totals[ELEMENTS.FIRE], 3);
    assert.equal(totals[ELEMENTS.LIGHT], 5);
    assert.equal(totals[ELEMENTS.SLASH], 8);
  });

  it('returns empty object for empty bids', () => {
    const totals = tallyBids([]);
    assert.deepEqual(totals, {});
  });
});

// ── determineWinningElement ──

describe('determineWinningElement', () => {
  it('picks the element with highest total', () => {
    const totals = { [ELEMENTS.FIRE]: 12, [ELEMENTS.LIGHT]: 4, [ELEMENTS.DARK]: 8 };
    assert.equal(determineWinningElement(totals), ELEMENTS.FIRE);
  });

  it('picks among tied elements (random but always one of the tied)', () => {
    const totals = { [ELEMENTS.FIRE]: 10, [ELEMENTS.LIGHT]: 10 };
    const result = determineWinningElement(totals);
    assert.ok(result === ELEMENTS.FIRE || result === ELEMENTS.LIGHT);
  });

  it('returns the only element when just one', () => {
    const totals = { [ELEMENTS.SLASH]: 7 };
    assert.equal(determineWinningElement(totals), ELEMENTS.SLASH);
  });
});

// ── determineBidWinner ──

describe('determineBidWinner', () => {
  it('picks player with highest power on winning element', () => {
    const pA = makePlayer('Ally', TEAMS.ALLIES);
    const pB = makePlayer('Enemy', TEAMS.ENEMIES);
    const bids = [
      makeBid(pA, makeCard(ELEMENTS.FIRE, 5), 5),
      makeBid(pB, makeCard(ELEMENTS.FIRE, 8), 8),
    ];
    const { bidWinner, trumpBids } = determineBidWinner(bids, ELEMENTS.FIRE);
    assert.equal(bidWinner, pB);
    assert.equal(trumpBids.length, 2);
  });

  it('only considers bids on winning element', () => {
    const pA = makePlayer('Ally', TEAMS.ALLIES);
    const pB = makePlayer('Enemy', TEAMS.ENEMIES);
    const bids = [
      makeBid(pA, makeCard(ELEMENTS.FIRE, 5), 5),
      makeBid(pB, makeCard(ELEMENTS.LIGHT, 10), 10),  // different element, not considered
    ];
    const { bidWinner, trumpBids } = determineBidWinner(bids, ELEMENTS.FIRE);
    assert.equal(bidWinner, pA);
    assert.equal(trumpBids.length, 1);
  });

  it('handles tie on winning element (random but valid)', () => {
    const pA = makePlayer('Ally', TEAMS.ALLIES);
    const pB = makePlayer('Enemy', TEAMS.ENEMIES);
    const bids = [
      makeBid(pA, makeCard(ELEMENTS.FIRE, 7), 7),
      makeBid(pB, makeCard(ELEMENTS.FIRE, 7), 7),
    ];
    const { bidWinner } = determineBidWinner(bids, ELEMENTS.FIRE);
    assert.ok(bidWinner === pA || bidWinner === pB);
  });

  it('returns trumpBids filtered to winning element', () => {
    const pA = makePlayer('Ally', TEAMS.ALLIES);
    const pB = makePlayer('Enemy', TEAMS.ENEMIES);
    const pC = makePlayer('Enemy2', TEAMS.ENEMIES);
    const bids = [
      makeBid(pA, makeCard(ELEMENTS.FIRE, 5), 5),
      makeBid(pB, makeCard(ELEMENTS.FIRE, 8), 8),
      makeBid(pC, makeCard(ELEMENTS.DARK, 10), 10),
    ];
    const { trumpBids } = determineBidWinner(bids, ELEMENTS.FIRE);
    assert.equal(trumpBids.length, 2);
    assert.ok(trumpBids.every(b => b.card.element === ELEMENTS.FIRE));
  });
});

// ── applyBidPanicReduction ──

describe('applyBidPanicReduction', () => {
  it('reduces winner panic by BID_WINNER_PANIC_REDUCTION', () => {
    const winner = makePlayer('Winner', TEAMS.ALLIES, 50);
    const events = new EventBus();
    const trumpBids = [makeBid(winner, makeCard(ELEMENTS.FIRE, 8), 8)];

    applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(winner.panic, 50 - CONFIG.BID_WINNER_PANIC_REDUCTION);
  });

  it('reduces runner-up panic by 10', () => {
    const winner = makePlayer('Winner', TEAMS.ALLIES, 50);
    const runnerUp = makePlayer('RunnerUp', TEAMS.ENEMIES, 60);
    const events = new EventBus();
    const trumpBids = [
      makeBid(winner, makeCard(ELEMENTS.FIRE, 8), 8),
      makeBid(runnerUp, makeCard(ELEMENTS.FIRE, 5), 5),
    ];

    applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(winner.panic, 50 - CONFIG.BID_WINNER_PANIC_REDUCTION);
    assert.equal(runnerUp.panic, 50);  // 60 - 10
  });

  it('clamps panic at PANIC_FLOOR for winner', () => {
    const winner = makePlayer('Winner', TEAMS.ALLIES, 15);
    const events = new EventBus();
    const trumpBids = [makeBid(winner, makeCard(ELEMENTS.FIRE, 8), 8)];

    applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(winner.panic, CONFIG.PANIC_FLOOR);
  });

  it('clamps panic at PANIC_FLOOR for runner-up', () => {
    const runnerUp = makePlayer('RunnerUp', TEAMS.ENEMIES, 12);
    const winner = makePlayer('Winner', TEAMS.ALLIES, 50);
    const events = new EventBus();
    const trumpBids = [
      makeBid(winner, makeCard(ELEMENTS.FIRE, 8), 8),
      makeBid(runnerUp, makeCard(ELEMENTS.FIRE, 5), 5),
    ];

    applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(runnerUp.panic, CONFIG.PANIC_FLOOR);
  });

  it('emits onPanicChanged for winner with cause bid-winner', () => {
    const winner = makePlayer('Winner', TEAMS.ALLIES, 50);
    const events = new EventBus();
    const trumpBids = [makeBid(winner, makeCard(ELEMENTS.FIRE, 8), 8)];
    const emitted = [];
    events.on('onPanicChanged', e => emitted.push(e));

    applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].cause, 'bid-winner');
    assert.equal(emitted[0].oldPanic, 50);
    assert.equal(emitted[0].newPanic, 50 - CONFIG.BID_WINNER_PANIC_REDUCTION);
  });

  it('emits onPanicChanged for runner-ups with cause bid-runner-up', () => {
    const winner = makePlayer('Winner', TEAMS.ALLIES, 50);
    const r1 = makePlayer('R1', TEAMS.ENEMIES, 60);
    const r2 = makePlayer('R2', TEAMS.ENEMIES, 70);
    const events = new EventBus();
    const trumpBids = [
      makeBid(winner, makeCard(ELEMENTS.FIRE, 10), 10),
      makeBid(r1, makeCard(ELEMENTS.FIRE, 5), 5),
      makeBid(r2, makeCard(ELEMENTS.FIRE, 3), 3),
    ];
    const emitted = [];
    events.on('onPanicChanged', e => emitted.push(e));

    applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(emitted.length, 3);
    assert.equal(emitted[0].cause, 'bid-winner');
    assert.equal(emitted[1].cause, 'bid-runner-up');
    assert.equal(emitted[2].cause, 'bid-runner-up');
  });

  it('returns old panic values', () => {
    const winner = makePlayer('Winner', TEAMS.ALLIES, 50);
    const runnerUp = makePlayer('RunnerUp', TEAMS.ENEMIES, 60);
    const events = new EventBus();
    const trumpBids = [
      makeBid(winner, makeCard(ELEMENTS.FIRE, 8), 8),
      makeBid(runnerUp, makeCard(ELEMENTS.FIRE, 5), 5),
    ];

    const oldPanics = applyBidPanicReduction(winner, trumpBids, events);
    assert.equal(oldPanics['Winner'], 50);
    assert.equal(oldPanics['RunnerUp'], 60);
  });
});
