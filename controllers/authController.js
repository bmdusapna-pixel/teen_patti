const { User } = require("../models");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                message: "Username and Password are required"
            });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                user_id: user._id,
                username: user.username,
                display_name: user.display_name,
                balance: user.balance,
                avatar_url: user.avatar_url || '',
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

const registerGuest = async (req, res) => {
    try {
        const randomId = Math.random().toString(36).substr(2, 9);
        const username = `guest_${randomId}`;
        const displayName = `Guest ${randomId}`;
        const guestUser = new User({
            username,
            display_name: displayName,
            email: `${username}@guest.com`,
            password_hash: '',
            is_guest: true,
            balance: 1000, // As per cheat sheet
        });
        await guestUser.save();

        const token = jwt.sign({ userId: guestUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                user_id: guestUser._id,
                username: guestUser.username,
                display_name: guestUser.display_name,
                balance: guestUser.balance,
                avatar_url: guestUser.avatar_url || '',
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    loginUser,
    registerGuest,
};
 
