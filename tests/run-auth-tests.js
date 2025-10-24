const AuthTests = require('./auth-tests');
const TestSummary = require('./test-summary');
const database = require('../config/database');

async function runAuthTests() {
    console.log('🚀 Starting Authentication Tests...\n');
    
    const summary = new TestSummary();
    const authTests = new AuthTests(summary);

    try {
        await authTests.runAllTests();
        console.log('\n✅ All authentication tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Authentication tests failed:', error);
        process.exit(1);
    } finally {
        // Ensure cleanup happens
        await authTests.cleanup().catch(err => {
            console.log('Cleanup warning:', err.message);
        });
        
        // Close database connection to allow process to exit
        if (database.pool) {
            await database.pool.end();
            console.log('Database connection closed');
        }
        
        // Force process exit after a short delay
        setTimeout(() => {
            console.log('Test process completed');
            process.exit(0);
        }, 1000);
    }
}

// Run if called directly
if (require.main === module) {
    runAuthTests();
}

module.exports = runAuthTests;