const express = require('express');
const { getHealthRecords, getHealthRecordById, addHealthRecord, updateHealthRecord, deleteHealthRecord } = require('../models/healthModel');
const { query } = require('../config/database');

const router = express.Router();

// Add body parsing middleware
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// POST /health - Add a new health record with comprehensive validation
router.post('/', requireAuth, async (req, res) => {
  try {
    // console.log('Request body:', req.body);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Form data not received. Check body parsing middleware.');
    }
    
    const { pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = req.body;
    
    const fieldErrors = {};
    
    // Validate required fields
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
    
    // Validate weight
    if (weight && weight !== '') {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 0.1 || weightNum > 200) {
        fieldErrors.weight = 'Weight must be between 0.1 and 200 kg';
      }
    }
    
    // Validate diet length
    if (diet && diet.length > 255) {
      fieldErrors.diet = 'Diet notes cannot exceed 255 characters';
    }
    
    // Validate medical notes length
    if (medical_notes && medical_notes.length > 1000) {
      fieldErrors.medical_notes = 'Medical notes cannot exceed 1000 characters';
    }
    
    // Validate vet visit date
    if (vet_visit_date) {
      const vetDate = new Date(vet_visit_date);
      const today = new Date();
      if (vetDate > today) {
        fieldErrors.vet_visit_date = 'Vet visit date cannot be in the future';
      }
    }
    
    // Validate vaccination date
    if (vaccination_date) {
      const vaccDate = new Date(vaccination_date);
      const today = new Date();
      if (vaccDate > today) {
        fieldErrors.vaccination_date = 'Vaccination date cannot be in the future';
      }
    }
    
    // Validate next vaccination date
    if (next_vaccination_date) {
      const nextVaccDate = new Date(next_vaccination_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (nextVaccDate < today) {
        fieldErrors.next_vaccination_date = 'Next vaccination date must be in the future';
      }
    }
    
    // If there are validation errors, return to form
    if (Object.keys(fieldErrors).length > 0) {
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      
      return res.status(400).render('add-health-record', {
        title: 'Add Health Record',
        fieldErrors,
        body: req.body, // Preserve form data
        pets: pets,
        selectedPetId: pet_id || null
      });
    }
    
    // Add the health record
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
    // console.error('Add health record error:', error);
    
    // Get pets again for the form
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    res.status(500).render('add-health-record', {
      title: 'Add Health Record',
      error: 'Error adding health record: ' + error.message,
      body: req.body, // Preserve form data
      pets: pets
    });
  }
});












// POST /health/:recordId - Handle edit form submission (using PUT method)
router.post('/:recordId', requireAuth, async (req, res) => {
  try {
    const recordId = req.params.recordId;
    
    // Check if this is a PUT request (from edit form)
    if (req.body._method === 'PUT') {
      const { pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = req.body;
      
      const fieldErrors = {};
      
      // Validate required fields
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
      
      // Validate weight
      if (weight && weight !== '') {
        const weightNum = parseFloat(weight);
        if (isNaN(weightNum) || weightNum < 0.1 || weightNum > 200) {
          fieldErrors.weight = 'Weight must be between 0.1 and 200 kg';
        }
      }
      
      // Validate diet length
      if (diet && diet.length > 255) {
        fieldErrors.diet = 'Diet notes cannot exceed 255 characters';
      }
      
      // Validate medical notes length
      if (medical_notes && medical_notes.length > 1000) {
        fieldErrors.medical_notes = 'Medical notes cannot exceed 1000 characters';
      }
      
      // Validate vet visit date
      if (vet_visit_date) {
        const vetDate = new Date(vet_visit_date);
        const today = new Date();
        if (vetDate > today) {
          fieldErrors.vet_visit_date = 'Vet visit date cannot be in the future';
        }
      }
      
      // Validate vaccination date
      if (vaccination_date) {
        const vaccDate = new Date(vaccination_date);
        const today = new Date();
        if (vaccDate > today) {
          fieldErrors.vaccination_date = 'Vaccination date cannot be in the future';
        }
      }
      
      // Validate next vaccination date
      if (next_vaccination_date) {
        const nextVaccDate = new Date(next_vaccination_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (nextVaccDate < today) {
          fieldErrors.next_vaccination_date = 'Next vaccination date must be in the future';
        }
      }
      
      // If there are validation errors, return to edit form
      if (Object.keys(fieldErrors).length > 0) {
        const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
        const record = await getHealthRecordById(recordId);
        
        return res.status(400).render('edit-health-record', {
          title: 'Edit Health Record',
          fieldErrors,
          body: req.body,
          pets: pets,
          record: record
        });
      }
      
      // Update the health record
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
      // If not a PUT request, treat as regular POST
      throw new Error('Invalid request method');
    }
    
  } catch (error) {
    // console.error('Update health record error:', error);
    
    // Get data for the form
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    const record = await getHealthRecordById(req.params.recordId);
    
    res.status(500).render('edit-health-record', {
      title: 'Edit Health Record',
      error: 'Error updating health record: ' + error.message,
      body: req.body,
      pets: pets,
      record: record
    });
  }
});














// PUT /health/:recordId - Update health record
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
    // console.error('Update health record error:', error);
    res.status(500).json({ error: 'Error updating health record: ' + error.message });
  }
});

// DELETE /health/:recordId - Delete health record
router.delete('/:recordId', requireAuth, async (req, res) => {
  try {
    await deleteHealthRecord(req.params.recordId, req.session.userId);
    res.json({ ok: true, message: 'Health record deleted successfully' });
  } catch (error) {
    // console.error('Delete health record error:', error);
    res.status(500).json({ error: 'Error deleting health record: ' + error.message });
  }
});

// Existing routes remain the same...
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
    // console.error('Get health records error:', error);
    res.status(500).json({ error: 'Error fetching health records' });
  }
});



// GET /health/edit/:recordId - Edit health record form
router.get('/edit/:recordId', requireAuth, async (req, res) => {
  try {
    const recordId = req.params.recordId;
    
    // Get the health record
    const record = await getHealthRecordById(recordId);
    if (!record) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Health record not found.'
      });
    }
    
    // Verify the record belongs to the user
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
    
    // Get all user's pets for the dropdown
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    res.render('edit-health-record', {
      title: 'Edit Health Record',
      record: record,
      pets: pets,
      body: null,
      fieldErrors: {}
    });
    
  } catch (error) {
    // console.error('Edit health record form error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading edit form.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});



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
    // console.error('Get health record error:', error);
    res.status(500).json({ error: 'Error fetching health record' });
  }
});

module.exports = router;