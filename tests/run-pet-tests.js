const PetTests = require('./pet-tests');
const TestSummary = require('./test-summary');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function runPetTests() {
    const summary = new TestSummary();
    let testUserId = null;
    
    console.log('🚀 Starting Pet Management Tests\n');
    
    try {
        // Create a test user for pet tests
        const username = `pet_test_user_${Date.now()}`;
        const email = `pet_test_${Date.now()}@example.com`;
        const passwordHash = await bcrypt.hash('TestPass123!', 10);
        
        console.log('📝 Creating test user...');
        
        const userResult = await query(
            'INSERT INTO users (username, email, password_hash, verification_token, is_verified) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, 'pet_test_token', 1]
        );
        
        testUserId = userResult.insertId;
        console.log(`✅ Created test user with ID: ${testUserId}`);
        
        // Run pet tests
        const tests = new PetTests(summary, testUserId);
        await tests.runAllTests();
        await tests.cleanup();
        
    } catch (error) {
        console.error('❌ Pet test setup failed:', error);
        summary.addResult('Test Setup', 'FAIL', error.message);
    } finally {
        // Cleanup test user
        if (testUserId) {
            try {
                await query('DELETE FROM users WHERE user_id = ?', [testUserId]);
                console.log('✅ Cleaned up test user');
            } catch (cleanupError) {
                console.log('⚠️  Cleanup warning:', cleanupError.message);
            }
        }
    }
    
    summary.printResults();
    return summary.hasFailures() ? 1 : 0;
}

// Run if called directly
if (require.main === module) {
    runPetTests().then(code => {
        process.exit(code);
    });
}

module.exports = runPetTests;