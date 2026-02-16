/**
 * Sort play order by panic descending (highest panic = plays earliest = disadvantage).
 * Tiebreakers: lastWinner plays earlier (punishment), bidWinner plays later (reward).
 */
function sortPlayOrder(players, lastWinner, bidWinner) {
  return [...players].sort((a, b) =>
    b.panic - a.panic
    || (a === lastWinner ? -1 : b === lastWinner ? 1 : 0)
    || (a === bidWinner ? 1 : b === bidWinner ? -1 : 0)
  );
}

module.exports = { sortPlayOrder };
