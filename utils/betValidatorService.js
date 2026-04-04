/**
 * Bet Validator Service
 * Validates bet requests before processing
 */

/**
 * Validates a bet request
 * @param {Object} params - { userId, betAmount, slotIndex, userBalance }
 * @returns {Object} { isValid: boolean, error: string }
 */
function validateBet({ userId, betAmount, slotIndex, userBalance }) {
  // Check betAmount
  if (typeof betAmount !== 'number' || betAmount <= 0) {
    return { isValid: false, error: 'Bet amount must be a positive number' };
  }

  // Check userBalance
  if (typeof userBalance !== 'number' || userBalance < betAmount) {
    return { isValid: false, error: 'Insufficient balance' };
  }

  // Check slotIndex
  if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex > 2) {
    return { isValid: false, error: 'Invalid slot index. Must be 0, 1, or 2' };
  }

  // Check userId
  if (!userId) {
    return { isValid: false, error: 'User ID is required' };
  }

  return { isValid: true, error: null };
}

module.exports = {
  validateBet,
};
