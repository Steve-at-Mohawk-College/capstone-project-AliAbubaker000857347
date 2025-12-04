const { query } = require('../config/database');
const { 
  toMySQLDateTime, 
  formatForDateTimeLocal
} = require('../utils/timezone');

const validationRules = {
  taskType: ['feeding', 'cleaning', 'vaccination', 'medication', 'grooming', 'vet_visit', 'exercise', 'other'],
  priority: ['low', 'medium', 'high'],
  
  /**
   * Validates task title format and length.
   * @param {string} title - Task title to validate
   * @returns {boolean} True if title is valid (1-100 chars, alphanumeric + basic punctuation)
   */
  validateTitle: (title) => {
    if (typeof title !== 'string') return false;
    const trimmed = title.trim();
    return trimmed.length >= 1 && 
           trimmed.length <= 100 && 
           /^[a-zA-Z0-9\s\-_,.!()]+$/.test(trimmed);
  },
  
  /**
   * Validates task description length.
   * @param {string} description - Task description to validate
   * @returns {boolean} True if description is valid or empty (max 500 chars)
   */
  validateDescription: (description) => {
    if (!description) return true;
    if (typeof description !== 'string') return false;
    return description.length <= 500;
  },

  /**
   * Validates task start time is a valid date.
   * @param {string} startTime - Start time to validate
   * @returns {boolean} True if start time is a valid date
   */
  validateStartTime: (startTime) => {
    if (!startTime) return false;
    const date = new Date(startTime);
    return !isNaN(date.getTime());
  },
  
  /**
   * Validates task end time is after start time.
   * @param {string} endTime - End time to validate
   * @param {string} startTime - Start time to compare against
   * @returns {boolean} True if end time is valid and after start time
   */
  validateEndTime: (endTime, startTime) => {
    if (!endTime || !startTime) return false;
    
    const endDate = new Date(endTime);
    const startDate = new Date(startTime);
    
    if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
      return false;
    }
    
    return endDate > startDate;
  },

  /**
   * Validates task due date is a valid date.
   * @param {string} dueDate - Due date to validate
   * @returns {boolean} True if due date is a valid date
   */
  validateDueDate: (dueDate) => {
    if (!dueDate) return false;
    const date = new Date(dueDate);
    return !isNaN(date.getTime());
  }
};

/**
 * Formats a date string for datetime-local input fields.
 * Converts database UTC time to local timezone.
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string or empty string if invalid
 */
function formatDateForInput(dateString) {
  if (!dateString) return '';
  return formatForDateTimeLocal(dateString);
}

/**
 * Parses datetime-local input string to Date object.
 * datetime-local input is in local timezone.
 * @param {string} dateTimeString - datetime-local format string (YYYY-MM-DDTHH:mm)
 * @returns {Date|null} Date object or null if invalid
 */
function parseDateTimeLocalInput(dateTimeString) {
  if (!dateTimeString) return null;
  
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  const localDate = new Date(year, month - 1, day, hours, minutes);
  
  return localDate;
}

/**
 * Creates a new task with comprehensive validation.
 * Verifies pet ownership and converts dates to MySQL format (EST).
 * 
 * @param {number} userId - ID of the user creating the task
 * @param {Object} taskData - Task information
 * @param {number} taskData.pet_id - ID of the associated pet
 * @param {string} taskData.task_type - Type of task (must be in validationRules.taskType)
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description (optional)
 * @param {string} taskData.start_time - Task start time
 * @param {string} taskData.end_time - Task end time
 * @param {string} taskData.priority - Task priority (must be in validationRules.priority)
 * @returns {Promise<Object>} Database insert result
 * @throws {Error} If validation fails or pet not found
 */
async function createTask(userId, taskData) {
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

  const petCheck = await query(
    'SELECT pet_id FROM pets WHERE pet_id = ? AND user_id = ?',
    [taskData.pet_id, userId]
  );
  
  if (petCheck.length === 0) {
    throw new Error('Pet not found or access denied');
  }

  if (!validationRules.validateStartTime(taskData.start_time)) {
    throw new Error('Start time must be in the future');
  }
  
  if (!validationRules.validateEndTime(taskData.end_time, taskData.start_time)) {
    throw new Error('End time must be after start time and within 1 year');
  }

  const startTimeMySQL = toMySQLDateTime(taskData.start_time);
  const endTimeMySQL = toMySQLDateTime(taskData.end_time);
  const dueDateMySQL = toMySQLDateTime(taskData.start_time);
  
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

/**
 * Retrieves upcoming tasks for a user within specified days.
 * Tasks are ordered by start time (earliest first).
 * 
 * @param {number} userId - ID of the user
 * @param {number} [days=3] - Number of days ahead to look for tasks
 * @returns {Promise<Array>} Array of task objects with formatted dates and pet names
 */
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
  
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  });
}

/**
 * Retrieves all tasks for a specific user.
 * Includes pet names and formats dates for display.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Array>} Array of all user's task objects
 */
async function getTasksByUser(userId) {
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ? AND p.user_id = ?
    ORDER BY t.start_time ASC
  `;
  
  const tasks = await query(sql, [userId, userId]);
  
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  });
}

/**
 * Updates an existing task with validation and ownership verification.
 * 
 * @param {number} taskId - ID of the task to update
 * @param {number} userId - ID of the user who owns the task
 * @param {Object} taskData - Fields to update
 * @param {string} taskData.title - Updated task title
 * @param {string} taskData.description - Updated task description
 * @param {string} taskData.due_date - Updated due date (also sets start_time)
 * @param {string} taskData.priority - Updated task priority
 * @returns {Promise<Object>} Database update result
 * @throws {Error} If validation fails, task not found, or access denied
 */
async function updateTask(taskId, userId, taskData) {
  const taskCheck = await query(
    'SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  
  if (taskCheck.length === 0) {
    throw new Error('Task not found or access denied');
  }

  if (!validationRules.validateTitle(taskData.title)) {
    throw new Error('Invalid title format');
  }
  
  if (!validationRules.validateDescription(taskData.description)) {
    throw new Error('Invalid description format');
  }
  
  if (!validationRules.validateStartTime(taskData.due_date)) {
    throw new Error('Start time must be in the future');
  }
  
  if (!validationRules.priority.includes(taskData.priority)) {
    throw new Error('Invalid priority');
  }

  const startDate = parseDateTimeLocalInput(taskData.due_date);
  
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
    startDate,
    startDate,
    taskData.priority,
    taskId,
    userId
  ]);
}

/**
 * Retrieves future tasks (uncompleted tasks with start time after now).
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Array>} Array of future task objects with formatted dates
 */
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
  
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    task.start_time = formatDateForInput(task.start_time);
    task.end_time = formatDateForInput(task.end_time);
    return task;
  });
}

/**
 * Marks a task as completed.
 * 
 * @param {number} taskId - ID of the task to complete
 * @param {number} userId - ID of the user who owns the task
 * @returns {Promise<Object>} Database update result
 * @throws {Error} If task not found or access denied
 */
async function completeTask(taskId, userId) {
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

/**
 * Deletes a task after verifying ownership.
 * 
 * @param {number} taskId - ID of the task to delete
 * @param {number} userId - ID of the user who owns the task
 * @returns {Promise<Object>} Database delete result
 * @throws {Error} If task not found or access denied
 */
async function deleteTask(taskId, userId) {
  const taskCheck = await query(
    'SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  
  if (taskCheck.length === 0) {
    throw new Error('Task not found or access denied');
  }
  
  return query('DELETE FROM tasks WHERE task_id=? AND user_id=?', [taskId, userId]);
}

/**
 * Retrieves a specific task by ID with ownership verification.
 * 
 * @param {number} taskId - ID of the task
 * @param {number} userId - ID of the user who owns the task
 * @returns {Promise<Object|null>} Task object with formatted dates or null if not found
 */
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