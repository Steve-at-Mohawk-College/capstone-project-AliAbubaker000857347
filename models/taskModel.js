const { query } = require('../config/database');



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

  validateDueDate: (dueDate) => {
    // console.log('🔍 [VALIDATE] validateDueDate called with:', dueDate);
    
    if (!dueDate) {
      // console.log('❌ [VALIDATE] No due date provided');
      return false;
    }
    
    const selectedDate = parseDateTimeLocalInput(dueDate);
    const now = new Date();
    
    // console.log('🔍 [VALIDATE] Selected date:', selectedDate.toString());
    // console.log('🔍 [VALIDATE] Current time:', now.toString());
    
    // Use timestamps for comparison (simpler and more reliable)
    const selectedTime = selectedDate.getTime();
    const nowTime = now.getTime();
    const minTime = nowTime + (10 * 60 * 1000);
    
    // console.log('🔍 [VALIDATE] Timestamps - Selected:', selectedTime, 'Now:', nowTime, 'Min:', minTime);
    // console.log('🔍 [VALIDATE] Difference:', (selectedTime - minTime) / 1000 / 60, 'minutes');
    
    if (selectedTime < minTime) {
      const minutesEarly = (minTime - selectedTime) / 1000 / 60;
      // console.log('❌ [VALIDATE] Too early by', minutesEarly.toFixed(1), 'minutes');
      return false;
    }
    
    const maxTime = nowTime + (365 * 24 * 60 * 60 * 1000);
    if (selectedTime > maxTime) {
      // console.log('❌ [VALIDATE] More than 1 year in future');
      return false;
    }
    
    // console.log('✅ [VALIDATE] Validation passed');
    return true;
  }
};


function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  // console.log('🔍 formatDateForInput received:', dateString);
  
  let date;
  if (dateString instanceof Date) {
    date = dateString;
  } else {
    // Parse as local time - don't let JavaScript convert to UTC
    const mysqlDate = new Date(dateString);
    
    // Create a new date in local timezone using the components
    date = new Date(
      mysqlDate.getFullYear(),
      mysqlDate.getMonth(),
      mysqlDate.getDate(),
      mysqlDate.getHours(),
      mysqlDate.getMinutes(),
      mysqlDate.getSeconds()
    );
  }
  
  // Use local time methods
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}T${hours}:${minutes}`;
  // console.log('🔍 formatDateForInput returning:', result);
  
  return result;
}


// Add this function to your task model if it's missing
function parseDateTimeLocalInput(dateTimeString) {
  // console.log('🔍 parseDateTimeLocalInput called with:', dateTimeString);
  
  if (!dateTimeString) return null;
  
  // datetime-local input is in local time, create date directly without UTC conversion
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create date in local timezone (this is crucial!)
  const date = new Date(year, month - 1, day, hours, minutes);
  
  // console.log('🔍 Parsed local date:', {
  //   input: dateTimeString,
  //   result: date.toString(),
  //   iso: date.toISOString(),
  //   localHours: date.getHours(),
  //   localMinutes: date.getMinutes()
  // });
  
  return date;
}

async function createTask(userId, taskData) {
  // console.log('🔍 [DEBUG] createTask called with data:', JSON.stringify(taskData, null, 2));
  
  // Input validation
  if (!validationRules.validateTitle(taskData.title)) {
    // console.log('❌ [DEBUG] Title validation failed');
    throw new Error('Invalid title format');
  }
  
  if (!validationRules.validateDescription(taskData.description)) {
    // console.log('❌ [DEBUG] Description validation failed');
    throw new Error('Invalid description format');
  }
  
  if (!validationRules.validateDueDate(taskData.due_date)) {
    // console.log('❌ [DEBUG] Due date validation failed - must be at least 20 minutes from now');
    throw new Error('Due date must be at least 20 minutes from now and within 1 year');
  }
  
  if (!validationRules.taskType.includes(taskData.task_type)) {
    // console.log('❌ [DEBUG] Task type validation failed');
    throw new Error('Invalid task type');
  }
  
  if (!validationRules.priority.includes(taskData.priority)) {
    // console.log('❌ [DEBUG] Priority validation failed');
    throw new Error('Invalid priority');
  }

  // Verify pet ownership
  const petCheck = await query(
    'SELECT pet_id FROM pets WHERE pet_id = ? AND user_id = ?',
    [taskData.pet_id, userId]
  );
  
  if (petCheck.length === 0) {
    // console.log('❌ [DEBUG] Pet ownership verification failed');
    throw new Error('Pet not found or access denied');
  }

  // Parse the datetime-local input (already in local time)
  const dueDate = parseDateTimeLocalInput(taskData.due_date);
  
  if (!dueDate || isNaN(dueDate.getTime())) {
    // console.log('❌ [DEBUG] Invalid due date format after parsing');
    throw new Error('Invalid due date format');
  }

  // console.log('🔍 [DEBUG] Final due date to be stored:', dueDate.toString());

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
    dueDate,  // Store as local time
    taskData.priority
  ]);
  
  // console.log('✅ [DEBUG] Task created successfully');
  return result;
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
    AND t.due_date BETWEEN ? AND ?
    ORDER BY t.due_date ASC
  `;
  
  const tasks = await query(sql, [userId, now, futureDate]);
  
  // Format dates for display (local time)
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    return task;
  });
}

async function getTasksByUser(userId) {
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ? AND p.user_id = ?
    ORDER BY t.due_date ASC
  `;
  
  const tasks = await query(sql, [userId, userId]);
  
  // Format dates for display (local time)
  return tasks.map(task => {
    task.due_date = formatDateForInput(task.due_date);
    return task;
  });
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
    throw new Error('Invalid due date'); // This will now show 20 minutes requirement
  }
  
  if (!validationRules.priority.includes(taskData.priority)) {
    throw new Error('Invalid priority');
  }

  // Parse the datetime-local input (already in local time)
  const dueDate = parseDateTimeLocalInput(taskData.due_date);
  
  if (!dueDate || isNaN(dueDate.getTime())) {
    throw new Error('Invalid due date format');
  }

  const sql = `
    UPDATE tasks SET title=?, description=?, due_date=?, priority=?
    WHERE task_id=? AND user_id=?
  `;
  
  return query(sql, [
    taskData.title.trim(),
    taskData.description ? taskData.description.trim() : null,
    dueDate,  // Store as local time
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
    const task = results[0];
    task.due_date = formatDateForInput(task.due_date);
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
  validationRules,
  completeTask,
  formatDateForInput,
  parseDateTimeLocalInput
};