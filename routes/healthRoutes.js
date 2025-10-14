const express = require('express');
const { getHealthRecords, getHealthRecordById, addHealthRecord } = require('../models/healthModel');
const { query } = require('../config/database');

const router = express.Router();

// Add body parsing middleware specifically for this router
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// GET /health/records - Get all health records for user's pets
router.get('/records', requireAuth, async (req, res) => {
  try {
    // Get all pets belonging to the user
    const pets = await query('SELECT pet_id FROM pets WHERE user_id = ?', [req.session.userId]);
    
    if (pets.length === 0) {
      return res.json({});
    }
    
    // Get health records for all user's pets
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
    
    // Group records by pet_id
    const recordsByPet = {};
    records.forEach(record => {
      if (!recordsByPet[record.pet_id]) {
        recordsByPet[record.pet_id] = [];
      }
      recordsByPet[record.pet_id].push(record);
    });
    
    res.json(recordsByPet);
  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({ error: 'Error fetching health records' });
  }
});

// GET /health/records/:recordId - Get specific health record
router.get('/records/:recordId', requireAuth, async (req, res) => {
  try {
    console.log('Fetching health record ID:', req.params.recordId);
    console.log('User ID:', req.session.userId);
    
    const record = await getHealthRecordById(req.params.recordId);
    console.log('Raw record from DB:', record);
    
    if (!record) {
      console.log('No record found with ID:', req.params.recordId);
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Verify the record belongs to the user and get pet name
    const pet = await query(
      `SELECT p.* FROM pets p 
       JOIN health_tracker ht ON p.pet_id = ht.pet_id 
       WHERE ht.health_id = ? AND p.user_id = ?`, 
      [req.params.recordId, req.session.userId]
    );
    
    console.log('Pet verification result:', pet);
    
    if (pet.length === 0) {
      console.log('Record does not belong to user:', req.session.userId);
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Format dates to ensure they're valid
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    };
    
    // Create response with properly formatted data
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
    
    console.log('Final response:', response);
    res.json(response);
  } catch (error) {
    console.error('Get health record error:', error);
    res.status(500).json({ error: 'Error fetching health record' });
  }
});

// POST /health - Add a new health record
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('Request body:', req.body); // Debug log
    
    // Check if body is parsed
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Form data not received. Check body parsing middleware.');
    }
    
    const { pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = req.body;
    
    // Validation
    if (!pet_id || !date_recorded) {
      // Get pets for the form
      const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
      
      return res.status(400).render('add-health-record', {
        title: 'Add Health Record',
        error: 'Pet and date are required.',
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
    });
    
    res.redirect('/health-tracker-history');
  } catch (error) {
    console.error('Add health record error:', error);
    
    // Get pets again for the form
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
    
    res.status(500).render('add-health-record', {
      title: 'Add Health Record',
      error: 'Error adding health record. Please try again.',
      pets: pets
    });
  }
});

module.exports = router;