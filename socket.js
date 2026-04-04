const { authenticateSocket } = require('./middleware/auth');
const { User, Bet, Round } = require('./models');
const { dealCards } = require('./utils/cardDeckService');
const { evaluateHand } = require('./utils/handEvaluatorService');
const { calculatePayout } = require('./utils/payoutCalculatorService');
const { updateGameState } = require('./controllers/gameController');

const ROOM_ID = 'room_main';

let isRoundRunning = false;
let currentRound = 0;
let gamePhase = 'betting';
let bettingStartTime = Date.now();
const BETTING_DURATION = 15;

let countdownInterval;
let currentRoundObj = null;

let slots = [
  { slot_index: 0, pot: 0 },
  { slot_index: 1, pot: 0 },
  { slot_index: 2, pot: 0 },
];

let currentBets = [];

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // JOIN ROOM
    socket.on('join_room', async ({ room_id, user_id, token }) => {
      const user = await authenticateSocket(token);

      if (!user || user._id.toString() !== user_id) {
        return socket.emit('error', { message: 'Invalid token or user' });
      }

      socket.user = user;
      socket.join(room_id);

      console.log(`User ${user.username} joined room ${room_id}`);
    });

    // PLACE BET
    socket.on('place_bet', async ({ room_id, slot_index, amount }) => {
      const user = socket.user;

      if (!user || gamePhase !== 'betting') {
        return socket.emit('error', { message: 'Invalid action' });
      }

      // Slot validation
      if (!slots[slot_index]) {
        return socket.emit('error', { message: 'Invalid slot' });
      }

      // Atomic balance deduction
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true }
      );

      if (!updatedUser) {
        return socket.emit('error', { message: 'Insufficient balance' });
      }

      // Create bet
      const bet = new Bet({
        round_id: currentRoundObj._id,
        user_id: user._id,
        slot_index,
        amount,
        won: false,
        winnings: 0,
      });

      await bet.save();
      currentBets.push(bet);

      // Update pot
      slots[slot_index].pot += amount;

      // Emit to user
      socket.emit('bet_accepted', {
        slot_index,
        amount,
        new_balance: updatedUser.balance,
      });

      // Emit to room
      io.to(room_id).emit('bet_update', {
        slot_index,
        new_pot: slots[slot_index].pot,
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  startRoundLoop(io);
};

// ROUND LOOP
function startRoundLoop(io) {
  setInterval(async () => {
    if (!isRoundRunning) {
      isRoundRunning = true;

      currentRound++;
      slots.forEach(s => s.pot = 0);
      currentBets = [];
      bettingStartTime = Date.now();

      // SAVE ROUND IMMEDIATELY
      currentRoundObj = await new Round({
        room_id: ROOM_ID,
        round_number: currentRound,
        started_at: new Date(),
        winner_slot_index: 0,
        winner_hand_name: '',
        slots_data: []
      }).save();

      io.to(ROOM_ID).emit('round_started', {
        round_number: currentRound,
        betting_duration: BETTING_DURATION,
        slots
      });

      startCountdown(io);

      gamePhase = 'betting';
      updateGameState({
        current_round: currentRound,
        phase: 'betting',
        betting_start_time: bettingStartTime
      });

      setTimeout(() => {
        gamePhase = 'revealing';
        updateGameState({ phase: 'revealing' });
        revealCards(io);
      }, BETTING_DURATION * 1000);
    }
  }, (BETTING_DURATION + 10) * 1000);
}

// COUNTDOWN
function startCountdown(io) {
  if (countdownInterval) clearInterval(countdownInterval);

  let seconds = BETTING_DURATION;

  countdownInterval = setInterval(() => {
    io.to(ROOM_ID).emit('countdown_tick', { seconds });
    seconds--;

    if (seconds < 0) clearInterval(countdownInterval);
  }, 1000);
}

// REVEAL CARDS
async function revealCards(io) {
  const dealtSlots = dealCards();

  const evaluatedSlots = dealtSlots.map((slot, index) => {
    const hand = evaluateHand(slot.cards);

    return {
      slot_index: index,
      hand_name: hand.hand_name,
      rank_score: hand.rank_score,
      tieBreaker: hand.tieBreaker,
      cards: slot.cards,
      pot: slots[index].pot,
    };
  });

  currentRoundObj.slots_data = evaluatedSlots;

  io.to(ROOM_ID).emit('cards_revealed', {
    slots: evaluatedSlots.map(s => ({
      slot_index: s.slot_index,
      hand_name: s.hand_name,
      cards: s.cards
    }))
  });

  setTimeout(() => {
    determineWinner(io, evaluatedSlots);
  }, 4000);
}

// DETERMINE WINNER
async function determineWinner(io, evaluatedSlots) {
  let winnerSlot = 0;
  let maxRank = 0;
  let maxTieBreaker = 0;

  evaluatedSlots.forEach(slot => {
    if (
      slot.rank_score > maxRank ||
      (slot.rank_score === maxRank && slot.tieBreaker > maxTieBreaker)
    ) {
      maxRank = slot.rank_score;
      maxTieBreaker = slot.tieBreaker;
      winnerSlot = slot.slot_index;
    }
  });

  currentRoundObj.winner_slot_index = winnerSlot;
  currentRoundObj.winner_hand_name = evaluatedSlots[winnerSlot].hand_name;
  currentRoundObj.ended_at = new Date();

  await currentRoundObj.save();

  const winnerPot = evaluatedSlots[winnerSlot].pot;
  const bets = await Bet.find({ round_id: currentRoundObj._id });

  let biggestWinners = [];

  for (const bet of bets) {
    if (bet.slot_index === winnerSlot) {
      bet.won = true;
      bet.winnings = bet.amount * 2; // Simple 2x payout for winners

      const user = await User.findById(bet.user_id);
      user.balance += bet.winnings;
      user.total_winnings += bet.winnings;
      await user.save();

      biggestWinners.push({
        user_id: user._id,
        display_name: user.display_name,
        win_amount: bet.winnings,
      });
    }

    await bet.save();
  }

  biggestWinners.sort((a, b) => b.win_amount - a.win_amount);
  biggestWinners = biggestWinners.slice(0, 3);

  io.to(ROOM_ID).emit('round_result', {
    round_number: currentRound,
    winner_slot_index: winnerSlot,
    winner_hand_name: evaluatedSlots[winnerSlot].hand_name,
    biggest_winners: biggestWinners,
  });

  gamePhase = 'result';
  updateGameState({ phase: 'result' });

  setTimeout(() => {
    io.to(ROOM_ID).emit('next_round', {
      next_round_number: currentRound + 1,
      delay_seconds: 1,
    });

    gamePhase = 'next_round';
    updateGameState({ phase: 'next_round' });

    setTimeout(() => {
      gamePhase = 'betting';
      isRoundRunning = false;
    }, 1000);

  }, 5000);
}