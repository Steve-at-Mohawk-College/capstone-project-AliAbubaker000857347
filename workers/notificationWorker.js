const notificationService = require('../services/notificationService');

class NotificationWorker {
  constructor() {
    this.isRunning = false;
    this.intervals = [];
  }

  start() {
    if (this.isRunning) {
      // console.log('Notification worker is already running');
      return;
    }

    // console.log('🚀 Starting notification worker...');
    this.isRunning = true;

    // Check for due tasks every minute
    const taskCheckInterval = setInterval(async () => {
      try {
        await notificationService.checkDueTasks();
      } catch (error) {
        // console.error('Error in task check interval:', error);
      }
    }, 60 * 1000); // Every minute

    // Check for tomorrow's tasks every hour
    const digestInterval = setInterval(async () => {
      try {
        // Only run at 8 PM daily
        const now = new Date();
        if (now.getHours() === 20) { // 8 PM
          await notificationService.checkTomorrowTasks();
        }
      } catch (error) {
        // console.error('Error in digest interval:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    this.intervals.push(taskCheckInterval, digestInterval);

    // Run initial check
    notificationService.checkDueTasks().catch(console.error);
  }

  stop() {
    // console.log('🛑 Stopping notification worker...');
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  // Manual trigger for testing
  async manualCheck() {
    // console.log('🔍 Manual notification check triggered');
    const dueCount = await notificationService.checkDueTasks();
    const tomorrowCount = await notificationService.checkTomorrowTasks();
    
    return {
      dueTasksProcessed: dueCount,
      tomorrowTasksProcessed: tomorrowCount
    };
  }
}

module.exports = new NotificationWorker();