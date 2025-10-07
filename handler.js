// handler.js

const serverless = require('serverless-http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

// Establish the database connection
connectDB();

// Create the handler with a custom base path configuration
const handler = serverless(app);
app.use((req, res, next) => {
  console.log('Incoming Path:', req.path);
  next();
});
module.exports.handler = handler;