const { testConnection } = require('./config/database');

async function test() {
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Database connection successful!');
    process.exit(0);
  } else {
    console.log('❌ Database connection failed!');
    process.exit(1);
  }
}

test();