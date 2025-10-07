const serverless = require('serverless-http');
const app = require('./src/app');

// We need to load the environment variables for the lambda function
// They will be set in the AWS Lambda configuration
const connectDB = require('./src/config/db');

// Establish the database connection when the Lambda is initialized
connectDB();

module.exports.handler = serverless(app);