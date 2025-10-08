const TestSummary = require('./test-summary');
const AuthTests = require('./auth-tests');
const PetTests = require('./pet-tests');

class TestRunner {
    constructor() {
        this.testSummary = new TestSummary();
        this.authTests = new AuthTests(this.testSummary);
        this.petTests = null;
    }

    async runAllTests() {
        try {
            this.testSummary.startTestSuite();

            // Run authentication tests first to get a valid user
            console.log('\n RUNNING AUTHENTICATION TESTS');
            console.log('='.repeat(40));
            await this.authTests.runAllTests();
            
            // Create pet tests with the user ID from auth tests
            if (this.authTests.testUser) {
                console.log('\n🐾 RUNNING PET CRUD TESTS');
                console.log('='.repeat(40));
                this.petTests = new PetTests(this.testSummary, this.authTests.testUser.user_id);
                await this.petTests.runAllTests();
            } else {
                console.log('\n  Skipping pet tests - no user created in auth tests');
                this.testSummary.addResult('Pet Tests', 'SKIP', 'No user available from auth tests');
            }

            // Generate final summary
            const summary = this.testSummary.generateSummary();

            // Cleanup test data
            await this.cleanup();

            return summary;

        } catch (error) {
            console.error('Fail Test runner error:', error);
            await this.cleanup();
            process.exit(1);
        }
    }

    async cleanup() {
        console.log('\n Cleaning up test data...');
        await this.authTests.cleanup();
        if (this.petTests) {
            await this.petTests.cleanup();
        }
    }
}

// If this file is run directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().then(summary => {
        process.exit(summary.allPassed ? 0 : 1);
    });
}

module.exports = TestRunner;