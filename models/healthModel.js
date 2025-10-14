const { query } = require('../config/database');

async function getHealthRecords(petId) {
  return query(`SELECT * FROM health_tracker WHERE pet_id=? ORDER BY date_recorded DESC`, [petId]);
}

async function getHealthRecordById(recordId) {
  // Use health_id instead of record_id
  const records = await query(`SELECT * FROM health_tracker WHERE health_id=?`, [recordId]);
  return records.length > 0 ? records[0] : null;
}

async function addHealthRecord({ pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded }) {
  const sql = `
    INSERT INTO health_tracker (pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return query(sql, [pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded]);
}

module.exports = { 
  getHealthRecords, 
  getHealthRecordById,
  addHealthRecord 
};