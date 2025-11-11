const PetTests = require('../e2e/nodejs/pet-tests');
const TestSummary = require('../helpers/test-summary');

async function runPetTests() {
    const summary = new TestSummary();
    
    console.log('🚀 Starting Pet Management Tests\n');
    
    try {
        // Run pet tests - they should handle their own user creation
        const tests = new PetTests(summary);
        await tests.runAllTests();
        await tests.cleanup();
        
    } catch (error) {
        console.error('❌ Pet tests failed:', error);
        summary.addResult('Pet Tests', 'FAIL', error.message);
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