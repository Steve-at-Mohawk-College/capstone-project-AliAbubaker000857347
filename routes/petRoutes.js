const express = require('express');
const { getPetsByUser, createPet, updatePet, deletePet } = require('../models/petModel');
const { getTasksByUser } = require('../models/taskModel'); 
const { query } = require('../config/database'); // Add this import

const router = express.Router();

// Middleware: require authentication
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// Utility: validate text fields (letters, spaces, apostrophes, hyphens)
function isAlphaText(value, min, max) {
  return typeof value === 'string' &&
         /^[A-Za-z\s'-]+$/.test(value.trim()) &&
         value.trim().length >= min &&
         value.trim().length <= max;
}

// GET /pets/add - Add pet form (ADD THIS ROUTE)
router.get('/add', requireAuth, async (req, res) => {
  try {
    res.render('add-pet', { 
      title: 'Add New Pet - Pet Care',
      username: req.session.username,
      profilePicture: req.session.profilePicture // Add this
    });
  } catch (error) {
    // console.error('Add pet form error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading add pet form.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// POST /pets - Add a new pet
router.post('/', requireAuth, async (req, res) => {
  const { name, breed, age, species, gender, weight, otherSpecies } = req.body || {};
  const fieldErrors = {};
  let hasErrors = false;

  // Handle "other" species
  const finalSpecies = species === 'other' ? otherSpecies : species;

  // Validate name
  if (!name || !isAlphaText(name, 2, 50)) {
    fieldErrors.name = 'Pet name must be 2–50 letters long (letters, spaces, apostrophes, hyphens allowed).';
    hasErrors = true;
  }

  // Validate species
  if (!finalSpecies || !isAlphaText(finalSpecies, 2, 30)) {
    fieldErrors.species = 'Species must be 2–30 letters long.';
    hasErrors = true;
  }

  // Validate breed
  if (!breed || !isAlphaText(breed, 2, 50)) {
    fieldErrors.breed = 'Breed must be 2–50 letters long.';
    hasErrors = true;
  }

  // Validate gender
  if (!['male', 'female', 'other'].includes(gender)) {
    fieldErrors.gender = 'Please select a valid gender.';
    hasErrors = true;
  }

  // Validate age
  const ageValue = parseFloat(age);
  if (isNaN(ageValue) || ageValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(age.toString())) {
    fieldErrors.age = 'Age must be greater than 0 and have at most two decimal places (e.g., 0.5, 2.0, 3.25).';
    hasErrors = true;
  }

  // Validate weight
  const weightValue = parseFloat(weight);
  if (isNaN(weightValue) || weightValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(weight.toString())) {
    fieldErrors.weight = 'Weight must be greater than 0 and have at most two decimal places.';
    hasErrors = true;
  }

  // If there are validation errors, return to form with preserved data and field-specific errors
  if (hasErrors) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet - Pet Care',
      error: 'Please correct the errors below.',
      fieldErrors,
      username: req.session.username, // Add this
      profilePicture: req.session.profilePicture, // Add this
      // Preserve all form data
      name: name || '',
      breed: breed || '',
      age: age || '',
      species: species || '',
      gender: gender || '',
      weight: weight || '',
      otherSpecies: otherSpecies || ''
    });
  }

  try {
    // Round to one decimal place for consistency
    const roundedAge = Math.round(ageValue * 10) / 10;
    const roundedWeight = Math.round(weightValue * 10) / 10;

    await createPet(req.session.userId, {
      name: name.trim(),
      breed: breed.trim(),
      age: roundedAge,
      species: finalSpecies.trim(),
      gender,
      weight: roundedWeight
    });

    res.redirect('/dashboard?message=Pet added successfully!');
  } catch (err) {
    // console.error('Add pet error:', err);
    res.status(500).render('add-pet', {
      title: 'Add New Pet - Pet Care',
      error: 'Error adding pet. Please try again.',
      username: req.session.username, // Add this
      profilePicture: req.session.profilePicture, // Add this
      // Preserve form data on server error too
      name: name || '',
      breed: breed || '',
      age: age || '',
      species: species || '',
      gender: gender || '',
      weight: weight || '',
      otherSpecies: otherSpecies || ''
    });
  }
});

// PUT /pets/:petId - Update pet
router.put('/:petId', requireAuth, async (req, res) => {
  // console.log('🔧 UPDATE PET REQUEST RECEIVED:', {
  //   petId: req.params.petId,
  //   body: req.body,
  //   userId: req.session.userId
  // });

  try {
    const { name, breed, age, species, gender, weight } = req.body || {};
    const petId = req.params.petId;

    // console.log('📝 Parsed update data:', { name, breed, age, species, gender, weight });

    // Validate provided fields
    if (name !== undefined && !isAlphaText(name, 2, 50)) {
      // console.log('❌ Name validation failed');
      return res.status(400).json({ error: 'Pet name must be 2–50 letters long.' });
    }

    if (species !== undefined && !isAlphaText(species, 2, 30)) {
      // console.log('❌ Species validation failed');
      return res.status(400).json({ error: 'Species must be 2–30 letters long.' });
    }

    if (breed !== undefined && !isAlphaText(breed, 2, 50)) {
      // console.log('❌ Breed validation failed');
      return res.status(400).json({ error: 'Breed must be 2–50 letters long.' });
    }

    if (gender !== undefined && !['male', 'female', 'other'].includes(gender)) {
      // console.log('❌ Gender validation failed');
      return res.status(400).json({ error: 'Please select a valid gender.' });
    }

    // Validate age if provided
    if (age !== undefined) {
      const ageValue = parseFloat(age);
      if (isNaN(ageValue) || ageValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(age.toString())) {
        // console.log('❌ Age validation failed');
        return res.status(400).json({ error: 'Age must be greater than 0 and have at most two decimal places.' });
      }
    }

    // Validate weight if provided
    if (weight !== undefined) {
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(weight.toString())) {
        // console.log('❌ Weight validation failed');
        return res.status(400).json({ error: 'Weight must be greater than 0 and have at most two decimal places.' });
      }
    }

    // Get current pet to merge with updates
    // console.log('🔍 Getting current pet data...');
    const pets = await getPetsByUser(req.session.userId);
    const currentPet = pets.find(p => p.pet_id == petId);

    if (!currentPet) {
      // console.log('❌ Pet not found for user');
      return res.status(404).json({ error: 'Pet not found.' });
    }

    // console.log('📋 Current pet found:', currentPet);

    // Prepare update data - only include fields that are provided
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (breed !== undefined) updateData.breed = breed.trim();
    if (age !== undefined) updateData.age = Math.round(parseFloat(age) * 10) / 10;
    if (species !== undefined) updateData.species = species.trim();
    if (gender !== undefined) updateData.gender = gender;
    if (weight !== undefined) updateData.weight = Math.round(parseFloat(weight) * 10) / 10;

    // console.log('🔄 Update data prepared:', updateData);

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      // console.log('❌ No fields to update');
      return res.status(400).json({ error: 'No fields to update.' });
    }

    // console.log('💾 Calling updatePet function...');
    await updatePet(petId, updateData);
    
    // console.log('✅ Pet updated successfully');
    res.json({ 
      ok: true, 
      message: 'Pet updated successfully',
      updatedFields: Object.keys(updateData)
    });

  } catch (err) {
    // console.error('💥 Update pet error:', err);
    res.status(500).json({ error: 'Error updating pet: ' + err.message });
  }
});

// GET /api/pets/:petId - Get single pet details
router.get('/api/pets/:petId', requireAuth, async (req, res) => {
    try {
        const pets = await getPetsByUser(req.session.userId);
        const pet = pets.find(p => p.pet_id == req.params.petId);
        
        if (!pet) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        res.json(pet);
    } catch (error) {
        // console.error('Get pet error:', error);
        res.status(500).json({ error: 'Error fetching pet' });
    }
});

// GET /api/pets/:petId/tasks - Get tasks for specific pet
router.get('/api/pets/:petId/tasks', requireAuth, async (req, res) => {
    try {
        const tasks = await getTasksByUser(req.session.userId);
        const petTasks = tasks.filter(task => task.pet_id == req.params.petId);
        
        res.json(petTasks);
    } catch (error) {
        // console.error('Get pet tasks error:', error);
        res.status(500).json({ error: 'Error fetching pet tasks' });
    }
});

// DELETE /pets/:petId
router.delete('/:petId', requireAuth, async (req, res) => {
  try {
    await deletePet(req.params.petId);
    res.json({ ok: true, message: 'Pet deleted successfully' });
  } catch (err) {
    // console.error('Delete pet error:', err);
    res.status(500).json({ error: 'Error deleting pet: ' + err.message });
  }
});

module.exports = router;