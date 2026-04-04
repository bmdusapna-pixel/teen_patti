const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(cors());



// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/game');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/game', gameRoutes);

// Initialize socket
require('./socket')(io);

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(()=>{
server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
})


module.exports = { app, server, io }

