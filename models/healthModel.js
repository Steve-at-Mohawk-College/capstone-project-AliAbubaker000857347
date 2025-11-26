const { query } = require('../config/database');

// Validation functions for health records
function validateWeight(weight) {
  if (weight === undefined || weight === null || weight === '') return true;
  const weightNum = parseFloat(weight);
  return !isNaN(weightNum) && weightNum >= 0.1 && weightNum <= 200;
}

function validateDateRecorded(date) {
  if (!date) return false;
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return !isNaN(dateObj.getTime()) && dateObj <= today;
}

function validateFutureDate(date) {
  if (!date) return true;
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !isNaN(dateObj.getTime()) && dateObj >= today;
}

function validatePastDate(date) {
  if (!date) return true;
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return !isNaN(dateObj.getTime()) && dateObj <= today;
}

function validateDiet(diet) {
  if (!diet || diet.trim() === '') return true;
  const trimmed = diet.trim();
  return trimmed.length <= 255;
}

function validateMedicalNotes(notes) {
  if (!notes || notes.trim() === '') return true;
  const trimmed = notes.trim();
  return trimmed.length <= 1000;
}

function validatePetExists(petId, userId) {
  return query('SELECT pet_id FROM pets WHERE pet_id = ? AND user_id = ?', [petId, userId])
    .then(result => result.length > 0);
}

async function getHealthRecords(petId) {
  return query(`SELECT * FROM health_tracker WHERE pet_id=? ORDER BY date_recorded DESC`, [petId]);
}

async function getHealthRecordById(recordId) {
  const records = await query(`SELECT * FROM health_tracker WHERE health_id=?`, [recordId]);
  return records.length > 0 ? records[0] : null;
}

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