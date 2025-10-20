const bcrypt = require('bcryptjs');
const { createUser, findByEmail, findByUsername, verifyUser } = require('../models/userModel');
const { query, queryOne } = require('../config/database');

class AuthTests {
    constructor(testSummary) {
        this.testSummary = testSummary;
        this.testUser = null;
    }

    async runAllTests() {
        console.log('\n AUTHENTICATION TESTS');
        console.log('='.repeat(50));
        
        await this.testUserRegistration();
        await this.testDuplicateEmail();
        await this.testUserLogin();
    }

    async testUserRegistration() {
    const testCase = 'User Registration - Valid Data';
    console.log(`\n Test: ${testCase}`);
    
    try {
        const userData = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'SecurePass123!'
        };

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const verificationToken = 'test_token_123';

        // Create user in database
        const result = await createUser(userData.username, userData.email, passwordHash, verificationToken);
        
        // Verify user was created
        const dbUser = await findByEmail(userData.email);
        
        if (!dbUser) {
            throw new Error('User not found in database after creation');
        }

        // Test assertions - FIXED: Handle different boolean representations
        if (!dbUser.user_id) throw new Error('User ID not generated');
        if (dbUser.username !== userData.username) throw new Error('Username mismatch');
        if (dbUser.email !== userData.email) throw new Error('Email mismatch');
        if (dbUser.verification_token !== verificationToken) throw new Error('Verification token not set');
        
        // FIX: Check if is_verified is falsy (0, false, etc.) instead of strict equality
        if (dbUser.is_verified !== 0 && dbUser.is_verified !== false) {
            throw new Error(`User should not be verified initially. Got: ${dbUser.is_verified} (type: ${typeof dbUser.is_verified})`);
        }

        this.testUser = dbUser;

        console.log(' PASS: User created successfully');
        console.log('   Details:', {
            userId: dbUser.user_id,
            username: dbUser.username,
            email: dbUser.email,
            isVerified: dbUser.is_verified,
            isVerifiedType: typeof dbUser.is_verified
        });

        this.testSummary.addResult(testCase, 'PASS', {
            userId: dbUser.user_id,
            username: dbUser.username,
            email: dbUser.email
        });

    } catch (error) {
        console.log(' FAIL: User registration failed');
        console.log('   Error:', error.message);
        this.testSummary.addResult(testCase, 'FAIL', error.message);
    }
}

    async testDuplicateEmail() {
        const testCase = 'User Registration - Duplicate Email';
        console.log(`\n Test: ${testCase}`);
        
        try {
            if (!this.testUser) {
                throw new Error('No test user available for duplicate test');
            }

            const duplicateData = {
                username: 'different_username',
                email: this.testUser.email, // Same email as existing user
                password: 'AnotherPass123!'
            };

            const passwordHash = await bcrypt.hash(duplicateData.password, 10);
            const verificationToken = 'another_token';

            // This should fail due to duplicate email
            await createUser(duplicateData.username, duplicateData.email, passwordHash, verificationToken);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Duplicate email was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Duplicate email was accepted without error');

        } catch (error) {
            // Expected behavior - duplicate email should cause an error
            console.log(' PASS: Correctly rejected duplicate email');
            console.log('   Details:', { error: error.message });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testUserLogin() {
        const testCase = 'User Login - Valid Credentials';
        console.log(`\n Test: ${testCase}`);
        
        try {
            if (!this.testUser) {
                throw new Error('No test user available for login test');
            }

            const testPassword = 'SecurePass123!';
            
            // Find user by email
            const user = await findByEmail(this.testUser.email);
            
            if (!user) {
                throw new Error('User not found during login test');
            }

            // Verify password
            const passwordValid = await bcrypt.compare(testPassword, user.password_hash);
            
            if (!passwordValid) {
                throw new Error('Password validation failed');
            }

            console.log(' PASS: User login successful');
            console.log('   Details:', {
                userId: user.user_id,
                username: user.username,
                email: user.email
            });

            this.testSummary.addResult(testCase, 'PASS', {
                userId: user.user_id,
                username: user.username
            });

        } catch (error) {
            console.log(' FAIL: User login failed');
            console.log('   Error:', error.message);
            this.testSummary.addResult(testCase, 'FAIL', error.message);
        }
    }

    // Cleanup method to remove test data
    async cleanup() {
        if (this.testUser) {
            try {
                await query('DELETE FROM users WHERE user_id = ?', [this.testUser.user_id]);
                console.log(' Cleaned up test user data');
            } catch (error) {
                console.log('  Cleanup warning:', error.message);
            }
        }
    }
}

module.exports = AuthTests;