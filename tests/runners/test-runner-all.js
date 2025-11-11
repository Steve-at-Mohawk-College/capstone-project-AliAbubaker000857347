const { exec } = require('child_process');
const path = require('path');
const TestSummary = require('../helpers/test-summary')




class MasterTestRunner {
    constructor() {
        this.summary = new TestSummary();
        this.results = [];
        this.startTime = null;
    }

    async runAllTests() {
        this.startTime = Date.now();
        console.log('🚀 Starting Master Test Suite Run...\n');
        
        try {
            // Run tests in sequence to avoid conflicts
            await this.runTestSuite('Authentication Tests', 'test:auth');
            await this.runTestSuite('Notification Model Tests', 'test:notifications:model');
            await this.runTestSuite('Notification Service Tests', 'test:notifications:service');
            await this.runTestSuite('Notification Routes Tests', 'test:notifications:routes');
            await this.runTestSuite('Notification Integration Tests', 'test:notifications:integration');
            await this.runTestSuite('Task API Tests', 'test:tasks:api');
            await this.runTestSuite('Task Integration Tests', 'test:tasks:integration');
            await this.runTestSuite('Calendar Integration Tests', 'test:calendar:integration');
            
            // Run the main test runner (includes auth tests and others)
            await this.runTestSuite('Main Test Runner', 'test');
            
            // Run notification test runner
            await this.runTestSuite('Notification Test Runner', 'test:notifications');
            
            this.printFinalSummary();
            
        } catch (error) {
            console.error('❌ Master test runner failed:', error);
            process.exit(1);
        }
    }

    runTestSuite(suiteName, npmScript) {
        return new Promise((resolve, reject) => {
            console.log(`\n📋 Running ${suiteName}...`);
            console.log('='.repeat(50));
            
            const startTime = Date.now();
            
            const child = exec(`npm run ${npmScript}`, {
                cwd: process.cwd(),
                timeout: 120000 // 2 minutes timeout per suite
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data;
                process.stdout.write(`[${suiteName}] ${data}`);
            });

            child.stderr.on('data', (data) => {
                errorOutput += data;
                process.stderr.write(`[${suiteName}-ERROR] ${data}`);
            });

            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                const result = {
                    suite: suiteName,
                    script: npmScript,
                    status: code === 0 ? 'passed' : 'failed',
                    exitCode: code,
                    duration: duration,
                    output: output,
                    error: errorOutput
                };

                this.results.push(result);

                if (code === 0) {
                    console.log(`✅ ${suiteName} completed successfully (${duration}ms)`);
                    resolve(result);
                } else {
                    console.log(`❌ ${suiteName} failed with exit code ${code} (${duration}ms)`);
                    // Don't reject here - continue with other tests
                    resolve(result);
                }
            });

            child.on('error', (error) => {
                const duration = Date.now() - startTime;
                const result = {
                    suite: suiteName,
                    script: npmScript,
                    status: 'error',
                    exitCode: -1,
                    duration: duration,
                    error: error.message
                };
                
                this.results.push(result);
                console.log(`💥 ${suiteName} encountered error: ${error.message}`);
                resolve(result); // Continue with other tests
            });
        });
    }

    printFinalSummary() {
        const totalDuration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const errors = this.results.filter(r => r.status === 'error').length;
        const total = this.results.length;

        console.log('\n' + '='.repeat(60));
        console.log('🎯 MASTER TEST RUNNER - FINAL SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n📊 Test Suite Results:`);
        this.results.forEach(result => {
            const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '💥';
            console.log(`   ${statusIcon} ${result.suite.padEnd(35)} ${result.status.toUpperCase().padEnd(8)} ${result.duration}ms`);
        });

        console.log(`\n📈 Summary:`);
        console.log(`   Total Suites: ${total}`);
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   💥 Errors: ${errors}`);
        console.log(`   ⏱️  Total Duration: ${totalDuration}ms`);
        console.log(`   🎯 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        // Print failed tests details
        const failedSuites = this.results.filter(r => r.status !== 'passed');
        if (failedSuites.length > 0) {
            console.log(`\n⚠️  Failed/Errored Suites:`);
            failedSuites.forEach(suite => {
                console.log(`\n   ${suite.suite}:`);
                if (suite.error) {
                    console.log(`      Error: ${suite.error}`);
                }
                if (suite.exitCode !== 0 && suite.exitCode !== -1) {
                    console.log(`      Exit Code: ${suite.exitCode}`);
                }
            });
        }

        console.log('\n' + '='.repeat(60));
        
        // Exit with appropriate code
        if (failed > 0 || errors > 0) {
            console.log('❌ Master test run completed with failures');
            process.exit(1);
        } else {
            console.log('✅ All test suites passed successfully!');
            process.exit(0);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new MasterTestRunner();
    runner.runAllTests().catch(error => {
        console.error('Fatal error in master test runner:', error);
        process.exit(1);
    });
}

module.exports = MasterTestRunner;