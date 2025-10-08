const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { 
  getTasksByUser, 
  createTask, 
  updateTask, 
  deleteTask,
  getTaskById
} = require('../models/taskModel');

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

module.exports = router;