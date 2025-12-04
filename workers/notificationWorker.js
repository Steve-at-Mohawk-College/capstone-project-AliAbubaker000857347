const notificationService = require('../services/notificationService');

class NotificationWorker {
  constructor() {
    this.isRunning = false;
    this.intervals = [];
  }

  /**
   * Starts the notification worker with two intervals:
   * 1. Checks for due tasks every minute
   * 2. Checks for tomorrow's tasks daily at 8 PM (runs hourly, triggers at 20:00)
   * 
   * @method start
   * @returns {void}
   */
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    const taskCheckInterval = setInterval(async () => {
      try {
        await notificationService.checkDueTasks();
      } catch (error) { }
    }, 60 * 1000);
    const digestInterval = setInterval(async () => {
      try {
        const now = new Date();
        if (now.getHours() === 20) {
          await notificationService.checkTomorrowTasks();
        }
      } catch (error) { }
    }, 60 * 60 * 1000);
    this.intervals.push(taskCheckInterval, digestInterval);
    notificationService.checkDueTasks().catch(() => { });
  }

  /**
   * Stops all active intervals and halts the notification worker.
   * 
   * @method stop
   * @returns {void}
   */
  stop() {
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  /**
   * Manually triggers both due and tomorrow task checks.
   * Primarily used for testing purposes.
   * 
   * @async
   * @method manualCheck
   * @returns {Promise<Object>} Object containing counts of processed tasks
   */
  async manualCheck() {
    const dueCount = await notificationService.checkDueTasks();
    const tomorrowCount = await notificationService.checkTomorrowTasks();
    return { dueTasksProcessed: dueCount, tomorrowTasksProcessed: tomorrowCount };
  }
}

module.exports = new NotificationWorker();