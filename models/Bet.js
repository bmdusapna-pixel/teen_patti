import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  game: { type: String, default: "teenpatti", index: true },
  userId: { type: String, required: true },
  roundId: { type: String, required: true },
  side: { type: String, enum: ["A", "B", "C"], required: true },
  amount: { type: Number, required: true },
  won: { type: Boolean, default: false },
  payout: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "settled"], default: "pending" },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

betSchema.index({ userId: 1, game: 1, createdAt: -1 });
betSchema.index({ roundId: 1, game: 1 });


const Bet = mongoose.model('Bet', betSchema);
export default Bet;