const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    suit: {
      type: String,
      enum: ['spades', 'hearts', 'diamonds', 'clubs'],
      required: true,
    },
    value: {
      type: Number,
      min: 1,
      max: 13,
      required: true,
    },
  },
  { _id: false }
);

const slotDataSchema = new mongoose.Schema(
  {
    slot_index: {
      type: Number,
      min: 0,
      max: 2,
      required: true,
    },
    cards: {
      type: [cardSchema],
      required: true,
    },
    hand_name: {
      type: String,
      enum: ['Straight Flush', 'Trail', 'Flush', 'Straight', 'Pair', 'High Card'],
      required: true,
    },
    pot: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  {
    room_id: {
      type: String,
      required: true,
    },
    round_number: {
      type: Number,
      required: true,
    },
    winner_slot_index: {
      type: Number,
      min: 0,
      max: 2,
      default: 0, // Will be updated when winner is determined
    },
    winner_hand_name: {
      type: String,
      default: null, // Will be set when winner is determined
    },
    slots_data: {
      type: [slotDataSchema],
      default: [], // Will be updated when cards are revealed
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    ended_at: {
      type: Date,
      default: null, // Will be set when round ends
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Round', roundSchema);
