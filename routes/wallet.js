const express = require('express');
const { deposit, withdraw } = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /wallet/deposit [Auth]
router.post('/deposit', authenticateToken, deposit);

// POST /wallet/withdraw [Auth]
router.post('/withdraw', authenticateToken, withdraw);

module.exports = router;