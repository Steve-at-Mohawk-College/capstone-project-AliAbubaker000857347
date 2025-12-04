const moment = require('moment-timezone');
const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Converts any date to the specified timezone, defaulting to EST.
 * 
 * @function toLocalTime
 * @param {Date|string} date - The date to convert
 * @param {string} [timezone=DEFAULT_TIMEZONE] - Target timezone
 * @returns {string|null} ISO formatted date string in target timezone
 */
function toLocalTime(date, timezone = DEFAULT_TIMEZONE) {
  if (!date) return null;
  const momentDate = moment(date);
  if (!momentDate.isValid()) return null;
  return momentDate.tz(timezone).format();
}

/**
 * Converts a local datetime string to MySQL DATETIME format in EST.
 * 
 * @function toMySQLDateTime
 * @param {string} dateString - Date string to convert
 * @param {string} [timezone=DEFAULT_TIMEZONE] - Source timezone
 * @returns {string|null} MySQL DATETIME formatted string (YYYY-MM-DD HH:mm:ss)
 */
function toMySQLDateTime(dateString, timezone = DEFAULT_TIMEZONE) {
  if (!dateString) return null;
  const momentDate = moment.tz(dateString, timezone);
  if (!momentDate.isValid()) return null;
  return momentDate.format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Formats a date for datetime-local HTML input in browser's local time.
 * 
 * @function formatForDateTimeLocal
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted string (YYYY-MM-DDTHH:mm)
 */
function formatForDateTimeLocal(date) {
  if (!date) return '';
  const momentDate = moment(date).tz(DEFAULT_TIMEZONE, true);
  const localMoment = momentDate.local();
  return localMoment.format('YYYY-MM-DDTHH:mm');
}

/**
 * Parses a datetime-local string (browser local time) to EST moment object.
 * 
 * @function parseDateTimeLocalToEST
 * @param {string} dateTimeString - datetime-local input string
 * @returns {Object|null} Moment.js object in EST timezone
 */
function parseDateTimeLocalToEST(dateTimeString) {
  if (!dateTimeString) return null;
  const localMoment = moment(dateTimeString);
  const estMoment = localMoment.tz(DEFAULT_TIMEZONE);
  return estMoment;
}

/**
 * Gets the current time as a moment.js object in EST.
 * 
 * @function getCurrentEST
 * @returns {Object} Current moment in EST timezone
 */
function getCurrentEST() {
  return moment().tz(DEFAULT_TIMEZONE);
}

/**
 * Checks if a date string (in EST) is in the future with optional buffer.
 * 
 * @function isFutureDate
 * @param {string} dateString - Date string in EST
 * @param {number} [bufferMinutes=15] - Buffer time in minutes
 * @returns {boolean} True if date is after current time minus buffer
 */
function isFutureDate(dateString, bufferMinutes = 15) {
  if (!dateString) return false;
  const inputTime = moment.tz(dateString, DEFAULT_TIMEZONE);
  const nowWithBuffer = moment().tz(DEFAULT_TIMEZONE).subtract(bufferMinutes, 'minutes');
  return inputTime.isAfter(nowWithBuffer);
}

/**
 * Converts an EST datetime string to UTC ISO format.
 * 
 * @function estToUTC
 * @param {string} estDateTime - Date string in EST
 * @returns {string|null} ISO formatted UTC date string
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