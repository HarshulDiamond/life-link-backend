const express = require('express');
const serverless = require('serverless-http');

const app = express();
// Create a router
const router = express.Router();

// Define your routes on the router
router.get('/hello', (req, res) => {
  res.send('Hello World!');
});

// Mount the router onto the base path provided by API Gateway
app.use('/default/life-link-backend', router);

// Export the handler
module.exports.handler = serverless(app);