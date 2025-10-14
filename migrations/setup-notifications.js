const { query } = require('../config/database');

async function setupNotifications() {
  try {
    console.log('🔄 Setting up notification system...');
    
    // Create notifications table
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
    console.log('✅ Notifications table created/verified');
    
    // Add notification_sent column to tasks table if it doesn't exist
    try {
      await query('ALTER TABLE tasks ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE');
      console.log('✅ Added notification_sent column to tasks');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ notification_sent column already exists');
      } else {
        throw error;
      }
    }
    
    // Add index if it doesn't exist
    try {
      await query('CREATE INDEX idx_notification_sent ON tasks (notification_sent)');
      console.log('✅ Added notification_sent index');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('✅ notification_sent index already exists');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Notification system setup completed!');
  } catch (error) {
    console.error('❌ Notification setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupNotifications()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupNotifications };