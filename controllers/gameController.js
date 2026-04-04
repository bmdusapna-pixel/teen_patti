const { Round, Bet, User, Leaderboard } = require('../models');

// Assuming a single room for simplicity
const ROOM_ID = 'room_main';
const SOCKET_URL = process.env.SOCKET_URL || 'wss://your-backend.onrender.com';

// Placeholder for current game state (in production, use DB or Redis)
let currentGameState = {
    current_round: 1,
    phase: 'betting', // 'betting' | 'revealing' | 'result'
    betting_start_time: Date.now(),
    betting_duration: 15, // seconds
};

const getCurrentRoom = async (req, res) => {
    try {
        // Calculate seconds left in betting phase
        let betting_seconds_left = 0;
        if (currentGameState.phase === 'betting') {
            const elapsed = Math.floor((Date.now() - currentGameState.betting_start_time) / 1000);
            betting_seconds_left = Math.max(0, currentGameState.betting_duration - elapsed);
        }

        res.json({
            room_id: ROOM_ID,
            socket_url: SOCKET_URL,
            current_round: currentGameState.current_round,
            betting_seconds_left,
            phase: currentGameState.phase,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const rounds = await Round.find({ room_id: ROOM_ID })
            .sort({ round_number: -1 })
            .skip(skip)
            .limit(limit)
            .select('round_number winner_slot_index winner_hand_name started_at');

        const total = await Round.countDocuments({ room_id: ROOM_ID });

        const results = rounds.map(round => ({
            round_number: round.round_number,
            winner_slot_index: round.winner_slot_index,
            winner_icon: '☕', // Placeholder, can map based on slot
            winner_hand_name: round.winner_hand_name,
            played_at: round.started_at,
        }));

        res.json({ results, total });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getRoundResult = async (req, res) => {
    try {
        const { roundId } = req.params;
        const user = req.user;

        const round = await Round.findOne({ round_number: parseInt(roundId), room_id: ROOM_ID });
        if (!round) {
            return res.status(404).json({ message: 'Round not found' });
        }

        const userBets = await Bet.find({ round_id: round._id, user_id: user._id });
        const my_bet = userBets.reduce((sum, bet) => sum + bet.amount, 0);
        const my_winnings = userBets.reduce((sum, bet) => sum + bet.winnings, 0);

        // Assuming balance before/after can be calculated (simplified)
        const balance_before = user.balance + my_bet - my_winnings; // Rough estimate
        const balance_after = user.balance;

        res.json({
            round_number: round.round_number,
            winner_slot_index: round.winner_slot_index,
            my_bet,
            my_winnings,
            balance_before,
            balance_after,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        // Aggregate total winnings from users
        const entries = await User.find({ is_guest: false })
            .sort({ total_winnings: -1 })
            .limit(5)
            .select('display_name total_winnings');

        const leaderboard = entries.map((user, index) => ({
            rank: index + 1,
            user_id: user._id,
            display_name: user.display_name.length > 10 ? user.display_name.substring(0, 10) + '...' : user.display_name,
            total_winnings: user.total_winnings,
        }));

        res.json({ entries: leaderboard });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Function to update game state (call from socket.js)
const updateGameState = (newState) => {
    currentGameState = { ...currentGameState, ...newState };
};

module.exports = {
    getCurrentRoom,
    getHistory,
    getRoundResult,
    getLeaderboard,
    updateGameState,
};