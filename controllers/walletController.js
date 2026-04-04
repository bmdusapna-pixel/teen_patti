const { User } = require('../models');

const deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = req.user;
        user.balance += amount;
        await user.save();

        res.json({
            new_balance: user.balance,
            transaction_id: `tx_deposit_${Date.now()}`,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const withdraw = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = req.user;
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        user.balance -= amount;
        await user.save();

        res.json({
            new_balance: user.balance,
            transaction_id: `tx_withdraw_${Date.now()}`,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    deposit,
    withdraw,
};