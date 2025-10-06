const { query } = require('../config/database');

// Validation functions
function validatePetName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return /^[A-Za-z\s'-]+$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50;
}

function validatePetSpecies(species) {
    if (!species || typeof species !== 'string') return false;
    const trimmed = species.trim();
    return /^[A-Za-z\s]+$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 30;
}

function validatePetBreed(breed) {
    if (!breed || typeof breed !== 'string') return false;
    const trimmed = breed.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
}

function validatePetAge(age) {
    if (age === undefined || age === null) return false;
    const ageNum = parseFloat(age);
    return !isNaN(ageNum) && ageNum > 0 && ageNum <= 50;
}

function validatePetWeight(weight) {
    if (weight === undefined || weight === null) return false;
    const weightNum = parseFloat(weight);
    return !isNaN(weightNum) && weightNum > 0 && weightNum <= 200;
}

function validatePetGender(gender) {
    return ['male', 'female', 'other'].includes(gender);
}

async function getPetsByUser(userId) {
    return query(`SELECT * FROM pets WHERE user_id = ?`, [userId]);
}

async function createPet(userId, { name, breed, age, species, gender, weight }) {
    // Validate all required fields
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

    // Ensure all required fields are provided (not undefined)
    if (name === undefined || breed === undefined || age === undefined || 
        species === undefined || gender === undefined || weight === undefined) {
        throw new Error('All pet fields are required: name, breed, age, species, gender, weight');
    }

    const sql = `
        INSERT INTO pets (user_id, name, breed, age, species, gender, weight) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Round to one decimal place for consistency
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

async function updatePet(petId, { name, breed, age, species, gender, weight }) {
    // Validate provided fields (only validate fields that are being updated)
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

    // Handle undefined values by converting them to null for SQL
    const safeName = name !== undefined ? name.trim() : null;
    const safeBreed = breed !== undefined ? breed.trim() : null;
    const safeAge = age !== undefined ? Math.round(parseFloat(age) * 10) / 10 : null;
    const safeSpecies = species !== undefined ? species.trim() : null;
    const safeGender = gender !== undefined ? gender : null;
    const safeWeight = weight !== undefined ? Math.round(parseFloat(weight) * 10) / 10 : null;
    
    const sql = `
        UPDATE pets SET name=?, breed=?, age=?, species=?, gender=?, weight=? 
        WHERE pet_id=?
    `;
    
    const result = await query(sql, [safeName, safeBreed, safeAge, safeSpecies, safeGender, safeWeight, petId]);
    
    // Check if any rows were affected (pet exists)
    if (result.affectedRows === 0) {
        throw new Error('Pet not found or no changes made');
    }
    
    return result;
}

async function deletePet(petId) {
    const result = await query(`DELETE FROM pets WHERE pet_id = ?`, [petId]);
    
    // Check if any rows were affected (pet exists)
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
    // Export validation functions for testing
    validatePetName,
    validatePetSpecies,
    validatePetBreed,
    validatePetAge,
    validatePetWeight,
    validatePetGender
};