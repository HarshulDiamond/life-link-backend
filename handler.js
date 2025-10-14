// handler.js
const serverless = require('serverless-http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const {initFirebase} = require('./src/api/controllers/firebase_service');

connectDB();
initFirebase();

// Tell serverless-http to strip the `/default` prefix
const handler = serverless(app, {
  basePath: '/default',
});
app.use((req, res, next) => {
  console.log('Incoming Path:', req.path);
  next();
});
module.exports.handler = handler;
