const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { 
  getTasksByUser, 
  createTask, 
  updateTask, 
  deleteTask,
  getTaskById,
  completeTask,
    getUpcomingTasks
} = require('../models/taskModel');

// ADD THIS IMPORT - this was missing!
const { query } = require('../config/database');

const router = express.Router();

// Rate limiting
const createTaskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many tasks created, please try again later.'
});

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// GET /tasks/upcoming - Get tasks due in the next X days
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = parseInt(req.query.days) || 3;
    
    // Use the new function from taskModel
    const tasks = await getUpcomingTasks(userId, days);
    
    res.json(tasks);
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({ error: 'Error fetching upcoming tasks' });
  }
});

// Validation middleware
const validateTask = [
  body('pet_id')
    .isInt({ min: 1 })
    .withMessage('Invalid pet ID'),
  
  body('task_type')
    .isIn(['feeding', 'cleaning', 'vaccination', 'medication', 'grooming', 'vet_visit', 'exercise', 'other'])
    .withMessage('Invalid task type'),
  
  body('title')
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_,.!()]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  
  body('due_date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1);
      
      return dueDate > now && dueDate <= maxDate;
    })
    .withMessage('Due date must be in the future and within 1 year'),
  
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level')
];

// GET /tasks - Get all tasks for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const tasks = await getTasksByUser(req.session.userId);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Error fetching tasks.' });
  }
});

// POST /tasks - Create a new task
router.post('/', requireAuth, createTaskLimiter, validateTask, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('schedule-task', {
        title: 'Schedule Task',
        pets: req.pets || [],
        error: errors.array()[0].msg,
        preservedPetId: req.body.pet_id,
        preservedTaskType: req.body.task_type,
        preservedTitle: req.body.title,
        preservedDescription: req.body.description,
        preservedDueDate: req.body.due_date,
        preservedPriority: req.body.priority,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }

    const { pet_id, task_type, title, description, due_date, priority } = req.body;
    
    await createTask(req.session.userId, { 
      pet_id, 
      task_type, 
      title, 
      description, 
      due_date, 
      priority: priority || 'medium'
    });
    
    res.redirect('/dashboard?message=Task created successfully');
  } catch (error) {
    console.error('Create task error:', error);
    
    // Handle specific errors
    let errorMessage = 'Error creating task. Please try again.';
    if (error.message.includes('Pet not found') || error.message.includes('access denied')) {
      errorMessage = 'Invalid pet selection.';
    } else if (error.message.includes('Invalid')) {
      errorMessage = error.message;
    }
    
    res.status(500).render('schedule-task', {
      title: 'Schedule Task',
      pets: req.pets || [],
      error: errorMessage,
      preservedPetId: req.body.pet_id,
      preservedTaskType: req.body.task_type,
      preservedTitle: req.body.title,
      preservedDescription: req.body.description,
      preservedDueDate: req.body.due_date,
      preservedPriority: req.body.priority,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }
});

// PUT /tasks/:taskId - Update a task
router.put('/:taskId', requireAuth, [
  body('title')
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_,.!()]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  
  body('due_date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1);
      
      return dueDate > now && dueDate <= maxDate;
    })
    .withMessage('Due date must be in the future and within 1 year'),
  
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array()[0].msg 
      });
    }

    const { title, description, due_date, priority } = req.body;
    
    await updateTask(req.params.taskId, req.session.userId, { 
      title, 
      description, 
      due_date, 
      priority: priority || 'medium'
    });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Update task error:', error);
    
    let errorMessage = 'Error updating task.';
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      errorMessage = 'Task not found or access denied.';
    } else if (error.message.includes('Invalid')) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

// DELETE /tasks/:taskId - Delete a task
router.delete('/:taskId', requireAuth, async (req, res) => {
  try {
    await deleteTask(req.params.taskId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete task error:', error);
    
    let errorMessage = 'Error deleting task.';
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      errorMessage = 'Task not found or access denied.';
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

// GET /tasks/:taskId - Get a single task
router.get('/:taskId', requireAuth, async (req, res) => {
  try {
    const task = await getTaskById(req.params.taskId, req.session.userId);
    
    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found' 
      });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ 
      error: 'Error fetching task.' 
    });
  }
});

// Alternative version - simpler timezone handling
router.get('/api/tasks/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log('🔍 Fetching task overview for user:', userId);
    
    // Get all tasks first for debugging
    const allTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [userId]);
    
    console.log('🔍 All tasks for user:', allTasks.length);
    allTasks.forEach(task => {
      console.log(`- ${task.title}: due=${task.due_date}, completed=${task.completed}`);
    });

    // Get overdue tasks (simpler approach)
    const overdueTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ? 
      AND t.completed = false
      AND DATE(t.due_date) < CURDATE()
      ORDER BY t.due_date ASC
    `, [userId]);

    // Get today's tasks
    const todayTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ? 
      AND t.completed = false
      AND DATE(t.due_date) = CURDATE()
      ORDER BY t.due_date ASC
    `, [userId]);

    // Get tomorrow's tasks
    const tomorrowTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ? 
      AND t.completed = false
      AND DATE(t.due_date) = DATE(DATE_ADD(CURDATE(), INTERVAL 1 DAY))
      ORDER BY t.due_date ASC
    `, [userId]);

    // Get completed tasks
    const completedTasks = await query(`
  SELECT t.*, p.name as pet_name 
  FROM tasks t
  JOIN pets p ON t.pet_id = p.pet_id
  WHERE t.user_id = ? 
  AND t.completed = true
  ORDER BY t.updated_at DESC, t.due_date DESC
  LIMIT 50
`, [userId]);

    console.log('📊 Task overview results:', {
      overdue: overdueTasks.length,
      today: todayTasks.length,
      tomorrow: tomorrowTasks.length,
      completed: completedTasks.length
    });

    res.json({
      stats: {
        overdue: overdueTasks.length,
        today: todayTasks.length,
        tomorrow: tomorrowTasks.length,
        completed: completedTasks.length
      },
      overdue: overdueTasks,
      today: todayTasks,
      tomorrow: tomorrowTasks,
      completed: completedTasks
    });
  } catch (error) {
    console.error('❌ Get tasks overview error:', error);
    res.status(500).json({ 
      error: 'Error fetching tasks overview: ' + error.message 
    });
  }
});

// PUT /tasks/:taskId/complete - Mark task as complete
router.put('/:taskId/complete', requireAuth, async (req, res) => {
  try {
    await completeTask(req.params.taskId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Complete task error:', error);
    
    let errorMessage = 'Error completing task.';
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      errorMessage = 'Task not found or access denied.';
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

module.exports = router;