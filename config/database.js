const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {};

const commonConfig = {
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 10,
  charset: 'utf8mb4',
  timezone: '-05:00',
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: ['DATETIME'],
  supportBigNumbers: true,
  bigNumberStrings: true
};

if (process.env.JAWSDB_URL) {
  const url = new URL(process.env.JAWSDB_URL);
  dbConfig = {
    ...commonConfig,
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    port: url.port || 3306,
  };
} else {
  dbConfig = {
    ...commonConfig,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    connectTimeout: 60000,
  };
}

const pool = mysql.createPool(dbConfig);

pool.on('acquire', (connection) => {
  // console.log(`✅ Connection ${connection.threadId} acquired`);
});

pool.on('release', (connection) => {
  // console.log(`🔌 Connection ${connection.threadId} released`);
});

pool.on('enqueue', () => {
  // console.log('⏳ Waiting for available connection slot');
});

pool.on('error', (err) => {
  // console.error('💥 Database pool error:', err);
});

/**
 * Tests the database connection and verifies timezone configuration.
 * Enforces EST timezone (-05:00) for the test session and checks database time.
 * 
 * @returns {Promise<boolean>} True if connection is successful, false otherwise
 */
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(`SET time_zone = '-05:00'`);
    const [result] = await connection.execute(
      'SELECT @@session.time_zone as timezone, NOW() as db_time, CURTIME() as db_time_only'
    );
    return true;
  } catch (error) {
    // console.error('❌ Database connection failed:', error.message);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Executes a SQL query with parameterized inputs and enforces EST timezone.
 * Automatically converts JavaScript Date objects to MySQL datetime strings.
 * 
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters (optional, defaults to empty array)
 * @returns {Promise<Array>} Query results as an array of rows
 * @throws {Error} If the query execution fails
 */
async function query(sql, params = []) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(`SET time_zone = '-05:00'`);
    const processedParams = params.map(param => {
      if (param === null || param === undefined) {
        return null;
      }
      if (param instanceof Date) {
        const year = param.getFullYear();
        const month = String(param.getMonth() + 1).padStart(2, '0');
        const day = String(param.getDate()).padStart(2, '0');
        const hours = String(param.getHours()).padStart(2, '0');
        const minutes = String(param.getMinutes()).padStart(2, '0');
        const seconds = String(param.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      return param;
    });
    const [rows] = await connection.execute(sql, processedParams);
    return rows;
  } catch (error) {
    // console.error('❌ Database query error:', error);
    // console.error('❌ Failed SQL:', sql);
    // console.error('❌ Failed params:', params);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Executes a paginated SQL query with offset-based pagination.
 * Enforces EST timezone and automatically limits results.
 * 
 * @param {string} sql - SQL query string (without LIMIT/OFFSET)
 * @param {Array} params - Query parameters (optional, defaults to empty array)
 * @param {number} limit - Maximum number of rows to return (default: 5)
 * @param {number} offset - Number of rows to skip (default: 0)
 * @returns {Promise<Array>} Paginated query results
 * @throws {Error} If the query execution fails
 */
async function queryPaginated(sql, params = [], limit = 5, offset = 0) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(`SET time_zone = '-05:00'`);
    const numLimit = parseInt(limit);
    const numOffset = parseInt(offset);
    const paginatedSQL = `${sql} LIMIT ${numLimit} OFFSET ${numOffset}`;
    const [rows] = await connection.execute(paginatedSQL, params);
    return rows;
  } catch (error) {
    // console.error('❌ Pagination query error:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Executes a SQL query and returns only the first result.
 * Convenience wrapper around query() for single-row queries.
 * 
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters (optional)
 * @returns {Promise<Object|null>} First row of results or null if no results
 */
async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Gracefully closes the database connection pool.
 * Should be called during application shutdown.
 * 
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool && pool.end) {
    await pool.end();
    // console.log('✅ Database pool closed');
  }
}

module.exports = {
  pool,
  testConnection,
  query,
  queryPaginated,
  queryOne,
  closePool
};