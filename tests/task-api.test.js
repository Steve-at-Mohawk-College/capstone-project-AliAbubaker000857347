const request = require('supertest');
const app = require('../server');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// Helper functions for test data
async function createTestUser() {
  const username = `tasktestuser_${Date.now()}`;
  const email = `tasktest_${Date.now()}@example.com`;
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
  const result = await query(sql, [userId, 'Test Pet', 'dog', 'Golden Retriever', 3, 'male', 25.5]);
  
  return {
    pet_id: result.insertId,
    name: 'Test Pet'
  };
}

async function deleteTestUser(userId) {
  await query('DELETE FROM users WHERE user_id = ?', [userId]);
}

async function deleteTestPet(petId) {
  await query('DELETE FROM pets WHERE pet_id = ?', [petId]);
}

// Test logger utility
const testLogger = {
  info: (testName, message, data = null) => {
    console.log(`📝 ${testName}: ${message}`);
    if (data) {
      console.log('   📊 Data:', JSON.stringify(data, null, 2));
    }
  },
  success: (testName, message) => {
    console.log(`pass ${testName}: ${message}`);
  },
  error: (testName, message, error = null) => {
    console.log(`Fail ${testName}: ${message}`);
    if (error) {
      console.log('   🔍 Error details:', error.message);
    }
  }
};

describe('Task API Endpoints', () => {
  let testUser;
  let testPet;
  let agent;

  beforeAll(async () => {
    console.log('\n SETTING UP TEST ENVIRONMENT');
    console.log('='.repeat(50));
    
    testUser = await createTestUser();
    testPet = await createTestPet(testUser.user_id);
    
    agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'TestPass123!'
      });
    
    testLogger.info('Setup', 'Created test user and pet', {
      userId: testUser.user_id,
      petId: testPet.pet_id
    });
  });

  afterAll(async () => {
    if (testPet) await deleteTestPet(testPet.pet_id);
    if (testUser) await deleteTestUser(testUser.user_id);
    console.log('\n CLEANED UP TEST DATA');
  });

  describe('POST /tasks', () => {
    test('should create a new task with valid data', async () => {
      const testName = 'Create Task - Valid Data';
      const taskData = {
        pet_id: testPet.pet_id,
        task_type: 'feeding',
        title: 'Morning Feeding',
        description: 'Give breakfast to the pet',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high'
      };

      testLogger.info(testName, 'Testing task creation with valid data', taskData);

      const response = await agent
        .post('/tasks')
        .send(taskData)
        .expect(302);

      testLogger.info(testName, `Received redirect to: ${response.headers.location}`);
      expect(response.headers.location).toContain('/dashboard');

      // Verify task was created in database
      const tasks = await query(
        'SELECT * FROM tasks WHERE title = ? AND user_id = ?',
        [taskData.title, testUser.user_id]
      );
      
      if (tasks.length === 1) {
        const task = tasks[0];
        testLogger.success(testName, `Task created successfully with ID: ${task.task_id}`);
        
        expect(task.task_type).toBe(taskData.task_type);
        expect(task.title).toBe(taskData.title);
        expect(task.description).toBe(taskData.description);
        expect(task.priority).toBe(taskData.priority);

        // Cleanup
        await query('DELETE FROM tasks WHERE task_id = ?', [task.task_id]);
        testLogger.info(testName, 'Cleaned up test task');
      } else {
        testLogger.error(testName, 'Task not found in database after creation');
      }
      
      expect(tasks.length).toBe(1);
    });

    test('should reject task creation with missing required fields', async () => {
      const testName = 'Create Task - Missing Fields';
      const incompleteData = {
        task_type: 'feeding'
        // Missing pet_id, title, due_date
      };

      testLogger.info(testName, 'Testing with missing required fields', incompleteData);

      const response = await agent
        .post('/tasks')
        .send(incompleteData)
        .expect(400);

      const hasValidationError = /Invalid|Missing|required|error/i.test(response.text);
      testLogger.info(testName, `Validation response: ${hasValidationError ? 'Has error' : 'No error detected'}`);
      
      if (hasValidationError) {
        testLogger.success(testName, 'Correctly rejected incomplete data');
      } else {
        testLogger.error(testName, 'Expected validation error but none found');
      }

      expect(hasValidationError).toBe(true);
    });

    test('should reject task creation with past due date', async () => {
      const testName = 'Create Task - Past Date';
      const invalidTaskData = {
        pet_id: testPet.pet_id,
        task_type: 'feeding',
        title: 'Invalid Date Task',
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        priority: 'medium'
      };

      testLogger.info(testName, 'Testing with past due date', {
        ...invalidTaskData,
        due_date: 'Yesterday (invalid)'
      });

      const response = await agent
        .post('/tasks')
        .send(invalidTaskData)
        .expect(400);

      const hasDateError = response.text.includes('Due date cannot be in the past');
      testLogger.info(testName, `Date validation: ${hasDateError ? 'Past date rejected' : 'No date error detected'}`);
      
      if (hasDateError) {
        testLogger.success(testName, 'Correctly rejected past due date');
      } else {
        testLogger.error(testName, 'Expected date validation error but none found');
      }

      expect(hasDateError).toBe(true);
    });

    test('should reject task creation with invalid task type', async () => {
      const testName = 'Create Task - Invalid Type';
      const invalidTaskData = {
        pet_id: testPet.pet_id,
        task_type: 'invalid_type',
        title: 'Invalid Task Type',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium'
      };

      testLogger.info(testName, 'Testing with invalid task type', invalidTaskData);

      const response = await agent
        .post('/tasks')
        .send(invalidTaskData)
        .expect(400);

      const hasTypeError = response.text.includes('Invalid task type');
      testLogger.info(testName, `Type validation: ${hasTypeError ? 'Invalid type rejected' : 'No type error detected'}`);
      
      if (hasTypeError) {
        testLogger.success(testName, 'Correctly rejected invalid task type');
      } else {
        testLogger.error(testName, 'Expected type validation error but none found');
      }

      expect(hasTypeError).toBe(true);
    });
  });

  describe('GET /tasks', () => {
    test('should reject unauthorized access to tasks', async () => {
      const testName = 'GET Tasks - Unauthorized';
      testLogger.info(testName, 'Testing access without authentication');

      const response = await request(app)
        .get('/tasks')
        .expect(302);

      const redirectsToLogin = response.headers.location.includes('/login');
      testLogger.info(testName, `Unauthorized access: ${redirectsToLogin ? 'Redirected to login' : 'Not redirected'}`);
      
      if (redirectsToLogin) {
        testLogger.success(testName, 'Correctly redirected unauthorized user to login');
      } else {
        testLogger.error(testName, 'Expected redirect to login but got different location');
      }

      expect(redirectsToLogin).toBe(true);
    });

    test('should retrieve tasks for authenticated user', async () => {
      const testName = 'GET Tasks - Authorized';
      testLogger.info(testName, 'Testing task retrieval with valid session');

      const response = await agent
        .get('/tasks')
        .expect(200);

      const isArray = Array.isArray(response.body);
      testLogger.info(testName, `Response type: ${isArray ? 'Array' : 'Not array'}`);
      testLogger.info(testName, `Tasks retrieved: ${isArray ? response.body.length : 'N/A'}`);
      
      if (isArray) {
        testLogger.success(testName, `Successfully retrieved ${response.body.length} tasks`);
      } else {
        testLogger.error(testName, 'Expected array of tasks but got different format');
      }

      expect(isArray).toBe(true);
    });
  });

  describe('Security Tests', () => {
    test('should prevent SQL injection in task creation', async () => {
      const testName = 'Security - SQL Injection';
      const sqlInjectionData = {
        pet_id: testPet.pet_id,
        task_type: "feeding'; DROP TABLE tasks; --",
        title: "Test'; DELETE FROM users; --",
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium'
      };

      testLogger.info(testName, 'Testing SQL injection prevention', {
        ...sqlInjectionData,
        note: 'Contains malicious SQL commands'
      });

      const response = await agent
        .post('/tasks')
        .send(sqlInjectionData)
        .expect(400);

      const hasSecurityError = /Invalid|error/i.test(response.text);
      testLogger.info(testName, `SQL injection check: ${hasSecurityError ? 'Blocked' : 'Not blocked'}`);
      
      // Verify tasks table still exists
      const tasks = await query('SELECT 1 FROM tasks LIMIT 1');
      const tableExists = tasks && tasks.length > 0;
      testLogger.info(testName, `Table integrity: ${tableExists ? 'Preserved' : 'Compromised'}`);
      
      if (hasSecurityError && tableExists) {
        testLogger.success(testName, 'Successfully blocked SQL injection and preserved table');
      } else {
        testLogger.error(testName, 'SQL injection prevention failed');
      }

      expect(hasSecurityError).toBe(true);
      expect(tableExists).toBe(true);
    });

    test('should enforce task title length limits', async () => {
      const testName = 'Security - Title Length';
      const longTitleTaskData = {
        pet_id: testPet.pet_id,
        task_type: 'feeding',
        title: 'A'.repeat(150),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium'
      };

      testLogger.info(testName, 'Testing title length validation', {
        title_length: longTitleTaskData.title.length,
        max_allowed: 100
      });

      const response = await agent
        .post('/tasks')
        .send(longTitleTaskData)
        .expect(400);

      const hasLengthError = response.text.includes('Title must be between 1-100 characters');
      testLogger.info(testName, `Length validation: ${hasLengthError ? 'Enforced' : 'Not enforced'}`);
      
      if (hasLengthError) {
        testLogger.success(testName, 'Correctly enforced title length limits');
      } else {
        testLogger.error(testName, 'Expected length validation error but none found');
      }

      expect(hasLengthError).toBe(true);
    });
  });
});