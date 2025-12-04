const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notificationModel');

/**
 * Middleware function that checks if a user is authenticated.
 * If authenticated, proceeds to the next middleware/route handler.
 * Otherwise, returns a 401 Unauthorized response.
 *
 * @function requireAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * GET /notifications
 * Retrieves notifications for the authenticated user.
 * Supports optional limit parameter to control the number of notifications returned.
 *
 * @name GET /notifications
 * @function
 * @memberof module:routes/notificationRoute
 * @param {number} [req.query.limit=50] - Maximum number of notifications to return
 * @returns {Array} Array of notification objects
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await notificationModel.getNotificationsByUser(req.session.userId, limit);
    res.json(notifications);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

/**
 * GET /notifications/unread-count
 * Retrieves the count of unread notifications for the authenticated user.
 *
 * @name GET /notifications/unread-count
 * @function
 * @memberof module:routes/notificationRoute
 * @returns {Object} Object containing the unread notification count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await notificationModel.getUnreadCount(req.session.userId);
    res.json({ count });
  } catch (error) {

    res.status(500).json({ error: 'Error fetching unread count' });
  }
});

/**
 * PUT /notifications/:id/read
 * Marks a specific notification as read for the authenticated user.
 * Validates that the notification ID is a valid number.
 *
 * @name PUT /notifications/:id/read
 * @function
 * @memberof module:routes/notificationRoute
 * @param {string} req.params.id - ID of the notification to mark as read
 * @returns {Object} Success confirmation object
 */
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await notificationModel.markAsRead(notificationId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {

    res.status(500).json({ error: 'Error marking notification as read' });
  }
});

/**
 * PUT /notifications/read-all
 * Marks all notifications as read for the authenticated user.
 *
 * @name PUT /notifications/read-all
 * @function
 * @memberof module:routes/notificationRoute
 * @returns {Object} Success confirmation object
 */
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await notificationModel.markAllAsRead(req.session.userId);
    res.json({ ok: true });
  } catch (error) {

    res.status(500).json({ error: 'Error marking all notifications as read' });
  }
});

/**
 * DELETE /notifications/:id
 * Deletes a specific notification for the authenticated user.
 * Validates that the notification ID is a valid number.
 *
 * @name DELETE /notifications/:id
 * @function
 * @memberof module:routes/notificationRoute
 * @param {string} req.params.id - ID of the notification to delete
 * @returns {Object} Success confirmation object
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await notificationModel.deleteNotification(notificationId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {

    res.status(500).json({ error: 'Error deleting notification' });
  }
});

module.exports = router;