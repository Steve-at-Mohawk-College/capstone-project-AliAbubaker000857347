class TestSummary {
    constructor() {
        this.results = [];
        this.startTime = null;
        this.endTime = null;
    }

    startTestSuite() {
        this.startTime = new Date();
        console.log('🚀 STARTING TEST SUITE');
        console.log('='.repeat(50));
    }

    addResult(testCase, status, details) {
        this.results.push({
            testCase,
            status,
            details,
            timestamp: new Date()
        });
    }

    generateSummary() {
        this.endTime = new Date();
        const duration = this.endTime - this.startTime;
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;

        console.log('\n' + '='.repeat(50));
        console.log('📊 FINAL TEST SUMMARY');
        console.log('='.repeat(50));
        
        // Group results by test type
        const authTests = this.results.filter(r => r.testCase.includes('User'));
        const petTests = this.results.filter(r => r.testCase.includes('Pet'));

        if (authTests.length > 0) {
            console.log('\n🔐 AUTHENTICATION RESULTS:');
            authTests.forEach((result, index) => {
                const icon = result.status === 'PASS' ? '✅' : '❌';
                console.log(`  ${icon} ${result.testCase}`);
                if (result.status === 'PASS' && typeof result.details === 'object') {
                    console.log(`     User ID: ${result.details.userId}, Username: ${result.details.username}`);
                } else if (result.status === 'FAIL') {
                    console.log(`     Error: ${result.details}`);
                }
            });
        }

        if (petTests.length > 0) {
            console.log('\n🐾 PET CRUD RESULTS:');
            petTests.forEach((result, index) => {
                const icon = result.status === 'PASS' ? '✅' : '❌';
                console.log(`  ${icon} ${result.testCase}`);
                if (result.status === 'PASS' && typeof result.details === 'object') {
                    if (result.details.petId) {
                        console.log(`     Pet ID: ${result.details.petId}, Name: ${result.details.name}`);
                    }
                    if (result.details.changes) {
                        console.log(`     Changes applied:`, result.details.changes);
                    }
                } else if (result.status === 'FAIL') {
                    console.log(`     Error: ${result.details}`);
                }
            });
        }

        console.log('\n' + '='.repeat(50));
        console.log(`📈 SUMMARY: ${passed} passed, ${failed} failed, ${total} total`);
        console.log(`⏱️  DURATION: ${duration}ms`);
        console.log(`🎯 STATUS: ${failed === 0 ? 'ALL TESTS PASSED 🎉' : 'SOME TESTS FAILED ⚠️'}`);
        console.log('='.repeat(50));

        return {
            passed,
            failed,
            total,
            duration,
            allPassed: failed === 0
        };
    }

    getResults() {
        return this.results;
    }
}

module.exports = TestSummary;