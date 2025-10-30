import pytest
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime
from config.test_database import TestDatabase

@pytest.fixture(scope="session")
def test_database():
    """Session-level test database fixture"""
    db = TestDatabase()
    
    # Initialize schema once per session
    db.initialize_schema()
    
    yield db
    
    # Optional: Clean up entire database after all tests
    # db.cleanup_database()
    db.close()

@pytest.fixture(scope="function")
def db_connection(test_database):
    """Function-level database connection with transaction rollback"""
    # Start transaction for this test
    test_database.connection.start_transaction()
    
    yield test_database
    
    # Rollback transaction to undo all changes
    test_database.connection.rollback()
    print("✅ Test transaction rolled back")

@pytest.fixture
def sample_user_data():
    """Provide sample user data for tests"""
    return {
        'username': f'testuser_{datetime.now().strftime("%H%M%S")}',
        'email': f'test_{datetime.now().strftime("%H%M%S")}@example.com',
        'password_hash': 'hashed_password_123',
        'verification_token': f'token_{datetime.now().strftime("%H%M%S")}'
    }

@pytest.fixture
def sample_pet_data():
    """Provide sample pet data for tests"""
    return {
        'name': 'Fluffy',
        'breed': 'Golden Retriever',
        'age': 3.5,
        'species': 'dog',
        'gender': 'female',
        'weight': 25.5
    }

@pytest.fixture
def sample_task_data():
    """Provide sample task data for tests"""
    from datetime import datetime, timedelta
    due_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
    
    return {
        'task_type': 'feeding',
        'title': 'Morning feeding',
        'description': 'Give breakfast to pet',
        'due_date': due_date,
        'priority': 'medium'
    }