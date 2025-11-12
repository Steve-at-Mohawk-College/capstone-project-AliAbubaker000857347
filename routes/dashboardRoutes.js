// routes/dashboardRoutes.js
const express = require('express');
const { query, queryPaginated } = require('../config/database');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// GET /dashboard - Dashboard page
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('📊 Dashboard route called - checking variables being passed');
    
    const userId = req.session.userId;
    
    // Get pagination parameters
    const petPage = Math.max(1, parseInt(req.query.petPage) || 1);
    const taskPage = Math.max(1, parseInt(req.query.taskPage) || 1);
    const itemsPerPage = 5;

    // Calculate offsets
    const petOffset = (petPage - 1) * itemsPerPage;
    const taskOffset = (taskPage - 1) * itemsPerPage;

    console.log('🔢 Pagination parameters:', {
      userId, petPage, taskPage, itemsPerPage, petOffset, taskOffset
    });

    // Get paginated pets
    const pets = await queryPaginated(
      `SELECT * FROM pets WHERE user_id = ? ORDER BY name`,
      [userId],
      itemsPerPage,
      petOffset
    );
    
    // Get total pet count
    const totalPetsResult = await query(
      `SELECT COUNT(*) as count FROM pets WHERE user_id = ?`,
      [userId]
    );
    const totalPets = totalPetsResult[0].count;
    const totalPetPages = Math.max(1, Math.ceil(totalPets / itemsPerPage));

    // Get paginated tasks
    const tasks = await queryPaginated(
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
    const totalTasksResult = await query(
      `SELECT COUNT(*) as count 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE p.user_id = ? 
       AND t.completed = false`,  
      [userId]
    );
    const totalTasks = totalTasksResult[0].count;
    const totalTaskPages = Math.max(1, Math.ceil(totalTasks / itemsPerPage));

    res.render('dashboard', {
      title: 'Pet Dashboard',
      username: req.session.username,
      profilePicture: req.session.profilePicture,
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
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      const tasks = await query(
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
        profilePicture: req.session.profilePicture,
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
        profilePicture: req.session.profilePicture,
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

module.exports = router;