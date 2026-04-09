import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import RoundResult from '../models/RoundResult.js';
import DailyStat from '../models/DailyStat.js';

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J 12=Q 13=K 14=A

const SYMBOLS = ["A", "B", "C"];

class GameService {
  constructor() {
    this.io = null;
    this.onlineCount = 0;
    this.socketMappings = new Map();
    this.currentRound = this.initRound();
    this.betsCache = [];
    this.gameLoopInterval = null;
    this.houseProfitTarget = 1000000;
  }

  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  initRound() {
    return {
      roundId: uuidv4(),
      time: 30,
      status: "betting",
      totals: { A: 0, B: 0, C: 0 },
      startTime: Date.now()
    };
  }

  setIO(io) {
    this.io = io;
    this.startGameLoop();
  }

  setSocketMapping(userId, socketId) {
    this.socketMappings.set(userId, socketId);
  }

  removeSocketMapping(userId) {
    this.socketMappings.delete(userId);
  }

  getCurrentRound() {
    return this.currentRound;
  }

  addBetToCache(betData) {
    this.betsCache.push(betData);
    const side = betData.side;
    if (this.currentRound.totals[side] !== undefined) {
      this.currentRound.totals[side] += betData.amount;
    }

    // Broadcast updated totals
    if (this.io) {
      this.io.emit('totalsUpdate', { totals: this.currentRound.totals });
    }
  }

  startGameLoop() {
    if (this.gameLoopInterval) return;
    this.gameLoopInterval = setInterval(async () => {
      if (this.currentRound.time > 0) {
        this.currentRound.time--;
        this.io.emit('timer', { time: this.currentRound.time, status: this.currentRound.status });
      } else {
        if (this.currentRound.status === "betting") {
          await this.startResultPhase();
        } else {
          await this.startNewRound();
        }
      }
    }, 1000);
  }

  async startResultPhase() {
    this.currentRound.status = "result";
    this.currentRound.time = 5;
    this.io.emit('statusChange', { status: "result", time: 5 });

    const result = await this.calculateResult();

    await this.settleBets(result);

    this.io.emit('roundResult', result);
  }

  async startNewRound() {
    this.currentRound = this.initRound();
    this.betsCache = [];
    this.io.emit('round', {
      roundId: this.currentRound.roundId,
      time: this.currentRound.time,
      status: this.currentRound.status,
      newRound: true,
      totals: this.currentRound.totals
    });
  }

  createShuffledDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  isConsecutive(sortedVals) {
    if (sortedVals[0] - sortedVals[1] === 1 && sortedVals[1] - sortedVals[2] === 1) return true;
    if (sortedVals[0] === 14 && sortedVals[1] === 3 && sortedVals[2] === 2) return true; // A-2-3
    return false;
  }

  countValues(vals) {
    const counts = {};
    for (const v of vals) counts[v] = (counts[v] || 0) + 1;
    return counts;
  }

  evaluateHand(cards) {
    const sortedVals = cards.map(c => c.value).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isSeq = this.isConsecutive(sortedVals);
    const valueCounts = this.countValues(sortedVals);
    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    let tieVals = [...sortedVals];

    if (counts[0] === 2) {
      const pairVal = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 2));
      const kicker = sortedVals.find(v => v !== pairVal);
      tieVals = [pairVal, pairVal, kicker];
    }

    if (counts[0] === 3) return { rank: 6, values: tieVals, name: "trail" };
    if (isFlush && isSeq) return { rank: 5, values: tieVals, name: "pure sequence" };
    if (isSeq) return { rank: 4, values: tieVals, name: "sequence" };
    if (isFlush) return { rank: 3, values: tieVals, name: "color" };
    if (counts[0] === 2) return { rank: 2, values: tieVals, name: "pair" };
    return { rank: 1, values: sortedVals, name: "high card" };
  }

  compareHands(e1, e2) {
    if (e1.rank !== e2.rank) return e1.rank - e2.rank;
    for (let i = 0; i < e1.values.length; i++) {
      if (e1.values[i] !== e2.values[i]) return e1.values[i] - e2.values[i];
    }
    return 0;
  }

  async calculateResult() {

    const totals = this.currentRound.totals;
    const totalBet = totals.A + totals.B + totals.C;

    const options = [0, 1, 2];

    options.sort((a, b) => totals[SYMBOLS[a]] - totals[SYMBOLS[b]]);
    const targetSlotIndex = options[0];

    const deck = this.createShuffledDeck();
    let hands = [
      deck.slice(0, 3),
      deck.slice(3, 6),
      deck.slice(6, 9)
    ];

    let evals = hands.map(h => this.evaluateHand(h));
    let bestIdx = 0;
    for (let i = 1; i < 3; i++) {
      if (this.compareHands(evals[i], evals[bestIdx]) > 0) bestIdx = i;
    }

    if (bestIdx !== targetSlotIndex) {
      [hands[targetSlotIndex], hands[bestIdx]] = [hands[bestIdx], hands[targetSlotIndex]];
    }

    const finalEvals = hands.map(h => this.evaluateHand(h));
    const winnerSymbol = SYMBOLS[targetSlotIndex];

    const resultData = {
      roundId: this.currentRound.roundId,
      hands,
      evaluations: finalEvals,
      winner: winnerSymbol,
      winnerIndex: targetSlotIndex,
      timestamp: Date.now()
    };

    this.lastResult = resultData;
    await RoundResult.create(resultData);
    return resultData;
  }

  async settleBets(result) {
    const winnerSymbol = result.winner;
    const winningsMap = new Map();

    for (const bet of this.betsCache) {
      const isWin = bet.side === winnerSymbol;
      const payout = isWin ? bet.amount * 2 : 0;

      await Bet.updateOne(
        { _id: bet._id },
        { $set: { won: isWin, payout, status: "settled" } }
      );

      if (isWin) {
        const currentWon = winningsMap.get(bet.userId) || 0;
        winningsMap.set(bet.userId, currentWon + payout);
      }
    }

    for (const [userId, totalPayout] of winningsMap.entries()) {
      const user = await User.findOneAndUpdate(
        { firebaseUid: userId },
        { $inc: { coin: totalPayout } },
        { new: true }
      );

      const socketId = this.socketMappings.get(userId);
      if (socketId && this.io) {
        this.io.to(socketId).emit('betSettled', {
          roundId: this.currentRound.roundId,
          won: true,
          payout: totalPayout,
          coin: user ? user.coin : 0
        });
      }
    }

    const betters = new Set(this.betsCache.map(b => b.userId));
    for (const userId of betters) {
      if (!winningsMap.has(userId)) {
        const socketId = this.socketMappings.get(userId);
        if (socketId && this.io) {
          const user = await User.findOne({ firebaseUid: userId }).select('coin');
          this.io.to(socketId).emit('betSettled', {
            roundId: this.currentRound.roundId,
            won: false,
            payout: 0,
            coin: user ? user.coin : 0
          });
        }
      }
    }

    // Update Daily Statistics
    await this.updateDailyStats();
  }

  async updateDailyStats() {
    const totalInvested = Object.values(this.currentRound.totals).reduce((a, b) => a + b, 0);
    let totalPayout = 0;
    
    // Calculate total payout for the round
    for (const bet of this.betsCache) {
      if (bet.side === this.lastResult?.winner) {
        totalPayout += bet.amount * 2;
      }
    }

    const netProfit = totalInvested - totalPayout;
    const date = this.getCurrentDate();

    await DailyStat.findOneAndUpdate(
      { date },
      { 
        $inc: { 
          totalHouseProfit: netProfit > 0 ? netProfit : 0,
          totalHouseLoss: netProfit < 0 ? Math.abs(netProfit) : 0
        }
      },
      { upsert: true, new: true }
    );
  }
}

const gameService = new GameService();
export default gameService;
