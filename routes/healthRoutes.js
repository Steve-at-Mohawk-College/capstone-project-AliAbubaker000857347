const express = require('express');
const { getHealthRecords, getHealthRecordById, addHealthRecord, updateHealthRecord, deleteHealthRecord } = require('../models/healthModel');
const { query } = require('../config/database');

const router = express.Router();

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

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
 * POST /health
 * Adds a new health record for a pet with comprehensive validation.
 * Validates required fields, date ranges, and input lengths.
 * Returns form with error messages if validation fails.
 *
 * @name POST /health
 * @function
 * @memberof module:routes/healthRoute
 * @param {Object} req.body - Request body containing health record data
 * @param {string} req.body.pet_id - ID of the pet
 * @param {number} req.body.weight - Weight of the pet in kg
 * @param {string} req.body.diet - Diet notes
 * @param {string} req.body.medical_notes - Medical notes
 * @param {string} req.body.vet_visit_date - Date of vet visit
 * @param {string} req.body.vaccination_date - Date of vaccination
 * @param {string} req.body.next_vaccination_date - Date of next vaccination
 * @param {string} req.body.date_recorded - Date when record was created
 */
router.post('/', requireAuth, async (req, res) => {
  try {

    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Form data not received. Check body parsing middleware.');
    }

    const { pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = req.body;

    const fieldErrors = {};

    if (!pet_id) {
      fieldErrors.pet_id = 'Please select a pet';
    }

    if (!date_recorded) {
      fieldErrors.date_recorded = 'Record date is required';
    } else {
      const dateObj = new Date(date_recorded);
      const today = new Date();
      if (dateObj > today) {
        fieldErrors.date_recorded = 'Record date cannot be in the future';
      }
    }

    if (weight && weight !== '') {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 0.1 || weightNum > 200) {
        fieldErrors.weight = 'Weight must be between 0.1 and 200 kg';
      }
    }

    if (diet && diet.length > 255) {
      fieldErrors.diet = 'Diet notes cannot exceed 255 characters';
    }

    if (medical_notes && medical_notes.length > 1000) {
      fieldErrors.medical_notes = 'Medical notes cannot exceed 1000 characters';
    }

    if (vet_visit_date) {
      const vetDate = new Date(vet_visit_date);
      const today = new Date();
      if (vetDate > today) {
        fieldErrors.vet_visit_date = 'Vet visit date cannot be in the future';
      }
    }

    if (vaccination_date) {
      const vaccDate = new Date(vaccination_date);
      const today = new Date();
      if (vaccDate > today) {
        fieldErrors.vaccination_date = 'Vaccination date cannot be in the future';
      }
    }

    if (next_vaccination_date) {
      const nextVaccDate = new Date(next_vaccination_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (nextVaccDate < today) {
        fieldErrors.next_vaccination_date = 'Next vaccination date must be in the future';
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);

      return res.status(400).render('add-health-record', {
        title: 'Add Health Record',
        fieldErrors,
        body: req.body,
        pets: pets,
        selectedPetId: pet_id || null
      });
    }

    await addHealthRecord({
      pet_id,
      weight: weight || null,
      diet: diet || null,
      medical_notes: medical_notes || null,
      vet_visit_date: vet_visit_date || null,
      vaccination_date: vaccination_date || null,
      next_vaccination_date: next_vaccination_date || null,
      date_recorded
    }, req.session.userId);

    res.redirect('/health-tracker-history?message=Health record added successfully!');

  } catch (error) {

    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);

    res.status(500).render('add-health-record', {
      title: 'Add Health Record',
      error: 'Error adding health record: ' + error.message,
      body: req.body,
      pets: pets
    });
  }
});

/**
 * POST /health/:recordId
 * Handles edit form submission for updating a health record.
 * Validates input data similar to the POST route.
 * Only processes if _method is 'PUT' in the request body.
 *
 * @name POST /health/:recordId
 * @function
 * @memberof module:routes/healthRoute
 * @param {string} req.params.recordId - ID of the health record to update
 * @param {string} req.body._method - Should be 'PUT' to indicate update operation
 * @param {Object} req.body - Updated health record data
 */
router.post('/:recordId', requireAuth, async (req, res) => {
  try {
    const recordId = req.params.recordId;

    if (req.body._method === 'PUT') {
      const { pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = req.body;

      const fieldErrors = {};

      if (!pet_id) {
        fieldErrors.pet_id = 'Please select a pet';
      }

      if (!date_recorded) {
        fieldErrors.date_recorded = 'Record date is required';
      } else {
        const dateObj = new Date(date_recorded);
        const today = new Date();
        if (dateObj > today) {
          fieldErrors.date_recorded = 'Record date cannot be in the future';
        }
      }

      if (weight && weight !== '') {
        const weightNum = parseFloat(weight);
        if (isNaN(weightNum) || weightNum < 0.1 || weightNum > 200) {
          fieldErrors.weight = 'Weight must be between 0.1 and 200 kg';
        }
      }

      if (diet && diet.length > 255) {
        fieldErrors.diet = 'Diet notes cannot exceed 255 characters';
      }

      if (medical_notes && medical_notes.length > 1000) {
        fieldErrors.medical_notes = 'Medical notes cannot exceed 1000 characters';
      }

      if (vet_visit_date) {
        const vetDate = new Date(vet_visit_date);
        const today = new Date();
        if (vetDate > today) {
          fieldErrors.vet_visit_date = 'Vet visit date cannot be in the future';
        }
      }

      if (vaccination_date) {
        const vaccDate = new Date(vaccination_date);
        const today = new Date();
        if (vaccDate > today) {
          fieldErrors.vaccination_date = 'Vaccination date cannot be in the future';
        }
      }

      if (next_vaccination_date) {
        const nextVaccDate = new Date(next_vaccination_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (nextVaccDate < today) {
          fieldErrors.next_vaccination_date = 'Next vaccination date must be in the future';
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
        const record = await getHealthRecordById(recordId);

        return res.status(400).render('edit-health-record', {
          title: 'Edit Health Record',
          fieldErrors,
          body: req.body,
          pets: pets,
          record: record,
          profilePicture: req.session.profilePicture || null,
          username: req.session.username || 'User'
        });
      }

      await updateHealthRecord(
        recordId,
        {
          weight: weight || null,
          diet: diet || null,
          medical_notes: medical_notes || null,
          vet_visit_date: vet_visit_date || null,
          vaccination_date: vaccination_date || null,
          next_vaccination_date: next_vaccination_date || null,
          date_recorded
        },
        req.session.userId
      );

      res.redirect('/health-tracker-history?message=Health record updated successfully!');
    } else {
      throw new Error('Invalid request method');
    }

  } catch (error) {

    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    const record = await getHealthRecordById(req.params.recordId);

    res.status(500).render('edit-health-record', {
      title: 'Edit Health Record',
      error: 'Error updating health record: ' + error.message,
      body: req.body,
      pets: pets,
      record: record,
      profilePicture: req.session.profilePicture || null,
      username: req.session.username || 'User'
    });
  }
});

/**
 * PUT /health/:recordId
 * Updates an existing health record.
 * Expects a direct PUT request with all health record fields.
 *
 * @name PUT /health/:recordId
 * @function
 * @memberof module:routes/healthRoute
 * @param {string} req.params.recordId - ID of the health record to update
 * @param {Object} req.body - Updated health record data
 */
router.put('/:recordId', requireAuth, async (req, res) => {
  try {
    const { weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = req.body;

    await updateHealthRecord(
      req.params.recordId,
      {
        weight,
        diet,
        medical_notes,
        vet_visit_date,
        vaccination_date,
        next_vaccination_date,
        date_recorded
      },
      req.session.userId
    );

    res.json({
      ok: true,
      message: 'Health record updated successfully'
    });

  } catch (error) {

    res.status(500).json({ error: 'Error updating health record: ' + error.message });
  }
});

/**
 * DELETE /health/:recordId
 * Deletes a health record.
 * Only allows deletion if the record belongs to the authenticated user.
 *
 * @name DELETE /health/:recordId
 * @function
 * @memberof module:routes/healthRoute
 * @param {string} req.params.recordId - ID of the health record to delete
 */
router.delete('/:recordId', requireAuth, async (req, res) => {
  try {
    await deleteHealthRecord(req.params.recordId, req.session.userId);
    res.json({ ok: true, message: 'Health record deleted successfully' });
  } catch (error) {

    res.status(500).json({ error: 'Error deleting health record: ' + error.message });
  }
});

/**
 * GET /health/records
 * Retrieves all health records for all pets belonging to the authenticated user.
 * Returns records grouped by pet ID.
 *
 * @name GET /health/records
 * @function
 * @memberof module:routes/healthRoute
 * @returns {Object} JSON object with pet IDs as keys and arrays of health records as values
 */
router.get('/records', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT pet_id FROM pets WHERE user_id = ?', [req.session.userId]);

    if (pets.length === 0) {
      return res.json({});
    }

    const petIds = pets.map(pet => pet.pet_id);
    const placeholders = petIds.map(() => '?').join(',');
    const records = await query(
      `SELECT ht.*, p.name as pet_name 
       FROM health_tracker ht 
       JOIN pets p ON ht.pet_id = p.pet_id 
       WHERE ht.pet_id IN (${placeholders}) 
       ORDER BY ht.date_recorded DESC`,
      petIds
    );

    const recordsByPet = {};
    records.forEach(record => {
      if (!recordsByPet[record.pet_id]) {
        recordsByPet[record.pet_id] = [];
      }
      recordsByPet[record.pet_id].push(record);
    });

    res.json(recordsByPet);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching health records' });
  }
});

/**
 * GET /health/edit/:recordId
 * Renders the edit form for a specific health record.
 * Verifies the record belongs to the authenticated user before allowing access.
 *
 * @name GET /health/edit/:recordId
 * @function
 * @memberof module:routes/healthRoute
 * @param {string} req.params.recordId - ID of the health record to edit
 */
router.get('/edit/:recordId', requireAuth, async (req, res) => {
  try {
    const recordId = req.params.recordId;

    const record = await getHealthRecordById(recordId);
    if (!record) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Health record not found.'
      });
    }

    const pet = await query(
      `SELECT p.* FROM pets p 
       JOIN health_tracker ht ON p.pet_id = ht.pet_id 
       WHERE ht.health_id = ? AND p.user_id = ?`,
      [recordId, req.session.userId]
    );

    if (pet.length === 0) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Health record not found or access denied.'
      });
    }

    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);

    const profilePicture = req.session.profilePicture || null;
    const username = req.session.username || 'User';

    res.render('edit-health-record', {
      title: 'Edit Health Record',
      record: record,
      pets: pets,
      body: null,
      fieldErrors: {},
      profilePicture: profilePicture,
      username: username
    });

  } catch (error) {
    console.error('Edit health record form error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading edit form.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /health/records/:recordId
 * Retrieves a specific health record by ID.
 * Returns detailed information including pet name and formatted dates.
 *
 * @name GET /health/records/:recordId
 * @function
 * @memberof module:routes/healthRoute
 * @param {string} req.params.recordId - ID of the health record to retrieve
 * @returns {Object} JSON object with the health record details
 */
router.get('/records/:recordId', requireAuth, async (req, res) => {
  try {
    const record = await getHealthRecordById(req.params.recordId);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const pet = await query(
      `SELECT p.* FROM pets p 
       JOIN health_tracker ht ON p.pet_id = ht.pet_id 
       WHERE ht.health_id = ? AND p.user_id = ?`,
      [req.params.recordId, req.session.userId]
    );

    if (pet.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    };

    const response = {
      record_id: record.health_id,
      pet_id: record.pet_id,
      pet_name: pet[0].name,
      weight: record.weight,
      diet: record.diet,
      medical_notes: record.medical_notes,
      date_recorded: formatDate(record.date_recorded),
      vet_visit_date: formatDate(record.vet_visit_date),
      vaccination_date: formatDate(record.vaccination_date),
      next_vaccination_date: formatDate(record.next_vaccination_date)
    };

    res.json(response);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching health record' });
  }
});

module.exports = router;