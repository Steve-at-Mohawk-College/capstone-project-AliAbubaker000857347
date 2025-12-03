const { query } = require('../config/database');
const { 
  toMySQLDateTime, 
  formatForDateTimeLocal,
  parseDateTimeLocalToEST,
  isFutureDate,
  DEFAULT_TIMEZONE 
} = require('../utils/timezone');

const moment = require('moment-timezone');

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
    if (!description) return true;
    if (typeof description !== 'string') return false;
    return description.length <= 500;
  },

  validateStartTime: (startTime) => {
    if (!startTime) return false;
    // For editing, just check it's a valid date, not the time restriction
    const date = new Date(startTime);
    return !isNaN(date.getTime());
  },
  
  validateEndTime: (endTime, startTime) => {
    if (!endTime || !startTime) return false;
    
    const endDate = new Date(endTime);
    const startDate = new Date(startTime);
    
    // Just check that end is after start (if both dates are valid)
    if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
      return false;
    }
    
    return endDate > startDate;
  },

  // UPDATED: Remove time restriction for editing
  validateDueDate: (dueDate) => {
    if (!dueDate) return false;
    
    // Just validate that it's a valid date
    const date = new Date(dueDate);
    return !isNaN(date.getTime());
  }
};

// Update formatDateForInput function
function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  // Convert database UTC time to local timezone
  return formatForDateTimeLocal(dateString);
}

// Update parseDateTimeLocalInput function
function parseDateTimeLocalInput(dateTimeString) {
  if (!dateTimeString) return null;
  
  // Parse as local time (datetime-local input is in local time)
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create date in local timezone
  const localDate = new Date(year, month - 1, day, hours, minutes);
  
  return localDate;
}

async function createTask(userId, taskData) {
  // Input validation
  if (!validationRules.validateTitle(taskData.title)) {
    throw new Error('Invalid title format');
  }
  
  if (!validationRules.validateDescription(taskData.description)) {
    throw new Error('Invalid description format');
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

  // Add validation for start_time and end_time
  if (!validationRules.validateStartTime(taskData.start_time)) {
    throw new Error('Start time must be in the future');
  }
  
  if (!validationRules.validateEndTime(taskData.end_time, taskData.start_time)) {
    throw new Error('End time must be after start time and within 1 year');
  }

  // Convert dates to MySQL datetime strings (in EST)
  const startTimeMySQL = toMySQLDateTime(taskData.start_time);
  const endTimeMySQL = toMySQLDateTime(taskData.end_time);
  const dueDateMySQL = toMySQLDateTime(taskData.start_time); // due_date = start_time
  
  const sql = `
    INSERT INTO tasks (user_id, pet_id, task_type, title, description, due_date, start_time, end_time, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  try {
    const result = await query(sql, [
      userId, 
      taskData.pet_id, 
      taskData.task_type, 
      taskData.title.trim(),
      taskData.description ? taskData.description.trim() : null,
      dueDateMySQL,
      startTimeMySQL,
      endTimeMySQL,
      taskData.priority
    ]);
    
    return result;
  } catch (error) {
    throw new Error('Database error: ' + error.message);
  }
}

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
    AND t.start_time BETWEEN ? AND ?
    ORDER BY t.start_time ASC
  `;
  
  const tasks = await query(sql, [userId, now, futureDate]);
  
  // Format dates for display (local time)
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  });
}

async function getTasksByUser(userId) {
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ? AND p.user_id = ?
    ORDER BY t.start_time ASC
  `;
  
  const tasks = await query(sql, [userId, userId]);
  
  // Format dates for display (local time)
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  });
}

// FIXED: Add the missing updateTask function
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
  
  // UPDATED: Use start_time validation (with time restriction for editing)
  if (!validationRules.validateStartTime(taskData.due_date)) { // Changed from start_time to due_date
    throw new Error('Start time must be in the future');
  }
  
  if (!validationRules.priority.includes(taskData.priority)) {
    throw new Error('Invalid priority');
  }

  // Parse the datetime-local input (already in local time)
  const startDate = parseDateTimeLocalInput(taskData.due_date); // Changed from start_time to due_date
  
  if (!startDate || isNaN(startDate.getTime())) {
    throw new Error('Invalid start time format');
  }

  const sql = `
    UPDATE tasks SET title=?, description=?, due_date=?, start_time=?, priority=?
    WHERE task_id=? AND user_id=?
  `;
  
  return query(sql, [
    taskData.title.trim(),
    taskData.description ? taskData.description.trim() : null,
    startDate,  // due_date = start_time
    startDate,  // start_time
    taskData.priority,
    taskId,
    userId
  ]);
}

async function getFutureTasks(userId) {
  const now = new Date();
  
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ? 
    AND t.completed = false
    AND t.start_time > ?
    ORDER BY t.start_time ASC
  `;
  
  const tasks = await query(sql, [userId, now]);
  
  // Format dates for display (local time)
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  });
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
    const task = results[0];
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  }
  
  return null;
}

// FIXED: Only ONE module.exports statement at the end
module.exports = { 
  getTasksByUser, 
  createTask, 
  updateTask,
  deleteTask, 
  getTaskById,
  getUpcomingTasks,
  getFutureTasks,  
  validationRules,
  completeTask,
  formatDateForInput,
  parseDateTimeLocalInput
};