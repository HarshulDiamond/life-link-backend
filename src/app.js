const express = require('express');
const userRoutes = require('./api/routes/user_routes');
const bloodRoutes = require('./api/routes/blood_request_routes');
const campRoutes = require('./api/routes/blood_camps_route');
const cors = require('cors'); // 1. Import the cors package
const app = express();

app.use(cors());
// Middleware
app.use(express.json());


// Mount Routes
// This base path will be prefixed to all routes in exampleRoutes
// e.g., /api/hello
app.use('/v1/api/users', userRoutes);
app.use('/v1/api/blood', bloodRoutes);
app.use('/v1/api/camps', campRoutes);

// Optional: Add a root route for health checks or basic info
app.get('/', (req, res) => {
  res.send('API is running...');
});

module.exports = app;