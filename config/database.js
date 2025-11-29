const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {};

// Common configuration
const commonConfig = {
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 10,
  charset: 'utf8mb4',
  timezone: '-05:00', // EXPLICITLY SET TO EST
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: ['DATETIME'], // Return datetime as strings to avoid timezone conversion
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
  // console.log('✅ Using JawsDB connection with FORCED EST timezone');
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
  // console.log('✅ Using local MySQL connection with FORCED EST timezone');
}

const pool = mysql.createPool(dbConfig);

// SIMPLIFIED connection monitoring
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

// FIXED: Test connection with SIMPLIFIED timezone verification
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Force timezone for this test connection
    await connection.execute(`SET time_zone = '-05:00'`);
    
    console.log('✅ Connected to MySQL database successfully');
    
    // FIXED: Use simpler SQL query without problematic functions
    const [result] = await connection.execute(
      'SELECT @@session.time_zone as timezone, NOW() as db_time, CURTIME() as db_time_only'
    );
    
    // console.log('🔍 Database session timezone:', result[0].timezone);
    // console.log('🔍 Database current time:', result[0].db_time);
    // console.log('🔍 Database time only:', result[0].db_time_only);
    // console.log('🔍 Node.js local time:', new Date().toString());
    // console.log('🔍 Node.js local time ISO:', new Date().toISOString());
    
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

// ENHANCED query function with timezone enforcement and better date handling
async function query(sql, params = []) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Ensure timezone is set for this connection
    await connection.execute(`SET time_zone = '-05:00'`);
    
    // console.log('📝 Executing SQL:', sql);
    // console.log('📝 With params:', params);
    
    // Enhanced parameter processing - handle dates properly in LOCAL time
    const processedParams = params.map(param => {
      if (param === null || param === undefined) {
        return null;
      }
      if (param instanceof Date) {
        // Format as MySQL datetime string in LOCAL time (EST)
        const year = param.getFullYear();
        const month = String(param.getMonth() + 1).padStart(2, '0');
        const day = String(param.getDate()).padStart(2, '0');
        const hours = String(param.getHours()).padStart(2, '0');
        const minutes = String(param.getMinutes()).padStart(2, '0');
        const seconds = String(param.getSeconds()).padStart(2, '0');
        
        const mysqlDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        // console.log('📅 Date conversion:', {
        //   original: param.toString(),
        //   toMySQL: mysqlDateTime
        // });
        
        return mysqlDateTime;
      }
      return param;
    });
    
    // console.log('📝 Processed params:', processedParams);
    
    const [rows] = await connection.execute(sql, processedParams);
    
    // Log results for debugging
    if (rows && rows.length > 0) {
      // console.log(`✅ Query returned ${rows.length} rows`);
      if (rows[0].due_date) {
        // console.log('📅 Sample due_date in result:', rows[0].due_date);
      }
    }
    
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

// Query paginated function
async function queryPaginated(sql, params = [], limit = 5, offset = 0) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Force timezone
    await connection.execute(`SET time_zone = '-05:00'`);
    
    const numLimit = parseInt(limit);
    const numOffset = parseInt(offset);
    
    // console.log('🔢 Pagination query:', {
    //   sql,
    //   params,
    //   limit: numLimit,
    //   offset: numOffset
    // });
    
    const paginatedSQL = `${sql} LIMIT ${numLimit} OFFSET ${numOffset}`;
    
    // console.log('📋 Final SQL:', paginatedSQL);
    
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

// Query one helper
async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Close pool function
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