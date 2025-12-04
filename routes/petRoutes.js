const express = require('express');
const { getPetsByUser, createPet, updatePet, deletePet } = require('../models/petModel');
const { getTasksByUser } = require('../models/taskModel');
const { query } = require('../config/database');
const router = express.Router();
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
 * Validates that a text field contains only letters, spaces, apostrophes, and hyphens,
 * and that its length is within the specified range.
 *
 * @function isAlphaText
 * @param {string} value - The text value to validate
 * @param {number} min - Minimum allowed length
 * @param {number} max - Maximum allowed length
 * @returns {boolean} True if the value is valid, false otherwise
 */
function isAlphaText(value, min, max) {
  return typeof value === 'string' &&
    /^[A-Za-z\s'-]+$/.test(value.trim()) &&
    value.trim().length >= min &&
    value.trim().length <= max;
}

/**
 * GET /pets/add
 * Renders the add pet form for authenticated users.
 * Includes user session information for display in the form.
 *
 * @name GET /pets/add
 * @function
 * @memberof module:routes/petRoute
 */
router.get('/add', requireAuth, async (req, res) => {
  try {
    res.render('add-pet', {
      title: 'Add New Pet - Pet Care',
      username: req.session.username,
      profilePicture: req.session.profilePicture
    });
  } catch (error) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading add pet form.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * POST /pets
 * Adds a new pet for the authenticated user with comprehensive validation.
 * Validates all pet fields including name, species, breed, gender, age, and weight.
 * Supports "other" species option with custom text input.
 *
 * @name POST /pets
 * @function
 * @memberof module:routes/petRoute
 * @param {string} req.body.name - Pet's name (2-50 characters, letters, spaces, apostrophes, hyphens)
 * @param {string} req.body.breed - Pet's breed (2-50 characters)
 * @param {number} req.body.age - Pet's age in years (positive number with up to 2 decimal places)
 * @param {string} req.body.species - Pet's species (2-30 characters or "other")
 * @param {string} req.body.gender - Pet's gender ("male", "female", or "other")
 * @param {number} req.body.weight - Pet's weight (positive number with up to 2 decimal places)
 * @param {string} [req.body.otherSpecies] - Custom species if species is "other"
 */
router.post('/', requireAuth, async (req, res) => {
  const { name, breed, age, species, gender, weight, otherSpecies } = req.body || {};
  const fieldErrors = {};
  let hasErrors = false;
  const finalSpecies = species === 'other' ? otherSpecies : species;
  if (!name || !isAlphaText(name, 2, 50)) {
    fieldErrors.name = 'Pet name must be 2–50 letters long (letters, spaces, apostrophes, hyphens allowed).';
    hasErrors = true;
  }
  if (!finalSpecies || !isAlphaText(finalSpecies, 2, 30)) {
    fieldErrors.species = 'Species must be 2–30 letters long.';
    hasErrors = true;
  }
  if (!breed || !isAlphaText(breed, 2, 50)) {
    fieldErrors.breed = 'Breed must be 2–50 letters long.';
    hasErrors = true;
  }
  if (!['male', 'female', 'other'].includes(gender)) {
    fieldErrors.gender = 'Please select a valid gender.';
    hasErrors = true;
  }
  const ageValue = parseFloat(age);
  if (isNaN(ageValue) || ageValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(age.toString())) {
    fieldErrors.age = 'Age must be greater than 0 and have at most two decimal places (e.g., 0.5, 2.0, 3.25).';
    hasErrors = true;
  }
  const weightValue = parseFloat(weight);
  if (isNaN(weightValue) || weightValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(weight.toString())) {
    fieldErrors.weight = 'Weight must be greater than 0 and have at most two decimal places.';
    hasErrors = true;
  }
  if (hasErrors) {
    return res.status(400).render('add-pet', {
      title: 'Add New Pet - Pet Care',
      error: 'Please correct the errors below.',
      fieldErrors,
      username: req.session.username,
      profilePicture: req.session.profilePicture,
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

    res.status(500).render('add-pet', {
      title: 'Add New Pet - Pet Care',
      error: 'Error adding pet. Please try again.',
      username: req.session.username,
      profilePicture: req.session.profilePicture,
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

/**
 * PUT /pets/:petId
 * Updates an existing pet's information.
 * Allows partial updates - only validates fields that are provided.
 * Returns detailed error messages for validation failures.
 *
 * @name PUT /pets/:petId
 * @function
 * @memberof module:routes/petRoute
 * @param {string} req.params.petId - ID of the pet to update
 * @param {Object} req.body - Partial or complete pet data to update
 * @param {string} [req.body.name] - Updated pet name
 * @param {string} [req.body.breed] - Updated pet breed
 * @param {number} [req.body.age] - Updated pet age
 * @param {string} [req.body.species] - Updated pet species
 * @param {string} [req.body.gender] - Updated pet gender
 * @param {number} [req.body.weight] - Updated pet weight
 */
router.put('/:petId', requireAuth, async (req, res) => {

  try {
    const { name, breed, age, species, gender, weight } = req.body || {};
    const petId = req.params.petId;
    if (name !== undefined && !isAlphaText(name, 2, 50)) {
      return res.status(400).json({ error: 'Pet name must be 2–50 letters long.' });
    }

    if (species !== undefined && !isAlphaText(species, 2, 30)) {
      return res.status(400).json({ error: 'Species must be 2–30 letters long.' });
    }
    if (breed !== undefined && !isAlphaText(breed, 2, 50)) {
      return res.status(400).json({ error: 'Breed must be 2–50 letters long.' });
    }
    if (gender !== undefined && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ error: 'Please select a valid gender.' });
    }
    if (age !== undefined) {
      const ageValue = parseFloat(age);
      if (isNaN(ageValue) || ageValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(age.toString())) {

        return res.status(400).json({ error: 'Age must be greater than 0 and have at most two decimal places.' });
      }
    }
    if (weight !== undefined) {
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0 || !/^\d+(\.\d{1,2})?$/.test(weight.toString())) {

        return res.status(400).json({ error: 'Weight must be greater than 0 and have at most two decimal places.' });
      }
    }

    const pets = await getPetsByUser(req.session.userId);
    const currentPet = pets.find(p => p.pet_id == petId);
    if (!currentPet) {

      return res.status(404).json({ error: 'Pet not found.' });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (breed !== undefined) updateData.breed = breed.trim();
    if (age !== undefined) updateData.age = Math.round(parseFloat(age) * 10) / 10;
    if (species !== undefined) updateData.species = species.trim();
    if (gender !== undefined) updateData.gender = gender;
    if (weight !== undefined) updateData.weight = Math.round(parseFloat(weight) * 10) / 10;
    if (Object.keys(updateData).length === 0) {

      return res.status(400).json({ error: 'No fields to update.' });
    }


    await updatePet(petId, updateData);


    res.json({
      ok: true,
      message: 'Pet updated successfully',
      updatedFields: Object.keys(updateData)
    });

  } catch (err) {

    res.status(500).json({ error: 'Error updating pet: ' + err.message });
  }
});

/**
 * GET /api/pets/:petId
 * Retrieves detailed information about a specific pet.
 * Verifies that the pet belongs to the authenticated user.
 *
 * @name GET /api/pets/:petId
 * @function
 * @memberof module:routes/petRoute
 * @param {string} req.params.petId - ID of the pet to retrieve
 * @returns {Object} Pet object with all details
 */
router.get('/api/pets/:petId', requireAuth, async (req, res) => {
  try {
    const pets = await getPetsByUser(req.session.userId);
    const pet = pets.find(p => p.pet_id == req.params.petId);

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    res.json(pet);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching pet' });
  }
});

/**
 * GET /api/pets/:petId/tasks
 * Retrieves all tasks associated with a specific pet.
 * Only returns tasks for pets that belong to the authenticated user.
 *
 * @name GET /api/pets/:petId/tasks
 * @function
 * @memberof module:routes/petRoute
 * @param {string} req.params.petId - ID of the pet whose tasks to retrieve
 * @returns {Array} Array of task objects for the specified pet
 */
router.get('/api/pets/:petId/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await getTasksByUser(req.session.userId);
    const petTasks = tasks.filter(task => task.pet_id == req.params.petId);

    res.json(petTasks);
  } catch (error) {

    res.status(500).json({ error: 'Error fetching pet tasks' });
  }
});

/**
 * DELETE /pets/:petId
 * Deletes a specific pet and all associated data.
 * Only allows deletion of pets that belong to the authenticated user.
 *
 * @name DELETE /pets/:petId
 * @function
 * @memberof module:routes/petRoute
 * @param {string} req.params.petId - ID of the pet to delete
 * @returns {Object} Success confirmation object
 */
router.delete('/:petId', requireAuth, async (req, res) => {
  try {
    await deletePet(req.params.petId);
    res.json({ ok: true, message: 'Pet deleted successfully' });
  } catch (err) {

    res.status(500).json({ error: 'Error deleting pet: ' + err.message });
  }
});

module.exports = router;