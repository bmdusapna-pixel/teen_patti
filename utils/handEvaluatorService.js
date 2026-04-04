/**
 * Hand Evaluator Service
 * Evaluates a 3-card hand and returns its rank and tie-breaker
 */

const HAND_RANKS = {
  'Straight Flush': 6,
  'Trail': 5,
  'Flush': 4,
  'Straight': 3,
  'Pair': 2,
  'High Card': 1,
};

/**
 * Evaluates a 3-card hand
 * @param {Array} cards - Array of 3 card objects {suit, value}
 * @returns {Object} { hand_name, rank_score, tieBreaker }
 */
function evaluateHand(cards) {
  if (!Array.isArray(cards) || cards.length !== 3) {
    throw new Error('Hand must contain exactly 3 cards');
  }

  const sortedValues = cards.map(card => card.value).sort((a, b) => b - a);
  const suits = cards.map(card => card.suit);
  const values = cards.map(card => card.value);

  // Check for Straight Flush
  if (isStraight(values) && isFlush(suits)) {
    return {
      hand_name: 'Straight Flush',
      rank_score: HAND_RANKS['Straight Flush'],
      tieBreaker: getTieBreaker(values),
    };
  }

  // Check for Trail (Three of a Kind)
  if (isTrail(values)) {
    return {
      hand_name: 'Trail',
      rank_score: HAND_RANKS['Trail'],
      tieBreaker: getTieBreaker(values),
    };
  }

  // Check for Flush
  if (isFlush(suits)) {
    return {
      hand_name: 'Flush',
      rank_score: HAND_RANKS['Flush'],
      tieBreaker: getTieBreaker(values),
    };
  }

  // Check for Straight
  if (isStraight(values)) {
    return {
      hand_name: 'Straight',
      rank_score: HAND_RANKS['Straight'],
      tieBreaker: getTieBreaker(values),
    };
  }

  // Check for Pair
  if (isPair(values)) {
    return {
      hand_name: 'Pair',
      rank_score: HAND_RANKS['Pair'],
      tieBreaker: getTieBreaker(values),
    };
  }

  // High Card
  return {
    hand_name: 'High Card',
    rank_score: HAND_RANKS['High Card'],
    tieBreaker: getTieBreaker(values),
  };
}

/**
 * Checks if all cards have the same suit
 * @param {Array} suits - Array of suit strings
 * @returns {boolean}
 */
function isFlush(suits) {
  return suits.every(suit => suit === suits[0]);
}

/**
 * Checks if values form a straight (consecutive)
 * Handles Ace as 1 or 14
 * @param {Array} values - Array of card values
 * @returns {boolean}
 */
function isStraight(values) {
  const sorted = [...values].sort((a, b) => a - b);
  // Check normal straight
  if (sorted[2] - sorted[0] === 2 && sorted[1] - sorted[0] === 1) {
    return true;
  }
  // Check for A23 (Ace low)
  if (sorted.includes(1) && sorted.includes(2) && sorted.includes(3)) {
    return true;
  }
  return false;
}

/**
 * Checks if all three cards have the same value
 * @param {Array} values - Array of card values
 * @returns {boolean}
 */
function isTrail(values) {
  return values[0] === values[1] && values[1] === values[2];
}

/**
 * Checks if two cards have the same value
 * @param {Array} values - Array of card values
 * @returns {boolean}
 */
function isPair(values) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.values(counts).includes(2);
}

/**
 * Returns tie-breaker array: sorted values descending, Ace as 14
 * @param {Array} values - Array of card values
 * @returns {Array} Sorted descending values
 */
function getTieBreaker(values) {
  return values.map(v => v === 1 ? 14 : v).sort((a, b) => b - a);
}

module.exports = {
  evaluateHand,
  HAND_RANKS,
};
