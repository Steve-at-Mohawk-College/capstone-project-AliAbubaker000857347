const request = require('supertest');
const express = require('express');
const notificationRoutes = require('../../../routes/notificationRoutes');
const notificationModel = require('../../../models/notificationModel');

// Mock the notification model
jest.mock('../../../models/notificationModel');

const app = express();
app.use(express.json());

// Mock session middleware
app.use((req, res, next) => {
  req.session = {
    userId: 1,
    username: 'testuser'
  };
  next();
});

app.use('/notifications', notificationRoutes);

describe('Notification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    test('should get user notifications', async () => {
      const mockNotifications = [
        { notification_id: 1, title: 'Test 1', is_read: false },
        { notification_id: 2, title: 'Test 2', is_read: true }
      ];
      notificationModel.getNotificationsByUser.mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/notifications')
        .expect(200);

      expect(notificationModel.getNotificationsByUser).toHaveBeenCalledWith(1, 50);
      expect(response.body).toEqual(mockNotifications);
    });

    test('should get notifications with custom limit', async () => {
      const mockNotifications = [{ notification_id: 1, title: 'Test' }];
      notificationModel.getNotificationsByUser.mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/notifications?limit=10')
        .expect(200);

      expect(notificationModel.getNotificationsByUser).toHaveBeenCalledWith(1, 10);
      expect(response.body).toEqual(mockNotifications);
    });

    test('should handle errors when fetching notifications', async () => {
      notificationModel.getNotificationsByUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/notifications')
        .expect(500);

      expect(response.body).toEqual({ error: 'Error fetching notifications' });
    });
  });

  describe('GET /notifications/unread-count', () => {
    test('should get unread count', async () => {
      notificationModel.getUnreadCount.mockResolvedValue(3);

      const response = await request(app)
        .get('/notifications/unread-count')
        .expect(200);

      expect(notificationModel.getUnreadCount).toHaveBeenCalledWith(1);
      expect(response.body).toEqual({ count: 3 });
    });

    test('should handle errors when fetching unread count', async () => {
      notificationModel.getUnreadCount.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/notifications/unread-count')
        .expect(500);

      expect(response.body).toEqual({ error: 'Error fetching unread count' });
    });
  });

  describe('PUT /notifications/:id/read', () => {
    test('should mark notification as read', async () => {
      notificationModel.markAsRead.mockResolvedValue({ affectedRows: 1 });

      const response = await request(app)
        .put('/notifications/123/read')
        .expect(200);

      expect(notificationModel.markAsRead).toHaveBeenCalledWith(123, 1);
      expect(response.body).toEqual({ ok: true });
    });

    test('should handle invalid notification ID', async () => {
      const response = await request(app)
        .put('/notifications/invalid/read')
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid notification ID' });
    });

    test('should handle errors when marking as read', async () => {
      notificationModel.markAsRead.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/notifications/123/read')
        .expect(500);

      expect(response.body).toEqual({ error: 'Error marking notification as read' });
    });
  });

  describe('PUT /notifications/read-all', () => {
    test('should mark all notifications as read', async () => {
      notificationModel.markAllAsRead.mockResolvedValue({ affectedRows: 3 });

      const response = await request(app)
        .put('/notifications/read-all')
        .expect(200);

      expect(notificationModel.markAllAsRead).toHaveBeenCalledWith(1);
      expect(response.body).toEqual({ ok: true });
    });

    test('should handle errors when marking all as read', async () => {
      notificationModel.markAllAsRead.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/notifications/read-all')
        .expect(500);

      expect(response.body).toEqual({ error: 'Error marking all notifications as read' });
    });
  });

  describe('DELETE /notifications/:id', () => {
    test('should delete notification', async () => {
      notificationModel.deleteNotification.mockResolvedValue({ affectedRows: 1 });

      const response = await request(app)
        .delete('/notifications/123')
        .expect(200);

      expect(notificationModel.deleteNotification).toHaveBeenCalledWith(123, 1);
      expect(response.body).toEqual({ ok: true });
    });

    test('should handle invalid notification ID', async () => {
      const response = await request(app)
        .delete('/notifications/invalid')
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid notification ID' });
    });

    test('should handle errors when deleting notification', async () => {
      notificationModel.deleteNotification.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/notifications/123')
        .expect(500);

      expect(response.body).toEqual({ error: 'Error deleting notification' });
    });
  });
});