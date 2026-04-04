/**
 * Payout Calculator Service
 * Calculates winnings and new balance after a round
 */

/**
 * Calculates payout for a player
 * @param {Object} params - { betAmount, didWin, oldBalance }
 * @returns {Object} { winnings, newBalance }
 */
function calculatePayout({ betAmount, didWin, oldBalance }) {
  if (typeof betAmount !== 'number' || betAmount < 0) {
    throw new Error('Invalid bet amount');
  }
  if (typeof oldBalance !== 'number' || oldBalance < 0) {
    throw new Error('Invalid old balance');
  }
  if (typeof didWin !== 'boolean') {
    throw new Error('didWin must be a boolean');
  }

  const winnings = didWin ? betAmount * 2 : 0;
  const newBalance = oldBalance + winnings;

  return { winnings, newBalance };
}

module.exports = {
  calculatePayout,
};
