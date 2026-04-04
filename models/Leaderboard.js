const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    display_name: {
      type: String,
      required: true,
    },
    total_winnings: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
