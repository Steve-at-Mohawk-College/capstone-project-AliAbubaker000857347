class TestSummary {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    addResult(testCase, status, details = null) {
        this.results.push({
            testCase,
            status,
            details,
            timestamp: new Date().toISOString()
        });
    }

    printResults() {
        const duration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const skipped = this.results.filter(r => r.status === 'SKIP').length;
        const total = this.results.length;

        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        
        this.results.forEach(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`   ${statusIcon} ${result.testCase}`);
            if (result.details && typeof result.details === 'object') {
                console.log(`      Details:`, result.details);
            } else if (result.details) {
                console.log(`      Details: ${result.details}`);
            }
        });

        console.log('\n' + '='.repeat(60));
        console.log(`📈 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`🎯 Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);
        console.log('='.repeat(60));
    }

    hasFailures() {
        return this.results.some(result => result.status === 'FAIL');
    }
}

module.exports = TestSummary;