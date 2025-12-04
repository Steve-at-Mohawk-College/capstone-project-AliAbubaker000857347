const { query } = require('../config/database');

/**
 * Validates pet name format and length.
 * 
 * @param {string} name - Pet name to validate
 * @returns {boolean} True if name is valid (2-50 chars, letters, spaces, apostrophes, hyphens)
 */
function validatePetName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return /^[A-Za-z\s'-]+$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50;
}

/**
 * Validates pet species format and length.
 * 
 * @param {string} species - Pet species to validate
 * @returns {boolean} True if species is valid (2-30 chars, letters and spaces only)
 */
function validatePetSpecies(species) {
    if (!species || typeof species !== 'string') return false;
    const trimmed = species.trim();
    return /^[A-Za-z\s]+$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 30;
}

/**
 * Validates pet breed format and length.
 * 
 * @param {string} breed - Pet breed to validate
 * @returns {boolean} True if breed is valid (2-50 chars)
 */
function validatePetBreed(breed) {
    if (!breed || typeof breed !== 'string') return false;
    const trimmed = breed.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
}

/**
 * Validates pet age range.
 * 
 * @param {number|string} age - Pet age to validate
 * @returns {boolean} True if age is valid (0 < age ≤ 50)
 */
function validatePetAge(age) {
    if (age === undefined || age === null) return false;
    const ageNum = parseFloat(age);
    return !isNaN(ageNum) && ageNum > 0 && ageNum <= 50;
}

/**
 * Validates pet weight range.
 * 
 * @param {number|string} weight - Pet weight to validate
 * @returns {boolean} True if weight is valid (0 < weight ≤ 200)
 */
function validatePetWeight(weight) {
    if (weight === undefined || weight === null) return false;
    const weightNum = parseFloat(weight);
    return !isNaN(weightNum) && weightNum > 0 && weightNum <= 200;
}

/**
 * Validates pet gender selection.
 * 
 * @param {string} gender - Pet gender to validate
 * @returns {boolean} True if gender is valid ('male', 'female', or 'other')
 */
function validatePetGender(gender) {
    return ['male', 'female', 'other'].includes(gender);
}

/**
 * Retrieves all pets belonging to a specific user.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Array>} Array of pet objects
 */
async function getPetsByUser(userId) {
    return query(`SELECT * FROM pets WHERE user_id = ?`, [userId]);
}

/**
 * Creates a new pet with comprehensive validation.
 * All fields are required and validated before insertion.
 * 
 * @param {number} userId - ID of the user creating the pet
 * @param {Object} petData - Pet information
 * @param {string} petData.name - Pet name
 * @param {string} petData.breed - Pet breed
 * @param {number} petData.age - Pet age
 * @param {string} petData.species - Pet species
 * @param {string} petData.gender - Pet gender
 * @param {number} petData.weight - Pet weight
 * @returns {Promise<Object>} Database insert result
 * @throws {Error} If validation fails or required fields are missing
 */
async function createPet(userId, { name, breed, age, species, gender, weight }) {
    if (!validatePetName(name)) {
        throw new Error('Pet name must be 2-50 letters long (letters, spaces, apostrophes, hyphens allowed)');
    }
    
    if (!validatePetSpecies(species)) {
        throw new Error('Species must be 2-30 letters long');
    }
    
    if (!validatePetBreed(breed)) {
        throw new Error('Breed must be 2-50 characters long');
    }
    
    if (!validatePetAge(age)) {
        throw new Error('Age must be greater than 0 and less than or equal to 50');
    }
    
    if (!validatePetWeight(weight)) {
        throw new Error('Weight must be greater than 0 and less than or equal to 200');
    }
    
    if (!validatePetGender(gender)) {
        throw new Error('Please select a valid gender (male, female, other)');
    }

    if (name === undefined || breed === undefined || age === undefined || 
        species === undefined || gender === undefined || weight === undefined) {
        throw new Error('All pet fields are required: name, breed, age, species, gender, weight');
    }

    const sql = `
        INSERT INTO pets (user_id, name, breed, age, species, gender, weight) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const roundedAge = Math.round(parseFloat(age) * 10) / 10;
    const roundedWeight = Math.round(parseFloat(weight) * 10) / 10;
    
    return query(sql, [
        userId, 
        name.trim(), 
        breed.trim(), 
        roundedAge, 
        species.trim(), 
        gender, 
        roundedWeight
    ]);
}

/**
 * Updates an existing pet with partial field validation.
 * Only validates fields that are being updated.
 * 
 * @param {number} petId - ID of the pet to update
 * @param {Object} petData - Fields to update (all optional)
 * @param {string} [petData.name] - Updated pet name
 * @param {string} [petData.breed] - Updated pet breed
 * @param {number} [petData.age] - Updated pet age
 * @param {string} [petData.species] - Updated pet species
 * @param {string} [petData.gender] - Updated pet gender
 * @param {number} [petData.weight] - Updated pet weight
 * @returns {Promise<Object>} Database update result
 * @throws {Error} If validation fails, pet not found, or no fields provided
 */
async function updatePet(petId, { name, breed, age, species, gender, weight }) {
    if (name !== undefined && !validatePetName(name)) {
        throw new Error('Pet name must be 2-50 letters long (letters, spaces, apostrophes, hyphens allowed)');
    }
    
    if (species !== undefined && !validatePetSpecies(species)) {
        throw new Error('Species must be 2-30 letters long');
    }
    
    if (breed !== undefined && !validatePetBreed(breed)) {
        throw new Error('Breed must be 2-50 characters long');
    }
    
    if (age !== undefined && !validatePetAge(age)) {
        throw new Error('Age must be greater than 0 and less than or equal to 50');
    }
    
    if (weight !== undefined && !validatePetWeight(weight)) {
        throw new Error('Weight must be greater than 0 and less than or equal to 200');
    }
    
    if (gender !== undefined && !validatePetGender(gender)) {
        throw new Error('Please select a valid gender (male, female, other)');
    }

    const updates = [];
    const params = [];
    
    if (name !== undefined) {
        updates.push('name = ?');
        params.push(name.trim());
    }
    
    if (breed !== undefined) {
        updates.push('breed = ?');
        params.push(breed.trim());
    }
    
    if (age !== undefined) {
        updates.push('age = ?');
        params.push(Math.round(parseFloat(age) * 10) / 10);
    }
    
    if (species !== undefined) {
        updates.push('species = ?');
        params.push(species.trim());
    }
    
    if (gender !== undefined) {
        updates.push('gender = ?');
        params.push(gender);
    }
    
    if (weight !== undefined) {
        updates.push('weight = ?');
        params.push(Math.round(parseFloat(weight) * 10) / 10);
    }
    
    if (updates.length === 0) {
        throw new Error('No fields provided for update');
    }
    
    params.push(petId);
    
    const sql = `UPDATE pets SET ${updates.join(', ')} WHERE pet_id = ?`;
    
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
        throw new Error('Pet not found or no changes made');
    }
    
    return result;
}

/**
 * Deletes a pet by ID.
 * 
 * @param {number} petId - ID of the pet to delete
 * @returns {Promise<Object>} Database delete result
 * @throws {Error} If pet not found
 */
async function deletePet(petId) {
    const result = await query(`DELETE FROM pets WHERE pet_id = ?`, [petId]);
    
    if (result.affectedRows === 0) {
        throw new Error('Pet not found');
    }
    
    return result;
}

module.exports = { 
    getPetsByUser, 
    createPet, 
    updatePet, 
    deletePet,
    validatePetName,
    validatePetSpecies,
    validatePetBreed,
    validatePetAge,
    validatePetWeight,
    validatePetGender
};