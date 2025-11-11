const puppeteer = require('puppeteer');

async function loginWithTestUser(page, baseUrl, email, password) {
  console.log('🔐 Logging in test user...');
  
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for form elements
  const selectors = ['#email', '#password', 'button[type="submit"]'];
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
    } catch (error) {
      console.log(`❌ Selector not found: ${selector}`);
      await page.screenshot({ path: `login-error-${selector.replace('#', '')}.png` });
      throw error;
    }
  }
  
  // Fill form
  await page.type('#email', email);
  await page.type('#password', password);
  
  // Click login
  const loginButton = await page.$('button[type="submit"]');
  if (!loginButton) {
    throw new Error('Login button not found');
  }
  
  // Wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
    loginButton.click()
  ]);
  
  // Verify login success
  const currentUrl = page.url();
  console.log(`📍 After login URL: ${currentUrl}`);
  
  if (!currentUrl.includes('/dashboard')) {
    console.log('⚠️  May not be logged in properly');
    await page.screenshot({ path: 'login-result.png' });
  }
  
  return currentUrl;
}

module.exports = { loginWithTestUser };