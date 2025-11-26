const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notificationModel');

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

// GET /notifications - Get user notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    // Parse limit parameter and ensure it's a number
    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await notificationModel.getNotificationsByUser(req.session.userId, limit);
    res.json(notifications);
  } catch (error) {
    // console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// GET /notifications/unread-count - Get unread count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await notificationModel.getUnreadCount(req.session.userId);
    res.json({ count });
  } catch (error) {
    // console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Error fetching unread count' });
  }
});

// PUT /notifications/:id/read - Mark as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    // Ensure notificationId is a number
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    await notificationModel.markAsRead(notificationId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    // console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Error marking notification as read' });
  }
});

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await notificationModel.markAllAsRead(req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    // console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Error marking all notifications as read' });
  }
});

// DELETE /notifications/:id - Delete notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Ensure notificationId is a number
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    await notificationModel.deleteNotification(notificationId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    // console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Error deleting notification' });
  }
});

module.exports = router;