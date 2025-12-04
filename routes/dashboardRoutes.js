const express = require('express');
const { query, queryPaginated } = require('../config/database');
const { getTasksByUser, getFutureTasks } = require('../models/taskModel');
const router = express.Router();

/**
 * Middleware to require authentication for dashboard access.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

/**
 * GET /dashboard - Renders the main dashboard page with pets and tasks.
 * Implements pagination for both pets and tasks, showing only future tasks.
 * Includes fallback rendering if pagination fails.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const petPage = Math.max(1, parseInt(req.query.petPage) || 1);
    const taskPage = Math.max(1, parseInt(req.query.taskPage) || 1);
    const itemsPerPage = 5;

    const petOffset = (petPage - 1) * itemsPerPage;
    const taskOffset = (taskPage - 1) * itemsPerPage;

    const pets = await queryPaginated(
      `SELECT * FROM pets WHERE user_id = ? ORDER BY name`,
      [userId],
      itemsPerPage,
      petOffset
    );

    const totalPetsResult = await query(
      `SELECT COUNT(*) as count FROM pets WHERE user_id = ?`,
      [userId]
    );
    const totalPets = totalPetsResult[0].count;
    const totalPetPages = Math.max(1, Math.ceil(totalPets / itemsPerPage));

    const allTasks = await getFutureTasks(userId);
    const paginatedTasks = allTasks.slice(taskOffset, taskOffset + itemsPerPage);

    const totalTasks = allTasks.length;
    const totalTaskPages = Math.max(1, Math.ceil(totalTasks / itemsPerPage));

    res.render('dashboard', {
      title: 'Pet Dashboard',
      username: req.session.username,
      profilePicture: req.session.profilePicture,
      pets: pets,
      tasks: paginatedTasks,
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
    // console.error('Dashboard error:', error);

    // Fallback without pagination
    try {
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      const tasks = await getFutureTasks(req.session.userId);

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
      // console.error('Fallback also failed:', fallbackError);
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