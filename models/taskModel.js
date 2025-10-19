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
  // Handle both local datetime and ISO strings
  let date;
  if (dueDate && !dueDate.includes('Z') && !dueDate.includes('+')) {
    // This is a datetime-local input (no timezone)
    date = new Date(dueDate);
  } else {
    // This is already an ISO string with timezone
    date = new Date(dueDate);
  }
  
  const now = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(now.getFullYear() + 1);
  
  return date instanceof Date && 
         !isNaN(date) && 
         date > now && 
         date <= maxDate;
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

  let dueDate = taskData.due_date;
// Remove the if block that converts to ISO string
// Just use the dueDate as provided by the form

console.log('📅 Due date stored as:', dueDate);

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
    console.log('🕒 Timezone conversion (update):', taskData.due_date, '→', dueDate);
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


// Add this method to your taskModel.js
async function completeTask(taskId, userId) {
  // Verify ownership
  const taskCheck = await query(
    'SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  
  if (taskCheck.length === 0) {
    throw new Error('Task not found or access denied');
  }

  // Remove completed_at from the query since the column doesn't exist
  const sql = `
    UPDATE tasks 
    SET completed = true, completed_at = NOW(), notification_sent = true
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
  return results[0] || null;
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