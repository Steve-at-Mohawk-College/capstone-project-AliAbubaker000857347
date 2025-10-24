// rate-limit-diagnostic.js
const https = require('https');

class RateLimitDiagnostic {
  constructor() {
    this.baseUrl = 'https://petwell-a1271a0b47f3.herokuapp.com';
    this.results = [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            responseTime: Date.now() - startTime,
            data: data
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 0,
          error: err.message,
          responseTime: Date.now() - startTime
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          status: 0,
          error: 'Timeout',
          responseTime: Date.now() - startTime
        });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  async testDifferentApproaches() {
    console.log('🔍 DIAGNOSTIC MODE: Testing different approaches to bypass rate limiting\n');

    const tests = [
      {
        name: 'Root path with GET',
        url: `${this.baseUrl}/`,
        options: { method: 'GET' }
      },
      {
        name: 'Root path with HEAD',
        url: `${this.baseUrl}/`,
        options: { method: 'HEAD' }
      },
      {
        name: 'Health check endpoint',
        url: `${this.baseUrl}/health`,
        options: { method: 'GET' }
      },
      {
        name: 'API endpoint',
        url: `${this.baseUrl}/api`,
        options: { method: 'GET' }
      },
      {
        name: 'With different User-Agent',
        url: `${this.baseUrl}/`,
        options: { 
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Diagnostic Tool)' }
        }
      },
      {
        name: 'With accept header',
        url: `${this.baseUrl}/`,
        options: { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      }
    ];

    for (const test of tests) {
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const result = await this.makeRequest(test.url, test.options);
      
      if (result.status === 200) {
        console.log(`   ✅ SUCCESS - Status: ${result.status}, Time: ${result.responseTime}ms`);
        console.log(`   🎯 WORKING ENDPOINT: ${test.url}`);
        return { working: true, url: test.url, result };
      } else if (result.status === 429) {
        const retryAfter = result.headers['retry-after'] || 'unknown';
        console.log(`   🚫 RATE LIMITED - Status: ${result.status}, Retry-After: ${retryAfter}, Time: ${result.responseTime}ms`);
      } else if (result.status > 0) {
        console.log(`   ❌ FAILED - Status: ${result.status}, Time: ${result.responseTime}ms`);
      } else {
        console.log(`   💥 ERROR - ${result.error}, Time: ${result.responseTime}ms`);
      }

      // Wait between tests
      await this.delay(2000);
    }

    return { working: false };
  }

  async checkRateLimitReset() {
    console.log('\n⏰ Checking if rate limits reset over time...\n');
    
    const intervals = [30000, 60000, 120000]; // 30s, 1min, 2min
    const testUrl = `${this.baseUrl}/`;
    
    for (const interval of intervals) {
      console.log(`Waiting ${interval/1000} seconds...`);
      await this.delay(interval);
      
      const result = await this.makeRequest(testUrl);
      console.log(`   After ${interval/1000}s - Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log(`   ✅ RATE LIMIT RESET! Working after ${interval/1000} seconds`);
        return { reset: true, time: interval, url: testUrl };
      }
    }
    
    return { reset: false };
  }

  async testWithSession() {
    console.log('\n🔐 Testing if authenticated requests work differently...\n');
    
    // Try a simple POST request that might have different rate limits
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword'
    });
    
    const result = await this.makeRequest(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    });
    
    console.log(`POST to /login - Status: ${result.status}`);
    return result;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    console.log('\n📋 DIAGNOSTIC REPORT');
    console.log('='.repeat(50));
    
    console.log('\n🚨 IMMEDIATE ISSUE:');
    console.log('   Your application is heavily rate limited on Heroku.');
    console.log('   This is common with free tier deployments.');
    
    console.log('\n💡 QUICK FIXES:');
    console.log('   1. Wait 1-2 hours for rate limits to completely reset');
    console.log('   2. Try from a different network/IP address');
    console.log('   3. Use Heroku CLI to check logs: heroku logs --tail');
    console.log('   4. Test locally instead of on deployed version');
    
    console.log('\n🔧 LONG-TERM SOLUTIONS:');
    console.log('   1. Upgrade Heroku plan for higher rate limits');
    console.log('   2. Implement exponential backoff in your load tests');
    console.log('   3. Use multiple test endpoints to distribute load');
    console.log('   4. Consider using a testing service with rotating IPs');
    
    console.log('\n🧪 ALTERNATIVE TESTING STRATEGY:');
    console.log('   Since Heroku rate limiting is aggressive, consider:');
    console.log('   - Testing your application locally');
    console.log('   - Using a different deployment platform for testing');
    console.log('   - Implementing your load tests in the application itself');
  }
}

// Alternative: Local testing script
function generateLocalTestScript() {
  console.log('\n📜 LOCAL TESTING ALTERNATIVE');
  console.log('='.repeat(50));
  console.log(`
Since Heroku rate limiting is blocking your tests, here's a local testing approach:

1. Run your application locally:
   npm start

2. Use this local load test script:

// local-load-test.js
const http = require('http');

const localTest = {
  baseUrl: 'http://localhost:3000',
  
  async testEndpoint(endpoint) {
    return new Promise((resolve) => {
      const start = Date.now();
      const req = http.get(this.baseUrl + endpoint, (res) => {
        console.log(\`\${endpoint} - Status: \${res.statusCode} - \${Date.now() - start}ms\`);
        resolve(res.statusCode);
      });
      req.on('error', () => resolve(0));
    });
  },
  
  async runTests() {
    const endpoints = ['/', '/login', '/register', '/dashboard'];
    
    for (let i = 0; i < 20; i++) {
      for (const endpoint of endpoints) {
        await this.testEndpoint(endpoint);
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }
};

localTest.runTests();
  `);
}

async function main() {
  const diagnostic = new RateLimitDiagnostic();
  
  console.log('🚀 Starting Rate Limit Diagnostic Tool');
  console.log('📍 Target: https://petwell-a1271a0b47f3.herokuapp.com');
  console.log('⏰ This may take a few minutes...\n');

  // Test different approaches
  const approachTest = await diagnostic.testDifferentApproaches();
  
  if (!approachTest.working) {
    // Check if rate limits reset over time
    const resetTest = await diagnostic.checkRateLimitReset();
    
    if (!resetTest.reset) {
      // Try POST request
      await diagnostic.testWithSession();
      
      // Generate comprehensive report
      diagnostic.generateReport();
      
      // Offer local testing alternative
      generateLocalTestScript();
      
      console.log('\n🎯 RECOMMENDATION:');
      console.log('   Your best option is to test locally or wait several hours');
      console.log('   Heroku free tier has very strict rate limits for external testing.');
    }
  }
}

main().catch(console.error);