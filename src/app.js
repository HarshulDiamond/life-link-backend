const express = require('express');
const exampleRoutes = require('./api/routes/user_routes');

const app = express();

// Middleware
app.use(express.json());

// Mount Routes
// This base path will be prefixed to all routes in exampleRoutes
// e.g., /api/hello
app.use('/default/api', exampleRoutes);

// Optional: Add a root route for health checks or basic info
app.get('/', (req, res) => {
  res.send('API is running...');
});

module.exports = app;