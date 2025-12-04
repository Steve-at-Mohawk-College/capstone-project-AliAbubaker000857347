const { query } = require('../config/database');

/**
 * Validates that weight is between 0.1 and 200 kg.
 * 
 * @param {number|string} weight - Weight value to validate
 * @returns {boolean} True if weight is valid or undefined/null/empty
 */
function validateWeight(weight) {
  if (weight === undefined || weight === null || weight === '') return true;
  const weightNum = parseFloat(weight);
  return !isNaN(weightNum) && weightNum >= 0.1 && weightNum <= 200;
}

/**
 * Validates that a date is not in the future.
 * 
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if date is valid and not in the future
 */
function validateDateRecorded(date) {
  if (!date) return false;
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return !isNaN(dateObj.getTime()) && dateObj <= today;
}

/**
 * Validates that a date is in the future (including today).
 * 
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if date is valid and in the future/today
 */
function validateFutureDate(date) {
  if (!date) return true;
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !isNaN(dateObj.getTime()) && dateObj >= today;
}

/**
 * Validates that a date is in the past (including today).
 * 
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if date is valid and in the past/today
 */
function validatePastDate(date) {
  if (!date) return true;
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return !isNaN(dateObj.getTime()) && dateObj <= today;
}

/**
 * Validates diet notes length (max 255 characters).
 * 
 * @param {string} diet - Diet notes to validate
 * @returns {boolean} True if diet is valid or empty/undefined
 */
function validateDiet(diet) {
  if (!diet || diet.trim() === '') return true;
  const trimmed = diet.trim();
  return trimmed.length <= 255;
}

/**
 * Validates medical notes length (max 1000 characters).
 * 
 * @param {string} notes - Medical notes to validate
 * @returns {boolean} True if notes are valid or empty/undefined
 */
function validateMedicalNotes(notes) {
  if (!notes || notes.trim() === '') return true;
  const trimmed = notes.trim();
  return trimmed.length <= 1000;
}

/**
 * Verifies that a pet exists and belongs to the specified user.
 * 
 * @param {number} petId - ID of the pet
 * @param {number} userId - ID of the user
 * @returns {Promise<boolean>} True if pet exists and belongs to user
 */
function validatePetExists(petId, userId) {
  return query('SELECT pet_id FROM pets WHERE pet_id = ? AND user_id = ?', [petId, userId])
    .then(result => result.length > 0);
}

/**
 * Retrieves all health records for a specific pet, sorted by date (newest first).
 * 
 * @param {number} petId - ID of the pet
 * @returns {Promise<Array>} Array of health record objects
 */
async function getHealthRecords(petId) {
  return query(`SELECT * FROM health_tracker WHERE pet_id=? ORDER BY date_recorded DESC`, [petId]);
}

/**
 * Retrieves a specific health record by its ID.
 * 
 * @param {number} recordId - ID of the health record
 * @returns {Promise<Object|null>} Health record object or null if not found
 */
async function getHealthRecordById(recordId) {
  const records = await query(`SELECT * FROM health_tracker WHERE health_id=?`, [recordId]);
  return records.length > 0 ? records[0] : null;
}

/**
 * Creates a new health record with comprehensive validation.
 * 
 * @param {Object} recordData - Health record data
 * @param {number} recordData.pet_id - ID of the pet
 * @param {number} recordData.weight - Pet weight in kg
 * @param {string} recordData.diet - Diet notes (max 255 chars)
 * @param {string} recordData.medical_notes - Medical notes (max 1000 chars)
 * @param {string} recordData.vet_visit_date - Date of vet visit
 * @param {string} recordData.vaccination_date - Date of vaccination
 * @param {string} recordData.next_vaccination_date - Date of next vaccination
 * @param {string} recordData.date_recorded - Date the record was created
 * @param {number} userId - ID of the user creating the record
 * @returns {Promise<Object>} Database insert result
 * @throws {Error} If validation fails or pet doesn't exist
 */
async function addHealthRecord(recordData, userId) {
  const { pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = recordData;
  
  if (!pet_id || !date_recorded) {
    throw new Error('Pet and record date are required');
  }
  
  const petExists = await validatePetExists(pet_id, userId);
  if (!petExists) {
    throw new Error('Pet not found or does not belong to user');
  }
  
  if (!validateWeight(weight)) {
    throw new Error('Weight must be between 0.1 and 200 kg');
  }
  
  if (!validateDateRecorded(date_recorded)) {
    throw new Error('Record date cannot be in the future');
  }
  
  if (!validateDiet(diet)) {
    throw new Error('Diet notes cannot exceed 255 characters');
  }
  
  if (!validateMedicalNotes(medical_notes)) {
    throw new Error('Medical notes cannot exceed 1000 characters');
  }
  
  if (!validatePastDate(vet_visit_date)) {
    throw new Error('Vet visit date cannot be in the future');
  }
  
  if (!validatePastDate(vaccination_date)) {
    throw new Error('Vaccination date cannot be in the future');
  }
  
  if (!validateFutureDate(next_vaccination_date)) {
    throw new Error('Next vaccination date must be in the future');
  }

  const sql = `
    INSERT INTO health_tracker (pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const cleanData = [
    pet_id,
    weight ? parseFloat(weight).toFixed(2) : null,
    diet ? diet.trim().substring(0, 255) : null,
    medical_notes ? medical_notes.trim().substring(0, 1000) : null,
    vet_visit_date || null,
    vaccination_date || null,
    next_vaccination_date || null,
    date_recorded
  ];
  
  return query(sql, cleanData);
}

/**
 * Updates an existing health record with user ownership validation.
 * 
 * @param {number} recordId - ID of the health record to update
 * @param {Object} recordData - Fields to update
 * @param {number} [recordData.weight] - Updated weight
 * @param {string} [recordData.diet] - Updated diet notes
 * @param {string} [recordData.medical_notes] - Updated medical notes
 * @param {string} [recordData.vet_visit_date] - Updated vet visit date
 * @param {string} [recordData.vaccination_date] - Updated vaccination date
 * @param {string} [recordData.next_vaccination_date] - Updated next vaccination date
 * @param {string} [recordData.date_recorded] - Updated record date
 * @param {number} userId - ID of the user attempting to update
 * @returns {Promise<Object>} Database update result
 * @throws {Error} If validation fails, record not found, or access denied
 */
async function updateHealthRecord(recordId, recordData, userId) {
  const { weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded } = recordData;
  
  const record = await query(`
    SELECT ht.* FROM health_tracker ht
    JOIN pets p ON ht.pet_id = p.pet_id
    WHERE ht.health_id = ? AND p.user_id = ?
  `, [recordId, userId]);
  
  if (record.length === 0) {
    throw new Error('Health record not found or access denied');
  }
  
  if (date_recorded && !validateDateRecorded(date_recorded)) {
    throw new Error('Record date cannot be in the future');
  }
  
  if (!validateWeight(weight)) {
    throw new Error('Weight must be between 0.1 and 200 kg');
  }
  
  const updates = [];
  const params = [];
  
  if (weight !== undefined) {
    updates.push('weight = ?');
    params.push(weight ? parseFloat(weight).toFixed(2) : null);
  }
  
  if (diet !== undefined) {
    updates.push('diet = ?');
    params.push(diet ? diet.trim().substring(0, 255) : null);
  }
  
  if (medical_notes !== undefined) {
    updates.push('medical_notes = ?');
    params.push(medical_notes ? medical_notes.trim().substring(0, 1000) : null);
  }
  
  if (vet_visit_date !== undefined) {
    updates.push('vet_visit_date = ?');
    params.push(vet_visit_date || null);
  }
  
  if (vaccination_date !== undefined) {
    updates.push('vaccination_date = ?');
    params.push(vaccination_date || null);
  }
  
  if (next_vaccination_date !== undefined) {
    updates.push('next_vaccination_date = ?');
    params.push(next_vaccination_date || null);
  }
  
  if (date_recorded !== undefined) {
    updates.push('date_recorded = ?');
    params.push(date_recorded);
  }
  
  if (updates.length === 0) {
    throw new Error('No fields to update');
  }
  
  params.push(recordId);
  
  const sql = `UPDATE health_tracker SET ${updates.join(', ')} WHERE health_id = ?`;
  return query(sql, params);
}

/**
 * Deletes a health record after verifying user ownership.
 * 
 * @param {number} recordId - ID of the health record to delete
 * @param {number} userId - ID of the user attempting to delete
 * @returns {Promise<Object>} Database delete result
 * @throws {Error} If record not found or access denied
 */
async function deleteHealthRecord(recordId, userId) {
  const record = await query(`
    SELECT ht.* FROM health_tracker ht
    JOIN pets p ON ht.pet_id = p.pet_id
    WHERE ht.health_id = ? AND p.user_id = ?
  `, [recordId, userId]);
  
  if (record.length === 0) {
    throw new Error('Health record not found or access denied');
  }
  
  return query('DELETE FROM health_tracker WHERE health_id = ?', [recordId]);
}

module.exports = { 
  getHealthRecords, 
  getHealthRecordById,
  addHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  validateWeight,
  validateDateRecorded,
  validateFutureDate,
  validatePastDate,
  validateDiet,
  validateMedicalNotes
};