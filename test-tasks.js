// test-tasks.js
const { query } = require('./config/database');

async function testTasks() {
  try {
    console.log('🧪 Testing tasks database...');
    
    // Test with a specific user ID (replace with your actual user ID)
    const testUserId = 29;
    
    console.log('Checking all tasks for user:', testUserId);
    const tasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [testUserId]);
    
    console.log(`✅ Found ${tasks.length} tasks`);
    
    if (tasks.length > 0) {
      console.log('Sample task:', {
        id: tasks[0].task_id,
        title: tasks[0].title,
        due_date: tasks[0].due_date,
        completed: tasks[0].completed,
        pet: tasks[0].pet_name
      });
    }
    
    // Test the overview queries
    console.log('\n🧪 Testing overview queries...');
    
    const overdue = await query(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      AND completed = false
      AND due_date < NOW()
    `, [testUserId]);
    
    const today = await query(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      AND completed = false
      AND DATE(due_date) = CURDATE()
    `, [testUserId]);
    
    console.log('Overdue tasks:', overdue[0].count);
    console.log('Today tasks:', today[0].count);
    
  } catch (error) {
    console.error('❌ Task test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testTasks()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { testTasks };