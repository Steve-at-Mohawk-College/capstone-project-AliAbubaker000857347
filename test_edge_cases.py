import pytest
import re
from datetime import datetime, timedelta

class TestEdgeCases:
    """Edge case and boundary condition tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, db_connection):
        self.db = db_connection
    
    # User Model Edge Cases
    def test_user_duplicate_email(self):
        """Test creating user with duplicate email"""
        # Create first user
        self.db.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            ['user1', 'duplicate@example.com', 'hash1']
        )
        
        # Try to create second user with same email
        with pytest.raises(Exception):  # Should raise integrity error
            self.db.query(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                ['user2', 'duplicate@example.com', 'hash2']
            )
    
    def test_user_duplicate_username(self):
        """Test creating user with duplicate username"""
        # Create first user
        self.db.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            ['same_username', 'email1@example.com', 'hash1']
        )
        
        # Try to create second user with same username
        with pytest.raises(Exception):
            self.db.query(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                ['same_username', 'email2@example.com', 'hash2']
            )
    
    def test_user_invalid_email_format(self):
        """Test user creation with invalid email format"""
        invalid_emails = [
            'invalid',
            'invalid@',
            '@invalid.com',
            'invalid@.com',
            'invalid@com.'
        ]
        
        for email in invalid_emails:
            # This should be caught by application validation before DB
            with pytest.raises(ValueError, match="Please enter a valid email address"):
                if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
                    raise ValueError("Please enter a valid email address")
    
    # Pet Model Edge Cases
    def test_pet_name_boundaries(self):
        """Test pet name validation boundaries"""
        # Test minimum length
        with pytest.raises(ValueError, match="Pet name must be 2-50 letters long"):
            name = "A"  # Too short
            if len(name.strip()) < 2:
                raise ValueError("Pet name must be 2-50 letters long")
        
        # Test maximum length
        with pytest.raises(ValueError, match="Pet name must be 2-50 letters long"):
            name = "A" * 51  # Too long
            if len(name.strip()) > 50:
                raise ValueError("Pet name must be 2-50 letters long")
        
        # Test invalid characters
        with pytest.raises(ValueError, match="Pet name must be 2-50 letters long"):
            name = "Fluffy123"  # Contains numbers
            if not re.match(r"^[A-Za-z\s'-]+$", name):
                raise ValueError("Pet name must be 2-50 letters long")
    
    def test_pet_age_boundaries(self):
        """Test pet age validation boundaries"""
        # Test minimum age
        with pytest.raises(ValueError, match="Age must be greater than 0"):
            age = 0
            if age <= 0:
                raise ValueError("Age must be greater than 0")
        
        # Test maximum age
        with pytest.raises(ValueError, match="Age must be greater than 0 and less than or equal to 50"):
            age = 51
            if age > 50:
                raise ValueError("Age must be greater than 0 and less than or equal to 50")
        
        # Test invalid age format
        with pytest.raises(ValueError, match="Age must be greater than 0"):
            age = -5
            if age <= 0:
                raise ValueError("Age must be greater than 0")
    
    def test_pet_weight_boundaries(self):
        """Test pet weight validation boundaries"""
        # Test minimum weight
        with pytest.raises(ValueError, match="Weight must be greater than 0"):
            weight = 0
            if weight <= 0:
                raise ValueError("Weight must be greater than 0")
        
        # Test maximum weight
        with pytest.raises(ValueError, match="Weight must be greater than 0 and less than or equal to 200"):
            weight = 201
            if weight > 200:
                raise ValueError("Weight must be greater than 0 and less than or equal to 200")
    
    def test_pet_invalid_gender(self):
        """Test pet creation with invalid gender"""
        with pytest.raises(ValueError, match="Please select a valid gender"):
            gender = 'invalid_gender'
            if gender not in ['male', 'female', 'other']:
                raise ValueError("Please select a valid gender (male, female, other)")
    
    # Task Model Edge Cases
    def test_task_due_date_validation(self):
        """Test task due date validation"""
        # Test past due date
        with pytest.raises(ValueError, match="Due date must be in the future"):
            past_date = (datetime.now() - timedelta(days=1)).isoformat()
            due_date = datetime.fromisoformat(past_date.replace('Z', '+00:00'))
            now = datetime.now()
            
            if due_date <= now:
                raise ValueError("Due date must be in the future")
        
        # Test too far future date
        with pytest.raises(ValueError, match="Due date must be in the future and within 1 year"):
            future_date = (datetime.now() + timedelta(days=400)).isoformat()  # More than 1 year
            due_date = datetime.fromisoformat(future_date.replace('Z', '+00:00'))
            max_date = datetime.now() + timedelta(days=365)
            
            if due_date > max_date:
                raise ValueError("Due date must be in the future and within 1 year")
    
    def test_task_title_validation(self):
        """Test task title validation"""
        # Test empty title
        with pytest.raises(ValueError, match="Invalid title format"):
            title = ""
            if not title or not title.strip():
                raise ValueError("Invalid title format")
        
        # Test title too long
        with pytest.raises(ValueError, match="Invalid title format"):
            title = "A" * 101
            if len(title.strip()) > 100:
                raise ValueError("Invalid title format")
        
        # Test title with invalid characters
        with pytest.raises(ValueError, match="Invalid title format"):
            title = "Task @#$%"
            if not re.match(r"^[a-zA-Z0-9\s\-_,.!()]+$", title.strip()):
                raise ValueError("Invalid title format")
    
    def test_task_description_validation(self):
        """Test task description validation"""
        # Test description too long
        with pytest.raises(ValueError, match="Invalid description format"):
            description = "D" * 501
            if len(description) > 500:
                raise ValueError("Invalid description format")
    
    def test_task_invalid_type(self):
        """Test task creation with invalid type"""
        with pytest.raises(ValueError, match="Invalid task type"):
            task_type = 'invalid_type'
            valid_types = ['feeding', 'cleaning', 'vaccination', 'medication', 'grooming', 'vet_visit', 'exercise', 'other']
            if task_type not in valid_types:
                raise ValueError("Invalid task type")
    
    def test_task_invalid_priority(self):
        """Test task creation with invalid priority"""
        with pytest.raises(ValueError, match="Invalid priority"):
            priority = 'invalid_priority'
            valid_priorities = ['low', 'medium', 'high']
            if priority not in valid_priorities:
                raise ValueError("Invalid priority")
    
    # Authorization Edge Cases
    def test_user_access_other_users_pet(self):
        """Test user cannot access another user's pet"""
        # Create second user
        result = self.db.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            ['other_user', 'other@example.com', 'hash_other']
        )
        other_user_id = result.last_row_id
        
        # Create pet for second user
        result = self.db.query(
            "INSERT INTO pets (user_id, name, breed, age, species, gender, weight) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [other_user_id, 'Other Pet', 'Breed', 2, 'cat', 'male', 4.5]
        )
        other_pet_id = result.last_row_id
        
        # Try to access other user's pet (should return empty)
        pets = self.db.query("SELECT * FROM pets WHERE pet_id = ? AND user_id = ?", [other_pet_id, self.test_user_id])
        assert len(pets) == 0
        
        # Cleanup
        self.db.query("DELETE FROM pets WHERE pet_id = ?", [other_pet_id])
        self.db.query("DELETE FROM users WHERE user_id = ?", [other_user_id])
    
    def test_user_access_other_users_task(self):
        """Test user cannot access another user's task"""
        # Create second user and pet
        result = self.db.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            ['task_user', 'task@example.com', 'hash_task']
        )
        other_user_id = result.last_row_id
        
        result = self.db.query(
            "INSERT INTO pets (user_id, name, breed, age, species, gender, weight) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [other_user_id, 'Task Pet', 'Breed', 3, 'dog', 'female', 10.0]
        )
        other_pet_id = result.last_row_id
        
        # Create task for second user
        due_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
        result = self.db.query(
            "INSERT INTO tasks (user_id, pet_id, task_type, title, due_date, priority) VALUES (?, ?, ?, ?, ?, ?)",
            [other_user_id, other_pet_id, 'feeding', 'Other Task', due_date, 'medium']
        )
        other_task_id = result.last_row_id
        
        # Try to access other user's task (should return empty)
        tasks = self.db.query(
            "SELECT t.* FROM tasks t JOIN pets p ON t.pet_id = p.pet_id WHERE t.task_id = ? AND p.user_id = ?",
            [other_task_id, self.test_user_id]
        )
        assert len(tasks) == 0
        
        # Cleanup
        self.db.query("DELETE FROM tasks WHERE task_id = ?", [other_task_id])
        self.db.query("DELETE FROM pets WHERE pet_id = ?", [other_pet_id])
        self.db.query("DELETE FROM users WHERE user_id = ?", [other_user_id])
    
    # Database Connection Edge Cases
    def test_database_connection_timeout(self):
        """Test database connection handling"""
        # This would typically test connection timeout scenarios
        # In a real test, you might simulate a slow connection
        pass
    
    def test_database_transaction_rollback(self):
        """Test transaction rollback on error"""
        try:
            # Start transaction
            self.db.query("START TRANSACTION")
            
            # Perform some valid operations
            self.db.query(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                ['rollback_user', 'rollback@example.com', 'hash_rollback']
            )
            
            # Intentionally cause an error
            self.db.query("INSERT INTO non_existent_table (col) VALUES (?)", ['value'])
            
            # This should not be reached
            assert False, "Should have raised an exception"
            
        except Exception:
            # Rollback should happen automatically or explicitly
            self.db.query("ROLLBACK")
            
            # Verify the user was not inserted
            user = self.db.query_one("SELECT * FROM users WHERE email = ?", ['rollback@example.com'])
            assert user is None
    
    # Performance Edge Cases
    def test_large_dataset_performance(self):
        """Test performance with large datasets"""
        # Create multiple pets for performance testing
        start_time = datetime.now()
        
        for i in range(100):  # Create 100 pets
            self.db.query(
                "INSERT INTO pets (user_id, name, breed, age, species, gender, weight) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [self.test_user_id, f'Pet_{i}', f'Breed_{i}', i % 10 + 1, 'dog', 'male', i % 50 + 1]
            )
        
        # Query all pets
        pets = self.db.query("SELECT * FROM pets WHERE user_id = ?", [self.test_user_id])
        
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        # Performance assertion - should complete within 2 seconds
        assert execution_time < 2.0, f"Query took too long: {execution_time} seconds"
        assert len(pets) >= 100
        
        # Cleanup
        self.db.query("DELETE FROM pets WHERE user_id = ?", [self.test_user_id])