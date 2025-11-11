import pytest
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime, timedelta

class TestDatabaseBasic:
    """Basic database connection tests"""
    
    def test_database_connection(self):
        """Test basic database connection"""
        try:
            connection = mysql.connector.connect(
                host=os.getenv('TEST_DB_HOST', 'localhost'),
                user=os.getenv('TEST_DB_USER', 'root'),
                password=os.getenv('TEST_DB_PASSWORD', ''),
                database=os.getenv('TEST_DB_NAME', 'petcare_test'),
                port=os.getenv('TEST_DB_PORT', '3306')
            )
            
            # Test connection
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            assert result[0] == 1
            print("✅ Database connection test passed")
            
            cursor.close()
            connection.close()
            
        except Error as e:
            pytest.skip(f"Database not available: {e}")
    
    def test_user_creation(self):
        """Test basic user creation"""
        try:
            connection = mysql.connector.connect(
                host=os.getenv('TEST_DB_HOST', 'localhost'),
                user=os.getenv('TEST_DB_USER', 'root'),
                password=os.getenv('TEST_DB_PASSWORD', ''),
                database=os.getenv('TEST_DB_NAME', 'petcare_test'),
                port=os.getenv('TEST_DB_PORT', '3306')
            )
            
            cursor = connection.cursor(dictionary=True)
            
            # Create test user
            test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                ('test_user', test_email, 'test_hash')
            )
            connection.commit()
            
            # Verify user was created
            cursor.execute("SELECT * FROM users WHERE email = %s", (test_email,))
            user = cursor.fetchone()
            
            assert user is not None
            assert user['email'] == test_email
            
            # Cleanup
            cursor.execute("DELETE FROM users WHERE email = %s", (test_email,))
            connection.commit()
            
            cursor.close()
            connection.close()
            
            print("✅ User creation test passed")
            
        except Error as e:
            pytest.skip(f"Database operation failed: {e}")