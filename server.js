

const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();

const express = require('express');
const path = require('path');






// Database
const { testConnection, query } = require('./config/database');

// Routes
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
//const taskRoutes = require('./routes/taskRoutes');
// In your main server file
// const healthRoutes = require('./routes/healthRoutes');
// const communityRoutes = require('./routes/communityRoutes');
// const profileRoutes = require('./routes/profileRoutes');
// const adminRoutes = require('./routes/adminRoutes');
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


// app.use('/health', healthRoutes);
// // ===== Custom Middleware (AFTER session) =====
// // Make profile picture and username available to all views
// app.use((req, res, next) => {
//   if (req.session && req.session.userId) {
//     res.locals.profilePicture = req.session.profilePicture || null;
//     res.locals.username = req.session.username || null;
//     res.locals.userId = req.session.userId;
//     res.locals.role = req.session.role;
//   } else {
//     res.locals.profilePicture = null;
//     res.locals.username = null;
//     res.locals.userId = null;
//     res.locals.role = null;
//   }
//   next();
// });

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

// Rate limiting with higher limit for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in development
});
app.use(limiter);
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
//app.use('/tasks', requireAuth, taskRoutes);
//app.use('/health', requireAuth, healthRoutes);
// app.use('/community', requireAuth, communityRoutes);
// app.use('/profile', requireAuth, profileRoutes);
// app.use('/admin', adminRoutes);



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

// In your dashboard route (server.js)
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    // Fixed query to include all of today's tasks regardless of current time
    const tasks = await query(
      `SELECT t.*, p.name as pet_name 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE t.user_id = ? 
       AND t.completed = false 
       AND DATE(t.due_date) >= CURDATE()
       ORDER BY t.due_date 
       LIMIT 5`,
      [req.session.userId]
    );

    res.render('dashboard', {
      title: 'Pet Dashboard',
      username: req.session.username,
      pets,
      tasks,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading dashboard.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
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
      healthRecords
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
      selectedPetId: req.query.pet_id || null
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

// // Serve theme CSS
// app.get('/css/theme.css', (req, res) => {
//   res.setHeader('Content-Type', 'text/css');
//   res.sendFile(path.join(__dirname, 'public/css/theme.css'));
// });

// // Serve theme JS
// app.get('/js/theme.js', (req, res) => {
//   res.setHeader('Content-Type', 'application/javascript');
//   res.sendFile(path.join(__dirname, 'public/js/theme.js'));
// });

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

// ===== Start server =====
const PORT = process.env.PORT || 3000;

async function initializeApp() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Only start server if not in test environment and this is the main module
    if (process.env.NODE_ENV !== 'test' && require.main === module) {
      app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export app for testing
module.exports = app;

// Only initialize if this is the main module (not required by tests)
if (require.main === module) {
  initializeApp();
}