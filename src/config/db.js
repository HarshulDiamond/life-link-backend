const mongoose = require('mongoose');

// We use a global variable to cache the connection.
// This is because Lambda can reuse the execution environment.
let cachedConnection = null;

const connectDB = async () => {
  // If we already have a connection, reuse it
  if (cachedConnection) {
    console.log('=> using cached database connection');
    return cachedConnection;
  }

  try {
    console.log('=> using new database connection');
    // Mongoose.connect returns a promise of the mongoose instance
    const mongooseInstance = await mongoose.connect(process.env.MONGO_URI, {
      // These options are recommended for serverless environments
      bufferCommands: false,
    });

    // Cache the connection for future invocations
    cachedConnection = mongooseInstance;
    return mongooseInstance;
  } catch (error) {
    console.error('Database connection error:', error);
    // Exit the process with failure code
    process.exit(1);
  }
};

module.exports = connectDB;