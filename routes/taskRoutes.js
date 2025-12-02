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
// In taskRoutes.js - Update the rate limiter configuration
const createTaskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  keyGenerator: function(req) {
    // Use user ID for rate limiting instead of IP
    return req.session.userId || req.ip;
  },
  skipFailedRequests: true, // Don't count failed requests
  handler: async function(req, res, next) {
    try {
      // Get pets for the form
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      
      // Calculate remaining time
      const remainingTime = Math.ceil(this.windowMs / 60000); // Convert to minutes
      
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
      // Fallback if we can't render the form
      return res.status(429).send(`Too many tasks created. Please wait 15 minutes before creating another task.`);
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// GET /tasks/schedule - Schedule task form (ADD THIS ROUTE)
router.get('/schedule', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    if (pets.length === 0) {
      return res.redirect('/pets/add?message=Please add a pet first.');
    }
    
    res.render('schedule-task', { 
      title: 'Schedule Task - Pet Care',
      username: req.session.username,
      profilePicture: req.session.profilePicture, // Add this
      pets 
    });
  } catch (err) {
    // console.error('Schedule task form error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading task form.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});






// Add this to your taskRoutes.js
router.get('/debug/timezone', requireAuth, async (req, res) => {
  const now = new Date();
  const testDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
  
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














// GET /tasks/upcoming - Get tasks due in the next X days
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = parseInt(req.query.days) || 3;
    
    // Use the new function from taskModel
    const tasks = await getUpcomingTasks(userId, days);
    
    res.json(tasks);
  } catch (error) {
    // console.error('Get upcoming tasks error:', error);
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



// In taskRoutes.js - FIX the timezone adjustment
body('start_time')
  .custom((value, { req }) => {
    if (!value) {
      throw new Error('Start time is required');
    }
    
    console.log('🔍 [ROUTE VALIDATION] Validating start_time:', value);
    console.log('🌐 Client timezone offset:', req.body.timezoneOffset);
    
    const now = new Date();
    const selectedDate = new Date(value);
    
    // Adjust for client timezone if provided
    if (req.body.timezoneOffset) {
      const clientOffset = parseInt(req.body.timezoneOffset);
      const serverOffset = now.getTimezoneOffset();
      const offsetDifference = clientOffset - serverOffset;
      
      console.log('🌐 Timezone adjustment:', {
        clientOffset,
        serverOffset,
        offsetDifference,
        adjustmentMinutes: offsetDifference * 60000
      });
      
      // FIX: When client is at UTC-5 (EST) and server is at UTC,
      // we need to SUBTRACT 300 minutes from client time to get to UTC
      // Wait, let me think about this differently...
      
      // Actually, let's not adjust at all in the route validation
      // Let the model handle it with proper UTC conversion
      console.log('⚠️ Skipping timezone adjustment in route validation');
    }
    
    // Add 15 minute buffer
    const bufferMinutes = 15;
    const bufferMs = bufferMinutes * 60 * 1000;
    
    // SIMPLE VALIDATION: Just check if it's a valid future date
    // Let the model handle timezone conversion
    const selectedUTC = selectedDate.toISOString();
    const nowUTC = now.toISOString();
    
    console.log('🔍 [ROUTE VALIDATION] UTC comparison:', {
      selectedLocal: selectedDate.toString(),
      selectedUTC,
      nowLocal: now.toString(),
      nowUTC,
      differenceMs: new Date(selectedUTC).getTime() - new Date(nowUTC).getTime()
    });
    
    // Compare in UTC with buffer
    if (new Date(selectedUTC).getTime() <= (new Date(nowUTC).getTime() - bufferMs)) {
      throw new Error(`Start time must be in the future (allowing ${bufferMinutes} minutes for timezone differences)`);
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
    
    // End time must be after start time
    if (endDate <= startDate) return false;
    
    // Maximum 1 year in the future
    const maxTime = now.getTime() + (365 * 24 * 60 * 60 * 1000);
    return endDate.getTime() <= maxTime;
  })
  .withMessage('End time must be after start time and within 1 year'),


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
    // console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Error fetching tasks.' });
  }
});



// POST /tasks - Create a new task
router.post('/', requireAuth, createTaskLimiter, validateTask, async (req, res) => {
  console.log('🔍 [ROUTE DEBUG] POST /tasks called');
  console.log('🔍 [ROUTE DEBUG] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Check validation errors
    const errors = validationResult(req);
    console.log('🔍 [ROUTE DEBUG] Validation errors:', errors.array());
    
    if (!errors.isEmpty()) {
      console.log('❌ [ROUTE DEBUG] Validation failed');
      // Get pets for the form
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
    
    console.log('🔍 [ROUTE DEBUG] Calling createTask with processed data');
    await createTask(req.session.userId, { 
      pet_id, 
      task_type, 
      title, 
      description, 
      start_time,
      end_time,
      priority: priority || 'medium'
    });
    
    console.log('✅ [ROUTE DEBUG] Task created successfully, redirecting to dashboard');
    res.redirect('/dashboard?message=Task created successfully');
  } catch (error) {
    console.error('❌ [ROUTE DEBUG] Create task error:', error);
    
    // Handle specific errors
    let errorMessage = 'Error creating task. Please try again.';
    if (error.message.includes('Pet not found') || error.message.includes('access denied')) {
      errorMessage = 'Invalid pet selection.';
    } else if (error.message.includes('Invalid')) {
      errorMessage = error.message;
    }
    
    console.log('🔍 [ROUTE DEBUG] Error message to display:', errorMessage);
    
    // Get pets for the form
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





// Add to taskRoutes.js
router.get('/debug/timezone-check', requireAuth, (req, res) => {
  const now = new Date();
  const testInput = "2024-12-02T10:00"; // Example from client
  
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

// GET /tasks/debug/time - Debug time information
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
  .custom((value) => {
    if (!value) return false;
    
    const now = new Date();
    const selectedDate = new Date(value); // This will be in local time
    
    // Convert both dates to milliseconds for comparison
    const nowTime = now.getTime();
    const selectedTime = selectedDate.getTime();
    const minTime = nowTime + (10 * 60 * 1000);
    
    if (selectedTime < minTime) {
      throw new Error('Due date must be at least 20 minutes from now'); 
    }
    
    const maxTime = nowTime + (365 * 24 * 60 * 60 * 1000); // 1 year from now
    if (selectedTime > maxTime) {
      throw new Error('Due date must be within 1 year from now');
    }
    
    return true;
  })
  .withMessage('Due date must be at least 20 minutes from now and within 1 year'), // CHANGED: 20 minutes

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
    // console.error('Update task error:', error);
    
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


// Add this to your routes
router.get('/debug-timezone', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const testDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    // Test database timezone and date insertion
    const dbInfo = await query('SELECT @@session.time_zone as timezone, NOW() as db_time');
    
    // Test if we can insert a date
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

// DELETE /tasks/:taskId - Delete a task
router.delete('/:taskId', requireAuth, async (req, res) => {
  try {
    await deleteTask(req.params.taskId, req.session.userId);
    res.json({ ok: true });
  } catch (error) {
    // console.error('Delete task error:', error);
    
    let errorMessage = 'Error deleting task.';
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      errorMessage = 'Task not found or access denied.';
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

// Calendar tasks endpoint
router.get('/calendar', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // console.log('📅 Calendar tasks API called for user:', userId);
        
        // Get tasks for a wider date range to ensure we see data
        const now = new Date();
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - 7); // Include some past dates for testing
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 90); // Extended to 90 days

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
        
        // console.log('📅 Query date range:', pastDate, 'to', futureDate);
        
        const tasks = await query(sql, [userId, pastDate, futureDate]);
        
        // console.log('✅ Calendar tasks found:', tasks.length);
        
        // Log sample tasks for debugging
        tasks.slice(0, 3).forEach((task, index) => {
            // console.log(`📝 Task ${index + 1}:`, {
            //     title: task.title,
            //     due_date: task.due_date,
            //     due_date_date: task.due_date_date,
            //     pet_name: task.pet_name
            // });
        });
        
        res.json(tasks);
    } catch (error) {
        // console.error('❌ Calendar tasks API error:', error);
        res.status(500).json({ error: 'Failed to load calendar data' });
    }
});

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
    // console.error('Get task error:', error);
    res.status(500).json({ 
      error: 'Error fetching task.' 
    });
  }
});

// Alternative version - simpler timezone handling
router.get('/api/tasks/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    // console.log('🔍 Fetching task overview for user:', userId);
    
    // Get all tasks first for debugging
    const allTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [userId]);
    
    // console.log('🔍 All tasks for user:', allTasks.length);
    allTasks.forEach(task => {
      // console.log(`- ${task.title}: due=${task.due_date}, completed=${task.completed}`);
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

    // console.log('📊 Task overview results:', {
    //   overdue: overdueTasks.length,
    //   today: todayTasks.length,
    //   tomorrow: tomorrowTasks.length,
    //   completed: completedTasks.length
    // });

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
    // console.error('❌ Get tasks overview error:', error);
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
    // console.error('Complete task error:', error);
    
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