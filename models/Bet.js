const mongoose = require('mongoose');

const betSchema = new mongoose.Schema(
  {
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slot_index: {
      type: Number,
      min: 0,
      max: 2,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    won: {
      type: Boolean,
      required: true,
    },
    winnings: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    placed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bet', betSchema);
