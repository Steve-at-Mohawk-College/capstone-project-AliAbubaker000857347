const notificationModel = require('../models/notificationModel');
const { query } = require('../config/database');

class NotificationService {
  // Check for due tasks and create notifications
  async checkDueTasks() {
    try {
      console.log('🔔 Checking for due tasks...');
      
      // Get tasks that are due in the next hour or are overdue
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      const sql = `
        SELECT t.*, p.name as pet_name, u.user_id, u.username
        FROM tasks t
        JOIN pets p ON t.pet_id = p.pet_id
        JOIN users u ON t.user_id = u.user_id
        WHERE t.completed = false 
        AND t.due_date BETWEEN ? AND ?
        AND t.notification_sent = false
      `;
      
      const dueTasks = await query(sql, [now, oneHourFromNow]);
      
      console.log(`📋 Found ${dueTasks.length} due tasks`);
      
      for (const task of dueTasks) {
        await this.createTaskDueNotification(task);
        
        // Mark task as notification sent
        await query(
          'UPDATE tasks SET notification_sent = true WHERE task_id = ?',
          [task.task_id]
        );
      }
      
      return dueTasks.length;
    } catch (error) {
      console.error('Error checking due tasks:', error);
      return 0;
    }
  }

  // Create notification for due task
  async createTaskDueNotification(task) {
    const timeUntilDue = new Date(task.due_date) - new Date();
    const minutesUntilDue = Math.floor(timeUntilDue / (1000 * 60));
    
    let urgency = '';
    let title = '';
    
    if (minutesUntilDue <= 0) {
      urgency = 'OVERDUE';
      title = `🚨 Task Overdue: ${task.title}`;
    } else if (minutesUntilDue <= 15) {
      urgency = 'URGENT';
      title = `⚠️ Task Due Soon: ${task.title}`;
    } else {
      urgency = 'UPCOMING';
      title = `📅 Task Reminder: ${task.title}`;
    }

    const message = this.formatTaskMessage(task, minutesUntilDue, urgency);
    
    await notificationModel.createNotification(
      parseInt(task.user_id), // Ensure user_id is number
      'task_due',
      title,
      message,
      task.task_id ? parseInt(task.task_id) : null // Ensure task_id is number
    );

    console.log(`📢 Created notification for task: ${task.title}`);
  }

  formatTaskMessage(task, minutesUntilDue, urgency) {
    const dueTime = new Date(task.due_date).toLocaleString();
    
    if (urgency === 'OVERDUE') {
      return `The task "${task.title}" for ${task.pet_name} is overdue! It was due at ${dueTime}.`;
    } else if (urgency === 'URGENT') {
      return `The task "${task.title}" for ${task.pet_name} is due in ${minutesUntilDue} minutes (${dueTime}).`;
    } else {
      return `Reminder: "${task.title}" for ${task.pet_name} is due at ${dueTime}.`;
    }
  }

  // Check for tasks due tomorrow (daily digest)
  async checkTomorrowTasks() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);
      
      const sql = `
        SELECT t.*, p.name as pet_name, u.user_id
        FROM tasks t
        JOIN pets p ON t.pet_id = p.pet_id
        JOIN users u ON t.user_id = u.user_id
        WHERE t.completed = false 
        AND DATE(t.due_date) = DATE(?)
        AND t.due_date > NOW()
      `;
      
      const tomorrowTasks = await query(sql, [tomorrow]);
      
      // Group tasks by user
      const tasksByUser = {};
      tomorrowTasks.forEach(task => {
        const userId = parseInt(task.user_id); // Ensure user_id is number
        if (!tasksByUser[userId]) {
          tasksByUser[userId] = [];
        }
        tasksByUser[userId].push(task);
      });
      
      // Create digest notifications for each user
      for (const [userId, tasks] of Object.entries(tasksByUser)) {
        if (tasks.length > 0) {
          await this.createDailyDigestNotification(parseInt(userId), tasks);
        }
      }
      
      return tomorrowTasks.length;
    } catch (error) {
      console.error('Error checking tomorrow tasks:', error);
      return 0;
    }
  }

  async createDailyDigestNotification(userId, tasks) {
    const taskList = tasks.map(task => 
      `• ${task.title} for ${task.pet_name} at ${new Date(task.due_date).toLocaleTimeString()}`
    ).join('\n');

    const title = `📋 Daily Task Digest (${tasks.length} tasks)`;
    const message = `You have ${tasks.length} tasks scheduled for tomorrow:\n\n${taskList}`;

    await notificationModel.createNotification(
      parseInt(userId), // Ensure user_id is number
      'daily_digest',
      title,
      message
    );
  }
}

module.exports = new NotificationService();