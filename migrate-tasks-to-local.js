// migrate-tasks-to-local.js
const { query } = require('./config/database');

async function migrateTasksToLocalTime() {
  try {
    // console.log('Starting migration of tasks to local time...');
    
    // Get all tasks
    const tasks = await query('SELECT task_id, due_date FROM tasks');
    
    // console.log(`Found ${tasks.length} tasks to migrate`);
    
    for (const task of tasks) {
      if (task.due_date) {
        // Convert the date to local time string and back to ensure it's stored as local
        const localDate = new Date(task.due_date);
        
        // Update the task with the local time
        await query('UPDATE tasks SET due_date = ? WHERE task_id = ?', [localDate, task.task_id]);
        
        // console.log(`Migrated task ${task.task_id}: ${task.due_date} -> ${localDate}`);
      }
    }
    
    // console.log('Migration completed successfully!');
  } catch (error) {
    // console.error('Migration failed:', error);
  }
}

// Run the migration
migrateTasksToLocalTime();