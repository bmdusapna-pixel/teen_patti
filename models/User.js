const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    display_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 1000,
      min: 0,
    },
    is_guest: {
      type: Boolean,
      default: false,
    },
    avatar_url: {
      type: String,
      default: null,
    },
    total_winnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_bets_placed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);