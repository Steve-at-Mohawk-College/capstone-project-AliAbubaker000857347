const express = require('express');
const { getPetsByUser, createPet, updatePet, deletePet } = require('../models/petModel');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// GET /pets
router.get('/', requireAuth, async (req, res) => {
  const pets = await getPetsByUser(req.session.userId);
  res.json(pets);
});
// POST /pets
router.post('/', requireAuth, async (req, res) => {
  const { name, breed, age, species, gender, weight } = req.body || {};
  
  // Validation
  if (!name) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Pet name is required.'
    });
  }

  // Gender validation
  if (!gender || !['male', 'female', 'other'].includes(gender)) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Gender is required and must be selected from the options.'
    });
  }
  
  // Validate age is greater than 0 and has at most one decimal place
  const ageValue = parseFloat(age);
  if (!age || isNaN(ageValue) || ageValue <= 0) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Age must be greater than 0.'
    });
  }

  // Check if age has more than one decimal place
  if (age.toString().includes('.') && age.toString().split('.')[1].length > 1) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Age can only have one decimal place (e.g., 0.5, 1.5).'
    });
  }
  
  // Validate weight if provided
  if (weight && weight < 0) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Weight cannot be negative.'
    });
  }
  
  try {
    // Round to one decimal place to ensure consistency
    const roundedAge = Math.round(ageValue * 10) / 10;
    await createPet(req.session.userId, { name, breed, age: roundedAge, species, gender, weight });
    res.redirect('/dashboard');
  } catch (e) {
    console.error('Add pet error:', e);
    res.status(500).render('add-pet', {
      title: 'Add New Pet',
      error: 'Error adding pet. Please try again.'
    });
  }
});
// PUT /pets/:petId - Update pet details
router.put('/:petId', requireAuth, async (req, res) => {
  try {
    const { age, weight } = req.body || {};
    const petId = req.params.petId;
    
    // Validate age if provided
    if (age !== undefined && age <= 0) {
      return res.status(400).json({ error: 'Age must be greater than 0.' });
    }
    
    // Validate weight if provided
    if (weight !== undefined && weight < 0) {
      return res.status(400).json({ error: 'Weight cannot be negative.' });
    }
    
    // Get current pet data
    const pets = await getPetsByUser(req.session.userId);
    const currentPet = pets.find(p => p.pet_id == petId);
    
    if (!currentPet) {
      return res.status(404).json({ error: 'Pet not found.' });
    }
    
    // Update only the provided fields
    const updateData = {
      name: currentPet.name,
      breed: currentPet.breed,
      age: age !== undefined ? age : currentPet.age,
      species: currentPet.species,
      gender: currentPet.gender,
      weight: weight !== undefined ? weight : currentPet.weight
    };
    
    await updatePet(petId, updateData);
    res.json({ ok: true });
  } catch (e) {
    console.error('Update pet error:', e);
    res.status(500).json({ error: 'Error updating pet.' });
  }
});

// DELETE /pets/:petId
router.delete('/:petId', requireAuth, async (req, res) => {
  try {
    await deletePet(req.params.petId);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete pet error:', e);
    res.status(500).send('Error deleting pet.');
  }
});

module.exports = router;