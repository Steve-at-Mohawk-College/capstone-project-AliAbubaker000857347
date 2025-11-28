const puppeteer = require('puppeteer');

async function robustLogin(page, baseUrl, email, password) {
  // console.log('🔐 Attempting robust login...');
  
  try {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    // Wait for form elements
    await page.waitForSelector('input[type="email"], #email, input[name="email"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"], #password, input[name="password"]', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"], input[type="submit"]', { timeout: 10000 });

    // Fill credentials
    await page.type('input[type="email"], #email, input[name="email"]', email);
    await page.type('input[type="password"], #password, input[name="password"]', password);

    // Click submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
      page.click('button[type="submit"], input[type="submit"]')
    ]);

    // console.log('✅ Login successful');
    return true;
  } catch (error) {
    // console.log('❌ Login failed:', error.message);
    return false;
  }
}

module.exports = { robustLogin };