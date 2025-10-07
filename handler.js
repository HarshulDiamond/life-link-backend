// handler.js

const serverless = require('serverless-http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

// Establish the database connection
connectDB();

// Create the handler with a custom base path configuration
const handler = serverless(app, {
  // Tell serverless-http what the base path is. It will be stripped from the request path.
  // We use an environment variable to avoid hardcoding.
  base: process.env.SERVERLESS_BASE_PATH
});

module.exports.handler = handler;