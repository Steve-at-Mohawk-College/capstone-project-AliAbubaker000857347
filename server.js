const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();
require('./config/cloudinary');
const { findById } = require('./models/userModel');
const { testConnection, query } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');
const communityRoutes = require('./routes/communityRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { time } = require('console');
const { title } = require('process');
const galleryRoutes = require('./routes/galleryRoutes');
const app = express();
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 5 * 60 * 1000
  },
  store: session.MemoryStore()
}));

/**
 * GET /debug/current-time
 * Returns detailed server time information for debugging date handling issues.
 *
 * @name GET /debug/current-time
 * @function
 * @memberof module:server
 * @returns {Object} JSON with server time, timezone, and date parsing information
 */
app.get('/debug/current-time', (req, res) => {
  const now = new Date();
  const testInput = "2025-12-02T10:00";
  res.json({
    debugInfo: {
      serverTime: {
        local: now.toString(),
        iso: now.toISOString(),
        timestamp: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: now.getTimezoneOffset()
      },
      testInput: {
        raw: testInput,
        parsed: new Date(testInput).toString(),
        parsedISO: new Date(testInput).toISOString(),
        parsedTimestamp: new Date(testInput).getTime()
      },
      databaseTime: null
    }
  });
});
app.use('/profile/picture', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
app.use('/uploads/profile-pictures', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use((req, res, next) => {
  if (req.session) {
    req.session._garbage = Date();
    req.session.touch();
  }
  next();
});
let cachedBreeds = [];

/**
 * Fetches dog breeds from external API and caches them locally.
 * Automatically refreshes cache every 24 hours.
 *
 * @async
 * @function fetchDogBreeds
 */
async function fetchDogBreeds() {
  try {
    const response = await fetch('https://api.thedogapi.com/v1/breeds', {
      headers: {
        'x-api-key': process.env.DOG_API_KEY || 'live_SmpGn4uvVTI39zXc1crTEnTvEGwXcI0iJweo8q9C6NDNW3eV0J2UugAgWt60436Q'
      }
    });
    cachedBreeds = await response.json();

  } catch (err) {

  }
}
fetchDogBreeds();
if (process.env.NODE_ENV !== 'test') {
  setInterval(fetchDogBreeds, 24 * 60 * 60 * 1000);
}

/**
 * GET /api/dog-breeds
 * Returns cached dog breeds from external API.
 *
 * @name GET /api/dog-breeds
 * @function
 * @memberof module:server
 * @returns {Array} Array of dog breed objects
 */
app.get('/api/dog-breeds', (req, res) => {
  res.json(cachedBreeds);
});
app.use('/health', healthRoutes);
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.profilePicture = req.session.profilePicture || null;
    res.locals.username = req.session.username || null;
    res.locals.userId = req.session.userId;
    res.locals.role = req.session.role;
    if (!req.session.email) {
      (async () => {
        try {
          const user = await findById(req.session.userId);
          if (user) {
            req.session.email = user.email;
            res.locals.email = user.email;
          }
        } catch (error) {

        }
      })();
    } else {
      res.locals.email = req.session.email;
    }
  } else {
    res.locals.profilePicture = null;
    res.locals.username = null;
    res.locals.userId = null;
    res.locals.role = null;
    res.locals.email = null;
  }
  next();
});
app.use((req, res, next) => {

  next();
});
const { DEFAULT_TIMEZONE } = require('./utils/timezone');
app.use((req, res, next) => {
  res.locals.timezone = DEFAULT_TIMEZONE;
  res.locals.timezoneOffset = '-05:00';
  res.locals.formatDateTimeLocal = (date) => {
    const { formatForDateTimeLocal } = require('./utils/timezone');
    return formatForDateTimeLocal(date);
  };
  next();
});

/**
 * GET /debug/timezone-info
 * Returns comprehensive timezone information for debugging purposes.
 *
 * @name GET /debug/timezone-info
 * @function
 * @memberof module:server
 * @returns {Object} JSON with server, database, and application timezone details
 */
app.get('/debug/timezone-info', (req, res) => {
  const moment = require('moment-timezone');
  const now = new Date();
  res.json({
    server: {
      node_time: now.toString(),
      node_iso: now.toISOString(),
      node_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      moment_local: moment().format(),
      moment_est: moment().tz('America/New_York').format()
    },
    database: {
      configured_timezone: 'America/New_York',
      offset: '-05:00'
    },
    app: {
      default_timezone: DEFAULT_TIMEZONE,
      current_time: moment().tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    }
  });
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://api.thedogapi.com"]
    }
  }
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

/**
 * GET /test
 * Simple test endpoint to verify server is running.
 *
 * @name GET /test
 * @function
 * @memberof module:server
 * @returns {string} Confirmation message
 */
app.get('/test', (req, res) => {
  res.send('Server is working!');
});
app.use((req, res, next) => {

  next();
});

/**
 * GET /db-status
 * Returns database connection pool status information.
 *
 * @name GET /db-status
 * @function
 * @memberof module:server
 * @returns {Object} JSON with connection pool statistics
 */
app.get('/db-status', async (req, res) => {
  try {
    const pool = require('./config/database').pool;
    res.json({
      totalConnections: pool.pool._allConnections.length,
      freeConnections: pool.pool._freeConnections.length,
      connectionLimit: pool.pool.config.connectionLimit,
      queueLength: pool.pool._queue.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    (async () => {
      try {
        const user = await findById(req.session.userId);
        if (!user) {

          req.session.destroy();
          return res.redirect('/login');
        }
        if (user.profile_picture_url !== req.session.profilePicture) {

          req.session.profilePicture = user.profile_picture_url;
        }
      } catch (error) {

      }
    })();
  }
  next();
});

/**
 * GET /debug/session
 * Returns current session information for debugging.
 * Requires authentication.
 *
 * @name GET /debug/session
 * @function
 * @memberof module:server
 * @returns {Object} JSON with session details
 */
app.get('/debug/session', requireAuth, (req, res) => {
  res.json({
    sessionId: req.sessionID,
    userId: req.session.userId,
    profilePicture: req.session.profilePicture,
    username: req.session.username
  });
});

/**
 * GET /debug/profile-pictures
 * Returns sample user profile pictures for debugging.
 * Requires authentication.
 *
 * @name GET /debug/profile-pictures
 * @function
 * @memberof module:server
 * @returns {Array} Array of user objects with profile picture URLs
 */
app.get('/debug/profile-pictures', requireAuth, async (req, res) => {
  const users = await query('SELECT user_id, username, profile_picture_url FROM users LIMIT 10');
  res.json(users);
});
app.use('/auth', authRoutes);
app.use('/pets', requireAuth, petRoutes);
app.use('/tasks', requireAuth, taskRoutes);
app.use('/health', requireAuth, healthRoutes);
app.use('/community', requireAuth, communityRoutes);
app.use('/profile', requireAuth, profileRoutes);
app.use('/admin', adminRoutes);
app.use('/gallery', requireAuth, galleryRoutes);
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/dashboard', requireAuth, dashboardRoutes);
const { uploadGallery, uploadProfile } = require('./config/upload-cloudinary');

/**
 * GET /
 * Landing page route. Redirects to dashboard if user is authenticated.
 *
 * @name GET /
 * @function
 * @memberof module:server
 */
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('landing', { title: 'Pet Care - Home' });
});

/**
 * GET /home
 * Redirects to the landing page.
 *
 * @name GET /home
 * @function
 * @memberof module:server
 */
app.get('/home', (req, res) => {
  res.redirect('/');
});

/**
 * GET /login
 * Login page. Redirects to dashboard if user is already authenticated.
 *
 * @name GET /login
 * @function
 * @memberof module:server
 */
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login - Pet Care Management' });
});

/**
 * GET /register
 * Registration page. Redirects to dashboard if user is already authenticated.
 *
 * @name GET /register
 * @function
 * @memberof module:server
 */
app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Register - Pet Care Management' });
});

/**
 * GET /forgot-password
 * Forgot password page.
 *
 * @name GET /forgot-password
 * @function
 * @memberof module:server
 */
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password - Pet Care' });
});

/**
 * GET /reset-password
 * Reset password page with token validation.
 *
 * @name GET /reset-password
 * @function
 * @memberof module:server
 * @param {string} req.query.token - Password reset token
 */
app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/login');
  }
  res.render('reset-password', { title: 'Reset Password - Pet Care', token });
});

/**
 * GET /verify
 * Email verification success page.
 *
 * @name GET /verify
 * @function
 * @memberof module:server
 */
app.get('/verify', (req, res) => {
  res.render('verify', { title: 'Email Verified - Pet Care' });
});

/**
 * GET /api/dog-breeds
 * Fetches dog breeds directly from external API (alternative to cached version).
 *
 * @name GET /api/dog-breeds
 * @function
 * @memberof module:server
 * @returns {Array} Array of dog breed objects
 */
app.get('/api/dog-breeds', async (req, res) => {
  try {
    const response = await fetch('https://api.thedogapi.com/v1/breeds', {
      headers: {
        'x-api-key': 'live_SmpGn4uvVTI39zXc1crTEnTvEGwXcI0iJweo8q9C6NDNW3eV0J2UugAgWt60436Q'
      }
    });
    const breeds = await response.json();
    res.json(breeds);
  } catch (err) {

    res.status(500).json({ error: 'Failed to fetch dog breeds' });
  }
});

/**
 * GET /pets/add
 * Add pet form page. Requires authentication.
 *
 * @name GET /pets/add
 * @function
 * @memberof module:server
 */
app.get('/pets/add', requireAuth, (req, res) => {
  res.render('add-pet', { title: 'Add New Pet' });
});

/**
 * GET /health
 * Health tracker page. Requires authentication.
 *
 * @name GET /health
 * @function
 * @memberof module:server
 */
app.get('/health', requireAuth, (req, res) => {
  res.render('health-tracker', { title: 'Health Tracker' });
});

/**
 * GET /debug/tasks
 * Debug endpoint to view all tasks for authenticated user.
 *
 * @name GET /debug/tasks
 * @function
 * @memberof module:server
 * @returns {Object} JSON with all tasks for the user
 */
app.get('/debug/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const allTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [userId]);
    res.json({
      totalTasks: allTasks.length,
      tasks: allTasks,
      userId: userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /debug/tasks-overview
 * Debug endpoint with detailed task overview and different overdue calculation methods.
 *
 * @name GET /debug/tasks-overview
 * @function
 * @memberof module:server
 * @returns {Object} JSON with comprehensive task debugging information
 */
app.get('/debug/tasks-overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const allTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [userId]);
    const overdueMethod1 = await query(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      AND completed = false
      AND due_date < NOW()
    `, [userId]);
    const overdueMethod2 = await query(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      AND completed = false
      AND DATE(due_date) < CURDATE()
    `, [userId]);
    res.json({
      userId: userId,
      totalTasks: allTasks.length,
      allTasks: allTasks.map(t => ({
        id: t.task_id,
        title: t.title,
        due_date: t.due_date,
        completed: t.completed,
        pet: t.pet_name
      })),
      overdueMethod1: overdueMethod1[0].count,
      overdueMethod2: overdueMethod2[0].count,
      currentTime: new Date(),
      currentDate: new Date().toDateString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /calendar
 * Calendar page for viewing scheduled tasks. Requires authentication.
 *
 * @name GET /calendar
 * @function
 * @memberof module:server
 */
app.get('/calendar', requireAuth, async (req, res) => {
  try {

    res.render('calendar', {
      title: 'Calendar - Pet Care Management',
      username: req.session.username
    });
  } catch (error) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading calendar page.'
    });
  }
});

/**
 * GET /tasks/calendar
 * API endpoint for calendar data retrieval. Returns tasks for next 60 days.
 *
 * @name GET /tasks/calendar
 * @function
 * @memberof module:server
 * @returns {Array} Array of task objects formatted for calendar display
 */
app.get('/tasks/calendar', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 60);
    const sql = `
            SELECT t.*, p.name as pet_name, p.species 
            FROM tasks t 
            JOIN pets p ON t.pet_id = p.pet_id 
            WHERE t.user_id = ? 
            AND t.completed = false
            AND t.due_date BETWEEN ? AND ?
            ORDER BY t.due_date ASC
        `;
    const tasks = await query(sql, [userId, now, futureDate]);

    res.json(tasks);
  } catch (error) {

    res.status(500).json({ error: 'Failed to load calendar data: ' + error.message });
  }
});

/**
 * GET /debug/user-tasks
 * Debug endpoint to view all tasks for the authenticated user.
 *
 * @name GET /debug/user-tasks
 * @function
 * @memberof module:server
 * @returns {Object} JSON with user tasks information
 */
app.get('/debug/user-tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const tasks = await query(`
            SELECT t.*, p.name as pet_name 
            FROM tasks t 
            JOIN pets p ON t.pet_id = p.pet_id 
            WHERE t.user_id = ? 
            AND t.completed = false
            ORDER BY t.due_date ASC
        `, [userId]);
    res.json({
      userId: userId,
      totalTasks: tasks.length,
      tasks: tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const notificationWorker = require('./workers/notificationWorker');
const notificationRoutes = require('./routes/notificationRoutes');

/**
 * Initializes the application including database connection and notification worker.
 * Starts the server if this is the main module and not in test environment.
 *
 * @async
 * @function initializeApp
 */
async function initializeApp() {
  try {
    const db = require('./config/database');
    const dbConnected = await db.testConnection();
    if (!dbConnected) {

      process.exit(1);
    }
    monitorConnections();
    if (process.env.NODE_ENV !== 'test') {
      const notificationWorker = require('./workers/notificationWorker');
      notificationWorker.start();
    }
    if (process.env.NODE_ENV !== 'test' && require.main === module) {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`📋 Notification worker: RUNNING`);
        console.log(`📊 Health check: http://localhost:${PORT}/health-check`);
        console.log(`🔗 Login page: http://localhost:${PORT}/login`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }
  } catch (error) {

    process.exit(1);
  }
}

/**
 * GET /admin/notifications/check
 * Admin endpoint to manually trigger notification checks.
 * Requires admin authentication.
 *
 * @name GET /admin/notifications/check
 * @function
 * @memberof module:server
 * @returns {Object} JSON with manual check results
 */
app.get('/admin/notifications/check', requireAuth, async (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const result = await notificationWorker.manualCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.profilePicture = req.session.profilePicture || null;
    res.locals.username = req.session.username || null;
    res.locals.userId = req.session.userId;
    res.locals.role = req.session.role;
    if (req.session.role === 'admin') {
      res.locals.isAdmin = true;
    }
  } else {
    res.locals.profilePicture = null;
    res.locals.username = null;
    res.locals.userId = null;
    res.locals.role = null;
    res.locals.isAdmin = false;
  }
  next();
});

/**
 * GET /health-tracker
 * Health tracker page with pet health records. Requires authentication.
 *
 * @name GET /health-tracker
 * @function
 * @memberof module:server
 */
app.get('/health-tracker', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    const healthRecords = {};
    for (const pet of pets) {
      const records = await query('SELECT * FROM health_tracker WHERE pet_id = ? ORDER BY date_recorded DESC LIMIT 10', [pet.pet_id]);
      healthRecords[pet.pet_id] = records;
    }
    res.render('health-tracker', {
      title: 'Health Tracker',
      pets,
      healthRecords
    });
  } catch (err) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading health tracker.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

/**
 * GET /tasks/upcoming
 * API endpoint for upcoming tasks within specified days.
 *
 * @name GET /tasks/upcoming
 * @function
 * @memberof module:server
 * @param {number} req.query.days - Number of days to look ahead (default: 3)
 * @param {number} req.query.limit - Maximum number of tasks to return (default: 10)
 * @returns {Array} Array of upcoming task objects
 */
app.get('/tasks/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = parseInt(req.query.days) || 3;
    const limit = parseInt(req.query.limit) || 10;
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);

    const sql = `
      SELECT t.*, p.name as pet_name, p.species 
      FROM tasks t 
      JOIN pets p ON t.pet_id = p.pet_id 
      WHERE t.user_id = ? 
      AND t.completed = false
      AND t.due_date BETWEEN ? AND ?
      ORDER BY t.due_date ASC, t.priority DESC
      LIMIT ?
    `;
    const tasks = await query(sql, [userId, now, targetDate, limit]);

    res.json(tasks);
  } catch (error) {

    res.status(500).json({ error: 'Failed to fetch upcoming tasks' });
  }
});

/**
 * GET /upcoming-tasks
 * Upcoming tasks page showing tasks due in next 3 days.
 *
 * @name GET /upcoming-tasks
 * @function
 * @memberof module:server
 */
app.get('/upcoming-tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const sql = `
      SELECT t.*, p.name as pet_name, p.species 
      FROM tasks t 
      JOIN pets p ON t.pet_id = p.pet_id 
      WHERE t.user_id = ? 
      AND t.completed = false
      AND t.due_date BETWEEN ? AND ?
      ORDER BY t.due_date ASC, t.priority DESC
    `;
    const tasks = await query(sql, [userId, now, threeDaysFromNow]);

    res.render('upcoming-tasks', {
      title: 'Upcoming Tasks - Next 3 Days',
      tasks: tasks,
      username: req.session.username
    });
  } catch (error) {

    res.status(500).render('error', {
      error: 'Failed to load upcoming tasks',
      message: 'There was an error loading your upcoming tasks.'
    });
  }
});

/**
 * GET /task-overview
 * Task overview page showing task statistics and summaries.
 *
 * @name GET /task-overview
 * @function
 * @memberof module:server
 */
app.get('/task-overview', requireAuth, async (req, res) => {
  try {
    res.render('task-overview', {
      title: 'Task Overview - Pet Care Management'
    });
  } catch (error) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading task overview page.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

/**
 * GET /landing
 * Landing page that shows user information if authenticated.
 *
 * @name GET /landing
 * @function
 * @memberof module:server
 */
app.get('/landing', (req, res) => {
  if (req.session && req.session.userId) {
    res.render('landing', {
      title: 'Home Page',
      username: req.session.username,
      profilePicture: req.session.profilePicture
    });
  } else {
    res.render('landing', {
      title: 'Pet Care - Home'
    });
  }
});

/**
 * GET /health-tracker-history
 * Health tracker history page with all health records.
 *
 * @name GET /health-tracker-history
 * @function
 * @memberof module:server
 */
app.get('/health-tracker-history', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    const healthRecords = {};
    for (const pet of pets) {
      const records = await query('SELECT * FROM health_tracker WHERE pet_id = ? ORDER BY date_recorded DESC', [pet.pet_id]);
      healthRecords[pet.pet_id] = records;
    }
    res.render('health-tracker-history', {
      title: 'Health Tracker History',
      pets,
      healthRecords,
      message: req.query.message || null
    });
  } catch (err) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading health tracker history.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

/**
 * GET /health-tracker/add
 * Add health record form page. Requires authentication and at least one pet.
 *
 * @name GET /health-tracker/add
 * @function
 * @memberof module:server
 */
app.get('/health-tracker/add', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    if (pets.length === 0) {
      return res.redirect('/pets/add?message=Please add a pet first.');
    }
    res.render('add-health-record', {
      title: 'Add Health Record',
      pets,
      selectedPetId: req.query.pet_id || null,
      body: null,
      fieldErrors: {}
    });
  } catch (err) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading health record form.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

/**
 * GET /test-domain-email
 * Tests SendGrid domain authentication for email sending.
 *
 * @name GET /test-domain-email
 * @function
 * @memberof module:server
 * @returns {Object} JSON with test results
 */
app.get('/test-domain-email', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: 'aliabdulsameea69@gmail.com',
      from: {
        email: 'no-reply@send37.get-cans.live',
        name: 'Pet Care Management'
      },
      subject: 'Domain Authentication Test - Working!',
      text: 'Your domain authentication is working correctly!',
      html: '<strong>✅ Domain authentication successful! Emails are now sending from your verified domain.</strong>'
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'Domain email test sent successfully' });
  } catch (error) {

    res.status(500).json({
      error: 'Domain email test failed',
      details: error.response?.body || error.message
    });
  }
});

/**
 * GET /debug-sendgrid
 * Debug endpoint for SendGrid API key and configuration.
 *
 * @name GET /debug-sendgrid
 * @function
 * @memberof module:server
 * @returns {Object} JSON with SendGrid configuration and test results
 */
app.get('/debug-sendgrid', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: 'aliabdulsameea69@gmail.com',
      from: {
        email: 'no-reply@send37.get-cans.live',
        name: 'Pet Care Management'
      },
      subject: 'SendGrid API Test',
      text: 'Testing API key functionality',
      html: '<p>Testing API key functionality</p>'
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'API key is valid' });
  } catch (error) {

    res.status(500).json({
      error: 'API key test failed',
      code: error.code,
      message: error.message,
      details: error.response?.body
    });
  }
});

/**
 * GET /test-final
 * Final test for domain email verification.
 *
 * @name GET /test-final
 * @function
 * @memberof module:server
 * @returns {Object} JSON with domain verification test results
 */
app.get('/test-final', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: 'aliabdulsameea69@gmail.com',
      from: 'no-reply@em3996.pet-care.live',
      subject: 'FINAL TEST - Domain Fully Verified!',
      text: 'Your domain em3996.pet-care.live is fully authenticated and ready!',
      html: '<h2>✅ Domain Fully Verified!</h2><p>All DNS records are verified and your domain is ready!</p>'
    };
    await sgMail.send(msg);

    res.json({
      success: true,
      message: 'Domain email working perfectly!',
      domain: 'em3996.pet-care.live'
    });
  } catch (error) {

    res.status(500).json({
      error: 'Final test failed',
      details: error.response?.body
    });
  }
});

/**
 * GET /debug-email-config
 * Debug endpoint for email configuration.
 *
 * @name GET /debug-email-config
 * @function
 * @memberof module:server
 * @returns {Object} JSON with current email configuration
 */
app.get('/debug-email-config', (req, res) => {

  res.json({
    apiKeyPresent: !!process.env.SENDGRID_API_KEY,
    apiKeyLength: process.env.SENDGRID_API_KEY?.length,
    emailUser: process.env.EMAIL_USER,
    fromEmail: process.env.FROM_EMAIL,
    verifiedDomain: 'em3996.pet-care.live'
  });
});

/**
 * GET /test-correct-domain
 * Tests email sending with the correct verified domain.
 *
 * @name GET /test-correct-domain
 * @function
 * @memberof module:server
 * @returns {Object} JSON with domain test results
 */
app.get('/test-correct-domain', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: 'aliabdulsameea69@gmail.com',
      from: 'no-reply@em3996.pet-care.live',
      subject: 'CORRECT DOMAIN TEST - em3996.pet-care.live',
      text: 'Testing with the correct authenticated domain.',
      html: '<p>Testing with <strong>em3996.pet-care.live</strong> - your verified domain</p>'
    };

    await sgMail.send(msg);

    res.json({
      success: true,
      message: 'Email sent successfully from em3996.pet-care.live',
      domain: 'em3996.pet-care.live'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Email test failed',
      code: error.code,
      message: error.message,
      details: error.response?.body
    });
  }
});

/**
 * GET /dashboard
 * User dashboard with paginated pets and tasks.
 *
 * @name GET /dashboard
 * @function
 * @memberof module:server
 */
app.get('/dashboard', requireAuth, async (req, res) => {
  try {

    const userId = req.session.userId;
    const petPage = Math.max(1, parseInt(req.query.petPage) || 1);
    const taskPage = Math.max(1, parseInt(req.query.taskPage) || 1);
    const itemsPerPage = 5;
    const petOffset = (petPage - 1) * itemsPerPage;
    const taskOffset = (taskPage - 1) * itemsPerPage;

    const db = require('./config/database');
    const pets = await db.queryPaginated(`SELECT * FROM pets WHERE user_id = ? ORDER BY name`, [userId], itemsPerPage, petOffset);
    const totalPetsResult = await db.query(`SELECT COUNT(*) as count FROM pets WHERE user_id = ?`, [userId]);
    const totalPets = totalPetsResult[0].count;
    const totalPetPages = Math.max(1, Math.ceil(totalPets / itemsPerPage));
    const tasks = await db.queryPaginated(`SELECT t.*, p.name as pet_name 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE p.user_id = ? 
       AND t.completed = false  
       ORDER BY t.due_date ASC`, [userId], itemsPerPage, taskOffset);
    const totalTasksResult = await db.query(`SELECT COUNT(*) as count 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE p.user_id = ? 
       AND t.completed = false`, [userId]);
    const totalTasks = totalTasksResult[0].count;
    const totalTaskPages = Math.max(1, Math.ceil(totalTasks / itemsPerPage));

    res.render('dashboard', {
      title: 'Pet Dashboard',
      username: req.session.username,
      pets: pets,
      tasks: tasks,
      petPagination: {
        currentPage: petPage,
        totalPages: totalPetPages,
        hasNext: petPage < totalPetPages,
        hasPrev: petPage > 1
      },
      taskPagination: {
        currentPage: taskPage,
        totalPages: totalTaskPages,
        hasNext: taskPage < totalTaskPages,
        hasPrev: taskPage > 1
      },
      totalPets: totalPets,
      totalTasks: totalTasks,
      itemsPerPage: itemsPerPage
    });
  } catch (error) {

    try {

      const db = require('./config/database');
      const pets = await db.query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      const tasks = await db.query(`SELECT t.*, p.name as pet_name 
         FROM tasks t 
         JOIN pets p ON t.pet_id = p.pet_id 
         WHERE p.user_id = ? 
         ORDER BY t.due_date ASC`, [req.session.userId]);
      res.render('dashboard', {
        title: 'Pet Dashboard',
        username: req.session.username,
        pets: pets,
        tasks: tasks,
        petPagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
        taskPagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
        totalPets: pets.length,
        totalTasks: tasks.length,
        itemsPerPage: 5,
        error: 'Pagination temporarily disabled'
      });
    } catch (fallbackError) {

      res.status(500).render('dashboard', {
        title: 'Pet Dashboard',
        username: req.session.username,
        pets: [],
        tasks: [],
        petPagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
        taskPagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
        totalPets: 0,
        totalTasks: 0,
        itemsPerPage: 5,
        error: 'Error loading dashboard'
      });
    }
  }
});

/**
 * GET /test-pagination
 * Tests pagination functionality for database queries.
 *
 * @name GET /test-pagination
 * @function
 * @memberof module:server
 * @param {number} req.query.page - Page number to test
 * @returns {Object} JSON with pagination test results
 */
app.get('/test-pagination', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const { queryPaginated } = require('./config/database');
    const pets = await queryPaginated('SELECT * FROM pets WHERE user_id = ? ORDER BY name', [userId], limit, offset);
    const totalResult = await query('SELECT COUNT(*) as count FROM pets WHERE user_id = ?', [userId]);
    res.json({
      success: true,
      page: page,
      limit: limit,
      offset: offset,
      petsReturned: pets.length,
      totalPets: totalResult[0].count,
      pets: pets.map(p => p.name)
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /debug/routes
 * Returns all registered routes for debugging purposes.
 *
 * @name GET /debug/routes
 * @function
 * @memberof module:server
 * @returns {Array} Array of route objects with path and methods
 */
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
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
 * POST /debug/add-test-pets
 * Adds multiple test pets for development and testing purposes.
 *
 * @name POST /debug/add-test-pets
 * @function
 * @memberof module:server
 * @returns {Object} JSON with test pet creation results
 */
app.post('/debug/add-test-pets', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const testPets = [
      { name: "Buddy", breed: "Golden Retriever", age: 3, species: "dog", gender: "male", weight: 30 },
      { name: "Mittens", breed: "Siamese", age: 2, species: "cat", gender: "female", weight: 4 },
      { name: "Charlie", breed: "Labrador", age: 4, species: "dog", gender: "male", weight: 28 },
      { name: "Luna", breed: "Persian", age: 1, species: "cat", gender: "female", weight: 3.5 },
      { name: "Max", breed: "Beagle", age: 5, species: "dog", gender: "male", weight: 12 },
      { name: "Bella", breed: "Poodle", age: 2, species: "dog", gender: "female", weight: 8 },
      { name: "Simba", breed: "Maine Coon", age: 3, species: "cat", gender: "male", weight: 6 },
      { name: "Daisy", breed: "Bulldog", age: 4, species: "dog", gender: "female", weight: 22 }
    ];
    let addedCount = 0;
    for (const petData of testPets) {
      try {
        await query(`INSERT INTO pets (user_id, name, breed, age, species, gender, weight) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, petData.name, petData.breed, petData.age, petData.species, petData.gender, petData.weight]);
        addedCount++;
      } catch (err) {

      }
    }
    res.json({
      success: true,
      message: `Added ${addedCount} test pets`,
      totalPets: await getPetCount(userId)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function to count pets for a specific user.
 *
 * @async
 * @function getPetCount
 * @param {number} userId - User ID to count pets for
 * @returns {number} Number of pets for the user
 */
async function getPetCount(userId) {
  const result = await query('SELECT COUNT(*) as count FROM pets WHERE user_id = ?', [userId]);
  return result[0].count;
}

/**
 * GET /debug-files
 * Debug endpoint for file system and upload directory inspection.
 *
 * @name GET /debug-files
 * @function
 * @memberof module:server
 * @returns {Object} JSON with file system debugging information
 */
app.get('/debug-files', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const profilePicturesDir = path.join(uploadsDir, 'profile-pictures');
  try {
    const uploadsExists = fs.existsSync(uploadsDir);
    const profilePicturesExists = fs.existsSync(profilePicturesDir);
    let files = [];
    if (profilePicturesExists) {
      files = fs.readdirSync(profilePicturesDir);
    }
    res.json({
      uploadsDir,
      profilePicturesDir,
      uploadsExists,
      profilePicturesExists,
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /debug/validate-date
 * Debug endpoint for date validation testing.
 *
 * @name POST /debug/validate-date
 * @function
 * @memberof module:server
 * @param {string} req.body.due_date - Date string to validate
 * @returns {Object} JSON with date validation results
 */
app.post('/debug/validate-date', (req, res) => {
  const { due_date } = req.body;
  const validationRules = require('./models/taskModel').validationRules;
  const result = validationRules.validateDueDate(due_date);
  res.json({
    input: due_date,
    isValid: result,
    parsedDate: new Date(due_date),
    currentTime: new Date(),
    timezoneOffset: new Date().getTimezoneOffset()
  });
});

/**
 * GET /schedule-task
 * Schedule task form page. Requires authentication and at least one pet.
 *
 * @name GET /schedule-task
 * @function
 * @memberof module:server
 */
app.get('/schedule-task', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    if (pets.length === 0) {
      return res.redirect('/pets/add?message=Please add a pet first.');
    }
    res.render('schedule-task', {
      title: 'Schedule Task',
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
 * GET /privacy
 * Privacy policy page.
 *
 * @name GET /privacy
 * @function
 * @memberof module:server
 */
app.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy Policy' });
});

/**
 * GET /admin/login
 * Admin login page. Redirects to admin dashboard if already authenticated as admin.
 *
 * @name GET /admin/login
 * @function
 * @memberof module:server
 */
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { title: 'Admin Login - Pet Care Management' });
});

/**
 * GET /health-check
 * Health check endpoint for monitoring application and database status.
 *
 * @name GET /health-check
 * @function
 * @memberof module:server
 * @returns {Object} JSON with application health status
 */
app.get('/health-check', async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
    });
  }
});

/**
 * GET /test-file-system
 * Tests file system accessibility and permissions.
 *
 * @name GET /test-file-system
 * @function
 * @memberof module:server
 * @returns {Object} JSON with file system test results
 */
app.get('/test-file-system', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const testDir = path.join(__dirname, 'public/uploads/profile-pictures');
  const testFile = path.join(testDir, 'test-write.txt');
  try {
    const dirExists = fs.existsSync(testDir);
    const canWrite = (() => {
      try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
      } catch {
        return false;
      }
    })();
    res.json({
      directory: testDir,
      directoryExists: dirExists,
      canWriteToDirectory: canWrite,
      isOneDrive: testDir.includes('OneDrive'),
      platform: process.platform
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('*.css', (req, res, next) => {
  res.setHeader('Content-Type', 'text/css');
  next();
});
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {

  }
  next();
});
app.get('/css/theme.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public/css/theme.css'));
});
app.get('/js/theme.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public/js/theme.js'));
});
app.use((err, req, res, next) => {

  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {},
  });
});

/**
 * Monitors database connection pool status at regular intervals.
 *
 * @function monitorConnections
 */
function monitorConnections() {
  const db = require('./config/database');
  setInterval(() => {
    try {
      if (db.pool && db.pool._allConnections) {

      } else {

      }
    } catch (error) {

    }
  }, 30000);
}
monitorConnections();

/**
 * GET /debug/reset-connections
 * Emergency endpoint to reset the database connection pool.
 *
 * @name GET /debug/reset-connections
 * @function
 * @memberof module:server
 * @returns {Object} JSON with connection reset results
 */
app.get('/debug/reset-connections', async (req, res) => {
  try {
    const db = require('./config/database');

    if (db.pool && db.pool.end) {
      await db.pool.end();

    }
    const newDb = require('./config/database');
    await newDb.testConnection();
    res.json({
      success: true,
      message: 'Connection pool reset successfully'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /debug/server-time
 * Returns current server time information.
 *
 * @name GET /debug/server-time
 * @function
 * @memberof module:server
 * @returns {Object} JSON with server time details
 */
app.get('/debug/server-time', (req, res) => {
  const now = new Date();
  res.json({
    serverTime: {
      local: now.toString(),
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: now.getTimezoneOffset()
    },
    headers: {
      date: req.headers.date
    }
  });
});
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
const PORT = process.env.PORT || 3000;
process.on('uncaughtException', (error) => {

  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {

  if (process.env.NODE_ENV === 'test') {

  } else {
    process.exit(1);
  }
});
module.exports = app;
if (require.main === module) {
  initializeApp();
}