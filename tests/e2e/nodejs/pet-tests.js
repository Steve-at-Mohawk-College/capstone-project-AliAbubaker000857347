const { createPet, updatePet, deletePet, getPetsByUser } = require('../../../models/petModel');

class PetTests {
    constructor(testSummary, testUserId) {
        this.testSummary = testSummary;
        this.testPet = null;
        this.testUserId = testUserId;
    }

    async runAllTests() {
        console.log('\n🐾 PET CRUD TESTS');
        console.log('='.repeat(50));
        
        if (!this.testUserId) {
            console.log(' SKIP: No user ID provided for pet tests');
            this.testSummary.addResult('All Pet Tests', 'SKIP', 'No user ID available - run auth tests first');
            return;
        }
        
        // Positive tests (should pass)
        await this.testCreatePet();
        await this.testUpdatePet();
        await this.testDeletePet();
        
        // Negative tests (should fail with invalid input)
        await this.testCreatePetInvalidName();
        await this.testCreatePetInvalidAge();
        await this.testCreatePetInvalidWeight();
        await this.testCreatePetMissingRequired();
        await this.testUpdatePetInvalidData();
        await this.testUpdateNonExistentPet();
    }

    async testCreatePet() {
        const testCase = 'Create New Pet - Valid Data';
        console.log(`\n Test: ${testCase}`);
        
        try {
            const petData = {
                name: 'Fluffy',
                breed: 'Golden Retriever',
                age: 3,
                species: 'Dog',
                gender: 'male',
                weight: 25.5
            };

            console.log(`   Creating pet for user ID: ${this.testUserId}`);

            // Create pet in database
            const result = await createPet(this.testUserId, petData);
            
            // Get the created pet to verify
            const userPets = await getPetsByUser(this.testUserId);
            const createdPet = userPets.find(pet => pet.name === petData.name);
            
            if (!createdPet) {
                throw new Error('Pet not found after creation');
            }

            this.testPet = createdPet;

            console.log(' PASS: Pet created successfully');
            console.log('   Details:', {
                petId: createdPet.pet_id,
                name: createdPet.name,
                breed: createdPet.breed,
                age: createdPet.age,
                species: createdPet.species,
                userId: createdPet.user_id
            });

            this.testSummary.addResult(testCase, 'PASS', {
                petId: createdPet.pet_id,
                name: createdPet.name,
                breed: createdPet.breed,
                age: createdPet.age
            });

        } catch (error) {
            console.log(' FAIL: Pet creation failed');
            console.log('   Error:', error.message);
            this.testSummary.addResult(testCase, 'FAIL', error.message);
        }
    }

    async testCreatePetInvalidName() {
        const testCase = 'Create Pet - Invalid Name (Should Fail)';
        console.log(`\n Test: ${testCase}`);
        
        try {
            const invalidPetData = {
                name: 'F1uffy@', // Invalid characters
                breed: 'Golden Retriever',
                age: 3,
                species: 'Dog',
                gender: 'male',
                weight: 25.5
            };

            console.log('   Attempting to create pet with invalid name...');

            // This should fail due to invalid name
            await createPet(this.testUserId, invalidPetData);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Invalid pet name was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Invalid pet name was accepted without validation');

        } catch (error) {
            // Expected behavior - invalid name should cause an error
            console.log(' PASS: Correctly rejected invalid pet name');
            console.log('   Details:', { 
                input: 'F1uffy@',
                error: error.message 
            });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testCreatePetInvalidAge() {
        const testCase = 'Create Pet - Invalid Age (Should Fail)';
        console.log(`\n Test: ${testCase}`);
        
        try {
            const invalidPetData = {
                name: 'Test Pet',
                breed: 'Golden Retriever',
                age: -5, // Negative age
                species: 'Dog',
                gender: 'male',
                weight: 25.5
            };

            console.log('   Attempting to create pet with negative age...');

            // This should fail due to invalid age
            await createPet(this.testUserId, invalidPetData);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Invalid age was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Negative age was accepted without validation');

        } catch (error) {
            // Expected behavior - invalid age should cause an error
            console.log('✅ PASS: Correctly rejected invalid age');
            console.log('   Details:', { 
                input: -5,
                error: error.message 
            });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testCreatePetInvalidWeight() {
        const testCase = 'Create Pet - Invalid Weight (Should Fail)';
        console.log(`\n📝 Test: ${testCase}`);
        
        try {
            const invalidPetData = {
                name: 'Test Pet',
                breed: 'Golden Retriever',
                age: 3,
                species: 'Dog',
                gender: 'male',
                weight: 0 // Zero weight
            };

            console.log('   Attempting to create pet with zero weight...');

            // This should fail due to invalid weight
            await createPet(this.testUserId, invalidPetData);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Invalid weight was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Zero weight was accepted without validation');

        } catch (error) {
            // Expected behavior - invalid weight should cause an error
            console.log(' PASS: Correctly rejected invalid weight');
            console.log('   Details:', { 
                input: 0,
                error: error.message 
            });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testCreatePetMissingRequired() {
        const testCase = 'Create Pet - Missing Required Fields (Should Fail)';
        console.log(`\n Test: ${testCase}`);
        
        try {
            const incompletePetData = {
                name: 'Test Pet',
                breed: 'Golden Retriever',
                // Missing age, species, gender, weight (undefined)
            };

            console.log('   Attempting to create pet with missing required fields...');

            // This should fail due to missing required fields
            await createPet(this.testUserId, incompletePetData);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Incomplete pet data was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Missing required fields were accepted');

        } catch (error) {
            // Expected behavior - missing fields should cause an error
            console.log(' PASS: Correctly rejected incomplete pet data');
            console.log('   Details:', { 
                error: error.message 
            });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testUpdatePet() {
        const testCase = 'Update Existing Pet - Valid Data';
        console.log(`\n Test: ${testCase}`);
        
        try {
            if (!this.testPet) {
                throw new Error('No test pet available for update test');
            }

            const updates = {
                name: 'Fluffy Updated',
                age: 4,
                weight: 26.0,
                breed: 'Golden Retriever Mix'
            };

            // Update pet in database
            await updatePet(this.testPet.pet_id, updates);
            
            // Get updated pet to verify changes
            const userPets = await getPetsByUser(this.testUserId);
            const updatedPet = userPets.find(pet => pet.pet_id === this.testPet.pet_id);
            
            if (!updatedPet) {
                throw new Error('Pet not found after update');
            }

            console.log(' PASS: Pet updated successfully');
            console.log('   Details:', {
                petId: updatedPet.pet_id,
                changes: {
                    name: `${this.testPet.name} → ${updatedPet.name}`,
                    age: `${this.testPet.age} → ${updatedPet.age}`,
                    weight: `${this.testPet.weight} → ${updatedPet.weight}`
                }
            });

            this.testSummary.addResult(testCase, 'PASS', {
                petId: updatedPet.pet_id,
                changes: updates
            });

            // Update testPet with new data
            this.testPet = updatedPet;

        } catch (error) {
            console.log(' FAIL: Pet update failed');
            console.log('   Error:', error.message);
            this.testSummary.addResult(testCase, 'FAIL', error.message);
        }
    }

    async testUpdatePetInvalidData() {
        const testCase = 'Update Pet - Invalid Data (Should Fail)';
        console.log(`\n Test: ${testCase}`);
        
        try {
            if (!this.testPet) {
                throw new Error('No test pet available for invalid update test');
            }

            const invalidUpdates = {
                name: 'F1uffy@', // Invalid characters
                age: -2, // Negative age
                weight: -5 // Negative weight
            };

            console.log('   Attempting to update pet with invalid data...');

            // This should fail due to invalid data
            await updatePet(this.testPet.pet_id, invalidUpdates);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Invalid update data was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Invalid update data was accepted without validation');

        } catch (error) {
            // Expected behavior - invalid data should cause an error
            console.log(' PASS: Correctly rejected invalid update data');
            console.log('   Details:', { 
                error: error.message 
            });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testUpdateNonExistentPet() {
        const testCase = 'Update Non-Existent Pet (Should Fail)';
        console.log(`\n Test: ${testCase}`);
        
        try {
            const nonExistentPetId = 99999; // ID that doesn't exist
            const updates = {
                name: 'Ghost Pet',
                age: 1
            };

            console.log('   Attempting to update non-existent pet...');

            // This should fail because pet doesn't exist
            await updatePet(nonExistentPetId, updates);
            
            // If we reach here, the test failed (should have thrown an error)
            console.log(' FAIL: Update on non-existent pet was accepted');
            this.testSummary.addResult(testCase, 'FAIL', 'Update on non-existent pet was accepted');

        } catch (error) {
            // Expected behavior - non-existent pet should cause an error
            console.log(' PASS: Correctly rejected update on non-existent pet');
            console.log('   Details:', { 
                error: error.message 
            });
            this.testSummary.addResult(testCase, 'PASS', error.message);
        }
    }

    async testDeletePet() {
        const testCase = 'Delete Existing Pet';
        console.log(`\n Test: ${testCase}`);
        
        try {
            if (!this.testPet) {
                throw new Error('No test pet available for delete test');
            }

            const petId = this.testPet.pet_id;

            // Delete pet from database
            await deletePet(petId);
            
            // Verify pet is deleted
            const userPets = await getPetsByUser(this.testUserId);
            const deletedPet = userPets.find(pet => pet.pet_id === petId);
            
            if (deletedPet) {
                throw new Error('Pet still exists after deletion');
            }

            console.log(' PASS: Pet deleted successfully');
            console.log('   Details:', {
                deletedPetId: petId,
                name: this.testPet.name
            });

            this.testSummary.addResult(testCase, 'PASS', {
                deletedPetId: petId,
                name: this.testPet.name
            });

            // Clear test pet reference
            this.testPet = null;

        } catch (error) {
            console.log(' FAIL: Pet deletion failed');
            console.log('   Error:', error.message);
            this.testSummary.addResult(testCase, 'FAIL', error.message);
        }
    }

    // Cleanup method
    async cleanup() {
        if (this.testPet) {
            try {
                await deletePet(this.testPet.pet_id);
                console.log(' Cleaned up test pet data');
            } catch (error) {
                console.log('  Cleanup warning:', error.message);
            }
        }
    }
}

module.exports = PetTests;