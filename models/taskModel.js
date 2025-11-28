const { query } = require('../config/database');

// Enhanced validation functions
const validationRules = {
  taskType: ['feeding', 'cleaning', 'vaccination', 'medication', 'grooming', 'vet_visit', 'exercise', 'other'],
  priority: ['low', 'medium', 'high'],
  
  validateTitle: (title) => {
    if (typeof title !== 'string') return false;
    const trimmed = title.trim();
    return trimmed.length >= 1 && 
           trimmed.length <= 100 && 
           /^[a-zA-Z0-9\s\-_,.!()]+$/.test(trimmed);
  },
  
  validateDescription: (description) => {
    if (!description) return true; // Optional field
    if (typeof description !== 'string') return false;
    return description.length <= 500;
  },
validateDueDate: (dueDate) => {
  if (!dueDate) return false;
  
  console.log('🔍 VALIDATION START - Input dueDate:', dueDate);
  
  let date;
  if (dueDate && !dueDate.includes('Z') && !dueDate.includes('+')) {
    // datetime-local input - treat as local time
    date = new Date(dueDate);
  } else {
    // ISO string with timezone
    date = new Date(dueDate);
  }
  
  const now = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(now.getFullYear() + 1);
  
  // Add 5 minute buffer to prevent false "past date" errors
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  const nowWithBuffer = new Date(now.getTime() - bufferTime);
  
  console.log('📊 VALIDATION DETAILS:');
  console.log('Parsed date:', date);
  console.log('Current time:', now);
  console.log('Current with buffer:', nowWithBuffer);
  console.log('Max date:', maxDate);
  console.log('Is date valid?', !isNaN(date));
  console.log('Is future?', date > nowWithBuffer);
  console.log('Within year?', date <= maxDate);
  
  const isValid = date instanceof Date && 
                  !isNaN(date) && 
                  date > nowWithBuffer && 
                  date <= maxDate;
  
  console.log('✅ FINAL VALIDATION RESULT:', isValid);
  return isValid;
}
};

// Add this function to your taskModel.js
async function getUpcomingTasks(userId, days = 3) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);
  
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ? 
    AND t.completed = false
    AND t.due_date BETWEEN ? AND ?
    ORDER BY t.due_date ASC
  `;
  
  return query(sql, [userId, now, futureDate]);
}

async function getTasksByUser(userId) {
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ? AND p.user_id = ?
    ORDER BY t.due_date ASC
  `;
  return query(sql, [userId, userId]);
}





async function createTask(userId, taskData) {
  // Input validation
  if (!validationRules.validateTitle(taskData.title)) {
    throw new Error('Invalid title format');
  }
  
  if (!validationRules.validateDescription(taskData.description)) {
    throw new Error('Invalid description format');
  }
  
  if (!validationRules.validateDueDate(taskData.due_date)) {
    throw new Error('Invalid due date');
  }
  
  if (!validationRules.taskType.includes(taskData.task_type)) {
    throw new Error('Invalid task type');
  }
  
  if (!validationRules.priority.includes(taskData.priority)) {
    throw new Error('Invalid priority');
  }

  // Verify pet ownership
  const petCheck = await query(
    'SELECT pet_id FROM pets WHERE pet_id = ? AND user_id = ?',
    [taskData.pet_id, userId]
  );
  
  if (petCheck.length === 0) {
    throw new Error('Pet not found or access denied');
  }

  // FIX: Proper timezone handling for due_date
  let dueDate = taskData.due_date;
  
  // If it's a datetime-local input (no timezone), convert to UTC
  if (dueDate && !dueDate.includes('Z') && !dueDate.includes('+')) {
    // Create date object from local time
    const localDate = new Date(dueDate);
    
    // Convert to UTC ISO string for storage
    dueDate = localDate.toISOString();
    
    console.log('🕒 Timezone conversion (create):', taskData.due_date, '→', dueDate);
  }

  const sql = `
    INSERT INTO tasks (user_id, pet_id, task_type, title, description, due_date, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    userId, 
    taskData.pet_id, 
    taskData.task_type, 
    taskData.title.trim(),
    taskData.description ? taskData.description.trim() : null,
    dueDate,  // Use the processed due date with timezone
    taskData.priority
  ]);
  
  return result;
}






async function updateTask(taskId, userId, taskData) {
  // First verify task ownership
  const taskCheck = await query(
    'SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  
  if (taskCheck.length === 0) {
    throw new Error('Task not found or access denied');
  }

  // Input validation
  if (!validationRules.validateTitle(taskData.title)) {
    throw new Error('Invalid title format');
  }
  
  if (!validationRules.validateDescription(taskData.description)) {
    throw new Error('Invalid description format');
  }
  
  if (!validationRules.validateDueDate(taskData.due_date)) {
    throw new Error('Invalid due date');
  }
  
  if (!validationRules.priority.includes(taskData.priority)) {
    throw new Error('Invalid priority');
  }

  // Handle timezone for due_date - FIX ADDED HERE
  let dueDate = taskData.due_date;
  
  if (dueDate && !dueDate.includes('Z') && !dueDate.includes('+')) {
    const localDate = new Date(dueDate);
    dueDate = localDate.toISOString();
    // console.log('🕒 Timezone conversion (update):', taskData.due_date, '→', dueDate);
  }

  const sql = `
    UPDATE tasks SET title=?, description=?, due_date=?, priority=?
    WHERE task_id=? AND user_id=?
  `;
  
  return query(sql, [
    taskData.title.trim(),
    taskData.description ? taskData.description.trim() : null,
    dueDate,  // Use the processed due date
    taskData.priority,
    taskId,
    userId
  ]);
}


async function completeTask(taskId, userId) {
    // Verify ownership
    const taskCheck = await query(
        'SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?',
        [taskId, userId]
    );
    
    if (taskCheck.length === 0) {
        throw new Error('Task not found or access denied');
    }

    const sql = `
        UPDATE tasks 
        SET completed = true, completed_at = NOW()
        WHERE task_id = ? AND user_id = ?
    `;
    
    return query(sql, [taskId, userId]);
}



async function deleteTask(taskId, userId) {
  // Verify ownership before deletion
  const taskCheck = await query(
    'SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  
  if (taskCheck.length === 0) {
    throw new Error('Task not found or access denied');
  }
  
  return query('DELETE FROM tasks WHERE task_id=? AND user_id=?', [taskId, userId]);
}

async function getTaskById(taskId, userId) {
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.task_id = ? AND t.user_id = ? AND p.user_id = ?
  `;
  
  const results = await query(sql, [taskId, userId, userId]);
  
  if (results[0]) {
    // Convert UTC date from database to local time for display
    const task = results[0];
    if (task.due_date) {
      // Create a date object from the UTC time in database
      const utcDate = new Date(task.due_date);
      // This will automatically display in the user's local timezone
      task.due_date = utcDate.toISOString(); // Keep as ISO string but now it's properly interpreted
    }
    return task;
  }
  
  return null;
}

module.exports = { 
  getTasksByUser, 
  createTask, 
  updateTask, 
  deleteTask, 
  getTaskById,
  getUpcomingTasks, // Add this line
  validationRules,
  completeTask 
};