const { query } = require('../config/database');

class NotificationModel {
  // Create a new notification
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

  // Get all notifications for a user - FIXED: Use template literal for LIMIT
  async getNotificationsByUser(userId, limit = 50) {
    // Convert limit to integer and validate
    const limitInt = Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
    
    // Use template literal for LIMIT to avoid parameter binding issues
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ${limitInt}
    `;
    
    return query(sql, [userId]);
  }

  // Get unread notifications count
  async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = false
    `;
    const result = await query(sql, [userId]);
    return result[0].count;
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE notification_id = ? AND user_id = ?
    `;
    return query(sql, [notificationId, userId]);
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = ? AND is_read = false
    `;
    return query(sql, [userId]);
  }

  // Delete a notification
  async deleteNotification(notificationId, userId) {
    const sql = `
      DELETE FROM notifications 
      WHERE notification_id = ? AND user_id = ?
    `;
    return query(sql, [notificationId, userId]);
  }

  // Clean up old notifications (keep only last 100 per user)
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