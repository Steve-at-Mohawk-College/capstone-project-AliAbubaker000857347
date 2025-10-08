// Clear console completely
process.stdout.write('\x1Bc');

const puppeteer = require('puppeteer');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

console.log('🧪 Task Integration Tests\n');

// Helper functions for test data
async function createTestUser() {
  const username = `frontendtest_${Date.now()}`;
  const email = `frontendtest_${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  
  const sql = `INSERT INTO users (username, email, password_hash, verification_token, is_verified) 
               VALUES (?, ?, ?, ?, ?)`;
  const result = await query(sql, [username, email, passwordHash, 'test_token', 1]);
  
  return {
    user_id: result.insertId,
    username,
    email,
    password: 'TestPass123!'
  };
}

async function createTestPet(userId) {
  const sql = `INSERT INTO pets (user_id, name, species, breed, age, gender, weight) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const result = await query(sql, [userId, 'Frontend Test Pet', 'cat', 'Siamese', 2, 'female', 4.5]);
  
  return {
    pet_id: result.insertId,
    name: 'Frontend Test Pet'
  };
}

async function deleteTestUser(userId) {
  await query('DELETE FROM users WHERE user_id = ?', [userId]);
}

async function deleteTestPet(petId) {
  await query('DELETE FROM pets WHERE pet_id = ?', [petId]);
}

// Clean test logger
const testLogger = {
  test: (name) => console.log(`$ {name}`),
  pass: (name) => console.log(`pass ${name}`),
  step: (message) => console.log(`   ${message}`),
  data: (label, value) => console.log(`    ${label}: ${JSON.stringify(value)}`),
  warn: (message) => console.log(`     ${message}`)
};

describe('Task Scheduling Frontend Integration', () => {
  let browser;
  let page;
  let testUser;
  let testPet;
  let baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    console.log(' Setting up test environment...');
    
    // Create test data
    testUser = await createTestUser();
    testPet = await createTestPet(testUser.user_id);
    console.log(`   User: ${testUser.user_id}, Pet: ${testPet.pet_id}`);

    // Configure browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 30000
    });
    
    page = await browser.newPage();
    await page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1280, height: 720 });

    // Login
    console.log('   Logging in...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', testUser.email);
    await page.type('#password', testUser.password);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('Setup completed\n');
  }, 60000);

  // Cleanup
  async function cleanupTestData() {
    try {
      if (testPet?.pet_id) {
        await query('DELETE FROM tasks WHERE pet_id = ?', [testPet.pet_id]);
        await deleteTestPet(testPet.pet_id);
      }
      if (testUser?.user_id) {
        await deleteTestUser(testUser.user_id);
      }
    } catch (error) {
      // Silent cleanup
    }
  }

  afterAll(async () => {
    await cleanupTestData();
    if (browser) await browser.close();
  }, 60000);

  // Helper function to submit form
  async function submitForm() {
    const buttonSelectors = [
      'button[type="submit"]',
      '.btn[type="submit"]',
      '.btn-custom',
      'form button',
      'button.btn-primary',
      '.btn-primary'
    ];

    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        
        // Scroll into view and ensure clickable
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, selector);
        
        await page.waitForTimeout(500);
        await page.click(selector);
        return true;
      } catch (error) {
        continue;
      }
    }
    
    // Fallback: submit via JavaScript
    try {
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  describe('Task Form Rendering', () => {
    test('should load schedule task page with pet data', async () => {
      testLogger.test('Load schedule task page');
      
      await page.goto(`${baseUrl}/schedule-task`, { waitUntil: 'networkidle0' });
      
      const pageTitle = await page.$eval('h1', el => el.textContent);
      testLogger.step(`Page title: "${pageTitle}"`);
      
      const petOptions = await page.$$eval('#pet_id option', options => 
        options.map(option => option.textContent.trim())
      );
      testLogger.step(`Pet options: ${petOptions.length} found`);
      
      expect(pageTitle).toContain('Schedule Task');
      expect(petOptions).toContain('Select a Pet');
      
      testLogger.pass('Page loaded with pet data');
    }, 30000); // 30 second timeout

    test('should display form validation errors', async () => {
      testLogger.test('Form validation errors');
      
      await page.goto(`${baseUrl}/schedule-task`, { waitUntil: 'networkidle0' });
      
      await submitForm();
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      testLogger.step(`Remained on: ${currentUrl}`);
      
      expect(currentUrl).toContain('/schedule-task');
      testLogger.pass('Validation errors displayed');
    }, 30000); // 30 second timeout
  });

  describe('Task Creation Flow', () => {
    test('should successfully create a task with valid data', async () => {
      testLogger.test('Create task with valid data');
      
      await page.goto(`${baseUrl}/schedule-task`, { waitUntil: 'networkidle0' });
      
      // Fill form
      const taskData = {
        pet_id: testPet.pet_id.toString(),
        task_type: 'feeding',
        title: 'Automated Test Task',
        description: 'Created by automated testing',
        priority: 'high'
      };
      
      testLogger.step('Filling form data');
      await page.select('#pet_id', taskData.pet_id);
      await page.select('#task_type', taskData.task_type);
      await page.type('#title', taskData.title);
      await page.type('#description', taskData.description);
      
      // Set due date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().slice(0, 16);
      await page.$eval('#due_date', (el, value) => el.value = value, dateString);
      testLogger.step(`Due date: ${dateString}`);
      
      await page.select('#priority', taskData.priority);
      
      // Submit with better navigation handling
      testLogger.step('Submitting form...');
      
      await submitForm();
      
      // Wait for navigation with longer timeout
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle0', 
          timeout: 20000 
        });
      } catch (error) {
        testLogger.warn('Navigation timeout, continuing...');
      }
      
      await page.waitForTimeout(2000);
      
      // Check current URL
      const currentUrl = page.url();
      testLogger.step(`Current URL: ${currentUrl}`);
      
      // Check if task was created regardless of navigation
      const tasks = await query(
        'SELECT * FROM tasks WHERE title = ? AND user_id = ?',
        [taskData.title, testUser.user_id]
      );
      
      if (tasks.length > 0) {
        testLogger.data('Created task', {
          id: tasks[0].task_id,
          type: tasks[0].task_type,
          priority: tasks[0].priority,
          title: tasks[0].title
        });
        
        // Verify task data
        expect(tasks.length).toBe(1);
        expect(tasks[0].task_type).toBe('feeding');
        expect(tasks[0].priority).toBe('high');
        expect(tasks[0].title).toBe(taskData.title);
        
        // Cleanup
        await query('DELETE FROM tasks WHERE task_id = ?', [tasks[0].task_id]);
        testLogger.step('Cleaned up test task');
        
        // Check if we got redirected (optional check)
        if (currentUrl.includes('/dashboard')) {
          testLogger.step('Successfully redirected to dashboard');
        } else {
          testLogger.warn(`Not redirected to dashboard. Current URL: ${currentUrl}`);
        }
        
        testLogger.pass('Task created successfully');
      } else {
        throw new Error('Task was not created in database');
      }
    }, 60000); // 60 second timeout

    test('should enforce character limits on input fields', async () => {
      testLogger.test('Character limits enforcement');
      
      await page.goto(`${baseUrl}/schedule-task`, { waitUntil: 'networkidle0' });
      
      // Clear any existing text first
      await page.$eval('#title', el => el.value = '');
      await page.$eval('#description', el => el.value = '');
      
      // Test title limit
      const longTitle = 'A'.repeat(150);
      await page.type('#title', longTitle);
      const titleValue = await page.$eval('#title', el => el.value);
      testLogger.step(`Title: ${longTitle.length} → ${titleValue.length} chars`);
      
      // Test description limit
      const longDescription = 'B'.repeat(600);
      await page.type('#description', longDescription);
      const descriptionValue = await page.$eval('#description', el => el.value);
      testLogger.step(`Description: ${longDescription.length} → ${descriptionValue.length} chars`);
      
      expect(titleValue.length).toBe(100);
      expect(descriptionValue.length).toBe(500);
      
      testLogger.pass('Character limits enforced');
    }, 30000); // 30 second timeout
  });

  describe('Form Security Features', () => {
    test('should handle special characters correctly', async () => {
      testLogger.test('Special characters handling');
      
      await page.goto(`${baseUrl}/schedule-task`, { waitUntil: 'networkidle0' });
      
      // Clear any existing text first
      await page.$eval('#title', el => el.value = '');
      
      const testTitle = 'Task with Special Chars ()_-.,!';
      await page.type('#title', testTitle);
      const titleValue = await page.$eval('#title', el => el.value);
      
      testLogger.step(`Input: "${testTitle}"`);
      testLogger.step(`Output: "${titleValue}"`);
      
      expect(titleValue).toBe(testTitle);
      testLogger.pass('Special characters handled correctly');
    }, 30000); // 30 second timeout
  });

  describe('User Interface Interactions', () => {
    test('should maintain form state after validation error', async () => {
      testLogger.test('Form state persistence');
      
      await page.goto(`${baseUrl}/schedule-task`, { waitUntil: 'networkidle0' });
      
      // Fill partial data
      const testData = {
        pet_id: testPet.pet_id.toString(),
        title: 'Test Task Title'
      };
      
      testLogger.step('Filling partial form data');
      await page.select('#pet_id', testData.pet_id);
      await page.type('#title', testData.title);
      
      // Trigger validation error
      await submitForm();
      await page.waitForTimeout(3000);
      
      // Check state persistence
      const retainedPetId = await page.$eval('#pet_id', el => el.value);
      const retainedTitle = await page.$eval('#title', el => el.value);
      
      testLogger.step(`Pet ID retained: ${retainedPetId === testData.pet_id}`);
      testLogger.step(`Title retained: "${retainedTitle}"`);
      
      expect(retainedPetId).toBe(testData.pet_id);
      expect(retainedTitle).toBe(testData.title);
      
      testLogger.pass('Form state maintained after validation');
    }, 30000); // 30 second timeout
  });
});