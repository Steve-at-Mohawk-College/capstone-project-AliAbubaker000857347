const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware for tests
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Mock authentication middleware for tests
app.use((req, res, next) => {
  // Skip auth for testing
  if (req.path.includes('/test/')) {
    return next();
  }
  next();
});

// Test routes
app.get('/test/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server is running' });
});

module.exports = app;