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
const { query } = require('../config/database');
const router = express.Router();

/**
 * Rate limiter for creating tasks that limits each user to 20 requests per 15 minutes.
 * Uses user ID for rate limiting instead of IP address.
 * Provides custom error handling that renders the schedule task form with error message.
 *
 * @const createTaskLimiter
 * @type {RateLimit}
 */
const createTaskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: function (req) {
    return req.session.userId || req.ip;
  },
  skipFailedRequests: true,
  handler: async function (req, res, next) {
    try {
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      const remainingTime = Math.ceil(this.windowMs / 60000);
      return res.status(429).render('schedule-task', {
        title: 'Schedule Task - Pet Care',
        pets: pets || [],
        username: req.session.username,
        profilePicture: req.session.profilePicture,
        error: `Too many tasks created. Please wait ${remainingTime} minutes before creating another task.`,
        preservedPetId: req.body.pet_id,
        preservedTaskType: req.body.task_type,
        preservedTitle: req.body.title,
        preservedDescription: req.body.description,
        preservedStartTime: req.body.start_time,
        preservedEndTime: req.body.end_time,
        preservedPriority: req.body.priority
      });
    } catch (error) {
      return res.status(429).send(`Too many tasks created. Please wait 15 minutes before creating another task.`);
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware function that checks if a user is authenticated.
 * If authenticated, proceeds to the next middleware/route handler.
 * Otherwise, redirects to the login page.
 *
 * @function requireAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

/**
 * GET /tasks/schedule
 * Renders the schedule task form for authenticated users.
 * Redirects to add pet page if user has no pets.
 *
 * @name GET /tasks/schedule
 * @function
 * @memberof module:routes/taskRoute
 */
router.get('/schedule', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    if (pets.length === 0) {
      return res.redirect('/pets/add?message=Please add a pet first.');
    }
    res.render('schedule-task', {
      title: 'Schedule Task - Pet Care',
      username: req.session.username,
      profilePicture: req.session.profilePicture,
      pets
    });
  } catch (err) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading task form.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

/**
 * GET /tasks/debug/timezone
 * Returns debugging information about server timezone and date handling.
 *
 * @name GET /tasks/debug/timezone
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Object} JSON with server timezone information
 */
router.get('/debug/timezone', requireAuth, async (req, res) => {
  const now = new Date();
  const testDate = new Date(now.getTime() + 30 * 60 * 1000);
  res.json({
    serverTime: {
      local: now.toString(),
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezoneOffset: now.getTimezoneOffset(),
      utc: now.toUTCString()
    },
    testDate: {
      local: testDate.toString(),
      iso: testDate.toISOString(),
      timestamp: testDate.getTime()
    },
    headers: {
      'date-header': req.headers.date
    }
  });
});

/**
 * GET /tasks/upcoming
 * Retrieves tasks due in the next specified number of days for the authenticated user.
 *
 * @name GET /tasks/upcoming
 * @function
 * @memberof module:routes/taskRoute
 * @param {number} req.query.days - Number of days to look ahead (default: 3)
 * @returns {Array} Array of upcoming task objects
 */
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = parseInt(req.query.days) || 3;
    const tasks = await getUpcomingTasks(userId, days);
    res.json(tasks);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching upcoming tasks' });
  }
});

/**
 * Validation middleware for task creation that validates all task fields.
 * Validates pet ID, task type, title, description, start time, end time, and priority.
 *
 * @const validateTask
 * @type {Array}
 */
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
  body('start_time')
    .custom((value) => {
      if (!value) {
        throw new Error('Start time is required');
      }
      const now = new Date();
      const selectedDate = new Date(value);
      const bufferMinutes = 15;
      const bufferMs = bufferMinutes * 60 * 1000;
      const isValid = selectedDate.getTime() > (now.getTime() - bufferMs);
      if (!isValid) {

      }
      return true;
    })
    .withMessage('Start time must be in the future'),
  body('end_time')
    .custom((value, { req }) => {
      if (!value || !req.body.start_time) return false;
      const endDate = new Date(value);
      const startDate = new Date(req.body.start_time);
      const now = new Date();
      if (endDate <= startDate) return false;
      const maxTime = now.getTime() + (365 * 24 * 60 * 60 * 1000);
      return endDate.getTime() <= maxTime;
    })
    .withMessage('End time must be after start time and within 1 year'),
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level')
];

/**
 * GET /tasks
 * Retrieves all tasks for the authenticated user.
 *
 * @name GET /tasks
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Array} Array of all task objects for the user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tasks = await getTasksByUser(req.session.userId);
    res.json(tasks);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching tasks.' });
  }
});

/**
 * POST /tasks
 * Creates a new task for the authenticated user with comprehensive validation.
 * Includes rate limiting to prevent excessive task creation.
 *
 * @name POST /tasks
 * @function
 * @memberof module:routes/taskRoute
 * @param {Object} req.body - Task data including pet_id, task_type, title, description, start_time, end_time, priority
 * @returns {void} Redirects to dashboard on success or renders form with errors
 */
router.post('/', requireAuth, createTaskLimiter, validateTask, async (req, res) => {

  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      return res.status(400).render('schedule-task', {
        title: 'Schedule Task - Pet Care',
        pets: pets || [],
        username: req.session.username,
        profilePicture: req.session.profilePicture,
        error: errors.array()[0].msg,
        preservedPetId: req.body.pet_id,
        preservedTaskType: req.body.task_type,
        preservedTitle: req.body.title,
        preservedDescription: req.body.description,
        preservedStartTime: req.body.start_time,
        preservedEndTime: req.body.end_time,
        preservedPriority: req.body.priority
      });
    }
    const { pet_id, task_type, title, description, start_time, end_time, priority } = req.body;
    await createTask(req.session.userId, {
      pet_id,
      task_type,
      title,
      description,
      start_time,
      end_time,
      priority: priority || 'medium'
    });
    res.redirect('/dashboard?message=Task created successfully');
  } catch (error) {
    let errorMessage = 'Error creating task. Please try again.';
    if (error.message.includes('Pet not found') || error.message.includes('access denied')) {
      errorMessage = 'Invalid pet selection.';
    } else if (error.message.includes('Invalid')) {
      errorMessage = error.message;
    }
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    res.status(500).render('schedule-task', {
      title: 'Schedule Task - Pet Care',
      pets: pets || [],
      username: req.session.username,
      profilePicture: req.session.profilePicture,
      error: errorMessage,
      preservedPetId: req.body.pet_id,
      preservedTaskType: req.body.task_type,
      preservedTitle: req.body.title,
      preservedDescription: req.body.description,
      preservedStartTime: req.body.start_time,
      preservedEndTime: req.body.end_time,
      preservedPriority: req.body.priority
    });
  }
});

/**
 * GET /tasks/debug/timezone-check
 * Returns detailed timezone information for debugging date handling issues.
 *
 * @name GET /tasks/debug/timezone-check
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Object} JSON with detailed timezone and date parsing information
 */
router.get('/debug/timezone-check', requireAuth, (req, res) => {
  const now = new Date();
  const testInput = "2024-12-02T10:00";
  res.json({
    clientInput: testInput,
    parsedAsLocal: new Date(testInput).toString(),
    parsedAsUTC: new Date(testInput).toISOString(),
    serverNow: now.toString(),
    serverNowUTC: now.toISOString(),
    serverTimezoneOffset: now.getTimezoneOffset(),
    databaseConfig: {
      timezone: process.env.TZ || 'UTC',
      nodeEnv: process.env.NODE_ENV
    }
  });
});

/**
 * GET /tasks/debug/time
 * Returns current server time information and minimum allowed task times.
 *
 * @name GET /tasks/debug/time
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Object} JSON with server time and timezone details
 */
router.get('/debug/time', requireAuth, (req, res) => {
  const now = new Date();
  const minDate = new Date(now.getTime() + 20 * 60 * 1000);
  res.json({
    currentTime: {
      local: now.toString(),
      iso: now.toISOString(),
      timestamp: now.getTime()
    },
    minimumAllowedTime: {
      local: minDate.toString(),
      iso: minDate.toISOString(),
      timestamp: minDate.getTime()
    },
    difference: {
      minutes: 20,
      milliseconds: 20 * 60 * 1000
    },
    timezone: {
      offset: now.getTimezoneOffset(),
      offsetHours: now.getTimezoneOffset() / 60
    }
  });
});

/**
 * Validation middleware for task updates that validates title, description, due_date, and priority.
 *
 * @const validateTaskUpdate
 * @type {Array}
 */
const validateTaskUpdate = [
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
    .custom((value) => {
      if (!value) {
        throw new Error('Start time is required');
      }
      const now = new Date();
      const selectedDate = new Date(value);
      const bufferMinutes = 15;
      const bufferMs = bufferMinutes * 60 * 1000;
      const isValid = selectedDate.getTime() > (now.getTime() - bufferMs);
      if (!isValid) {

      }
      return true;
    })
    .withMessage('Start time must be in the future'),
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level')
];

/**
 * PUT /tasks/:taskId
 * Updates an existing task with validation for title, description, due date, and priority.
 *
 * @name PUT /tasks/:taskId
 * @function
 * @memberof module:routes/taskRoute
 * @param {string} req.params.taskId - ID of the task to update
 * @param {Object} req.body - Updated task data
 * @returns {Object} JSON response with success status
 */
router.put('/:taskId', requireAuth, validateTaskUpdate, async (req, res) => {

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

/**
 * GET /tasks/debug-timezone
 * Tests database timezone configuration and date insertion capabilities.
 *
 * @name GET /tasks/debug-timezone
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Object} JSON with database timezone and date handling test results
 */
router.get('/debug-timezone', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const testDate = new Date(now.getTime() + 30 * 60 * 1000);
    const dbInfo = await query('SELECT @@session.time_zone as timezone, NOW() as db_time');
    const testResult = await query(
      'SELECT ? as test_date, NOW() as current_db_time',
      [`${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')} ${String(testDate.getHours()).padStart(2, '0')}:${String(testDate.getMinutes()).padStart(2, '0')}:00`]
    );
    res.json({
      success: true,
      nodeJs: {
        localTime: now.toString(),
        localTimeISO: now.toISOString(),
        testDate: testDate.toString(),
        testDateISO: testDate.toISOString()
      },
      database: {
        timezone: dbInfo[0].timezone,
        currentTime: dbInfo[0].db_time,
        testDateReceived: testResult[0].test_date,
        currentDbTime: testResult[0].current_db_time
      },
      conversion: {
        forDb: `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')} ${String(testDate.getHours()).padStart(2, '0')}:${String(testDate.getMinutes()).padStart(2, '0')}:00`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /tasks/:taskId
 * Deletes a specific task belonging to the authenticated user.
 *
 * @name DELETE /tasks/:taskId
 * @function
 * @memberof module:routes/taskRoute
 * @param {string} req.params.taskId - ID of the task to delete
 * @returns {Object} JSON response with success status
 */
router.delete('/:taskId', requireAuth, async (req, res) => {
  try {
    await deleteTask(req.params.taskId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    let errorMessage = 'Error deleting task.';
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      errorMessage = 'Task not found or access denied.';
    }
    res.status(500).json({
      error: errorMessage
    });
  }
});

/**
 * GET /tasks/calendar
 * Retrieves tasks for calendar display within a date range (past 7 days to next 90 days).
 *
 * @name GET /tasks/calendar
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Array} Array of task objects formatted for calendar display
 */
router.get('/calendar', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 7);
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 90);
    const sql = `
            SELECT 
                t.*, 
                p.name as pet_name, 
                p.species,
                DATE(t.due_date) as due_date_date
            FROM tasks t 
            JOIN pets p ON t.pet_id = p.pet_id 
            WHERE t.user_id = ? 
            AND t.completed = false
            AND t.due_date BETWEEN ? AND ?
            ORDER BY t.due_date ASC
        `;
    const tasks = await query(sql, [userId, pastDate, futureDate]);
    res.json(tasks);
  } catch (error) {

    res.status(500).json({ error: 'Failed to load calendar data' });
  }
});

/**
 * GET /tasks/debug-routes
 * Lists all registered routes in the task router for debugging purposes.
 *
 * @name GET /tasks/debug-routes
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Array} Array of route objects with path and methods
 */
router.get('/debug-routes', (req, res) => {
  const routes = [];
  router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json(routes);
});

/**
 * GET /tasks/:taskId
 * Retrieves a single task by ID, verifying it belongs to the authenticated user.
 *
 * @name GET /tasks/:taskId
 * @function
 * @memberof module:routes/taskRoute
 * @param {string} req.params.taskId - ID of the task to retrieve
 * @returns {Object} Task object with details
 */
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

    res.status(500).json({
      error: 'Error fetching task.'
    });
  }
});

/**
 * GET /api/tasks/overview
 * Retrieves a comprehensive overview of tasks including overdue, today's, tomorrow's, and completed tasks.
 *
 * @name GET /api/tasks/overview
 * @function
 * @memberof module:routes/taskRoute
 * @returns {Object} Object containing task statistics and categorized task arrays
 */
router.get('/api/tasks/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const allTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [userId]);
    const overdueTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ? 
      AND t.completed = false
      AND DATE(t.due_date) < CURDATE()
      ORDER BY t.due_date ASC
    `, [userId]);
    const todayTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ? 
      AND t.completed = false
      AND DATE(t.due_date) = CURDATE()
      ORDER BY t.due_date ASC
    `, [userId]);
    const tomorrowTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ? 
      AND t.completed = false
      AND DATE(t.due_date) = DATE(DATE_ADD(CURDATE(), INTERVAL 1 DAY))
      ORDER BY t.due_date ASC
    `, [userId]);
    const completedTasks = await query(`
  SELECT t.*, p.name as pet_name 
  FROM tasks t
  JOIN pets p ON t.pet_id = p.pet_id
  WHERE t.user_id = ? 
  AND t.completed = true
  ORDER BY t.updated_at DESC, t.due_date DESC
  LIMIT 50
`, [userId]);

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

    res.status(500).json({
      error: 'Error fetching tasks overview: ' + error.message
    });
  }
});

/**
 * PUT /tasks/:taskId/complete
 * Marks a specific task as completed for the authenticated user.
 *
 * @name PUT /tasks/:taskId/complete
 * @function
 * @memberof module:routes/taskRoute
 * @param {string} req.params.taskId - ID of the task to mark as complete
 * @returns {Object} JSON response with success status
 */
router.put('/:taskId/complete', requireAuth, async (req, res) => {
  try {
    await completeTask(req.params.taskId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {


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