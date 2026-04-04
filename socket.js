const { authenticateSocket } = require('./middleware/auth');
const { User, Bet, Round } = require('./models');
const { dealCards } = require('./utils/cardDeckService');
const { evaluateHand } = require('./utils/handEvaluatorService');
const { calculatePayout } = require('./utils/payoutCalculatorService');
const { updateGameState } = require('./controllers/gameController');

const ROOM_ID = 'room_main';
let currentRound = 1;
let gamePhase = 'betting'; // 'betting', 'revealing', 'result'
let bettingStartTime = Date.now();
const BETTING_DURATION = 15; // seconds
let countdownInterval;
let slots = [
  { slot_index: 0, pot: 0 },
  { slot_index: 1, pot: 0 },
  { slot_index: 2, pot: 0 },
];
let currentBets = []; // Store bets for current round

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Client emits join_room
    socket.on('join_room', async (data) => {
      const { room_id, user_id, token } = data;
      const user = await authenticateSocket(token);

      if (!user || user._id.toString() !== user_id) {
        socket.emit('error', { message: 'Invalid token or user' });
        return;
      }

      socket.user = user;
      socket.join(room_id);
      console.log(`User ${user.username} joined room ${room_id}`);
      // Optionally emit current state
    });

    // Client emits place_bet
    socket.on('place_bet', async (data) => {
      const { room_id, user_id, slot_index, amount, token } = data;
      const user = await authenticateSocket(token);

      if (!user || user._id.toString() !== user_id || gamePhase !== 'betting') {
        socket.emit('error', { message: 'Invalid action' });
        return;
      }

      if (user.balance < amount) {
        socket.emit('error', { message: 'Insufficient balance' });
        return;
      }

      // Deduct balance
      user.balance -= amount;
      await user.save();

      // Save bet
      const bet = new Bet({
        round_id: null, // Will update after round is saved
        user_id: user._id,
        slot_index,
        amount,
        won: false, // To be updated later
        winnings: 0,
      });
      await bet.save();
      currentBets.push(bet);

      // Update pot
      slots[slot_index].pot += amount;

      // Emit to sender
      socket.emit('bet_accepted', {
        slot_index,
        amount,
        new_balance: user.balance,
        my_bet_on_slot: amount, // Simplified
      });

      // Emit to room
      io.to(room_id).emit('bet_update', {
        slot_index,
        new_pot: slots[slot_index].pot,
      });
    });

    // Client emits leave_room
    socket.on('leave_room', (data) => {
      const { room_id, user_id } = data;
      socket.leave(room_id);
      console.log(`User ${user_id} left room ${room_id}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Start the round loop
  startRoundLoop(io);
};

function startRoundLoop(io) {
  setInterval(async () => {
    if (gamePhase === 'betting') {
      // Start new round
      currentRound++;
      slots.forEach(slot => slot.pot = 0); // Reset pots? Or keep initial
      bettingStartTime = Date.now();
      currentBets = []; // Reset bets for new round

      // Create Round object (save later)
      const round = new Round({
        room_id: ROOM_ID,
        round_number: currentRound,
        started_at: new Date(),
        winner_slot_index: 0, // Placeholder
        winner_hand_name: 'High Card', // Placeholder
        ended_at: new Date(), // Placeholder, will update
        slots_data: slots.map(slot => ({ slot_index: slot.slot_index, pot: slot.pot, cards: [], hand_name: 'High Card' })), // Placeholder
      });

      // Store round for later use
      currentRoundObj = round;

      // Emit round_started
      io.to(ROOM_ID).emit('round_started', {
        round_number: currentRound,
        betting_duration: BETTING_DURATION,
        slots: slots.map(slot => ({ slot_index: slot.slot_index, initial_pot: slot.pot })),
      });

      // Start countdown
      startCountdown(io);

      gamePhase = 'betting';
      updateGameState({ current_round: currentRound, phase: 'betting', betting_start_time: bettingStartTime });

      // After betting duration, move to revealing
      setTimeout(() => {
        gamePhase = 'revealing';
        updateGameState({ phase: 'revealing' });
        revealCards(io, round);
      }, BETTING_DURATION * 1000);

    }
  }, (BETTING_DURATION + 4 + 5 + 1) * 1000); // Full cycle time
}

function startCountdown(io) {
  let seconds = BETTING_DURATION;
  countdownInterval = setInterval(() => {
    io.to(ROOM_ID).emit('countdown_tick', { seconds });
    seconds--;
    if (seconds < 0) clearInterval(countdownInterval);
  }, 1000);
}

async function revealCards(io, round) {
  // Deal cards
  const dealtSlots = dealCards(); // [{ cards: [...] }, ...]

  // Evaluate hands
  const evaluatedSlots = dealtSlots.map((slot, index) => {
    const hand = evaluateHand(slot.cards);
    return {
      slot_index: index,
      hand_name: hand.hand_name,
      cards: slot.cards,
      pot: slots[index].pot,
    };
  });

  // Update round (don't save yet)
  round.slots_data = evaluatedSlots;
  // await round.save(); // Remove this, save in determineWinner

  // Update bets with round_id
  for (const bet of currentBets) {
    bet.round_id = round._id;
    await bet.save();
  }

  // Emit cards_revealed
  io.to(ROOM_ID).emit('cards_revealed', {
    slots: evaluatedSlots.map(slot => ({
      slot_index: slot.slot_index,
      hand_name: slot.hand_name,
      cards: slot.cards,
    })),
  });

  // After 4s, emit round_result
  setTimeout(() => {
    determineWinner(io, round, evaluatedSlots);
  }, 4000);
}

async function determineWinner(io, round, evaluatedSlots) {
  // Find winner (highest rank, then tie-breaker)
  let winnerSlot = 0;
  let maxRank = 0;
  let maxTieBreaker = 0;

  evaluatedSlots.forEach((slot, index) => {
    const hand = evaluateHand(slot.cards);
    if (hand.rank_score > maxRank || (hand.rank_score === maxRank && hand.tieBreaker > maxTieBreaker)) {
      maxRank = hand.rank_score;
      maxTieBreaker = hand.tieBreaker;
      winnerSlot = index;
    }
  });

  round.winner_slot_index = winnerSlot;
  round.winner_hand_name = evaluatedSlots[winnerSlot].hand_name;
  round.ended_at = new Date();
  await round.save();

  // Calculate payouts
  const winnerPot = evaluatedSlots[winnerSlot].pot;
  const bets = await Bet.find({ round_id: round._id });

  let biggestWinners = [];
  for (const bet of bets) {
    if (bet.slot_index === winnerSlot) {
      bet.won = true;
      bet.winnings = bet.amount * 2; // As per cheat sheet
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

  // Sort biggest winners
  biggestWinners.sort((a, b) => b.win_amount - a.win_amount);
  biggestWinners = biggestWinners.slice(0, 3); // Top 3

  // Emit round_result
  io.to(ROOM_ID).emit('round_result', {
    round_number: currentRound,
    winner_slot_index: winnerSlot,
    winner_hand_name: evaluatedSlots[winnerSlot].hand_name,
    biggest_winners: biggestWinners,
  });

  gamePhase = 'result';
  updateGameState({ phase: 'result' });

  // After 5s, emit next_round
  setTimeout(() => {
    io.to(ROOM_ID).emit('next_round', {
      next_round_number: currentRound + 1,
      delay_seconds: 5,
    });
    gamePhase = 'next_round';
    updateGameState({ phase: 'next_round' });
  }, 5000);
}