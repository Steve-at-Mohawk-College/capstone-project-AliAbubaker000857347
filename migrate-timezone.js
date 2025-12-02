// migrate-timezone.js - SIMPLIFIED VERSION
const { query } = require('./config/database');
const moment = require('moment-timezone');

async function migrateTasksTimezone() {
  try {
    // console.log('Starting timezone migration...');
    
    // First, set MySQL timezone to EST offset
    await query(`SET time_zone = '-05:00'`);
    
    // console.log('✅ Database timezone set to EST (-05:00)');
    
    // Get all tasks to verify
    const tasks = await query('SELECT task_id, due_date, start_time, end_time FROM tasks LIMIT 5');
    
    // console.log(`Found ${tasks.length} sample tasks`);
    
    // Just show current values, no migration needed if using the new functions
    for (const task of tasks) {
    //   console.log(`Task ${task.task_id}:`, {
    //     due_date: task.due_date,
    //     start_time: task.start_time,
    //     end_time: task.end_time
    //   });
    }
    
    // console.log('Timezone setup completed!');
    // console.log('All new tasks will be stored in EST timezone.');
    
  } catch (error) {
    // console.error('Migration failed:', error.message);
  }
}

migrateTasksTimezone();