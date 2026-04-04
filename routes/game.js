const express = require('express');
const { getCurrentRoom, getHistory, getRoundResult, getLeaderboard } = require('../controllers/gameController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /game/room/current [Auth]
router.get('/room/current', authenticateToken, getCurrentRoom);

// GET /game/history [Auth]
router.get('/history', authenticateToken, getHistory);

// GET /game/round/:roundId/result [Auth]
router.get('/round/:roundId/result', authenticateToken, getRoundResult);

// GET /game/leaderboard [Auth]
router.get('/leaderboard', authenticateToken, getLeaderboard);

module.exports = router;