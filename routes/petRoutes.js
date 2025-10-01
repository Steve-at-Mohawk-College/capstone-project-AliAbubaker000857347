const express = require('express');
const { getPetsByUser, createPet, updatePet, deletePet } = require('../models/petModel');

const router = express.Router();

// Middleware: require authentication
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// Utility: validate text fields (letters, spaces, apostrophes, hyphens)
function isAlphaText(value, min, max) {
  return typeof value === 'string' &&
         /^[A-Za-z\s'-]+$/.test(value.trim()) &&
         value.trim().length >= min &&
         value.trim().length <= max;
}

// POST /pets - Add a new pet
router.post('/', requireAuth, async (req, res) => {
  const { name, breed, age, species, gender, weight } = req.body || {};

  // Validate name
  if (!isAlphaText(name, 2, 50)) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Pet name must be 2–50 letters long (letters, spaces, apostrophes, hyphens allowed).'
    });
  }

  // Validate species
  if (!isAlphaText(species, 2, 30)) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Species must be 2–30 letters long.'
    });
  }

  // Validate breed
  if (!isAlphaText(breed, 2, 50)) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Breed must be 2–50 letters long.'
    });
  }

  // Validate gender
  if (!['male', 'female', 'other'].includes(gender)) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Please select a valid gender.'
    });
  }

  // Validate age
  const ageValue = parseFloat(age);
  if (isNaN(ageValue) || ageValue <= 0 || !/^\d+(\.\d{1})?$/.test(age.toString())) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Age must be greater than 0 and have at most one decimal place (e.g., 0.5, 2.0).'
    });
  }

  // Validate weight
  const weightValue = parseFloat(weight);
  if (isNaN(weightValue) || weightValue <= 0) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet',
      error: 'Weight must be greater than 0.'
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
      species: species.trim(),
      gender,
      weight: roundedWeight
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Add pet error:', err);
    res.status(500).render('add-pet', {
      title: 'Add New Pet',
      error: 'Error adding pet. Please try again.'
    });
  }
});

// PUT /pets/:petId - Update pet
router.put('/:petId', requireAuth, async (req, res) => {
  try {
    const { age, weight } = req.body || {};
    const petId = req.params.petId;

    // Validate age if provided
    if (age !== undefined) {
      const ageValue = parseFloat(age);
      if (isNaN(ageValue) || ageValue <= 0) {
        return res.status(400).json({ error: 'Age must be greater than 0.' });
      }
    }

    // Validate weight if provided
    if (weight !== undefined) {
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        return res.status(400).json({ error: 'Weight must be greater than 0.' });
      }
    }

    // Get current pet
    const pets = await getPetsByUser(req.session.userId);
    const currentPet = pets.find(p => p.pet_id == petId);

    if (!currentPet) {
      return res.status(404).json({ error: 'Pet not found.' });
    }

    // Merge updates
    const updateData = {
      name: currentPet.name,
      breed: currentPet.breed,
      age: age !== undefined ? Math.round(parseFloat(age) * 10) / 10 : currentPet.age,
      species: currentPet.species,
      gender: currentPet.gender,
      weight: weight !== undefined ? Math.round(parseFloat(weight) * 10) / 10 : currentPet.weight
    };

    await updatePet(petId, updateData);
    res.json({ ok: true });

  } catch (err) {
    console.error('Update pet error:', err);
    res.status(500).json({ error: 'Error updating pet.' });
  }
});

// DELETE /pets/:petId
router.delete('/:petId', requireAuth, async (req, res) => {
  try {
    await deletePet(req.params.petId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete pet error:', err);
    res.status(500).json({ error: 'Error deleting pet.' });
  }
});

module.exports = router;
