const { query } = require('../config/database');

/**
 * Initializes the notification system by creating required database tables and columns.
 * Creates a notifications table for storing user notifications and adds notification-related
 * columns to existing tasks table. Includes proper indexing for performance optimization.
 * 
 * @returns {Promise<void>} Resolves when setup is complete, rejects on error
 * @throws {Error} If database operations fail
 */
async function setupNotifications() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL COMMENT 'task_due, daily_digest, system, etc.',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_id INT NULL COMMENT 'ID of related item (task_id, etc.)',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_user_read (user_id, is_read),
        INDEX idx_created_at (created_at)
      )
    `);
    
    try {
      await query('ALTER TABLE tasks ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    
    try {
      await query('CREATE INDEX idx_notification_sent ON tasks (notification_sent)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
  } catch (error) {
    // console.error('❌ Notification setup failed:', error);
    throw error;
  }
}

if (require.main === module) {
  setupNotifications()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupNotifications };