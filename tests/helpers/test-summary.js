// tests/helpers/test-summary.js
class TestSummary {
    constructor() {
        this.results = [];
        this.startTime = null;
        this.suiteName = '';
    }

    startTestSuite(suiteName = 'Test Suite') {
        this.suiteName = suiteName;
        this.startTime = Date.now();
        this.results = [];
        console.log(`\n🧪 Starting ${suiteName}`);
        console.log('='.repeat(50));
    }

    addResult(testName, status, details = '') {
        this.results.push({
            testName,
            status,
            details,
            timestamp: new Date().toISOString()
        });

        const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${statusIcon} ${testName}`);
        
        if (details && typeof details === 'object') {
            console.log('   Details:', details);
        } else if (details) {
            console.log('   Details:', details);
        }
    }

    generateSummary() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;

        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`Suite: ${this.suiteName}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`🎯 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        console.log('='.repeat(50));

        return {
            allPassed: failed === 0,
            total,
            passed,
            failed,
            duration
        };
    }

    printResults() {
        this.generateSummary();
    }

    hasFailures() {
        return this.results.some(r => r.status === 'FAIL');
    }
}

module.exports = TestSummary;