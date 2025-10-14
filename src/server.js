// Load environment variables from .env file for local development
require('dotenv').config(); // Correct

const app = require('./app');
const connectDB = require('./config/db');
const {initFirebase} = require('./api/controllers/firebase_service');


initFirebase();


const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();