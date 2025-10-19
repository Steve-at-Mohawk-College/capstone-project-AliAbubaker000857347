// In your config/database.js - REPLACE the entire file with this:

const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {};

if (process.env.JAWSDB_URL) {
  const url = new URL(process.env.JAWSDB_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    port: url.port || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 10000,
    timeout: 60000,
    decimalNumbers: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    // Add this to fix parameter issues
    typeCast: function (field, next) {
      if (field.type === 'TINY' && field.length === 1) {
        return field.string() === '1';
      }
      return next();
    }
  };
  console.log('✅ Using JawsDB connection on Heroku');
} else {
  dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    decimalNumbers: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    typeCast: function (field, next) {
      if (field.type === 'TINY' && field.length === 1) {
        return field.string() === '1';
      }
      return next();
    }
  };
  console.log('✅ Using local MySQL connection');
}

const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// SIMPLE query function - NO complex parameter processing
async function query(sql, params = []) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Executing SQL:', sql);
    console.log('With params:', params);
    
    // Simple parameter processing - just handle null/undefined
    const processedParams = params.map(param => {
      if (param === null || param === undefined) {
        return null;
      }
      return param;
    });
    
    console.log('Processed params:', processedParams);
    
    const [rows] = await connection.execute(sql, processedParams);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Failed SQL:', sql);
    console.error('Failed params:', params);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// NEW: Direct pagination query that uses template literals (bypasses parameter binding)
async function queryPaginated(sql, params = [], limit = 5, offset = 0) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Convert limit and offset to numbers
    const numLimit = parseInt(limit);
    const numOffset = parseInt(offset);
    
    console.log('🔢 Pagination query:', {
      sql,
      params,
      limit: numLimit,
      offset: numOffset
    });
    
    // Build the paginated SQL with direct values (bypass parameter binding for LIMIT/OFFSET)
    const paginatedSQL = `${sql} LIMIT ${numLimit} OFFSET ${numOffset}`;
    
    console.log('📋 Final SQL:', paginatedSQL);
    
    const [rows] = await connection.execute(paginatedSQL, params);
    return rows;
  } catch (error) {
    console.error('Pagination query error:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Query one helper
async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Close pool function
async function closePool() {
  if (pool && pool.end) {
    await pool.end();
    console.log('✅ Database pool closed');
  }
}

// Connection monitoring (optional)
if (process.env.NODE_ENV === 'development') {
  pool.on('acquire', (connection) => {
    console.log('Connection %d acquired', connection.threadId);
  });

  pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
  });

  pool.on('enqueue', () => {
    console.log('Waiting for available connection slot');
  });
}

module.exports = {
  pool,
  testConnection,
  query,
  queryPaginated, // Export the new function
  queryOne,
  closePool
};