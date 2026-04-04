const { User } = require('../models');

const getProfile = async (req, res) => {
    try {
        const user = req.user; // Attached by auth middleware
        res.json({
            user_id: user._id,
            username: user.username,
            display_name: user.display_name,
            balance: user.balance,
            avatar_url: user.avatar_url || '',
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getBalance = async (req, res) => {
    try {
        const user = req.user;
        res.json({ balance: user.balance });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getProfile,
    getBalance,
};