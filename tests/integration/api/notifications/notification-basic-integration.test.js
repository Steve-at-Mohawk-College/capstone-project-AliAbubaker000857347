const request = require('supertest');
const { query } = require('../../../../config/database');
const bcrypt = require('bcryptjs');

// Simple test that focuses on the core notification functionality
const express = require('express');
const notificationRoutes = require('../../../../routes/notificationRoutes');

describe('Basic Notification Integration Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    
    // Create test user
    const username = `basic_test_${Date.now()}`;
    const email = `basic_test_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    
    const userResult = await query(
      'INSERT INTO users (username, email, password_hash, verification_token, is_verified) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, 'test_token', 1]
    );
    testUser = { user_id: userResult.insertId };

    // Mock session with the actual user ID
    app.use((req, res, next) => {
      req.session = {
        userId: testUser.user_id,
        username: 'test_user'
      };
      next();
    });
    
    app.use('/notifications', notificationRoutes);
  });

  afterAll(async () => {
    if (testUser) {
      await query('DELETE FROM notifications WHERE user_id = ?', [testUser.user_id]);
      await query('DELETE FROM users WHERE user_id = ?', [testUser.user_id]);
    }
  });

  test('should create and retrieve a notification', async () => {
    // Create notification directly in DB
    await query(
      'INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)',
      [testUser.user_id, 'test', 'Test Notification', 'This is a test', false]
    );

    // Retrieve via API
    const response = await request(app)
      .get('/notifications')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    const notification = response.body[0];
    expect(notification.title).toBe('Test Notification');
    expect(notification.message).toBe('This is a test');
    expect(notification.is_read).toBe(false);
  });

  test('should mark notification as read', async () => {
    // Create a notification
    const result = await query(
      'INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)',
      [testUser.user_id, 'test', 'Mark Read Test', 'Test message', false]
    );
    const notificationId = result.insertId;

    // Mark as read
    await request(app)
      .put(`/notifications/${notificationId}/read`)
      .expect(200);

    // Verify it's read
    const [notification] = await query(
      'SELECT * FROM notifications WHERE notification_id = ?',
      [notificationId]
    );
    expect(notification.is_read).toBe(true);
  });

  test('should get correct unread count', async () => {
    // Clear existing notifications
    await query('DELETE FROM notifications WHERE user_id = ?', [testUser.user_id]);

    // Create 2 unread and 1 read notification
    await query(
      'INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)',
      [testUser.user_id, 'test', 'Unread 1', 'Message 1', false]
    );
    await query(
      'INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)',
      [testUser.user_id, 'test', 'Unread 2', 'Message 2', false]
    );
    await query(
      'INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)',
      [testUser.user_id, 'test', 'Read 1', 'Message 3', true]
    );

    const response = await request(app)
      .get('/notifications/unread-count')
      .expect(200);

    expect(response.body.count).toBe(2);
  });
});