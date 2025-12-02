// utils/timezone.js - SIMPLIFIED VERSION
const moment = require('moment-timezone');

// Set default timezone to EST (Eastern Standard Time)
const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Convert any date to local timezone (EST)
 */
function toLocalTime(date, timezone = DEFAULT_TIMEZONE) {
  if (!date) return null;
  
  const momentDate = moment(date);
  if (!momentDate.isValid()) return null;
  
  return momentDate.tz(timezone).format();
}

/**
 * Convert local datetime to MySQL datetime string (in EST)
 */
function toMySQLDateTime(dateString, timezone = DEFAULT_TIMEZONE) {
  if (!dateString) return null;
  
  const momentDate = moment.tz(dateString, timezone);
  if (!momentDate.isValid()) return null;
  
  // Format for MySQL DATETIME (no timezone conversion needed when storing as string)
  return momentDate.format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format date for datetime-local input (local browser time)
 */
function formatForDateTimeLocal(date) {
  if (!date) return '';
  
  // If date is already a string in EST, parse it as EST first
  const momentDate = moment(date).tz(DEFAULT_TIMEZONE, true);
  
  // Convert to browser's local time for input field
  const localMoment = momentDate.local();
  
  return localMoment.format('YYYY-MM-DDTHH:mm');
}

/**
 * Parse datetime-local input (browser local time) to EST
 */
function parseDateTimeLocalToEST(dateTimeString) {
  if (!dateTimeString) return null;
  
  // Parse as local browser time
  const localMoment = moment(dateTimeString);
  
  // Convert to EST
  const estMoment = localMoment.tz(DEFAULT_TIMEZONE);
  
  return estMoment;
}

/**
 * Get current time in EST
 */
function getCurrentEST() {
  return moment().tz(DEFAULT_TIMEZONE);
}

/**
 * Check if a date is in the future (allowing buffer)
 */
function isFutureDate(dateString, bufferMinutes = 15) {
  if (!dateString) return false;
  
  const inputTime = moment.tz(dateString, DEFAULT_TIMEZONE);
  const nowWithBuffer = moment().tz(DEFAULT_TIMEZONE).subtract(bufferMinutes, 'minutes');
  
  return inputTime.isAfter(nowWithBuffer);
}

/**
 * Convert EST datetime to UTC for display/comparison
 */
function estToUTC(estDateTime) {
  if (!estDateTime) return null;
  
  const momentDate = moment.tz(estDateTime, DEFAULT_TIMEZONE);
  return momentDate.utc().format();
}

module.exports = {
  toLocalTime,
  toMySQLDateTime,
  formatForDateTimeLocal,
  parseDateTimeLocalToEST,
  getCurrentEST,
  isFutureDate,
  estToUTC,
  DEFAULT_TIMEZONE
};