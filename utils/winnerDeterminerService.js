/**
 * Winner Determiner Service
 * Determines the winning slot based on hand rankings and pot amounts
 * Rule: The slot with highest bet amount never wins
 */

const { evaluateHand } = require('./handEvaluatorService');

/**
 * Determines the winner from 3 slots
 * @param {Array} slots - Array of 3 slot objects: { cards: [...], pot: number }
 * @returns {Object} { winningSlotIndex, losingSlots: [index1, index2] }
 */
function determineWinner(slots) {
  if (!Array.isArray(slots) || slots.length !== 3) {
    throw new Error('Must provide exactly 3 slots');
  }

  // Evaluate each hand
  const evaluatedSlots = slots.map((slot, index) => ({
    index,
    pot: slot.pot,
    evaluation: evaluateHand(slot.cards),
  }));

  // Find the slot with highest pot
  const highestPotSlot = evaluatedSlots.reduce((max, slot) =>
    slot.pot > max.pot ? slot : max
  );

  // Eligible slots: all except the highest pot slot
  const eligibleSlots = evaluatedSlots.filter(slot => slot.index !== highestPotSlot.index);

  if (eligibleSlots.length === 0) {
    throw new Error('No eligible slots to win');
  }

  // Find the winner among eligible slots
  const winner = eligibleSlots.reduce((best, current) => {
    if (current.evaluation.rank_score > best.evaluation.rank_score) {
      return current;
    } else if (current.evaluation.rank_score === best.evaluation.rank_score) {
      // Compare tie-breakers
      for (let i = 0; i < current.evaluation.tieBreaker.length; i++) {
        if (current.evaluation.tieBreaker[i] > best.evaluation.tieBreaker[i]) {
          return current;
        } else if (current.evaluation.tieBreaker[i] < best.evaluation.tieBreaker[i]) {
          return best;
        }
      }
      return best; // If tie, keep the first one
    }
    return best;
  });

  const losingSlots = [0, 1, 2].filter(i => i !== winner.index);

  return {
    winningSlotIndex: winner.index,
    losingSlots,
  };
}

module.exports = {
  determineWinner,
};
