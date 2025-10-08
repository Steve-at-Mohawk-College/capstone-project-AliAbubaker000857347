const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {};

if (process.env.JAWSDB_URL) {
  // Parse JAWSDB connection string
  const url = new URL(process.env.JAWSDB_URL);

  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    port: url.port || 3306,
    waitForConnections: true,
    connectionLimit: 5, // REDUCED from 10 to 5
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 10000,
    timeout: 60000
  };

  console.log('✅ Using JawsDB connection on Heroku');
} else {
  // Fallback for local development
  dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5, // REDUCED from 10 to 5
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    // acquireTimeout: 10000,
    // timeout: 60000
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
      connection.release(); // IMPORTANT: Always release connections
    }
  }
}

// Add this function to close the pool
async function closePool() {
  if (pool && pool.end) {
    await pool.end();
    console.log('✅ Database pool closed');
  }
}

module.exports = { query, testConnection, pool, closePool };

// Query helpers with proper connection management
async function query(sql, params) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release(); // CRITICAL: Release connection back to pool
    }
  }
}


async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Add connection monitoring
pool.on('acquire', (connection) => {
  console.log('Connection %d acquired', connection.threadId);
});

pool.on('release', (connection) => {
  console.log('Connection %d released', connection.threadId);
});

pool.on('enqueue', () => {
  console.log('Waiting for available connection slot');
});

module.exports = {
  pool,
  testConnection,
  query,
  queryOne
};