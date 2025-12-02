// fix-database-timezone.js
const mysql = require('mysql2/promise');

async function fixTimezone() {
  // Use the credentials from your .env file
  const connection = await mysql.createConnection({
    host: 'q68u8b2buodpme2n.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'psl0r6gaezmawcjj',
    password: 'l22zxkhqzjksl9a9',
    database: 'hkpifgzax132wnez',
    port: 3306,
    timezone: '-05:00'  // Set to EST
  });
  
  try {
    console.log('✅ Connected to Heroku database');
    
    // Set database timezone to EST
    await connection.execute('SET time_zone = "-05:00"');
    console.log('✅ Timezone set to EST (-05:00)');
    
    // Check current settings
    const [settings] = await connection.execute('SELECT @@session.time_zone as timezone, NOW() as db_time');
    console.log('📊 Database timezone:', settings[0].timezone);
    console.log('📊 Database current time:', settings[0].db_time);
    console.log('📊 Your local time:', new Date().toString());
    
    // Fix existing tasks (convert from UTC to EST if needed)
    console.log('🔄 Fixing existing tasks...');
    const [result] = await connection.execute(`
      UPDATE tasks 
      SET start_time = CONVERT_TZ(start_time, '+00:00', '-05:00'),
          end_time = CONVERT_TZ(end_time, '+00:00', '-05:00'),
          due_date = CONVERT_TZ(due_date, '+00:00', '-05:00')
      WHERE start_time IS NOT NULL
    `);
    
    console.log(`✅ Updated ${result.affectedRows} existing tasks`);
    
    // Show sample of fixed tasks
    const [tasks] = await connection.execute(`
      SELECT 
        task_id, 
        title, 
        DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') as start_time,
        DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') as end_time
      FROM tasks 
      ORDER BY task_id DESC 
      LIMIT 3
    `);
    
    console.log('\n📋 Sample of updated tasks:');
    tasks.forEach(task => {
      console.log(`   • ${task.title}: Start=${task.start_time}, End=${task.end_time}`);
    });
    
    console.log('\n🎉 Database timezone fixed successfully!');
    console.log('\n⚠️  IMPORTANT: Restart your Heroku app for changes to take effect:');
    console.log('   heroku restart -a petwell-a1271a0b47f3');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixTimezone();