const { query } = require('../config/database');

class NotificationModel {
  /**
   * Creates a new notification for a user.
   * 
   * @param {number} userId - ID of the user receiving the notification
   * @param {string} type - Notification type (task_due, daily_digest, system, etc.)
   * @param {string} title - Notification title
   * @param {string} message - Notification message content
   * @param {number|null} [relatedId=null] - ID of related item (task_id, etc.)
   * @returns {Promise<Object>} Database insert result
   */
  async createNotification(userId, type, title, message, relatedId = null) {
    const sql = `
      INSERT INTO notifications (user_id, type, title, message, related_id, is_read)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    return query(sql, [
      userId,
      type,
      title,
      message,
      relatedId,
      false
    ]);
  }

  /**
   * Retrieves notifications for a specific user with pagination.
   * Results are sorted by creation date (newest first).
   * 
   * @param {number} userId - ID of the user
   * @param {number} [limit=50] - Maximum number of notifications to return (1-1000)
   * @returns {Promise<Array>} Array of notification objects
   */
  async getNotificationsByUser(userId, limit = 50) {
    const limitInt = Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
    
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ${limitInt}
    `;
    
    return query(sql, [userId]);
  }

  /**
   * Counts unread notifications for a user.
   * 
   * @param {number} userId - ID of the user
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = false
    `;
    const result = await query(sql, [userId]);
    return result[0].count;
  }

  /**
   * Marks a specific notification as read for a user.
   * 
   * @param {number} notificationId - ID of the notification to mark as read
   * @param {number} userId - ID of the user who owns the notification
   * @returns {Promise<Object>} Database update result
   */
  async markAsRead(notificationId, userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE notification_id = ? AND user_id = ?
    `;
    return query(sql, [notificationId, userId]);
  }

  /**
   * Marks all unread notifications as read for a user.
   * 
   * @param {number} userId - ID of the user
   * @returns {Promise<Object>} Database update result
   */
  async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = ? AND is_read = false
    `;
    return query(sql, [userId]);
  }

  /**
   * Deletes a specific notification belonging to a user.
   * 
   * @param {number} notificationId - ID of the notification to delete
   * @param {number} userId - ID of the user who owns the notification
   * @returns {Promise<Object>} Database delete result
   */
  async deleteNotification(notificationId, userId) {
    const sql = `
      DELETE FROM notifications 
      WHERE notification_id = ? AND user_id = ?
    `;
    return query(sql, [notificationId, userId]);
  }

  /**
   * Cleans up old notifications, keeping only the most recent 100 per user.
   * Helps prevent notification table bloat.
   * 
   * @param {number} userId - ID of the user
   * @returns {Promise<Object>} Database delete result
   */
  async cleanupOldNotifications(userId) {
    const sql = `
      DELETE FROM notifications 
      WHERE user_id = ? AND notification_id NOT IN (
        SELECT notification_id FROM (
          SELECT notification_id 
          FROM notifications 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 100
        ) AS recent
      )
    `;
    return query(sql, [userId, userId]);
  }
}

module.exports = new NotificationModel();