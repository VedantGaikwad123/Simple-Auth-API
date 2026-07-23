const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safepass';
    
    // Connect to MongoDB
    const conn = await mongoose.connect(connStr);
    
    console.log(`[Database] MongoDB Connected to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Mongoose error: ${err}`);
});

// Handle graceful shutdown
const gracefulShutdown = async (msg, callback) => {
  try {
    await mongoose.connection.close();
    console.log(`[Database] Connection closed via ${msg}`);
    callback();
  } catch (err) {
    console.error(`[Database] Error during close: ${err.message}`);
    process.exit(1);
  }
};

// Listen for process termination
process.once('SIGUSR2', () => {
  gracefulShutdown('nodemon restart', () => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('app termination (SIGINT)', () => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  gracefulShutdown('app termination (SIGTERM)', () => {
    process.exit(0);
  });
});

module.exports = connectDB;
