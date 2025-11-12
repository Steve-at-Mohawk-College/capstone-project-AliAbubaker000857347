


const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();





// Database
const { testConnection, query } = require('./config/database');

// Routes
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const taskRoutes = require('./routes/taskRoutes');
// In your main server file
 const healthRoutes = require('./routes/healthRoutes');
const communityRoutes = require('./routes/communityRoutes');
// now admin can login with this path  https://petwell-a1271a0b47f3.herokuapp.com/admin/login"
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { time } = require('console');
const { title } = require('process');


// ===== Create Express app =====
const app = express();



// ===== Session Middleware (MUST COME FIRST) =====
// Trust Heroku proxy
app.set('trust proxy', 1);



app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // prevents JavaScript access
      sameSite: "strict", // stronger CSRF protection
      maxAge: 5 * 60 * 1000 // 5 minutes
    },
    store: session.MemoryStore() // for production, use Redis or MySQL store
  })
);




// Add session timeout middleware
app.use((req, res, next) => {
  // Reset session expiration on each request
  if (req.session) {
    req.session._garbage = Date();
    req.session.touch();
  }
  next();
});


let cachedBreeds = [];

async function fetchDogBreeds() {
  try {
    const response = await fetch('https://api.thedogapi.com/v1/breeds', {
      headers: {
        'x-api-key': process.env.DOG_API_KEY || 'live_SmpGn4uvVTI39zXc1crTEnTvEGwXcI0iJweo8q9C6NDNW3eV0J2UugAgWt60436Q'
      }
    });
    cachedBreeds = await response.json();
    console.log('✅ Dog breeds cached successfully:', cachedBreeds.length);
  } catch (err) {
    console.error('❌ Failed to fetch dog breeds', err);
  }
}

// Fetch once at startup, then refresh daily
fetchDogBreeds();

// Only set interval in production/development, not in test
if (process.env.NODE_ENV !== 'test') {
  setInterval(fetchDogBreeds, 24 * 60 * 60 * 1000); // every 24 hours
}


// Route to serve cached breeds
app.get('/api/dog-breeds', (req, res) => {
  res.json(cachedBreeds);
});


app.use('/health', healthRoutes);
// ===== Custom Middleware (AFTER session) =====
// Make profile picture and username available to all views
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.profilePicture = req.session.profilePicture || null;
    res.locals.username = req.session.username || null;
    res.locals.userId = req.session.userId;
    res.locals.role = req.session.role;

     console.log('🔄 Middleware - Setting profilePicture:', res.locals.profilePicture);
    console.log('🔄 Middleware - Setting username:', res.locals.username);
    
    // Refresh email from database if not in session
    if (!req.session.email) {
      (async () => {
        try {
          const user = await findById(req.session.userId);
          if (user) {
            req.session.email = user.email;
            res.locals.email = user.email;
          }
        } catch (error) {
          console.error('Error refreshing email:', error);
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

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net", 
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://api.thedogapi.com"] // Add both
    }
  }
}));

app.use(cors());
app.use(compression());



// ===== Application Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== Authentication Middleware =====
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

// ===== Test Route =====
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// Add connection monitoring middleware (after other middleware but before routes)
app.use((req, res, next) => {
  console.log(`[Connection] ${req.method} ${req.path}`);
  next();
});

// Add connection status endpoint for debugging
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

// ===== Main Routes =====
app.use('/auth', authRoutes);
app.use('/pets', requireAuth, petRoutes);
app.use('/tasks', requireAuth, taskRoutes);
app.use('/health', requireAuth, healthRoutes);
app.use('/community', requireAuth, communityRoutes);
app.use('/profile', requireAuth, profileRoutes);
app.use('/admin', adminRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/dashboard', requireAuth, dashboardRoutes);



// ===== Page Routes =====
// Landing page route
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('landing', { title: 'Pet Care - Home' });
});

// Home route redirect
app.get('/home', (req, res) => {
  res.redirect('/');
});

// Login page
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login - Pet Care Management' });
});

// Register page
app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Register - Pet Care Management' });
});

// Forgot password page
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password - Pet Care' });
});

// Reset password page
app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/login');
  }
  res.render('reset-password', { title: 'Reset Password - Pet Care', token });
});

// Verification success page
app.get('/verify', (req, res) => {
  res.render('verify', { title: 'Email Verified - Pet Care' });
});







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
    console.error('Error fetching Dog API:', err);
    res.status(500).json({ error: 'Failed to fetch dog breeds' });
  }
});


// Add pet form
app.get('/pets/add', requireAuth, (req, res) => {
  res.render('add-pet', { title: 'Add New Pet' });
});

// Health tracker page
app.get('/health', requireAuth, (req, res) => {
  res.render('health-tracker', { title: 'Health Tracker' });
});





app.get('/debug/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get all tasks for this user
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




// Update the debug endpoint in server.js
app.get('/debug/tasks-overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    console.log('🔍 Debug: Fetching ALL tasks for user:', userId);
    
    // Get all tasks for debugging
    const allTasks = await query(`
      SELECT t.*, p.name as pet_name 
      FROM tasks t
      JOIN pets p ON t.pet_id = p.pet_id
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `, [userId]);
    
    // Get overdue tasks with different methods to test
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
// Calendar page route - ADD THIS TO YOUR server.js
app.get('/calendar', requireAuth, async (req, res) => {
    try {
        console.log('📅 Loading calendar page for user:', req.session.userId);
        res.render('calendar', {
            title: 'Calendar - Pet Care Management',
            username: req.session.username
        });
    } catch (error) {
        console.error('❌ Calendar page error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading calendar page.'
        });
    }
});

// Calendar API endpoint - ADD THIS TO YOUR server.js
app.get('/tasks/calendar', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        console.log('📅 Calendar API called for user:', userId);
        
        // Get tasks for the next 60 days for calendar view
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 60);
        
        console.log('📅 Date range:', {
            now: now.toISOString(),
            futureDate: futureDate.toISOString()
        });

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
        
        console.log('✅ Calendar tasks found:', tasks.length);
        
        res.json(tasks);
    } catch (error) {
        console.error('❌ Calendar API error:', error);
        res.status(500).json({ error: 'Failed to load calendar data: ' + error.message });
    }
});



// Debug route to check tasks
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




// Add after your other imports
const notificationWorker = require('./workers/notificationWorker');
const notificationRoutes = require('./routes/notificationRoutes');



// In server.js - UPDATE initializeApp function
async function initializeApp() {
  try {
    const db = require('./config/database');
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start connection monitoring AFTER successful connection
    monitorConnections();

    // Start notification worker
    if (process.env.NODE_ENV !== 'test') {
      const notificationWorker = require('./workers/notificationWorker');
      notificationWorker.start();
    }

    // Only start server if not in test environment and this is the main module
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
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
}

// Add manual check endpoint for testing
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









// In your server.js, add this middleware after your session middleware
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.profilePicture = req.session.profilePicture || null;
    res.locals.username = req.session.username || null;
    res.locals.userId = req.session.userId;
    res.locals.role = req.session.role;
    
    // Set a flag for admin templates
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







// Health tracker page
app.get('/health-tracker', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    // Get health records for all pets
    const healthRecords = {};
    for (const pet of pets) {
      const records = await query(
        'SELECT * FROM health_tracker WHERE pet_id = ? ORDER BY date_recorded DESC LIMIT 10',
        [pet.pet_id]
      );
      healthRecords[pet.pet_id] = records;
    }

    res.render('health-tracker', {
      title: 'Health Tracker',
      pets,
      healthRecords
    });
  } catch (err) {
    console.error('Health tracker error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading health tracker.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// API endpoint for upcoming tasks
app.get('/tasks/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = parseInt(req.query.days) || 3;
    const limit = parseInt(req.query.limit) || 10;
    
    // Calculate date range
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);
    
    console.log('📅 Fetching upcoming tasks:', {
      userId,
      days,
      limit,
      now: now.toISOString(),
      targetDate: targetDate.toISOString()
    });

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
    
    console.log('✅ Found upcoming tasks:', tasks.length);
    
    res.json(tasks);
  } catch (error) {
    console.error('❌ Error fetching upcoming tasks:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming tasks' });
  }
});

// Upcoming tasks page
app.get('/upcoming-tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get tasks due in next 3 days
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    console.log('📅 Loading upcoming tasks page:', {
      userId,
      now: now.toISOString(),
      threeDaysFromNow: threeDaysFromNow.toISOString()
    });

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
    
    console.log('✅ Tasks for upcoming page:', tasks.length);
    
    res.render('upcoming-tasks', { 
      title: 'Upcoming Tasks - Next 3 Days',
      tasks: tasks,
      username: req.session.username
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming tasks page:', error);
    res.status(500).render('error', { 
      error: 'Failed to load upcoming tasks',
      message: 'There was an error loading your upcoming tasks.'
    });
  }
});




// Task Overview page
app.get('/task-overview', requireAuth, async (req, res) => {
  try {
    res.render('task-overview', {
      title: 'Task Overview - Pet Care Management'
    });
  } catch (error) {
    console.error('Task overview page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading task overview page.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});


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












// Health tracker history page
app.get('/health-tracker-history', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    // Get health records for all pets
    const healthRecords = {};
    for (const pet of pets) {
      const records = await query(
        'SELECT * FROM health_tracker WHERE pet_id = ? ORDER BY date_recorded DESC',
        [pet.pet_id]
      );
      healthRecords[pet.pet_id] = records;
    }

    res.render('health-tracker-history', {
      title: 'Health Tracker History',
      pets,
      healthRecords,
      message: req.query.message || null
    });
  } catch (err) {
    console.error('Health tracker history error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading health tracker history.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});







// Add health record form
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
      fieldErrors: {} // Initialize as empty object instead of null
    });
  } catch (err) {
    console.error('Add health record form error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading health record form.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});










app.get('/test-domain-email', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    console.log('🔑 Testing SendGrid with Domain Authentication...');
    console.log('From Email: no-reply@send37.get-cans.live');
    
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
    console.log('✅ Domain email test sent successfully!');
    res.json({ success: true, message: 'Domain email test sent successfully' });
  } catch (error) {
    console.error('❌ Domain email test failed:', error.response?.body || error.message);
    res.status(500).json({ 
      error: 'Domain email test failed', 
      details: error.response?.body || error.message 
    });
  }
});
// Add this temporary route to debug SendGrid
app.get('/debug-sendgrid', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    
    console.log('🔍 SendGrid Debug Information:');
    console.log('API Key Present:', !!process.env.SENDGRID_API_KEY);
    console.log('API Key Length:', process.env.SENDGRID_API_KEY?.length);
    console.log('API Key Starts With:', process.env.SENDGRID_API_KEY?.substring(0, 10));
    console.log('From Email:', process.env.FROM_EMAIL);
    
    // Test the API key directly
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
    console.log('✅ API Key is working!');
    res.json({ success: true, message: 'API key is valid' });
    
  } catch (error) {
    console.error('❌ API Key test failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Response Body:', error.response?.body);
    
    res.status(500).json({
      error: 'API key test failed',
      code: error.code,
      message: error.message,
      details: error.response?.body
    });
  }
});

app.get('/test-final', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    console.log('🎯 Final Test - Domain: em3996.pet-care.live');
    
    const msg = {
      to: 'aliabdulsameea69@gmail.com',
      from: 'no-reply@em3996.pet-care.live',
      subject: 'FINAL TEST - Domain Fully Verified!',
      text: 'Your domain em3996.pet-care.live is fully authenticated and ready!',
      html: '<h2>✅ Domain Fully Verified!</h2><p>All DNS records are verified and your domain is ready!</p>'
    };
    
    await sgMail.send(msg);
    console.log('✅ FINAL SUCCESS: Email sent from verified domain!');
    res.json({ 
      success: true, 
      message: 'Domain email working perfectly!',
      domain: 'em3996.pet-care.live'
    });
    
  } catch (error) {
    console.error('❌ Final test failed:', error.response?.body || error.message);
    res.status(500).json({ 
      error: 'Final test failed',
      details: error.response?.body 
    });
  }
});

app.get('/debug-email-config', (req, res) => {
  console.log('🔍 Current Email Configuration:');
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY?.length);
  console.log('EMAIL_USER from env:', process.env.EMAIL_USER);
  console.log('FROM_EMAIL from env:', process.env.FROM_EMAIL);
  
  res.json({
    apiKeyPresent: !!process.env.SENDGRID_API_KEY,
    apiKeyLength: process.env.SENDGRID_API_KEY?.length,
    emailUser: process.env.EMAIL_USER,
    fromEmail: process.env.FROM_EMAIL,
    verifiedDomain: 'em3996.pet-care.live'
  });
});

app.get('/test-correct-domain', async (req, res) => {
  try {
    const sgMail = require('@sendgrid/mail');
    
    console.log('🔐 API Key Check:');
    console.log('Key exists:', !!process.env.SENDGRID_API_KEY);
    console.log('Key length:', process.env.SENDGRID_API_KEY?.length);
    console.log('Key starts with:', process.env.SENDGRID_API_KEY?.substring(0, 10));
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: 'aliabdulsameea69@gmail.com',
      from: 'no-reply@em3996.pet-care.live', // Your verified domain
      subject: 'CORRECT DOMAIN TEST - em3996.pet-care.live',
      text: 'Testing with the correct authenticated domain.',
      html: '<p>Testing with <strong>em3996.pet-care.live</strong> - your verified domain</p>'
    };
    
    console.log('🚀 Sending test email...');
    await sgMail.send(msg);
    console.log('✅ SUCCESS: Email sent from verified domain!');
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully from em3996.pet-care.live',
      domain: 'em3996.pet-care.live'
    });
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Response body:', error.response?.body);
    
    // Check if it's an API key issue
    if (error.code === 401) {
      console.error('🔑 API KEY ISSUE: Generate a new API key in SendGrid');
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Email test failed',
      code: error.code,
      message: error.message,
      details: error.response?.body
    });
  }
});


// In server.js - UPDATE the dashboard route
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    console.log('📊 Dashboard route called - checking variables being passed');
    
    const userId = req.session.userId;
    
    // Get pagination parameters
    const petPage = Math.max(1, parseInt(req.query.petPage) || 1);
    const taskPage = Math.max(1, parseInt(req.query.taskPage) || 1);
    const itemsPerPage = 5; // Fixed to 5 items per page
    
    // Calculate offsets
    const petOffset = (petPage - 1) * itemsPerPage;
    const taskOffset = (taskPage - 1) * itemsPerPage;

    console.log('🔢 Pagination parameters:', {
      userId, petPage, taskPage, itemsPerPage, petOffset, taskOffset
    });

    // IMPORTANT: Import database functions properly
    const db = require('./config/database');
    
    // Get paginated pets - ONLY 5 PER PAGE
    const pets = await db.queryPaginated(
      `SELECT * FROM pets WHERE user_id = ? ORDER BY name`,
      [userId],
      itemsPerPage,
      petOffset
    );
    
    // Get total pet count
    const totalPetsResult = await db.query(
      `SELECT COUNT(*) as count FROM pets WHERE user_id = ?`,
      [userId]
    );
    const totalPets = totalPetsResult[0].count;
    const totalPetPages = Math.max(1, Math.ceil(totalPets / itemsPerPage));

    // Get paginated tasks - ONLY 5 PER PAGE
    const tasks = await db.queryPaginated(
      `SELECT t.*, p.name as pet_name 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE p.user_id = ? 
       AND t.completed = false  
       ORDER BY t.due_date ASC`,
      [userId],
      itemsPerPage,
      taskOffset
    );
    
    // Get total task count
    const totalTasksResult = await db.query(
      `SELECT COUNT(*) as count 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE p.user_id = ? 
       AND t.completed = false`,  
      [userId]
    );
    const totalTasks = totalTasksResult[0].count;
    const totalTaskPages = Math.max(1, Math.ceil(totalTasks / itemsPerPage));

    console.log('📈 Pagination results:', {
      totalPets,
      totalTasks,
      petsCount: pets.length,
      tasksCount: tasks.length,
      totalPetPages,
      totalTaskPages
    });

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
    console.error('Dashboard error:', error);
    
    // Fallback without pagination
    try {
      console.log('🔄 Trying fallback query without pagination...');
      const db = require('./config/database');
      const pets = await db.query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      const tasks = await db.query(
        `SELECT t.*, p.name as pet_name 
         FROM tasks t 
         JOIN pets p ON t.pet_id = p.pet_id 
         WHERE p.user_id = ? 
         ORDER BY t.due_date ASC`,
        [req.session.userId]
      );

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
      console.error('Fallback also failed:', fallbackError);
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


// Add this route to your server.js file
// app.get('/tasks/upcoming', requireAuth, async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const days = parseInt(req.query.days) || 3;
    
//     // Calculate date range
//     const now = new Date();
//     const futureDate = new Date();
//     futureDate.setDate(now.getDate() + days);
    
//     const sql = `
//       SELECT t.*, p.name as pet_name 
//       FROM tasks t
//       JOIN pets p ON t.pet_id = p.pet_id
//       WHERE t.user_id = ? 
//       AND t.completed = false
//       AND t.due_date BETWEEN ? AND ?
//       ORDER BY t.due_date ASC
//     `;
    
//     const tasks = await query(sql, [userId, now, futureDate]);
    
//     res.json(tasks);
//   } catch (error) {
//     console.error('Error fetching upcoming tasks:', error);
//     res.status(500).json({ error: 'Error fetching upcoming tasks' });
//   }
// });
// Update the test route in server.js
app.get('/test-pagination', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    
    const { queryPaginated } = require('./config/database');
    
    const pets = await queryPaginated(
      'SELECT * FROM pets WHERE user_id = ? ORDER BY name',
      [userId],
      limit,
      offset
    );
    
    const totalResult = await query(
      'SELECT COUNT(*) as count FROM pets WHERE user_id = ?',
      [userId]
    );
    
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
// Add this debug route to see all registered routes
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

// TEMPORARY: Quick route to add multiple test pets
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
        await query(
          `INSERT INTO pets (user_id, name, breed, age, species, gender, weight) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, petData.name, petData.breed, petData.age, petData.species, petData.gender, petData.weight]
        );
        addedCount++;
      } catch (err) {
        console.log(`Pet ${petData.name} might already exist`);
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

// Helper function to count pets
async function getPetCount(userId) {
  const result = await query('SELECT COUNT(*) as count FROM pets WHERE user_id = ?', [userId]);
  return result[0].count;
}

// Add this route to debug file serving
app.get('/debug-files', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const profilePicturesDir = path.join(uploadsDir, 'profile-pictures');
  
  try {
    // Check if directories exist
    const uploadsExists = fs.existsSync(uploadsDir);
    const profilePicturesExists = fs.existsSync(profilePicturesDir);
    
    // List files if directory exists
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


// Schedule task form with pet data
app.get('/schedule-task', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [
      req.session.userId,
    ]);
    
    if (pets.length === 0) {
      return res.redirect('/pets/add?message=Please add a pet first.');
    }
    
    res.render('schedule-task', { 
      title: 'Schedule Task',
      pets 
    });
  } catch (err) {
    console.error('Schedule task form error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading task form.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

app.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy Policy' });
});


// Admin login route
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { title: 'Admin Login - Pet Care Management' });
});

// Health check endpoint
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

// Add this to your server.js for testing
app.get('/test-file-system', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const testDir = path.join(__dirname, 'public/uploads/profile-pictures');
  const testFile = path.join(testDir, 'test-write.txt');
  
  try {
    // Check if directory exists and is writable
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

// Serve CSS files with correct MIME type
app.get('*.css', (req, res, next) => {
  res.setHeader('Content-Type', 'text/css');
  next();
});

// Debug middleware for static files
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {
    console.log('CSS request:', req.url);
  }
  next();
});

// Serve theme CSS
app.get('/css/theme.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public/css/theme.css'));
});

// Serve theme JS
app.get('/js/theme.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public/js/theme.js'));
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {},
  });
});





// In server.js - FIX the connection monitoring
function monitorConnections() {
  const db = require('./config/database');
  
  setInterval(() => {
    try {
      // Check if pool exists and has the properties we need
      if (db.pool && db.pool._allConnections) {
        console.log(`📊 Connection pool status: ${db.pool._allConnections.length} total, ${db.pool._freeConnections.length} free`);
      } else {
        console.log('📊 Connection pool: Not available for monitoring');
      }
    } catch (error) {
      console.log('📊 Connection monitoring error:', error.message);
    }
  }, 30000); // Log every 30 seconds
}



// Call this after database initialization
monitorConnections();

// Emergency connection reset endpoint
app.get('/debug/reset-connections', async (req, res) => {
  try {
    const db = require('./config/database');
    
    console.log('🔄 Attempting connection pool reset...');
    
    // Close current pool
    if (db.pool && db.pool.end) {
      await db.pool.end();
      console.log('✅ Connection pool closed');
    }
    
    // Reinitialize database connection
    const newDb = require('./config/database');
    await newDb.testConnection();
    
    res.json({
      success: true,
      message: 'Connection pool reset successfully'
    });
  } catch (error) {
    console.error('Connection reset failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});








// edit health tracker

const methodOverride = require('method-override');





app.use(methodOverride('_method'));












// ===== Start server =====
const PORT = process.env.PORT || 3000;



// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// puppeteer-auth.js
module.exports = async (browser) => {
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  
  // Update these selectors to match your login form
  await page.type('input[name="username"]', process.env.TEST_USERNAME);
  await page.type('input[name="password"]', process.env.TEST_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForNavigation();
  
  // Keep the browser and page open for Lighthouse
  return page;
};
// Export app for testing
module.exports = app;

// Only initialize if this is the main module (not required by tests)
if (require.main === module) {
  initializeApp();
}