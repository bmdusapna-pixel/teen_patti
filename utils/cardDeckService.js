/**
 * Card Deck Service
 * Handles creating, shuffling, and dealing cards for Teen Patti
 */

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // 1=Ace, 11=J, 12=Q, 13=K

/**
 * Creates a standard 52-card deck
 * @returns {Array} Array of card objects {suit, value}
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

/**
 * Shuffles the deck using Fisher-Yates algorithm
 * @param {Array} deck - The deck to shuffle
 * @returns {Array} Shuffled deck
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals 9 cards into 3 slots (3 cards each)
 * @returns {Array} Array of 3 slot objects, each with cards array
 */
function dealCards() {
  const deck = createDeck();
  const shuffledDeck = shuffleDeck(deck);

  const slots = [];
  for (let i = 0; i < 3; i++) {
    const cards = shuffledDeck.slice(i * 3, (i + 1) * 3);
    slots.push({ cards });
  }

  return slots;
}

module.exports = {
  createDeck,
  shuffleDeck,
  dealCards,
};